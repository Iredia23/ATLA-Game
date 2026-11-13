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
