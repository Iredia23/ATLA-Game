'use strict';
// ======================= Roster =======================
// Every fighter — hero, boss or foot soldier — is built from one of these definitions.

const AVATAR_BARRAGE = {
  name: 'Elemental Barrage', icon: '☯️', cd: 0.2, elem: 'air', desc: 'Cycle through all four elements.',
  cast(f, w, a) {
    const i = (f._ae = (f._ae || 0) + 1) % 4;
    if (i === 0) { A.shoot(w, f, a, { kind: 'fire', elem: 'fire', speed: 820, r: 11, dmg: 12, burn: 4, knock: 150 }); Sound.play('fire'); }
    else if (i === 1) { A.shoot(w, f, a, { kind: 'water', elem: 'water', speed: 780, r: 11, dmg: 12, slow: 0.3, knock: 150 }); Sound.play('water'); }
    else if (i === 2) { A.shoot(w, f, a, { kind: 'rock', elem: 'earth', speed: 700, r: 13, dmg: 15, knock: 360, power: 2 }); Sound.play('earth'); }
    else { A.shoot(w, f, a, { kind: 'air', elem: 'air', speed: 900, r: 13, dmg: 11, knock: 460 }); Sound.play('air'); }
  },
};
const METAL_SHARDS = {
  name: 'Metal Shards', icon: '🔩', cd: 0.5, elem: 'earth', desc: 'Fling three razor metal shards.',
  cast(f, w, a) { A.fan(w, f, a, 3, 0.3, { kind: 'metal', elem: 'earth', speed: 840, r: 7, dmg: 8, knock: 120 }); Sound.play('ice'); },
};
const DAO_SLASH = {
  name: 'Dao Slash', icon: '⚔️', cd: 0.3, bending: false, desc: 'Twin broadsword combo that parries projectiles.',
  cast(f, w, a) { w.melee(f, a, 74, 2.0, 13, { color: '#e6edf3', knock: 140, parry: true }); Sound.play('slash'); },
};
const BLUE_FIRE = (o = {}) => Object.assign({ kind: 'bluefire', elem: 'fire', blue: true }, o);

function lightningCharge(f, w, t, dmg, range = 740) {
  f.moveLock = t;
  Sound.play('charge');
  A.stance(f, 'lightningCharge', t, '#bfe4ff', {
    end(f2, w2) { if (f2.alive && f2.status.stun <= 0) w2.lightning(f2, f2.ang, range, dmg); },
  });
}

function redirectStance(f, w, t) {
  f.moveLock = 0.25;
  Sound.play('charge');
  A.stance(f, 'redirect', t, '#9fd0ff', { redirect: true });
  w.text(f.x, f.y - 64, 'Redirect stance', '#bfe4ff', 12);
}

const ROSTER = {
  // ---------------------------------------------------- HEROES
  aang: {
    id: 'aang', name: 'Aang', title: 'The Last Airbender', element: 'air', nation: 'Air Nomads',
    hp: 150, speed: 250, r: 16, chiRegen: 16, difficulty: 2, dashCdMult: 0.6, ultGain: 1.0,
    desc: 'The fun-loving Avatar and last of the Air Nomads. Evasive and fast — and when pushed to the edge he can enter the Avatar State to wield all four elements.',
    passive: { name: 'Air Nomad Agility', desc: 'Dash recharges 40% faster.' },
    art: { skin: '#f1c9a0', c1: '#e98b1d', c2: '#f6c445', c3: '#a8521a', pants: '#d07a1a', hair: 'bald', arrow: true, weapon: 'staff', cape: true, sleeve: '#f6c445' },
    ai: { style: 'ranged', range: 270, projSpeed: 760, dodge: 0.85 },
    abilities: {
      basic: { name: 'Air Blast', icon: '💨', cd: 0.38, desc: 'A fast gust that knocks enemies back.', ai: { max: 520 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'air', speed: 760, r: 11, dmg: 8, knock: 340, life: 0.75 }); Sound.play('air'); } },
      q: { name: 'Air Scooter', icon: '🌀', cd: 6, chi: 20, desc: 'Ride a spinning ball of air for 2.6s: +80% speed and bowl through enemies.', ai: { type: 'gap', chance: 0.5 },
        cast(f, w) {
          Sound.play('air');
          f.addBuff('scooter', { t: 2.6, speedMult: 1.8, hover: 8, hitAt: {},
            tick(f2, w2, dt, b) {
              if (Math.random() < dt * 30) w2.parts.emit('air', f2.x, f2.y, 1, { smax: 30 });
              for (const e of w2.fighters) {
                if (!e.alive || e.team === f2.team || dist(f2.x, f2.y, e.x, e.y) > f2.r + e.r + 8) continue;
                if ((b.hitAt[e.id] || 0) > w2.time) continue;
                b.hitAt[e.id] = w2.time + 0.5;
                w2.damage(e, 10, f2, { elem: 'air', knock: 450, dir: angTo(f2.x, f2.y, e.x, e.y) });
              }
            },
            drawBack(ctx, f2, w2) {
              ctx.save(); ctx.globalAlpha = 0.75; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
              for (let i = 0; i < 4; i++) { const s = w2.time * 16 + i * 1.6; ctx.beginPath(); ctx.ellipse(f2.x, f2.y - 4, 15, 9, 0, s, s + 3.2); ctx.stroke(); }
              ctx.restore();
            } });
        } },
      e: { name: 'Air Vortex', icon: '🌪️', cd: 10, chi: 35, desc: 'Summon a tornado that drags in enemies, batters them and swallows projectiles.', ai: { min: 0, max: 480, chance: 0.6 },
        cast(f, w) { const [x, y] = A.aimPoint(f, 480); A.tornado(w, f, x, y, { life: 4, r: 105, dmg: 6 }); Sound.play('airBig'); } },
      r: { name: 'Air Sphere', icon: '🫧', cd: 9, chi: 25, desc: 'A spinning sphere of air reflects every projectile for 2.5s.', ai: { type: 'defense', chance: 0.8 },
        cast(f, w) {
          Sound.play('air');
          f.addBuff('reflect', { t: 2.5, reflect: true,
            draw(ctx, f2, w2) {
              ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 2;
              circle(ctx, f2.x, f2.y - 22, 32); ctx.stroke();
              ctx.globalAlpha = 0.15; ctx.fillStyle = '#cfefff'; ctx.fill();
              ctx.globalAlpha = 0.6;
              for (let i = 0; i < 3; i++) { const s = w2.time * 8 + i * 2; ctx.beginPath(); ctx.ellipse(f2.x, f2.y - 22, 32, 12, s * 0.3, s, s + 2); ctx.stroke(); }
              ctx.restore();
            } });
        } },
    },
    dash: { name: 'Air Step', icon: '🪁', cd: 1.6, speed: 900, time: 0.2, iframes: 0.28, elem: 'air' },
    ult: { name: 'Avatar State', icon: '👁️', call: 'AVATAR STATE!', desc: '9s of glowing power: master all four elements, regenerate, resist damage and release a massive shockwave.',
      ai: { max: 500 },
      cast(f, w) {
        w.ring(f, f.x, f.y, 340, 700, 30, { elem: 'air', knock: 650, parts: 'air', color: 'rgba(200,245,255,0.9)' });
        f.cd.q = f.cd.e = f.cd.r = 0;
        f.addBuff('avatar', { t: 9, avatar: true, glow: 'rgba(160,240,255,0.55)', dmgMult: 1.4, dr: 0.4, hover: 12, basic: AVATAR_BARRAGE, ccImmune: true,
          tick(f2, w2, dt) {
            f2.hp = Math.min(f2.maxHp, f2.hp + 7 * dt); f2.chi = Math.min(f2.maxChi, f2.chi + 20 * dt);
            if (Math.random() < dt * 20) w2.parts.emit('glow', f2.x + rand(-14, 14), f2.y - rand(0, 40), 1, { smax: 20 });
          },
          drawBack(ctx, f2, w2) {
            const cols = ['#ff6a1a', '#3fa0ff', '#8a6a45', '#ffffff'];
            for (let i = 0; i < 4; i++) {
              const a = w2.time * 3 + i * TAU / 4;
              ctx.fillStyle = cols[i]; circle(ctx, f2.x + Math.cos(a) * 30, f2.y - 30 + Math.sin(a) * 12, 5); ctx.fill();
            }
          } });
      } },
  },

  katara: {
    id: 'katara', name: 'Katara', title: 'Master Waterbender', element: 'water', nation: 'Southern Water Tribe',
    hp: 155, speed: 232, r: 16, chiRegen: 14, difficulty: 2, regenOOC: 3,
    desc: 'A fierce waterbending master and gifted healer from the Southern Water Tribe. Controls the battlefield with ice and water — and is far stronger under the full moon.',
    passive: { name: 'Tribal Healer', desc: 'Regenerates 3 HP/s after 3s without taking damage. Waterbending is 50% stronger under a full moon.' },
    art: { skin: '#b37a52', c1: '#2a6fb5', c2: '#9cc7ec', c3: '#1b3f6b', pants: '#1f4f85', hair: 'katara', hairColor: '#3b2416', robe: true, crest: '#9cc7ec' },
    ai: { style: 'ranged', range: 280, projSpeed: 640, dodge: 0.7 },
    abilities: {
      basic: { name: 'Water Whip', icon: '💧', cd: 0.42, desc: 'A lashing stream of water that slows.', ai: { max: 400 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'water', speed: 660, r: 10, dmg: 11, slow: 0.25, slowT: 1, knock: 160, life: 0.6 }); Sound.play('water'); } },
      q: { name: 'Ice Spikes', icon: '❄️', cd: 5, chi: 20, desc: 'A fan of five freezing shards that heavily slow.', ai: { max: 360, chance: 0.6 },
        cast(f, w, a) { A.fan(w, f, a, 5, 0.5, { kind: 'ice', elem: 'water', speed: 740, r: 8, dmg: 7, slow: 0.4, slowT: 1.6, knock: 80, life: 0.55 }); Sound.play('ice'); } },
      e: { name: 'Healing Waters', icon: '💙', cd: 12, chi: 30, desc: 'Glowing water restores 45 HP over 2s to Katara and nearby allies and cleanses burns.', ai: { type: 'self', hp: 0.55, chance: 0.8 },
        cast(f, w) {
          Sound.play('heal');
          for (const al of w.alliesOf(f)) {
            if (dist(f.x, f.y, al.x, al.y) > 170) continue;
            al.status.burn = null; al.status.slow = null;
            al.addBuff('healing', { t: 2, tick(f2, w2, dt) { w2.heal(f2, 22.5 * dt); if (Math.random() < dt * 25) w2.parts.emit('heal', f2.x + rand(-12, 12), f2.y - rand(0, 30), 1, { smax: 10 }); },
              draw(ctx, f2, w2) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 3; const s = w2.time * 6; ctx.beginPath(); ctx.ellipse(f2.x, f2.y - 20, 22, 10, 0, s, s + 4); ctx.stroke(); ctx.restore(); } });
          }
        } },
      r: { name: 'Octopus Form', icon: '🐙', cd: 14, chi: 40, desc: 'Eight water tentacles for 5s: block projectiles, take 45% less damage and auto-lash nearby enemies.', ai: { type: 'buff', max: 220, chance: 0.6 },
        cast(f, w) {
          Sound.play('water');
          f.addBuff('octopus', { t: 5, dr: 0.45, speedMult: 0.85, acc: 0, lash: null,
            tick(f2, w2, dt, b) {
              b.acc += dt;
              if (b.acc >= 0.32) {
                b.acc = 0;
                const e = w2.nearestEnemy(f2, 190);
                if (e) { w2.damage(e, 8, f2, { elem: 'water', slow: 0.3, knock: 140 }); b.lash = { x: e.x, y: e.y, t: 0.15 }; w2.parts.emit('water', e.x, e.y - 15, 6); Sound.play('water'); }
              }
              if (b.lash) { b.lash.t -= dt; if (b.lash.t <= 0) b.lash = null; }
              for (const p of w2.projectiles) if (p.team !== f2.team && !p.dead && dist(p.x, p.y, f2.x, f2.y) < f2.r + 34) { p.die(w2, true); w2.parts.emit('water', p.x, p.y, 4); }
            },
            drawBack(ctx, f2, w2, b) {
              ctx.save(); ctx.globalAlpha = 0.72; ctx.lineCap = 'round';
              for (let i = 0; i < 8; i++) {
                const a = i / 8 * TAU + w2.time * 0.8;
                const L = 38 + Math.sin(w2.time * 5 + i) * 8;
                const bx = f2.x, by = f2.y - 22;
                const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L * 0.7;
                ctx.strokeStyle = '#3d9cf0'; ctx.lineWidth = 7;
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(a + 0.6) * L * 0.6, by + Math.sin(a + 0.6) * L * 0.5, ex, ey); ctx.stroke();
                ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; ctx.stroke();
              }
              if (b.lash) { ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(f2.x, f2.y - 22); ctx.lineTo(b.lash.x, b.lash.y - 15); ctx.stroke(); }
              ctx.restore();
            } });
        } },
    },
    dash: { name: 'Water Slide', icon: '🌊', cd: 2.0, speed: 820, time: 0.22, elem: 'water' },
    ult: { name: 'Bloodbending', icon: '🩸', call: 'BLOODBENDING!', desc: 'A forbidden technique: seize every nearby enemy, hold them helpless, then hurl them away. Larger reach under the full moon.',
      ai: { max: 380 },
      cast(f, w) {
        const R = w.modifier === 'fullmoon' ? 650 : 430;
        const targets = w.enemiesOf(f).filter(e => dist(f.x, f.y, e.x, e.y) < R);
        f.moveLock = 0.8;
        for (const e of targets) {
          const dur = e.boss ? 1.4 : 2.6;
          e.status.stun = Math.max(e.status.stun, dur);
          e.addBuff('bloodbent', { t: dur, hover: 10, glow: 'rgba(200,20,40,0.45)',
            tick(e2, w2, dt) { if (Math.random() < dt * 12) w2.parts.emit('blood', e2.x, e2.y - 20, 1, { smax: 20 }); },
            end(e2, w2) { w2.damage(e2, 30, f, { elem: 'water', knock: 700, dir: angTo(f.x, f.y, e2.x, e2.y) }); } });
        }
        f.addBuff('bloodbending', { t: 2.6, targets,
          draw(ctx, f2, w2, b) {
            ctx.save(); ctx.strokeStyle = 'rgba(220,30,60,0.55)'; ctx.lineWidth = 1.5;
            for (const e of b.targets) if (e.alive && e.buffs.bloodbent) {
              ctx.beginPath(); ctx.moveTo(f2.x, f2.y - 20);
              ctx.quadraticCurveTo((f2.x + e.x) / 2 + Math.sin(w2.time * 8) * 20, (f2.y + e.y) / 2 - 40, e.x, e.y - 25); ctx.stroke();
            }
            ctx.restore();
          } });
      } },
  },

  sokka: {
    id: 'sokka', name: 'Sokka', title: 'Warrior of the Water Tribe', element: 'none', nation: 'Southern Water Tribe',
    hp: 185, speed: 242, r: 16, chiRegen: 18, difficulty: 1, stunBonus: 0.3, regenOOC: 2,
    desc: 'The idea guy. No bending — just a trusty boomerang, a sword forged from a meteorite, clever plans and a very large flying bison.',
    passive: { name: 'Plan Guy', desc: '+30% damage to stunned or rooted enemies. Immune to chi-blocking, unaffected by eclipses, and recovers 2 HP/s out of combat.' },
    art: { skin: '#b37a52', c1: '#2d5f9e', c2: '#9cb4cf', c3: '#1b3657', pants: '#21466f', hair: 'sokka', hairColor: '#2b1a10', weapon: 'sword', backItem: 'boomerang', crest: '#9cb4cf' },
    ai: { style: 'melee', range: 70, dodge: 0.6 },
    abilities: {
      basic: { name: 'Space Sword', icon: '🗡️', cd: 0.42, desc: 'Black meteorite sword slash that parries projectiles.', ai: { max: 90 },
        cast(f, w, a) { w.melee(f, a, 70, 1.9, 16, { color: '#3a3a48', knock: 160, parry: true }); Sound.play('slash'); } },
      q: { name: 'Boomerang', icon: '🪃', cd: 3.5, chi: 10, desc: 'Boomerang always comes back! Pierces and stuns on the way out and back.', ai: { max: 400, chance: 0.7 },
        cast(f, w, a) {
          Sound.play('boomerang');
          A.shoot(w, f, a, { kind: 'boomerang', elem: 'none', speed: 650, r: 11, dmg: 11, stun: 0.5, pierce: 99, knock: 120, life: 3, ghost: true, clash: false, reflectable: false,
            onHitFighter(p, w2, t) {
              if (t.buffs.combust) { // Sparky Sparky Boom Man's weakness!
                t.removeBuff('combust', w2);
                w2.text(t.x, t.y - 80, 'Sparky sparky... BOOM!', '#ffd27a', 16);
                w2.explode(t.x, t.y, 90, 45, p.owner, { kind: 'fire', elem: 'none', team: p.owner.team });
              }
              return true;
            },
            onUpdate(p, w2) {
              if (!p.back && p.t > 0.55) { p.back = true; p.hit.clear(); }
              if (p.back) {
                const o = p.owner;
                if (!o.alive) { p.die(w2, false); return; }
                const aa = angTo(p.x, p.y, o.x, o.y);
                p.vx = lerp(p.vx, Math.cos(aa) * 760, 0.12); p.vy = lerp(p.vy, Math.sin(aa) * 760, 0.12);
                if (dist(p.x, p.y, o.x, o.y) < o.r + 12) { p.dead = true; if (Math.random() < 0.3) w2.text(o.x, o.y - 60, 'Boomerang!', '#ffe7a0', 13); }
              }
            } });
        } },
      e: { name: 'Club Throw', icon: '🦴', cd: 7, chi: 15, desc: 'Hurl a whalebone club that stuns for 1.2s.', ai: { max: 420, chance: 0.6 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'club', elem: 'none', speed: 600, r: 10, dmg: 14, stun: 1.2, knock: 200, life: 0.9 }); Sound.play('slash'); } },
      r: { name: 'Fire Bomb', icon: '💣', cd: 9, chi: 25, desc: 'Lob an invention from the invasion plans that explodes in a fiery blast.', ai: { min: 120, max: 420, chance: 0.6 },
        cast(f, w) {
          const [tx, ty] = A.aimPoint(f, 430);
          A.lob(w, f, tx, ty, { time: 0.75, r: 110, onLand(w2, x, y) { w2.explode(x, y, 110, 32, f, { kind: 'fire', elem: 'none', burn: 4, team: f.team }); } });
          Sound.play('slash');
        } },
    },
    dash: { name: 'Tactical Roll', icon: '🤸', cd: 1.8, speed: 760, time: 0.22, elem: 'none' },
    ult: { name: 'Yip Yip!', icon: '🦬', call: 'APPA, YIP YIP!', desc: 'Appa swoops across the battlefield, flattening enemies and blowing away projectiles.',
      ai: { max: 600 },
      cast(f, w, a) {
        const sx = f.x - Math.cos(a) * 750, sy = f.y - Math.sin(a) * 750;
        const tx = f.x + Math.cos(a) * 1150, ty = f.y + Math.sin(a) * 1150;
        const hit = new Set();
        Sound.play('roar'); Sound.play('airBig');
        w.fx({ type: 'appa', x: sx, y: sy, life: 1.9, layer: 'top', ang: a,
          update(dt, w2, e) {
            const k = e.t / e.life; e.x = lerp(sx, tx, k); e.y = lerp(sy, ty, k);
            for (const t of w2.fighters) if (t.alive && t.team !== f.team && !hit.has(t.id) && dist(e.x, e.y, t.x, t.y) < 100 + t.r) {
              hit.add(t.id); w2.damage(t, 45, f, { elem: 'air', knock: 750, dir: a + (Math.random() < 0.5 ? 1 : -1) * 0.9, stun: 0.6 });
            }
            for (const p of w2.projectiles) if (p.team !== f.team && dist(e.x, e.y, p.x, p.y) < 140) p.die(w2, false);
            if (Math.random() < dt * 40) w2.parts.emit('air', e.x + rand(-70, 70), e.y + rand(-40, 40), 1, { smax: 90 });
          },
          draw(ctx, w2, e) { drawAppa(ctx, e.x, e.y, e.ang, w2.time, 1, 70); } });
      } },
  },

  toph: {
    id: 'toph', name: 'Toph', title: 'The Blind Bandit', element: 'earth', nation: 'Earth Kingdom',
    hp: 190, speed: 215, r: 17, chiRegen: 14, difficulty: 1, knockImmune: true,
    desc: 'The greatest earthbender in the world — and the inventor of metalbending. She "sees" through vibrations in the ground and stands her ground like a mountain.',
    passive: { name: 'Rooted Stance', desc: 'Immune to knockback — she is one with the earth beneath her feet.' },
    art: { skin: '#f3d6b8', c1: '#3f8a3a', c2: '#d8c060', c3: '#2a5a26', pants: '#2f6a2b', hair: 'toph', hairColor: '#1a1410', eye: '#c7ccd0', shoes: '#f3d6b8' },
    ai: { style: 'ranged', range: 240, projSpeed: 620, dodge: 0.4 },
    abilities: {
      basic: { name: 'Rock Throw', icon: '🪨', cd: 0.55, desc: 'Rip up a boulder and hurl it — heavy damage and knockback.', ai: { max: 480 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'rock', speed: 620, r: 12, dmg: 13, knock: 280, power: 2, life: 0.9 }); Sound.play('earth'); } },
      q: { name: 'Earth Wall', icon: '🧱', cd: 7, chi: 25, desc: 'Raise a wall of stone pillars that blocks projectiles and launches enemies.', ai: { type: 'defense', chance: 0.6 },
        cast(f, w, a) { const [x, y] = A.aimPoint(f, Math.min(280, Math.max(70, dist(f.x, f.y, f.aimX, f.aimY)))); A.wall(w, f, x, y, a, 5, { dmg: 10 }); } },
      e: { name: 'Seismic Stomp', icon: '👣', cd: 9, chi: 30, desc: 'Stomp the ground: a shockwave that damages and stuns everything nearby.', ai: { max: 230, chance: 0.8 },
        cast(f, w) { w.ring(f, f.x, f.y, 280, 560, 14, { elem: 'earth', stun: 1.0, knock: 220, parts: 'earth', color: 'rgba(170,120,70,0.95)' }); w.shakeIt(10); Sound.play('quake'); } },
      r: { name: 'Metal Armor', icon: '🛡️', cd: 15, chi: 35, desc: 'Encase yourself in metal for 6s: 50% damage reduction and your attacks become metal shards.', ai: { type: 'buff', max: 400, chance: 0.5 },
        cast(f, w) { Sound.play('ice'); w.parts.emit('metal', f.x, f.y - 20, 16, { smax: 90 }); f.addBuff('armor', { t: 6, dr: 0.5, armor: true, basic: METAL_SHARDS }); } },
    },
    dash: { name: 'Earth Glide', icon: '🏔️', cd: 2.2, speed: 760, time: 0.22, elem: 'earth' },
    ult: { name: 'Rock Avalanche', icon: '⛰️', call: 'ROCK AVALANCHE!', desc: 'A storm of boulders rains down on the target area, then the ground erupts.',
      ai: { max: 520 },
      cast(f, w) {
        const [cx, cy] = A.aimPoint(f, 520);
        Sound.play('quake');
        for (let i = 0; i < 11; i++) {
          const x = cx + rand(-170, 170), y = cy + rand(-130, 130);
          A.telegraph(w, x, y, 56, 0.5 + i * 0.11, 'rgba(170,120,60,0.9)', (w2) => {
            w2.explode(x, y, 62, 26, f, { kind: 'earth', elem: 'earth', stun: 0.6, knock: 250, team: f.team });
          }, { boulder: true });
        }
        A.later(w, 0.5 + 11 * 0.11 + 0.15, (w2) => { w2.ring(f, cx, cy, 250, 600, 18, { elem: 'earth', stun: 0.8, parts: 'earth', color: 'rgba(160,110,60,0.95)' }); w2.shakeIt(14); Sound.play('quake'); });
      } },
  },

  zuko: {
    id: 'zuko', name: 'Zuko', title: 'The Banished Prince', element: 'fire', nation: 'Fire Nation',
    hp: 160, speed: 235, r: 16, chiRegen: 14, difficulty: 2, lowHpDmg: 0.2,
    desc: 'The exiled prince searching for his honor. A relentless firebender who also fights with twin dao swords as the Blue Spirit, and learned to redirect lightning from his uncle.',
    passive: { name: 'Inner Fire', desc: '+20% damage while below 40% HP. Dao swords work even without bending.' },
    art: { skin: '#f2d4b6', c1: '#8f1d1d', c2: '#2b1a1a', c3: '#d4a020', pants: '#3a1a1a', hair: 'zuko', hairColor: '#17110e', scar: true, eye: '#8a5a12', crest: '#d4a020' },
    ai: { style: 'ranged', range: 250, projSpeed: 700, dodge: 0.7 },
    abilities: {
      basic: { name: 'Fire Fist', icon: '🔥', cd: 0.36, desc: 'A quick fire blast that sets enemies alight.', ai: { max: 480 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'fire', speed: 700, r: 9, dmg: 10, burn: 3, burnT: 2, knock: 120, life: 0.7 }); Sound.play('fire'); } },
      q: { name: 'Fire Whip', icon: '〰️', cd: 5, chi: 20, desc: 'A sweeping arc of flame in front of you that burns everything it touches.', ai: { max: 170, chance: 0.8 },
        cast(f, w, a) {
          w.melee(f, a, 175, 2.2, 18, { elem: 'fire', burn: 5, burnT: 2.5, color: 'rgba(255,140,40,0.9)', knock: 220 });
          for (let i = 0; i < 26; i++) { const aa = a - 1.1 + 2.2 * i / 25, r = rand(60, 175); w.parts.emit('fire', f.x + Math.cos(aa) * r, f.y + Math.sin(aa) * r, 1, { smax: 30, z: 14, scale: 1.3 }); }
          Sound.play('fireBig');
        } },
      e: { name: 'Blue Spirit', icon: '👺', cd: 12, chi: 15, bending: false, desc: 'Don the Blue Spirit mask for 6s: fast twin dao combos that parry projectiles.', ai: { type: 'buff', max: 200, chance: 0.5 },
        cast(f, w) { Sound.play('slash'); f.addBuff('dao', { t: 6, dao: true, speedMult: 1.15, basic: DAO_SLASH }); } },
      r: { name: 'Lightning Redirection', icon: '⚡', cd: 8, chi: 20, desc: 'For 1.5s, absorb the next bending attack and send it back as lightning.', ai: { type: 'defense', chance: 0.7 },
        cast(f, w) { redirectStance(f, w, 1.5); } },
    },
    dash: { name: 'Fire Jet', icon: '🚀', cd: 2.0, speed: 840, time: 0.2, elem: 'fire' },
    ult: { name: 'Dancing Dragon', icon: '🐉', call: 'DANCING DRAGON!', desc: 'The true fire of the Sun Warriors: a rainbow spiral of flame engulfs everything around you.',
      ai: { max: 260 },
      cast(f, w) {
        Sound.play('fireBig');
        f.addBuff('dragon', { t: 3.2, dr: 0.5, acc: 0, ang: 0,
          tick(f2, w2, dt, b) {
            b.ang += dt * 7;
            const k = 1 - b.t / b.t0;
            for (let s = 0; s < 2; s++) { const aa = b.ang + s * Math.PI, r = 50 + k * 220; w2.parts.emit('rainbow', f2.x + Math.cos(aa) * r, f2.y + Math.sin(aa) * r * 0.85, 3, { smax: 40, z: 20, scale: 1.6 }); }
            b.acc += dt;
            if (b.acc > 0.3) { b.acc = 0; for (const e of w2.enemiesOf(f2)) if (dist(f2.x, f2.y, e.x, e.y) < 290) w2.damage(e, 13, f2, { elem: 'fire', burn: 5, knock: 120 }); Sound.play('fire'); }
          } });
      } },
  },

  iroh: {
    id: 'iroh', name: 'Iroh', title: 'The Dragon of the West', element: 'fire', nation: 'Fire Nation · Order of the White Lotus',
    hp: 180, speed: 212, r: 17, chiRegen: 21, difficulty: 1, lotusMult: 2, redirectMult: 1.3, bulk: true,
    desc: 'Retired general, Grand Lotus and lover of tea. His mastery of firebending is legendary, and he invented lightning redirection after studying waterbenders.',
    passive: { name: 'Wisdom of the White Lotus', desc: 'Chi regenerates 50% faster. White Lotus tiles give double ultimate charge.' },
    unlock: 'b1c3',
    art: { skin: '#f0cfae', c1: '#7a2a1a', c2: '#d4a020', c3: '#4a1a10', pants: '#3a1a12', hair: 'iroh', hairColor: '#c9c6c0', beard: '#d8d5cf', bulk: true, robe: true, crest: '#d4a020' },
    ai: { style: 'ranged', range: 240, projSpeed: 680, dodge: 0.5 },
    abilities: {
      basic: { name: 'Fire Punches', icon: '👊', cd: 0.3, desc: 'Alternating fists of flame.', ai: { max: 460 },
        cast(f, w, a) { f._side = -(f._side || 1); A.shoot(w, f, a + f._side * 0.06, { kind: 'fire', speed: 680, r: 8, dmg: 8, burn: 3, knock: 90, life: 0.7 }); Sound.play('fire'); } },
      q: { name: "Dragon's Breath", icon: '🌬️', cd: 7, chi: 30, desc: 'Breathe a torrent of fire for 1.2s that incinerates projectiles.', ai: { max: 250, chance: 0.7 },
        cast(f, w) { Sound.play('fireBig'); A.breath(w, f, { time: 1.2, range: 270, arc: 0.7, dmg: 6, tick: 0.14, burn: 4 }); } },
      e: { name: 'Lightning Redirection', icon: '⚡', cd: 7, chi: 20, desc: 'For 2s, absorb the next bending attack and return it as a powerful bolt of lightning.', ai: { type: 'defense', chance: 0.8 },
        cast(f, w) { redirectStance(f, w, 2.0); } },
      r: { name: 'Jasmine Tea', icon: '🍵', cd: 16, chi: 15, lock: 0.6, desc: 'A calming cup of tea: restore 45 HP and 40 chi, and cleanse ailments.', ai: { type: 'self', hp: 0.5, chance: 0.9 },
        cast(f, w) {
          Sound.play('heal'); w.heal(f, 45); f.chi = Math.min(f.maxChi, f.chi + 40);
          f.status.burn = null; f.status.slow = null; f.status.chiBlock = 0;
          w.parts.emit('steam', f.x, f.y - 30, 8, { smax: 30 }); w.parts.emit('heal', f.x, f.y - 20, 12, { smax: 40 });
          w.text(f.x, f.y - 70, 'Ahh... jasmine.', '#c8f7c5', 12);
        } },
    },
    dash: { name: 'Fire Jet', icon: '🚀', cd: 2.2, speed: 760, time: 0.2, elem: 'fire' },
    ult: { name: 'Dragon of the West', icon: '🐲', call: 'DRAGON OF THE WEST!', desc: 'Unleash a colossal, sweeping inferno for 2.6s while shrugging off damage.',
      ai: { max: 360 },
      cast(f, w) { Sound.play('fireBig'); A.breath(w, f, { id: 'dragonwest', time: 2.6, range: 400, arc: 0.95, dmg: 9, tick: 0.12, burn: 6, scale: 1.8, pps: 160, move: 0.3, buff: { dr: 0.35 } }); } },
  },

  azula: {
    id: 'azula', name: 'Azula', title: 'Princess of the Fire Nation', element: 'fire', nation: 'Fire Nation',
    hp: 150, speed: 248, r: 16, chiRegen: 15, difficulty: 3, cdMult: 0.85,
    desc: 'A firebending prodigy whose flames burn blue. Precise, ruthless and terrifyingly fast — she generates lightning with chilling ease.',
    passive: { name: 'Prodigy', desc: 'All ability cooldowns are 15% shorter. Her fire burns blue and hotter.' },
    unlock: 'b2c3',
    art: { skin: '#f2d4b6', c1: '#9b1c1c', c2: '#d4a020', c3: '#3a0e0e', pants: '#2a0c0c', hair: 'azula', hairColor: '#120d0c', eye: '#b8860b', armor: true, crest: '#d4a020' },
    ai: { style: 'ranged', range: 270, projSpeed: 820, dodge: 0.9 },
    abilities: {
      basic: { name: 'Blue Fire Daggers', icon: '🔷', cd: 0.4, desc: 'Twin daggers of blue flame.', ai: { max: 500 },
        cast(f, w, a) { A.fan(w, f, a, 2, 0.12, BLUE_FIRE({ speed: 820, r: 8, dmg: 7, burn: 3, knock: 90, life: 0.65 })); Sound.play('fire'); } },
      q: { name: 'Blue Fire Arc', icon: '🌊', cd: 5, chi: 20, desc: 'A wide wave of seven blue fireballs.', ai: { max: 320, chance: 0.7 },
        cast(f, w, a) { A.fan(w, f, a, 7, 0.95, BLUE_FIRE({ speed: 700, r: 9, dmg: 8, burn: 4, knock: 120, life: 0.45 })); Sound.play('fireBig'); } },
      e: { name: 'Lightning', icon: '⚡', cd: 8, chi: 35, desc: 'Charge for 0.55s, then unleash a lightning bolt that pierces the battlefield. Can be redirected!', ai: { min: 120, max: 650, chance: 0.6 },
        cast(f, w) { lightningCharge(f, w, 0.55, 32); } },
      r: { name: 'Jet Spin', icon: '🌀', cd: 6, chi: 20, desc: 'Rocket forward on jets of fire and explode in a ring of blue flame.', ai: { type: 'gap', chance: 0.5 },
        cast(f, w, a) {
          f.dashT = 0.22; f.dashVx = Math.cos(a) * 1150; f.dashVy = Math.sin(a) * 1150; f.invuln = 0.22;
          Sound.play('fire');
          A.later(w, 0.23, (w2) => { w2.ring(f, f.x, f.y, 140, 500, 15, { elem: 'fire', burn: 4, blue: true, parts: 'bluefire', color: 'rgba(80,160,255,0.95)' }); Sound.play('fireBig'); });
        } },
    },
    dash: { name: 'Blue Jet', icon: '🚀', cd: 1.6, speed: 880, time: 0.2, elem: 'fire',
      trail(f, w) { if (Math.random() < 0.7) w.parts.emit('bluefire', f.x, f.y - 6, 1, { smax: 30 }); } },
    ult: { name: 'Royal Fury', icon: '👑', call: 'ROYAL FURY!', desc: 'Three bursts of blue fire in every direction, finished by a bolt of lightning.',
      ai: { max: 400 },
      cast(f, w) {
        for (let wv = 0; wv < 3; wv++) A.later(w, wv * 0.33, (w2) => {
          if (!f.alive) return;
          for (let i = 0; i < 16; i++) A.shoot(w2, f, i / 16 * TAU + wv * 0.2, BLUE_FIRE({ speed: 620, r: 10, dmg: 10, burn: 4, knock: 160, life: 0.9 }));
          Sound.play('fireBig');
        });
        A.later(w, 1.05, (w2) => { if (!f.alive) return; const t = w2.nearestEnemy(f, 800); if (t) w2.lightning(f, angTo(f.x, f.y, t.x, t.y), 800, 40); });
      } },
  },

  ozai: {
    id: 'ozai', name: 'Ozai', title: 'Fire Lord · Phoenix King', element: 'fire', nation: 'Fire Nation',
    hp: 210, speed: 218, r: 18, chiRegen: 16, difficulty: 2, burnImmune: true, bulk: true, mass: 1.6,
    desc: 'The Fire Lord, who named himself Phoenix King. Overwhelming firepower, lightning, and flight on jets of flame — at his most dangerous beneath Sozin\'s Comet.',
    passive: { name: 'Supreme Firebender', desc: 'Immune to burning. Heavier — resists knockback.' },
    unlock: 'b3c4',
    art: { skin: '#efcfb0', c1: '#5e0f0f', c2: '#d4a020', c3: '#1a0606', pants: '#200808', hair: 'ozai', hairColor: '#0e0a0a', beard: '#0e0a0a', eye: '#b8860b', bulk: true, armor: true, robe: true },
    ai: { style: 'ranged', range: 290, projSpeed: 650, dodge: 0.5 },
    abilities: {
      basic: { name: 'Fire Blast', icon: '☄️', cd: 0.5, desc: 'A heavy fireball that overpowers lesser attacks.', ai: { max: 520 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'fire', speed: 650, r: 13, dmg: 14, burn: 4, knock: 220, power: 2, life: 0.85 }); Sound.play('fire'); } },
      q: { name: 'Inferno Stream', icon: '🔥', cd: 7, chi: 30, desc: 'A sustained 1s stream of fire.', ai: { max: 290, chance: 0.7 },
        cast(f, w) { Sound.play('fireBig'); A.breath(w, f, { time: 1.0, range: 310, arc: 0.6, dmg: 7, tick: 0.12, burn: 5, scale: 1.5 }); } },
      e: { name: 'Lightning', icon: '⚡', cd: 8, chi: 35, desc: 'Charge and fire a devastating lightning bolt. Can be redirected!', ai: { min: 120, max: 700, chance: 0.6 },
        cast(f, w) { lightningCharge(f, w, 0.55, 36, 780); } },
      r: { name: 'Jet Flight', icon: '🛩️', cd: 14, chi: 30, desc: 'Take to the air on fire jets for 5s: +55% speed, immune to crowd control, trailing flames.', ai: { type: 'buff', max: 600, chance: 0.4 },
        cast(f, w) {
          Sound.play('fireBig');
          f.addBuff('flight', { t: 5, speedMult: 1.55, hover: 22, ccImmune: true, acc: 0,
            tick(f2, w2, dt, b) {
              if (Math.random() < dt * 40) w2.parts.emit('fire', f2.x + rand(-6, 6), f2.y - 8, 1, { ang: Math.PI / 2, spread: 0.4, smin: 60, smax: 120 });
              b.acc += dt; if (b.acc > 0.15 && f2.moving) { b.acc = 0; A.firePatch(w2, f2, f2.x, f2.y, { life: 1.6, r: 24, dmg: 4 }); }
            } });
        } },
    },
    dash: { name: 'Fire Jet', icon: '🚀', cd: 2.0, speed: 820, time: 0.2, elem: 'fire' },
    ult: { name: "Phoenix King's Wrath", icon: '🦅', call: "PHOENIX KING'S WRATH!", desc: 'A colossal firestorm erupts around you, followed by three bolts of lightning.',
      ai: { max: 360 },
      cast(f, w) {
        w.explode(f.x, f.y, 380, 40, f, { kind: 'fire', elem: 'fire', burn: 6, knock: 650, team: f.team });
        const targets = w.enemiesOf(f).sort((a, b) => dist(f.x, f.y, a.x, a.y) - dist(f.x, f.y, b.x, b.y));
        for (let i = 0; i < 3; i++) A.later(w, 0.4 + i * 0.22, (w2) => {
          if (!f.alive) return;
          const t = targets.find(x => x.alive) || w2.nearestEnemy(f);
          if (t) w2.lightning(f, angTo(f.x, f.y, t.x, t.y), 800, 28);
        });
      } },
  },

  // ---------------------------------------------------- BOSSES
  zhao: {
    id: 'zhao', name: 'Zhao', title: 'Admiral of the Fire Navy', element: 'fire', nation: 'Fire Nation', boss: true,
    hp: 200, speed: 220, r: 17, chiRegen: 14,
    desc: 'An arrogant, ambitious admiral who seeks to slay the Moon Spirit itself.',
    enrageLine: 'I will be known as the Conqueror of the North!',
    art: { skin: '#e9c8a6', c1: '#6e1414', c2: '#2a2a2a', c3: '#d4a020', pants: '#2a1010', hair: 'zhao', hairColor: '#4a3426', armor: true },
    ai: { style: 'ranged', range: 260, projSpeed: 620, dodge: 0.5 },
    abilities: {
      basic: { name: 'Fire Blast', icon: '🔥', cd: 0.6, ai: { max: 500 },
        cast(f, w, a) { A.fan(w, f, a, 2, 0.15, { kind: 'fire', speed: 620, r: 10, dmg: 9, burn: 3, knock: 120, life: 0.8 }); Sound.play('fire'); } },
      q: { name: 'Fire Whip', icon: '〰️', cd: 6, chi: 20, ai: { max: 170, chance: 0.8 },
        cast(f, w, a) { ROSTER.zuko.abilities.q.cast(f, w, a); } },
      e: { name: 'Wall of Flame', icon: '🧱', cd: 9, chi: 25, ai: { max: 400, chance: 0.5 },
        cast(f, w, a) {
          const [x, y] = A.aimPoint(f, 300); const px = -Math.sin(a), py = Math.cos(a);
          for (let i = -3; i <= 3; i++) A.firePatch(w, f, x + px * i * 34, y + py * i * 34, { life: 4, r: 24, dmg: 6, burn: 4 });
          Sound.play('fireBig');
        } },
      r: { name: 'Flame Rush', icon: '🚀', cd: 7, chi: 20, ai: { type: 'gap', chance: 0.5 },
        cast(f, w) { A.charge(w, f, 0.35, 760, { dmg: 16, elem: 'fire', parts: 'fire', stun: 0.3 }); Sound.play('fire'); } },
    },
    dash: { name: 'Fire Jet', icon: '🚀', cd: 2.6, speed: 760, time: 0.2, elem: 'fire' },
  },

  heibai: {
    id: 'heibai', name: 'Hei Bai', title: 'Spirit of the Forest', element: 'spirit', nation: 'Spirit World', boss: true,
    hp: 260, speed: 180, r: 30, chiRegen: 12, artScale: 1.0, mass: 2.5,
    desc: 'A grieving forest spirit, enraged by the burning of its home. Calm it by defeating it in combat.',
    enrageLine: '*an earth-shaking spirit roar*',
    art: { special: 'heibai' },
    ai: { style: 'melee', range: 80, dodge: 0.2 },
    abilities: {
      basic: { name: 'Spirit Swipe', icon: '🐾', cd: 1.0, lock: 0.3, ai: { max: 110 },
        cast(f, w, a) { w.melee(f, a, 95, 2.0, 16, { color: 'rgba(180,140,255,0.9)', knock: 380 }); Sound.play('slash'); } },
      q: { name: 'Spirit Roar', icon: '📢', cd: 8, chi: 30, ai: { max: 280, chance: 0.6 },
        cast(f, w) { w.ring(f, f.x, f.y, 320, 520, 12, { stun: 0.9, color: 'rgba(170,120,255,0.9)', parts: 'spirit' }); Sound.play('roar'); w.shakeIt(8); } },
      e: { name: 'Pounce', icon: '🐼', cd: 6, chi: 20, ai: { min: 140, max: 420, chance: 0.6 },
        cast(f, w, a) {
          A.charge(w, f, 0.4, 700, { dmg: 18, knock: 450, stun: 0.5, parts: 'spirit' });
          Sound.play('roar');
          A.later(w, 0.42, (w2) => { if (f.alive) w2.explode(f.x, f.y, 85, 12, f, { kind: 'spirit', team: f.team }); });
        } },
      r: { name: 'Call the Lost', icon: '👻', cd: 16, chi: 30, ai: { type: 'self', chance: 0.5 },
        cast(f, w) { for (let i = 0; i < 2; i++) Game.spawnEnemy('wisp', f.x + rand(-60, 60), f.y + rand(-60, 60)); Sound.play('roar'); } },
    },
    dash: { name: 'Spirit Leap', icon: '💨', cd: 3, speed: 700, time: 0.25, elem: 'spirit' },
  },

  mai: {
    id: 'mai', name: 'Mai', title: 'Knife Thrower', element: 'none', nation: 'Fire Nation', boss: true,
    hp: 170, speed: 245, r: 15, chiRegen: 14,
    desc: 'Bored, deadpan and deadly accurate with an arsenal of hidden stilettos.',
    enrageLine: '...Fine. No more holding back.',
    art: { skin: '#f0d4bc', c1: '#3a1520', c2: '#8a1c2a', c3: '#120808', pants: '#1a0a10', hair: 'mai', hairColor: '#0e0a0c', robe: true },
    ai: { style: 'ranged', range: 330, projSpeed: 950, dodge: 0.85 },
    abilities: {
      basic: { name: 'Stiletto', icon: '🔪', cd: 0.5, ai: { max: 560 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'knife', elem: 'none', speed: 950, r: 6, dmg: 8, knock: 40, life: 0.7 }); Sound.play('slash'); } },
      q: { name: 'Knife Fan', icon: '🗡️', cd: 4, chi: 20, ai: { max: 400, chance: 0.7 },
        cast(f, w, a) { A.fan(w, f, a, 5, 0.55, { kind: 'knife', elem: 'none', speed: 900, r: 6, dmg: 7, knock: 40, life: 0.6 }); Sound.play('slash'); } },
      e: { name: 'Pinning Volley', icon: '📌', cd: 7, chi: 25, ai: { max: 450, chance: 0.6 },
        cast(f, w, a) { A.fan(w, f, a, 3, 0.18, { kind: 'knife', elem: 'none', speed: 1000, r: 7, dmg: 6, root: 1.3, knock: 0, life: 0.7 }); Sound.play('slash'); } },
      r: { name: 'Evasive Flip', icon: '🤸', cd: 6, chi: 15, ai: { type: 'defense', chance: 0.7 },
        cast(f, w, a) {
          f.dashT = 0.22; f.dashVx = -Math.cos(a) * 820; f.dashVy = -Math.sin(a) * 820; f.invuln = 0.3;
          A.fan(w, f, a, 3, 0.3, { kind: 'knife', elem: 'none', speed: 950, r: 6, dmg: 7, life: 0.7 });
        } },
    },
  },

  tylee: {
    id: 'tylee', name: 'Ty Lee', title: 'Chi Blocker', element: 'none', nation: 'Fire Nation', boss: true,
    hp: 180, speed: 290, r: 15, chiRegen: 16,
    desc: 'A bubbly circus acrobat whose pressure-point strikes leave benders unable to bend.',
    enrageLine: 'Your aura is getting really murky!',
    art: { skin: '#f3d6be', c1: '#e88ab0', c2: '#f9d2e0', c3: '#b04a78', pants: '#c86a96', hair: 'tylee', hairColor: '#5a3a22' },
    ai: { style: 'melee', range: 46, dodge: 0.95 },
    abilities: {
      basic: { name: 'Chi Strike', icon: '☝️', cd: 0.35, ai: { max: 70 },
        cast(f, w, a) { w.melee(f, a, 54, 1.6, 7, { chiBlock: 1.2, color: '#f9c2d8', knock: 60 }); Sound.play('hit'); } },
      q: { name: 'Cartwheel', icon: '🎪', cd: 4, chi: 15, ai: { type: 'gap', chance: 0.7 },
        cast(f, w) { A.charge(w, f, 0.3, 820, { dmg: 8, knock: 120, stun: 0.2 }); A.later(w, 0.32, (w2) => { if (f.alive) w2.melee(f, f.ang, 60, 2.5, 8, { chiBlock: 2, color: '#f9c2d8' }); }); } },
      e: { name: 'Pressure Point Flurry', icon: '✋', cd: 8, chi: 25, ai: { max: 70, chance: 0.8 },
        cast(f, w) {
          f.moveLock = 0.45;
          for (let i = 0; i < 4; i++) A.later(w, i * 0.1, (w2) => { if (f.alive) w2.melee(f, f.ang, 60, 1.8, 5, { chiBlock: 2, stun: i === 3 ? 0.8 : 0, color: '#ffd6e6', knock: i === 3 ? 200 : 20 }); });
        } },
      r: { name: 'Acrobatics', icon: '🤹', cd: 9, chi: 15, ai: { type: 'defense', chance: 0.9 },
        cast(f, w) { f.invuln = 0.6; f.addBuff('acro', { t: 1.2, speedMult: 1.5 }); w.parts.emit('star', f.x, f.y - 30, 6, { smax: 60 }); } },
    },
    dash: { name: 'Backflip', icon: '🤸', cd: 1.2, speed: 820, time: 0.2, iframes: 0.3, elem: 'none' },
  },

  longfeng: {
    id: 'longfeng', name: 'Long Feng', title: 'Grand Secretariat of Ba Sing Se', element: 'earth', nation: 'Earth Kingdom · Dai Li', boss: true,
    hp: 220, speed: 220, r: 16, chiRegen: 14,
    desc: 'Head of the Dai Li, who keeps the war a secret within the walls of Ba Sing Se.',
    enrageLine: 'There is no war within these walls.',
    art: { skin: '#e8c8a4', c1: '#1f4a2b', c2: '#0d1f12', c3: '#c9a35b', pants: '#123018', hair: 'zhao', hairColor: '#1a120c', hat: 'daili', robe: true, gloves: '#3b4a38' },
    ai: { style: 'ranged', range: 300, projSpeed: 720, dodge: 0.6 },
    abilities: {
      basic: { name: 'Rock Glove', icon: '✊', cd: 0.9, ai: { max: 520 },
        cast(f, w, a) { A.shoot(w, f, a, { kind: 'rockglove', elem: 'earth', speed: 720, r: 9, dmg: 9, root: 0.7, knock: 60, life: 0.8 }); Sound.play('earth'); } },
      q: { name: 'Earth Spike Line', icon: '⛰️', cd: 5, chi: 25, ai: { max: 420, chance: 0.7 },
        cast(f, w, a) { A.spikeLine(w, f, a, 440, 16, { stun: 0.5 }); } },
      e: { name: 'Dai Li Ambush', icon: '🎩', cd: 18, chi: 30, ai: { type: 'self', chance: 0.4 },
        cast(f, w) { for (let i = 0; i < 2; i++) Game.spawnEnemy('daili', f.x + rand(-90, 90), f.y + rand(-90, 90)); w.text(f.x, f.y - 70, 'Agents!', '#9be37f', 13); } },
      r: { name: 'Stone Barrier', icon: '🧱', cd: 9, chi: 25, ai: { type: 'defense', chance: 0.6 },
        cast(f, w, a) { A.wall(w, f, f.x + Math.cos(a) * 60, f.y + Math.sin(a) * 60, a, 4, { dmg: 6 }); } },
    },
    dash: { name: 'Earth Glide', icon: '🏔️', cd: 2.4, speed: 740, time: 0.2, elem: 'earth' },
  },

  combustion: {
    id: 'combustion', name: 'Combustion Man', title: 'Assassin for Hire', element: 'fire', nation: 'Fire Nation', boss: true,
    hp: 260, speed: 165, r: 19, chiRegen: 12, mass: 2, bulk: true,
    desc: 'A silent assassin who fires explosive blasts from the tattoo on his forehead. His blasts can misfire if he takes a hit to the head mid-charge...',
    enrageLine: '*his third eye glows hotter*',
    art: { skin: '#d9b08c', c1: '#3e3a2e', c2: '#6b6250', c3: '#1e1c16', pants: '#2a2820', hair: 'combust', metalArm: true, bulk: true },
    ai: { style: 'ranged', range: 460, projSpeed: 1100, dodge: 0.1 },
    abilities: {
      basic: { name: 'Combustion Blast', icon: '👁️', cd: 2.4, lock: 0, ai: { max: 900 },
        cast(f, w) {
          f.moveLock = 0.9; Sound.play('charge');
          f.addBuff('combust', { t: 0.9,
            draw(ctx, f2, w2, b) {
              const a = f2.ang, L = 900;
              ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * (1 - b.t / b.t0); ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
              ctx.beginPath(); ctx.moveTo(f2.x, f2.y - 40); ctx.lineTo(f2.x + Math.cos(a) * L, f2.y + Math.sin(a) * L - 14); ctx.stroke(); ctx.restore();
              ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffb070'; circle(ctx, f2.x + Math.cos(a) * 4, f2.y - 41, 3 + 3 * (1 - b.t / b.t0)); ctx.fill(); ctx.restore();
            },
            end(f2, w2) {
              if (!f2.alive || f2.status.stun > 0) return;
              Sound.play('fire');
              const a = f2.ang;
              w2.proj(new Projectile({ x: f2.x + Math.cos(a) * 24, y: f2.y + Math.sin(a) * 24, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, r: 9, team: f2.team, owner: f2, kind: 'combust', elem: 'fire', dmg: 0, life: 0.9, power: 3, reflectable: true,
                onDie(p, w3) { w3.explode(p.x, p.y, 95, 28, p.owner, { kind: 'fire', elem: 'fire', team: p.team, falloff: true }); } }));
            } });
        } },
      q: { name: 'Chain Blasts', icon: '💥', cd: 9, chi: 30, ai: { max: 500, chance: 0.6 },
        cast(f, w, a) {
          for (let i = 1; i <= 4; i++) {
            const x = f.x + Math.cos(a) * i * 110, y = f.y + Math.sin(a) * i * 110;
            A.telegraph(w, x, y, 70, 0.6 + i * 0.15, 'rgba(255,90,40,0.9)', (w2) => w2.explode(x, y, 70, 18, f, { kind: 'fire', elem: 'fire', team: f.team }));
          }
        } },
      e: { name: 'Stomp', icon: '🦶', cd: 7, chi: 20, ai: { max: 160, chance: 0.8 },
        cast(f, w) { w.ring(f, f.x, f.y, 200, 500, 12, { knock: 420, color: 'rgba(160,140,110,0.9)', parts: 'dust' }); Sound.play('quake'); } },
    },
  },

  mongke: {
    id: 'mongke', name: 'Colonel Mongke', title: 'Leader of the Rough Rhinos', element: 'fire', nation: 'Fire Nation', boss: true,
    hp: 260, speed: 205, r: 24, chiRegen: 14, mass: 2, artScale: 1.05,
    desc: 'Commander of an elite komodo-rhino cavalry unit. Without his firebending during the eclipse, he still has a charging rhino and a bag of bombs.',
    enrageLine: 'Rough Rhinos, CHARGE!',
    art: { skin: '#d9b08c', c1: '#6e1a1a', c2: '#2a1a1a', c3: '#d4a020', hair: 'helmet', helmet: '#4a1010', mask: '#d9b08c', mount: 'rhino', weapon: 'chain', armor: true, rhinoColor: '#5e6b4a' },
    ai: { style: 'melee', range: 80, dodge: 0.3 },
    abilities: {
      basic: { name: 'Chain Flail', icon: '⛓️', cd: 1.0, bending: false, lock: 0.25, ai: { max: 110 },
        cast(f, w, a) { w.melee(f, a, 88, 1.8, 13, { color: '#b9c0c6', knock: 260 }); Sound.play('slash'); } },
      q: { name: 'Rhino Charge', icon: '🦏', cd: 6, chi: 20, bending: false, ai: { min: 120, max: 520, chance: 0.6 },
        cast(f, w) { A.charge(w, f, 0.7, 640, { dmg: 22, knock: 600, stun: 0.5 }); Sound.play('roar'); } },
      e: { name: 'Bomb Toss', icon: '💣', cd: 7, chi: 20, bending: false, ai: { min: 100, max: 420, chance: 0.6 },
        cast(f, w) { const [tx, ty] = A.aimPoint(f, 420); A.lob(w, f, tx, ty, { time: 0.8, r: 100, onLand(w2, x, y) { w2.explode(x, y, 100, 24, f, { kind: 'fire', elem: 'none', team: f.team }); } }); } },
      r: { name: 'Fire Volley', icon: '🔥', cd: 5, chi: 20, ai: { max: 400, chance: 0.6 },
        cast(f, w, a) { A.fan(w, f, a, 3, 0.35, { kind: 'fire', speed: 600, r: 10, dmg: 9, burn: 3, life: 0.8 }); Sound.play('fire'); } },
    },
  },

  // ---------------------------------------------------- FOOT SOLDIERS
  soldier: {
    id: 'soldier', name: 'Fire Nation Soldier', element: 'none', hp: 42, speed: 185, r: 14, chiRegen: 10,
    art: { skin: '#e2c09c', c1: '#6e1a1a', c2: '#2a1a1a', c3: '#111', hair: 'helmet', helmet: '#3a1414', weapon: 'spear', armor: true },
    ai: { style: 'melee', range: 52, dodge: 0.15 },
    abilities: { basic: { name: 'Spear Thrust', cd: 1.1, lock: 0.3, ai: { max: 75 }, cast(f, w, a) { w.melee(f, a, 64, 0.9, 8, { color: '#d9dde0', knock: 140 }); } } },
  },
  firebender: {
    id: 'firebender', name: 'Firebender', element: 'fire', hp: 40, speed: 180, r: 14, chiRegen: 10,
    art: { skin: '#e2c09c', c1: '#8a1c1c', c2: '#222', c3: '#d4a020', hair: 'helmet', helmet: '#2a0e0e', armor: true },
    ai: { style: 'ranged', range: 300, projSpeed: 480, dodge: 0.3 },
    abilities: { basic: { name: 'Fire Blast', cd: 1.6, lock: 0.25, ai: { max: 480 }, cast(f, w, a) { A.shoot(w, f, a, { kind: 'fire', speed: 480, r: 9, dmg: 7, burn: 2, knock: 80, life: 1.1 }); Sound.play('fire'); } } },
  },
  archer: {
    id: 'archer', name: 'Yuyan Archer', element: 'none', hp: 34, speed: 185, r: 14, chiRegen: 10,
    art: { skin: '#e2c09c', c1: '#2a1a1a', c2: '#6e1a1a', c3: '#111', hair: 'helmet', helmet: '#1a1010', mask: '#c9c0b0', weapon: 'bow' },
    ai: { style: 'ranged', range: 460, projSpeed: 1000, dodge: 0.3 },
    abilities: {
      basic: { name: 'Arrow', cd: 2.0, lock: 0.3, ai: { max: 700 }, cast(f, w, a) { A.shoot(w, f, a, { kind: 'arrow', elem: 'none', speed: 1000, r: 6, dmg: 9, knock: 40, life: 0.9 }); Sound.play('slash'); } },
      q: { name: 'Pinning Arrow', cd: 8, ai: { max: 650, chance: 0.4 }, cast(f, w, a) { A.shoot(w, f, a, { kind: 'arrow', elem: 'none', speed: 1050, r: 7, dmg: 6, root: 1.1, life: 0.9 }); } },
    },
  },
  daili: {
    id: 'daili', name: 'Dai Li Agent', element: 'earth', hp: 52, speed: 210, r: 14, chiRegen: 10,
    art: { skin: '#e2c09c', c1: '#2c5a35', c2: '#0d1f12', c3: '#c9a35b', hair: 'zhao', hairColor: '#1a120c', hat: 'daili', robe: true, gloves: '#3b4a38' },
    ai: { style: 'ranged', range: 280, projSpeed: 680, dodge: 0.4 },
    abilities: {
      basic: { name: 'Rock Glove', cd: 1.6, lock: 0.25, ai: { max: 480 }, cast(f, w, a) { A.shoot(w, f, a, { kind: 'rockglove', elem: 'earth', speed: 680, r: 8, dmg: 8, root: 0.5, knock: 40, life: 0.8 }); Sound.play('earth'); } },
      q: { name: 'Earth Spikes', cd: 9, ai: { max: 300, chance: 0.3 }, cast(f, w, a) { A.spikeLine(w, f, a, 260, 10, { stun: 0.3 }); } },
    },
  },
  rhino: {
    id: 'rhino', name: 'Rough Rhino', element: 'none', hp: 85, speed: 215, r: 21, chiRegen: 10, mass: 1.8,
    art: { skin: '#d9b08c', c1: '#6e1a1a', c2: '#2a1a1a', c3: '#111', hair: 'helmet', helmet: '#3a1414', mount: 'rhino', weapon: 'chain', armor: true },
    ai: { style: 'melee', range: 62, dodge: 0.1 },
    abilities: {
      basic: { name: 'Chain', cd: 1.2, lock: 0.25, ai: { max: 90 }, cast(f, w, a) { w.melee(f, a, 74, 1.4, 10, { color: '#b9c0c6', knock: 200 }); } },
      q: { name: 'Charge', cd: 7, ai: { min: 150, max: 450, chance: 0.5 }, cast(f, w) { A.charge(w, f, 0.6, 560, { dmg: 14, knock: 450, stun: 0.3 }); } },
    },
  },
  wisp: {
    id: 'wisp', name: 'Lost Spirit', element: 'spirit', hp: 24, speed: 250, r: 11, chiRegen: 10,
    art: { special: 'wisp' },
    ai: { style: 'melee', range: 30, dodge: 0.2 },
    abilities: { basic: { name: 'Spirit Touch', cd: 0.9, lock: 0.2, ai: { max: 45 }, cast(f, w, a) { w.melee(f, a, 36, 1.6, 6, { color: 'rgba(180,140,255,0.8)', knock: 80 }); } } },
  },
};

const PLAYABLE = ['aang', 'katara', 'sokka', 'toph', 'zuko', 'iroh', 'azula', 'ozai'];
const DUEL_FOES = ['aang', 'katara', 'sokka', 'toph', 'zuko', 'iroh', 'azula', 'ozai', 'zhao', 'heibai', 'mai', 'tylee', 'longfeng', 'combustion', 'mongke'];

function isUnlocked(id) {
  const d = ROSTER[id];
  if (!d.unlock || Save.data.settings.unlockAll) return true;
  return !!Save.data.done[d.unlock];
}
