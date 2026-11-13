'use strict';
let _fid = 0;
const NO_INTENT = { mx: 0, my: 0, ax: 0, ay: 0 };
const PUNCH = {
  name: 'Martial Arts', icon: '👊', cd: 0.34, bending: false, desc: 'Bending forms without bending — still hits hard.',
  cast(f, w, a) { w.melee(f, a, 58, 1.6, 9, { color: 'rgba(255,255,255,0.8)', knock: 140 }); Sound.play('hit'); },
};
const DEFAULT_DASH = { name: 'Dash', icon: '💨', cd: 2.0, speed: 780, time: 0.2, iframes: 0.2 };

class Fighter {
  constructor(def, team, x, y, ctrl, opt = {}) {
    this.id = ++_fid;
    this.def = def; this.team = team; this.x = x; this.y = y; this.ctrl = ctrl;
    this.vx = 0; this.vy = 0; this.kvx = 0; this.kvy = 0;
    this.r = def.r || 16;
    this.maxHp = Math.round(def.hp * (opt.hpMult || 1)); this.hp = this.maxHp;
    this.maxChi = def.chi || 100; this.chi = this.maxChi;
    this.ult = opt.ult || 0;
    this.cd = { basic: 0, q: 0, e: 0, r: 0, dash: 0, ult: 0 };
    this.cdMax = { basic: 1, q: 1, e: 1, r: 1, dash: 1, ult: 1 };
    this.status = { burn: null, slow: null, stun: 0, root: 0, chiBlock: 0 };
    this.buffs = {};
    this.flags = {};
    this.aimX = x; this.aimY = y + 50; this.ang = Math.PI / 2;
    this.alive = true; this.deathT = 0; this.anim = Math.random() * 10;
    this.cast = 0; this.castLock = 0; this.moveLock = 0;
    this.dashT = 0; this.dashVx = 0; this.dashVy = 0; this.invuln = 0; this.hitFlash = 0;
    this.boss = !!opt.boss; this.isPlayer = !!opt.player; this.enraged = false;
    this.sinceHurt = 99; this.dmgMult = 1; this.dr = 0; this.speedMult = 1;
    this.cdMult = def.cdMult || 1; this.moving = false; this.failT = 0;
    this.spawnT = 0;
  }

  get bender() { return !!this.def.element && this.def.element !== 'none' && this.def.element !== 'spirit'; }
  addBuff(id, b) { b.t0 = b.t; this.buffs[id] = b; return b; }
  has(id) { return !!this.buffs[id]; }
  removeBuff(id, w) { const b = this.buffs[id]; if (!b) return; delete this.buffs[id]; if (b.end) b.end(this, w, b); }

  ability(slot, w) {
    if (slot === 'ult') return this.def.ult;
    if (slot === 'dash') return this.def.dash || DEFAULT_DASH;
    if (slot === 'basic') {
      for (const id in this.buffs) if (this.buffs[id].basic) return this.buffs[id].basic;
      const b = this.def.abilities.basic;
      if (this.blocked(b, w)) return PUNCH;
      return b;
    }
    return this.def.abilities[slot];
  }

  // returns a reason string when the ability cannot be bent right now
  blocked(ab, w) {
    if (!ab || ab.bending === false || !this.bender) return null;
    if (this.status.chiBlock > 0) return 'Chi blocked!';
    if (w && w.modifier === 'eclipse' && (ab.elem || this.def.element) === 'fire') return 'The eclipse has taken your firebending!';
    return null;
  }

  fail(w, msg) {
    if (!this.isPlayer || this.failT > 0) return;
    this.failT = 0.6;
    w.text(this.x, this.y - 60, msg, '#ff9a9a', 13);
    Sound.play('deny');
  }

  use(slot, w) {
    const ab = this.ability(slot, w);
    if (!ab || this.cd[slot] > 0 || this.castLock > 0) return false;
    if (slot === 'ult' && this.ult < 100) return false;
    const why = this.blocked(ab, w);
    if (why) { this.fail(w, why); return false; }
    if (this.chi < (ab.chi || 0)) { this.fail(w, 'Not enough chi'); return false; }
    this.chi -= ab.chi || 0;
    const cd = (ab.cd || 0.4) * (slot === 'basic' ? 1 : this.cdMult);
    this.cd[slot] = cd; this.cdMax[slot] = cd;
    this.castLock = ab.lock ?? 0.1;
    this.cast = 1;
    if (slot === 'ult') {
      this.ult = 0;
      w.text(this.x, this.y - 70, ab.call || ab.name.toUpperCase(), '#ffe27a', 22);
      w.shakeIt(8);
      Sound.play('ult');
    }
    ab.cast(this, w, angTo(this.x, this.y, this.aimX, this.aimY));
    return true;
  }

  doDash(w, mx, my) {
    const d = this.def.dash || DEFAULT_DASH;
    if (this.cd.dash > 0 || this.status.root > 0) return;
    let [dx, dy] = norm(mx, my);
    if (!dx && !dy) { const a = this.ang; dx = Math.cos(a); dy = Math.sin(a); }
    const cd = d.cd * (this.def.dashCdMult || 1);
    this.cd.dash = cd; this.cdMax.dash = cd;
    this.dashT = d.time; this.dashVx = dx * d.speed; this.dashVy = dy * d.speed;
    this.invuln = Math.max(this.invuln, d.iframes ?? d.time);
    const e = d.elem || this.def.element;
    const pt = { air: 'air', fire: 'fire', water: 'water', earth: 'dust' }[e] || 'dust';
    w.parts.emit(pt, this.x, this.y, 8, { smax: 80 });
    if (d.cast) d.cast(this, w, Math.atan2(dy, dx));
    Sound.play(e === 'fire' ? 'fire' : e === 'water' ? 'water' : 'air');
  }

  update(dt, w) {
    this.anim += dt;
    if (!this.alive) { this.deathT += dt; return; }
    this.spawnT += dt;
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt;
    this.castLock -= dt; this.moveLock -= dt; this.invuln -= dt; this.hitFlash -= dt; this.failT -= dt;
    this.cast = Math.max(0, this.cast - dt * 3.5);
    this.sinceHurt += dt;

    const st = this.status;
    if (st.stun > 0) st.stun -= dt;
    if (st.root > 0) st.root -= dt;
    if (st.chiBlock > 0) st.chiBlock -= dt;
    if (st.slow) { st.slow.t -= dt; if (st.slow.t <= 0) st.slow = null; }
    if (st.burn) {
      st.burn.t -= dt; st.burn.acc = (st.burn.acc || 0) + dt;
      if (Math.random() < dt * 20) w.parts.emit(st.burn.blue ? 'bluefire' : 'fire', this.x + rand(-8, 8), this.y - rand(5, 30), 1, { smax: 20, scale: 0.7 });
      if (st.burn.acc >= 0.5) { st.burn.acc -= 0.5; w.damage(this, st.burn.dps * 0.5, st.burn.src, { dot: true, elem: 'fire' }); }
      if (st.burn && st.burn.t <= 0) st.burn = null;
      if (!this.alive) return;
    }

    // Aggregate buffs
    this.dmgMult = 1; this.dr = 0; this.speedMult = 1;
    const fl = this.flags = { reflect: false, redirect: false, ccImmune: false, knockImmune: !!this.def.knockImmune, hover: 0 };
    for (const id in this.buffs) {
      const b = this.buffs[id];
      b.t -= dt;
      if (b.tick) b.tick(this, w, dt, b);
      if (b.dmgMult) this.dmgMult *= b.dmgMult;
      if (b.dr) this.dr = 1 - (1 - this.dr) * (1 - b.dr);
      if (b.speedMult) this.speedMult *= b.speedMult;
      if (b.reflect) fl.reflect = true;
      if (b.redirect) fl.redirect = true;
      if (b.ccImmune) fl.ccImmune = true;
      if (b.knockImmune) fl.knockImmune = true;
      if (b.hover) fl.hover = b.hover;
      if (b.t <= 0 && this.buffs[id] === b) { delete this.buffs[id]; if (b.end) b.end(this, w, b); }
    }
    if (this.def.lowHpDmg && this.hp < this.maxHp * 0.4) this.dmgMult *= 1 + this.def.lowHpDmg;
    if (this.enraged) { this.speedMult *= 1.15; this.dmgMult *= 1.1; }
    if (this.def.regenOOC && this.sinceHurt > 3) this.hp = Math.min(this.maxHp, this.hp + this.def.regenOOC * dt);
    this.chi = Math.min(this.maxChi, this.chi + (this.def.chiRegen || 12) * dt);

    const stunned = st.stun > 0;
    const I = stunned ? NO_INTENT : this.ctrl.think(this, w, dt);
    if (!stunned) {
      this.aimX = I.ax; this.aimY = I.ay;
      this.ang = angTo(this.x, this.y, this.aimX, this.aimY);
    }
    let sp = (this.def.speed || 220) * this.speedMult * (st.slow ? 1 - st.slow.amt : 1);
    let [mx, my] = norm(I.mx || 0, I.my || 0);
    if (st.root > 0 || stunned || this.moveLock > 0) { mx = 0; my = 0; }
    const acc = 1 - Math.exp(-14 * dt);
    this.vx += (mx * sp - this.vx) * acc;
    this.vy += (my * sp - this.vy) * acc;
    if (this.dashT > 0) {
      this.dashT -= dt; this.vx = this.dashVx; this.vy = this.dashVy;
      const d = this.def.dash || DEFAULT_DASH;
      if (d.trail) d.trail(this, w, dt);
      else if (Math.random() < dt * 40) w.parts.emit({ air: 'air', fire: 'fire', water: 'water', earth: 'dust', spirit: 'spirit' }[d.elem || this.def.element] || 'dust', this.x, this.y - 6, 1, { smax: 30 });
      if (this.dashT <= 0) { this.vx *= 0.3; this.vy *= 0.3; }
    }
    const kd = Math.exp(-7 * dt);
    this.kvx *= kd; this.kvy *= kd;
    this.x += (this.vx + this.kvx) * dt; this.y += (this.vy + this.kvy) * dt;
    this.moving = Math.hypot(this.vx, this.vy) > 25;
    w.collideFighter(this);

    if (!stunned && this.castLock <= 0) {
      if (I.ult && this.def.ult) this.use('ult', w);
      if (I.dash) this.doDash(w, I.mx || 0, I.my || 0);
      for (const s of ['q', 'e', 'r']) if (I[s] && this.castLock <= 0) this.use(s, w);
      if (I.basic && this.castLock <= 0) this.use('basic', w);
    }
  }

  draw(ctx, w) {
    const a = this.alive ? Math.min(1, this.spawnT * 4) : Math.max(0, 1 - (this.deathT - 0.3) / 0.5);
    if (a <= 0) return;
    for (const id in this.buffs) if (this.buffs[id].drawBack) this.buffs[id].drawBack(ctx, this, w, this.buffs[id]);
    let glow = null, armor = false, dao = false, mask = null, avatar = false;
    for (const id in this.buffs) {
      const b = this.buffs[id];
      if (b.glow) glow = b.glow; if (b.armor) armor = true; if (b.dao) { dao = true; mask = 'blue'; } if (b.avatar) avatar = true;
    }
    if (this.enraged && !glow) glow = 'rgba(255,60,40,0.35)';
    if (this.status.slow) {
      ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.lineWidth = 2;
      ellipse(ctx, this.x, this.y, this.r + 3, (this.r + 3) * 0.4); ctx.stroke();
    }
    if (this.status.root > 0) {
      ctx.strokeStyle = 'rgba(200,200,210,0.9)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const aa = i / 4 * TAU + 0.4; ctx.beginPath(); ctx.moveTo(this.x + Math.cos(aa) * (this.r + 2), this.y + Math.sin(aa) * 6); ctx.lineTo(this.x + Math.cos(aa) * (this.r + 2), this.y + Math.sin(aa) * 6 - 10); ctx.stroke(); }
    }
    drawCharacter(ctx, this.def.art, this.x, this.y, {
      ang: this.ang, t: this.anim, moving: this.moving, cast: this.cast,
      scale: this.def.artScale || this.r / 16, alpha: a, glow, flash: this.hitFlash > 0, armor, dao, mask, avatar,
      dead: !this.alive, deadT: this.deathT, hover: this.flags.hover || 0, enraged: this.enraged,
    });
    for (const id in this.buffs) if (this.buffs[id].draw) this.buffs[id].draw(ctx, this, w, this.buffs[id]);
    const top = this.y - (this.def.artScale || this.r / 16) * 56 - (this.flags.hover || 0);
    if (this.status.stun > 0 && this.alive) {
      for (let i = 0; i < 3; i++) {
        const aa = this.anim * 5 + i * TAU / 3;
        ctx.fillStyle = '#ffe97a'; circle(ctx, this.x + Math.cos(aa) * 12, top - 2 + Math.sin(aa) * 4, 2.6); ctx.fill();
      }
    }
    if (this.status.chiBlock > 0 && this.alive) {
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f5c7d8';
      ctx.fillText('⊘ chi', this.x, top - 8);
    }
    if (!this.isPlayer && !this.boss && !this.showBar && this.alive && this.hp < this.maxHp) {
      const bw = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(this.x - bw / 2, top - 4, bw, 4);
      ctx.fillStyle = this.team === 0 ? '#5fd35f' : '#e0483a'; ctx.fillRect(this.x - bw / 2, top - 4, bw * this.hp / this.maxHp, 4);
    }
  }
}
