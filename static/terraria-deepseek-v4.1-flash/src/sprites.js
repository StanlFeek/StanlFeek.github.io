'use strict';
/* ---------------------------------------------------------------------------------------------
   ART: every sprite in the game is painted pixel-by-pixel at runtime.  No image assets.
   Canvases are cached; callers draw them with imageSmoothingEnabled=false.
------------------------------------------------------------------------------------------------- */
const ART = (() => {
  const cache = new Map();
  const P = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const dot = (g, x, y, c) => P(g, x, y, 1, 1, c);
  function cv(w, h, draw, key) {
    if (key && cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    draw(g, c);
    if (key) cache.set(key, c);
    return c;
  }
  const shade = U.shade, mix = U.mix, rgba = U.rgba;
  const rngFor = (s) => { const r = U.mulberry32(U.hashStr(String(s))); return r; };
  function noiseFill(g, w, h, base, amt, rng, density = 0.35) {
    P(g, 0, 0, w, h, base);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = rng();
      if (v < density) dot(g, x, y, shade(base, (v * 2 - 1) * amt));
    }
  }
  function speck(g, w, h, colors, count, rng, size = 1) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * w), y = Math.floor(rng() * h);
      const c = colors[Math.floor(rng() * colors.length)];
      P(g, x, y, size, size, c);
      if (size > 1 && rng() > 0.5) dot(g, x + size - 1, y + size - 1, shade(c, -20));
    }
  }

  /* ------------------------------------------------------------------ tiles */
  function drawTileBase(g, id, mask) {
    const def = TILES[id] || { color: '#333', texture: 'noise' };
    const c = def.color, top = def.topColor || c;
    const rng = rngFor('tile' + id);
    const w = 16, h = 16;
    g.clearRect(0, 0, 16, 16);
    const tex = def.texture;
    if (tex === 'dirt') {
      noiseFill(g, 16, 16, c, 24, rng, 0.32);
      speck(g, 16, 16, [shade(c, -28), shade(c, 18), shade(c, -12)], 14, rng);
      for (let i = 0; i < 4; i++) { const x = Math.floor(rng() * 14), y = Math.floor(rng() * 14); P(g, x, y, 2, 1, shade(c, 22)); dot(g, x, y + 1, shade(c, -30)); }
    } else if (tex === 'grass') {
      noiseFill(g, 16, 16, mix(c, '#3f2c21', 0.45), 18, rng, 0.3);
      for (let x = 0; x < 16; x++) {
        const hh = 3 + Math.floor(rng() * 3);
        P(g, x, 0, 1, hh, top);
        if (rng() > 0.6) P(g, x, 0, 1, 1, shade(top, 25));
      }
      P(g, 0, 0, 16, 1, shade(top, 25));
      speck(g, 16, 16, [shade(top, -25), shade(top, 12)], 6, rng);
      for (let i = 0; i < 2; i++) { const x = Math.floor(rng() * 15), y = 4 + Math.floor(rng() * 8); P(g, x, y, 1, 3, shade(top, -18)); }
    } else if (tex === 'stone' || tex === 'obsidian' || tex === 'ash') {
      noiseFill(g, 16, 16, c, 17, rng, 0.4);
      speck(g, 16, 16, [shade(c, -22), shade(c, 16), shade(c, -8)], 16, rng);
      if (tex === 'stone') {
        const x = 2 + Math.floor(rng() * 4), y = 3 + Math.floor(rng() * 3);
        P(g, x, y, 1, 2, shade(c, -26)); P(g, x + 1, y + 2, 2, 1, shade(c, -26));
        P(g, x + 4, y + 4, 2, 1, shade(c, 20)); P(g, x + 8, y + 1, 1, 3, shade(c, -18));
      }
      if (tex === 'ash') speck(g, 16, 16, ['#a05b4b', '#c77a5b', '#473c3b'], 5, rng);
    } else if (tex === 'sand') {
      noiseFill(g, 16, 16, c, 15, rng, 0.35);
      for (let y = 2; y < 16; y += 4) for (let x = 0; x < 16; x++) if (rng() > 0.4) dot(g, x, Math.min(15, y + Math.round(Math.sin(x * 0.7))), shade(c, -16));
      speck(g, 16, 16, [shade(c, 16), shade(c, -12), '#efe3b8'], 8, rng);
    } else if (tex === 'snow') {
      noiseFill(g, 16, 16, c, 8, rng, 0.28);
      for (let i = 0; i < 12; i++) dot(g, Math.floor(rng() * 16), Math.floor(rng() * 16), '#ffffff');
      P(g, 0, 0, 16, 2, '#f7fcff');
      for (let x = 0; x < 16; x++) if (rng() > 0.6) dot(g, x, 2, shade(c, -18));
    } else if (tex === 'ice') {
      noiseFill(g, 16, 16, c, 10, rng, 0.25);
      P(g, 2, 2, 6, 1, '#eaf8ff'); P(g, 10, 5, 1, 6, '#dcf3ff'); P(g, 3, 11, 7, 1, '#7eb3c9');
      g.globalAlpha = 0.35; P(g, 0, 0, 16, 16, '#c9efff'); g.globalAlpha = 1;
    } else if (tex === 'wood') {
      noiseFill(g, 16, 16, c, 10, rng, 0.25);
      for (let x = 1; x < 16; x += 5) { P(g, x, 0, 1, 16, shade(c, -22)); P(g, x + 1, 0, 1, 16, shade(c, 12)); }
      for (let i = 0; i < 4; i++) { const y = Math.floor(rng() * 14); P(g, 2, y, 4 + Math.floor(rng() * 5), 1, shade(c, -13)); }
      P(g, 0, 0, 16, 1, shade(c, 18));
    } else if (tex === 'brick') {
      P(g, 0, 0, 16, 16, shade(c, -18));
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let col = -1; col < 3; col++) {
          const x = off + col * 8, y = row * 4;
          P(g, x + 1, y + 1, 7, 3, c);
          P(g, x + 1, y + 1, 7, 1, shade(c, 14));
          P(g, x + 2, y + 3, 5, 1, shade(c, -15));
        }
      }
      speck(g, 16, 16, [shade(c, 10), shade(c, -12)], 6, rng);
    } else if (tex === 'glass') {
      P(g, 0, 0, 16, 16, rgba(c, 0.8));
      P(g, 1, 1, 14, 1, '#d9f6ff'); P(g, 1, 1, 1, 14, '#c2e9f6');
      P(g, 3, 3, 6, 1, 'rgba(255,255,255,.8)'); P(g, 10, 10, 3, 1, 'rgba(255,255,255,.6)');
      P(g, 14, 2, 1, 12, '#8bbecd'); P(g, 2, 14, 12, 1, '#7fa9b6');
    } else if (tex === 'ore') {
      noiseFill(g, 16, 16, '#6a6670', 18, rng, 0.35);
      const gems = [c, shade(c, 30), shade(c, -35)];
      for (let i = 0; i < 8; i++) {
        const x = 1 + Math.floor(rng() * 11), y = 1 + Math.floor(rng() * 11);
        P(g, x, y, 3, 2, gems[0]); P(g, x, y, 2, 1, gems[1]); dot(g, x, y + 1, gems[2]);
      }
      if (def.glow) { g.globalAlpha = 0.3; P(g, 0, 0, 16, 16, c); g.globalAlpha = 1; }
    } else if (tex === 'honey') {
      noiseFill(g, 16, 16, c, 12, rng, 0.3);
      for (let y = 2; y < 16; y += 5) for (let x = 2; x < 16; x += 5) { P(g, x, y, 3, 3, shade(c, 20)); dot(g, x, y, '#ffe08a'); }
      P(g, 0, 0, 16, 1, '#f1cb64');
    } else if (tex === 'web') {
      g.clearRect(0, 0, 16, 16);
      g.strokeStyle = c; g.lineWidth = 1; g.globalAlpha = 0.8;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 16); g.moveTo(16, 0); g.lineTo(0, 16); g.moveTo(8, 0); g.lineTo(8, 16); g.moveTo(0, 8); g.lineTo(16, 8); g.stroke();
      g.globalAlpha = 1;
    } else if (tex === 'liquid') {
      g.clearRect(0, 0, 16, 16);
    } else if (tex === 'rope') {
      g.clearRect(0, 0, 16, 16);
      P(g, 7, 0, 2, 16, c); P(g, 6, 1, 1, 14, shade(c, -20));
      for (let y = 0; y < 16; y += 4) { P(g, 5, y, 6, 1, shade(c, 12)); P(g, 9, y + 2, 1, 2, shade(c, -35)); }
    } else if (tex === 'vine' || tex === 'spikes' || tex === 'trap' || tex === 'plate' || tex === 'door' || tex === 'doorOpen' || tex === 'altar' || tex === 'larva' || tex === 'sapling' || tex === 'cactus' || tex === 'coral' || tex === 'torch' || tex === 'mushroom' || tex === 'glowMushroom' || tex === 'lifeCrystal' || tex === 'campfire' || tex === 'chest' || tex === 'goldChest' || tex === 'pot' || tex === 'table' || tex === 'chair' || tex === 'workbench' || tex === 'furnace' || tex === 'anvil' || tex === 'loom' || tex === 'alchemy' || tex === 'bed' || tex === 'bookshelf' || tex === 'lantern' || tex === 'candle' || tex === 'flag' || tex === 'grave' || tex === 'barrel' || tex === 'hellforge' || tex === 'trophy') {
      g.clearRect(0, 0, 16, 16);
      drawFurniture(g, id, def, rng);
    } else {
      noiseFill(g, 16, 16, c, 16, rng, 0.35);
      speck(g, 16, 16, [shade(c, 14), shade(c, -16)], 6, rng);
    }
    /* edge treatment; mask bits: 1 north, 2 east, 4 south, 8 west */
    const edge = shade(c, -40), light = shade(c, 26);
    if (!(mask & 1)) { P(g, 0, 0, 16, 1, light); if (tex === 'grass' || tex === 'snow') P(g, 0, 0, 16, 1, '#ffffff'); }
    if (!(mask & 4)) P(g, 0, 15, 16, 1, edge);
    if (!(mask & 8)) { P(g, 0, 0, 1, 16, shade(c, -12)); }
    if (!(mask & 2)) { P(g, 15, 0, 1, 16, shade(c, -25)); }
    return c;
  }
  function drawFurniture(g, id, def, rng) {
    const c = def.color || '#9b6539', c2 = shade(c, -30), c3 = shade(c, 24);
    switch (id) {
      case TILE.TORCH: P(g, 7, 7, 2, 8, '#8a5b34'); P(g, 7, 6, 2, 2, '#c98b46'); P(g, 6, 3, 4, 3, '#ffb347'); P(g, 7, 1, 2, 4, '#ffe27a'); dot(g, 6, 2, '#ffedb0'); P(g, 6, 6, 4, 1, '#e07a2d'); break;
      case TILE.CAMPFIRE: P(g, 2, 10, 12, 2, '#6d4428'); P(g, 4, 12, 2, 4, '#57351f'); P(g, 10, 12, 2, 4, '#57351f'); P(g, 3, 9, 10, 2, '#8f5b31'); P(g, 5, 5, 6, 5, '#e0642c'); P(g, 6, 2, 4, 5, '#ffb347'); P(g, 7, 4, 2, 3, '#ffe89a'); break;
      case TILE.CANDLE: P(g, 6, 8, 4, 6, '#d8c59a'); P(g, 6, 8, 1, 6, '#f1e3bc'); P(g, 9, 8, 1, 6, '#b8a37c'); P(g, 7, 5, 2, 3, '#ffd166'); dot(g, 7, 4, '#fff3bd'); break;
      case TILE.LANTERN: P(g, 7, 0, 2, 5, '#6e6a73'); P(g, 4, 5, 8, 2, '#5a5661'); P(g, 4, 7, 8, 6, '#8f7c4d'); P(g, 5, 8, 6, 4, '#ffd982'); dot(g, 6, 9, '#fff6c2'); P(g, 3, 13, 10, 1, '#5a5661'); break;
      case TILE.TABLE: P(g, 3, 5, 10, 2, c3); P(g, 3, 7, 10, 1, c2); P(g, 4, 8, 2, 7, c); P(g, 10, 8, 2, 7, c); P(g, 6, 8, 1, 6, shade(c, -15)); break;
      case TILE.CHAIR: P(g, 4, 2, 2, 11, c); P(g, 10, 4, 2, 9, c); P(g, 4, 2, 8, 2, c3); P(g, 4, 7, 8, 2, c); P(g, 5, 13, 2, 2, c2); P(g, 10, 13, 2, 2, c2); P(g, 5, 9, 5, 1, shade(c, 15)); break;
      case TILE.WORKBENCH: P(g, 1, 5, 14, 3, c3); P(g, 1, 8, 14, 1, c2); P(g, 2, 9, 2, 6, c); P(g, 12, 9, 2, 6, c); P(g, 4, 9, 1, 6, shade(c, -15)); P(g, 9, 2, 3, 2, '#b9bec7'); P(g, 9, 4, 1, 3, '#8b5a35'); P(g, 11, 1, 1, 5, '#d6dbe3'); break;
      case TILE.FURNACE: P(g, 2, 4, 12, 11, '#6b6561'); P(g, 3, 3, 10, 2, '#817a74'); P(g, 5, 8, 6, 5, '#2b2420'); P(g, 6, 10, 4, 3, '#ff9f4c'); P(g, 7, 11, 2, 2, '#ffe08a'); P(g, 2, 6, 1, 9, '#4d4945'); P(g, 13, 6, 1, 9, '#4d4945'); P(g, 5, 1, 6, 1, '#a39b94'); break;
      case TILE.ANVIL: case TILE.ANVIL2: P(g, 2, 4, 12, 3, '#848a94'); P(g, 3, 3, 6, 1, '#a4aab4'); P(g, 6, 7, 4, 2, '#69707a'); P(g, 4, 9, 8, 2, '#5a6069'); P(g, 3, 11, 3, 3, '#6f757f'); P(g, 10, 11, 3, 3, '#6f757f'); P(g, 2, 5, 12, 1, '#b4bac4'); break;
      case TILE.CHEST: case TILE.GOLD_CHEST: {
        const gold = id === TILE.GOLD_CHEST;
        const cc = gold ? '#c8a33c' : '#9b6539', cc2 = shade(cc, -35), cc3 = shade(cc, 28);
        P(g, 2, 5, 12, 9, cc2); P(g, 3, 6, 10, 7, cc); P(g, 3, 9, 10, 1, cc3); P(g, 3, 6, 10, 2, cc3);
        P(g, 6, 9, 4, 3, gold ? '#e4ca68' : '#d7b15e'); P(g, 7, 10, 2, 2, cc2); P(g, 2, 5, 12, 1, cc2); P(g, 2, 13, 12, 1, cc2);
        dot(g, 4, 7, '#f4e1a0'); break;
      }
      case TILE.POT: P(g, 4, 6, 8, 7, c); P(g, 5, 5, 6, 1, c3); P(g, 3, 7, 1, 4, c2); P(g, 12, 7, 1, 4, c2); P(g, 5, 13, 6, 1, c2); P(g, 5, 7, 3, 1, c3); dot(g, 9, 9, shade(c, 30)); break;
      case TILE.ALTAR: P(g, 2, 4, 12, 3, '#5b313d'); P(g, 4, 7, 8, 3, '#4a2833'); P(g, 2, 10, 3, 4, '#3b2028'); P(g, 11, 10, 3, 4, '#3b2028'); P(g, 6, 1, 4, 4, '#8b3d55'); P(g, 7, 0, 2, 2, '#b85674'); dot(g, 5, 3, '#d47d94'); dot(g, 10, 2, '#d47d94'); break;
      case TILE.BED: P(g, 1, 6, 14, 3, c); P(g, 1, 9, 14, 4, shade(c, -12)); P(g, 1, 5, 4, 4, '#e5ddc8'); P(g, 2, 6, 2, 2, '#f6f1e2'); P(g, 1, 13, 2, 2, '#6b4a2e'); P(g, 13, 13, 2, 2, '#6b4a2e'); P(g, 1, 9, 14, 1, '#f2e6d0'); break;
      case TILE.LOOM: P(g, 3, 4, 10, 9, c); P(g, 4, 5, 8, 6, shade(c, -18)); for (let x = 5; x < 12; x += 2) P(g, x, 5, 1, 6, '#d8c8a0'); for (let y = 6; y < 11; y += 2) P(g, 4, y, 8, 1, '#b7a37a'); P(g, 2, 13, 12, 1, c2); break;
      case TILE.ALCHEMY_TABLE: P(g, 2, 6, 12, 2, '#5e4766'); P(g, 2, 8, 2, 6, '#493650'); P(g, 12, 8, 2, 6, '#493650'); P(g, 4, 3, 3, 3, '#69b07a'); P(g, 9, 2, 2, 4, '#9473c4'); P(g, 7, 4, 2, 2, '#d8a052'); dot(g, 5, 4, '#a5e0a8'); break;
      case TILE.BOOKSHELF: P(g, 1, 2, 14, 12, c); P(g, 2, 3, 12, 10, shade(c, -25)); for (let row = 0; row < 3; row++) { let x = 2; while (x < 13) { const w = 1 + Math.floor(rng() * 2), hh = 2 + Math.floor(rng() * 2); const col = ['#b34c4c', '#4c7bb3', '#5e9a56', '#c3a850', '#705a9e'][Math.floor(rng() * 5)]; P(g, x, 3 + row * 3 + 2 - hh, w, hh, col); x += w + 1; } } P(g, 1, 7, 14, 1, c3); P(g, 1, 11, 14, 1, c3); break;
      case TILE.DOOR_CLOSED: P(g, 3, 1, 10, 14, c); P(g, 4, 2, 8, 12, mix(c, '#e6c089', 0.25)); P(g, 4, 2, 1, 12, c2); P(g, 11, 2, 1, 12, c2); P(g, 7, 6, 2, 4, '#5d3b23'); P(g, 6, 10, 2, 2, '#d4ad62'); P(g, 4, 8, 8, 1, c2); break;
      case TILE.DOOR_OPEN: P(g, 1, 1, 3, 14, c2); P(g, 2, 2, 2, 12, mix(c, '#e6c089', .2)); P(g, 4, 2, 2, 12, c); P(g, 5, 3, 1, 10, shade(c, -25)); break;
      case TILE.BOOKSHELF: break;
      case TILE.SPIKE: for (let x = 1; x < 16; x += 3) { P(g, x, 8, 2, 7, '#9aa0ad'); P(g, x, 4, 1, 4, '#c4c9d4'); P(g, x + 1, 7, 1, 2, '#6a707d'); } P(g, 0, 14, 16, 2, '#5d626e'); break;
      case TILE.PRESSURE_PLATE: P(g, 2, 11, 12, 3, '#9d8a68'); P(g, 2, 11, 12, 1, '#c5b28e'); P(g, 4, 13, 8, 1, '#5e523d'); break;
      case TILE.DART_TRAP: P(g, 1, 6, 14, 7, '#6c6c73'); P(g, 2, 7, 12, 5, '#8a8a91'); P(g, 6, 8, 4, 2, '#2c2c30'); P(g, 2, 12, 12, 1, '#4f4f55'); break;
      case TILE.FLAG: P(g, 7, 0, 2, 15, '#6b4a2e'); P(g, 8, 1, 6, 7, c); P(g, 9, 2, 5, 1, shade(c, 24)); P(g, 9, 7, 5, 1, shade(c, -20)); break;
      case TILE.GRAVE: P(g, 3, 5, 10, 10, '#7d7a82'); P(g, 4, 3, 8, 3, '#918e96'); P(g, 5, 4, 6, 1, '#a5a2aa'); P(g, 6, 8, 1, 4, '#5d5a62'); P(g, 7, 6, 2, 2, '#5d5a62'); P(g, 3, 14, 10, 1, '#4b484f'); break;
      case TILE.BARREL: P(g, 3, 3, 10, 11, c); P(g, 4, 3, 8, 1, c3); P(g, 4, 13, 8, 1, c2); P(g, 3, 6, 10, 1, '#5b5a5e'); P(g, 3, 10, 10, 1, '#5b5a5e'); P(g, 5, 5, 1, 8, shade(c, 16)); break;
      case TILE.BOSS_TROPHY: P(g, 1, 12, 14, 2, '#59452f'); P(g, 3, 2, 10, 2, '#7b5a35'); P(g, 4, 4, 8, 1, '#a17a45'); P(g, 5, 5, 1, 7, c); P(g, 10, 5, 1, 7, c); P(g, 5, 9, 6, 2, c); P(g, 9, 8, 2, 3, c); P(g, 6, 5, 2, 1, shade(c, 30)); break;
      case TILE.LIFE_CRYSTAL: P(g, 6, 3, 4, 10, '#e8688c'); P(g, 5, 5, 6, 6, '#e8688c'); P(g, 6, 4, 2, 8, '#ffb3ca'); P(g, 9, 6, 1, 4, '#a8365b'); P(g, 4, 14, 8, 1, '#7e3550'); dot(g, 7, 6, '#fff0f5'); break;
      case TILE.MUSHROOM: P(g, 6, 8, 4, 6, '#e8ddc7'); P(g, 3, 5, 10, 4, '#cf6d65'); P(g, 4, 4, 8, 2, '#e58c84'); P(g, 5, 5, 2, 1, '#f8d8d2'); P(g, 9, 6, 2, 1, '#f8d8d2'); break;
      case TILE.GLOW_MUSHROOM: P(g, 6, 8, 4, 6, '#b2e9f4'); P(g, 3, 5, 10, 4, '#54c9e8'); P(g, 4, 4, 8, 2, '#91e5f5'); P(g, 5, 5, 2, 1, '#e6feff'); P(g, 9, 6, 2, 1, '#e6feff'); break;
      case TILE.SAPLING: P(g, 7, 6, 2, 9, '#6b4b2a'); P(g, 5, 6, 2, 1, '#79b64f'); P(g, 9, 7, 2, 1, '#79b64f'); P(g, 6, 4, 4, 3, '#5f9c3e'); P(g, 7, 3, 2, 2, '#86c95c'); break;
      case TILE.CACTUS: P(g, 6, 1, 4, 15, c); P(g, 7, 1, 2, 15, shade(c, 17)); for (let y = 3; y < 14; y += 4) { P(g, 5, y, 1, 2, '#c5d98a'); P(g, 10, y + 1, 1, 2, '#c5d98a'); } P(g, 3, 5, 3, 2, c); P(g, 3, 4, 1, 2, c); P(g, 10, 8, 3, 2, c); break;
      case TILE.CORAL: P(g, 7, 5, 2, 10, '#c46270'); P(g, 5, 7, 2, 4, '#dd7d85'); P(g, 9, 6, 2, 5, '#e79199'); P(g, 4, 5, 2, 2, '#f0aeb3'); P(g, 10, 3, 2, 3, '#f0aeb3'); P(g, 7, 3, 2, 2, '#f8c7c9'); break;
      case TILE.VINE: P(g, 7, 0, 2, 16, c); P(g, 6, 0, 1, 16, shade(c, -18)); for (let y = 2; y < 16; y += 5) { P(g, 9, y, 3, 1, c); P(g, 12, y + 1, 1, 1, shade(c, 18)); } break;
      case TILE.LARVA: P(g, 5, 7, 6, 5, c); P(g, 6, 6, 4, 1, shade(c, 20)); P(g, 10, 8, 1, 1, '#5b431a'); P(g, 4, 9, 1, 2, shade(c, -18)); break;
      case TILE.HELLFORGE: P(g, 2, 4, 12, 11, '#5f3d34'); P(g, 3, 5, 10, 2, '#8e5b43'); P(g, 5, 8, 6, 5, '#2b1c19'); P(g, 6, 10, 4, 3, '#ff7a35'); P(g, 7, 11, 2, 2, '#ffd166'); P(g, 3, 6, 1, 8, '#c4633f'); P(g, 12, 6, 1, 8, '#c4633f'); break;
      default: noiseFill(g, 16, 16, c, 15, rng, 0.3);
    }
  }
  function tile(id, mask = 15) {
    mask &= 15;
    return cv(16, 16, g => drawTileBase(g, id, mask), 't' + id + '_' + mask);
  }
  function wall(id) {
    const def = WALLS[id] || { color: '#222', texture: 'noise' };
    const c = def.color;
    return cv(16, 16, g => {
      const rng = rngFor('wall' + id);
      g.clearRect(0, 0, 16, 16);
      if (def.texture === 'brick') {
        P(g, 0, 0, 16, 16, shade(c, -12));
        for (let row = 0; row < 4; row++) { const off = row % 2 ? 4 : 0; for (let col = -1; col < 3; col++) { P(g, off + col * 8 + 1, row * 4 + 1, 7, 3, c); } }
      } else if (def.texture === 'wood') {
        P(g, 0, 0, 16, 16, c);
        for (let x = 2; x < 16; x += 6) P(g, x, 0, 1, 16, shade(c, -18));
        for (let i = 0; i < 5; i++) P(g, Math.floor(rng() * 12), Math.floor(rng() * 14), 3, 1, shade(c, 10));
      } else if (def.texture === 'cave') {
        P(g, 0, 0, 16, 16, c);
        for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) if (rng() > .5) P(g, x, y, 1, 1, shade(c, 10));
      } else {
        noiseFill(g, 16, 16, c, 12, rng, 0.3);
        speck(g, 16, 16, [shade(c, -14), shade(c, 8)], 5, rng);
      }
      P(g, 0, 0, 16, 1, rgba('#000000', .18)); P(g, 0, 0, 1, 16, rgba('#000000', .14));
    }, 'w' + id);
  }
  function liquid(kind, variant) {
    return cv(16, 16, g => {
      if (kind === 'water') { P(g, 0, 0, 16, 16, 'rgba(34,118,182,.76)'); P(g, 0, 1, 16, 1, 'rgba(165,232,255,.55)'); P(g, 0, 0, 16, 15, 'rgba(8,38,74,.10)'); }
      else { P(g, 0, 0, 16, 16, 'rgba(196,66,20,.74)'); P(g, 0, 1, 16, 2, 'rgba(255,172,64,.55)'); P(g, 3, 4, 2, 1, '#ffd166'); }
      for (let i = 0; i < 4; i++) dot(g, (variant * 3 + i * 5) % 16, (i * 4 + variant) % 16, kind === 'water' ? 'rgba(180,240,255,.3)' : 'rgba(255,220,120,.35)');
    }, 'l' + kind + variant);
  }

  /* ------------------------------------------------------------------ item icons */
  const itemCache = new Map();
  function icon(id) {
    if (itemCache.has(id)) return itemCache.get(id);
    const it = ITEMS[id];
    const c = cv(18, 18, g => drawIcon(g, it || { art: 'misc', color: '#bbb' }, id), null);
    itemCache.set(id, c); return c;
  }
  function drawIcon(g, it, id) {
    g.clearRect(0, 0, 18, 18);
    const c = it.color || '#bbb', c2 = it.color2 || shade(c, -38), hi = shade(c, 36), lo = shade(c, -28);
    const outline = 'rgba(8,7,14,.9)';
    function shape(points, col) { g.fillStyle = col; for (const [x, y] of points) dot(g, x, y, col); }
    function hline(x1, x2, y, col) { P(g, x1, y, x2 - x1 + 1, 1, col); }
    function vline(x, y1, y2, col) { P(g, x, y1, 1, y2 - y1 + 1, col); }
    let art = it.art || 'misc';
    if (it.equip === 'chest') art = 'chestplate';
    if (it.equip === 'helmet') art = 'helmet';
    if (it.equip === 'greaves') art = 'greaves';
    if (it.cls === 'summon') art = 'summon';
    const group = {
      sword: 1, bow: 1, gun: 1, staff: 1, summon: 1, pick: 1, axe: 1, hamaxe: 1, hammer: 1,
      arrow: 1, bullet: 1, shuriken: 1, bomb: 1, dynamite: 1, potion: 1, bottle: 1, herb: 1,
      bar: 1, gem: 1, ore: 1, block: 1, brick: 1, wall: 1, platform: 1, platformStone: 1,
      helmet: 1, chestplate: 1, greaves: 1, accessory: 1, trophy: 1, coin: 1, key: 1,
      chest: 1, workbench: 1, furnace: 1, anvil: 1, hellforge: 1, loom: 1, alchemy: 1,
      table: 1, chair: 1, bed: 1, door: 1, bookshelf: 1, torch: 1, campfire: 1, candle: 1,
      lantern: 1, rope: 1, plant: 1, mushroom: 1, seed: 1, flower: 1, gel: 1, silk: 1,
      web: 1, bone: 1, chunk: 1, scale: 1, stinger: 1, vine: 1, spore: 1, star: 1,
      lens: 1, feather: 1, dust: 1, soul: 1, bottle: 1, chain: 1, mirror: 1, bag: 1,
      crown: 1, summonEye: 1, bossSummon: 1, doll: 1, lifeCrystal: 1, manaCrystal: 1,
      cloud: 1, gemBlock: 1, wood: 1, spike: 1, plate: 1, trap: 1, flag: 1, grave: 1, barrel: 1
    };
    if (art === 'sword') {
      P(g, 12, 2, 3, 3, hi); P(g, 10, 4, 2, 4, c); P(g, 8, 6, 2, 4, c); P(g, 6, 8, 2, 3, shade(c, -8));
      P(g, 4, 10, 3, 2, c2); P(g, 3, 12, 2, 2, '#7b5433'); P(g, 2, 13, 2, 2, '#9b7243');
      P(g, 11, 3, 1, 2, '#fff'); P(g, 6, 9, 1, 1, hi);
      dot(g, 2, 15, '#d7b46b'); dot(g, 3, 14, '#b8934c');
    } else if (art === 'bow') {
      g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(8, 9, 7, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#e5ddc4'; g.lineWidth = 1; g.beginPath(); g.moveTo(11, 2); g.lineTo(11, 16); g.stroke();
      P(g, 10, 8, 8, 1, '#b99a61'); P(g, 16, 7, 2, 2, '#e5ddc4'); P(g, 16, 9, 2, 2, '#e5ddc4');
    } else if (art === 'gun') {
      P(g, 2, 8, 12, 4, c); P(g, 2, 8, 12, 1, hi); P(g, 12, 9, 5, 2, '#4b4f58');
      P(g, 3, 12, 4, 4, '#6b4829'); P(g, 5, 11, 2, 2, shade(c, -35)); P(g, 9, 7, 2, 1, c2);
      P(g, 6, 10, 1, 1, '#d8d8d8'); P(g, 2, 11, 5, 1, c2);
    } else if (art === 'staff' || art === 'summon') {
      P(g, 3, 3, 2, 13, '#8a6039'); P(g, 4, 4, 1, 11, '#b5895c'); P(g, 6, 2, 2, 2, c2);
      const orb = art === 'summon' ? c2 : c;
      P(g, 6, 1, 6, 8, orb); P(g, 7, 2, 5, 6, orb); P(g, 8, 2, 2, 2, hi); P(g, 7, 6, 1, 1, lo);
      P(g, 12, 3, 1, 4, hi); P(g, 10, 4, 1, 1, '#fff');
      if (art === 'summon') { dot(g, 5, 2, hi); dot(g, 13, 2, hi); }
    } else if (art === 'pick') {
      P(g, 2, 14, 4, 2, '#6b4a2b'); P(g, 5, 11, 2, 4, c2); P(g, 6, 8, 2, 4, c2);
      P(g, 4, 3, 3, 6, c); P(g, 7, 2, 4, 2, c); P(g, 11, 2, 4, 3, c); P(g, 14, 5, 3, 4, c);
      P(g, 5, 4, 2, 1, hi); P(g, 8, 3, 3, 1, hi); P(g, 13, 4, 1, 2, hi);
      P(g, 7, 6, 1, 2, c2);
    } else if (art === 'axe' || art === 'hamaxe') {
      P(g, 5, 5, 2, 12, '#7a5432'); P(g, 6, 5, 1, 11, '#a77b4e');
      P(g, 7, 2, 6, 6, c); P(g, 8, 3, 4, 4, hi); P(g, 12, 5, 3, 5, c2); P(g, 7, 8, 5, 1, c2); P(g, 6, 4, 1, 3, c2);
      if (art === 'hamaxe') { P(g, 3, 3, 4, 5, c); P(g, 3, 4, 3, 2, hi); }
    } else if (art === 'hammer') {
      P(g, 3, 14, 4, 2, '#7a5432'); P(g, 5, 8, 2, 7, '#9a6c3d'); P(g, 7, 3, 8, 7, c); P(g, 8, 4, 6, 2, hi); P(g, 9, 7, 5, 2, c2); P(g, 7, 4, 1, 5, c2);
    } else if (art === 'arrow') {
      P(g, 3, 14, 10, 1, '#9b7445'); P(g, 12, 11, 2, 4, '#c7c9d0'); P(g, 13, 10, 1, 2, '#eef1f8'); P(g, 3, 12, 2, 2, c); P(g, 2, 14, 2, 1, c2); P(g, 4, 10, 1, 2, c2);
    } else if (art === 'bullet') {
      P(g, 6, 4, 5, 9, c); P(g, 7, 3, 3, 2, hi); P(g, 7, 5, 2, 4, hi); P(g, 7, 12, 3, 2, '#7c5f3f'); P(g, 5, 6, 1, 5, c2);
    } else if (art === 'shuriken') {
      shape([[9,1],[11,6],[16,9],[11,11],[9,16],[7,11],[2,9],[7,6]], c); shape([[9,4],[11,7],[14,9],[10,9],[9,13],[8,9],[5,8],[8,7]], hi); dot(g, 9, 9, '#fff');
    } else if (art === 'bomb' || art === 'dynamite') {
      if (art === 'bomb') { P(g, 4, 7, 10, 8, '#3d4048'); P(g, 5, 6, 8, 10, '#555a63'); P(g, 7, 7, 2, 2, '#7a808b'); P(g, 10, 4, 2, 2, '#b78b50'); P(g, 12, 2, 2, 2, '#ffb347'); dot(g, 14, 1, '#fff2a8'); }
      else { P(g, 5, 2, 8, 14, '#c13c32'); P(g, 5, 5, 8, 2, '#e1c46c'); P(g, 5, 10, 8, 2, '#e1c46c'); for (let x = 5; x < 13; x += 2) vline(x, 2, 15, '#a02e27'); P(g, 8, 0, 1, 3, '#5b4b38'); }
    } else if (art === 'potion' || art === 'bottle') {
      P(g, 6, 1, 6, 2, '#c9c3b4'); P(g, 7, 3, 4, 3, '#a9d4de'); P(g, 4, 7, 10, 9, '#6c8a95'); P(g, 5, 8, 8, 7, c); P(g, 6, 9, 3, 3, hi); P(g, 12, 12, 1, 2, lo); P(g, 4, 6, 10, 2, '#a9d4de'); dot(g, 7, 5, '#ffffff'); if (art === 'bottle') { P(g, 6, 1, 6, 2, '#8a6039'); }
    } else if (art === 'herb' || art === 'seed' || art === 'flower' || art === 'plant') {
      P(g, 8, 8, 2, 8, '#4f7f39'); P(g, 4, 9, 4, 2, c); P(g, 5, 7, 4, 2, c); P(g, 10, 6, 4, 3, c);
      P(g, 7, 4, 4, 4, c); P(g, 8, 3, 2, 2, hi); dot(g, 6, 8, hi); dot(g, 12, 7, hi);
      if (art === 'flower') { P(g, 5, 1, 8, 7, c); P(g, 7, 3, 4, 3, '#7b4a2e'); P(g, 6, 2, 2, 2, hi); P(g, 11, 2, 2, 2, hi); }
    } else if (art === 'bar') {
      P(g, 2, 9, 14, 5, c2); P(g, 2, 8, 13, 2, c); P(g, 3, 7, 10, 2, hi); P(g, 4, 8, 8, 1, hi); P(g, 12, 10, 3, 2, lo); P(g, 2, 13, 14, 2, shade(c, -35)); dot(g, 5, 9, '#fff8d8');
    } else if (art === 'gem' || art === 'lifeCrystal' || art === 'manaCrystal') {
      const gemC = art === 'lifeCrystal' ? '#e8688c' : art === 'manaCrystal' ? '#5b8fe8' : c;
      shape([[9,1],[14,5],[15,11],[10,16],[6,16],[1,10],[3,4]], shade(gemC, -20));
      shape([[9,3],[12,6],[13,10],[9,14],[6,13],[3,9],[5,5]], gemC);
      P(g, 6, 5, 3, 3, hi); dot(g, 10, 6, '#fff'); P(g, 10, 11, 2, 2, lo);
    } else if (art === 'ore') {
      P(g, 4, 5, 8, 9, '#68646e'); P(g, 5, 4, 6, 2, '#7d7884'); P(g, 6, 7, 2, 2, c); P(g, 9, 8, 3, 2, c); P(g, 7, 10, 2, 2, c); P(g, 5, 11, 2, 1, c); P(g, 7, 7, 1, 1, hi); P(g, 10, 8, 1, 1, hi); dot(g, 5, 8, lo); dot(g, 11, 11, lo);
    } else if (art === 'block' || art === 'brick' || art === 'wall' || art === 'wood' || art === 'cloud' || art === 'gemBlock') {
      P(g, 2, 3, 14, 12, shade(c, -22)); P(g, 3, 4, 12, 10, c);
      for (let y = 5; y < 13; y += 3) P(g, 3, y, 12, 1, shade(c, 12));
      for (let x = 5; x < 15; x += 4) P(g, x, 4, 1, 10, shade(c, -14));
      if (art === 'brick') { P(g, 3, 7, 12, 1, shade(c, -28)); P(g, 9, 4, 1, 3, shade(c, -28)); P(g, 5, 10, 1, 3, shade(c, -28)); P(g, 3, 13, 12, 1, '#cfc9d2'); }
      if (art === 'wood') { for (let y = 5; y < 13; y += 2) P(g, 4, y, 10, 1, shade(c, -12)); }
      if (art === 'gemBlock') { P(g, 6, 6, 3, 3, '#d8f4ff'); P(g, 10, 9, 2, 2, '#b0e4ee'); }
      P(g, 2, 2, 14, 2, hi); P(g, 2, 3, 2, 11, hi); P(g, 14, 5, 2, 9, lo);
    } else if (art === 'platform' || art === 'platformStone') {
      P(g, 1, 7, 16, 4, c2); P(g, 2, 6, 14, 2, c); P(g, 3, 5, 12, 1, hi); P(g, 2, 9, 14, 2, shade(c, -28)); for (let x = 3; x < 16; x += 4) dot(g, x, 8, c2);
    } else if (art === 'helmet') {
      P(g, 3, 6, 12, 9, c2); P(g, 4, 4, 10, 8, c); P(g, 5, 3, 8, 3, c); P(g, 5, 4, 6, 2, hi); P(g, 10, 7, 3, 4, lo); P(g, 6, 9, 2, 2, '#1b202b'); P(g, 11, 9, 2, 2, '#1b202b'); P(g, 8, 12, 2, 3, '#1b202b');
      if (it.color2) { P(g, 5, 2, 8, 2, it.color2); dot(g, 9, 1, it.color2); }
    } else if (art === 'chestplate' || art === 'chest') {
      if (it.equip === 'chest') {
        P(g, 3, 3, 12, 12, c2); P(g, 4, 4, 10, 10, c); P(g, 4, 4, 4, 3, hi); P(g, 6, 10, 6, 3, lo); P(g, 2, 3, 3, 4, c); P(g, 13, 3, 3, 4, c); P(g, 7, 2, 4, 2, c2); P(g, 8, 7, 2, 4, it.color2 || hi);
      } else {
        P(g, 2, 5, 14, 9, c2); P(g, 3, 6, 12, 8, c); P(g, 3, 6, 5, 2, hi); P(g, 3, 9, 12, 1, '#d7b15e'); P(g, 7, 9, 4, 3, '#e6c874'); P(g, 8, 10, 2, 2, c2); P(g, 2, 13, 14, 2, c2);
      }
    } else if (art === 'greaves') {
      P(g, 5, 3, 8, 7, c); P(g, 5, 3, 3, 2, hi); P(g, 5, 9, 3, 6, c2); P(g, 10, 9, 3, 6, c2); P(g, 5, 14, 4, 2, shade(c, -20)); P(g, 10, 14, 4, 2, shade(c, -20));
    } else if (art === 'accessory') {
      P(g, 5, 5, 8, 8, c2); P(g, 6, 6, 6, 6, c); P(g, 7, 7, 3, 3, hi); P(g, 10, 10, 1, 1, '#fff');
      if (it.wings || /boot/i.test(it.name)) { P(g, 2, 11, 3, 3, c); P(g, 13, 11, 3, 3, c); P(g, 3, 13, 3, 2, c2); P(g, 12, 13, 3, 2, c2); }
      if (/horseshoe/i.test(it.name)) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(9, 9, 6, 3.5, 6.0); g.stroke(); }
    } else if (art === 'trophy') {
      P(g, 3, 13, 12, 2, '#5d4029'); P(g, 4, 4, 10, 2, '#8a6338'); P(g, 5, 6, 1, 7, c); P(g, 12, 6, 1, 7, c); P(g, 5, 11, 8, 2, c); P(g, 9, 9, 3, 3, c); P(g, 6, 5, 2, 1, hi);
    } else if (art === 'coin') {
      P(g, 4, 4, 10, 10, c2); P(g, 5, 3, 8, 12, c); P(g, 6, 4, 6, 10, c); P(g, 7, 5, 3, 2, hi); P(g, 10, 10, 2, 2, lo); P(g, 8, 7, 2, 4, shade(c, -18));
    } else if (art === 'key') {
      P(g, 2, 4, 6, 6, c2); P(g, 3, 5, 4, 4, c); P(g, 4, 6, 2, 2, '#2a2520'); P(g, 8, 8, 2, 2, c); P(g, 10, 10, 2, 2, c); P(g, 12, 12, 2, 2, c); P(g, 13, 10, 1, 2, c2); P(g, 11, 13, 2, 1, c2);
    } else if (art === 'torch' || art === 'candle' || art === 'lantern' || art === 'campfire') {
      if (art === 'lantern') { P(g, 8, 0, 2, 6, '#777'); P(g, 4, 6, 10, 2, '#555'); P(g, 4, 8, 10, 8, '#8a7548'); P(g, 6, 9, 6, 5, '#ffd982'); P(g, 7, 10, 3, 3, '#fff1b0'); }
      else { P(g, 8, 7, 2, 9, '#8a5b34'); P(g, 6, 11, 6, 1, '#b07a43'); P(g, 6, 4, 6, 4, c); P(g, 7, 2, 4, 4, hi); P(g, 8, 3, 2, 2, '#fff5c0'); }
    } else if (art === 'rope' || art === 'chain') {
      for (let y = 1; y < 16; y += 3) { P(g, 7, y, 4, 2, c); P(g, 8, y + 1, 2, 1, c2); }
    } else if (art === 'chest' && !it.equip) {
      P(g, 2, 5, 14, 10, c2); P(g, 3, 6, 12, 8, c); P(g, 3, 9, 12, 1, hi); P(g, 7, 9, 4, 3, '#e6c874'); P(g, 8, 10, 2, 2, c2); P(g, 2, 5, 14, 1, shade(c, -20));
    } else if (['workbench', 'furnace', 'anvil', 'hellforge', 'loom', 'alchemy', 'table', 'chair', 'bed', 'door', 'bookshelf', 'mirror'].includes(art)) {
      const tmap = { workbench: TILE.WORKBENCH, furnace: TILE.FURNACE, anvil: TILE.ANVIL, hellforge: TILE.HELLFORGE, loom: TILE.LOOM, alchemy: TILE.ALCHEMY_TABLE, table: TILE.TABLE, chair: TILE.CHAIR, bed: TILE.BED, door: TILE.DOOR_CLOSED, bookshelf: TILE.BOOKSHELF };
      if (art === 'mirror') { P(g, 3, 2, 12, 14, c2); P(g, 4, 3, 10, 12, c); P(g, 5, 4, 8, 10, '#b9e5f2'); P(g, 6, 5, 4, 3, '#f2ffff'); P(g, 7, 12, 4, 1, '#6b9dab'); }
      else { const cc = drawFurniture(g, tmap[art], { color: c }, rngFor('icon' + id)); }
    } else if (art === 'plant' || art === 'cactus' || art === 'coral') {
      P(g, 8, 4, 2, 12, c); P(g, 5, 6, 3, 2, c); P(g, 10, 8, 3, 2, c); P(g, 6, 3, 2, 4, c); P(g, 9, 5, 2, 3, c); P(g, 7, 2, 2, 2, hi);
    } else if (art === 'mushroom') {
      P(g, 7, 9, 4, 7, '#e8ddc7'); P(g, 4, 5, 10, 5, c); P(g, 5, 4, 8, 2, hi); P(g, 6, 6, 2, 2, '#fff'); P(g, 10, 7, 2, 1, '#fff'); P(g, 7, 12, 1, 2, '#c8b89e');
    } else if (['gel', 'silk', 'web', 'bone', 'chunk', 'scale', 'stinger', 'vine', 'spore', 'star', 'lens', 'feather', 'dust', 'soul', 'seed', 'bag', 'doll', 'crown', 'summonEye', 'bossSummon'].includes(art)) {
      drawOdd(g, art, it, c, c2, hi, lo, shade);
    } else if (['chest', 'barrel', 'flag', 'grave', 'plate', 'trap', 'spike', 'lifeCrystal', 'manaCrystal'].includes(art)) {
      drawOdd(g, art, it, c, c2, hi, lo, shade);
    } else {
      P(g, 3, 3, 12, 12, c2); P(g, 4, 4, 10, 10, c); P(g, 5, 5, 6, 4, hi); P(g, 9, 9, 4, 3, lo); dot(g, 11, 5, '#fff');
    }
  }
  function drawOdd(g, art, it, c, c2, hi, lo, shade) {
    const shape = (points, col) => { g.fillStyle = col; for (const [x, y] of points) dot(g, x, y, col); };
    switch (art) {
      case 'gel': P(g, 4, 6, 10, 8, 'rgba(101,193,199,.7)'); P(g, 5, 5, 8, 8, c); P(g, 6, 6, 3, 2, hi); P(g, 5, 12, 8, 1, lo); break;
      case 'silk': for (let i = 0; i < 3; i++) { P(g, 3, 5 + i * 3, 12, 2, c); P(g, 4, 4 + i * 3, 10, 1, hi); } break;
      case 'web': g.strokeStyle = c; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(3, 3 + i * 4); g.lineTo(15, 3 + i * 4); g.stroke(); } for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(3 + i * 4, 2); g.lineTo(3 + i * 4, 16); g.stroke(); } break;
      case 'bone': P(g, 4, 8, 10, 3, c); P(g, 3, 6, 3, 3, c); P(g, 3, 10, 3, 3, c); P(g, 12, 6, 3, 3, c); P(g, 12, 10, 3, 3, c); P(g, 5, 8, 7, 1, hi); break;
      case 'chunk': P(g, 3, 6, 12, 8, c2); P(g, 4, 5, 10, 9, c); P(g, 5, 6, 4, 3, hi); P(g, 9, 10, 4, 2, lo); dot(g, 7, 11, shade(c, -20)); break;
      case 'scale': P(g, 4, 4, 10, 11, c2); P(g, 5, 5, 8, 8, c); P(g, 6, 6, 4, 3, hi); P(g, 11, 10, 2, 2, lo); P(g, 6, 14, 6, 1, c2); break;
      case 'stinger': P(g, 8, 2, 3, 12, c); P(g, 9, 3, 1, 10, hi); P(g, 8, 13, 3, 3, c2); dot(g, 10, 1, '#f5f0d0'); break;
      case 'vine': P(g, 2, 4, 12, 2, c); P(g, 4, 6, 8, 2, c); P(g, 6, 8, 5, 2, c); P(g, 8, 10, 4, 2, c2); P(g, 3, 4, 5, 1, hi); break;
      case 'spore': P(g, 5, 5, 8, 8, c2); P(g, 6, 6, 6, 6, c); P(g, 7, 7, 2, 2, hi); dot(g, 11, 10, '#fff'); P(g, 2, 9, 3, 1, c); P(g, 13, 6, 3, 1, c); break;
      case 'star': shape([[9,1],[11,6],[16,8],[12,11],[13,16],[9,13],[5,16],[6,11],[2,8],[7,6]], c); P(g, 7, 5, 3, 3, '#fffbe0'); break;
      case 'lens': P(g, 4, 4, 10, 10, c2); P(g, 5, 5, 8, 8, c); P(g, 6, 6, 3, 3, hi); P(g, 10, 9, 2, 2, lo); dot(g, 7, 7, '#fff'); break;
      case 'feather': P(g, 5, 4, 3, 10, c); P(g, 7, 3, 4, 9, c2); P(g, 10, 4, 3, 6, c); P(g, 4, 13, 10, 1, hi); for (let i = 0; i < 4; i++) P(g, 6, 5 + i * 2, 6, 1, hi); break;
      case 'dust': for (let i = 0; i < 11; i++) { const x = 3 + (i * 7) % 12, y = 4 + (i * 5) % 11; dot(g, x, y, i % 2 ? c : hi); } P(g, 7, 8, 4, 3, c); dot(g, 8, 9, '#fff'); break;
      case 'soul': P(g, 5, 4, 8, 10, c2); P(g, 6, 5, 6, 8, c); P(g, 7, 6, 3, 5, hi); P(g, 5, 3, 3, 3, hi); P(g, 10, 3, 3, 3, hi); dot(g, 8, 10, '#fff'); break;
      case 'seed': P(g, 4, 8, 3, 2, c2); P(g, 7, 5, 3, 2, c); P(g, 10, 9, 3, 2, c); P(g, 6, 12, 3, 2, c2); dot(g, 5, 8, hi); dot(g, 8, 5, hi); break;
      case 'bag': P(g, 3, 5, 12, 11, c2); P(g, 4, 6, 10, 9, c); P(g, 6, 3, 6, 3, c2); P(g, 7, 9, 4, 2, hi); P(g, 5, 12, 8, 1, lo); break;
      case 'doll': P(g, 6, 2, 6, 5, c); P(g, 3, 7, 12, 3, c2); P(g, 5, 10, 2, 5, c); P(g, 11, 10, 2, 5, c); P(g, 7, 4, 1, 1, '#e04a4a'); P(g, 10, 4, 1, 1, '#e04a4a'); P(g, 8, 5, 2, 1, '#5a3a2a'); P(g, 8, 8, 2, 1, '#c23b3b'); break;
      case 'crown': P(g, 3, 9, 12, 5, c); P(g, 3, 4, 3, 6, c); P(g, 8, 2, 3, 8, c); P(g, 13, 4, 2, 6, c); P(g, 4, 10, 10, 2, hi); P(g, 6, 7, 2, 2, it.color2 || '#e04a4a'); dot(g, 9, 5, '#fff'); break;
      case 'summonEye': P(g, 3, 5, 12, 9, '#d8d2c7'); P(g, 4, 4, 10, 11, c); P(g, 6, 6, 6, 7, '#d65d6d'); P(g, 7, 7, 4, 5, '#6f2b38'); P(g, 8, 8, 2, 3, '#1a0e12'); dot(g, 8, 8, '#fff'); for (let i = 0; i < 4; i++) P(g, 3, 5 + i * 2, 1, 1, '#8c3535'); break;
      case 'bossSummon': P(g, 4, 4, 10, 10, c2); P(g, 5, 5, 8, 8, c); P(g, 6, 6, 3, 3, hi); P(g, 10, 10, 2, 2, lo); P(g, 8, 3, 2, 2, '#d8c07a'); dot(g, 8, 8, '#fff'); break;
      case 'chest': P(g, 2, 5, 14, 10, c2); P(g, 3, 6, 12, 8, c); P(g, 3, 9, 12, 1, hi); P(g, 7, 9, 4, 3, '#e6c874'); P(g, 8, 10, 2, 2, c2); break;
      case 'barrel': P(g, 4, 4, 10, 11, c); P(g, 5, 5, 2, 9, hi); P(g, 4, 7, 10, 1, '#555'); P(g, 4, 11, 10, 1, '#555'); P(g, 5, 13, 8, 1, lo); break;
      case 'flag': P(g, 7, 1, 2, 15, '#6b4a2e'); P(g, 9, 2, 6, 7, c); P(g, 10, 3, 4, 1, hi); P(g, 10, 7, 4, 1, lo); break;
      case 'grave': P(g, 3, 5, 10, 10, '#7d7a82'); P(g, 4, 3, 8, 3, '#918e96'); P(g, 6, 7, 1, 4, '#5d5a62'); P(g, 8, 6, 2, 2, '#5d5a62'); break;
      case 'plate': P(g, 2, 10, 12, 3, '#9d8a68'); P(g, 3, 9, 10, 1, '#c5b28e'); P(g, 4, 12, 8, 1, '#5e523d'); break;
      case 'trap': P(g, 1, 6, 14, 7, '#6c6c73'); P(g, 3, 8, 3, 3, '#2c2c30'); P(g, 10, 8, 3, 3, '#2c2c30'); P(g, 2, 5, 12, 1, '#8a8a91'); break;
      case 'spike': for (let x = 2; x < 16; x += 4) { P(g, x, 7, 2, 8, '#9aa0ad'); P(g, x, 4, 1, 3, '#c4c9d4'); } P(g, 1, 14, 14, 2, '#5d626e'); break;
      case 'lifeCrystal': P(g, 5, 3, 6, 11, c); P(g, 4, 5, 2, 6, c); P(g, 10, 5, 2, 6, c); P(g, 6, 4, 2, 8, hi); dot(g, 7, 5, '#fff'); P(g, 5, 12, 6, 1, lo); break;
      case 'manaCrystal': P(g, 5, 3, 6, 11, c); P(g, 4, 5, 2, 6, c); P(g, 10, 5, 2, 6, c); P(g, 6, 4, 2, 8, hi); dot(g, 8, 7, '#fff'); P(g, 5, 12, 6, 1, lo); break;
      default: P(g, 3, 3, 12, 12, c2); P(g, 4, 4, 10, 10, c); P(g, 5, 5, 6, 4, hi);
    }
  }

  /* ------------------------------------------------------------------ humanoids */
  function humanoid(g, x, y, s, o) {
    /* s = pixel scale, origin top-left of a ~28x40 body. o: skin, shirt, pants, hair, eye, gear, pose, dir */
    const d = o.dir < 0 ? -1 : 1;
    const pose = o.pose || 'idle';
    const S = o.skin || '#e3b58a', SH = o.shirt || '#5f87b5', PA = o.pants || '#3f4b63', HA = o.hair || '#5a3a25';
    const armF = o.armF || 0, leg = o.leg || 0;
    const X = v => d > 0 ? x + v : x + 28 - v;
    function pp(px, py, w, h, c) { P(g, d > 0 ? x + px : x + 28 - px - w, y + py, w, h, c); }
    /* legs */
    if (pose === 'dead') {
      pp(5, 30, 7, 5, PA); pp(16, 30, 7, 5, PA); pp(5, 35, 7, 3, '#2c3447'); pp(16, 35, 7, 3, '#2c3447');
    } else {
      const swing = pose === 'walk' ? Math.round(Math.sin(leg) * 3) : 0;
      pp(6, 27, 6, 9 + (pose === 'jump' ? -2 : 0), PA); pp(16, 27, 6, 9 + (pose === 'jump' ? -2 : 0), shade(PA, -12));
      pp(5, 36 + swing, 8, 4, o.boots || '#3a2d25'); pp(16, 36 - swing, 8, 4, o.boots || '#3a2d25');
      pp(6, 28, 3, 5, shade(PA, 16)); pp(17, 28, 3, 5, shade(PA, 8));
    }
    /* torso */
    pp(7, 17, 14, 11, SH); pp(7, 17, 14, 2, shade(SH, 22)); pp(8, 20, 5, 6, shade(SH, -15)); pp(16, 18, 3, 8, shade(SH, -8));
    if (o.armor) { pp(6, 17, 16, 3, o.armor); pp(8, 22, 4, 4, o.armor); }
    /* arms */
    const armY = 19;
    if (pose === 'swing') {
      pp(19, 17, 5, 8, S); pp(20, 23, 4, 4, S); pp(15, 18, 4, 7, SH); pp(18, 16, 7, 4, o.armor || SH);
    } else if (pose === 'mine') {
      pp(19, 17, 4, 7, SH); pp(21, 22, 5, 4, S); pp(17, 15, 7, 4, o.armor || SH);
    } else {
      pp(4, armY, 4, 8, SH); pp(4, armY + 7, 4, 4, S); pp(21, armY, 4, 8, SH); pp(21, armY + 7, 4, 4, S);
      pp(4, armY, 4, 2, shade(SH, 18)); pp(21, armY, 4, 2, shade(SH, 18));
    }
    /* head */
    pp(7, 4, 14, 14, S); pp(7, 4, 14, 5, HA); pp(6, 7, 2, 7, HA); pp(20, 7, 2, 6, HA);
    pp(8, 5, 10, 3, shade(HA, 18)); pp(9, 4, 6, 2, shade(HA, 8));
    pp(7, 12, 14, 2, o.scarf || shade(SH, -30));
    /* face */
    pp(10, 12, 2, 2, '#2c2430'); pp(16, 12, 2, 2, '#2c2430');
    pp(11, 7, 1, 1, '#f2d3b6'); pp(7, 15, 3, 1, shade(S, -18));
    pp(15, 17, 3, 2, shade(S, -12));
    /* eyes glow */
    if (o.eye) { pp(10, 12, 2, 2, o.eye); pp(16, 12, 2, 2, o.eye); }
    /* helmet */
    if (o.helmet) {
      pp(6, 2, 16, 7, o.helmet); pp(7, 1, 14, 3, shade(o.helmet, 22)); pp(6, 8, 3, 5, o.helmet); pp(19, 8, 3, 5, o.helmet);
      if (o.visor) { pp(9, 9, 10, 2, o.visor); pp(9, 11, 3, 4, shade(S, -8)); }
      if (o.plume) { pp(12, -2, 4, 5, o.plume); pp(10, -1, 8, 2, shade(o.plume, 20)); }
    }
    /* gear outlines */
    if (o.cape) { pp(3, 15, 5, 14, o.cape); pp(2, 20, 3, 10, shade(o.cape, -18)); }
    /* held tool/weapon drawn by caller */
  }
  function player(state, frame, dir, gear) {
    const key = 'p_' + state + '_' + frame + '_' + dir + '_' + (gear ? gear.key : '');
    return cv(28, 42, g => {
      g.clearRect(0, 0, 28, 42);
      const pose = state === 'walk' ? 'walk' : state === 'jump' ? 'jump' : state === 'fall' ? 'jump' : state === 'swing' ? 'swing' : state === 'mine' ? 'mine' : state === 'dead' ? 'dead' : 'idle';
      const gset = gear || {};
      humanoid(g, 0, 1, 1, {
        skin: gset.skin || '#e6b98d', shirt: gset.shirt || '#5d7fbb', pants: gset.pants || '#37435a',
        hair: gset.hair || '#5c3a26', boots: gset.boots || '#3a2d25',
        helmet: gset.helmet, armor: gset.chest, cape: gset.cape, eye: gset.eye,
        pose, leg: frame
      });
      if (state === 'walk') { }
      if (state === 'dead') { P(g, 3, 37, 23, 2, 'rgba(130,20,20,.5)'); }
    }, key);
  }
  function npc(id, frame, dir) {
    const n = NPCS[id] || { color: '#c9a37e' };
    const key = 'n_' + id + '_' + frame + '_' + dir;
    return cv(28, 42, g => {
      g.clearRect(0, 0, 28, 42);
      const base = { guide: ['#d7ad82', '#5b7d4e', '#3d4d3c', '#4b3423'], merchant: ['#d4a57b', '#5b6e91', '#3e4558', '#7d5e3a'], nurse: ['#e3b995', '#d7d3e0', '#7c8aa0', '#d8c7a8'], demolitionist: ['#c8946b', '#7d5a42', '#3e3430', '#3a2b22'], armsDealer: ['#d6a37a', '#6e6a56', '#403c32', '#2f2a22'], dryad: ['#cfd8a9', '#5c8b4e', '#466b3b', '#94c46a'] }[id] || ['#d7ad82', '#8d6b9d', '#40374a', '#4a3524'];
      const pose = frame > 0 ? 'walk' : 'idle';
      humanoid(g, 0, 1, 1, {
        skin: base[0], shirt: n.shirt || base[1], pants: base[2], hair: n.hair || base[3],
        pose: id === 'guide' ? 'idle' : pose, leg: frame, helmet: id === 'nurse' ? '#f1edf2' : null,
        armor: null, eye: null
      });
      if (id === 'guide') { P(g, 20, 25, 3, 11, '#b08c55'); dot(g, 20, 24, '#e5d191'); }
      if (id === 'merchant') { P(g, 3, 20, 4, 7, '#8b6c45'); P(g, 2, 19, 6, 2, '#c6a45c'); }
      if (id === 'nurse') { P(g, 12, 2, 4, 2, '#ffffff'); P(g, 13, 1, 2, 4, '#e04a4a'); P(g, 5, 16, 18, 2, '#eee'); }
      if (id === 'dryad') { P(g, 3, 5, 2, 12, '#68a34e'); P(g, 22, 4, 2, 13, '#68a34e'); P(g, 2, 2, 4, 2, '#9fce62'); P(g, 21, 1, 4, 2, '#9fce62'); }
      if (id === 'demolitionist') { P(g, 4, 3, 20, 3, '#4b3b2f'); P(g, 6, 1, 16, 3, '#5a4638'); P(g, 4, 6, 20, 2, '#3a2d24'); }
      if (id === 'armsDealer') { P(g, 4, 2, 20, 3, '#4e4433'); P(g, 6, 0, 16, 3, '#60523d'); P(g, 19, 23, 5, 9, '#5c6470'); }
    }, key);
  }

  /* ------------------------------------------------------------------ enemies */
  function enemy(type, frame, state) {
    const e = ENEMIES[type] || ENEMIES.greenSlime || { w: 20, h: 20, sprite: 'slime', color: '#8c8' };
    const W = Math.max(16, Math.ceil((e.w || 20) * 1.5)) + 12, H = Math.max(14, Math.ceil((e.h || 20) * 1.5)) + 10;
    const key = 'e_' + type + '_' + frame + '_' + (state || '');
    return cv(W, H, g => {
      g.clearRect(0, 0, W, H);
      const c = e.color, c2 = shade(c, -32), hi = shade(c, 25), lo = shade(c, -16);
      const cx = W / 2, by = H - 4;
      const spr = e.sprite || e.ai;
      const t = frame;
      if (spr === 'slime') {
        const bob = Math.round(Math.sin(t * 0.5) * 2);
        const w = W - 8, h = H - 12;
        P(g, cx - w / 2, by - h + bob, w, h, c); P(g, cx - w / 2 + 2, by - h + bob - 2, w - 4, 4, c);
        P(g, cx - w / 2 + 2, by - h + 3 + bob, w - 4, 3, hi); P(g, cx - w / 2 + 2, by - 4, w - 4, 2, lo);
        P(g, cx - 5, by - h / 2 + bob, 2, 3, '#1a1520'); P(g, cx + 3, by - h / 2 + bob, 2, 3, '#1a1520');
        P(g, cx - 4, by - h / 2 + 5 + bob, 3, 1, '#2a1220'); P(g, cx + 1, by - h / 2 + 5 + bob, 3, 1, '#2a1220');
        P(g, cx - w / 2 + 3, by - h + 6 + bob, 3, 3, 'rgba(255,255,255,.5)');
      } else if (spr === 'zombie' || spr === 'skeleton' || spr === 'goblin' || spr === 'mummy' || spr === 'unicorn' || spr === 'flinx' || spr === 'caster' || spr === 'face') {
        const skin = spr === 'skeleton' ? '#d9d2b8' : c, shirt = c2;
        const walk = Math.sin(t * .5) * 2;
        const legS = Math.round(walk);
        P(g, cx - 6, by - 20, 5, 14, shirt); P(g, cx + 1, by - 20, 5, 14, shade(shirt, -10));
        P(g, cx - 7, by - 6 + legS, 6, 6, shade(shirt, -22)); P(g, cx + 1, by - 6 - legS, 6, 6, shade(shirt, -22));
        P(g, cx - 8, by - 34, 16, 15, skin); P(g, cx - 8, by - 34, 16, 3, hi);
        P(g, cx - 5, by - 29, 3, 3, '#16121b'); P(g, cx + 3, by - 29, 3, 3, '#16121b');
        P(g, cx - 3, by - 23, 7, 2, '#341c24'); P(g, cx - 4, by - 22, 2, 1, '#f0e6d4');
        P(g, cx - 12, by - 31, 5, 12, shade(shirt, -14)); P(g, cx + 8, by - 31, 5, 12, shade(shirt, -14));
        if (spr === 'goblin') { P(g, cx - 9, by - 36, 18, 4, '#6b7d49'); P(g, cx - 9, by - 38, 4, 3, '#6b7d49'); P(g, cx + 6, by - 38, 4, 3, '#6b7d49'); P(g, cx + 8, by - 22, 4, 10, '#8c7b62'); }
        if (spr === 'skeleton') { P(g, cx - 8, by - 35, 16, 3, '#e7e0c8'); for (let x = -7; x < 8; x += 4) P(g, cx + x, by - 26, 1, 6, '#b8b096'); }
        if (spr === 'mummy') { for (let y = 0; y < 15; y += 3) P(g, cx - 8, by - 34 + y, 16, 1, '#e1d6b4'); }
        if (spr === 'unicorn') { P(g, cx - 8, by - 33, 17, 14, c); P(g, cx + 6, by - 41, 4, 8, c); P(g, cx + 6, by - 41, 2, 2, '#f5e58a'); P(g, cx + 8, by - 45, 2, 5, '#e8d8a0'); P(g, cx - 6, by - 12, 4, 10, shade(c, -15)); P(g, cx + 4, by - 12, 4, 10, shade(c, -15)); P(g, cx - 9, by - 30, 3, 12, '#d8c8e8'); }
        if (spr === 'flinx') { P(g, cx - 3, by - 26, 6, 5, '#f4f4fa'); dot(g, cx - 2, by - 25, '#1a1a24'); dot(g, cx + 2, by - 25, '#1a1a24'); P(g, cx - 10, by - 17, 6, 2, '#f4f4fa'); P(g, cx - 12, by - 19, 4, 2, hi); }
        if (spr === 'caster') { P(g, cx + 7, by - 36, 4, 4, '#b494e8'); P(g, cx + 8, by - 32, 2, 20, '#66517d'); P(g, cx - 9, by - 19, 18, 11, '#4c3f62'); P(g, cx - 9, by - 35, 18, 4, '#77608f'); }
      } else if (spr === 'eye' || spr === 'eater' || spr === 'crimera' || spr === 'drippler' || spr === 'pixie' || spr === 'meteorHead') {
        const flap = Math.sin(t * .8) * 3;
        if (spr !== 'meteorHead' && spr !== 'pixie') {
          P(g, cx - 13, by - 19 - flap, 5, 8, c2); P(g, cx + 8, by - 19 + flap, 5, 8, c2);
          P(g, cx - 16, by - 16 - flap, 4, 5, shade(c2, -15)); P(g, cx + 12, by - 16 + flap, 4, 5, shade(c2, -15));
        }
        P(g, cx - 9, by - 24, 18, 16, c); P(g, cx - 8, by - 26, 16, 4, c); P(g, cx - 7, by - 20, 6, 4, hi);
        P(g, cx - 4, by - 19, 6, 6, '#f2e8d8'); P(g, cx - 2, by - 18, 3, 4, '#8f3d4b'); P(g, cx - 1, by - 17, 1, 2, '#161018');
        if (spr === 'eater' || spr === 'crimera') { for (let i = 0; i < 4; i++) { P(g, cx - 9 + i * 5, by - 10, 2, 4, c2); P(g, cx - 9 + i * 5, by - 6, 1, 2, c2); } }
        if (spr === 'pixie') { P(g, cx - 13, by - 20, 6, 3, 'rgba(255,210,250,.6)'); P(g, cx + 7, by - 20, 6, 3, 'rgba(255,210,250,.6)'); }
        if (spr === 'meteorHead') { P(g, cx - 7, by - 25, 14, 4, '#c4553d'); for (let i = 0; i < 3; i++) P(g, cx - 6 + i * 4, by - 12, 2, 4, '#ff9a45'); }
      } else if (spr === 'bat') {
        const flap = Math.sin(t * 1.1) * 4;
        P(g, cx - 15, by - 22 - flap, 9, 4, c2); P(g, cx + 6, by - 22 + flap, 9, 4, c2);
        P(g, cx - 18, by - 20 - flap, 4, 5, c); P(g, cx + 14, by - 20 + flap, 4, 5, c);
        P(g, cx - 7, by - 25, 14, 12, c); P(g, cx - 6, by - 28, 4, 5, c); P(g, cx + 2, by - 28, 4, 5, c);
        P(g, cx - 4, by - 21, 2, 2, '#f0d86a'); P(g, cx + 2, by - 21, 2, 2, '#f0d86a'); P(g, cx - 1, by - 17, 2, 2, '#f0e8d8');
      } else if (spr === 'worm' || spr === 'boneserpent') {
        for (let i = 2; i >= 0; i--) {
          const xx = cx - 6 + Math.sin(t * .6 + i) * 4, yy = by - 18 + i * 5;
          P(g, xx, yy, 12, 7, i === 0 ? c : shade(c, -8 * i)); P(g, xx + 2, yy + 1, 3, 2, hi);
          if (i === 0) { P(g, xx + 2, yy + 2, 2, 2, '#1a1420'); P(g, xx + 8, yy + 2, 2, 2, '#1a1420'); P(g, xx + 4, yy + 6, 4, 1, '#5a2030'); }
        }
      } else if (spr === 'antlion') {
        P(g, cx - 11, by - 14, 22, 10, c); P(g, cx - 8, by - 19, 16, 7, c); P(g, cx - 8, by - 20, 16, 2, hi);
        for (let i = 0; i < 3; i++) { P(g, cx - 14 + i * 14, by - 9, 6, 2, c2); P(g, cx - 10 + i * 7, by - 4, 2, 4, c2); }
        P(g, cx - 6, by - 17, 3, 3, '#2a2028'); P(g, cx + 3, by - 17, 3, 3, '#2a2028'); P(g, cx - 3, by - 12, 6, 2, '#3a2a2e');
      } else if (spr === 'vulture') {
        const flap = Math.sin(t * .5) * 5;
        P(g, cx - 16, by - 23 - flap, 12, 5, c2); P(g, cx + 4, by - 23 + flap, 12, 5, c2);
        P(g, cx - 8, by - 24, 16, 10, c); P(g, cx + 3, by - 30, 8, 8, '#8a6b52'); P(g, cx + 10, by - 27, 4, 2, '#e0c05a');
        P(g, cx + 5, by - 27, 2, 2, '#f0e8d0'); P(g, cx - 6, by - 15, 3, 5, c2); P(g, cx + 3, by - 15, 3, 5, c2);
      } else if (spr === 'hornet') {
        const flap = Math.sin(t * 1.5) * 3;
        P(g, cx - 4, by - 22 - flap, 10, 5, 'rgba(230,240,255,.55)'); P(g, cx + 6, by - 20 + flap, 9, 4, 'rgba(230,240,255,.4)');
        P(g, cx - 10, by - 20, 17, 10, c); for (let i = 0; i < 3; i++) P(g, cx - 8 + i * 4, by - 19, 2, 8, '#3e3220');
        P(g, cx + 6, by - 18, 5, 6, c2); P(g, cx + 10, by - 15, 5, 2, '#4a3a24'); P(g, cx - 2, by - 23, 3, 3, '#1a1420');
      } else if (spr === 'maneater') {
        const sway = Math.sin(t * .5) * 2;
        P(g, cx - 2, by - 8, 5, 10, '#567d36'); P(g, cx - 5 + sway, by - 30, 12, 24, c);
        P(g, cx - 8 + sway, by - 27, 6, 4, c); P(g, cx + 4 + sway, by - 24, 7, 4, c);
        P(g, cx - 3 + sway, by - 18, 8, 5, '#3e2029'); for (let i = 0; i < 3; i++) { P(g, cx - 4 + i * 3 + sway, by - 18, 1, 2, '#f2ead8'); P(g, cx - 4 + i * 3 + sway, by - 14, 1, 2, '#f2ead8'); }
        P(g, cx - 9 + sway, by - 13, 5, 4, c2); P(g, cx + 4 + sway, by - 10, 5, 4, c2);
      } else if (spr === 'imp' || spr === 'demon') {
        const flap = Math.sin(t * .7) * 3;
        P(g, cx - 17, by - 27 - flap, 9, 12, c2); P(g, cx + 8, by - 27 + flap, 9, 12, c2);
        P(g, cx - 7, by - 30, 14, 17, c); P(g, cx - 7, by - 30, 14, 3, hi);
        P(g, cx - 5, by - 43, 10, 14, c); P(g, cx - 9, by - 47, 5, 4, c2); P(g, cx + 4, by - 47, 5, 4, c2);
        P(g, cx - 4, by - 38, 3, 3, spr === 'demon' ? '#ffd34e' : '#f4e05a'); P(g, cx + 2, by - 38, 3, 3, spr === 'demon' ? '#ffd34e' : '#f4e05a');
        P(g, cx - 3, by - 30, 6, 2, '#4a2020'); P(g, cx - 11, by - 24, 4, 9, c2); P(g, cx + 8, by - 24, 4, 9, c2);
        if (spr === 'imp') { P(g, cx + 9, by - 22, 3, 12, '#5b3a2a'); P(g, cx + 10, by - 24, 2, 3, '#ff9f45'); }
      } else if (spr === 'larva') {
        P(g, cx - 4, by - 8, 8, 6, c); P(g, cx - 3, by - 10, 6, 3, hi); dot(g, cx + 2, by - 7, '#4b3a1d'); P(g, cx - 5, by - 5, 2, 2, c2);
      } else {
        P(g, cx - 10, by - 24, 20, 20, c); P(g, cx - 8, by - 26, 16, 4, hi); P(g, cx - 4, by - 18, 2, 2, '#161018'); P(g, cx + 3, by - 18, 2, 2, '#161018');
      }
      /* health tint */
      if (state === 'hurt') { g.globalCompositeOperation = 'source-atop'; P(g, 0, 0, W, H, 'rgba(255,70,70,.55)'); g.globalCompositeOperation = 'source-over'; }
    }, key);
  }

  /* ------------------------------------------------------------------ bosses */
  function boss(type, phase, frame, state) {
    const b = BOSSES[type] || BOSSES.kingSlime;
    let pad = 40;
    if (type === 'eyeOfCthulhu' || type === 'skeletron') pad = 132;
    else if (type === 'queenBee') pad = 86;
    else if (type === 'eaterOfWorlds' || type === 'brainOfCthulhu') pad = 56;
    const w = Math.ceil(b.w * 1.25) + pad, h = Math.ceil(b.h * 1.2) + pad;
    return cv(w, h, g => {
      g.clearRect(0, 0, w, h);
      const cx = w / 2, by = h - 10, c = b.color, c2 = b.color2 || shade(c, -30), hi = shade(c, 28), lo = shade(c, -25);
      const t = frame;
      if (type === 'kingSlime') {
        const bob = Math.sin(t * .4) * 4;
        const bw = w - 26, bh = h - 42, top = by - bh + bob;
        const rows = [.46, .64, .76, .85, .93, .99, 1.03, 1.05, 1.05, 1.04, 1.01, .98, .95, .92, .89, .85, .78, .68];
        const rh = bh / rows.length;
        for (let i = 0; i < rows.length; i++) {
          const rw = bw * rows[i], x = cx - rw / 2, y = top + i * rh;
          P(g, x, y, rw, rh + 1, i < 3 ? hi : i > 13 ? lo : c);
          P(g, x + 5, y, rw * .28, rh + 1, 'rgba(255,255,255,' + (.10 - i * .004) + ')');
          P(g, x + rw * .70, y, rw * .30, rh + 1, 'rgba(18,20,48,.14)');
        }
        /* gel bubbles and highlights */
        const bubbles = [[.26, .30, .09], [.63, .24, .06], [.78, .52, .08], [.20, .62, .06], [.48, .45, .11], [.64, .72, .05], [.36, .80, .07], [.84, .80, .04]];
        for (const [bx, byy, br] of bubbles) {
          P(g, cx - bw / 2 + bw * bx, top + bh * byy, bw * br, bh * br * .65, 'rgba(190,230,255,.18)');
          P(g, cx - bw / 2 + bw * bx + 2, top + bh * byy + 2, bw * br * .45, bh * br * .25, 'rgba(255,255,255,.22)');
        }
        /* drips under the body */
        for (let i = 0; i < 4; i++) P(g, cx - bw * .32 + i * bw * .2, by - 9, 9, 5 + (i % 2) * 4, c);
        /* eyes: angled, glossy, with dark pupils */
        const ey = top + bh * .38;
        P(g, cx - 31, ey - 5, 27, 28, '#eaf7ff'); P(g, cx + 6, ey - 5, 27, 28, '#eaf7ff');
        P(g, cx - 27, ey - 1, 19, 20, '#1c1930'); P(g, cx + 10, ey - 1, 19, 20, '#1c1930');
        P(g, cx - 22, ey + 2, 6, 6, '#fff6ff'); P(g, cx + 15, ey + 2, 6, 6, '#fff6ff');
        P(g, cx - 31, ey - 9, 26, 6, shade(c, -42)); P(g, cx + 7, ey - 9, 26, 6, shade(c, -42));
        if (phase >= 2) { P(g, cx - 30, ey - 11, 27, 5, '#4a1628'); P(g, cx + 5, ey - 11, 27, 5, '#4a1628'); }
        /* mouth and chin */
        P(g, cx - 17, top + bh * .63, 34, 8, '#2a1824');
        P(g, cx - 13, top + bh * .63 + 2, 26, 3, '#d474a4');
        P(g, cx - 19, top + bh * .66, 6, 5, '#eaf7ff'); P(g, cx + 13, top + bh * .66, 6, 5, '#eaf7ff');
        /* royal crown, three points and jewels */
        const cw = 58, cy = top - 25;
        P(g, cx - cw / 2, cy, cw, 24, c2); P(g, cx - cw / 2 + 2, cy + 18, cw - 4, 6, shade(c2, -22));
        P(g, cx - cw / 2 + 2, cy - 15, 13, 20, c2); P(g, cx - 6, cy - 23, 12, 27, c2); P(g, cx + cw / 2 - 15, cy - 15, 13, 20, c2);
        P(g, cx - cw / 2 + 3, cy - 12, 5, 9, hi); P(g, cx - 1, cy - 20, 4, 9, hi); P(g, cx + cw / 2 - 11, cy - 12, 5, 9, hi);
        P(g, cx - cw / 2 + 5, cy + 4, cw - 10, 4, hi);
        dot(g, cx - 14, cy + 9, '#ff7fa5'); dot(g, cx, cy + 9, '#7fe0ff'); dot(g, cx + 14, cy + 9, '#ff7fa5');
        if (phase >= 2) { g.globalCompositeOperation = 'source-atop'; P(g, 0, 0, w, h, 'rgba(255,80,90,.10)'); g.globalCompositeOperation = 'source-over'; }
      } else if (type === 'eyeOfCthulhu') {
        const bob = Math.sin(t * .5) * 5;
        const r = Math.min(w, h) * .39;
        const eyeY = by - h * .48 + bob;
        const ellipse = (ex, ey, rx, ry, col) => {
          for (let yy = -ry; yy <= ry; yy++) {
            const ww = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
            P(g, ex - ww, ey + yy, ww * 2, 1, col);
          }
        };
        /* fleshy tendrils behind the eye */
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + .18;
          const len = r * (.42 + .18 * Math.sin(i * 2.3 + t * .35));
          for (let j = 0; j < 6; j++) {
            const d0 = r * .78 + j * len / 6, d1 = len / 6 + 1;
            P(g, cx + Math.cos(a) * d0 - 2, eyeY + Math.sin(a) * d0 - 2, 5 - j * .55, d1 + 1, j < 2 ? '#7e3545' : (i % 2 ? '#9c4c5b' : '#b76872'));
          }
        }
        /* bruised sclera with veins */
        ellipse(cx, eyeY, r * 1.04, r * .94, '#5c2a35');
        ellipse(cx, eyeY, r * .96, r * .86, '#e8d7c2');
        ellipse(cx, eyeY + r * .1, r * .9, r * .76, '#dcc4ae');
        const vr = rngFor('eyeveins' + frame);
        for (let i = 0; i < 13; i++) {
          const a = vr() * Math.PI * 2, rr = r * (.62 + vr() * .28);
          let vx = cx + Math.cos(a) * rr, vy = eyeY + Math.sin(a) * rr * .84;
          for (let s = 0; s < 7; s++) {
            P(g, vx, vy, 2, 2, i % 3 ? 'rgba(126,44,58,.55)' : 'rgba(84,32,44,.65)');
            vx -= Math.cos(a) * 3 + (vr() * 2 - 1); vy -= Math.sin(a) * 2.5 + (vr() * 2 - 1);
          }
        }
        /* iris, pupil and wet highlight */
        ellipse(cx + r * .1, eyeY + r * .06, r * .58, r * .62, '#4a1a24');
        ellipse(cx + r * .1, eyeY + r * .06, r * .5, r * .55, '#8f3041');
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * Math.PI * 2;
          P(g, cx + r * .1 + Math.cos(a) * r * .28, eyeY + r * .06 + Math.sin(a) * r * .32, 2, 3, '#b55362');
        }
        ellipse(cx + r * .12, eyeY + r * .06, r * .25, r * .34, '#150e16');
        if (phase >= 2) ellipse(cx + r * .12, eyeY + r * .06, r * .15, r * .23, '#ff4a2e');
        P(g, cx + r * .28, eyeY - r * .12, r * .11, r * .11, '#fff4ee');
        P(g, cx + r * .25, eyeY - r * .09, r * .05, r * .05, '#ffffff');
        P(g, cx - r * .38, eyeY - r * .36, r * .18, 4, 'rgba(255,255,255,.18)');
        if (phase >= 2) {
          for (let i = 0; i < 6; i++) P(g, cx - r * .75 + i * r * .3, eyeY + r * .82, 3, 8, '#d8c4a8');
        }
      } else if (type === 'eaterOfWorlds') {
        for (let i = 5; i >= 0; i--) {
          const xx = cx - 30 + Math.sin(t * .35 + i * .8) * 18, yy = by - 34 + i * 15;
          const sz = 20 + (5 - i) * 3;
          P(g, xx, yy, sz, sz, i === 0 ? c : shade(c, -i * 6)); P(g, xx + 3, yy + 2, sz - 8, 4, hi);
          if (i === 0) { P(g, xx + 5, yy + 7, 5, 5, '#e9d8a8'); P(g, xx + 7, yy + 9, 3, 3, '#241820'); P(g, xx + sz - 10, yy + 7, 5, 5, '#e9d8a8'); P(g, xx + sz - 8, yy + 9, 3, 3, '#241820'); for (let k = 0; k < 4; k++) P(g, xx + 5 + k * 5, yy + sz - 2, 2, 5, '#d8ccb4'); }
        }
      } else if (type === 'brainOfCthulhu') {
        const bob = Math.sin(t * .6) * 4;
        const cy = by - h * .58 + bob;
        const rx = w * .34, ry = h * .31;
        const ellipse = (ex, ey, ew, eh, col) => {
          for (let yy = -eh; yy <= eh; yy++) {
            const ww = ew * Math.sqrt(Math.max(0, 1 - (yy * yy) / (eh * eh)));
            P(g, ex - ww, ey + yy, ww * 2, 1, col);
          }
        };
        /* hanging vessels */
        for (let i = 0; i < 9; i++) {
          const x = cx - rx * .8 + i * rx * .2, len = 16 + (i % 3) * 10;
          for (let j = 0; j < len; j += 4) P(g, x + Math.sin(j * .3 + i) * 2, cy + ry * .7 + j, 3, 5, i % 2 ? '#7e3048' : '#a94a60');
        }
        /* two lumpy hemispheres behind a dark fissure */
        ellipse(cx - rx * .42, cy, rx * .72, ry, '#5a1f31');
        ellipse(cx + rx * .42, cy, rx * .72, ry, '#5a1f31');
        ellipse(cx - rx * .42, cy, rx * .66, ry * .93, c);
        ellipse(cx + rx * .42, cy, rx * .66, ry * .93, c);
        ellipse(cx - rx * .16, cy - ry * .3, rx * .34, ry * .45, hi);
        ellipse(cx + rx * .1, cy - ry * .35, rx * .3, ry * .4, hi);
        ellipse(cx - rx * .5, cy + ry * .3, rx * .34, ry * .38, lo);
        ellipse(cx + rx * .5, cy + ry * .32, rx * .3, ry * .36, lo);
        /* gyri folds */
        const brng = rngFor('brain' + frame);
        for (let i = 0; i < 18; i++) {
          const side = i % 2 ? 1 : -1;
          let fx = cx + side * (rx * .12 + brng() * rx * .5), fy = cy - ry * .7 + brng() * ry * 1.15;
          for (let j = 0; j < 7; j++) {
            P(g, fx, fy, 3, 2, j % 2 ? '#7b2d43' : '#9c3e54');
            fx += side * 4 + Math.sin(j + i) * 1.5; fy += 3 + Math.cos(j * .7) * 2;
          }
        }
        /* central wrinkled fissure */
        for (let yy = -ry * .85; yy < ry * .9; yy += 2) {
          const xx = cx + Math.sin(yy * .22 + t * .5) * 4;
          P(g, xx - 2, cy + yy, 4, 3, '#3c1422');
          P(g, xx + 3, cy + yy, 2, 3, '#d07a8c');
        }
        /* sunken eyes with crimson pupils */
        for (const side of [-1, 1]) {
          const ex = cx + side * rx * .32, ey = cy + ry * .25;
          ellipse(ex, ey, 14, 10, '#3a1220');
          ellipse(ex, ey + 1, 10, 7, '#1b0911');
          P(g, ex - 3, ey - 2, 6, 6, phase >= 2 ? '#ff3048' : '#d85468');
          P(g, ex - 1, ey, 2, 2, '#ffd0d8');
          for (let v = 0; v < 4; v++) P(g, ex - 12 + v * 8, ey + 9, 2, 5 + (v % 2) * 3, '#8a3048');
        }
        /* phase 2 exposed veins */
        if (phase >= 2) {
          for (let i = 0; i < 7; i++) {
            const vx = cx - rx * .8 + i * rx * .26;
            for (let j = 0; j < 6; j++) P(g, vx + Math.sin(j * .8 + i) * 5, cy - ry * .5 + j * 9, 2, 3, 'rgba(255,70,80,.45)');
          }
        }

      } else if (type === 'skeletron') {
        const bob = Math.sin(t * .45) * 4;
        const r = Math.min(w * .31, 78);
        const skullTop = by - h * .72 + bob, skullH = r * 1.28;
        /* long bony arms, drawn behind the skull */
        const bone = (x1, y1, x2, y2, thick, col) => {
          const steps = Math.max(1, Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 4));
          for (let i = 0; i <= steps; i++) {
            const u = i / steps, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
            P(g, x - thick / 2, y - thick / 2, thick, thick, col);
            if (i % 3 === 0) P(g, x - thick / 2 + 1, y - thick / 2, Math.max(2, thick - 3), 2, shade(col, 22));
          }
        };
        for (const side of [-1, 1]) {
          const sx = cx + side * (r * .72), sy = skullTop + skullH * .55;
          const ex = cx + side * (r * 1.46), ey = sy + 30 + Math.sin(t * .5 + side) * 7;
          bone(sx, sy, ex, ey, 11, c);
          bone(ex, ey, ex + side * 13, ey + 54, 9, shade(c, -13));
          /* claws */
          for (let k = -1; k <= 1; k++) bone(ex + side * 13, ey + 54, ex + side * (19 + Math.abs(k) * 4), ey + 74 + k * 8, 5, c2);
          P(g, ex - 8, ey - 7, 16, 14, c);
          P(g, ex - 6, ey - 5, 6, 5, hi);
          g.globalAlpha = .18; P(g, ex - 4, ey + 16, 8, 44, '#ffcf8a'); g.globalAlpha = 1;
        }
        /* rounded cranium */
        const rows = [[.40, .62], [.64, .78], [.82, .90], [.96, .98], [1, 1], [.99, .99], [.95, .97], [.89, .92], [.80, .84], [.70, .75]];
        const rh = skullH / rows.length;
        for (let i = 0; i < rows.length; i++) {
          const rw = r * (rows[i][0] + rows[i][1]) * .5 * 2;
          const x = cx - rw / 2, y = skullTop + i * rh;
          P(g, x, y, rw, rh + 1, i < 2 ? hi : i > 7 ? shade(c, -14) : c);
          P(g, x + 3, y, rw * .22, rh + 1, 'rgba(255,255,255,.10)');
          P(g, x + rw * .76, y, rw * .24, rh + 1, 'rgba(20,12,16,.10)');
        }
        /* horns */
        P(g, cx - r - 12, skullTop + 6, 14, 9, c2); P(g, cx + r - 2, skullTop + 6, 14, 9, c2);
        P(g, cx - r - 22, skullTop - 3, 12, 9, c2); P(g, cx + r + 10, skullTop - 3, 12, 9, c2);
        P(g, cx - r - 31, skullTop - 10, 11, 8, c2); P(g, cx + r + 20, skullTop - 10, 11, 8, c2);
        /* eye sockets, nose and jaw */
        const ey = skullTop + skullH * .34;
        P(g, cx - r * .64, ey, r * .46, r * .33, '#241a20');
        P(g, cx + r * .18, ey, r * .46, r * .33, '#241a20');
        P(g, cx - r * .60, ey + 4, r * .38, r * .20, '#0d090c');
        P(g, cx + r * .22, ey + 4, r * .38, r * .20, '#0d090c');
        P(g, cx - r * .56, ey + 8, r * .15, r * .09, phase >= 2 ? '#ff5a36' : '#ffb347');
        P(g, cx + r * .41, ey + 8, r * .15, r * .09, phase >= 2 ? '#ff5a36' : '#ffb347');
        P(g, cx - r * .08, ey + r * .18, r * .16, r * .15, '#2a1e20');
        P(g, cx - r * .02, ey + r * .24, r * .04, r * .06, '#4a3234');
        P(g, cx - r * .48, skullTop + skullH * .70, r * .96, r * .24, '#3a2c2c');
        P(g, cx - r * .40, skullTop + skullH * .72, r * .80, r * .13, '#160f12');
        for (let i = 0; i < 9; i++) P(g, cx - r * .38 + i * r * .095, skullTop + skullH * .71, 4, 8, '#e8dfc2');
        P(g, cx - r * .30, skullTop + skullH * .80, r * .60, 5, '#d8ceb2');
        /* cracks and jaw joint */
        P(g, cx - r * .78, skullTop + skullH * .58, 2, 14, '#5b4c49');
        P(g, cx + r * .80, skullTop + skullH * .30, 2, 20, '#5b4c49');
        if (phase >= 2) { g.globalAlpha = .26; P(g, cx - r, skullTop, r * 2, skullH * 1.2, '#ff6a30'); g.globalAlpha = 1; }

      } else if (type === 'queenBee') {
        const flap = Math.sin(t * 1.5) * 9;
        const bodyC = c, stripe = '#3d2f18', fuzz = '#f0c34e';
        /* four translucent wings with veins */
        for (const side of [-1, 1]) {
          const wx = cx + side * 30, wy = by - h * .55 - flap * side;
          const spread = 58 + phase * 4;
          for (let i = 0; i < 4; i++) {
            const wh = 26 - i * 4, ww = spread - i * 7;
            g.globalAlpha = .28 - i * .045;
            P(g, side < 0 ? wx - ww : wx + 4, wy + i * 8, ww, wh, '#d8ecff');
            g.globalAlpha = .5;
            P(g, side < 0 ? wx - ww + 3 : wx + 7, wy + i * 8 + 2, ww - 6, 2, '#ffffff');
          }
          g.globalAlpha = .75;
          for (let i = 0; i < 3; i++) {
            const len = spread * .8;
            P(g, side < 0 ? wx - len : wx, wy + 12 + i * 9, len, 1, '#8fbfdc');
          }
          g.globalAlpha = 1;
        }
        /* segmented abdomen */
        const rows = [.38, .62, .82, .96, 1, 1, .96, .88, .74, .55];
        const bw = 92, bh = 60, top = by - 64;
        for (let i = 0; i < rows.length; i++) {
          const rw = bw * rows[i], x = cx - rw / 2, y = top + i * (bh / rows.length);
          P(g, x, y, rw, bh / rows.length + 1, (i % 2 === 0) ? bodyC : '#e3ae36');
          P(g, x + rw * .12, y, rw * .22, bh / rows.length + 1, 'rgba(255,245,190,.25)');
          P(g, x + rw * .70, y, rw * .30, bh / rows.length + 1, 'rgba(45,30,12,.18)');
          if (i > 2 && i < 8 && i % 2 === 1) P(g, x + 1, y + 1, rw - 2, 2, stripe);
        }
        /* thorax fuzz */
        P(g, cx - 30, by - 92, 60, 32, '#b98622');
        for (let i = 0; i < 34; i++) {
          const x = cx - 28 + (i * 13) % 56, y = by - 90 + (i * 7) % 28;
          P(g, x, y, 3, 5, i % 3 ? fuzz : '#7c5a16');
        }
        P(g, cx - 22, by - 88, 44, 6, '#f6d77e');
        /* head with compound eyes, antennae and mandibles */
        P(g, cx - 20, by - 112, 40, 28, '#e6b43c');
        P(g, cx - 16, by - 110, 32, 8, '#f8da87');
        P(g, cx - 14, by - 104, 11, 12, '#291f16'); P(g, cx + 4, by - 104, 11, 12, '#291f16');
        P(g, cx - 12, by - 102, 4, 5, '#9be9ff'); P(g, cx + 6, by - 102, 4, 5, '#9be9ff');
        if (phase >= 2) { P(g, cx - 14, by - 103, 11, 10, 'rgba(255,60,40,.55)'); P(g, cx + 4, by - 103, 11, 10, 'rgba(255,60,40,.55)'); }
        P(g, cx - 17, by - 87, 13, 4, '#5b3d14'); P(g, cx + 5, by - 87, 13, 4, '#5b3d14');
        for (const side of [-1, 1]) {
          const ax = cx + side * 14;
          for (let i = 0; i < 5; i++) P(g, ax + side * i * 1.8, by - 116 - i * 4, 3, 5, '#4a3413');
          dot(g, ax + side * 9, by - 132, '#c79a38');
        }
        /* three pairs of hooked legs */
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const lx = cx + side * (24 + i * 5), ly = by - 84 + i * 15;
            P(g, lx, ly, 4, 14, '#4b3515');
            P(g, lx + side * 5, ly + 11, 4, 12, '#5d421b');
            P(g, lx + side * 10, ly + 20, 3, 9, '#3c2a10');
          }
        }
        /* stinger and phase trim */
        P(g, cx - 7, by - 7, 14, 5, '#3a2a10');
        P(g, cx - 4, by - 2, 8, 8, '#2c2010');
        P(g, cx - 1, by + 4, 3, 6, '#d8d2b2');
        if (phase >= 2) {
          const gr = g.createRadialGradient(cx, by - h * .55, 10, cx, by - h * .55, 120);
          gr.addColorStop(0, 'rgba(255,196,60,.22)'); gr.addColorStop(1, 'rgba(255,196,60,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }

      } else if (type === 'wallOfFlesh') {
        const eyeY = by - h * .48 + Math.sin(t * .3) * 6;
        P(g, cx - w * .38, by - h, w * .76, h, c);
        for (let i = 0; i < 8; i++) { const x = cx - w * .38 + i * w * .1; P(g, x, by - h, 12, h, shade(c, i % 2 ? -14 : 10)); }
        P(g, cx - w * .3, eyeY, 50, 30, '#f0dfc9'); P(g, cx + w * .1, eyeY, 50, 30, '#f0dfc9');
        P(g, cx - w * .27, eyeY + 6, 22, 18, '#5b1c28'); P(g, cx + w * .17, eyeY + 6, 22, 18, '#5b1c28');
        P(g, cx - w * .24, eyeY + 10, 8, 8, '#1a0c12'); P(g, cx + w * .2, eyeY + 10, 8, 8, '#1a0c12');
        P(g, cx - w * .3, by - h * .26, w * .6, 30, '#351822'); for (let i = 0; i < 14; i++) P(g, cx - w * .28 + i * w * .041, by - h * .26, 5, 16, '#e8dcc2');
        for (let i = 0; i < 6; i++) { const x = cx - w * .32 + i * w * .11; P(g, x, by - h * .12, 10, 40, c2); P(g, x + 2, by - h * .12, 4, 40, shade(c2, -15)); }
      }
      if (state === 'hurt') { g.globalCompositeOperation = 'source-atop'; P(g, 0, 0, w, h, 'rgba(255,80,80,.5)'); g.globalCompositeOperation = 'source-over'; }
    }, 'b_' + type + '_' + phase + '_' + frame + '_' + (state || ''));
  }

  /* ------------------------------------------------------------------ environment art */
  function tree(kind, variant, stage = 1) {
    const key = 'tree_' + kind + '_' + variant + '_' + stage;
    const pal = {
      forest: ['#6b4a2b', '#8d6439', '#4f8f3d', '#6fb84f', '#3d6e32'],
      snow: ['#6e5b4b', '#8e7a66', '#dcecf2', '#ffffff', '#a9c7d2'],
      jungle: ['#5a3a25', '#7f5231', '#3e812e', '#65b23d', '#2d6425'],
      corrupt: ['#3b2a3d', '#574060', '#5b4770', '#7b5f92', '#3e304b'],
      crimson: ['#3a2026', '#603038', '#7b2f3e', '#a94a57', '#541f2c'],
      mahogany: ['#5c3324', '#7e4931', '#3b7a2c', '#5da33b', '#2c5b22'],
      hallow: ['#6e5166', '#906b86', '#e0a5d8', '#f7d1f0', '#b87bb2'],
      palm: ['#7b5a36', '#a07845', '#3f8c4f', '#6ab867', '#2f6c3c']
    }[kind] || ['#6b4a2b', '#8d6439', '#4f8f3d', '#6fb84f', '#3d6e32'];
    const heights = [42, 58, 74, 92];
    const h = Math.round(heights[variant % 4] * stage);
    return cv(52, 120, g => {
      g.clearRect(0, 0, 52, 120);
      const bx = 26, base = 118;
      const [bark, bark2, leaf, leafHi, leafLo] = pal;
      if (kind === 'palm') {
        for (let i = 0; i < h; i++) {
          const x = bx + Math.round(Math.sin(i * .06) * 6);
          P(g, x, base - i, 5, 1, i % 5 === 0 ? bark2 : bark);
        }
        const tx = bx + Math.round(Math.sin(h * .06) * 6);
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI * .9 + i * .45;
          for (let j = 0; j < 18; j++) { const x = tx + Math.cos(a) * j * .9, y = base - h + Math.sin(a) * j * .5 + j * j * .035; P(g, x, y, 4, 2, j > 10 ? leafLo : leaf); }
        }
      } else {
        const trunkW = 6 + Math.round(stage * 2);
        for (let i = 0; i < h; i++) {
          const wob = Math.round(Math.sin(i * .07 + variant) * 2);
          P(g, bx - trunkW / 2 + wob, base - i, trunkW, 1, (i % 6 === 0) ? bark2 : bark);
          if (i % 8 === 0) P(g, bx - trunkW / 2 + wob + 1, base - i, 1, 1, shade(bark, 20));
        }
        P(g, bx - 6, base - 4, 12, 4, bark2); P(g, bx - 4, base - 3, 3, 1, shade(bark, 20));
        const cy = base - h - 6, rw = 18 + stage * 7, rh = 16 + stage * 4;
        for (let i = 0; i < 6; i++) {
          const ox = Math.round(Math.sin(i * 2.1 + variant) * rw * .45), oy = -Math.abs(Math.cos(i * 1.3 + variant)) * rh * .5;
          const r = rw * (1 - Math.abs(ox) / (rw * 1.5));
          P(g, bx + ox - r, cy + oy - r * .55, r * 2, r * 1.1, leafLo);
          P(g, bx + ox - r * .8, cy + oy - r * .7, r * 1.6, r * .9, leaf);
          P(g, bx + ox - r * .5, cy + oy - r * .75, r * .9, r * .4, leafHi);
          if (stage > 1) { for (let k = 0; k < 5; k++) dot(g, bx + ox - r * .6 + (k * 13) % (r * 1.2), cy + oy - r * .4 + (k * 7) % (r * .8), leafHi); }
        }
        if (kind === 'corrupt') { for (let i = 0; i < 5; i++) { P(g, bx - 18 + i * 8, cy + 10, 2, 9, '#4b3552'); } }
      }
    }, key);
  }
  function bush(kind, variant) {
    return cv(28, 18, g => {
      g.clearRect(0, 0, 28, 18);
      const cols = { forest: ['#3e7a31', '#5fa345'], snow: ['#b9d8e2', '#e8f7fb'], jungle: ['#2e6524', '#4f9234'], corrupt: ['#4a3553', '#6e527c'], desert: ['#a8964d', '#c9b866'] }[kind] || ['#3e7a31', '#5fa345'];
      for (let i = 0; i < 7; i++) { const x = 3 + i * 3, h = 4 + (i * 7 + variant) % 7; P(g, x, 17 - h, 4, h, i % 2 ? cols[0] : cols[1]); if (i % 3 === 0) P(g, x + 1, 17 - h - 2, 2, 2, cols[1]); }
    }, 'bush' + kind + variant);
  }

  /* ------------------------------------------------------------------ particles and orbs */
  function glowOrb(color, r = 10) {
    return cv(r * 2, r * 2, g => {
      const grd = g.createRadialGradient(r, r, 1, r, r, r);
      grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(.25, rgba(color, .7)); grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd; g.fillRect(0, 0, r * 2, r * 2);
    }, 'glow' + color + r);
  }
  function star(color) {
    return cv(9, 9, g => {
      g.clearRect(0, 0, 9, 9); P(g, 4, 0, 1, 9, color); P(g, 0, 4, 9, 1, color); P(g, 3, 1, 3, 7, rgba(color, .5)); P(g, 1, 3, 7, 3, rgba(color, .5)); P(g, 4, 4, 1, 1, '#fff');
    }, 'star' + color);
  }
  function cursor(kind) {
    return cv(20, 20, g => {
      g.clearRect(0, 0, 20, 20);
      const c = kind === 'mine' ? '#f4e3ad' : kind === 'attack' ? '#e8a4a4' : '#d8e6f2';
      /* pickaxe-style reticle */
      P(g, 9, 1, 2, 8, c); P(g, 5, 5, 10, 2, c); P(g, 9, 9, 2, 10, c); P(g, 1, 9, 8, 2, c); P(g, 11, 9, 8, 2, c);
      P(g, 8, 6, 2, 2, '#0d0c14'); P(g, 12, 10, 2, 2, '#0d0c14'); P(g, 6, 10, 2, 2, '#0d0c14');
    }, 'cursor' + kind);
  }
  return { cv, P, dot, tile, wall, liquid, icon, player, npc, enemy, boss, tree, bush, glowOrb, star, cursor, drawFurniture, shade, mix, rgba };
})();
window.ART = ART;
