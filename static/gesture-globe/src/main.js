/**
 * 交互入口：把手势 / 鼠标 / 键盘三种输入接到地球仪上
 * ------------------------------------------------------------------
 * 手势约定（详见 index.html 的「手势指南」）：
 *   张开手掌 → 拨动旋转
 *   捏合双指 → 捏近缩小，拉开放大
 *   握拳按住 ≈1 秒 → 复位视角
 * 键盘：← → ↑ ↓ 旋转　+ / - 缩放　空格 自动旋转开关　R 复位　G 开关手势
 */
import { createGlobe, GLOBE_DEFAULTS } from './globe.js';
import { HandTracker, HAND_CONNECTIONS } from './hand-tracker.js';
import { GestureAnalyzer, drawOverlay } from './gestures.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const el = {
  canvas: $('scene'),
  panel: $('panel'),
  btnPanel: $('btn-panel'),
  btnCam: $('btn-cam'),
  btnCamOff: $('btn-cam-off'),
  btnReset: $('btn-reset'),
  btnShot: $('btn-shot'),
  toggleClouds: $('opt-clouds'),
  toggleAuto: $('opt-auto'),
  toggleSkeleton: $('opt-skeleton'),
  rangeSens: $('opt-sens'),
  valSens: $('val-sens'),
  rangeRes: $('opt-res'),
  valRes: $('val-res'),
  statFps: $('stat-fps'),
  statGesture: $('stat-gesture'),
  statHands: $('stat-hands'),
  statDelegate: $('stat-delegate'),
  guide: $('guide'),
  previewBox: $('preview-box'),
  preview: $('preview'),
  stageEmpty: $('stage-empty'),
  previewGesture: $('preview-gesture'),
  previewRes: $('preview-res'),
  camDot: $('cam-dot'),
  toasts: $('toasts'),
  overlay: $('overlay'),
  overlayText: $('overlay-text'),
  overlayBar: $('overlay-bar'),
  overlaySub: $('overlay-sub'),
};

/* ------------------------------------------------------------------ *
 * 通用 UI：toast
 * ------------------------------------------------------------------ */
function toast(text, kind = '') {
  if (!el.toasts) return;
  const node = document.createElement('div');
  node.className = `toast ${kind}`.trim();
  node.textContent = text;
  el.toasts.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 400);
  }, 4200);
  while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
}

/* ------------------------------------------------------------------ *
 * 1. 启动地球仪
 * ------------------------------------------------------------------ */
let globe = null;

async function boot() {
  try {
    globe = await createGlobe(el.canvas, {
      pixelRatio: Number(el.rangeRes?.value) || 1.5,
      onProgress: (p) => {
        if (el.overlayBar) el.overlayBar.style.width = `${Math.round(p * 100)}%`;
        if (el.overlayText) el.overlayText.textContent = `正在加载地球贴图… ${Math.round(p * 100)}%`;
      },
    });
  } catch (err) {
    console.error(err);
    if (el.overlayText) el.overlayText.textContent = `地球加载失败：${err?.message ?? err}`;
    if (el.overlaySub) el.overlaySub.textContent = '请通过 node tools/serve.mjs 启动的 http://127.0.0.1 地址访问，并检查 vendor/ 目录是否完整。';
    return;
  }

  if (el.overlayBar) el.overlayBar.style.width = '100%';
  if (el.overlayText) el.overlayText.textContent = '地球已就绪';
  el.overlay?.classList.add('gone');
  setTimeout(() => el.overlay?.setAttribute('hidden', ''), 450);
  if (el.btnCam) el.btnCam.disabled = false;

  initInputs();
  initGesture();
  requestAnimationFrame(tick);
  setTimeout(() => toast('点击右上角「启动摄像头手势」，允许摄像头后张开手掌即可旋转地球'), 900);
}

/* ------------------------------------------------------------------ *
 * 2. 鼠标 / 触屏 / 键盘 / 面板控件
 * ------------------------------------------------------------------ */
const pressedKeys = new Set();

function initInputs() {
  // 面板开关（窄屏）
  el.btnPanel?.addEventListener('click', () => {
    const open = el.panel.classList.toggle('open');
    el.btnPanel.setAttribute('aria-expanded', String(open));
  });

  // 控件
  el.toggleClouds?.addEventListener('change', (e) => globe.setCloudsVisible(e.target.checked));
  el.toggleAuto?.addEventListener('change', (e) => {
    state.autoRotate = e.target.checked;
    globe.setAutoRotate(e.target.checked);
  });
  el.toggleSkeleton?.addEventListener('change', (e) => {
    state.showSkeleton = e.target.checked;
  });
  el.rangeSens?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    analyzer.setSensitivity(v);
    if (el.valSens) el.valSens.textContent = `${v.toFixed(2)}×`;
  });
  el.rangeRes?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    globe.setPixelRatio(v);
    if (el.valRes) el.valRes.textContent = `${v.toFixed(1)}×`;
  });

  el.btnReset?.addEventListener('click', () => {
    globe.resetView();
    toast('已复位到默认视角', 'ok');
  });

  el.btnShot?.addEventListener('click', () => {
    try {
      const url = globe.snapshot();
      const a = document.createElement('a');
      a.href = url;
      a.download = `earth-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
      a.click();
      toast('画面已保存为 PNG', 'ok');
    } catch (err) {
      toast(`保存失败：${err?.message ?? err}`, 'error');
    }
  });

  // 点击指南卡片可直接体验对应效果
  el.guide?.addEventListener('click', (e) => {
    const item = e.target.closest('.guide-item');
    if (!item) return;
    const gesture = item.dataset.gesture;
    if (gesture === 'rotate') {
      globe.nudgeRotation(-32, 0);
      toast('手势「张开手掌」：手掌偏离画面中心 → 持续旋转', 'ok');
    } else if (gesture === 'zoom') {
      globe.zoomBy(0.78);
      toast('手势「捏合双指」：拇指与食指靠近 → 放大', 'ok');
    } else if (gesture === 'reset') {
      globe.resetView();
      toast('手势「握拳按住」：保持约 1 秒 → 复位视角', 'ok');
    }
    item.classList.add('active');
    setTimeout(() => item.classList.remove('active'), 900);
  });

  // 键盘
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', '+', '=', '-', '_'].includes(k)) e.preventDefault();
    if (k === ' ') {
      state.autoRotate = !state.autoRotate;
      if (el.toggleAuto) el.toggleAuto.checked = state.autoRotate;
      globe.setAutoRotate(state.autoRotate);
      toast(state.autoRotate ? '自动旋转：开' : '自动旋转：关');
      return;
    }
    if (k === 'r') {
      globe.resetView();
      toast('已复位到默认视角', 'ok');
      return;
    }
    if (k === 'g') {
      setGestureEnabled(!state.gestureEnabled);
      return;
    }
    pressedKeys.add(k);
  });
  window.addEventListener('keyup', (e) => pressedKeys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => pressedKeys.clear());

  // 窗口尺寸（globe.js 内部已处理 canvas 尺寸，这里只同步预览画布）
  window.addEventListener('resize', () => {
    sizePreview();
    if (!state.gestureEnabled) sizePreviewCanvasOnly();
  });
}

/* ------------------------------------------------------------------ *
 * 3. 手势：摄像头 + MediaPipe
 * ------------------------------------------------------------------ */
const state = {
  gestureEnabled: false,
  cameraOn: false,
  busy: false,
  handPresent: false,
  fps: 0,
  autoRotate: true,
  showSkeleton: true,
  lastGesture: null,
};

const video = $('cam');
const analyzer = new GestureAnalyzer({ sensitivity: Number(el.rangeSens?.value) || 1.25 });

const tracker = new HandTracker({
  video,
  onStatus: (s) => {
    if (s.phase === 'camera') setStageEmpty('正在请求摄像头权限…');
    if (s.phase === 'loading') setStageEmpty(s.message ?? '正在加载模型…');
    if (s.phase === 'streaming') {
      setStageEmpty(null);
      if (el.previewRes) el.previewRes.textContent = `${tracker.videoWidth}×${tracker.videoHeight}`;
    }
    if (s.phase === 'loaded' && el.statDelegate) el.statDelegate.textContent = s.delegate ?? '--';
  },
});

let lastLandmarks = null;
let lastDetectAt = 0;
let lastObservationAt = 0;
let detectInterval = 1000 / 30;
const DETECT_SLOW = 1000 / 20;

function setStageEmpty(text) {
  if (!el.stageEmpty) return;
  if (text) {
    el.stageEmpty.textContent = text;
    el.stageEmpty.style.display = '';
  } else {
    el.stageEmpty.style.display = 'none';
  }
}

async function setGestureEnabled(on) {
  if (state.busy || on === state.gestureEnabled) {
    if (!on && state.gestureEnabled) return setGestureEnabled(false);
    return;
  }
  state.busy = true;
  try {
    if (on) {
      el.previewBox.hidden = false;
      setStageEmpty('正在加载手势识别模型…');
      sizePreview();
      await tracker.load();
      if (!tracker.ready) throw new Error('手势识别模型未就绪');
      await tracker.startCamera({ width: 960, height: 720 });
      state.cameraOn = true;
      state.gestureEnabled = true;
      el.camDot?.classList.add('on');
      el.btnCam?.setAttribute('aria-pressed', 'true');
      if (el.btnCam) el.btnCam.querySelector('.label').textContent = '手势控制中';
      if (el.btnCamOff) el.btnCamOff.disabled = false;
      if (el.statGesture) el.statGesture.textContent = '未检测到手';
      lastDetectAt = performance.now() - detectInterval;
      lastObservationAt = lastDetectAt;
      toast('摄像头已开启：张开手掌移动即可旋转地球', 'ok');
    } else {
      tracker.stopCamera();
      analyzer.reset();
      lastLandmarks = null;
      state.handPresent = false;
      state.cameraOn = false;
      state.gestureEnabled = false;
      globe?.setAutoRotate(state.autoRotate);
      el.camDot?.classList.remove('on');
      el.btnCam?.setAttribute('aria-pressed', 'false');
      if (el.btnCam) el.btnCam.querySelector('.label').textContent = '启动摄像头手势';
      el.previewBox.hidden = true;
      if (el.previewGesture) el.previewGesture.textContent = '未检测到手';
      if (el.statGesture) el.statGesture.textContent = '等待摄像头';
      if (el.statHands) el.statHands.textContent = '--';
      toast('摄像头手势已关闭');
    }
  } catch (err) {
    console.error(err);
    const msg = String(err?.message ?? err);
    setStageEmpty(
      /permission|denied|notallowed|not allowed/i.test(msg)
        ? '摄像头权限被拒绝\n请点击地址栏左侧的摄像头图标允许访问后重试'
        : `摄像头启动失败：${msg}`,
    );
    toast(
      /permission|denied|notallowed|not allowed/i.test(msg)
        ? '摄像头权限被拒绝：请在地址栏左侧允许摄像头访问'
        : `摄像头启动失败：${msg}`,
      'error',
    );
    el.previewBox.hidden = false;
  } finally {
    state.busy = false;
  }
}

el.btnCam?.addEventListener('click', () => {
  if (!globe) return;
  setGestureEnabled(!state.gestureEnabled);
});
el.btnCamOff?.addEventListener('click', () => setGestureEnabled(false));

function initGesture() {
  setStageEmpty('摄像头未开启\n点击右上角「启动摄像头手势」并允许访问');
  el.previewBox.hidden = true;
  sizePreview();
}

/* 预览画布：按 4:3 容器尺寸 × dpr 设置像素尺寸 */
function sizePreviewCanvasOnly() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(160, Math.round(el.preview.clientWidth * dpr));
  const h = Math.max(120, Math.round(el.preview.clientHeight * dpr));
  if (el.preview.width !== w || el.preview.height !== h) {
    el.preview.width = w;
    el.preview.height = h;
  }
}

function sizePreview() {
  sizePreviewCanvasOnly();
  return { w: el.preview.width, h: el.preview.height };
}

const previewCtx = el.preview.getContext('2d');

/* ------------------------------------------------------------------ *
 * 4. 主循环：手势推理 + 键盘旋转 + 预览绘制 + 状态显示
 * ------------------------------------------------------------------ */
let lastFrameAt = performance.now();
let statAccum = 0;
let statFrames = 0;
let slowStreak = 0;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - lastFrameAt) / 1000, 0.1);
  lastFrameAt = now;

  // ---- 手势推理（限频，画面隐藏时跳过） ----
  if (state.gestureEnabled && tracker.ready && !document.hidden && now - lastDetectAt >= detectInterval) {
    const step = clamp((now - lastObservationAt) / 1000, 1 / 120, 0.2);
    lastDetectAt = now;
    const t0 = performance.now();
    let detected = null;
    try {
      detected = tracker.detect(now);
    } catch (err) {
      console.warn('[main] detect 失败：', err);
    }
    const cost = performance.now() - t0;
    // 自适应推理频率：单帧推理超过 40ms 就降到 20Hz，保证渲染流畅
    slowStreak = cost > 40 ? slowStreak + 1 : 0;
    detectInterval = slowStreak > 20 ? DETECT_SLOW : 1000 / 30;

    if (detected) {
      lastObservationAt = now;
      lastLandmarks = detected.landmarks;
      state.handPresent = true;
      applyGesture(analyzer.update(detected.landmarks, step, detected), detected.handedness);
    } else if (detected === null) {
      lastObservationAt = now;
      lastLandmarks = null;
      state.handPresent = false;
      applyGesture(analyzer.miss(step), null);
    }
  } else if (state.gestureEnabled && document.hidden) {
    lastDetectAt = now;
  }

  // ---- 键盘旋转 / 缩放 ----
  if (globe) {
    const spin = 78 * dt; // 度/秒
    if (pressedKeys.has('arrowleft')) globe.nudgeRotation(spin, 0);
    if (pressedKeys.has('arrowright')) globe.nudgeRotation(-spin, 0);
    if (pressedKeys.has('arrowup')) globe.nudgeRotation(0, spin * 0.7);
    if (pressedKeys.has('arrowdown')) globe.nudgeRotation(0, -spin * 0.7);
    if (pressedKeys.has('+') || pressedKeys.has('=')) globe.zoomBy(Math.pow(0.28, dt));
    if (pressedKeys.has('-') || pressedKeys.has('_')) globe.zoomBy(Math.pow(1 / 0.28, dt));
  }

  // ---- 预览绘制 ----
  if (state.gestureEnabled && state.cameraOn) {
    const { w, h } = sizePreview();
    drawOverlay(previewCtx, video, w, h, lastLandmarks, {
      connections: HAND_CONNECTIONS,
      color: 'rgba(140, 225, 255, 0.85)',
      accent: state.handPresent ? '#5cf08a' : '#4fd1ff',
      showSkeleton: state.showSkeleton,
    });
  }

  // ---- 状态显示（每 0.5 秒刷新一次，避免频繁改 DOM） ----
  statAccum += dt;
  statFrames += 1;
  if (statAccum >= 0.5) {
    state.fps = statFrames / statAccum;
    statAccum = 0;
    statFrames = 0;
    if (el.statFps) el.statFps.textContent = `${state.fps.toFixed(0)} FPS`;
    if (el.previewRes && state.cameraOn) el.previewRes.textContent = `${tracker.videoWidth}×${tracker.videoHeight}`;
  }
}

/* ------------------------------------------------------------------ *
 * 5. 手势 → 地球
 * ------------------------------------------------------------------ */
const MODE_TEXT = {
  none: '等待手势',
  rotate: '旋转中（手掌拖动）',
  pinch: '缩放中（捏合）',
  fist: '握拳（保持以复位）',
};

function applyGesture(g, handedness) {
  if (!globe) return;
  globe.setAutoRotate(state.autoRotate && !state.handPresent);
  if (g.velLon || g.velLat) globe.applyRotation(g.velLon, g.velLat, g.dt);

  // 缩放按「速率」交给地球自己积分：分析器不持有绝对视距，
  // 这样用户用滚轮/键盘自己拉出来的距离不会被手势状态覆盖。
  // zoomRate > 0 表示视距变小（画面放大）。
  if (g.zoomRate) globe.zoomBy(Math.exp(-g.zoomRate * (g.dt || 1 / 60)));

  if (g.triggered) {
    globe.resetView();
    analyzer.clearHold();
    toast('已通过「握拳」复位视角', 'ok');
  }

  // 状态面板
  const label = state.handPresent ? MODE_TEXT[g.mode] ?? g.mode : '未检测到手';
  if (el.statGesture) el.statGesture.textContent = label;
  if (el.previewGesture) el.previewGesture.textContent = label;
  if (el.statHands) el.statHands.textContent = state.handPresent ? `21 点 · 伸展 ${g.extendedCount}/5 · ${handedness ?? '手'}` : '--';

  // 指南高亮
  const key = g.mode === 'pinch' ? 'zoom' : g.mode === 'fist' ? 'reset' : g.mode === 'rotate' ? 'rotate' : null;
  for (const item of el.guide?.children ?? []) {
    item.classList.toggle('active', !!key && item.dataset.gesture === key);
  }
}

/* 页面隐藏时暂停渲染，省电且避免时间戳跳变 */
document.addEventListener('visibilitychange', () => {
  globe?.setPaused(document.hidden);
  lastDetectAt = performance.now();
  lastObservationAt = lastDetectAt;
  lastFrameAt = performance.now();
});

window.addEventListener('beforeunload', () => {
  tracker.dispose();
  globe?.dispose();
});

boot();

// 便于在控制台调试
window.__globeApp = { get globe() { return globe; }, state, tracker, analyzer, GLOBE_DEFAULTS };
