/* Chinese localization for all canvas UI text and item names. */
(function () {
  'use strict';

  const hasCJK = s => /[\u3400-\u9fff]/.test(String(s || ''));

  const UI = {
    "TERRARIA": "泰拉瑞亚",
    "AN ENDLESS WORLD OF BLOCKS AND BEASTS": "无尽的方块与野兽世界",
    "A WORLD OF ENDLESS DEPTHS": "无尽深渊的世界",
    "NEW WORLD": "创建世界",
    "CONTINUE": "继续游戏",
    "CONTROLS": "操作说明",
    "OPTIONS": "选项",
    "CREATE A WORLD": "创建世界",
    "WORLD NAME": "世界名称",
    "SEED": "种子",
    "DIFFICULTY": "难度",
    "CLASSIC": "经典",
    "EXPERT": "专家",
    "MASTER": "大师",
    "WORLD EVIL": "世界邪恶",
    "CORRUPTION": "腐化",
    "CRIMSON": "猩红",
    "DEATH RULE": "死亡规则",
    "SOFTCORE": "软核",
    "MEDIUMCORE": "中核",
    "HARDCORE": "硬核",
    "MEDIUMCORE": "中核",
    "HARDCORE": "硬核",
    "The world as it was meant to be.": "世界原本应有的样子。",
    "Stronger foes. Richer rewards.": "更强的敌人，更丰厚的奖励。",
    "A world that wants you dead.": "一个想置你于死地的世界。",
    "Purple chasms and shadow orbs.": "紫色裂谷与暗影珠。",
    "Flesh, blood and beating hearts.": "血肉、鲜血与跳动的心脏。",
    "Drop coins on death.": "死亡时掉落金币。",
    "Drop your items.": "死亡时掉落物品。",
    "One life. No return.": "只有一条命，无法复活。",
    "HARDCORE CHARACTERS DO NOT RETURN.": "硬核角色无法复活。",
    "CLICK A FIELD, TYPE, PRESS ENTER.  EMPTY SEED = SURPRISE.": "点击输入框输入内容，按回车确认。种子留空则会随机生成。",
    "TERRAIN, BIOMES, ORE AND DUNGEONS ARE GENERATED FROM THE SEED.": "地形、生态、矿石与地牢都会由种子生成。",
    "CLICK TO BEGIN": "点击开始",
    "BEGIN": "开始",
    "v1.0 - procedural pixel world": "v1.0 - 程序生成的像素世界",
    "SHAPING THE WORLD": "正在塑造世界",
    "PREPARING": "正在准备",
    "READING THE STARS": "正在读取星辰",
    "CARVING LAND": "正在雕刻大地",
    "STOCKING CHESTS": "正在装满宝箱",
    "WAKING THE GUIDE": "正在唤醒向导",
    "UNEARTHING YOUR WORLD": "正在发掘你的世界",
    "REBUILDING TERRAIN": "正在重建地形",
    "RESTORING MEMORIES": "正在恢复记忆",
    "WORLD MAP": "世界地图",
    "WHITE: YOU   GOLD: RESIDENTS   RED: BOSS": "白色：你   金色：居民   红色：首领",
    "PAUSED": "已暂停",
    "RESUME": "继续游戏",
    "SAVE WORLD": "保存世界",
    "SETTINGS": "设置",
    "SAVE & QUIT": "保存并退出",
    "INVENTORY": "背包",
    "PURPLE SLIME": "紫史莱姆",
    "ICE SLIME": "冰史莱姆",
    "SAND SLIME": "沙史莱姆",
    "JUNGLE SLIME": "丛林史莱姆",
    "LAVA SLIME": "熔岩史莱姆",
    "SERVANT EYE": "仆从眼",
    "BEE": "蜜蜂",
    "GOBLIN SORCERER": "哥布林巫师",
    "BLOOD ZOMBIE": "血腥僵尸",
    "DRIPPLER": "滴落者",
    "BEE LARVA": "蜜蜂幼虫",
    "ANGRY BONES": "愤怒骷髅",
    "GUIDE": "向导",
    "MERCHANT": "商人",
    "NURSE": "护士",
    "DEMOLITIONIST": "爆破专家",
    "ARMS DEALER": "军火商",
    "DRYAD": "树妖",
    "HEALER": "治疗师",
    "DEMOLITIONS": "爆破",
    "NATURE": "自然",
    "50 silver in your wallet and a valid house.": "钱包里有 50 银币，并有一间合适的房子。",
    "Use a Life Crystal, then house her.": "使用生命水晶，然后为她安排一间房子。",
    "Bombs in your inventory and a valid house.": "背包里带着炸弹，并有一间合适的房子。",
    "A ranged weapon in your inventory and a valid house.": "背包里带着远程武器，并有一间合适的房子。",
    "Defeat a boss, then provide a house.": "击败一个首领，然后为她安排一间房子。",
    "A roof, a door, and a friendly face.": "一间有屋顶和门的房子，以及一张友善的面孔。",
    "A house. That is all.": "一间房子。仅此而已。",
    "HEALTH POTION": "治疗药水",
    "EQUIPMENT": "装备",
    "ACCESSORIES": "饰品",
    "BACKPACK": "物品栏",
    "HOTBAR": "快捷栏",
    "HEAD": "头部",
    "BODY": "身体",
    "LEGS": "腿部",
    "HELMET": "头盔",
    "CHESTPLATE": "胸甲",
    "GREAVES": "护腿",
    "LIFE": "生命",
    "MANA": "魔力",
    "DEFENSE": "防御",
    "DAMAGE REDUCTION": "伤害减免",
    "MELEE": "近战",
    "RANGED": "远程",
    "MAGIC": "魔法",
    "SUMMON": "召唤",
    "CRIT": "暴击",
    "SET": "套装",
    "COPPER SET": "铜套装",
    "IRON SET": "铁套装",
    "SILVER SET": "银套装",
    "GOLD SET": "金套装",
    "SHADOW SET": "暗影套装",
    "CRIMSON SET": "猩红套装",
    "METEOR SET": "陨石套装",
    "JUNGLE SET": "丛林套装",
    "MOLTEN SET": "熔岩套装",
    "COBALT SET": "钴套装",
    "MYTHRIL SET": "秘银套装",
    "ADAMANTITE SET": "精金套装",
    "KILLS": "击杀",
    "CRYSTALS": "水晶",
    "COINS": "金币",
    "SORT": "整理",
    "TRASH": "丢弃",
    "CLOSE": "关闭",
    "CRAFTING": "制作",
    "CRAFT": "制作",
    "MISSING": "材料不足",
    "BY HAND": "徒手",
    "UP": "上翻",
    "DN": "下翻",
    "ALL": "全部",
    "GEAR": "装备",
    "MISC": "杂项",
    "POTIONS": "药水",
    "BLOCKS": "方块",
    "HOMES": "家园",
    "HAND": "手工",
    "WORKBENCH": "工作台",
    "WORK BENCH": "工作台",
    "FURNACE": "熔炉",
    "ANVIL": "铁砧",
    "HELLFORGE": "地狱熔炉",
    "LOOM": "织布机",
    "ALCHEMY": "炼金台",
    "ALTAR": "祭坛",
    "CHEST": "宝箱",
    "GOLDEN CHEST": "黄金宝箱",
    "YOUR INVENTORY": "你的物品栏",
    "LOOT ALL": "全部拾取",
    "SHOP": "商店",
    "BUY": "购买",
    "SELL": "出售",
    "BUY x1   SHIFT x5": "购买 x1   按住Shift x5",
    "CLICK AN ITEM TO SELL ONE.  SHIFT-CLICK TO SELL THE STACK.": "点击物品出售一个，按住Shift点击出售整组。",
    "HEAL": "治疗",
    "BYE": "再见",
    "QUEST": "任务",
    "QUEST REWARD": "任务奖励",
    "CLAIM": "领取",
    "YOU WERE SLAIN": "你被击败了",
    "GAME OVER": "游戏结束",
    "RESPAWN": "重生",
    "ABANDON WORLD": "放弃世界",
    "RESPAWNING IN": "重生倒计时",
    "A gravestone marks where you fell...": "一座墓碑标记了你倒下的地方……",
    "The world was too much.": "这个世界太残酷了。",
    "The world is a dangerous place.": "这个世界很危险。",
    "MUTE": "静音",
    "UNMUTE": "取消静音",
    "MASTER VOLUME": "总音量",
    "MUSIC": "音乐",
    "SOUND EFFECTS": "音效",
    "SOUND": "声音",
    "AUDIO ON": "音频开启",
    "AUDIO MUTED": "音频已静音",
    "ON": "开",
    "OFF": "关",
    "SHOW FPS": "显示帧率",
    "MINIMAP": "小地图",
    "BACK": "返回",
    "RAIN": "雨",
    "CLEAR": "晴朗",
    "STORM": "暴风雨",
    "SNOWFALL": "降雪",
    "DAY": "白天",
    "NIGHT": "夜晚",
    "FOREST": "森林",
    "SNOW": "雪原",
    "DESERT": "沙漠",
    "JUNGLE": "丛林",
    "OCEAN": "海洋",
    "BEACH": "海滩",
    "THE CORRUPTION": "腐化之地",
    "THE CRIMSON": "猩红之地",
    "UNDERGROUND": "地下",
    "CAVERNS": "洞穴",
    "CAVERN": "洞穴",
    "DUNGEON": "地牢",
    "UNDERWORLD": "地狱",
    "SURFACE": "地表",
    "F   TALK TO": "F   与",
    "TALK TO": "对话",
    "OPEN CHEST": "打开宝箱",
    "OPEN DOOR": "打开门",
    "CLOSE DOOR": "关上门",
    "SMASH POT": "打碎罐子",
    "SMASH ORB": "击碎暗影珠",
    "TOUCH LIFE CRYSTAL": "触碰生命水晶",
    "SET SPAWN": "设置重生点",
    "MOVE": "移动",
    "JUMP / SWIM": "跳跃 / 游泳",
    "FALL THROUGH PLATFORM": "下穿平台",
    "DASH": "冲刺",
    "GRAPPLE": "抓钩",
    "(with a grappling hook)": "（需要抓钩）",
    "CREATING...": "正在创建……",
    "GENERATING WORLD": "正在生成世界",
    "USE / MINE / ATTACK": "使用 / 挖掘 / 攻击",
    "PLACE / INTERACT": "放置 / 互动",
    "QUICK HEAL": "快速治疗",
    "HEATLH POTION": "快速治疗",
    "MAP": "地图",
    "DROP ITEM": "丢弃物品",
    "PAUSE": "暂停",
    "HOTBAR IS THE TOP ROW.  CLICK TO PICK UP / PLACE.  RIGHT CLICK SPLITS OR PLACES ONE.": "快捷栏是最上面一排。点击拾取或放置，右键拆分。",
    "SHIFT-CLICK TO MOVE A STACK.  Q OVER A SLOT DROPS IT.": "按住Shift点击移动整组物品。鼠标指向格子按Q丢弃。",
    "A / D  or  LEFT / RIGHT": "A / D  或  左 / 右",
    "SPACE  or  W": "空格  或  W",
    "S + SPACE": "S + 空格",
    "LEFT MOUSE": "鼠标左键",
    "RIGHT MOUSE  or  F": "鼠标右键  或  F",
    "1 - 0  or  MOUSE WHEEL": "1 - 0  或  鼠标滚轮",
    "H  (with a grappling hook)": "H（需要抓钩）",
    "ESC  RESUME": "ESC  继续",
    "F  CLOSE": "F  关闭",
    "PLAYTIME": "游戏时间",
    "SAVE": "存档",
    "WORLD": "世界",
    "Tip: torches keep the dark at bay.": "提示：火把可以驱散黑暗。",
    "Tip: a bed sets your respawn point.": "提示：床可以设置重生点。",
    "Tip: every boss has a summoning item.": "提示：每个Boss都有对应的召唤物。",
    "Tip: houses need a door, table, chair and light.": "提示：房屋需要门、桌子、椅子和光源。",
    "Tip: platforms let you fall through with S + SPACE.": "提示：站在平台上按 S + 空格可以下穿。",
    "Tip: the Guide knows more than he lets on.": "提示：向导知道的比他说的更多。",
    "A Taste of Danger": "危险初尝",
    "A TASTE OF DANGER": "危险初尝",
    "Guide": "向导",
    "The world was too much.": "世界太残酷了。",
    "A monster": "一只怪物",
    "a slime": "一只史莱姆",
    "The world is a dangerous place.": "这个世界很危险。",
    "Merchant": "商人",
    "Nurse": "护士",
    "Demolitionist": "爆破专家",
    "Arms Dealer": "军火商",
    "Dryad": "树妖",
    "Healer": "治疗师",
    "Demolitions": "爆破专家",
    "Nature": "自然",
    "King Slime": "史莱姆王",
    "Eye of Cthulhu": "克苏鲁之眼",
    "Eater of Worlds": "世界吞噬者",
    "Brain of Cthulhu": "克苏鲁之脑",
    "Skeletron": "骷髅王",
    "Queen Bee": "蜂后",
    "Wall of Flesh": "血肉墙",
    "Green Slime": "绿史莱姆",
    "Blue Slime": "蓝史莱姆",
    "Zombie": "僵尸",
    "Demon Eye": "恶魔眼",
    "Cave Bat": "洞穴蝙蝠",
    "Skeleton": "骷髅",
    "Giant Worm": "巨型蠕虫",
    "Antlion": "蚁狮",
    "Vulture": "秃鹫",
    "Snow Flinx": "雪地弗林克斯",
    "Ice Bat": "冰雪蝙蝠",
    "Hornet": "黄蜂",
    "Man Eater": "食人花",
    "Eater of Souls": "噬魂怪",
    "Devourer": "吞噬者",
    "Crimera": "猩红魔",
    "Face Monster": "脸怪",
    "Meteor Head": "陨石怪",
    "Demon": "恶魔",
    "Fire Imp": "火焰小鬼",
    "Bone Serpent": "骨蛇",
    "Goblin Scout": "哥布林侦察兵",
    "Goblin Warrior": "哥布林战士",
    "Goblin Thief": "哥布林盗贼",
    "Goblin Archer": "哥布林弓箭手",
    "Mummy": "木乃伊",
    "Unicorn": "独角兽",
    "Pixie": "妖精",
    "Armored Skeleton": "装甲骷髅",
    "Dark Caster": "黑暗法师",
    "Larva": "幼虫",
    "ironskin": "铁皮",
    "swiftness": "敏捷",
    "regeneration": "再生",
    "shine": "闪耀",
    "nightOwl": "夜猫子",
    "obsidianSkin": "黑曜石皮肤",
    "thorns": "荆棘",
    "hunter": "猎人",
    "inferno": "狱火",
    "waterWalk": "水上行走",
    "battle": "战斗",
    "calming": "镇静",
    "builder": "建筑",
    "mining": "采矿",
    "campfire": "篝火",
    "poison": "中毒",
    "onFire": "着火了",
    "bleeding": "流血",
    "slow": "缓慢",
    "weakness": "虚弱",
    "brokenArmor": "护甲破损",
    "A Taste of Danger": "危险初尝",
    "The Guide wants you to thin out the slimes near the surface.": "向导希望你去清理地表的史莱姆。",
    "The world is yours to shape. Dig deep, build high, and try not to die too often.": "世界等你去塑造。向下挖掘，向上建造，尽量别死太多次。",
    "At night, monsters grow bold. Stone walls and doors will keep them out.": "夜晚怪物会变得大胆。石墙和门能把它们挡在外面。",
    "Life Crystals are hidden underground. Each one makes you stronger.": "生命水晶藏在地下。每一颗都能让你更强。",
    "If you find a Suspicious Looking Eye, wait for nightfall and use it. A challenge awaits.": "如果你找到可疑眼球，等到夜幕降临再使用它。挑战在等着你。",
    "A bed sets your spawn point. Build a house around it and more people will come.": "床可以设置重生点。在它周围建一座房子，会有更多人来。",
    "The Corruption spreads through stone. The Dryad can tell you how to stop it.": "腐化会蔓延到石头里。树妖知道如何阻止它。",
    "I sell only the finest supplies. No refunds on torches.": "我只卖最好的补给。火把概不退换。",
    "A deal for you, friend. Everything has a price.": "朋友，给你个好价钱。万物皆有价。",
    "If you have coin, I have just the thing.": "只要你有钱，我就有好东西。",
    "Hold still. This will only hurt a lot.": "别动。只会疼一小会儿。",
    "You look terrible. Sit down and let me patch you up.": "你看起来糟透了。坐下，让我给你包扎。",
    "I heal for money. I do not do house calls.": "我只收钱治病，不出诊。",
    "Boom! Did I get your attention?": "轰！吸引到你的注意了吗？",
    "Buy a bomb. Blow up a wall. Feel better.": "买个炸弹。炸开一堵墙。心情会好起来的。",
    "That tile formation looks structurally unsound. Let me help.": "那堆砖块看起来结构不稳。让我来帮你。",
    "Put an arrow in it. If that fails, use more arrows.": "先射一箭。如果不行，就多射几箭。",
    "Guns do not kill people. I do. But guns help.": "枪不杀人，我杀人。不过枪确实有用。",
    "Aim for the eyes. They usually have at least one.": "瞄准眼睛。它们通常至少有一只。",
    "The Corruption spreads like a wound. Purify it when you can.": "腐化像伤口一样蔓延。能净化时就净化它。",
    "Every seed carries the memory of a forest.": "每一颗种子都记得森林的模样。",
    "Balance is not a place. It is something you build.": "平衡不是一个地方，而是你亲手建立的东西。",
    "The Merchant has arrived. He smells opportunity.": "商人来了。他闻到了机会的味道。",
    "The Nurse has moved in. Try not to need her.": "护士搬进来了。尽量别需要她。",
    "The Demolitionist has arrived. Hide the explosives.": "爆破专家来了。把炸药藏好。",
    "The Arms Dealer has moved in. Business is booming.": "军火商搬进来了。生意兴隆。",
    "The Dryad has arrived. The forest welcomes her.": "树妖来了。森林欢迎她。",
    "The Guide has moved in.": "向导已经入住。",
    "The Guide has moved into your house.": "向导搬进了你的房子。",
    "You arrive in a world of": "你来到世界",
    "Press E for inventory. The Guide is waiting nearby.": "按 E 打开背包。向导就在附近等你。",
    "No saved world found.": "没有找到存档。",
    "World saved.": "世界已保存。",
    "Autosaved.": "自动保存完成。",
    "Could not save:": "无法保存：",
    "Welcome back to": "欢迎回到",
    "Day": "第",
    "begins. The light returns.": "天开始了。光明重返大地。",
    "The moon is red. Something is very wrong.": "月亮变成了红色。有什么东西非常不对劲。",
    "The weather clears.": "天气放晴了。",
    "A Goblin Army approaches from the east!": "哥布林军队正从东边逼近！",
    "A meteorite has crashed somewhere on the surface.": "一颗陨石坠落在某处地表。",
    "Meteor impact detected": "检测到陨石撞击",
    "HARDMODE BEGINS": "困难模式开启！",
    "The Wall of Flesh falls. Ancient ores awaken and the world is changed forever.": "血肉墙倒下了。远古矿石苏醒，世界永远改变了。",
    "A boss is already here!": "已经有一个首领在这里了！",
    "Nothing answers the call.": "没有任何回应。",
    "You were slain...": "你被击败了……",
    "You awaken at your spawn point.": "你在重生点醒来。",
    "You chop down a tree.": "你砍倒了一棵树。",
    "Your spawn point is now set.": "你的重生点已设置。",
    "Spawn point set. The bed is warm.": "重生点已设置。这张床很温暖。",
    "A life crystal dissolves into your chest.": "生命水晶融入了你的身体。",
    "A demon altar. It hums with a cold and ancient power.": "恶魔祭坛。它散发着冰冷而古老的力量。",
    "A Shadow Orb shatters. A foul wind sweeps the corruption.": "暗影珠碎裂了。一阵邪风扫过腐化之地。",
    "A Crimson Heart bursts in a shower of gore.": "猩红之心在一阵血雨中爆裂。",
    "The Guide asks you to defeat 8 slimes. A first step.": "向导请你去击败8只史莱姆。这是第一步。",
    "The Guide pays you": "向导支付给你",
    "and nods. Good work.": "并点了点头。干得漂亮。",
    "Slimes defeated:": "已击败史莱姆：",
    "Too far away.": "太远了。",
    "Not enough mana.": "魔力不足。",
    "You cannot place a block inside yourself.": "你不能把方块放在自己身上。",
    "That block needs a supporting surface.": "那个方块需要支撑面。",
    "The door needs a floor.": "门需要地面。",
    "There is no room for the door.": "这里没有空间放门。",
    "The chest needs solid ground beneath it.": "宝箱下方需要坚实地面。",
    "Your tool is too weak for this material.": "你的工具无法挖掘这种材料。",
    "You need a": "你需要",
    "You have no": "你没有",
    "to fire.": "可以发射。",
    "Your minion slots are full.": "你的召唤物栏已满。",
    "Your life is already at its limit.": "你的生命已达到上限。",
    "You look perfectly healthy to me.": "我看你很健康。",
    "A heal costs": "治疗需要",
    "Come back with coin.": "带钱再来。",
    "Patched up for": "治疗完成，花费",
    "Nothing here.": "这里什么都没有。",
    "That does not fit there.": "那里放不下。",
    "Crafted": "制作了",
    "Bought": "购买了",
    "Sold": "出售了",
    "for": "获得",
    "That is ammunition. It needs a weapon.": "那是弹药，需要配合武器使用。",
    "SET BONUS": "套装效果",
    "NO RECIPES AT THIS STATION": "此工作台没有可制作的物品",
    "WHITE: YOU   GOLD: RESIDENTS   RED: BOSS": "白色：你   金色：居民   红色：首领",
    "SHIFT-CLICK TO MOVE A STACK.  Q OVER A SLOT DROPS IT.": "按住Shift点击移动整组物品。鼠标指向格子按Q丢弃。",
    "CLICK AN ITEM TO SELL ONE.  SHIFT-CLICK TO SELL THE STACK.": "点击物品出售一个，按住Shift点击出售整组。",
    "HOTBAR IS THE TOP ROW.  CLICK TO PICK UP / PLACE.  RIGHT CLICK SPLITS OR PLACES ONE.": "快捷栏是最上面一排。点击拾取或放置，右键拆分。",
    "COINS": "金币",
    "FAVOR": "任务",
    "AUDIO MUTED": "音频已静音",
    "AUDIO ON": "音频开启",
    "USE TIME": "使用时间",
    "VALUE": "价值",
    "QUANTITY": "数量",
    "PICKAXE": "镐",
    "AXE": "斧",
    "HAMMER": "锤",
    "ARROW AMMUNITION": "箭矢弹药",
    "BULLET AMMUNITION": "子弹弹药",
    "WEAPON": "武器",
    "TOOL": "工具",
    "ARMOR": "护甲",
    "ACCESSORY": "饰品",
    "AMMO": "弹药",
    "MATERIAL": "材料",
    "POTION": "药水",
    "BLOCK": "方块",
    "WALL": "墙体",
    "TROPHY": "纪念品",
    "COIN": "货币",
    "SUMMON ITEM": "召唤物",
    "CONSUMABLE": "消耗品",
    "Ironskin": "铁皮",
    "Swiftness": "敏捷",
    "Regeneration": "再生",
    "Shine": "闪耀",
    "Night Owl": "夜猫子",
    "Obsidian Skin": "黑曜石皮肤",
    "Thorns": "荆棘",
    "Hunter": "猎人",
    "Inferno": "狱火",
    "Water Walking": "水上行走",
    "Battle": "战斗",
    "Calming": "镇静",
    "Builder": "建筑",
    "Mining": "采矿",
    "Campfire": "篝火",
    "Poisoned": "中毒",
    "On Fire!": "着火了",
    "Bleeding": "流血",
    "Slow": "缓慢",
    "Weakness": "虚弱",
    "Broken Armor": "护甲破损",
    "A harmful effect.": "负面效果。",
    "A helpful effect.": "增益效果。",
    "The Guide": "向导"
  };

  const TOKENS = {
    copper: '铜', tin: '锡', iron: '铁', lead: '铅', silver: '银', tungsten: '钨', gold: '金', platinum: '铂',
    demonite: '魔矿', crimtane: '猩红矿', meteorite: '陨石', hellstone: '狱石', cobalt: '钴', mythril: '秘银',
    adamantite: '精金', pearlstone: '珍珠石', ebonstone: '黑檀石', crimstone: '猩红石', ash: '灰烬',
    wood: '木', wooden: '木', stone: '石', dirt: '泥土', sand: '沙', sandstone: '砂岩', snow: '雪', ice: '冰',
    mud: '泥', clay: '黏土', boreal: '北地', mahogany: '红木', ebonwood: '黑檀木', glass: '玻璃', gray: '灰',
    brick: '砖', red: '红', obsidian: '黑曜石', silt: '淤泥', hive: '蜂巢', honey: '蜂蜜', dungeon: '地牢',
    bone: '骨头', marble: '大理石', granite: '花岗岩', cloud: '云', living: '生命', crystal: '水晶',
    pink: '粉', cactus: '仙人掌', coral: '珊瑚', mushroom: '蘑菇', glowing: '发光', platform: '平台',
    block: '块', slime: '史莱姆', crimson: '猩红', meteor: '陨石', molten: '熔岩', rich: '', hanging: '悬挂',
    mahogany: '红木', bookshelf: '书架', banner: '旗帜',
    planter: '种植', box: '盒', rope: '绳', web: '蛛网', torch: '火把', campfire: '篝火', candle: '蜡烛',
    lantern: '提灯', chest: '宝箱', workbench: '工作台', furnace: '熔炉', anvil: '铁砧', hellforge: '地狱熔炉',
    loom: '织布机', alchemy: '炼金', table: '桌', chair: '椅', bed: '床', door: '门', shelf: '书架',
    spike: '尖刺', pressure: '压力', plate: '板', dart: '飞镖', trap: '陷阱', flag: '旗帜',
    gravestone: '墓碑', barrel: '木桶', wall: '墙', ore: '矿石', bar: '锭', amethyst: '紫水晶',
    topaz: '黄玉', sapphire: '蓝宝石', emerald: '翡翠', ruby: '红宝石', diamond: '钻石', gel: '凝胶',
    silk: '丝绸', cobweb: '蛛网', rotten: '腐肉', chunk: '块', shadow: '暗影', scale: '鳞片', tissue: '组织',
    sample: '样本', stinger: '毒刺', vine: '藤蔓', jungle: '丛林', spore: '孢子', fallen: '坠落',
    star: '星', lens: '透镜', black: '黑色', feather: '羽毛', antlion: '蚁狮', mandible: '下颌',
    shark: '鲨鱼', fin: '鳍', bee: '蜜蜂', wax: '蜡', soul: '灵魂', night: '夜', light: '光',
    thread: '线', shard: '碎片', daybloom: '太阳花', blinkroot: '闪耀根', waterleaf: '水叶',
    moonglow: '月光草', deathweed: '死亡草', fireblossom: '火焰花', shiverthorn: '寒颤棘',
    bottled: '瓶装', water: '水', bottle: '瓶', golden: '金', key: '钥匙', chain: '锁链', coin: '币',
    pickaxe: '镐', axe: '斧', hammer: '锤', hamaxe: '斧锤', sword: '剑', shortsword: '短剑',
    broadsword: '阔剑', bow: '弓', repeater: '连弩', pistol: '手枪', musket: '火枪', boomstick: '双管猎枪',
    minishark: '迷你鲨', blaster: '爆破枪', arrow: '箭', bullet: '子弹', shot: '弹', shuriken: '手里剑',
    grenade: '手雷', bomb: '炸弹', dynamite: '炸药', molotov: '燃烧瓶', cocktail: '鸡尾酒',
    staff: '法杖', gun: '枪', scythe: '镰刀', book: '书', skulls: '骷髅', storm: '风暴', dagger: '匕首',
    beam: '光束', helmet: '头盔', chestplate: '胸甲', greaves: '护腿', set: '套装', hood: '兜帽',
    shirt: '衬衫', pants: '裤子', watch: '表', depth: '深度', meter: '计', compass: '指南针',
    aglet: '鞋带扣', shackle: '脚镣', boots: '靴', horseshoe: '马蹄铁', band: '手环',
    regeneration: '再生', starpower: '星力', feral: '野性', claws: '爪', magma: '岩浆', skull: '骷髅头',
    grappling: '抓钩', hook: '钩', comb: '蜂巢', mana: '魔力', flower: '花', gift: '礼物',
    frostspark: '霜花', regen: '再生', veil: '面纱', anklet: '脚镯', wind: '风', magic: '魔法',
    quiver: '箭袋', ranger: '射手', warrior: '战士', sorcerer: '巫师', summoner: '召唤师', emblem: '徽章',
    shield: '盾', worm: '蠕虫', scarf: '围巾', brain: '大脑', confusion: '混乱', royal: '皇家',
    bundle: '束', balloons: '气球', lesser: '次级', healing: '治疗', potion: '药水', greater: '高级',
    ironskin: '铁皮', swiftness: '敏捷', shine: '闪耀', owl: '猫头鹰', skin: '皮肤', thorns: '荆棘',
    hunter: '猎人', inferno: '狱火', recall: '回忆', walking: '行走', battle: '战斗', calming: '镇静',
    building: '建筑', mining: '采矿', life: '生命', suspicious: '可疑', looking: '凝视', eye: '眼',
    crown: '王冠', food: '食物', bloody: '血腥', spine: '脊椎', abeemination: '憎恶之蜂', guide: '向导',
    voodoo: '巫毒', doll: '娃娃', trophy: '奖杯', mask: '面具', backpack: '背包', clockwork: '发条',
    assault: '突击', rifle: '步枪', breaker: '破坏者', blade: '刃', surprise: '惊喜', ninja: '忍者',
    heart: '心形', lucky: '幸运', catcher: '捕捉器', mirror: '镜', dust: '粉尘', plant: '草',
    sunflower: '向日葵', purification: '净化', powder: '粉', herb: '草药', bag: '袋', clothier: '服装师',
    seed: '种子', seeds: '种子', grass: '草', hell: '地狱', soul: '灵魂', of: '', the: '', in: '',
    a: '', and: '', with: '', from: '', broken: '破损', armor: '护甲', night: '夜', owl: '猫头鹰',
    waterwalking: '水上行走', obsidianskin: '黑曜石皮肤', fire: '火焰'
  };

  const ITEM = {
    copperPickaxe: '铜镐', ironPickaxe: '铁镐', silverPickaxe: '银镐', goldPickaxe: '金镐',
    nightmarePickaxe: '梦魇镐', moltenPickaxe: '熔岩镐', cobaltPickaxe: '钴镐', mythrilPickaxe: '秘银镐',
    copperAxe: '铜斧', ironAxe: '铁斧', silverAxe: '银斧', goldAxe: '金斧', warAxeOfTheNight: '永夜战斧',
    moltenHamaxe: '熔岩斧锤', copperHammer: '铜锤', ironHammer: '铁锤', silverHammer: '银锤',
    goldHammer: '金锤', pwnhammer: '神圣锤',
    woodSword: '木剑', copperShortsword: '铜短剑', ironBroadsword: '铁阔剑', silverBroadsword: '银阔剑',
    goldBroadsword: '金阔剑', lightsBane: '光之驱逐', bloodButcherer: '血腥屠夫', muramasa: '村正',
    bladeOfGrass: '草剑', fieryGreatsword: '炽焰巨剑', enchantedSword: '附魔剑', nightsEdge: '永夜刃',
    beeKeeper: '养蜂人', excalibur: '断钢剑', deathSickle: '死亡镰刀',
    woodenBow: '木弓', copperBow: '铜弓', ironBow: '铁弓', silverBow: '银弓', goldBow: '金弓',
    demonBow: '恶魔弓', moltenFury: '熔火之怒', beesKnees: '蜂膝弓', cobaltRepeater: '钴连弩',
    mythrilRepeater: '秘银连弩',
    flintlockPistol: '燧发手枪', musket: '火枪', boomstick: '双管猎枪', minishark: '迷你鲨',
    phoenixBlaster: '凤凰爆破枪', clockworkAssaultRifle: '发条突击步枪',
    woodenArrow: '木箭', flamingArrow: '燃烧箭', unholyArrow: '邪箭', jesterArrow: '小丑箭',
    woodenArrow: '木箭', musketBall: '火枪弹', silverBullet: '银弹', meteorShot: '陨石弹',
    shuriken: '手里剑', grenade: '手雷', bomb: '炸弹', dynamite: '炸药', molotov: '燃烧瓶',
    amethystStaff: '紫水晶法杖', topazStaff: '黄玉法杖', sapphireStaff: '蓝宝石法杖',
    emeraldStaff: '翡翠法杖', rubyStaff: '红宝石法杖', diamondStaff: '钻石法杖',
    vilethorn: '魔刺', waterBolt: '水箭', demonScythe: '恶魔镰刀', spaceGun: '太空枪',
    flowerOfFire: '火焰之花', beeGun: '蜜蜂枪', bookOfSkulls: '骷髅书', crystalStorm: '水晶风暴',
    magicDagger: '魔法匕首', shadowBeam: '暗影光束', slimeStaff: '史莱姆法杖',
    hornetStaff: '黄蜂法杖', impStaff: '小鬼法杖', opticStaff: '双子法杖',
    ninjaHood: '忍者兜帽', ninjaShirt: '忍者衬衫', ninjaPants: '忍者裤',
    copperWatch: '铜表', depthMeter: '深度计', compass: '指南针', aglet: '鞋带扣', shackle: '脚镣',
    hermesBoots: '赫尔墨斯靴', cloudInABottle: '云朵瓶', luckyHorseshoe: '幸运马蹄铁',
    bandOfRegeneration: '再生手环', bandOfStarpower: '星力手环', feralClaws: '野性之爪',
    magmaStone: '岩浆石', obsidianSkull: '黑曜石骷髅头', grapplingHook: '抓钩', honeyComb: '蜂巢',
    manaFlower: '魔力花', luxorGift: '卢克索的礼物', frostsparkBoots: '霜花靴',
    regenBand: '再生手环', starVeil: '星星面纱', ankletOfTheWind: '疾风脚镯',
    magicQuiver: '魔法箭袋', rangerEmblem: '射手徽章', warriorEmblem: '战士徽章',
    sorcererEmblem: '巫师徽章', summonerEmblem: '召唤师徽章', shieldOfCthulhu: '克苏鲁之盾',
    wormScarf: '蠕虫围巾', brainOfConfusion: '混乱之脑', royalGel: '皇家凝胶',
    bundleOfBalloons: '气球束', hiveBackpack: '蜂巢背包',
    lesserHealingPotion: '次级治疗药水', healingPotion: '治疗药水', greaterHealingPotion: '高级治疗药水',
    manaPotion: '魔力药水', greaterManaPotion: '高级魔力药水', ironskinPotion: '铁皮药水',
    swiftnessPotion: '敏捷药水', regenerationPotion: '再生药水', shinePotion: '闪耀药水',
    nightOwlPotion: '夜猫子药水', obsidianSkinPotion: '黑曜石皮肤药水', thornsPotion: '荆棘药水',
    hunterPotion: '猎人药水', infernoPotion: '狱火药水', recallPotion: '回忆药水',
    waterWalkingPotion: '水上行走药水', battlePotion: '战斗药水', calmingPotion: '镇静药水',
    buildingPotion: '建筑药水', miningPotion: '采矿药水',
    lifeCrystal: '生命水晶', manaCrystal: '魔力水晶',
    suspiciousEye: '可疑眼球', slimeCrown: '史莱姆王冠', wormFood: '蠕虫诱饵', bloodySpine: '血腥脊椎',
    abeemination: '憎恶之蜂', guideVoodooDoll: '向导巫毒娃娃', clothierVoodooDoll: '服装师巫毒娃娃',
    eyeTrophy: '克苏鲁之眼奖杯', slimeTrophy: '史莱姆王奖杯', eaterTrophy: '世界吞噬者奖杯',
    skeletronTrophy: '骷髅王奖杯', queenBeeTrophy: '蜂后奖杯', wofTrophy: '血肉墙奖杯',
    slimeGun: '史莱姆枪', kingSlimeMask: '史莱姆王面具', eyeMask: '克苏鲁之眼面具',
    eaterMask: '世界吞噬者面具', skeletronMask: '骷髅王面具',
    breakerBlade: '破坏者之刃', surpriseBox: '惊喜盒', goldenCrown: '金冠', heartLantern: '心形灯笼',
    starLantern: '星瓶', waterCandle: '水蜡烛', luckyCoin: '幸运币', soulCatcher: '灵魂捕捉器',
    shadowKey: '暗影钥匙', magicMirror: '魔镜', pixieDust: '妖精尘', plant: '草种子',
    sunflower: '向日葵', purificationPowder: '净化粉', herbBag: '草药袋', fallenStar: '坠落之星',
    blackLens: '黑色透镜', goldenKey: '金钥匙',
    coinCopper: '铜币', coinSilver: '银币', coinGold: '金币', coinPlatinum: '铂金币',
    cloudInABottle: '云朵瓶', leather: '皮革', lifeFruit: '生命果'
  };

  const TYPE_DESC = {
    weapon: '一件可以用来战斗的武器。',
    tool: '用于挖掘、砍伐或建造的工具。',
    armor: '穿戴后可以提升防御力。',
    accessory: '装备后能够提供特殊能力。',
    potion: '使用后获得治疗效果或增益。',
    block: '可以放置的建筑方块。',
    wall: '可以放置在背景中的墙。',
    ammo: '弹药，需要配合相应的武器。',
    material: '用于制作物品的材料。',
    summonItem: '在特定条件下使用，可以召唤强大的首领。',
    consumable: '使用后获得永久提升。',
    coin: '通用货币。'
  };

  const DESC = {
    'Returns you to your spawn point.': '将你传送回出生点。',
    'Summons the Eye of Cthulhu at night.': '在夜晚召唤克苏鲁之眼。',
    'Summons King Slime.': '召唤史莱姆王。',
    'Summons the Eater of Worlds in the Corruption.': '在腐化之地召唤世界吞噬者。',
    'Summons the Brain of Cthulhu in the Crimson.': '在猩红之地召唤克苏鲁之脑。',
    'Summons Skeletron at night.': '在夜晚召唤骷髅王。',
    'Summons Queen Bee in the jungle.': '在丛林中召唤蜂后。',
    'Summons the Wall of Flesh in the Underworld.': '在地狱召唤血肉墙。',
    'Summons a baby slime to fight for you.': '召唤一只小史莱姆为你战斗。',
    'Summons a hornet that shoots stingers.': '召唤一只会发射毒刺的黄蜂。',
    'Summons a fire imp that hurls flames.': '召唤一只投掷火焰的火焰小鬼。',
    'Summons the twins to fight for you.': '召唤双子魔眼为你战斗。',
    'Summons the Eye of Cthulhu at night. Use it while below the surface.': '在夜晚召唤克苏鲁之眼。需要在地下使用。',
    'Summons the King Slime.': '召唤史莱姆王。',
    'Summons the Queen Bee in the Jungle.': '在丛林中召唤蜂后。',
    'Use in the Underworld to summon the Wall of Flesh. The Guide will be lost.': '在地狱使用以召唤血肉墙。向导会牺牲。',
    'Summons Skeletron at night. The dungeon remembers.': '在夜晚召唤骷髅王。地牢会记住这一切。'
  };

  Object.assign(DESC, {
    'A sturdy building material.': '坚固的建筑材料。',
    'Look through, not walk through.': '看得见风景，走不过去。',
    'Restores 15 life.': '恢复 15 生命。',
    'One-way platform. Press S to drop through.': '单向平台。按 S 落下。',
    'A warm light against the dark.': '黑暗中温暖的光。',
    'Nearby allies regenerate life faster.': '附近友军的生命恢复速度加快。',
    'Stores 20 stacks of loot.': '可存放 20 组物品。',
    'Sets your respawn point in a valid house.': '在合格的房屋中设置重生点。',
    'Keeps monsters out. Use F to open.': '阻挡怪物。按 F 打开。',
    'Hurts anything that walks over it.': '伤害踩上去的一切。',
    'An ore with a metallic gleam.': '带有金属光泽的矿石。',
    'Refined metal, ready for the anvil.': '精炼金属，可用于铁砧。',
    'A cut gemstone that hums faintly.': '微微嗡鸣的切割宝石。',
    'Sticky, bouncy, useful.': '黏稠、有弹性，很有用。',
    'Opens golden chests in the dungeon.': '打开地牢中的黄金宝箱。',
    'A legendary hammer. Smashes altars.': '传说之锤。能砸碎祭坛。',
    'A simple arrow for a simple bow.': '为简朴的弓准备的箭。',
    'Throw with reckless abandon.': '不顾一切地扔出去。',
    'A writhing thorn of shadow.': '扭动的暗影荆棘。',
    'Bounces off walls.': '会在墙壁间反弹。',
    'Tells the time of day.': '显示一天中的时间。',
    'Shows your depth.': '显示你的深度。',
    'Shows your horizontal position.': '显示你的水平位置。',
    'Slightly increases movement speed.': '略微提升移动速度。',
    '+1 defense.': '+1 防御。',
    'Allows you to run fast after a short sprint.': '短距离冲刺后可以跑得很快。',
    'Allows an extra mid-air jump.': '允许额外一次空中跳跃。',
    'Negates fall damage.': '免疫坠落伤害。',
    'Slowly regenerates life.': '缓慢恢复生命。',
    'Slowly regenerates mana.': '缓慢恢复魔力。',
    'Increases melee attack speed.': '提升近战攻击速度。',
    'Melee attacks set enemies on fire.': '近战攻击使敌人着火。',
    'Grants immunity to fire blocks.': '免疫火焰方块。',
    'Press H to fire a grappling hook at the cursor.': '按 H 向光标射出抓钩。',
    'Release bees when hurt.': '受伤时放出蜜蜂。',
    'Automatically consumes mana potions when needed.': '需要时自动饮用魔力药水。',
    'Melee attacks release a radiant bolt.': '近战攻击释放光辉之矢。',
    'Run fast and leave ice in your wake.': '健步如飞，并在身后留下冰迹。',
    'Regenerates life, and reduces healing cooldown.': '恢复生命，并缩短治疗冷却。',
    'Stars fall when you are hurt.': '受伤时落下星星。',
    '+10% movement speed.': '+10% 移动速度。',
    'Increases arrow damage.': '提升箭矢伤害。',
    '+15% ranged damage.': '+15% 远程伤害。',
    '+15% melee damage.': '+15% 近战伤害。',
    '+15% magic damage.': '+15% 魔法伤害。',
    '+15% summon damage.': '+15% 召唤伤害。',
    'Double tap a direction to dash.': '双击方向键冲刺。',
    'Reduces damage taken by 17%.': '受到的伤害降低 17%。',
    'May confuse nearby enemies when hurt.': '受伤时可能使附近敌人混乱。',
    'Slimes no longer attack you.': '史莱姆不再攻击你。',
    'Three extra jumps.': '额外三次跳跃。',
    'Restores 50 life.': '恢复 50 生命。',
    'Restores 100 life.': '恢复 100 生命。',
    'Restores 150 life.': '恢复 150 生命。',
    'Restores 50 mana.': '恢复 50 魔力。',
    'Restores 100 mana.': '恢复 100 魔力。',
    'Increases defense by 8 for 4 minutes.': '4 分钟内防御提升 8 点。',
    'Increases movement speed by 25%.': '移动速度提升 25%。',
    'Rapidly regenerates life.': '快速恢复生命。',
    'Emits light around you.': '照亮你周围。',
    'Increases night vision.': '提升夜视能力。',
    'Grants immunity to lava and fire blocks.': '免疫岩浆和火焰方块。',
    'Reflects some damage back at attackers.': '将部分伤害反弹给攻击者。',
    'Highlights nearby enemies.': '高亮附近敌人。',
    'Creates a ring of fire around you.': '在你周围形成火焰环。',
    'Teleports you home.': '将你传送回家。',
    'Walk on liquids.': '可以在液体上行走。',
    'Increases enemy spawn rate.': '提高敌人刷新率。',
    'Decreases enemy spawn rate.': '降低敌人刷新率。',
    'Increases placement speed and reach.': '提升放置速度和范围。',
    'Increases mining speed by 25%.': '挖掘速度提升 25%。',
    'Permanently increases maximum life by 20. Cap: 400.': '永久增加 20 最大生命。上限：400。',
    'Permanently increases maximum mana by 20. Cap: 200.': '永久增加 20 最大魔力。上限：200。',
    'A grim monument to a fallen god.': '陨落神明的冷酷纪念。',
    'Fires a harmless splash of slime. Mostly.': '发射无害的黏液。大概吧。',
    'Releases angry bees when you are hurt.': '受伤时释放愤怒的蜜蜂。',
    'Something rattles inside.': '里面有东西在嘎嘎作响。',
    'Rapidly regenerates mana.': '快速恢复魔力。',
    'Enemies sometimes drop extra coins.': '敌人有时会掉落额外钱币。',
    'Unlocks shadow chests in the Underworld.': '打开地狱中的暗影宝箱。',
    'Glittering wings of light.': '闪耀的光之翼。',
    'Plant on grass. Flowers grow over time.': '种在草地上。随着时间开花。',
    'A cheery flower.': '一朵欢快的花。',
    'Purifies corrupted stone nearby.': '净化附近的腐化石块。',
    'Contains a random herb.': '装有随机草药。'
  });

  function words(s) {
    return String(s || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim().split(/\s+/).filter(Boolean).map(w => w.toLowerCase());
  }

  function itemName(id) {
    if (!id) return '';
    if (ITEM[id]) return ITEM[id];
    const it = window.ITEMS && window.ITEMS[id];
    let name = it && it.name ? it.name : id;
    if (name === id || (/^[a-z]/.test(name) && !name.includes(' '))) name = id;
    const ws = words(name);
    let out = '', changed = false;
    for (const w of ws) {
      if (!w) continue;
      const key = w.replace(/s$/, '');
      if (TOKENS[w] !== undefined) { out += TOKENS[w]; changed = true; }
      else if (TOKENS[key] !== undefined) { out += TOKENS[key]; changed = true; }
      else out += w;
    }
    if (changed) return out;
    return UI[name] || UI[String(name).toUpperCase()] || null;
  }

  function trName(name) {
    if (!name) return '';
    if (UI[name]) return UI[name];
    if (UI[String(name).toUpperCase()]) return UI[String(name).toUpperCase()];
    if (/^The\s+/i.test(name)) {
      const rest = name.replace(/^The\s+/i, '');
      if (UI[rest]) return UI[rest];
    }
    return name;
  }

  function desc(it) {
    if (!it) return '';
    if (DESC[it.desc]) return DESC[it.desc];
    if (it.desc) {
      const s = String(it.desc);
      if (hasCJK(s)) return s;
      if (/^Summons /.test(s)) return '召唤一个强大的存在。';
    }
    return TYPE_DESC[it.type] || '';
  }

  function t(value) {
    if (typeof value !== 'string') return value;
    let s = value;
    if (!/[A-Za-z]/.test(s)) return s;
    if (UI[s] !== undefined) return UI[s];
    const up = s.toUpperCase();
    if (UI[up] !== undefined) return UI[up];

    let m;
    s = s.replace(/^Day (\d+) begins\. The light returns\.$/, '第 $1 天开始了。光明重返大地。');
    s = s.replace(/^You arrive in a world of (.+)\.$/, '你来到了「$1」的世界。');
    s = s.replace(/^Welcome back to (.+)\.$/, '欢迎回到「$1」。');
    s = s.replace(/^You were slain\.\.\.\s*(.+)$/, (all, cause) => '你被击败了…… ' + t(cause));
    s = s.replace(/^(.+) struck you down\.$/, (all, n) => trName(n) + '将你击倒。');
    s = s.replace(/^(.+) has been defeated!$/, (all, n) => trName(n) + '已被击败！');
    s = s.replace(/^(.+) has awoken!$/, (all, n) => trName(n) + '已苏醒！');
    s = s.replace(/^The (.+) passes\.$/, (all, ev) => '那场' + ({ 'Blood Moon': '血月', 'Goblin Army': '哥布林军队' }[ev] || trName(ev)) + '结束了。');
    s = s.replace(/^Goblin wave (\d+)!$/, '哥布林第 $1 波！');
    s = s.replace(/^The sky darkens\. Snow begins to fall\.$/, '天空暗了下来。雪开始飘落。');
    s = s.replace(/^The sky darkens\. Rain begins to fall\.$/, '天空暗了下来。雨开始落下。');
    s = s.replace(/^A life crystal dissolves into your chest\. Max life (\d+)\.$/, '生命水晶融入你的身体。最大生命值 $1。');
    s = s.replace(/^The Guide pays you (.+) and nods\. Good work\.$/, '向导支付了你 $1，并赞许地点了点头。');
    s = s.replace(/^Slimes defeated:\s*(\d+)\s*\/\s*(\d+)\.$/, '已击败史莱姆：$1 / $2。');
    s = s.replace(/^A heal costs (.+)\. Come back with coin\.$/, '治疗需要 $1，带够钱再来。');
    s = s.replace(/^Patched up for (.+)\.$/, '治疗完成，花费 $1。');
    s = s.replace(/^(.+) has moved in\.$/, '$1 已经入住。');
    s = s.replace(/^The ([^.]+) has arrived\..*$/, (all, n) => trName(n) + '已经到来了。');
    s = s.replace(/^Day (\d+)$/, '第 $1 天');
    s = s.replace(/^(\d+) FPS\s+(\d+) ENT$/, '帧率 $1  实体 $2');
    s = s.replace(/^RESPAWNING IN\s+(\d+)$/, '$1 秒后重生');
    s = s.replace(/^Coins lost:\s*(.+)$/, '损失金币：$1');
    s = s.replace(/^PLAYTIME\s+(.+)$/, '游戏时间  $1');
    s = s.replace(/^SAVE\s+(.+)$/, '存档  $1');
    s = s.replace(/^LIFE\s+(.+)$/, '生命  $1');
    s = s.replace(/^MANA\s+(.+)$/, '魔力  $1');
    s = s.replace(/^DEF\s+(\d+)$/, '防御 $1');
    s = s.replace(/^(\d+)\s+DAMAGE(?:\s+(\d+)% CRIT)?$/, (all, d, c) => c ? `${d} 伤害  ${c}% 暴击` : `${d} 伤害`);
    s = s.replace(/^(\d+) DEFENSE$/, '$1 防御');
    s = s.replace(/^(PICKAXE|AXE|HAMMER) POWER ([\d.]+)$/, (all, tool, n) => ({ PICKAXE: '镐', AXE: '斧', HAMMER: '锤' })[tool] + '力量 ' + n);
    s = s.replace(/^(\d+) MANA$/, '$1 魔力');
    s = s.replace(/^RESTORES (\d+) LIFE$/, '恢复 $1 生命');
    s = s.replace(/^RESTORES (\d+) MANA$/, '恢复 $1 魔力');
    s = s.replace(/^(ARROW|BULLET) AMMUNITION$/, (all, x) => (x === 'ARROW' ? '箭矢' : '子弹') + '弹药');
    s = s.replace(/^AT\s+(.+)$/, (all, st) => '在 ' + trName(st));
    s = s.replace(/^BY HAND$/, '徒手');
    s = s.replace(/^BUFF:\s*(.+)$/, (all, b) => '增益：' + trName(b));
    s = s.replace(/^USE TIME ([\d.]+)s$/, '使用时间 $1 秒');
    s = s.replace(/^VALUE (.+)$/, '价值 $1');
    s = s.replace(/^QUANTITY (\d+)$/, '数量 $1');
    s = s.replace(/^([A-Z]+) SET$/, (all, x) => (UI[x + ' SET'] || (trName(x) + '套装')));
    s = s.replace(/^(WEAPON|TOOL|ARMOR|ACCESSORY|POTION|BLOCK|WALL|AMMO|MATERIAL|SUMMON|CONSUMABLE)(?: - (MELEE|RANGED|MAGIC|SUMMON))?$/, (all, a, b) => trName(a) + (b ? ' - ' + trName(b) : ''));
    s = s.replace(/^(.+?)\s{2,}(-?\d+) ft$/, (all, d, n) => trName(d) + ' ' + n + ' 英尺');
    s = s.replace(/^(DAY|NIGHT)\s+(\d{2}:\d{2})$/, (all, d, clock) => (d === 'DAY' ? '白天 ' : '夜晚 ') + clock);
    s = s.replace(/^F\s+TALK TO\s+(.+)$/, (all, n) => 'F   与' + trName(n) + '对话');
    if (/^F\s+/.test(s)) {
      const label = s.replace(/^F\s+/, '');
      const translated = UI[label] || UI[label.toUpperCase()];
      if (translated) s = 'F   ' + translated;
    }
    s = s.replace(/^MELEE x([\d.]+)$/, '近战 x$1');
    s = s.replace(/^RANGED x([\d.]+)$/, '远程 x$1');
    s = s.replace(/^MAGIC x([\d.]+)$/, '魔法 x$1');
    s = s.replace(/^SUMMON x([\d.]+)$/, '召唤 x$1');
    s = s.replace(/^CRIT (\d+)%$/, '暴击 $1%');
    s = s.replace(/^KILLS (\d+)$/, '击杀 $1');
    s = s.replace(/^CRYSTALS\s+LIFE\s+(\d+)\s+MANA\s+(\d+)$/, '水晶  生命 $1   魔力 $2');
    s = s.replace(/^COINS\s+(.+)$/, '金币  $1');
    s = s.replace(/^FAVOR:\s*(.+)$/, (all, title) => '任务：' + trName(title));
    s = s.replace(/^AUDIO\s+(ON|MUTED)$/, (all, mode) => mode === 'ON' ? '音频开启' : '音频已静音');
    s = s.replace(/^(\d+)s$/, '$1秒');
    s = s.replace(/(\d+)m\s+(\d+)s/g, '$1 分 $2 秒');
    s = s.replace(/^AXE POWER ([\d.]+)$/, '斧力量 $1');
    s = s.replace(/^HAMMER POWER ([\d.]+)$/, '锤力量 $1');
    s = s.replace(/^(.+?)\s+has moved in\.$/, (all, n) => trName(n) + ' 已经入住。');
    s = s.replace(/^(.+) has awoken!$/, (all, n) => trName(n) + ' 已苏醒！');
    s = s.replace(/^(.+) has been defeated!$/, (all, n) => trName(n) + ' 已被击败！');
    s = s.replace(/^(.+) struck you down\.$/, (all, n) => trName(n) + ' 将你击倒。');

    if (/^Crafted /.test(s)) s = s.replace(/^Crafted (.+?)\.$/, '制作了 $1。');
    else if (/^Bought /.test(s)) s = s.replace(/^Bought (.+?)\.$/, '购买了 $1。');
    else if (/^Sold /.test(s)) s = s.replace(/^Sold (.+?) for (.+?)\.$/, '出售了 $1，获得 $2。');
    else if (/^Equipped /.test(s)) s = s.replace(/^Equipped (.+?)\.$/, '装备了 $1。');

    s = s.replace(/^Could not save:\s*(.*)$/, '无法保存：$1');
    s = s.replace(/^You need a (axe|hammer|pickaxe) for that\.$/, (all, tool) => '你需要一把' + ({ axe: '斧', hammer: '锤', pickaxe: '镐' })[tool] + '。');
    s = s.replace(/^You need a grappling hook accessory\.$/, '你需要抓钩饰品。');
    s = s.replace(/^You have no (.+) to fire\.$/, (all, ammo) => { const a = ammo.replace(/s$/, ''); return '你没有可发射的' + ({ arrow: '箭', bullet: '子弹' }[a] || a) + '。'; });
    s = s.replace(/^Your life force is already at its natural limit\.$/, '你的生命已达自然极限。');
    s = s.replace(/^Your mana is already at its natural limit\.$/, '你的魔力已达自然极限。');
    s = s.replace(/^You are already at full health\.$/, '你的生命已满。');
    s = s.replace(/^Your mana is already full\.$/, '你的魔力已满。');
    s = s.replace(/^No surface to grapple\.$/, '没有可以抓附的表面。');
    s = s.replace(/^You have no healing potions\.$/, '你没有治疗药水。');
    s = s.replace(/^The Eye only answers at night\.$/, '克苏鲁之眼只在夜晚回应。');
    s = s.replace(/^Skeletron only wakes at night\.$/, '骷髅王只在夜晚苏醒。');
    s = s.replace(/^The guide whispers of a wall far below, in the Underworld\.$/, '向导低声提到，地狱深处有一堵墙。');
    s = s.replace(/^This summon only works in the Corruption\.$/, '这个召唤物只能在腐化之地使用。');
    s = s.replace(/^The Queen sleeps in the Jungle\.$/, '蜂后沉睡在丛林里。');
    s = s.replace(/^You cannot afford that\.$/, '你买不起。');
    s = s.replace(/^Your inventory is full\.$/, '你的背包已满。');
    s = s.replace(/^The Guide has moved in\.\s*(.*)$/, (all, extra) => '向导已经入住。' + (extra ? ' ' + t(extra) : ''));
    s = s.replace(/^The Blood Moon passes\.$/, '血月结束了。');
    s = s.replace(/^The Goblin Army passes\.$/, '哥布林军队撤退了。');

    m = s.match(/^([^:]{1,40}):\s*(.+)$/);
    if (m) {
      const nm = trName(m[1]);
      const ln = UI[m[2]] || m[2];
      if (nm !== m[1] || ln !== m[2]) s = nm + '：' + ln;
    }
    return s;
  }

  window.TR = {
    t,
    itemName,
    desc,
    hasCJK,
    name: trName,
    weather(type) {
      const key = ({ rain: 'RAIN', snow: 'SNOWFALL', storm: 'STORM', clear: 'CLEAR' })[type] || String(type).toUpperCase();
      return UI[key] || type;
    }
  };
})();
