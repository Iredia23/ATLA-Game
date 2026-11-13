'use strict';
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MOD_INFO = {
  fullmoon: { icon: '🌕', name: 'Full Moon', desc: 'Waterbending ×1.5' },
  eclipse: { icon: '🌑', name: 'Solar Eclipse', desc: 'Firebending impossible' },
  comet: { icon: '☄️', name: "Sozin's Comet", desc: 'Firebending ×1.5' },
};

const UI = {
  root: null, portraits: [],

  init() {
    this.root = document.getElementById('ui');
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.classList.contains('locked')) return;
      Sound.init(); Sound.play('ui');
      this.act(el.dataset.act, el.dataset);
    });
  },

  show(html, cls = '') {
    this.portraits = [];
    this.root.innerHTML = `<div class="screen scr-${cls}">${html}</div>`;
    this.root.style.display = 'flex';
    this.root.scrollTop = 0;
  },
  hide() { this.root.style.display = 'none'; this.root.innerHTML = ''; this.portraits = []; },

  act(a, d) {
    switch (a) {
      case 'title': this.title(); break;
      case 'story': this.story(); break;
      case 'duel': this.charSelect({ mode: 'duel' }); break;
      case 'survival': this.charSelect({ mode: 'survival' }); break;
      case 'howto': this.howto(); break;
      case 'settings': this.settings(); break;
      case 'stage': this.charSelect({ mode: 'story', stage: STAGES.find(s => s.id === d.id) }); break;
      case 'pickChar': this.sel.charId = d.id; this.renderSelect(); break;
      case 'confirmChar': this.afterChar(); break;
      case 'pickFoe': this.sel.foe = d.id; this.renderFoe(); break;
      case 'confirmFoe': this.arenaSelect(); break;
      case 'arena': this.sel.theme = d.id; this.launch(); break;
      case 'begin': this.launch(); break;
      case 'back': this.back(); break;
      case 'resume': Game.resume(); break;
      case 'restart': Game.restart(); break;
      case 'quit': Game.quit(); break;
      case 'next': {
        const i = STAGES.findIndex(s => s.id === Game.lastCfg.stage.id);
        if (STAGES[i + 1]) this.charSelect({ mode: 'story', stage: STAGES[i + 1], charId: Game.lastCfg.charId });
        else this.story();
        Game.state = 'menu'; Game.battle = null; Game.world = null; Sound.setMood('menu');
        break;
      }
      case 'toMenu': Game.quit(); break;
      case 'diff': Save.data.settings.diff = d.v; Save.write(); this.settings(); break;
      case 'toggle': Save.data.settings[d.k] = !Save.data.settings[d.k]; Save.write(); Sound.applySettings(); this.settings(); break;
      case 'reset':
        if (confirm('Reset all story progress and records?')) { Save.reset(); this.settings(); }
        break;
      case 'pauseHow': this.howto(true); break;
      case 'pauseBack': this.pauseMenu(); break;
    }
  },

  back() {
    const s = this.sel || {};
    if (s.step === 'foe' || s.step === 'arena' && s.mode === 'survival') { this.charSelect({ mode: s.mode, stage: s.stage, charId: s.charId }); return; }
    if (s.step === 'arena') { this.foeSelect(); return; }
    if (s.step === 'intro') { this.charSelect({ mode: 'story', stage: s.stage, charId: s.charId }); return; }
    if (s.mode === 'story') this.story(); else this.title();
  },

  // ---------------- screens ----------------
  title() {
    this.sel = null;
    this.show(`
      <div class="title-wrap">
        <div class="glyphs"><span class="g air">🌪️</span><span class="g water">💧</span><span class="g earth">🪨</span><span class="g fire">🔥</span></div>
        <h1 class="logo">AVATAR</h1>
        <div class="logo-sub">The Last Airbender</div>
        <div class="logo-game">— Elements Unleashed —</div>
        <p class="tagline">Water. Earth. Fire. Air. Master the bending arts of Team Avatar and their rivals across all three Books.</p>
        <div class="menu">
          <button class="btn big" data-act="story">📜 Story Campaign</button>
          <button class="btn big" data-act="duel">⚔️ Duel</button>
          <button class="btn big" data-act="survival">🔥 Survival</button>
          <div class="row">
            <button class="btn" data-act="howto">How to Play</button>
            <button class="btn" data-act="settings">Settings</button>
          </div>
        </div>
        <p class="fine">Unofficial fan-made tribute game. Avatar: The Last Airbender and its characters belong to their respective owners.</p>
      </div>`, 'title');
  },

  stageUnlocked(i) { return i === 0 || Save.data.settings.unlockAll || !!Save.data.done[STAGES[i - 1].id]; },

  story() {
    this.sel = { mode: 'story' };
    const done = STAGES.filter(s => Save.data.done[s.id]).length;
    let html = `<div class="head"><button class="btn small" data-act="title">← Back</button><h2>Story Campaign</h2><div class="progress">${done} / ${STAGES.length} chapters</div></div><div class="books">`;
    for (const b of BOOKS) {
      html += `<div class="book" style="--bc:${b.color}"><h3>${b.icon} ${b.name}</h3>`;
      STAGES.forEach((s, i) => {
        if (s.book !== b.n) return;
        const un = this.stageUnlocked(i), dn = Save.data.done[s.id];
        const mod = s.modifier ? `<span class="mod">${MOD_INFO[s.modifier].icon} ${MOD_INFO[s.modifier].name}</span>` : '';
        const boss = s.bosses.map(x => ROSTER[x.id].name).join(' & ');
        const best = Save.data.best[s.id] ? `<span class="best">⏱ ${fmtTime(Save.data.best[s.id])}</span>` : '';
        html += `<div class="stage ${un ? '' : 'locked'} ${dn ? 'done' : ''}" data-act="stage" data-id="${s.id}">
          <div class="ch">Chapter ${s.ch}${dn ? ' ✓' : ''}${un ? '' : ' 🔒'}</div>
          <div class="st">${esc(s.title)}</div>
          <div class="loc">📍 ${esc(s.loc)} ${mod}</div>
          <div class="boss">Boss: ${esc(boss)} ${best}</div></div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
    this.show(html, 'story');
  },

  charSelect(o) {
    const prev = this.sel && this.sel.mode === o.mode ? this.sel : {};
    this.sel = Object.assign({ step: 'char', charId: o.charId || prev.charId || (o.stage && o.stage.rec[0]) || 'aang' }, o);
    if (!isUnlocked(this.sel.charId)) this.sel.charId = 'aang';
    this.renderSelect();
  },

  renderSelect() {
    const s = this.sel;
    const title = s.mode === 'story' ? `${esc(s.stage.title)} — Choose your hero` : s.mode === 'duel' ? 'Duel — Choose your fighter' : 'Survival — Choose your fighter';
    let grid = '';
    for (const id of PLAYABLE) {
      const d = ROSTER[id], un = isUnlocked(id);
      const rec = s.stage && s.stage.rec.includes(id) ? '<span class="rec">★</span>' : '';
      const unlockTxt = !un ? `<div class="lock">🔒 Clear “${esc(STAGES.find(x => x.id === d.unlock).title)}”</div>` : '';
      grid += `<div class="card ${un ? '' : 'locked'} ${s.charId === id ? 'sel' : ''}" data-act="pickChar" data-id="${id}" style="--ec:${ELEMENT_COLORS[d.element]}">
        ${rec}<canvas class="portrait" data-id="${id}" width="120" height="120"></canvas>
        <div class="nm">${esc(d.name)}</div><div class="el">${ELEMENT_ICONS[d.element]} ${d.element === 'none' ? 'Non-bender' : cap(d.element) + 'bender'}</div>${unlockTxt}</div>`;
    }
    this.show(`
      <div class="head"><button class="btn small" data-act="back">← Back</button><h2>${title}</h2><div></div></div>
      <div class="select">
        <div class="grid">${grid}</div>
        <div class="detail">${this.detailHTML(s.charId)}
          <button class="btn big go" data-act="confirmChar">${s.mode === 'story' ? 'Continue' : 'Next'} →</button></div>
      </div>`, 'select');
    this.attachPortraits();
  },

  detailHTML(id) {
    const d = ROSTER[id];
    const ab = (k, a, key) => a ? `<div class="ab"><span class="ic">${a.icon || '•'}</span><div><b>${esc(a.name)}</b> <kbd>${key}</kbd>${a.chi ? ` <span class="chi">${a.chi} chi</span>` : ''}${a.cd >= 1 ? ` <span class="cdv">${a.cd}s</span>` : ''}<br><span class="ds">${esc(a.desc || '')}</span></div></div>` : '';
    const bar = (label, v, max) => `<div class="stat"><span>${label}</span><div class="sb"><i style="width:${clamp(v / max, 0, 1) * 100}%"></i></div></div>`;
    return `<div class="dhead" style="--ec:${ELEMENT_COLORS[d.element]}">
        <canvas class="portrait big" data-id="${id}" data-anim="1" width="170" height="170"></canvas>
        <div><h3>${esc(d.name)}</h3><div class="ti">${esc(d.title || '')}</div><div class="na">${esc(d.nation || '')}</div>
        ${bar('Health', d.hp, 220)}${bar('Speed', d.speed - 150, 110)}${bar('Difficulty', d.difficulty || 2, 3)}</div></div>
      <p class="desc">${esc(d.desc || '')}</p>
      ${d.passive ? `<div class="passive"><b>Passive — ${esc(d.passive.name)}:</b> ${esc(d.passive.desc)}</div>` : ''}
      <div class="abs">
        ${ab('basic', d.abilities.basic, 'LMB')}${ab('q', d.abilities.q, 'Q')}${ab('e', d.abilities.e, 'E')}${ab('r', d.abilities.r, 'R')}
        ${ab('dash', d.dash, 'SPACE')}${ab('ult', d.ult, 'F')}
      </div>`;
  },

  afterChar() {
    const s = this.sel;
    if (!isUnlocked(s.charId)) return;
    if (s.mode === 'story') this.intro();
    else if (s.mode === 'duel') this.foeSelect();
    else this.arenaSelect();
  },

  intro() {
    const s = this.sel; s.step = 'intro';
    const st = s.stage, bk = BOOKS[st.book - 1];
    const mod = st.modifier ? `<div class="modbox">${MOD_INFO[st.modifier].icon} <b>${MOD_INFO[st.modifier].name}</b> — ${MOD_INFO[st.modifier].desc}</div>` : '';
    this.show(`
      <div class="intro" style="--bc:${bk.color}">
        <div class="bk">${bk.icon} ${bk.name} · Chapter ${st.ch}</div>
        <h2>${esc(st.title)}</h2>
        <div class="loc">📍 ${esc(st.loc)}</div>
        <p class="story-text">${esc(st.intro)}</p>
        ${mod}
        <div class="tip">💡 ${esc(st.tip)}</div>
        <div class="row"><button class="btn" data-act="back">← Change hero</button><button class="btn big go" data-act="begin">Begin as ${esc(ROSTER[s.charId].name)} →</button></div>
      </div>`, 'introscr');
  },

  foeSelect() {
    const s = this.sel; s.step = 'foe';
    if (!s.foe) s.foe = pick(DUEL_FOES.filter(x => x !== s.charId));
    this.renderFoe();
  },

  renderFoe() {
    const s = this.sel;
    let grid = '';
    for (const id of DUEL_FOES) {
      const d = ROSTER[id];
      grid += `<div class="card ${s.foe === id ? 'sel' : ''}" data-act="pickFoe" data-id="${id}" style="--ec:${ELEMENT_COLORS[d.element]}">
        <canvas class="portrait" data-id="${id}" width="120" height="120"></canvas>
        <div class="nm">${esc(d.name)}</div><div class="el">${ELEMENT_ICONS[d.element]} ${esc(d.title || '')}</div></div>`;
    }
    const d = ROSTER[s.foe];
    this.show(`
      <div class="head"><button class="btn small" data-act="back">← Back</button><h2>Duel — Choose your opponent</h2><div></div></div>
      <div class="select">
        <div class="grid">${grid}</div>
        <div class="detail"><div class="dhead" style="--ec:${ELEMENT_COLORS[d.element]}"><canvas class="portrait big" data-id="${s.foe}" data-anim="1" width="170" height="170"></canvas>
          <div><h3>${esc(d.name)}</h3><div class="ti">${esc(d.title || '')}</div><div class="na">${esc(d.nation || '')}</div></div></div>
          <p class="desc">${esc(d.desc || '')}</p>
          <div class="vs">${esc(ROSTER[s.charId].name)} <span>VS</span> ${esc(d.name)}</div>
          <button class="btn big go" data-act="confirmFoe">Choose arena →</button></div>
      </div>`, 'select');
    this.attachPortraits();
  },

  arenaSelect() {
    const s = this.sel; s.step = 'arena';
    let html = '';
    for (const id of ARENAS) {
      const t = THEMES[id];
      html += `<button class="arena" data-act="arena" data-id="${id}" style="--a:${t.base};--b:${t.blotch[0]}"><span>${esc(t.name)}</span></button>`;
    }
    this.show(`<div class="head"><button class="btn small" data-act="back">← Back</button><h2>Choose an arena</h2><div></div></div>
      <div class="arenas">${html}</div>`, 'arenasel');
  },

  launch() {
    const s = this.sel;
    if (s.mode === 'story') Game.start({ mode: 'story', stage: s.stage, charId: s.charId, theme: s.stage.theme, modifier: s.stage.modifier });
    else if (s.mode === 'duel') Game.start({ mode: 'duel', charId: s.charId, foe: s.foe, theme: s.theme });
    else Game.start({ mode: 'survival', charId: s.charId, theme: s.theme });
  },

  howto(fromPause) {
    this.show(`
      <div class="head"><button class="btn small" data-act="${fromPause ? 'pauseBack' : 'title'}">← Back</button><h2>How to Play</h2><div></div></div>
      <div class="howto">
        <div class="col">
          <h3>Controls</h3>
          <table>
            <tr><td><kbd>W A S D</kbd> / arrows</td><td>Move</td></tr>
            <tr><td><kbd>Mouse</kbd></td><td>Aim</td></tr>
            <tr><td><kbd>Left click</kbd> (hold)</td><td>Basic attack</td></tr>
            <tr><td><kbd>Q</kbd> / <kbd>Right click</kbd></td><td>Ability 1</td></tr>
            <tr><td><kbd>E</kbd></td><td>Ability 2</td></tr>
            <tr><td><kbd>R</kbd></td><td>Ability 3</td></tr>
            <tr><td><kbd>Space</kbd> / <kbd>Shift</kbd></td><td>Dash (brief invulnerability)</td></tr>
            <tr><td><kbd>F</kbd></td><td>Ultimate (when the gold meter is full)</td></tr>
            <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>Pause</td></tr>
            <tr><td><kbd>M</kbd></td><td>Toggle music</td></tr>
          </table>
          <h3>Resources</h3>
          <p><b class="hp">Health</b> — run out and you're defeated. Grab <b>cabbages</b> 🥬 dropped by enemies to heal (sorry, cabbage merchant).</p>
          <p><b class="chi">Chi</b> — spent by abilities, regenerates over time. Glowing <b>chi orbs</b> restore it.</p>
          <p><b class="ult">Ultimate</b> — fills as you deal and take damage. <b>White Lotus tiles</b> give a big boost.</p>
        </div>
        <div class="col">
          <h3>Bending &amp; Combat</h3>
          <ul>
            <li><b>Water vs Fire:</b> water and fire projectiles that collide cancel out in a burst of steam.</li>
            <li><b>Clashes:</b> other colliding attacks cancel — heavier ones (boulders, Ozai's fire) overpower lighter ones.</li>
            <li><b>Earth walls</b> block projectiles. <b>Air</b> can reflect them. <b>Lightning</b> can be <b>redirected</b> by Zuko and Iroh.</li>
            <li><b>Chi-blocking:</b> Ty Lee's strikes temporarily stop benders from bending. Non-benders are immune.</li>
          </ul>
          <h3>Status effects</h3>
          <ul>
            <li>🔥 <b>Burn</b> — damage over time.</li>
            <li>❄️ <b>Slow</b> — reduced movement speed.</li>
            <li>⭐ <b>Stun</b> — can't move or act.</li>
            <li>📌 <b>Root</b> — can't move, but can still attack.</li>
          </ul>
          <h3>Celestial events</h3>
          <ul>
            <li>🌕 <b>Full Moon</b> — waterbending ×1.5.</li>
            <li>🌑 <b>Solar Eclipse</b> — nobody can firebend until it passes.</li>
            <li>☄️ <b>Sozin's Comet</b> — firebending ×1.5.</li>
          </ul>
          <h3>Bosses</h3>
          <p>Bosses resist crowd control and become <b>enraged</b> below half health, attacking faster.</p>
        </div>
      </div>`, 'howto-scr');
  },

  settings() {
    const s = Save.data.settings;
    const tg = (k, label) => `<button class="btn toggle ${s[k] ? 'on' : ''}" data-act="toggle" data-k="${k}">${label}: ${s[k] ? 'On' : 'Off'}</button>`;
    this.show(`
      <div class="head"><button class="btn small" data-act="title">← Back</button><h2>Settings</h2><div></div></div>
      <div class="settings">
        <h3>Difficulty</h3>
        <div class="row">${Object.entries(DIFFICULTY).map(([k, v]) => `<button class="btn ${s.diff === k ? 'on' : ''}" data-act="diff" data-v="${k}">${v.label}</button>`).join('')}</div>
        <h3>Audio &amp; display</h3>
        <div class="row">${tg('sfx', 'Sound effects')}${tg('music', 'Music')}${tg('numbers', 'Damage numbers')}</div>
        <h3>Progress</h3>
        <div class="row">${tg('unlockAll', 'Unlock all chapters & characters')}<button class="btn danger" data-act="reset">Reset progress</button></div>
      </div>`, 'settings-scr');
  },

  pauseMenu() {
    this.show(`<div class="pause"><h2>Paused</h2>
      <button class="btn big" data-act="resume">Resume</button>
      <button class="btn big" data-act="restart">Restart</button>
      <button class="btn" data-act="pauseHow">How to Play</button>
      <button class="btn" data-act="quit">Quit to Menu</button></div>`, 'pausescr');
  },

  results(b) {
    const win = b.result === 'win';
    const cfg = b.cfg;
    let extra = '';
    if (cfg.mode === 'story' && win) {
      if (b.newUnlocks && b.newUnlocks.length) extra += `<div class="unlock">🔓 New hero unlocked: <b>${b.newUnlocks.join(', ')}</b></div>`;
      const i = STAGES.findIndex(s => s.id === cfg.stage.id);
      if (i === STAGES.length - 1) extra += `<div class="unlock">🏆 You have restored balance to the world! Thanks for playing.</div>`;
    }
    if (cfg.mode === 'survival') extra += `<div class="unlock">Reached wave <b>${b.wave + 1}</b> · Score <b>${b.score}</b>${b.newBest ? ' — new record!' : ''}</div>`;
    const nextBtn = cfg.mode === 'story' && win && STAGES.findIndex(s => s.id === cfg.stage.id) < STAGES.length - 1
      ? '<button class="btn big go" data-act="next">Next Chapter →</button>' : '';
    const title = win ? (cfg.mode === 'story' ? 'Chapter Complete' : 'Victory!') : (cfg.mode === 'survival' ? 'The Battle Is Over' : 'Defeated');
    const quote = win ? pick(['Balance is restored.', 'Honor regained!', 'That\'s rough, buddy — for them.', 'The Avatar returns!']) :
      pick(['Even in the darkest times, hope can be found. Try again.', 'Pick yourself up. You\'ll get them next time.', 'Failure is only the opportunity to begin again.']);
    this.show(`<div class="results ${win ? 'win' : 'lose'}">
      <h2>${title}</h2><p class="quote">${esc(quote)}</p>
      <div class="stats">
        <div><span>Time</span><b>${fmtTime(b.stats.time)}</b></div>
        <div><span>Defeated</span><b>${b.stats.kills}</b></div>
        <div><span>Damage taken</span><b>${Math.round(b.stats.dmgTaken)}</b></div>
        <div><span>Score</span><b>${b.score}</b></div>
      </div>${extra}
      <div class="row">${nextBtn}<button class="btn big" data-act="restart">${win ? 'Play Again' : 'Retry'}</button><button class="btn" data-act="toMenu">Main Menu</button></div></div>`, 'resultscr');
  },

  // ---------------- portraits ----------------
  attachPortraits() {
    this.portraits = [...this.root.querySelectorAll('canvas.portrait')].map(c => ({ c, id: c.dataset.id, anim: !!c.dataset.anim }));
    this.tickPortraits(0, true);
  },
  tickPortraits(t, force) {
    for (const p of this.portraits) {
      if (!p.anim && !force) continue;
      const ctx = p.c.getContext('2d'), W = p.c.width, H = p.c.height;
      ctx.clearRect(0, 0, W, H);
      const d = ROSTER[p.id];
      const g = ctx.createRadialGradient(W / 2, H * 0.55, 5, W / 2, H * 0.55, W * 0.6);
      g.addColorStop(0, shade(ELEMENT_COLORS[d.element], -0.2)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const special = d.art.special === 'heibai' ? 0.95 : d.art.mount ? 1.25 : 1.75;
      const sc = special * (W / 120);
      const ang = p.anim ? Math.PI / 2 + Math.sin(t * 0.8) * 0.5 : Math.PI / 2;
      drawCharacter(ctx, d.art, W / 2, H * (d.art.special === 'heibai' ? 0.97 : 0.9), { scale: sc, ang, t: t, cast: p.anim ? (Math.sin(t * 2) + 1) * 0.3 : 0 });
    }
  },

  // ---------------- menu background ----------------
  drawMenuBg(ctx, g, dt) {
    const W = g.cssW, H = g.cssH, t = g.t;
    const bg = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H / 2, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#2a2038'); bg.addColorStop(1, '#0a080e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const P = g.menuParts;
    const els = [['air', 'wisp'], ['water', 'water'], ['earth', 'earth'], ['fire', 'fire']];
    const R = Math.min(W, H) * 0.36;
    els.forEach(([e, pt], i) => {
      const a = t * 0.25 + i * TAU / 4;
      const x = W / 2 + Math.cos(a) * R, y = H * 0.48 + Math.sin(a) * R * 0.55;
      if (Math.random() < 0.8) P.emit(pt, x, y, 1, { smax: 35, scale: 1.4 });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, y, 2, x, y, 60);
      gg.addColorStop(0, ELEMENT_COLORS[e]); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.35; ctx.fillStyle = gg; circle(ctx, x, y, 60); ctx.fill(); ctx.restore();
    });
    P.update(dt); P.draw(ctx);
  },

  // ---------------- HUD ----------------
  drawHUD(ctx, g) {
    const b = g.battle, w = g.world, p = b.player, W = g.cssW, H = g.cssH;
    ctx.save();
    // low HP vignette
    if (p.alive && p.hp / p.maxHp < 0.3) {
      const k = 0.35 + Math.sin(g.t * 6) * 0.1;
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, 'rgba(120,0,0,0)'); vg.addColorStop(1, `rgba(150,0,0,${k})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    this.drawPlayerPanel(ctx, p, w, g.t);
    this.drawAbilityBar(ctx, p, w, W, H);
    this.drawBossBars(ctx, b, W);
    this.drawObjective(ctx, b, w, W);
    this.drawMinimap(ctx, w, W, H, p);
    this.drawOffscreen(ctx, g, w, W, H);
    if (w.modifier) {
      const m = MOD_INFO[w.modifier];
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, W - 250, 14, 236, 44, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(`${m.icon} ${m.name}`, W - 26, 33);
      ctx.font = '12px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffd9a0'; ctx.fillText(m.desc, W - 26, 50);
    }
    const bn = b.bannerObj;
    if (bn) {
      const k = bn.t / bn.life;
      const a = Math.min(1, bn.t * 4, (bn.life - bn.t) * 2.5);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      const y = H * 0.32;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, y - 52, W, bn.sub ? 92 : 72);
      ctx.font = `bold ${Math.min(54, W / 16)}px Georgia, "Times New Roman", serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      const tx = W / 2 + (1 - Math.min(1, bn.t * 3)) * 40;
      ctx.strokeText(bn.text, tx, y); ctx.fillStyle = bn.color; ctx.fillText(bn.text, tx, y);
      if (bn.sub) { ctx.font = 'italic 18px Georgia, serif'; ctx.fillStyle = '#eee'; ctx.fillText(bn.sub, W / 2, y + 30); }
      ctx.globalAlpha = 1; void k;
    }
    ctx.restore();
  },

  drawPlayerPanel(ctx, p, w, t) {
    const x = 16, y = 14;
    ctx.fillStyle = 'rgba(10,8,14,0.6)'; roundRect(ctx, x, y, 300, 92, 12); ctx.fill();
    ctx.strokeStyle = ELEMENT_COLORS[p.def.element]; ctx.lineWidth = 2; roundRect(ctx, x, y, 300, 92, 12); ctx.stroke();
    // portrait
    ctx.save(); circle(ctx, x + 46, y + 46, 36); ctx.clip();
    ctx.fillStyle = shade(ELEMENT_COLORS[p.def.element], -0.5); ctx.fillRect(x + 8, y + 8, 76, 76);
    drawCharacter(ctx, p.def.art, x + 46, y + 128 - (p.def.art.mount ? 0 : 0), { scale: p.def.art.mount ? 1.5 : 2.3, ang: Math.PI / 2, t, noShadow: true, avatar: p.has('avatar') });
    ctx.restore();
    ctx.textAlign = 'left'; ctx.font = 'bold 16px Georgia, serif'; ctx.fillStyle = '#fff';
    ctx.fillText(p.def.name, x + 92, y + 24);
    const bar = (by, v, max, c1, c2, label) => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, x + 92, by, 196, 13, 6); ctx.fill();
      const gr = ctx.createLinearGradient(x + 92, 0, x + 288, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      ctx.fillStyle = gr; roundRect(ctx, x + 92, by, Math.max(0, 196 * clamp(v / max, 0, 1)), 13, 6); ctx.fill();
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(label, x + 98, by + 10);
    };
    bar(y + 34, p.hp, p.maxHp, '#c0392b', '#ff6b5a', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    bar(y + 52, p.chi, p.maxChi, shade(ELEMENT_COLORS[p.def.element], -0.3), ELEMENT_COLORS[p.def.element], `Chi ${Math.floor(p.chi)}`);
    const full = p.ult >= 100;
    bar(y + 70, p.ult, 100, '#b8860b', full ? `hsl(${(t * 200) % 360},90%,65%)` : '#ffd700', full ? 'ULTIMATE READY — F' : `Ultimate ${Math.floor(p.ult)}%`);
    // statuses
    const st = []; if (p.status.burn) st.push('🔥'); if (p.status.slow) st.push('❄️'); if (p.status.stun > 0) st.push('⭐'); if (p.status.root > 0) st.push('📌'); if (p.status.chiBlock > 0) st.push('⊘');
    if (st.length) { ctx.font = '16px sans-serif'; ctx.fillText(st.join(' '), x + 8, y + 112); }
  },

  drawAbilityBar(ctx, p, w, W, H) {
    const slots = [['basic', 'LMB'], ['q', 'Q'], ['e', 'E'], ['r', 'R'], ['dash', 'SPACE'], ['ult', 'F']];
    const S = 58, gap = 10, total = slots.length * S + (slots.length - 1) * gap;
    let x = W / 2 - total / 2; const y = H - S - 26;
    ctx.fillStyle = 'rgba(10,8,14,0.55)'; roundRect(ctx, x - 10, y - 10, total + 20, S + 32, 12); ctx.fill();
    for (const [slot, key] of slots) {
      const ab = p.ability(slot, w);
      if (!ab) { x += S + gap; continue; }
      const isUlt = slot === 'ult';
      const ready = isUlt ? p.ult >= 100 : p.cd[slot] <= 0;
      const blocked = slot === 'dash' ? null : p.blocked(ab, w);
      const noChi = (ab.chi || 0) > p.chi;
      ctx.fillStyle = 'rgba(10,8,14,0.75)'; roundRect(ctx, x, y, S, S, 10); ctx.fill();
      if (isUlt) {
        const k = clamp(p.ult / 100, 0, 1);
        ctx.save(); roundRect(ctx, x, y, S, S, 10); ctx.clip();
        ctx.fillStyle = ready ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.22)'; ctx.fillRect(x, y + S * (1 - k), S, S * k);
        ctx.restore();
      }
      ctx.font = '28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = blocked ? 0.3 : 1;
      ctx.fillStyle = '#fff'; ctx.fillText(ab.icon || '•', x + S / 2, y + S / 2 - 2);
      ctx.globalAlpha = 1;
      if (!isUlt && p.cd[slot] > 0) {
        const k = clamp(p.cd[slot] / (p.cdMax[slot] || 1), 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(x + S / 2, y + S / 2); ctx.arc(x + S / 2, y + S / 2, S * 0.75, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.closePath();
        ctx.save(); roundRect(ctx, x, y, S, S, 10); ctx.clip(); ctx.fill(); ctx.restore();
        if (p.cd[slot] > 0.5) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(p.cd[slot].toFixed(p.cd[slot] < 10 ? 1 : 0), x + S / 2, y + S / 2); }
      }
      if (noChi && !blocked) { ctx.fillStyle = 'rgba(40,80,200,0.35)'; roundRect(ctx, x, y, S, S, 10); ctx.fill(); }
      if (blocked) { ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + S - 10, y + S - 10); ctx.stroke(); }
      ctx.strokeStyle = ready && !blocked ? (isUlt ? '#ffd700' : ELEMENT_COLORS[p.def.element]) : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = isUlt && ready ? 3 : 2; roundRect(ctx, x, y, S, S, 10); ctx.stroke();
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,0.7)'; roundRect(ctx, x + 2, y + S - 15, Math.max(18, key.length * 7 + 6), 13, 4); ctx.fill();
      ctx.fillStyle = '#ffe7b0'; ctx.textAlign = 'left'; ctx.fillText(key, x + 5, y + S - 5);
      ctx.textAlign = 'center'; ctx.font = '10px sans-serif'; ctx.fillStyle = '#ddd';
      ctx.fillText(ab.name.length > 16 ? ab.name.slice(0, 15) + '…' : ab.name, x + S / 2, y + S + 13);
      x += S + gap;
    }
  },

  drawBossBars(ctx, b, W) {
    const list = b.bosses.filter(f => f.alive || f.deathT < 1);
    list.forEach((f, i) => {
      const bw = Math.min(520, W * 0.45), x = W / 2 - bw / 2, y = 22 + i * 44;
      ctx.fillStyle = 'rgba(10,8,14,0.7)'; roundRect(ctx, x - 8, y - 4, bw + 16, 38, 8); ctx.fill();
      ctx.textAlign = 'center'; ctx.font = 'bold 13px Georgia, serif'; ctx.fillStyle = f.enraged ? '#ff8a6a' : '#ffe7b0';
      ctx.fillText(`${f.def.name}${f.def.title ? ' — ' + f.def.title : ''}${f.enraged ? '  (ENRAGED)' : ''}`, W / 2, y + 10);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, x, y + 16, bw, 12, 5); ctx.fill();
      const gr = ctx.createLinearGradient(x, 0, x + bw, 0); gr.addColorStop(0, '#7a1010'); gr.addColorStop(1, ELEMENT_COLORS[f.def.element] || '#e0483a');
      ctx.fillStyle = gr; roundRect(ctx, x, y + 16, Math.max(0, bw * f.hp / f.maxHp), 12, 5); ctx.fill();
      if (f.boss) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + bw / 2 - 1, y + 16, 2, 12); }
    });
  },

  drawObjective(ctx, b, w, W) {
    let txt = '';
    const left = w.fighters.filter(f => f.alive && f.team !== 0).length + b.pending;
    if (b.cfg.mode === 'survival') txt = `Wave ${b.wave + 1} · Enemies ${left} · Score ${b.score}`;
    else if (b.phase === 'wave') txt = `Wave ${b.wave + 1} / ${b.waveCount()} · Enemies remaining: ${left}`;
    else if (b.phase === 'between') txt = b.bossNext ? 'Something powerful approaches…' : 'Next wave incoming…';
    else if (b.phase === 'intro') txt = b.cfg.mode === 'duel' ? 'Prepare yourself…' : (b.cfg.stage ? b.cfg.stage.loc : '');
    if (!txt || b.bosses.some(f => f.alive) && b.cfg.mode !== 'survival') return;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(txt).width + 30;
    ctx.fillStyle = 'rgba(10,8,14,0.6)'; roundRect(ctx, W / 2 - tw / 2, 16 + (b.bosses.filter(f => f.alive).length * 44), tw, 28, 14); ctx.fill();
    ctx.fillStyle = '#ffe7b0'; ctx.fillText(txt, W / 2, 35 + (b.bosses.filter(f => f.alive).length * 44));
  },

  drawMinimap(ctx, w, W, H, p) {
    const mw = 170, mh = mw * w.H / w.W, x = W - mw - 16, y = H - mh - 16;
    ctx.fillStyle = 'rgba(10,8,14,0.6)'; roundRect(ctx, x - 4, y - 4, mw + 8, mh + 8, 8); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.drawImage(w.ground, x, y, mw, mh); ctx.globalAlpha = 1;
    const sx = mw / w.W, sy = mh / w.H;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (const o of w.obstacles) { if (o.solid === false) continue; circle(ctx, x + o.x * sx, y + o.y * sy, Math.max(1.5, o.r * sx)); ctx.fill(); }
    const v = w.view;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + (v.x - v.w / 2) * sx, y + (v.y - v.h / 2) * sy, v.w * sx, v.h * sy);
    for (const f of w.fighters) {
      if (!f.alive) continue;
      ctx.fillStyle = f === p ? '#7dff9a' : f.boss || f.showBar ? '#ff4a4a' : '#ffb070';
      circle(ctx, x + f.x * sx, y + f.y * sy, f === p ? 3.5 : f.boss || f.showBar ? 4 : 2.5); ctx.fill();
    }
    for (const pk of w.pickups) { ctx.fillStyle = pk.type === 'cabbage' ? '#7cc56b' : pk.type === 'chi' ? '#7fe0ff' : '#fff'; ctx.fillRect(x + pk.x * sx - 1.5, y + pk.y * sy - 1.5, 3, 3); }
  },

  drawOffscreen(ctx, g, w, W, H) {
    const z = g.cam.zoom;
    for (const f of w.fighters) {
      if (!f.alive || f.team === 0) continue;
      const sx = (f.x - g.cam.x) * z + W / 2, sy = (f.y - 20 - g.cam.y) * z + H / 2;
      if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      const ex = clamp(sx, 30, W - 30), ey = clamp(sy, 30, H - 30);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = f.boss || f.showBar ? 'rgba(255,60,60,0.9)' : 'rgba(255,170,90,0.8)';
      const s = f.boss || f.showBar ? 12 : 8;
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7); ctx.fill();
      ctx.restore();
    }
  },
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2, '0')}`; }
