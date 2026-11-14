'use strict';
class PlayerController {
  think(f, w) {
    const I = this.I || (this.I = {});
    let mx = 0, my = 0;
    if (Input.key('KeyW') || Input.key('ArrowUp')) my -= 1;
    if (Input.key('KeyS') || Input.key('ArrowDown')) my += 1;
    if (Input.key('KeyA') || Input.key('ArrowLeft')) mx -= 1;
    if (Input.key('KeyD') || Input.key('ArrowRight')) mx += 1;
    I.mx = mx; I.my = my;
    I.ax = Game.mouseWorld.x; I.ay = Game.mouseWorld.y;
    const k = (c) => Input.key(c) || Input.hit(c);
    I.basic = Input.mdown[0] || Input.mclick[0] || k('KeyJ');
    I.q = k('KeyQ') || Input.mdown[2] || Input.mclick[2] || k('Digit1');
    I.e = k('KeyE') || k('Digit2');
    I.r = k('KeyR') || k('Digit3');
    I.dash = Input.hit('Space') || Input.hit('ShiftLeft') || Input.hit('ShiftRight');
    I.ult = Input.hit('KeyF') || Input.hit('Digit4');
    return I;
  }
}

class AIController {
  constructor(skill = 0.85) {
    this.skill = skill;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = rand(1, 3);
    this.decide = rand(0.3, 1.0);
    this.target = null; this.retarget = 0; this.dodgeCd = rand(0.5, 1.5); this.reactT = 0;
    this.I = {};
  }

  think(f, w, dt) {
    const I = this.I;
    I.basic = I.q = I.e = I.r = I.dash = I.ult = false;
    this.retarget -= dt;
    if (!this.target || !this.target.alive || this.retarget <= 0) { this.target = w.nearestEnemy(f); this.retarget = 1.5; }
    const t = this.target;
    if (!t) { I.mx = I.my = 0; I.ax = f.x + Math.cos(f.ang) * 50; I.ay = f.y + Math.sin(f.ang) * 50; return I; }

    const ai = f.def.ai || {};
    const basicBlocked = f.blocked(f.def.abilities.basic, w);
    const style = basicBlocked ? 'melee' : (ai.style || 'ranged');
    const range = basicBlocked ? 45 : (ai.range || 280);
    const d = dist(f.x, f.y, t.x, t.y), a = angTo(f.x, f.y, t.x, t.y);

    // aim with lead + skill-based error
    const tt = d / (ai.projSpeed || 650);
    const lead = 0.8 * this.skill;
    const ax = t.x + t.vx * tt * lead, ay = t.y + t.vy * tt * lead;
    const err = (1.1 - this.skill) * 0.25;
    const ea = angTo(f.x, f.y, ax, ay) + rand(-err, err);
    const ed = dist(f.x, f.y, ax, ay);
    I.ax = f.x + Math.cos(ea) * ed; I.ay = f.y + Math.sin(ea) * ed;

    // movement
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafe *= -1; this.strafeT = rand(0.8, 2.4); }
    const ux = Math.cos(a), uy = Math.sin(a);
    let mx = 0, my = 0;
    if (style === 'melee') {
      if (d > range * 0.8) { mx = ux; my = uy; mx += -uy * this.strafe * 0.25; my += ux * this.strafe * 0.25; }
      else { mx = -uy * this.strafe * 0.6 + ux * 0.2; my = ux * this.strafe * 0.6 + uy * 0.2; }
    } else {
      if (d > range * 1.2) { mx = ux; my = uy; }
      else if (d < range * 0.6) { mx = -ux; my = -uy; }
      mx += -uy * this.strafe * 0.75; my += ux * this.strafe * 0.75;
    }
    // stay away from arena edges
    const m = 90;
    if (f.x < m) mx += 1; if (f.x > w.W - m) mx -= 1;
    if (f.y < m) my += 1; if (f.y > w.H - m) my -= 1;
    // steer around obstacles
    for (const o of w.obstacles) {
      if (o.solid === false) continue;
      const od = dist(f.x, f.y, o.x, o.y);
      if (od < o.r + f.r + 30) { const [nx, ny] = norm(f.x - o.x, f.y - o.y); mx += nx * 0.9 - ny * this.strafe * 0.6; my += ny * 0.9 + nx * this.strafe * 0.6; }
    }
    I.mx = mx; I.my = my;

    // reactions
    this.dodgeCd -= dt;
    const threat = w.incoming(f, 230);
    if (threat && this.dodgeCd <= 0) {
      this.dodgeCd = rand(0.8, 1.6) / this.skill;
      // defensive abilities first
      let used = false;
      for (const s of ['q', 'e', 'r']) {
        const ab = f.def.abilities[s];
        if (!ab || !ab.ai || ab.ai.type !== 'defense') continue;
        if (f.cd[s] > 0 || f.chi < (ab.chi || 0) || Math.random() > (ab.ai.chance ?? 0.6) * this.skill) continue;
        I[s] = true; used = true; break;
      }
      if (!used && f.cd.dash <= 0 && Math.random() < (ai.dodge ?? 0.5) * this.skill) {
        const side = Math.random() < 0.5 ? 1 : -1;
        I.mx = -threat.vy * side; I.my = threat.vx * side; I.dash = true;
      }
    }

    // ability decisions
    this.decide -= dt;
    if (this.decide <= 0) {
      this.decide = rand(0.3, 0.7) / this.skill;
      if (f.def.ult && f.ult >= 100 && d < (f.def.ult.ai?.max ?? 400)) I.ult = true;
      else {
        for (const s of shuffle(['q', 'e', 'r'])) {
          const ab = f.def.abilities[s];
          if (!ab || f.cd[s] > 0 || f.chi < (ab.chi || 0) || f.blocked(ab, w)) continue;
          const x = ab.ai || {}, type = x.type || 'attack', ch = (x.chance ?? 0.5);
          let go = false;
          if (type === 'attack') go = d >= (x.min || 0) && d <= (x.max || 400);
          else if (type === 'self') go = x.hp ? f.hp / f.maxHp < x.hp : true;
          else if (type === 'buff') go = d <= (x.max || 300);
          else if (type === 'gap') go = d > range * 1.5 || (style === 'melee' && d > 120);
          if (go && Math.random() < ch) { I[s] = true; break; }
        }
      }
    }
    // basic attack
    const b = f.ability('basic', w);
    const bmax = (b && b.ai && b.ai.max) || (basicBlocked ? 60 : range * 1.4);
    if (d <= bmax) I.basic = Math.random() < 0.85;
    return I;
  }
}

// Used by the 3D title-screen diorama: heroes idly practise their bending.
class IdleController {
  constructor(i) { this.I = {}; this.t = rand(0.5, 2.5); this.a = rand(0, TAU); this.turn = rand(-0.4, 0.4); this.i = i; }
  think(f, w, dt) {
    const I = this.I;
    I.mx = I.my = 0; I.basic = I.q = I.e = I.r = I.dash = I.ult = false;
    this.a += this.turn * dt;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = rand(1.6, 3.4);
      this.a = angTo(w.W / 2, w.H / 2, f.x, f.y) + rand(-0.9, 0.9);
      if (Math.random() < 0.25) I.q = true; else I.basic = true;
    }
    I.ax = f.x + Math.cos(this.a) * 200; I.ay = f.y + Math.sin(this.a) * 200;
    return I;
  }
}
