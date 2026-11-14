'use strict';
class World {
  constructor(cfg) {
    this.W = cfg.W || 2200; this.H = cfg.H || 1500;
    this.theme = cfg.theme || 'snow';
    this.modifier = cfg.modifier || null;
    this.fighters = []; this.projectiles = []; this.effects = []; this.pickups = []; this.texts = [];
    this.parts = new Particles();
    this.time = 0; this.shake = 0; this.slowmo = 0;
    this.view = { x: 0, y: 0, w: 1280, h: 720 };
    const arena = buildArena(this.theme, this.W, this.H, cfg.seed || 7);
    this.ground = arena.ground; this.obstacles = arena.obstacles; this.themeDef = arena.def;
    this.onKill = null;
    this.player = null;
  }

  // ----- registry -----
  add(f) { this.fighters.push(f); return f; }
  proj(p) { this.projectiles.push(p); return p; }
  fx(e) { e.t = e.t || 0; e.life = e.life ?? 1; e.layer = e.layer || 'top'; this.effects.push(e); return e; }
  obstacle(o) { this.obstacles.push(o); return o; }
  enemiesOf(f) { return this.fighters.filter(o => o.alive && o.team !== f.team); }
  alliesOf(f) { return this.fighters.filter(o => o.alive && o.team === f.team); }
  nearestEnemy(f, maxD = Infinity, x = f.x, y = f.y) {
    let best = null, bd = maxD;
    for (const o of this.fighters) {
      if (!o.alive || o.team === f.team) continue;
      const d = dist(x, y, o.x, o.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  shakeIt(a) { this.shake = Math.max(this.shake, a); }
  text(x, y, txt, color = '#fff', size = 14) { this.texts.push({ x, y, txt, color, size, t: 0, life: 1.1 }); }
  elemMult(e) {
    if (this.modifier === 'fullmoon' && e === 'water') return 1.5;
    if (this.modifier === 'comet' && e === 'fire') return 1.5;
    return 1;
  }

  // ----- combat -----
  damage(t, amt, src, o = {}) {
    if (!t || !t.alive || t.invuln > 0) return 0;
    let a = amt;
    if (src && src.dmgMult) a *= src.dmgMult;
    a *= this.elemMult(o.elem);
    if (src && src.team !== 0 && t.team === 0) a *= diff().enemyDmg;
    if (src && src.def && src.def.stunBonus && (t.status.stun > 0 || t.status.root > 0)) a *= 1 + src.def.stunBonus;
    a *= 1 - t.dr;
    if (t.def.burnImmune && o.dot) a = 0;
    if (a <= 0 && !o.stun) return 0;
    t.hp -= a;
    t.sinceHurt = 0;
    if (!o.dot) t.hitFlash = 0.08;
    const cc = t.flags.ccImmune ? 0 : t.boss ? 0.45 : 1;
    if (o.burn && !t.def.burnImmune) t.status.burn = { t: o.burnT || 2.5, dps: o.burn, src, blue: o.blue };
    if (o.slow) t.status.slow = { t: o.slowT || 1.5, amt: Math.min(0.7, o.slow) };
    if (o.stun && cc) t.status.stun = Math.max(t.status.stun, o.stun * cc);
    if (o.root && cc) t.status.root = Math.max(t.status.root, o.root * cc);
    if (o.chiBlock && t.bender && cc) t.status.chiBlock = Math.max(t.status.chiBlock, o.chiBlock * cc);
    if (o.knock && !t.flags.knockImmune) {
      const dir = o.dir ?? (src ? angTo(src.x, src.y, t.x, t.y) : rand(0, TAU));
      const k = o.knock * (t.boss ? 0.35 : 1) * (t.def.mass ? 1 / t.def.mass : 1);
      t.kvx += Math.cos(dir) * k; t.kvy += Math.sin(dir) * k;
    }
    if (Save.data.settings.numbers && !o.dot || (o.dot && Math.random() < 0.3 && Save.data.settings.numbers)) {
      this.text(t.x + rand(-10, 10), t.y - 50, Math.round(a).toString(), t.team === 0 ? '#ff6b6b' : (o.dot ? '#ffb070' : '#fff3c4'), o.dot ? 11 : 14);
    }
    if (!o.dot) this.parts.emit('spark', t.x, t.y - 22, 4, { smax: 160 });
    if (src && src !== t && src.alive !== undefined) {
      src.ult = Math.min(100, src.ult + a * (src.isPlayer ? 0.55 : 0.4) * (src.def.ultGain || 1));
    }
    t.ult = Math.min(100, t.ult + a * 0.3);
    if (t.isPlayer) { this.shakeIt(Math.min(10, 2 + a * 0.25)); if (this.onPlayerHurt) this.onPlayerHurt(a); }
    if (t.boss && !t.enraged && t.hp < t.maxHp * 0.5 && t.hp > 0) {
      t.enraged = true; t.cdMult *= 0.75;
      if (t.def.enrageLine) this.text(t.x, t.y - 80, t.def.enrageLine, '#ff8a6a', 15);
      this.parts.emit('fire', t.x, t.y - 20, 20, { smax: 160 });
    }
    if (t.hp <= 0) this.kill(t, src);
    return a;
  }

  heal(t, amt) {
    if (!t.alive) return;
    const h = Math.min(amt, t.maxHp - t.hp);
    t.hp += h;
    if (h >= 1 && Save.data.settings.numbers) this.text(t.x, t.y - 55, '+' + Math.round(h), '#7dffb0', 13);
  }

  kill(t, src) {
    if (!t.alive) return;
    t.alive = false; t.hp = 0; t.deathT = 0;
    this.parts.emit('smoke', t.x, t.y - 15, 8, { smax: 60 });
    Sound.play('death');
    if (src && src.isPlayer) src.kills = (src.kills || 0) + 1;
    if (t.team !== 0 && !t.noDrops) {
      const r = Math.random();
      if (r < 0.2) this.pickups.push({ x: t.x, y: t.y, type: 'cabbage', t: 0 });
      else if (r < 0.34) this.pickups.push({ x: t.x, y: t.y, type: 'chi', t: 0 });
      else if (r < 0.4 || t.boss) this.pickups.push({ x: t.x, y: t.y, type: 'lotus', t: 0 });
    }
    if (this.onKill) this.onKill(t, src);
  }

  melee(f, ang, range, arc, dmg, o = {}) {
    let hits = 0;
    for (const e of this.fighters) {
      if (!e.alive || e.team === f.team) continue;
      const d = dist(f.x, f.y, e.x, e.y);
      if (d > range + e.r) continue;
      if (Math.abs(angDiff(ang, angTo(f.x, f.y, e.x, e.y))) > arc / 2 && d > e.r + f.r) continue;
      this.damage(e, dmg, f, Object.assign({ dir: angTo(f.x, f.y, e.x, e.y) }, o));
      hits++;
    }
    // melee swipes can bat away small projectiles
    if (o.parry) for (const p of this.projectiles) {
      if (p.team === f.team || p.dead) continue;
      if (dist(f.x, f.y, p.x, p.y) < range && Math.abs(angDiff(ang, angTo(f.x, f.y, p.x, p.y))) < arc / 2) p.die(this, true);
    }
    const col = o.color || '#ffffff';
    this.fx({ type: 'slash', x: f.x, y: f.y, life: 0.18, ang, range, arc, col, owner: f,
      draw(ctx, w, e) {
        const k = e.t / e.life;
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.col; ctx.lineWidth = 7 * (1 - k) + 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(e.owner.x, e.owner.y - 18, e.range * (0.65 + 0.35 * k), e.ang - e.arc / 2, e.ang + e.arc / 2); ctx.stroke(); ctx.restore();
      } });
    if (hits) Sound.play('hit');
    return hits;
  }

  lightning(f, ang, range, dmg, o = {}, depth = 0) {
    const sx = f.x + Math.cos(ang) * (f.r + 4), sy = f.y + Math.sin(ang) * (f.r + 4);
    let ex = sx, ey = sy, hit = null;
    for (let d = 0; d < range; d += 10) {
      ex = sx + Math.cos(ang) * d; ey = sy + Math.sin(ang) * d;
      if (ex < 0 || ey < 0 || ex > this.W || ey > this.H) break;
      let blocked = false;
      for (const ob of this.obstacles) if (ob.solid !== false && dist(ex, ey, ob.x, ob.y) < ob.r) { blocked = true; if (ob.maxHp) { ob.hp -= dmg; if (ob.hp <= 0) this.breakObstacle(ob); } break; }
      if (blocked) break;
      for (const e of this.fighters) {
        if (!e.alive || e.team === f.team || e.invuln > 0) continue;
        if (dist(ex, ey, e.x, e.y) < e.r + 6) { hit = e; break; }
      }
      if (hit) break;
    }
    // jagged bolt visual
    const pts = [[sx, sy]];
    const L = dist(sx, sy, ex, ey), n = Math.max(3, Math.floor(L / 28));
    for (let i = 1; i < n; i++) {
      const k = i / n; const off = rand(-14, 14);
      pts.push([lerp(sx, ex, k) - Math.sin(ang) * off, lerp(sy, ey, k) + Math.cos(ang) * off]);
    }
    pts.push([ex, ey]);
    const blue = o.color || '#bfe4ff';
    this.fx({ type: 'bolt', life: 0.28, pts, blue, layer: 'top', draw(ctx, w, e) {
      const k = e.t / e.life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [lw, c, al] of [[9, e.blue, 0.35], [3.5, '#ffffff', 1]]) {
        ctx.globalAlpha = al * (1 - k); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        ctx.beginPath(); e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 18) : ctx.moveTo(x, y - 18))); ctx.stroke();
      }
      ctx.restore();
    } });
    this.parts.emit('lightning', ex, ey, 14, { smax: 220, z: 18 });
    this.shakeIt(7);
    Sound.play('zap');
    if (hit) {
      if (hit.flags.redirect && depth < 3) { this.redirect(hit, dmg, depth); return hit; }
      this.damage(hit, dmg, f, Object.assign({ elem: 'fire', knock: 260, dir: ang, stun: 0.35 }, o));
    }
    return hit;
  }

  // Lightning redirection: absorb energy and send it back out.
  redirect(f, incoming, depth = 0) {
    // consume the stance first so two redirecting fighters can't bounce a bolt forever
    f.removeBuff('redirect', this);
    f.flags.redirect = false;
    this.text(f.x, f.y - 70, 'REDIRECTED!', '#bfe4ff', 16);
    this.parts.emit('lightning', f.x, f.y - 20, 16, { smax: 140 });
    const ang = angTo(f.x, f.y, f.aimX, f.aimY);
    const dmg = Math.max(30, incoming * 1.6) * (f.def.redirectMult || 1);
    this.lightning(f, ang, 760, dmg, {}, depth + 1);
    f.invuln = Math.max(f.invuln, 0.2);
  }

  explode(x, y, r, dmg, src, o = {}) {
    const team = o.team ?? (src ? src.team : -1);
    for (const e of this.fighters) {
      if (!e.alive || e.team === team) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < r + e.r) this.damage(e, dmg * (o.falloff ? clamp(1.2 - d / r, 0.4, 1) : 1), src, Object.assign({ dir: angTo(x, y, e.x, e.y), knock: 380 }, o));
    }
    for (const ob of this.obstacles) if (ob.maxHp && dist(x, y, ob.x, ob.y) < r + ob.r) { ob.hp -= dmg; if (ob.hp <= 0) this.breakObstacle(ob); }
    const kind = o.kind || 'fire';
    this.parts.emit(kind, x, y, Math.min(50, r * 0.4), { smax: r * 2.4, scale: 1.4 });
    this.parts.emit('smoke', x, y, 10, { smax: r * 1.2 });
    this.fx({ type: 'blast', x, y, r, life: 0.35, kind, layer: 'top', draw(ctx, w, e) {
      const k = e.t / e.life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * 0.8;
      const g = ctx.createRadialGradient(e.x, e.y - 10, 0, e.x, e.y - 10, e.r * (0.6 + k * 0.6));
      const c = e.kind === 'bluefire' ? ['#ffffff', '#6fd0ff', 'rgba(40,90,255,0)'] : e.kind === 'earth' ? ['#fff2d0', '#c9a36b', 'rgba(120,80,40,0)'] : ['#ffffff', '#ffb040', 'rgba(255,60,0,0)'];
      g.addColorStop(0, c[0]); g.addColorStop(0.35, c[1]); g.addColorStop(1, c[2]);
      ctx.fillStyle = g; circle(ctx, e.x, e.y - 10, e.r * (0.6 + k * 0.6)); ctx.fill(); ctx.restore();
    } });
    this.shakeIt(Math.min(14, r / 10));
    Sound.play(kind === 'earth' ? 'earth' : 'boom');
  }

  // Expanding shockwave ring that strikes each enemy once.
  ring(src, x, y, maxR, speed, dmg, o = {}) {
    const hit = new Set();
    const team = src ? src.team : -1;
    return this.fx({ type: 'ring', maxR, x, y, life: maxR / speed, layer: 'under', color: o.color || 'rgba(255,255,255,0.8)',
      update(dt, w, e) {
        const R = (e.t / e.life) * maxR;
        for (const f of w.fighters) {
          if (!f.alive || f.team === team || hit.has(f.id)) continue;
          const d = dist(e.x, e.y, f.x, f.y);
          if (d < R + f.r && d > R - 40 - f.r) { hit.add(f.id); w.damage(f, dmg, src, Object.assign({ dir: angTo(e.x, e.y, f.x, f.y), knock: 300 }, o)); }
        }
        if (o.parts && Math.random() < 0.9) { const a = rand(0, TAU); w.parts.emit(o.parts, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R * 0.9, 2, { smax: 40 }); }
      },
      draw(ctx, w, e) {
        const k = e.t / e.life, R = k * maxR;
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.color; ctx.lineWidth = 10 * (1 - k) + 2;
        ellipse(ctx, e.x, e.y, R, R * 0.9); ctx.stroke(); ctx.restore();
      } });
  }

  breakObstacle(o) {
    o.dead = true;
    this.parts.emit(o.kind === 'crystal' ? 'glow' : o.kind === 'ice' || o.kind === 'icewall' ? 'ice' : 'earth', o.x, o.y - o.r, 18, { smax: 150 });
    this.parts.emit('dust', o.x, o.y, 6, { smax: 60 });
    Sound.play('earth');
  }

  // returns an enemy projectile likely to hit f soon
  incoming(f, range = 200) {
    for (const p of this.projectiles) {
      if (p.dead || p.team === f.team || p.noHit) continue;
      const dx = f.x - p.x, dy = f.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const t = (dx * p.vx + dy * p.vy) / (sp * sp);
      if (t < 0 || t > 0.5) continue;
      const cx = p.x + p.vx * t - f.x, cy = p.y + p.vy * t - f.y;
      if (Math.hypot(cx, cy) < f.r + p.r + 12) return p;
    }
    return null;
  }

  collideFighter(f) {
    const hb = f.flags.hover > 20;
    if (!hb) for (const o of this.obstacles) {
      if (o.solid === false) continue;
      const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy), m = o.r + f.r * 0.8;
      if (d < m && d > 0.01) { f.x = o.x + dx / d * m; f.y = o.y + dy / d * m; }
    }
    f.x = clamp(f.x, f.r, this.W - f.r); f.y = clamp(f.y, f.r + 20, this.H - f.r);
  }

  // ----- update -----
  update(dt) {
    this.time += dt;
    for (const f of this.fighters) f.update(dt, this);
    // soft separation
    const F = this.fighters;
    for (let i = 0; i < F.length; i++) {
      const a = F[i]; if (!a.alive) continue;
      for (let j = i + 1; j < F.length; j++) {
        const b = F[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.r + b.r) * 0.85;
        if (d < m && d > 0.01) {
          const push = (m - d) / 2, nx = dx / d, ny = dy / d;
          const wa = a.boss ? 0.2 : 1, wb = b.boss ? 0.2 : 1;
          a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
        }
      }
    }
    for (const p of this.projectiles) p.update(dt, this);
    // projectile clashes
    const P = this.projectiles;
    for (let i = 0; i < P.length; i++) {
      const a = P[i]; if (a.dead || !a.clash) continue;
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j]; if (b.dead || !b.clash || a.team === b.team) continue;
        if (dist(a.x, a.y, b.x, b.y) > a.r + b.r) continue;
        const wf = (a.elem === 'water' && b.elem === 'fire') || (a.elem === 'fire' && b.elem === 'water');
        if (wf) { this.parts.emit('steam', (a.x + b.x) / 2, (a.y + b.y) / 2, 8, { smax: 60, z: 14 }); a.die(this, false); b.die(this, false); Sound.play('water'); }
        else if (a.power > b.power) { b.die(this, true); a.power -= b.power * 0.5; }
        else if (b.power > a.power) { a.die(this, true); b.power -= a.power * 0.5; }
        else { a.die(this, true); b.die(this, true); }
        if (a.dead) break;
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const e of this.effects) {
      e.t += dt;
      if (e.update) e.update(dt, this, e);
      if (e.t >= e.life) { e.dead = true; if (e.onEnd) e.onEnd(this, e); }
    }
    this.effects = this.effects.filter(e => !e.dead);
    for (const o of this.obstacles) {
      if (o.life !== undefined) { o.life -= dt; if (o.life <= 0) { o.dead = true; this.parts.emit('earth', o.x, o.y - o.r, 6, { smax: 60 }); } }
      if (o.rise !== undefined && o.rise < 1) o.rise += dt * 6;
      if (o.kind === 'brazier' && Math.random() < dt * 8) this.parts.emit('fire', o.x, o.y - o.r * 1.2, 1, { smax: 15, scale: 0.6 });
    }
    this.obstacles = this.obstacles.filter(o => !o.dead);
    // pickups
    const pl = this.player;
    for (const p of this.pickups) {
      p.t += dt;
      if (pl && pl.alive && dist(p.x, p.y, pl.x, pl.y) < 34) {
        p.dead = true; Sound.play('pickup');
        if (p.type === 'cabbage') { this.heal(pl, 30); this.text(p.x, p.y - 30, 'Cabbage!', '#9be37f', 12); }
        else if (p.type === 'chi') { pl.chi = Math.min(pl.maxChi, pl.chi + 50); this.text(p.x, p.y - 30, '+Chi', '#7fe0ff', 12); }
        else if (p.type === 'lotus') { pl.ult = Math.min(100, pl.ult + 25 * (pl.def.lotusMult || 1)); this.text(p.x, p.y - 30, 'White Lotus', '#fff', 12); }
      }
      if (p.t > 20) p.dead = true;
    }
    this.pickups = this.pickups.filter(p => !p.dead);
    this.fighters = this.fighters.filter(f => f.alive || f.deathT < 1 || f === this.player);
    // ambience
    const amb = this.themeDef.ambient, v = this.view;
    if (amb && Math.random() < dt * (this.themeDef.ambientRate || 20)) {
      const x = v.x + rand(-v.w / 2, v.w / 2), y = v.y + rand(-v.h / 2, v.h / 2);
      if (amb === 'snow') this.parts.emit('snow', x, y - 200, 1, { ang: Math.PI / 2 + 0.3, spread: 0.2, smin: 30, smax: 70 });
      else if (amb === 'leaf') this.parts.emit('leaf', x, y - 200, 1, { ang: Math.PI / 2 - 0.4, spread: 0.3, smin: 30, smax: 60 });
      else if (amb === 'ash') this.parts.emit('ash', x, y + 150, 1, { ang: -Math.PI / 2 + 0.2, spread: 0.3, smin: 20, smax: 50 });
      else if (amb === 'glow') this.parts.emit('glow', x, y, 1, { smin: 5, smax: 20, life: 2 });
    }
    if (this.modifier === 'comet' && Math.random() < dt * 25) {
      this.parts.emit('ember', v.x + rand(-v.w / 2, v.w / 2), v.y + rand(-v.h / 2, v.h / 2), 1, { smin: 10, smax: 40, life: 1.5 });
    }
    this.parts.update(dt);
    for (const t of this.texts) { t.t += dt; t.y -= 30 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.slowmo > 0) this.slowmo -= dt;
  }

  // ----- draw -----
  draw(ctx) {
    const v = this.view;
    ctx.drawImage(this.ground, 0, 0);
    for (const e of this.effects) if (e.layer === 'under' && e.draw) e.draw(ctx, this, e);
    const list = [];
    const vx0 = v.x - v.w / 2 - 150, vx1 = v.x + v.w / 2 + 150, vy0 = v.y - v.h / 2 - 100, vy1 = v.y + v.h / 2 + 250;
    for (const o of this.obstacles) if (o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1) list.push(o);
    for (const f of this.fighters) list.push(f);
    for (const p of this.pickups) list.push(p);
    for (const e of this.effects) if (e.layer === 'sorted') list.push(e);
    list.sort((a, b) => (a.sortY ?? a.y) - (b.sortY ?? b.y));
    for (const it of list) {
      if (it instanceof Fighter) it.draw(ctx, this);
      else if (it.type) drawPickup(ctx, it, this.time);
      else if (it.kind) drawObstacle(ctx, it, this.time);
      else if (it.draw) it.draw(ctx, this, it);
    }
    // lighting tint by modifier
    const tint = this.modifier === 'fullmoon' ? 'rgba(10,20,70,0.32)' : this.modifier === 'eclipse' ? 'rgba(25,10,0,0.42)' :
      this.modifier === 'comet' ? 'rgba(255,50,0,0.12)' : this.themeDef.tint;
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(v.x - v.w / 2 - 50, v.y - v.h / 2 - 50, v.w + 100, v.h + 100); }
    for (const p of this.projectiles) p.draw(ctx);
    for (const e of this.effects) if (e.layer === 'top' && e.draw) e.draw(ctx, this, e);
    this.parts.draw(ctx);
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const k = t.t / t.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${t.size}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
