/**
 * 手势判定：把 MediaPipe 的 21 个关键点变成「旋转 / 缩放 / 复位」三个动作。
 * ------------------------------------------------------------------
 * 设计要点（都是踩过坑之后定下来的）：
 *
 * 1. 手指伸展用**关节夹角**判定，不用"指尖到手腕的距离比"。
 *    后者会把蜷缩的手指判成伸直（合成数据与真手上都出现过）。
 *
 * 2. 张开度定义为「四个指尖到手腕的平均距离 / 掌尺度」。
 *    不用"指尖到掌心"——掌心会被蜷曲的指尖带着走，握拳时该距离可能不降反升。
 *    实测（合成手）：张开 ≈1.67，握拳 ≈0.79，稳定差两倍以上。
 *
 * 3. 姿态类信号用**中值滤波**，不用指数平滑。
 *    EMA 会把"张开↔握拳"两端往中间拉，手势越明确反而越判不出来。
 *
 * 4. 旋转是**拖动 + 摩擦**：角速度 ∝ 手掌位移速度。
 *    早期版本用"掌心偏离画面中心当摇杆 + 拨动冲量"双通道，
 *    结果手停在偏离中心的位置地球就自己转个不停，惯性还被重复计入。
 *
 * 5. 阈值自标定：从用户自己的动作里学「张开」与「握拳」两端。
 *    固定阈值对"手大手小 / 离镜头远近 / 斜对镜头"都太敏感。
 */

/** MediaPipe 关键点索引 */
export const TIPS = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};
/** 四指的 MCP / PIP / DIP / TIP */
const FINGER_JOINTS = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};
const WRIST = 0;
const FOUR_TIPS = [TIPS.index, TIPS.middle, TIPS.ring, TIPS.pinky];

/* ---------------- 判定阈值（集中在这里，便于调参） ---------------- */
export const THRESHOLDS = {
  /** 归一化张开度阈值（只用于界面显示；判定走原始值） */
  spreadOpen: 0.55,
  openOff: 0.42,
  /**
   * 握拳判据，量纲是**原始**张开度（= 四指尖到手腕的平均距离 / 掌长）。
   * 合成手实测：张开 1.67、半握 1.31、捏合 1.51、握拳 0.79；
   * 真手（MediaPipe 对蜷曲有低估）大致落在 0.6~0.95。
   * 所以阈值取 1.05：握拳必中，而半握/捏合都在 1.3 以上不会被误判。
   *
   * 别把这个值和归一化张开度混用——归一化后握拳 ≈0、张开 ≈1，
   * 单位搞错会让握拳永远判不出来（这里踩过一次）。
   */
  spreadFist: 1.05,
  /** 原始张开度的固定判据（UI 显示"张开度"时用它换算百分比） */
  rawOpen: 1.4,
  /** 退出"张开"状态的原始阈值（滞回的下沿，低于它就不再认为手是张开的） */
  rawOpenOff: 1.2,
  /** 张开度参考窗口的初始值（合成手实测：张开 1.67 / 握拳 0.79） */
  windowRest: 0.92,
  windowMax: 1.58,
  /** 参考窗口的上下限：防止把手势里的极端帧学成"正常姿势" */
  windowRestMin: 0.62,
  windowRestMax: 1.12,
  windowMaxMin: 1.28,
  windowMaxMax: 1.95,
  /** 参考窗口跟随速度：下包络跟着握拳端往下走，上包络跟着张开端往上走 */
  windowRestUpK: 0.3,
  windowRestDownK: 0.02,
  windowMaxUpK: 0.3,
  windowMaxDownK: 0.018,
  /** 只有"平静且看起来不像手在收拢"的帧才用来学参考窗口 */
  calibCalmSpeed: 1.1,
  calibMinObserved: 0.98,
  /** 拇指-食指捏合判定（按掌尺度归一化的 3D 距离） */
  pinchOn: 0.55,
  pinchOff: 0.72,
  /**
   * 捏合还必须满足：食指尖伸出掌心至少这么远（单位 = 手掌尺度）。
   * 握拳时这个值只有 0.11~0.17，捏合时 0.28~0.60，取 0.26 落在两者之间。
   */
  pinchReach: 0.26,
  /**
   * 捏合值超过这里就认为"手指完全分开、根本没在捏"：
   * 此时缩放速率归零，地球视距锁住不动。实测完全张开的手约 1.19。
   */
  pinchOpenLimit: 1.0,
  /**
   * 松开捏合后继续放大的秒数，与摄像头帧率无关。
   */
  releaseSec: 0.4,
  /** 捏到多拢算"满力"变倍 */
  pinchFull: 0.3,
  /** 捏合深度 → 变倍速率上限（1/秒）；约 2.5 秒走完整个缩放范围 */
  zoomGain: 0.85,
  /** 关节角度：认为"伸直"的最小夹角（度） */
  fingerAngle: 128,
  /**
   * 连续多少帧满足握拳才算数（防抖）。
   * 注意：关键点平滑 + 中值滤波本身还会带来约 0.4 秒的过渡延迟，
   * 所以从"开始握拳"到进入 fist 状态总计约 0.5 秒，属正常手感。
   */
  fistFrames: 4,
  /** 触发复位的保持时长（秒） */
  resetHoldSec: 0.9,
  /** 手掌速度低于此值视为静止（归一化单位/秒） */
  stillSpeed: 0.05,
};

const z3 = (p) => (Number.isFinite(p?.z) ? p.z : 0);
/** 纯 2D 距离 */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** 3D 距离 */
const dist3 = (a, b) => {
  const dz = z3(a) - z3(b);
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + dz * dz);
};

/** 手掌参考尺度：腕→中指根距离（3D），随人、随远近缩放 */
export function palmScale(lm) {
  return Math.max(1e-3, dist3(lm[WRIST], lm[9]));
}

/** 掌心：腕与中指掌指关节的中点（刻意不用"手指根部质心"，它太靠上） */
export function palmCenter(lm) {
  return { x: (lm[WRIST].x + lm[9].x) / 2, y: (lm[WRIST].y + lm[9].y) / 2, z: (z3(lm[WRIST]) + z3(lm[9])) / 2 };
}

/**
 * 掌面张开度原始值：四个指尖到**手腕**的平均距离 / 手掌尺度。
 *
 * 为什么用「到手腕」而不是「到掌心」：掌心在手指蜷曲时会被指尖带着走，
 * 于是"指尖到掌心"在握拳时可能不降反升；而指尖到手腕的距离只取决于
 * 手指伸展了多少——伸直时最大、握拳时最小，且与手掌是否斜对镜头基本无关。
 *
 * 数值区间（合成手）：张开手掌 ≈1.67，握拳 ≈0.79。跨手型比较请用
 * normalizeSpread()，绝对值会随手大手小、镜头远近漂移。
 */
export function rawSpread(lm) {
  const s = palmScale(lm);
  let sum = 0;
  for (const t of FOUR_TIPS) sum += dist3(lm[t], lm[WRIST]);
  return sum / FOUR_TIPS.length / s;
}

/** 兼容旧名字：语义同 rawSpread */
export function palmSpread(lm) {
  return rawSpread(lm);
}

/**
 * 食指"伸出量"：食指尖沿「掌心 → 食指根」方向伸出多远（单位 = 手掌尺度）。
 *
 * 为什么需要它——捏合与握拳在几何上是**混淆**的：握拳时拇指正好压在食指上，
 * 拇指尖到食指尖的距离和捏合时一样小。实测（合成手，含 ±0.004 噪声各 200 次）：
 *     捏合  0.41 ~ 0.60
 *     握拳  0.11 ~ 0.17
 * 这是"食指尖有没有真的离开掌心"的度量，两类之间有 0.24 的干净间隔。
 * 没有它，握拳会被判成捏合，复位手势永远触发不了（真实踩过的坑）。
 */
export function indexReach(lm) {
  const palm = palmCenter(lm);
  const mcp = lm[5];
  const tip = lm[8];
  const scale = palmScale(lm);
  const dx = (mcp.x - palm.x) / scale;
  const dy = (mcp.y - palm.y) / scale;
  const dz = (z3(mcp) - palm.z) / scale;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return 0;
  return ((tip.x - palm.x) * dx + (tip.y - palm.y) * dy + (z3(tip) - palm.z) * dz) / (scale * len);
}

/**
 * 张开度参考窗口：用两个"各自的单侧包络"夹出用户自己的张合范围。
 *   rest —— 手部姿态的**下包络**（握拳那边）
 *   max  —— 手张开时的**上包络**
 *
 * 为什么这么写（踩过的坑）：
 * 1) 一开始让 max 也缓慢往回收，结果"手一直张着"时 max 一路掉到 raw 附近，
 *    窗口塌成一个点，张开度恒等于 0；改成"上包络只涨不落（带很慢的回落）"才对。
 * 2) 用"必须见过 1:1.3 的跨度才启用"的门槛太脆：合成手上实测只到 1:1.14，
 *    归一化直接被禁用，握拳恒被算成 0.6，复位手势永远触发不了。
 *    改成窗口有初始值（合成手/真手都在这个量级），再按观察到的极值缓缓扩张，
 *    这样第一帧就有可用的归一化，且会随用户自己的手型慢慢校准。
 */
export function createSpreadCalibration() {
  return {
    rest: THRESHOLDS.windowRest,
    max: THRESHOLDS.windowMax,
    updated: false, // 是否真的从观察中调整过
  };
}

/** 窗口是否已经可用（有初始值，所以恒为真；保留接口给 UI 显示状态） */
export function isCalibrated(calib) {
  return !!calib && Number.isFinite(calib.rest) && Number.isFinite(calib.max) && calib.max - calib.rest > 0.15;
}

/**
 * 用当前帧的原始张开度更新参考窗口。
 * 只喂"平静"帧，并且只在张开度不低得可怜时下探 rest——
 * 否则捏合/握拳过程中的收拢帧会把 rest 拉到握拳端，窗口塌掉。
 */
export function updateSpreadCalibration(calib, raw) {
  const T = THRESHOLDS;
  if (!(raw > 0) || !isCalibrated(calib)) return calib;

  // 上包络：张开时立刻跟上，收拢时只以很慢的速度回落
  if (raw > calib.max) calib.max = Math.min(T.windowMaxMax, raw);
  else calib.max = Math.max(T.windowMaxMin, calib.max + (raw - calib.max) * T.windowMaxDownK);

  // 下包络：明显更低才跟随（快速），否则非常慢地回升
  if (raw < calib.rest) calib.rest = Math.max(T.windowRestMin, calib.rest + (raw - calib.rest) * T.windowRestDownK);
  else calib.rest = Math.min(T.windowRestMax, calib.rest + (raw - calib.rest) * T.windowRestUpK);

  // 维持一个最小跨度，避免窗口塌成一个点
  if (calib.max - calib.rest < 0.3) calib.max = calib.rest + 0.3;
  calib.updated = true;
  return calib;
}

/** 把原始张开度按参考窗口映射到 ≈0（握拳）~ ≈1（张开手掌） */
export function normalizeSpread(raw, calib) {
  if (!isCalibrated(calib)) return null;
  const span = Math.max(1e-3, calib.max - calib.rest);
  const n = (raw - calib.rest) / span;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** 在 b 点处的三维关节夹角（度）。 */
function jointAngle(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v1z = z3(a) - z3(b);
  const v2z = z3(c) - z3(b);
  const n1 = Math.hypot(v1x, v1y, v1z);
  const n2 = Math.hypot(v2x, v2y, v2z);
  if (n1 < 1e-6 || n2 < 1e-6) return 180;
  const cos = (v1x * v2x + v1y * v2y + v1z * v2z) / (n1 * n2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * 手指伸展判定（关节夹角法）。
 * @returns {{extended: Record<string, boolean>, straightness: Record<string, number>}}
 */
export function fingerStates(lm, angleThresh = THRESHOLDS.fingerAngle) {
  const extended = {};
  const straightness = {};

  for (const [name, [mcp, pip, dip, tip]] of Object.entries(FINGER_JOINTS)) {
    const a1 = jointAngle(lm[mcp], lm[pip], lm[dip]); // PIP 弯曲
    const a2 = jointAngle(lm[pip], lm[dip], lm[tip]); // DIP 弯曲
    straightness[name] = Math.min(a1, a2);
    extended[name] = a1 > angleThresh && a2 > angleThresh - 10;
  }

  // 拇指不好用关节角判：改用「拇指尖到掌心 / 掌长」。
  // 握拳时拇指尖被收在掌心，这个比值明显更小。
  const palmRef = centroid([lm[WRIST], lm[9], lm[5], lm[13], lm[17]]);
  const scaleRef = palmScale(lm);
  const thumbReach = dist3(lm[4], palmRef) / scaleRef;
  straightness.thumbReach = thumbReach;
  extended.thumb = thumbReach > 0.9;

  return { extended, straightness };
}

/** 关键点包围盒（归一化坐标） */
export function handBox(lm) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/**
 * 手部尺寸/姿态质量。返回若干提示串，用于在界面上直接告诉用户
 * 「为什么现在不好识别」——比只显示"未检测到手"有用得多。
 */
export function handIssues(lm) {
  const box = handBox(lm);
  const size = Math.max(box.w, box.h);
  const issues = [];
  if (size < 0.22) issues.push('手太小：靠近镜头一点，或把手伸出来');
  if (size > 0.98) issues.push('手太近：整个手掌要完整在画面里');
  if (box.minX < 0.02 || box.maxX > 0.98 || box.minY < 0.02 || box.maxY > 0.98) {
    issues.push('手贴边了：往画面中间挪一点');
  }
  return { box, size, issues };
}

/** 一阶指数平滑 */
const damp = (prev, next, factor) => prev + (next - prev) * factor;

function centroid(points) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += z3(p);
  }
  return { x: x / points.length, y: y / points.length, z: z / points.length };
}

/** 保留最近 n 帧的环形缓冲 */
function pushCapped(arr, v, n) {
  arr.push(v);
  if (arr.length > n) arr.shift();
  return arr;
}

/**
 * 中值滤波：取最近 n 帧的中位数。
 * 姿态类信号（张开度、捏合值）不能用指数平滑——EMA 在"张开↔握拳"之间会把
 * 两端都往中间拉，手势越明确反而越判不出来；中值滤波能滤掉单帧跳变，
 * 又完整保留"阶跃"（用户换手势的那一刻立即跟上）。
 */
function medianOf(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export class GestureAnalyzer {
  /**
   * @param {object} opts
   * @param {number} [opts.sensitivity] 整体灵敏度倍率（UI 滑杆 0.4~2.6）
   * @param {number} [opts.distance] 初始视距（球半径 = 1）
   */
  constructor({ sensitivity = 1.25, distance = 3.2 } = {}) {
    this.sensitivity = sensitivity;
    this.baseDistance = distance;
    this.reset();
  }

  reset() {
    this.missingFrames = 0;
    this._missingSec = 0;
    this._mode = 'none';
    this._hold = 0;
    this._fistFrames = 0;
    this._resetLatched = false;

    // 旋转（拖动模型）
    this._glide = { x: 0, y: 0 }; // 当前角速度（弧度/秒）
    this._palm = null;
    this._lastPalm = null;
    this._palmVel = { x: 0, y: 0 };

    // 缩放
    this._pinchHist = [];
    this._pinchSmooth = 0;
    this._distance = null;
    this._zoomRate = 0; // >0 放大（拉近），<0 缩小
    this._wasPinching = false; // 上一帧是否正在捏合（用于识别"松开"）
    this._releaseTime = 0;

    // 姿态
    this._spreadHist = [];
    this._spreadSmooth = 0;
    this._spreadRaw = 0;
    this._thumbHist = [];
    this._lmSmooth = null;

    // 张开度自标定（学习用户自己的"张开/握拳"两端）
    this._calib = createSpreadCalibration();

    this._velLon = 0;
    this._velLat = 0;
    this._pinching = false;
    this._open = false;
  }

  setSensitivity(v) {
    this.sensitivity = Math.max(0.1, Number(v) || 1);
  }

  /** 外部把视距同步进来（鼠标滚轮 / 复位之后），避免手势从旧值继续 */
  syncDistance(d) {
    if (Number.isFinite(d)) this._distance = d;
  }

  /** 复位手势触发后清零计时，避免连续触发 */
  clearHold() {
    this._hold = 0;
    this._fistFrames = 0;
    this._resetLatched = true;
  }

  /**
   * 关键点时间平滑（一阶低通）。MediaPipe 逐帧抖动是"手感差"的主要来源，
   * 这里按位移自适应：动得快时跟得紧，静止时压得狠。
   */
  _smoothLandmarks(lm, dt) {
    if (!this._lmSmooth || this._lmSmooth.length !== lm.length) {
      this._lmSmooth = lm.map((p) => ({ x: p.x, y: p.y, z: z3(p) }));
      return this._lmSmooth;
    }
    const prev = this._lmSmooth;
    const raw = palmCenter(lm);
    const smooth = palmCenter(prev);
    const move = dist(raw, smooth);
    const alpha30 = Math.min(0.95, Math.max(0.3, move / Math.max(dt, 1 / 120) / 2.2));
    const alpha = 1 - Math.pow(1 - alpha30, dt * 30);
    for (let i = 0; i < lm.length; i++) {
      prev[i].x = damp(prev[i].x, lm[i].x, alpha);
      prev[i].y = damp(prev[i].y, lm[i].y, alpha);
      prev[i].z = damp(prev[i].z, z3(lm[i]), alpha);
    }
    return prev;
  }

  /** 没有检测到手时调用，逐渐释放状态（保留一点惯性，让地球自然滑行到停） */
  miss(dt = 1 / 30) {
    this.missingFrames += 1;
    const safeDt = Math.min(Math.max(dt, 1 / 120), 0.2);
    this._missingSec += safeDt;
    const decay = Math.exp(-7.5 * safeDt);
    this._glide.x = Math.abs(this._glide.x) < 0.02 ? 0 : this._glide.x * decay;
    this._glide.y = Math.abs(this._glide.y) < 0.02 ? 0 : this._glide.y * decay;
    this._velLon = this._glide.x;
    this._velLat = this._glide.y;
    this._hold = 0;
    this._fistFrames = 0;
    this._mode = 'none';
    this._zoomRate = 0;
    this._pinching = false;
    this._wasPinching = false;
    this._releaseTime = 0;
    this._lastPalm = null;
    this._palmVel = { x: 0, y: 0 };
    this._lmSmooth = null;
    this._spreadHist = [];
    this._pinchHist = [];
    this._open = false;
    if (this._missingSec > 1.5) {
      // 手离开画面一段时间后，连"期望视距"一起清掉，
      // 否则下次出现手时会拿一个陈旧的视距去覆盖用户自己拖出来的视角。
      this._distance = null;
      // 约 1.5 秒无手 → 清掉基线，避免换人/换距离后跳变
      this._pinchHist = [];
      this._spreadHist = [];
      this._thumbHist = [];
      this._palm = null;
      this._lastPalm = null;
      this._palmVel = { x: 0, y: 0 };
      this._lmSmooth = null;
      this._glide = { x: 0, y: 0 };
      this._velLon = this._velLat = 0;
    }
    return this.result({ mode: 'none', safeDt });
  }

  /**
   * @param {Array<{x:number,y:number,z?:number}>} rawLm 21 个归一化关键点
   * @param {number} dt 距上一帧的秒数
   */
  update(rawLm, dt, { worldLandmarks, gesture } = {}) {
    this.missingFrames = 0;
    this._missingSec = 0;
    const safeDt = Math.min(Math.max(dt, 1 / 120), 0.1);
    const screenLm = this._smoothLandmarks(rawLm, safeDt);
    // World landmarks use metres on all axes, avoiding camera aspect-ratio distortion.
    const lm = worldLandmarks?.length === 21 ? worldLandmarks : rawLm;

    const palm = palmCenter(screenLm);
    this._palm = palm;
    const span = palmScale(lm);
    const spreadRaw = rawSpread(lm);
    const pinchRaw = dist3(lm[TIPS.thumb], lm[TIPS.index]) / span;
    const { extended, straightness } = fingerStates(lm);

    // ---- 拇指伸展：最近几帧取多数票，抑制抖动 ----
    pushCapped(this._thumbHist, extended.thumb ? 1 : 0, 6);
    const thumbVotes = this._thumbHist.reduce((s, v) => s + v, 0);
    extended.thumb = thumbVotes >= Math.ceil(this._thumbHist.length / 2);
    const extCount = Object.values(extended).filter(Boolean).length;

    // ---- 姿态信号滤波：中值滤波（见 medianOf 注释，不要改成 EMA）----
    pushCapped(this._spreadHist, spreadRaw, 5);
    const spreadSmooth = medianOf(this._spreadHist);
    pushCapped(this._pinchHist, pinchRaw, 5);
    const pinch = medianOf(this._pinchHist);
    this._spreadSmooth = spreadSmooth;
    this._spreadRaw = spreadRaw;
    this._pinchSmooth = pinch;

    // ---- 张开度：归一化（给 UI 看的 0~1）+ 原始值（真正的判据）----
    // 判据用**原始值 + 固定阈值**，而不是归一化值：真手上固定阈值同样分得开
    // （张开 ≈1.67 / 握拳 ≈0.79），而归一化依赖参考窗口，捏合、握拳这些
    // "手在收拢"的帧会把窗口带偏，越学越偏反而把清晰的手势判丢。
    // 参考窗口只用来给界面显示一个直观的 0~100% 张开度。
    const calm = Math.hypot(this._palmVel.x, this._palmVel.y) < THRESHOLDS.calibCalmSpeed;
    const compact = extCount <= 2; // 手指蜷着 → 手在收拢，这一帧不能用来学窗口
    if (calm && !compact && spreadRaw > THRESHOLDS.calibMinObserved) {
      updateSpreadCalibration(this._calib, spreadRaw);
    }
    const spreadN = normalizeSpread(spreadSmooth, this._calib);
    // 界面用的张开度：混合固定判据与自标定——只信自标定会在窗口没学好时显示错，
    // 只信固定值又无法适应"手特别大/特别小"的用户。取两者中更保守的那个。
    const spreadUi = Math.max(0, Math.min(1, (spreadSmooth - THRESHOLDS.spreadFist) / (THRESHOLDS.rawOpen - THRESHOLDS.spreadFist)));
    const spreadShown = spreadN === null ? spreadUi : (spreadN + spreadUi) / 2;

    // ---- 模式判定：全部用**原始**张开度 + 滞回 ----
    // 滞回（进入/退出用不同阈值）是这里最关键的一步：单阈值加上逐帧抖动，
    // 会让"张开"在阈值附近来回翻转，地球跟着一顿一顿。
    // 量纲提醒：raw 张开 ≈1.67、半握 ≈1.31、捏合 ≈1.51、握拳 ≈0.79。
    const { spreadFist, rawOpen, rawOpenOff, pinchOn, pinchOff, pinchReach } = THRESHOLDS;
    const classified = gesture?.score >= (gesture?.categoryName === 'Closed_Fist' ? 0.7 : 0.6) && gesture.categoryName !== 'None';
    this._open = classified
      ? gesture.categoryName === 'Open_Palm'
      : this._open ? spreadSmooth > rawOpenOff : spreadSmooth >= rawOpen;
    const open = this._open;
    const fistish = classified
      ? gesture.categoryName === 'Closed_Fist'
      : spreadSmooth <= spreadFist && extCount <= 2;

    // The remaining fingers may curl during a pinch. Require exposed fingertips
    // instead of an open palm, with a stricter reach when the pose resembles a fist.
    const pinchCandidate = this._pinching ? pinch < pinchOff : pinch < pinchOn;
    const pinching = pinchCandidate && indexReach(lm) > (fistish ? 0.4 : pinchReach);
    this._pinching = pinching;

    let mode = 'none';
    if (pinching) {
      this._fistFrames = 0;
      mode = 'pinch';
    }
    else if (fistish) {
      // 连续几帧都像握拳才认，避免张开过程中的一瞬间被判成复位。
      // 计数器只能在"不再像握拳"时清零——早先写成 mode !== 'fist' 就清零，
      // 于是计数器永远停在 0/1，握拳复位根本触发不了。
      this._fistFrames += safeDt * 30;
      if (this._fistFrames >= THRESHOLDS.fistFrames) mode = 'fist';
      else mode = open ? 'rotate' : 'none';
    } else {
      this._fistFrames = 0;
      if (open) mode = 'rotate';
    }

    // ---- 掌心位移速度（归一化单位/秒，画面坐标系）----
    if (this._lastPalm) {
      const dx = (palm.x - this._lastPalm.x) / safeDt;
      const dy = (palm.y - this._lastPalm.y) / safeDt;
      const alpha = 1 - Math.exp(-18 * safeDt);
      this._palmVel.x = damp(this._palmVel.x, dx, alpha);
      this._palmVel.y = damp(this._palmVel.y, dy, alpha);
    }
    this._lastPalm = { x: palm.x, y: palm.y };

    // ---- 旋转：手掌左右拨动 = 拖动地球 ----
    // 纯「拖动 + 摩擦」模型：角速度与手掌位移速度成正比。
    // 画面坐标 x 向右 ↔ 经度正向；y 向下 ↔ 纬度（手往上拨 → 视角上移）。
    const moving = Math.hypot(this._palmVel.x, this._palmVel.y) > THRESHOLDS.stillSpeed;
    if (mode === 'rotate' && moving) {
      const gain = 1.0 * this.sensitivity;
      this._glide.x = this._clamp(this._palmVel.x * gain, 4.2);
      this._glide.y = this._clamp(this._palmVel.y * gain, 3.2);
    } else {
      // 手停住 / 手不在画面 / 换了手势：保留一点点惯性后迅速归零。
      // 这个"归零"必须做彻底：只靠指数衰减会无限接近 0，残留的千分之几
      // 足以让地球以肉眼可见的速度持续漂移。
      const decay = Math.exp(-7.5 * safeDt);
      this._glide.x = this._glide.x * decay;
      this._glide.y = this._glide.y * decay;
      if (Math.abs(this._glide.x) < 0.02) this._glide.x = 0;
      if (Math.abs(this._glide.y) < 0.02) this._glide.y = 0;
    }
    this._velLon = this._zeroize(this._glide.x);
    this._velLat = this._zeroize(this._glide.y);

    // ---- 缩放：捏拢缩小 / 拉开放大（连续变倍）----
    // 方向约定（用户明确要求）：捏拢 = **缩小**，手指拉直 = **放大**。
    // 实现成一个连续的"捏合程度"旋钮：
    //   捏到最拢 → rate 最负 → 视距迅速变大（画面缩小）
    //   手指拉开 → rate 转正 → 视距变小（画面放大）
    //   完全张开 → rate = 0，视距锁住不动（避免正常张开的手让地球一直缓慢放大）
    // 注：曾想再做一路"十指张到极限 → 加速放大"，但合成手 fixture 的手指方向是
    // 固定参数、无法模拟"手指扇开"，这个特性既验证不了、又会和旋转手势抢输入，
    // 因此不做。zoomRate > 0 只出现在捏合松开的过程中。
    // ---- 缩放：捏住 = 缩小，松手张开 = 放大，完全张开 = 锁住 ----
    // 判定用"原始 pinch"而不是中值滤波后的值：滤波有 5 帧延迟，会把
    // "手指重新张开"这一小段动作用掉，导致松开后几乎放不大（实测只放大 0.3）。
    // 原始值虽然抖，但缩放是积分量，抖动会被平均掉。
    const pinchOpenNow = pinchRaw >= THRESHOLDS.pinchOff;
    if (mode === 'pinch') {
      // 正在捏合：缩小。捏得越紧越快。
      this._releaseTime = 0;
      this._zoomRate = -this._zoomGainFor(pinchRaw);
    } else if (this._releaseTime > 0 && mode === 'rotate') {
      // Integrate the remaining duration, including a fractional final frame.
      this._zoomRate = Math.min(this._releaseTime / safeDt, 1);
      this._releaseTime = Math.max(0, this._releaseTime - safeDt);
    } else {
      this._zoomRate = 0;
      this._releaseTime = 0;
    }
    if (this._wasPinching && mode === 'rotate' && pinchOpenNow) {
      // 松手的那一帧：开始计时
      this._releaseTime = Math.max(0, THRESHOLDS.releaseSec - safeDt);
      this._zoomRate = 1;
    }
    this._wasPinching = mode === 'pinch';
    if (mode === 'pinch' || mode === 'rotate') {
      if (!Number.isFinite(this._distance)) this._distance = this.baseDistance;
      const before = this._distance;
      this._distance = this._clampMagnitude(before * Math.exp(-this._zoomRate * safeDt), 1.45, 9.5);
      // 夹到边界后不再上报速率，否则界面会显示"正在缩放"而画面其实没动
      if (Math.abs(this._distance - before) < 1e-9) this._zoomRate = 0;
    }

    // ---- 握拳保持 → 复位 ----
    if (mode === 'rotate' || mode === 'pinch') this._resetLatched = false;
    if (mode === 'fist' && !this._resetLatched) this._hold = Math.min(this._hold + safeDt, 3);
    else this._hold = 0;

    return this.result({
      mode,
      palm,
      span,
      // UI 用：张开度 0 = 握拳，1 = 张开手掌
      spread: spreadShown,
      spreadRaw,
      calibrated: isCalibrated(this._calib),
      pinch,
      extCount,
      extended,
      straightness,
      velocity: Math.hypot(this._palmVel.x, this._palmVel.y),
      safeDt,
    });
  }

  /** 捏合深度 → 变倍速率（连续、带死区） */
  _zoomLevel(pinch) {
    if (pinch >= THRESHOLDS.pinchOn) return 0;
    const full = THRESHOLDS.pinchFull;
    if (pinch <= full) return 1;
    return (THRESHOLDS.pinchOn - pinch) / (THRESHOLDS.pinchOn - full);
  }

  /**
   * 捏合深度 → 缩小速度系数（0.35 ~ 1）。
   *
   * 为什么不用「捏合程度」当连续旋钮（曾经这么做过）：实测 pinch 只在
   * 0.20~0.45 这个窄带里抖动，映射到连续速率上用户根本看不出快慢差别，
   * 反而在"松开"那一段因为穿过死区而完全不产生放大，手感是坏的。
   * 现在改成状态机：捏住恒定缩小，松手固定放大一小段时间，完全张开归零。
   * 这里只保留"捏得越紧缩得越快"的一点调制。
   */
  _zoomGainFor(pinch) {
    const { pinchFull, pinchOn } = THRESHOLDS;
    const t = (pinchOn - Math.min(Math.max(pinch, pinchFull), pinchOn)) / (pinchOn - pinchFull);
    return (0.35 + 0.65 * t) * this.sensitivity;
  }

  /** 自标定状态：是否已经拉开、两端各是多少 */
  calibration() {
    const c = this._calib;
    return { rest: c.rest, max: c.max, ready: isCalibrated(c) };
  }

  _clamp(v, m) {
    return Math.max(-m, Math.min(m, v));
  }

  _clampMagnitude(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** 消除指数平滑的浮点残留，避免地球缓慢漂移 */
  _zeroize(v) {
    return Math.abs(v) < 1e-4 ? 0 : v;
  }

  result(extra = {}) {
    const { mode = this._mode, velocity = 0, safeDt = 1 / 60, extCount = 0 } = extra;
    this._mode = mode;
    const g = this._glide ?? { x: 0, y: 0 };
    return {
      mode,
      /** 伸展的手指数（0~5） */
      extendedCount: extCount,
      extended: extra.extended ?? null,
      straightness: extra.straightness ?? null,
      /** 掌心移动速度（归一化单位/秒），仅用于 UI 反馈 */
      velocity,
      /** 弧度/秒：绕地轴（左右） */
      velLon: this._velLon ?? 0,
      /** 弧度/秒：俯仰（上下） */
      velLat: this._velLat ?? 0,
      /** 拖动角速度归一化到 -1..1，用于画指示条 */
      offset: { x: this._clamp(g.x / 4.2, 1), y: this._clamp(g.y / 3.2, 1) },
      /** 变倍速率（1/秒，正 = 放大） */
      zoomRate: this._zoomRate ?? 0,
      /** 长按复位进度 0~1（>=1 表示已触发） */
      resetProgress: Math.min(this._hold / THRESHOLDS.resetHoldSec, 1),
      triggered: !this._resetLatched && this._hold >= THRESHOLDS.resetHoldSec,
      /** 期望视距（球半径 = 1），null 表示还没有任何缩放意图 */
      distance: Number.isFinite(this._distance) ? this._distance : null,
      /** 张开度：未标定时是原始值，标定后 ≈0 握拳 / ≈1 张开 */
      spread: extra.spread ?? this._spreadSmooth ?? 0,
      /** 原始张开度（未标定），用于调试与自检 */
      spreadRaw: extra.spreadRaw ?? this._spreadRaw ?? 0,
      /** 是否已完成自标定 */
      calibrated: extra.calibrated ?? false,
      /** 拇指-食指相对间距（3D，按掌尺度归一化） */
      pinch: extra.pinch ?? this._pinchSmooth ?? 0,
      /** 掌心位置（归一化） */
      palm: extra.palm ?? this._palm,
      /** 本帧时间步长 */
      dt: safeDt,
    };
  }
}

/**
 * 在预览画布上绘制镜像画面 + 手部骨架
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement|HTMLCanvasElement|ImageBitmap} source
 * @param {number} w 目标宽
 * @param {number} h 目标高
 * @param {{x:number,y:number}[]|null} landmarks 归一化关键点
 * @param {{connections: number[][], color?: string, accent?: string, showSkeleton?: boolean, mode?: string}} opts
 */
export function drawOverlay(ctx, source, w, h, landmarks, opts) {
  const {
    connections,
    color = 'rgba(255,255,255,0.9)',
    accent = '#4fd1ff',
    showSkeleton = true,
    mode = 'none',
  } = opts;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (source) {
    // 镜像绘制摄像头画面（自拍视角：用户动右手，画面里也往右动）
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, w, h);
    ctx.restore();

    // 轻微压暗，让骨架更清晰
    ctx.fillStyle = 'rgba(3, 8, 18, 0.28)';
    ctx.fillRect(0, 0, w, h);
  }

  if (landmarks && showSkeleton) {
    // 归一化坐标 → 镜像后的画布坐标
    const px = (p) => ({ x: (1 - p.x) * w, y: p.y * h });

    ctx.lineWidth = Math.max(2, w / 200);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (const [a, b] of connections) {
      const pa = px(landmarks[a]);
      const pb = px(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const p = px(landmarks[i]);
      const isTip = Object.values(TIPS).includes(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTip ? Math.max(3.5, w / 110) : Math.max(2.4, w / 170), 0, Math.PI * 2);
      ctx.fillStyle = isTip ? accent : 'rgba(230, 245, 255, 0.92)';
      ctx.fill();
    }

    // 拇指-食指连线（捏合指示）
    const thumb = px(landmarks[TIPS.thumb]);
    const index = px(landmarks[TIPS.index]);
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = mode === 'pinch' ? 'rgba(255, 200, 90, 1)' : 'rgba(255, 210, 120, 0.85)';
    ctx.lineWidth = mode === 'pinch' ? Math.max(2.6, w / 170) : Math.max(1.6, w / 260);
    ctx.beginPath();
    ctx.moveTo(thumb.x, thumb.y);
    ctx.lineTo(index.x, index.y);
    ctx.stroke();
    ctx.restore();

    // 掌心
    const cp = px(palmCenter(landmarks));
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, Math.max(4, w / 90), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79, 209, 255, 0.95)';
    ctx.lineWidth = Math.max(2, w / 220);
    ctx.stroke();
  }

  ctx.restore();
}
