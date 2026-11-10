'use strict';
/* ---------------------------------------------------------------------------------------------
   Game data: tiles, walls, items, recipes, enemies, bosses, NPCs and loot.
   All content ids are stable strings (items) or integer constants (tiles) for save compatibility.
------------------------------------------------------------------------------------------------- */

const TILE = Object.freeze({
  AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, SAND: 4, SANDSTONE: 5, SNOW: 6, ICE: 7,
  MUD: 8, JUNGLE_GRASS: 9, EBONSTONE: 10, CORRUPT_GRASS: 11, ASH: 12, HELLSTONE: 13,
  CLAY: 14, WOOD: 15, BOREAL_WOOD: 16, MAHOGANY: 17, EBONWOOD: 18, GLASS: 19,
  GRAY_BRICK: 20, RED_BRICK: 21, COBWEB: 22, WATER: 23, LAVA: 24, ROPE: 25, VINE: 26,
  DOOR_CLOSED: 27, DOOR_OPEN: 28, TABLE: 29, CHAIR: 30, WORKBENCH: 31, FURNACE: 32,
  ANVIL: 33, CHEST: 34, GOLD_CHEST: 35, POT: 36, MUSHROOM: 37, GLOW_MUSHROOM: 38,
  LIFE_CRYSTAL: 39, ALTAR: 40, TORCH: 41, CAMPFIRE: 42, SAPLING: 43,
  CACTUS: 44, CORAL: 45, BED: 46, LOOM: 47, ALCHEMY_TABLE: 48, OBSIDIAN: 49,
  METEORITE: 50, SILT: 51, HIVE: 52, HONEY_BLOCK: 53, LARVA: 54, DUNGEON_BRICK: 55,
  SPIKE: 56, PRESSURE_PLATE: 57, DART_TRAP: 58, GOLD_BRICK: 59, SILVER_BRICK: 60,
  COPPER_BRICK: 61, BONE_BLOCK: 62, MARBLE: 63, GRANITE: 64, CLOUD: 65, LIVING_WOOD: 66,
  WOOD_PLATFORM: 67, STONE_PLATFORM: 68, BOREAL_PLATFORM: 69, MAHOGANY_PLATFORM: 70,
  DUNGEON_PLATFORM: 71, HELLFORGE: 72, BOOKSHELF: 73, LANTERN: 74, CANDLE: 75,
  PLANTER_BOX: 76, HERB: 77, THORN: 78, SHADOW_ORB: 79, CRIMSON_HEART: 80,
  ASH_GRASS: 81, PEARLSTONE: 82, HALLOW_GRASS: 83, COBALT_ORE: 84, MYTHRIL_ORE: 85,
  ADAMANTITE_ORE: 86, HELLSTONE_BRICK: 87, ICE_BRICK: 88, SNOW_BRICK: 89,
  CRYSTAL_BLOCK: 90, PINK_ICE: 91, JUNGLE_VINE: 92, WEB_ROPE: 93, BEE_HIVE: 94,
  LAVA_ROCK: 95, MUSHROOM_GRASS: 96, DEEP_STONE: 97, TREASURE_BRICK: 98,
  BOSS_TROPHY: 99, FLAG: 100, GRAVE: 101, BARREL: 102, ANVIL2: 103, TOMBSTONE: 104,
  COPPER_ORE: 105, TIN_ORE: 106, IRON_ORE: 107, LEAD_ORE: 108, SILVER_ORE: 109,
  TUNGSTEN_ORE: 110, GOLD_ORE: 111, PLATINUM_ORE: 112, DEMONITE_ORE: 113,
  CRIMSTONE: 114, CRIMSON_GRASS: 115
});

const WALL = Object.freeze({
  NONE: 0, DIRT: 1, STONE: 2, WOOD: 3, BRICK: 4, SANDSTONE: 5, SNOW: 6, MUD: 7,
  EBONSTONE: 8, DUNGEON: 9, GLASS: 10, HIVE: 11, ASH: 12, LIVING_WOOD: 13,
  MARBLE: 14, GRANITE: 15, HALLOW: 16, PEARLSTONE: 17, HELLSTONE: 18, CAVE: 19,
  WOOD_PANEL: 20, STONE_PANEL: 21, GOLD_BRICK: 22, CRYSTAL: 23, CRIMSTONE: 24
});

/* Tile definitions.  `hp` is seconds of copper-pickaxe mining; `tier` is pickaxe level needed. */
const TILES = [];
function tile(id, o) { TILES[id] = Object.assign({ id, name: 'Tile', solid: false, hp: 0.45, tier: 0, tool: 'pick', drop: null, light: 0, lightColor: '#ffffff', texture: 'noise', color: '#71533a', topColor: null, deco: false }, o); }
tile(TILE.AIR, { name: 'Air', solid: false, hp: 0, color: '#000', texture: 'none' });
tile(TILE.DIRT, { name: 'Dirt Block', solid: true, hp: 0.42, drop: 'dirtBlock', color: '#8a5c3b', texture: 'dirt' });
tile(TILE.GRASS, { name: 'Grass', solid: true, hp: 0.38, drop: 'dirtBlock', color: '#4e9b3d', topColor: '#6fc64e', texture: 'grass' });
tile(TILE.STONE, { name: 'Stone Block', solid: true, hp: 0.8, drop: 'stoneBlock', color: '#6f737c', texture: 'stone' });
tile(TILE.SAND, { name: 'Sand Block', solid: true, hp: 0.36, drop: 'sandBlock', color: '#d8b56c', texture: 'sand' });
tile(TILE.SANDSTONE, { name: 'Sandstone', solid: true, hp: 0.9, drop: 'sandstoneBlock', color: '#bf934f', texture: 'brick' });
tile(TILE.SNOW, { name: 'Snow Block', solid: true, hp: 0.35, drop: 'snowBlock', color: '#dce8ee', topColor: '#ffffff', texture: 'snow' });
tile(TILE.ICE, { name: 'Ice Block', solid: true, hp: 0.6, drop: 'iceBlock', color: '#9bc9dc', texture: 'ice' });
tile(TILE.MUD, { name: 'Mud Block', solid: true, hp: 0.5, drop: 'mudBlock', color: '#6a4d3a', texture: 'dirt' });
tile(TILE.JUNGLE_GRASS, { name: 'Jungle Grass', solid: true, hp: 0.4, drop: 'mudBlock', color: '#4f7f31', topColor: '#74b23f', texture: 'grass' });
tile(TILE.EBONSTONE, { name: 'Ebonstone', solid: true, hp: 1.5, tier: 1, drop: 'ebonstoneBlock', color: '#4c3b5f', texture: 'stone' });
tile(TILE.CORRUPT_GRASS, { name: 'Corrupt Grass', solid: true, hp: 0.4, drop: 'ebonstoneBlock', color: '#4b3c5b', topColor: '#735a8a', texture: 'grass' });
tile(TILE.ASH, { name: 'Ash Block', solid: true, hp: 0.55, drop: 'ashBlock', color: '#5a4b49', texture: 'ash' });
tile(TILE.HELLSTONE, { name: 'Hellstone', solid: true, hp: 2.8, tier: 2, drop: 'hellstoneOre', color: '#8c3c22', texture: 'ore', glow: true, light: 3, lightColor: '#ff7a35', burn: true });
tile(TILE.CLAY, { name: 'Clay Block', solid: true, hp: 0.5, drop: 'clayBlock', color: '#976d5e', texture: 'dirt' });
tile(TILE.WOOD, { name: 'Wood Block', solid: true, hp: 0.5, drop: 'woodBlock', color: '#9e693d', texture: 'wood' });
tile(TILE.BOREAL_WOOD, { name: 'Boreal Wood', solid: true, hp: 0.5, drop: 'borealWood', color: '#8d7565', texture: 'wood' });
tile(TILE.MAHOGANY, { name: 'Rich Mahogany', solid: true, hp: 0.55, drop: 'mahogany', color: '#8f4632', texture: 'wood' });
tile(TILE.EBONWOOD, { name: 'Ebonwood', solid: true, hp: 0.55, drop: 'ebonwood', color: '#4a3847', texture: 'wood' });
tile(TILE.GLASS, { name: 'Glass', solid: true, hp: 0.35, drop: 'glassBlock', color: '#a7d9e8', texture: 'glass', transparent: true });
tile(TILE.GRAY_BRICK, { name: 'Gray Brick', solid: true, hp: 0.75, drop: 'grayBrick', color: '#777d86', texture: 'brick' });
tile(TILE.RED_BRICK, { name: 'Red Brick', solid: true, hp: 0.75, drop: 'redBrick', color: '#9d4b44', texture: 'brick' });
tile(TILE.COBWEB, { name: 'Cobweb', solid: false, hp: 0.1, tool: 'any', drop: 'cobweb', color: '#c9ccd1', texture: 'web', web: true, deco: true });
tile(TILE.WATER, { name: 'Water', solid: false, hp: 0, liquid: 'water', color: '#2c6a97', texture: 'liquid' });
tile(TILE.LAVA, { name: 'Lava', solid: false, hp: 0, liquid: 'lava', color: '#dd5c24', light: 8, lightColor: '#ff8b3d', texture: 'liquid' });
tile(TILE.ROPE, { name: 'Rope', solid: false, hp: 0.12, drop: 'rope', color: '#c9a775', texture: 'rope', climb: true, deco: true });
tile(TILE.VINE, { name: 'Vine', solid: false, hp: 0.12, drop: null, color: '#4e8a35', texture: 'vine', climb: true, deco: true });
tile(TILE.DOOR_CLOSED, { name: 'Door', solid: true, hp: 0.4, drop: 'woodDoor', color: '#8b5d34', texture: 'door', furniture: true });
tile(TILE.DOOR_OPEN, { name: 'Door', solid: false, hp: 0.4, drop: 'woodDoor', color: '#8b5d34', texture: 'doorOpen', furniture: true, deco: true });
tile(TILE.TABLE, { name: 'Table', solid: false, hp: 0.4, drop: 'table', color: '#9e6b3b', texture: 'table', furniture: true });
tile(TILE.CHAIR, { name: 'Chair', solid: false, hp: 0.4, drop: 'chair', color: '#9e6b3b', texture: 'chair', furniture: true });
tile(TILE.WORKBENCH, { name: 'Work Bench', solid: false, hp: 0.4, drop: 'workbench', color: '#a27240', texture: 'workbench', furniture: true });
tile(TILE.FURNACE, { name: 'Furnace', solid: false, hp: 0.6, drop: 'furnace', color: '#77706d', texture: 'furnace', furniture: true, light: 5, lightColor: '#ff9f4c' });
tile(TILE.ANVIL, { name: 'Iron Anvil', solid: false, hp: 0.7, drop: 'anvil', color: '#6d737c', texture: 'anvil', furniture: true });
tile(TILE.CHEST, { name: 'Chest', solid: false, hp: 0.35, drop: 'chest', color: '#9b6539', texture: 'chest', furniture: true, interact: 'chest' });
tile(TILE.GOLD_CHEST, { name: 'Golden Chest', solid: false, hp: 0.5, drop: 'chest', color: '#d4ad4d', texture: 'goldChest', furniture: true, interact: 'chest' });
tile(TILE.POT, { name: 'Pot', solid: false, hp: 0.1, tool: 'any', color: '#a26043', texture: 'pot', furniture: true, interact: 'pot' });
tile(TILE.MUSHROOM, { name: 'Mushroom', solid: false, hp: 0.05, tool: 'any', drop: 'mushroom', color: '#cf6d65', texture: 'mushroom', deco: true });
tile(TILE.GLOW_MUSHROOM, { name: 'Glowing Mushroom', solid: false, hp: 0.05, tool: 'any', drop: 'glowMushroom', color: '#54c9e8', texture: 'glowMushroom', deco: true, light: 4, lightColor: '#57d6ee' });
tile(TILE.LIFE_CRYSTAL, { name: 'Life Crystal', solid: false, hp: 0.8, drop: 'lifeCrystal', color: '#e8688c', texture: 'lifeCrystal', furniture: true, light: 5, lightColor: '#ff6b9e', interact: 'life' });
tile(TILE.ALTAR, { name: 'Demon Altar', solid: false, hp: 999, tier: 99, color: '#5b313d', texture: 'altar', furniture: true, light: 3, lightColor: '#a33b5b' });
tile(TILE.TORCH, { name: 'Torch', solid: false, hp: 0.04, tool: 'any', drop: 'torch', color: '#cf9c48', texture: 'torch', light: 9, lightColor: '#ffc267', deco: true });
tile(TILE.CAMPFIRE, { name: 'Campfire', solid: false, hp: 0.2, tool: 'hammer', drop: 'campfire', color: '#c37635', texture: 'campfire', light: 9, lightColor: '#ff9e45', furniture: true });
tile(TILE.SAPLING, { name: 'Sapling', solid: false, hp: 0.04, tool: 'any', color: '#6ca548', texture: 'sapling', deco: true });
tile(TILE.CACTUS, { name: 'Cactus', solid: false, hp: 0.3, tool: 'axe', drop: 'cactus', color: '#4d8a4f', texture: 'cactus', deco: true });
tile(TILE.CORAL, { name: 'Coral', solid: false, hp: 0.1, tool: 'any', drop: 'coral', color: '#dd7d85', texture: 'coral', deco: true });
tile(TILE.BED, { name: 'Bed', solid: false, hp: 0.5, drop: 'bed', color: '#ad4d51', texture: 'bed', furniture: true, interact: 'bed' });
tile(TILE.LOOM, { name: 'Loom', solid: false, hp: 0.6, drop: 'loom', color: '#8f6339', texture: 'loom', furniture: true });
tile(TILE.ALCHEMY_TABLE, { name: 'Alchemy Table', solid: false, hp: 0.6, drop: 'alchemyTable', color: '#5e4766', texture: 'alchemy', furniture: true, light: 2, lightColor: '#a0dc75' });
tile(TILE.OBSIDIAN, { name: 'Obsidian', solid: true, hp: 1.4, tier: 1, drop: 'obsidian', color: '#3a304a', texture: 'obsidian' });
tile(TILE.METEORITE, { name: 'Meteorite', solid: true, hp: 1.6, tier: 1, drop: 'meteoriteOre', color: '#755a70', texture: 'ore', glow: true, light: 2, lightColor: '#ff9c72', burn: true });
tile(TILE.SILT, { name: 'Silt', solid: true, hp: 0.3, drop: 'siltBlock', color: '#68625a', texture: 'sand' });
tile(TILE.HIVE, { name: 'Hive', solid: true, hp: 0.7, drop: 'hiveBlock', color: '#c09540', texture: 'honey' });
tile(TILE.HONEY_BLOCK, { name: 'Honey Block', solid: true, hp: 0.4, drop: 'honeyBlock', color: '#e7b541', texture: 'honey' });
tile(TILE.LARVA, { name: 'Bee Larva', solid: false, hp: 0.15, tool: 'any', color: '#e8d18b', texture: 'larva', deco: true, light: 2, lightColor: '#ffd96a' });
tile(TILE.DUNGEON_BRICK, { name: 'Dungeon Brick', solid: true, hp: 1.3, tier: 2, drop: 'dungeonBrick', color: '#3e4c6a', texture: 'brick' });
tile(TILE.SPIKE, { name: 'Spike', solid: false, hp: 0.3, tool: 'hammer', drop: 'spike', color: '#9399a7', texture: 'spikes', deco: true, damage: 20 });
tile(TILE.PRESSURE_PLATE, { name: 'Pressure Plate', solid: false, hp: 0.1, drop: 'pressurePlate', color: '#a08d6e', texture: 'plate', furniture: true });
tile(TILE.DART_TRAP, { name: 'Dart Trap', solid: true, hp: 0.8, tier: 1, drop: 'dartTrap', color: '#77777e', texture: 'trap', furniture: true });
tile(TILE.GOLD_BRICK, { name: 'Gold Brick', solid: true, hp: 0.9, drop: 'goldBrick', color: '#b79838', texture: 'brick' });
tile(TILE.SILVER_BRICK, { name: 'Silver Brick', solid: true, hp: 0.9, drop: 'silverBrick', color: '#929aa5', texture: 'brick' });
tile(TILE.COPPER_BRICK, { name: 'Copper Brick', solid: true, hp: 0.9, drop: 'copperBrick', color: '#a56e4c', texture: 'brick' });
tile(TILE.BONE_BLOCK, { name: 'Bone Block', solid: true, hp: 0.9, drop: 'boneBlock', color: '#c9c1a4', texture: 'brick' });
tile(TILE.MARBLE, { name: 'Marble', solid: true, hp: 0.8, drop: 'marbleBlock', color: '#c8c4bc', texture: 'stone' });
tile(TILE.GRANITE, { name: 'Granite', solid: true, hp: 0.8, drop: 'graniteBlock', color: '#675f66', texture: 'stone' });
tile(TILE.CLOUD, { name: 'Cloud', solid: false, hp: 0.12, drop: 'cloudBlock', color: '#e3e9f4', texture: 'cloud', platform: true });
tile(TILE.LIVING_WOOD, { name: 'Living Wood', solid: true, hp: 0.9, drop: 'livingWood', color: '#7b5b35', texture: 'wood' });
tile(TILE.WOOD_PLATFORM, { name: 'Wood Platform', solid: false, hp: 0.15, drop: 'woodPlatform', color: '#9e693d', texture: 'platform', platform: true, deco: true });
tile(TILE.STONE_PLATFORM, { name: 'Stone Platform', solid: false, hp: 0.25, drop: 'stonePlatform', color: '#747881', texture: 'platformStone', platform: true, deco: true });
tile(TILE.BOREAL_PLATFORM, { name: 'Boreal Platform', solid: false, hp: 0.15, drop: 'borealPlatform', color: '#8d7565', texture: 'platform', platform: true, deco: true });
tile(TILE.MAHOGANY_PLATFORM, { name: 'Mahogany Platform', solid: false, hp: 0.15, drop: 'mahoganyPlatform', color: '#8f4632', texture: 'platform', platform: true, deco: true });
tile(TILE.DUNGEON_PLATFORM, { name: 'Dungeon Platform', solid: false, hp: 0.2, drop: 'dungeonPlatform', color: '#4e5b78', texture: 'platformStone', platform: true, deco: true });
tile(TILE.HELLFORGE, { name: 'Hellforge', solid: false, hp: 1.2, tier: 1, drop: 'hellforge', color: '#7d3d2c', texture: 'hellforge', furniture: true, light: 7, lightColor: '#ff7b3c' });
tile(TILE.BOOKSHELF, { name: 'Bookshelf', solid: false, hp: 0.5, drop: 'bookshelf', color: '#8c653b', texture: 'bookshelf', furniture: true });
tile(TILE.LANTERN, { name: 'Hanging Lantern', solid: false, hp: 0.1, tool: 'hammer', drop: 'lantern', color: '#b1865b', texture: 'lantern', furniture: true, light: 7, lightColor: '#ffd38b' });
tile(TILE.CANDLE, { name: 'Candle', solid: false, hp: 0.06, tool: 'hammer', drop: 'candle', color: '#e2d29d', texture: 'candle', light: 5, lightColor: '#ffcf88', deco: true });
tile(TILE.PLANTER_BOX, { name: 'Planter Box', solid: false, hp: 0.2, drop: 'planterBox', color: '#9b6c3f', texture: 'platform', platform: true, deco: true });
tile(TILE.HERB, { name: 'Herb', solid: false, hp: 0.05, tool: 'any', drop: 'daybloom', color: '#5f9e4b', texture: 'herb', deco: true });
tile(TILE.THORN, { name: 'Thorn', solid: false, hp: 0.1, tool: 'any', color: '#6b4a70', texture: 'thorn', deco: true, damage: 8 });
tile(TILE.SHADOW_ORB, { name: 'Shadow Orb', solid: false, hp: 0.9, tier: 1, drop: null, color: '#674483', texture: 'orb', furniture: true, light: 7, lightColor: '#b45cff', interact: 'orb' });
tile(TILE.CRIMSON_HEART, { name: 'Crimson Heart', solid: false, hp: 0.9, tier: 1, drop: null, color: '#a9374b', texture: 'heart', furniture: true, light: 7, lightColor: '#ff4f68', interact: 'orb' });
tile(TILE.ASH_GRASS, { name: 'Ash Grass', solid: true, hp: 0.4, drop: 'ashBlock', color: '#665049', topColor: '#8b6a55', texture: 'grass' });
tile(TILE.PEARLSTONE, { name: 'Pearlstone', solid: true, hp: 1.2, tier: 1, drop: 'pearlstoneBlock', color: '#c8b9cd', texture: 'stone' });
tile(TILE.HALLOW_GRASS, { name: 'Hallowed Grass', solid: true, hp: 0.4, drop: 'dirtBlock', color: '#a777a6', topColor: '#f4c6ef', texture: 'grass' });
tile(TILE.COBALT_ORE, { name: 'Cobalt Ore', solid: true, hp: 1.4, tier: 1, drop: 'cobaltOre', color: '#4f86a8', texture: 'ore', glow: true, light: 1, lightColor: '#65bcff' });
tile(TILE.MYTHRIL_ORE, { name: 'Mythril Ore', solid: true, hp: 1.8, tier: 1, drop: 'mythrilOre', color: '#4e8078', texture: 'ore', glow: true, light: 1, lightColor: '#67e0c8' });
tile(TILE.ADAMANTITE_ORE, { name: 'Adamantite Ore', solid: true, hp: 2.2, tier: 2, drop: 'adamantiteOre', color: '#8c3f4f', texture: 'ore', glow: true, light: 1, lightColor: '#f05c7a' });
tile(TILE.HELLSTONE_BRICK, { name: 'Hellstone Brick', solid: true, hp: 1.5, tier: 1, drop: 'hellstoneBrick', color: '#6c3228', texture: 'brick' });
tile(TILE.ICE_BRICK, { name: 'Ice Brick', solid: true, hp: 0.8, drop: 'iceBrick', color: '#86bdd3', texture: 'brick', transparent: true });
tile(TILE.SNOW_BRICK, { name: 'Snow Brick', solid: true, hp: 0.7, drop: 'snowBrick', color: '#d6e1e9', texture: 'brick' });
tile(TILE.CRYSTAL_BLOCK, { name: 'Crystal Block', solid: true, hp: 1.1, drop: 'crystalBlock', color: '#9bd7dd', texture: 'glass', transparent: true, glow: true, light: 3, lightColor: '#a7f0ff' });
tile(TILE.PINK_ICE, { name: 'Pink Ice', solid: true, hp: 0.9, drop: 'pinkIce', color: '#e0a7c9', texture: 'ice', transparent: true });
tile(TILE.JUNGLE_VINE, { name: 'Jungle Vine', solid: false, hp: 0.12, tool: 'any', color: '#5f983f', texture: 'vine', climb: true, deco: true });
tile(TILE.WEB_ROPE, { name: 'Web Rope', solid: false, hp: 0.1, drop: 'webRope', color: '#dedde1', texture: 'rope', climb: true, deco: true });
tile(TILE.BEE_HIVE, { name: 'Bee Hive', solid: true, hp: 0.9, drop: 'hiveBlock', color: '#b98a37', texture: 'honey' });
tile(TILE.LAVA_ROCK, { name: 'Lava Rock', solid: true, hp: 1.2, tier: 1, drop: 'obsidian', color: '#5b2e26', texture: 'stone', glow: true, light: 2, lightColor: '#ff6b36' });
tile(TILE.MUSHROOM_GRASS, { name: 'Mushroom Grass', solid: true, hp: 0.4, drop: 'mudBlock', color: '#30587e', topColor: '#67c8da', texture: 'grass' });
tile(TILE.DEEP_STONE, { name: 'Deepstone', solid: true, hp: 1.2, drop: 'stoneBlock', color: '#3e4655', texture: 'stone' });
tile(TILE.TREASURE_BRICK, { name: 'Treasure Brick', solid: true, hp: 1, drop: 'goldBrick', color: '#8c7033', texture: 'brick' });
tile(TILE.BOSS_TROPHY, { name: 'Trophy', solid: false, hp: 0.5, tool: 'hammer', color: '#c39b42', texture: 'trophy', furniture: true, deco: true });
tile(TILE.FLAG, { name: 'Banner', solid: false, hp: 0.1, tool: 'any', color: '#a94848', texture: 'flag', deco: true });
tile(TILE.GRAVE, { name: 'Gravestone', solid: false, hp: 0.4, drop: 'stoneBlock', color: '#777a83', texture: 'grave', deco: true });
tile(TILE.BARREL, { name: 'Barrel', solid: false, hp: 0.2, tool: 'any', color: '#8b5d36', texture: 'barrel', furniture: true, interact: 'pot' });
tile(TILE.ANVIL2, { name: 'Lead Anvil', solid: false, hp: 0.7, drop: 'anvil', color: '#7d8492', texture: 'anvil', furniture: true });
tile(TILE.TOMBSTONE, { name: 'Tombstone', solid: false, hp: 0.4, drop: 'stoneBlock', color: '#666a75', texture: 'grave', deco: true });
tile(TILE.COPPER_ORE, { name: 'Copper Ore', solid: true, hp: 0.75, drop: 'copperOre', color: '#c2774f', texture: 'ore' });
tile(TILE.TIN_ORE, { name: 'Tin Ore', solid: true, hp: 0.75, drop: 'tinOre', color: '#cfc6a2', texture: 'ore' });
tile(TILE.IRON_ORE, { name: 'Iron Ore', solid: true, hp: 0.9, drop: 'ironOre', color: '#b4a59e', texture: 'ore' });
tile(TILE.LEAD_ORE, { name: 'Lead Ore', solid: true, hp: 0.9, drop: 'leadOre', color: '#8e95a8', texture: 'ore' });
tile(TILE.SILVER_ORE, { name: 'Silver Ore', solid: true, hp: 1.1, drop: 'silverOre', color: '#d7e0e6', texture: 'ore' });
tile(TILE.TUNGSTEN_ORE, { name: 'Tungsten Ore', solid: true, hp: 1.1, drop: 'tungstenOre', color: '#7b9a94', texture: 'ore' });
tile(TILE.GOLD_ORE, { name: 'Gold Ore', solid: true, hp: 1.3, drop: 'goldOre', color: '#e5c249', texture: 'ore' });
tile(TILE.PLATINUM_ORE, { name: 'Platinum Ore', solid: true, hp: 1.3, drop: 'platinumOre', color: '#dce8da', texture: 'ore' });
tile(TILE.DEMONITE_ORE, { name: 'Demonite Ore', solid: true, hp: 1.5, tier: 1, drop: 'demoniteOre', color: '#6f58a4', texture: 'ore', glow: true, light: 2, lightColor: '#9d74d6' });
tile(TILE.CRIMSTONE, { name: 'Crimstone', solid: true, hp: 1.5, tier: 1, drop: 'crimstoneBlock', color: '#6e2b37', texture: 'stone' });
tile(TILE.CRIMSON_GRASS, { name: 'Crimson Grass', solid: true, hp: 0.4, drop: 'crimstoneBlock', color: '#6e2b37', topColor: '#b74a58', texture: 'grass' });

const TILE_BY_NAME = {};
for (const t of TILES) if (t) TILE_BY_NAME[t.name] = t.id;

/* Wall definitions, drawn behind foreground blocks. */
const WALLS = [
  null,
  { name: 'Dirt Wall', color: '#4c3629', texture: 'dirt' },
  { name: 'Stone Wall', color: '#343842', texture: 'stone' },
  { name: 'Wood Wall', color: '#5d3f27', texture: 'wood' },
  { name: 'Brick Wall', color: '#4b3e3a', texture: 'brick' },
  { name: 'Sandstone Wall', color: '#7f623c', texture: 'brick' },
  { name: 'Snow Wall', color: '#7e929b', texture: 'snow' },
  { name: 'Mud Wall', color: '#3d2d23', texture: 'dirt' },
  { name: 'Ebonstone Wall', color: '#2d2539', texture: 'stone' },
  { name: 'Dungeon Wall', color: '#252d3d', texture: 'brick' },
  { name: 'Glass Wall', color: '#5e7b87', texture: 'glass' },
  { name: 'Hive Wall', color: '#705a2a', texture: 'honey' },
  { name: 'Ash Wall', color: '#2f2828', texture: 'ash' },
  { name: 'Living Wood Wall', color: '#3c2d1f', texture: 'wood' },
  { name: 'Marble Wall', color: '#666366', texture: 'stone' },
  { name: 'Granite Wall', color: '#302e35', texture: 'stone' },
  { name: 'Hallowed Wall', color: '#6b5b6b', texture: 'stone' },
  { name: 'Pearlstone Wall', color: '#675f6b', texture: 'stone' },
  { name: 'Hellstone Wall', color: '#38211e', texture: 'brick' },
  { name: 'Cave Wall', color: '#1f222a', texture: 'cave' },
  { name: 'Wood Panel Wall', color: '#4b3220', texture: 'wood' },
  { name: 'Stone Panel Wall', color: '#30343d', texture: 'stone' },
  { name: 'Gold Brick Wall', color: '#56451f', texture: 'brick' },
  { name: 'Crystal Wall', color: '#35565c', texture: 'glass' },
  { name: 'Crimstone Wall', color: '#432226', texture: 'stone' }
];

/* ---------------------------------------------------------------------------------------------
   Items
------------------------------------------------------------------------------------------------- */
const ITEMS = {};
const RARITY = {
  gray: '#a6a6a6', white: '#f2f2f2', blue: '#7b9cff', green: '#74d46f', orange: '#ef9c49',
  red: '#f06464', pink: '#ea7ec9', purple: '#b589ea', lime: '#b6ea6f', yellow: '#f4dd5a',
  cyan: '#6fe1e8', rainbow: '#ffb3f0'
};

function item(id, o) {
  const base = {
    id, name: id, type: 'material', stack: 999, rarity: 'white', value: 0,
    desc: '', art: 'misc', color: '#c8c8c8', color2: null, useTime: 0.25,
    damage: 0, knockback: 0, crit: 4, defense: 0, pick: 0, axe: 0, hammer: 0,
    reach: 6, mana: 0, projectile: null, projectileSpeed: 0, ammo: null, ammoUse: 1,
    block: null, wall: null, furniture: false, station: null, tool: null, cls: null,
    equip: null, buff: null, duration: 0, heal: 0, manaRestore: 0, onUse: null,
    useSound: 'swing', swing: 'arc', shoot: null, minion: null, light: 0,
    accessory: false, wings: false, prefix: false, unique: false, hardmode: false,
    sellable: true, consumable: false
  };
  ITEMS[id] = Object.assign(base, o);
  return ITEMS[id];
}

/* Materials and blocks */
item('wood', { name: 'Wood', art: 'wood', color: '#aa7442', block: TILE.WOOD, type: 'block', value: 2, desc: 'A sturdy building material.' });
item('stoneBlock', { name: 'Stone Block', art: 'block', color: '#777b84', block: TILE.STONE, type: 'block', value: 0.5 });
item('dirtBlock', { name: 'Dirt Block', art: 'block', color: '#8a5c3b', block: TILE.DIRT, type: 'block', value: 0.1 });
item('sandBlock', { name: 'Sand Block', art: 'block', color: '#d8b56c', block: TILE.SAND, type: 'block', value: 0.3 });
item('sandstoneBlock', { name: 'Sandstone', art: 'block', color: '#bf934f', block: TILE.SANDSTONE, type: 'block', value: 0.5 });
item('snowBlock', { name: 'Snow Block', art: 'block', color: '#e5f0f5', block: TILE.SNOW, type: 'block', value: 0.2 });
item('iceBlock', { name: 'Ice Block', art: 'block', color: '#9bc9dc', block: TILE.ICE, type: 'block', value: 0.4 });
item('mudBlock', { name: 'Mud Block', art: 'block', color: '#6a4d3a', block: TILE.MUD, type: 'block', value: 0.2 });
item('ebonstoneBlock', { name: 'Ebonstone', art: 'block', color: '#4c3b5f', block: TILE.EBONSTONE, type: 'block', value: 0.7 });
item('crimstoneBlock', { name: 'Crimstone', art: 'block', color: '#6e2b37', block: TILE.CRIMSTONE, type: 'block', value: 0.7 });
item('ashBlock', { name: 'Ash Block', art: 'block', color: '#5a4b49', block: TILE.ASH, type: 'block', value: 0.2 });
item('clayBlock', { name: 'Clay Block', art: 'block', color: '#976d5e', block: TILE.CLAY, type: 'block', value: 0.3 });
item('borealWood', { name: 'Boreal Wood', art: 'wood', color: '#8d7565', block: TILE.BOREAL_WOOD, type: 'block', value: 2 });
item('mahogany', { name: 'Rich Mahogany', art: 'wood', color: '#8f4632', block: TILE.MAHOGANY, type: 'block', value: 3 });
item('ebonwood', { name: 'Ebonwood', art: 'wood', color: '#4a3847', block: TILE.EBONWOOD, type: 'block', value: 3 });
item('glassBlock', { name: 'Glass', art: 'block', color: '#a7d9e8', block: TILE.GLASS, type: 'block', value: 1, desc: 'Look through, not walk through.' });
item('grayBrick', { name: 'Gray Brick', art: 'brick', color: '#777d86', block: TILE.GRAY_BRICK, type: 'block', value: 1 });
item('redBrick', { name: 'Red Brick', art: 'brick', color: '#9d4b44', block: TILE.RED_BRICK, type: 'block', value: 1 });
item('obsidian', { name: 'Obsidian', art: 'ore', color: '#3a304a', block: TILE.OBSIDIAN, type: 'block', value: 4 });
item('siltBlock', { name: 'Silt', art: 'block', color: '#68625a', block: TILE.SILT, type: 'block', value: 0.3 });
item('hiveBlock', { name: 'Hive', art: 'block', color: '#c09540', block: TILE.HIVE, type: 'block', value: 2 });
item('honeyBlock', { name: 'Honey Block', art: 'block', color: '#e7b541', block: TILE.HONEY_BLOCK, type: 'block', value: 2 });
item('dungeonBrick', { name: 'Dungeon Brick', art: 'brick', color: '#3e4c6a', block: TILE.DUNGEON_BRICK, type: 'block', value: 2 });
item('goldBrick', { name: 'Gold Brick', art: 'brick', color: '#b79838', block: TILE.GOLD_BRICK, type: 'block', value: 8 });
item('silverBrick', { name: 'Silver Brick', art: 'brick', color: '#929aa5', block: TILE.SILVER_BRICK, type: 'block', value: 5 });
item('copperBrick', { name: 'Copper Brick', art: 'brick', color: '#a56e4c', block: TILE.COPPER_BRICK, type: 'block', value: 2 });
item('boneBlock', { name: 'Bone Block', art: 'brick', color: '#c9c1a4', block: TILE.BONE_BLOCK, type: 'block', value: 3 });
item('marbleBlock', { name: 'Marble', art: 'block', color: '#c8c4bc', block: TILE.MARBLE, type: 'block', value: 2 });
item('graniteBlock', { name: 'Granite', art: 'block', color: '#675f66', block: TILE.GRANITE, type: 'block', value: 2 });
item('cloudBlock', { name: 'Cloud', art: 'cloud', color: '#e3e9f4', block: TILE.CLOUD, type: 'block', value: 1 });
item('livingWood', { name: 'Living Wood', art: 'wood', color: '#7b5b35', block: TILE.LIVING_WOOD, type: 'block', value: 3 });
item('hellstoneBrick', { name: 'Hellstone Brick', art: 'brick', color: '#6c3228', block: TILE.HELLSTONE_BRICK, type: 'block', value: 5 });
item('iceBrick', { name: 'Ice Brick', art: 'brick', color: '#86bdd3', block: TILE.ICE_BRICK, type: 'block', value: 2 });
item('snowBrick', { name: 'Snow Brick', art: 'brick', color: '#d6e1e9', block: TILE.SNOW_BRICK, type: 'block', value: 2 });
item('crystalBlock', { name: 'Crystal Block', art: 'gemBlock', color: '#9bd7dd', block: TILE.CRYSTAL_BLOCK, type: 'block', value: 8 });
item('pinkIce', { name: 'Pink Ice', art: 'block', color: '#e0a7c9', block: TILE.PINK_ICE, type: 'block', value: 2 });
item('pearlstoneBlock', { name: 'Pearlstone', art: 'block', color: '#c8b9cd', block: TILE.PEARLSTONE, type: 'block', value: 1 });
item('cactus', { name: 'Cactus', art: 'plant', color: '#4d8a4f', type: 'material', value: 1 });
item('coral', { name: 'Coral', art: 'plant', color: '#dd7d85', type: 'material', value: 5 });
item('mushroom', { name: 'Mushroom', art: 'mushroom', color: '#cf6d65', type: 'material', value: 3, heal: 15, consumable: true, useTime: 0.4, desc: 'Restores 15 life.' });
item('glowMushroom', { name: 'Glowing Mushroom', art: 'mushroom', color: '#54c9e8', type: 'material', value: 8 });

item('woodPlatform', { name: 'Wood Platform', art: 'platform', color: '#9e693d', block: TILE.WOOD_PLATFORM, type: 'block', value: 1, desc: 'One-way platform. Press S to drop through.' });
item('stonePlatform', { name: 'Stone Platform', art: 'platform', color: '#747881', block: TILE.STONE_PLATFORM, type: 'block', value: 1 });
item('borealPlatform', { name: 'Boreal Platform', art: 'platform', color: '#8d7565', block: TILE.BOREAL_PLATFORM, type: 'block', value: 1 });
item('mahoganyPlatform', { name: 'Mahogany Platform', art: 'platform', color: '#8f4632', block: TILE.MAHOGANY_PLATFORM, type: 'block', value: 1 });
item('dungeonPlatform', { name: 'Dungeon Platform', art: 'platformStone', color: '#4e5b78', block: TILE.DUNGEON_PLATFORM, type: 'block', value: 2 });
item('planterBox', { name: 'Planter Box', art: 'platform', color: '#9b6c3f', block: TILE.PLANTER_BOX, type: 'block', value: 2 });
item('rope', { name: 'Rope', art: 'rope', color: '#c9a775', block: TILE.ROPE, type: 'block', value: 1, stack: 999 });
item('webRope', { name: 'Web Rope', art: 'rope', color: '#dedde1', block: TILE.WEB_ROPE, type: 'block', value: 2 });
item('torch', { name: 'Torch', art: 'torch', color: '#ffc267', block: TILE.TORCH, type: 'block', value: 1, light: 9, desc: 'A warm light against the dark.' });
item('campfire', { name: 'Campfire', art: 'campfire', color: '#ff9e45', block: TILE.CAMPFIRE, type: 'block', value: 8, buff: 'campfire', duration: 8, heal: 0, desc: 'Nearby allies regenerate life faster.' });
item('candle', { name: 'Candle', art: 'candle', color: '#ffe0a1', block: TILE.CANDLE, type: 'block', value: 2 });
item('lantern', { name: 'Hanging Lantern', art: 'lantern', color: '#ffd38b', block: TILE.LANTERN, type: 'block', value: 6 });
item('chest', { name: 'Chest', art: 'chest', color: '#b07a44', block: TILE.CHEST, type: 'block', value: 2, furniture: true, stack: 99, desc: 'Stores 20 stacks of loot.' });
item('workbench', { name: 'Work Bench', art: 'workbench', color: '#b07f4d', block: TILE.WORKBENCH, type: 'block', value: 3, furniture: true, stack: 99 });
item('furnace', { name: 'Furnace', art: 'furnace', color: '#8f8984', block: TILE.FURNACE, type: 'block', value: 6, furniture: true, stack: 99 });
item('anvil', { name: 'Iron Anvil', art: 'anvil', color: '#9ca2ad', block: TILE.ANVIL, type: 'block', value: 15, furniture: true, stack: 99 });
item('hellforge', { name: 'Hellforge', art: 'hellforge', color: '#a45c40', block: TILE.HELLFORGE, type: 'block', value: 30, furniture: true, stack: 99 });
item('loom', { name: 'Loom', art: 'loom', color: '#b28752', block: TILE.LOOM, type: 'block', value: 8, furniture: true, stack: 99 });
item('alchemyTable', { name: 'Alchemy Table', art: 'alchemy', color: '#80658b', block: TILE.ALCHEMY_TABLE, type: 'block', value: 20, furniture: true, stack: 99 });
item('table', { name: 'Table', art: 'table', color: '#b07d48', block: TILE.TABLE, type: 'block', value: 3, furniture: true, stack: 99 });
item('chair', { name: 'Chair', art: 'chair', color: '#b07d48', block: TILE.CHAIR, type: 'block', value: 2, furniture: true, stack: 99 });
item('bed', { name: 'Bed', art: 'bed', color: '#b25255', block: TILE.BED, type: 'block', value: 8, furniture: true, stack: 99, desc: 'Sets your respawn point in a valid house.' });
item('woodDoor', { name: 'Wood Door', art: 'door', color: '#b07d48', block: TILE.DOOR_CLOSED, type: 'block', value: 3, furniture: true, stack: 99, desc: 'Keeps monsters out. Use F to open.' });
item('bookshelf', { name: 'Bookshelf', art: 'bookshelf', color: '#a47544', block: TILE.BOOKSHELF, type: 'block', value: 8, furniture: true, stack: 99 });
item('spike', { name: 'Spike', art: 'spike', color: '#b0b6c3', block: TILE.SPIKE, type: 'block', value: 5, desc: 'Hurts anything that walks over it.' });
item('pressurePlate', { name: 'Pressure Plate', art: 'plate', color: '#b59d77', block: TILE.PRESSURE_PLATE, type: 'block', value: 2, furniture: true });
item('dartTrap', { name: 'Dart Trap', art: 'trap', color: '#9399a1', block: TILE.DART_TRAP, type: 'block', value: 10, furniture: true });
item('flag', { name: 'Banner', art: 'flag', color: '#b14c4c', block: TILE.FLAG, type: 'block', value: 2 });
item('gravestone', { name: 'Gravestone', art: 'grave', color: '#8d8992', block: TILE.GRAVE, type: 'block', value: 1 });
item('barrel', { name: 'Barrel', art: 'barrel', color: '#a57343', block: TILE.BARREL, type: 'block', value: 2 });

/* Walls as placeable items */
item('dirtWall', { name: 'Dirt Wall', art: 'wall', color: '#5e4634', wall: WALL.DIRT, type: 'wall', value: 0.1 });
item('stoneWall', { name: 'Stone Wall', art: 'wall', color: '#50545e', wall: WALL.STONE, type: 'wall', value: 0.5 });
item('woodWall', { name: 'Wood Wall', art: 'wall', color: '#6a492e', wall: WALL.WOOD, type: 'wall', value: 0.5 });
item('brickWall', { name: 'Gray Brick Wall', art: 'wall', color: '#5e6169', wall: WALL.BRICK, type: 'wall', value: 0.5 });
item('glassWall', { name: 'Glass Wall', art: 'wall', color: '#7196a2', wall: WALL.GLASS, type: 'wall', value: 1 });
item('livingWoodWall', { name: 'Living Wood Wall', art: 'wall', color: '#513d2a', wall: WALL.LIVING_WOOD, type: 'wall', value: 2 });

/* Ores, bars and gems */
const oreDefs = [
  ['copperOre', 'Copper Ore', '#c2774f', 3], ['tinOre', 'Tin Ore', '#cfc6a2', 3],
  ['ironOre', 'Iron Ore', '#b4a59e', 5], ['leadOre', 'Lead Ore', '#8e95a8', 5],
  ['silverOre', 'Silver Ore', '#d7e0e6', 8], ['tungstenOre', 'Tungsten Ore', '#7b9a94', 8],
  ['goldOre', 'Gold Ore', '#e5c249', 14], ['platinumOre', 'Platinum Ore', '#dce8da', 14],
  ['demoniteOre', 'Demonite Ore', '#6f58a4', 25], ['crimtaneOre', 'Crimtane Ore', '#c14e57', 25],
  ['meteoriteOre', 'Meteorite', '#a26d75', 20], ['hellstoneOre', 'Hellstone', '#e05e33', 35],
  ['cobaltOre', 'Cobalt Ore', '#4e96c4', 30], ['mythrilOre', 'Mythril Ore', '#57b9a0', 40],
  ['adamantiteOre', 'Adamantite Ore', '#d05d6f', 60]
];
for (const [id, name, color, val] of oreDefs) item(id, { name, art: 'ore', color, color2: '#574b4b', type: 'material', value: val, desc: 'An ore with a metallic gleam.' });
const barDefs = [
  ['copperBar', 'Copper Bar', '#c98256', 6], ['tinBar', 'Tin Bar', '#d6cfab', 6],
  ['ironBar', 'Iron Bar', '#b8aaa4', 10], ['leadBar', 'Lead Bar', '#9ba3b5', 10],
  ['silverBar', 'Silver Bar', '#dbe3e9', 16], ['tungstenBar', 'Tungsten Bar', '#87a8a0', 16],
  ['goldBar', 'Gold Bar', '#ebc84d', 28], ['platinumBar', 'Platinum Bar', '#e4eddf', 28],
  ['demoniteBar', 'Demonite Bar', '#715caf', 50], ['crimtaneBar', 'Crimtane Bar', '#cf5961', 50],
  ['meteoriteBar', 'Meteorite Bar', '#9d7180', 40], ['hellstoneBar', 'Hellstone Bar', '#eb6c3c', 70],
  ['cobaltBar', 'Cobalt Bar', '#65a6d0', 60], ['mythrilBar', 'Mythril Bar', '#6acab2', 80],
  ['adamantiteBar', 'Adamantite Bar', '#dd697c', 120]
];
for (const [id, name, color, val] of barDefs) item(id, { name, art: 'bar', color, type: 'material', value: val, desc: 'Refined metal, ready for the anvil.' });

const gems = [
  ['amethyst', 'Amethyst', '#9a70e5', 10], ['topaz', 'Topaz', '#e1a546', 15],
  ['sapphire', 'Sapphire', '#6795df', 25], ['emerald', 'Emerald', '#5ecb7a', 35],
  ['ruby', 'Ruby', '#d95563', 45], ['diamond', 'Diamond', '#c8e6ef', 60]
];
for (const [id, name, color, val] of gems) item(id, { name, art: 'gem', color, type: 'material', value: val, desc: 'A cut gemstone that hums faintly.' });

/* Organic materials */
item('gel', { name: 'Gel', art: 'gel', color: '#6fa8e8', type: 'material', value: 1, desc: 'Sticky, bouncy, useful.' });
item('silk', { name: 'Silk', art: 'silk', color: '#e9dfc5', type: 'material', value: 4 });
item('cobweb', { name: 'Cobweb', art: 'web', color: '#d9dce0', type: 'material', value: 0.2 });
item('bone', { name: 'Bone', art: 'bone', color: '#d9d1b4', type: 'material', value: 1 });
item('rottenChunk', { name: 'Rotten Chunk', art: 'chunk', color: '#7b4d43', type: 'material', value: 2 });
item('shadowScale', { name: 'Shadow Scale', art: 'scale', color: '#7f5fa2', type: 'material', value: 8 });
item('tissueSample', { name: 'Tissue Sample', art: 'chunk', color: '#b35c64', type: 'material', value: 8 });
item('stinger', { name: 'Stinger', art: 'stinger', color: '#d6b04c', type: 'material', value: 4 });
item('vine', { name: 'Vine', art: 'vine', color: '#599142', type: 'material', value: 1 });
item('jungleSpore', { name: 'Jungle Spore', art: 'spore', color: '#8de36c', type: 'material', value: 3 });
item('fallenStar', { name: 'Fallen Star', art: 'star', color: '#ffe36f', type: 'material', value: 25, light: 3 });
item('lens', { name: 'Lens', art: 'lens', color: '#8dd8ec', type: 'material', value: 4 });
item('blackLens', { name: 'Black Lens', art: 'lens', color: '#4f4774', type: 'material', value: 10 });
item('feather', { name: 'Feather', art: 'feather', color: '#eef0f3', type: 'material', value: 2 });
item('antlionMandible', { name: 'Antlion Mandible', art: 'chunk', color: '#bfa26a', type: 'material', value: 4 });
item('sharkFin', { name: 'Shark Fin', art: 'feather', color: '#9fb7c5', type: 'material', value: 10 });
item('beeWax', { name: 'Bee Wax', art: 'chunk', color: '#d9b64c', type: 'material', value: 6 });
item('ash', { name: 'Ash', art: 'dust', color: '#8a7a72', type: 'material', value: 0.2 });
item('crystalShard', { name: 'Crystal Shard', art: 'gem', color: '#8fe8ee', type: 'material', value: 8 });
item('soulOfNight', { name: 'Soul of Night', art: 'soul', color: '#a66ede', type: 'material', value: 20, light: 2 });
item('soulOfLight', { name: 'Soul of Light', art: 'soul', color: '#f3e39e', type: 'material', value: 20, light: 2 });
item('blackThread', { name: 'Black Thread', art: 'silk', color: '#45414b', type: 'material', value: 2 });
item('lightShard', { name: 'Light Shard', art: 'gem', color: '#ffefab', type: 'material', value: 12 });
item('daybloom', { name: 'Daybloom', art: 'herb', color: '#e8cf59', type: 'material', value: 2 });
item('blinkroot', { name: 'Blinkroot', art: 'herb', color: '#b98b5e', type: 'material', value: 2 });
item('waterleaf', { name: 'Waterleaf', art: 'herb', color: '#6ea6bd', type: 'material', value: 2 });
item('moonglow', { name: 'Moonglow', art: 'herb', color: '#8cc7e8', type: 'material', value: 3 });
item('deathweed', { name: 'Deathweed', art: 'herb', color: '#986b8d', type: 'material', value: 3 });
item('fireblossom', { name: 'Fireblossom', art: 'herb', color: '#e88443', type: 'material', value: 4 });
item('shiverthorn', { name: 'Shiverthorn', art: 'herb', color: '#88c8de', type: 'material', value: 3 });
item('bottledWater', { name: 'Bottled Water', art: 'potion', color: '#8fc8e2', type: 'material', value: 2 });
item('bottle', { name: 'Bottle', art: 'bottle', color: '#b8dce8', type: 'material', value: 1 });
item('goldenKey', { name: 'Golden Key', art: 'key', color: '#e7c14e', type: 'material', value: 15, desc: 'Opens golden chests in the dungeon.' });
item('chain', { name: 'Chain', art: 'chain', color: '#9ca1ac', type: 'material', value: 2 });
item('blackSlime', { name: 'Black Slime', art: 'gel', color: '#43404e', type: 'material', value: 3 });

/* Coins use a wallet, but are still represented for drops/compat. */
item('coinCopper', { name: 'Copper Coin', art: 'coin', color: '#c78150', type: 'coin', value: 1, stack: 100, sellable: false });
item('coinSilver', { name: 'Silver Coin', art: 'coin', color: '#d6dde3', type: 'coin', value: 100, stack: 100, sellable: false });
item('coinGold', { name: 'Gold Coin', art: 'coin', color: '#ecc64f', type: 'coin', value: 10000, stack: 100, sellable: false });
item('coinPlatinum', { name: 'Platinum Coin', art: 'coin', color: '#e5f2e8', type: 'coin', value: 1000000, stack: 100, sellable: false });

/* Tools */
function tool(id, name, o) { return item(id, Object.assign({ type: 'tool', stack: 1, tool: 'pick', value: 10, damage: 4, knockback: 2, useTime: 0.25, swing: 'arc', art: 'pick', color: '#b8734c' }, o)); }
tool('copperPickaxe', 'Copper Pickaxe', { pick: 1.0, tier: 0, damage: 4, value: 15, art: 'pick', color: '#c07b4f', color2: '#8a5a38' });
tool('ironPickaxe', 'Iron Pickaxe', { pick: 1.35, tier: 1, damage: 6, value: 35, art: 'pick', color: '#b9aaa2' });
tool('silverPickaxe', 'Silver Pickaxe', { pick: 1.7, tier: 1, damage: 8, value: 60, art: 'pick', color: '#dbe2e7' });
tool('goldPickaxe', 'Gold Pickaxe', { pick: 2.0, tier: 2, damage: 10, value: 100, art: 'pick', color: '#edca50' });
tool('nightmarePickaxe', 'Nightmare Pickaxe', { pick: 2.5, tier: 2, damage: 14, value: 180, art: 'pick', color: '#896bc4', color2: '#49356e', rarity: 'orange' });
tool('moltenPickaxe', 'Molten Pickaxe', { pick: 3.4, tier: 3, damage: 20, value: 320, art: 'pick', color: '#ef7b3f', color2: '#9e3924', rarity: 'red', light: 2 });
tool('cobaltPickaxe', 'Cobalt Pickaxe', { pick: 3.0, tier: 3, damage: 17, value: 220, art: 'pick', color: '#62a9da', rarity: 'blue', hardmode: true });
tool('mythrilPickaxe', 'Mythril Pickaxe', { pick: 3.8, tier: 4, damage: 24, value: 300, art: 'pick', color: '#6fd2ba', rarity: 'green', hardmode: true });
const axe = (id, name, o) => tool(id, name, Object.assign({ tool: 'axe', art: 'axe', color: '#b8734c', damage: 6, knockback: 4, useTime: 0.32, axe: 1 }, o));
axe('copperAxe', 'Copper Axe', { pick: 0, axe: 1.0, value: 12, damage: 5 });
axe('ironAxe', 'Iron Axe', { axe: 1.35, value: 28, damage: 7, color: '#b9aaa2' });
axe('silverAxe', 'Silver Axe', { axe: 1.7, value: 50, damage: 9, color: '#dbe2e7' });
axe('goldAxe', 'Gold Axe', { axe: 2.0, value: 90, damage: 12, color: '#edca50' });
axe('warAxeOfTheNight', 'War Axe of the Night', { axe: 2.5, value: 160, damage: 20, color: '#896bc4', rarity: 'orange' });
axe('moltenHamaxe', 'Molten Hamaxe', { axe: 3.2, hammer: 3.0, tool: 'hammer', art: 'hamaxe', value: 280, damage: 24, color: '#ef7b3f', rarity: 'red', light: 2 });
tool('copperHammer', 'Copper Hammer', { tool: 'hammer', art: 'hammer', hammer: 1.0, pick: 0, damage: 6, value: 16, color: '#c07b4f' });
tool('ironHammer', 'Iron Hammer', { tool: 'hammer', art: 'hammer', hammer: 1.35, pick: 0, damage: 8, value: 30, color: '#b9aaa2' });
tool('silverHammer', 'Silver Hammer', { tool: 'hammer', art: 'hammer', hammer: 1.7, pick: 0, damage: 10, value: 55, color: '#dbe2e7' });
tool('goldHammer', 'Gold Hammer', { tool: 'hammer', art: 'hammer', hammer: 2.0, pick: 0, damage: 12, value: 100, color: '#edca50' });
tool('pwnhammer', 'Pwnhammer', { tool: 'hammer', art: 'hammer', hammer: 4.0, pick: 1.0, damage: 28, value: 400, color: '#e7b64f', rarity: 'pink', hardmode: true, desc: 'A legendary hammer. Smashes altars.' });

/* Melee weapons */
function sword(id, name, o) { return item(id, Object.assign({ type: 'weapon', cls: 'melee', stack: 1, art: 'sword', tool: null, damage: 12, knockback: 5, useTime: 0.3, swing: 'arc', value: 20, color: '#c0c8d2' }, o)); }
sword('woodSword', 'Wooden Sword', { damage: 7, useTime: 0.36, value: 5, color: '#b4814e', swing: 'arc' });
sword('copperShortsword', 'Copper Shortsword', { damage: 8, useTime: 0.25, swing: 'stab', color: '#c68555', value: 10 });
sword('ironBroadsword', 'Iron Broadsword', { damage: 14, useTime: 0.3, value: 35, color: '#c1b6ae' });
sword('silverBroadsword', 'Silver Broadsword', { damage: 18, useTime: 0.27, value: 65, color: '#e0e8ee', crit: 5 });
sword('goldBroadsword', 'Gold Broadsword', { damage: 24, useTime: 0.26, value: 110, color: '#f0d258', crit: 5 });
sword('lightsBane', "Light's Bane", { damage: 29, useTime: 0.23, value: 200, color: '#8c6ac4', rarity: 'orange', light: 1 });
sword('bloodButcherer', 'Blood Butcherer', { damage: 32, useTime: 0.3, knockback: 7, value: 200, color: '#c9535e', rarity: 'orange' });
sword('muramasa', 'Muramasa', { damage: 28, useTime: 0.18, value: 300, color: '#86a2c8', rarity: 'red', light: 1 });
sword('bladeOfGrass', 'Blade of Grass', { damage: 34, useTime: 0.3, value: 300, color: '#79b954', rarity: 'orange', effect: 'poison' });
sword('fieryGreatsword', 'Fiery Greatsword', { damage: 48, useTime: 0.34, value: 450, color: '#ef7a3a', rarity: 'red', light: 3, effect: 'burn' });
sword('enchantedSword', 'Enchanted Sword', { damage: 33, useTime: 0.24, value: 350, color: '#8fd6e6', rarity: 'orange', projectile: 'enchantedBeam', projectileSpeed: 9, light: 2 });
sword('nightsEdge', "Night's Edge", { damage: 62, useTime: 0.27, value: 900, color: '#b97fea', rarity: 'purple', light: 3, effect: 'burn', projectile: 'nightBeam', projectileSpeed: 11 });
sword('beeKeeper', 'Bee Keeper', { damage: 36, useTime: 0.24, value: 350, color: '#dfb84e', rarity: 'orange', effect: 'poison', projectile: 'bee', projectileSpeed: 8 });
sword('excalibur', 'Excalibur', { damage: 82, useTime: 0.23, value: 1200, color: '#ffe6a0', rarity: 'pink', light: 4, hardmode: true });
sword('deathSickle', 'Death Sickle', { damage: 76, useTime: 0.28, value: 1100, color: '#bde5d0', rarity: 'purple', projectile: 'deathSickle', projectileSpeed: 9, light: 2, hardmode: true });

/* Bows, guns and ammo */
function bow(id, name, o) { return item(id, Object.assign({ type: 'weapon', cls: 'ranged', stack: 1, art: 'bow', damage: 10, useTime: 0.38, projectile: 'arrow', projectileSpeed: 11, ammo: 'arrow', value: 20, color: '#b7814d' }, o)); }
bow('woodenBow', 'Wooden Bow', { damage: 6, value: 8, color: '#b4824f' });
bow('copperBow', 'Copper Bow', { damage: 9, useTime: 0.36, value: 18, color: '#c88556' });
bow('ironBow', 'Iron Bow', { damage: 13, useTime: 0.34, value: 35, color: '#bca9a0' });
bow('silverBow', 'Silver Bow', { damage: 17, useTime: 0.32, value: 70, color: '#e3e9ee' });
bow('goldBow', 'Gold Bow', { damage: 23, useTime: 0.3, value: 120, color: '#edd154' });
bow('demonBow', 'Demon Bow', { damage: 30, useTime: 0.28, value: 220, color: '#876ac0', rarity: 'orange' });
bow('moltenFury', 'Molten Fury', { damage: 38, useTime: 0.27, value: 400, color: '#ec753b', rarity: 'red', light: 2, projectile: 'flameArrow' });
bow('beesKnees', "Bee's Knees", { damage: 26, useTime: 0.28, value: 300, color: '#dcb44d', rarity: 'orange', projectile: 'beeArrow' });
bow('cobaltRepeater', 'Cobalt Repeater', { damage: 47, useTime: 0.23, value: 500, color: '#64afd8', rarity: 'blue', hardmode: true });
bow('mythrilRepeater', 'Mythril Repeater', { damage: 61, useTime: 0.21, value: 700, color: '#71d2bc', rarity: 'green', hardmode: true });
function gun(id, name, o) { return item(id, Object.assign({ type: 'weapon', cls: 'ranged', stack: 1, art: 'gun', damage: 12, useTime: 0.3, projectile: 'bullet', projectileSpeed: 16, ammo: 'bullet', value: 50, color: '#8e949f' }, o)); }
gun('flintlockPistol', 'Flintlock Pistol', { damage: 15, value: 60, useTime: 0.3 });
gun('musket', 'Musket', { damage: 21, value: 120, useTime: 0.4, projectileSpeed: 18 });
gun('boomstick', 'Boomstick', { damage: 19, value: 200, useTime: 0.44, pellets: 3, projectileSpeed: 14 });
gun('minishark', 'Minishark', { damage: 14, value: 500, useTime: 0.1, projectileSpeed: 17, rarity: 'orange' });
gun('phoenixBlaster', 'Phoenix Blaster', { damage: 36, value: 700, useTime: 0.22, projectileSpeed: 20, rarity: 'orange', color: '#d78f4c' });
function ammo(id, name, o) { return item(id, Object.assign({ type: 'ammo', art: 'arrow', stack: 999, value: 0.3, damage: 0, ammoType: 'arrow', color: '#b88a52' }, o)); }
ammo('woodenArrow', 'Wooden Arrow', { name2: 'Arrow', ammoType: 'arrow', damage: 4, value: 0.2, color: '#b88a52' });
ammo('flamingArrow', 'Flaming Arrow', { ammoType: 'arrow', damage: 6, value: 0.5, color: '#f49b43', projectile: 'flameArrow', light: 2 });
ammo('unholyArrow', 'Unholy Arrow', { ammoType: 'arrow', damage: 9, value: 1, color: '#9470c4', projectile: 'unholyArrow', light: 1 });
ammo('jesterArrow', "Jester's Arrow", { ammoType: 'arrow', damage: 11, value: 2, color: '#e7c5f3', projectile: 'jesterArrow', light: 3 });
ammo('musketBall', 'Musket Ball', { ammoType: 'bullet', damage: 7, value: 0.4, color: '#bcc1c7', art: 'bullet' });
ammo('silverBullet', 'Silver Bullet', { ammoType: 'bullet', damage: 9, value: 1.2, color: '#dfe8ef', art: 'bullet' });
ammo('meteorShot', 'Meteor Shot', { ammoType: 'bullet', damage: 12, value: 2, color: '#d19484', art: 'bullet', projectile: 'meteorShot', light: 2 });

/* Throwing and explosives */
item('shuriken', { name: 'Shuriken', art: 'shuriken', color: '#a8b1bb', type: 'weapon', cls: 'ranged', damage: 7, stack: 999, useTime: 0.22, projectile: 'shuriken', projectileSpeed: 12, value: 0.5, desc: 'Throw with reckless abandon.' });
item('grenade', { name: 'Grenade', art: 'bomb', color: '#5f7c4d', type: 'weapon', cls: 'ranged', damage: 45, stack: 99, useTime: 0.5, projectile: 'grenade', projectileSpeed: 9, value: 6, onUse: 'explode' });
item('bomb', { name: 'Bomb', art: 'bomb', color: '#4e5c6d', type: 'weapon', cls: 'ranged', damage: 70, stack: 99, useTime: 0.5, projectile: 'bomb', projectileSpeed: 8, value: 8, onUse: 'explode' });
item('dynamite', { name: 'Dynamite', art: 'dynamite', color: '#c04b45', type: 'weapon', cls: 'ranged', damage: 180, stack: 30, useTime: 0.7, projectile: 'dynamite', projectileSpeed: 7, value: 20, onUse: 'explode' });
item('molotov', { name: 'Molotov Cocktail', art: 'bottle', color: '#cc6a42', type: 'weapon', cls: 'ranged', damage: 28, stack: 99, useTime: 0.4, projectile: 'molotov', projectileSpeed: 9, value: 4, light: 2 });

/* Magic weapons */
function staff(id, name, o) { return item(id, Object.assign({ type: 'weapon', cls: 'magic', stack: 1, art: 'staff', damage: 12, useTime: 0.45, mana: 6, projectile: 'magicBolt', projectileSpeed: 9, value: 30, color: '#8462b5', color2: '#8fd6e6', light: 2 }, o)); }
staff('amethystStaff', 'Amethyst Staff', { damage: 14, mana: 5, value: 30, color: '#7655ad', color2: '#a983ea' });
staff('topazStaff', 'Topaz Staff', { damage: 17, mana: 6, value: 45, color: '#8d6731', color2: '#e5ae55' });
staff('sapphireStaff', 'Sapphire Staff', { damage: 20, mana: 7, value: 70, color: '#4c6b9e', color2: '#72a1ea' });
staff('emeraldStaff', 'Emerald Staff', { damage: 24, mana: 8, value: 100, color: '#386b48', color2: '#69d385' });
staff('rubyStaff', 'Ruby Staff', { damage: 28, mana: 9, value: 140, color: '#8b3743', color2: '#ef6d7d' });
staff('diamondStaff', 'Diamond Staff', { damage: 34, mana: 10, value: 220, color: '#63818c', color2: '#d5f0f4', rarity: 'blue' });
staff('vilethorn', 'Vilethorn', { damage: 20, mana: 8, useTime: 0.38, projectile: 'vilethorn', value: 200, color: '#6c5288', color2: '#b184d6', rarity: 'orange', desc: 'A writhing thorn of shadow.' });
staff('waterBolt', 'Water Bolt', { damage: 19, mana: 8, useTime: 0.35, projectile: 'waterBolt', value: 250, color: '#346c8e', color2: '#7ac0e3', rarity: 'orange', desc: 'Bounces off walls.' });
staff('demonScythe', 'Demon Scythe', { damage: 34, mana: 12, useTime: 0.5, projectile: 'demonScythe', value: 300, color: '#4c386b', color2: '#b87fe6', rarity: 'orange' });
staff('spaceGun', 'Space Gun', { damage: 21, mana: 6, useTime: 0.2, projectile: 'spaceLaser', projectileSpeed: 18, value: 350, color: '#6f7888', color2: '#8ff0d9', rarity: 'orange', light: 3 });
staff('flowerOfFire', 'Flower of Fire', { damage: 44, mana: 14, useTime: 0.55, projectile: 'fireball', projectileSpeed: 8, value: 400, color: '#9e4c35', color2: '#ffb04d', rarity: 'red', light: 4 });
staff('beeGun', 'Bee Gun', { damage: 13, mana: 5, useTime: 0.18, projectile: 'bee', projectileSpeed: 10, value: 400, color: '#c9a03c', color2: '#e9d374', rarity: 'orange' });
staff('bookOfSkulls', 'Book of Skulls', { damage: 32, mana: 18, useTime: 0.6, projectile: 'skull', projectileSpeed: 8, value: 500, color: '#5a4e55', color2: '#e8dbbf', rarity: 'orange' });
staff('crystalStorm', 'Crystal Storm', { damage: 26, mana: 7, useTime: 0.2, projectile: 'crystalShard', projectileSpeed: 12, value: 600, color: '#5f8e93', color2: '#c2f4fa', rarity: 'orange', hardmode: true });
staff('magicDagger', 'Magic Dagger', { damage: 22, mana: 6, useTime: 0.18, projectile: 'magicDagger', projectileSpeed: 14, value: 300, color: '#5d7799', color2: '#b8e8f5', rarity: 'orange' });
staff('shadowBeam', 'Shadowbeam Staff', { damage: 55, mana: 12, useTime: 0.4, projectile: 'shadowBeam', projectileSpeed: 20, value: 800, color: '#48395b', color2: '#b17ae8', rarity: 'pink', hardmode: true });

/* Summon weapons */
item('slimeStaff', { name: 'Slime Staff', art: 'summon', color: '#729de0', color2: '#9ac5ff', type: 'weapon', cls: 'summon', damage: 10, useTime: 0.6, mana: 10, minion: 'babySlime', value: 400, rarity: 'orange', desc: 'Summons a baby slime to fight for you.' });
item('hornetStaff', { name: 'Hornet Staff', art: 'summon', color: '#c9a03c', color2: '#e4cb6c', type: 'weapon', cls: 'summon', damage: 15, useTime: 0.55, mana: 10, minion: 'hornet', value: 500, rarity: 'orange', desc: 'Summons a hornet that shoots stingers.' });
item('impStaff', { name: 'Imp Staff', art: 'summon', color: '#c75633', color2: '#f0a54a', type: 'weapon', cls: 'summon', damage: 22, useTime: 0.55, mana: 12, minion: 'imp', value: 600, rarity: 'orange', desc: 'Summons a fire imp that hurls flames.' });
item('opticStaff', { name: 'Optic Staff', art: 'summon', color: '#8c7fa8', color2: '#d3c4ea', type: 'weapon', cls: 'summon', damage: 28, useTime: 0.5, mana: 10, minion: 'twins', value: 900, rarity: 'pink', hardmode: true, desc: 'Summons the twins to fight for you.' });

/* Armor */
function armor(id, name, slot, defense, o) {
  return item(id, Object.assign({ type: 'armor', equip: slot, art: slot === 'helmet' ? 'helmet' : (slot === 'chest' ? 'chest' : 'greaves'), stack: 1, defense, value: 20, color: '#b67848', color2: '#6f4b32' }, o));
}
const setDefs = [
  { key: 'copper', name: 'Copper', color: '#c37e52', color2: '#8a5535', def: [1, 3, 2], value: 15, mats: [['copperBar', 12], ['copperBar', 18], ['copperBar', 15]], rarity: 'white' },
  { key: 'iron', name: 'Iron', color: '#b7a79f', color2: '#746a66', def: [2, 4, 3], value: 30, mats: [['ironBar', 14], ['ironBar', 20], ['ironBar', 16]], rarity: 'white' },
  { key: 'silver', name: 'Silver', color: '#d6dfe5', color2: '#8c979e', def: [3, 5, 4], value: 60, mats: [['silverBar', 14], ['silverBar', 22], ['silverBar', 18]], rarity: 'blue' },
  { key: 'gold', name: 'Gold', color: '#eac84f', color2: '#9f8431', def: [4, 6, 5], value: 100, mats: [['goldBar', 16], ['goldBar', 24], ['goldBar', 20]], rarity: 'blue' },
  { key: 'shadow', name: 'Shadow', color: '#8061ac', color2: '#3f2f58', def: [5, 7, 6], value: 180, mats: [['demoniteBar', 10], ['demoniteBar', 14], ['demoniteBar', 12]], rarity: 'orange', setBonus: 'shadow' },
  { key: 'crimson', name: 'Crimson', color: '#bb4d5b', color2: '#6f2b36', def: [5, 7, 6], value: 180, mats: [['crimtaneBar', 10], ['crimtaneBar', 14], ['crimtaneBar', 12]], rarity: 'orange', setBonus: 'crimson' },
  { key: 'meteor', name: 'Meteor', color: '#a07587', color2: '#5a3d4a', def: [4, 6, 5], value: 160, mats: [['meteoriteBar', 10], ['meteoriteBar', 14], ['meteoriteBar', 12]], rarity: 'orange', setBonus: 'meteor' },
  { key: 'jungle', name: 'Jungle', color: '#75a84d', color2: '#3f642b', def: [5, 7, 6], value: 200, mats: [['jungleSpore', 8], ['jungleSpore', 10], ['jungleSpore', 8]], rarity: 'orange', setBonus: 'jungle' },
  { key: 'molten', name: 'Molten', color: '#de6b35', color2: '#8c3720', def: [7, 9, 8], value: 300, mats: [['hellstoneBar', 12], ['hellstoneBar', 16], ['hellstoneBar', 14]], rarity: 'red', setBonus: 'molten', light: 2 },
  { key: 'cobalt', name: 'Cobalt', color: '#5aa5d1', color2: '#386b89', def: [7, 10, 8], value: 280, mats: [['cobaltBar', 12], ['cobaltBar', 16], ['cobaltBar', 14]], rarity: 'blue', setBonus: 'speed', hardmode: true },
  { key: 'mythril', name: 'Mythril', color: '#66c8ad', color2: '#3e7f70', def: [9, 12, 10], value: 360, mats: [['mythrilBar', 12], ['mythrilBar', 18], ['mythrilBar', 14]], rarity: 'green', setBonus: 'magic', hardmode: true },
  { key: 'adamantite', name: 'Adamantite', color: '#d65b70', color2: '#8d3444', def: [11, 15, 12], value: 500, mats: [['adamantiteBar', 14], ['adamantiteBar', 20], ['adamantiteBar', 16]], rarity: 'red', setBonus: 'melee', hardmode: true }
];
for (const s of setDefs) {
  armor(s.key + 'Helmet', s.name + ' Helmet', 'helmet', s.def[0], { color: s.color, color2: s.color2, rarity: s.rarity, set: s.key, value: s.value, hardmode: !!s.hardmode });
  armor(s.key + 'Chestplate', s.name + ' Chestplate', 'chest', s.def[1], { color: s.color, color2: s.color2, rarity: s.rarity, set: s.key, value: s.value + 10, hardmode: !!s.hardmode });
  armor(s.key + 'Greaves', s.name + ' Greaves', 'legs', s.def[2], { color: s.color, color2: s.color2, rarity: s.rarity, set: s.key, value: s.value + 5, hardmode: !!s.hardmode });
}
item('ninjaHood', { name: 'Ninja Hood', art: 'helmet', type: 'armor', equip: 'helmet', defense: 3, stack: 1, color: '#3e4757', color2: '#20242d', rarity: 'orange', value: 100 });
item('ninjaShirt', { name: 'Ninja Shirt', art: 'chest', type: 'armor', equip: 'chest', defense: 4, stack: 1, color: '#3e4757', color2: '#20242d', rarity: 'orange', value: 100 });
item('ninjaPants', { name: 'Ninja Pants', art: 'greaves', type: 'armor', equip: 'legs', defense: 3, stack: 1, color: '#3e4757', color2: '#20242d', rarity: 'orange', value: 100 });

/* Accessories */
function acc(id, name, o) {
  return item(id, Object.assign({ type: 'accessory', accessory: true, equip: 'accessory', stack: 1, art: 'accessory', value: 20, color: '#d0b46a', desc: '' }, o));
}
acc('copperWatch', 'Copper Watch', { color: '#c88254', value: 30, desc: 'Tells the time of day.', effect: { watch: 1 } });
acc('depthMeter', 'Depth Meter', { color: '#9aa0a7', value: 40, desc: 'Shows your depth.', effect: { depth: 1 } });
acc('compass', 'Compass', { color: '#c6a35b', value: 40, desc: 'Shows your horizontal position.', effect: { compass: 1 } });
acc('aglet', 'Aglet', { color: '#c77452', value: 25, desc: 'Slightly increases movement speed.', effect: { speed: 0.06 } });
acc('shackle', 'Shackle', { color: '#89858c', value: 15, desc: '+1 defense.', effect: { defense: 1 } });
acc('hermesBoots', 'Hermes Boots', { color: '#c79a48', color2: '#8e632d', value: 80, desc: 'Allows you to run fast after a short sprint.', effect: { boots: 1 } });
acc('cloudInABottle', 'Cloud in a Bottle', { color: '#c8dcec', color2: '#88a6bd', value: 120, desc: 'Allows an extra mid-air jump.', effect: { doubleJump: 1 } });
acc('luckyHorseshoe', 'Lucky Horseshoe', { color: '#e8c24e', value: 90, desc: 'Negates fall damage.', effect: { noFall: 1 } });
acc('bandOfRegeneration', 'Band of Regeneration', { color: '#d5b25b', value: 100, desc: 'Slowly regenerates life.', effect: { regen: 1 } });
acc('bandOfStarpower', 'Band of Starpower', { color: '#7a62b7', value: 110, desc: 'Slowly regenerates mana.', effect: { manaRegen: 1 } });
acc('feralClaws', 'Feral Claws', { color: '#b79e63', value: 150, desc: 'Increases melee attack speed.', effect: { meleeSpeed: 0.12 } });
acc('magmaStone', 'Magma Stone', { color: '#d5643d', value: 200, desc: 'Melee attacks set enemies on fire.', effect: { magma: 1 } });
acc('obsidianSkull', 'Obsidian Skull', { color: '#4f475a', value: 120, desc: 'Grants immunity to fire blocks.', effect: { fireBlock: 1 } });
acc('grapplingHook', 'Grappling Hook', { color: '#b9a779', value: 100, desc: 'Press H to fire a grappling hook at the cursor.', effect: { grapple: 1 }, rarity: 'blue' });
acc('honeyComb', 'Honey Comb', { color: '#e2b846', value: 200, desc: 'Release bees when hurt.', effect: { bees: 1 } });
acc('manaFlower', 'Mana Flower', { color: '#5b90dd', value: 250, desc: 'Automatically consumes mana potions when needed.', effect: { autoMana: 1 }, rarity: 'orange' });
acc('luxorGift', "Luxor's Gift", { color: '#8e6bc2', value: 250, desc: 'Melee attacks release a radiant bolt.', effect: { radiant: 1 }, rarity: 'orange' });
acc('frostsparkBoots', 'Frostspark Boots', { color: '#7bb9e8', color2: '#c8e8ff', value: 300, desc: 'Run fast and leave ice in your wake.', effect: { boots: 1, iceTrail: 1 }, rarity: 'orange' });
acc('regenBand', 'Charm of Myths', { color: '#d7a35b', value: 300, desc: 'Regenerates life, and reduces healing cooldown.', effect: { regen: 2, healBoost: 1 }, rarity: 'orange' });
acc('starVeil', 'Star Veil', { color: '#8070c0', value: 300, desc: 'Stars fall when you are hurt.', effect: { starVeil: 1 }, rarity: 'orange' });
acc('ankletOfTheWind', 'Anklet of the Wind', { color: '#7fba73', value: 100, desc: '+10% movement speed.', effect: { speed: 0.1 }, rarity: 'blue' });
acc('magicQuiver', 'Magic Quiver', { color: '#8b9a64', value: 300, desc: 'Increases arrow damage.', effect: { arrowBonus: 0.1 }, rarity: 'orange' });
acc('rangerEmblem', 'Ranger Emblem', { color: '#bf7b47', value: 400, desc: '+15% ranged damage.', effect: { rangedDamage: 0.15 }, rarity: 'orange' });
acc('warriorEmblem', 'Warrior Emblem', { color: '#c14d4d', value: 400, desc: '+15% melee damage.', effect: { meleeDamage: 0.15 }, rarity: 'orange' });
acc('sorcererEmblem', 'Sorcerer Emblem', { color: '#8b64c1', value: 400, desc: '+15% magic damage.', effect: { magicDamage: 0.15 }, rarity: 'orange' });
acc('summonerEmblem', 'Summoner Emblem', { color: '#b69a4e', value: 400, desc: '+15% summon damage.', effect: { summonDamage: 0.15 }, rarity: 'orange' });
acc('shieldOfCthulhu', 'Shield of Cthulhu', { color: '#8c5d79', value: 300, desc: 'Double tap a direction to dash.', effect: { dash: 1 }, rarity: 'orange' });
acc('wormScarf', 'Worm Scarf', { color: '#72556e', value: 300, desc: 'Reduces damage taken by 17%.', effect: { damageReduction: 0.17 }, rarity: 'orange' });
acc('brainOfConfusion', 'Brain of Confusion', { color: '#b15568', value: 300, desc: 'May confuse nearby enemies when hurt.', effect: { confuse: 1 }, rarity: 'orange' });
acc('royalGel', 'Royal Gel', { color: '#7d8ed7', value: 100, desc: 'Slimes no longer attack you.', effect: { slimePeace: 1 }, rarity: 'orange' });
acc('bundleOfBalloons', 'Bundle of Balloons', { color: '#ad6c8e', value: 300, desc: 'Three extra jumps.', effect: { doubleJump: 3 }, rarity: 'orange' });

/* Potions and consumables */
function potion(id, name, o) {
  return item(id, Object.assign({ type: 'potion', art: 'potion', stack: 30, consumable: true, useTime: 0.5, value: 10, color: '#d24e5e', useSound: 'gulp', desc: 'A shimmering potion.' }, o));
}
potion('lesserHealingPotion', 'Lesser Healing Potion', { heal: 50, value: 6, color: '#d84d5c', desc: 'Restores 50 life.' });
potion('healingPotion', 'Healing Potion', { heal: 100, value: 20, color: '#e04b5f', desc: 'Restores 100 life.' });
potion('greaterHealingPotion', 'Greater Healing Potion', { heal: 150, value: 45, color: '#e55570', desc: 'Restores 150 life.', rarity: 'orange' });
potion('manaPotion', 'Mana Potion', { manaRestore: 50, value: 10, color: '#547ce0', desc: 'Restores 50 mana.' });
potion('greaterManaPotion', 'Greater Mana Potion', { manaRestore: 100, value: 25, color: '#5b8df2', desc: 'Restores 100 mana.', rarity: 'blue' });
potion('ironskinPotion', 'Ironskin Potion', { buff: 'ironskin', duration: 240, value: 20, color: '#aab4c1', desc: 'Increases defense by 8 for 4 minutes.' });
potion('swiftnessPotion', 'Swiftness Potion', { buff: 'swiftness', duration: 240, value: 20, color: '#78d1a1', desc: 'Increases movement speed by 25%.' });
potion('regenerationPotion', 'Regeneration Potion', { buff: 'regeneration', duration: 240, value: 25, color: '#e28cb3', desc: 'Rapidly regenerates life.' });
potion('shinePotion', 'Shine Potion', { buff: 'shine', duration: 360, value: 15, color: '#f8dc72', desc: 'Emits light around you.' });
potion('nightOwlPotion', 'Night Owl Potion', { buff: 'nightOwl', duration: 360, value: 15, color: '#9283d9', desc: 'Increases night vision.' });
potion('obsidianSkinPotion', 'Obsidian Skin Potion', { buff: 'obsidianSkin', duration: 240, value: 30, color: '#74688a', desc: 'Grants immunity to lava and fire blocks.' });
potion('thornsPotion', 'Thorns Potion', { buff: 'thorns', duration: 240, value: 30, color: '#b6854d', desc: 'Reflects some damage back at attackers.' });
potion('hunterPotion', 'Hunter Potion', { buff: 'hunter', duration: 300, value: 25, color: '#d87456', desc: 'Highlights nearby enemies.' });
potion('infernoPotion', 'Inferno Potion', { buff: 'inferno', duration: 240, value: 40, color: '#ef8c45', desc: 'Creates a ring of fire around you.' });
potion('recallPotion', 'Recall Potion', { value: 10, color: '#7fb1e8', desc: 'Teleports you home.', effect: 'recall' });
potion('waterWalkingPotion', 'Water Walking Potion', { buff: 'waterWalk', duration: 300, value: 30, color: '#79c1dc', desc: 'Walk on liquids.' });
potion('battlePotion', 'Battle Potion', { buff: 'battle', duration: 420, value: 20, color: '#c0574f', desc: 'Increases enemy spawn rate.' });
potion('calmingPotion', 'Calming Potion', { buff: 'calming', duration: 360, value: 20, color: '#79b58e', desc: 'Decreases enemy spawn rate.' });
potion('buildingPotion', 'Builder Potion', { buff: 'builder', duration: 420, value: 25, color: '#c5a266', desc: 'Increases placement speed and reach.' });
potion('miningPotion', 'Mining Potion', { buff: 'mining', duration: 360, value: 25, color: '#96b1be', desc: 'Increases mining speed by 25%.' });
item('lifeCrystal', { name: 'Life Crystal', art: 'lifeCrystal', color: '#f06a91', type: 'consumable', stack: 99, useTime: 1.1, value: 50, consumable: true, desc: 'Permanently increases maximum life by 20. Cap: 400.', light: 2 });
item('manaCrystal', { name: 'Mana Crystal', art: 'manaCrystal', color: '#5b8fe8', type: 'consumable', stack: 99, useTime: 1.1, value: 50, consumable: true, desc: 'Permanently increases maximum mana by 20. Cap: 200.', light: 2 });

/* Boss summons and trophies */
item('suspiciousEye', { name: 'Suspicious Looking Eye', art: 'summonEye', color: '#dbd7d0', color2: '#733f56', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Summons the Eye of Cthulhu at night. Use it while below the surface.', consumable: true, rarity: 'orange' });
item('slimeCrown', { name: 'Slime Crown', art: 'crown', color: '#e5c24f', color2: '#7a6bb5', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Summons the King Slime.', consumable: true, rarity: 'orange' });
item('wormFood', { name: 'Worm Food', art: 'bossSummon', color: '#7e5b9e', color2: '#d3b06b', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Summons the Eater of Worlds in the Corruption.', consumable: true, rarity: 'orange' });
item('bloodySpine', { name: 'Bloody Spine', art: 'bossSummon', color: '#ae4455', color2: '#e9b0b2', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Summons the Brain of Cthulhu in the Crimson.', consumable: true, rarity: 'orange' });
item('abeemination', { name: 'Abeemination', art: 'bossSummon', color: '#e2b23d', color2: '#f0dd97', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Summons the Queen Bee in the Jungle.', consumable: true, rarity: 'orange' });
item('guideVoodooDoll', { name: 'Guide Voodoo Doll', art: 'doll', color: '#b2875b', color2: '#a53838', type: 'summonItem', stack: 20, useTime: 0.8, value: 100, desc: 'Use in the Underworld to summon the Wall of Flesh. The Guide will be lost.', consumable: true, rarity: 'orange' });
item('eyeTrophy', { name: 'Eye of Cthulhu Trophy', art: 'trophy', color: '#d3c9bc', color2: '#8c586d', type: 'trophy', stack: 1, value: 200, rarity: 'orange', block: TILE.BOSS_TROPHY, furniture: true, desc: 'A grim monument to a fallen god.' });
item('slimeTrophy', { name: 'King Slime Trophy', art: 'trophy', color: '#7189d8', color2: '#d7c15f', type: 'trophy', stack: 1, value: 200, rarity: 'orange', block: TILE.BOSS_TROPHY, furniture: true });
item('eaterTrophy', { name: 'Eater of Worlds Trophy', art: 'trophy', color: '#75578f', color2: '#c5a467', type: 'trophy', stack: 1, value: 200, rarity: 'orange', block: TILE.BOSS_TROPHY, furniture: true });
item('skeletronTrophy', { name: 'Skeletron Trophy', art: 'trophy', color: '#d7d0ba', color2: '#4f5870', type: 'trophy', stack: 1, value: 200, rarity: 'orange', block: TILE.BOSS_TROPHY, furniture: true });
item('queenBeeTrophy', { name: 'Queen Bee Trophy', art: 'trophy', color: '#d9ae4b', color2: '#8a6728', type: 'trophy', stack: 1, value: 200, rarity: 'orange', block: TILE.BOSS_TROPHY, furniture: true });
item('wofTrophy', { name: 'Wall of Flesh Trophy', art: 'trophy', color: '#ad4a54', color2: '#d7b066', type: 'trophy', stack: 1, value: 500, rarity: 'red', block: TILE.BOSS_TROPHY, furniture: true });
/* Unique boss loot */
item('slimeGun', { name: 'Slime Gun', art: 'gun', color: '#7d8fd8', type: 'weapon', cls: 'ranged', damage: 6, useTime: 0.3, projectile: 'slimeGun', projectileSpeed: 10, value: 100, rarity: 'orange', ammo: null, desc: 'Fires a harmless splash of slime. Mostly.' });
item('kingSlimeMask', { name: 'King Slime Mask', art: 'helmet', type: 'armor', equip: 'helmet', defense: 2, stack: 1, color: '#6f84cc', color2: '#d8c053', value: 100, rarity: 'orange' });
item('eyeMask', { name: 'Eye of Cthulhu Mask', art: 'helmet', type: 'armor', equip: 'helmet', defense: 2, stack: 1, color: '#cdc4be', color2: '#7c4553', value: 100, rarity: 'orange' });
item('eaterMask', { name: 'Eater of Worlds Mask', art: 'helmet', type: 'armor', equip: 'helmet', defense: 2, stack: 1, color: '#6e548a', color2: '#c2a263', value: 100, rarity: 'orange' });
item('skeletronMask', { name: 'Skeletron Mask', art: 'helmet', type: 'armor', equip: 'helmet', defense: 2, stack: 1, color: '#d9d3c3', color2: '#4d566d', value: 100, rarity: 'orange' });
item('hiveBackpack', { name: 'Hive Backpack', art: 'accessory', type: 'accessory', accessory: true, equip: 'accessory', color: '#d3ad48', value: 150, rarity: 'orange', effect: { bees: 2 }, desc: 'Releases angry bees when you are hurt.' });
item('clockworkAssaultRifle', { name: 'Clockwork Assault Rifle', art: 'gun', color: '#a1855a', type: 'weapon', cls: 'ranged', damage: 23, useTime: 0.12, projectile: 'bullet', projectileSpeed: 18, ammo: 'bullet', burst: 3, value: 500, rarity: 'orange' });
item('breakerBlade', { name: 'Breaker Blade', art: 'sword', color: '#77737e', type: 'weapon', cls: 'melee', damage: 55, useTime: 0.4, knockback: 8, value: 700, rarity: 'orange' });

/* Loot / rare objects */
item('surpriseBox', { name: 'Surprise Box', art: 'chest', color: '#c27f58', type: 'material', value: 20, rarity: 'blue', desc: 'Something rattles inside.' });
item('goldenCrown', { name: 'Golden Crown', art: 'crown', color: '#f0cd56', type: 'material', value: 50, rarity: 'blue' });
item('heartLantern', { name: 'Heart Lantern', art: 'lantern', color: '#f06a91', block: TILE.LANTERN, type: 'block', value: 30, rarity: 'blue', furniture: true, light: 6 });
item('starLantern', { name: 'Star in a Bottle', art: 'lantern', color: '#70b6e8', type: 'accessory', accessory: true, equip: 'accessory', value: 100, rarity: 'blue', effect: { manaRegen: 2 }, desc: 'Rapidly regenerates mana.' });
item('waterCandle', { name: 'Water Candle', art: 'candle', color: '#6a8fca', block: TILE.CANDLE, type: 'block', value: 10, rarity: 'blue' });
item('luckyCoin', { name: 'Lucky Coin', art: 'coin', color: '#e5c14e', type: 'accessory', accessory: true, equip: 'accessory', value: 200, rarity: 'orange', effect: { luckyCoin: 1 }, desc: 'Enemies sometimes drop extra coins.' });
item('soulCatcher', { name: 'Soul Catcher', art: 'lantern', color: '#8cd7e8', type: 'material', value: 30, rarity: 'blue' });
item('shadowKey', { name: 'Shadow Key', art: 'key', color: '#8968a7', type: 'material', value: 50, rarity: 'orange', desc: 'Unlocks shadow chests in the Underworld.' });

/* Fix a few intentional shorthand definitions above. */
delete ITEMS.woodenArrow.name2;
ITEMS.woodenArrow.name = 'Wooden Arrow';
ITEMS.woodenArrow.desc = 'A simple arrow for a simple bow.';
ITEMS.woodenArrow.ammoType = 'arrow';

/* Assign material art where it was omitted. */
const artFixes = {
  wood: 'wood', stoneBlock: 'block', dirtBlock: 'block', sandBlock: 'block', sandstoneBlock: 'block',
  snowBlock: 'block', iceBlock: 'block', mudBlock: 'block', ebonstoneBlock: 'block', crimstoneBlock: 'block', ashBlock: 'block',
  clayBlock: 'block', coral: 'plant', cactus: 'plant', mushroom: 'mushroom', glowMushroom: 'mushroom',
  hiveBlock: 'block', honeyBlock: 'block', dungeonBrick: 'brick', hellstoneOre: 'ore', meteoriteOre: 'ore',
  fallenStar: 'star', lens: 'lens', blackLens: 'lens', beeWax: 'chunk', crystalShard: 'gem', soulOfNight: 'soul',
  soulOfLight: 'soul', bottledWater: 'potion', bottle: 'bottle', goldenKey: 'key', shadowKey: 'key', chain: 'chain'
};
for (const k in artFixes) if (ITEMS[k]) ITEMS[k].art = artFixes[k];

/* ---------------------------------------------------------------------------------------------
   Recipes
------------------------------------------------------------------------------------------------- */
const RECIPES = [];
function recipe(id, out, count, ingredients, station = null, opts = {}) {
  RECIPES.push(Object.assign({ id, out, count, ingredients, station }, opts));
}
/* Basics */
recipe('workbench', 'workbench', 1, [['wood', 10]]);
recipe('woodPlatform', 'woodPlatform', 2, [['wood', 1]]);
recipe('woodWall', 'woodWall', 4, [['wood', 1]]);
recipe('woodSword', 'woodSword', 1, [['wood', 7]]);
recipe('woodenBow', 'woodenBow', 1, [['wood', 10]]);
recipe('woodenArrow', 'woodenArrow', 10, [['wood', 1], ['stoneBlock', 1]]);
recipe('torch', 'torch', 3, [['wood', 1], ['gel', 1]]);
recipe('campfire', 'campfire', 1, [['wood', 10], ['torch', 3]]);
recipe('table', 'table', 1, [['wood', 8]]);
recipe('chair', 'chair', 1, [['wood', 4]]);
recipe('woodDoor', 'woodDoor', 1, [['wood', 6]]);
recipe('chest', 'chest', 1, [['wood', 8], ['ironBar', 2]]);
recipe('rope', 'rope', 10, [['cobweb', 3]]);
recipe('candle', 'candle', 1, [['wood', 1], ['torch', 1]]);
recipe('flag', 'flag', 1, [['silk', 2], ['wood', 4]]);
recipe('barrel', 'barrel', 1, [['wood', 8]]);
recipe('bookshelf', 'bookshelf', 1, [['wood', 10], ['silk', 3]], 'workbench');
recipe('bed', 'bed', 1, [['wood', 15], ['silk', 5]], 'workbench');
recipe('loom', 'loom', 1, [['wood', 12], ['silk', 2]], 'workbench');
recipe('furnace', 'furnace', 1, [['stoneBlock', 20], ['wood', 4], ['torch', 3]], 'workbench');
recipe('anvil', 'anvil', 1, [['ironBar', 5]], 'workbench');
recipe('alchemyTable', 'alchemyTable', 1, [['wood', 8], ['bottle', 2], ['gel', 4]], 'workbench');
recipe('silk', 'silk', 1, [['cobweb', 7]], 'loom');
recipe('planterBox', 'planterBox', 2, [['wood', 2], ['dirtBlock', 2]], 'workbench');
recipe('stonePlatform', 'stonePlatform', 2, [['stoneBlock', 1]], 'workbench');
recipe('glass', 'glassBlock', 2, [['sandBlock', 2]], 'furnace');
recipe('glassWall', 'glassWall', 4, [['glassBlock', 1]], 'workbench');
recipe('grayBrick', 'grayBrick', 2, [['stoneBlock', 2]], 'furnace');
recipe('redBrick', 'redBrick', 2, [['clayBlock', 2]], 'furnace');
recipe('brickWall', 'brickWall', 4, [['grayBrick', 1]], 'workbench');
recipe('stoneWall', 'stoneWall', 4, [['stoneBlock', 1]], 'workbench');
recipe('sandstoneBlock', 'sandstoneBlock', 2, [['sandBlock', 2]], 'furnace');
recipe('copperBrick', 'copperBrick', 2, [['stoneBlock', 1], ['copperOre', 1]], 'furnace');
recipe('silverBrick', 'silverBrick', 2, [['stoneBlock', 1], ['silverOre', 1]], 'furnace');
recipe('goldBrick', 'goldBrick', 2, [['stoneBlock', 1], ['goldOre', 1]], 'furnace');
recipe('bottle', 'bottle', 1, [['glassBlock', 1]], 'furnace');
recipe('bottledWater', 'bottledWater', 1, [['bottle', 1]], 'alchemy');
recipe('cobweb', 'cobweb', 1, [['webRope', 2]], 'loom');

/* Smelting */
const smelt = [
  ['copperOre', 'copperBar'], ['tinOre', 'tinBar'], ['ironOre', 'ironBar'], ['leadOre', 'leadBar'],
  ['silverOre', 'silverBar'], ['tungstenOre', 'tungstenBar'], ['goldOre', 'goldBar'], ['platinumOre', 'platinumBar'],
  ['demoniteOre', 'demoniteBar'], ['crimtaneOre', 'crimtaneBar'], ['meteoriteOre', 'meteoriteBar']
];
for (const [ore, bar] of smelt) recipe('smelt_' + bar, bar, 1, [[ore, 3]], 'furnace');
recipe('smelt_hellstoneBar', 'hellstoneBar', 1, [['hellstoneOre', 2], ['obsidian', 1]], 'hellforge');
recipe('smelt_cobaltBar', 'cobaltBar', 1, [['cobaltOre', 3]], 'furnace', { hardmode: true });
recipe('smelt_mythrilBar', 'mythrilBar', 1, [['mythrilOre', 4]], 'furnace', { hardmode: true });
recipe('smelt_adamantiteBar', 'adamantiteBar', 1, [['adamantiteOre', 5]], 'furnace', { hardmode: true });
recipe('obsidian', 'obsidian', 1, [['water', 0]]); // water+lavamade elsewhere special
RECIPES.pop();
recipe('hellforge', 'hellforge', 1, [['stoneBlock', 20], ['hellstoneOre', 10], ['obsidian', 4]], 'workbench');

/* Weapons and tools */
const toolRecipes = [
  ['copperPickaxe', [['copperBar', 8], ['wood', 4]], 'workbench'],
  ['ironPickaxe', [['ironBar', 10], ['wood', 4]], 'anvil'],
  ['silverPickaxe', [['silverBar', 10], ['wood', 4]], 'anvil'],
  ['goldPickaxe', [['goldBar', 10], ['wood', 4]], 'anvil'],
  ['nightmarePickaxe', [['demoniteBar', 12], ['shadowScale', 6]], 'anvil'],
  ['moltenPickaxe', [['hellstoneBar', 15]], 'hellforge'],
  ['cobaltPickaxe', [['cobaltBar', 12]], 'anvil'],
  ['mythrilPickaxe', [['mythrilBar', 15]], 'anvil'],
  ['copperAxe', [['copperBar', 6], ['wood', 3]], 'workbench'],
  ['ironAxe', [['ironBar', 8], ['wood', 3]], 'anvil'],
  ['silverAxe', [['silverBar', 8], ['wood', 3]], 'anvil'],
  ['goldAxe', [['goldBar', 8], ['wood', 3]], 'anvil'],
  ['warAxeOfTheNight', [['demoniteBar', 8], ['shadowScale', 4]], 'anvil'],
  ['moltenHamaxe', [['hellstoneBar', 15]], 'hellforge'],
  ['copperHammer', [['copperBar', 6], ['wood', 3]], 'workbench'],
  ['ironHammer', [['ironBar', 8], ['wood', 3]], 'anvil'],
  ['silverHammer', [['silverBar', 10], ['wood', 3]], 'anvil'],
  ['goldHammer', [['goldBar', 10], ['wood', 3]], 'anvil'],
  ['copperShortsword', [['copperBar', 6]], 'workbench'],
  ['ironBroadsword', [['ironBar', 8]], 'anvil'],
  ['silverBroadsword', [['silverBar', 8]], 'anvil'],
  ['goldBroadsword', [['goldBar', 10]], 'anvil'],
  ['lightsBane', [['demoniteBar', 10], ['shadowScale', 5]], 'anvil'],
  ['bloodButcherer', [['crimtaneBar', 10], ['tissueSample', 5]], 'anvil'],
  ['bladeOfGrass', [['jungleSpore', 12], ['stinger', 12]], 'anvil'],
  ['fieryGreatsword', [['hellstoneBar', 12]], 'hellforge'],
  ['copperBow', [['copperBar', 8], ['wood', 5]], 'workbench'],
  ['ironBow', [['ironBar', 8], ['wood', 5]], 'anvil'],
  ['silverBow', [['silverBar', 8], ['wood', 5]], 'anvil'],
  ['goldBow', [['goldBar', 10], ['wood', 5]], 'anvil'],
  ['demonBow', [['demoniteBar', 8], ['shadowScale', 3]], 'anvil'],
  ['moltenFury', [['hellstoneBar', 12]], 'hellforge'],
  ['cobaltRepeater', [['cobaltBar', 12]], 'anvil'],
  ['mythrilRepeater', [['mythrilBar', 15]], 'anvil'],
  ['flintlockPistol', [['ironBar', 10], ['wood', 5]], 'anvil'],
  ['musket', [['ironBar', 15], ['wood', 8]], 'anvil'],
  ['boomstick', [['goldBar', 12], ['wood', 8]], 'anvil'],
  ['minishark', [['ironBar', 15], ['silverBar', 10], ['goldBar', 5]], 'anvil'],
  ['spaceGun', [['meteoriteBar', 15], ['fallenStar', 5]], 'anvil'],
  ['amethystStaff', [['amethyst', 4], ['wood', 8]], 'workbench'],
  ['topazStaff', [['topaz', 4], ['wood', 8]], 'workbench'],
  ['sapphireStaff', [['sapphire', 5], ['wood', 10]], 'anvil'],
  ['emeraldStaff', [['emerald', 5], ['wood', 10]], 'anvil'],
  ['rubyStaff', [['ruby', 6], ['wood', 12]], 'anvil'],
  ['diamondStaff', [['diamond', 8], ['wood', 15]], 'anvil'],
  ['flamingArrow', [['woodenArrow', 10], ['torch', 1]], 'workbench'],
  ['unholyArrow', [['woodenArrow', 10], ['demoniteBar', 1]], 'anvil'],
  ['musketBall', [['ironBar', 1]], 'anvil'],
  ['silverBullet', [['silverBar', 1]], 'anvil'],
  ['meteorShot', [['meteoriteBar', 1]], 'anvil'],
  ['shuriken', [['ironBar', 1]], 'anvil'],
  ['grenade', [['ironBar', 1], ['gel', 2]], 'anvil'],
  ['bomb', [['ironBar', 2], ['gel', 3]], 'anvil'],
  ['dynamite', [['ironBar', 3], ['gel', 4], ['goldBar', 1]], 'anvil'],
  ['molotov', [['bottle', 1], ['gel', 2], ['silk', 1]], 'workbench'],
  ['spike', [['ironBar', 1]], 'anvil'],
  ['pressurePlate', [['ironBar', 1]], 'anvil'],
  ['dartTrap', [['ironBar', 3]], 'anvil']
];
for (const [out, ings, station] of toolRecipes) recipe('craft_' + out, out, 1, ings, station);

/* Armor */
for (const s of setDefs) {
  const bar = s.mats[0][0];
  const st = (s.key === 'molten') ? 'hellforge' : 'anvil';
  recipe('armor_' + s.key + 'Helmet', s.key + 'Helmet', 1, [[bar, Math.ceil(s.mats[0][1] * 0.7)]], st);
  recipe('armor_' + s.key + 'Chestplate', s.key + 'Chestplate', 1, [[bar, Math.ceil(s.mats[1][1] * 0.8)]], st);
  recipe('armor_' + s.key + 'Greaves', s.key + 'Greaves', 1, [[bar, Math.ceil(s.mats[2][1] * 0.75)]], st);
}
recipe('ninjaHood', 'ninjaHood', 1, [['silk', 10], ['blackThread', 5]], 'loom', { hidden: true });
recipe('ninjaShirt', 'ninjaShirt', 1, [['silk', 12], ['blackThread', 5]], 'loom', { hidden: true });
recipe('ninjaPants', 'ninjaPants', 1, [['silk', 12], ['blackThread', 5]], 'loom', { hidden: true });

/* Accessories */
const accRecipes = [
  ['copperWatch', [['copperBar', 3], ['chain', 1]], 'workbench'],
  ['depthMeter', [['copperBar', 3], ['chain', 1]], 'workbench'],
  ['compass', [['copperBar', 3], ['chain', 1]], 'workbench'],
  ['aglet', [['ironBar', 2], ['silk', 2]], 'workbench'],
  ['shackle', [['ironBar', 3]], 'workbench'],
  ['hermesBoots', [['ironBar', 5], ['silk', 4]], 'workbench'],
  ['cloudInABottle', [['cloudBlock', 20], ['bottle', 1]], 'workbench'],
  ['luckyHorseshoe', [['goldBar', 3], ['silk', 2]], 'workbench'],
  ['bandOfRegeneration', [['goldBar', 3], ['lifeCrystal', 1]], 'workbench'],
  ['bandOfStarpower', [['goldBar', 3], ['manaCrystal', 1]], 'workbench'],
  ['feralClaws', [['silverBar', 4], ['stinger', 4]], 'workbench'],
  ['magmaStone', [['hellstoneOre', 6], ['obsidian', 3]], 'hellforge'],
  ['obsidianSkull', [['obsidian', 20]], 'workbench'],
  ['grapplingHook', [['ironBar', 5], ['chain', 3]], 'workbench'],
  ['honeyComb', [['honeyBlock', 10]], 'workbench'],
  ['manaFlower', [['manaCrystal', 2], ['moonglow', 2]], 'alchemy'],
  ['ankletOfTheWind', [['silverBar', 3], ['vine', 6]], 'workbench'],
  ['magicQuiver', [['silk', 5], ['silverBar', 3]], 'workbench'],
  ['starVeil', [['fallenStar', 3], ['silk', 5]], 'workbench'],
  ['frostsparkBoots', [['hermesBoots', 1], ['iceBlock', 20]], 'workbench'],
  ['bundleOfBalloons', [['cloudInABottle', 1], ['silk', 10], ['gel', 10]], 'workbench'],
  ['rangerEmblem', [['soulOfLight', 3], ['silk', 5]], 'workbench', { hidden: true }],
  ['warriorEmblem', [['soulOfNight', 3], ['silk', 5]], 'workbench', { hidden: true }],
  ['sorcererEmblem', [['soulOfLight', 3], ['soulOfNight', 2]], 'workbench', { hidden: true }]
];
for (const [out, ings, st] of accRecipes) recipe('craft_' + out, out, 1, ings, st);

/* Potions */
const potionRecipes = [
  ['lesserHealingPotion', [['mushroom', 1], ['daybloom', 1], ['bottledWater', 1]], 1],
  ['healingPotion', [['lesserHealingPotion', 1], ['glowMushroom', 1], ['daybloom', 1]], 1],
  ['greaterHealingPotion', [['healingPotion', 1], ['moonglow', 1], ['crystalShard', 1]], 1],
  ['manaPotion', [['blinkroot', 1], ['bottledWater', 1]], 1],
  ['greaterManaPotion', [['manaPotion', 1], ['moonglow', 1], ['fallenStar', 1]], 1],
  ['ironskinPotion', [['daybloom', 1], ['ironOre', 1], ['bottledWater', 1]], 1],
  ['swiftnessPotion', [['blinkroot', 1], ['snowBlock', 1], ['bottledWater', 1]], 1],
  ['regenerationPotion', [['daybloom', 1], ['mushroom', 1], ['bottledWater', 1]], 1],
  ['shinePotion', [['daybloom', 1], ['glowMushroom', 1], ['bottledWater', 1]], 1],
  ['nightOwlPotion', [['daybloom', 1], ['blinkroot', 1], ['bottledWater', 1]], 1],
  ['obsidianSkinPotion', [['obsidian', 2], ['waterleaf', 1], ['bottledWater', 1]], 1],
  ['thornsPotion', [['deathweed', 1], ['cactus', 1], ['bottledWater', 1]], 1],
  ['hunterPotion', [['deathweed', 1], ['sharkFin', 1], ['bottledWater', 1]], 1],
  ['infernoPotion', [['fireblossom', 1], ['ash', 2], ['bottledWater', 1]], 1],
  ['waterWalkingPotion', [['waterleaf', 1], ['sharkFin', 1], ['bottledWater', 1]], 1],
  ['battlePotion', [['deathweed', 1], ['rottenChunk', 1], ['bottledWater', 1]], 1],
  ['calmingPotion', [['daybloom', 1], ['waterleaf', 1], ['bottledWater', 1]], 1],
  ['buildingPotion', [['blinkroot', 1], ['stoneBlock', 1], ['bottledWater', 1]], 1],
  ['miningPotion', [['blinkroot', 1], ['silverOre', 1], ['bottledWater', 1]], 1],
  ['recallPotion', [['waterleaf', 1], ['moonglow', 1], ['bottledWater', 1]], 1]
];
for (const [out, ings, count] of potionRecipes) recipe('potion_' + out, out, count, ings, 'alchemy');

/* Summoning items at altars */
recipe('summon_suspiciousEye', 'suspiciousEye', 1, [['lens', 6]], 'altar');
recipe('summon_slimeCrown', 'slimeCrown', 1, [['gel', 20], ['goldenCrown', 1]], 'altar');
recipe('summon_wormFood', 'wormFood', 1, [['rottenChunk', 15], ['shadowScale', 3]], 'altar');
recipe('summon_bloodySpine', 'bloodySpine', 1, [['tissueSample', 15], ['crimtaneOre', 5]], 'altar');
recipe('summon_abeemination', 'abeemination', 1, [['honeyBlock', 5], ['stinger', 5], ['beeWax', 2]], 'altar');
recipe('summon_guideDoll', 'guideVoodooDoll', 1, [['silk', 10], ['bone', 5], ['ash', 10]], 'altar');
recipe('goldenCrown', 'goldenCrown', 1, [['goldBar', 5], ['ruby', 1]], 'anvil');

/* Special composite gear */
recipe('nightsEdge', 'nightsEdge', 1, [['lightsBane', 1], ['bladeOfGrass', 1], ['muramasa', 1], ['fieryGreatsword', 1]], 'altar');
recipe('hiveBackpack', 'hiveBackpack', 1, [['honeyComb', 1], ['beeWax', 5], ['silk', 5]], 'anvil');
recipe('opticStaff', 'opticStaff', 1, [['soulOfLight', 20], ['soulOfNight', 20], ['silverBar', 10]], 'anvil', { hardmode: true });
recipe('heartLantern', 'heartLantern', 1, [['lifeCrystal', 1], ['chain', 2], ['torch', 1]], 'workbench');
recipe('starLantern', 'starLantern', 1, [['fallenStar', 1], ['bottle', 1]], 'workbench');

/* Hardmode weapons */
const hardRecipes = [
  ['cobaltSword', 'Cobalt Sword', 'sword', 'cobaltBar', 10, 48, 0.23, '#5ba6d8'],
  ['mythrilSword', 'Mythril Sword', 'sword', 'mythrilBar', 12, 62, 0.22, '#67cbb0'],
  ['adamantiteSword', 'Adamantite Sword', 'sword', 'adamantiteBar', 14, 78, 0.21, '#df677b'],
  ['cobaltHelmet', 'Cobalt Helmet', 'armor', 'cobaltBar', 0, 0, 0, '#5ba6d8'],
  ['mythrilHelmet', 'Mythril Helmet', 'armor', 'mythrilBar', 0, 0, 0, '#67cbb0']
];
item('cobaltSword', { name: 'Cobalt Sword', art: 'sword', type: 'weapon', cls: 'melee', damage: 46, useTime: 0.23, value: 400, color: '#62addb', rarity: 'blue', hardmode: true });
item('mythrilSword', { name: 'Mythril Sword', art: 'sword', type: 'weapon', cls: 'melee', damage: 60, useTime: 0.22, value: 600, color: '#70d3ba', rarity: 'green', hardmode: true });
item('adamantiteSword', { name: 'Adamantite Sword', art: 'sword', type: 'weapon', cls: 'melee', damage: 78, useTime: 0.21, value: 900, color: '#e06b7e', rarity: 'red', hardmode: true });
recipe('cobaltSword', 'cobaltSword', 1, [['cobaltBar', 12]], 'anvil', { hardmode: true });
recipe('mythrilSword', 'mythrilSword', 1, [['mythrilBar', 15]], 'anvil', { hardmode: true });
recipe('adamantiteSword', 'adamantiteSword', 1, [['adamantiteBar', 18]], 'anvil', { hardmode: true });

/* ---------------------------------------------------------------------------------------------
   Enemies
------------------------------------------------------------------------------------------------- */
const ENEMIES = {};
function enemy(id, o) {
  ENEMIES[id] = Object.assign({
    id, name: 'Enemy', hp: 30, damage: 10, defense: 0, speed: 40, knockback: 4, color: '#8dbc6b',
    w: 18, h: 18, ai: 'walker', biomes: ['forest'], minDepth: 0, maxDepth: 9999,
    mode: 'any', minTime: 0, maxTime: 1, weight: 1, value: 0, xp: 0, ranged: null,
    drops: [], boss: false, light: 0, lightColor: '#ffffff', sprite: null, critter: false
  }, o);
}
enemy('greenSlime', { name: 'Green Slime', hp: 14, damage: 7, defense: 0, speed: 38, w: 22, h: 16, ai: 'slime', color: '#71c35d', biomes: ['forest'], value: 2, drops: [{ id: 'gel', chance: 1, min: 1, max: 2 }], sprite: 'slime' });
enemy('blueSlime', { name: 'Blue Slime', hp: 25, damage: 9, defense: 1, speed: 42, w: 24, h: 18, ai: 'slime', color: '#5d9bdc', biomes: ['forest'], value: 3, drops: [{ id: 'gel', chance: 1, min: 1, max: 3 }], sprite: 'slime' });
enemy('purpleSlime', { name: 'Purple Slime', hp: 36, damage: 11, defense: 2, speed: 44, w: 26, h: 20, ai: 'slime', color: '#9a63c8', biomes: ['forest'], minDepth: 100, value: 5, drops: [{ id: 'gel', chance: 1, min: 2, max: 4 }], sprite: 'slime' });
enemy('iceSlime', { name: 'Ice Slime', hp: 30, damage: 10, defense: 2, speed: 40, w: 24, h: 18, ai: 'slime', color: '#7dc7dd', biomes: ['snow'], value: 4, drops: [{ id: 'gel', chance: 1, min: 1, max: 3 }, { id: 'iceBlock', chance: 0.4 }], sprite: 'slime' });
enemy('sandSlime', { name: 'Sand Slime', hp: 28, damage: 9, defense: 1, speed: 46, w: 24, h: 18, ai: 'slime', color: '#dcc06b', biomes: ['desert'], value: 4, drops: [{ id: 'gel', chance: 1, min: 1, max: 3 }, { id: 'sandBlock', chance: 0.5, min: 1, max: 3 }], sprite: 'slime' });
enemy('jungleSlime', { name: 'Jungle Slime', hp: 32, damage: 12, defense: 1, speed: 48, w: 24, h: 18, ai: 'slime', color: '#79b64a', biomes: ['jungle'], value: 5, drops: [{ id: 'gel', chance: 1, min: 2, max: 3 }, { id: 'jungleSpore', chance: 0.2 }], sprite: 'slime' });
enemy('lavaSlime', { name: 'Lava Slime', hp: 50, damage: 18, defense: 4, speed: 44, w: 26, h: 20, ai: 'slime', color: '#e56b3b', biomes: ['underworld'], value: 8, drops: [{ id: 'gel', chance: 1, min: 2, max: 4 }, { id: 'hellstoneOre', chance: 0.1 }], light: 3, lightColor: '#ff7d43', sprite: 'slime' });
enemy('kingSlimeServant', { name: 'Blue Slime', hp: 16, damage: 8, defense: 0, speed: 50, w: 18, h: 14, ai: 'slime', color: '#649de0', value: 1, drops: [{ id: 'gel', chance: 0.7 }], sprite: 'slime' });
enemy('servantEye', { name: 'Servant Eye', hp: 18, damage: 12, defense: 0, speed: 92, w: 18, h: 16, ai: 'flyer', color: '#c95d68', value: 0, drops: [], sprite: 'eye', boss: true, light: 1, lightColor: '#ff6c75' });
enemy('bee', { name: 'Bee', hp: 26, damage: 15, defense: 1, speed: 78, w: 18, h: 14, ai: 'flyer', color: '#dbaf3e', value: 0, drops: [], sprite: 'hornet', boss: true });
enemy('zombie', { name: 'Zombie', hp: 45, damage: 12, defense: 2, speed: 28, w: 16, h: 30, ai: 'walker', color: '#6b8f60', biomes: ['forest'], mode: 'night', value: 4, drops: [{ id: 'bone', chance: 0.08 }], sprite: 'zombie' });
enemy('demonEye', { name: 'Demon Eye', hp: 38, damage: 14, defense: 1, speed: 66, w: 22, h: 18, ai: 'flyer', color: '#b55b66', biomes: ['forest', 'corruption', 'crimson'], mode: 'night', value: 5, drops: [{ id: 'lens', chance: 0.33 }, { id: 'blackLens', chance: 0.02 }], light: 1, lightColor: '#ff5f6d', sprite: 'eye' });
enemy('caveBat', { name: 'Cave Bat', hp: 28, damage: 12, defense: 0, speed: 72, w: 22, h: 14, ai: 'flyer', color: '#6e5974', biomes: ['underground'], minDepth: 20, value: 4, drops: [{ id: 'feather', chance: 0.2 }], sprite: 'bat' });
enemy('skeleton', { name: 'Skeleton', hp: 60, damage: 15, defense: 6, speed: 32, w: 16, h: 30, ai: 'walker', color: '#c5bea2', biomes: ['underground'], minDepth: 30, value: 6, drops: [{ id: 'bone', chance: 0.7 }, { id: 'goldenKey', chance: 0.01 }], sprite: 'skeleton' });
enemy('giantWorm', { name: 'Giant Worm', hp: 30, damage: 10, defense: 1, speed: 45, w: 14, h: 14, ai: 'worm', color: '#b77d63', biomes: ['underground'], minDepth: 10, value: 4, drops: [{ id: 'siltBlock', chance: 0.3 }], sprite: 'worm' });
enemy('antlion', { name: 'Antlion', hp: 55, damage: 13, defense: 5, speed: 20, w: 24, h: 18, ai: 'shooter', color: '#c4a164', biomes: ['desert'], ranged: 'sandShot', value: 6, drops: [{ id: 'antlionMandible', chance: 0.4 }, { id: 'sandBlock', chance: 0.8, min: 2, max: 5 }], sprite: 'antlion' });
enemy('vulture', { name: 'Vulture', hp: 42, damage: 15, defense: 2, speed: 60, w: 26, h: 20, ai: 'flyer', color: '#6e5745', biomes: ['desert'], mode: 'day', value: 6, drops: [{ id: 'feather', chance: 0.3 }], sprite: 'vulture' });
enemy('snowFlinx', { name: 'Snow Flinx', hp: 38, damage: 12, defense: 2, speed: 55, w: 18, h: 20, ai: 'walker', color: '#dcebf1', biomes: ['snow'], value: 5, drops: [{ id: 'snowBlock', chance: 0.4, min: 1, max: 3 }, { id: 'silk', chance: 0.1 }], sprite: 'flinx' });
enemy('iceBat', { name: 'Ice Bat', hp: 45, damage: 16, defense: 3, speed: 75, w: 22, h: 14, ai: 'flyer', color: '#98cbdf', biomes: ['snow'], minDepth: 10, value: 6, drops: [{ id: 'iceBlock', chance: 0.4 }], sprite: 'bat' });
enemy('hornet', { name: 'Hornet', hp: 48, damage: 16, defense: 3, speed: 50, w: 24, h: 18, ai: 'flyer', color: '#d4b03e', biomes: ['jungle'], minDepth: 20, value: 8, drops: [{ id: 'stinger', chance: 0.8 }, { id: 'beeWax', chance: 0.05 }], sprite: 'hornet' });
enemy('manEater', { name: 'Man Eater', hp: 60, damage: 18, defense: 4, speed: 24, w: 22, h: 34, ai: 'plant', color: '#73a344', biomes: ['jungle'], minDepth: 10, value: 8, drops: [{ id: 'vine', chance: 0.7 }, { id: 'jungleSpore', chance: 0.2 }], sprite: 'maneater' });
enemy('eaterOfSouls', { name: 'Eater of Souls', hp: 40, damage: 15, defense: 3, speed: 66, w: 24, h: 18, ai: 'flyer', color: '#8c6ba0', biomes: ['corruption'], value: 6, drops: [{ id: 'rottenChunk', chance: 0.5 }, { id: 'shadowScale', chance: 0.02 }], sprite: 'eater' });
enemy('devourer', { name: 'Devourer', hp: 60, damage: 18, defense: 4, speed: 52, w: 16, h: 16, ai: 'worm', color: '#7e5c90', biomes: ['corruption'], minDepth: 5, value: 8, drops: [{ id: 'rottenChunk', chance: 0.5 }], sprite: 'worm' });
enemy('crimera', { name: 'Crimera', hp: 45, damage: 16, defense: 3, speed: 64, w: 24, h: 20, ai: 'flyer', color: '#bb4b58', biomes: ['crimson'], value: 6, drops: [{ id: 'tissueSample', chance: 0.02 }], sprite: 'crimera' });
enemy('faceMonster', { name: 'Face Monster', hp: 80, damage: 20, defense: 6, speed: 34, w: 24, h: 32, ai: 'walker', color: '#b35b64', biomes: ['crimson'], minDepth: 5, value: 8, drops: [{ id: 'tissueSample', chance: 0.25 }], sprite: 'face' });
enemy('meteorHead', { name: 'Meteor Head', hp: 40, damage: 18, defense: 6, speed: 80, w: 18, h: 18, ai: 'flyer', color: '#a36d5e', biomes: ['meteor'], value: 6, drops: [{ id: 'meteoriteOre', chance: 0.3 }], light: 2, lightColor: '#ff9466', sprite: 'meteorHead' });
enemy('demon', { name: 'Demon', hp: 110, damage: 26, defense: 8, speed: 60, w: 30, h: 30, ai: 'flyer', color: '#9e5d55', biomes: ['underworld'], value: 12, drops: [{ id: 'guideVoodooDoll', chance: 0.08 }, { id: 'ashBlock', chance: 0.5 }], light: 2, lightColor: '#ff7651', sprite: 'demon' });
enemy('fireImp', { name: 'Fire Imp', hp: 80, damage: 22, defense: 6, speed: 30, w: 20, h: 28, ai: 'shooter', color: '#d06443', biomes: ['underworld'], ranged: 'impFire', value: 10, drops: [{ id: 'flowerOfFire', chance: 0.02 }, { id: 'ashBlock', chance: 0.6 }], light: 2, lightColor: '#ff8b4f', sprite: 'imp' });
enemy('boneSerpent', { name: 'Bone Serpent', hp: 140, damage: 30, defense: 9, speed: 58, w: 18, h: 18, ai: 'worm', color: '#c5b491', biomes: ['underworld'], value: 14, drops: [{ id: 'bone', chance: 0.7 }], sprite: 'boneserpent' });
enemy('goblinScout', { name: 'Goblin Scout', hp: 50, damage: 14, defense: 2, speed: 42, w: 20, h: 28, ai: 'walker', color: '#7e9a5e', biomes: ['forest'], value: 6, drops: [{ id: 'coinCopper', chance: 1, min: 1, max: 4 }], sprite: 'goblin' });
enemy('goblinWarrior', { name: 'Goblin Warrior', hp: 100, damage: 22, defense: 7, speed: 38, w: 22, h: 30, ai: 'walker', color: '#86a35d', biomes: ['event'], value: 10, drops: [{ id: 'coinCopper', chance: 1, min: 10, max: 30 }], sprite: 'goblin', event: true });
enemy('goblinSorcerer', { name: 'Goblin Sorcerer', hp: 80, damage: 20, defense: 4, speed: 20, w: 20, h: 28, ai: 'shooter', color: '#6b8c70', biomes: ['event'], ranged: 'chaosBall', value: 12, drops: [{ id: 'coinSilver', chance: 0.4 }], sprite: 'goblin', event: true });
enemy('bloodZombie', { name: 'Blood Zombie', hp: 130, damage: 28, defense: 8, speed: 44, w: 18, h: 32, ai: 'walker', color: '#a74448', biomes: ['event'], value: 15, drops: [{ id: 'coinSilver', chance: 0.5, min: 1, max: 3 }], sprite: 'zombie', event: true });
enemy('drippler', { name: 'Drippler', hp: 75, damage: 24, defense: 4, speed: 70, w: 22, h: 20, ai: 'flyer', color: '#b84b60', biomes: ['event'], value: 10, drops: [{ id: 'coinSilver', chance: 0.3 }], sprite: 'eye', event: true });
enemy('unicorn', { name: 'Unicorn', hp: 240, damage: 45, defense: 12, speed: 70, w: 38, h: 30, ai: 'walker', color: '#e8e1f0', biomes: ['hallow'], value: 25, drops: [{ id: 'soulOfLight', chance: 0.4 }, { id: 'coinSilver', chance: 1, min: 3, max: 8 }], sprite: 'unicorn', hardmode: true });
enemy('pixie', { name: 'Pixie', hp: 130, damage: 30, defense: 6, speed: 75, w: 20, h: 20, ai: 'flyer', color: '#e4b8ea', biomes: ['hallow'], value: 18, drops: [{ id: 'soulOfLight', chance: 0.5 }, { id: 'pixieDust', chance: 0.3 }], light: 3, lightColor: '#ffb9f0', sprite: 'pixie', hardmode: true });
enemy('mummy', { name: 'Mummy', hp: 220, damage: 40, defense: 14, speed: 42, w: 20, h: 32, ai: 'walker', color: '#cbbf9e', biomes: ['desert'], value: 20, drops: [{ id: 'silk', chance: 0.4 }, { id: 'coinSilver', chance: 1, min: 1, max: 5 }], sprite: 'mummy', hardmode: true });
enemy('armoredSkeleton', { name: 'Armored Skeleton', hp: 180, damage: 38, defense: 18, speed: 40, w: 18, h: 32, ai: 'walker', color: '#a4aab8', biomes: ['underground'], minDepth: 30, value: 16, drops: [{ id: 'bone', chance: 0.7 }, { id: 'coinSilver', chance: 0.6 }], sprite: 'skeleton', hardmode: true });
enemy('larva', { name: 'Bee Larva', hp: 1, damage: 0, defense: 0, speed: 0, w: 8, h: 6, ai: 'none', color: '#e6cf85', biomes: ['jungle'], value: 0, drops: [], sprite: 'larva' });
enemy('dungeonSkeleton', { name: 'Angry Bones', hp: 130, damage: 24, defense: 8, speed: 42, w: 18, h: 32, ai: 'walker', color: '#c8c2ac', biomes: ['dungeon'], value: 8, drops: [{ id: 'bone', chance: 0.8 }, { id: 'goldenKey', chance: 0.04 }], sprite: 'skeleton' });
enemy('darkCaster', { name: 'Dark Caster', hp: 100, damage: 22, defense: 4, speed: 20, w: 20, h: 32, ai: 'shooter', color: '#5d5378', biomes: ['dungeon'], ranged: 'shadowBolt', value: 12, drops: [{ id: 'bone', chance: 0.5 }, { id: 'coinSilver', chance: 0.3 }], sprite: 'caster' });

enemy('goblinArcher', { name: 'Goblin Archer', hp: 85, damage: 19, defense: 4, speed: 30, w: 20, h: 28, ai: 'shooter', color: '#7d9a62', biomes: ['event'], ranged: 'arrow', value: 10, drops: [{ id: 'woodenArrow', chance: 1, min: 5, max: 12 }], sprite: 'goblin', event: true });

/* A couple of items referenced above as enemies got accidentally registered; repair. */
ITEMS.pixieDust = { id: 'pixieDust', name: 'Pixie Dust', art: 'dust', color: '#ffb9f0', type: 'material', stack: 999, rarity: 'blue', value: 12, desc: 'Glittering wings of light.' };
/* Add the materials used in loot tables. */
item('pixieDust', { name: 'Pixie Dust', art: 'dust', color: '#ffb9f0', type: 'material', value: 12, rarity: 'blue', desc: 'Glittering wings of light.' });

/* ---------------------------------------------------------------------------------------------
   Boss definitions
------------------------------------------------------------------------------------------------- */
const BOSSES = {
  kingSlime: {
    id: 'kingSlime', name: 'King Slime', hp: 1400, damage: 24, defense: 8, w: 92, h: 84,
    color: '#6d87d6', color2: '#d6c15a', value: 10000, minion: 'kingSlimeServant',
    drops: ['slimeTrophy', 'slimeStaff', 'kingSlimeMask', 'ninjaHood', 'ninjaShirt', 'ninjaPants', 'slimeGun'],
    summons: ['slimeCrown'], music: 'boss', desc: 'A gelatinous giant with a crown and a grudge.'
  },
  eyeOfCthulhu: {
    id: 'eyeOfCthulhu', name: 'Eye of Cthulhu', hp: 2800, damage: 30, defense: 12, w: 88, h: 82,
    color: '#c9c2bb', color2: '#d85461', value: 20000, minion: 'servantEye',
    drops: ['eyeTrophy', 'eyeMask', 'shieldOfCthulhu', 'demoniteOre', 'crimtaneOre', 'lens'],
    summons: ['suspiciousEye'], music: 'boss', desc: 'It is watching. It is always watching.'
  },
  eaterOfWorlds: {
    id: 'eaterOfWorlds', name: 'Eater of Worlds', hp: 3000, damage: 28, defense: 10, w: 40, h: 40,
    color: '#7d5a96', color2: '#b8a06a', value: 16000, worm: true,
    drops: ['eaterTrophy', 'eaterMask', 'demoniteOre', 'shadowScale', 'vilethorn', 'demonBow'],
    summons: ['wormFood'], music: 'boss', desc: 'A writhing mass beneath the corrupted soil.'
  },
  brainOfCthulhu: {
    id: 'brainOfCthulhu', name: 'Brain of Cthulhu', hp: 2600, damage: 27, defense: 12, w: 84, h: 76,
    color: '#b65a69', color2: '#e2b8bf', value: 18000,
    drops: ['crimtaneOre', 'tissueSample', 'bloodButcherer', 'crimtaneBar', 'brainOfConfusion'],
    summons: ['bloodySpine'], music: 'boss', desc: 'A pulsing thought that will not die.'
  },
  skeletron: {
    id: 'skeletron', name: 'Skeletron', hp: 4400, damage: 36, defense: 14, w: 84, h: 96,
    color: '#d4cfc0', color2: '#5b5064', value: 30000,
    drops: ['skeletronTrophy', 'skeletronMask', 'bookOfSkulls', 'bone', 'goldenKey', 'soulOfNight'],
    summons: [], music: 'boss', desc: 'The cursed guardian of the dungeon.'
  },
  queenBee: {
    id: 'queenBee', name: 'Queen Bee', hp: 3400, damage: 32, defense: 10, w: 96, h: 80,
    color: '#d9b241', color2: '#5c4a24', value: 20000, minion: 'bee',
    drops: ['queenBeeTrophy', 'beeKeeper', 'beesKnees', 'beeGun', 'hornetStaff', 'honeyComb', 'beeWax'],
    summons: ['abeemination'], music: 'boss', desc: 'The matriarch of the jungle hive.'
  },
  wallOfFlesh: {
    id: 'wallOfFlesh', name: 'Wall of Flesh', hp: 8000, damage: 50, defense: 18, w: 180, h: 330,
    color: '#a3464f', color2: '#d4a058', value: 50000,
    drops: ['pwnhammer', 'breakerBlade', 'warriorEmblem', 'rangerEmblem', 'demonScythe', 'wofTrophy', 'guideVoodooDoll'],
    summons: ['guideVoodooDoll'], music: 'boss', desc: 'The flesh of the world itself, come to stop you.'
  }
};

/* NPC definitions. */
const NPCS = {
  guide: {
    id: 'guide', name: 'Guide', role: 'Guide', color: '#8f6040', shirt: '#9e704a', hair: '#4a3223',
    needs: 'A house. That is all.', shop: null,
    lines: [
      'The world is yours to shape. Dig deep, build high, and try not to die too often.',
      'At night, monsters grow bold. Stone walls and doors will keep them out.',
      'Life Crystals are hidden underground. Each one makes you stronger.',
      'If you find a Suspicious Looking Eye, wait for nightfall and use it. A challenge awaits.',
      'A bed sets your spawn point. Build a house around it and more people will come.',
      'The Corruption spreads through stone. The Dryad can tell you how to stop it.'
    ],
    condition: () => true, arriveText: 'The Guide has moved into your house.'
  },
  merchant: {
    id: 'merchant', name: 'Merchant', role: 'Merchant', color: '#b78b60', shirt: '#5f7f5c', hair: '#6b3d23',
    needs: '50 silver in your wallet and a valid house.', shop: [
      ['torch', 40], ['lesserHealingPotion', 12], ['manaPotion', 12], ['woodenArrow', 80],
      ['shuriken', 15], ['bomb', 8], ['rope', 60], ['chest', 6], ['workbench', 5], ['bottle', 4],
      ['bottledWater', 6], ['copperPickaxe', 18], ['copperAxe', 14], ['woodenBow', 10], ['woodenArrow', 60]
    ],
    lines: [
      'I sell only the finest supplies. No refunds on torches.',
      'A deal for you, friend. Everything has a price.',
      'If you have coin, I have just the thing.'
    ],
    condition: p => p.wallet >= 5000,
    arriveText: 'The Merchant has arrived. He smells opportunity.'
  },
  nurse: {
    id: 'nurse', name: 'Nurse', role: 'Healer', color: '#d7b1a1', shirt: '#e8e1d6', hair: '#8e4a52',
    needs: 'Use a Life Crystal, then house her.', shop: [
      ['healingPotion', 40], ['lesserHealingPotion', 15], ['greaterHealingPotion', 90]
    ],
    lines: [
      'Hold still. This will only hurt a lot.',
      'You look terrible. Sit down and let me patch you up.',
      'I heal for money. I do not do house calls.'
    ],
    condition: p => p.usedLifeCrystal > 0,
    arriveText: 'The Nurse has moved in. Try not to need her.'
  },
  demolitionist: {
    id: 'demolitionist', name: 'Demolitionist', role: 'Demolitions', color: '#b77a55', shirt: '#7b4438', hair: '#d3ae76',
    needs: 'Bombs in your inventory and a valid house.', shop: [
      ['bomb', 12], ['grenade', 10], ['dynamite', 28], ['hellstoneOre', 60]
    ],
    lines: [
      'Boom! Did I get your attention?',
      'Buy a bomb. Blow up a wall. Feel better.',
      'That tile formation looks structurally unsound. Let me help.'
    ],
    condition: p => p.inventory.some(s => s && (s.id === 'bomb' || s.id === 'dynamite' || s.id === 'grenade')),
    arriveText: 'The Demolitionist has arrived. Hide the explosives.'
  },
  armsDealer: {
    id: 'armsDealer', name: 'Arms Dealer', role: 'Arms Dealer', color: '#ba8060', shirt: '#3d5a6b', hair: '#2d2320',
    needs: 'A ranged weapon in your inventory and a valid house.', shop: [
      ['flintlockPistol', 90], ['musket', 160], ['boomstick', 350], ['woodenBow', 25],
      ['woodenArrow', 120], ['musketBall', 90], ['silverBullet', 140], ['shuriken', 20], ['minishark', 800]
    ],
    lines: [
      'Put an arrow in it. If that fails, use more arrows.',
      'Guns do not kill people. I do. But guns help.',
      'Aim for the eyes. They usually have at least one.'
    ],
    condition: p => p.inventory.some(s => s && (ITEMS[s.id]?.type === 'weapon' && ITEMS[s.id]?.cls === 'ranged')) || p.ammoCount > 0,
    arriveText: 'The Arms Dealer has moved in. Business is booming.'
  },
  dryad: {
    id: 'dryad', name: 'Dryad', role: 'Nature', color: '#7fba72', shirt: '#4a7b50', hair: '#396b40',
    needs: 'Defeat a boss, then provide a house.', shop: [
      ['daybloom', 10], ['blinkroot', 10], ['waterleaf', 10], ['moonglow', 12], ['deathweed', 12],
      ['plant', 5], ['sunflower', 8], ['purificationPowder', 10], ['herbBag', 80], ['crystalShard', 20]
    ],
    lines: [
      'The Corruption spreads like a wound. Purify it when you can.',
      'Every seed carries the memory of a forest.',
      'Balance is not a place. It is something you build.'
    ],
    condition: (p, game) => game.stats.bossesKilled > 0,
    arriveText: 'The Dryad has arrived. The forest welcomes her.'
  }
};

/* Treasure chest loot pools. */
const CHEST_LOOT = {
  surface: [
    ['woodenArrow', 20, 50, 0.6], ['torch', 5, 12, 0.6], ['lesserHealingPotion', 1, 3, 0.5],
    ['shuriken', 10, 25, 0.35], ['copperBar', 2, 6, 0.4], ['hermesBoots', 1, 1, 0.18],
    ['cloudInABottle', 1, 1, 0.14], ['aglet', 1, 1, 0.15], ['luckyHorseshoe', 1, 1, 0.12],
    ['wood', 15, 35, 0.4], ['rope', 20, 40, 0.5]
  ],
  underground: [
    ['goldBar', 1, 4, 0.4], ['silverBar', 2, 5, 0.5], ['lens', 1, 3, 0.3],
    ['bandOfRegeneration', 1, 1, 0.16], ['bandOfStarpower', 1, 1, 0.16], ['grapplingHook', 1, 1, 0.2],
    ['shackle', 1, 1, 0.2], ['magicMirror', 1, 1, 0.1], ['healingPotion', 1, 2, 0.4],
    ['fallenStar', 1, 3, 0.4], ['amethyst', 1, 3, 0.3], ['chest', 1, 1, 0.0]
  ],
  gold: [
    ['goldBar', 3, 8, 0.6], ['silverBar', 4, 9, 0.5], ['healingPotion', 2, 4, 0.6],
    ['hermesBoots', 1, 1, 0.2], ['feralClaws', 1, 1, 0.2], ['magicQuiver', 1, 1, 0.15],
    ['goldenKey', 1, 1, 0.2], ['ruby', 1, 2, 0.3], ['diamond', 1, 1, 0.15],
    ['starVeil', 1, 1, 0.12], ['suspiciousEye', 1, 1, 0.15]
  ],
  dungeon: [
    ['muramasa', 1, 1, 0.22], ['waterBolt', 1, 1, 0.2], ['magicDagger', 1, 1, 0.15],
    ['skeletronMask', 1, 1, 0.1], ['goldenKey', 1, 2, 0.5], ['bone', 10, 30, 0.5],
    ['silverBar', 4, 10, 0.5], ['demoniteBar', 3, 7, 0.35], ['ninjaHood', 1, 1, 0.1],
    ['starLantern', 1, 1, 0.1], ['grapplingHook', 1, 1, 0.15]
  ],
  jungle: [
    ['jungleSpore', 3, 8, 0.65], ['stinger', 3, 8, 0.55], ['beeWax', 1, 3, 0.3],
    ['healingPotion', 1, 3, 0.5], ['vine', 5, 15, 0.5], ['abeemination', 1, 1, 0.18],
    ['bladeOfGrass', 1, 1, 0.08], ['silverBar', 3, 8, 0.4], ['hornetStaff', 1, 1, 0.05]
  ],
  hell: [
    ['hellstoneOre', 8, 20, 0.7], ['hellstoneBar', 3, 7, 0.5], ['obsidian', 10, 25, 0.5],
    ['demonScythe', 1, 1, 0.12], ['flowerOfFire', 1, 1, 0.1], ['guideVoodooDoll', 1, 1, 0.2],
    ['shadowKey', 1, 1, 0.3], ['dynamite', 2, 5, 0.3], ['goldBar', 5, 12, 0.5],
    ['soulOfNight', 3, 8, 0.3]
  ],
  hardmode: [
    ['cobaltOre', 10, 25, 0.7], ['mythrilOre', 8, 18, 0.5], ['adamantiteOre', 5, 12, 0.3],
    ['cobaltBar', 4, 8, 0.4], ['mythrilBar', 3, 7, 0.3], ['soulOfLight', 4, 10, 0.4]
  ]
};

/* Miscellaneous items referenced by NPC shops and chest pools. */
item('magicMirror', { name: 'Magic Mirror', art: 'mirror', color: '#8ec8dc', type: 'tool', stack: 1, value: 100, useTime: 1.2, desc: 'Returns you to your spawn point.', effect: 'recall' });
item('plant', { name: 'Daybloom Seeds', art: 'seed', color: '#78b959', type: 'material', value: 2, desc: 'Plant on grass or a planter box.' });
item('sunflower', { name: 'Sunflower', art: 'flower', color: '#e8c84c', type: 'material', value: 5, desc: 'A cheery flower.' });
item('purificationPowder', { name: 'Purification Powder', art: 'dust', color: '#d8d2ea', type: 'consumable', stack: 99, value: 2, useTime: 0.3, desc: 'Purifies corrupted stone nearby.' });
item('herbBag', { name: 'Herb Bag', art: 'bag', color: '#b6935c', type: 'consumable', stack: 20, value: 10, useTime: 0.3, desc: 'Contains a random herb.' });
/* Key loot table tweaks and shop data. */
ITEMS.plant.name = 'Grass Seeds';
ITEMS.plant.desc = 'Plant on grass. Flowers grow over time.';
/* The Guide's curse: a rare doll that calls the dungeon's master at night. */
item('clothierVoodooDoll', {
  name: 'Clothier Voodoo Doll', type: 'summonItem', stack: 20, rarity: 'orange', value: 120,
  art: 'doll', color: '#826b8f', color2: '#b7394f', useTime: 0.8, consumable: true,
  desc: 'Summons Skeletron at night. The dungeon remembers.'
});
recipe('clothierVoodooDollRecipe', 'clothierVoodooDoll', 1, [['silk', 10], ['bone', 15]], 'workbench');
BOSSES.skeletron.summons = ['clothierVoodooDoll'];
CHEST_LOOT.dungeon.push(['clothierVoodooDoll', 1, 1, 0.25]);

window.TILE = TILE; window.WALL = WALL; window.TILES = TILES; window.WALLS = WALLS;
window.ITEMS = ITEMS; window.RECIPES = RECIPES; window.ENEMIES = ENEMIES; window.BOSSES = BOSSES;
window.NPCS = NPCS; window.CHEST_LOOT = CHEST_LOOT; window.RARITY = RARITY;
window.GAME_DATA = { TILE, WALL, TILES, WALLS, ITEMS, RECIPES, ENEMIES, BOSSES, NPCS, CHEST_LOOT, RARITY };
