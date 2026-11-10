'use strict';
/* Synthesized sound and music. No external audio files: every note and effect is built from oscillators and noise. */
const AUDIO = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null, ambGain = null, ambSrc = null;
  let started = false, track = null, step = 0, nextNote = 0, scheduler = null;
  const state = { volume: 0.72, music: 0.55, sfx: 0.85, muted: false, ready: false };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    dorian: [0, 2, 3, 5, 7, 9, 10, 12],
    phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
    hexa: [0, 3, 5, 6, 7, 10, 12],
    odd: [0, 1, 4, 6, 7, 10, 11, 12]
  };
  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => { }); return ac; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = state.muted ? 0 : state.volume; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = state.music; musicGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = state.sfx; sfxGain.connect(master);
      ambGain = ac.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
      noiseBuf = makeNoise(ac, 2.2);
      state.ready = true;
      if (scheduler) clearInterval(scheduler);
      scheduler = setInterval(scheduleMusic, 130);
      nextNote = ac.currentTime;
      return ac;
    } catch (e) { console.warn('Audio unavailable', e); return null; }
  }
  function makeNoise(c, seconds) {
    const len = Math.floor(c.sampleRate * seconds);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2 + white * 0.18;
    }
    return b;
  }
  function tone(freq, when, dur, type = 'square', vol = 0.16, slide = 0, dest = null) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), when);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(12, freq * slide), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest || musicGain);
    o.start(when); o.stop(when + dur + 0.03);
  }
  function noise(when, dur, vol = 0.18, freq = 1200, q = 0.8, type = 'bandpass', dest = null) {
    if (!ac || !noiseBuf) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(Math.max(0.0002, vol), when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxGain);
    s.start(when); s.stop(when + dur + 0.02);
  }
  function kick(when, vol = 0.3) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, when); o.frequency.exponentialRampToValueAtTime(38, when + 0.16);
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    o.connect(g); g.connect(musicGain); o.start(when); o.stop(when + 0.24);
  }
  const TRACKS = {
    title: { bpm: 62, root: 45, scale: 'minor', wave: 'triangle', lead: [4, 2, 0, 2, 4, 6, 4, 2], bass: [0, 0, 5, 5, 3, 3, 4, 4], pad: true, drums: 0 },
    overworld: { bpm: 92, root: 48, scale: 'major', wave: 'triangle', lead: [0, 2, 4, 7, 4, 2, 4, 5, 7, 9, 7, 4, 2, 0, 2, 4], bass: [0, 0, 4, 4, 5, 5, 3, 3], pad: true, drums: 0 },
    night: { bpm: 72, root: 45, scale: 'minor', wave: 'triangle', lead: [0, 2, 4, 3, 2, 0, -2, 0, 4, 3, 2, 0], bass: [0, 0, -2, -2, 3, 3, 2, 2], pad: true, drums: 0 },
    underground: { bpm: 58, root: 41, scale: 'minor', wave: 'sine', lead: [0, 3, 2, 0, -2, 0, 3, 2], bass: [0, 0, -3, -3, -5, -5, 0, 0], pad: true, drums: 0 },
    cave: { bpm: 52, root: 39, scale: 'dorian', wave: 'sine', lead: [0, 2, -2, 0, 3, 2, 0, -2], bass: [0, 0, 0, -3, -5, -5, 0, 0], pad: true, drums: 0 },
    jungle: { bpm: 104, root: 50, scale: 'dorian', wave: 'square', lead: [0, 3, 5, 7, 5, 3, 2, 0, 5, 7, 8, 7, 5, 3, 2, 0], bass: [0, 0, 3, 3, 5, 5, 2, 2], pad: false, drums: 1 },
    desert: { bpm: 80, root: 46, scale: 'phrygian', wave: 'triangle', lead: [0, 1, 4, 1, 0, -2, 1, 0], bass: [0, 0, 1, 1, 0, 0, -2, -2], pad: true, drums: 0 },
    snow: { bpm: 66, root: 52, scale: 'major', wave: 'sine', lead: [7, 4, 2, 4, 7, 9, 7, 4], bass: [0, 0, 4, 4, 2, 2, 5, 5], pad: true, drums: 0 },
    corruption: { bpm: 70, root: 43, scale: 'odd', wave: 'sawtooth', lead: [0, 1, 4, 3, 0, -1, 4, 1], bass: [0, 0, 1, 1, -1, -1, 0, 0], pad: true, drums: 0 },
    hell: { bpm: 100, root: 40, scale: 'odd', wave: 'sawtooth', lead: [0, 4, 1, 4, 6, 4, 1, 0, 0, 4, 6, 7, 6, 4, 1, 0], bass: [0, 0, 1, 1, 0, 0, 6, 6], pad: false, drums: 1 },
    boss: { bpm: 138, root: 41, scale: 'minor', wave: 'square', lead: [0, 3, 7, 3, 0, 3, 7, 10, 0, 3, 7, 3, 8, 7, 3, 0], bass: [0, 0, 0, 0, 3, 3, 5, 5], pad: false, drums: 2 },
    event: { bpm: 126, root: 44, scale: 'phrygian', wave: 'square', lead: [0, 1, 4, 5, 4, 1, 0, -2, 0, 1, 4, 5, 7, 5, 4, 1], bass: [0, 0, 1, 1, 0, 0, -2, -2], pad: false, drums: 1 }
  };
  function scheduleMusic() {
    if (!ac || state.muted || !track || !TRACKS[track]) return;
    if (ac.state === 'suspended') return;
    const T = TRACKS[track], spb = 60 / T.bpm / 2;
    if (nextNote < ac.currentTime - 1) nextNote = ac.currentTime + 0.05;
    while (nextNote < ac.currentTime + 0.28) {
      const i = step % T.lead.length;
      const sc = SCALES[T.scale] || SCALES.major;
      const n = T.lead[i];
      const oct = n >= 7 ? 1 : 0;
      const semi = sc[Math.abs(n) % sc.length] + Math.floor(Math.abs(n) / sc.length) * 12 + oct * 12;
      const freq = midi(T.root + 12 + semi);
      tone(freq, nextNote, spb * 1.5, T.wave, 0.085, 1, musicGain);
      if (i % 2 === 0) {
        const bn = T.bass[(step >> 1) % T.bass.length];
        const bsemi = sc[Math.abs(bn) % sc.length] + Math.floor(Math.abs(bn) / sc.length) * 12;
        tone(midi(T.root + bsemi), nextNote, spb * 1.8, 'triangle', 0.12, 0.99, musicGain);
      }
      if (T.pad && i % 4 === 0) {
        tone(midi(T.root + 12 + sc[[0, 2, 4, 5][Math.floor(i / 4) % 4]]), nextNote, spb * 7, 'sine', 0.035, 1, musicGain);
      }
      if (T.drums >= 1 && i % 4 === 0) kick(nextNote, 0.16);
      if (T.drums >= 2) { if (i % 2 === 0) kick(nextNote, 0.24); else noise(nextNote, 0.1, 0.08, 1800, 1, 'highpass', musicGain); }
      else if (T.drums === 1 && i % 4 === 2) noise(nextNote, 0.09, 0.06, 3000, 1, 'highpass', musicGain);
      nextNote += spb;
      step++;
    }
  }
  function setTrack(name) {
    if (track === name) return;
    track = name;
    step = 0;
    if (!ac) return;
    nextNote = ac.currentTime + 0.08;
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(ac.currentTime);
      musicGain.gain.setValueAtTime(0.0001, ac.currentTime);
      musicGain.gain.linearRampToValueAtTime(Math.max(0.0001, state.music), ac.currentTime + 0.6);
    }
  }
  function setAmbient(kind) {
    if (!ac || !noiseBuf) return;
    if (ambSrc) { try { ambSrc.stop(); } catch (e) { } ambSrc.disconnect(); ambSrc = null; }
    if (!kind || kind === 'none') { if (ambGain) ambGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4); return; }
    ambSrc = ac.createBufferSource(); ambSrc.buffer = noiseBuf; ambSrc.loop = true;
    const f = ac.createBiquadFilter();
    if (kind === 'rain') { f.type = 'lowpass'; f.frequency.value = 2200; ambGain.gain.value = 0.055; }
    else if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.3; ambGain.gain.value = 0.03; }
    else if (kind === 'lava') { f.type = 'lowpass'; f.frequency.value = 220; ambGain.gain.value = 0.08; }
    else if (kind === 'cave') { f.type = 'bandpass'; f.frequency.value = 160; f.Q.value = 1.2; ambGain.gain.value = 0.025; }
    ambSrc.connect(f); f.connect(ambGain); ambSrc.start();
  }
  function sfx(name, pitch = 1) {
    if (!ac || state.muted || !name) return;
    const now = ac.currentTime + 0.005;
    switch (name) {
      case 'swing': noise(now, 0.09, 0.1, 1800 * pitch, 0.7, 'bandpass'); break;
      case 'dig': noise(now, 0.055, 0.12, 900 * pitch, 0.8, 'bandpass'); tone(125 * pitch, now, 0.04, 'square', 0.03, 0.7); break;
      case 'break': noise(now, 0.16, 0.2, 700, 0.5, 'lowpass'); tone(95, now, 0.12, 'square', 0.06, 0.5); break;
      case 'place': tone(180, now, 0.06, 'square', 0.08, 1.18); noise(now, 0.05, 0.05, 500, 1); break;
      case 'pickup': tone(660, now, 0.06, 'square', 0.06, 1.25); tone(990, now + 0.045, 0.08, 'square', 0.045, 1.2); break;
      case 'coin': tone(880, now, 0.05, 'square', 0.05, 1.3); tone(1320, now + 0.05, 0.09, 'square', 0.04, 1.2); break;
      case 'jump': tone(260, now, 0.1, 'square', 0.07, 1.6); break;
      case 'doubleJump': tone(420, now, 0.12, 'triangle', 0.08, 1.8); tone(620, now + 0.05, 0.1, 'sine', 0.05, 1.3); break;
      case 'hurt': tone(190, now, 0.2, 'sawtooth', 0.12, 0.55); noise(now, 0.15, 0.12, 700, 0.6); break;
      case 'death': tone(220, now, 0.8, 'sawtooth', 0.16, 0.25); noise(now, 0.7, 0.2, 450, 0.5, 'lowpass'); break;
      case 'potion': tone(420, now, 0.1, 'sine', 0.08, 1.2); tone(660, now + 0.08, 0.12, 'sine', 0.07, 1.2); tone(880, now + 0.16, 0.18, 'sine', 0.06, 1.1); break;
      case 'heal': tone(520, now, 0.2, 'sine', 0.08, 1.4); tone(780, now + 0.1, 0.25, 'sine', 0.07, 1.3); break;
      case 'chest': noise(now, 0.16, 0.12, 400, 0.7); tone(170, now, 0.13, 'square', 0.06, 1.4); break;
      case 'craft': tone(520, now, 0.07, 'square', 0.05, 1.1); tone(780, now + 0.07, 0.1, 'square', 0.05, 1.1); break;
      case 'click': tone(700, now, 0.03, 'square', 0.045, 1); break;
      case 'fail': tone(180, now, 0.13, 'square', 0.08, 0.8); tone(120, now + 0.08, 0.16, 'square', 0.07, 0.8); break;
      case 'bow': noise(now, 0.08, 0.12, 2400, 1.1, 'bandpass'); tone(300, now, 0.05, 'triangle', 0.04, 2); break;
      case 'gun': noise(now, 0.12, 0.22, 900, 0.6, 'lowpass'); tone(110, now, 0.1, 'square', 0.12, 0.4); break;
      case 'magic': tone(520, now, 0.18, 'sine', 0.09, 2); tone(780, now + 0.04, 0.2, 'triangle', 0.06, 1.6); break;
      case 'summon': tone(300, now, 0.3, 'triangle', 0.08, 2); noise(now, 0.2, 0.05, 1800, 0.8); break;
      case 'boss': tone(70, now, 1.4, 'sawtooth', 0.2, 0.7); noise(now, 1.2, 0.22, 300, 0.5, 'lowpass'); tone(105, now + 0.5, 1.2, 'sawtooth', 0.12, 0.6); break;
      case 'roar': tone(85, now, 0.9, 'sawtooth', 0.18, 0.5); noise(now, 0.8, 0.18, 260, 0.4); break;
      case 'explosion': noise(now, 0.55, 0.32, 260, 0.3, 'lowpass'); tone(60, now, 0.4, 'sine', 0.2, 0.4); break;
      case 'thunder': noise(now, 1.2, 0.22, 190, 0.2, 'lowpass'); break;
      case 'door': tone(240, now, 0.12, 'square', 0.06, 0.7); noise(now, 0.1, 0.06, 500, 0.7); break;
      case 'quest': tone(660, now, 0.1, 'square', 0.06, 1.3); tone(880, now + 0.1, 0.1, 'square', 0.06, 1.2); tone(1100, now + 0.2, 0.2, 'square', 0.05, 1.1); break;
      case 'slime': tone(130, now, 0.12, 'sine', 0.09, 1.7); break;
      case 'zombie': tone(90, now, 0.35, 'sawtooth', 0.07, 0.8); break;
      case 'splash': noise(now, 0.2, 0.1, 1300, 0.4); break;
      default: tone(440, now, 0.06, 'square', 0.05); break;
    }
  }
  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (master && ac) master.gain.linearRampToValueAtTime(state.muted ? 0 : state.volume, ac.currentTime + 0.1);
  }
  function setMusicVolume(v) {
    state.music = Math.max(0, Math.min(1, v));
    if (musicGain && ac) musicGain.gain.linearRampToValueAtTime(state.music, ac.currentTime + 0.15);
  }
  function setSfxVolume(v) {
    state.sfx = Math.max(0, Math.min(1, v));
    if (sfxGain && ac) sfxGain.gain.linearRampToValueAtTime(state.sfx, ac.currentTime + 0.1);
  }
  function toggleMute() {
    state.muted = !state.muted;
    if (master && ac) master.gain.linearRampToValueAtTime(state.muted ? 0 : state.volume, ac.currentTime + 0.1);
    return state.muted;
  }
  function init() { if (started) { ensure(); return; } started = true; ensure(); }
  return { init, sfx, setTrack, setAmbient, setVolume, setMusicVolume, setSfxVolume, toggleMute, state, get ctx() { return ac; } };
})();
window.AUDIO = AUDIO;
