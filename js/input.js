'use strict';
const Input = {
  down: new Set(), pressed: new Set(), mx: 0, my: 0, mdown: [false, false, false], mclick: [false, false, false],
  init(canvas) {
    addEventListener('keydown', e => {
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (typeof Game !== 'undefined' && Game.state === 'play' &&
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      Sound.init();
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.mdown = [false, false, false]; });
    canvas.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
    canvas.addEventListener('mousedown', e => {
      this.mdown[e.button] = true; this.mclick[e.button] = true; Sound.init();
    });
    addEventListener('mouseup', e => { this.mdown[e.button] = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('pointerdown', () => Sound.init(), { once: true });
  },
  key(c) { return this.down.has(c); },
  hit(c) { return this.pressed.has(c); },
  end() { this.pressed.clear(); this.mclick = [false, false, false]; },
};

// ---------------- Gamepad (standard mapping: Xbox / PlayStation / generic USB pads) ----------------
// buttons: 0 A/✕  1 B/○  2 X/□  3 Y/△  4 LB  5 RB  6 LT  7 RT  8 Back  9 Start  12-15 D-pad ↑↓←→
Input.pad = { connected: false, active: false, id: '', btn: [], prev: [], axes: [0, 0, 0, 0], gp: null };

Input.pollPad = function () {
  const P = this.pad;
  let gp = null;
  try {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of list) if (g && g.connected) { gp = g; break; }
  } catch (e) { gp = null; }
  P.prev = P.btn;
  if (!gp) {
    if (P.connected) { P.connected = false; P.active = false; UI.toast('🎮 Controller disconnected'); }
    P.btn = []; P.axes = [0, 0, 0, 0]; P.gp = null;
    return;
  }
  if (!P.connected) { P.connected = true; P.id = gp.id; UI.toast('🎮 Controller connected'); }
  P.gp = gp;
  P.btn = gp.buttons.map(b => b.pressed || b.value > 0.5);
  P.axes = [0, 1, 2, 3].map(i => gp.axes[i] || 0);
  if (P.btn.some(Boolean) || P.axes.some(a => Math.abs(a) > 0.4)) { P.active = true; Sound.init(); }
};
Input.padDown = function (i) { return !!this.pad.btn[i]; };
Input.padHit = function (i) { return !!this.pad.btn[i] && !this.pad.prev[i]; };
// radial dead zone, rescaled so movement starts smoothly just outside it
Input.stick = function (which) {
  const a = this.pad.axes, x = which ? a[2] : a[0], y = which ? a[3] : a[1];
  const m = Math.hypot(x, y), dz = 0.2;
  if (m < dz) return [0, 0, 0];
  const k = Math.min(1, (m - dz) / (1 - dz)) / m;
  return [x * k, y * k, Math.min(1, (m - dz) / (1 - dz))];
};
Input.rumble = function (strength, ms) {
  const gp = this.pad.gp;
  if (!gp || !this.pad.active || !gp.vibrationActuator) return;
  try { gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strength, 0, 1), weakMagnitude: clamp(strength * 0.6, 0, 1) }); } catch (e) { /* not supported */ }
};
// any keyboard or mouse use hands control (and on-screen prompts) back to keyboard + mouse
addEventListener('keydown', () => { Input.pad.active = false; });
addEventListener('mousemove', () => { Input.pad.active = false; });
addEventListener('mousedown', () => { Input.pad.active = false; });
