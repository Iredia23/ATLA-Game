'use strict';
let _pid = 0;
class Projectile {
  constructor(o) {
    Object.assign(this, {
      id: ++_pid, x: 0, y: 0, vx: 0, vy: 0, r: 8, z: 14, team: 0, owner: null, dmg: 10, life: 1.2,
      kind: 'fire', elem: 'fire', pierce: 0, knock: 150, power: 1, opts: {}, dead: false, t: 0, spin: 0,
      ghost: false, clash: true, reflectable: true, scale: 1,
    }, o);
    this.hit = new Set();
  }

  update(dt, w) {
    this.t += dt; this.life -= dt;
    if (this.onUpdate) this.onUpdate(this, w, dt);
    if (this.dead) return;
    this.x += this.vx * dt; this.y += this.vy * dt; this.spin += dt * 14;
    if (this.life <= 0) { this.die(w, false); return; }
    this.trail(w, dt);
    if (!this.ghost) {
      if (this.x < 0 || this.y < 0 || this.x > w.W || this.y > w.H) { this.die(w, true); return; }
      for (const o of w.obstacles) {
        if (o.solid === false) continue;
        if (dist(this.x, this.y, o.x, o.y) < o.r + this.r * 0.6) {
          if (o.maxHp) { o.hp -= this.dmg; if (o.hp <= 0) w.breakObstacle(o); }
          this.die(w, true); return;
        }
      }
    }
    if (this.noHit) return;
    for (const f of w.fighters) {
      if (!f.alive || f.team === this.team || this.hit.has(f.id)) continue;
      if (dist(this.x, this.y, f.x, f.y) > f.r + this.r) continue;
      if (f.invuln > 0) continue;
      if (this.reflectable && f.flags.reflect) {
        // Air sphere: send it back
        this.vx *= -1.15; this.vy *= -1.15; this.team = f.team; this.owner = f; this.life = Math.max(this.life, 0.8);
        this.hit.clear();
        w.parts.emit('air', this.x, this.y, 4, { smax: 60 });
        Sound.play('air');
        return;
      }
      if (f.flags.redirect && this.elem !== 'none') {
        w.redirect(f, this.dmg);
        this.dead = true;
        return;
      }
      this.hit.add(f.id);
      if (this.onHitFighter && this.onHitFighter(this, w, f) === false) continue;
      w.damage(f, this.dmg, this.owner, Object.assign({}, this.opts, { elem: this.elem, knock: this.knock, dir: Math.atan2(this.vy, this.vx), proj: this }));
      if (this.pierce-- <= 0) { this.die(w, true); return; }
    }
  }

  die(w, impact) {
    if (this.dead) return;
    this.dead = true;
    if (this.onDie) { this.onDie(this, w, impact); return; }
    const k = this.kind, x = this.x, y = this.y;
    const map = { fire: 'fire', bluefire: 'bluefire', water: 'water', ice: 'ice', rock: 'earth', rockglove: 'earth', metal: 'metal', air: 'air', spirit: 'spirit' };
    if (map[k]) w.parts.emit(map[k], x, y, impact ? 10 : 5, { smax: 120, z: this.z });
    if (k === 'rock' || k === 'rockglove') w.parts.emit('dust', x, y, 3, { smax: 40 });
  }

  trail(w, dt) {
    const k = this.kind;
    const chance = (n) => Math.random() < n * dt * 60;
    if (k === 'fire' && chance(1)) w.parts.emit('fire', this.x, this.y, 1, { smax: 30, z: this.z, scale: this.r / 9 });
    else if (k === 'bluefire' && chance(1)) w.parts.emit('bluefire', this.x, this.y, 1, { smax: 30, z: this.z, scale: this.r / 9 });
    else if (k === 'water' && chance(0.6)) w.parts.emit('water', this.x, this.y, 1, { smax: 30, z: this.z });
    else if (k === 'ice' && chance(0.3)) w.parts.emit('ice', this.x, this.y, 1, { smax: 20, z: this.z });
    else if (k === 'air' && chance(0.4)) w.parts.emit('wisp', this.x, this.y, 1, { smax: 30, z: this.z });
    else if ((k === 'rock' || k === 'rockglove') && chance(0.2)) w.parts.emit('earth', this.x, this.y, 1, { smax: 20, z: this.z });
    else if (k === 'combust' && chance(1)) w.parts.emit('fire', this.x, this.y, 2, { smax: 40, z: this.z });
    else if (k === 'bomb' && chance(0.6)) w.parts.emit('spark', this.x, this.y - (this.z || 0), 1, { smax: 60 });
    else if (k === 'spirit' && chance(0.5)) w.parts.emit('spirit', this.x, this.y, 1, { smax: 20, z: this.z });
  }

  draw(ctx) {
    const k = this.kind, r = this.r * this.scale;
    const a = Math.atan2(this.vy, this.vx);
    if (this.z > 2) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ellipse(ctx, this.x, this.y, r * 0.9, r * 0.4); ctx.fill(); }
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    switch (k) {
      case 'air': {
        ctx.fillStyle = 'rgba(225,245,255,0.35)'; circle(ctx, 0, 0, r); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.4 + i * 0.25), this.spin + i * 2, this.spin + i * 2 + 2.2); ctx.stroke(); }
        break;
      }
      case 'fire': case 'bluefire': case 'combust': {
        ctx.globalCompositeOperation = 'lighter';
        const blue = k === 'bluefire';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, blue ? '#8fe8ff' : '#ffe27a');
        g.addColorStop(0.6, blue ? '#2f7bff' : '#ff6a1a');
        g.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = g;
        ctx.rotate(a); ellipse(ctx, -r * 0.3, 0, r * 1.9, r * 1.3); ctx.fill();
        break;
      }
      case 'water': {
        ctx.rotate(a);
        ctx.fillStyle = 'rgba(50,150,255,0.85)'; ellipse(ctx, -r * 0.4, 0, r * 1.7, r * 0.85); ctx.fill();
        ctx.fillStyle = 'rgba(190,235,255,0.9)'; ellipse(ctx, r * 0.1, -r * 0.25, r * 0.7, r * 0.3); ctx.fill();
        break;
      }
      case 'ice': case 'metal': {
        ctx.rotate(a);
        ctx.fillStyle = k === 'ice' ? '#d6f6ff' : '#c4ccd4';
        ctx.strokeStyle = k === 'ice' ? '#69c3ea' : '#6b747c'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(r * 1.6, 0); ctx.lineTo(-r, -r * 0.5); ctx.lineTo(-r * 0.6, 0); ctx.lineTo(-r, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'rock': case 'rockglove': {
        ctx.rotate(this.spin * 0.3);
        ctx.fillStyle = k === 'rockglove' ? '#4e5a48' : '#8a6a45';
        ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 7; i++) { const aa = i / 7 * TAU; const rr = r * (0.8 + ((i * 37) % 5) / 12); i ? ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; circle(ctx, -r * 0.3, -r * 0.3, r * 0.35); ctx.fill();
        break;
      }
      case 'boomerang': {
        ctx.rotate(this.spin * 1.2);
        ctx.strokeStyle = '#d2b07a'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r, -r * 0.6); ctx.quadraticCurveTo(0, r * 0.4, r, -r * 0.6); ctx.stroke();
        ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case 'club': {
        ctx.rotate(this.spin);
        ctx.fillStyle = '#e8e0cc'; roundRect(ctx, -r, -2.5, r * 2, 5, 2.5); ctx.fill();
        ctx.fillStyle = '#c9b38a'; circle(ctx, r, 0, 4.5); ctx.fill();
        break;
      }
      case 'knife': case 'arrow': {
        ctx.rotate(a);
        ctx.strokeStyle = k === 'knife' ? '#d9dee3' : '#5a3d22'; ctx.lineWidth = k === 'knife' ? 2.4 : 1.8;
        ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.lineTo(r, 0); ctx.stroke();
        ctx.fillStyle = '#e6eaee'; ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(r - 1, -2.5); ctx.lineTo(r - 1, 2.5); ctx.fill();
        if (k === 'arrow') { ctx.fillStyle = '#a52a2a'; ctx.fillRect(-r * 1.4, -2, 4, 4); }
        break;
      }
      case 'bomb': {
        ctx.fillStyle = '#222'; circle(ctx, 0, 0, r); ctx.fill();
        ctx.fillStyle = '#555'; circle(ctx, -r * 0.3, -r * 0.3, r * 0.3); ctx.fill();
        ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(3, -r - 5); ctx.stroke();
        break;
      }
      case 'spirit': {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#b08cff'); g.addColorStop(1, 'rgba(80,40,160,0)');
        ctx.fillStyle = g; circle(ctx, 0, 0, r * 1.6); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}
