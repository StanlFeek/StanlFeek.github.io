'use strict';
/* Shared utilities: deterministic noise, math, colours, text, particles helpers. */
const U = (() => {
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (v - a) / (b - a);
  const smooth = t => t * t * (3 - 2 * t);
  const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
  const sign = v => v < 0 ? -1 : (v > 0 ? 1 : 0);
  const round = Math.round;
  const hashStr = s => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  class RNG {
    constructor(seed) { this.next = mulberry32(typeof seed === 'string' ? hashStr(seed) : (seed >>> 0)); }
    float(a = 0, b = 1) { return a + this.next() * (b - a); }
    int(a, b) { return Math.floor(this.float(a, b + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    }
  }
  function hash2(seed, x, y) {
    let h = seed | 0;
    h = Math.imul(h ^ (x | 0), 374761393);
    h = Math.imul(h ^ (y | 0), 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function hash3(seed, x, y, z) {
    let h = seed | 0;
    h = Math.imul(h ^ (x | 0), 374761393);
    h = Math.imul(h ^ (y | 0), 668265263);
    h = Math.imul(h ^ (z | 0), 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function valueNoise2(seed, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = hash2(seed, x0, y0), b = hash2(seed, x0 + 1, y0), c = hash2(seed, x0, y0 + 1), d = hash2(seed, x0 + 1, y0 + 1);
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }
  function fbm2(seed, x, y, oct = 4, persistence = 0.5, lacunarity = 2) {
    let v = 0, amp = 1, freq = 1, total = 0;
    for (let i = 0; i < oct; i++) {
      v += valueNoise2(seed + i * 1013, x * freq, y * freq) * amp;
      total += amp; amp *= persistence; freq *= lacunarity;
    }
    return v / total;
  }
  function valueNoise1(seed, x) {
    const x0 = Math.floor(x), fx = smooth(x - x0);
    return lerp(hash2(seed, x0, 0), hash2(seed, x0 + 1, 0), fx);
  }
  function fbm1(seed, x, oct = 4, persistence = 0.5) {
    let v = 0, amp = 1, freq = 1, total = 0;
    for (let i = 0; i < oct; i++) { v += valueNoise1(seed + i * 977, x * freq) * amp; total += amp; amp *= persistence; freq *= 2; }
    return v / total;
  }
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function shade(hex, amt) {
    const c = hexToRgb(hex);
    return rgbToHex(c.r + amt, c.g + amt, c.b + amt);
  }
  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
  }
  function rgba(hex, a) { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }
  function pick(arr, rng) { return arr[Math.floor((rng ? rng.next() : Math.random()) * arr.length)]; }
  function formatMoney(copper) {
    copper = Math.max(0, Math.floor(copper));
    const p = Math.floor(copper / 1000000), g = Math.floor(copper / 10000) % 100, s = Math.floor(copper / 100) % 100, c = copper % 100;
    return { c, s, g, p };
  }
  function moneyString(copper, short = false) {
    const m = formatMoney(copper);
    if (short) {
      if (m.p) return m.p + '铂';
      if (m.g) return m.g + '金';
      if (m.s) return m.s + '银';
      return m.c + '铜';
    }
    const parts = [];
    if (m.p) parts.push(m.p + '铂金');
    if (m.g) parts.push(m.g + '金币');
    if (m.s) parts.push(m.s + '银币');
    if (m.c || parts.length === 0) parts.push(m.c + '铜币');
    return parts.join(' ');
  }
  const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const now = () => performance.now();
  return { clamp, lerp, invLerp, smooth, approach, sign, round, hashStr, mulberry32, RNG, hash2, hash3, valueNoise2, fbm2, valueNoise1, fbm1, hexToRgb, rgbToHex, shade, mix, rgba, rectsOverlap, dist, angleLerp, pick, formatMoney, moneyString, roman, dirs, now };
})();
window.U = U;

/* Canvas text helpers using a loaded pixel font. */
const TXT = {
  family: '"Press Start 2P", "Microsoft YaHei UI", "Microsoft YaHei", "微软雅黑", "SimHei", "Noto Sans SC", sans-serif',
  init() { this.ctx = null; },
  hasCJK(text) { return window.TR ? TR.hasCJK(text) : /[\u3400-\u9fff]/.test(String(text || '')); },
  _tr(text) { return window.TR ? TR.t(String(text)) : String(text); },
  px(size, text, raw = false) {
    const s = raw ? String(text || '') : this._tr(String(text || ''));
    const cjk = this.hasCJK(s);
    return cjk ? Math.max(11, Math.round(size * 1.22)) : Math.max(6, Math.round(size));
  },
  measure(text, size = 8) {
    const c = this.ctx || (this.ctx = document.createElement('canvas').getContext('2d'));
    const s = this._tr(text);
    c.font = `${this.px(size, s, true)}px ${this.family}`;
    return c.measureText(s).width;
  },
  rawWidth(text, size = 8) {
    const c = this.ctx || (this.ctx = document.createElement('canvas').getContext('2d'));
    c.font = `${this.px(size, text, true)}px ${this.family}`;
    return c.measureText(String(text)).width;
  },
  width(text, size = 8) { return this.measure(text, size); },
  draw(ctx, text, x, y, size = 8, color = '#eee', align = 'left', baseline = 'top', shadow = true, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    text = this._tr(String(text));
    const px = this.px(size, text);
    ctx.font = `${px}px ${this.family}`;
    ctx.textAlign = align; ctx.textBaseline = baseline;
    ctx.imageSmoothingEnabled = false;
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      const off = Math.max(1, Math.round(px * 0.13));
      ctx.fillText(text, Math.round(x) + off, Math.round(y) + off);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  },
  drawRaw(ctx, text, x, y, size = 8, color = '#eee', align = 'left', baseline = 'top', shadow = true, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    text = String(text);
    const px = this.px(size, text, true);
    ctx.font = `${px}px ${this.family}`;
    ctx.textAlign = align; ctx.textBaseline = baseline;
    ctx.imageSmoothingEnabled = false;
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      const off = Math.max(1, Math.round(px * 0.13));
      ctx.fillText(text, Math.round(x) + off, Math.round(y) + off);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  },
  wrap(ctx, text, maxWidth, size = 8) {
    text = this._tr(String(text));
    const px = this.px(size, text, true);
    ctx.save(); ctx.font = `${px}px ${this.family}`;
    const lines = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (this.hasCJK(para)) {
        let line = '';
        for (const ch of para) {
          const test = line + ch;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = ch; }
          else line = test;
        }
        if (line) lines.push(line);
      } else {
        const words = para.split(' ');
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
          else line = test;
        }
        if (line) lines.push(line);
      }
    }
    ctx.restore();
    return lines;
  },
  paragraph(ctx, text, x, y, maxWidth, size = 8, color = '#eee', lineHeight = 0, align = 'left') {
    text = this._tr(String(text));
    const lines = this.wrap(ctx, text, maxWidth, size);
    lineHeight = lineHeight || Math.ceil(this.px(size, text, true) * 1.55);
    lines.forEach((line, i) => this.draw(ctx, line, x, y + i * lineHeight, size, color, align, 'top'));
    return lines.length * lineHeight;
  }
};
window.TXT = TXT;

/* Tiny DOM helpers and event bus. */
const GAME_BUS = {
  listeners: {},
  on(name, fn) { (this.listeners[name] ||= []).push(fn); },
  emit(name, data) { (this.listeners[name] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
};
window.GAME_BUS = GAME_BUS;

/* Colour palette shared across the art code. */
const PAL = {
  ink: '#0a0912',
  panel: '#1d2439',
  panelLight: '#303b59',
  panelDark: '#111522',
  gold: '#e5b844',
  goldLight: '#ffe08a',
  parchment: '#d8c7a1',
  white: '#f5f2e8',
  grey: '#9aa1b5',
  red: '#e04a4a',
  green: '#62c96d',
  blue: '#5aa9e6',
  mana: '#5b8fe8',
  corruption: '#6c4d8a',
  crimson: '#b2374a',
  jungle: '#4c8d37',
  snow: '#d6edf5',
  desert: '#d9b86d',
  hell: '#d3522b'
};
window.PAL = PAL;
