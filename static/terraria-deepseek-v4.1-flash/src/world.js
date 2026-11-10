'use strict';
/* ---------------------------------------------------------------------------------------------
   World generation, tile access and structures.  A world is 2000 x 650 tiles.
------------------------------------------------------------------------------------------------- */
const TS = 16;
const WORLD_W = 2000, WORLD_H = 650;
const SEA_LEVEL = 174, ROCK_LEVEL = 230, CAVERN_LEVEL = 330, HELL_LEVEL = 585;
const SURFACE_BASE = 170;

const BIOME_INFO = {
  forest: { name: 'Forest', sky: ['#64b6e8', '#a7dbee'], music: 'forest', tree: 'forest' },
  snow: { name: 'Snow', sky: ['#8fb7cd', '#d7e8ef'], music: 'snow', tree: 'snow' },
  desert: { name: 'Desert', sky: ['#e1b36d', '#f5dfae'], music: 'desert', tree: 'palm' },
  jungle: { name: 'Jungle', sky: ['#4e9060', '#a6d59a'], music: 'jungle', tree: 'jungle' },
  corruption: { name: 'The Corruption', sky: ['#3b2c4d', '#755c89'], music: 'corruption', tree: 'corrupt' },
  crimson: { name: 'The Crimson', sky: ['#4a2029', '#8e4650'], music: 'corruption', tree: 'crimson' },
  ocean: { name: 'Ocean', sky: ['#4f9acb', '#bfe6f2'], music: 'ocean', tree: 'palm' },
  beach: { name: 'Beach', sky: ['#62b4de', '#d9edf3'], music: 'ocean', tree: 'palm' },
  underground: { name: 'Underground', sky: ['#1b1b28', '#2b2a3a'], music: 'underground' },
  cave: { name: 'Caverns', sky: ['#14141d', '#242336'], music: 'cave' },
  dungeon: { name: 'Dungeon', sky: ['#181722', '#2b3044'], music: 'dungeon' },
  hell: { name: 'Underworld', sky: ['#2a0d0c', '#65281d'], music: 'hell' }
};

class World {
  constructor(seed, opts = {}) {
    this.seedStr = String(seed || 'Terraria');
    this.seed = U.hashStr(this.seedStr) >>> 0;
    this.rng = new U.RNG(this.seed ^ 0x9e3779b9);
    this.w = WORLD_W; this.h = WORLD_H;
    this.tiles = new Uint8Array(this.w * this.h);
    this.walls = new Uint8Array(this.w * this.h);
    this.surface = new Int16Array(this.w);
    this.biomes = [];
    this.chests = new Map();
    this.trees = [];
    this.treeGrid = new Map();
    this.decor = [];
    this.house = null;
    this.dungeon = null;
    this.spawnX = 1020;
    this.spawnY = 0;
    this.altars = [];
    this.orbs = [];
    this.hardmode = false;
    this.evil = opts.evil === 'crimson' ? 'crimson' : 'corruption';
    this._crimsonBiome = Object.assign({}, BIOME_INFO.corruption, { name: 'The Crimson' });
    this.opts = opts;
    this.generate();
  }
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.inBounds(x, y) ? this.tiles[y * this.w + x] : TILE.STONE; }
  getWall(x, y) { return this.inBounds(x, y) ? this.walls[y * this.w + x] : 0; }
  set(x, y, id) { if (this.inBounds(x, y)) this.tiles[y * this.w + x] = id; }
  setWall(x, y, id) { if (this.inBounds(x, y)) this.walls[y * this.w + x] = id; }
  solid(x, y) {
    if (x < 0 || x >= this.w) return true;
    if (y < 0) return false;
    if (y >= this.h) return true;
    const t = this.tiles[y * this.w + x];
    return !!(TILES[t] && TILES[t].solid);
  }
  solidForEntity(x, y) { return this.solid(Math.floor(x / TS), Math.floor(y / TS)); }
  platform(x, y) {
    if (!this.inBounds(x, y)) return false;
    const t = TILES[this.tiles[y * this.w + x]];
    return !!(t && t.platform);
  }
  liquid(x, y) {
    if (!this.inBounds(x, y)) return null;
    const t = TILES[this.tiles[y * this.w + x]];
    return t && t.liquid ? t.liquid : null;
  }
  biomeAt(x, y = null) {
    if (y !== null) {
      if (y >= HELL_LEVEL) return 'hell';
      if (this.dungeon && x > this.dungeon.x0 && x < this.dungeon.x1 && y > this.dungeon.y0 && y < this.dungeon.y1) return 'dungeon';
      if (y > CAVERN_LEVEL) return 'cave';
      if (y > ROCK_LEVEL + 20) return 'underground';
    }
    for (const b of this.biomes) if (x >= b.x0 && x < b.x1) return (b.type === 'corruption' && this.evil === 'crimson') ? 'crimson' : b.type;
    return 'forest';
  }
  biomeDefAt(x, y) {
    return BIOME_INFO[this.biomeAt(x, y)] || BIOME_INFO.forest;
  }
  depthLabel(y) {
    if (y > HELL_LEVEL) return 'Underworld';
    if (y > CAVERN_LEVEL) return 'Caverns';
    if (y > ROCK_LEVEL) return 'Underground';
    return 'Surface';
  }
  inDungeon(x, y) {
    const d = this.dungeon;
    return !!(d && x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1);
  }
  /* ---------------------------------------------------------------- generation */
  generate() {
    const r = this.rng, W = this.w, H = this.h;
    this.makeBiomes();
    this.makeSurface();
    this.fillLayers();
    this.carveCaves();
    this.carveMines();
    this.addLiquids();
    this.addOres();
    this.makeCorruption();
    this.makeDesertFeatures();
    this.makeJungle();
    this.makeDungeon();
    this.makeCabins();
    this.makeHell();
    this.flattenSpawn();
    this.makeSpawnHouse();
    this.addSurfaceLitter();
    this.addCaveDecor();
    this.placeTrees();
    this.finishWalls();
    this.spawnY = this.findSurface(this.spawnX);
  }
  makeBiomes() {
    this.biomes = [
      { type: 'ocean', x0: 0, x1: 90 }, { type: 'beach', x0: 90, x1: 140 },
      { type: 'snow', x0: 140, x1: 400 }, { type: 'forest', x0: 400, x1: 650 },
      { type: 'desert', x0: 650, x1: 900 }, { type: 'forest', x0: 900, x1: 1150 },
      { type: 'corruption', x0: 1150, x1: 1370 }, { type: 'forest', x0: 1370, x1: 1530 },
      { type: 'jungle', x0: 1530, x1: 1850 }, { type: 'beach', x0: 1850, x1: 1910 },
      { type: 'ocean', x0: 1910, x1: 2000 }
    ];
  }
  makeSurface() {
    const r = this.rng, W = this.w;
    for (let x = 0; x < W; x++) {
      const bio = this.biomeAt(x);
      const big = U.fbm1(this.seed + 11, x * 0.006, 4);
      const small = U.fbm1(this.seed + 31, x * 0.035, 3);
      let y = SURFACE_BASE + (big - .5) * 34 + (small - .5) * 14;
      if (bio === 'snow') y -= 8 + big * 10;
      else if (bio === 'desert') y += 8 + Math.sin(x * .045) * 6;
      else if (bio === 'jungle') y += 6;
      else if (bio === 'corruption' || bio === 'crimson') y -= 3 + (small - .5) * 10;
      if (bio === 'ocean') {
        const d = x < W / 2 ? (90 - x) / 80 : (x - 1910) / 80;
        y = SEA_LEVEL + 4 + d * 34 + (big - .5) * 8;
      } else if (bio === 'beach') {
        y = SEA_LEVEL + 2 + Math.max(0, (x - 90) / 50) * -4 + (big - .5) * 5;
      }
      this.surface[x] = Math.round(U.clamp(y, 100, 220));
    }
    /* smooth cliffs lightly */
    for (let pass = 0; pass < 2; pass++) for (let x = 1; x < W - 1; x++) this.surface[x] = Math.round((this.surface[x] * 2 + this.surface[x - 1] + this.surface[x + 1]) / 4);
  }
  fillLayers() {
    const W = this.w, H = this.h, r = this.rng;
    for (let x = 0; x < W; x++) {
      const sy = this.surface[x], bio = this.biomeAt(x);
      for (let y = sy; y < H; y++) {
        const d = y - sy;
        let t = TILE.STONE, wall = WALL.STONE;
        if (bio === 'snow') { t = TILE.SNOW; }
        else if (bio === 'desert') { t = TILE.SAND; }
        else if (bio === 'jungle') { t = TILE.MUD; }
        else if (bio === 'corruption' || bio === 'crimson') { t = this.evil === 'crimson' ? TILE.CRIMSTONE : TILE.EBONSTONE; wall = this.evil === 'crimson' ? WALL.CRIMSTONE : WALL.EBONSTONE; }
        else if (bio === 'ocean' || bio === 'beach') { t = TILE.SAND; }
        else { t = TILE.DIRT; wall = WALL.DIRT; }
        if (d > 8 + Math.sin(x * .3) * 4) { t = bio === 'desert' ? TILE.SANDSTONE : bio === 'snow' ? TILE.ICE : bio === 'jungle' ? TILE.MUD : TILE.STONE; wall = bio === 'desert' ? WALL.SANDSTONE : bio === 'snow' ? WALL.SNOW : WALL.STONE; }
        if (y > CAVERN_LEVEL + 30) { t = TILE.DEEP_STONE; wall = WALL.STONE; }
        if (y > HELL_LEVEL) { t = TILE.ASH; wall = WALL.ASH; }
        this.tiles[y * W + x] = t; this.walls[y * W + x] = wall;
      }
      /* surface cap */
      if (bio === 'snow') this.tiles[sy * W + x] = TILE.SNOW;
      else if (bio === 'desert') this.tiles[sy * W + x] = TILE.SAND;
      else if (bio === 'jungle') this.tiles[sy * W + x] = TILE.JUNGLE_GRASS;
      else if (bio === 'corruption' || bio === 'crimson') this.tiles[sy * W + x] = this.evil === 'crimson' ? TILE.CRIMSON_GRASS : TILE.CORRUPT_GRASS;
      else if (bio === 'ocean' || bio === 'beach') this.tiles[sy * W + x] = TILE.SAND;
      else this.tiles[sy * W + x] = TILE.GRASS;
      this.walls[sy * W + x] = 0;
      /* clay band */
      for (let y = sy + 2; y < Math.min(H, sy + 9); y++) if (r.chance(.16)) this.tiles[y * W + x] = TILE.CLAY;
      /* silt pockets */
      if (r.chance(.035)) { const yy = sy + 8 + r.int(0, 60); for (let a = -2; a <= 2; a++) for (let b = -1; b <= 1; b++) if (r.chance(.6)) this.tiles[(yy + b) * W + x + a] = TILE.SILT; }
    }
  }
  carveCaves() {
    const W = this.w, H = this.h;
    const s = this.seed + 101;
    /* Sample the cave fields on a coarse lattice and bilinearly upsample. This
       keeps the organic shapes while cutting worldgen cost by an order of magnitude. */
    const cell = 4;
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
    const f1 = new Float32Array(gw * gh), f2 = new Float32Array(gw * gh), f3 = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const y = gy * cell;
      for (let gx = 0; gx < gw; gx++) {
        const x = gx * cell;
        f1[gy * gw + gx] = U.fbm2(s, x * .047, y * .055, 3);
        f2[gy * gw + gx] = U.fbm2(s + 20, x * .016, y * .018, 2);
        f3[gy * gw + gx] = U.fbm2(s + 50, x * .05, y * .06, 2);
      }
    }
    const pick = (f, x, y) => {
      const gx = x / cell, gy = y / cell;
      const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
      const a = f[iy * gw + ix], b = f[iy * gw + ix + 1], c = f[(iy + 1) * gw + ix], d = f[(iy + 1) * gw + ix + 1];
      return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
    };
    const dg = this.dungeon;
    for (let x = 2; x < W - 2; x++) {
      const sy = this.surface[x];
      const inDunX = dg && x >= dg.x0 && x <= dg.x1;
      for (let y = sy + 7; y < H - 4; y++) {
        if (inDunX && y >= dg.y0 && y <= dg.y1) continue;
        let cave;
        if (y > HELL_LEVEL) cave = pick(f3, x, y) > .62;
        else cave = pick(f1, x, y) > .658 || (pick(f2, x, y) > .678 && pick(f1, x, y) > .56);
        if (cave) this.tiles[y * W + x] = TILE.AIR;
      }
    }
    /* long snake tunnels */
    this.wormTunnels(70, 130, 700, 120, 9);
    this.wormTunnels(50, 220, 560, 180, 7);
    this.wormTunnels(48, 300, 340, 240, 8);
  }
  wormTunnels(count, minY, maxY, length, radius) {
    const r = this.rng, W = this.w;
    for (let i = 0; i < count; i++) {
      let x = r.int(20, W - 20), y = r.int(minY, maxY);
      let ang = r.float(0, Math.PI * 2);
      for (let j = 0; j < length; j++) {
        ang += r.float(-.28, .28);
        x += Math.cos(ang) * 1.3; y += Math.sin(ang) * .9;
        if (x < 5 || x > W - 5 || y < this.surface[Math.floor(x)] + 5 || y > this.h - 5) break;
        const rad = radius * (0.65 + 0.35 * Math.sin(j * .1));
        for (let ox = -rad; ox <= rad; ox++) for (let oy = -rad * .7; oy <= rad * .7; oy++) {
          const xx = Math.floor(x + ox), yy = Math.floor(y + oy);
          if (ox * ox + oy * oy > rad * rad) continue;
          if (this.inDungeon(xx, yy)) continue;
          if (this.inBounds(xx, yy)) this.tiles[yy * W + xx] = TILE.AIR;
        }
      }
    }
  }
  carveMines() {
    const r = this.rng, W = this.w;
    for (let i = 0; i < 24; i++) {
      const x0 = r.int(140, W - 180), y0 = r.int(ROCK_LEVEL + 10, HELL_LEVEL - 50);
      const len = r.int(26, 70), dir = r.chance(.5) ? 1 : -1;
      for (let j = 0; j < len; j++) {
        const x = x0 + j * dir, y = y0 + Math.round(Math.sin(j * .12) * 3);
        for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (this.inBounds(xx, yy) && !this.inDungeon(xx, yy)) this.tiles[yy * W + xx] = TILE.AIR;
        if (j % 9 === 0) { this.set(x, y + 2, TILE.WOOD_PLATFORM); }
        if (j % 13 === 5) { this.set(x, y - 2, TILE.TORCH); }
        if (j % 17 === 8) this.placeChest(x, y + 1, 'underground', true);
      }
      /* shaft down */
      const sx = x0 + Math.round(r.int(4, len - 4)) * dir;
      for (let y = y0; y < y0 + r.int(12, 35); y++) for (let x = sx - 1; x <= sx + 1; x++) if (this.inBounds(x, y)) this.tiles[y * W + x] = TILE.AIR;
    }
  }
  addLiquids() {
    const W = this.w, H = this.h;
    /* oceans */
    for (let x = 0; x < 90; x++) for (let y = SEA_LEVEL; y < this.surface[x]; y++) if (this.get(x, y) === TILE.AIR) this.set(x, y, TILE.WATER);
    for (let x = 1910; x < W; x++) for (let y = SEA_LEVEL; y < this.surface[x]; y++) if (this.get(x, y) === TILE.AIR) this.set(x, y, TILE.WATER);
    /* underground pools */
    const r = this.rng;
    for (let i = 0; i < 80; i++) {
      const x = r.int(120, W - 120), y = r.int(ROCK_LEVEL + 20, HELL_LEVEL - 40);
      let floor = y;
      for (let k = 0; k < 25; k++) { if (this.solid(x, y + k) || this.get(x, y + k) === TILE.LAVA) { floor = y + k; break; } }
      const depth = r.int(1, 4), wid = r.int(5, 12);
      for (let ox = -wid; ox <= wid; ox++) for (let oy = 1; oy <= depth; oy++) {
        const xx = x + ox, yy = floor - oy;
        if (this.inBounds(xx, yy) && this.get(xx, yy) === TILE.AIR && this.wallAt(xx, yy)) {
          /* only basin cells */
          let supported = false;
          for (let d = 1; d < 4; d++) if (this.solid(xx, yy + d) || this.platform(xx, yy + d)) supported = true;
          if (supported) this.set(xx, yy, TILE.WATER);
        }
      }
    }
    /* lava seas in hell */
    for (let x = 0; x < W; x++) for (let y = HELL_LEVEL + 18; y < H; y++) {
      if (this.get(x, y) === TILE.AIR) {
        let d = 0; for (let k = 1; k < 10; k++) if (this.get(x, y + k) === TILE.AIR) d++;
        if (d > 2 || y > H - 28) this.set(x, y, TILE.LAVA);
      }
    }
    for (let x = 0; x < W; x++) if (this.get(x, H - 2) === TILE.AIR) this.set(x, H - 2, TILE.LAVA);
  }
  addOres() {
    const r = this.rng, W = this.w;
    const layers = [
      ['copper', TILE.STONE, 80, 250, 5, 0.0016], ['tin', TILE.STONE, 100, 270, 4, 0.0012],
      ['iron', TILE.STONE, 170, 330, 4, 0.0013], ['lead', TILE.STONE, 180, 350, 4, 0.0011],
      ['silver', TILE.STONE, 240, 430, 3, 0.0012], ['tungsten', TILE.STONE, 260, 440, 3, 0.001],
      ['gold', TILE.STONE, 320, 520, 3, 0.001], ['platinum', TILE.STONE, 340, 540, 3, 0.0009],
      ['demonite', TILE.EBONSTONE, 210, 470, 3, 0.002],
      ['gem', TILE.STONE, 300, 560, 2, 0.0009]
    ];
    const oreTiles = { copper: TILE.COPPER_ORE, tin: TILE.TIN_ORE, iron: TILE.IRON_ORE, lead: TILE.LEAD_ORE, silver: TILE.SILVER_ORE, tungsten: TILE.TUNGSTEN_ORE, gold: TILE.GOLD_ORE, platinum: TILE.PLATINUM_ORE, demonite: TILE.EBONSTONE, gem: TILE.CRYSTAL_BLOCK };
    /* Ensure ore tiles exist in TILE by name lookup */
    const tileId = (name, fallback) => TILE[name.toUpperCase()] ?? fallback;
    for (const [name, base, minY, maxY, size, rate] of layers) {
      let id = tileId(name, null);
      if (name === 'copper') id = TILE.COPPER_ORE ?? 105;
      if (name === 'tin') id = TILE.TIN_ORE ?? 106;
      if (name === 'iron') id = TILE.IRON_ORE ?? 107;
      if (name === 'lead') id = TILE.LEAD_ORE ?? 108;
      if (name === 'silver') id = TILE.SILVER_ORE ?? 109;
      if (name === 'tungsten') id = TILE.TUNGSTEN_ORE ?? 110;
      if (name === 'gold') id = TILE.GOLD_ORE ?? 111;
      if (name === 'platinum') id = TILE.PLATINUM_ORE ?? 112;
      if (name === 'demonite') id = TILE.DEMONITE_ORE;
      if (name === 'gem') id = TILE.CRYSTAL_BLOCK;
      if (id == null) continue;
      const count = Math.floor(W * (maxY - minY) * (rate || .001) * 0.16);
      for (let i = 0; i < count; i++) {
        const x = r.int(10, W - 10), y = r.int(minY, maxY);
        if (name === 'demonite' && this.biomeAt(x) !== 'corruption') continue;
        this.oreVein(x, y, id, r.int(2, size + 3), base);
      }
    }
  }
  oreVein(x, y, id, size, baseTile) {
    let ox = x, oy = y;
    for (let i = 0; i < size * 3; i++) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const xx = Math.round(ox + dx), yy = Math.round(oy + dy);
        if (!this.inBounds(xx, yy)) continue;
        const cur = this.get(xx, yy);
        if (cur === baseTile || cur === TILE.DIRT || cur === TILE.DEEP_STONE || cur === TILE.SNOW || cur === TILE.ICE) {
          if (Math.random() < .6 || i < size) this.set(xx, yy, id);
        }
      }
      ox += this.rng.int(-1, 1); oy += this.rng.int(-1, 1);
    }
  }
  makeCorruption() {
    const r = this.rng, W = this.w;
    const crim = this.evil === 'crimson';
    const stoneTile = crim ? TILE.CRIMSTONE : TILE.EBONSTONE;
    const grassTile = crim ? TILE.CRIMSON_GRASS : TILE.CORRUPT_GRASS;
    const wallTile = crim ? WALL.CRIMSTONE : WALL.EBONSTONE;
    const orbTile = crim ? TILE.CRIMSON_HEART : TILE.SHADOW_ORB;
    const bx = 1260;
    for (let cx = bx - 60; cx < bx + 60; cx++) {
      for (let y = this.surface[cx]; y < 380; y++) {
        const t = this.get(cx, y);
        if (t === TILE.DIRT || t === TILE.GRASS || t === TILE.STONE || t === TILE.CLAY || t === TILE.EBONSTONE || t === TILE.CORRUPT_GRASS) { this.set(cx, y, y === this.surface[cx] ? grassTile : (y < 270 ? stoneTile : TILE.STONE)); if (this.getWall(cx, y) === WALL.DIRT || this.getWall(cx, y) === WALL.EBONSTONE) this.setWall(cx, y, wallTile); }
      }
    }
    for (const sx of [1200, 1260, 1322]) {
      let x = sx, y = this.surface[sx];
      for (let i = 0; i < 240; i++) {
        const rad = 3 + Math.sin(i * .07) * 1.4;
        for (let ox = -rad; ox <= rad; ox++) for (let oy = -2; oy <= 2; oy++) {
          const xx = Math.round(x + ox), yy = Math.round(y + oy);
          if (this.inBounds(xx, yy)) this.set(xx, yy, TILE.AIR);
        }
        x += Math.sin(i * .13 + sx) * 1.1;
        y += 1;
      }
      /* The orb chamber is carved last so the continuing chasm cannot erase it. */
      const ox = Math.round(x), oy = Math.round(y);
      for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) if (Math.abs(a) + Math.abs(b) < 7) this.set(ox + a, oy + b, stoneTile);
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) this.set(ox + a, oy + b - 1, TILE.AIR);
      this.set(ox, oy, orbTile);
      this.orbs.push({ x: ox, y: oy, type: crim ? 'crimson' : 'shadow' });
      for (let yy = this.surface[sx]; yy < this.surface[sx] + 30; yy++) {
        if (this.get(sx - 3, yy) === TILE.AIR) this.set(sx - 3, yy, TILE.THORN);
        if (this.get(sx + 3, yy) === TILE.AIR) this.set(sx + 3, yy, TILE.THORN);
      }
    }
    this.placeAltar(bx - 20, 315); this.placeAltar(bx + 8, 345);
    for (let i = 0; i < 20; i++) { const x = r.int(1160, 1360), y = r.int(200, 350); this.placeChest(x, y, 'underground', true, .3); }
  }
  placeAltar(x, y) {
    let yy = y;
    while (yy < 500 && !this.solid(x, yy + 1)) yy++;
    while (yy > 200 && this.solid(x, yy)) yy--;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 0; b++) this.set(x + a, yy + b, TILE.AIR);
    this.set(x, yy, TILE.ALTAR); this.altars.push({ x, y: yy });
  }
  makeDesertFeatures() {
    const r = this.rng;
    for (let i = 0; i < 26; i++) {
      const x = r.int(660, 890);
      let y = this.surface[x];
      for (let h = 0; h < r.int(2, 6); h++) {
        if (this.get(x, y - h) === TILE.AIR) this.set(x, y - h, TILE.CACTUS);
      }
    }
    for (let i = 0; i < 12; i++) {
      const x = r.int(660, 890), y = r.int(250, 400);
      for (let a = -5; a <= 5; a++) for (let b = -2; b <= 2; b++) if (this.inBounds(x + a, y + b)) this.set(x + a, y + b, TILE.AIR);
      this.set(x, y + 2, TILE.SANDSTONE); this.set(x - 1, y + 2, TILE.SANDSTONE);
      this.placeChest(x, y + 1, r.chance(.25) ? 'gold' : 'surface', false);
    }
  }
  makeJungle() {
    const r = this.rng;
    for (let x = 1530; x < 1850; x++) {
      for (let y = this.surface[x]; y < 380; y++) {
        if (this.get(x, y) === TILE.STONE) this.set(x, y, TILE.MUD);
        if (this.getWall(x, y) === WALL.STONE && y < 300) this.setWall(x, y, WALL.MUD);
      }
      if (this.get(x, this.surface[x]) === TILE.MUD) this.set(x, this.surface[x], TILE.JUNGLE_GRASS);
    }
    for (let i = 0; i < 12; i++) {
      const x = r.int(1540, 1840), y = r.int(200, 340);
      for (let a = -6; a <= 6; a++) for (let b = -3; b <= 3; b++) this.set(x + a, y + b, TILE.AIR);
      for (let a = -6; a <= 6; a++) this.set(x + a, y - 4, TILE.BEE_HIVE);
      for (let a = 0; a < 6; a++) this.set(x + r.int(-4, 4), y + 1, TILE.HONEY_BLOCK);
      this.set(x, y + 3, TILE.LARVA);
      if (r.chance(.5)) this.placeChest(x - 2, y + 3, 'jungle', true);
    }
    for (let i = 0; i < 24; i++) {
      const x = r.int(1540, 1840), y = r.int(200, 430);
      if (this.get(x, y) === TILE.AIR) this.set(x, y, TILE.JUNGLE_VINE);
      if (this.get(x, y + 1) === TILE.AIR) this.set(x, y + 1, TILE.JUNGLE_VINE);
    }
    for (let i = 0; i < 10; i++) { const x = r.int(1540, 1840), y = r.int(220, 400); this.placeChest(x, y, 'jungle', true, .4); }
  }
  makeDungeon() {
    const W = this.w, r = this.rng;
    const x0 = 1390, x1 = 1530, y0 = 230, y1 = 430;
    const cx = 1460;
    this.dungeon = { x0, x1, y0, y1, cx };
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      this.setWall(x, y, WALL.DUNGEON);
      this.set(x, y, TILE.DUNGEON_BRICK);
    }
    const carve = (ax, ay, aw, ah) => {
      for (let x = ax; x <= ax + aw; x++) for (let y = ay; y <= ay + ah; y++) {
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        this.set(x, y, TILE.AIR); this.setWall(x, y, WALL.DUNGEON);
      }
      for (let x = ax; x <= ax + aw; x++) this.set(x, ay + ah + 1, TILE.DUNGEON_BRICK);
      for (let y = ay; y <= ay + ah; y++) { this.set(ax - 1, y, TILE.DUNGEON_BRICK); this.set(ax + aw + 1, y, TILE.DUNGEON_BRICK); }
    };
    const surf = this.surface[cx];
    for (let y = surf - 2; y <= 300; y++) for (let x = cx - 4; x <= cx + 4; x++) { this.set(x, y, TILE.AIR); this.setWall(x, y, WALL.DUNGEON); }
    for (let y = surf; y < 300; y++) { this.set(cx - 5, y, TILE.DUNGEON_BRICK); this.set(cx + 5, y, TILE.DUNGEON_BRICK); }
    this.set(cx - 4, surf, TILE.DOOR_CLOSED); this.set(cx + 4, surf, TILE.DOOR_CLOSED); this.set(cx - 4, surf - 1, TILE.DOOR_CLOSED); this.set(cx + 4, surf - 1, TILE.DOOR_CLOSED);
    const rooms = [
      [cx - 58, 268, 42, 26], [cx + 8, 286, 52, 24], [cx - 50, 320, 34, 30],
      [cx + 6, 340, 45, 32], [cx - 60, 372, 28, 26], [cx + 20, 392, 38, 24]
    ];
    for (const [x, y, w, h] of rooms) {
      carve(x, y, w, h);
      for (let i = 0; i < 4; i++) if (r.chance(.6)) this.set(x + r.int(3, w - 3), y + h + 1, TILE.DUNGEON_PLATFORM);
      this.set(x + r.int(4, w - 4), y + 1, TILE.TORCH);
      const chx = x + r.int(4, w - 5), chy = y + h;
      this.set(chx, chy, TILE.AIR);
      this.placeChest(chx, chy, 'dungeon', true);
      for (let i = 0; i < 5; i++) this.set(x + r.int(2, w - 2), y + h, TILE.SPIKE);
      if (r.chance(.5)) this.set(x + r.int(3, w - 3), y + 6, TILE.DUNGEON_PLATFORM);
    }
    /* corridors */
    const corridor = (x, y, len, horiz = true) => {
      for (let i = 0; i < len; i++) {
        const xx = horiz ? x + i : x, yy = horiz ? y : y + i;
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) this.set(xx + (horiz ? 0 : a), yy + (horiz ? b : 0), TILE.AIR);
      }
    };
    corridor(cx - 4, 300, 64, false);
    corridor(cx - 58, 294, 58, true);
    corridor(cx + 8, 308, 52, true);
    corridor(cx - 50, 338, 40, true);
    corridor(cx + 6, 358, 45, true);
    corridor(cx - 60, 386, 82, true);
    /* treasure room */
    carve(cx + 14, 418, 20, 8); this.placeChest(cx + 24, 425, 'gold', true);
    this.dungeon.rooms = rooms;
    /* stairs / platforms in shaft */
    for (let y = surf + 5; y < 300; y += 7) { this.set(cx - 4, y, TILE.DUNGEON_PLATFORM); this.set(cx - 3, y, TILE.DUNGEON_PLATFORM); }
  }
  makeCabins() {
    const r = this.rng;
    const xs = [300, 720, 1000, 1180, 1600];
    for (let i = 0; i < xs.length; i++) {
      let x = xs[i] + r.int(-20, 20), y = r.int(260, 450);
      if (x > 1380 && x < 1540 && y < 440) x = 1240;
      this.cabin(x, y, r.chance(.4) ? 'gold' : 'underground');
    }
  }
  cabin(x, y, loot) {
    const W = this.w;
    for (let a = -8; a <= 8; a++) for (let b = -6; b <= 4; b++) {
      if (!this.inBounds(x + a, y + b)) continue;
      this.set(x + a, y + b, TILE.AIR); this.setWall(x + a, y + b, WALL.WOOD);
    }
    for (let a = -8; a <= 8; a++) { this.set(x + a, y + 4, TILE.WOOD); this.set(x + a, y - 6, TILE.WOOD); }
    for (let b = -6; b <= 4; b++) { this.set(x - 8, y + b, TILE.WOOD); this.set(x + 8, y + b, TILE.WOOD); }
    this.set(x - 8, y + 2, TILE.WOOD_PLATFORM); this.set(x - 7, y + 2, TILE.WOOD_PLATFORM);
    this.set(x + 8, y + 2, TILE.DOOR_CLOSED); this.set(x + 8, y + 3, TILE.DOOR_CLOSED);
    this.set(x - 3, y + 3, TILE.WORKBENCH); this.set(x + 1, y + 3, TILE.CHAIR); this.set(x + 3, y - 4, TILE.TORCH);
    this.set(x - 2, y - 5, TILE.TABLE);
    this.placeChest(x + this.rng.int(-4, 4), y + 3, loot, true);
    if (Math.random() < .4) this.set(x - 6, y + 3, TILE.FURNACE);
    if (Math.random() < .35) this.set(x + 6, y + 3, TILE.ANVIL);
  }
  makeHell() {
    const W = this.w, H = this.h, r = this.rng;
    for (let x = 0; x < W; x++) {
      for (let y = HELL_LEVEL; y < this.h; y++) {
        let t = this.get(x, y);
        if (t === TILE.AIR) continue;
        if (y < HELL_LEVEL + 20) { if (r.chance(.2)) this.set(x, y, TILE.ASH_GRASS); else this.set(x, y, TILE.ASH); }
        else this.set(x, y, TILE.ASH);
        if (r.chance(.012) && y > HELL_LEVEL + 5) this.set(x, y, TILE.HELLSTONE);
        if (r.chance(.01) && y > HELL_LEVEL + 30) this.set(x, y, TILE.LAVA_ROCK);
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = r.int(100, W - 100), y = r.int(HELL_LEVEL + 12, H - 40);
      for (let a = -2; a <= 2; a++) for (let b = -3; b <= 0; b++) this.set(x + a, y + b, TILE.AIR);
      this.set(x, y + 2, TILE.HELLFORGE);
      this.placeChest(x + 3, y + 2, 'hell', true);
      this.placeAltar(x - 5, y);
    }
    for (let i = 0; i < 8; i++) {
      const x = r.int(80, W - 80), y = r.int(HELL_LEVEL + 8, H - 30);
      for (let a = -4; a <= 4; a++) for (let b = -1; b <= 1; b++) if (this.inBounds(x + a, y + b)) this.set(x + a, y + b, TILE.LAVA);
    }
  }
  flattenSpawn() {
    const sx = this.spawnX;
    const sy = SURFACE_BASE;
    for (let x = sx - 28; x <= sx + 28; x++) {
      for (let y = 0; y < this.h; y++) {
        if (y < sy) { if (this.get(x, y) !== TILE.AIR) this.set(x, y, TILE.AIR); this.setWall(x, y, 0); }
        else if (y === sy) this.set(x, y, TILE.GRASS);
        else if (y < sy + 8) { if (!TILES[this.get(x, y)].solid) this.set(x, y, TILE.DIRT); }
      }
      this.surface[x] = sy;
      this.setWall(x, sy, 0);
    }
    for (let x = sx - 28; x <= sx + 28; x++) {
      for (let y = sy - 1; y > sy - 40; y--) if (this.solid(x, y) || this.get(x, y) === TILE.WATER) this.set(x, y, TILE.AIR);
      for (let y = sy + 1; y < sy + 5; y++) if (this.get(x, y) === TILE.AIR) this.set(x, y, TILE.DIRT);
    }
    this.spawnY = sy;
  }
  makeSpawnHouse() {
    const sx = this.spawnX, sy = this.surface[sx];
    const x0 = sx - 18, y0 = sy - 1;
    const w = 17, h = 8;
    for (let x = x0; x <= x0 + w; x++) for (let y = y0 - h; y <= y0; y++) { this.set(x, y, TILE.AIR); this.setWall(x, y, WALL.WOOD); }
    for (let x = x0; x <= x0 + w; x++) { this.set(x, y0, TILE.WOOD); this.set(x, y0 - h, TILE.WOOD); }
    for (let y = y0 - h; y <= y0; y++) { this.set(x0, y, TILE.WOOD); this.set(x0 + w, y, TILE.WOOD); }
    /* door at right */
    this.set(x0 + w, y0 - 2, TILE.DOOR_CLOSED); this.set(x0 + w, y0 - 1, TILE.DOOR_CLOSED);
    /* windows */
    this.set(x0 + 4, y0 - 5, TILE.GLASS); this.set(x0 + 5, y0 - 5, TILE.GLASS);
    this.set(x0 + 12, y0 - 5, TILE.GLASS); this.set(x0 + 13, y0 - 5, TILE.GLASS);
    /* furniture */
    this.set(x0 + 3, y0 - 1, TILE.TABLE); this.set(x0 + 6, y0 - 1, TILE.CHAIR);
    this.set(x0 + 10, y0 - 1, TILE.WORKBENCH); this.set(x0 + 2, y0 - 3, TILE.TORCH);
    this.set(x0 + 14, y0 - 3, TILE.TORCH); this.set(x0 + 9, y0 - 3, TILE.LANTERN);
    this.set(x0 + 14, y0 - 1, TILE.BED); this.set(x0 + 13, y0 - 1, TILE.BED);
    const chest = this.placeChest(x0 + 8, y0 - 1, 'surface', true);
    if (chest) {
      chest.items[0] = { id: 'copperShortsword', count: 1 };
      chest.items[1] = { id: 'copperPickaxe', count: 1 };
      chest.items[2] = { id: 'copperAxe', count: 1 };
      chest.items[3] = { id: 'torch', count: 15 };
      chest.items[4] = { id: 'lesserHealingPotion', count: 3 };
      chest.items[5] = { id: 'wood', count: 36 };
    }
    this.house = { x0, y0: y0 - h, x1: x0 + w, y1: y0, doorX: x0 + w, doorY: y0 - 2 };
    /* path */
    for (let x = x0 + w + 1; x <= x0 + w + 12; x++) this.surface[x] = sy;
  }
  addCaveDecor() {
    const r = this.rng, W = this.w, T = TILE;
    let torches = 0, pots = 0, glow = 0, crystals = 0;
    /* Walk real cave floors instead of sampling blindly into solid rock. */
    for (let x = 4; x < W - 4; x++) {
      for (let y = ROCK_LEVEL; y < HELL_LEVEL - 18; y++) {
        if (this.get(x, y) !== T.AIR || !this.solid(x, y + 1) || this.get(x, y - 1) !== T.AIR) continue;
        if (this.inDungeon(x, y)) continue;
        const h = U.hash2(x * 13 + this.seed, y * 7 + 19);
        if (h < .016 && torches < 260) { this.set(x, y, T.TORCH); torches++; }
        else if (h < .024 && pots < 150) { this.set(x, y, T.POT); pots++; }
        else if (h < .035 && glow < 230) { this.set(x, y, T.GLOW_MUSHROOM); glow++; }
        else if (h < .0375 && crystals < 34 && y > ROCK_LEVEL + 30) { this.set(x, y, T.LIFE_CRYSTAL); crystals++; }
      }
    }
    /* A little man-made ruin clutter in the dungeon rooms and corridors. */
    if (this.dungeon) {
      for (const [rx, ry, rw, rh] of (this.dungeon.rooms || [])) {
        this.set(rx + 3, ry + rh, T.TORCH);
        this.set(rx + rw - 3, ry + rh, T.TORCH);
        if (r.chance(.65)) this.set(rx + 2, ry + rh, T.BOOKSHELF);
        if (r.chance(.45)) this.set(rx + 6, ry + rh, T.TABLE);
        if (r.chance(.45)) this.set(rx + 7, ry + rh, T.CHAIR);
        if (r.chance(.5)) this.set(rx + r.int(9, rw - 3), ry + rh, T.POT);
      }
      for (let x = this.dungeon.x0 + 6; x < this.dungeon.x1 - 6; x += 11) {
        const sy = this.findSurface(x);
        if (sy > this.dungeon.y0 && sy < this.dungeon.y1) this.set(x, sy - 1, T.TORCH);
      }
    }
    this.decorCount = { torches, pots, glow, crystals };
  }
  addSurfaceLitter() {
    const r = this.rng, W = this.w;
    for (let x = 20; x < W - 20; x++) {
      const bio = this.biomeAt(x), sy = this.surface[x];
      if (this.get(x, sy) === TILE.AIR) continue;
      if (bio === 'forest' && r.chance(.12)) this.set(x, sy - 1, r.chance(.2) ? TILE.MUSHROOM : TILE.HERB);
      if (bio === 'jungle' && r.chance(.15)) { this.set(x, sy - 1, TILE.HERB); if (r.chance(.4)) this.set(x, sy - 2, TILE.GLOW_MUSHROOM); }
      if (bio === 'snow' && r.chance(.05)) this.set(x, sy - 1, TILE.HERB);
      if ((bio === 'corruption' || bio === 'crimson') && r.chance(.08)) this.set(x, sy - 1, TILE.THORN);
      if (bio === 'desert' && r.chance(.02)) this.set(x, sy - 1, TILE.CACTUS);
      if (r.chance(.008)) this.set(x, sy - 1, TILE.POT);
      if (r.chance(.004)) this.set(x, sy - 1, TILE.LIFE_CRYSTAL);
    }
    /* chests on surface */
    for (let i = 0; i < 18; i++) {
      const x = r.int(160, W - 160), sy = this.surface[x];
      if (this.get(x, sy - 1) === TILE.AIR && !this.solid(x, sy - 1)) this.placeChest(x, sy - 1, r.chance(.15) ? 'gold' : 'surface', true);
    }
    /* underground life crystals, pots, chests */
    for (let i = 0; i < 90; i++) {
      const x = r.int(40, W - 40), y = r.int(ROCK_LEVEL, HELL_LEVEL - 20);
      if (this.get(x, y) === TILE.AIR && this.solid(x, y + 1)) this.set(x, y, TILE.LIFE_CRYSTAL);
    }
    for (let i = 0; i < 140; i++) {
      const x = r.int(30, W - 30), y = r.int(ROCK_LEVEL, HELL_LEVEL);
      if (this.get(x, y) === TILE.AIR && this.solid(x, y + 1)) this.set(x, y, TILE.POT);
    }
    for (let i = 0; i < 55; i++) {
      const x = r.int(30, W - 30), y = r.int(ROCK_LEVEL, HELL_LEVEL - 20);
      if (this.get(x, y) === TILE.AIR && this.solid(x, y + 1)) this.placeChest(x, y, y > CAVERN_LEVEL + 60 ? 'gold' : 'underground', true, .5);
    }
    /* cobwebs */
    for (let i = 0; i < 1200; i++) {
      const x = r.int(20, W - 20), y = r.int(ROCK_LEVEL - 20, HELL_LEVEL);
      if (this.get(x, y) === TILE.AIR) this.set(x, y, TILE.COBWEB);
    }
    /* dungeon traps */
    if (this.dungeon) for (let i = 0; i < 25; i++) {
      const d = this.dungeon, x = r.int(d.x0 + 5, d.x1 - 5), y = r.int(d.y0 + 10, d.y1 - 5);
      if (this.get(x, y) === TILE.AIR && this.solid(x, y + 1)) this.set(x, y, r.chance(.5) ? TILE.DART_TRAP : TILE.SPIKE);
    }
  }
  placeTreesSurface() {}
  placeTrees() {
    const r = this.rng, W = this.w;
    for (let x = 35; x < W - 35; x += r.int(2, 6)) {
      const bio = this.biomeAt(x), sy = this.surface[x];
      if (Math.abs(x - this.spawnX) < 20) continue;
      if (this.house && x > this.house.x0 - 4 && x < this.house.x1 + 4) continue;
      if (this.get(x, sy) === TILE.AIR || this.get(x, sy - 1) !== TILE.AIR) continue;
      let chance = 0, kind = 'forest';
      if (bio === 'forest') { chance = .48; kind = 'forest'; }
      else if (bio === 'snow') { chance = .52; kind = 'snow'; }
      else if (bio === 'jungle') { chance = .46; kind = 'jungle'; }
      else if (bio === 'corruption' || bio === 'crimson') { chance = .28; kind = this.evil === 'crimson' ? 'crimson' : 'corrupt'; }
      else if (bio === 'beach') { chance = .15; kind = 'palm'; }
      else if (bio === 'desert') { chance = .015; kind = 'palm'; }
      if (r.chance(chance)) {
        const variant = r.int(0, 3), stage = r.float(.72, 1.15);
        const t = { x, y: sy, kind, variant, stage, hp: 2 + Math.round(stage * 3), chopped: false, id: this.trees.length };
        this.trees.push(t);
        const gx = Math.floor(x / 8);
        if (!this.treeGrid.has(gx)) this.treeGrid.set(gx, []);
        this.treeGrid.get(gx).push(t);
      }
    }
    /* Guarantee a small grove around the starting house so the first screen is alive. */
    const near = [-46, -34, -22, 22, 34, 46];
    for (const dx of near) {
      const x = this.spawnX + dx;
      if (x < 36 || x >= W - 36) continue;
      if (this.house && x > this.house.x0 - 3 && x < this.house.x1 + 3) continue;
      if (this.trees.some(t => t.x === x)) continue;
      const sy = this.surface[x];
      if (this.get(x, sy) === TILE.AIR || this.get(x, sy - 1) !== TILE.AIR) continue;
      const bio = this.biomeAt(x);
      if (bio !== 'forest' && bio !== 'snow' && bio !== 'jungle' && bio !== 'beach') continue;
      const kind = bio === 'snow' ? 'snow' : bio === 'jungle' ? 'jungle' : bio === 'beach' ? 'palm' : 'forest';
      const variant = Math.abs(dx) % 4, stage = .9 + Math.abs(dx) % 3 * .08;
      const t = { x, y: sy, kind, variant, stage, hp: 2 + Math.round(stage * 3), chopped: false, id: this.trees.length };
      this.trees.push(t);
      const gx = Math.floor(x / 8);
      if (!this.treeGrid.has(gx)) this.treeGrid.set(gx, []);
      this.treeGrid.get(gx).push(t);
    }
  }
  finishWalls() {
    /* walls already filled; add a little erosion for organic cave edges */
    const W = this.w;
    for (let x = 12; x < W - 12; x += 3) {
      const sy = this.surface[x];
      for (let y = sy + 5; y < HELL_LEVEL; y += 2) {
        if (this.get(x, y) === TILE.AIR && !this.getWall(x, y)) {
          const n = U.fbm2(this.seed + 44, x * .05, y * .05, 2);
          if (n > .45) this.setWall(x, y, y < ROCK_LEVEL + 40 ? WALL.DIRT : WALL.STONE);
        }
      }
    }
  }
  wallAt(x, y) { return this.getWall(x, y); }
  findSurface(x) {
    x = U.clamp(Math.floor(x), 0, this.w - 1);
    for (let y = 80; y < this.h; y++) {
      if (this.solid(x, y)) return y;
    }
    return this.surface[x];
  }
  safeY(x, y) {
    for (let yy = y; yy > 30; yy--) if (!this.solid(x, yy) && !this.solid(x, yy - 1)) return yy;
    return y;
  }
  /* ---------------------------------------------------------------- chests */
  placeChest(x, y, pool = 'surface', fill = true, chance = 1) {
    if (!this.inBounds(x, y)) return null;
    let yy = y;
    if (!this.solid(x, yy + 1)) {
      let found = false;
      for (let k = 0; k < 12; k++) { if (this.solid(x, yy + k + 1)) { yy += k; found = true; break; } }
      if (!found) return null;
    }
    if (this.get(x, yy) !== TILE.AIR) return null;
    this.set(x, yy, TILE.CHEST);
    const ch = { x, y: yy, items: new Array(20).fill(null) };
    this.chests.set(x + ',' + yy, ch);
    if (fill && this.rng.chance(chance)) this.fillChest(ch, pool, this.rng, false);
    return ch;
  }
  chestAt(x, y) { return this.chests.get(x + ',' + y) || null; }
  fillChest(ch, pool, rng = this.rng, guaranteed = false) {
    const table = CHEST_LOOT[pool] || CHEST_LOOT.surface;
    const n = guaranteed ? rng.int(4, 7) : rng.int(2, 4);
    const picked = new Set();
    for (let i = 0; i < n; i++) {
      const entry = rng.pick(table);
      if (!entry || picked.has(entry[0])) continue;
      picked.add(entry[0]);
      const count = rng.int(entry[1], entry[2]);
      if (ITEMS[entry[0]]) ch.items[i] = { id: entry[0], count };
    }
    if (rng.chance(.65)) {
      const coin = rng.chance(.1) ? 'coinGold' : rng.chance(.4) ? 'coinSilver' : 'coinCopper';
      ch.items[n] = { id: coin, count: rng.int(1, coin === 'coinGold' ? 8 : 60) };
    }
  }
  /* ---------------------------------------------------------------- trees */
  treeAtPixel(px, py) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    for (let gx = Math.floor(tx / 8) - 1; gx <= Math.floor(tx / 8) + 1; gx++) {
      const list = this.treeGrid.get(gx);
      if (!list) continue;
      for (const t of list) {
        if (t.chopped) continue;
        const dx = Math.abs(px - (t.x * TS + 8));
        if (dx < 14 && py > (t.y - 8) * TS && py < (t.y + 1) * TS) return t;
      }
    }
    return null;
  }
  cutTree(t, damage = 1) {
    if (!t || t.chopped) return null;
    t.hp -= damage;
    if (t.hp <= 0) {
      t.chopped = true;
      return { chopped: true, x: t.x * TS + 8, y: (t.y - 2) * TS, wood: 4 + Math.round(t.stage * 5), kind: t.kind };
    }
    return { hit: true, x: t.x * TS + 8, y: (t.y - 2) * TS };
  }
  /* ---------------------------------------------------------------- hardmode & events */
  hardmodeOres(announce = true) {
    const r = this.rng;
    for (let i = 0; i < 260; i++) {
      const x = r.int(50, this.w - 50), y = r.int(ROCK_LEVEL + 30, HELL_LEVEL - 20);
      this.oreVein(x, y, TILE.COBALT_ORE, r.int(3, 7), TILE.STONE);
    }
    for (let i = 0; i < 190; i++) {
      const x = r.int(50, this.w - 50), y = r.int(CAVERN_LEVEL, HELL_LEVEL - 20);
      this.oreVein(x, y, TILE.MYTHRIL_ORE, r.int(3, 6), TILE.DEEP_STONE);
    }
    for (let i = 0; i < 120; i++) {
      const x = r.int(50, this.w - 50), y = r.int(CAVERN_LEVEL + 50, HELL_LEVEL - 20);
      this.oreVein(x, y, TILE.ADAMANTITE_ORE, r.int(2, 5), TILE.DEEP_STONE);
    }
    this.hardmode = true;
  }
  meteorLanding() {
    const r = this.rng;
    const x = r.int(300, this.w - 300), sy = this.surface[x];
    for (let a = -16; a <= 16; a++) for (let b = -8; b <= 12; b++) {
      if (a * a + b * b * 3 < 220) {
        const yy = sy + b;
        if (this.inBounds(x + a, yy)) { this.set(x + a, yy, b > 5 && r.chance(.7) ? TILE.METEORITE : TILE.AIR); this.setWall(x + a, yy, 0); }
      }
    }
    return { x, y: sy };
  }
  spreadHallowed() {
    const r = this.rng;
    for (let x = 0; x < this.w; x += 2) {
      const bio = this.biomeAt(x);
      if (bio !== 'forest' && bio !== 'snow') continue;
      if (!r.chance(.035)) continue;
      for (let y = Math.max(0, this.surface[x] - 2); y < this.surface[x] + 80; y++) {
        const t = this.get(x, y);
        if (t === TILE.DIRT || t === TILE.GRASS) this.set(x, y, y === this.surface[x] ? TILE.HALLOW_GRASS : TILE.PEARLSTONE);
      }
    }
  }
  /* ---------------------------------------------------------------- serialization */
  serialize() {
    const enc = (arr) => {
      const out = new Uint8Array(arr.length * 2 + 16);
      let o = 0, i = 0;
      while (i < arr.length) {
        const v = arr[i]; let n = 1;
        while (i + n < arr.length && arr[i + n] === v && n < 255) n++;
        out[o++] = v; out[o++] = n; i += n;
      }
      const sub = out.subarray(0, o);
      let s = ''; for (let k = 0; k < sub.length; k++) s += String.fromCharCode(sub[k]);
      return btoa(s);
    };
    const chests = [];
    for (const c of this.chests.values()) chests.push({ x: c.x, y: c.y, items: c.items });
    return {
      seedStr: this.seedStr, version: 2, hardmode: this.hardmode,
      evil: this.evil || 'corruption',
      tiles: enc(this.tiles), walls: enc(this.walls),
      chests, trees: this.trees.map(t => ({ x: t.x, y: t.y, kind: t.kind, variant: t.variant, stage: t.stage, chopped: t.chopped, hp: t.hp })),
      spawnX: this.spawnX, spawnY: this.spawnY, orbs: this.orbs, altars: this.altars, house: this.house,
      dungeon: this.dungeon, biomes: this.biomes
    };
  }
  static deserialize(data) {
    const w = Object.create(World.prototype);
    w.seedStr = data.seedStr; w.seed = U.hashStr(data.seedStr) >>> 0; w.rng = new U.RNG(w.seed);
    w.w = WORLD_W; w.h = WORLD_H;
    const dec = (s) => {
      const raw = atob(s), out = new Uint8Array(w.w * w.h); let o = 0;
      for (let i = 0; i + 1 < raw.length; i += 2) {
        const v = raw.charCodeAt(i), n = raw.charCodeAt(i + 1);
        for (let k = 0; k < n && o < out.length; k++) out[o++] = v;
      }
      return out;
    };
    w.tiles = dec(data.tiles); w.walls = dec(data.walls);
    w.surface = new Int16Array(w.w);
    w.chests = new Map(); w.trees = []; w.treeGrid = new Map(); w.decor = [];
    w.hardmode = !!data.hardmode; w.spawnX = data.spawnX; w.spawnY = data.spawnY;
    w.evil = data.evil === 'crimson' ? 'crimson' : 'corruption';
    w._crimsonBiome = Object.assign({}, BIOME_INFO.corruption, { name: 'The Crimson' });
    w.orbs = data.orbs || []; w.altars = data.altars || []; w.house = data.house; w.dungeon = data.dungeon;
    w.biomes = data.biomes || []; w.opts = {};
    for (const c of data.chests || []) w.chests.set(c.x + ',' + c.y, c);
    for (const t of data.trees || []) { w.trees.push(t); const gx = Math.floor(t.x / 8); if (!w.treeGrid.has(gx)) w.treeGrid.set(gx, []); w.treeGrid.get(gx).push(t); }
    for (let x = 0; x < w.w; x++) { let y = 60; while (y < w.h && !w.solid(x, y)) y++; w.surface[x] = y; }
    return w;
  }
}
window.TS = TS; window.WORLD_W = WORLD_W; window.WORLD_H = WORLD_H;
window.SEA_LEVEL = SEA_LEVEL; window.ROCK_LEVEL = ROCK_LEVEL; window.CAVERN_LEVEL = CAVERN_LEVEL; window.HELL_LEVEL = HELL_LEVEL;
window.BIOME_INFO = BIOME_INFO; window.World = World;
