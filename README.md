# Avatar: The Last Airbender — Elements Unleashed

An unofficial fan-made action game set in the world of *Avatar: The Last Airbender*. You play as Team Avatar and their rivals, each with bending styles and signature moves from the show, through a three-Book story campaign, one-on-one duels, and an endless survival mode.

The game is **fully 3D**: cel-shaded characters, dynamic lighting and shadows, a follow camera, and 3D bending effects (tornadoes, lightning, fire spirals, Appa flying overhead), all built with [Three.js](https://threejs.org). A **Classic 2D** top-down view is also available in Settings, and is used automatically if your browser has no WebGL.

Characters, arenas, effects, sound and music are all generated in code. There are no image or audio assets and no build step. Three.js (r159, MIT license) is included in `js/vendor/`, so the game works offline.

## How to play

Open `index.html` in a modern desktop browser (Chrome, Edge, Firefox or Safari). That's it.

Alternatively, serve the folder (for example `python3 -m http.server`) and open `http://localhost:8000`.

### Controls

Play with keyboard and mouse, or a wired controller.

| Keyboard / mouse | Action |
|---|---|
| `W A S D` / arrows | Move |
| Mouse | Aim |
| Left click (hold) | Basic attack |
| `Q` / right click | Ability 1 |
| `E` | Ability 2 |
| `R` | Ability 3 |
| `Space` / `Shift` | Dash (brief invulnerability) |
| `F` | Ultimate (when the gold meter is full) |
| `V` | Switch camera: tactical (high) / action (low, behind the hero), 3D only |
| Mouse wheel | Zoom the camera, 3D only |
| `Esc` / `P` | Pause |
| `M` | Toggle music |

### Controller

Any standard USB controller works (Xbox, PlayStation or generic). Plug it in and press a button to wake it. The browser only reports a controller after a button press.

| Controller | Action |
|---|---|
| Left stick / D-pad | Move, navigate menus |
| Right stick | Aim. Let go and attacks lock on to the nearest enemy |
| RT / R2 | Basic attack (hold) |
| X / □, Y / △, B / ○ | Abilities 1, 2, 3 |
| A / ✕ or LT / L2 | Dash. A selects in menus |
| RB / R1 | Ultimate |
| LB / L1 | Switch camera (3D) |
| Start / Options | Pause |
| B / ○ in menus | Back |

On-screen button prompts switch automatically between keyboard and controller, and the controller rumbles when you take hits or unleash an ultimate (on controllers and browsers that support vibration).

## Game modes

- **Story Campaign**: 10 chapters across Book One: Water, Book Two: Earth, and Book Three: Fire. Each chapter has waves of enemies and then a boss fight.
- **Duel**: one-on-one against any of 15 fighters (heroes and bosses) in 11 arenas.
- **Survival**: endless, escalating waves, with a random boss every fifth wave. Your high score is saved per character.

## Playable characters

| Character | Bending | Abilities (LMB / Q / E / R / Dash / Ultimate) |
|---|---|---|
| **Aang** | Air (Avatar) | Air Blast · Air Scooter · Air Vortex (tornado) · Air Sphere (reflects projectiles) · Air Step · **Avatar State** (all four elements) |
| **Katara** | Water | Water Whip · Ice Spikes · Healing Waters · Octopus Form · Water Slide · **Bloodbending** |
| **Sokka** | None | Space Sword · Boomerang (returns) · Club Throw · Fire Bomb · Tactical Roll · **Appa, Yip Yip!** |
| **Toph** | Earth / Metal | Rock Throw · Earth Wall · Seismic Stomp · Metal Armor · Earth Glide · **Rock Avalanche** |
| **Zuko** | Fire | Fire Fist · Fire Whip · Blue Spirit (dao swords) · Lightning Redirection · Fire Jet · **Dancing Dragon** |
| **Iroh** 🔒 | Fire | Fire Punches · Dragon's Breath · Lightning Redirection · Jasmine Tea · Fire Jet · **Dragon of the West** |
| **Azula** 🔒 | Blue fire | Blue Fire Daggers · Blue Fire Arc · Lightning · Jet Spin · Blue Jet · **Royal Fury** |
| **Ozai** 🔒 | Fire | Fire Blast · Inferno Stream · Lightning · Jet Flight · Fire Jet · **Phoenix King's Wrath** |

🔒 Iroh unlocks after Book One, Azula after Book Two, and Ozai after Book Three. Settings has an "unlock everything" toggle.

**Bosses:** Prince Zuko, Hei Bai, Admiral Zhao, Mai & Ty Lee, Long Feng, Azula, Colonel Mongke and the Rough Rhinos, Combustion Man, and Fire Lord Ozai.
**Enemies:** Fire Nation soldiers, firebenders, Yuyan archers, Dai Li agents, Rough Rhino riders, and lost spirits.

## Mechanics from the show

- **Water beats fire**: water and fire projectiles that collide cancel out in a burst of steam. Other clashes go to the heavier attack.
- **Lightning redirection**: Zuko and Iroh can absorb incoming bending, including Azula's and Ozai's lightning, and send it back.
- **Chi-blocking**: Ty Lee's strikes stop benders from bending for a short time. Non-benders like Sokka are immune.
- **Celestial events**:
  - 🌕 The full moon makes waterbending stronger at the Siege of the North.
  - 🌑 The solar eclipse removes all firebending on the Day of Black Sun, until it passes.
  - ☄️ Sozin's Comet supercharges firebending in the finale.
- **Easter eggs**: hit Combustion Man with Sokka's boomerang while he's charging a blast. Grab cabbages to heal (sorry, cabbage merchant). White Lotus tiles charge your ultimate.

## Graphics settings

- **3D or Classic 2D** can be switched any time in Settings.
- **Tactical / Action camera**: press `V` during a battle, or choose in Settings.
- **Automatic quality**: if frames are consistently slow, the game lowers the render resolution and then turns off shadows.

## Project layout

```
index.html          entry point
css/style.css       menu styling
js/util.js          math helpers, save data, difficulty
js/audio.js         procedural sound effects and music
js/input.js         keyboard and mouse
js/particles.js     particle system
js/art.js           procedural character and environment art
js/projectile.js    projectiles and their visuals
js/fighter.js       fighter entity (movement, statuses, buffs, abilities)
js/world.js         combat simulation (damage, collisions, effects)
js/abilities.js     shared ability building blocks
js/characters.js    the full roster and every ability
js/ai.js            player controller and enemy AI
js/levels.js        arenas, themes, story chapters
js/ui.js            menus and HUD
js/render3d.js      3D renderer: models, arenas, effects, lighting, camera, menu scene
js/main.js          game loop, camera, battle and mode logic
js/vendor/          Three.js (MIT license)
```

The game simulation runs on a flat 2D plane. The 3D renderer mirrors it into a Three.js scene every frame, so the gameplay is the same in both views.

## Disclaimer

This is a non-commercial fan tribute. *Avatar: The Last Airbender* and its characters are the property of their respective owners. This project is not affiliated with or endorsed by them.
