'use strict';
// =====================================================================
//  3D renderer (Three.js). The simulation stays on a flat plane; this
//  file mirrors that world into a cel-shaded 3D scene every frame.
//  World pixels → 3D units: 20px = 1 unit. 2D (x, y) → 3D (x, ·, z).
// =====================================================================
const S3 = 1 / 20;

// ---------- small helpers ----------
const _geo = {};
const _geoSet = new Set();
function g3(key, make) { if (!_geo[key]) { _geo[key] = make(); _geoSet.add(_geo[key]); } return _geo[key]; }
const GEO = {
  sphere: () => g3('sphere', () => new THREE.SphereGeometry(1, 18, 14)),
  sphereLo: () => g3('sphereLo', () => new THREE.SphereGeometry(1, 10, 8)),
  hemi: () => g3('hemi', () => new THREE.SphereGeometry(1, 18, 10, 0, TAU, 0, Math.PI / 2)),
  cyl: (top = 1, bot = 1, seg = 14) => g3(`cyl${top}_${bot}_${seg}`, () => new THREE.CylinderGeometry(top, bot, 1, seg)),
  cone: (seg = 14) => g3('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)),
  box: () => g3('box', () => new THREE.BoxGeometry(1, 1, 1)),
  torus: (tube = 0.25, arc = TAU) => g3(`tor${tube}_${arc.toFixed(3)}`, () => new THREE.TorusGeometry(1, tube, 8, 32, arc)),
  dodec: () => g3('dodec', () => new THREE.DodecahedronGeometry(1, 0)),
  ico: () => g3('ico', () => new THREE.IcosahedronGeometry(1, 0)),
  disc: () => g3('disc', () => new THREE.CircleGeometry(1, 40)),
  cylOpen: () => g3('cylOpen', () => new THREE.CylinderGeometry(1, 1, 1, 40, 1, true)),
  coneOpen: () => g3('coneOpen', () => new THREE.ConeGeometry(1, 1, 16, 1, true)),
  ring: (inner = 0.88) => g3('ring' + inner, () => new THREE.RingGeometry(inner, 1, 56)),
};
function mk(geom, mat, sx, sy, sz, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geom, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
const _css = new Map();
function parseCss(str) {
  // returns { c: THREE.Color, a: alpha }
  let r = _css.get(str);
  if (r) return r;
  if (_css.size > 600) _css.clear();
  const m = /rgba?\(([^)]+)\)/.exec(str);
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s));
    r = { c: new THREE.Color().setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace), a: p[3] ?? 1 };
  } else r = { c: new THREE.Color().setStyle(str), a: 1 };
  r.srgb = {}; r.c.getRGB(r.srgb, THREE.SRGBColorSpace);
  _css.set(str, r);
  return r;
}
function basic(color, o = {}) {
  const p = parseCss(color);
  return new THREE.MeshBasicMaterial(Object.assign({ color: p.c, transparent: true, opacity: p.a, depthWrite: false, side: THREE.DoubleSide }, o));
}
function additive(color, o = {}) { return basic(color, Object.assign({ blending: THREE.AdditiveBlending }, o)); }

// Per-theme lighting
const LIGHTS = {
  snow:        { fog: '#cfe2f1', hemi: ['#eef6ff', '#7f98ad', 0.95], sun: ['#fff6ea', 1.7] },
  forest:      { fog: '#2c3a33', hemi: ['#b9c8ff', '#2f3f22', 1.0], sun: ['#ffcf98', 1.7] },
  north:       { fog: '#a9c8e2', hemi: ['#e8f4ff', '#7f9bb5', 0.95], sun: ['#eaf3ff', 1.7] },
  omashu:      { fog: '#d9c6a2', hemi: ['#fff2d8', '#7b6a50', 1.3], sun: ['#fff0d0', 2.6] },
  basingse:    { fog: '#c8c6b4', hemi: ['#f3f6e8', '#6d6a58', 1.3], sun: ['#fffbe8', 2.4] },
  crystal:     { fog: '#0a1a13', hemi: ['#b8f5d4', '#16281e', 1.25], sun: ['#e0fff0', 1.4] },
  firecapital: { fog: '#4a2a1c', hemi: ['#ffb27a', '#3a1c10', 1.1], sun: ['#ffbb80', 2.2] },
  airtemple:   { fog: '#c7cfd6', hemi: ['#ffffff', '#7b7a70', 1.4], sun: ['#fff8ec', 2.5] },
  palace:      { fog: '#4a1610', hemi: ['#ffc39a', '#3a120c', 1.1], sun: ['#ffcf9a', 2.3] },
  wulong:      { fog: '#4d5547', hemi: ['#d8e0d0', '#3a4232', 1.1], sun: ['#fff0dc', 1.9] },
  rumble:      { fog: '#c9b089', hemi: ['#fff1d6', '#7a6040', 1.3], sun: ['#ffefd0', 2.6] },
};
const MOD_LIGHTS = {
  fullmoon: { fog: '#0d1630', hemi: ['#6f8ed8', '#10182e', 0.5], sun: ['#a8c4ff', 0.95] },
  eclipse:  { fog: '#160c06', hemi: ['#6a4a34', '#120a06', 0.55], sun: ['#ff8a40', 0.6] },
  comet:    { fog: '#3d140a', hemi: ['#ffa080', '#3a140c', 1.1], sun: ['#ff7a44', 2.3] },
};

// =====================================================================
//  Character models
// =====================================================================
function buildCharModel(art, R) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const mats = {};
  const M = (c) => mats[c] || (mats[c] = R.toon(c));
  const m = { root, body, mats, legs: [], arms: [], extras: {}, R };
  if (art.special === 'heibai') { buildHeiBai(m, M, R); return finishModel(m); }
  if (art.special === 'wisp') { buildWisp(m, M, R); return finishModel(m); }
  let baseY = 0;
  if (art.mount === 'rhino') { buildRhino(m, M, art); baseY = 20; }
  const rider = new THREE.Group(); rider.position.y = baseY; body.add(rider); m.rider = rider;
  const pants = art.pants || shade(art.c1, -0.35);
  const sphere = GEO.sphere(), cyl = GEO.cyl();
  // legs
  if (!art.mount) for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(side * 5, 13, 0); rider.add(piv);
    mk(cyl, M(pants), 3.7, 12, 3.7, 0, -6, 0, piv);
    mk(sphere, M(art.shoes || '#3b2a1e'), 3.8, 2.6, 5.2, 0, -12.2, 1.2, piv);
    m.legs.push(piv);
  }
  // torso
  const tw = art.bulk ? 13 : 10.5;
  mk(GEO.cyl(0.88, 1), M(art.c1), tw, 21, tw * 0.82, 0, 23, 0, rider);
  if (art.robe) mk(GEO.cyl(0.8, 1.15), M(art.c1), tw, 11, tw * 0.9, 0, 10, 0, rider);
  mk(cyl, M(art.c3 || shade(art.c1, -0.4)), tw * 1.04, 3.6, tw * 0.86, 0, 17.5, 0, rider);
  if (art.cape) mk(GEO.cyl(0.55, 1), M(art.c2), tw * 1.18, 8, tw, 0, 30.5, 0, rider);
  else { const col = mk(GEO.torus(0.32), M(art.c2), 6, 6, 6, 0, 33, 0.5, rider); col.rotation.x = Math.PI / 2; }
  if (art.crest) mk(sphere, M(art.crest), 2.1, 2.1, 1.2, 0, 25, tw * 0.82, rider);
  if (art.armor) for (const side of [-1, 1]) mk(sphere, M(art.c2), 5.6, 4.6, 5.6, side * tw, 30.5, 0, rider);
  if (art.backItem === 'boomerang') { const b = mk(GEO.torus(0.22, 2.2), M('#c9a36b'), 8, 8, 8, 0, 21, -tw * 0.85, rider); b.rotation.z = Math.PI + 0.45; }
  // arms
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(side * (tw + 2.2), 31, 0); rider.add(piv);
    const sleeve = art.metalArm && side === 1 ? '#8d959c' : (art.sleeve || art.c1);
    mk(cyl, M(sleeve), 3.1, 13, 3.1, 0, -6.5, 0, piv);
    mk(sphere, M(art.gloves || art.skin), 3.7, 3.7, 3.7, 0, -14, 0, piv);
    m.arms.push(piv);
  }
  buildWeapon(m, art, M);
  // head
  const head = new THREE.Group(); head.position.y = 44.5; rider.add(head); m.head = head;
  const isHelmet = art.hair === 'helmet';
  mk(sphere, M(isHelmet ? (art.helmet || '#3a1414') : art.skin), 11, 11, 11, 0, 0, 0, head);
  buildHair(m, art, M, head);
  // eyes
  if (!isHelmet) {
    m.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setStyle(art.eye || '#1d1712') });
    m.eyeBase = m.eyeMat.color.clone();
    m.eyes = [-1, 1].map(s => mk(sphere, m.eyeMat, 1.6, 2.1, 1, s * 3.9, 0.6, 10.4, head));
    if (art.scar) mk(sphere, M('#b8574a'), 3.4, 3.2, 1.2, 4.6, 1.6, 9.9, head);
    if (art.hair === 'combust') { const t = mk(GEO.torus(0.25), M('#c0392b'), 2.4, 2.4, 2.4, 0, 5.5, 10.4, head); t.rotation.x = -0.4; }
  }
  // Blue Spirit mask (shown while the dao buff is active)
  const mask = new THREE.Group(); head.add(mask); mask.visible = false; m.extras.mask = mask;
  mk(sphere, M('#2b5fb8'), 9.4, 10.2, 5, 0, 0.5, 7.4, mask);
  mk(GEO.box(), M('#ffffff'), 8, 1.4, 1, 0, -4.5, 12, mask);
  for (const s of [-1, 1]) mk(sphere, M('#111111'), 1.8, 2.2, 1, s * 3.2, 1.5, 11.8, mask);
  // metal armor shell
  const armor = mk(GEO.cyl(0.95, 1.05), new THREE.MeshToonMaterial({ color: 0xaab4bd, gradientMap: R.grad, transparent: true, opacity: 0.7 }), tw + 2.5, 24, tw * 0.95 + 2.5, 0, 23, 0, rider);
  armor.visible = false; m.extras.armor = armor;
  return finishModel(m);
}

function finishModel(m) {
  m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  m.allMats = [];
  m.root.traverse(o => { if (o.isMesh && !m.allMats.includes(o.material)) m.allMats.push(o.material); });
  return m;
}

function buildHair(m, art, M, head) {
  const hc = art.hairColor || '#2a1d14';
  const sphere = GEO.sphere();
  const cap = (col = hc, sx = 1, oy = 1.8, oz = -2.3, r = 11.6) => mk(sphere, M(col), r * sx, r, r, 0, oy, oz, head);
  switch (art.hair) {
    case 'bald': break;
    case 'katara': case 'tylee': {
      cap();
      if (art.hair === 'katara') for (const s of [-1, 1]) { const l = mk(GEO.torus(0.32), M(hc), 2.6, 2.6, 2.6, s * 8.7, -3, 6.8, head); l.rotation.y = Math.PI / 2; }
      const len = art.hair === 'tylee' ? 26 : 17;
      const br = mk(GEO.cyl(0.8, 1), M(hc), 2.4, len, 2.4, 0, -4 - len / 2, -11, head); br.rotation.x = 0.2;
      if (art.hair === 'tylee') { mk(sphere, M('#f7a8c8'), 2.6, 2.6, 2.6, 0, -4 - len + 1, -13.5, head); mk(GEO.box(), M(hc), 13, 3, 3, 0, 5, 9, head); }
      break;
    }
    case 'sokka': {
      cap(hc, 0.78, 2.6, -2.6);
      mk(sphere, M(hc), 3.5, 3.5, 3.5, 0, 11, -5, head);
      const t = mk(GEO.cone(8), M(hc), 2.4, 7, 2.4, 0, 10, -9.5, head); t.rotation.x = -2.0;
      break;
    }
    case 'zuko':
      cap();
      for (const x of [-5, -1.5, 2, 5.5]) { const c = mk(GEO.cone(6), M(hc), 2.3, 6, 2, x, 4.5, 9.3, head); c.rotation.x = Math.PI + 0.35; }
      break;
    case 'toph': {
      cap();
      mk(sphere, M(hc), 5, 5, 5, 0, 9.5, -6, head);
      const band = mk(GEO.torus(0.09), M('#5bb04f'), 11.7, 11.7, 11.7, 0, 3.2, -0.6, head); band.rotation.x = Math.PI / 2;
      mk(GEO.box(), M(hc), 14, 3, 3, 0, 5.6, 8.9, head);
      break;
    }
    case 'azula': case 'ozai': case 'zhao': {
      cap();
      mk(sphere, M(hc), 4.3, 4.3, 4.3, 0, 12, -2.5, head);
      if (art.hair !== 'zhao') mk(GEO.cone(6), M('#e8b830'), 2.4, 7, 2.4, 0, 17, -2.5, head);
      if (art.hair === 'azula') for (const s of [-1, 1]) mk(GEO.box(), M(hc), 1.8, 10, 2, s * 7, -1, 8.4, head);
      if (art.hair === 'zhao') for (const s of [-1, 1]) mk(GEO.box(), M(hc), 2.6, 8, 3.4, s * 10, -3, 4, head);
      if (art.hair === 'ozai') mk(GEO.box(), M(hc), 19, 18, 6, 0, -8, -8, head);
      break;
    }
    case 'iroh':
      cap(hc, 1, -2.4, -3.2);
      mk(sphere, M(hc), 3.6, 3.6, 3.6, 0, 11, -3.5, head);
      break;
    case 'mai':
      cap();
      for (const s of [-1, 1]) mk(sphere, M(hc), 4.6, 4.6, 4.6, s * 9, 6, -3, head);
      mk(GEO.box(), M(hc), 14, 3.6, 3, 0, 5, 9, head);
      break;
    case 'helmet': {
      cap(art.helmet || '#3a1414', 1.02, 1.2, -1.5, 12);
      mk(sphere, M(art.mask || '#e8e2d6'), 9, 9.6, 5.2, 0, -1, 7.2, head);
      for (const s of [-1, 1]) mk(sphere, M('#1a1010'), 1.9, 2.3, 1, s * 3.6, 0.6, 11.9, head);
      mk(GEO.box(), M(shade(art.helmet || '#3a1414', -0.3)), 2.2, 4, 15, 0, 12.4, -1, head);
      break;
    }
    case 'combust': break;
  }
  if (art.beard) {
    if (art.hair === 'iroh') mk(sphere, M(art.beard), 7, 5.5, 4.2, 0, -7.4, 8.4, head);
    else { const b = mk(GEO.cone(6), M(art.beard), 2.8, 8, 2.8, 0, -10.5, 9.2, head); b.rotation.x = Math.PI; }
  }
  if (art.hat === 'daili') {
    mk(GEO.cone(20), M('#123b22'), 17, 7, 17, 0, 10.5, 0, head);
    mk(GEO.cyl(1, 1, 20), M('#0b1f12'), 17.4, 1, 17.4, 0, 7, 0, head);
  }
  if (art.arrow) {
    m.arrowMat = new THREE.MeshToonMaterial({ color: 0x3c8fe0, gradientMap: m.R ? m.R.grad : null, emissive: 0x000000 });
    const grp = new THREE.Group(); grp.rotation.x = -0.47; head.add(grp);
    const t = mk(GEO.torus(0.14, 2.32), m.arrowMat, 11.4, 11.4, 11.4, 0, 0, 0, grp); t.rotation.y = -Math.PI / 2;
    const tip = mk(GEO.cone(4), m.arrowMat, 2.8, 4.5, 1.2, 0, 5.2, 10.4, head); tip.rotation.x = 2.67;
  }
}

function buildWeapon(m, art, M) {
  const [lArm, rArm] = m.arms;
  const w = art.weapon;
  if (w === 'sword') { mk(GEO.box(), M('#2b2b33'), 1.3, 2.4, 22, 0, -14, 11, rArm); mk(GEO.box(), M('#b3a07a'), 1.6, 2, 5, 0, -14, -1, rArm); }
  else if (w === 'staff') { mk(GEO.cyl(), M('#8a5a2b'), 1.3, 46, 1.3, 0, -12, 0, lArm); mk(GEO.box(), M('#e07b1e'), 3, 10, 3, 0, 8, 0, lArm); }
  else if (w === 'spear') { mk(GEO.cyl(), M('#6b4a2a'), 1.1, 1.1, 46, 0, -14, 9, rArm).rotation.x = 0; const sh = rArm.children[rArm.children.length - 1]; sh.scale.set(1.1, 46, 1.1); sh.rotation.x = Math.PI / 2; const tip = mk(GEO.cone(6), M('#c9ced4'), 2, 6, 2, 0, -14, 34, rArm); tip.rotation.x = Math.PI / 2; }
  else if (w === 'bow') { const b = mk(GEO.torus(0.08, 2.2), M('#4a2f1a'), 11, 11, 11, 0, -14, 4, lArm); b.rotation.set(0, Math.PI / 2, -1.1); }
  else if (w === 'chain') { for (let i = 0; i < 5; i++) mk(GEO.sphereLo(), M('#9aa1a6'), 1.3, 1.3, 1.3, 0, -15 - i * 1.5, 2 + i * 3, rArm); }
  // dao blades (shown during Blue Spirit)
  m.extras.dao = [lArm, rArm].map(a => { const b = mk(GEO.box(), M('#dfe6ec'), 1, 2, 19, 0, -14, 9, a); b.visible = false; return b; });
}

function buildRhino(m, M, art) {
  const g = new THREE.Group(); m.body.add(g); m.mount = g;
  const c = art.rhinoColor || '#6f7a5a';
  const sphere = GEO.sphere();
  mk(sphere, M(c), 16, 13, 30, 0, 14, 0, g);
  for (let i = -2; i <= 2; i++) mk(sphere, M(shade(c, -0.15)), 3.5, 3.5, 3.5, 0, 26, i * 8, g);
  mk(sphere, M(c), 10, 9, 12, 0, 13, 31, g);
  const horn = mk(GEO.cone(8), M('#e8dcc0'), 3, 12, 3, 0, 16, 44, g); horn.rotation.x = Math.PI / 2 - 0.3;
  const tail = mk(GEO.cone(6), M('#4c5640'), 3, 12, 3, 0, 12, -34, g); tail.rotation.x = -Math.PI / 2 - 0.2;
  m.rLegs = [];
  for (const [x, z] of [[-11, 15], [11, 15], [-11, -15], [11, -15]]) {
    const p = new THREE.Group(); p.position.set(x, 10, z); g.add(p);
    mk(GEO.cyl(), M('#4c5640'), 4, 10, 4, 0, -5, 0, p); m.rLegs.push(p);
  }
  mk(GEO.cyl(), M('#7a2a1a'), 11, 3, 13, 0, 26, -2, g);
}

function buildHeiBai(m, M, R) {
  const g = m.body; const sphere = GEO.sphere();
  m.hbLegs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const p = new THREE.Group(); p.position.set(Math.cos(a) * 12, 34, Math.sin(a) * 10); p.rotation.y = -a; g.add(p);
    const seg = mk(GEO.cyl(0.6, 1), M('#121016'), 3, 34, 3, 16, -10, 0, p); seg.rotation.z = -1.0;
    m.hbLegs.push(p);
  }
  mk(sphere, M('#16131c'), 24, 21, 27, 0, 38, 0, g);
  mk(sphere, M('#f2efe8'), 15, 13, 12, 0, 36, 14, g);
  const head = new THREE.Group(); head.position.set(0, 62, 10); g.add(head); m.head = head;
  mk(sphere, M('#f2efe8'), 17, 16, 16, 0, 0, 0, head);
  for (const s of [-1, 1]) {
    mk(sphere, M('#16131c'), 6, 6, 4, s * 12, 12, -2, head);
    const patch = mk(sphere, M('#16131c'), 5, 6.5, 3, s * 6, 1, 14, head); patch.rotation.z = s * 0.4;
  }
  m.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  m.eyeBase = m.eyeMat.color.clone();
  m.eyes = [-1, 1].map(s => mk(sphere, m.eyeMat, 1.9, 1.9, 1, s * 6, 1, 16.5, head));
  mk(sphere, M('#16131c'), 3, 2, 2, 0, -6, 15.5, head);
}

function buildWisp(m, M, R) {
  const g = m.body;
  const mat = new THREE.MeshToonMaterial({ color: 0x18122a, gradientMap: R.grad, transparent: true, opacity: 0.92 });
  mk(GEO.sphere(), mat, 10, 11, 10, 0, 26, 0, g);
  const tail = mk(GEO.cone(10), mat, 9, 18, 9, 0, 12, 0, g); tail.rotation.x = Math.PI;
  m.eyeMat = new THREE.MeshBasicMaterial({ color: 0xe9e2ff });
  m.eyeBase = m.eyeMat.color.clone();
  m.eyes = [-1, 1].map(s => mk(GEO.sphere(), m.eyeMat, 1.8, 2.2, 1, s * 3.5, 28, 9.3, g));
}

function buildAppa(R) {
  const root = new THREE.Group();
  const g = new THREE.Group(); root.add(g);
  const M = (c) => R.toon(c);
  const sphere = GEO.sphere();
  const fur = M('#f5f0e6'), brown = M('#8a5a32');
  mk(sphere, fur, 46, 38, 74, 0, 0, 0, g);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; mk(sphere, fur, 12, 12, 12, Math.cos(a) * 42, -6, Math.sin(a) * 66, g); }
  mk(GEO.box(), brown, 12, 3, 112, 0, 37, -4, g);
  const ah = mk(GEO.cone(3), brown, 14, 26, 3, 0, 36, 58, g); ah.rotation.x = Math.PI / 2;
  mk(GEO.box(), M('#a0522d'), 40, 6, 46, 0, 38, -6, g);
  mk(GEO.box(), M('#d4a017'), 44, 3, 50, 0, 36, -6, g);
  mk(sphere, fur, 26, 24, 24, 0, 6, 72, g);
  const ah2 = mk(GEO.cone(3), brown, 12, 20, 3, 0, 26, 76, g); ah2.rotation.x = Math.PI / 2 + 0.6;
  for (const s of [-1, 1]) { const h = mk(GEO.cone(8), M('#c9b27a'), 4, 20, 4, s * 18, 22, 66, g); h.rotation.z = -s * 0.9; }
  mk(sphere, fur, 30, 6, 24, 0, 2, -84, g);
  root.legs = [];
  for (const z of [-35, 0, 35]) for (const s of [-1, 1]) { const l = mk(sphere, M('#d8d0c0'), 9, 12, 9, s * 32, -34, z, g); root.legs.push(l); }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.scale.setScalar(S3);
  return root;
}

// =====================================================================
//  Obstacles
// =====================================================================
function buildObstacle3(o, R) {
  const g = new THREE.Group();
  const r = o.r;
  const M = (c, extra) => R.toon(c, extra);
  const sphere = GEO.sphere();
  g.userData.mats = [];
  const keep = (mat) => { g.userData.mats.push(mat); return mat; };
  const seed = (o.x * 13.37 + o.y * 7.1) % TAU;
  switch (o.kind) {
    case 'ice': {
      const h = r * 1.5;
      const ice = keep(M('#a9dcf2', { transparent: true, opacity: 0.93 }));
      const p = mk(GEO.cyl(0.85, 1, 6), ice, r, h, r * 0.85, 0, h / 2, 0, g); p.rotation.y = seed;
      const t = mk(GEO.cyl(0.6, 0.85, 6), keep(M('#eaf8ff')), r, r * 0.35, r * 0.85, 0, h + r * 0.17, 0, g); t.rotation.y = seed;
      break;
    }
    case 'igloo':
      mk(GEO.hemi(), keep(M('#eef5fa')), r, r * 0.95, r, 0, 0, 0, g);
      mk(GEO.cyl(1, 1, 12), keep(M('#3e5a70')), r * 0.32, r * 0.55, r * 0.2, 0, r * 0.27, r * 0.92, g);
      break;
    case 'tent':
      mk(GEO.cone(10), keep(M('#d7c7a8')), r, r * 1.8, r, 0, r * 0.9, 0, g);
      mk(GEO.cyl(0.62, 0.68, 10), keep(M('#3a6ea5')), r, r * 0.16, r, 0, r * 0.65, 0, g);
      mk(GEO.cyl(), keep(M('#5a3b22')), 1.2, r * 0.5, 1.2, 0, r * 1.95, 0, g);
      break;
    case 'tree': {
      const leaf = o.leaf || '#2f6b2a';
      mk(GEO.cyl(0.8, 1), keep(M('#5a3d24')), r * 0.2, r * 1.6, r * 0.2, 0, r * 0.8, 0, g);
      mk(sphere, keep(M(leaf)), r * 1.1, r * 0.95, r * 1.1, 0, r * 2.0, 0, g);
      mk(sphere, keep(M(shade(leaf, 0.15))), r * 0.75, r * 0.65, r * 0.75, r * 0.4, r * 2.5, r * 0.2, g);
      mk(sphere, keep(M(shade(leaf, -0.15))), r * 0.7, r * 0.6, r * 0.7, -r * 0.45, r * 2.3, -r * 0.3, g);
      break;
    }
    case 'pine':
      mk(GEO.cyl(), keep(M('#4a3220')), r * 0.16, r, r * 0.16, 0, r * 0.5, 0, g);
      for (let i = 0; i < 3; i++) mk(GEO.cone(9), keep(M(i % 2 ? '#2e5a3a' : '#264d31')), r * (1.1 - i * 0.25), r * 1.2, r * (1.1 - i * 0.25), 0, r * (1.1 + i * 0.75), 0, g);
      break;
    case 'rock': case 'lavarock': {
      const col = o.color || (o.kind === 'lavarock' ? '#2e2624' : '#7b7266');
      const rk = mk(GEO.dodec(), keep(M(col, o.kind === 'lavarock' ? { emissive: new THREE.Color('#5a1500') } : {})), r, r * 0.75, r * 0.9, 0, r * 0.45, 0, g);
      rk.rotation.set(seed, seed * 2, 0);
      break;
    }
    case 'spire': {
      const h = r * 3.2;
      const s = mk(GEO.cyl(0.62, 1, 7), keep(M(o.color || '#7b7266')), r, h, r, 0, h / 2, 0, g); s.rotation.y = seed;
      mk(sphere, keep(M('#5c8a46')), r * 0.66, r * 0.28, r * 0.66, 0, h, 0, g);
      break;
    }
    case 'pillar': {
      const p = mk(GEO.cyl(1, 1, 9), keep(M(o.metal ? '#9aa4ad' : '#7a5a3a')), r, r * 2.2, r, 0, r * 1.1, 0, g);
      g.userData.rise = p;
      break;
    }
    case 'crystal': {
      const mat = keep(M('#3fe08a', { emissive: new THREE.Color('#0f7a3a'), transparent: true, opacity: 0.9 }));
      for (const [dx, h, w, a] of o.shards) { const c = mk(GEO.cone(5), mat, w, h, w, dx, h / 2, (dx * 0.7) % 8, g); c.rotation.z = a; }
      g.userData.glow = R.glowSprite('#4dff9a', r * 4 * S3, 0.35);
      g.userData.glow.position.y = r * S3;
      break;
    }
    case 'cart':
      mk(GEO.box(), keep(M('#7a5230')), r * 2, r * 0.6, r * 1.2, 0, r * 0.6, 0, g);
      for (const s of [-1, 1]) { const wh = mk(GEO.cyl(1, 1, 12), keep(M('#3b2a1e')), r * 0.38, 3, r * 0.38, s * r * 0.6, r * 0.38, r * 0.62, g); wh.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 5; i++) mk(sphere, keep(M(i % 2 ? '#7cc56b' : '#5aa74f')), r * 0.3, r * 0.3, r * 0.3, -r * 0.7 + i * r * 0.35, r * 1.05, (i % 2) * 4 - 2, g);
      break;
    case 'lantern':
      mk(GEO.box(), keep(M('#8f8a80')), r * 0.6, r * 1.8, r * 0.6, 0, r * 0.9, 0, g);
      mk(GEO.box(), keep(M('#ffd36e', { emissive: new THREE.Color('#ffb020') })), r * 0.75, r * 0.45, r * 0.75, 0, r * 1.95, 0, g);
      mk(GEO.cone(4), keep(M('#6e6a62')), r * 1.1, r * 0.6, r * 1.1, 0, r * 2.45, 0, g).rotation.y = Math.PI / 4;
      break;
    case 'brazier': {
      mk(GEO.cyl(0.7, 1), keep(M('#3b3330')), r * 0.35, r, r * 0.35, 0, r * 0.5, 0, g);
      mk(GEO.cyl(1, 0.6), keep(M('#5a4b45')), r * 0.85, r * 0.4, r * 0.85, 0, r * 1.15, 0, g);
      const fl = mk(GEO.cone(8), keep(M('#ffa030', { emissive: new THREE.Color('#ff6a00') })), r * 0.55, r * 1.1, r * 0.55, 0, r * 1.85, 0, g);
      fl.castShadow = false; g.userData.flame = fl;
      g.userData.glow = R.glowSprite('#ff9a40', r * 4.5 * S3, 0.5);
      g.userData.glow.position.y = r * 1.8 * S3;
      break;
    }
    case 'column': {
      const h = r * 3.4;
      mk(GEO.cyl(1, 1, 12), keep(M('#8f1d1d')), r * 0.75, h, r * 0.75, 0, h / 2, 0, g);
      for (const y of [0.15, h - 2]) mk(GEO.cyl(1, 1, 12), keep(M('#d4a020')), r * 0.86, r * 0.3, r * 0.86, 0, y + r * 0.15, 0, g);
      break;
    }
    case 'airpillar': {
      const h = r * 2.8;
      mk(GEO.cyl(1, 1, 10), keep(M('#a39e92')), r * 0.7, h, r * 0.7, 0, h / 2, 0, g);
      for (const k of [0.3, 0.7]) mk(GEO.cyl(1, 1, 10), keep(M('#c96a2b')), r * 0.74, 2.5, r * 0.74, 0, h * k, 0, g);
      mk(GEO.cone(4), keep(M('#7b9ab0')), r * 1.1, r, r * 1.1, 0, h + r / 2, 0, g).rotation.y = Math.PI / 4;
      break;
    }
    case 'icewall':
      mk(GEO.box(), keep(M('#a9daf0', { transparent: true, opacity: 0.92 })), r * 2, r * 1.5, r * 1.3, 0, r * 0.75, 0, g);
      mk(GEO.box(), keep(M('#e8f8ff')), r * 2.05, r * 0.25, r * 1.35, 0, r * 1.55, 0, g);
      break;
    case 'statue':
      mk(GEO.box(), keep(M('#7d776c')), r * 1.6, r * 0.5, r * 1.6, 0, r * 0.25, 0, g);
      mk(GEO.cyl(0.7, 1, 10), keep(M('#958e82')), r * 0.55, r * 1.6, r * 0.5, 0, r * 1.3, 0, g);
      mk(sphere, keep(M('#958e82')), r * 0.4, r * 0.4, r * 0.4, 0, r * 2.4, 0, g);
      break;
    default:
      mk(GEO.cyl(), keep(M('#777777')), r, r, r, 0, r / 2, 0, g);
  }
  g.traverse(c => { if (c.isMesh) { if (c.castShadow !== false) c.castShadow = true; c.receiveShadow = true; } });
  if (g.userData.flame) g.userData.flame.castShadow = false;
  g.scale.setScalar(S3);
  g.position.set(o.x * S3, 0, o.y * S3);
  if (g.userData.glow) { g.userData.glow.position.x = o.x * S3; g.userData.glow.position.z = o.y * S3; }
  return g;
}

// =====================================================================
//  Particle shader
// =====================================================================
const PARTICLE_VS = `
attribute float size;
attribute vec4 rgba;
varying vec4 vC;
uniform float uScale;
void main() {
  vC = rgba;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, size * uScale / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const PARTICLE_FS = `
varying vec4 vC;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.12, r);
  gl_FragColor = vec4(vC.rgb, vC.a * a);
}`;

// =====================================================================
//  Renderer
// =====================================================================
const R3 = {
  ok: false, world: null, zoom: 1,
  fm: new Map(), om: new Map(), pm: new Map(), em: new Map(), km: new Map(),
  target: new THREE.Vector3(), tmpV: new THREE.Vector3(), seen: new Set(),

  init() {
    if (typeof THREE === 'undefined') return;
    try {
      const c = document.createElement('canvas'); c.id = 'game3d';
      document.body.insertBefore(c, document.getElementById('game'));
      this.canvas = c;
      this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, powerPreference: 'high-performance' });
      if (!this.renderer.getContext()) throw new Error('no gl');
    } catch (e) { this.ok = false; if (this.canvas) this.canvas.remove(); return; }
    const r = this.renderer;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 500);
    this.ray = new THREE.Raycaster();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
    const grad = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 235, 235, 235, 255]);
    this.grad = new THREE.DataTexture(grad, 3, 1, THREE.RGBAFormat);
    this.grad.minFilter = this.grad.magFilter = THREE.NearestFilter; this.grad.needsUpdate = true;
    this.glowTex = this.makeGlowTex();
    this.starTex = this.makeGlowTex(true);
    this.ok = true;
    addEventListener('wheel', (e) => {
      if (!this.active()) return;
      this.zoom = clamp(this.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.55, 1.7);
    }, { passive: true });
    addEventListener('keydown', (e) => {
      if (e.code === 'KeyV' && this.active() && Game.state === 'play') {
        Save.data.settings.cam = Save.data.settings.cam === 'action' ? 'tactical' : 'action'; Save.write();
        if (Game.world) Game.world.text(Game.battle.player.x, Game.battle.player.y - 70, Save.data.settings.cam === 'action' ? 'Action camera' : 'Tactical camera', '#cfe8ff', 13);
      }
    });
  },

  active() { return this.ok && Save.data.settings.view !== '2d'; },

  makeGlowTex(star) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(star ? 0.15 : 0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  },

  toon(color, extra = {}) {
    return new THREE.MeshToonMaterial(Object.assign({ color: new THREE.Color().setStyle(color), gradientMap: this.grad }, extra));
  },

  glowSprite(color, size, opacity = 1) {
    const p = parseCss(color);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: p.c, transparent: true, opacity: opacity * p.a, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  },

  resize(w, h, dpr) {
    if (!this.ok) return;
    this.renderer.setPixelRatio(this.perf && this.perf.level >= 1 ? 1 : dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  },

  // ---------------------------------------------------------------- scene setup
  clear() {
    if (this.warmGroup && this.warmGroup.parent) this.warmGroup.parent.remove(this.warmGroup);
    for (const map of [this.fm, this.om, this.pm, this.em, this.km]) { for (const [, v] of map) this.disposeObj(v); map.clear(); }
    if (this.scene) this.scene.traverse(o => {
      if (o.material) o.material.dispose();
      if (o.geometry && !_geoSet.has(o.geometry)) o.geometry.dispose();
    });
    if (this.groundTex) { this.groundTex.dispose(); this.groundTex = null; }
    this.scene = null; this.world = null;
  },

  disposeObj(v) {
    if (!v) return;
    const obj = v.obj || v.root || v;
    if (obj.parent) obj.parent.remove(obj);
    if (v.fx && v.fx.parent) v.fx.parent.remove(v.fx);
    if (v.glow && v.glow.parent) v.glow.parent.remove(v.glow);
    const mats = new Set();
    const collect = (o) => o && o.traverse && o.traverse(c => { if (c.material) mats.add(c.material); if (c.geometry && c.userData.ownGeo) c.geometry.dispose(); });
    collect(obj); collect(v.fx); collect(v.glow);
    for (const m of mats) m.dispose();
  },

  setWorld(w) {
    this.clear();
    this.world = w;
    const sc = this.scene = new THREE.Scene();
    const L = this.lightDef(w);
    this.curMod = w.modifier;
    sc.background = new THREE.Color().setStyle(L.fog);
    sc.fog = new THREE.Fog(sc.background.clone(), 45, 130);
    this.hemi = new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]); sc.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sh = sun.shadow.camera; sh.left = -34; sh.right = 34; sh.top = 34; sh.bottom = -34; sh.near = 1; sh.far = 140;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);
    this.lights = [];
    for (let i = 0; i < 6; i++) { const p = new THREE.PointLight(0xffaa55, 0, 16, 1.6); sc.add(p); this.lights.push(p); }
    // ground
    const W = w.W * S3, H = w.H * S3;
    this.groundTex = new THREE.CanvasTexture(w.ground);
    this.groundTex.colorSpace = THREE.SRGBColorSpace;
    this.groundTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const gmat = new THREE.MeshToonMaterial({ map: this.groundTex, gradientMap: this.grad });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), gmat);
    ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, H / 2); ground.receiveShadow = true;
    ground.userData.own = true; ground.geometry.userData = {}; sc.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(W * 6, H * 6), new THREE.MeshToonMaterial({ color: new THREE.Color().setStyle(shade(w.themeDef.base, -0.18)), gradientMap: this.grad }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(W / 2, -0.03, H / 2); outer.receiveShadow = true; outer.userData.own = true; sc.add(outer);
    // arena boundary: low wall
    const wallMat = this.toon(shade(w.themeDef.base, -0.45)); wallMat.userData = {};
    const t = 0.7, wh = 0.9;
    for (const [x, z, sx, sz] of [[W / 2, -t / 2, W + 2 * t, t], [W / 2, H + t / 2, W + 2 * t, t], [-t / 2, H / 2, t, H], [W + t / 2, H / 2, t, H]]) {
      const b = mk(GEO.box(), wallMat, sx, wh, sz, x, wh / 2, z, sc); b.castShadow = true; b.receiveShadow = true;
    }
    // decorative scenery outside the arena
    const rng = seeded(w.W + w.H + w.theme.length * 97);
    const kinds = w.themeDef.obstacles.map(o => o.kind);
    for (let i = 0; i < 70; i++) {
      const side = Math.floor(rng() * 4), d = 2 + rng() * 14;
      let x, z;
      if (side === 0) { x = rng() * (W + 20) - 10; z = -d; } else if (side === 1) { x = rng() * (W + 20) - 10; z = H + d; }
      else if (side === 2) { x = -d; z = rng() * H; } else { x = W + d; z = rng() * H; }
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const spec = w.themeDef.obstacles.find(o => o.kind === kind);
      const o = Object.assign({ x: x / S3, y: z / S3, r: spec.r[0] + rng() * (spec.r[1] - spec.r[0]), kind }, spec.extra || {});
      if (['ice', 'rock', 'lavarock', 'spire'].includes(kind)) o.pts = makePoly(rng, 8, o.r);
      if (kind === 'crystal') { o.shards = []; for (let k = 0; k < 5; k++) o.shards.push([rng() * o.r - o.r / 2, o.r * (1.2 + rng() * 1.4), o.r * 0.22 + rng() * 4, rng() * 0.8 - 0.4]); }
      const g = buildObstacle3(o, this);
      sc.add(g); if (g.userData.glow) sc.add(g.userData.glow);
    }
    // particles
    this.pts = [this.makePoints(false), this.makePoints(true)];
    for (const p of this.pts) sc.add(p.obj);
    this.warmUp();
  },

  // Compile every material variant up front, and keep those materials alive forever, so shader
  // programs stay cached across stages and no effect causes a hitch the first time it appears.
  warmUp() {
    if (!this.warmGroup) {
      const g = new THREE.Group();
      const geo = GEO.sphereLo();
      const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); tex.needsUpdate = true;
      const mats = [
        this.toon('#888888'), this.toon('#888888', { transparent: true, opacity: 0.5 }),
        this.toon('#888888', { emissive: new THREE.Color('#222222') }),
        new THREE.MeshToonMaterial({ map: tex, gradientMap: this.grad }),
        basic('rgba(255,255,255,0.5)'), additive('#ffffff'), new THREE.MeshBasicMaterial({ color: 0xffffff }),
      ];
      for (const m of mats) { const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; g.add(x); }
      g.add(this.glowSprite('#ffffff', 1, 1));
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
      const dl = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true })); dl.computeLineDistances(); g.add(dl);
      g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true })));
      g.add(this.makePoints(false).obj); g.add(this.makePoints(true).obj);
      g.position.y = -80;
      g.traverse(o => { o.frustumCulled = false; });
      this.warmGroup = g;
    }
    this.scene.add(this.warmGroup);
    this.warmGroup.visible = true;
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* best effort */ }
    this.warmGroup.visible = false;
  },

  lightDef(w) { return (w.modifier && MOD_LIGHTS[w.modifier]) || LIGHTS[w.theme] || LIGHTS.snow; },

  applyLights(w) {
    const L = this.lightDef(w);
    this.scene.background.setStyle(L.fog); this.scene.fog.color.setStyle(L.fog);
    this.hemi.color.setStyle(L.hemi[0]); this.hemi.groundColor.setStyle(L.hemi[1]); this.hemi.intensity = L.hemi[2];
    this.sun.color.setStyle(L.sun[0]); this.sun.intensity = L.sun[1];
  },

  makePoints(add) {
    const N = 2600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), size = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('rgba', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({ vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS, uniforms: { uScale: { value: 400 } },
      transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const obj = new THREE.Points(geo, mat); obj.frustumCulled = false; obj.renderOrder = add ? 3 : 2;
    obj.userData.own = true;
    return { obj, geo, pos, col, size, mat, N };
  },

  syncParticles(w) {
    const uScale = this.renderer.domElement.height / (2 * Math.tan(this.camera.fov * Math.PI / 360));
    const n = [0, 0];
    for (const p of w.parts.a) {
      const L = this.pts[p.add ? 1 : 0];
      const i = n[p.add ? 1 : 0];
      if (i >= L.N) continue;
      const k = p.t / p.max;
      const c = parseCss(p.color).srgb;
      L.pos[i * 3] = p.x * S3; L.pos[i * 3 + 1] = ((p.z || 0) + (p.lift ? 14 : 0)) * S3; L.pos[i * 3 + 2] = p.y * S3;
      L.col[i * 4] = c.r; L.col[i * 4 + 1] = c.g; L.col[i * 4 + 2] = c.b; L.col[i * 4 + 3] = (p.alpha ?? 1) * (1 - k) * (p.shape === 'ring' ? 0.6 : 1);
      L.size[i] = Math.max(0.5, lerp(p.size, p.size2 ?? p.size, k)) * (p.add ? 1.5 : 2.0) * S3;
      n[p.add ? 1 : 0]++;
    }
    this.pts.forEach((L, j) => {
      L.geo.setDrawRange(0, n[j]);
      L.geo.attributes.position.needsUpdate = true; L.geo.attributes.rgba.needsUpdate = true; L.geo.attributes.size.needsUpdate = true;
      L.mat.uniforms.uScale.value = uScale;
    });
  },

  // ---------------------------------------------------------------- per-frame sync
  sync(w, dt) {
    if (this.world !== w) this.setWorld(w);
    if (this.curMod !== w.modifier) { this.curMod = w.modifier; this.applyLights(w); }
    const sc = this.scene, seen = this.seen;
    // fighters
    seen.clear();
    for (const f of w.fighters) {
      seen.add(f);
      let m = this.fm.get(f);
      if (!m) {
        m = buildCharModel(f.def.art, this);
        m.fx = new THREE.Group();
        sc.add(m.root); sc.add(m.fx);
        this.fm.set(f, m);
      }
      this.poseFighter(m, f, w, dt);
    }
    for (const [f, m] of this.fm) if (!seen.has(f)) { this.disposeObj(m); this.fm.delete(f); }
    // obstacles
    seen.clear();
    for (const o of w.obstacles) {
      seen.add(o);
      let g = this.om.get(o);
      if (!g) { g = buildObstacle3(o, this); sc.add(g); if (g.userData.glow) sc.add(g.userData.glow); this.om.set(o, g); }
      if (o.rise !== undefined) g.scale.y = S3 * clamp(o.rise, 0.05, 1);
      if (o.life !== undefined && o.life < 0.4) g.scale.y = S3 * Math.max(0.05, o.life / 0.4);
      if (g.userData.flame) { const fl = g.userData.flame; fl.scale.y = o.r * (1 + Math.sin(w.time * 12 + o.x) * 0.15); }
      if (g.userData.glow) g.userData.glow.material.opacity = 0.4 + Math.sin(w.time * 9 + o.y) * 0.08;
      // fade scenery standing between the camera and the player
      const pl = w.player;
      let fade = false;
      if (pl) {
        const dz = o.y - pl.y, dx = Math.abs(o.x - pl.x);
        fade = dz > 0 && dz < (Save.data.settings.cam === 'action' ? 420 : 260) && dx < o.r + 70;
      }
      if (fade !== !!g.userData.faded) {
        g.userData.faded = fade;
        for (const mat of g.userData.mats) {
          if (mat.userData.baseT === undefined) { mat.userData.baseT = mat.transparent; mat.userData.baseO = mat.opacity; }
          const tr = fade || mat.userData.baseT;
          if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
          mat.opacity = fade ? 0.3 : mat.userData.baseO;
          mat.depthWrite = !fade;
        }
      }
    }
    for (const [o, g] of this.om) if (!seen.has(o)) { this.disposeObj({ obj: g, glow: g.userData.glow }); this.om.delete(o); }
    // projectiles
    seen.clear();
    for (const p of w.projectiles) {
      seen.add(p);
      let v = this.pm.get(p);
      if (!v) { v = this.buildProjectile(p); sc.add(v.obj); this.pm.set(p, v); }
      this.poseProjectile(v, p, w);
    }
    for (const [p, v] of this.pm) if (!seen.has(p)) { this.disposeObj(v); this.pm.delete(p); }
    // pickups
    seen.clear();
    for (const p of w.pickups) {
      seen.add(p);
      let v = this.km.get(p);
      if (!v) { v = this.buildPickup(p); sc.add(v.obj); this.km.set(p, v); }
      v.obj.position.set(p.x * S3, 0.7 + Math.sin(w.time * 4 + p.x) * 0.15, p.y * S3);
      v.obj.rotation.y = w.time * 1.5;
    }
    for (const [p, v] of this.km) if (!seen.has(p)) { this.disposeObj(v); this.km.delete(p); }
    // effects
    seen.clear();
    for (const e of w.effects) {
      if (!e.type) continue;
      seen.add(e);
      let v = this.em.get(e);
      if (!v) { v = this.buildEffect(e, w); if (!v) continue; sc.add(v.obj); this.em.set(e, v); }
      this.poseEffect(v, e, w);
    }
    for (const [e, v] of this.em) if (!seen.has(e)) { this.disposeObj(v); this.em.delete(e); }
    this.syncLights(w);
    this.syncParticles(w);
  },

  // ---------------------------------------------------------------- fighters
  poseFighter(m, f, w, dt) {
    const sc = (f.def.artScale || f.r / 16) * S3;
    const spawn = f.alive ? Math.min(1, f.spawnT * 4) : 1;
    m.root.position.set(f.x * S3, 0, f.y * S3);
    m.root.scale.setScalar(sc * (0.3 + 0.7 * spawn));
    const tgt = Math.atan2(Math.cos(f.ang), Math.sin(f.ang));
    m.root.rotation.y = tgt;
    const t = f.anim, moving = f.moving && f.alive;
    const ph = t * 13;
    m.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + i * Math.PI) * 0.7 : 0; });
    if (m.rLegs) m.rLegs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0)) * 0.6 : 0; });
    if (m.hbLegs) m.hbLegs.forEach((l, i) => { l.rotation.x = Math.sin(t * 6 + i) * 0.25; });
    const cast = f.cast;
    m.arms.forEach((a, i) => {
      const side = i === 0 ? -1 : 1;
      const swing = moving ? Math.sin(ph + (i ? 0 : Math.PI)) * 0.55 * (1 - cast) : Math.sin(t * 2 + i) * 0.05;
      a.rotation.x = -0.35 - cast * 1.25 + swing;
      a.rotation.z = side * (0.12 + cast * 0.15);
    });
    const hover = (f.flags.hover || 0);
    let bob = moving ? Math.abs(Math.sin(ph)) * 1.4 : Math.sin(t * 3) * 0.4;
    if (f.def.art.special === 'wisp') bob = 6 + Math.sin(t * 5) * 3;
    m.body.position.y = hover + bob;
    m.body.rotation.x = f.dashT > 0 ? 0.35 : 0;
    m.body.rotation.z = f.status.stun > 0 && f.alive ? Math.sin(t * 9) * 0.08 : 0;
    if (!f.alive) {
      const k = Math.min(1, f.deathT * 3.5);
      m.body.rotation.x = -k * 1.45;
      m.body.position.y = 0;
    }
    if (m.head && f.def.art.special !== 'heibai') m.head.rotation.x = f.status.stun > 0 ? 0.2 : 0;
    // materials: flash / fade / avatar glow
    const alpha = f.alive ? 1 : Math.max(0, 1 - (f.deathT - 0.3) / 0.5);
    const flash = f.hitFlash > 0 && f.alive;
    if (m.lastAlpha !== alpha || m.lastFlash !== flash) {
      for (const mat of m.allMats) {
        if (mat.emissive && !mat.userData.keepEmissive) { if (mat.userData.baseEm === undefined) mat.userData.baseEm = mat.emissive.getHex(); mat.emissive.setHex(flash ? 0xaaaaaa : mat.userData.baseEm); }
        const wantT = alpha < 1;
        if (mat.userData.baseT === undefined) { mat.userData.baseT = mat.transparent; mat.userData.baseO = mat.opacity; }
        const tr = wantT || mat.userData.baseT;
        if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
        mat.opacity = mat.userData.baseO * alpha;
      }
      m.lastAlpha = alpha; m.lastFlash = flash;
    }
    const avatar = f.has('avatar');
    if (m.eyeMat) { if (avatar) m.eyeMat.color.setHex(0xf4feff); else m.eyeMat.color.copy(m.eyeBase); }
    if (m.arrowMat) { m.arrowMat.emissive.setHex(avatar ? 0x9ff0ff : 0x000000); m.arrowMat.userData.keepEmissive = true; }
    if (m.extras.mask) m.extras.mask.visible = f.has('dao');
    if (m.extras.dao) m.extras.dao.forEach(b => (b.visible = f.has('dao')));
    if (m.extras.armor) m.extras.armor.visible = f.has('armor');
    this.poseBuffFx(m, f, w, sc);
  },

  // world-space visual effects attached to a fighter (auras, shields, tentacles…)
  poseBuffFx(m, f, w, sc) {
    const fx = m.fx, E = m.extras;
    fx.position.set(f.x * S3, 0, f.y * S3);
    const H = sc * 58;
    const want = (key, make) => (E[key] || (E[key] = make()));
    const show = (key, on) => { if (E[key]) E[key].visible = on; };
    // aura
    let glow = null;
    for (const id in f.buffs) if (f.buffs[id].glow) glow = f.buffs[id].glow;
    if (f.enraged && !glow) glow = 'rgba(255,60,40,0.45)';
    if (glow && f.alive) {
      const s = want('aura', () => { const s = this.glowSprite('#ffffff', 1, 1); fx.add(s); return s; });
      const p = parseCss(glow);
      s.material.color.copy(p.c); s.material.opacity = Math.min(1, p.a * 1.6);
      s.position.y = H * 0.5 + (f.flags.hover || 0) * sc; s.scale.set(H * 1.6, H * 1.6, 1); s.visible = true;
    } else show('aura', false);
    // air sphere
    if (f.flags.reflect && f.alive) {
      const g = want('sphere', () => {
        const g = new THREE.Group(); fx.add(g);
        mk(GEO.sphere(), basic('rgba(220,245,255,0.16)'), 1, 1, 1, 0, 0, 0, g);
        for (let i = 0; i < 3; i++) { const r = mk(GEO.torus(0.03), basic('rgba(255,255,255,0.6)'), 1, 1, 1, 0, 0, 0, g); r.rotation.set(i, i * 2, 0); }
        return g;
      });
      g.visible = true; g.position.y = H * 0.45; g.scale.setScalar(H * 0.62); g.rotation.y = w.time * 3; g.rotation.x = w.time * 1.3;
    } else show('sphere', false);
    // air scooter
    if (f.has('scooter') && f.alive) {
      const g = want('scooter', () => { const g = new THREE.Group(); fx.add(g); for (let i = 0; i < 3; i++) { const r = mk(GEO.torus(0.08, 4.5), basic('rgba(255,255,255,0.75)'), 1, 1, 1, 0, 0, 0, g); r.rotation.set(Math.PI / 2 + i * 0.5, 0, i * 2); } return g; });
      g.visible = true; g.position.y = 0.35; g.scale.setScalar(0.85); g.rotation.y = w.time * 16;
    } else show('scooter', false);
    // octopus form
    if (f.has('octopus') && f.alive) {
      const g = want('octo', () => {
        const g = new THREE.Group(); fx.add(g);
        const mat = this.toon('#3d9cf0', { transparent: true, opacity: 0.8, emissive: new THREE.Color('#0a3a7a') });
        g.userData.segs = [];
        for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) g.userData.segs.push(mk(GEO.sphereLo(), mat, 1, 1, 1, 0, 0, 0, g));
        return g;
      });
      g.visible = true;
      const segs = g.userData.segs;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + w.time * 0.8;
        for (let j = 0; j < 6; j++) {
          const k = (j + 1) / 6, L = (1.0 + Math.sin(w.time * 5 + i) * 0.25) * 2.2 * k;
          const s = segs[i * 6 + j];
          s.position.set(Math.cos(a + k * 0.7) * L, H * 0.45 + Math.sin(w.time * 4 + i + k * 3) * 0.5 * k + k * 0.6, Math.sin(a + k * 0.7) * L);
          s.scale.setScalar(0.32 * (1.15 - k * 0.7));
        }
      }
    } else show('octo', false);
    // avatar state orbs
    if (f.has('avatar') && f.alive) {
      const g = want('orbs', () => {
        const g = new THREE.Group(); fx.add(g);
        ['#ff6a1a', '#3fa0ff', '#8a6a45', '#ffffff'].forEach(c => { const o = mk(GEO.sphere(), new THREE.MeshBasicMaterial({ color: new THREE.Color().setStyle(c) }), 0.22, 0.22, 0.22, 0, 0, 0, g); o.add(this.glowSprite(c, 4, 0.8)); });
        return g;
      });
      g.visible = true;
      g.children.forEach((o, i) => { const a = w.time * 3 + i * TAU / 4; o.position.set(Math.cos(a) * 1.5, H * 0.65 + Math.sin(a * 2) * 0.2, Math.sin(a) * 1.5); });
    } else show('orbs', false);
    // healing water
    if (f.has('healing') && f.alive) {
      const g = want('heal', () => { const r = mk(GEO.torus(0.06, 4), additive('rgba(120,240,255,0.7)'), 1, 1, 1, 0, 0, 0, fx); return r; });
      g.visible = true; g.position.y = H * 0.4; g.scale.setScalar(1.1); g.rotation.set(Math.PI / 2, 0, w.time * 6);
    } else show('heal', false);
    // slow ring
    if (f.status.slow && f.alive) {
      const r = want('slow', () => { const r = mk(GEO.ring(0.8), basic('rgba(120,200,255,0.55)'), 1, 1, 1, 0, 0.06, 0, fx); r.rotation.x = -Math.PI / 2; return r; });
      r.visible = true; r.scale.setScalar(f.r * S3 * 1.35);
    } else show('slow', false);
    // root spikes
    if (f.status.root > 0 && f.alive) {
      const g = want('root', () => { const g = new THREE.Group(); fx.add(g); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const c = mk(GEO.cone(5), this.toon('#c9ced4'), 0.12, 0.7, 0.12, Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9, g); c.rotation.z = Math.cos(a) * -0.4; c.rotation.x = Math.sin(a) * 0.4; } return g; });
      g.visible = true;
    } else show('root', false);
    // combustion man's aiming laser
    if (f.has('combust') && f.alive) {
      const l = want('laser', () => {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
        const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff3b2f, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.8 }));
        line.userData.ownGeo = true; fx.add(line); return line;
      });
      const a = f.ang, L = 45;
      const pos = l.geometry.attributes.position;
      pos.setXYZ(0, 0, H * 0.75, 0); pos.setXYZ(1, Math.cos(a) * L, 0.7, Math.sin(a) * L); pos.needsUpdate = true;
      l.computeLineDistances(); l.visible = true;
      if (Math.random() < 0.5) w.parts.emit('fire', f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6, 1, { z: 46 * (sc / S3), smax: 20 });
    } else show('laser', false);
    // bloodbending tendrils
    const bb = f.buffs.bloodbending;
    if (bb && f.alive) {
      const l = want('blood', () => {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 6), 3));
        const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe0203c, transparent: true, opacity: 0.75 }));
        line.userData.ownGeo = true; line.frustumCulled = false; fx.add(line); return line;
      });
      const pos = l.geometry.attributes.position; let n = 0;
      for (const e of bb.targets) {
        if (n >= 32 || !e.alive || !e.buffs.bloodbent) continue;
        pos.setXYZ(n * 2, 0, H * 0.5, 0);
        pos.setXYZ(n * 2 + 1, (e.x - f.x) * S3, H * 0.6, (e.y - f.y) * S3); n++;
      }
      l.geometry.setDrawRange(0, n * 2); pos.needsUpdate = true; l.visible = true;
    } else show('blood', false);
    // crackling energy for lightning stances
    if (f.alive && (f.has('lightningCharge') || f.has('redirect')) && Math.random() < 0.8) {
      w.parts.emit('lightning', f.x + rand(-14, 14), f.y + rand(-14, 14), 1, { z: rand(15, 45), smax: 60 });
    }
  },

  // ---------------------------------------------------------------- projectiles
  buildProjectile(p) {
    const g = new THREE.Group();
    const r = p.r * S3;
    const own = [];
    switch (p.kind) {
      case 'fire': case 'bluefire': case 'combust': case 'spirit': {
        const col = p.kind === 'bluefire' ? '#3f9dff' : p.kind === 'spirit' ? '#a07cff' : '#ff7a1a';
        const core = p.kind === 'bluefire' ? '#d8f6ff' : p.kind === 'spirit' ? '#f0e8ff' : '#fff0a0';
        g.add(this.glowSprite(col, r * 5.5, 0.95));
        g.add(this.glowSprite(core, r * 2.4, 1));
        g.userData.light = col;
        break;
      }
      case 'water': {
        const s = mk(GEO.sphere(), this.toon('#3a9cff', { transparent: true, opacity: 0.88, emissive: new THREE.Color('#0a3a80') }), r * 1.7, r * 0.85, r * 0.85, 0, 0, 0, g);
        mk(GEO.sphere(), basic('rgba(220,245,255,0.8)'), r * 0.6, r * 0.25, r * 0.25, r * 0.4, r * 0.3, 0, g);
        g.userData.aligned = s;
        break;
      }
      case 'ice': case 'metal': {
        const c = mk(GEO.cone(6), this.toon(p.kind === 'ice' ? '#d6f6ff' : '#c4ccd4', p.kind === 'ice' ? { emissive: new THREE.Color('#2a6a8a') } : {}), r * 0.55, r * 2.6, r * 0.55, 0, 0, 0, g);
        c.rotation.z = -Math.PI / 2;
        break;
      }
      case 'rock': case 'rockglove': {
        const d = mk(GEO.dodec(), this.toon(p.kind === 'rockglove' ? '#4e5a48' : '#8a6a45'), r, r, r, 0, 0, 0, g);
        g.userData.spin = d;
        break;
      }
      case 'air': {
        mk(GEO.sphere(), basic('rgba(225,245,255,0.28)'), r, r, r, 0, 0, 0, g);
        const t = mk(GEO.torus(0.08, 4.6), basic('rgba(255,255,255,0.85)'), r * 0.85, r * 0.85, r * 0.85, 0, 0, 0, g);
        g.userData.spin = t;
        break;
      }
      case 'boomerang': {
        const t = mk(GEO.torus(0.18, 2.2), this.toon('#d2b07a'), r * 1.1, r * 1.1, r * 1.1, 0, 0, 0, g); t.rotation.x = Math.PI / 2;
        g.userData.yspin = true;
        break;
      }
      case 'club': {
        const c = new THREE.Group(); g.add(c);
        const sh = mk(GEO.cyl(), this.toon('#e8e0cc'), 0.12, r * 2, 0.12, 0, 0, 0, c); sh.rotation.z = Math.PI / 2;
        mk(GEO.sphere(), this.toon('#c9b38a'), 0.25, 0.25, 0.25, r, 0, 0, c);
        g.userData.yspin = true;
        break;
      }
      case 'knife': case 'arrow': {
        const c = mk(GEO.cyl(), this.toon(p.kind === 'knife' ? '#d9dee3' : '#5a3d22'), 0.05, r * 2.6, 0.05, 0, 0, 0, g); c.rotation.z = Math.PI / 2;
        const tip = mk(GEO.cone(4), this.toon('#e6eaee'), 0.1, 0.35, 0.1, r * 1.4, 0, 0, g); tip.rotation.z = -Math.PI / 2;
        break;
      }
      case 'bomb': {
        mk(GEO.sphere(), this.toon('#222222'), r, r, r, 0, 0, 0, g);
        const s = this.glowSprite('#ffcc55', 0.7, 1); s.position.y = r * 1.2; g.add(s);
        break;
      }
      default: g.add(this.glowSprite('#ffffff', r * 3, 1));
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { obj: g, own };
  },

  poseProjectile(v, p, w) {
    const g = v.obj;
    g.position.set(p.x * S3, (p.z ?? 14) * S3, p.y * S3);
    const a = Math.atan2(p.vy, p.vx);
    if (p.vx || p.vy) g.rotation.y = -a;
    if (g.userData.spin) { g.userData.spin.rotation.x = p.spin * 0.6; g.userData.spin.rotation.z = p.spin * 0.4; }
    if (g.userData.yspin) g.rotation.y = p.spin * 1.4;
  },

  buildPickup(p) {
    const g = new THREE.Group();
    if (p.type === 'cabbage') {
      mk(GEO.sphere(), this.toon('#3f8f3a'), 0.5, 0.45, 0.5, 0, 0, 0, g);
      mk(GEO.sphere(), this.toon('#8fd47a'), 0.36, 0.38, 0.36, 0, 0.12, 0.05, g);
    } else if (p.type === 'lotus') {
      mk(GEO.cyl(1, 1, 20), this.toon('#d9c7a0'), 0.5, 0.12, 0.5, 0, 0, 0, g);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const pt = mk(GEO.sphere(), this.toon('#ffffff'), 0.16, 0.05, 0.08, Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2, g); pt.rotation.y = -a; }
      mk(GEO.sphere(), this.toon('#f2c94c'), 0.08, 0.06, 0.08, 0, 0.1, 0, g);
      g.rotation.x = -0.6;
    } else {
      mk(GEO.sphere(), new THREE.MeshBasicMaterial({ color: 0xbff4ff }), 0.22, 0.22, 0.22, 0, 0, 0, g);
      g.add(this.glowSprite('#4fc8ff', 1.6, 0.9));
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { obj: g };
  },

  // ---------------------------------------------------------------- effects
  buildEffect(e, w) {
    const g = new THREE.Group();
    switch (e.type) {
      case 'slash': {
        const p = parseCss(e.col);
        const geo = new THREE.RingGeometry(0.62, 1, 24, 1, -e.ang - e.arc / 2, e.arc);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: p.c, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
        m.userData.ownGeo = true; m.rotation.x = -Math.PI / 2; g.add(m); g.userData.m = m;
        break;
      }
      case 'bolt': {
        const path = new THREE.CurvePath();
        const v = e.pts.map(([x, y]) => new THREE.Vector3(x * S3, 0.95 + rand(-0.15, 0.15), y * S3));
        for (let i = 1; i < v.length; i++) path.add(new THREE.LineCurve3(v[i - 1], v[i]));
        const core = new THREE.Mesh(new THREE.TubeGeometry(path, v.length * 2, 0.07, 5, false), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
        const glow = new THREE.Mesh(new THREE.TubeGeometry(path, v.length * 2, 0.26, 6, false), additive(e.blue || '#bfe4ff', { opacity: 0.55 }));
        core.userData.ownGeo = glow.userData.ownGeo = true;
        g.add(core); g.add(glow); g.userData.light = '#bfe4ff';
        break;
      }
      case 'blast': {
        const col = e.kind === 'bluefire' ? '#5fb8ff' : e.kind === 'earth' ? '#c9a36b' : e.kind === 'spirit' ? '#b08cff' : '#ff9a30';
        mk(GEO.sphere(), additive(col, { opacity: 0.75 }), 1, 1, 1, 0, 0, 0, g);
        const s = this.glowSprite(e.kind === 'earth' ? '#fff2d0' : '#ffe8b0', 1, 1); g.add(s);
        g.userData.light = col;
        break;
      }
      case 'ring': {
        const r = mk(GEO.ring(0.84), basic(e.color), 1, 1, 1, 0, 0.08, 0, g); r.rotation.x = -Math.PI / 2;
        const wall = mk(GEO.cylOpen(), basic(e.color, { opacity: 0.25 }), 1, 1, 1, 0, 0.5, 0, g);
        wall.material.side = THREE.DoubleSide; g.userData.wall = wall;
        break;
      }
      case 'telegraph': {
        const o = mk(GEO.ring(0.92), basic(e.color), 1, 1, 1, 0, 0.07, 0, g); o.rotation.x = -Math.PI / 2;
        const f = mk(GEO.disc(), basic(e.color, { opacity: 0.25 }), 1, 1, 1, 0, 0.05, 0, g); f.rotation.x = -Math.PI / 2;
        g.userData.fill = f;
        if (e.boulder) { const b = mk(GEO.dodec(), this.toon('#7d5c3c'), 1, 1, 1, 0, 0, 0, g); b.castShadow = true; g.userData.boulder = b; }
        break;
      }
      case 'tornado': {
        const mat = basic('rgba(235,248,255,0.55)');
        g.userData.rings = [];
        for (let i = 0; i < 11; i++) { const t = mk(GEO.torus(0.05, 4.4), mat, 1, 1, 1, 0, 0, 0, g); t.rotation.x = Math.PI / 2; g.userData.rings.push(t); }
        const cone = mk(GEO.coneOpen(), basic('rgba(200,225,240,0.13)'), 1, 1, 1, 0, 0, 0, g); cone.rotation.x = Math.PI; g.userData.cone = cone;
        break;
      }
      case 'patch': {
        const d = mk(GEO.disc(), additive(e.blue ? '#2a62ff' : '#ff5a1a', { opacity: 0.45 }), 1, 1, 1, 0, 0.06, 0, g); d.rotation.x = -Math.PI / 2;
        g.userData.d = d;
        break;
      }
      case 'appa': {
        const a = buildAppa(this); g.add(a); g.userData.appa = a;
        break;
      }
      case 'spawn': {
        const d = mk(GEO.disc(), basic('rgba(20,8,8,0.6)'), 1, 1, 1, 0, 0.05, 0, g); d.rotation.x = -Math.PI / 2; g.userData.d = d;
        break;
      }
      default: return null;
    }
    return { obj: g };
  },

  poseEffect(v, e, w) {
    const g = v.obj, k = clamp(e.t / e.life, 0, 1);
    const setOp = (o, a) => o.traverse(c => { if (c.material) c.material.opacity = a * (c.material.userData.op0 ?? (c.material.userData.op0 = c.material.opacity)); });
    switch (e.type) {
      case 'slash': {
        const o = e.owner;
        g.position.set(o.x * S3, 1.0, o.y * S3);
        g.scale.setScalar(e.range * S3 * (0.7 + 0.3 * k));
        g.userData.m.material.opacity = (1 - k) * 0.9;
        break;
      }
      case 'bolt': setOp(g, 1 - k); break;
      case 'blast': {
        g.position.set(e.x * S3, 0.6, e.y * S3);
        const s = e.r * S3 * (0.5 + 0.7 * k);
        g.children[0].scale.setScalar(s);
        g.children[1].scale.set(s * 3, s * 3, 1);
        setOp(g, (1 - k));
        break;
      }
      case 'ring': {
        const R = Math.max(0.05, k * e.maxR * S3);
        g.position.set(e.x * S3, 0, e.y * S3); g.scale.set(R, 1, R);
        g.userData.wall.scale.y = 1.2 * (1 - k);
        setOp(g, 1 - k);
        break;
      }
      case 'telegraph': {
        g.position.set(e.x * S3, 0, e.y * S3);
        g.children[0].scale.setScalar(e.r * S3);
        g.userData.fill.scale.setScalar(Math.max(0.01, e.r * S3 * k));
        if (g.userData.boulder) { const b = g.userData.boulder; b.position.y = (1 - k) * 12 + 0.6; b.scale.setScalar(e.r * S3 * 0.42); b.rotation.set(k * 6, k * 4, 0); }
        break;
      }
      case 'tornado': {
        g.position.set(e.x * S3, 0, e.y * S3);
        const fade = Math.min(1, e.t * 4, (e.life - e.t) * 3);
        const R = e.r * S3;
        g.userData.rings.forEach((t, i) => {
          const kk = i / 10;
          t.scale.setScalar(R * (0.2 + kk * 0.9) * fade);
          t.position.set(Math.sin(w.time * 3 + i * 0.6) * 0.3 * kk, kk * R * 2.1, Math.cos(w.time * 3 + i * 0.6) * 0.3 * kk);
          t.rotation.z = w.time * (8 + i);
        });
        const c = g.userData.cone; c.scale.set(R * 1.1 * fade, R * 2.1, R * 1.1 * fade); c.position.y = R * 1.05; c.rotation.y = w.time * 6;
        break;
      }
      case 'patch': {
        g.position.set(e.x * S3, 0, e.y * S3);
        g.userData.d.scale.setScalar(e.r * S3 * (1 + Math.sin(w.time * 14 + e.x) * 0.06));
        g.userData.d.material.opacity = 0.45 * Math.min(1, (e.life - e.t) * 2);
        break;
      }
      case 'appa': {
        const a = g.userData.appa;
        g.position.set(e.x * S3, 3.6 + Math.sin(w.time * 3) * 0.2, e.y * S3);
        a.rotation.y = Math.atan2(Math.cos(e.ang), Math.sin(e.ang));
        a.legs.forEach((l, i) => { l.position.y = -34 + Math.sin(w.time * 6 + i) * 3; });
        break;
      }
      case 'spawn': g.position.set(e.x * S3, 0, e.y * S3); g.userData.d.scale.setScalar(1.2 * k); break;
    }
  },

  syncLights(w) {
    const cands = [];
    for (const [e, v] of this.em) if (v.obj.userData.light) {
      const k = clamp(e.t / e.life, 0, 1);
      cands.push({ x: e.type === 'bolt' ? e.pts[e.pts.length - 1][0] : e.x, y: e.type === 'bolt' ? e.pts[e.pts.length - 1][1] : e.y, c: v.obj.userData.light, i: (e.type === 'bolt' ? 70 : 90) * (1 - k), h: 1.5 });
    }
    const tx = this.target.x / S3, ty = this.target.z / S3;
    const fires = [];
    for (const [p, v] of this.pm) if (v.obj.userData.light) fires.push({ x: p.x, y: p.y, c: v.obj.userData.light, i: 14, h: 0.9, d: dist(p.x, p.y, tx, ty) });
    fires.sort((a, b) => a.d - b.d);
    cands.push(...fires);
    this.lights.forEach((L, i) => {
      const c = cands[i];
      if (!c) { L.intensity = 0; return; }
      L.position.set(c.x * S3, c.h, c.y * S3); L.color.copy(parseCss(c.c).c); L.intensity = c.i;
    });
  },

  // ---------------------------------------------------------------- camera
  updateCamera(dt, w, focus, mouse) {
    if (this.world !== w) this.setWorld(w);
    const action = Save.data.settings.cam === 'action';
    const dist0 = (action ? 15 : 23) * this.zoom;
    const pitch = action ? 0.5 : 0.86;
    let tx = focus.x, ty = focus.y;
    if (mouse) {
      // look slightly toward the cursor, but never so far that the hero leaves the screen
      let dx = mouse.x - focus.x, dy = mouse.y - focus.y;
      const d = Math.hypot(dx, dy), maxD = action ? 260 : 420;
      if (d > maxD) { dx *= maxD / d; dy *= maxD / d; }
      tx += dx * 0.15; ty += dy * 0.15;
    }
    tx = clamp(tx, 0, w.W); ty = clamp(ty, 0, w.H);
    const k = 1 - Math.exp(-7 * dt);
    if (!this.camInit || this.camWorld !== w) { this.target.set(tx * S3, 0, ty * S3); this.camInit = true; this.camWorld = w; }
    this.target.x += (tx * S3 - this.target.x) * k; this.target.z += (ty * S3 - this.target.z) * k;
    const c = this.camera;
    const sh = (w.shake || 0) * 0.02;
    c.position.set(this.target.x + rand(-sh, sh), dist0 * Math.sin(pitch) + rand(-sh, sh), this.target.z + dist0 * Math.cos(pitch));
    c.lookAt(this.target.x, 1.2, this.target.z);
    this.sun.position.set(this.target.x + 18, 34, this.target.z + 12);
    this.sun.target.position.set(this.target.x, 0, this.target.z);
    // aim ray → ground plane at body height
    const ndc = new THREE.Vector2((Input.mx / this.w) * 2 - 1, -(Input.my / this.h) * 2 + 1);
    this.ray.setFromCamera(ndc, c);
    const hit = this.ray.ray.intersectPlane(this.aimPlane, this.tmpV);
    if (hit) { Game.mouseWorld.x = hit.x / S3; Game.mouseWorld.y = hit.z / S3; }
    const vh = 2 * dist0 * Math.tan(c.fov * Math.PI / 360) / S3;
    w.view.x = this.target.x / S3; w.view.y = this.target.z / S3; w.view.w = vh * c.aspect; w.view.h = vh;
  },

  project(x, y, h) {
    this.tmpV.set(x * S3, h * S3, y * S3).project(this.camera);
    return { x: (this.tmpV.x + 1) / 2 * this.w, y: (1 - this.tmpV.y) / 2 * this.h, vis: this.tmpV.z < 1 };
  },

  render(w, dt) {
    this.canvas.style.display = 'block';
    this.sync(w, dt);
    this.renderer.render(this.scene, this.camera);
  },

  hide() { if (this.canvas) this.canvas.style.display = 'none'; },

  // Automatic quality scaling: if frames are consistently slow, drop resolution, then shadows.
  perf: { ema: 1 / 60, slowT: 0, level: 0 },
  adapt(realDt) {
    const p = this.perf;
    p.ema = p.ema * 0.95 + Math.min(realDt, 0.1) * 0.05;
    p.slowT = p.ema > 1 / 38 ? p.slowT + realDt : 0;
    if (p.slowT > 2.5 && p.level < 2) {
      p.level++; p.slowT = 0; p.ema = 1 / 60;
      if (p.level === 1) this.renderer.setPixelRatio(1);
      else { this.renderer.shadowMap.enabled = false; if (this.scene) this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
      if (this.w) this.renderer.setSize(this.w, this.h, false);
    }
  },

  // ---------------------------------------------------------------- title-screen diorama
  menuWorld: null,
  renderMenu(dt, t) {
    if (!this.menuWorld) {
      const theme = pick(['snow', 'airtemple', 'forest', 'basingse', 'palace', 'wulong']);
      const w = this.menuWorld = new World({ theme, seed: randi(1, 9999), W: 1600, H: 1100 });
      w.obstacles = w.obstacles.filter(o => dist(o.x, o.y, w.W / 2, w.H / 2) > 330);
      const cast = ['aang', 'katara', 'sokka', 'toph', 'zuko'];
      cast.forEach((id, i) => {
        const a = Math.PI / 2 + (i - 2) * 0.55;
        const f = new Fighter(ROSTER[id], 0, w.W / 2 + Math.cos(a) * 150, w.H / 2 + Math.sin(a) * 110 - 40, new IdleController(i));
        f.ang = a; w.add(f);
      });
      this.menuT = 0;
    }
    const w = this.menuWorld;
    Sound.mute = true;
    w.update(Math.min(dt, 0.033));
    Sound.mute = false;
    this.menuT += dt;
    if (this.world !== w) this.setWorld(w);
    const c = this.camera, a = this.menuT * 0.08 + Math.PI / 2;
    const cx = w.W / 2 * S3, cz = w.H / 2 * S3;
    c.position.set(cx + Math.cos(a) * 17, 7.5, cz + Math.sin(a) * 17);
    c.lookAt(cx, 1.8, cz);
    this.target.set(cx, 0, cz);
    this.sun.position.set(cx + 18, 34, cz + 12); this.sun.target.position.set(cx, 0, cz);
    w.view.x = w.W / 2; w.view.y = w.H / 2; w.view.w = 1600; w.view.h = 1100;
    this.canvas.style.display = 'block';
    this.sync(w, dt);
    this.renderer.render(this.scene, this.camera);
  },
  dropMenu() { if (this.world === this.menuWorld) this.clear(); this.menuWorld = null; },

  // ---------------------------------------------------------------- 3D portraits for menus
  portrait(ctx, def, W, H, t, anim) {
    if (!this.pr) {
      const c = document.createElement('canvas');
      const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(256, 256, false);
      r.toneMapping = THREE.ACESFilmicToneMapping;
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x554466, 1.8));
      const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(2, 4, 5); sc.add(d);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      this.pr = { r, sc, cam, models: {} };
    }
    const P = this.pr;
    let m = P.models[def.id];
    if (!m) { m = P.models[def.id] = buildCharModel(def.art, this); m.root.scale.setScalar(S3); P.sc.add(m.root); }
    for (const id in P.models) P.models[id].root.visible = id === def.id;
    m.root.rotation.y = anim ? Math.sin(t * 0.7) * 0.6 : 0.35;
    m.arms.forEach((a, i) => { a.rotation.x = -0.35 - (anim ? (Math.sin(t * 2) + 1) * 0.35 : 0); a.rotation.z = (i ? 1 : -1) * 0.15; });
    m.legs.forEach(l => (l.rotation.x = 0));
    const tall = def.art.special === 'heibai' ? 4.4 : def.art.mount ? 3.9 : 3.0;
    const cy = tall * 0.52;
    P.cam.position.set(0, cy + 0.5, tall * 2.35); P.cam.lookAt(0, cy, 0);
    P.r.render(P.sc, P.cam);
    ctx.drawImage(P.r.domElement, 0, 0, W, H);
  },
};
