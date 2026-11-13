'use strict';
// ======================= Battle (one fight / stage) =======================
class Battle {
  constructor(cfg) {
    this.cfg = cfg;
    const duel = cfg.mode === 'duel';
    this.world = new World({ theme: cfg.theme, modifier: cfg.modifier, seed: cfg.seed || randi(1, 99999), W: duel ? 1700 : 2200, H: duel ? 1150 : 1500 });
    const w = this.world;
    const p = new Fighter(ROSTER[cfg.charId], 0, w.W / 2, w.H / 2 + (duel ? 220 : 80), new PlayerController(), { player: true });
    p.ang = -Math.PI / 2;
    w.add(p); w.player = p; this.player = p;
    this.phase = 'intro'; this.timer = 2.4; this.wave = 0; this.bosses = []; this.pending = 0;
    this.stats = { time: 0, dmgTaken: 0, kills: 0 }; this.score = 0; this.addT = 0;
    this.result = null; this.endT = 0; this.shown = false; this.bannerObj = null;
    w.onKill = (t) => { if (t.team !== 0) { this.stats.kills++; this.score += t.boss ? 1000 : t.def.boss ? 600 : 100; } };
    w.onPlayerHurt = (a) => { this.stats.dmgTaken += a; };
    if (cfg.mode === 'story') this.banner(cfg.stage.title, `${BOOKS[cfg.stage.book - 1].name} · Chapter ${cfg.stage.ch}`, BOOKS[cfg.stage.book - 1].color, 3);
    else if (duel) this.banner('DUEL', `${ROSTER[cfg.charId].name} vs ${ROSTER[cfg.foe].name}`, '#ffd27a', 2.4);
    else this.banner('SURVIVAL', THEMES[cfg.theme].name, '#ffd27a', 2.4);
    Sound.play('gong');
  }

  banner(text, sub, color = '#fff', life = 2.6) { this.bannerObj = { text, sub, color, t: 0, life }; }

  waveCount() {
    if (this.cfg.mode === 'story') return this.cfg.stage.waves.length;
    if (this.cfg.mode === 'survival') return Infinity;
    return 0;
  }

  waveComp(i) {
    if (this.cfg.mode === 'story') return this.cfg.stage.waves[i];
    const pool = SURVIVAL_POOL[this.cfg.theme] || ['soldier', 'firebender'];
    const n = 3 + Math.floor(i * 1.4), comp = {};
    for (let k = 0; k < n; k++) { const id = pick(pool); comp[id] = (comp[id] || 0) + 1; }
    return comp;
  }

  edgePoint(minD = 450) {
    const w = this.world, p = this.player;
    for (let i = 0; i < 40; i++) {
      const x = rand(110, w.W - 110), y = rand(130, w.H - 110);
      if (dist(x, y, p.x, p.y) < minD) continue;
      if (w.obstacles.some(o => dist(o.x, o.y, x, y) < o.r + 40)) continue;
      return [x, y];
    }
    return [rand(110, w.W - 110), rand(130, w.H - 110)];
  }

  spawn(id, x, y, opt = {}) {
    const w = this.world;
    x = clamp(x, 60, w.W - 60); y = clamp(y, 80, w.H - 60);
    const def = ROSTER[id];
    const hpMult = (opt.hpMult || 1) * (opt.duel ? 1 : diff().enemyHp);
    const f = new Fighter(def, 1, x, y, new AIController(diff().skill * (opt.boss || opt.duel ? 1.05 : 1)), { hpMult, boss: !!opt.boss });
    f.ang = angTo(x, y, this.player.x, this.player.y);
    f.aimX = this.player.x; f.aimY = this.player.y;
    if (opt.adds) f.noDrops = Math.random() < 0.6;
    w.add(f);
    w.parts.emit(def.element === 'spirit' ? 'spirit' : 'smoke', x, y - 10, 10, { smax: 60 });
    return f;
  }

  spawnDelayed(id, opt = {}) {
    const [x, y] = this.edgePoint();
    this.pending++;
    this.world.fx({ x, y, life: 0.8, layer: 'under', onEnd: () => { this.pending--; this.spawn(id, x, y, opt); },
      draw(ctx, w, e) { const k = e.t / e.life; ctx.save(); ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#1a0a0a'; ellipse(ctx, e.x, e.y, 22 * k, 9 * k); ctx.fill(); ctx.restore(); } });
  }

  startWave() {
    const comp = this.waveComp(this.wave);
    for (const id in comp) for (let i = 0; i < comp[id]; i++) this.spawnDelayed(id);
    const total = this.waveCount();
    this.banner(`Wave ${this.wave + 1}${total !== Infinity ? ' / ' + total : ''}`, '', '#ffe7b0', 1.6);
    if (this.cfg.mode === 'survival' && this.wave > 0 && (this.wave + 1) % 5 === 0) {
      const id = pick(SURVIVAL_BOSSES);
      const [x, y] = this.edgePoint(500);
      const b = this.spawn(id, x, y, { boss: true, hpMult: 1 + this.wave * 0.06 });
      this.bosses.push(b);
      this.banner(ROSTER[id].name.toUpperCase(), ROSTER[id].title, '#ff8a6a', 2.4);
      Sound.play('gong');
    }
    this.phase = 'wave';
  }

  spawnBosses() {
    const duel = this.cfg.mode === 'duel';
    if (this.world.modifier === 'eclipse') {
      this.world.modifier = null;
      A.later(this.world, 3.0, () => this.banner('The eclipse is over!', 'Firebending has returned', '#ff9a4a', 2.6));
    }
    const specs = duel ? [{ id: this.cfg.foe, hp: 1 }] : this.cfg.stage.bosses;
    specs.forEach((b, i) => {
      const w = this.world;
      const x = duel ? w.W / 2 + (i - (specs.length - 1) / 2) * 140 : null;
      const [ex, ey] = duel ? [x, w.H / 2 - 250] : this.edgePoint(420);
      const f = this.spawn(b.id, ex, ey, { boss: !duel, duel, hpMult: b.hp || 1 });
      f.showBar = true;
      this.bosses.push(f);
    });
    const d = ROSTER[specs[0].id];
    if (!duel) {
      const names = specs.map(s => ROSTER[s.id].name).join(' & ');
      this.banner(names.toUpperCase(), this.cfg.stage.bossIntro || d.title, '#ff8a6a', 2.8);
    }
    Sound.play('gong');
    this.phase = 'boss';
  }

  update(dt, realDt = dt) {
    const w = this.world;
    w.update(dt);
    if (this.bannerObj) { this.bannerObj.t += dt; if (this.bannerObj.t > this.bannerObj.life) this.bannerObj = null; }
    if (this.result) {
      this.endT += realDt;
      if (this.endT > 2.0 && !this.shown) { this.shown = true; Game.state = 'over'; UI.results(this); }
      return;
    }
    this.stats.time += dt;
    if (!this.player.alive) { this.finish(false); return; }
    const alive = w.fighters.some(f => f.alive && f.team !== 0);
    switch (this.phase) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) { if (this.cfg.mode === 'duel') this.spawnBosses(); else this.startWave(); }
        break;
      case 'wave':
        if (!alive && this.pending === 0) {
          this.wave++;
          if (this.cfg.mode === 'survival') this.score += 250 * this.wave;
          if (this.wave < this.waveCount()) { this.phase = 'between'; this.timer = 2.2; }
          else { this.phase = 'between'; this.timer = 2.4; this.bossNext = true; }
        }
        break;
      case 'between':
        this.timer -= dt;
        if (this.timer <= 0) { if (this.bossNext) { this.bossNext = false; this.spawnBosses(); } else this.startWave(); }
        break;
      case 'boss': {
        const adds = this.cfg.stage && this.cfg.stage.adds;
        if (adds) {
          this.addT += dt;
          if (this.addT >= adds.every) { this.addT = 0; for (const id of adds.ids) { const [x, y] = this.edgePoint(); this.spawn(id, x, y, { adds: true }); } }
        }
        if (this.bosses.every(b => !b.alive)) this.finish(true);
        break;
      }
    }
  }

  finish(win) {
    this.result = win ? 'win' : 'lose';
    const w = this.world;
    if (win) {
      w.slowmo = 1.4;
      for (const f of w.fighters) if (f.team !== 0 && f.alive) w.kill(f, null);
      Sound.play('win');
      this.banner(this.cfg.mode === 'duel' ? 'VICTORY' : 'VICTORY', '', '#ffe27a', 3);
      if (this.cfg.mode === 'story') {
        const id = this.cfg.stage.id;
        this.newUnlocks = PLAYABLE.filter(c => ROSTER[c].unlock === id && !Save.data.done[id]).map(c => ROSTER[c].name);
        Save.data.done[id] = true;
        const best = Save.data.best[id];
        if (!best || this.stats.time < best) Save.data.best[id] = this.stats.time;
        Save.write();
      }
    } else {
      Sound.play('lose');
      this.banner('DEFEATED', '', '#ff6b6b', 3);
      if (this.cfg.mode === 'survival') {
        const key = 'survival_' + this.cfg.charId;
        this.newBest = !Save.data.best[key] || this.score > Save.data.best[key];
        if (this.newBest) { Save.data.best[key] = this.score; Save.write(); }
      }
    }
  }
}

// ======================= Game (app shell) =======================
const Game = {
  state: 'menu', battle: null, world: null,
  cam: { x: 0, y: 0, zoom: 1 }, mouseWorld: { x: 0, y: 0 }, last: 0, t: 0, lastCfg: null,
  menuParts: new Particles(),

  init() {
    Save.load();
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize());
    Input.init(this.canvas);
    UI.init();
    UI.title();
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'play') this.pause();
        else if (this.state === 'pause') this.resume();
      }
      if (e.code === 'KeyM') { Save.data.settings.music = !Save.data.settings.music; Save.write(); Sound.applySettings(); }
    });
    addEventListener('blur', () => { if (this.state === 'play') this.pause(); });
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = innerWidth; this.cssH = innerHeight;
    this.canvas.width = Math.round(this.cssW * this.dpr); this.canvas.height = Math.round(this.cssH * this.dpr);
    this.canvas.style.width = this.cssW + 'px'; this.canvas.style.height = this.cssH + 'px';
  },

  start(cfg) {
    Sound.init();
    this.lastCfg = cfg;
    this.battle = new Battle(cfg);
    this.world = this.battle.world;
    const p = this.battle.player;
    this.cam.x = p.x; this.cam.y = p.y;
    this.state = 'play';
    UI.hide();
    Sound.setMood('battle');
  },
  restart() { if (this.lastCfg) this.start(this.lastCfg); },
  pause() { this.state = 'pause'; UI.pauseMenu(); },
  resume() { this.state = 'play'; UI.hide(); },
  quit() { this.state = 'menu'; this.battle = null; this.world = null; Sound.setMood('menu'); UI.title(); },
  spawnEnemy(id, x, y) { if (this.battle) return this.battle.spawn(id, x, y, { adds: true }); },

  loop(t) {
    const dt = Math.min(0.033, (t - this.last) / 1000 || 0.016);
    this.last = t; this.t += dt;
    if (this.state === 'play' && this.battle) {
      const w = this.world;
      this.updateCamera(dt);
      const sdt = w.slowmo > 0 ? dt * 0.3 : dt;
      this.battle.update(sdt, dt);
    } else if (this.state === 'over' && this.battle) {
      this.updateCamera(dt);
      this.world.update(dt * 0.25);
    }
    this.render(dt);
    Input.end();
    requestAnimationFrame((tt) => this.loop(tt));
  },

  updateCamera(dt) {
    const w = this.world, p = this.battle.player;
    const z = this.cam.zoom = clamp(Math.min(this.cssW / 1180, this.cssH / 700), 0.5, 1.6);
    const vw = this.cssW / z, vh = this.cssH / z;
    this.mouseWorld.x = this.cam.x + (Input.mx - this.cssW / 2) / z;
    this.mouseWorld.y = this.cam.y + (Input.my - this.cssH / 2) / z;
    let tx = p.x + (this.mouseWorld.x - p.x) * 0.18, ty = p.y - 20 + (this.mouseWorld.y - p.y) * 0.18;
    tx = vw >= w.W ? w.W / 2 : clamp(tx, vw / 2, w.W - vw / 2);
    ty = vh >= w.H ? w.H / 2 : clamp(ty, vh / 2, w.H - vh / 2);
    const k = 1 - Math.exp(-8 * dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    w.view.x = this.cam.x; w.view.y = this.cam.y; w.view.w = vw; w.view.h = vh;
  },

  render(dt) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this.world) {
      const w = this.world, z = this.cam.zoom;
      const sx = w.shake ? rand(-w.shake, w.shake) : 0, sy = w.shake ? rand(-w.shake, w.shake) : 0;
      ctx.save();
      ctx.translate(this.cssW / 2 + sx, this.cssH / 2 + sy);
      ctx.scale(z, z);
      ctx.translate(-this.cam.x, -this.cam.y);
      w.draw(ctx);
      ctx.restore();
      UI.drawHUD(ctx, this);
    } else {
      UI.drawMenuBg(ctx, this, dt);
    }
    UI.tickPortraits(this.t);
  },
};

window.addEventListener('load', () => Game.init());
