'use strict';
// Procedural sound effects and music (Web Audio API) — no external assets.
const Sound = {
  ctx: null, master: null, sfx: null, mus: null, noiseBuf: null, last: {}, musicTimer: null, step: 0, mood: 'menu',

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.gain.value = 0.16; this.mus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applySettings();
      this.startMusic();
    } catch (e) { this.ctx = null; }
  },

  applySettings() {
    if (!this.ctx) return;
    const s = Save.data.settings;
    this.sfx.gain.value = s.sfx ? 0.9 : 0;
    this.mus.gain.value = s.music ? 0.16 : 0;
  },

  env(g, t0, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  },

  noise(dur, o = {}) {
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q || 1;
    const g = c.createGain(); this.env(g, t0, o.attack || 0.01, o.vol || 0.3, dur);
    src.connect(f); f.connect(g); g.connect(o.out || this.sfx);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  },

  tone(freq, dur, o = {}) {
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = c.createGain(); this.env(g, t0, o.attack || 0.005, o.vol || 0.2, dur);
    osc.connect(g); g.connect(o.out || this.sfx);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

  play(name) {
    if (!this.ctx || !Save.data.settings.sfx) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    switch (name) {
      case 'air': this.noise(0.32, { freq: 500, to: 2600, q: 1.2, vol: 0.22 }); break;
      case 'airBig': this.noise(0.9, { type: 'lowpass', freq: 300, to: 2200, vol: 0.4, attack: 0.08 }); break;
      case 'fire': this.noise(0.28, { freq: 380, q: 0.7, vol: 0.3 }); this.tone(140, 0.2, { to: 60, type: 'triangle', vol: 0.1 }); break;
      case 'fireBig': this.noise(0.8, { type: 'lowpass', freq: 900, to: 200, vol: 0.5, attack: 0.03 }); this.tone(90, 0.6, { to: 40, vol: 0.2 }); break;
      case 'water': this.noise(0.25, { freq: 1300, to: 380, q: 2, vol: 0.25 }); this.tone(620, 0.12, { to: 300, vol: 0.06 }); break;
      case 'ice': this.tone(1900, 0.1, { to: 1200, type: 'triangle', vol: 0.08 }); this.noise(0.1, { type: 'highpass', freq: 3000, vol: 0.12 }); break;
      case 'earth': this.tone(95, 0.3, { to: 38, vol: 0.45 }); this.noise(0.25, { type: 'lowpass', freq: 500, vol: 0.3 }); break;
      case 'quake': this.tone(60, 0.8, { to: 25, vol: 0.55 }); this.noise(0.8, { type: 'lowpass', freq: 300, vol: 0.45 }); break;
      case 'zap':
        for (let i = 0; i < 6; i++) this.tone(rand(300, 1600), 0.05, { type: 'sawtooth', vol: 0.07, delay: i * 0.03 });
        this.noise(0.4, { type: 'highpass', freq: 2500, vol: 0.25 });
        break;
      case 'charge': this.tone(200, 0.55, { to: 1400, type: 'sawtooth', vol: 0.05 }); break;
      case 'hit': this.tone(220, 0.08, { to: 80, type: 'square', vol: 0.08 }); break;
      case 'slash': this.noise(0.12, { type: 'highpass', freq: 2000, to: 6000, vol: 0.2 }); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, { vol: 0.08, delay: i * 0.06 })); break;
      case 'boom': this.noise(0.9, { type: 'lowpass', freq: 1100, to: 90, vol: 0.6 }); this.tone(70, 0.6, { to: 28, vol: 0.4 }); break;
      case 'ult':
        [220, 277, 330, 440].forEach((f, i) => this.tone(f, 1.0, { type: 'triangle', vol: 0.08, delay: i * 0.04, attack: 0.05 }));
        this.noise(1.0, { type: 'lowpass', freq: 200, to: 2000, vol: 0.35, attack: 0.1 });
        break;
      case 'ui': this.tone(660, 0.07, { type: 'triangle', vol: 0.1 }); break;
      case 'pickup': this.tone(880, 0.12, { to: 1320, type: 'triangle', vol: 0.12 }); break;
      case 'death': this.tone(320, 0.4, { to: 60, type: 'triangle', vol: 0.12 }); break;
      case 'deny': this.tone(140, 0.12, { type: 'square', vol: 0.06 }); break;
      case 'boomerang': this.tone(500, 0.3, { to: 900, type: 'triangle', vol: 0.06 }); this.noise(0.3, { freq: 1500, q: 4, vol: 0.1 }); break;
      case 'gong':
        [110, 166, 221, 330].forEach((f, i) => this.tone(f, 2.4, { vol: 0.12 / (i + 1), attack: 0.01 }));
        this.noise(0.4, { freq: 800, q: 0.5, vol: 0.12 });
        break;
      case 'roar': this.tone(85, 0.9, { to: 60, type: 'sawtooth', vol: 0.12, attack: 0.1 }); this.noise(0.9, { type: 'lowpass', freq: 400, vol: 0.25, attack: 0.1 }); break;
      case 'win': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', vol: 0.12, delay: i * 0.12 })); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', vol: 0.1, delay: i * 0.18 })); break;
    }
  },

  setMood(m) { this.mood = m; },

  startMusic() {
    if (this.musicTimer) return;
    // Pentatonic scale inspired by traditional East Asian instruments
    const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99];
    let idx = 3;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || !Save.data.settings.music || this.ctx.state !== 'running') return;
      const battle = this.mood === 'battle';
      this.step++;
      const c = this.ctx, t = c.currentTime + 0.05;
      // drone
      if (this.step % 16 === 1) {
        const root = pick([73.42, 98.0, 110.0]);
        this.tone(root, 4.5, { type: 'sine', vol: 0.5, attack: 0.6, out: this.mus });
        this.tone(root * 1.5, 4.5, { type: 'sine', vol: 0.18, attack: 0.8, out: this.mus });
      }
      // plucked melody (guzheng-like)
      if (Math.random() < (battle ? 0.7 : 0.5)) {
        idx = clamp(idx + pick([-2, -1, -1, 1, 1, 2, 0]), 0, scale.length - 1);
        const f = scale[idx];
        this.tone(f, 0.9, { type: 'triangle', vol: 0.35, attack: 0.004, out: this.mus });
        this.tone(f * 2, 0.4, { type: 'sine', vol: 0.08, attack: 0.004, out: this.mus });
      }
      // war drums in battle
      if (battle && this.step % 2 === 0) {
        this.tone(70, 0.25, { to: 40, vol: this.step % 8 === 0 ? 0.9 : 0.45, out: this.mus });
      }
      void t;
    }, 260);
  },
};
