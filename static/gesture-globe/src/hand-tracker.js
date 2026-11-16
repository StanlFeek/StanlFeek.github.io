/**
 * 摄像头 + MediaPipe Gesture Recognizer
 * ------------------------------------------------------------------
 * 使用 Apache-2.0 开源项目 MediaPipe Tasks Vision（已本地化到 vendor/mediapipe）。
 * 输出训练模型的手势分类、置信度与三维关键点，交互状态机见 gestures.js。
 */
import { FilesetResolver, GestureRecognizer } from '../vendor/mediapipe/vision_bundle.mjs';

const WASM_PATH = './vendor/mediapipe/wasm';
const MODEL_PATH = './vendor/mediapipe/models/gesture_recognizer.task';

/** 手部 21 点连线（与 MediaPipe 官方定义一致） */
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

/** 指尖索引 */
export const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };

export class HandTracker {
  /** @param {{video: HTMLVideoElement, onStatus?: (s: {phase: string, message?: string, delegate?: string}) => void}} opts */
  constructor({ video, onStatus = () => {} }) {
    this.video = video;
    this.onStatus = onStatus;
    this.landmarker = null;
    this.stream = null;
    this.delegate = null;
    this.videoWidth = 0;
    this.videoHeight = 0;

    this._lastVideoTime = -1;
  }

  get ready() {
    return !!this.landmarker;
  }

  /** 加载 WASM 与模型（可重复调用，幂等） */
  async load() {
    if (this.landmarker) return this;
    this.onStatus({ phase: 'loading', message: '正在加载手势分类模型（本地文件）…' });
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

    const create = (delegate) =>
      GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

    try {
      this.landmarker = await create('GPU');
      this.delegate = 'GPU + CPU';
    } catch (err) {
      console.warn('[HandTracker] GPU 后端不可用，回退 CPU：', err);
      this.onStatus({ phase: 'loading', message: 'GPU 后端不可用，正在回退 CPU 推理…' });
      this.landmarker = await create('CPU');
      this.delegate = 'CPU (WASM)';
    }
    this.onStatus({ phase: 'loaded', delegate: this.delegate });
    return this;
  }

  /** 请求摄像头并等待首帧 */
  async startCamera({ width = 960, height = 720, facingMode = 'user' } = {}) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头 API（navigator.mediaDevices.getUserMedia 不可用）');
    }
    this.onStatus({ phase: 'camera', message: '正在请求摄像头权限…' });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: 30, max: 60 },
      },
    });

    const video = this.video;
    video.srcObject = this.stream;
    video.muted = true;
    await video.play().catch(() => {});

    await new Promise((resolve, reject) => {
      if (video.readyState >= 2 && video.videoWidth) return resolve();
      const timer = setTimeout(() => reject(new Error('摄像头画面超时未就绪')), 12000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
    });

    this.videoWidth = video.videoWidth;
    this.videoHeight = video.videoHeight;
    this._lastVideoTime = -1;
    this.onStatus({ phase: 'streaming', message: `摄像头已就绪：${this.videoWidth}×${this.videoHeight}` });
    return this;
  }

  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this._lastVideoTime = -1;
    this.onStatus({ phase: 'stopped' });
  }

  /**
   * 检测一帧画面。
   * @returns {{landmarks: Array<{x:number,y:number,z:number}>, handedness: string|null}|null}
   */
  detect(timestampMs) {
    if (!this.landmarker || this.video.readyState < 2 || !this.video.videoWidth) return null;
    if (this.video.currentTime === this._lastVideoTime) return undefined;
    this._lastVideoTime = this.video.currentTime;
    const result = this.landmarker.recognizeForVideo(this.video, timestampMs);
    const hand = result?.landmarks?.[0];
    if (!hand) return null;
    const label = result.handedness?.[0]?.[0]?.categoryName ?? null;
    // 画面对用户而言是镜像的（自拍视角），这里把左右手标签翻转一下更符合直觉
    const handedness = label === 'Left' ? '右手' : label === 'Right' ? '左手' : null;
    return {
      landmarks: hand,
      worldLandmarks: result.worldLandmarks?.[0],
      gesture: result.gestures?.[0]?.[0] ?? null,
      handedness,
    };
  }

  dispose() {
    this.stopCamera();
    try {
      this.landmarker?.close?.();
    } catch {
      /* 忽略关闭异常 */
    }
    this.landmarker = null;
  }
}
