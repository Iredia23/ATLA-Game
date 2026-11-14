'use strict';
// ---------- Math & helpers ----------
const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
function norm(x, y) { const l = Math.hypot(x, y); return l > 1e-6 ? [x / l, y / l] : [0, 0]; }
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
function shade(hex, amt) {
  // amt -1..1 darken/lighten
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

const ELEMENT_COLORS = {
  air: '#f2d27a', water: '#4aa3ff', earth: '#62b04a', fire: '#ff5a2a', none: '#c9b48a', spirit: '#b58cff',
};
const ELEMENT_ICONS = { air: '🌪️', water: '💧', earth: '🪨', fire: '🔥', none: '🗡️', spirit: '👻' };

// ---------- Save data ----------
const Save = {
  data: { done: {}, settings: { diff: 'normal', sfx: true, music: true, numbers: true, unlockAll: false, view: '3d', cam: 'tactical' }, best: {} },
  load() {
    try {
      const raw = localStorage.getItem('atla_elements_save');
      if (raw) {
        const d = JSON.parse(raw);
        this.data.done = d.done || {};
        this.data.best = d.best || {};
        Object.assign(this.data.settings, d.settings || {});
      }
    } catch (e) { /* storage unavailable */ }
  },
  write() { try { localStorage.setItem('atla_elements_save', JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  reset() { this.data.done = {}; this.data.best = {}; this.write(); },
};

const DIFFICULTY = {
  easy:   { label: 'Easy',   enemyDmg: 0.6,  enemyHp: 0.8,  skill: 0.6 },
  normal: { label: 'Normal', enemyDmg: 1.0,  enemyHp: 1.0,  skill: 0.85 },
  hard:   { label: 'Hard',   enemyDmg: 1.35, enemyHp: 1.25, skill: 1.05 },
};
const diff = () => DIFFICULTY[Save.data.settings.diff] || DIFFICULTY.normal;
