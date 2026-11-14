'use strict';
// Shared ability building blocks used by the roster.
const STATUS_KEYS = ['burn', 'burnT', 'slow', 'slowT', 'stun', 'root', 'chiBlock', 'blue'];

const A = {
  shoot(w, f, a, o) {
    const sp = o.speed || 600;
    const off = f.r + 4;
    const opts = Object.assign({}, o.opts || {});
    for (const k of STATUS_KEYS) if (o[k] !== undefined) opts[k] = o[k];
    const p = new Projectile(Object.assign({
      x: f.x + Math.cos(a) * off, y: f.y + Math.sin(a) * off,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, team: f.team, owner: f,
      elem: o.elem || f.def.element,
    }, o, { opts }));
    return w.proj(p);
  },

  fan(w, f, a, n, spread, o) {
    for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1) - 0.5; A.shoot(w, f, a + k * spread, o); }
  },

  aimPoint(f, maxR) {
    const d = Math.min(maxR, dist(f.x, f.y, f.aimX, f.aimY));
    const a = angTo(f.x, f.y, f.aimX, f.aimY);
    return [f.x + Math.cos(a) * d, f.y + Math.sin(a) * d];
  },

  later(w, delay, fn) { return w.fx({ life: delay, onEnd: (w2) => fn(w2) }); },

  telegraph(w, x, y, r, delay, color, cb, o = {}) {
    return w.fx({ type: 'telegraph', boulder: !!o.boulder, x, y, r, life: delay, layer: 'under', color,
      draw(ctx, w2, e) {
        const k = e.t / e.life;
        ctx.save();
        ctx.strokeStyle = e.color; ctx.globalAlpha = 0.8; ctx.lineWidth = 2;
        ellipse(ctx, e.x, e.y, e.r, e.r * 0.8); ctx.stroke();
        ctx.globalAlpha = 0.22; ctx.fillStyle = e.color; ellipse(ctx, e.x, e.y, e.r * k, e.r * 0.8 * k); ctx.fill();
        ctx.restore();
        if (o.boulder) {
          const h = (1 - k) * 420;
          ctx.save(); ctx.translate(e.x, e.y - h - 20); ctx.rotate(k * 6);
          ctx.fillStyle = '#7d5c3c'; ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 2;
          ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = e.r * (0.5 + (i % 3) * 0.08); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      },
      onEnd: (w2, e) => cb(w2, e) });
  },

  tornado(w, f, x, y, o = {}) {
    const team = f.team;
    return w.fx({ type: 'tornado', x, y, life: o.life || 4, r: o.r || 105, tick: 0, layer: 'sorted', sortY: y,
      update(dt, w2, e) {
        e.tick -= dt;
        if (o.vx) { e.x += o.vx * dt; e.y += o.vy * dt; e.sortY = e.y; }
        for (const t of w2.fighters) {
          if (!t.alive || t.team === team) continue;
          const d = dist(e.x, e.y, t.x, t.y);
          if (d < e.r * 1.9 && d > 6) {
            const pull = (o.pull || 1300) * (t.boss ? 0.3 : 1) * (t.flags.knockImmune ? 0.4 : 1) * dt;
            t.kvx += (e.x - t.x) / d * pull; t.kvy += (e.y - t.y) / d * pull;
          }
          if (e.tick <= 0 && d < e.r + t.r) w2.damage(t, o.dmg || 6, f, { elem: 'air' });
        }
        if (e.tick <= 0) e.tick = 0.35;
        for (const p of w2.projectiles) if (p.team !== team && !p.dead && dist(p.x, p.y, e.x, e.y) < e.r) p.die(w2, false);
        if (Math.random() < dt * 25) w2.parts.emit('dust', e.x + rand(-40, 40), e.y + rand(-10, 10), 1, { smax: 40 });
      },
      draw(ctx, w2, e) {
        const fade = Math.min(1, e.t * 4, (e.life - e.t) * 3);
        ctx.save(); ctx.globalAlpha = 0.7 * fade; ctx.lineWidth = 3;
        for (let i = 0; i < 10; i++) {
          const k = i / 9, rr = e.r * (0.22 + k * 0.85), yy = e.y - k * e.r * 1.8;
          ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.95)' : 'rgba(190,220,240,0.85)';
          const sp = w2.time * 10 + i * 1.3;
          ctx.beginPath(); ctx.ellipse(e.x + Math.sin(w2.time * 3 + i * 0.6) * 6 * k, yy, rr, rr * 0.28, 0, sp, sp + 4.4); ctx.stroke();
        }
        ctx.restore();
      } });
  },

  // channelled cone (fire breath etc.)
  breath(w, f, o) {
    return f.addBuff(o.id || 'breath', Object.assign({ t: o.time, speedMult: o.move ?? 0.35, acc: 0,
      tick(f2, w2, dt, b) {
        if (f2.status.stun > 0) return;
        const a = f2.ang, R = o.range;
        const sx = f2.x + Math.cos(a) * 18, sy = f2.y + Math.sin(a) * 18;
        const n = Math.ceil(dt * (o.pps || 110));
        for (let i = 0; i < n; i++) w2.parts.emit(o.kind || 'fire', sx, sy, 1, { ang: a, spread: o.arc / 2, smin: R * 2.3, smax: R * 3.1, z: 16, scale: o.scale || 1.3, drag: 1.2, life: 0.42 });
        b.acc += dt;
        if (b.acc >= o.tick) {
          b.acc -= o.tick;
          for (const e of w2.fighters) {
            if (!e.alive || e.team === f2.team) continue;
            const d = dist(f2.x, f2.y, e.x, e.y);
            if (d < R + e.r && Math.abs(angDiff(a, angTo(f2.x, f2.y, e.x, e.y))) < o.arc / 2 + 0.2)
              w2.damage(e, o.dmg, f2, { elem: o.elem || 'fire', burn: o.burn, burnT: 2, dir: a, knock: o.knock || 40, blue: o.kind === 'bluefire' });
          }
          for (const p of w2.projectiles) {
            if (p.team === f2.team || p.dead) continue;
            if (dist(f2.x, f2.y, p.x, p.y) < R && Math.abs(angDiff(a, angTo(f2.x, f2.y, p.x, p.y))) < o.arc / 2) p.die(w2, true);
          }
          Sound.play('fire');
        }
      } }, o.buff || {}));
  },

  firePatch(w, f, x, y, o = {}) {
    const team = f.team;
    return w.fx({ type: 'patch', x, y, r: o.r || 26, life: o.life || 2, tick: 0, layer: 'under', blue: o.blue,
      update(dt, w2, e) {
        e.tick -= dt;
        if (Math.random() < dt * 14) w2.parts.emit(e.blue ? 'bluefire' : 'fire', e.x + rand(-e.r, e.r) * 0.7, e.y + rand(-e.r, e.r) * 0.4, 1, { smax: 20, scale: 0.9 });
        if (e.tick <= 0) {
          e.tick = 0.4;
          for (const t of w2.fighters) if (t.alive && t.team !== team && dist(e.x, e.y, t.x, t.y) < e.r + t.r) w2.damage(t, o.dmg || 4, f, { elem: 'fire', burn: o.burn || 3, burnT: 1.5, blue: e.blue });
        }
      },
      draw(ctx, w2, e) {
        const fade = Math.min(1, (e.life - e.t) * 2);
        ctx.save(); ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = e.blue ? '#2a62ff' : '#ff5a1a';
        ellipse(ctx, e.x, e.y, e.r, e.r * 0.5); ctx.fill(); ctx.restore();
      } });
  },

  wall(w, f, x, y, ang, n, o = {}) {
    const px = -Math.sin(ang), py = Math.cos(ang), hit = new Set();
    const sp = o.spacing || 30;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const ox = x + px * k * sp, oy = y + py * k * sp;
      if (ox < 20 || oy < 30 || ox > w.W - 20 || oy > w.H - 20) continue;
      w.obstacle({ x: ox, y: oy, r: o.r || 16, kind: 'pillar', hp: o.hp || 90, maxHp: o.hp || 90, life: o.life || 6, rise: 0, metal: o.metal });
      w.parts.emit('earth', ox, oy, 5, { smax: 90 }); w.parts.emit('dust', ox, oy, 2, { smax: 40 });
      for (const e of w.fighters) if (e.alive && e.team !== f.team && !hit.has(e.id) && dist(ox, oy, e.x, e.y) < 26 + e.r) {
        hit.add(e.id); w.damage(e, o.dmg || 8, f, { elem: 'earth', knock: 380, dir: ang });
      }
    }
    Sound.play('earth'); w.shakeIt(4);
  },

  spikeLine(w, f, ang, len, dmg, o = {}) {
    const hit = new Set();
    const steps = Math.floor(len / 34);
    for (let i = 1; i <= steps; i++) {
      const x = f.x + Math.cos(ang) * i * 34, y = f.y + Math.sin(ang) * i * 34;
      A.later(w, i * 0.045, (w2) => {
        if (x < 0 || y < 0 || x > w2.W || y > w2.H) return;
        w2.obstacle({ x, y, r: 12, kind: 'pillar', life: 0.7, rise: 0, solid: false });
        w2.parts.emit('earth', x, y, 4, { smax: 80 });
        for (const e of w2.fighters) if (e.alive && e.team !== f.team && !hit.has(e.id) && dist(x, y, e.x, e.y) < 26 + e.r) {
          hit.add(e.id); w2.damage(e, dmg, f, Object.assign({ elem: 'earth', knock: 260, dir: ang }, o));
        }
        if (i % 3 === 0) Sound.play('earth');
      });
    }
  },

  lob(w, f, tx, ty, o) {
    const sx = f.x, sy = f.y, T = o.time || 0.8;
    A.telegraph(w, tx, ty, o.r || 100, T, o.color || 'rgba(255,120,40,0.9)', () => {});
    return w.proj(new Projectile({ x: sx, y: sy, vx: 0, vy: 0, r: o.size || 7, team: f.team, owner: f, kind: o.kind || 'bomb', elem: 'none',
      life: T + 1, ghost: true, noHit: true, clash: false, reflectable: false,
      onUpdate(p, w2) {
        const k = Math.min(1, p.t / T);
        p.x = lerp(sx, tx, k); p.y = lerp(sy, ty, k); p.z = 14 + 4 * 140 * k * (1 - k);
        if (k >= 1) { p.dead = true; o.onLand(w2, tx, ty); }
      } }));
  },

  charge(w, f, time, speed, o = {}) {
    // charge straight toward aim, hitting enemies along the way
    const a = f.ang, hit = new Set();
    f.dashT = time; f.dashVx = Math.cos(a) * speed; f.dashVy = Math.sin(a) * speed;
    f.addBuff('charge', { t: time + 0.05, ccImmune: true,
      tick(f2, w2) {
        for (const e of w2.fighters) if (e.alive && e.team !== f2.team && !hit.has(e.id) && dist(f2.x, f2.y, e.x, e.y) < f2.r + e.r + 8) {
          hit.add(e.id); w2.damage(e, o.dmg || 20, f2, { knock: o.knock || 550, stun: o.stun || 0.4, elem: o.elem || 'none', dir: a });
        }
        if (Math.random() < 0.6) w2.parts.emit(o.parts || 'dust', f2.x, f2.y, 1, { smax: 40 });
      } });
  },

  stance(f, id, t, color, extra = {}) {
    return f.addBuff(id, Object.assign({ t,
      draw(ctx, f2, w2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); let x = f2.x + rand(-16, 16), y = f2.y - rand(10, 40); ctx.moveTo(x, y);
          for (let j = 0; j < 3; j++) { x += rand(-8, 8); y += rand(-8, 8); ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.restore();
      } }, extra));
  },
};
