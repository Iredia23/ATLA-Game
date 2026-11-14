'use strict';
class Particles {
  constructor() { this.a = []; }
  add(p) {
    if (this.a.length > 2400) return null;
    p.t = 0; p.max = p.life;
    this.a.push(p);
    return p;
  }
  // Emit n particles of an element-flavoured type.
  emit(type, x, y, n = 1, o = {}) {
    const sc = o.scale || 1;
    for (let i = 0; i < n; i++) {
      const spread = o.spread ?? Math.PI;
      const ang = o.ang !== undefined ? o.ang + rand(-spread, spread) : rand(0, TAU);
      const sp = rand(o.smin ?? 20, o.smax ?? 110);
      const b = {
        x: x + rand(-(o.jx || 0), o.jx || 0), y: y + rand(-(o.jy ?? o.jx ?? 0), o.jy ?? o.jx ?? 0),
        vx: Math.cos(ang) * sp + (o.vx || 0), vy: Math.sin(ang) * sp + (o.vy || 0), z: o.z ?? 0, lift: o.z === undefined,
      };
      let p;
      switch (type) {
        case 'fire': p = { life: rand(0.25, 0.55), size: rand(5, 10) * sc, size2: 1, color: pick(['#fff1a0', '#ffc832', '#ff8a1e', '#ff4d14']), add: true, drag: 2, vz: 40 }; break;
        case 'bluefire': p = { life: rand(0.25, 0.5), size: rand(5, 9) * sc, size2: 1, color: pick(['#e8fbff', '#8fe6ff', '#3fb2ff', '#2a62ff']), add: true, drag: 2, vz: 40 }; break;
        case 'rainbow': p = { life: rand(0.35, 0.7), size: rand(6, 11) * sc, size2: 1, color: `hsl(${(performance.now() / 4 + rand(0, 120)) % 360},100%,60%)`, add: true, drag: 1.5, vz: 30 }; break;
        case 'ember': p = { life: rand(0.4, 1.0), size: rand(1.5, 3) * sc, size2: 0.5, color: pick(['#ffd060', '#ff8a30']), add: true, drag: 1, vz: 60 }; break;
        case 'smoke': p = { life: rand(0.6, 1.2), size: rand(6, 10) * sc, size2: rand(16, 26) * sc, color: pick(['#555', '#666', '#777']), alpha: 0.35, drag: 1.5, vz: 25 }; break;
        case 'steam': p = { life: rand(0.5, 1.0), size: rand(6, 10) * sc, size2: rand(18, 28) * sc, color: '#e8f4ff', alpha: 0.45, drag: 1.5, vz: 30 }; break;
        case 'water': p = { life: rand(0.3, 0.6), size: rand(2.5, 5) * sc, size2: 1, color: pick(['#bfe6ff', '#6cc0ff', '#2f8de0']), drag: 2.5, vz: 0 }; break;
        case 'ice': p = { life: rand(0.3, 0.7), size: rand(2, 4.5) * sc, color: pick(['#ffffff', '#d4f6ff', '#9ee3ff']), shape: 'sq', rot: rand(0, TAU), vr: rand(-8, 8), drag: 2.5 }; break;
        case 'air': p = { life: rand(0.3, 0.6), size: rand(4, 8) * sc, size2: rand(12, 20) * sc, color: '#ffffff', alpha: 0.35, shape: 'ring', drag: 2 }; break;
        case 'wisp': p = { life: rand(0.3, 0.6), size: rand(2, 4) * sc, size2: 0.5, color: '#f4fbff', alpha: 0.8, drag: 1.5, add: true }; break;
        case 'earth': p = { life: rand(0.4, 0.8), size: rand(3, 6) * sc, color: pick(['#7a5a3a', '#8e6b45', '#5e4630', '#a07a50']), shape: 'sq', rot: rand(0, TAU), vr: rand(-10, 10), drag: 3 }; break;
        case 'metal': p = { life: rand(0.3, 0.6), size: rand(2, 4) * sc, color: pick(['#c9d1d9', '#8b949e', '#eef2f5']), shape: 'sq', rot: rand(0, TAU), vr: rand(-12, 12), drag: 3 }; break;
        case 'dust': p = { life: rand(0.5, 1.0), size: rand(5, 9) * sc, size2: rand(14, 24) * sc, color: pick(['#b59b78', '#a58b68', '#c8b08a']), alpha: 0.4, drag: 2.5 }; break;
        case 'spark': p = { life: rand(0.15, 0.35), size: rand(1.5, 2.5), color: pick(['#fff6c0', '#ffe060']), shape: 'line', add: true, drag: 3 }; break;
        case 'lightning': p = { life: rand(0.1, 0.3), size: rand(1.5, 2.5), color: pick(['#ffffff', '#bfe4ff', '#8ab8ff']), shape: 'line', add: true, drag: 4 }; break;
        case 'heal': p = { life: rand(0.6, 1.1), size: rand(2, 4) * sc, size2: 0.5, color: pick(['#a8ffcf', '#6ff5b0', '#d0fff0']), add: true, drag: 1, vz: 50 }; break;
        case 'blood': p = { life: rand(0.4, 0.8), size: rand(3, 6) * sc, size2: 1, color: pick(['#b3122a', '#e0304a', '#7a0d1e']), add: true, alpha: 0.6, drag: 2 }; break;
        case 'spirit': p = { life: rand(0.5, 1.0), size: rand(3, 6) * sc, size2: 0.5, color: pick(['#c9a8ff', '#8fe9ff', '#ffffff']), add: true, drag: 1, vz: 30 }; break;
        case 'dark': p = { life: rand(0.5, 1.0), size: rand(5, 9) * sc, size2: rand(12, 18) * sc, color: pick(['#1b1530', '#2b2140', '#0e0b18']), alpha: 0.5, drag: 1.5 }; break;
        case 'glow': p = { life: rand(0.4, 0.8), size: rand(3, 6) * sc, size2: 0.5, color: pick(['#bff4ff', '#ffffff', '#7fdcff']), add: true, drag: 1, vz: 40 }; break;
        case 'leaf': p = { life: rand(2, 4), size: rand(3, 5), color: pick(['#5f9a3a', '#7cb342', '#c08a2a', '#9ccc65']), shape: 'sq', rot: rand(0, TAU), vr: rand(-3, 3), drag: 0.3 }; break;
        case 'snow': p = { life: rand(3, 6), size: rand(1.5, 3), color: '#ffffff', alpha: 0.85, drag: 0.2 }; break;
        case 'ash': p = { life: rand(3, 6), size: rand(1.5, 3), color: pick(['#ff9a40', '#ffcc70', '#555']), add: Math.random() < 0.6, alpha: 0.8, drag: 0.2 }; break;
        case 'star': p = { life: rand(0.4, 0.8), size: rand(2, 3.5), color: '#fff8b0', add: true, drag: 2 }; break;
        default: p = { life: 0.5, size: 4, color: '#fff' };
      }
      if (o.life) p.life = o.life * rand(0.7, 1.2);
      if (o.drag !== undefined) p.drag = o.drag;
      if (o.color) p.color = o.color;
      this.add(Object.assign(b, p));
    }
  }
  update(dt) {
    const a = this.a;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      p.t += dt;
      if (p.t >= p.max) { a[i] = a[a.length - 1]; a.pop(); continue; }
      const dr = Math.exp(-(p.drag || 0) * dt);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vz) p.z += p.vz * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.a) if (!p.add) this.one(ctx, p);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.a) if (p.add) this.one(ctx, p);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  one(ctx, p) {
    const k = p.t / p.max;
    const s = lerp(p.size, p.size2 ?? p.size, k);
    ctx.globalAlpha = (p.alpha ?? 1) * (1 - k);
    const x = p.x, y = p.y - (p.z || 0);
    switch (p.shape) {
      case 'sq':
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot || 0); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
        break;
      case 'line':
        ctx.strokeStyle = p.color; ctx.lineWidth = s;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.04, y - p.vy * 0.04); ctx.stroke();
        break;
      case 'ring':
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke();
        break;
      default:
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.3, s), 0, TAU); ctx.fill();
    }
  }
}
