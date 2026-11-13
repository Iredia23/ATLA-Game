'use strict';
// ======================= Arenas & Story =======================

function paintTiles(g, W, H, size, line, jitterRng) {
  g.strokeStyle = line; g.lineWidth = 2;
  for (let y = 0; y < H; y += size) {
    const off = ((y / size) % 2) * size / 2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = -off; x < W; x += size) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + size); g.stroke(); }
  }
  if (jitterRng) for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(jitterRng() * W, jitterRng() * H, size * 0.9, size * 0.9); }
}

const THEMES = {
  snow: {
    name: 'South Pole', base: '#e4edf5', blotch: ['#d0dee9', '#f7fbfe', '#c6d6e3'], ambient: 'snow', ambientRate: 30,
    paint(g, r, W, H) {
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(140,200,235,0.35)'; ellipse(g, r() * W, r() * H, 40 + r() * 90, 15 + r() * 30); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
      for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40, y - 10, x + 90, y); g.stroke(); }
    },
    obstacles: [{ kind: 'ice', n: 12, r: [24, 46] }, { kind: 'tent', n: 5, r: [26, 32] }, { kind: 'igloo', n: 3, r: [32, 38] }],
  },
  forest: {
    name: 'Senlin Forest', base: '#4c6f36', blotch: ['#3e5f2c', '#5b8040', '#6b5a36', '#7a6a3a'], ambient: 'leaf', ambientRate: 10, tint: 'rgba(20,20,60,0.14)',
    paint(g, r, W, H) {
      g.strokeStyle = 'rgba(120,90,50,0.5)'; g.lineWidth = 60; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, H * 0.55); g.bezierCurveTo(W * 0.3, H * 0.3, W * 0.6, H * 0.8, W, H * 0.45); g.stroke();
      for (let i = 0; i < 900; i++) { g.strokeStyle = pick(['#6a9a48', '#335226', '#7cab52']); g.lineWidth = 1.5; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 6); g.stroke(); }
      for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#c08a2a', '#a8642a', '#d4a84a']); g.fillRect(r() * W, r() * H, 3, 2); }
    },
    obstacles: [{ kind: 'tree', n: 20, r: [18, 28], extra: { leaf: '#2f6b2a' } }, { kind: 'rock', n: 6, r: [18, 30] }],
  },
  north: {
    name: 'Northern Water Tribe', base: '#c9dfee', blotch: ['#b9d3e6', '#dcecf6', '#a9c8df'], ambient: 'snow', ambientRate: 15,
    paint(g, r, W, H) {
      paintTiles(g, W, H, 110, 'rgba(110,160,200,0.35)', r);
      g.fillStyle = 'rgba(40,110,190,0.55)';
      g.fillRect(0, H * 0.3, W, 26); g.fillRect(W * 0.42, 0, 26, H);
      g.fillStyle = 'rgba(200,235,255,0.5)'; g.fillRect(0, H * 0.3 + 4, W, 3); g.fillRect(W * 0.42 + 4, 0, 3, H);
    },
    obstacles: [{ kind: 'icewall', n: 12, r: [24, 32] }, { kind: 'ice', n: 6, r: [24, 40] }],
  },
  omashu: {
    name: 'Omashu', base: '#b8a687', blotch: ['#a8967a', '#c9b796', '#9a8a70'],
    paint(g, r, W, H) { paintTiles(g, W, H, 90, 'rgba(90,75,55,0.35)', r); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,140,60,0.25)'; ellipse(g, r() * W, r() * H, 20 + r() * 30, 8 + r() * 12); g.fill(); } },
    obstacles: [{ kind: 'cart', n: 4, r: [24, 28] }, { kind: 'statue', n: 5, r: [18, 22] }, { kind: 'rock', n: 6, r: [20, 34] }],
  },
  basingse: {
    name: 'Ba Sing Se', base: '#a59e86', blotch: ['#968f78', '#b3ab92', '#8a8470'],
    paint(g, r, W, H) {
      paintTiles(g, W, H, 140, 'rgba(70,90,60,0.3)', r);
      g.fillStyle = 'rgba(40,110,60,0.35)';
      for (let i = 0; i < 8; i++) { const x = r() * W, y = r() * H; g.fillRect(x, y, 120 + r() * 120, 18); }
    },
    obstacles: [{ kind: 'lantern', n: 10, r: [15, 18] }, { kind: 'tree', n: 6, r: [16, 22], extra: { leaf: '#3f7d3a' } }, { kind: 'cart', n: 2, r: [24, 26] }],
  },
  crystal: {
    name: 'Crystal Catacombs', base: '#1d2824', blotch: ['#16201c', '#24342c', '#1a3a2a'], ambient: 'glow', ambientRate: 8, tint: 'rgba(0,25,12,0.22)',
    paint(g, r, W, H) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = 'rgba(60,220,120,0.18)'; g.lineWidth = 2;
        let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 6; j++) { x += r() * 80 - 40; y += r() * 80 - 40; g.lineTo(x, y); } g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(30,90,110,0.5)'; ellipse(g, r() * W, r() * H, 60 + r() * 80, 25 + r() * 30); g.fill(); }
    },
    obstacles: [{ kind: 'crystal', n: 14, r: [20, 32] }, { kind: 'rock', n: 6, r: [24, 36], extra: { color: '#3a403a' } }],
  },
  firecapital: {
    name: 'Fire Nation Capital', base: '#5e4436', blotch: ['#523a2e', '#6e5040', '#4a3228'], ambient: 'ash', ambientRate: 12,
    paint(g, r, W, H) {
      paintTiles(g, W, H, 100, 'rgba(30,15,10,0.35)', r);
      for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(255,90,30,0.25)'; g.lineWidth = 2; let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += r() * 60 - 30; y += r() * 60 - 30; g.lineTo(x, y); } g.stroke(); }
    },
    obstacles: [{ kind: 'brazier', n: 6, r: [16, 18] }, { kind: 'column', n: 5, r: [18, 20] }, { kind: 'lavarock', n: 6, r: [22, 34] }],
  },
  airtemple: {
    name: 'Western Air Temple', base: '#a29d90', blotch: ['#948f83', '#b2ad9f', '#8a9478'],
    paint(g, r, W, H) {
      g.strokeStyle = 'rgba(80,75,65,0.35)'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H, R = 80 + r() * 120; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, R * 0.6, 0, TAU); g.stroke(); }
      for (let i = 0; i < 50; i++) { g.fillStyle = 'rgba(90,130,70,0.3)'; ellipse(g, r() * W, r() * H, 15 + r() * 40, 6 + r() * 14); g.fill(); }
    },
    obstacles: [{ kind: 'airpillar', n: 9, r: [18, 24] }, { kind: 'statue', n: 4, r: [18, 22] }, { kind: 'pine', n: 5, r: [20, 26] }],
  },
  palace: {
    name: 'Royal Palace Courtyard', base: '#6e2a20', blotch: ['#7a3226', '#5e2018', '#843a2a'], ambient: 'ash', ambientRate: 8,
    paint(g, r, W, H) {
      paintTiles(g, W, H, 120, 'rgba(212,160,32,0.35)', null);
      g.strokeStyle = 'rgba(212,160,32,0.6)'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H / 2, 300, 0, TAU); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, 280, 0, TAU); g.stroke();
    },
    obstacles: [{ kind: 'column', n: 10, r: [18, 20] }, { kind: 'brazier', n: 6, r: [16, 18] }],
  },
  wulong: {
    name: 'Wulong Forest', base: '#56634a', blotch: ['#4a5640', '#647256', '#3e4a36', '#6a6a52'], ambient: 'leaf', ambientRate: 6,
    paint(g, r, W, H) {
      for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(30,30,25,0.35)'; g.lineWidth = 2; let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += r() * 50 - 25; y += r() * 50 - 25; g.lineTo(x, y); } g.stroke(); }
    },
    obstacles: [{ kind: 'spire', n: 14, r: [26, 40] }, { kind: 'pine', n: 6, r: [20, 26] }],
  },
  rumble: {
    name: 'Earth Rumble Ring', base: '#b89b6a', blotch: ['#a88b5a', '#c8ab7a', '#9a7d50'],
    paint(g, r, W, H) {
      g.strokeStyle = 'rgba(90,60,30,0.6)'; g.lineWidth = 8; g.beginPath(); g.arc(W / 2, H / 2, Math.min(W, H) * 0.42, 0, TAU); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, 60, 0, TAU); g.stroke();
    },
    obstacles: [{ kind: 'rock', n: 4, r: [22, 30] }],
  },
};

function buildArena(themeId, W, H, seed) {
  const def = THEMES[themeId] || THEMES.snow;
  const rng = seeded(seed * 9973 + themeId.length * 131 + 17);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = def.base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = def.blotch[i % def.blotch.length]; g.globalAlpha = 0.18 + rng() * 0.25;
    ellipse(g, rng() * W, rng() * H, 30 + rng() * 140, 15 + rng() * 70); g.fill();
  }
  g.globalAlpha = 1;
  // paint() may use pick()/Math.random — make it deterministic for this arena
  if (def.paint) { const saved = Math.random; Math.random = seeded(seed + 99); try { def.paint(g, rng, W, H); } finally { Math.random = saved; } }
  // darker border
  const B = 90;
  const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
  edge(0, 0, 0, B, 0, 0, W, B); edge(0, H, 0, H - B, 0, H - B, W, B); edge(0, 0, B, 0, 0, 0, B, H); edge(W, 0, W - B, 0, W - B, 0, B, H);
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);

  const obstacles = [];
  const cx = W / 2, cy = H / 2;
  for (const spec of def.obstacles) {
    for (let i = 0; i < spec.n; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const r = spec.r[0] + rng() * (spec.r[1] - spec.r[0]);
        const x = 90 + rng() * (W - 180), y = 120 + rng() * (H - 200);
        if (dist(x, y, cx, cy) < 280) continue;
        if (obstacles.some(o => dist(o.x, o.y, x, y) < o.r + r + 70)) continue;
        const o = Object.assign({ x, y, r, kind: spec.kind }, spec.extra || {});
        if (['ice', 'rock', 'lavarock', 'spire'].includes(spec.kind)) o.pts = makePoly(rng, 8, r);
        if (spec.kind === 'crystal') { o.shards = []; for (let k = 0; k < 5; k++) o.shards.push([rng() * r - r / 2, r * (1.2 + rng() * 1.4), r * 0.22 + rng() * 4, rng() * 0.8 - 0.4]); }
        obstacles.push(o);
        break;
      }
    }
  }
  return { ground: c, obstacles, def };
}

// ----------------------------- Story campaign -----------------------------
const BOOKS = [
  { n: 1, name: 'Book One: Water', color: '#4aa3ff', icon: '💧' },
  { n: 2, name: 'Book Two: Earth', color: '#62b04a', icon: '🪨' },
  { n: 3, name: 'Book Three: Fire', color: '#ff5a2a', icon: '🔥' },
];

const STAGES = [
  { id: 'b1c1', book: 1, ch: 1, title: 'The Boy in the Iceberg', loc: 'Southern Water Tribe', theme: 'snow', rec: ['aang', 'katara', 'sokka'],
    intro: 'A hundred years after the Air Nomads vanished, two Water Tribe siblings free a boy and his flying bison from an iceberg. The beam of light that marked his return was seen across the sea — by a banished prince desperate to capture the Avatar.',
    tip: 'Use your dash (Space) to slip past spears. Basic attacks build your ultimate meter.',
    waves: [{ soldier: 3 }, { soldier: 3, firebender: 2 }, { soldier: 3, firebender: 3 }],
    bosses: [{ id: 'zuko', hp: 2.1 }], bossIntro: 'Prince Zuko has come for the Avatar!' },
  { id: 'b1c2', book: 1, ch: 2, title: 'Winter Solstice', loc: 'Senlin Forest', theme: 'forest', rec: ['aang', 'toph'],
    intro: 'Villagers near a burned forest are being taken by a monstrous spirit. Only the Avatar — the bridge between the human and spirit worlds — can face it. Lost spirits roam the dusk.',
    tip: 'Spirits are not benders, so they cannot be chi-blocked. Keep moving to avoid Hei Bai\'s pounce.',
    waves: [{ wisp: 6 }, { wisp: 8 }],
    bosses: [{ id: 'heibai', hp: 1.25 }], bossIntro: 'Hei Bai emerges from the burned forest!', adds: { every: 14, ids: ['wisp', 'wisp'] } },
  { id: 'b1c3', book: 1, ch: 3, title: 'The Siege of the North', loc: 'Northern Water Tribe', theme: 'north', modifier: 'fullmoon', rec: ['katara', 'aang'],
    intro: 'The Fire Navy\'s fleet blankets the sea. Admiral Zhao means to end the Water Tribe — and the Moon Spirit with it. Tonight the moon is full: waterbenders are at the height of their power.',
    tip: 'Full Moon: waterbending deals 50% more damage, and Bloodbending reaches much farther.',
    waves: [{ soldier: 4, firebender: 2 }, { firebender: 4, archer: 2 }, { soldier: 4, firebender: 3, archer: 2 }],
    bosses: [{ id: 'zhao', hp: 1.6 }], bossIntro: 'Admiral Zhao leads the assault!', adds: { every: 16, ids: ['firebender', 'soldier'] } },
  { id: 'b2c1', book: 2, ch: 1, title: 'Return to Omashu', loc: 'Omashu', theme: 'omashu', rec: ['toph', 'sokka'],
    intro: 'Omashu has fallen to the Fire Nation. Princess Azula\'s companions — the knife-throwing Mai and the chi-blocking acrobat Ty Lee — stand between Team Avatar and the city\'s freedom.',
    tip: 'Ty Lee\'s strikes block your bending! Non-benders like Sokka are immune.',
    waves: [{ soldier: 4, archer: 2 }, { firebender: 3, soldier: 3, archer: 1 }],
    bosses: [{ id: 'mai', hp: 0.95 }, { id: 'tylee', hp: 0.95 }], bossIntro: 'Mai and Ty Lee block the way!' },
  { id: 'b2c2', book: 2, ch: 2, title: 'Lake Laogai', loc: 'Ba Sing Se', theme: 'basingse', rec: ['toph', 'katara', 'zuko'],
    intro: 'Inside the Impenetrable City, there is no war — or so the Dai Li insist. Beneath Lake Laogai lies their secret headquarters, and their leader, Long Feng.',
    tip: 'Dai Li rock gloves root you in place. Dash early when you see them throw.',
    waves: [{ daili: 3 }, { daili: 5 }, { daili: 6 }],
    bosses: [{ id: 'longfeng', hp: 1.5 }], bossIntro: 'Long Feng commands the Dai Li!', adds: { every: 18, ids: ['daili'] } },
  { id: 'b2c3', book: 2, ch: 3, title: 'The Crossroads of Destiny', loc: 'Crystal Catacombs', theme: 'crystal', rec: ['zuko', 'aang', 'katara'],
    intro: 'Deep beneath Ba Sing Se, glowing crystals light the ancient catacombs. Azula has turned the Dai Li, and the Earth King\'s city is about to fall.',
    tip: 'Azula\'s lightning can be redirected by Zuko and Iroh — or dodged by watching her charge.',
    waves: [{ daili: 4 }, { daili: 5, soldier: 2 }],
    bosses: [{ id: 'azula', hp: 2.0 }], bossIntro: 'Princess Azula strikes!', adds: { every: 18, ids: ['daili'] } },
  { id: 'b3c1', book: 3, ch: 1, title: 'The Day of Black Sun', loc: 'Fire Nation Capital', theme: 'firecapital', modifier: 'eclipse', rec: ['sokka', 'toph', 'katara'],
    intro: 'During a total solar eclipse, firebenders lose their power. The invasion force storms the Fire Nation capital — but the defenders still have spears, arrows and a cavalry of komodo rhinos.',
    tip: 'Solar Eclipse: firebending is impossible — for everyone, including you! Firebenders fight hand-to-hand until the eclipse passes.',
    waves: [{ soldier: 5, firebender: 2 }, { soldier: 3, rhino: 2, archer: 2 }, { rhino: 3, soldier: 4 }],
    bosses: [{ id: 'mongke', hp: 1.6 }], bossIntro: 'The Rough Rhinos charge!' },
  { id: 'b3c2', book: 3, ch: 2, title: 'The Western Air Temple', loc: 'Western Air Temple', theme: 'airtemple', rec: ['sokka', 'aang', 'zuko'],
    intro: 'Hidden beneath a cliff edge, the Western Air Temple shelters Team Avatar — until a hired assassin with an explosive third eye finds them.',
    tip: 'Combustion Man\'s blasts follow a red aiming line. Stun him while he charges — and a well-timed boomerang to the head works wonders.',
    waves: [{ firebender: 4, archer: 2 }, { firebender: 3, soldier: 4 }],
    bosses: [{ id: 'combustion', hp: 1.6 }], bossIntro: '"Sparky Sparky Boom Man" has found you!' },
  { id: 'b3c3', book: 3, ch: 3, title: 'Agni Kai', loc: 'Royal Palace', theme: 'palace', modifier: 'comet', rec: ['zuko', 'katara'],
    intro: 'As Sozin\'s Comet blazes overhead, Azula prepares to be crowned Fire Lord. Her mind is unraveling, but her fire has never burned hotter. An Agni Kai will decide the throne.',
    tip: 'Sozin\'s Comet: all firebending deals 50% more damage — yours and hers.',
    waves: [{ firebender: 3, soldier: 3 }],
    bosses: [{ id: 'azula', hp: 2.3 }], bossIntro: 'Azula accepts the Agni Kai!' },
  { id: 'b3c4', book: 3, ch: 4, title: "Sozin's Comet", loc: 'Wulong Forest', theme: 'wulong', modifier: 'comet', rec: ['aang'],
    intro: 'With the comet\'s power, the self-proclaimed Phoenix King means to burn the Earth Kingdom to ashes. Among the stone spires of Wulong Forest, the Avatar must face Fire Lord Ozai.',
    tip: 'The final battle. Save your ultimate for when Ozai is enraged.',
    waves: [{ firebender: 4, archer: 2 }, { firebender: 5, rhino: 1 }],
    bosses: [{ id: 'ozai', hp: 2.2 }], bossIntro: 'Phoenix King Ozai descends!' },
];

const ARENAS = ['snow', 'forest', 'north', 'omashu', 'basingse', 'crystal', 'firecapital', 'airtemple', 'palace', 'wulong', 'rumble'];
const SURVIVAL_POOL = {
  snow: ['soldier', 'firebender'], forest: ['wisp', 'soldier'], north: ['soldier', 'firebender', 'archer'],
  omashu: ['soldier', 'archer', 'firebender'], basingse: ['daili', 'soldier'], crystal: ['daili'],
  firecapital: ['soldier', 'rhino', 'archer', 'firebender'], airtemple: ['firebender', 'archer'], palace: ['firebender', 'soldier'],
  wulong: ['firebender', 'rhino', 'archer'], rumble: ['daili', 'soldier', 'firebender'],
};
const SURVIVAL_BOSSES = ['zhao', 'mai', 'tylee', 'longfeng', 'combustion', 'mongke', 'zuko', 'azula', 'heibai'];
