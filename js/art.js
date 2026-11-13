'use strict';
// All visuals are drawn procedurally with canvas primitives.

function drawCharacter(ctx, art, x, y, o = {}) {
  const s = o.scale || 1, ang = o.ang ?? Math.PI / 2, t = o.t || 0;
  const fx = Math.cos(ang), fy = Math.sin(ang);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha = Math.max(0, o.alpha);
  if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(ctx, 0, 1, art.special === 'heibai' ? 34 : art.mount ? 26 : 15, art.special === 'heibai' ? 12 : 7); ctx.fill(); }
  if (o.dead) ctx.rotate(Math.min(1, o.deadT * 4) * 1.3 * (fx >= 0 ? -1 : 1));
  if (o.flash) ctx.filter = 'brightness(2.4)';
  if (art.special === 'heibai') { drawHeiBai(ctx, fx, fy, t, o); ctx.restore(); return; }
  if (art.special === 'wisp') { drawWisp(ctx, fx, fy, t); ctx.restore(); return; }
  if (art.mount === 'rhino') { drawRhino(ctx, ang, t, o.moving, art); ctx.translate(0, -18); }
  if (o.hover) ctx.translate(0, -o.hover);

  if (o.glow) {
    const g = ctx.createRadialGradient(0, -24, 4, 0, -24, 42);
    g.addColorStop(0, o.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, -24, 42); ctx.fill();
  }
  const step = o.moving ? Math.sin(t * 14) : 0;
  const bob = o.moving ? -Math.abs(Math.sin(t * 14)) * 1.5 : Math.sin(t * 3) * 0.5;
  if (!art.mount) {
    ctx.fillStyle = art.pants || shade(art.c1, -0.35);
    ellipse(ctx, -5, -4 + step * 2.2, 4, 5.5); ctx.fill();
    ellipse(ctx, 5, -4 - step * 2.2, 4, 5.5); ctx.fill();
    ctx.fillStyle = art.shoes || '#3b2a1e';
    ellipse(ctx, -5, -1 + step * 2.2, 3.6, 2.4); ctx.fill();
    ellipse(ctx, 5, -1 - step * 2.2, 3.6, 2.4); ctx.fill();
  }
  ctx.translate(0, bob);
  const back = fy < -0.25;
  if (!back) drawHairBack(ctx, art, fx, fy, t);
  if (back) drawArms(ctx, art, fx, fy, o);
  drawTorso(ctx, art, fx, fy, back, o);
  if (!back) drawArms(ctx, art, fx, fy, o);
  drawHead(ctx, art, fx, fy, o, t);
  if (back) drawHairBack(ctx, art, fx, fy, t);
  if (o.armor) {
    ctx.strokeStyle = 'rgba(200,210,220,0.9)'; ctx.lineWidth = 2;
    roundRect(ctx, -13, -28, 26, 25, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(150,160,170,0.55)'; roundRect(ctx, -13, -28, 26, 25, 8); ctx.fill();
  }
  ctx.restore();
}

function drawTorso(ctx, art, fx, fy, back, o) {
  const tw = art.bulk ? 27 : 22;
  ctx.fillStyle = art.c1; roundRect(ctx, -tw / 2, -28, tw, 24, 8); ctx.fill();
  if (art.robe) { ctx.fillStyle = art.c1; ctx.beginPath(); ctx.moveTo(-tw / 2, -10); ctx.lineTo(-tw / 2 - 3, -2); ctx.lineTo(tw / 2 + 3, -2); ctx.lineTo(tw / 2, -10); ctx.fill(); }
  if (art.cape) { ctx.fillStyle = art.c2; roundRect(ctx, -tw / 2 - 1.5, -29, tw + 3, 9, 4.5); ctx.fill(); }
  ctx.fillStyle = art.c3 || shade(art.c1, -0.4); ctx.fillRect(-tw / 2, -13, tw, 4);
  if (!back && !art.cape) {
    ctx.fillStyle = art.c2;
    ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(0, -20); ctx.lineTo(5, -28); ctx.closePath(); ctx.fill();
  }
  if (art.armor) {
    ctx.fillStyle = art.c2;
    circle(ctx, -tw / 2, -25, 5.5); ctx.fill(); circle(ctx, tw / 2, -25, 5.5); ctx.fill();
    ctx.fillStyle = shade(art.c2, 0.2); ctx.fillRect(-tw / 2 + 3, -24, tw - 6, 3);
  }
  if (back && art.backItem === 'boomerang') {
    ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -26); ctx.quadraticCurveTo(0, -14, 8, -26); ctx.stroke();
  }
  if (art.crest && !back) { // nation emblem dot
    ctx.fillStyle = art.crest; circle(ctx, 0, -18, 2.4); ctx.fill();
  }
}

function drawArms(ctx, art, fx, fy, o) {
  const cast = o.cast || 0;
  const reach = 5 + cast * 12;
  ctx.lineCap = 'round';
  const hands = [];
  for (const side of [-1, 1]) {
    const sx = side * 10, sy = -24;
    const px = -fy * side, py = fx * side;
    const hx = side * 7 + fx * reach + px * 3.5;
    const hy = -17 + fy * reach * 0.55 + py * 2 + (o.moving ? Math.sin((o.t || 0) * 14 + side) * 1.5 : 0);
    ctx.strokeStyle = art.sleeve || art.c1; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    if (art.metalArm && side === 1) { ctx.strokeStyle = '#8d959c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke(); }
    ctx.fillStyle = art.gloves || art.skin; circle(ctx, hx, hy, 3.6); ctx.fill();
    hands.push([hx, hy]);
  }
  const [lh, rh] = hands;
  const w = o.weapon || art.weapon;
  ctx.lineCap = 'round';
  if (o.dao) {
    ctx.strokeStyle = '#dfe6ec'; ctx.lineWidth = 2.5;
    for (const [hx, hy] of hands) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + fx * 20, hy + fy * 14 - 4); ctx.stroke(); }
  } else if (w === 'sword') {
    ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(rh[0], rh[1]); ctx.lineTo(rh[0] + fx * 22, rh[1] + fy * 15 - 6); ctx.stroke();
    ctx.strokeStyle = '#b3a07a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rh[0] - fx * 4, rh[1] - fy * 3); ctx.lineTo(rh[0], rh[1]); ctx.stroke();
  } else if (w === 'staff') {
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(lh[0], lh[1] + 12); ctx.lineTo(lh[0], lh[1] - 30); ctx.stroke();
    ctx.fillStyle = '#e07b1e'; ctx.fillRect(lh[0] - 2.5, lh[1] - 27, 5, 9);
  } else if (w === 'spear') {
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(rh[0] - fx * 16, rh[1] - fy * 10); ctx.lineTo(rh[0] + fx * 26, rh[1] + fy * 16 - 2); ctx.stroke();
    ctx.fillStyle = '#c9ced4'; circle(ctx, rh[0] + fx * 27, rh[1] + fy * 17 - 2, 2.6); ctx.fill();
  } else if (w === 'bow') {
    ctx.strokeStyle = '#4a2f1a'; ctx.lineWidth = 2;
    const a = Math.atan2(fy, fx);
    ctx.beginPath(); ctx.arc(lh[0], lh[1], 10, a - 1.1, a + 1.1); ctx.stroke();
  } else if (w === 'chain') {
    ctx.strokeStyle = '#9aa1a6'; ctx.lineWidth = 1.6; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(rh[0], rh[1]); ctx.quadraticCurveTo(rh[0] + 10, rh[1] + 12, rh[0] + fx * 18, rh[1] + fy * 12 + 6); ctx.stroke();
    ctx.setLineDash([]);
  } else if (w === 'fans') {
    ctx.fillStyle = '#d9b45a';
    for (const [hx, hy] of hands) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, 8, Math.atan2(fy, fx) - 0.7, Math.atan2(fy, fx) + 0.7); ctx.fill(); }
  }
}

function drawHairBack(ctx, art, fx, fy, t) {
  const hc = art.hairColor || '#2a1d14';
  const sway = Math.sin(t * 4) * 1.5;
  ctx.lineCap = 'round';
  if (art.hair === 'katara' || art.hair === 'tylee') {
    ctx.strokeStyle = hc; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(-fx * 5, -32); ctx.quadraticCurveTo(-fx * 9 + sway, -22, -fx * 7 + sway, art.hair === 'tylee' ? -6 : -12); ctx.stroke();
    if (art.hair === 'tylee') { ctx.fillStyle = '#f7a8c8'; circle(ctx, -fx * 7 + sway, -6, 2.4); ctx.fill(); }
  } else if (art.hair === 'ozai') {
    ctx.fillStyle = hc; roundRect(ctx, -10, -40, 20, 28, 8); ctx.fill();
  } else if (art.hair === 'sokka') {
    ctx.strokeStyle = hc; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-fx * 2, -47); ctx.lineTo(-fx * 6 + sway * 0.5, -42); ctx.stroke();
  }
}

function drawHead(ctx, art, fx, fy, o, t) {
  const hy = -38, hr = art.headR || 11;
  const hc = art.hairColor || '#2a1d14';
  const style = art.hair;
  const bald = style === 'bald' || style === 'combust';
  ctx.fillStyle = bald ? art.skin : (style === 'helmet' ? (art.helmet || '#3a1414') : hc);
  circle(ctx, 0, hy, hr); ctx.fill();
  const vis = clamp((fy + 0.7) / 1.1, 0, 1);
  const fxo = fx * 3.4, fyo = 2.4 + fy * 1.4;
  if (vis > 0.02 && !bald) {
    ctx.fillStyle = art.skin;
    ellipse(ctx, fxo, hy + fyo, hr * 0.8 * (0.6 + 0.4 * vis), hr * 0.68 * (0.7 + 0.3 * vis)); ctx.fill();
  }
  // Hair detail in front
  ctx.lineCap = 'round';
  switch (style) {
    case 'katara':
      if (vis > 0.1) {
        ctx.strokeStyle = hc; ctx.lineWidth = 2.2;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(fxo + sd * 7.6, hy + 4, 2.6, 0, TAU); ctx.stroke(); }
      }
      break;
    case 'sokka':
      ctx.fillStyle = hc; ellipse(ctx, 0, hy - 8, 6, 4); ctx.fill();
      circle(ctx, -fx * 2, hy - 11, 3.4); ctx.fill();
      break;
    case 'zuko':
      if (vis > 0.15) {
        ctx.fillStyle = hc;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(fxo + i * 3.5 - 2.5, hy - 5); ctx.lineTo(fxo + i * 3.5, hy + 0.5); ctx.lineTo(fxo + i * 3.5 + 2.5, hy - 5); ctx.fill(); }
      }
      break;
    case 'toph':
      ctx.fillStyle = hc; circle(ctx, -fx * 1.5, hy - hr + 1, 4.8); ctx.fill();
      if (vis > 0.1) {
        ctx.strokeStyle = '#5bb04f'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.ellipse(fxo * 0.6, hy - 3, hr * 0.85, 3.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.fillStyle = hc; ctx.fillRect(fxo - 7, hy - 4, 14, 2.5);
      }
      break;
    case 'azula': case 'ozai': case 'zhao':
      ctx.fillStyle = hc; circle(ctx, -fx * 1.5, hy - hr + 0.5, 4.2); ctx.fill();
      if (style !== 'zhao') { ctx.fillStyle = '#e8b830'; ctx.beginPath(); ctx.moveTo(-fx * 1.5 - 2.5, hy - hr - 2); ctx.lineTo(-fx * 1.5, hy - hr - 9); ctx.lineTo(-fx * 1.5 + 2.5, hy - hr - 2); ctx.fill(); }
      if (vis > 0.2 && style === 'azula') {
        ctx.strokeStyle = hc; ctx.lineWidth = 2;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fxo + sd * 6, hy - 3); ctx.lineTo(fxo + sd * 7.5, hy + 8); ctx.stroke(); }
      }
      if (vis > 0.2 && style === 'zhao') {
        ctx.fillStyle = hc;
        for (const sd of [-1, 1]) { ellipse(ctx, fxo + sd * 7.5, hy + 5, 2.6, 5); ctx.fill(); }
      }
      break;
    case 'iroh':
      ctx.fillStyle = hc; circle(ctx, -fx * 1.5, hy - hr + 1, 3.6); ctx.fill();
      break;
    case 'mai':
      ctx.fillStyle = hc;
      circle(ctx, -9, hy - 7, 4.5); ctx.fill(); circle(ctx, 9, hy - 7, 4.5); ctx.fill();
      if (vis > 0.2) ctx.fillRect(fxo - 7.5, hy - 5, 15, 3.5);
      break;
    case 'tylee':
      if (vis > 0.2) { ctx.fillStyle = hc; ctx.fillRect(fxo - 7, hy - 5, 14, 3); }
      break;
    case 'helmet':
      ctx.fillStyle = shade(art.helmet || '#3a1414', -0.3); ctx.fillRect(-2, hy - hr - 2, 4, 9);
      if (vis > 0.1) {
        ctx.fillStyle = art.mask || '#e8e2d6';
        ellipse(ctx, fxo, hy + fyo, hr * 0.72 * (0.6 + 0.4 * vis), hr * 0.62); ctx.fill();
        ctx.fillStyle = '#1a1010';
        const sp = 3.4 * (1 - 0.4 * Math.abs(fx));
        ellipse(ctx, fx * 4 - sp, hy + 2 + fy, 1.8, 2.2); ctx.fill();
        ellipse(ctx, fx * 4 + sp, hy + 2 + fy, 1.8, 2.2); ctx.fill();
        ctx.fillRect(fx * 4 - 2.5, hy + 7, 5, 1.2);
      }
      break;
  }
  // Eyes
  const eyesHidden = style === 'helmet' || (o.mask === 'blue');
  if (vis > 0.25 && !eyesHidden) {
    const sp = 3.7 * (1 - 0.45 * Math.abs(fx));
    const ex = fx * 4.4, ey = hy + 3 + fy * 1.2;
    if (art.scar) { ctx.fillStyle = 'rgba(196,84,72,0.85)'; ellipse(ctx, ex + sp + 0.5, ey - 0.5, 4, 3.4); ctx.fill(); }
    if (o.avatar) {
      ctx.save(); ctx.shadowColor = '#bff6ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#f4feff';
      ellipse(ctx, ex - sp, ey, 2.2, 1.6); ctx.fill(); ellipse(ctx, ex + sp, ey, 2.2, 1.6); ctx.fill(); ctx.restore();
    } else {
      ctx.fillStyle = art.eye || '#1d1712';
      ellipse(ctx, ex - sp, ey, 1.5, 2); ctx.fill(); ellipse(ctx, ex + sp, ey, 1.5, 2); ctx.fill();
    }
    if (style === 'combust') { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; circle(ctx, fx * 3.5, hy - 4, 2.6); ctx.stroke(); }
  }
  if (o.mask === 'blue' && vis > 0.1) {
    ctx.fillStyle = '#2b5fb8'; ellipse(ctx, fxo, hy + 1.5, 8.6 * (0.6 + 0.4 * vis), 9.2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(fxo - 4, hy + 6, 8, 1.6);
    ctx.fillStyle = '#111'; ellipse(ctx, fxo - 3, hy + 0.5, 1.8, 2.2); ctx.fill(); ellipse(ctx, fxo + 3, hy + 0.5, 1.8, 2.2); ctx.fill();
  }
  // Beards
  if (art.beard && vis > 0.2) {
    ctx.fillStyle = art.beard;
    if (style === 'iroh') { ellipse(ctx, fxo, hy + 8, 7.5, 5.5); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(fxo - 3, hy + 7); ctx.lineTo(fxo, hy + 15); ctx.lineTo(fxo + 3, hy + 7); ctx.fill(); }
  }
  // Air Nomad arrow
  if (art.arrow) {
    const col = o.avatar ? '#e9fdff' : '#3c8fe0';
    ctx.save();
    if (o.avatar) { ctx.shadowColor = '#9ff0ff'; ctx.shadowBlur = 12; }
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.4;
    const sx = -fx * 4, sy = hy - hr + 1.5, tx = fx * 3.4, ty = hy - 2.5 + fy * 1.8;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    const a = Math.atan2(ty - sy, tx - sx);
    ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * 3.5, ty + Math.sin(a) * 3.5);
    ctx.lineTo(tx + Math.cos(a + 2.3) * 4.5, ty + Math.sin(a + 2.3) * 4.5);
    ctx.lineTo(tx + Math.cos(a - 2.3) * 4.5, ty + Math.sin(a - 2.3) * 4.5); ctx.fill();
    ctx.restore();
  }
  // Hats
  if (art.hat === 'daili') {
    ctx.fillStyle = '#123b22'; ellipse(ctx, 0, hy - 5, 17, 7); ctx.fill();
    ctx.fillStyle = '#0b1f12'; ellipse(ctx, 0, hy - 8, 8, 5); ctx.fill();
    ctx.strokeStyle = '#2d6b3e'; ctx.lineWidth = 1; ellipse(ctx, 0, hy - 5, 17, 7); ctx.stroke();
  }
}

function drawRhino(ctx, ang, t, moving, art) {
  ctx.save();
  ctx.scale(1, 0.8);
  ctx.rotate(ang);
  const step = moving ? Math.sin(t * 12) * 4 : 0;
  ctx.fillStyle = '#4c5640';
  for (const [lx, ly, ph] of [[12, -12, 1], [12, 12, -1], [-12, -12, -1], [-12, 12, 1]]) { ellipse(ctx, lx + step * ph, ly, 5, 4); ctx.fill(); }
  ctx.fillStyle = art.rhinoColor || '#6f7a5a'; ellipse(ctx, 0, 0, 28, 15); ctx.fill();
  ctx.fillStyle = shade(art.rhinoColor || '#6f7a5a', -0.15);
  for (let i = -2; i <= 2; i++) { circle(ctx, i * 8, 0, 3); ctx.fill(); }
  ctx.fillStyle = art.rhinoColor || '#6f7a5a'; ellipse(ctx, 27, 0, 11, 9); ctx.fill();
  ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(34, -3); ctx.lineTo(46, 0); ctx.lineTo(34, 3); ctx.fill();
  ctx.fillStyle = '#4c5640'; ctx.beginPath(); ctx.moveTo(-27, -3); ctx.lineTo(-38, 0); ctx.lineTo(-27, 3); ctx.fill();
  ctx.fillStyle = '#7a2a1a'; ellipse(ctx, -2, 0, 10, 12); ctx.fill();
  ctx.restore();
}

function drawHeiBai(ctx, fx, fy, t, o) {
  const sway = Math.sin(t * 3);
  ctx.save();
  // spidery spirit legs
  ctx.strokeStyle = '#121016'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const lx = Math.cos(a) * 36 + Math.sin(t * 6 + i) * 4, ly = Math.sin(a) * 12 + 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, -30 + Math.sin(a) * 6); ctx.quadraticCurveTo(Math.cos(a) * 40, -50, lx, ly); ctx.stroke();
  }
  ctx.fillStyle = '#16131c'; ellipse(ctx, 0, -36 + sway, 26, 22); ctx.fill();
  ctx.fillStyle = '#f2efe8'; ellipse(ctx, 0, -32 + sway, 14, 12); ctx.fill();
  // head
  const hx = fx * 6, hy = -62 + sway + fy * 3;
  ctx.fillStyle = '#f2efe8'; circle(ctx, hx, hy, 17); ctx.fill();
  ctx.fillStyle = '#16131c';
  circle(ctx, hx - 13, hy - 13, 6); ctx.fill(); circle(ctx, hx + 13, hy - 13, 6); ctx.fill();
  ellipse(ctx, hx - 6 + fx * 3, hy + 1, 5, 6.5, -0.4); ctx.fill(); ellipse(ctx, hx + 6 + fx * 3, hy + 1, 5, 6.5, 0.4); ctx.fill();
  ctx.save(); ctx.shadowColor = '#ff3355'; ctx.shadowBlur = 10; ctx.fillStyle = o.enraged ? '#ff2244' : '#ffd23f';
  circle(ctx, hx - 6 + fx * 3, hy + 1, 1.8); ctx.fill(); circle(ctx, hx + 6 + fx * 3, hy + 1, 1.8); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#16131c'; ellipse(ctx, hx + fx * 3, hy + 8, 3, 2); ctx.fill();
  ctx.restore();
}

function drawWisp(ctx, fx, fy, t) {
  const b = Math.sin(t * 6) * 2;
  ctx.fillStyle = 'rgba(20,14,30,0.9)';
  ctx.beginPath(); ctx.moveTo(-10, -18 + b);
  ctx.quadraticCurveTo(0, -42 + b, 10, -18 + b);
  ctx.quadraticCurveTo(6, -6, 0, -2 + Math.sin(t * 9) * 3);
  ctx.quadraticCurveTo(-6, -6, -10, -18 + b); ctx.fill();
  ctx.fillStyle = '#e9e2ff';
  circle(ctx, fx * 3 - 3, -24 + b, 1.8); ctx.fill(); circle(ctx, fx * 3 + 3, -24 + b, 1.8); ctx.fill();
}

function drawAppa(ctx, x, y, ang, t, s = 1, alt = 70) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ellipse(ctx, 0, 0, 95 * s, 50 * s, ang); ctx.fill();
  ctx.translate(0, -alt);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const flap = Math.sin(t * 5) * 5;
  // tail
  ctx.fillStyle = '#efe9dc'; ellipse(ctx, -82, 0, 22, 34 + flap); ctx.fill();
  ctx.fillStyle = '#8a5a32';
  ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-92, -14); ctx.lineTo(-86, 0); ctx.lineTo(-92, 14); ctx.closePath(); ctx.fill();
  // legs
  ctx.fillStyle = '#d8d0c0';
  for (const lx of [-35, 0, 35]) for (const sd of [-1, 1]) { ellipse(ctx, lx, sd * 44, 11, 8); ctx.fill(); }
  // body + fluff
  ctx.fillStyle = '#f5f0e6';
  ellipse(ctx, 0, 0, 72, 46); ctx.fill();
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; circle(ctx, Math.cos(a) * 66, Math.sin(a) * 40, 10); ctx.fill(); }
  // brown arrow down the back
  ctx.fillStyle = '#8a5a32';
  ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(48, -20); ctx.lineTo(52, -7); ctx.lineTo(-60, -7); ctx.lineTo(-60, 7); ctx.lineTo(52, 7); ctx.lineTo(48, 20); ctx.closePath(); ctx.fill();
  // saddle
  ctx.fillStyle = '#a0522d'; roundRect(ctx, -26, -26, 44, 52, 6); ctx.fill();
  ctx.fillStyle = '#d4a017'; roundRect(ctx, -22, -22, 36, 44, 4); ctx.fill();
  // head + horns
  ctx.fillStyle = '#f5f0e6'; circle(ctx, 76, 0, 26); ctx.fill();
  ctx.fillStyle = '#8a5a32';
  ctx.beginPath(); ctx.moveTo(98, 0); ctx.lineTo(74, -14); ctx.lineTo(80, 0); ctx.lineTo(74, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9b27a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(70, -20); ctx.quadraticCurveTo(66, -36, 54, -36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(70, 20); ctx.quadraticCurveTo(66, 36, 54, 36); ctx.stroke();
  ctx.restore();
}

function drawPickup(ctx, p, t) {
  const b = Math.sin(t * 4 + p.x) * 3;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, 0, 2, 10, 4); ctx.fill();
  ctx.translate(0, -12 + b);
  if (p.type === 'cabbage') {
    ctx.fillStyle = '#3f8f3a'; circle(ctx, 0, 0, 10); ctx.fill();
    ctx.fillStyle = '#7cc56b'; circle(ctx, -1, -1, 7.5); ctx.fill();
    ctx.fillStyle = '#b9e8a6'; circle(ctx, -2, -2, 4); ctx.fill();
    ctx.strokeStyle = '#2f6e2b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 9, -1, 1.2); ctx.stroke();
  } else if (p.type === 'lotus') {
    ctx.fillStyle = '#d9c7a0'; circle(ctx, 0, 0, 10); ctx.fill();
    ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 1.5; circle(ctx, 0, 0, 10); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ellipse(ctx, Math.cos(a) * 4, Math.sin(a) * 4, 3.5, 2, a); ctx.fill(); }
    ctx.fillStyle = '#f2c94c'; circle(ctx, 0, 0, 2); ctx.fill();
  } else if (p.type === 'chi') {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#7fe0ff'); g.addColorStop(1, 'rgba(60,140,255,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 12); ctx.fill();
  }
  ctx.restore();
}

// ---------- Obstacles ----------
function makePoly(rng, n, r, jitter = 0.25) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const rr = r * (1 - jitter + rng() * jitter * 2); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.75]); }
  return pts;
}
function polyPath(ctx, pts, ox = 0, oy = 0) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy))); ctx.closePath();
}

function drawObstacle(ctx, o, t) {
  ctx.save();
  ctx.translate(o.x, o.y);
  const r = o.r;
  let rise = 1;
  if (o.rise !== undefined) rise = clamp(o.rise, 0, 1);
  if (o.life !== undefined && o.life < 0.4) ctx.globalAlpha = Math.max(0, o.life / 0.4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, 0, r * 0.25, r * 1.05, r * 0.45); ctx.fill();
  switch (o.kind) {
    case 'ice': {
      const h = r * 0.9;
      ctx.fillStyle = '#9fd3ea'; polyPath(ctx, o.pts, 0, 0); ctx.fill();
      ctx.fillStyle = '#d8f3ff'; polyPath(ctx, o.pts, 0, -h); ctx.fill();
      ctx.fillStyle = '#bfe7f7';
      ctx.fillRect(-r * 0.95, -h, r * 1.9, h * 0.0001);
      ctx.beginPath();
      o.pts.forEach(([x, y], i) => { if (y >= -2) { ctx.moveTo(x, y); ctx.lineTo(x, y - h); } });
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#7fbcd6'; ctx.lineWidth = 1.5; polyPath(ctx, o.pts, 0, -h); ctx.stroke();
      break;
    }
    case 'igloo':
      ctx.fillStyle = '#e9f2f8'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.9, 0, Math.PI, 0); ctx.lineTo(r, 4); ctx.lineTo(-r, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; ellipse(ctx, -r * 0.2, -r * 0.55, r * 0.55, r * 0.3); ctx.fill();
      ctx.strokeStyle = '#b9d3e3'; ctx.lineWidth = 1.2;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.9 * (i / 3), 0, Math.PI, 0); ctx.stroke(); }
      ctx.fillStyle = '#4a6a80'; ctx.beginPath(); ctx.ellipse(0, 4, r * 0.3, r * 0.4, 0, Math.PI, 0); ctx.fill();
      break;
    case 'tent':
      ctx.fillStyle = '#d7c7a8'; ctx.beginPath(); ctx.moveTo(-r, 4); ctx.lineTo(0, -r * 1.6); ctx.lineTo(r, 4); ctx.fill();
      ctx.fillStyle = '#3a6ea5'; ctx.fillRect(-r * 0.8, -r * 0.4, r * 1.6, 5);
      ctx.fillStyle = '#5a3b22'; ctx.beginPath(); ctx.moveTo(-r * 0.25, 4); ctx.lineTo(0, -r * 0.6); ctx.lineTo(r * 0.25, 4); ctx.fill();
      break;
    case 'tree': {
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(-r * 0.18, -r * 1.2, r * 0.36, r * 1.25);
      const g = o.leaf || '#2f6b2a';
      ctx.fillStyle = shade(g, -0.2); circle(ctx, 0, -r * 1.55, r * 1.05); ctx.fill();
      ctx.fillStyle = g; circle(ctx, -r * 0.35, -r * 1.75, r * 0.75); ctx.fill(); circle(ctx, r * 0.4, -r * 1.65, r * 0.7); ctx.fill();
      ctx.fillStyle = shade(g, 0.18); circle(ctx, -r * 0.3, -r * 1.95, r * 0.4); ctx.fill();
      break;
    }
    case 'pine': {
      ctx.fillStyle = '#4a3220'; ctx.fillRect(-r * 0.15, -r * 0.8, r * 0.3, r * 0.85);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#2e5a3a' : '#264d31';
        const w = r * (1.1 - i * 0.25), yb = -r * (0.6 + i * 0.6);
        ctx.beginPath(); ctx.moveTo(-w, yb); ctx.lineTo(0, yb - r * 1.1); ctx.lineTo(w, yb); ctx.fill();
        if (o.snowy) { ctx.fillStyle = '#f2f8ff'; ctx.beginPath(); ctx.moveTo(-w * 0.4, yb - r * 0.65); ctx.lineTo(0, yb - r * 1.1); ctx.lineTo(w * 0.4, yb - r * 0.65); ctx.fill(); }
      }
      break;
    }
    case 'rock': case 'lavarock': case 'spire': {
      const h = o.kind === 'spire' ? r * 2.6 : r * 0.7;
      const base = o.color || (o.kind === 'lavarock' ? '#2e2624' : '#7b7266');
      ctx.fillStyle = shade(base, -0.25); polyPath(ctx, o.pts, 0, 0); ctx.fill();
      if (o.kind === 'spire') {
        ctx.fillStyle = shade(base, -0.1);
        ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 0.6, -h); ctx.lineTo(r * 0.6, -h); ctx.lineTo(r * 0.9, 0); ctx.fill();
        ctx.fillStyle = '#5c8a46'; ellipse(ctx, 0, -h, r * 0.62, r * 0.32); ctx.fill();
        ctx.fillStyle = '#76a85a'; ellipse(ctx, -r * 0.1, -h - 2, r * 0.4, r * 0.18); ctx.fill();
      } else {
        ctx.fillStyle = base; polyPath(ctx, o.pts, 0, -h); ctx.fill();
        ctx.fillStyle = shade(base, 0.15); ellipse(ctx, -r * 0.2, -h - r * 0.15, r * 0.4, r * 0.2); ctx.fill();
        if (o.kind === 'lavarock') {
          ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 3 + o.x) * 40 | 0},40,0.9)`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-r * 0.5, -h); ctx.lineTo(-r * 0.1, -h + r * 0.2); ctx.lineTo(r * 0.3, -h - r * 0.1); ctx.lineTo(r * 0.55, -h + r * 0.15); ctx.stroke();
        }
      }
      break;
    }
    case 'pillar': {
      const h = r * 2.2 * rise;
      ctx.fillStyle = '#6b5136'; ctx.fillRect(-r, -h, r * 2, h);
      ctx.fillStyle = '#8a6a45'; ellipse(ctx, 0, -h, r, r * 0.45); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,10,0.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -h * 0.8); ctx.lineTo(-r * 0.1, -h * 0.4); ctx.lineTo(-r * 0.4, -h * 0.1); ctx.stroke();
      if (o.metal) { ctx.fillStyle = 'rgba(180,190,200,0.5)'; ctx.fillRect(-r, -h, r * 2, h); }
      break;
    }
    case 'crystal': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -r, 2, 0, -r, r * 2);
      g.addColorStop(0, 'rgba(90,255,140,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; circle(ctx, 0, -r, r * 2); ctx.fill(); ctx.restore();
      for (const [dx, h, w, a] of o.shards) {
        ctx.save(); ctx.translate(dx, 0); ctx.rotate(a);
        ctx.fillStyle = '#2fbf6a'; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -h); ctx.lineTo(w, 0); ctx.fill();
        ctx.fillStyle = '#9cffc4'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.lineTo(w, 0); ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'cart':
      ctx.fillStyle = '#7a5230'; ctx.fillRect(-r, -r * 0.9, r * 2, r * 0.8);
      ctx.fillStyle = '#3b2a1e'; circle(ctx, -r * 0.6, -r * 0.05, r * 0.32); ctx.fill(); circle(ctx, r * 0.6, -r * 0.05, r * 0.32); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#7cc56b' : '#5aa74f'; circle(ctx, -r * 0.7 + i * r * 0.35, -r * 1.05 - (i % 2) * 3, r * 0.26); ctx.fill(); }
      break;
    case 'lantern':
      ctx.fillStyle = '#8f8a80'; ctx.fillRect(-r * 0.35, -r * 1.6, r * 0.7, r * 1.6);
      ctx.fillStyle = '#a7a196'; ctx.fillRect(-r * 0.75, -r * 1.75, r * 1.5, r * 0.35);
      ctx.fillStyle = '#ffd36e'; ctx.fillRect(-r * 0.25, -r * 1.4, r * 0.5, r * 0.4);
      ctx.fillStyle = '#6e6a62'; ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 1.75); ctx.lineTo(0, -r * 2.3); ctx.lineTo(r * 0.9, -r * 1.75); ctx.fill();
      break;
    case 'brazier':
      ctx.fillStyle = '#3b3330'; ctx.fillRect(-r * 0.3, -r * 0.9, r * 0.6, r * 0.9);
      ctx.fillStyle = '#5a4b45'; ellipse(ctx, 0, -r * 0.95, r * 0.85, r * 0.35); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,${140 + Math.sin(t * 9 + o.y) * 40 | 0},40,0.85)`;
      ellipse(ctx, 0, -r * 1.25, r * 0.5, r * 0.55 + Math.sin(t * 12 + o.x) * 2); ctx.fill(); ctx.restore();
      break;
    case 'column': {
      const h = r * 3;
      ctx.fillStyle = '#8f1d1d'; ctx.fillRect(-r * 0.75, -h, r * 1.5, h);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-r * 0.75, -h, r * 0.35, h);
      ctx.fillStyle = '#d4a020'; ctx.fillRect(-r * 0.85, -h, r * 1.7, r * 0.3); ctx.fillRect(-r * 0.85, -r * 0.3, r * 1.7, r * 0.3);
      break;
    }
    case 'airpillar': {
      const h = r * 2.6;
      ctx.fillStyle = '#9a958a'; ctx.fillRect(-r * 0.7, -h, r * 1.4, h);
      ctx.fillStyle = '#b8b2a5'; ctx.fillRect(-r * 0.7, -h, r * 0.3, h);
      ctx.fillStyle = '#c96a2b'; ctx.fillRect(-r * 0.75, -h * 0.75, r * 1.5, 4); ctx.fillRect(-r * 0.75, -h * 0.3, r * 1.5, 4);
      ctx.fillStyle = '#7b9ab0'; ctx.beginPath(); ctx.moveTo(-r, -h); ctx.lineTo(0, -h - r); ctx.lineTo(r, -h); ctx.fill();
      break;
    }
    case 'icewall':
      ctx.fillStyle = '#a9daf0'; ctx.fillRect(-r, -r * 1.4, r * 2, r * 1.4);
      ctx.fillStyle = '#e1f6ff'; ctx.fillRect(-r, -r * 1.6, r * 2, r * 0.35);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(-r + 3, -r * 1.3, r * 2 - 6, r * 1.2);
      break;
    case 'statue':
      ctx.fillStyle = '#7d776c'; ctx.fillRect(-r * 0.8, -r * 0.6, r * 1.6, r * 0.6);
      ctx.fillStyle = '#958e82'; roundRect(ctx, -r * 0.45, -r * 2, r * 0.9, r * 1.45, 5); ctx.fill();
      circle(ctx, 0, -r * 2.15, r * 0.38); ctx.fill();
      break;
  }
  if (o.maxHp && o.hp < o.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-14, 6, 28, 3);
    ctx.fillStyle = '#c9a36b'; ctx.fillRect(-14, 6, 28 * (o.hp / o.maxHp), 3);
  }
  ctx.restore();
}
