'use strict';
/* Entities: the player, enemies, bosses, projectiles, drops, minions, NPCs and particles.
   Physics is axis-separated pixel collision against World tiles. */
const ENT = (() => {
  const TS = 16;
  const PLAYER_W = 20;
  const PLAYER_H = 32; // exactly two 16 px map tiles
  const PLAYER_SPRITE_SCALE = PLAYER_H / 42;
  const GRAV = 1320, MAXFALL = 860;

  const BUFF_INFO = {
    ironskin: { name: 'Ironskin', color: '#aab4c1', defense: 8 },
    swiftness: { name: 'Swiftness', color: '#e0c060', speed: 0.25 },
    regeneration: { name: 'Regeneration', color: '#e05a72', regen: 2.2 },
    shine: { name: 'Shine', color: '#ffe9a0', light: 9 },
    nightOwl: { name: 'Night Owl', color: '#7788cc', nightVision: true },
    obsidianSkin: { name: 'Obsidian Skin', color: '#6a4b6e', fireBlock: true },
    thorns: { name: 'Thorns', color: '#8fae5c', thorns: 0.35 },
    hunter: { name: 'Hunter', color: '#d77d55', hunter: true },
    inferno: { name: 'Inferno', color: '#f28b3c', inferno: true },
    waterWalk: { name: 'Water Walking', color: '#68aad6', waterWalk: true },
    battle: { name: 'Battle', color: '#d05a5a', battle: true },
    calming: { name: 'Calming', color: '#7fc6b8', calming: true },
    builder: { name: 'Builder', color: '#d8b070', builder: true },
    mining: { name: 'Mining', color: '#a0a0b0', mining: 0.25 },
    campfire: { name: 'Campfire', color: '#f2a24a', regen: 0.8 },
    poison: { name: 'Poisoned', color: '#79a84a', bad: true, dot: 2 },
    onFire: { name: 'On Fire!', color: '#f07030', bad: true, dot: 4 },
    bleeding: { name: 'Bleeding', color: '#c04040', bad: true, dot: 1.5 },
    slow: { name: 'Slow', color: '#6b7f9c', bad: true, speed: -0.35 },
    weakness: { name: 'Weakness', color: '#857a6a', bad: true, damage: -0.2 },
    brokenArmor: { name: 'Broken Armor', color: '#9c8060', bad: true, defense: -8 }
  };

  function itemDef(id) { return window.ITEMS[id]; }
  function tileDef(id) { return window.TILES[id]; }
  function maxStack(id) {
    const it = itemDef(id);
    if (!it) return 1;
    if (it.type === 'weapon' || it.type === 'tool' || it.type === 'armor' || it.type === 'accessory' || it.type === 'summonItem') return 1;
    return Math.max(1, it.stack || 1);
  }
  function prettyName(id) {
    if (window.TR && TR.itemName) return TR.itemName(id);
    const it = itemDef(id);
    if (!it) return String(id || '?');
    let n = it.name || id;
    if (n === id || /^[a-z]/.test(n) && !n.includes(' ')) {
      n = id.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      n = n.replace(/\bPotion\b/, 'Potion').replace(/\bStaff\b/, 'Staff');
    }
    return n;
  }

  /* --------------------------------------------------------------- collision */
  function solidBox(game, x, y, w, h) {
    const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.01) / TS);
    const y0 = Math.floor(y / TS), y1 = Math.floor((y + h - 0.01) / TS);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      if (game.world.solid(xx, yy)) return true;
    }
    return false;
  }
  function platformBox(game, x, y, w) {
    const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.01) / TS);
    const ty = Math.floor(y / TS);
    for (let xx = x0; xx <= x1; xx++) if (game.world.platform(xx, ty)) return ty * TS;
    return -1;
  }
  /* Integrates vx/vy with tile collision. Returns flags. */
  function moveBody(game, e, dt, opts = {}) {
    const usePlat = opts.platforms !== false && !(e.dropThrough > 0);
    e.onGround = false; e.hitWall = false;
    let dx = (e.vx || 0) * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dx) / 5));
    for (let i = 0; i < steps; i++) {
      e.x += dx / steps;
      if (solidBox(game, e.x, e.y + 1, e.w, e.h - 2)) {
        e.x -= dx / steps; e.vx = 0; e.hitWall = true; break;
      }
    }
    let dy = (e.vy || 0) * dt;
    const stepsY = Math.max(1, Math.ceil(Math.abs(dy) / 6));
    for (let i = 0; i < stepsY; i++) {
      const oldBottom = e.y + e.h, sy = dy / stepsY;
      e.y += sy;
      if (solidBox(game, e.x + 1, e.y, e.w - 2, e.h)) {
        if (sy > 0) {
          e.y = Math.floor((e.y + e.h) / TS) * TS - e.h - 0.01;
          e.onGround = true;
        } else {
          e.y = (Math.floor(e.y / TS) + 1) * TS;
        }
        e.vy = 0; break;
      }
      if (sy > 0 && usePlat) {
        const top = platformBox(game, e.x + 2, e.y + e.h - 1, e.w - 4);
        if (top >= 0 && oldBottom <= top + 3 && e.y + e.h >= top) {
          e.y = top - e.h; e.vy = 0; e.onGround = true; break;
        }
      }
    }
    if (e.onGround) {
      e.coyote = 0.1; e.jumps = 0;
    }
    e.dropThrough = Math.max(0, (e.dropThrough || 0) - dt);
    return e;
  }
  function overlap(a, b, pad = 0) {
    return a.x + pad < b.x + b.w && a.x + a.w - pad > b.x && a.y + pad < b.y + b.h && a.y + a.h - pad > b.y;
  }
  function centerOf(e) { return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }

  /* ------------------------------------------------------------------ player */
  class Player {
    constructor(game, x, y) {
      this.w = PLAYER_W; this.h = PLAYER_H;
      this.x = x - this.w / 2; this.y = y - this.h;
      this.vx = 0; this.vy = 0;
      this.dir = 1; this.onGround = false; this.coyote = 0; this.jumps = 0; this.jumpBuf = 0;
      this.life = 100; this.maxLife = 100; this.mana = 20; this.maxMana = 20;
      this.invuln = 0; this.hurtFlash = 0; this.animTime = 0; this.frame = 0;
      this.useTimer = 0; this.useTotal = 0; this.swingAngle = 0; this.swingDir = 1;
      this.mining = false; this.miningTile = null;
      this.inventory = new Array(50).fill(null);
      this.equip = { helmet: null, chest: null, legs: null, accessory: [null, null, null, null, null] };
      this.selected = 0;
      this.buffs = [];
      this.dead = false; this.respawnTimer = 0;
      this.crystals = 0; this.manaCrystals = 0;
      this.usedLifeCrystal = 0; this.usedManaCrystal = 0;
      this.wallet = 0; this.kills = 0;
      this.spawnX = x; this.spawnY = y;
      this.breath = 200;
      this.dashTimer = 0; this.dashCd = 0; this.ghostTimer = 0;
      this.hook = null; this.hookHold = false;
      this.dropThrough = 0;
      this.fallStart = y; this.lastSafe = { x: this.x, y: this.y };
      this.stats = null; this.gear = null; this.gearKey = '';
      this.recalc(game);
      this.life = this.maxLife; this.mana = this.maxMana;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get feet() { return this.y + this.h; }
    recalc() {
      const g = window.ITEMS;
      const ids = [this.equip.helmet, this.equip.chest, this.equip.legs, ...this.equip.accessory];
      let defense = 0, sets = { helmet: null, chest: null, legs: null };
      const s = {
        defense: 0, melee: 1, ranged: 1, magic: 1, summon: 1, meleeSpeed: 1, moveSpeed: 1,
        arrowBonus: 0, damageReduction: 0, regen: 0, manaRegen: 0, maxJumps: 1, noFall: false,
        boots: false, dash: false, magma: false, fireBlock: false, grapple: false, autoMana: false,
        iceTrail: false, healBoost: false, starVeil: false, bees: false, confuse: false,
        slimePeace: false, light: 0, hunter: false, nightVision: false, waterWalk: false,
        thorns: 0, crit: 0.04, goblin: false, miningSpeed: 1, reach: 6
      };
      for (const id of ids) {
        if (!id || !g[id]) continue;
        const it = g[id];
        s.defense += it.defense || 0;
        if (it.equip === 'helmet' || it.equip === 'chest' || it.equip === 'legs') sets[it.equip] = it.set;
        const ef = it.effect;
        if (ef) {
          if (typeof ef === 'string') { if (ef === 'recall') s.recall = true; }
          else {
            if (ef.speed) s.moveSpeed += ef.speed;
            if (ef.doubleJump) s.maxJumps += ef.doubleJump >= 2 ? 2 : 1;
            if (ef.noFall) s.noFall = true;
            if (ef.regen) s.regen += ef.regen * 0.5;
            if (ef.manaRegen) s.manaRegen += ef.manaRegen;
            if (ef.meleeSpeed) s.meleeSpeed += ef.meleeSpeed;
            if (ef.magma) s.magma = true;
            if (ef.fireBlock) s.fireBlock = true;
            if (ef.grapple) s.grapple = true;
            if (ef.bees) s.bees = true;
            if (ef.autoMana) s.autoMana = true;
            if (ef.iceTrail) s.iceTrail = true;
            if (ef.healBoost) s.healBoost = true;
            if (ef.starVeil) s.starVeil = true;
            if (ef.arrowBonus) s.arrowBonus += ef.arrowBonus;
            if (ef.rangedDamage) s.ranged += ef.rangedDamage;
            if (ef.meleeDamage) s.melee += ef.meleeDamage;
            if (ef.magicDamage) s.magic += ef.magicDamage;
            if (ef.summonDamage) s.summon += ef.summonDamage;
            if (ef.dash) s.dash = true;
            if (ef.damageReduction) s.damageReduction += ef.damageReduction;
            if (ef.confuse) s.confuse = true;
            if (ef.slimePeace) s.slimePeace = true;
            if (ef.light) s.light += ef.light;
          }
        }
      }
      if (sets.helmet && sets.helmet === sets.chest && sets.chest === sets.legs) {
        s.set = sets.helmet;
        const bonus = {
          copper: { defense: 2 }, iron: { defense: 3 }, silver: { defense: 3 }, gold: { defense: 4 },
          shadow: { moveSpeed: 0.08 }, crimson: { regen: 1.2 }, meteor: { magic: 0.1 },
          jungle: { magic: 0.06, defense: 1 }, molten: { melee: 0.1 }, cobalt: { moveSpeed: 0.1 },
          mythril: { melee: 0.06, ranged: 0.06, magic: 0.06 }, adamantite: { melee: 0.1, ranged: 0.1, magic: 0.1 }
        }[sets.helmet];
        if (bonus) {
          for (const k in bonus) {
            if (k === 'defense') s.defense += bonus[k];
            else if (k === 'moveSpeed') s.moveSpeed += bonus[k];
            else if (k === 'regen') s.regen += bonus[k];
            else s[k] = (s[k] || 1) + bonus[k];
          }
        }
      }
      for (const b of this.buffs) {
        const info = BUFF_INFO[b.id] || b;
        if (!info || info.bad) continue;
        if (info.defense) s.defense += info.defense;
        if (info.speed) s.moveSpeed += info.speed;
        if (info.regen) s.regen += info.regen;
        if (info.manaRegen) s.manaRegen += info.manaRegen;
        if (info.fireBlock) s.fireBlock = true;
        if (info.waterWalk) s.waterWalk = true;
        if (info.light) s.light += info.light;
        if (info.hunter) s.hunter = true;
        if (info.nightVision) s.nightVision = true;
        if (info.thorns) s.thorns += info.thorns;
        if (info.builder) { s.reach += 2; s.buildSpeed = 0.2; }
        if (info.mining) s.miningSpeed += info.mining;
      }
      s.maxJumps = Math.max(1, s.maxJumps);
      this.stats = s;
      const helm = this.equip.helmet && window.ITEMS[this.equip.helmet];
      const chest = this.equip.chest && window.ITEMS[this.equip.chest];
      const legs = this.equip.legs && window.ITEMS[this.equip.legs];
      const accs = this.equip.accessory.filter(Boolean).join(',');
      this.gearKey = [this.equip.helmet, this.equip.chest, this.equip.legs, accs].join('|');
      this.gear = {
        key: this.gearKey,
        skin: '#e3b58a', hair: '#5b3a24', shirt: '#5d7fbb', pants: '#37435a', boots: '#3b2d25',
        helmet: helm ? helm.color : null, chest: chest ? chest.color : null, cape: null,
        eye: '#2a2430'
      };
      if (legs) this.gear.pants = legs.color;
      if (chest) this.gear.shirt = chest.color;
      const caped = this.equip.accessory.some(id => id && /cape|Cape|Invisibility/.test(id));
      if (caped) this.gear.cape = '#7b3550';
    }
    /* ---------------------------------------------------------- inventory */
    addItem(id, count = 1) {
      if (!window.ITEMS[id]) return count;
      const cap = maxStack(id);
      for (let i = 0; i < this.inventory.length && count > 0; i++) {
        const s = this.inventory[i];
        if (s && s.id === id && s.count < cap) { const n = Math.min(cap - s.count, count); s.count += n; count -= n; }
      }
      for (let i = 0; i < this.inventory.length && count > 0; i++) {
        if (!this.inventory[i]) { const n = Math.min(cap, count); this.inventory[i] = { id, count: n }; count -= n; }
      }
      return count;
    }
    countItem(id) { let n = 0; for (const s of this.inventory) if (s && s.id === id) n += s.count; return n; }
    removeItem(id, count = 1) {
      for (let i = 0; i < this.inventory.length && count > 0; i++) {
        const s = this.inventory[i];
        if (s && s.id === id) { const n = Math.min(s.count, count); s.count -= n; count -= n; if (s.count <= 0) this.inventory[i] = null; }
      }
      return count <= 0;
    }
    takeItem(id, count = 1) {
      for (let i = 0; i < this.inventory.length; i++) {
        const s = this.inventory[i];
        if (s && s.id === id) { const n = Math.min(s.count, count); s.count -= n; if (s.count <= 0) this.inventory[i] = null; return true; }
      }
      return false;
    }
    selectedItem() { return this.inventory[this.selected]; }
    useSelected(count = 1) {
      const s = this.selectedItem();
      if (!s) return false;
      s.count -= count;
      if (s.count <= 0) this.inventory[this.selected] = null;
      return true;
    }
    hasAmmo(type) {
      for (const s of this.inventory) { if (s) { const it = itemDef(s.id); if (it && it.ammoType === type) return { slot: s, id: s.id, it }; } }
      return null;
    }
    hasRangedWeapon() { return this.inventory.some(s => { const it = s && itemDef(s.id); return it && it.ammo; }); }
    addBuff(id, duration, extra) {
      const info = BUFF_INFO[id] || { name: id, color: '#aaa' };
      const existing = this.buffs.find(b => b.id === id);
      if (existing) existing.time = Math.max(existing.time, duration);
      else this.buffs.push(Object.assign({ id, time: duration, name: info.name, color: info.color, bad: !!info.bad }, extra || {}));
      this.recalc();
    }
    hasBuff(id) { return this.buffs.some(b => b.id === id); }
    /* ------------------------------------------------------------ update */
    update(game, dt) {
      this.animTime += dt;
      this.frame = Math.floor(this.animTime * 8);
      if (this.dead) { this.vx = 0; this.vy = 0; return; }
      this.invuln = Math.max(0, this.invuln - dt);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.useTimer = Math.max(0, this.useTimer - dt);
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      this.coyote = Math.max(0, this.coyote - dt);
      for (let i = this.buffs.length - 1; i >= 0; i--) {
        const b = this.buffs[i];
        b.time -= dt;
        if (b.time <= 0) { this.buffs.splice(i, 1); this.recalc(); }
        else if (b.bad && BUFF_INFO[b.id] && BUFF_INFO[b.id].dot) {
          if (this.invuln <= 0) this.hurt(game, BUFF_INFO[b.id].dot * dt * 2, this.cx, { silent: true, ignoreDefense: true });
        }
      }
      const w = game.world, input = game.input;
      const lq = w.liquid(Math.floor(this.cx / TS), Math.floor(this.cy / TS));
      const lqFeet = w.liquid(Math.floor(this.cx / TS), Math.floor(this.feet / TS));
      this.inWater = lq === 'water' || lqFeet === 'water';
      this.inLava = lq === 'lava' || lqFeet === 'lava';
      this.onIce = false;
      if (this.onGround) {
        const below = w.get(Math.floor(this.cx / TS), Math.floor((this.feet + 2) / TS));
        this.onIce = below === window.TILE.ICE || below === window.TILE.PINK_ICE;
      }
      if (this.stats.regen > 0 && this.life < this.maxLife && this.invuln <= 0) {
        this.life = Math.min(this.maxLife, this.life + this.stats.regen * dt);
      }
      this.mana = Math.min(this.maxMana, this.mana + (this.inWater ? 8 : 3.2) * dt);
      /* lava and fire blocks */
      if (this.inLava && !this.stats.fireBlock) this.hurt(game, 18 * dt * 2, this.cx, { silent: true, ignoreDefense: true });
      const feetTile = tileDef(w.get(Math.floor(this.cx / TS), Math.floor((this.feet - 2) / TS)));
      if (feetTile && feetTile.damage && this.invuln <= 0 && !(this.stats.fireBlock && feetTile.id !== window.TILE.SPIKE)) {
        this.hurt(game, feetTile.damage, this.cx, { ignoreDefense: false });
      }
      /* movement */
      let move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (move !== 0) { this.dir = move; this.lastMove = move; }
      let maxSpeed = 152 * this.stats.moveSpeed * (this.stats.boots ? 1.18 : 1);
      if (this.inWater) maxSpeed *= 0.62;
      if (this.onIce) maxSpeed *= 1.14;
      if (this.dashTimer > 0) maxSpeed = 430;
      const accel = this.onGround ? 1150 : 620;
      const target = move * maxSpeed;
      if (this.dashTimer <= 0) {
        if (move !== 0) this.vx = U.approach(this.vx, target, accel * dt);
        else this.vx = U.approach(this.vx, 0, (this.onGround ? 1600 : 340) * dt);
      } else {
        this.vx = this.dir * 430;
      }
      /* jump / swim / climb */
      if (input.jumpPressed) this.jumpBuf = 0.13;
      /* Holding jump while grounded jumps again as soon as you land; airborne
         jumps still require a fresh press (or an accessory-granted air jump). */
      else if (input.jumpHeld && this.onGround && !this.inWater && !input.down) this.jumpBuf = 0.13;
      const climbTile = tileDef(w.get(Math.floor(this.cx / TS), Math.floor(this.cy / TS)));
      const climbing = climbTile && climbTile.climb && (input.up || input.down);
      if (climbing && !this.inWater) {
        this.vy = input.up ? -90 : 78;
        this.onGround = false;
        this.jumps = 0;
      } else if (this.inWater && !this.inLava) {
        this.vy += 300 * dt;
        if (input.up) this.vy -= 520 * dt;
        if (this.jumpBuf > 0) { this.vy = -145; this.jumpBuf = 0; AUDIO.sfx('splash', 1.2); game.addParticle(this.cx, this.cy, U.pick(['#9fd8ff', '#d8f2ff']), 3, -30, 0.5); }
        this.vy = U.clamp(this.vy, -165, 135);
        if (input.down) this.vy += 220 * dt;
      } else {
        if (this.jumpBuf > 0) {
          if (this.onGround || this.coyote > 0) {
            this.vy = -304; this.onGround = false; this.coyote = 0; this.jumps = this.stats.maxJumps - 1; this.jumpBuf = 0;
            AUDIO.sfx('jump'); game.dust(this.cx, this.feet, 5);
          } else if (this.jumps > 0) {
            this.vy = -278; this.jumps--; this.jumpBuf = 0;
            AUDIO.sfx('doubleJump'); game.dust(this.cx, this.feet, 7, '#cfe7ff');
          }
        }
        const gravity = this.stats.maxJumps > 1 && !this.onGround && input.jumpHeld && this.vy < 0 ? 720 : GRAV;
        this.vy += gravity * dt;
        if (this.inLava) this.vy = Math.min(this.vy, 110);
      }
      /* dash */
      if (input.dashPressed && this.stats.dash && this.dashCd <= 0) {
        this.dashTimer = 0.16; this.dashCd = 1.1; this.invuln = Math.max(this.invuln, 0.18);
        this.vy = 0; AUDIO.sfx('swing', 1.4); game.shake = Math.max(game.shake, 2);
      }
      /* one-way platforms */
      if (input.down && input.jumpPressed && this.onGround && !this.inWater) {
        this.dropThrough = 0.22; this.jumpBuf = 0; this.onGround = false; this.y += 2;
      }
      const wasGround = this.onGround;
      const wasVy = this.vy;
      /* grapple: fire or hold */
      if (this.hook) this.updateHook(game, dt);
      const hooked = this.hook && this.hook.attached;
      if (hooked) {
        const dx = this.hook.x - this.cx, dy = this.hook.y - this.cy, d = Math.hypot(dx, dy);
        if (d > 28) {
          this.vx = U.approach(this.vx, dx / d * 360, 1500 * dt);
          this.vy = U.approach(this.vy, dy / d * 360, 1600 * dt);
        } else { this.vx *= 0.86; this.vy *= 0.86; }
      }
      moveBody(game, this, dt);
      if (hooked) this.vy = Math.min(this.vy, 120);
      if (this.onGround) {
        this.lastSafe.x = this.x; this.lastSafe.y = this.y;
        if (wasVy > 700 && !this.stats.noFall) {
          const dmg = Math.round((wasVy - 700) / 18);
          if (dmg > 0) this.hurt(game, dmg, this.cx, { ignoreDefense: true });
        }
      }
      if (this.x < 2) this.x = 2;
      if (this.x > game.world.w * TS - this.w - 2) this.x = game.world.w * TS - this.w - 2;
      if (this.y > game.world.h * TS + 200) { this.life = 0; this.hurt(game, 9999, this.cx, { ignoreDefense: true }); }
      if (this.y < -200) { this.y = -200; this.vy = Math.max(0, this.vy); }
      if (this.y < 0) this.y = 0;
      if (this.onGround && Math.abs(this.vx) > 40 && Math.random() < 0.12) {
        game.dust(this.cx - this.vx * 0.03, this.feet, 1, this.onIce ? '#d8f4ff' : '#9a7a55');
      }
      /* buff light aura */
      if (this.stats.magma) game.lightSources.push({ x: this.cx, y: this.cy, r: 88, color: '#ff8a3a', a: 0.6 });
      /* ambient footsteps sound */
    }
    updateHook(game, dt) {
      const h = this.hook;
      if (!h) return;
      h.anim += dt;
      if (!h.attached) {
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (game.world.solid(Math.floor(h.x / TS), Math.floor(h.y / TS)) || game.world.platform(Math.floor(h.x / TS), Math.floor(h.y / TS))) {
          h.attached = true; h.x = Math.floor(h.x / TS) * TS + 8; h.y = Math.floor(h.y / TS) * TS + 8;
        }
        if (h.anim > 0.5) this.hook = null;
      }
      if (h.attached && U.dist(this.cx, this.cy, h.x, h.y) > 250) this.hook = null;
    }
    fireHook(game, mx, my) {
      if (!this.stats.grapple) return false;
      const dx = mx - this.cx, dy = my - this.cy, d = Math.hypot(dx, dy);
      if (d < 4 || d > 240) return false;
      const steps = Math.ceil(d / 4);
      for (let i = 1; i <= steps; i++) {
        const x = this.cx + dx * i / steps, y = this.cy + dy * i / steps;
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (game.world.solid(tx, ty) || game.world.platform(tx, ty)) {
          this.hook = { x: tx * TS + 8, y: ty * TS + 8, attached: true, vx: 0, vy: 0, anim: 0 };
          this.hookHold = true;
          AUDIO.sfx('click', 1.6);
          return true;
        }
      }
      this.hook = { x: this.cx, y: this.cy, vx: dx / d * 420, vy: dy / d * 420, attached: false, anim: 0 };
      this.hookHold = true;
      AUDIO.sfx('swing', 0.8);
      return true;
    }
    hurt(game, amount, sourceX, opts = {}) {
      if (this.dead || this.invuln > 0 && !opts.force) return 0;
      let dmg = amount;
      if (!opts.ignoreDefense) dmg = Math.max(1, dmg - (this.stats.defense * 0.5));
      dmg *= (1 - Math.min(.75, this.stats.damageReduction));
      dmg = Math.max(1, Math.round(dmg));
      this.life -= dmg;
      this.invuln = opts.silent ? Math.max(this.invuln, 0.2) : 0.75;
      this.hurtFlash = 0.35;
      if (!opts.silent) {
        AUDIO.sfx('hurt'); game.shake = Math.max(game.shake, 4);
        game.addPopup(this.cx, this.cy - 16, '-' + dmg, '#ff6b6b');
        if (sourceX !== undefined) this.vx = U.sign(this.cx - sourceX) * 120;
        this.vy = Math.min(this.vy, -90);
        game.dust(this.cx, this.cy, 5, '#c03038');
      }
      if (this.stats.thorns > 0 && sourceX !== undefined) {
        for (const e of game.enemies) if (U.dist(this.cx, this.cy, e.cx, e.cy) < 70) e.takeDamage(game, 6, U.sign(e.cx - this.cx) * 2);
      }
      if (this.life <= 0) { this.life = 0; game.playerDeath(this); }
      return dmg;
    }
    heal(n) { this.life = Math.min(this.maxLife, this.life + n); }
    render(ctx, game) {
      const cam = game.cam;
      const px = Math.round(this.cx - cam.x), py = Math.round(this.feet - cam.y);
      if (this.dead) return;
      const state = this.useTimer > 0 ? (this.mining ? 'mine' : 'swing') : (!this.onGround ? (this.vy < 0 ? 'jump' : 'fall') : (Math.abs(this.vx) > 16 ? 'walk' : 'idle'));
      const img = window.ART.player(state, Math.floor(this.animTime * 10) % 4, this.dir, this.gear);
      if (this.dashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.translate(px - this.dir * 12, py);
        ctx.scale(PLAYER_SPRITE_SCALE, PLAYER_SPRITE_SCALE);
        ctx.drawImage(img, -img.width / 2, -img.height);
        ctx.restore();
      }
      if (this.hurtFlash > 0 && Math.floor(this.hurtFlash * 30) % 2 === 0) {
        ctx.globalAlpha = 0.65;
      }
      ctx.save();
      if (this.inWater) ctx.globalAlpha *= 0.86;
      ctx.translate(px, py);
      ctx.scale(PLAYER_SPRITE_SCALE, PLAYER_SPRITE_SCALE);
      if (this.hurtFlash > 0) ctx.rotate(Math.sin(this.hurtFlash * 50) * 0.05);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      ctx.globalAlpha = 1;
      /* held item */
      const sel = this.selectedItem();
      if (sel && itemDef(sel.id) && this.useTimer > 0) {
        const it = itemDef(sel.id);
        const ic = window.ART.icon(sel.id);
        const t = 1 - (this.useTimer / Math.max(.01, this.useTotal));
        let ang;
        if (it.pick || it.axe || it.hammer) ang = -1.1 + Math.sin(t * Math.PI) * 1.7;
        else if (it.swing === 'stab') ang = -0.15;
        else ang = -1.2 + Math.sin(t * Math.PI) * 2.3;
        ctx.save();
        ctx.translate(px + this.dir * 5, py - 20);
        ctx.scale(this.dir, 1);
        ctx.rotate(ang);
        ctx.drawImage(ic, 3, -ic.height / 2);
        ctx.restore();
      }
      /* hook rope */
      if (this.hook) {
        const hx = this.hook.x - cam.x, hy = this.hook.y - cam.y;
        ctx.strokeStyle = '#b89a6c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px + this.dir * 4, py - 28); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#b8c4cc'; ctx.fillRect(hx - 3, hy - 2, 6, 4);
        ctx.fillRect(hx - 1, hy - 5, 2, 4);
      }
    }
  }

  /* ------------------------------------------------------------------ enemy */
  class Enemy {
    constructor(game, type, x, y, opts = {}) {
      const def = opts.def || window.ENEMIES[type] || window.ENEMIES.greenSlime;
      this.type = type; this.def = def; this.name = def.name || type;
      this.w = opts.def ? (def.w || 40) : (def.w || 18); this.h = opts.def ? (def.h || 40) : (def.h || 16);
      this.x = x - this.w / 2; this.y = y - this.h;
      this.vx = 0; this.vy = 0;
      this.onGround = false; this.coyote = 0; this.jumps = 0;
      this.maxHp = Math.round((def.hp || 20) * (opts.hpScale || game.hpScale || 1));
      this.hp = this.maxHp;
      this.damage = Math.round((def.damage || 5) * (opts.damageScale || game.damageScale || 1));
      this.defense = def.defense || 0;
      this.speed = def.speed || 50;
      this.dir = Math.random() < .5 ? -1 : 1;
      this.animTime = Math.random() * 6; this.frame = 0;
      this.hurtFlash = 0; this.hurtCd = 0;
      this.dead = false; this.deathTimer = 0;
      this.ai = def.ai || 'walker';
      this.minion = !!opts.minion;
      this.event = !!def.event;
      this.timer = U.RNG ? 0 : 0;
      this.attackTimer = 1 + Math.random() * 2;
      this.jumpTimer = 0.5 + Math.random() * 2;
      this.despawnTimer = 0;
      this.light = def.light || 0; this.lightColor = def.lightColor || '#ffffff';
      this.spawnX = x; this.spawnY = y;
      this.gravity = this.ai === 'flyer' || this.ai === 'worm' || this.ai === 'none' ? 0 : GRAV;
      this.ignoreTiles = this.ai === 'worm';
      this.squash = 0;
      this.boss = false;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get feet() { return this.y + this.h; }
    update(game, dt) {
      if (this.dead) { this.deathTimer += dt; return; }
      this.animTime += dt; this.frame = Math.floor(this.animTime * 8);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.hurtCd = Math.max(0, this.hurtCd - dt);
      this.attackTimer -= dt; this.jumpTimer -= dt;
      if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 3);
      const p = game.player, dx = p.cx - this.cx, dy = p.cy - this.cy, dist = Math.hypot(dx, dy);
      if (dist > 2200 && !this.boss) { this.dead = true; this.removed = true; return; }
      if (this.ai === 'flyer') {
        this.flyAI(game, p, dx, dy, dist, dt);
      } else if (this.ai === 'worm') {
        this.wormAI(game, p, dx, dy, dist, dt);
      } else if (this.ai === 'slime') {
        this.slimeAI(game, p, dx, dist, dt);
      } else if (this.ai === 'shooter') {
        this.shooterAI(game, p, dx, dy, dist, dt);
      } else if (this.ai === 'plant') {
        this.plantAI(game, p, dx, dy, dist, dt);
      } else if (this.ai === 'none') {
        this.vx = 0;
      } else {
        this.walkerAI(game, p, dx, dy, dist, dt);
      }
      if (this.ignoreTiles) {
        this.x += this.vx * dt; this.y += this.vy * dt;
      } else {
        this.vy += this.gravity * dt;
        if (this.vy > 700) this.vy = 700;
        moveBody(game, this, dt, { platforms: true });
      }
      /* lava hurts monsters too */
      const lq = game.world.liquid(Math.floor(this.cx / TS), Math.floor(this.cy / TS));
      if (lq === 'lava' && !this.boss) this.hp -= 20 * dt;
      if (lq === 'water' && this.ai === 'flyer') this.speed *= 0.99;
      if (this.hp <= 0) this.die(game);
      if (this.boss) this.updateBoss(game, dt, p, dx, dy, dist);
    }
    walkerAI(game, p, dx, dy, dist, dt) {
      if (dist < 620) this.dir = dx < 0 ? -1 : 1;
      let sp = this.speed;
      if (dist > 900) this.dir = this.spawnX < p.cx ? 1 : -1;
      if (Math.abs(dx) < 20 && Math.abs(dy) > 10) this.vx = U.approach(this.vx, 0, 500 * dt);
      else this.vx = U.approach(this.vx, this.dir * sp, 600 * dt);
      if (this.onGround && (this.hitWall || (this.jumpTimer <= 0 && dist < 260 && dy < -20))) {
        this.vy = -250; this.jumpTimer = 1.4 + Math.random(); this.jumps = 1;
      }
      if (this.onGround && Math.abs(this.vx) < 10 && this.jumpTimer <= 0) { this.vy = -210; this.jumpTimer = 1.8; }
    }
    slimeAI(game, p, dx, dist, dt) {
      if (this.dropThrough > 0) this.dropThrough = 0;
      if (this.onGround) {
        this.vx = U.approach(this.vx, 0, 600 * dt);
        if (this.jumpTimer <= 0) {
          this.dir = dx < 0 ? -1 : 1;
          this.vy = -300 - Math.random() * 60;
          this.vx = this.dir * this.speed * 1.15;
          this.jumpTimer = 1.1 + Math.random() * 0.9;
          this.squash = 0.45;
        }
      }
    }
    flyAI(game, p, dx, dy, dist, dt) {
      const d = Math.max(1, dist);
      const bob = Math.sin(this.animTime * 3.1) * 18;
      const tx = dx / d * this.speed * (dist < 400 ? 1.15 : 1);
      const ty = dy / d * this.speed * 0.8 + bob;
      this.vx = U.approach(this.vx, tx, 420 * dt);
      this.vy = U.approach(this.vy, ty, 420 * dt);
      if (dist < 160 && this.ai === 'flyer') { this.vx += dx / d * 80; this.vy += dy / d * 80; }
      this.dir = dx < 0 ? -1 : 1;
    }
    wormAI(game, p, dx, dy, dist, dt) {
      const d = Math.max(1, dist);
      const angle = Math.atan2(dy, dx) + Math.sin(this.animTime * 2.4) * 0.45;
      const sp = this.speed * (dist < 500 ? 1 : 1.4);
      this.vx = U.approach(this.vx, Math.cos(angle) * sp, 180 * dt);
      this.vy = U.approach(this.vy, Math.sin(angle) * sp, 180 * dt);
      this.dir = this.vx < 0 ? -1 : 1;
    }
    shooterAI(game, p, dx, dy, dist, dt) {
      if (dist > 280) this.dir = dx < 0 ? -1 : 1;
      else if (dist < 150) this.dir = dx > 0 ? -1 : 1;
      else this.vx = U.approach(this.vx, 0, 400 * dt);
      if (dist > 150 && dist < 700) this.vx = U.approach(this.vx, this.dir * this.speed, 300 * dt);
      if (this.attackTimer <= 0 && dist < 540) {
        this.attackTimer = 1.8 + Math.random();
        this.shoot(game, p);
      }
      if (this.type === 'darkCaster' && this.attackTimer > 1.7 && Math.random() < 0.004) {
        game.spawnPuff(this.cx, this.cy, '#8b6bb0'); this.x += (Math.random() < .5 ? -1 : 1) * 90;
      }
    }
    plantAI(game, p, dx, dy, dist, dt) {
      this.vx = 0;
      if (this.attackTimer <= 0 && dist < 170) {
        this.attackTimer = 2.2 + Math.random() * .8;
        this.shoot(game, p);
      }
    }
    shoot(game, p) {
      const d = this.def.ranged || 'bone';
      const dx = p.cx - this.cx, dy = p.cy - this.cy, len = Math.max(1, Math.hypot(dx, dy));
      const sp = this.type === 'darkCaster' ? 100 : 170;
      game.projectiles.push(new Projectile(game, {
        x: this.cx, y: this.cy - 4, vx: dx / len * sp, vy: dy / len * sp,
        damage: Math.round(this.damage * 0.7), friendly: false, type: d, life: 4, owner: this
      }));
      AUDIO.sfx(this.type === 'darkCaster' ? 'magic' : 'bow', 0.7);
    }
    takeDamage(game, amount, knockX = 0, crit = false) {
      if (this.dead || this.hurtCd > 0) return 0;
      this.hurtCd = 0.06;
      let dmg = Math.max(1, amount - this.defense * 0.4);
      dmg = Math.round(dmg);
      this.hp -= dmg;
      this.hurtFlash = 0.18;
      this.vx += (knockX || 0) * (this.boss ? 0.15 : 1.4);
      if (!this.boss) this.vy = Math.min(this.vy, -50);
      game.addPopup(this.cx + (Math.random() * 12 - 6), this.cy - this.h / 2 - 8, String(crit ? dmg + '!' : dmg), crit ? '#ffe066' : '#f0f0f0');
      game.dust(this.cx, this.cy, crit ? 6 : 3, '#c84242');
      AUDIO.sfx(crit ? 'break' : 'dig', 1.4);
      if (this.hp <= 0) this.die(game);
      return dmg;
    }
    die(game) {
      if (this.dead) return;
      this.dead = true;
      this.deathTimer = 0;
      if (!this.boss) {
        game.onEnemyDeath(this);
        game.dust(this.cx, this.cy, 12, this.def.color || '#b03a3a');
        AUDIO.sfx(this.def.sprite === 'slime' ? 'slime' : 'zombie');
      }
    }
    updateBoss() { }
    render(ctx, game) {
      const cam = game.cam;
      const img = window.ART.enemy(this.type, this.frame, this.hurtFlash > 0 ? 'hurt' : '');
      const px = Math.round(this.cx - cam.x), py = Math.round(this.feet - cam.y);
      if (px < -200 || px > 960 + 200) return;
      ctx.save();
      if (this.hurtFlash > 0) ctx.globalAlpha = 0.9;
      if (this.ai === 'worm') { ctx.translate(px + Math.sin(this.animTime * 2) * 4, py); }
      else ctx.translate(px, py);
      if (this.squash > 0) ctx.scale(1 + this.squash * .25, 1 - this.squash * .25);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      /* hp bar */
      if (this.hp < this.maxHp && !this.boss) {
        const w = Math.max(22, this.w + 6);
        const bx = px - w / 2, by = py - img.height - 6;
        ctx.fillStyle = 'rgba(10,8,14,.8)'; ctx.fillRect(bx, by, w, 3);
        ctx.fillStyle = '#d64c4c'; ctx.fillRect(bx + 1, by + 1, (w - 2) * U.clamp(this.hp / this.maxHp, 0, 1), 1);
      }
      if (this.def.light) game.lightSources.push({ x: this.cx, y: this.cy, r: this.def.light, color: this.def.lightColor, a: 0.5 });
    }
  }

  /* ------------------------------------------------------------------- boss */
  class Boss extends Enemy {
    constructor(game, type, x, y, opts = {}) {
      const def = window.BOSSES[type];
      super(game, type, x, y, { def, hpScale: opts.hpScale || 1, damageScale: opts.damageScale || 1 });
      this.bossType = type;
      this.boss = true;
      this.name = def.name;
      this.phase = 1;
      this.maxPhase = 2;
      this.attackTimer = 2; this.minionTimer = 3; this.teleTimer = 8; this.stateTimer = 0;
      this.state = 'idle';
      this.gravity = def.worm ? 0 : (type === 'kingSlime' ? GRAV : 0);
      this.ignoreTiles = !!def.worm;
      this.startX = x; this.startY = y;
      this.dir = -1;
      this.deathTimer = 0;
      this.trailTimer = 0;
      this.dashVX = 0; this.dashVY = 0;
      this.despawn = false;
      this.defeated = false;
      this.intro = 2.2;
    }
    update(game, dt) {
      if (this.dead) { this.deathTimer += dt; return; }
      this.animTime += dt; this.frame = Math.floor(this.animTime * 8);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.hurtCd = Math.max(0, this.hurtCd - dt);
      this.attackTimer -= dt; this.minionTimer -= dt; this.teleTimer -= dt; this.stateTimer -= dt;
      if (this.intro > 0) {
        this.intro -= dt;
        if (this.intro <= 0) { AUDIO.sfx('roar'); game.shake = 8; }
        this.vy = Math.sin(this.animTime * 3) * 10;
        return;
      }
      const p = game.player, dx = p.cx - this.cx, dy = p.cy - this.cy, dist = Math.hypot(dx, dy) || 1;
      if (dist > 2600) { game.chat('The boss has lost interest...'); this.remove = true; return; }
      if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
        this.phase = 2; this.state = 'idle'; this.stateTimer = 0;
        AUDIO.sfx('roar'); game.shake = 10;
        game.chat(this.name + ' grows enraged!');
        for (let i = 0; i < 28; i++) game.dust(this.cx, this.cy, 1, this.def.color);
      }
      this.updateBoss(game, dt, p, dx, dy, dist);
      if (this.ignoreTiles) { this.x += this.vx * dt; this.y += this.vy * dt; }
      else {
        this.vy += this.gravity * dt;
        moveBody(game, this, dt, { platforms: false });
      }
      if (this.x < 10) { this.x = 10; this.vx = Math.abs(this.vx); this.dashVX = Math.abs(this.dashVX); }
      if (this.x + this.w > game.world.w * TS - 10) { this.x = game.world.w * TS - this.w - 10; this.vx = -Math.abs(this.vx); this.dashVX = -Math.abs(this.dashVX); }
      if (this.def.light) game.lightSources.push({ x: this.cx, y: this.cy, r: this.def.light, color: this.def.lightColor || '#ff8866', a: 0.7 });
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.08;
        game.addParticle(this.cx + (Math.random() - .5) * this.w * .6, this.cy + (Math.random() - .5) * this.h * .5, this.def.color, 2, (Math.random() - .5) * 20, 0.5);
      }
    }
    updateBoss(game, dt, p, dx, dy, dist) {
      const t = this.bossType;
      const ph2 = this.phase === 2;
      if (t === 'kingSlime') {
        this.dir = dx < 0 ? -1 : 1;
        if (this.onGround && this.stateTimer <= 0) {
          this.vy = -420 - (ph2 ? 80 : 0);
          this.vx = this.dir * (ph2 ? 150 : 110);
          this.stateTimer = ph2 ? 0.8 : 1.15;
          game.shake = Math.max(game.shake, 2);
        }
        if (this.teleTimer <= 0 && dist > 340) {
          game.spawnPuff(this.cx, this.cy, '#649de0');
          this.x = p.cx + (Math.random() < .5 ? -260 : 260); this.y = p.cy - 180;
          game.spawnPuff(this.cx, this.cy, '#649de0'); this.teleTimer = 7;
        }
        if (this.minionTimer <= 0 && game.enemies.filter(e => e.type === 'kingSlimeServant' && !e.dead).length < 5) {
          this.minionTimer = 3.2;
          for (let i = 0; i < 2; i++) game.spawnEnemy('kingSlimeServant', this.cx - 20 + i * 40, this.feet - 4, { minion: true });
        }
      } else if (t === 'eyeOfCthulhu') {
        if (this.stateTimer <= 0) {
          if (this.state === 'idle') { this.state = 'charge'; this.stateTimer = 1.15; this.dashVX = dx / dist * (ph2 ? 300 : 230); this.dashVY = dy / dist * (ph2 ? 300 : 230); }
          else { this.state = 'idle'; this.stateTimer = ph2 ? 0.9 : 1.5; this.dashVX = 0; this.dashVY = 0; }
        }
        if (this.state === 'charge') { this.vx = this.dashVX; this.vy = this.dashVY; }
        else {
          const hx = p.cx - this.cx, hy = p.cy - 190 - this.cy;
          this.vx = U.approach(this.vx, hx * .8, 300 * dt);
          this.vy = U.approach(this.vy, hy * .8, 300 * dt);
        }
        if (this.minionTimer <= 0 && !ph2 && game.enemies.filter(e => e.type === 'servantEye').length < 4) {
          this.minionTimer = 4;
          game.spawnEnemy('servantEye', this.cx, this.cy, { minion: true });
        }
        if (ph2 && this.attackTimer <= 0) {
          this.attackTimer = 1.6;
          for (let i = -2; i <= 2; i++) {
            const a = Math.atan2(dy, dx) + i * .22;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy + 12, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, damage: 18, friendly: false, type: 'blood', life: 3, owner: this }));
          }
        }
      } else if (t === 'eaterOfWorlds') {
        const sp = ph2 ? 150 : 115;
        const a = Math.atan2(dy, dx);
        this.vx = U.approach(this.vx, Math.cos(a) * sp, 260 * dt);
        this.vy = U.approach(this.vy, Math.sin(a) * sp, 260 * dt);
        if (this.minionTimer <= 0 && game.enemies.filter(e => e.type === 'eaterOfSouls' || e.type === 'devourer').length < 6) {
          this.minionTimer = 4.5;
          game.spawnEnemy('devourer', this.cx, this.cy, { minion: true });
        }
        if (this.attackTimer <= 0) {
          this.attackTimer = 2.2;
          for (let i = 0; i < 3; i++) {
            const aa = a + (i - 1) * .35;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy, vx: Math.cos(aa) * 170, vy: Math.sin(aa) * 170, damage: 15, friendly: false, type: 'vile', life: 3, owner: this }));
          }
        }
        this.dir = this.vx < 0 ? -1 : 1;
      } else if (t === 'brainOfCthulhu') {
        if (this.teleTimer <= 0) {
          game.spawnPuff(this.cx, this.cy, '#b2374a');
          this.x = p.cx + (Math.random() < .5 ? -170 : 170) - this.w / 2; this.y = p.cy - 150; this.teleTimer = ph2 ? 2.2 : 3.5;
          game.spawnPuff(this.cx, this.cy, '#b2374a');
        }
        if (this.attackTimer <= 0) {
          this.attackTimer = ph2 ? 1.2 : 2;
          const n = ph2 ? 8 : 5;
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + this.animTime;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, damage: 16, friendly: false, type: 'blood', life: 2.5, owner: this }));
          }
        }
        if (this.minionTimer <= 0 && game.enemies.filter(e => e.type === 'crimera' && e.minion).length < 4) {
          this.minionTimer = 4;
          game.spawnEnemy('crimera', this.cx, this.cy, { minion: true });
        }
      } else if (t === 'skeletron') {
        if (this.stateTimer <= 0) {
          if (this.state === 'idle') { this.state = 'charge'; this.stateTimer = 1.4; this.dashVX = dx / dist * (ph2 ? 280 : 210); this.dashVY = dy / dist * (ph2 ? 280 : 210); }
          else { this.state = 'idle'; this.stateTimer = 1.3; }
        }
        if (this.state === 'charge') { this.vx = this.dashVX; this.vy = this.dashVY; }
        else { this.vx = U.approach(this.vx, dx * .5, 160 * dt); this.vy = U.approach(this.vy, (dy - 100) * .5, 160 * dt); }
        if (this.attackTimer <= 0) {
          this.attackTimer = ph2 ? 1.4 : 2;
          const n = ph2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const a = Math.atan2(dy, dx) + (i - (n - 1) / 2) * .2;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, damage: 20, friendly: false, type: 'bone', life: 3, owner: this }));
          }
          AUDIO.sfx('magic', 0.7);
        }
      } else if (t === 'queenBee') {
        this.dir = dx < 0 ? -1 : 1;
        if (this.stateTimer <= 0) {
          if (this.state === 'idle') { this.state = 'dash'; this.stateTimer = .6; this.dashVX = dx / dist * (ph2 ? 360 : 290); this.dashVY = dy / dist * (ph2 ? 360 : 290); }
          else { this.state = 'idle'; this.stateTimer = ph2 ? 0.65 : 1.2; }
        }
        if (this.state === 'dash') { this.vx = this.dashVX; this.vy = this.dashVY; }
        else {
          this.vx = U.approach(this.vx, (p.cx - this.cx) * .7, 250 * dt);
          this.vy = U.approach(this.vy, (p.cy - 140 - this.cy) * .9 + Math.sin(this.animTime * 4) * 22, 250 * dt);
        }
        if (this.attackTimer <= 0) {
          this.attackTimer = ph2 ? 1.1 : 1.8;
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(dy, dx) + i * .17;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, damage: 17, friendly: false, type: 'sting', life: 2.2, owner: this }));
          }
          AUDIO.sfx('bow', 1.2);
        }
        if (this.minionTimer <= 0 && game.enemies.filter(e => e.type === 'bee').length < 4) {
          this.minionTimer = 4;
          game.spawnEnemy('bee', this.cx - 20, this.cy, { minion: true });
          game.spawnEnemy('bee', this.cx + 20, this.cy, { minion: true });
        }
      } else if (t === 'wallOfFlesh') {
        const sp = ph2 ? 80 : 48;
        this.vx = this.dir * sp;
        this.vy = U.approach(this.vy, dy * .4 + Math.sin(this.animTime * 1.7) * 24, 200 * dt);
        if (this.dir < 0 && this.x < 200) this.dir = 1;
        if (this.dir > 0 && this.x + this.w > game.world.w * TS - 200) this.dir = -1;
        if (this.attackTimer <= 0) {
          this.attackTimer = ph2 ? 1.2 : 2.1;
          const a = Math.atan2(dy, dx);
          for (let i = -1; i <= 1; i++) {
            const aa = a + i * .14;
            game.projectiles.push(new Projectile(game, { x: this.cx, y: this.cy, vx: Math.cos(aa) * 230, vy: Math.sin(aa) * 230, damage: 24, friendly: false, type: 'laser', life: 2.4, owner: this }));
          }
          AUDIO.sfx('magic', .55);
        }
        if (this.minionTimer <= 0) {
          this.minionTimer = 5;
          for (let i = 0; i < 2; i++) game.spawnEnemy('fireImp', this.cx, this.cy + (i ? 80 : -80), { minion: true });
        }
      }
    }
    takeDamage(game, amount, knockX = 0, crit = false) {
      if (this.dead || this.intro > 1.6) return 0;
      const dmg = Math.max(1, Math.round(amount - this.defense * 0.35));
      this.hp -= dmg; this.hurtFlash = 0.15;
      game.addPopup(this.cx + (Math.random() * 20 - 10), this.cy - this.h / 2 - 10, String(dmg), crit ? '#ffe066' : '#fff4d0');
      if (crit) AUDIO.sfx('break', 0.8); else AUDIO.sfx('dig', 0.8);
      game.shake = Math.max(game.shake, crit ? 3 : 1);
      if (this.hp <= 0) this.die(game);
      return dmg;
    }
    die(game) {
      if (this.dead) return;
      this.dead = true; this.deathTimer = 0;
      AUDIO.sfx('roar'); AUDIO.sfx('explosion');
      game.shake = 14;
      for (let i = 0; i < 45; i++) game.addParticle(this.cx + (Math.random() - .5) * this.w, this.cy + (Math.random() - .5) * this.h, this.def.color, 3 + Math.random() * 3, (Math.random() - .5) * 220, 0.8 + Math.random());
      game.onBossDeath(this);
    }
    render(ctx, game) {
      const cam = game.cam;
      const img = window.ART.boss(this.bossType, this.phase, this.frame, this.hurtFlash > 0 ? 'hurt' : '');
      const px = Math.round(this.cx - cam.x), py = Math.round(this.feet - cam.y);
      ctx.save();
      if (this.intro > 0) ctx.globalAlpha = 0.7 + Math.sin(this.animTime * 20) * 0.2;
      if (this.hp < this.maxHp * .5) { ctx.globalAlpha = 0.94; }
      ctx.translate(px, py - 10);
      if (this.bossType === 'eaterOfWorlds') ctx.rotate(Math.sin(this.animTime * 2) * .05);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      if (this.hurtFlash > 0) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#fff'; ctx.fillRect(px - img.width / 2, py - img.height, img.width, img.height);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* -------------------------------------------------------------- projectile */
  const PROJ = {
    flare: { color: '#ffcf6a', size: 3, trail: '#b06020', light: 7 },
    dart: { color: '#c8b890', size: 2, trail: '#8a7a5a', light: 0 },
    arrow: { color: '#d8b36c', size: 3, trail: '#8f744a', light: 0 },
    bullet: { color: '#ffe6a0', size: 2, trail: '#d8b060', light: 2 },
    magicBolt: { color: '#8ae4ff', size: 5, trail: '#4ab8e8', light: 6 },
    shadowBolt: { color: '#b07ae8', size: 5, trail: '#6a3a9a', light: 5 },
    fireball: { color: '#ffb043', size: 5, trail: '#e0682a', light: 7 },
    ice: { color: '#b8ecff', size: 4, trail: '#70c0e8', light: 4 },
    shuriken: { color: '#c0c8d4', size: 5, trail: '#707a88', light: 0, spin: true },
    bomb: { color: '#343a48', size: 7, trail: '#22262f', light: 0, gravity: true, fuse: true },
    dynamite: { color: '#c04040', size: 7, trail: '#7a2828', light: 0, gravity: true, fuse: true },
    vile: { color: '#9c7ac0', size: 5, trail: '#553a70', light: 3, gravity: true },
    blood: { color: '#d84a5a', size: 4, trail: '#8a2838', light: 1 },
    bone: { color: '#e0d8bc', size: 4, trail: '#9a917a', light: 0, spin: true },
    sting: { color: '#e8c050', size: 3, trail: '#907a30', light: 2 },
    laser: { color: '#ff6a4a', size: 3, trail: '#b02a22', light: 8, beam: true },
    star: { color: '#ffe570', size: 5, trail: '#c8a030', light: 8 },
    leaf: { color: '#74c04e', size: 4, trail: '#3c7a30', light: 0 },
    firework: { color: '#ff90d0', size: 5, trail: '#d05090', light: 6 },
    spear: { color: '#d0d8e0', size: 4, trail: '#808890', light: 0, beam: true },
    grapple: { color: '#b8b8c0', size: 3, trail: '#888890', light: 0 }
  };
  class Projectile {
    constructor(game, o) {
      this.x = o.x; this.y = o.y; this.vx = o.vx || 0; this.vy = o.vy || 0;
      this.damage = o.damage || 1; this.friendly = !!o.friendly; this.type = o.type || 'arrow';
      this.life = o.life == null ? 4 : o.life; this.owner = o.owner || null;
      this.pierce = o.pierce || 0; this.radius = o.radius || 6;
      this.homing = o.homing || 0; this.gravity = o.gravity != null ? o.gravity : (PROJ[this.type] && PROJ[this.type].gravity ? 520 : 0);
      this.fuse = o.fuse || (PROJ[this.type] && PROJ[this.type].fuse ? 1.7 : 0);
      this.ignoreTiles = !!o.ignoreTiles; this.crit = !!o.crit;
      this.dead = false; this.hitSet = new Set(); this.anim = 0; this.trailTimer = 0;
      this.color = o.color || (PROJ[this.type] && PROJ[this.type].color) || '#fff';
      this.light = (PROJ[this.type] && PROJ[this.type].light) || 0;
      this.bounce = o.bounce || 0;
      this.critDmg = o.critDmg || this.damage;
      this.size = (PROJ[this.type] && PROJ[this.type].size) || 3;
    }
    update(game, dt) {
      if (this.dead) return;
      this.anim += dt; this.life -= dt; this.trailTimer -= dt;
      if (this.fuse) {
        this.fuse -= dt;
        if (this.fuse <= 0) { game.explode(this.x, this.y, this.type === 'dynamite' ? 5 : 3.4, this.damage, this.friendly); this.dead = true; return; }
      }
      if (this.life <= 0) { this.dead = true; return; }
      if (this.homing) {
        let target = null, best = 999;
        if (this.friendly) for (const e of game.enemies) { if (e.dead) continue; const d = U.dist(this.x, this.y, e.cx, e.cy); if (d < best) { best = d; target = e; } }
        if (target && best < 240) {
          const a = Math.atan2(target.cy - this.y, target.cx - this.x), sp = Math.hypot(this.vx, this.vy);
          const na = U.angleLerp(Math.atan2(this.vy, this.vx), a, Math.min(1, this.homing * dt));
          this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
        }
      }
      this.vy += this.gravity * dt;
      if (this.type === 'arrow') this.vx *= 0.997;
      const ox = this.x, oy = this.y;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.light) game.lightSources.push({ x: this.x, y: this.y, r: 34 + this.light * 4, color: this.color, a: 0.55 });
      if (this.trailTimer <= 0 && this.type !== 'arrow' && this.type !== 'bullet') {
        this.trailTimer = 0.035;
        game.addParticle(this.x, this.y, (PROJ[this.type] && PROJ[this.type].trail) || this.color, 1.5, this.vx * -.08, 0.3, 0, 18);
      }
      if (!this.ignoreTiles) {
        const tx = Math.floor(this.x / TS), ty = Math.floor(this.y / TS);
        if (game.world.solid(tx, ty)) {
          if (this.bounce > 0) { this.bounce--; this.vy *= -0.6; this.vx *= 0.8; this.y = oy; }
          else { this.hitTile(game, tx, ty); this.dead = true; return; }
        }
      }
      if (this.friendly) {
        for (const e of game.enemies) {
          if (e.dead || this.hitSet.has(e)) continue;
          if (this.x > e.x - this.radius && this.x < e.x + e.w + this.radius && this.y > e.y - this.radius && this.y < e.y + e.h + this.radius) {
            this.hitSet.add(e);
            e.takeDamage(game, this.damage, U.sign(this.vx) * 2.4, this.crit);
            if (this.type === 'fireball' || this.type === 'firework') game.fireBurst(this.x, this.y, '#ff9a45', 8);
            if (this.pierce-- <= 0) { this.dead = true; break; }
          }
        }
      } else {
        const p = game.player;
        if (!p.dead && overlap({ x: this.x - this.radius, y: this.y - this.radius, w: this.radius * 2, h: this.radius * 2 }, p)) {
          p.hurt(game, this.damage, this.x, {});
          if (this.type === 'laser') p.addBuff('onFire', 3);
          this.dead = true;
          return;
        }
        for (const n of game.npcs) if (!n.dead && overlap({ x: this.x - 4, y: this.y - 4, w: 8, h: 8 }, n)) { this.dead = true; break; }
      }
    }
    hitTile(game, tx, ty) {
      const t = game.world.get(tx, ty);
      const def = tileDef(t);
      if (def && (def.liquid || def.texture === 'glass')) return;
      game.dust(this.x, this.y, 4, def && def.color || '#aaa');
      if (this.type === 'bomb' || this.type === 'dynamite') game.explode(this.x, this.y, this.type === 'dynamite' ? 5 : 3.4, this.damage, this.friendly);
      if (this.type === 'fireball') game.fireBurst(this.x, this.y, '#ff9a45', 5);
    }
    render(ctx, game) {
      if (this.dead) return;
      const cam = game.cam, px = Math.round(this.x - cam.x), py = Math.round(this.y - cam.y);
      if (px < -40 || px > 1000 || py < -40 || py > 580) return;
      const info = PROJ[this.type] || PROJ.arrow;
      ctx.save(); ctx.translate(px, py);
      if (info.spin) ctx.rotate(this.anim * 18);
      else if (this.type === 'arrow' || this.type === 'spear' || this.type === 'bone') ctx.rotate(Math.atan2(this.vy, this.vx));
      if (info.beam) {
        ctx.strokeStyle = info.color; ctx.lineWidth = this.type === 'laser' ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(-this.vx * .025, -this.vy * .025); ctx.lineTo(4, 0); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(0, -1, 4, 2);
      } else if (this.type === 'shuriken') {
        ctx.fillStyle = info.color; ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-1, -5, 2, 10);
        ctx.fillStyle = '#5a626e'; ctx.fillRect(-2, -2, 4, 4);
      } else if (this.type === 'arrow') {
        ctx.fillStyle = info.color; ctx.fillRect(-7, -1, 11, 2);
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(4, -2, 3, 4);
        ctx.fillStyle = '#9a8050'; ctx.fillRect(-9, -2, 3, 1); ctx.fillRect(-9, 1, 3, 1);
      } else if (this.type === 'bullet') {
        ctx.fillStyle = '#fff4c0'; ctx.fillRect(-5, -1, 8, 2);
        ctx.fillStyle = '#ffc04a'; ctx.fillRect(-2, -2, 4, 4);
      } else if (this.type === 'bomb' || this.type === 'dynamite') {
        ctx.fillStyle = this.color; ctx.fillRect(-6, -7, 12, 13);
        ctx.fillStyle = '#22252c'; ctx.fillRect(-6, -9, 12, 2);
        ctx.fillStyle = '#f0d060'; ctx.fillRect(3, -11, 3, 3);
        const blink = Math.sin(this.anim * 20) > 0;
        ctx.fillStyle = blink ? '#ff4a3a' : '#803020'; ctx.fillRect(5, -13, 2, 2);
      } else if (this.type === 'bone') {
        ctx.fillStyle = info.color; ctx.fillRect(-6, -1, 12, 3); ctx.fillRect(-8, -3, 3, 7); ctx.fillRect(5, -3, 3, 7);
      } else if (this.type === 'sting') {
        ctx.fillStyle = '#e8c050'; ctx.fillRect(-6, -1, 12, 2); ctx.fillStyle = '#a07830'; ctx.fillRect(-9, -1, 3, 2);
      } else if (this.type === 'laser') {
        ctx.fillStyle = '#ffd0a0'; ctx.fillRect(-10, -1, 20, 2);
        ctx.fillStyle = '#ff5a3a'; ctx.fillRect(-6, -2, 12, 4);
      } else if (this.type === 'ice') {
        ctx.fillStyle = info.color; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
      } else if (this.type === 'star') {
        ctx.fillStyle = '#ffe570';
        ctx.fillRect(-1, -7, 2, 14); ctx.fillRect(-7, -1, 14, 2); ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#fff8c0'; ctx.fillRect(-2, -2, 4, 4);
      } else {
        ctx.fillStyle = info.trail || info.color; ctx.fillRect(-this.size - 1, -this.size - 1, this.size * 2 + 2, this.size * 2 + 2);
        ctx.fillStyle = info.color; ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-Math.max(1, this.size - 2), -Math.max(1, this.size - 2), Math.max(2, this.size), Math.max(2, this.size));
      }
      ctx.restore();
    }
  }

  /* --------------------------------------------------------------- item drop */
  class ItemDrop {
    constructor(game, id, count, x, y, opts = {}) {
      this.id = id; this.count = count || 1;
      this.x = x; this.y = y; this.w = 10; this.h = 10;
      this.vx = opts.vx != null ? opts.vx : (Math.random() - .5) * 90;
      this.vy = opts.vy != null ? opts.vy : -100 - Math.random() * 70;
      this.age = 0; this.dead = false; this.onGround = false; this.bob = Math.random() * 6;
      this.magnet = false;
    }
    update(game, dt) {
      if (this.dead) return;
      this.age += dt; this.bob += dt;
      const p = game.player;
      const d = U.dist(this.x, this.y, p.cx, p.cy);
      this.magnet = this.age > 0.35 && d < 78 && !p.dead;
      if (this.magnet) {
        const a = Math.atan2(p.cy - this.y, p.cx - this.x);
        const sp = 140 + (78 - d) * 4;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.x += this.vx * dt; this.y += this.vy * dt;
      } else {
        this.vy += 820 * dt; this.vy = Math.min(this.vy, 600);
        this.x += this.vx * dt; this.y += this.vy * dt;
        const tx = Math.floor(this.x / TS), ty = Math.floor((this.y + this.h / 2) / TS);
        if (game.world.solid(tx, ty)) { this.y = ty * TS - this.h / 2; this.vy = -this.vy * .28; this.vx *= .7; if (Math.abs(this.vy) < 40) this.vy = 0; }
        this.vx *= this.onGround ? .85 : .995;
      }
      if (this.magnet && d < 18) this.pickup(game);
      if (this.age > 300) this.dead = true;
    }
    pickup(game) {
      const p = game.player;
      if (!window.ITEMS[this.id]) { this.dead = true; return; }
      if (window.ITEMS[this.id].type === 'coin' || /^coin/.test(this.id)) {
        p.wallet += (window.ITEMS[this.id].value || 1) * this.count;
        game.chat('+' + this.count + ' ' + prettyName(this.id), '#f0d070');
        AUDIO.sfx('coin'); this.dead = true; return;
      }
      const left = p.addItem(this.id, this.count);
      if (left < this.count) {
        AUDIO.sfx('pickup');
        game.addPickupText(this.x, this.y, (this.count - left) + ' ' + prettyName(this.id), window.RARITY[window.ITEMS[this.id].rarity] || '#fff');
        if (left <= 0) this.dead = true; else this.count = left;
      }
    }
    render(ctx, game) {
      if (this.dead) return;
      const cam = game.cam;
      const bob = Math.sin(this.bob * 3) * 2;
      const px = Math.round(this.x - cam.x), py = Math.round(this.y - cam.y + bob);
      if (px < -30 || px > 990) return;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(px, py + 10, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      const ic = window.ART.icon(this.id);
      const it = window.ITEMS[this.id];
      if (it && (it.rarity === 'orange' || it.rarity === 'pink' || it.rarity === 'lightPurple')) {
        ctx.globalAlpha = .35 + Math.sin(this.bob * 4) * .15;
        ctx.fillStyle = window.RARITY[it.rarity] || '#fff';
        ctx.fillRect(px - 12, py - 12, 24, 24);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(ic, px - ic.width / 2, py - ic.height / 2);
      if (this.count > 1) {
        ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(px + 4, py + 3, TXT.width(this.count, 5) + 3, 8);
        TXT.draw(ctx, this.count, px + 6, py + 3, 5, '#fff', 'left', 'top', false);
      }
    }
  }

  /* ----------------------------------------------------------------- minion */
  class Minion {
    constructor(game, kind, owner, x, y) {
      this.kind = kind; this.owner = owner;
      this.x = x; this.y = y; this.w = 16; this.h = 16;
      this.vx = 0; this.vy = 0; this.anim = Math.random() * 5;
      this.attackCd = .4 + Math.random() * .5; this.target = null; this.dead = false;
      this.damage = ({ babySlime: 10, hornet: 14, imp: 20, twins: 24 })[kind] || 12;
      this.sprite = ({ babySlime: 'greenSlime', hornet: 'hornet', imp: 'fireImp', twins: 'demonEye' })[kind] || 'greenSlime';
      this.life = 120;
    }
    update(game, dt) {
      this.anim += dt; this.life -= dt;
      this.attackCd -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      let best = null, bd = 300;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = U.dist(this.x, this.y, e.cx, e.cy);
        if (d < bd) { bd = d; best = e; }
      }
      this.target = best;
      if (best) {
        const a = Math.atan2(best.cy - this.y, best.cx - this.x);
        const sp = 200;
        this.vx = U.approach(this.vx, Math.cos(a) * sp, 900 * dt);
        this.vy = U.approach(this.vy, Math.sin(a) * sp, 900 * dt);
        if (bd < 26 && this.attackCd <= 0) {
          this.attackCd = .55;
          best.takeDamage(game, this.damage, U.sign(best.cx - this.x) * 1.4);
          game.dust(best.cx, best.cy, 3, '#a0e080');
        }
      } else {
        const tx = this.owner.cx - this.owner.dir * 28 + Math.sin(this.anim * 1.4 + this.kind.length) * 16;
        const ty = this.owner.cy - 36 + Math.cos(this.anim * 1.1) * 8;
        this.vx = U.approach(this.vx, (tx - this.x) * 3, 700 * dt);
        this.vy = U.approach(this.vy, (ty - this.y) * 3, 700 * dt);
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
    }
    render(ctx, game) {
      const cam = game.cam, px = Math.round(this.x - cam.x), py = Math.round(this.y - cam.y);
      const img = window.ART.enemy(this.sprite, Math.floor(this.anim * 9) % 4, '');
      ctx.save();
      ctx.globalAlpha = .9;
      ctx.drawImage(img, px - img.width / 2, py - img.height);
      ctx.globalAlpha = 1;
      ctx.restore();
      if (this.target) {
        ctx.strokeStyle = 'rgba(160,230,120,.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(this.target.cx - cam.x, this.target.cy - cam.y); ctx.stroke();
      }
    }
  }

  /* -------------------------------------------------------------------- NPC */
  class NPC {
    constructor(game, id, x, y) {
      this.id = id; this.def = window.NPCS[id];
      this.name = this.def ? this.def.name : id;
      this.x = x; this.y = y; this.w = 18; this.h = 38;
      this.dir = 1; this.anim = Math.random() * 6; this.talkTimer = 0; this.questReady = false;
      this.home = null; this.dead = false; this.state = 'idle'; this.walkT = 2 + Math.random() * 3;
      this.moveDir = 0; this.vy = 0; this.vx = 0;
    }
    get cx() { return this.x + this.w / 2; }
    get feet() { return this.y + this.h; }
    update(game, dt) {
      this.anim += dt;
      const p = game.player;
      if (U.dist(this.cx, this.feet, p.cx, p.feet) < 26 && !game.uiOpen) this.state = 'talk';
      else this.state = 'idle';
      if (this.state === 'talk') { this.dir = p.cx < this.cx ? -1 : 1; this.vx = 0; }
      else {
        this.walkT -= dt;
        if (this.walkT <= 0) { this.walkT = 2 + Math.random() * 4; this.moveDir = Math.random() < .45 ? (Math.random() < .5 ? -1 : 1) : 0; }
        const home = this.home;
        if (home && this.cx < home.x * TS + 24) this.moveDir = 1;
        if (home && this.cx > (home.x + home.w) * TS - 24) this.moveDir = -1;
        this.vx = U.approach(this.vx, this.moveDir * 32, 200 * dt);
        if (this.moveDir) this.dir = this.moveDir;
      }
      if (game.night) { this.vx *= .8; }
      this.vy += 1100 * dt;
      moveBody(game, this, dt, { platforms: true });
      this.talkTimer = Math.max(0, this.talkTimer - dt);
    }
    render(ctx, game) {
      const cam = game.cam, px = Math.round(this.cx - cam.x), py = Math.round(this.feet - cam.y);
      const img = window.ART.npc(this.id, Math.abs(this.vx) > 5 ? Math.floor(this.anim * 8) % 4 : 0, this.dir);
      ctx.drawImage(img, px - img.width / 2, py - img.height);
      const canTalk = U.dist(this.cx, this.feet, game.player.cx, game.player.feet) < 44;
      if (canTalk) {
        const bob = Math.sin(this.anim * 3) * 2;
        ctx.fillStyle = 'rgba(12,10,18,.85)'; ctx.fillRect(px - 26, py - img.height - 24 + bob, 52, 13);
        TXT.draw(ctx, 'F  TALK', px, py - img.height - 21 + bob, 4, '#ffe6a0', 'center', 'top', false);
        ctx.fillStyle = '#ffe6a0';
        ctx.beginPath(); ctx.moveTo(px - 4, py - img.height - 11 + bob); ctx.lineTo(px + 4, py - img.height - 11 + bob); ctx.lineTo(px, py - img.height - 6 + bob); ctx.fill();
      }
    }
  }

  /* --------------------------------------------------------------- particles */
  class Particle {
    constructor(x, y, color, size, vx, vy, life, gravity, glow) {
      this.x = x; this.y = y; this.color = color; this.size = size;
      this.vx = vx || 0; this.vy = vy || 0; this.life = life || 1; this.maxLife = this.life;
      this.gravity = gravity == null ? 500 : gravity; this.glow = !!glow;
    }
    update(game, dt) {
      this.life -= dt; this.vy += this.gravity * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= 0.99; this.vy *= 0.995;
    }
    render(ctx, game) {
      const cam = game.cam;
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
      ctx.fillStyle = this.color;
      const s = Math.max(1, this.size * (0.4 + this.life / this.maxLife * .6));
      ctx.fillRect(Math.round(this.x - cam.x - s / 2), Math.round(this.y - cam.y - s / 2), Math.ceil(s), Math.ceil(s));
      ctx.globalAlpha = 1;
    }
  }
  class Popup {
    constructor(x, y, text, color, life) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = life || .8; this.max = this.life; this.vy = -30; }
    update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy *= .98; }
    render(ctx, game) {
      const a = Math.min(1, this.life / this.max * 2);
      TXT.draw(ctx, this.text, this.x - game.cam.x, this.y - game.cam.y, 7, this.color, 'center', 'bottom', true, a);
    }
  }

  return {
    Player, Enemy, Boss, Projectile, ItemDrop, Minion, NPC, Particle, Popup,
    moveBody, solidBox, overlap, prettyName, maxStack, BUFF_INFO, PROJ
  };
})();
window.ENT = ENT;
