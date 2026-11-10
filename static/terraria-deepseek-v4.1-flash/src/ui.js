'use strict';
/* Canvas-drawn pixel interface: title, creation, HUD, inventory, crafting, chests, shops, dialogue, map, pause. */
class GameUI {
  constructor(game) {
    this.g = game;
    this.hits = [];
    this.tip = null;
    this.craftTab = 'all';
    this.craftScroll = 0;
    this.craftSelected = null;
    this.shopTab = 'buy';
    this.shopScroll = 0;
    this.titleScreen = 'main';
    this.lastRecipeClick = 0;
    this.toast = [];
    this.mapZoom = 1;
    this.stars = [];
    const r = new U.RNG('title-stars');
    for (let i = 0; i < 90; i++) this.stars.push({ x: r.float(0, 960), y: r.float(0, 300), s: r.float(.4, 1.5), p: r.float(0, 6) });
    this.tabs = [['all', 'ALL'], ['weapon', 'GEAR'], ['armor', 'ARMOR'], ['potion', 'POTIONS'], ['block', 'BLOCKS'], ['misc', 'MISC']];
  }
  get p() { return this.g.player; }
  addHit(x, y, w, h, action, data, extra) { this.hits.push({ x, y, w, h, action, data: data || null, ...(extra || {}) }); }
  hitAt(x, y) { for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x && y >= h.y && x < h.x + h.w && y < h.y + h.h) return h; } return null; }
  rarityColor(it) { return (it && window.RARITY[it.rarity]) || '#e8e6df'; }
  itemAt(area, index) {
    if (!this.p) return null;
    if (area === 'inv') return this.p.inventory[index] || null;
    if (area === 'equip') {
      if (index === 'helmet' || index === 'chest' || index === 'legs') return this.p.equip[index] ? { id: this.p.equip[index], count: 1 } : null;
      return this.p.equip.accessory[index] ? { id: this.p.equip.accessory[index], count: 1 } : null;
    }
    if (area === 'chest' && this.g.activeChest) return this.g.activeChest.items[index] || null;
    return null;
  }
  icon(id, size) {
    const ic = window.ART.icon(id);
    return ic;
  }
  /* ------------------------------------------------------------- click routing */
  click(x, y, button, shift) {
    const h = this.hitAt(x, y);
    if (!h) return false;
    AUDIO.sfx('click', 1);
    const g = this.g;
    if (h.action.startsWith('title:')) {
      const a = h.action.slice(6);
      if (a === 'new') { g.beginCreation(); this.titleScreen = 'main'; }
      else if (a === 'continue') g.continueGame();
      else if (a === 'controls') this.titleScreen = 'controls';
      else if (a === 'options') this.titleScreen = 'options';
      else if (a === 'back') this.titleScreen = 'main';
      return true;
    }
    if (h.action.startsWith('create:')) {
      const a = h.action.slice(7);
      if (a === 'start') g.startNewWorld();
      else if (a === 'back') g.state = 'title';
      else if (a === 'difficulty') g.creation.difficulty = h.data;
      else if (a === 'evil') g.creation.evil = h.data;
      else if (a === 'mode') g.creation.mode = h.data;
      else if (a === 'seedfield') g.editingField = 'seed';
      else if (a === 'namefield') g.editingField = 'name';
      return true;
    }
    switch (h.action) {
      case 'inv:slot': g.slotClick('inv', h.data, button, shift); break;
      case 'chest:slot': g.slotClick('chest', h.data, button, shift); break;
      case 'equip:slot': g.slotClick('equip', h.data, button, shift); break;
      case 'inv:sort': g.sortInventory(); break;
      case 'inv:trash': g.trashCursor(); break;
      case 'inv:close': g.closeUI(); break;
      case 'craft:tab': this.craftTab = h.data; this.craftScroll = 0; break;
      case 'craft:recipe': this.craftSelected = h.data; this.lastRecipeClick = performance.now(); break;
      case 'craft:make': g.craftSelected(this.craftSelected, shift ? 5 : 1); break;
      case 'craft:scroll': this.craftScroll = Math.max(0, this.craftScroll - (h.data === 'up' ? 4 : -4)); break;
      case 'chest:loot': g.lootAll(); break;
      case 'chest:close': g.closeUI(); break;
      case 'shop:tab': this.shopTab = h.data; this.shopScroll = 0; break;
      case 'shop:scroll': this.shopScroll = Math.max(0, this.shopScroll + (h.data < 0 ? -1 : 1)); break;
      case 'shop:buy': g.buyItem(h.data); break;
      case 'shop:sell': g.sellSlot(h.data, shift); break;
      case 'shop:close': g.closeUI(); break;
      case 'talk:shop': g.openShop(); break;
      case 'talk:heal': g.npcHeal(); break;
      case 'talk:quest': g.npcQuest(); break;
      case 'talk:close': g.closeUI(); break;
      case 'pause:resume': g.setPaused(false); break;
      case 'pause:save': g.saveGame(); g.notify('World saved.', '#9be08a'); break;
      case 'pause:quit': g.quitToTitle(); break;
      case 'pause:help': g.uiMode = 'help'; break;
      case 'pause:settings': g.uiMode = 'settings'; break;
      case 'settings:back': g.uiMode = g.previousUIMode || null; break;
      case 'settings:mute': AUDIO.toggleMute(); break;
      case 'settings:vol': g.settings.volume = U.clamp(g.settings.volume + (h.data === 'up' ? .1 : -.1), 0, 1); AUDIO.setVolume(g.settings.volume); break;
      case 'settings:music': g.settings.music = U.clamp(g.settings.music + (h.data === 'up' ? .1 : -.1), 0, 1); AUDIO.setMusicVolume(g.settings.music); break;
      case 'settings:sfx': g.settings.sfx = U.clamp(g.settings.sfx + (h.data === 'up' ? .1 : -.1), 0, 1); AUDIO.setSfxVolume(g.settings.sfx); break;
      case 'settings:mute2': g.settings.muted = AUDIO.toggleMute(); break;
      case 'settings:fps': g.settings.showFps = !g.settings.showFps; break;
      case 'settings:minimap': g.settings.minimap = !g.settings.minimap; break;
      case 'help:close': g.uiMode = g.previousUIMode || null; break;
      case 'map:close': g.uiMode = null; break;
      case 'death:respawn': g.respawn(); break;
      case 'death:new': g.quitToTitle(); break;
      case 'hud:map': g.uiMode = g.uiMode === 'map' ? null : 'map'; break;
      default:
        if (this.tip && this.tip.action) return true;
    }
    return true;
  }
  wheel(dy, x, y) {
    if (this.g.uiMode === 'inventory') {
      this.craftScroll = Math.max(0, this.craftScroll - Math.sign(dy) * 2);
      return true;
    }
    if (this.g.uiMode === 'shop') { this.shopScroll = Math.max(0, this.shopScroll - Math.sign(dy)); return true; }
    return false;
  }
  /* ---------------------------------------------------------------- primitives */
  P(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  panel(ctx, x, y, w, h, title, opts = {}) {
    ctx.save();
    this.P(ctx, x + 3, y + 4, w, h, 'rgba(0,0,0,.35)');
    this.P(ctx, x, y, w, h, opts.bg || 'rgba(17,20,33,.96)');
    this.P(ctx, x, y, w, 2, '#8e7d59'); this.P(ctx, x, y + h - 2, w, 2, '#3c3529');
    this.P(ctx, x, y, 2, h, '#8e7d59'); this.P(ctx, x + w - 2, y, 2, h, '#3c3529');
    this.P(ctx, x + 3, y + 3, w - 6, 1, 'rgba(255,235,180,.12)');
    for (const [cx, cy] of [[x + 3, y + 3], [x + w - 7, y + 3], [x + 3, y + h - 7], [x + w - 7, y + h - 7]]) this.P(ctx, cx, cy, 4, 4, opts.corner || '#b59654');
    if (title) {
      this.P(ctx, x + 2, y + 2, w - 4, 24, 'rgba(88,74,52,.55)');
      this.P(ctx, x + 2, y + 26, w - 4, 2, '#51452f');
      TXT.draw(ctx, title, x + 12, y + 9, 8, opts.titleColor || '#f0d690', 'left', 'middle');
      if (opts.titleRight) TXT.draw(ctx, opts.titleRight, x + w - 12, y + 9, 5, '#b9ae91', 'right', 'middle');
    }
    ctx.restore();
  }
  slot(ctx, x, y, s, item, o = {}) {
    const m = this.g.mouse;
    const hover = o.hover || (m && m.x >= x && m.x < x + s && m.y >= y && m.y < y + s);
    const bg = item ? this.rarityColor(item) : '#343945';
    this.P(ctx, x, y, s, s, o.selected ? '#b58b3d' : (hover ? '#8c7b58' : '#4f5668'));
    this.P(ctx, x + 2, y + 2, s - 4, s - 4, '#161a26');
    if (item) {
      const it = window.ITEMS[item.id];
      this.P(ctx, x + 3, y + 3, s - 6, s - 6, it ? U.rgba(this.rarityColor(it), .07) : 'rgba(255,255,255,.03)');
      const ic = window.ART.icon(item.id);
      const sc = s > 30 ? 1.4 : 1;
      ctx.drawImage(ic, Math.round(x + (s - ic.width * sc) / 2), Math.round(y + (s - ic.height * sc) / 2), Math.round(ic.width * sc), Math.round(ic.height * sc));
      if (item.count > 1) {
        const t = String(item.count);
        const tw = TXT.width(t, 6);
        this.P(ctx, x + s - tw - 4, y + s - 12, tw + 3, 10, 'rgba(0,0,0,.75)');
        TXT.draw(ctx, t, x + s - 2, y + s - 10, 6, '#fff', 'right', 'top', false);
      }
    }
    if (o.selected) {
      this.P(ctx, x - 2, y - 2, s + 4, 2, '#ffe08a'); this.P(ctx, x - 2, y + s, s + 4, 2, '#ffe08a');
    }
  }
  button(ctx, x, y, w, h, label, action, data, opts = {}) {
    const m = this.g.mouse;
    const isHover = m && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
    const base = opts.danger ? '#632e2e' : (opts.green ? '#315231' : (opts.flat ? '#2b3043' : '#3b4257'));
    this.P(ctx, x, y, w, h, isHover ? U.shade(base, 24) : base);
    this.P(ctx, x, y, w, 1, isHover ? '#e8d49a' : '#746c58');
    this.P(ctx, x, y + h - 1, w, 1, '#1c1e2b');
    TXT.draw(ctx, label, x + w / 2, y + h / 2 + (opts.size && opts.size < 7 ? 0 : 1), opts.size || 7, opts.color || '#f1ead6', 'center', 'middle', true);
    this.addHit(x, y, w, h, action, data);
    return isHover;
  }
  bar(ctx, x, y, w, h, frac, color, bg) {
    this.P(ctx, x, y, w, h, bg || '#151824');
    this.P(ctx, x + 1, y + 1, Math.max(0, Math.round((w - 2) * U.clamp(frac, 0, 1))), h - 2, color);
    this.P(ctx, x + 1, y + 1, Math.max(0, Math.round((w - 2) * U.clamp(frac, 0, 1))), 1, U.shade(color, 35));
  }
  /* -------------------------------------------------------------- title screen */
  drawTitle(ctx, t) {
    this.drawSky(ctx, t);
    const g = this.g;
    /* logo */
    const cy = 86 + Math.sin(t * .8) * 2;
    ctx.save();
    ctx.globalAlpha = .35; ctx.fillStyle = '#2a1410';
    ctx.fillRect(0, cy - 26, 960, 78);
    for (let i = 0; i < 6; i++) TXT.draw(ctx, 'TERRARIA', 480 + 2, cy + i * 1.2, 48, 'rgba(20,10,8,.4)', 'center', 'middle', false, .3 - i * .04);
    TXT.draw(ctx, 'TERRARIA', 478, cy + 2, 48, '#3a2412', 'center', 'middle', false);
    TXT.draw(ctx, 'TERRARIA', 480, cy, 48, '#e9c15a', 'center', 'middle', true);
    ctx.globalAlpha = .6;
    TXT.draw(ctx, 'TERRARIA', 480, cy - 1, 48, '#fff3bd', 'center', 'middle', false, .28);
    ctx.restore();
    TXT.draw(ctx, 'AN ENDLESS WORLD OF BLOCKS AND BEASTS', 480, cy + 58, 7, '#d9c79d', 'center', 'middle', true);
    this.P(ctx, 300, cy + 71, 360, 1, 'rgba(220,190,120,.35)');
    /* buttons */
    const hasSave = g.hasSave && g.hasSave();
    const labels = [
      ['NEW WORLD', 'title:new', '#f0d690'],
      ['CONTINUE', 'title:continue', hasSave ? '#d8e8c8' : '#73716a'],
      ['CONTROLS', 'title:controls', '#c8c3b4'],
      ['OPTIONS', 'title:options', '#c8c3b4']
    ];
    let by = 222;
    for (const [label, action, color] of labels) {
      const hov = this.hitAt(g.mouse.x, g.mouse.y);
      const w = 240, x = 360;
      const hover = hov && hov.action === action;
      this.P(ctx, x - 2, by - 2, w + 4, 36, hover ? '#6e5830' : 'rgba(22,21,24,.8)');
      this.P(ctx, x, by, w, 32, hover ? 'rgba(86,68,37,.9)' : 'rgba(30,29,34,.9)');
      this.P(ctx, x, by, 3, 32, hover ? '#e7c470' : '#7c6c4f');
      TXT.draw(ctx, label, 480, by + 16, 9, action === 'title:continue' && !hasSave ? '#6f6b61' : color, 'center', 'middle');
      this.addHit(x, by, w, 32, action);
      by += 46;
    }
    if (hasSave) {
      const s = g.saveInfo();
      const diff = s.difficulty ? (window.TR ? TR.name(String(s.difficulty).charAt(0).toUpperCase() + String(s.difficulty).slice(1)) : s.difficulty) : '';
      TXT.draw(ctx, `存档  ${s.world || '世界'}   ${diff}`, 480, by + 4, 5, '#a89f88', 'center', 'top');
    }
    TXT.draw(ctx, 'v1.0 - procedural pixel world', 16, 520, 5, 'rgba(230,220,195,.45)', 'left', 'middle', false);
    TXT.draw(ctx, 'CLICK TO BEGIN', 944, 520, 5, 'rgba(230,220,195,.35)', 'right', 'middle', false);
  }
  drawSky(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, '#131a38');
    grad.addColorStop(.35, '#34496b');
    grad.addColorStop(.7, '#a66f70');
    grad.addColorStop(1, '#e3a16d');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 440);
    for (const s of this.stars) {
      const a = .25 + .55 * (0.5 + 0.5 * Math.sin(t * .8 + s.p));
      ctx.globalAlpha = a; ctx.fillStyle = '#e8e4d0';
      ctx.fillRect(Math.round(s.x), Math.round(s.y - t * 1.2 + s.p * 20) % 300, Math.max(1, s.s), Math.max(1, s.s));
    }
    ctx.globalAlpha = 1;
    /* moon */
    ctx.fillStyle = '#efe7cd'; ctx.beginPath(); ctx.arc(775, 84, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9cfb0'; ctx.beginPath(); ctx.arc(768, 78, 5, 0, Math.PI * 2); ctx.arc(787, 94, 3, 0, Math.PI * 2); ctx.arc(784, 70, 2, 0, Math.PI * 2); ctx.fill();
    /* clouds */
    for (let i = 0; i < 8; i++) {
      const x = ((i * 143 - t * (8 + i)) % 1100 + 1100) % 1100 - 70;
      const y = 60 + (i * 37) % 120;
      ctx.globalAlpha = .12; ctx.fillStyle = '#f8e6d0';
      ctx.fillRect(Math.round(x), y, 90 + i * 6, 5); ctx.fillRect(Math.round(x + 12), y - 4, 62, 4); ctx.fillRect(Math.round(x + 30), y + 5, 44, 3);
    }
    ctx.globalAlpha = 1;
    /* mountain layers */
    for (let layer = 0; layer < 3; layer++) {
      const base = 330 + layer * 26;
      ctx.fillStyle = ['#202b45', '#28344a', '#35404d'][layer];
      ctx.beginPath(); ctx.moveTo(0, 440);
      for (let x = 0; x <= 960; x += 24) {
        const y = base - U.hash2(800 + layer, Math.floor(x / 48), layer) * (70 - layer * 15) - Math.sin(x * .01 + layer) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(960, 440); ctx.closePath(); ctx.fill();
    }
    /* forest silhouettes */
    for (let i = 0; i < 18; i++) {
      const x = (i * 61 + 23) % 960;
      const tr = window.ART.tree(i % 5 === 0 ? 'corrupt' : 'forest', i % 3, .8);
      ctx.globalAlpha = .65;
      ctx.drawImage(tr, x, 380 - tr.height * .2, tr.width * .8, tr.height * .8);
    }
    ctx.globalAlpha = 1;
    /* ground */
    const gy = 420;
    for (let x = 0; x < 960; x += 16) {
      const tx = Math.floor(x / 16);
      const tile = window.ART.tile(window.TILE.GRASS, 15);
      ctx.drawImage(tile, x, gy, 16, 16);
      if (x % 48 === 0) {
        for (let yy = gy + 16; yy < 540; yy += 16) ctx.drawImage(window.ART.tile(window.TILE.DIRT, 15), x, yy, 16, 16);
      }
    }
    ctx.fillStyle = 'rgba(10,10,16,.55)'; ctx.fillRect(0, gy + 16, 960, 540 - gy - 16);
    /* house silhouette */
    this.drawTitleHouse(ctx, 690, gy);
    /* guide and player silhouettes */
    const guide = window.ART.npc('guide', 0, 1); ctx.drawImage(guide, 210, gy - 42 * 1.5, 42, 63);
    const pl = window.ART.player('idle', 0, 1, { key: 'title', skin: '#e3b58a', shirt: '#5d7fbb', pants: '#37435a', hair: '#5b3a24', boots: '#3b2d25' });
    ctx.drawImage(pl, 260, gy - 42 * 1.5, 42, 63);
    /* fireflies */
    for (let i = 0; i < 16; i++) {
      const x = (i * 97 + Math.sin(t * .7 + i) * 18) % 960;
      const y = 300 + (i * 41) % 140 + Math.sin(t * 1.1 + i * 2) * 8;
      ctx.globalAlpha = .35 + .3 * Math.sin(t * 2 + i);
      ctx.fillStyle = '#ffd76a'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.globalAlpha = 1;
    this.P(ctx, 0, 528, 960, 12, '#0c0d14');
  }
  drawTitleHouse(ctx, x, gy) {
    this.P(ctx, x, gy - 64, 96, 64, '#4a3324');
    this.P(ctx, x, gy - 64, 96, 4, '#3a281c');
    for (let a = -12; a < 108; a += 16) { ctx.fillStyle = '#8a3f33'; ctx.beginPath(); ctx.moveTo(x + a, gy - 64); ctx.lineTo(x + a + 10, gy - 88); ctx.lineTo(x + a + 26, gy - 64); ctx.fill(); }
    this.P(ctx, x + 40, gy - 34, 18, 34, '#2a1e18');
    this.P(ctx, x + 12, gy - 50, 18, 18, '#f0c86a'); this.P(ctx, x + 15, gy - 47, 12, 12, '#a66a3a');
    this.P(ctx, x + 66, gy - 50, 18, 18, '#f0c86a'); this.P(ctx, x + 69, gy - 47, 12, 12, '#a66a3a');
  }
  drawControls(ctx) {
    ctx.fillStyle = 'rgba(8,9,14,.82)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 150, 70, 660, 400, 'CONTROLS');
    const lines = [
      ['MOVE', 'A / D  or  LEFT / RIGHT'], ['JUMP / SWIM', 'SPACE  or  W'], ['FALL THROUGH PLATFORM', 'S + SPACE'],
      ['DASH', 'SHIFT'], ['GRAPPLE', 'H  (with a grappling hook)'], ['USE / MINE / ATTACK', 'LEFT MOUSE'],
      ['PLACE / INTERACT', 'RIGHT MOUSE  or  F'], ['INVENTORY', 'E'], ['HOTBAR', '1 - 0  or  MOUSE WHEEL'],
      ['QUICK HEAL', 'R'], ['MAP', 'M'], ['DROP ITEM', 'Q'], ['PAUSE', 'ESC']
    ];
    lines.forEach((l, i) => {
      const y = 118 + i * 23;
      TXT.draw(ctx, l[0], 186, y, 6, '#d8c99f', 'left', 'middle');
      TXT.draw(ctx, l[1], 742, y, 6, '#aeb8c8', 'right', 'middle');
      this.P(ctx, 186, y + 10, 556, 1, 'rgba(150,140,110,.12)');
    });
    this.button(ctx, 390, 420, 180, 30, 'BACK', 'title:back');
  }
  drawOptions(ctx) {
    ctx.fillStyle = 'rgba(8,9,14,.82)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 250, 100, 460, 330, 'OPTIONS');
    const g = this.g;
    TXT.draw(ctx, 'MASTER VOLUME', 300, 170, 7, '#d8c99f');
    this.button(ctx, 620, 160, 26, 24, '-', 'settings:vol', 'down', { flat: true });
    this.button(ctx, 650, 160, 26, 24, '+', 'settings:vol', 'up', { flat: true });
    this.bar(ctx, 300, 186, 310, 8, g.settings.volume, '#c9a95a');
    TXT.draw(ctx, 'MUSIC', 300, 222, 7, '#d8c99f');
    this.button(ctx, 620, 212, 26, 24, '-', 'settings:music', 'down', { flat: true });
    this.button(ctx, 650, 212, 26, 24, '+', 'settings:music', 'up', { flat: true });
    this.bar(ctx, 300, 238, 310, 8, g.settings.music, '#6d88b8');
    TXT.draw(ctx, 'SOUND EFFECTS', 300, 274, 7, '#d8c99f');
    this.button(ctx, 620, 264, 26, 24, '-', 'settings:sfx', 'down', { flat: true });
    this.button(ctx, 650, 264, 26, 24, '+', 'settings:sfx', 'up', { flat: true });
    this.bar(ctx, 300, 290, 310, 8, g.settings.sfx, '#7da36e');
    TXT.draw(ctx, 'SOUND', 300, 326, 6, '#bdb49f');
    this.button(ctx, 390, 316, 120, 24, AUDIO.state.muted ? 'UNMUTE' : 'MUTE', 'settings:mute2');
    this.button(ctx, 400, 388, 160, 28, 'BACK', 'title:back');
  }
  /* --------------------------------------------------------------- creation */
  drawCreate(ctx, t) {
    this.drawSky(ctx, t);
    ctx.fillStyle = 'rgba(8,9,14,.62)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 110, 46, 740, 448, 'CREATE A WORLD');
    const c = this.g.creation;
    TXT.draw(ctx, 'WORLD NAME', 142, 94, 6, '#bdb39b');
    this.P(ctx, 142, 108, 300, 30, '#10141f'); this.P(ctx, 142, 108, 300, 1, '#4e4a3c');
    TXT.drawRaw(ctx, c.name || '', 152, 123, 7, '#f0e5c8', 'left', 'middle');
    if (this.g.editingField === 'name' && Math.floor(t * 2) % 2 === 0) this.P(ctx, 154 + TXT.rawWidth(c.name || '', 7), 112, 1, 22, '#f0d690');
    this.addHit(142, 108, 300, 30, 'create:namefield');
    TXT.draw(ctx, 'SEED', 478, 94, 6, '#bdb39b');
    this.P(ctx, 478, 108, 330, 30, '#10141f'); this.P(ctx, 478, 108, 330, 1, '#4e4a3c');
    TXT.drawRaw(ctx, c.seed || '', 488, 123, 7, '#f0e5c8', 'left', 'middle');
    if (this.g.editingField === 'seed' && Math.floor(t * 2) % 2 === 0) this.P(ctx, 490 + TXT.rawWidth(c.seed || '', 7), 112, 1, 22, '#f0d690');
    this.addHit(478, 108, 330, 30, 'create:seedfield');
    TXT.draw(ctx, 'CLICK A FIELD, TYPE, PRESS ENTER.  EMPTY SEED = SURPRISE.', 480, 146, 5, '#8f8877', 'center', 'top');
    /* difficulty */
    TXT.draw(ctx, 'DIFFICULTY', 142, 170, 6, '#bdb39b');
    const diffs = [['classic', 'CLASSIC', 'The world as it was meant to be.'], ['expert', 'EXPERT', 'Stronger foes. Richer rewards.'], ['master', 'MASTER', 'A world that wants you dead.']];
    diffs.forEach((d, i) => {
      const x = 142 + i * 188, y = 184, w = 176, h = 54;
      const on = c.difficulty === d[0];
      this.P(ctx, x, y, w, h, on ? '#4e3e2a' : '#171b28'); this.P(ctx, x, y, w, on ? 2 : 1, on ? '#e5c06a' : '#474b5a');
      TXT.draw(ctx, d[1], x + 12, y + 14, 7, on ? '#ffe6a0' : '#c4bca8');
      TXT.draw(ctx, d[2], x + 12, y + 32, 4, '#9e9582');
      this.addHit(x, y, w, h, 'create:difficulty', d[0]);
    });
    /* evil */
    TXT.draw(ctx, 'WORLD EVIL', 142, 260, 6, '#bdb39b');
    const evils = [['corruption', 'CORRUPTION', 'Purple chasms and shadow orbs.', '#593b73'], ['crimson', 'CRIMSON', 'Flesh, blood and beating hearts.', '#782f3d']];
    evils.forEach((d, i) => {
      const x = 142 + i * 278, y = 276, w = 260, h = 48;
      const on = c.evil === d[0];
      this.P(ctx, x, y, w, h, on ? d[3] : '#171b28'); this.P(ctx, x, y, w, on ? 2 : 1, on ? '#e5c06a' : '#474b5a');
      TXT.draw(ctx, d[1], x + 12, y + 13, 7, on ? '#ffe6a0' : '#c4bca8');
      TXT.draw(ctx, d[2], x + 12, y + 30, 4, '#c0b6a2');
      this.addHit(x, y, w, h, 'create:evil', d[0]);
    });
    /* mode */
    TXT.draw(ctx, 'DEATH RULE', 142, 346, 6, '#bdb39b');
    const modes = [['softcore', 'SOFTCORE', 'Drop coins on death.'], ['mediumcore', 'MEDIUMCORE', 'Drop your items.'], ['hardcore', 'HARDCORE', 'One life. No return.']];
    modes.forEach((d, i) => {
      const x = 142 + i * 188, y = 360, w = 176, h = 46;
      const on = c.mode === d[0];
      this.P(ctx, x, y, w, h, on ? '#4e3e2a' : '#171b28'); this.P(ctx, x, y, w, on ? 2 : 1, on ? '#e5c06a' : '#474b5a');
      TXT.draw(ctx, d[1], x + 12, y + 12, 6, on ? '#ffe6a0' : '#c4bca8');
      TXT.draw(ctx, d[2], x + 12, y + 28, 4, '#9e9582');
      this.addHit(x, y, w, h, 'create:mode', d[0]);
    });
    TXT.draw(ctx, 'TERRAIN, BIOMES, ORE AND DUNGEONS ARE GENERATED FROM THE SEED.', 480, 425, 5, '#8f8877', 'center', 'top');
    this.button(ctx, 300, 442, 170, 32, 'BEGIN', 'create:start', null, { green: true, size: 8 });
    this.button(ctx, 500, 442, 150, 32, 'BACK', 'create:back');
  }
  /* ---------------------------------------------------------------- loading */
  drawLoading(ctx, t) {
    ctx.fillStyle = '#080b13'; ctx.fillRect(0, 0, 960, 540);
    const gr = ctx.createRadialGradient(480, 240, 20, 480, 240, 340);
    gr.addColorStop(0, 'rgba(70,78,110,.35)'); gr.addColorStop(1, 'rgba(8,10,16,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 960, 540);
    TXT.draw(ctx, 'TERRARIA', 480, 210, 34, '#e9c15a', 'center', 'middle');
    TXT.draw(ctx, this.g.loadStage || 'SHAPING THE WORLD', 480, 252, 7, '#d8c8a0', 'center', 'middle');
    this.bar(ctx, 280, 286, 400, 14, this.g.loadProgress || 0, '#c9a95a', '#171a24');
    const tips = [
      'Tip: torches keep the dark at bay.',
      'Tip: a bed sets your respawn point.',
      'Tip: every boss has a summoning item.',
      'Tip: houses need a door, table, chair and light.',
      'Tip: platforms let you fall through with S + SPACE.',
      'Tip: the Guide knows more than he lets on.'
    ];
    TXT.draw(ctx, tips[Math.floor(t / 4) % tips.length], 480, 330, 5, '#8e8a7c', 'center', 'middle');
    for (let i = 0; i < 40; i++) {
      const x = (i * 173 + t * 12) % 960, y = 380 + (i * 53) % 150;
      ctx.globalAlpha = .15 + .2 * Math.sin(t * 2 + i); ctx.fillStyle = '#c9a95a'; ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  /* ------------------------------------------------------------------- HUD */
  drawHUD(ctx) {
    const g = this.g, p = g.player;
    if (!p) return;
    /* hearts */
    const hearts = Math.ceil(p.maxLife / 20);
    const rows = hearts > 10 ? 2 : 1;
    for (let i = 0; i < hearts; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const x = 16 + col * 14, y = 412 + row * 13;
      this.drawHeart(ctx, x, y, p.life > i * 20 + 10, p.life > i * 20);
    }
    TXT.draw(ctx, `${Math.ceil(p.life)} / ${p.maxLife}`, 16, 442, 5, '#e8c8c8', 'left', 'top');
    /* mana */
    for (let i = 0; i < 10; i++) {
      const x = 16 + i * 12, y = 458;
      this.drawStar(ctx, x + 4, y, p.mana > i * p.maxMana / 10 + 1);
    }
    TXT.draw(ctx, `${Math.floor(p.mana)} / ${p.maxMana}`, 138, 454, 5, '#a8c8f0', 'left', 'top');
    /* coins */
    const wallet = p.wallet;
    const parts = U.formatMoney(wallet);
    let cx = 16;
    ctx.drawImage(window.ART.icon('coinCopper'), cx, 474, 12, 12); TXT.draw(ctx, parts.c, cx + 13, 475, 4, '#e8c8a0', 'left', 'top'); cx += 26;
    ctx.drawImage(window.ART.icon('coinSilver'), cx, 474, 12, 12); TXT.draw(ctx, parts.s, cx + 13, 475, 4, '#dfe4ea', 'left', 'top'); cx += 26;
    ctx.drawImage(window.ART.icon('coinGold'), cx, 474, 12, 12); TXT.draw(ctx, parts.g, cx + 13, 475, 4, '#ffe080', 'left', 'top'); cx += 26;
    ctx.drawImage(window.ART.icon('coinPlatinum'), cx, 474, 12, 12); TXT.draw(ctx, parts.p, cx + 13, 475, 4, '#e8f0ff', 'left', 'top');
    /* buffs */
    let bx = 16;
    for (const b of p.buffs) {
      const info = window.ENT.BUFF_INFO[b.id] || b;
      this.P(ctx, bx, 16, 26, 26, 'rgba(15,17,26,.9)');
      this.P(ctx, bx + 2, 18, 22, 22, U.rgba(info.color || '#aaa', .35));
      const bname = window.TR ? TR.name(info.name || b.id) : (info.name || b.id);
      TXT.draw(ctx, String(bname).slice(0, 1), bx + 13, 29, 8, info.color || '#fff', 'center', 'middle');
      TXT.draw(ctx, String(Math.ceil(b.time)), bx + 13, 42, 4, '#e6dfd0', 'center', 'top', false);
      this.addHit(bx, 16, 26, 26, 'noop', { tip: bname, desc: info.bad ? 'A harmful effect.' : 'A helpful effect.' });
      bx += 30;
    }
    /* hotbar */
    const hx = 480 - 5 * 40, hy = 486;
    for (let i = 0; i < 10; i++) {
      const item = p.inventory[i];
      const x = hx + i * 40;
      this.slot(ctx, x, hy, 36, item, { selected: p.selected === i });
      this.addHit(x, hy, 36, 36, 'inv:slot', i, { hotbar: true, item });
      TXT.draw(ctx, String((i + 1) % 10), x + 3, hy + 3, 4, 'rgba(230,220,190,.6)', 'left', 'top', false);
    }
    const sel = p.selectedItem();
    if (sel) {
      const n = window.ENT.prettyName(sel.id);
      TXT.draw(ctx, n, 480, hy - 10, 5, this.rarityColor(window.ITEMS[sel.id]), 'center', 'bottom');
    }
    /* minimap */
    if (g.settings.minimap && g.minimapCanvas) {
      const mx = 782, my = 16, mw = 164, mh = 102;
      this.P(ctx, mx - 2, my - 2, mw + 4, mh + 4, '#0b0d14');
      this.P(ctx, mx - 1, my - 1, mw + 2, mh + 2, '#8e7d59');
      ctx.drawImage(g.minimapCanvas, mx, my, mw, mh);
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeRect(mx + .5, my + .5, mw - 1, mh - 1);
      const px = mx + mw / 2, py = my + mh / 2;
      ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, py - 1, 3, 3);
      for (const n of g.npcs) {
        const nx = px + (n.cx - p.cx) / 48, ny = py + (n.feet - p.feet) / 48;
        if (nx > mx + 2 && nx < mx + mw - 2 && ny > my + 2 && ny < my + mh - 2) { ctx.fillStyle = '#ffd76a'; ctx.fillRect(nx - 1, ny - 1, 2, 2); }
      }
      for (const b of g.enemies) if (b.boss && !b.dead) {
        const bx2 = px + (b.cx - p.cx) / 48, by2 = py + (b.cy - p.cy) / 48;
        if (bx2 > mx + 2 && bx2 < mx + mw - 2 && by2 > my + 2 && by2 < my + mh - 2) { ctx.fillStyle = '#ff4a4a'; ctx.fillRect(bx2 - 2, by2 - 2, 4, 4); }
      }
      this.addHit(mx, my, mw, mh, 'hud:map');
    }
    const bio = g.world.biomeDefAt(p.cx / 16, p.cy / 16);
    TXT.draw(ctx, bio.name || g.world.biomeAt(p.cx / 16, p.cy / 16), 944, 121, 5, '#e0d8c4', 'right', 'top');
    TXT.draw(ctx, g.world.depthLabel(p.cy / 16) + '  ' + Math.max(0, Math.round((p.cy - g.world.surface[U.clamp(Math.floor(p.cx / 16), 0, g.world.w - 1)] * 16) / 16)) + ' ft', 944, 133, 4, '#a8a08e', 'right', 'top');
    /* clock / weather */
    const mins = Math.floor(g.dayTime * 1440), hh = Math.floor(mins / 60), mm = mins % 60;
    const clock = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    TXT.draw(ctx, (g.night ? 'NIGHT ' : 'DAY ') + clock, 944, 152, 5, g.night ? '#a8b8e8' : '#ffe0a0', 'right', 'top');
    if (g.weather && g.weather.type !== 'clear') TXT.draw(ctx, window.TR ? TR.weather(g.weather.type) : g.weather.type.toUpperCase(), 944, 164, 4, '#b8d8f0', 'right', 'top');
    /* boss bar */
    const boss = g.enemies.find(e => e.boss && !e.dead);
    if (boss) {
      const frac = U.clamp(boss.hp / boss.maxHp, 0, 1);
      this.P(ctx, 250, 20, 460, 30, 'rgba(12,10,16,.82)');
      this.P(ctx, 252, 22, 456, 2, '#7e6a48');
      TXT.draw(ctx, boss.name, 480, 30, 6, '#ffd8a0', 'center', 'middle');
      this.bar(ctx, 262, 38, 436, 7, frac, '#b03a3a', '#2a1414');
      TXT.draw(ctx, Math.ceil(boss.hp) + ' / ' + boss.maxHp, 700, 30, 4, '#e8b0a0', 'right', 'middle');
    }
    /* quest tracker */
    if (g.quest && g.quest.active) {
      this.P(ctx, 16, 172, 174, 44, 'rgba(12,14,22,.72)');
      this.P(ctx, 16, 172, 2, 44, '#c9a95a');
      TXT.draw(ctx, 'QUEST', 24, 177, 4, '#e0c070');
      TXT.draw(ctx, g.quest.title, 24, 187, 4, '#e8dfc8');
      TXT.draw(ctx, `${Math.min(g.quest.progress, g.quest.need)} / ${g.quest.need}`, 182, 202, 4, '#b8d890', 'right', 'top');
    }
    /* chat */
    this.drawChat(ctx);
    /* interaction prompt */
    const promptY = sel ? 432 : 456;
    if (g.nearNPC) {
      TXT.draw(ctx, 'F   TALK TO ' + g.nearNPC.name, 480, promptY, 5, '#ffe0a0', 'center', 'middle');
    } else if (g.nearInteract) {
      TXT.draw(ctx, 'F   ' + g.nearInteract.label, 480, promptY, 5, '#ffe0a0', 'center', 'middle');
    }
    /* cursor icon for tool */
    this.drawToolCursor(ctx);
  }
  drawChat(ctx) {
    const g = this.g;
    let y = 330;
    for (const c of g.chatLog.slice(-5)) {
      const alpha = U.clamp(c.time / 1.2, 0, 1);
      ctx.globalAlpha = alpha;
      TXT.draw(ctx, c.text, 16, y, 5, c.color || '#e8dfc8', 'left', 'top', true);
      ctx.globalAlpha = 1;
      y += 18;
    }
  }
  drawHeart(ctx, x, y, full, half) {
    const c = full ? '#e0444e' : (half ? '#9e3038' : '#3c2028');
    const hi = full ? '#ff8c94' : '#5a3038';
    this.P(ctx, x + 2, y, 2, 2, c); this.P(ctx, x + 8, y, 2, 2, c);
    this.P(ctx, x, y + 2, 12, 4, c); this.P(ctx, x + 2, y + 6, 8, 3, c); this.P(ctx, x + 4, y + 9, 4, 2, c);
    if (full) { this.P(ctx, x + 2, y + 2, 2, 2, hi); this.P(ctx, x + 8, y + 2, 1, 1, hi); }
    this.P(ctx, x, y + 11, 12, 1, 'rgba(0,0,0,.25)');
  }
  drawStar(ctx, x, y, full) {
    const c = full ? '#5b8fe8' : '#1f2b44';
    this.P(ctx, x - 1, y + 3, 3, 2, c); this.P(ctx, x - 3, y + 4, 7, 2, c); this.P(ctx, x - 2, y + 6, 5, 2, c);
    if (full) this.P(ctx, x - 1, y + 4, 1, 1, '#b8d8ff');
  }
  drawToolCursor(ctx) {
    const m = this.g.mouse;
    if (!this.p) return;
    const sel = this.p.selectedItem();
    if (sel && this.g.uiMode === null) {
      const it = window.ITEMS[sel.id];
      if (it && (it.pick || it.axe || it.hammer)) {
        const ic = window.ART.icon(sel.id);
        ctx.drawImage(ic, Math.round(m.x - 2), Math.round(m.y - 2), 16, 16);
      }
    }
  }
  /* ------------------------------------------------------------- inventory */
  drawInventory(ctx) {
    const g = this.g, p = this.p;
    ctx.fillStyle = 'rgba(5,6,10,.58)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 22, 32, 642, 476, 'INVENTORY', { titleRight: (p.stats.set ? p.stats.set.toUpperCase() + ' SET' : '') });
    /* equipment */
    TXT.draw(ctx, 'EQUIPMENT', 42, 66, 5, '#b8ae96');
    const armor = [['helmet', 42, 78], ['chest', 82, 78], ['legs', 122, 78]];
    for (const [kind, x, y] of armor) {
      const item = this.itemAt('equip', kind);
      this.slot(ctx, x, y, 34, item, { hover: this.hoverSlot('equip', kind) });
      this.addHit(x, y, 34, 34, 'equip:slot', kind, { item });
      TXT.draw(ctx, kind === 'helmet' ? 'HEAD' : kind === 'chest' ? 'BODY' : 'LEGS', x + 17, y + 38, 4, '#7e786a', 'center', 'top');
    }
    TXT.draw(ctx, 'ACCESSORIES', 42, 156, 5, '#b8ae96');
    for (let i = 0; i < 5; i++) {
      const x = 42 + (i % 2) * 40, y = 168 + Math.floor(i / 2) * 40;
      const item = this.itemAt('equip', i);
      this.slot(ctx, x, y, 34, item, { hover: this.hoverSlot('equip', i) });
      this.addHit(x, y, 34, 34, 'equip:slot', i, { item });
    }
    /* preview + stats */
    this.P(ctx, 154, 66, 92, 154, 'rgba(9,11,18,.7)'); this.P(ctx, 154, 66, 92, 1, '#5b5342');
    const img = window.ART.player('idle', Math.floor(g.time * 8) % 4, 1, p.gear);
    ctx.drawImage(img, 172, 94, 56, 84);
    this.P(ctx, 154, 168, 92, 18, 'rgba(0,0,0,.45)');
    TXT.draw(ctx, 'DEF ' + Math.round(p.stats.defense), 200, 177, 5, '#b8d0e8', 'center', 'middle');
    TXT.draw(ctx, 'LIFE ' + Math.ceil(p.life) + '/' + p.maxLife, 42, 238, 5, '#e8a0a0');
    TXT.draw(ctx, 'MANA ' + Math.floor(p.mana) + '/' + p.maxMana, 42, 254, 5, '#a0b8e8');
    TXT.draw(ctx, 'MELEE x' + p.stats.melee.toFixed(2), 42, 270, 4, '#d0b8a0');
    TXT.draw(ctx, 'RANGED x' + p.stats.ranged.toFixed(2), 42, 284, 4, '#c0d0b0');
    TXT.draw(ctx, 'MAGIC x' + p.stats.magic.toFixed(2), 42, 298, 4, '#b8c0e8');
    TXT.draw(ctx, 'SUMMON x' + p.stats.summon.toFixed(2), 42, 312, 4, '#e0c0a0');
    TXT.draw(ctx, 'CRIT ' + Math.round(p.stats.crit * 100) + '%', 42, 326, 4, '#e8d8a0');
    if (p.stats.set) {
      const bonus = { copper: '+2 防御', iron: '+3 防御', silver: '+3 防御', gold: '+4 防御', shadow: '+8% 移速', crimson: '生命再生', meteor: '+10% 魔法', jungle: '+6% 魔法，+1 防御', molten: '+10% 近战', cobalt: '+10% 移速', mythril: '+6% 全伤害', adamantite: '+10% 全伤害' }[p.stats.set] || '';
      TXT.draw(ctx, 'SET BONUS', 154, 238, 4, '#e0c070');
      let sy = 250;
      for (const bl of TXT.wrap(ctx, bonus, 88, 4)) { TXT.draw(ctx, bl, 154, sy, 4, '#c8bfa8'); sy += 12; }
    }
    /* inventory grid */
    TXT.draw(ctx, 'BACKPACK', 258, 66, 5, '#b8ae96');
    for (let i = 0; i < 50; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const x = 258 + col * 39, y = 76 + row * 39;
      const item = p.inventory[i];
      this.slot(ctx, x, y, 36, item, { selected: p.selected === i, hover: this.hoverSlot('inv', i) });
      this.addHit(x, y, 36, 36, 'inv:slot', i, { item });
      if (i < 10) TXT.draw(ctx, String((i + 1) % 10), x + 2, y + 2, 3, 'rgba(255,255,255,.35)', 'left', 'top', false);
    }
    TXT.draw(ctx, 'HOTBAR IS THE TOP ROW.  CLICK TO PICK UP / PLACE.  RIGHT CLICK SPLITS OR PLACES ONE.', 258, 282, 4, '#7e786a');
    /* buttons */
    this.button(ctx, 258, 300, 100, 28, 'SORT', 'inv:sort', null, { flat: true });
    this.button(ctx, 366, 300, 100, 28, 'TRASH', 'inv:trash', null, { danger: true });
    this.button(ctx, 586, 300, 60, 28, 'CLOSE', 'inv:close', null, { flat: true, size: 5 });
    /* coins row */
    const parts = U.formatMoney(p.wallet);
    let cx = 258, cy = 344;
    for (const [id, val, col] of [['coinCopper', parts.c, '#e8c8a0'], ['coinSilver', parts.s, '#dfe4ea'], ['coinGold', parts.g, '#ffe080'], ['coinPlatinum', parts.p, '#e8f0ff']]) {
      ctx.drawImage(window.ART.icon(id), cx, cy, 16, 16);
      TXT.draw(ctx, String(val), cx + 18, cy + 8, 5, col, 'left', 'middle');
      cx += 64;
    }
    TXT.draw(ctx, 'DEFENSE', 258, 378, 5, '#8e8878');
    TXT.draw(ctx, String(Math.round(p.stats.defense)), 380, 378, 7, '#c8e0f8', 'right', 'top');
    TXT.draw(ctx, 'DAMAGE REDUCTION', 258, 394, 4, '#8e8878');
    TXT.draw(ctx, Math.round(p.stats.damageReduction * 100) + '%', 380, 394, 4, '#c8e0f8', 'right', 'top');
    TXT.draw(ctx, 'KILLS ' + p.kills, 258, 410, 4, '#b09a6a');
    TXT.draw(ctx, 'CRYSTALS  LIFE ' + p.usedLifeCrystal + '   MANA ' + p.usedManaCrystal, 258, 422, 4, '#b09a6a');
    /* crafting panel */
    this.drawCrafting(ctx);
    /* dragged stack */
    if (g.cursor) this.drawDragged(ctx);
  }
  hoverSlot(area, index) {
    const hov = this.hitAt(this.g.mouse.x, this.g.mouse.y);
    if (!hov) return false;
    return hov.action === (area === 'inv' ? 'inv:slot' : 'equip:slot') && String(hov.data) === String(index);
  }
  /* -------------------------------------------------------------- crafting */
  recipeList() {
    const g = this.g, p = this.p;
    if (!p) return [];
    const near = g.nearbyStations();
    const out = [];
    for (const r of window.RECIPES) {
      if (r.hardmode && !g.world.hardmode) continue;
      if (r.station && !near.has(r.station)) continue;
      const tab = this.recipeTab(r);
      if (this.craftTab !== 'all' && tab !== this.craftTab) continue;
      const can = g.canCraft(r);
      out.push({ r, can, tab });
    }
    out.sort((a, b) => (b.can ? 1 : 0) - (a.can ? 1 : 0) || a.r.out.localeCompare(b.r.out));
    return out;
  }
  recipeTab(r) {
    const it = window.ITEMS[r.out];
    if (!it) return 'misc';
    if (it.type === 'weapon' || it.type === 'tool' || it.type === 'ammo' || it.type === 'summonItem') return 'weapon';
    if (it.type === 'armor' || it.type === 'accessory') return 'armor';
    if (it.type === 'potion') return 'potion';
    if (it.type === 'block' || it.type === 'wall') return 'block';
    return 'misc';
  }
  drawCrafting(ctx) {
    const g = this.g;
    this.panel(ctx, 676, 32, 260, 476, 'CRAFTING');
    const near = g.nearbyStations();
    const stations = [...near].filter(Boolean).map(s => s.toUpperCase());
    TXT.draw(ctx, stations.length ? stations.join(' / ') : 'HAND', 688, 64, 4, '#b8a878');
    /* tabs */
    let tx = 688, ty = 74;
    for (let i = 0; i < this.tabs.length; i++) {
      const [id, label] = this.tabs[i];
      const w = i < 3 ? 68 : 68;
      if (i === 3) { tx = 688; ty = 96; }
      const on = this.craftTab === id;
      this.P(ctx, tx, ty, w - 3, 18, on ? '#5c4a30' : '#222633');
      TXT.draw(ctx, label, tx + (w - 3) / 2, ty + 9, 4, on ? '#ffe0a0' : '#9e988a', 'center', 'middle');
      this.addHit(tx, ty, w - 3, 18, 'craft:tab', id);
      tx += w;
      if (i === 2) tx = 688;
    }
    const list = this.recipeList();
    const maxRows = 9;
    this.craftScroll = U.clamp(this.craftScroll, 0, Math.max(0, list.length - maxRows));
    if (this.craftSelected && !list.some(e => e.r === this.craftSelected)) this.craftSelected = list[0] ? list[0].r : null;
    if (!this.craftSelected && list.length) this.craftSelected = list[0].r;
    const start = this.craftScroll;
    const listY = 122;
    for (let i = 0; i < maxRows; i++) {
      const entry = list[start + i];
      if (!entry) break;
      const r = entry.r, y = listY + i * 26;
      const selected = this.craftSelected === r;
      const hov = this.hitAt(g.mouse.x, g.mouse.y);
      this.P(ctx, 688, y, 236, 24, selected ? '#4c3e2b' : (entry.can ? '#1b202d' : '#151821'));
      this.P(ctx, 688, y, 2, 24, entry.can ? '#8ea86c' : '#443f36');
      ctx.drawImage(window.ART.icon(r.out), 695, y + 3, 18, 18);
      const nm = window.ENT.prettyName(r.out) || (window.ITEMS[r.out] && window.ITEMS[r.out].name) || r.out;
      TXT.draw(ctx, nm.length > 23 ? nm.slice(0, 22) + '.' : nm, 716, y + 6, 4, entry.can ? '#e8dfc8' : '#6e6a60');
      if (r.count > 1) TXT.draw(ctx, 'x' + r.count, 920, y + 6, 4, '#b8b09a', 'right', 'top');
      if (entry.can) { this.P(ctx, 914, y + 15, 5, 5, '#8ea86c'); }
      this.addHit(688, y, 236, 24, 'craft:recipe', r, { entry });
      if (selected) {
        this.P(ctx, 688, y + 24, 236, 1, '#c9a95a');
      }
      if (hov && hov.action === 'craft:recipe' && hov.data === r) this.hoverRecipe = r;
    }
    if (!list.length) TXT.draw(ctx, 'NO RECIPES AT THIS STATION', 806, 240, 5, '#8a8474', 'center', 'middle');
    /* scrollbar */
    if (list.length > maxRows) {
      this.P(ctx, 930, listY, 4, 234, '#141722');
      const frac = this.craftScroll / Math.max(1, list.length - maxRows);
      this.P(ctx, 930, listY + frac * 200, 4, 34, '#8e7d59');
      this.addHit(930, listY, 4, 234, 'noop');
    }
    const sel = this.craftSelected;
    this.P(ctx, 688, 366, 236, 98, 'rgba(8,10,16,.65)'); this.P(ctx, 688, 366, 236, 1, '#524a3a');
    if (sel) {
      const it = window.ITEMS[sel.out];
      TXT.draw(ctx, window.ENT.prettyName(sel.out), 696, 374, 5, this.rarityColor(it));
      let yy = 390;
      for (const [ing, n] of sel.ingredients) {
        const have = g.player.countItem(ing), ok = have >= n;
        ctx.drawImage(window.ART.icon(ing), 696, yy - 4, 12, 12);
        TXT.draw(ctx, window.ENT.prettyName(ing), 712, yy, 4, ok ? '#c8d8b0' : '#a08080');
        TXT.draw(ctx, have + '/' + n, 914, yy, 4, ok ? '#9ed08a' : '#e08080', 'right', 'top');
        yy += 15;
      }
      TXT.draw(ctx, sel.station ? 'AT ' + sel.station.toUpperCase() : 'BY HAND', 696, 440, 4, '#9a9280');
    }
    const can = sel && g.canCraft(sel);
    this.button(ctx, 688, 464, 150, 28, can ? 'CRAFT' : 'MISSING', 'craft:make', null, { green: can, flat: !can, size: 7 });
    this.button(ctx, 846, 464, 78, 28, 'CLOSE', 'inv:close', null, { flat: true, size: 5 });
  }
  drawDragged(ctx) {
    const g = this.g, m = g.mouse, s = g.cursor;
    if (!s) return;
    const ic = window.ART.icon(s.id);
    ctx.globalAlpha = .9;
    ctx.drawImage(ic, m.x - 9, m.y - 9, 18, 18);
    ctx.globalAlpha = 1;
    if (s.count > 1) TXT.draw(ctx, s.count, m.x + 8, m.y + 4, 6, '#fff', 'left', 'top');
  }
  /* ---------------------------------------------------------------- chest */
  drawChest(ctx) {
    const g = this.g, ch = g.activeChest, p = this.p;
    ctx.fillStyle = 'rgba(5,6,10,.6)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 92, 60, 776, 424, ch && ch.gold ? 'GOLDEN CHEST' : 'CHEST');
    TXT.draw(ctx, ch && ch.gold ? 'GOLDEN CHEST' : 'CHEST', 116, 92, 5, '#b8ae96');
    for (let i = 0; i < 20; i++) {
      const col = i % 5, row = Math.floor(i / 5);
      const x = 116 + col * 44, y = 106 + row * 44;
      const item = ch && ch.items[i];
      this.slot(ctx, x, y, 40, item, { hover: this.hoverSlot('chest', i) });
      this.addHit(x, y, 40, 40, 'chest:slot', i, { item });
    }
    this.button(ctx, 116, 292, 110, 26, 'LOOT ALL', 'chest:loot', null, { flat: true });
    TXT.draw(ctx, 'YOUR INVENTORY', 370, 92, 5, '#b8ae96');
    for (let i = 0; i < 50; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const x = 370 + col * 39, y = 106 + row * 39;
      this.slot(ctx, x, y, 36, p.inventory[i], { selected: p.selected === i, hover: this.hoverSlot('inv', i) });
      this.addHit(x, y, 36, 36, 'inv:slot', i, { item: p.inventory[i] });
    }
    this.button(ctx, 748, 292, 100, 26, 'CLOSE', 'chest:close', null, { flat: true });
    TXT.draw(ctx, 'SHIFT-CLICK TO MOVE A STACK.  Q OVER A SLOT DROPS IT.', 370, 316, 4, '#7e786a');
    if (g.cursor) this.drawDragged(ctx);
  }
  /* ---------------------------------------------------------------- shop */
  drawShop(ctx) {
    const g = this.g, p = this.p, npc = g.activeNpc;
    ctx.fillStyle = 'rgba(5,6,10,.62)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 96, 46, 768, 452, (npc ? npc.name.toUpperCase() : 'SHOP'), { titleRight: U.moneyString(p.wallet, true) });
    this.tabs.forEach((t, i) => { });
    this.button(ctx, 116, 82, 100, 24, 'BUY', 'shop:tab', 'buy', { flat: this.shopTab !== 'buy', green: this.shopTab === 'buy', size: 6 });
    this.button(ctx, 224, 82, 100, 24, 'SELL', 'shop:tab', 'sell', { flat: this.shopTab !== 'sell', green: this.shopTab === 'sell', size: 6 });
    const shop = (npc && npc.def && npc.def.shop) || [];
    if (this.shopTab === 'buy') {
      const cols = 2, rows = 7;
      const start = this.shopScroll * rows;
      for (let i = 0; i < rows * cols; i++) {
        const idx = start + i;
        const entry = shop[idx];
        if (!entry) break;
        const [id, price] = entry;
        const col = i % cols, row = Math.floor(i / cols);
        const x = 116 + col * 370, y = 122 + row * 46;
        const it = window.ITEMS[id];
        this.P(ctx, x, y, 356, 40, 'rgba(18,22,32,.9)');
        this.P(ctx, x, y, 2, 40, p.wallet >= price ? '#8ea86c' : '#6a4a4a');
        ctx.drawImage(window.ART.icon(id), x + 6, y + 4, 24, 24);
        TXT.draw(ctx, window.ENT.prettyName(id), x + 36, y + 8, 5, this.rarityColor(it));
        TXT.draw(ctx, U.moneyString(price, true), x + 344, y + 8, 5, p.wallet >= price ? '#ffe080' : '#aa7070', 'right', 'top');
        TXT.draw(ctx, 'BUY x1   SHIFT x5', x + 344, y + 24, 4, '#8a8474', 'right', 'top');
        this.addHit(x, y, 356, 40, 'shop:buy', { id, price }, { item: { id, count: 1 } });
      }
      if (shop.length > rows * 2) {
        if (this.shopScroll > 0) this.button(ctx, 730, 90, 40, 20, 'UP', 'shop:scroll', -1, { flat: true, size: 4 });
        this.button(ctx, 780, 90, 40, 20, 'DN', 'shop:scroll', 1, { flat: true, size: 4 });
      }
    } else {
      TXT.draw(ctx, 'CLICK AN ITEM TO SELL ONE.  SHIFT-CLICK TO SELL THE STACK.', 116, 118, 4, '#9e9682');
      for (let i = 0; i < 50; i++) {
        const col = i % 10, row = Math.floor(i / 10);
        const x = 116 + col * 58, y = 136 + row * 58;
        const item = p.inventory[i];
        this.slot(ctx, x, y, 44, item, { selected: p.selected === i });
        this.addHit(x, y, 44, 44, 'shop:sell', i, { item });
        if (item && window.ITEMS[item.id]) TXT.draw(ctx, U.moneyString(Math.max(1, Math.floor((window.ITEMS[item.id].value || 0) * .25)), true), x + 22, y + 48, 4, '#e0c070', 'center', 'top');
      }
    }
    this.button(ctx, 730, 450, 118, 28, 'CLOSE', 'shop:close', null, { flat: true, size: 5 });
  }
  /* ---------------------------------------------------------------- dialogue */
  drawDialogue(ctx) {
    const g = this.g, npc = g.activeNpc;
    if (!npc) return;
    ctx.fillStyle = 'rgba(5,6,10,.55)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 70, 256, 820, 236, null);
    this.P(ctx, 84, 272, 96, 96, '#171b28'); this.P(ctx, 84, 272, 96, 2, '#8e7d59');
    const img = window.ART.npc(npc.id, 0, 1);
    ctx.drawImage(img, 106, 284, 56, 84);
    TXT.draw(ctx, npc.name.toUpperCase(), 84, 374, 7, '#f0d690');
    TXT.draw(ctx, (npc.def.role || '').toUpperCase(), 84, 387, 4, '#a89f88');
    TXT.draw(ctx, (npc.def.needs || 'A roof, a door, and a friendly face.'), 84, 401, 4, '#8e8878', 'left', 'top');
    /* lines */
    const line = npc.def.lines ? npc.def.lines[Math.floor(g.time / 7) % npc.def.lines.length] : '...';
    TXT.paragraph(ctx, line, 204, 278, 640, 7, '#e8dfc8', 16);
    /* quest */
    if (g.quest && g.quest.active && npc.id === 'guide') {
      this.P(ctx, 204, 324, 440, 62, 'rgba(12,14,22,.75)'); this.P(ctx, 204, 324, 2, 62, '#c9a95a');
      TXT.draw(ctx, 'FAVOR: ' + g.quest.title.toUpperCase(), 212, 332, 4, '#e0c070');
      TXT.draw(ctx, g.quest.desc, 212, 345, 4, '#c8c0ac');
      TXT.draw(ctx, `${Math.min(g.quest.progress, g.quest.need)} / ${g.quest.need}`, 636, 345, 4, g.quest.progress >= g.quest.need ? '#a0e080' : '#d8b080', 'right', 'top');
      if (g.quest.progress >= g.quest.need) this.button(ctx, 204, 362, 110, 22, 'CLAIM', 'talk:quest', null, { green: true, size: 5 });
    }
    /* buttons */
    let bx = 204, by = 424;
    if (npc.def.shop) { this.button(ctx, bx, by, 110, 28, 'SHOP', 'talk:shop'); bx += 120; }
    if (npc.id === 'nurse') { this.button(ctx, bx, by, 110, 28, 'HEAL', 'talk:heal'); bx += 120; }
    if (npc.id === 'guide') { this.button(ctx, bx, by, 110, 28, 'QUEST', 'talk:quest'); bx += 120; }
    this.button(ctx, bx, by, 110, 28, 'BYE', 'talk:close', null, { flat: true });
    TXT.draw(ctx, 'F  CLOSE', 852, 450, 4, '#8e8878', 'right', 'top');
  }
  /* ---------------------------------------------------------------- map */
  drawMap(ctx) {
    const g = this.g;
    ctx.fillStyle = 'rgba(4,5,9,.86)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 60, 36, 840, 468, 'WORLD MAP', { titleRight: g.world.seedStr || '' });
    const x = 84, y = 68, w = 792, h = 380;
    this.P(ctx, x, y, w, h, '#070a10');
    if (g.mapCanvas) ctx.drawImage(g.mapCanvas, x, y, w, h);
    else if (g.minimapCanvas) ctx.drawImage(g.minimapCanvas, x, y, w, h);
    const p = g.player;
    const px = x + p.cx / (g.world.w * 16) * w, py = y + p.cy / (g.world.h * 16) * h;
    ctx.fillStyle = '#fff'; ctx.fillRect(px - 2, py - 2, 5, 5);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px - 8, py - 8, 17, 17);
    for (const n of g.npcs) { ctx.fillStyle = '#ffd76a'; ctx.fillRect(x + n.cx / (g.world.w * 16) * w - 2, y + n.feet / (g.world.h * 16) * h - 2, 4, 4); }
    for (const b of g.enemies) if (b.boss) { ctx.fillStyle = '#ff4a4a'; ctx.fillRect(x + b.cx / (g.world.w * 16) * w - 3, y + b.cy / (g.world.h * 16) * h - 3, 6, 6); }
    TXT.draw(ctx, 'WHITE: YOU   GOLD: RESIDENTS   RED: BOSS', 84, 456, 4, '#9e9682');
    this.button(ctx, 760, 456, 110, 28, 'CLOSE', 'map:close', null, { flat: true, size: 5 });
  }
  /* ---------------------------------------------------------------- pause/settings */
  drawPause(ctx) {
    const g = this.g;
    ctx.fillStyle = 'rgba(5,6,10,.68)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 300, 88, 360, 388, 'PAUSED');
    TXT.draw(ctx, (g.world.seedStr || 'WORLD').toUpperCase(), 480, 128, 6, '#d8c8a0', 'center', 'middle');
    TXT.draw(ctx, (window.TR ? TR.t(String(g.creation.difficulty || 'classic').toUpperCase()) : String(g.creation.difficulty || 'classic').toUpperCase()) + ' - ' + (window.TR ? TR.t(String(g.creation.mode || 'softcore').toUpperCase()) : String(g.creation.mode || 'softcore').toUpperCase()), 480, 142, 4, '#8e8878', 'center', 'top');
    this.button(ctx, 350, 168, 260, 32, 'RESUME', 'pause:resume');
    this.button(ctx, 350, 208, 260, 32, 'CONTROLS', 'pause:help');
    this.button(ctx, 350, 248, 260, 32, 'SAVE WORLD', 'pause:save');
    this.button(ctx, 350, 288, 260, 32, 'SETTINGS', 'pause:settings');
    this.button(ctx, 350, 328, 260, 32, 'SAVE & QUIT', 'pause:quit', null, { danger: true });
    const parts = U.formatMoney(g.player.wallet);
    TXT.draw(ctx, 'PLAYTIME ' + g.playTimeString(), 480, 388, 4, '#8e8878', 'center', 'top');
    TXT.draw(ctx, 'COINS ' + U.moneyString(g.player.wallet, true), 480, 400, 4, '#c8b080', 'center', 'top');
    this.P(ctx, 350, 420, 260, 1, '#4a4336');
    TXT.draw(ctx, 'ESC  RESUME', 480, 436, 4, '#9e9682', 'center', 'middle');
  }
  drawSettings(ctx) {
    const g = this.g;
    ctx.fillStyle = 'rgba(5,6,10,.72)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 250, 100, 460, 340, 'SETTINGS');
    const rows = [['MASTER VOLUME', g.settings.volume, 'settings:vol'], ['MUSIC', g.settings.music, 'settings:music'], ['SOUND EFFECTS', g.settings.sfx, 'settings:sfx']];
    rows.forEach((r, i) => {
      const y = 146 + i * 42;
      TXT.draw(ctx, r[0], 286, y, 6, '#d8c99f');
      this.bar(ctx, 286, y + 12, 280, 8, r[1], ['#c9a95a', '#6d88b8', '#7da36e'][i]);
      this.button(ctx, 576, y, 24, 22, '-', r[2], 'down', { flat: true });
      this.button(ctx, 606, y, 24, 22, '+', r[2], 'up', { flat: true });
    });
    TXT.draw(ctx, 'SHOW FPS', 286, 276, 5, '#c8c0ac');
    this.button(ctx, 576, 266, 100, 22, g.settings.showFps ? 'ON' : 'OFF', 'settings:fps', null, { flat: true, size: 5 });
    TXT.draw(ctx, 'MINIMAP', 286, 306, 5, '#c8c0ac');
    this.button(ctx, 576, 296, 100, 22, g.settings.minimap ? 'ON' : 'OFF', 'settings:minimap', null, { flat: true, size: 5 });
    TXT.draw(ctx, 'AUDIO ' + (AUDIO.state.muted ? 'MUTED' : 'ON'), 286, 336, 5, '#c8c0ac');
    this.button(ctx, 576, 326, 100, 22, AUDIO.state.muted ? 'UNMUTE' : 'MUTE', 'settings:mute', null, { flat: true, size: 5 });
    this.button(ctx, 390, 386, 180, 30, 'BACK', 'settings:back');
  }
  drawHelp(ctx) {
    ctx.fillStyle = 'rgba(5,6,10,.74)'; ctx.fillRect(0, 0, 960, 540);
    this.panel(ctx, 130, 60, 700, 420, 'CONTROLS');
    const lines = [
      ['MOVE', 'A / D  or  LEFT / RIGHT'], ['JUMP / SWIM', 'SPACE  or  W'], ['FALL THROUGH PLATFORM', 'S + SPACE'],
      ['DASH', 'SHIFT'], ['GRAPPLE', 'H'], ['USE / MINE / ATTACK', 'LEFT MOUSE'], ['PLACE / INTERACT', 'RIGHT MOUSE  or  F'],
      ['INVENTORY', 'E'], ['HEALTH POTION', 'R'], ['MAP', 'M'], ['DROP ITEM', 'Q'], ['PAUSE', 'ESC']
    ];
    lines.forEach((l, i) => {
      const y = 108 + i * 24;
      TXT.draw(ctx, l[0], 170, y, 6, '#d8c99f', 'left', 'middle');
      TXT.draw(ctx, l[1], 792, y, 6, '#aeb8c8', 'right', 'middle');
      this.P(ctx, 170, y + 11, 622, 1, 'rgba(150,140,110,.12)');
    });
    this.button(ctx, 390, 412, 180, 30, 'BACK', 'help:close');
  }
  drawDeath(ctx) {
    const g = this.g;
    ctx.fillStyle = 'rgba(30,4,8,.66)'; ctx.fillRect(0, 0, 960, 540);
    const grd = ctx.createRadialGradient(480, 260, 50, 480, 260, 500);
    grd.addColorStop(0, 'rgba(80,12,18,.25)'); grd.addColorStop(1, 'rgba(5,2,4,.5)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 960, 540);
    TXT.draw(ctx, g.creation.mode === 'hardcore' ? 'GAME OVER' : 'YOU WERE SLAIN', 480, 160, 28, '#e05050', 'center', 'middle');
    TXT.draw(ctx, g.deathCause || 'The world is a dangerous place.', 480, 200, 7, '#c8b0a0', 'center', 'middle');
    if (g.creation.mode === 'hardcore') {
      TXT.draw(ctx, 'HARDCORE CHARACTERS DO NOT RETURN.', 480, 232, 5, '#e08a8a', 'center', 'middle');
      this.button(ctx, 380, 280, 200, 34, 'ABANDON WORLD', 'death:new', null, { danger: true });
    } else {
      TXT.draw(ctx, 'Coins lost: ' + U.moneyString(g.deathLost || 0), 480, 232, 5, '#d0b070', 'center', 'middle');
      if (g.respawnTimer > 0) TXT.draw(ctx, 'RESPAWNING IN ' + Math.ceil(g.respawnTimer), 480, 270, 7, '#e8d8a0', 'center', 'middle');
      else this.button(ctx, 380, 280, 200, 34, 'RESPAWN', 'death:respawn', null, { green: true });
    }
    TXT.draw(ctx, 'A gravestone marks where you fell...', 480, 350, 4, '#8e7a78', 'center', 'middle');
  }
  /* --------------------------------------------------------------- tooltip */
  drawTooltip(ctx) {
    if (!this.p) return;
    const m = this.g.mouse, hov = this.hitAt(m.x, m.y);
    let item = null;
    if (hov && hov.item) item = hov.item;
    else if (hov && hov.action === 'craft:recipe' && hov.data) item = { id: hov.data.out, count: hov.data.count };
    else if (hov && hov.action === 'shop:buy' && hov.data) item = { id: hov.data.id, count: 1 };
    if (!item || !window.ITEMS[item.id]) {
      if (hov && hov.tip) this.drawTip(ctx, m.x, m.y, { name: hov.tip, desc: hov.desc || '' });
      return;
    }
    this.drawTip(ctx, m.x, m.y, item);
  }
  drawTip(ctx, mx, my, item) {
    const it = window.ITEMS[item.id];
    if (!it) return;
    const pad = 9, w = 218;
    const lines = [];
    lines.push({ text: window.ENT.prettyName(item.id), color: this.rarityColor(it), size: 6 });
    const typeName = { weapon: 'WEAPON', tool: 'TOOL', armor: 'ARMOR', accessory: 'ACCESSORY', potion: 'POTION', block: 'BLOCK', wall: 'WALL', ammo: 'AMMO', material: 'MATERIAL', summonItem: 'SUMMON', consumable: 'CONSUMABLE' }[it.type] || (it.type || '').toUpperCase();
    lines.push({ text: typeName + (it.cls ? ' - ' + it.cls.toUpperCase() : ''), color: '#9e9682', size: 4 });
    if (it.damage) lines.push({ text: it.damage + ' DAMAGE' + (it.crit ? '  ' + Math.round(it.crit) + '% CRIT' : ''), color: '#d8c8a8', size: 4 });
    if (it.defense) lines.push({ text: it.defense + ' DEFENSE', color: '#a8c8e8', size: 4 });
    if (it.pick) lines.push({ text: 'PICKAXE POWER ' + it.pick, color: '#c8b080', size: 4 });
    if (it.axe) lines.push({ text: 'AXE POWER ' + it.axe, color: '#c8b080', size: 4 });
    if (it.hammer) lines.push({ text: 'HAMMER POWER ' + it.hammer, color: '#c8b080', size: 4 });
    if (it.mana) lines.push({ text: it.mana + ' MANA', color: '#8098e0', size: 4 });
    if (it.heal) lines.push({ text: 'RESTORES ' + it.heal + ' LIFE', color: '#e09090', size: 4 });
    if (it.manaRestore) lines.push({ text: 'RESTORES ' + it.manaRestore + ' MANA', color: '#90a8e0', size: 4 });
    if (it.ammoType) lines.push({ text: (it.ammoType === 'arrow' ? 'ARROW' : 'BULLET') + ' AMMUNITION', color: '#b8b09a', size: 4 });
    if (it.buff) lines.push({ text: 'BUFF: ' + it.buff, color: '#b8d890', size: 4 });
    if (it.useTime) lines.push({ text: 'USE TIME ' + it.useTime.toFixed(2) + 's', color: '#8e8878', size: 4 });
    if (it.desc) for (const dl of TXT.wrap(ctx, window.TR ? TR.desc(it) : it.desc, w - pad * 2, 4)) lines.push({ text: dl, color: '#b8ae96', size: 4 });
    if (it.value) lines.push({ text: 'VALUE ' + U.moneyString(it.value), color: '#c8a850', size: 4 });
    if (item.count > 1) lines.push({ text: 'QUANTITY ' + item.count, color: '#c8c0ac', size: 4 });
    let h = pad * 2;
    for (const l of lines) h += TXT.px(l.size, l.text) + 3;
    let x = mx + 16, y = my + 12;
    if (x + w > 954) x = mx - w - 12;
    if (y + h > 534) y = 534 - h;
    this.P(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,.45)');
    this.P(ctx, x, y, w, h, 'rgba(12,14,23,.97)');
    this.P(ctx, x, y, w, 1, this.rarityColor(it)); this.P(ctx, x, y + h - 1, w, 1, '#423a2d');
    let yy = y + pad;
    for (const l of lines) {
      TXT.draw(ctx, l.text, x + pad, yy, l.size, l.color, 'left', 'top');
      yy += TXT.px(l.size, l.text) + 3;
    }
  }
  /* ------------------------------------------------------------------ master */
  draw(ctx) {
    this.hits = [];
    this.tip = null;
    const g = this.g, t = g.time;
    if (g.state === 'title') {
      if (this.titleScreen === 'controls') { this.drawSky(ctx, t); this.drawControls(ctx); }
      else if (this.titleScreen === 'options') { this.drawSky(ctx, t); this.drawOptions(ctx); }
      else this.drawTitle(ctx, t);
    } else if (g.state === 'create') this.drawCreate(ctx, t);
    else if (g.state === 'loading') this.drawLoading(ctx, t);
    else if (g.state === 'playing' || g.state === 'dead') {
      this.drawHUD(ctx);
      if (g.uiMode === 'inventory') this.drawInventory(ctx);
      else if (g.uiMode === 'chest') this.drawChest(ctx);
      else if (g.uiMode === 'shop') this.drawShop(ctx);
      else if (g.uiMode === 'dialogue') this.drawDialogue(ctx);
      else if (g.uiMode === 'map') this.drawMap(ctx);
      else if (g.uiMode === 'help') this.drawHelp(ctx);
      else if (g.uiMode === 'settings') this.drawSettings(ctx);
      if (g.paused && g.uiMode === null) this.drawPause(ctx);
      if (g.state === 'dead') this.drawDeath(ctx);
      this.drawTooltip(ctx);
    }
    if (g.settings.showFps) TXT.draw(ctx, Math.round(g.fps) + ' FPS  ' + g.entitiesCount + ' ENT', 12, 8, 4, '#8f8', 'left', 'top', false);
    if (g.cursor) this.drawDragged(ctx);
  }
}
window.GameUI = GameUI;

