'use strict';
/* ============================================================================
   TERRARIA-LIKE ADVENTURE — core game loop, world simulation, UI actions, render
   Classic script. Load after util/data/sprites/audio/world/entities/ui.
   ========================================================================== */
(function () {
  const T = window.TILE, TILES = window.TILES, WALLS = window.WALLS;
  const I = window.ITEMS, ENEMIES = window.ENEMIES, BOSSES = window.BOSSES, NPCS = window.NPCS;
  const RECIPES = window.RECIPES, CHEST_LOOT = window.CHEST_LOOT;
  const TSZ = 16;
  const VIEW_W = 960, VIEW_H = 540;
  const SAVE_KEY = 'terraria.harness.save.v1';
  const SAVE_META = 'terraria.harness.meta.v1';
  const FONT = '"Press Start 2P", "Courier New", monospace';

  const clamp = U.clamp, lerp = U.lerp;
  const tileAt = (w, tx, ty) => (tx < 0 || ty < 0 || tx >= w.w || ty >= w.h) ? 0 : w.tiles[ty * w.w + tx];

  function solidTile(id) { const d = TILES[id]; return !!(d && d.solid); }
  function isLiquidTile(id) { return id === T.WATER || id === T.LAVA; }
  function ts(n) { return n * TSZ; }
  function fmtDiff(d) { return (d || 'classic').toUpperCase(); }

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function b64FromBytes(bytes) {
    let s = '', chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + chunk)));
    }
    return btoa(s);
  }
  function bytesFromB64(str) {
    const s = atob(str), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function drawPanel(ctx, x, y, w, h, alpha) {
    ctx.fillStyle = alpha || 'rgba(15,17,26,.94)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(197,168,105,.55)'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      this.state = 'title';
      this.time = 0;
      this.playTime = 0;
      this.fps = 60;
      this._fpsAcc = 0; this._fpsFrames = 0;
      this.acc = 0; this.lastFrame = 0;
      this.world = null; this.player = null;
      this.enemies = []; this.projectiles = []; this.drops = []; this.npcs = [];
      this.minions = []; this.particles = []; this.popups = [];
      this.lightSources = [];
      this.cam = { x: 0, y: 0 };
      this.shake = 0; this.flash = 0;
      this.mouse = { x: 480, y: 270, left: false, right: false, leftPressed: false, rightPressed: false };
      this.keys = Object.create(null);
      this.pressed = new Set();
      this.input = { left: false, right: false, up: false, down: false, jumpPressed: false, jumpHeld: false, dashPressed: false };
      this.settings = { volume: .72, music: .55, sfx: .85, showFps: false, minimap: true };
      this.creation = { name: 'Terraria', seed: '', difficulty: 'classic', evil: 'corruption', mode: 'softcore' };
      this.editingField = null;
      this.uiMode = null; this.previousUIMode = null;
      this.activeChest = null; this.activeNpc = null; this.cursor = null;
      this.paused = false;
      this.loadProgress = 0; this.loadStage = 'PREPARING';
      this.chatLog = [];
      this.nearNPC = null; this.nearInteract = null;
      this.quest = null;
      this.stats = { bossesKilled: 0, deaths: 0, enemiesKilled: 0, oresMined: 0, itemsCrafted: 0, questKills: 0 };
      this.defeated = {};
      this.dayTime = .32; this.dayCount = 1; this.night = false; this._wasNight = false;
      this.weather = { type: 'clear', intensity: 0, timer: 80 };
      this.event = null;
      this.hpScale = 1; this.damageScale = 1;
      this.spawnTimer = 4; this.autosaveTimer = 120; this.houseTimer = 0; this.minimapTimer = 0;
      this.deathCause = 'The world was too much.'; this.deathLost = ''; this.respawnTimer = 0;
      this.mining = null; this._miningTile = null;
      this.digSound = 0; this.warnTimer = 0;
      this.ambient = 1; this.shelter = 0;
      this.houses = []; this.doorCache = [];
      this.explored = null; this.minimapCanvas = null; this.minimapCtx = null;
      this._saveCache = undefined; this._saveInfo = null; this._hasSave = undefined;
      this._started = false;
      this.climbHint = 0;
      this.tileLights = [];
      this.rng = new U.RNG(Date.now() & 0x7fffffff);
      this.ui = new window.GameUI(this);
      this.resize = this.resize.bind(this);
      this.bindEvents();
      this.resize();
      this.lastFrame = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    }

    /* ---------------------------------------------------------------- setup */
    resize() {
      const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
      const cssW = Math.max(1, Math.floor(VIEW_W * scale));
      const cssH = Math.max(1, Math.floor(VIEW_H * scale));
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';

      // Render the whole scene at display resolution instead of stretching a
      // 960x540 bitmap.  Text (especially CJK) and UI lines stay sharp, while
      // gameplay keeps the same 960x540 coordinate system everywhere else.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const renderScale = Math.min(3, Math.max(1, (cssW * dpr) / VIEW_W));
      const bw = Math.round(VIEW_W * renderScale);
      const bh = Math.round(VIEW_H * renderScale);
      if (this.canvas.width !== bw || this.canvas.height !== bh) {
        this.canvas.width = bw;
        this.canvas.height = bh;
      }
      this.scale = scale;
      this.renderScale = bw / VIEW_W;
    }
    updatePointerCursor() {
      if (!this.canvas) return;
      const c = (this.state === 'playing' && !this.uiMode && !this.paused) ? 'crosshair' : 'default';
      if (this.canvas.style.cursor !== c) this.canvas.style.cursor = c;
    }
    bindEvents() {
      window.addEventListener('resize', this.resize);
      window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouse.left = this.mouse.right = false; });
      window.addEventListener('keydown', (e) => this.onKeyDown(e));
      window.addEventListener('keyup', (e) => this.onKeyUp(e));
      this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mouseup', (e) => this.onMouseUp(e));
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());
      this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      this.canvas.addEventListener('pointerdown', () => AUDIO.init());
      window.addEventListener('pointerdown', () => AUDIO.init(), { once: true });
    }
    toGameCoords(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (VIEW_W / r.width), y: (e.clientY - r.top) * (VIEW_H / r.height) };
    }
    onMouseMove(e) { const m = this.toGameCoords(e); this.mouse.x = m.x; this.mouse.y = m.y; }
    onMouseDown(e) {
      AUDIO.init();
      const m = this.toGameCoords(e); this.mouse.x = m.x; this.mouse.y = m.y;
      const btn = e.button === 2 ? 2 : 1;
      if (this.state === 'title' || this.state === 'create' || this.state === 'loading' || this.state === 'dead' || this.paused || this.uiMode) {
        const consumed = this.ui.click(m.x, m.y, btn, e.shiftKey);
        if (consumed) { this.mouse.left = this.mouse.right = false; return; }
        if (this.uiMode || this.paused || this.state !== 'playing') return;
      }
      if (btn === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
      else { this.mouse.left = true; this.mouse.leftPressed = true; }
    }
    onMouseUp() { this.mouse.left = false; this.mouse.right = false; }
    onWheel(e) {
      if (this.state !== 'playing' || this.paused) return;
      e.preventDefault();
      if (this.uiMode) { this.ui.wheel(e.deltaY, this.mouse.x, this.mouse.y); return; }
      if (!this.player) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      this.player.selected = (this.player.selected + dir + 10) % 10;
    }
    onKeyDown(e) {
      const code = e.code || e.key;
      if (this.state === 'create' && this.editingField) {
        if (e.key === 'Enter') { this.editingField = null; e.preventDefault(); return; }
        if (e.key === 'Escape') { this.editingField = null; e.preventDefault(); return; }
        if (e.key === 'Backspace') { this.creation[this.editingField] = (this.creation[this.editingField] || '').slice(0, -1); e.preventDefault(); return; }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const field = this.editingField, max = field === 'name' ? 20 : 24;
          if ((this.creation[field] || '').length < max) this.creation[field] = (this.creation[field] || '') + e.key;
          e.preventDefault(); return;
        }
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
      if (!this.keys[code]) this.pressed.add(code);
      this.keys[code] = true;
      if (this.state === 'create' && e.key === 'Enter' && !this.editingField) { this.startNewWorld(); return; }
      if (this.state === 'title' && e.key === 'Enter') { if (this.hasSave()) this.continueGame(); else this.beginCreation(); return; }
      if (this.state === 'dead') {
        if (e.key === 'Enter' && this.creation.mode !== 'hardcore') this.respawn();
        return;
      }
      if (this.state !== 'playing') return;
      if (e.code === 'Escape') { this.onEscape(); return; }
      if (this.uiMode) {
        if (e.code === 'KeyE' && this.uiMode === 'inventory') this.closeUI();
        else if (e.code === 'KeyM' && this.uiMode === 'map') this.closeUI();
        return;
      }
      if (e.code === 'KeyE') { this.openInventory(); return; }
      if (e.code === 'KeyM') { this.uiMode = 'map'; this.previousUIMode = null; return; }
      if (e.code === 'KeyQ') { this.dropSelected(e.shiftKey); return; }
      if (e.code === 'KeyR') { this.quickHeal(); return; }
      if (e.code === 'KeyF') { this.interactNear(); return; }
      if (e.code === 'KeyH') { this.tryGrapple(); return; }
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 9) this.player.selected = n - 1;
        if (n === 0) this.player.selected = 9;
      }
    }
    onKeyUp(e) { const code = e.code || e.key; this.keys[code] = false; }
    onEscape() {
      if (this.uiMode) { this.closeUI(); return; }
      if (this.paused) { this.setPaused(false); return; }
      this.setPaused(true);
    }
    get uiOpen() { return this.state !== 'playing' || this.paused || !!this.uiMode; }

    /* --------------------------------------------------------------- main loop */
    loop(now) {
      requestAnimationFrame(this.loop.bind(this));
      const raw = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      const dt = Math.min(.1, Math.max(0, raw));
      this.time += dt;
      this._fpsAcc += raw; this._fpsFrames++;
      if (this._fpsAcc > .5) { this.fps = this._fpsFrames / this._fpsAcc; this._fpsAcc = 0; this._fpsFrames = 0; }
      this.updatePointerCursor();
      if (this.state === 'playing' && !this.paused && !this.uiMode) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= 1 / 60 && n < 5) {
          this.step(1 / 60, n === 0);
          this.acc -= 1 / 60; n++;
        }
      } else {
        this.acc = 0;
        if (this.state === 'dead') this.updateDeath(dt);
        this.updateParticles(dt);
      }
      this.pressed.clear();
      this.mouse.leftPressed = false; this.mouse.rightPressed = false;
      this.render();
    }

    step(dt, first) {
      this.playTime += dt;
      this.updateInput(first);
      this.updateTime(dt);
      this.updateWeather(dt);
      this.updateEvents(dt);
      if (this.player) {
        this.player.mining = false;
        this.player.update(this, dt);
        if (this.player.dead) { if (this.state !== 'dead') this.playerDeath(this.player); return; }
        this.updateCamera(dt);
        this.updateActions(dt);
        this.updateTraps(dt);
        this.updateNearby(dt);
        this.updateEnemies(dt);
        this.updateProjectiles(dt);
        this.updateDrops(dt);
        this.updateNpcs(dt);
        this.updateMinions(dt);
        this.updateSpawns(dt);
        this.updateHouses(dt);
        this.updateQuest(dt);
        this.updateLightSources();
        this.updateMinimap(dt);
        this.autosave(dt);
      }
      this.updateParticles(dt);
      for (let i = this.chatLog.length - 1; i >= 0; i--) { this.chatLog[i].time -= dt; if (this.chatLog[i].time <= 0) this.chatLog.splice(i, 1); }
      this.shake = Math.max(0, this.shake - dt * 26);
      this.flash = Math.max(0, this.flash - dt * 1.8);
      this.warnTimer = Math.max(0, this.warnTimer - dt);
    }

    updateInput() {
      const k = this.keys;
      this.input.left = !!(k.KeyA || k.ArrowLeft);
      this.input.right = !!(k.KeyD || k.ArrowRight);
      this.input.up = !!(k.KeyW || k.ArrowUp);
      this.input.down = !!(k.KeyS || k.ArrowDown);
      this.input.jumpHeld = !!(k.Space || k.KeyW || k.ArrowUp);
      this.input.jumpPressed = !!(this.pressed.has('Space') || this.pressed.has('KeyW') || this.pressed.has('ArrowUp'));
      this.input.dashPressed = !!(this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight'));
    }

    updateCamera(dt) {
      const p = this.player, w = this.world;
      let tx = p.cx - VIEW_W * .5 + (this.mouse.x - VIEW_W * .5) * .10 + p.vx * .04;
      let ty = p.cy - VIEW_H * .56 + (this.mouse.y - VIEW_H * .5) * .06;
      tx = clamp(tx, 0, w.w * TSZ - VIEW_W);
      ty = clamp(ty, -180, w.h * TSZ - VIEW_H);
      this.cam.x = lerp(this.cam.x, tx, Math.min(1, dt * 8));
      this.cam.y = lerp(this.cam.y, ty, Math.min(1, dt * 8));
    }

    /* ------------------------------------------------------------- time & sky */
    updateTime(dt) {
      this.dayTime += dt / 480;
      if (this.dayTime >= 1) {
        this.dayTime -= 1; this.dayCount++;
        this.onDawn();
      }
      const n = this.dayTime > .73 || this.dayTime < .23;
      if (n !== this.night) {
        if (n) this.onNightfall();
        this.night = n;
      }
      const y = this.player ? this.player.cy / TSZ : 0;
      const surf = this.world ? this.world.surface[clamp(Math.floor((this.player ? this.player.cx : 0) / TSZ), 0, this.world.w - 1)] : 0;
      let light;
      if (y < surf + 2) {
        const sun = clamp(Math.sin((this.dayTime - .25) * Math.PI * 2) * 1.9 + .35, 0, 1);
        light = .30 + sun * .70;
      } else if (y < window.ROCK_LEVEL) light = .26;
      else if (y < window.CAVERN_LEVEL) light = .21;
      else if (y < window.HELL_LEVEL) light = .18;
      else light = .23;
      if (this.event && this.event.type === 'bloodMoon') light *= .72;
      if (this.weather.type !== 'clear' && this.weather.intensity > .2) light *= .78;
      this.ambient = clamp(light, 0, 1);
      // crude roof check for surface houses
      if (this.world && this.player) {
        let roof = false;
        const tx = Math.floor(this.player.cx / TSZ);
        for (let ty = Math.floor(this.player.cy / TSZ) - 1; ty > surf - 6 && ty > 0; ty--) {
          if (this.world.solid(tx, ty)) { roof = true; break; }
        }
        this.shelter = roof ? 1 : 0;
        if (roof && y < surf + 3) this.ambient *= .62;
      }
    }
    onDawn() {
      this.chat('Day ' + this.dayCount + ' begins. The light returns.', '#f0d690');
      this.event = null;
      AUDIO.setAmbient('none');
      if (this.world && this.player && this.dayCount % 4 === 0) {
        const m = this.world.meteorLanding();
        if (m) { this.chat('A meteorite has crashed somewhere on the surface.', '#d8a070'); this.notify('Meteor impact detected', '#ffb060'); }
      }
    }
    onNightfall() {
      AUDIO.setTrack('night');
      if (this.dayCount >= 2 && this.rng.chance(.26) && !this.event) {
        this.event = { type: 'bloodMoon', timer: 70 };
        this.chat('The moon is red. Something is very wrong.', '#ff7070');
        AUDIO.setTrack('event'); AUDIO.sfx('roar', .7);
      }
    }
    updateWeather(dt) {
      const w = this.weather;
      w.timer -= dt;
      if (w.timer <= 0) {
        if (w.type === 'clear') {
          const bio = this.player ? this.world.biomeAt(this.player.cx / TSZ, this.player.cy / TSZ) : 'forest';
          w.type = bio === 'snow' ? 'snow' : (this.rng.chance(.1) ? 'storm' : 'rain');
          w.intensity = .5 + this.rng.float(0, .5);
          w.timer = this.rng.float(45, 120);
          this.chat('The sky darkens. ' + (w.type === 'snow' ? 'Snow begins to fall.' : 'Rain begins to fall.'), '#a8c8e0');
        } else {
          w.type = 'clear'; w.intensity = 0; w.timer = this.rng.float(120, 260);
          this.chat('The weather clears.', '#c8d8e8');
        }
      }
      if (w.type !== 'clear' && w.intensity > .7 && this.rng.chance(dt * .018)) {
        this.flash = .55; AUDIO.sfx('thunder', .8);
      }
      if (this.player) {
        const bio = this.world.biomeAt(this.player.cx / TSZ, this.player.cy / TSZ);
        if (w.type === 'rain' && bio === 'snow') w.type = 'snow';
        if (w.type === 'snow' && bio !== 'snow') w.type = 'rain';
      }
    }
    updateEvents(dt) {
      if (this.event) {
        this.event.timer -= dt;
        if (this.event.timer <= 0) { this.chat('The ' + this.event.type + ' passes.', '#c8c0a8'); this.event = null; }
      }
      if (!this.event && this.stats.bossesKilled >= 2 && this.rng.chance(dt * .0015)) {
        this.event = { type: 'goblinInvasion', timer: 130, wave: 0, waveTimer: 3 };
        this.chat('A Goblin Army approaches from the east!', '#9be08a');
        AUDIO.setTrack('event'); AUDIO.sfx('roar', .9);
        this.shake = 8;
      }
      if (this.event && this.event.type === 'goblinInvasion') {
        const ev = this.event;
        ev.wave = ev.wave || 0;
        if (!isFinite(ev.waveTimer)) ev.waveTimer = 3;
        ev.waveTimer -= dt;
        if (ev.waveTimer <= 0 && this.player) {
          this.event.waveTimer = 9; this.event.wave++;
          const n = 2 + this.event.wave;
          for (let i = 0; i < n; i++) {
            const x = this.player.cx + (i % 2 ? 1 : -1) * (260 + i * 50);
            const y = this.findSpawnY(x, this.player.cy / TSZ, 30, 20);
            if (y != null) this.spawnEnemy(this.rng.chance(.35) ? 'goblinArcher' : (this.rng.chance(.5) ? 'goblinWarrior' : 'goblinThief'), x, y * TSZ);
          }
          this.chat('Goblin wave ' + this.event.wave + '!', '#c8e090');
        }
      }
      if (this.night && !this.event && this.player && this.rng.chance(dt * .045)) {
        const surf = this.world.surface[clamp(Math.floor(this.player.cx / TSZ), 0, this.world.w - 1)];
        if (this.player.cy / TSZ < surf + 4) {
          const x = this.player.cx + this.rng.float(-500, 500);
          const y = this.findSpawnY(x, this.world.surface[clamp(Math.floor(x / TSZ), 0, this.world.w - 1)] - 6, 6, 5);
          if (y != null) this.spawnItem('manaPotion', 1, x, y * TSZ - 24);
        }
      }
    }

    /* ----------------------------------------------------------- new / load */
    beginCreation() {
      AUDIO.init();
      this.state = 'create';
      this.editingField = null;
      this.ui.titleScreen = 'main';
      AUDIO.setTrack('title');
    }
    hasSave() {
      if (this._hasSave !== undefined) return this._hasSave;
      try { this._hasSave = !!localStorage.getItem(SAVE_KEY); } catch (e) { this._hasSave = false; }
      return this._hasSave;
    }
    saveInfo() {
      if (this._saveInfo) return this._saveInfo;
      try {
        const meta = safeParse(localStorage.getItem(SAVE_META), null);
        if (meta) { this._saveInfo = meta; return meta; }
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const d = safeParse(raw, null);
          if (d) this._saveInfo = { world: d.creation && d.creation.name, difficulty: d.creation && d.creation.difficulty };
        }
      } catch (e) { }
      return this._saveInfo || { world: 'TERRARIA', difficulty: 'CLASSIC' };
    }
    startNewWorld() {
      if (this.state === 'loading') return;
      this.state = 'loading'; this.editingField = null;
      this.loadProgress = .04; this.loadStage = 'READING THE STARS';
      AUDIO.init(); AUDIO.setTrack('title');
      const seed = (this.creation.seed || '').trim() || ('terraria-' + Math.floor(Math.random() * 99999999));
      this.creation.seed = seed;
      if (!this.creation.name) this.creation.name = 'Terraria';
      this.loadStage = 'CARVING LAND';
      setTimeout(() => {
        try {
          this.loadProgress = .2; this.loadStage = 'SHAPING THE WORLD';
          const world = new window.World(seed, { evil: this.creation.evil, difficulty: this.creation.difficulty });
          this.loadProgress = .74; this.loadStage = 'STOCKING CHESTS';
          setTimeout(() => {
            try { this.completeWorldSetup(world, null); }
            catch (err) { this.fatal(err); }
          }, 40);
        } catch (err) { this.fatal(err); }
      }, 80);
    }
    completeWorldSetup(world, save) {
      this.world = world;
      /* Spawn on the open grass just outside the guide house door.  The old
         point sat 2px inside the closed door tile, pinning the player in place. */
      const spawnTx = clamp(world.spawnX + 2, 8, world.w - 9);
      const spawnTy = clamp(world.surface[spawnTx] || world.spawnY, 10, world.h - 10);
      const sx = spawnTx * TSZ + 8;
      const sy = spawnTy * TSZ;
      this.player = new ENT.Player(this, sx, sy);
      this.player.spawnX = sx; this.player.spawnY = sy;
      this.player.maxLife = 100; this.player.maxMana = 20;
      this.player.life = 100; this.player.mana = 20;
      this.player.recalc();
      if (!save) {
        for (const [id, n] of [['copperShortsword', 1], ['copperPickaxe', 1], ['copperAxe', 1], ['torch', 12], ['lesserHealingPotion', 2]]) this.player.addItem(id, n);
        this.loadProgress = .9; this.loadStage = 'WAKING THE GUIDE';
        this.spawnGuide();
        this.explored = new Uint8Array(Math.ceil(world.w * world.h / 8));
        this.reveal(spawnTx, spawnTy, 170);
        this.dayTime = .32; this.dayCount = 1;
        this.chat('You arrive in a world of ' + world.seedStr + '.', '#f0d690');
        this.chat('Press E for inventory. The Guide is waiting nearby.', '#c8d8a0');
      } else {
        this.applySave(save);
      }
      this.hpScale = this.creation.difficulty === 'expert' ? 1.55 : this.creation.difficulty === 'master' ? 2.2 : 1;
      this.damageScale = this.creation.difficulty === 'expert' ? 1.4 : this.creation.difficulty === 'master' ? 2.0 : 1;
      this.initMinimap();
      this.scanDoorCache();
      this.scanHouses();
      this.snapCamera();
      this.state = 'playing'; this.paused = false; this.uiMode = null;
      this.loadProgress = 1;
      AUDIO.init(); AUDIO.setVolume(this.settings.volume); AUDIO.setMusicVolume(this.settings.music); AUDIO.setSfxVolume(this.settings.sfx);
      AUDIO.setTrack(this.world && this.player.cy / TSZ > window.ROCK_LEVEL ? 'underground' : 'overworld');
      this.saveGame(true);
      this._started = true;
    }
    applySave(s) {
      const w = this.world, p = this.player;
      this.creation = Object.assign(this.creation, s.creation || {});
      this.dayTime = s.dayTime != null ? s.dayTime : .32;
      this.dayCount = s.dayCount || 1;
      this.weather = s.weather || this.weather;
      this.stats = Object.assign(this.stats, s.stats || {});
      this.defeated = s.defeated || {};
      this.playTime = s.playTime || 0;
      if (s.night != null) this.night = s.night;
      this.quest = s.quest || null;
      this.explored = s.explored ? bytesFromB64(s.explored) : new Uint8Array(Math.ceil(w.w * w.h / 8));
      const pd = s.player || {};
      p.inventory = new Array(50).fill(null);
      for (const slot of pd.inventory || []) if (slot && I[slot.id]) p.addItem(slot.id, slot.count);
      p.equip = Object.assign({ helmet: null, chest: null, legs: null, accessory: [null, null, null, null, null] }, pd.equip || {});
      if (!Array.isArray(p.equip.accessory)) p.equip.accessory = [null, null, null, null, null];
      p.selected = pd.selected || 0;
      p.maxLife = pd.maxLife || 100; p.maxMana = pd.maxMana || 20;
      p.life = clamp(pd.life != null ? pd.life : p.maxLife, 0, p.maxLife);
      p.mana = clamp(pd.mana != null ? pd.mana : p.maxMana, 0, p.maxMana);
      p.wallet = pd.wallet || 0; p.kills = pd.kills || 0;
      p.usedLifeCrystal = pd.usedLifeCrystal || 0; p.usedManaCrystal = pd.usedManaCrystal || 0;
      p.spawnX = pd.spawnX || w.spawnX * TSZ; p.spawnY = pd.spawnY || w.spawnY * TSZ;
      p.buffs = Array.isArray(pd.buffs) ? pd.buffs.filter(b => b && ENT.BUFF_INFO[b.id]) : [];
      p.recalc();
      this.npcs = [];
      for (const n of s.npcs || []) {
        if (!NPCS[n.id]) continue;
        const npc = new ENT.NPC(this, n.id, n.x, n.y);
        npc.home = n.home || null;
        this.npcs.push(npc);
      }
      if (!this.npcs.length) this.spawnGuide();
      this.player.x = pd.x != null ? pd.x : (w.spawnX * TSZ - 10);
      this.player.y = pd.y != null ? pd.y : ((w.spawnY - 2) * TSZ);
      this.player.vx = 0; this.player.vy = 0; this.player.dead = false;
      this.state = 'playing';
    }
    spawnGuide() {
      try {
        const h = this.world.house || { x0: this.world.spawnX - 12, y0: 150, x1: this.world.spawnX, y1: 170, doorX: this.world.spawnX, doorY: 166 };
        let x = (h.x0 + 3) * TSZ, y = (h.doorY - 1) * TSZ;
        for (let ty = h.y1 - 1; ty > h.y0; ty--) {
          if (this.world.solid(Math.floor(x / TSZ), ty)) { y = (ty - 1) * TSZ - 2; break; }
        }
        const npc = new ENT.NPC(this, 'guide', x, y - 38);
        npc.home = { x: h.x0 + 1, y: h.y0, w: Math.max(4, h.x1 - h.x0 - 2), h: h.y1 - h.y0 };
        this.npcs.push(npc);
        if (!this._started) this.chat('The Guide has moved in.', '#f0d690');
      } catch (e) { }
    }
    continueGame() {
      if (!this.hasSave()) { this.chat('No saved world found.', '#e08080'); return; }
      this.state = 'loading'; this.loadProgress = .06; this.loadStage = 'UNEARTHING YOUR WORLD';
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (!raw) throw new Error('Save file missing.');
          const s = safeParse(raw, null);
          if (!s || !s.world) throw new Error('Save file is corrupt.');
          this.loadProgress = .25; this.loadStage = 'REBUILDING TERRAIN';
          const world = window.World.deserialize(s.world);
          this.loadProgress = .75; this.loadStage = 'RESTORING MEMORIES';
          setTimeout(() => {
            try {
              this.creation = Object.assign({ name: 'Terraria', difficulty: 'classic', mode: 'softcore', evil: 'corruption', seed: world.seedStr }, s.creation || {});
              this.world = world;
              this.player = new ENT.Player(this, world.spawnX * TSZ + 8, (world.spawnY - 1) * TSZ);
              this.completeWorldSetup(world, s);
              this.chat('Welcome back to ' + (this.creation.name || 'Terraria') + '.', '#f0d690');
            } catch (err) { this.fatal(err); }
          }, 40);
        } catch (err) { this.fatal(err); }
      }, 60);
    }
    fatal(err) {
      console.error(err);
      this.state = 'title';
      this.chat('ERROR: ' + (err && err.message ? err.message : err), '#ff6060');
      const el = document.getElementById('fatal');
      if (el) { el.style.display = 'block'; el.textContent = 'The world failed to form.\n' + (err && err.stack ? err.stack : err); }
    }
    saveGame(silent) {
      if (!this.world || !this.player) return false;
      try {
        const p = this.player;
        const data = {
          version: 1,
          creation: this.creation,
          dayTime: this.dayTime, dayCount: this.dayCount, night: this.night,
          weather: this.weather, playTime: this.playTime,
          stats: this.stats, defeated: this.defeated, quest: this.quest,
          explored: this.explored ? b64FromBytes(this.explored) : null,
          world: this.world.serialize(),
          npcs: this.npcs.map(n => ({ id: n.id, x: n.x, y: n.y, home: n.home })),
          player: {
            x: p.x, y: p.y, spawnX: p.spawnX, spawnY: p.spawnY,
            inventory: p.inventory, equip: p.equip, selected: p.selected,
            maxLife: p.maxLife, maxMana: p.maxMana, life: p.life, mana: p.mana,
            wallet: p.wallet, kills: p.kills, usedLifeCrystal: p.usedLifeCrystal,
            usedManaCrystal: p.usedManaCrystal, buffs: p.buffs
          }
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        localStorage.setItem(SAVE_META, JSON.stringify({ world: this.creation.name || 'Terraria', difficulty: this.creation.difficulty, mode: this.creation.mode, time: Date.now() }));
        this._hasSave = true; this._saveInfo = null;
        if (!silent) this.chat('World saved.', '#9be08a');
        return true;
      } catch (e) {
        console.warn('save failed', e);
        if (!silent) this.chat('Could not save: ' + e.message, '#e08080');
        return false;
      }
    }
    autosave(dt) {
      this.autosaveTimer -= dt;
      if (this.autosaveTimer <= 0) {
        this.autosaveTimer = 150;
        if (this.saveGame(true)) this.chat('Autosaved.', '#7aa87a');
      }
    }
    quitToTitle() {
      if (this.world) this.saveGame(true);
      this.state = 'title'; this.paused = false; this.uiMode = null; this.activeChest = null; this.activeNpc = null;
      this.mouse.left = this.mouse.right = false;
      if (this.ui) this.ui.titleScreen = 'main';
      AUDIO.setTrack('title'); AUDIO.setAmbient('none');
    }

    /* ------------------------------------------------------------- minimap */
    initMinimap() {
      const w = this.world;
      this.minimapCanvas = document.createElement('canvas');
      this.minimapCanvas.width = 500; this.minimapCanvas.height = 163;
      this.minimapCtx = this.minimapCanvas.getContext('2d');
      this.minimapCtx.imageSmoothingEnabled = false;
      this.mapCanvas = document.createElement('canvas');
      this.mapCanvas.width = 500; this.mapCanvas.height = 163;
      this.mapCtx = this.mapCanvas.getContext('2d');
      this.mapCtx.imageSmoothingEnabled = false;
      this._mapDrawn = -999;
      this.updateMinimap(999);
    }
    mapColorAt(tx, ty) {
      const w = this.world;
      const id = tileAt(w, tx, ty), def = TILES[id];
      let r = 7, g = 8, b = 13;
      if (id && def && !isLiquidTile(id)) {
        const c = U.hexToRgb(def.color || '#666'); r = c.r; g = c.g; b = c.b;
      } else if (id === T.WATER) { r = 44; g = 88; b = 148; }
      else if (id === T.LAVA) { r = 206; g = 72; b = 24; }
      else {
        const wall = w.getWall(tx, ty);
        if (wall && WALLS[wall]) { const c = U.hexToRgb(WALLS[wall].color || '#333'); r = c.r * .72; g = c.g * .72; b = c.b * .72; }
        else { const bd = w.biomeDefAt(tx, ty); const c = U.hexToRgb((bd && bd.sky && bd.sky[0]) || '#334'); r = c.r * .5; g = c.g * .5; b = c.b * .5; }
      }
      return [r, g, b];
    }
    drawWorldMap() {
      if (!this.mapCtx || !this.world) return;
      const w = this.world, cw = this.mapCanvas.width, ch = this.mapCanvas.height;
      const img = this.mapCtx.createImageData(cw, ch);
      const data = img.data;
      for (let py = 0; py < ch; py++) {
        const ty = Math.floor(py * w.h / ch);
        for (let px = 0; px < cw; px++) {
          const tx = Math.floor(px * w.w / cw);
          if (!this.isExplored(tx, ty)) continue;
          const c = this.mapColorAt(tx, ty);
          const idx = (py * cw + px) * 4;
          data[idx] = c[0]; data[idx + 1] = c[1]; data[idx + 2] = c[2]; data[idx + 3] = 255;
        }
      }
      this.mapCtx.putImageData(img, 0, 0);
    }
    reveal(tx, ty, r) {
      if (!this.explored || !this.world) return;
      const w = this.world.w, h = this.world.h;
      for (let y = ty - r; y <= ty + r; y++) {
        if (y < 0 || y >= h) continue;
        const dy = y - ty;
        for (let x = tx - r; x <= tx + r; x++) {
          if (x < 0 || x >= w) continue;
          const dx = x - tx;
          if (dx * dx + dy * dy > r * r) continue;
          const bit = y * w + x;
          this.explored[bit >> 3] |= (1 << (bit & 7));
        }
      }
    }
    isExplored(x, y) {
      if (!this.explored) return false;
      const bit = y * this.world.w + x;
      return !!(this.explored[bit >> 3] & (1 << (bit & 7)));
    }
    updateMinimap(dt) {
      if (!this.minimapCtx || !this.world) return;
      this.minimapTimer -= dt;
      if (this.player && this.minimapTimer <= 0) {
        this.minimapTimer = .22;
        this.reveal(Math.floor(this.player.cx / TSZ), Math.floor(this.player.cy / TSZ), 24);
      }
      if (this._mapDrawn < 0 || this.time - this._mapDrawn > 1.35) {
        this._mapDrawn = this.time;
        this.drawWorldMap();
      }
      if (this._miniDrawn && this.time - this._miniDrawn < .55) return;
      this._miniDrawn = this.time;
      const w = this.world, cw = this.minimapCanvas.width, ch = this.minimapCanvas.height;
      const img = this.minimapCtx.createImageData(cw, ch);
      const data = img.data;
      /* A local, readable map instead of squeezing all 2000 tiles into 164px. */
      const ptx = this.player ? Math.floor(this.player.cx / TSZ) : Math.floor(w.spawnX);
      const pty = this.player ? Math.floor(this.player.cy / TSZ) : Math.floor(w.spawnY);
      const scale = 3;
      for (let py = 0; py < ch; py++) {
        const ty = pty + Math.floor((py - ch * .5) / scale);
        if (ty < 0 || ty >= w.h) continue;
        for (let px = 0; px < cw; px++) {
          const tx = ptx + Math.floor((px - cw * .5) / scale);
          if (tx < 0 || tx >= w.w) continue;
          let r = 7, g = 8, b = 13;
          if (this.isExplored(tx, ty)) {
            const c = this.mapColorAt(tx, ty); r = c[0]; g = c[1]; b = c[2];
          }
          const idx = (py * cw + px) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
        }
      }
      this.minimapCtx.putImageData(img, 0, 0);
      /* Crosshair marker; the local view is always centred on the player. */
      const mx = Math.floor(cw * .5), my = Math.floor(ch * .5);
      this.minimapCtx.fillStyle = 'rgba(255,255,255,.92)';
      this.minimapCtx.fillRect(mx - 3, my, 7, 1);
      this.minimapCtx.fillRect(mx, my - 3, 1, 7);
      this.minimapCtx.fillStyle = '#f6d36e';
      this.minimapCtx.fillRect(mx - 1, my - 1, 3, 3);
    }

    /* ------------------------------------------------------------- chat/quest */
    chat(text, color) {
      if (!text) return;
      this.chatLog.push({ text: String(text), color: color || '#e8dfc8', time: 8.5 });
      if (this.chatLog.length > 24) this.chatLog.shift();
    }
    notify(text, color) { this.chat(text, color || '#f0d690'); }
    addPickupText(x, y, text, color) { this.popups.push(new ENT.Popup(x, y, text, color || '#fff', 1.1)); }
    addPopup(x, y, text, color, life) { this.popups.push(new ENT.Popup(x, y, text, color || '#fff', life || .9)); }
    playTimeString() {
      const s = Math.floor(this.playTime);
      const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
      return (h ? h + 'h ' : '') + String(m).padStart(2, '0') + 'm ' + String(ss).padStart(2, '0') + 's';
    }
    updateQuest() {
      if (!this.quest || !this.quest.active) return;
      if (this.quest.type === 'kill') {
        this.quest.progress = Math.min(this.quest.need, this.stats.questKills || 0);
      }
    }

    /* --------------------------------------------------------------- sources */
    updateLightSources() {
      this.lightSources = [];
      if (!this.player) return;
      const p = this.player;
      const r = 108 + (p.stats.light || 0) * 28;
      this.lightSources.push({ x: p.cx, y: p.cy, r, color: '#ffd8a0', a: .72 });
      /* soft halo so cave walls are readable beyond the tight lantern ring */
      this.lightSources.push({ x: p.cx, y: p.cy, r: 236, color: '#9fb8d8', a: .16 });
      if (p.stats.magma) this.lightSources.push({ x: p.cx, y: p.cy, r: 110, color: '#ff7a32', a: .35 });
      if (p.inLava) this.lightSources.push({ x: p.cx, y: p.cy, r: 160, color: '#ff6a20', a: .5 });
    }
    dust(x, y, n, color) {
      for (let i = 0; i < (n || 4); i++) {
        this.addParticle(x + this.rng.float(-6, 6), y + this.rng.float(-6, 6), color || '#b8a080', this.rng.int(1, 2), this.rng.float(-50, 50), this.rng.float(-70, -10), this.rng.float(.25, .6), 500);
      }
    }
    addParticle(x, y, color, size, vx, vy, life, gravity, glow) {
      if (this.particles.length > 900) return;
      this.particles.push(new ENT.Particle(x, y, color, size, vx, vy, life, gravity, glow));
    }
    spawnPuff(x, y, color) {
      for (let i = 0; i < 8; i++) this.addParticle(x, y, color || '#b8a8c8', this.rng.int(2, 4), this.rng.float(-60, 60), this.rng.float(-80, 20), this.rng.float(.3, .7), -20, true);
    }
    fireBurst(x, y, color, n) {
      for (let i = 0; i < (n || 12); i++) this.addParticle(x, y, color || '#ffb040', this.rng.int(1, 3), this.rng.float(-90, 90), this.rng.float(-140, -20), this.rng.float(.25, .7), 260, true);
    }
    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]; p.update(this, dt); if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i]; p.update(dt); if (p.life <= 0) this.popups.splice(i, 1);
      }
    }

    /* -------------------------------------------------------------- renderer */
    render() {
      const ctx = this.ctx;
      const r = this.renderScale || 1;
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      if ((this.state === 'playing' || this.state === 'dead') && this.world && this.player) {
        this.renderWorld(ctx);
        this.ui.draw(ctx);
      } else {
        this.ui.draw(ctx);
      }
      if (this.flash > 0) { ctx.fillStyle = 'rgba(240,248,255,' + (this.flash * .55) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    }

    /* ================================================================ ACTIONS */
    mouseWorld() { return { x: this.mouse.x + this.cam.x, y: this.mouse.y + this.cam.y }; }
    tileUnderMouse() {
      if (!this.world) return null;
      const m = this.mouseWorld();
      const tx = Math.floor(m.x / TSZ), ty = Math.floor(m.y / TSZ);
      if (!this.world.inBounds(tx, ty)) return null;
      return { x: tx, y: ty, id: this.world.get(tx, ty), wall: this.world.getWall(tx, ty) };
    }
    inReach(x, y, extra) {
      const p = this.player;
      if (!p) return false;
      const r = 16 * (6.1 + (p.stats.reach || 0) + (extra || 0));
      return U.dist(p.cx, p.cy, x, y) <= r;
    }
    aimAngle() {
      const m = this.mouseWorld(), p = this.player;
      return Math.atan2(m.y - p.cy, m.x - p.cx);
    }

    /* Pressure plates fire nearby dart traps.  Both are player-placeable furniture. */
    updateTraps(dt) {
      const p = this.player, w = this.world;
      if (!p || p.dead) return;
      const ptx = Math.floor(p.cx / TSZ), pty = Math.floor((p.feet - 1) / TSZ);
      let plate = null;
      for (let dx = -1; dx <= 1 && !plate; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tx = ptx + dx, ty = pty + dy;
          if (w.get(tx, ty) === T.PRESSURE_PLATE) { plate = { x: tx, y: ty }; break; }
        }
      }
      if (!plate) return;
      this._trapTimes = this._trapTimes || {};
      const pk = plate.x + ',' + plate.y;
      if (this.time - (this._trapTimes[pk] || -99) < 1.05) return;
      this._trapTimes[pk] = this.time;
      AUDIO.sfx('click', 1.5);
      let fired = false;
      for (let ty = plate.y - 4; ty <= plate.y + 4; ty++) {
        for (let tx = plate.x - 16; tx <= plate.x + 16; tx++) {
          if (w.get(tx, ty) !== T.DART_TRAP) continue;
          const tk = tx + ',' + ty;
          if (this.time - (this._trapTimes[tk] || -99) < 1.2) continue;
          this._trapTimes[tk] = this.time;
          let dir = p.cx > tx * TSZ + 8 ? 1 : -1;
          if (w.solid(tx + dir, ty)) dir = -dir;
          const sx = tx * TSZ + 8 + dir * 9, sy = ty * TSZ + 8;
          if (!w.solid(tx + dir, ty)) {
            this.projectiles.push(new ENT.Projectile(this, { x: sx, y: sy, vx: dir * 330, vy: 0, damage: 20, friendly: false, type: 'dart', life: 2.6 }));
            this.dust(sx, sy, 3, '#b8b8a8');
            fired = true;
          }
        }
      }
      if (fired) AUDIO.sfx('bow', .9);
    }
    updateActions(dt) {      const p = this.player;
      if (!p || p.dead) return;
      const held = p.selectedItem();
      /* Right click: interact first, then place. */
      if (this.mouse.rightPressed) {
        if (this.rightAction()) return;
      }
      if (this.mouse.left) {
        const mined = this.tryMining(dt);
        if (!mined && held) this.useHeld(held, p.selected);
      } else {
        this.mining = null; this._miningTile = null;
        p.mining = false;
      }
      p.hookHold = this.mouse.right;
    }

    rightAction() {
      const target = this.tileUnderMouse();
      if (!target) return false;
      const def = TILES[target.id];
      if (def && def.interact && this.inReach(target.x * TSZ + 8, target.y * TSZ + 8)) {
        this.interactTile(target.x, target.y); return true;
      }
      if (target.id === T.DOOR_CLOSED || target.id === T.DOOR_OPEN) { this.interactTile(target.x, target.y); return true; }
      const held = this.player.selectedItem();
      if (held) {
        const it = I[held.id];
        if (it && (it.block != null || it.wall != null)) return this.placeSelected(target);
        if (it && it.effect === 'recall') { this.useHeld(held, this.player.selected); return true; }
      }
      return false;
    }

    useHeld(slot, index) {
      const it = I[slot && slot.id], p = this.player;
      if (!it || !p || p.dead || p.useTimer > 0) return false;
      if (it.type === 'weapon') return this.fireWeapon(it, slot, index);
      if (it.type === 'summonItem' || it.type === 'potion' || it.type === 'consumable') return this.consumeAt(index);
      if (it.effect === 'recall') return this.consumeAt(index);
      if (it.type === 'tool' && it.effect === 'recall') return this.consumeAt(index);
      if (it.block != null || it.wall != null) return false;
      if (it.type === 'ammo') { this.notify('That is ammunition. It needs a weapon.', '#c8c0a0'); return false; }
      return false;
    }

    tryMining(dt) {
      const p = this.player, w = this.world;
      const slot = p.selectedItem(), it = slot && I[slot.id];
      if (!it) return false;
      const target = this.tileUnderMouse();
      const m = this.mouseWorld();
      const tree = w.treeAtPixel(m.x, m.y);
      if (tree && !tree.chopped && (it.axe || it.pick)) {
        if (!this.inReach(tree.x * TSZ + 8, (tree.y - 1) * TSZ, 1.5)) return false;
        return this.chopTick(tree, it, dt);
      }
      const canDig = it.pick || it.axe || it.hammer;
      if (!canDig || !target) return false;
      if (!this.inReach(target.x * TSZ + 8, target.y * TSZ + 8, .8)) return false;
      const def = TILES[target.id];
      if (!target.id && target.wall && it.hammer) return this.mineWallTick(target, it, dt);
      if (!def || !def.solid && !def.platform && !def.furniture && !def.interact && !def.light) {
        if (!target.id && target.wall && it.hammer) return this.mineWallTick(target, it, dt);
        return false;
      }
      if (target.id === T.WATER || target.id === T.LAVA) return false;
      const need = def.tool || 'pick';
      let power = 0;
      if (need === 'axe') power = it.axe || it.pick * .55;
      else if (need === 'hammer') power = it.hammer || it.pick * .5;
      else power = it.pick || it.hammer || 0;
      if (!power) {
        if (this.warnTimer <= 0) { this.notify('You need a ' + (need === 'axe' ? 'axe' : need === 'hammer' ? 'hammer' : 'pickaxe') + ' for that.', '#e0b080'); this.warnTimer = 1.6; }
        return true;
      }
      if ((def.tier || 0) > (it.tier || 0)) {
        if (this.warnTimer <= 0) { this.notify('Your tool is too weak for this material.', '#e08080'); this.warnTimer = 1.8; }
        return true;
      }
      const key = target.x + ',' + target.y;
      if (!this._miningTile || this._miningTile.key !== key) {
        this._miningTile = { key, x: target.x, y: target.y, pct: 0 };
      }
      const m2 = this._miningTile;
      const rate = power * (1 + (p.stats.miningSpeed || 0)) * 1.85;
      m2.pct += dt * rate / Math.max(.16, def.hp || .5);
      this.mining = { x: target.x, y: target.y, pct: m2.pct };
      p.mining = true; p.useTimer = .15; p.useTotal = .15;
      p.miningTile = { x: target.x, y: target.y };
      p.dir = U.sign(target.x * TSZ + 8 - p.cx) || p.dir;
      this.digSound -= dt;
      if (this.digSound <= 0) {
        this.digSound = .22; AUDIO.sfx('dig', .8 + Math.random() * .4);
        this.dust(target.x * TSZ + 8, target.y * TSZ + 8, 2, def.color || '#a08060');
      }
      if (m2.pct >= 1) {
        const tx = target.x, ty = target.y;
        this._miningTile = null; this.mining = null;
        this.breakTile(tx, ty);
      }
      return true;
    }

    mineWallTick(target, it, dt) {
      const p = this.player;
      const wall = target.wall;
      if (!wall) return false;
      if (!this._miningTile || this._miningTile.key !== ('w' + target.x + ',' + target.y)) this._miningTile = { key: 'w' + target.x + ',' + target.y, x: target.x, y: target.y, pct: 0 };
      this._miningTile.pct += dt * (it.hammer || 1) * 1.5;
      this.mining = { x: target.x, y: target.y, pct: this._miningTile.pct };
      p.mining = true; p.useTimer = .14; p.useTotal = .14;
      p.dir = U.sign(target.x * TSZ + 8 - p.cx) || p.dir;
      this.digSound -= dt;
      if (this.digSound <= 0) { this.digSound = .25; AUDIO.sfx('dig', .7); this.dust(target.x * TSZ + 8, target.y * TSZ + 8, 2, (WALLS[wall] && WALLS[wall].color) || '#746858'); }
      if (this._miningTile.pct >= 1) {
        this.world.setWall(target.x, target.y, 0);
        this.dust(target.x * TSZ + 8, target.y * TSZ + 8, 6, (WALLS[wall] && WALLS[wall].color) || '#746858');
        AUDIO.sfx('break', 1.1);
        this._miningTile = null; this.mining = null;
      }
      return true;
    }

    chopTick(tree, it, dt) {
      const p = this.player, w = this.world;
      this.mining = { tree, pct: 0 }; p.mining = true;
      p.useTimer = .16; p.useTotal = .16;
      p.dir = U.sign(tree.x * TSZ - p.cx) || p.dir;
      this.digSound -= dt;
      if (this.digSound <= 0) { this.digSound = .2; AUDIO.sfx('dig', 1.05); this.dust(tree.x * TSZ + 8, (tree.y - 1) * TSZ, 3, '#8a6438'); }
      const hit = w.cutTree(tree, dt * Math.max(1, it.axe || 1) * 3.2);
      if (!hit) return true;
      if (hit.chopped) {
        const wood = hit.wood || 6;
        const kind = hit.kind;
        const woodId = kind === 'jungle' ? 'mahogany' : kind === 'snow' ? 'borealWood' : kind === 'corrupt' ? 'ebonwood' : 'wood';
        const stacks = Math.max(1, Math.ceil(wood / (ENT.maxStack(woodId) || 999)));
        for (let i = 0; i < stacks; i++) this.spawnItem(woodId, Math.min(999, Math.ceil(wood / stacks)), hit.x, hit.y - 18);
        if (this.rng.chance(.55)) this.spawnItem(woodId, 1, hit.x, hit.y - 18);
        AUDIO.sfx('break', .8);
        this.shake = Math.max(this.shake, 2);
        this.chat('You chop down a tree.', '#b8d890');
        this.mining = null;
      }
      return true;
    }

    breakTile(tx, ty) {
      const w = this.world, id = w.get(tx, ty), def = TILES[id];
      if (!id || !def) return;
      if (def.interact === 'chest') { this.breakChestAt(tx, ty); return; }
      if (def.interact === 'pot') { this.breakPot(tx, ty); return; }
      if (id === T.LIFE_CRYSTAL) { this.interactTile(tx, ty); return; }
      w.set(tx, ty, 0);
      if (w.chestAt(tx, ty)) w.chests.delete(tx + ',' + ty);
      const drop = def.drop;
      if (drop && I[drop]) {
        this.spawnItem(drop, 1, tx * TSZ + 8, ty * TSZ + 8);
      }
      if (id >= T.COPPER_ORE && id <= T.DEMONITE_ORE) this.stats.oresMined++;
      this.dust(tx * TSZ + 8, ty * TSZ + 8, 7, def.color || '#a08060');
      AUDIO.sfx('break', .9 + Math.random() * .25);
      this.shake = Math.max(this.shake, 1.1);
      /* hanging plants / torches above a removed block */
      const above = w.get(tx, ty - 1), ad = TILES[above];
      if (above && ad && (above === T.HERB || above === T.MUSHROOM || above === T.GLOW_MUSHROOM || above === T.SAPLING)) {
        w.set(tx, ty - 1, 0);
        if (ad.drop && I[ad.drop]) this.spawnItem(ad.drop, 1, tx * TSZ + 8, (ty - 1) * TSZ + 8);
      }
    }

    breakPot(tx, ty) {
      const w = this.world;
      w.set(tx, ty, 0);
      const cx = tx * TSZ + 8, cy = ty * TSZ + 8;
      this.dust(cx, cy, 14, '#a86848');
      AUDIO.sfx('break', 1.15);
      if (this.rng.chance(.7)) this.spawnCoins(this.rng.int(40, 420), cx, cy);
      if (this.rng.chance(.55)) this.spawnItem('torch', this.rng.int(1, 3), cx, cy);
      if (this.rng.chance(.38)) this.spawnItem(this.rng.chance(.45) ? 'lesserHealingPotion' : 'manaPotion', 1, cx, cy);
      if (this.rng.chance(.18)) this.spawnItem('rope', this.rng.int(2, 5), cx, cy);
      if (this.rng.chance(.08)) this.spawnItem(this.rng.chance(.5) ? 'woodenBoomerang' : 'shuriken', 1, cx, cy);
    }

    breakChestAt(tx, ty) {
      const w = this.world, chest = w.chestAt(tx, ty);
      if (chest) this.spillChest(chest);
      w.chests.delete(tx + ',' + ty);
      w.set(tx, ty, 0);
      this.dust(tx * TSZ + 8, ty * TSZ + 8, 16, '#b08050');
      AUDIO.sfx('break', .9);
      if (this.activeChest === chest) this.closeUI();
    }
    spillChest(chest) {
      if (!chest || !chest.items) return;
      for (let i = 0; i < chest.items.length; i++) {
        const s = chest.items[i];
        if (!s) continue;
        this.spawnItem(s.id, s.count, chest.x * TSZ + 8, chest.y * TSZ + 8);
        chest.items[i] = null;
      }
    }

    placeSelected(target) {
      const p = this.player, w = this.world, slot = p.selectedItem(), it = slot && I[slot.id];
      if (!it || !p || p.useTimer > 0) return false;
      if (!this.inReach(target.x * TSZ + 8, target.y * TSZ + 8)) { this.notify('Too far away.', '#d0a090'); return true; }
      if (it.wall != null) {
        if (w.getWall(target.x, target.y)) return false;
        w.setWall(target.x, target.y, it.wall);
        p.removeItem(slot.id, 1); p.useTimer = .16; p.useTotal = .16;
        AUDIO.sfx('place', 1); this.dust(target.x * TSZ + 8, target.y * TSZ + 8, 3, (WALLS[it.wall] && WALLS[it.wall].color) || '#9a8060');
        return true;
      }
      if (it.block == null) return false;
      const id = it.block;
      if (target.id && target.id !== T.WATER && target.id !== T.LAVA) return false;
      const def = TILES[id];
      if (!def) return false;
      if (def.solid) {
        const ptx0 = Math.floor(p.x / TSZ), ptx1 = Math.floor((p.x + p.w) / TSZ);
        const pty0 = Math.floor(p.y / TSZ), pty1 = Math.floor((p.y + p.h) / TSZ);
        if (target.x >= ptx0 && target.x <= ptx1 && target.y >= pty0 && target.y <= pty1) { this.notify('You cannot place a block inside yourself.', '#d0a090'); return true; }
      }
      const adjacent = w.solid(target.x - 1, target.y) || w.solid(target.x + 1, target.y) || w.solid(target.x, target.y - 1) || w.solid(target.x, target.y + 1);
      const backed = w.getWall(target.x, target.y) > 0;
      if (!adjacent && !backed && id !== T.ROPE) { this.notify('That block needs a supporting surface.', '#d0a090'); return true; }
      if (id === T.DOOR_CLOSED) {
        if (!w.solid(target.x, target.y + 1)) { this.notify('The door needs a floor.', '#d0a090'); return true; }
        const cells = [];
        for (let d = 0; d < 3; d++) {
          const yy = target.y - d;
          if (!w.inBounds(target.x, yy) || w.get(target.x, yy)) { this.notify('There is no room for the door.', '#d0a090'); return true; }
          cells.push(yy);
        }
        for (const yy of cells) w.set(target.x, yy, T.DOOR_CLOSED);
        p.removeItem(slot.id, 1); p.useTimer = .18; p.useTotal = .18;
        AUDIO.sfx('door', .8);
        this.dust(target.x * TSZ + 8, (target.y - 1) * TSZ, 6, '#8a6240');
        return true;
      }
      if (id === T.CHEST) {
        const c = w.placeChest(target.x, target.y, 'surface', false);
        if (!c) { this.notify('The chest needs solid ground beneath it.', '#d0a090'); return true; }
      } else {
        w.set(target.x, target.y, id);
      }
      p.removeItem(slot.id, 1); p.useTimer = .18; p.useTotal = .18;
      AUDIO.sfx('place', 1);
      this.dust(target.x * TSZ + 8, target.y * TSZ + 8, 4, def.color || '#9a8060');
      if (id === T.BED) { p.spawnX = target.x * TSZ + 8; p.spawnY = target.y * TSZ; this.chat('Your spawn point is now set.', '#c8e0a0'); }
      return true;
    }

    /* ------------------------------------------------------------- weapons */
    fireWeapon(it, slot, slotIndex) {
      const p = this.player;
      if (p.useTimer > 0) return false;
      const aim = this.aimAngle();
      p.dir = Math.cos(aim) < 0 ? -1 : 1;
      p.swingAngle = aim; p.swingDir = p.dir;
      let ammo = null, ammoDef = null;
      if (it.ammo) {
        ammo = p.hasAmmo(it.ammo);
        if (!ammo) { this.notify('You have no ' + it.ammo + 's to fire.', '#e0b080'); p.useTimer = .25; return false; }
        ammoDef = ammo.it;
      }
      if (it.mana) {
        if (p.mana < it.mana) { this.notify('Not enough mana.', '#80c0ff'); p.useTimer = .25; return false; }
        p.mana -= it.mana;
      }
      p.useTimer = Math.max(.08, it.useTime || .3); p.useTotal = p.useTimer;
      const critChance = Math.min(.85, (it.crit || 0) / 100 + (p.stats.crit || 0));
      const crit = this.rng.chance(critChance);
      let dmg = it.damage || 0;
      if (ammoDef) dmg += ammoDef.damage || 0;
      dmg *= (it.cls === 'melee' ? (p.stats.melee || 1) : it.cls === 'ranged' ? (p.stats.ranged || 1) : it.cls === 'magic' ? (p.stats.magic || 1) : it.cls === 'summon' ? (p.stats.summon || 1) : 1);
      if (crit) dmg *= 2;
      dmg = Math.max(1, Math.round(dmg * this.rng.float(.9, 1.1)));
      const speed = (it.projectileSpeed || (ammoDef && ammoDef.projectileSpeed) || 10) * 34;
      if (it.minion) {
        if (this.minions.length >= 4) { this.notify('Your minion slots are full.', '#c8a0e0'); return false; }
        const m = new ENT.Minion(this, it.minion, p, p.cx, p.cy - 10);
        this.minions.push(m);
        AUDIO.sfx('summon', 1); this.spawnPuff(p.cx, p.cy - 14, '#c8a0e0');
        return true;
      }
      if (it.cls === 'melee' && !it.projectile) {
        this.meleeSwing(it, dmg, crit, aim);
        return true;
      }
      let ptype = this.mapProjectile(it.projectile || (ammoDef && ammoDef.projectile) || (it.cls === 'ranged' ? (it.ammo === 'bullet' ? 'bullet' : 'arrow') : 'magicBolt'));
      if (it.onUse === 'explode') ptype = it.projectile || 'bomb';
      const count = it.pellets || (it.burst || 1);
      for (let i = 0; i < count; i++) {
        const spread = count > 1 ? (i - (count - 1) / 2) * .09 : 0;
        const vx = Math.cos(aim + spread) * speed, vy = Math.sin(aim + spread) * speed;
        this.pushProjectile({ x: p.cx + Math.cos(aim) * 14, y: p.cy - 8 + Math.sin(aim) * 10, vx, vy, damage: dmg, friendly: true, type: ptype, crit, light: it.light || (ammoDef && ammoDef.light) || 0, gravity: ptype === 'bomb' || ptype === 'dynamite' ? 520 : 0 });
      }
      if (ammo) p.removeItem(ammo.id, 1);
      let consumedThrow = false;
      if (it.cls === 'ranged' && !it.ammo && !it.consumable && it.stack > 1) { p.removeItem(slot.id, 1); consumedThrow = true; }
      if (it.onUse === 'explode' && it.type !== 'tool' && !consumedThrow) p.removeItem(slot.id, 1);
      if (it.projectile && it.cls === 'magic') { this.spawnPuff(p.cx + Math.cos(aim) * 18, p.cy - 10, '#80d8ff'); }
      if (it.cls === 'magic') AUDIO.sfx('magic', 1 + Math.random() * .2);
      else if (it.ammo === 'bullet') AUDIO.sfx('gun', 1);
      else if (it.ammo) AUDIO.sfx('bow', 1);
      else AUDIO.sfx('swing', 1);
      this.dust(p.cx + Math.cos(aim) * 18, p.cy - 8, 3, '#e8d8a0');
      return true;
    }

    mapProjectile(id) {
      const map = {
        arrow: 'arrow', flameArrow: 'arrow', beeArrow: 'arrow', unholyArrow: 'arrow', jesterArrow: 'arrow',
        bullet: 'bullet', meteorShot: 'bullet', silverBullet: 'bullet', musketBall: 'bullet', slimeGun: 'bullet',
        enchantedBeam: 'magicBolt', nightBeam: 'shadowBolt', shadowBeam: 'shadowBolt', waterBolt: 'magicBolt',
        magicBolt: 'magicBolt', demonScythe: 'shadowBolt', spaceLaser: 'laser', laser: 'laser',
        fireball: 'fireball', skull: 'bone', crystalShard: 'ice', magicDagger: 'shuriken', deathSickle: 'shuriken',
        vilethorn: 'vile', bee: 'sting', molotov: 'fireball', grenade: 'bomb', bomb: 'bomb', dynamite: 'dynamite',
        shuriken: 'shuriken', spear: 'spear', star: 'star', leaf: 'leaf', firework: 'firework'
      };
      return map[id] || 'arrow';
    }
    pushProjectile(o) {
      if (this.projectiles.length > 240) return;
      this.projectiles.push(new ENT.Projectile(this, o));
    }
    meleeSwing(it, dmg, crit, aim) {
      const p = this.player;
      p.useTimer = Math.max(.16, it.useTime || .3); p.useTotal = p.useTimer;
      AUDIO.sfx(it.useSound || 'swing', 1);
      this.dust(p.cx + Math.cos(aim) * 28, p.cy - 10 + Math.sin(aim) * 12, 3, '#d8d0c0');
      if (it.projectile) {
        const speed = (it.projectileSpeed || 9) * 34;
        this.pushProjectile({ x: p.cx + Math.cos(aim) * 18, y: p.cy - 8, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, damage: dmg, friendly: true, type: this.mapProjectile(it.projectile), crit, light: it.light || 0 });
      }
      const reach = 62 + (it.reach || 0) * 2;
      const dir = p.dir;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.cx - p.cx, dy = e.cy - p.cy;
        if (dx * dir < -14) continue;
        if (Math.abs(dx) > reach || Math.abs(dy) > 42) continue;
        if (Math.abs(Math.atan2(dy, Math.abs(dx))) > 1.05) continue;
        e.takeDamage(this, dmg, dir * Math.max(1, it.knockback || 2), crit);
        AUDIO.sfx('hit', 1 + Math.random() * .25);
        this.dust(e.cx, e.cy, 4, '#d08070');
      }
      if (p.stats.bees && this.rng.chance(.3)) {
        const a = aim + this.rng.float(-.4, .4);
        this.pushProjectile({ x: p.cx, y: p.cy - 8, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, damage: Math.max(4, Math.round(dmg * .4)), friendly: true, type: 'sting', light: 1 });
      }
      if (p.stats.starVeil && this.rng.chance(.16)) this.pushProjectile({ x: p.cx, y: p.cy - 30, vx: 30, vy: -300, damage: Math.max(8, Math.round(dmg * .5)), friendly: true, type: 'star', light: 8, gravity: 300 });
    }

    consumeAt(index) {
      const p = this.player, slot = p.inventory[index], it = slot && I[slot.id];
      if (!it || !p) return false;
      let consumed = true, msg = null;
      if (it.id === 'lifeCrystal') {
        if (p.usedLifeCrystal >= 15) { this.notify('Your life force is already at its natural limit.', '#e0b080'); return false; }
        p.usedLifeCrystal++; p.maxLife += 20; p.life = Math.min(p.maxLife, p.life + 20);
        msg = 'Life increased to ' + p.maxLife + '.'; AUDIO.sfx('heal', .8);
      } else if (it.id === 'manaCrystal') {
        if (p.usedManaCrystal >= 9) { this.notify('Your mana is already at its natural limit.', '#a0c0e0'); return false; }
        p.usedManaCrystal++; p.maxMana += 20; p.mana = Math.min(p.maxMana, p.mana + 20);
        msg = 'Mana increased to ' + p.maxMana + '.'; AUDIO.sfx('magic', .7);
      } else if (it.heal) {
        if (p.life >= p.maxLife) { this.notify('You are already at full health.', '#a0e090'); return false; }
        const amount = Math.round(it.heal * (1 + (p.stats.healBoost || 0)));
        p.heal(amount); msg = 'Recovered ' + amount + ' life.'; AUDIO.sfx('heal', 1);
        p.addBuff('regeneration', 3);
      } else if (it.manaRestore) {
        if (p.mana >= p.maxMana) { this.notify('Your mana is already full.', '#a0c0ff'); return false; }
        p.mana = Math.min(p.maxMana, p.mana + it.manaRestore); msg = 'Recovered ' + it.manaRestore + ' mana.'; AUDIO.sfx('magic', 1);
      } else if (it.buff) {
        p.addBuff(it.buff, it.duration || 60); msg = it.name + ' surges through you.'; AUDIO.sfx('potion', 1);
      } else if (it.effect === 'recall') {
        this.recallPlayer(); AUDIO.sfx('magic', .8); msg = null;
      } else if (it.type === 'summonItem') {
        const boss = Object.keys(BOSSES).find(k => (BOSSES[k].summons || []).includes(it.id));
        if (!boss) { this.notify('Nothing answers the call.', '#c8a0a0'); return false; }
        if (!this.summonBoss(boss)) return false;
        AUDIO.sfx('boss', .8); msg = null;
      } else if (it.type === 'potion') {
        AUDIO.sfx('potion', 1); msg = null;
      } else {
        consumed = false;
      }
      if (!consumed) return false;
      p.removeItem(it.id, 1);
      p.useTimer = it.useTime || .6; p.useTotal = p.useTimer;
      if (it.useSound && AUDIO.sfx) AUDIO.sfx(it.useSound === 'gulp' ? 'potion' : it.useSound, 1);
      if (msg) this.chat(msg, '#c8e8a0');
      this.spawnPuff(p.cx, p.cy - 12, it.color || '#a0d8c0');
      return true;
    }

    recallPlayer() {
      const p = this.player, w = this.world;
      const tx = clamp(Math.floor(p.spawnX / TSZ), 2, w.w - 3);
      let ty = clamp(Math.floor(p.spawnY / TSZ), 2, w.h - 3);
      for (let i = 0; i < 40; i++) { if (!w.solid(tx, ty) && !w.solid(tx, ty - 1) && !w.solid(tx, ty + 1)) break; ty--; }
      this.spawnPuff(p.cx, p.cy, '#a0e0ff');
      p.x = tx * TSZ + 4; p.y = ty * TSZ; p.vx = 0; p.vy = 0; p.invuln = 1.2;
      this.spawnPuff(p.cx, p.cy, '#a0e0ff');
      this.snapCamera();
    }

    /* ----------------------------------------------------------- interaction */
    interactNear() {
      if (!this.player || this.player.dead) return;
      if (this.nearNPC) { this.openDialogue(this.nearNPC); return; }
      if (this.nearInteract) this.interactTile(this.nearInteract.x, this.nearInteract.y);
    }
    interactTile(tx, ty) {
      const w = this.world, id = w.get(tx, ty), def = TILES[id];
      if (!id) return false;
      if (!this.inReach(tx * TSZ + 8, ty * TSZ + 8, 1)) { this.notify('Too far away.', '#d0a090'); return false; }
      if (id === T.DOOR_CLOSED || id === T.DOOR_OPEN) {
        const opening = id === T.DOOR_CLOSED;
        for (let dy = -2; dy <= 1; dy++) {
          const cur = w.get(tx, ty + dy);
          if (cur === T.DOOR_CLOSED || cur === T.DOOR_OPEN) w.set(tx, ty + dy, opening ? T.DOOR_OPEN : T.DOOR_CLOSED);
        }
        AUDIO.sfx('door', 1); return true;
      }
      if (def.interact === 'chest') {
        let c = w.chestAt(tx, ty);
        if (!c) { c = { x: tx, y: ty, items: new Array(20).fill(null) }; w.chests.set(tx + ',' + ty, c); }
        if (!Array.isArray(c.items)) c.items = new Array(20).fill(null);
        while (c.items.length < 20) c.items.push(null);
        this.activeChest = c; this.uiMode = 'chest'; this.mouse.left = this.mouse.right = false;
        AUDIO.sfx('chest', 1); return true;
      }
      if (def.interact === 'pot') { this.breakPot(tx, ty); return true; }
      if (def.interact === 'bed') {
        this.player.spawnX = tx * TSZ + 8; this.player.spawnY = ty * TSZ;
        this.notify('Spawn point set. The bed is warm.', '#c8e0a0'); AUDIO.sfx('click'); return true;
      }
      if (def.interact === 'orb') {
        this.smashOrb(tx, ty); return true;
      }
      if (def.interact === 'life') {
        const p = this.player;
        if (p.usedLifeCrystal >= 15) { this.notify('Your life is already at its limit.', '#d0b080'); return false; }
        p.usedLifeCrystal++; p.maxLife += 20; p.life += 20;
        w.set(tx, ty, 0); AUDIO.sfx('heal'); this.spawnPuff(tx * TSZ + 8, ty * TSZ + 8, '#ffd0d0');
        this.chat('A life crystal dissolves into your chest. Max life ' + p.maxLife + '.', '#ffb0b0'); return true;
      }
      if (id === T.ALTAR) {
        this.chat('A demon altar. It hums with a cold and ancient power.', '#c090e0'); return true;
      }
      if (def.interact) return true;
      return false;
    }
    smashOrb(tx, ty) {
      const w = this.world;
      if (w.get(tx, ty) === T.SHADOW_ORB) {
        w.set(tx, ty, 0);
        this.chat('A Shadow Orb shatters. A foul wind sweeps the corruption.', '#c080e0');
        this.spawnPuff(tx * TSZ + 8, ty * TSZ + 8, '#a060d0');
        this.spawnCoins(this.rng.int(2000, 5000), tx * TSZ + 8, ty * TSZ);
        this.spawnItem(this.rng.chance(.5) ? 'musketBall' : 'shadowScale', this.rng.int(3, 8), tx * TSZ + 8, ty * TSZ);
        this.meteorLandingSoon = true;
        this.shake = 12; AUDIO.sfx('roar', 1);
        this.saveGame(true);
      } else if (w.get(tx, ty) === T.CRIMSON_HEART) {
        w.set(tx, ty, 0);
        this.chat('A Crimson Heart bursts in a shower of gore.', '#e06070');
        this.spawnPuff(tx * TSZ + 8, ty * TSZ + 8, '#c04050');
        this.spawnCoins(this.rng.int(2000, 5000), tx * TSZ + 8, ty * TSZ);
        this.spawnItem('tissueSample', this.rng.int(3, 8), tx * TSZ + 8, ty * TSZ);
        this.shake = 12; AUDIO.sfx('roar', 1);
        this.saveGame(true);
      }
    }
    openDialogue(npc) {
      if (!npc) return;
      this.activeNpc = npc; this.uiMode = 'dialogue'; npc.state = 'talk';
      this.mouse.left = this.mouse.right = false;
      AUDIO.sfx('quest', 1);
      const line = npc.def && npc.def.lines && npc.def.lines.length ? npc.def.lines[Math.floor(this.time / 7) % npc.def.lines.length] : '';
      if (line) this.chat(npc.name + ': ' + line, '#d8d0a8');
    }
    updateNearby() {
      const p = this.player;
      this.nearNPC = null; this.nearInteract = null;
      let best = 46;
      for (const n of this.npcs) {
        if (!n || n.dead) continue;
        const d = U.dist(p.cx, p.feet, n.cx, n.feet);
        if (d < best) { best = d; this.nearNPC = n; }
      }
      if (this.nearNPC) return;
      const m = this.tileUnderMouse();
      const pt = { x: Math.floor(p.cx / TSZ), y: Math.floor(p.cy / TSZ) };
      let bestD = 7.5 * 16, found = null;
      const scan = (tx, ty) => {
        if (!this.world.inBounds(tx, ty)) return;
        const id = this.world.get(tx, ty), def = TILES[id];
        if (!id || !def) return;
        let label = null;
        if (def.interact === 'chest') label = 'OPEN CHEST';
        else if (def.interact === 'pot') label = 'SMASH POT';
        else if (def.interact === 'bed') label = 'SET SPAWN';
        else if (def.interact === 'orb') label = 'SMASH ORB';
        else if (def.interact === 'life') label = 'TOUCH LIFE CRYSTAL';
        else if (id === T.DOOR_CLOSED) label = 'OPEN DOOR';
        else if (id === T.DOOR_OPEN) label = 'CLOSE DOOR';
        else if (id === T.ALTAR) label = 'ALTAR';
        if (!label) return;
        const d = U.dist(p.cx, p.cy, tx * TSZ + 8, ty * TSZ + 8);
        if (d < bestD) { bestD = d; found = { x: tx, y: ty, label }; }
      };
      if (m && m.id) scan(m.x, m.y);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) scan(pt.x + dx, pt.y + dy);
      this.nearInteract = found;
    }

    /* ------------------------------------------------------------- grapple etc */
    tryGrapple() {
      const p = this.player;
      if (!p) return;
      if (p.hook) { p.hook = null; p.hookHold = false; AUDIO.sfx('click', 1.4); return; }
      if (!p.stats.grapple) { this.notify('You need a grappling hook accessory.', '#c8b080'); return; }
      const m = this.mouseWorld();
      if (!p.fireHook(this, m.x, m.y)) this.notify('No surface to grapple.', '#c8b080');
    }
    quickHeal() {
      const p = this.player;
      if (!p || p.dead || p.useTimer > 0) return;
      let best = -1, bestHeal = 0;
      for (let i = 0; i < p.inventory.length; i++) {
        const s = p.inventory[i], it = s && I[s.id];
        if (!it || !it.heal) continue;
        if (p.life >= p.maxLife) { this.notify('You are already at full health.', '#a0e090'); return; }
        if (it.heal > bestHeal) { bestHeal = it.heal; best = i; }
      }
      if (best < 0) { this.notify('You have no healing potions.', '#e0a080'); return; }
      this.consumeAt(best);
    }
    dropSelected(shift) {
      const p = this.player, slot = p.selectedItem();
      if (!slot) return;
      const it = I[slot.id];
      const n = shift ? slot.count : 1;
      slot.count -= n; if (slot.count <= 0) p.inventory[p.selected] = null;
      this.drops.push(new ENT.ItemDrop(this, slot.id, n, p.cx, p.cy - 6, { vx: p.dir * 120, vy: -120 }));
      AUDIO.sfx('click', .9);
    }

    /* ================================================================ ENTITIES */
    updateEnemies(dt) {
      this.updateAudio(dt);
      const p = this.player;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e) { this.enemies.splice(i, 1); continue; }
        if (!e.dead) {
          e.update(this, dt);
          if (p && !p.dead && !e.dead && (!e.boss || e.intro <= 0)) {
            const hb = { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 4 };
            if (ENT.overlap(hb, p)) {
              const dealt = p.hurt(this, e.damage, e.cx, {});
              if (dealt > 0) {
                this.deathCause = (e.name || 'A monster') + ' struck you down.';
                if (e.type === 'hornet' || e.type === 'maneater') p.addBuff('poison', 6);
                else if (e.type === 'fireImp' || e.type === 'demon' || e.type === 'boneSerpent') p.addBuff('onFire', 4);
                else if (e.type === 'skeleton' || e.type === 'armoredSkeleton') p.addBuff('bleeding', 5);
              }
            }
          }
        }
        if (e.dead) {
          e.deathTimer += dt;
          if (e.deathTimer > .25 || e.boss) this.enemies.splice(i, 1);
        } else if (!e.boss) {
          const far = Math.abs(e.cx - p.cx) > 2400 || Math.abs(e.cy - p.cy) > 1600;
          if (far || e.despawn) this.enemies.splice(i, 1);
        }
        if (p.dead) break;
      }
    }
    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.update(this, dt);
        if (pr.dead) this.projectiles.splice(i, 1);
      }
    }
    updateDrops(dt) {
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.update(this, dt);
        if (d.dead) this.drops.splice(i, 1);
      }
    }
    updateMinions(dt) {
      for (let i = this.minions.length - 1; i >= 0; i--) {
        const m = this.minions[i];
        m.update(this, dt);
        if (m.dead || m.life <= 0) this.minions.splice(i, 1);
      }
    }
    updateNpcs(dt) {
      for (const n of this.npcs) if (!n.dead) n.update(this, dt);
    }
    onEnemyDeath(e) {
      if (!e || e.boss) return;
      const p = this.player;
      this.stats.enemiesKilled = (this.stats.enemiesKilled || 0) + 1;
      if (p) p.kills = (p.kills || 0) + 1;
      if (this.quest && this.quest.active && this.quest.type === 'kill' && this.quest.target === e.type) {
        this.stats.questKills = (this.stats.questKills || 0) + 1;
      }
      const d = e.def;
      for (const drop of (d.drops || [])) {
        if (drop.chance != null && !this.rng.chance(drop.chance)) continue;
        const count = this.rng.int(drop.min || 1, drop.max || drop.min || 1);
        this.spawnItem(drop.id, count, e.cx, e.cy);
      }
      const value = Math.max(1, Math.round((d.value || 0) * this.rng.float(.5, 1.1)));
      if (value > 0) this.spawnCoins(value, e.cx, e.cy);
      if (this.rng.chance(.075)) this.spawnItem(this.rng.chance(.55) ? 'lesserHealingPotion' : 'manaPotion', 1, e.cx, e.cy);
    }
    onBossDeath(b) {
      if (!b || this.defeated[b.bossType]) return;
      const id = b.bossType, def = BOSSES[id];
      this.defeated[id] = true;
      this.stats.bossesKilled = (this.stats.bossesKilled || 0) + 1;
      this.chat(def.name + ' has been defeated!', '#ffd890');
      AUDIO.sfx('roar', .7);
      for (const dropId of (def.drops || [])) {
        if (!I[dropId]) continue;
        let count = 1;
        if (/ore$|Bar$|Scale|Sample|Soul|Gel|Bone|Wax/.test(dropId)) count = this.rng.int(8, 26);
        this.spawnItem(dropId, count, b.cx, b.cy);
      }
      this.spawnCoins(def.value || 1000, b.cx, b.cy);
      if (id === 'wallOfFlesh') {
        this.world.hardmodeOres(true);
        this.world.spreadHallowed();
        if (this.event && this.event.type === 'wallOfFlesh') this.event = null;
        this.chat('The Wall of Flesh falls. Ancient ores awaken and the world is changed forever.', '#ffb060');
        this.notify('HARDMODE BEGINS', '#ffb060');
        this.flash = 2.2; this.shake = 18;
      }
      this.enemies = this.enemies.filter(e => e !== b);
      this.saveGame(true);
    }
    spawnEnemy(type, x, y, opts) {
      if (!ENEMIES[type] || !this.world) return null;
      if (this.enemies.length > 42) return null;
      const e = new ENT.Enemy(this, type, x, y, opts || {});
      this.enemies.push(e);
      return e;
    }
    spawnBoss(id, x, y) {
      if (!BOSSES[id]) return null;
      const b = new ENT.Boss(this, id, x, y, {});
      this.enemies.push(b);
      this.chat(BOSSES[id].name + ' has awoken!', '#ffb0b0');
      this.shake = 10; AUDIO.setTrack('boss'); AUDIO.sfx('roar', 1);
      return b;
    }
    summonBoss(id) {
      if (this.enemies.some(e => e.boss && !e.dead)) { this.notify('A boss is already here!', '#e08080'); return false; }
      const p = this.player, w = this.world;
      const depth = p.cy / TSZ;
      const band = w.biomeAt(p.cx / TSZ);
      if (id === 'eyeOfCthulhu' && !this.night) { this.notify('The Eye only answers at night.', '#c0a0e0'); return false; }
      if (id === 'skeletron' && !this.night) { this.notify('Skeletron only wakes at night.', '#c0a0e0'); return false; }
      if (id === 'wallOfFlesh' && depth < window.HELL_LEVEL) { this.notify('The guide whispers of a wall far below, in the Underworld.', '#c07070'); return false; }
      if ((id === 'eaterOfWorlds' || id === 'brainOfCthulhu') && band !== 'corruption' && band !== 'crimson') {
        this.notify('This summon only works in the Corruption.', '#a080c0'); return false;
      }
      if (id === 'queenBee' && w.biomeAt(p.cx / TSZ, p.cy / TSZ) !== 'jungle') { this.notify('The Queen sleeps in the Jungle.', '#e0c080'); return false; }
      let sx = p.cx, sy = p.cy - 180;
      if (id === 'wallOfFlesh') { sx = p.cx + 480; sy = p.cy; this.event = { type: 'wallOfFlesh', timer: 999 }; }
      else if (id === 'kingSlime' || id === 'eyeOfCthulhu') { sx = p.cx + this.rng.float(-80, 80); sy = p.cy - 260; }
      else if (id === 'skeletron') { sx = p.cx; sy = p.cy - 220; }
      const b = this.spawnBoss(id, sx, sy);
      return !!b;
    }

    findSpawnY(px, centerTy, rx, ry) {
      if (!this.world) return null;
      const w = this.world;
      const tx = clamp(Math.floor(px / TSZ), 2, w.w - 3);
      const c = clamp(Math.floor(centerTy), 2, w.h - 3);
      const range = ry || 20;
      for (let r = 0; r <= range; r++) {
        for (const dir of (r === 0 ? [0] : [-1, 1])) {
          const ty = c + dir * r;
          if (ty < 2 || ty > w.h - 3) continue;
          if (!w.solid(tx, ty) && !w.solid(tx, ty - 1) && (w.solid(tx, ty + 1) || w.platform(tx, ty + 1))) return ty + 1;
        }
      }
      return null;
    }
    updateSpawns(dt) {
      const p = this.player;
      if (!p || p.dead) return;
      this.spawnTimer -= dt;
      if (this.spawnTimer > 0) return;
      const depth = p.cy / TSZ;
      const inCave = depth > window.ROCK_LEVEL - 8;
      const cap = inCave ? 15 : 11;
      if (this.enemies.filter(e => !e.boss).length >= cap) { this.spawnTimer = 1.4; return; }
      this.spawnTimer = this.rng.float(2.6, 5.5) * (this.night ? .75 : 1) * (this.event ? .55 : 1);
      const side = this.rng.chance(.5) ? -1 : 1;
      const px = p.cx + side * this.rng.float(300, 560);
      if (px < 32 || px > this.world.w * TSZ - 32) return;
      const pcx = Math.floor(px / TSZ);
      let groundY;
      let center = p.cy / TSZ;
      if (!inCave) center = this.world.surface[clamp(pcx, 0, this.world.w - 1)] - 2;
      groundY = this.findSpawnY(px, center, 8, inCave ? 24 : 10);
      if (groundY == null) return;
      const biome = this.world.biomeAt(pcx, groundY);
      const night = this.night;
      const depthTiles = groundY;
      const candidates = [];
      for (const [id, d] of Object.entries(ENEMIES)) {
        if (!d || d.boss || d.minion || d.critter || d.event) continue;
        if (d.hardmode && !this.world.hardmode) continue;
        if (d.minDepth != null && depthTiles < d.minDepth) continue;
        if (d.maxDepth != null && depthTiles > d.maxDepth) continue;
        if (d.mode === 'night' && !night) continue;
        if (d.mode === 'day' && night) continue;
        const bs = d.biomes || [];
        let ok = false;
        for (const b of bs) {
          if (b === biome) { ok = true; break; }
          if ((biome === 'cave' || biome === 'underground') && b === 'underground') { ok = true; break; }
          if (biome === 'hell' && b === 'underworld') { ok = true; break; }
          if ((biome === 'ocean' || biome === 'beach') && (b === 'forest' || b === 'ocean' || b === 'beach')) { ok = true; break; }
          if (biome === 'dungeon' && (b === 'underground' || b === 'dungeon')) { ok = true; break; }
          if (this.world.hardmode && b === 'hallow' && (biome === 'forest' || biome === 'hallow')) { ok = true; break; }
        }
        if (ok && this.rng.chance(Math.min(1, .18 + (d.weight || 1) * .09))) candidates.push(id);
      }
      let type = candidates.length ? candidates[this.rng.int(0, candidates.length - 1)] : null;
      if (this.event && this.event.type === 'bloodMoon' && !inCave && this.rng.chance(.6)) {
        const pool = ['zombie', 'demonEye', 'crimera', 'faceMonster'];
        type = pool[this.rng.int(0, pool.length - 1)];
      }
      if (!type) type = inCave ? (this.rng.chance(.35) ? 'caveBat' : 'skeleton') : 'greenSlime';
      const d = ENEMIES[type];
      if (!d) return;
      const sy = groundY * TSZ;
      const sx = pcx * TSZ + 8;
      this.spawnEnemy(type, sx, d.ai === 'flyer' ? sy - this.rng.float(30, 120) : sy);
    }

    /* ================================================================ ITEMS / FX */
    spawnItem(id, count, x, y, opts) {
      if (!id || !I[id] || !(count > 0)) return;
      const max = ENT.maxStack(id) || 999;
      let left = count;
      let guard = 0;
      while (left > 0 && guard++ < 20) {
        const n = Math.min(max, left);
        this.drops.push(new ENT.ItemDrop(this, id, n, x + this.rng.float(-5, 5), y + this.rng.float(-5, 5), opts));
        if (!opts) opts = { vx: this.rng.float(-60, 60), vy: this.rng.float(-150, -40) };
        left -= n;
      }
      if (this.drops.length > 260) this.drops.splice(0, this.drops.length - 260);
    }
    spawnCoins(value, x, y) {
      let v = Math.max(1, Math.round(value));
      const parts = [[1000000, 'coinPlatinum'], [10000, 'coinGold'], [100, 'coinSilver'], [1, 'coinCopper']];
      for (const [unit, id] of parts) {
        const n = Math.floor(v / unit);
        if (n > 0) { this.spawnItem(id, n, x, y); v -= n * unit; }
      }
    }
    explode(x, y, radiusTiles, damage, friendly) {
      const r = Math.max(16, radiusTiles * TSZ);
      this.shake = Math.max(this.shake, 16); this.flash = Math.max(this.flash, .8);
      AUDIO.sfx('explosion', 1); this.fireBurst(x, y, '#ffb050', 30);
      for (let i = 0; i < 26; i++) this.addParticle(x + this.rng.float(-r, r), y + this.rng.float(-r, r), '#4a4448', this.rng.int(2, 6), this.rng.float(-90, 90), this.rng.float(-110, 20), this.rng.float(.4, 1.1), 80);
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = U.dist(x, y, e.cx, e.cy);
        if (d < r + e.w * .5) {
          e.takeDamage(this, Math.max(4, Math.round(damage * (1 - d / (r * 1.8)))), U.sign(e.cx - x) * 4, false);
        }
      }
      if (!friendly) {
        const d = U.dist(x, y, this.player.cx, this.player.cy);
        if (d < r) this.player.hurt(this, Math.max(4, Math.round(damage * .7)), x, {});
      }
      const w = this.world;
      const tx0 = Math.floor((x - r) / TSZ), tx1 = Math.floor((x + r) / TSZ);
      const ty0 = Math.floor((y - r) / TSZ), ty1 = Math.floor((y + r) / TSZ);
      let broke = 0;
      for (let ty = ty0; ty <= ty1 && broke < 130; ty++) {
        for (let tx = tx0; tx <= tx1 && broke < 130; tx++) {
          if (!w.inBounds(tx, ty)) continue;
          if (U.dist(x, y, tx * TSZ + 8, ty * TSZ + 8) > r) continue;
          const id = w.get(tx, ty), def = TILES[id];
          if (!id || !def || id === T.WATER || id === T.LAVA) continue;
          if (def.interact === 'chest') { this.breakChestAt(tx, ty); broke++; continue; }
          w.set(tx, ty, 0);
          if (w.chestAt(tx, ty)) w.chests.delete(tx + ',' + ty);
          this.dust(tx * TSZ + 8, ty * TSZ + 8, 2, def.color || '#a08060');
          broke++;
        }
      }
    }

    /* ================================================================ NPC / HOUSING */
    scanDoorCache() {
      this.doorCache = [];
      const w = this.world;
      if (!w) return;
      const px = Math.floor((this.player ? this.player.cx : w.spawnX * TSZ) / TSZ);
      for (let x = Math.max(0, px - 160); x < Math.min(w.w, px + 160); x++) {
        for (let y = 0; y < w.h; y++) {
          const id = w.get(x, y);
          if (id === T.DOOR_CLOSED || id === T.DOOR_OPEN) this.doorCache.push({ x, y, id });
        }
      }
    }
    scanHouses() {
      const w = this.world, p = this.player;
      if (!w || !p) return;
      const vis = this._roomSeen || (this._roomSeen = new Uint8Array(w.w * w.h));
      vis.fill(0);
      const cx = Math.floor(p.cx / TSZ), cy = Math.floor(p.cy / TSZ);
      const R = 80;
      const rooms = [];
      const solid = (x, y) => w.solid(x, y);
      for (let y = Math.max(2, cy - R); y < Math.min(w.h - 2, cy + R); y++) {
        for (let x = Math.max(2, cx - R); x < Math.min(w.w - 2, cx + R); x++) {
          const idx = y * w.w + x;
          if (vis[idx]) continue;
          if (solid(x, y) || !w.getWall(x, y)) continue;
          const id0 = w.get(x, y);
          if (id0 === T.DOOR_CLOSED || id0 === T.DOOR_OPEN) continue;
          const stack = [x, y];
          let minX = x, maxX = x, minY = y, maxY = y, count = 0, hasDoor = false, hasTable = false, hasChair = false, hasLight = false;
          while (stack.length) {
            const yy = stack.pop(), xx = stack.pop();
            if (xx < 1 || yy < 1 || xx >= w.w - 1 || yy >= w.h - 1) continue;
            const ii = yy * w.w + xx;
            if (vis[ii]) continue;
            const id = w.get(xx, yy);
            if (id === T.DOOR_CLOSED || id === T.DOOR_OPEN) { hasDoor = true; vis[ii] = 1; continue; }
            if (id && TILES[id] && TILES[id].solid) continue;
            if (!w.getWall(xx, yy)) continue;
            vis[ii] = 1; count++;
            if (id === T.TABLE) hasTable = true;
            if (id === T.CHAIR) hasChair = true;
            if (id === T.TORCH || id === T.LANTERN || id === T.CANDLE || id === T.CAMPFIRE) hasLight = true;
            if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
            stack.push(xx + 1, yy, xx - 1, yy, xx, yy + 1, xx, yy - 1);
          }
          const rw = maxX - minX + 1, rh = maxY - minY + 1;
          if (count < 24 || rw < 5 || rh < 3 || rw > 40 || rh > 22) continue;
          /* A door anywhere on the room border counts. */
          for (let bx = minX - 1; bx <= maxX + 1 && !hasDoor; bx++) {
            for (let by = minY - 1; by <= maxY + 1 && !hasDoor; by++) {
              const id = w.get(bx, by);
              if (id === T.DOOR_CLOSED || id === T.DOOR_OPEN) hasDoor = true;
            }
          }
          if (!hasDoor || !hasTable || !hasChair || !hasLight) continue;
          rooms.push({ x: minX, y: minY, w: rw, h: rh, door: hasDoor });
        }
      }
      this.houses = rooms;
    }
    occupiedRoom(room, skip) {
      for (const n of this.npcs) {
        if (!n || n === skip || !n.home) continue;
        if (n.home.x < room.x + room.w && n.home.x + (n.home.w || 1) > room.x &&
          n.home.y < room.y + room.h && n.home.y + (n.home.h || 1) > room.y) return true;
      }
      return false;
    }
    npcCondition(def) {
      if (!def) return false;
      try { return def.condition ? !!def.condition(this.player, this) : true; } catch (e) { return false; }
    }
    tryMoveIn() {
      const p = this.player;
      if (!p) return;
      for (const [id, def] of Object.entries(NPCS)) {
        if (this.npcs.some(n => n.id === id)) continue;
        if (!this.npcCondition(def)) continue;
        const room = this.houses.find(r => !this.occupiedRoom(r));
        if (!room) return;
        const tx = room.x + Math.floor(room.w / 2);
        /* Walk down from the room's floor line to find the actual solid floor.
           The old upward search always stopped at the ceiling and rejected the room. */
        let ty = room.y + room.h;
        while (ty < this.world.h && !this.world.solid(tx, ty)) ty++;
        if (ty >= this.world.h) continue;
        const npc = new ENT.NPC(this, id, tx * TSZ + 8 - 9, ty * TSZ - 38);
        npc.home = { x: room.x, y: room.y, w: room.w, h: room.h };
        this.npcs.push(npc);
        this.chat(def.name + ' has moved in. ' + (def.arriveText || ''), '#d8e8a0');
        AUDIO.sfx('quest', 1);
      }
    }
    updateHouses(dt) {
      this.houseTimer -= dt;
      if (this.houseTimer > 0) return;
      this.houseTimer = 5;
      this.scanHouses();
      this.tryMoveIn();
    }

    /* ================================================================ UI ACTIONS */
    openInventory() { this.uiMode = 'inventory'; this.mouse.left = this.mouse.right = false; }
    closeUI() {
      if (this.activeNpc) this.activeNpc.state = 'idle';
      this.activeNpc = null; this.activeChest = null; this.uiMode = null;
      this.mouse.left = this.mouse.right = false;
    }
    setPaused(v) {
      this.paused = !!v;
      if (this.paused) { this.uiMode = null; this.mouse.left = this.mouse.right = false; }
      if (!this.paused) this.acc = 0;
    }
    nearbyStations() {
      const set = new Set();
      if (!this.world || !this.player) return set;
      const p = this.player;
      const cx = Math.floor(p.cx / TSZ), cy = Math.floor(p.cy / TSZ);
      const map = { [T.WORKBENCH]: 'workbench', [T.FURNACE]: 'furnace', [T.ANVIL]: 'anvil', [T.ANVIL2]: 'anvil', [T.ALCHEMY_TABLE]: 'alchemy', [T.LOOM]: 'loom', [T.HELLFORGE]: 'hellforge', [T.ALTAR]: 'altar' };
      for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 8; x <= cx + 8; x++) {
        if (!this.world.inBounds(x, y)) continue;
        const id = this.world.get(x, y);
        if (map[id]) set.add(map[id]);
      }
      return set;
    }
    canCraft(r) {
      if (!r) return false;
      if (r.hardmode && !this.world.hardmode) return false;
      if (r.station && !this.nearbyStations().has(r.station)) return false;
      for (const [id, n] of (r.ingredients || [])) if (this.player.countItem(id) < n) return false;
      return true;
    }
    craftSelected(recipe, count) {
      if (!recipe || !this.player) return;
      const p = this.player;
      let made = 0;
      const want = Math.max(1, Math.min(25, count || 1));
      for (let k = 0; k < want; k++) {
        if (!this.canCraft(recipe)) break;
        for (const [id, n] of (recipe.ingredients || [])) p.removeItem(id, n);
        const leftover = p.addItem(recipe.out, recipe.count || 1);
        if (leftover > 0) this.spawnItem(recipe.out, leftover, p.cx, p.cy - 8);
        made += recipe.count || 1;
      }
      if (made > 0) {
        this.stats.itemsCrafted += made;
        AUDIO.sfx('craft', 1);
        this.notify('Crafted ' + (I[recipe.out] ? ENT.prettyName(recipe.out) : recipe.out) + (made > 1 ? ' x' + made : '') + '.', '#a8e090');
        this.spawnPuff(p.cx, p.cy - 10, '#d8c080');
        p.recalc();
      }
    }
    lootAll() {
      if (!this.activeChest) return;
      for (let i = 0; i < this.activeChest.items.length; i++) {
        const s = this.activeChest.items[i];
        if (!s) continue;
        const left = this.player.addItem(s.id, s.count);
        if (left > 0) s.count = left; else this.activeChest.items[i] = null;
      }
      AUDIO.sfx('pickup');
    }
    buyItem(data) {
      if (!data || !data.id || !this.player) return;
      const p = this.player, price = Math.max(1, data.price || 0);
      if (p.wallet < price) { this.notify('You cannot afford that.', '#e08080'); AUDIO.sfx('fail'); return; }
      if (p.addItem(data.id, 1) > 0) { this.notify('Your inventory is full.', '#e08080'); return; }
      p.wallet -= price; AUDIO.sfx('coin', 1);
      this.notify('Bought ' + ENT.prettyName(data.id) + '.', '#d8d890');
    }
    sellSlot(index, shift) {
      const p = this.player, slot = p.inventory[index];
      if (!slot) return;
      const it = I[slot.id];
      if (!it) return;
      const n = shift ? slot.count : 1;
      const value = Math.max(1, Math.floor((it.value || 0) * .25)) * n;
      slot.count -= n; if (slot.count <= 0) p.inventory[index] = null;
      p.wallet += value; AUDIO.sfx('coin', 1);
      this.notify('Sold ' + ENT.prettyName(slot.id) + ' for ' + U.moneyString(value) + '.', '#d8d890');
    }
    openShop() {
      if (!this.activeNpc || !this.activeNpc.def || !this.activeNpc.def.shop) return;
      this.uiMode = 'shop'; this.mouse.left = this.mouse.right = false;
    }
    npcHeal() {
      const p = this.player;
      if (!p || !this.activeNpc || this.activeNpc.id !== 'nurse') return;
      if (p.life >= p.maxLife) { this.notify('You look perfectly healthy to me.', '#a0e090'); return; }
      const cost = Math.max(10, Math.ceil((p.maxLife - p.life) * .4));
      if (p.wallet < cost) { this.notify('A heal costs ' + U.moneyString(cost) + '. Come back with coin.', '#e08080'); return; }
      p.wallet -= cost; p.life = p.maxLife; p.mana = p.maxMana;
      p.addBuff('regeneration', 8);
      this.notify('Patched up for ' + U.moneyString(cost) + '.', '#a0e090'); AUDIO.sfx('heal');
    }
    npcQuest() {
      if (!this.activeNpc || this.activeNpc.id !== 'guide') return;
      if (!this.quest || !this.quest.active) {
        this.quest = { active: true, type: 'kill', target: 'greenSlime', need: 8, title: 'A Taste of Danger', desc: 'The Guide wants you to thin out the slimes near the surface.', progress: 0, reward: 500 };
        this.stats.questKills = 0;
        this.chat('The Guide asks you to defeat 8 slimes. A first step.', '#d8e8a0');
        return;
      }
      if (this.quest.progress >= this.quest.need) {
        this.player.wallet += this.quest.reward || 500;
        this.player.addItem('lesserHealingPotion', 3);
        this.chat('The Guide pays you ' + U.moneyString(this.quest.reward || 500) + ' and nods. Good work.', '#d8e8a0');
        AUDIO.sfx('coin');
        this.quest = null;
      } else {
        this.chat('Slimes defeated: ' + this.quest.progress + ' / ' + this.quest.need + '.', '#d8e8a0');
      }
    }
    sortInventory() {
      const p = this.player, inv = p.inventory;
      const all = inv.filter(Boolean);
      const merged = new Map();
      for (const s of all) {
        const cap = ENT.maxStack(s.id);
        let left = s.count;
        if (merged.has(s.id)) {
          const cur = merged.get(s.id);
          const take = Math.min(cap - cur.count, left);
          cur.count += take; left -= take;
        }
        if (left > 0) merged.set(s.id, { id: s.id, count: left });
      }
      const list = Array.from(merged.values());
      const order = { weapon: 1, tool: 2, armor: 3, accessory: 4, potion: 5, summonItem: 6, consumable: 7, material: 8, block: 9, wall: 10, ammo: 11 };
      list.sort((a, b) => {
        const ia = I[a.id] || {}, ib = I[b.id] || {};
        return (order[ia.type] || 20) - (order[ib.type] || 20) || (ib.rarity === 'orange' ? 1 : 0) - (ia.rarity === 'orange' ? 1 : 0) || a.id.localeCompare(b.id);
      });
      p.inventory = new Array(50).fill(null);
      for (let i = 0; i < list.length && i < 50; i++) p.inventory[i] = list[i];
      p.recalc(); AUDIO.sfx('click');
    }
    trashCursor() {
      if (!this.cursor) return;
      this.spawnPuff(this.player.cx, this.player.cy - 10, '#8a7a7a');
      this.cursor = null; AUDIO.sfx('click');
    }
    equipKeyIndex(index) {
      if (index === 'helmet' || index === 'chest' || index === 'legs') return index;
      return Number(index);
    }
    getEquipItem(index) {
      const k = this.equipKeyIndex(index);
      const id = typeof k === 'number' ? (this.player.equip.accessory[k] || null) : (this.player.equip[k] || null);
      return id ? { id, count: 1 } : null;
    }
    setEquipItem(index, item) {
      const k = this.equipKeyIndex(index);
      const id = item && item.id ? item.id : item;
      if (typeof k === 'number') this.player.equip.accessory[k] = id || null;
      else this.player.equip[k] = id || null;
    }
    slotClick(area, index, button, shift) {
      const p = this.player;
      if (!p) return;
      if (area === 'inv') { this.slotInventory(index, button, shift); return; }
      if (area === 'chest') { this.slotChest(index, button, shift); return; }
      if (area === 'equip') { this.slotEquip(index, button, shift); return; }
    }
    slotInventory(index, button, shift) {
      const p = this.player, slot = p.inventory[index];
      if (this.cursor) {
        if (!slot) {
          if (button === 2) { p.inventory[index] = { id: this.cursor.id, count: 1 }; this.cursor.count--; if (this.cursor.count <= 0) this.cursor = null; }
          else { p.inventory[index] = this.cursor; this.cursor = null; }
        } else if (slot.id === this.cursor.id) {
          const cap = ENT.maxStack(slot.id), n = button === 2 ? 1 : this.cursor.count;
          const take = Math.min(cap - slot.count, n);
          slot.count += take; this.cursor.count -= take;
          if (this.cursor.count <= 0) this.cursor = null;
          if (take === 0) { /* swap */ }
        } else {
          p.inventory[index] = this.cursor; this.cursor = slot;
        }
        p.recalc(); AUDIO.sfx('click'); return;
      }
      if (!slot) return;
      if (button === 2) {
        const it = I[slot.id];
        if (!it) return;
        if (it.equip === 'helmet' || it.equip === 'chest' || it.equip === 'legs') { this.autoEquip(index); return; }
        if (it.equip === 'accessory') { this.autoEquip(index); return; }
        if (it.type === 'potion' || it.type === 'consumable' || it.type === 'summonItem') { this.consumeAt(index); return; }
      }
      if (shift && this.activeChest) {
        const left = this.addToChest(slot);
        if (left <= 0) p.inventory[index] = null; else slot.count = left;
        AUDIO.sfx('click'); return;
      }
      this.cursor = slot; p.inventory[index] = null; AUDIO.sfx('click');
    }
    slotChest(index, button, shift) {
      const p = this.player, chest = this.activeChest;
      if (!chest) return;
      const slot = chest.items[index];
      if (this.cursor) {
        if (!slot) { chest.items[index] = button === 2 ? { id: this.cursor.id, count: 1 } : this.cursor; if (button === 2) { this.cursor.count--; if (this.cursor.count <= 0) this.cursor = null; } else this.cursor = null; }
        else if (slot.id === this.cursor.id) {
          const cap = ENT.maxStack(slot.id), take = Math.min(cap - slot.count, button === 2 ? 1 : this.cursor.count);
          slot.count += take; this.cursor.count -= take; if (this.cursor.count <= 0) this.cursor = null;
        } else { chest.items[index] = this.cursor; this.cursor = slot; }
        AUDIO.sfx('click'); return;
      }
      if (!slot) return;
      if (button === 2) { const left = p.addItem(slot.id, 1); if (!left) { slot.count--; if (slot.count <= 0) chest.items[index] = null; } }
      else { const left = p.addItem(slot.id, slot.count); if (left <= 0) chest.items[index] = null; else slot.count = left; }
      AUDIO.sfx('pickup');
    }
    addToChest(slot) {
      const chest = this.activeChest;
      if (!chest) return slot.count;
      const cap = ENT.maxStack(slot.id); let left = slot.count;
      for (let i = 0; i < chest.items.length && left > 0; i++) {
        const s = chest.items[i];
        if (s && s.id === slot.id && s.count < cap) { const n = Math.min(cap - s.count, left); s.count += n; left -= n; }
      }
      for (let i = 0; i < chest.items.length && left > 0; i++) {
        if (!chest.items[i]) { const n = Math.min(cap, left); chest.items[i] = { id: slot.id, count: n }; left -= n; }
      }
      return left;
    }
    autoEquip(invIndex) {
      const p = this.player, slot = p.inventory[invIndex], it = slot && I[slot.id];
      if (!it) return;
      let key = null;
      if (it.equip === 'helmet' || it.equip === 'chest' || it.equip === 'legs') key = it.equip;
      else if (it.equip === 'accessory') {
        key = p.equip.accessory.findIndex(a => !a);
        if (key < 0) key = 0;
      } else return;
      const old = this.getEquipItem(key);
      this.setEquipItem(key, slot.id);
      slot.count--; if (slot.count <= 0) p.inventory[invIndex] = null;
      if (old) { if (p.addItem(old.id, 1) > 0) this.spawnItem(old.id, 1, p.cx, p.cy - 10); }
      p.recalc(); AUDIO.sfx('click');
    }
    slotEquip(index, button, shift) {
      const p = this.player, cur = this.getEquipItem(index);
      if (this.cursor) {
        const it = I[this.cursor.id];
        const k = this.equipKeyIndex(index);
        const valid = typeof k === 'number' ? (it && it.equip === 'accessory') : (it && it.equip === k);
        if (!valid) { this.notify('That does not fit there.', '#d0a090'); return; }
        this.setEquipItem(index, this.cursor.id);
        this.cursor.count--;
        if (this.cursor.count <= 0) this.cursor = null;
        if (cur) this.cursor = cur;
        p.recalc(); AUDIO.sfx('click'); return;
      }
      if (!cur) return;
      this.setEquipItem(index, null);
      const left = p.addItem(cur.id, cur.count);
      if (left > 0) this.spawnItem(cur.id, left, p.cx, p.cy - 10);
      p.recalc(); AUDIO.sfx('click');
    }

    /* ---------------------------------------------------------------- death */
    playerDeath(p) {
      if (!p || this.state === 'dead') return;
      this.state = 'dead'; p.dead = true; p.life = 0;
      this.uiMode = null; this.activeChest = null; this.activeNpc = null;
      this.stats.deaths = (this.stats.deaths || 0) + 1;
      this.respawnTimer = 8;
      this.deathLost = 0;
      if (!this.deathCause) this.deathCause = 'The world was too much.';
      this.mouse.left = this.mouse.right = false;
      AUDIO.sfx('death', 1); AUDIO.setTrack('night');
      try {
        const w = this.world, tx = Math.floor(p.cx / TSZ), ty = Math.floor(p.feet / TSZ) - 1;
        if (w.inBounds(tx, ty) && !w.solid(tx, ty) && w.solid(tx, ty + 1)) w.set(tx, ty, T.GRAVE);
      } catch (e) { }
      if (this.creation.mode === 'softcore') {
        this.deathLost = Math.floor(p.wallet * .5);
        p.wallet -= this.deathLost;
      } else if (this.creation.mode === 'mediumcore') {
        for (let i = 0; i < p.inventory.length; i++) {
          const s = p.inventory[i]; if (!s) continue;
          this.spawnItem(s.id, s.count, p.cx, p.cy - 8); p.inventory[i] = null;
        }
        this.deathLost = 0;
      } else {
        this.deathLost = 0;
        try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_META); } catch (e) { }
        this._hasSave = false; this._started = false;
      }
      this.chat('You were slain... ' + this.deathCause, '#e08080');
    }
    updateDeath(dt) {
      if (this.creation.mode === 'hardcore') return;
      if (this.respawnTimer > 0) this.respawnTimer = Math.max(0, this.respawnTimer - dt);
    }
    respawn() {
      if (this.state !== 'dead' || !this.player) return;
      if (this.creation.mode === 'hardcore') { this.quitToTitle(); return; }
      const p = this.player, w = this.world;
      p.dead = false; p.life = p.maxLife; p.mana = p.maxMana;
      let tx = clamp(Math.floor(p.spawnX / TSZ), 3, w.w - 4);
      let ty = clamp(Math.floor(p.spawnY / TSZ), 3, w.h - 4);
      for (let i = 0; i < 60; i++) { if (!w.solid(tx, ty) && !w.solid(tx, ty - 1)) break; ty--; }
      p.x = tx * TSZ + 2; p.y = ty * TSZ; p.vx = 0; p.vy = 0;
      p.invuln = 2.2; p.hurtFlash = 0; p.spawnX = tx * TSZ + 8; p.spawnY = p.spawnY;
      this.state = 'playing'; this.respawnTimer = 0;
      this.deathCause = 'The world was too much.';
      this.snapCamera();
      this.chat('You awaken at your spawn point.', '#c8d8a0');
      AUDIO.setTrack(this.world && p.cy / TSZ > window.ROCK_LEVEL ? 'underground' : 'overworld');
      this.saveGame(true);
    }
    snapCamera() {
      if (!this.player || !this.world) return;
      const p = this.player;
      this.cam.x = clamp(p.cx - VIEW_W * .5, 0, this.world.w * TSZ - VIEW_W);
      this.cam.y = clamp(p.cy - VIEW_H * .56, -180, this.world.h * TSZ - VIEW_H);
    }
    updateAudio(dt) {
      this._audioTimer = (this._audioTimer || 0) - dt;
      if (this._audioTimer > 0) return;
      this._audioTimer = .8;
      if (!this.world || !this.player) return;
      const depth = this.player.cy / TSZ;
      const boss = this.enemies.some(e => e.boss && !e.dead);
      const bio = this.world.biomeAt(this.player.cx / TSZ, depth);
      let track = 'overworld';
      if (boss) track = 'boss';
      else if (this.event) track = 'event';
      else if (depth > window.HELL_LEVEL) track = 'hell';
      else if (depth > window.CAVERN_LEVEL) track = 'cave';
      else if (depth > window.ROCK_LEVEL) track = 'underground';
      else if (this.night) track = 'night';
      else if (bio === 'jungle') track = 'jungle';
      else if (bio === 'desert') track = 'desert';
      else if (bio === 'snow') track = 'snow';
      else if (bio === 'corruption' || bio === 'crimson') track = 'corruption';
      if (track !== this._track) { this._track = track; AUDIO.setTrack(track); }
      let amb = 'none';
      if (this.weather.type === 'rain' || this.weather.type === 'storm') amb = 'rain';
      else if (depth > window.HELL_LEVEL) amb = 'lava';
      else if (depth > window.ROCK_LEVEL) amb = 'cave';
      else if (this.night) amb = 'wind';
      if (amb !== this._amb) { this._amb = amb; AUDIO.setAmbient(amb); }
    }

    /* ================================================================ RENDER */
    surfaceAt(tx) {
      const w = this.world;
      if (!w || !w.surface) return 180;
      return w.surface[clamp(tx | 0, 0, w.w - 1)] || 180;
    }
    tileMask(x, y) {
      const w = this.world;
      let m = 0;
      if (solidTile(tileAt(w, x, y - 1)) || this.world.platform(x, y - 1)) m |= 1;
      if (solidTile(tileAt(w, x + 1, y)) || this.world.platform(x + 1, y)) m |= 2;
      if (solidTile(tileAt(w, x, y + 1)) || this.world.platform(x, y + 1)) m |= 4;
      if (solidTile(tileAt(w, x - 1, y)) || this.world.platform(x - 1, y)) m |= 8;
      return m;
    }

    renderWorld(ctx) {
      const w = this.world, p = this.player;
      if (!w || !p) return;
      const bx = this.cam.x, by = this.cam.y;
      let sh = 0;
      if (this.shake > .6) sh = Math.min(11, this.shake);
      const camX = Math.round(bx + (sh ? this.rng.float(-sh, sh) : 0));
      const camY = Math.round(by + (sh ? this.rng.float(-sh, sh) * .7 : 0));
      this.cam.x = camX; this.cam.y = camY;
      this._frameLights = [];
      this._caveTint = null;
      this.renderSky(ctx, camX, camY);
      this.renderWorldLayers(ctx, camX, camY);
      this.renderLighting(ctx, camX, camY);
      this.renderWeather(ctx, camX, camY);
      this.renderCursor(ctx, camX, camY);
      this.renderScreenEffects(ctx, camX, camY);
      this.cam.x = bx; this.cam.y = by;
    }

    renderSky(ctx, camX, camY) {
      const w = this.world, p = this.player;
      this._moonPos = null;
      const ptx = clamp(Math.floor(p.cx / TSZ), 0, w.w - 1);
      const surf = this.surfaceAt(ptx);
      const surfY = surf * TSZ;
      const depth = p.cy / TSZ;
      const bd = w.biomeDefAt(ptx, depth) || window.BIOME_INFO.forest;
      const underground = p.cy > surfY + 42;
      const horizon = clamp(surfY - camY, 40, 760);
      const elev = Math.sin((this.dayTime - .25) * Math.PI * 2);
      const dayFactor = U.clamp(elev * 1.7 + .44, 0, 1);
      const nightT = U.clamp(-elev * 1.45 + .08, 0, 1);
      const dawn = Math.max(0, 1 - Math.abs(this.dayTime - .24) * 16) + Math.max(0, 1 - Math.abs(this.dayTime - .76) * 16);
      const weatherDark = this.weather.type !== 'clear' ? this.weather.intensity * .25 : 0;
      let c0 = bd.sky ? bd.sky[0] : '#64b6e8';
      let c1 = bd.sky ? bd.sky[1] : '#a7dbee';
      c0 = U.mix(c0, '#060a18', nightT * .82 + weatherDark * .8);
      c1 = U.mix(c1, '#111a2d', nightT * .74 + weatherDark * .65);
      if (dawn > .02) { c0 = U.mix(c0, '#28384e', dawn * .2); c1 = U.mix(c1, '#e89a60', Math.min(.65, dawn * .52)); }

      if (underground) {
        const deep = depth > window.HELL_LEVEL ? 'hell' : depth > window.CAVERN_LEVEL ? 'cavern' : depth > window.ROCK_LEVEL ? 'rock' : 'underground';
        let top = '#11101a', bot = '#1c1925';
        if (deep === 'cavern') { top = '#0d0d15'; bot = '#1a1723'; }
        else if (deep === 'hell') { top = '#1b0706'; bot = '#411511'; }
        else if (deep === 'rock') { top = '#12121a'; bot = '#211d2a'; }
        const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
        g.addColorStop(0, top); g.addColorStop(1, bot);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        this.drawCaveBackdrop(ctx, camX, camY, deep);
        this._caveTint = U.mix(bd.sky ? bd.sky[0] : '#222', '#000000', .55);
        return;
      }

      const g = ctx.createLinearGradient(0, 0, 0, Math.max(160, horizon + 120));
      g.addColorStop(0, c0); g.addColorStop(.72, c1); g.addColorStop(1, U.mix(c1, '#ffffff', dayFactor * .18));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      /* stars */
      if (nightT > .18) {
        ctx.globalAlpha = nightT * .9;
        for (let i = 0; i < 96; i++) {
          const x = Math.floor(U.hash2(i + 3, 7) * VIEW_W);
          const y = Math.floor(U.hash2(i + 3, 19) * Math.max(120, horizon - 30));
          const tw = .45 + .55 * Math.abs(Math.sin(this.time * (.6 + U.hash2(i, 4) * 1.3) + i));
          ctx.fillStyle = i % 9 === 0 ? '#ffe9b8' : '#dfeaff';
          ctx.globalAlpha = nightT * tw * .85;
          ctx.fillRect(x, y, i % 13 === 0 ? 2 : 1, i % 13 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }

      /* sun and moon */
      const arcT = ((this.dayTime + .75) % 1) / .5;
      if (dayFactor > .05 && this.dayTime > .21 && this.dayTime < .79) {
        const t = (this.dayTime - .21) / .58;
        const sx = 90 + t * (VIEW_W - 180);
        const sy = horizon - 44 - Math.sin(t * Math.PI) * Math.min(250, horizon * .62);
        if (sy > -60) {
          const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 72);
          glow.addColorStop(0, 'rgba(255,238,176,.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
          ctx.fillStyle = glow; ctx.fillRect(sx - 80, sy - 80, 160, 160);
          ctx.fillStyle = '#fff2b0'; ctx.fillRect(sx - 14, sy - 14, 28, 28);
          ctx.fillStyle = '#ffe38a'; ctx.fillRect(sx - 18, sy - 9, 36, 18); ctx.fillRect(sx - 9, sy - 18, 18, 36);
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(sx - 10, sy - 10, 9, 7);
        }
      }
      if (nightT > .18) {
        const t = ((this.dayTime + .25) % 1) / .5;
        if (t >= 0 && t <= 1) {
          const mx = 100 + t * (VIEW_W - 200);
          const my = horizon - 50 - Math.sin(t * Math.PI) * Math.min(240, horizon * .58);
          if (my > -70) {
            this._moonPos = { x: mx, y: my };
            const glow = ctx.createRadialGradient(mx, my, 2, mx, my, 80);
            glow.addColorStop(0, 'rgba(180,210,255,.22)'); glow.addColorStop(1, 'rgba(120,150,255,0)');
            ctx.fillStyle = glow; ctx.fillRect(mx - 90, my - 90, 180, 180);
            ctx.fillStyle = '#e8eeff'; ctx.fillRect(mx - 15, my - 15, 30, 30);
            ctx.fillStyle = '#c2cee8'; ctx.fillRect(mx - 17, my - 10, 34, 20); ctx.fillRect(mx - 10, my - 17, 20, 34);
            ctx.fillStyle = '#aeb9d0'; ctx.fillRect(mx + 2, my - 7, 8, 5); ctx.fillRect(mx - 7, my + 5, 5, 4); ctx.fillRect(mx + 6, my + 7, 4, 3);
          }
        }
      }

      /* clouds */
      if (horizon > 30) {
        const cloudA = (.42 + dayFactor * .32) * (1 - nightT * .55) * (this.weather.type === 'clear' ? 1 : 1.25);
        const drift = this.time * (5 + this.weather.intensity * 12);
        for (let i = 0; i < 9; i++) {
          const span = VIEW_W + 420;
          let x = ((i * 173 + 90 + U.hash2(i, 9) * 180) - (camX * .18 + drift)) % span;
          if (x < -200) x += span;
          const y = 50 + U.hash2(i, 5) * Math.max(60, Math.min(240, horizon - 110)) - (camY - this.player.cy + 180) * .035;
          const s = .7 + U.hash2(i, 12) * .9;
          this.drawCloud(ctx, x, y, s, cloudA * (.55 + U.hash2(i, 21) * .45), nightT);
        }
      }

      /* distant mountains / treeline */
      if (horizon > -80) {
        const layers = [
          { p: .08, amp: 120, base: 44, col: U.mix(c1, '#22303d', .45) },
          { p: .16, amp: 84, base: 28, col: U.mix(c1, '#1a2a2c', .58) },
          { p: .26, amp: 54, base: 15, col: U.mix(c1, '#13221f', .68) }
        ];
        for (let l = 0; l < layers.length; l++) {
          const L = layers[l];
          const baseY = horizon + L.base;
          ctx.beginPath(); ctx.moveTo(0, VIEW_H); ctx.lineTo(0, baseY);
          for (let x = 0; x <= VIEW_W + 32; x += 16) {
            const n = U.fbm1(771 + l * 131, (x + camX * L.p + l * 900) * .0043, 3);
            const ridge = U.fbm1(991 + l * 57, (x + camX * L.p * 1.7) * .012, 2);
            const peak = baseY - n * L.amp - ridge * 22;
            ctx.lineTo(x, peak);
          }
          ctx.lineTo(VIEW_W + 32, VIEW_H); ctx.closePath();
          ctx.fillStyle = U.mix(L.col, '#0a1119', nightT * .5); ctx.fill();
          if (l === 0) {
            ctx.strokeStyle = U.rgba('#d9ecf2', .15 + dayFactor * .15); ctx.lineWidth = 1; ctx.stroke();
          }
        }
        /* distant tree silhouettes */
        if (ptx > 100 && ptx < w.w - 100) {
          ctx.fillStyle = U.mix('#14251f', '#080c14', nightT * .4);
          for (let i = 0; i < 38; i++) {
            const x = Math.floor(((i * 61 - camX * .2) % (VIEW_W + 80)) - 40);
            const h = 12 + U.hash2(i, 3) * 20;
            const y = horizon + 12;
            ctx.fillRect(x, y - h, 3, h);
            ctx.fillRect(x - 5, y - h + 4, 12, 6);
            ctx.fillRect(x - 3, y - h - 2, 8, 7);
          }
        }
      }
      if (dawn > .02) {
        const dg = ctx.createLinearGradient(0, horizon - 150, 0, horizon + 40);
        dg.addColorStop(0, 'rgba(255,170,110,0)'); dg.addColorStop(.6, 'rgba(255,160,110,' + (.20 * dawn) + ')'); dg.addColorStop(1, 'rgba(255,120,80,0)');
        ctx.fillStyle = dg; ctx.fillRect(0, Math.max(0, horizon - 150), VIEW_W, 200);
      }
    }

    drawCloud(ctx, x, y, s, alpha, nightT) {
      if (alpha <= .02) return;
      ctx.save();
      ctx.globalAlpha = U.clamp(alpha, 0, 1);
      const white = U.mix('#f2f8ff', '#293247', nightT * .8);
      const shadeC = U.mix('#c5d6e2', '#1d2536', nightT * .8);
      const blocks = [
        [0, 10, 58, 10], [8, 4, 38, 10], [16, 0, 22, 8], [38, 6, 24, 9],
        [52, 12, 30, 8], [-12, 14, 24, 8], [22, 16, 38, 6]
      ];
      for (const b of blocks) {
        ctx.fillStyle = white;
        ctx.fillRect(Math.round(x + b[0] * s), Math.round(y + b[1] * s), Math.max(2, Math.round(b[2] * s)), Math.max(2, Math.round(b[3] * s)));
      }
      for (const b of blocks.slice(0, 3)) {
        ctx.fillStyle = shadeC;
        ctx.fillRect(Math.round(x + b[0] * s + 2), Math.round(y + b[1] * s + b[3] * s - 2), Math.max(2, Math.round(b[2] * s - 4)), 2);
      }
      ctx.restore();
    }

    drawCaveBackdrop(ctx, camX, camY, deep) {
      const w = this.world;
      const seed = w.seed || 1;
      /* soft rock layers */
      for (let l = 0; l < 3; l++) {
        const col = deep === 'hell' ? ['#1d0807', '#2b0d0a', '#3a130e'][l] : ['#13111a', '#191622', '#211c2c'][l];
        const base = 60 + l * 110;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= VIEW_W + 40; x += 40) {
          const n = U.fbm1(seed + 300 + l * 41, (x + camX * (.03 + l * .05)) * .004, 2);
          ctx.lineTo(x, base + n * 130 - 50);
        }
        ctx.lineTo(VIEW_W + 40, 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .32; ctx.strokeStyle = U.mix(col, '#ffffff', .12); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= VIEW_W + 40; x += 40) {
          const n = U.fbm1(seed + 300 + l * 41, (x + camX * (.03 + l * .05)) * .004, 2);
          const y = base + n * 130 - 50;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      /* stalactites and stalagmites */
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(((i * 97 - camX * .24) % (VIEW_W + 120)) - 60);
        const n = U.hash2(i + 11, 4);
        const h = 24 + n * 96;
        const y = 30 + U.hash2(i + 5, 8) * 170;
        ctx.fillStyle = deep === 'hell' ? '#2a0c09' : '#0f0d15';
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x + (n > .5 ? 2 : -2), y + h); ctx.closePath(); ctx.fill();
        if (i % 3 === 0) {
          ctx.fillStyle = deep === 'hell' ? 'rgba(255,90,40,.13)' : 'rgba(120,140,190,.055)';
          ctx.fillRect(x - 1, y + h - 8, 2, 8);
        }
      }
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(((i * 151 - camX * .18) % (VIEW_W + 180)) - 90);
        const h = 20 + U.hash2(i + 31, 7) * 70;
        const n = U.hash2(i, 13);
        ctx.fillStyle = deep === 'hell' ? '#340e08' : '#16131d';
        ctx.beginPath(); ctx.moveTo(x - 10, VIEW_H); ctx.lineTo(x + 10, VIEW_H); ctx.lineTo(x, VIEW_H - h); ctx.closePath(); ctx.fill();
        if (n > .8) { ctx.fillStyle = deep === 'hell' ? '#ff9a45' : '#5d6d8a'; ctx.fillRect(x - 1, VIEW_H - h, 2, 2); }
      }
      if (deep === 'hell') {
        const g = ctx.createRadialGradient(VIEW_W * .5, VIEW_H, 20, VIEW_W * .5, VIEW_H, 520);
        g.addColorStop(0, 'rgba(255,92,26,.24)'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (this.world.inDungeon(Math.floor(this.player.cx / TSZ), Math.floor(this.player.cy / TSZ))) {
        ctx.strokeStyle = 'rgba(120,140,180,.055)'; ctx.lineWidth = 2;
        for (let y = 0; y < VIEW_H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
        for (let x = 0; x < VIEW_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
      }
    }

    renderWorldLayers(ctx, camX, camY) {
      const w = this.world, p = this.player;
      const tx0 = Math.floor(camX / TSZ) - 1, tx1 = Math.ceil((camX + VIEW_W) / TSZ) + 1;
      const ty0 = Math.floor(camY / TSZ) - 1, ty1 = Math.ceil((camY + VIEW_H) / TSZ) + 1;
      const surface = this.surfaceAt(Math.floor(p.cx / TSZ));
      const depth = p.cy / TSZ;
      const deep = depth > surface + 10;
      ctx.imageSmoothingEnabled = false;

      /* background walls */
      for (let y = Math.max(1, ty0); y <= Math.min(w.h - 2, ty1); y++) {
        for (let x = Math.max(1, tx0); x <= Math.min(w.w - 2, tx1); x++) {
          const id = w.get(x, y);
          if (id && solidTile(id)) continue;
          const wall = w.getWall(x, y);
          if (!wall) continue;
          const sx = Math.round(x * TSZ - camX), sy = Math.round(y * TSZ - camY);
          ctx.globalAlpha = .92;
          ctx.drawImage(ART.wall(wall), sx, sy);
        }
      }
      ctx.globalAlpha = 1;

      /* liquids */
      for (let y = Math.max(1, ty0); y <= Math.min(w.h - 2, ty1); y++) {
        for (let x = Math.max(1, tx0); x <= Math.min(w.w - 2, tx1); x++) {
          const id = w.get(x, y);
          if (!isLiquidTile(id)) continue;
          const sx = Math.round(x * TSZ - camX), sy = Math.round(y * TSZ - camY);
          const kind = id === T.LAVA ? 'lava' : 'water';
          const variant = (x * 3 + y * 5) % 7;
          ctx.globalAlpha = kind === 'water' ? .88 : .92;
          ctx.drawImage(ART.liquid(kind, variant), sx, sy);
          const above = w.get(x, y - 1), left = w.get(x - 1, y), right = w.get(x + 1, y);
          if (kind === 'water' && above !== T.WATER && above !== T.LAVA) {
            const wob = Math.sin(this.time * 2.2 + x * .7) * 1.5;
            ctx.fillStyle = 'rgba(170,230,255,.55)';
            ctx.fillRect(sx, Math.round(sy + wob), TSZ, 1);
            if ((left !== T.WATER) || (right !== T.WATER)) { ctx.fillStyle = 'rgba(190,240,255,.3)'; ctx.fillRect(sx, Math.round(sy + wob) + 1, TSZ, 1); }
          } else if (kind === 'lava' && above !== T.LAVA) {
            ctx.fillStyle = 'rgba(255,180,80,.75)';
            ctx.fillRect(sx, Math.round(sy + Math.sin(this.time * 1.7 + x) * 1), TSZ, 1);
          }
          if (kind === 'lava' && (x % 3 === 0) && this.rng.chance(.012)) {
            this.addParticle(x * TSZ + 8, y * TSZ, '#ffb050', this.rng.int(1, 3), this.rng.float(-14, 14), this.rng.float(-40, -12), this.rng.float(.6, 1.5), -20, true);
          }
        }
      }
      ctx.globalAlpha = 1;

      /* foreground tiles */
      for (let y = Math.max(1, ty0); y <= Math.min(w.h - 2, ty1); y++) {
        for (let x = Math.max(1, tx0); x <= Math.min(w.w - 2, tx1); x++) {
          const id = w.get(x, y);
          if (!id || isLiquidTile(id)) continue;
          const def = TILES[id];
          if (!def) continue;
          const sx = Math.round(x * TSZ - camX), sy = Math.round(y * TSZ - camY);
          const mask = this.tileMask(x, y);
          ctx.drawImage(ART.tile(id, mask), sx, sy);
          if (def.light > 0) {
            this._frameLights.push({ x: x * TSZ + 8, y: y * TSZ + 8, r: 22 + def.light * 8.5, color: def.lightColor || '#ffc267', a: .8 });
          }
          if (id === T.HELLSTONE || id === T.METEORITE) {
            if (this.rng.chance(.0035)) this.addParticle(sx + camX, sy + camY, id === T.HELLSTONE ? '#ff9a45' : '#a58cff', 1, this.rng.float(-8, 8), -12, .9, -10, true);
          }
        }
      }

      /* grass tufts, flowers, pebbles */
      const x0 = Math.max(2, Math.floor(camX / TSZ) - 1), x1 = Math.min(w.w - 2, Math.ceil((camX + VIEW_W) / TSZ) + 1);
      for (let x = x0; x <= x1; x++) {
        const sy = this.surfaceAt(x);
        const sx = x * TSZ - camX;
        if (sx < -32 || sx > VIEW_W + 32) continue;
        const below = w.get(x, sy), above = w.get(x, sy - 1);
        if (above && solidTile(above)) continue;
        const isGrass = below === T.GRASS || below === T.JUNGLE_GRASS || below === T.CORRUPT_GRASS || below === T.ASH_GRASS || below === T.HALLOW_GRASS || below === T.MUSHROOM_GRASS;
        if (!isGrass) continue;
        const gx = sx, gy = sy * TSZ - camY;
        if (gy < -40 || gy > VIEW_H + 20) continue;
        const bio = w.biomeAt(x, sy);
        const n = U.hash2(x, 4);
        if (n < .78) {
          const cols = bio === 'corruption' ? ['#4b3554', '#6c4f7e'] : bio === 'crimson' ? ['#7a2b36', '#b44a55'] : bio === 'jungle' ? ['#2d6b29', '#5ba83f'] : bio === 'snow' ? ['#b5d9e4', '#e5f6fa'] : ['#3f7b32', '#6aa34d'];
          for (let i = 0; i < 3; i++) {
            const h = 3 + Math.floor(U.hash2(x, i + 7) * 6);
            ctx.fillStyle = i % 2 ? cols[0] : cols[1];
            ctx.fillRect(gx + 3 + i * 4, Math.round(gy - h), 1, h);
            if (n > .5) ctx.fillRect(gx + 4 + i * 4, Math.round(gy - h + 2), 1, 2);
          }
          if (n > .9) {
            const fc = ['#f0e070', '#f0a0c8', '#e8e8f0', '#ff9060'][Math.floor(U.hash2(x, 8) * 4)];
            ctx.fillStyle = fc; ctx.fillRect(gx + 6, Math.round(gy - 8), 3, 3); ctx.fillStyle = '#6a5030'; ctx.fillRect(gx + 7, Math.round(gy - 5), 1, 5);
          }
        }
        if (n > .78 && n < .9) {
          ctx.fillStyle = '#8a8174'; ctx.fillRect(gx + 4, Math.round(gy - 3), 5, 3); ctx.fillStyle = '#6b6358'; ctx.fillRect(gx + 8, Math.round(gy - 2), 3, 2);
        }
      }

      /* trees */
      const trees = w.trees || [];
      const visTrees = [];
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i];
        if (t.chopped) continue;
        const tx = t.x * TSZ;
        if (tx < camX - 80 || tx > camX + VIEW_W + 80) continue;
        visTrees.push(t);
      }
      visTrees.sort((a, b) => a.y - b.y);
      for (const t of visTrees) {
        const img = ART.tree(t.kind || 'forest', t.variant || 0, t.stage || 1);
        const dx = Math.round(t.x * TSZ + 8 - camX - img.width / 2);
        const dy = Math.round(t.y * TSZ - camY - 118);
        ctx.drawImage(img, dx, dy);
      }

      /* item drops */
      for (const d of this.drops) d.render(ctx, this);
      /* NPCs, enemies and minions sorted by feet */
      const actors = [];
      for (const n of this.npcs) if (!n.dead) actors.push(n);
      for (const e of this.enemies) if (!e.dead) actors.push(e);
      for (const m of this.minions) if (!m.dead) actors.push(m);
      actors.sort((a, b) => (a.feet || a.y || 0) - (b.feet || b.y || 0));
      for (const a of actors) a.render(ctx, this);
      for (const pr of this.projectiles) pr.render(ctx, this);
      for (const pa of this.particles) pa.render(ctx, this);
      if (!p.dead || this.state === 'playing') p.render(ctx, this);
      for (const pop of this.popups) pop.render(ctx, this);
    }

    renderLighting(ctx, camX, camY) {
      if (!this.darkCanvas) {
        this.darkCanvas = document.createElement('canvas');
        this.darkCanvas.width = VIEW_W; this.darkCanvas.height = VIEW_H;
        this.darkCtx = this.darkCanvas.getContext('2d');
      }
      const dctx = this.darkCtx;
      dctx.setTransform(1, 0, 0, 1, 0, 0);
      dctx.clearRect(0, 0, VIEW_W, VIEW_H);
      this._frameLights = this._frameLights || [];
      const lights = this.lightSources ? this.lightSources.slice() : [];
      for (const l of this._frameLights) {
        if (l.x < camX - l.r || l.x > camX + VIEW_W + l.r || l.y < camY - l.r || l.y > camY + VIEW_H + l.r) continue;
        lights.push(l);
      }
      const p = this.player;
      for (const e of this.enemies) {
        if (e.def && e.def.light > 0) lights.push({ x: e.cx, y: e.cy, r: 30 + e.def.light * 12, color: e.def.lightColor || '#ffb060', a: .5 });
      }
      for (const pr of this.projectiles) {
        if (pr.light > 0) lights.push({ x: pr.x, y: pr.y, r: 22 + pr.light * 9, color: pr.color || '#ffd080', a: .55 });
      }
      let darkness = U.clamp(1.03 - this.ambient * 1.02, .05, .94);
      if (this.weather.type === 'storm') darkness = Math.min(.96, darkness + .06);
      if (this._depthBad) { /* reserved */ }
      const depth = p.cy / TSZ;
      let tint = '4,7,15';
      if (depth > window.HELL_LEVEL) tint = '19,4,3';
      else if (depth > window.CAVERN_LEVEL) tint = '5,6,12';
      else if (depth > window.ROCK_LEVEL) tint = '6,7,14';
      dctx.fillStyle = 'rgba(' + tint + ',' + darkness + ')';
      dctx.fillRect(0, 0, VIEW_W, VIEW_H);
      dctx.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        const sx = l.x - camX, sy = l.y - camY;
        if (sx < -l.r || sy < -l.r || sx > VIEW_W + l.r || sy > VIEW_H + l.r) continue;
        const r = Math.max(18, l.r * (l.a ? .78 + l.a * .35 : 1));
        const grad = dctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        grad.addColorStop(0, 'rgba(255,255,255,' + U.clamp(l.a || .8, .1, 1) + ')');
        grad.addColorStop(.42, 'rgba(255,255,255,' + U.clamp((l.a || .8) * .62, .05, .8) + ')');
        grad.addColorStop(.72, 'rgba(255,255,255,' + U.clamp((l.a || .8) * .24, .02, .5) + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        dctx.fillStyle = grad;
        dctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      dctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.darkCanvas, 0, 0);
      /* colored glow pass */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowPower = 1 - this.ambient * .56;
      for (const l of lights) {
        const sx = l.x - camX, sy = l.y - camY;
        if (sx < -l.r || sy < -l.r || sx > VIEW_W + l.r || sy > VIEW_H + l.r) continue;
        const flick = .84 + Math.sin(this.time * 6 + l.x * .13) * .16;
        const r = l.r * 1.08;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        const c = U.hexToRgb(l.color || '#ffcf88');
        const a = (l.a || .3) * glowPower * flick;
        grad.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a * .5) + ')');
        grad.addColorStop(.45, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a * .18) + ')');
        grad.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
        ctx.fillStyle = grad; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      ctx.restore();
      this._frameLights = [];
    }

    renderWeather(ctx, camX, camY) {
      const p = this.player, w = this.world;
      if (this.weather.type === 'clear' || !p) return;
      const surf = this.surfaceAt(Math.floor(p.cx / TSZ));
      if (p.cy / TSZ > surf + 3 || this.shelter) return;
      const t = this.time, inten = this.weather.intensity;
      if (this.weather.type === 'snow') {
        ctx.fillStyle = 'rgba(230,244,255,.72)';
        for (let i = 0; i < 120; i++) {
          const x = ((i * 71 + t * (9 + (i % 5) * 3) + U.hash2(i, 2) * 500) % (VIEW_W + 80)) - 40;
          const y = ((i * 53 + t * (16 + (i % 7) * 4)) % (VIEW_H + 40)) - 20 + Math.sin(t + i) * 9;
          ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        }
      } else {
        ctx.strokeStyle = 'rgba(164,205,235,' + (.20 + inten * .28) + ')';
        ctx.lineWidth = 1;
        for (let i = 0; i < 150; i++) {
          const x = ((i * 53 + t * 420 * (.7 + inten * .5)) % (VIEW_W + 80)) - 40;
          const y = ((i * 37 + t * 520) % (VIEW_H + 80)) - 40;
          ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x - 3), Math.round(y + 12)); ctx.stroke();
        }
      }
      if (this.weather.type === 'storm') {
        ctx.fillStyle = 'rgba(8,12,22,' + (.08 + inten * .10) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }

    renderCursor(ctx, camX, camY) {
      const p = this.player;
      if (!p || this.uiMode || this.paused || this.state !== 'playing') return;
      const tx = Math.floor((this.mouse.x + camX) / TSZ), ty = Math.floor((this.mouse.y + camY) / TSZ);
      const reach = this.inReach(tx * TSZ + 8, ty * TSZ + 8, .2);
      const id = this.world.inBounds(tx, ty) ? this.world.get(tx, ty) : 0;
      if (this.world.inBounds(tx, ty) && reach && (id || this.world.getWall(tx, ty))) {
        ctx.strokeStyle = id ? 'rgba(255,242,190,.65)' : 'rgba(170,210,255,.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(tx * TSZ - camX) + .5, Math.round(ty * TSZ - camY) + .5, 15, 15);
      }
      const held = p.selectedItem(), it = held && I[held.id];
      if (it && it.block != null) {
        const tile = ART.tile(it.block, 15);
        ctx.globalAlpha = .48;
        ctx.drawImage(tile, Math.round(this.mouse.x - 8), Math.round(this.mouse.y - 8));
        ctx.globalAlpha = 1;
      }
      if (this._miningTile && this._miningTile.pct > 0) {
        const mt = this._miningTile;
        const sx = mt.x * TSZ - camX, sy = mt.y * TSZ - camY, pct = Math.min(1, mt.pct);
        ctx.strokeStyle = 'rgba(20,14,12,.65)'; ctx.lineWidth = 1;
        if (pct > .18) { ctx.beginPath(); ctx.moveTo(sx + 4, sy + 1); ctx.lineTo(sx + 7, sy + 7); ctx.lineTo(sx + 4, sy + 12); ctx.stroke(); }
        if (pct > .48) { ctx.beginPath(); ctx.moveTo(sx + 12, sy + 2); ctx.lineTo(sx + 9, sy + 8); ctx.lineTo(sx + 12, sy + 13); ctx.stroke(); }
        if (pct > .74) { ctx.beginPath(); ctx.moveTo(sx + 1, sy + 7); ctx.lineTo(sx + 8, sy + 9); ctx.lineTo(sx + 14, sy + 6); ctx.stroke(); }
      }
    }

    renderScreenEffects(ctx, camX, camY) {
      const p = this.player, w = this.world;
      if (!p) return;
      if (p.inWater) {
        const wg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
        wg.addColorStop(0, 'rgba(38,128,188,.14)'); wg.addColorStop(1, 'rgba(6,34,68,.26)');
        ctx.fillStyle = wg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.strokeStyle = 'rgba(170,235,255,.12)'; ctx.lineWidth = 2;
        for (let y = 0; y < VIEW_H; y += 42) {
          ctx.beginPath();
          for (let x = 0; x <= VIEW_W; x += 20) ctx.lineTo(x, y + Math.sin(this.time * 1.3 + x * .02 + y) * 6);
          ctx.stroke();
        }
      }
      if (p.inLava) { ctx.fillStyle = 'rgba(190,48,12,.22)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
      if (p.life / p.maxLife < .34) {
        const a = .18 + Math.sin(this.time * 4) * .06;
        const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 620);
        g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, 'rgba(130,10,10,' + a + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (this.ambient < .2 && !this._noVignette) {
        const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 180, VIEW_W / 2, VIEW_H / 2, 650);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (.18 + (1 - this.ambient) * .18) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (this.night && this._moonPos) {
        const m = this._moonPos;
        ctx.save();
        const glow = ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, 92);
        glow.addColorStop(0, 'rgba(220,235,255,.34)'); glow.addColorStop(.5, 'rgba(150,185,255,.10)'); glow.addColorStop(1, 'rgba(100,150,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(m.x - 100, m.y - 100, 200, 200);
        ctx.fillStyle = '#eef3ff'; ctx.fillRect(m.x - 15, m.y - 15, 30, 30);
        ctx.fillStyle = '#d9e2f4'; ctx.fillRect(m.x - 17, m.y - 10, 34, 20); ctx.fillRect(m.x - 10, m.y - 17, 20, 34);
        ctx.fillStyle = '#aeb9d0'; ctx.fillRect(m.x + 2, m.y - 7, 8, 5); ctx.fillRect(m.x - 7, m.y + 5, 5, 4); ctx.fillRect(m.x + 6, m.y + 7, 4, 3);
        ctx.restore();
      }
    }

  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    try {
      window.GAME = new Game(canvas);
      const loading = document.getElementById('boot');
      if (loading) loading.style.display = 'none';
    } catch (e) {
      console.error(e);
      const el = document.getElementById('fatal');
      if (el) { el.style.display = 'block'; el.textContent = 'Startup failed:\n' + (e.stack || e); }
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (document.fonts && document.fonts.load) {
      Promise.race([
        document.fonts.load('8px "Press Start 2P"'),
        new Promise(res => setTimeout(res, 1400))
      ]).then(boot).catch(boot);
    } else boot();
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }
  window.Game = Game;
})();
