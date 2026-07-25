# Playability Review and Recovery Plan — 2026-07-25 (v2)

Reviewer: principal coding agent. Method: played `opus` from `pnpm dev` (Manager, Asteroid
Rush, seed 895370) driving the real UI; read the sim package in full (1,635 lines / 15
systems); audited all six substantial sibling attempts' rendering and systems layers;
researched the 1996 original from external sources. Every code claim is cited to a real
path verified against the working tree at `bddb8f2`.

**Reframe honoured throughout:** the target is a mechanically faithful spiritual successor
to Gremlin's *Fragile Allegiance* (1996). `docs/gamespec.md` is a good spec of exactly
that. The failure is the implementation, on two co-equal axes: it abstracted away the
**place** (isometric asteroid, diegetic console, visible calendar) and it flattened or
omitted the **mechanics** (colonists, physical ore, the market, ships, defence, the
asteroid engine). Neither pillar is subordinate to the other.

---

## 0. The opening question: what would it take to make this feel like the screenshot?

Four things, in cost order:

1. **A clock you can feel.** The original opens on **May 25, 2496** and every system is
   paced in days you watch tick past. `opus` shows `Tick 16087`. Adding a date bar and
   day-based rates is days of work and transforms perceived pacing on its own.
2. **A rock, not a lattice.** The original's Asteroid View is lumpy pre-rendered terrain
   where ~20 chunky buildings with distinct silhouettes sit on a specific finite rock.
   `opus`'s surface is a DOM grid of `+` buttons in a side panel. An isometric surface
   view is very tractable in the existing PixiJS v8 stack — opus even contains an
   abandoned start (`apps/web/src/game/views/asteroidView.ts`, diamond projection,
   **zero references anywhere — dead code**). The hard part is art, and a working art
   pipeline already exists in the repo family (see §5).
3. **A console, not panels.** The original's UI is a diegetic control panel — you are
   sitting at a TetraCorp terminal. `opus` is seven toggleable floating panels that
   stack over each other and over the map. `kimi-claudecode-designed` already mocked up
   the right console (fixed chrome, vitals bar, categorized palette, speed bar, live
   feed) and ships a handoff bundle built to be implemented
   (`kimi-claudecode-designed/design-handoff/`).
4. **Mechanics that exist.** Most of what the human named — colonists, ore you load onto
   a transporter, tech ladders, ship fitting, defence that defends, battles worth
   watching, the asteroid engine — is absent, broken, or literally unreachable in the
   shipped build (§2, §3). This is the largest pillar and it is sim work, not UI work.

Bottom line: **keep the shell, rewrite the sim's world-model and the surface
presentation.** The monorepo, worker/Comlink loop, persistence, a11y, PWA and deploy
pipeline are good and stay. The simulation models the wrong things (global ore pool, no
population, no time model, no elimination) and should be rebuilt around the original's
model — with `copilot-opus`'s systems layer as a ~70% head start. The presentation layer
(sector dots + DOM grids + panel soup) is replaced by an isometric surface + diegetic
console. That is a rewrite in honest terms, and it is the recommendation.

Real-time stays. The original is real-time-with-pause; the human asked for Fragile
Allegiance, not a turn game. What was missing is a *legible* clock (calendar + speed
presets + date-paced events), not turns. (`tamux`, the smallest sibling, independently
demonstrates the right cadence pattern: colony economy resolved on sim-day boundaries —
`tamux/packages/sim/src/systems/economy.ts:7`.)

---

## 1. Why it "sucks": the causal chain

The human's three complaints are one chain, and the reframe explains all of them:

The human independently picked exactly these three complaints (and pointedly not "too
shallow for its size") — a 1:1 match with what the play session and code audit found,
which is strong corroboration that the diagnosis below is the right one.

- **"I don't know what to do"** — the original communicated state through a rendered
  world (a colony you can *read* at a glance) and a date. Opus communicates exclusively
  through numbers in seven overlapping panels over a map of identical dots — and the map
  itself accepts no input (§2, bug #1), so even curiosity dead-ends.
- **"No real decisions"** — decisions were deleted, not hidden: building placement on
  interchangeable lattice cells is an inventory slot, not a choice; blueprints are five
  forced linear ladders; treaties cost nothing and always succeed; housing is strictly
  harmful; money has no drain. Where the original made you choose (what to build on
  finite lumpy terrain, when to sell, what to fit on a hull, which blueprint order),
  opus auto-resolves or omits.
- **"Pacing is wrong"** — there is no time model. Mines drain a deposit in ~90 seconds,
  a "month" is 2.5 minutes, buildings finish in seconds, no speed controls are exposed,
  and nothing is scheduled against a calendar the player can see. Frantic and inert at
  once is exactly what per-tick rates with no consequences produce.

The "57 buildings are reskins" thread feeds complaint #1 but the deeper truth is worse:
much of the content is not shallow but **dead** (§3 table). The plan's principle is
therefore **cut redundancy, add depth** — the result must be *more* game, not less.

## 2. Ground-truth defects that gate everything (all verified)

1. **The map accepts no input.** `apps/web/src/App.tsx:78` wraps the HUD in a
   full-screen `pointerEvents:"auto"` div above the canvas. Canvas listeners receive
   zero pointer events (verified empirically). No asteroid selection, pan, or zoom; the
   AsteroidInspector, **Settle** (`SurfaceView.tsx:1847`), missile targeting and engine
   controls are unreachable. Blamed to 2026-04-19 — it has never worked. Green tests
   never click the canvas. Independently confirmed on the **deployed** build
   (`elementFromPoint` returns the `auto` wrapper at every map coordinate; the canvas is
   never topmost). A fix has since started landing in the working tree
   (`apps/web/index.html` now defines `.fa-hud-root { pointer-events:none }` /
   `.fa-hud-root > * { pointer-events:auto }` classes); `App.tsx:78` must adopt them and
   the canvas-click e2e below must gate the merge.
2. **The game is unloseable.** No code path sets `player.alive = false` — defeat and
   military victory are both unreachable. AI attacks only drain `asteroid.stability`
   (`combatSystem.ts:60`), which nothing checks outside the engine system
   (`asteroidEngineSystem.ts:38`).
3. **The asteroid engine cannot be obtained.** `asteroid.engines.count` is read in the
   sim, inspector and surface view, and incremented nowhere. No engine building exists in
   `buildings.json`, no command adds one. The whole 173-line engine system, the engine UI,
   and the 50,000 cr Gravity Nullifier counter a threat that cannot exist.
4. **Peace is free and absolute.** `proposeTreaty` accepts unconditionally
   (`commandProcessor.ts:160-201`); `aiSystem.ts:346-352` skips attacks under any
   NAP/peace/openBorders. Six clicks at minute zero end the military game. Grudge — the
   only unprovoked-attack driver — accrues solely from the human attacking first
   (`diplomacySystem.ts:14-17`).
5. **Money only goes up.** No upkeep, salaries, or maintenance (`economySystem.ts` is 36
   lines of price drift). The instant spot market pays 1.0× anytime while the awaited
   Federal Transporter pays 0.7× (`commandProcessor.ts:397-414` vs `146-158`) — waiting
   is strictly worse, inverting the original's incentive.
6. **No time model / mixed unit scales.** Mining is per-tick at 20 Hz
   (`miningSystem.ts:36`) against deposits of 100–900 (`beltGenerator.ts:92`); happiness
   and stability mix 0–1 and 0–100 scales (`beltGenerator.ts:115-116` vs
   `happinessSystem.ts:3-9` vs `resourceSystem.ts:69`); every colony shows "Stability 0%"
   within the first minute because power deficits drain it 0.1/tick from a 0.4–1.0 start.
7. **Decorative controls.** "Auto-hire workers" writes a number to a Zustand store the
   sim never reads (`uiStore.ts:45,109-111`; zero `autoHire` hits in `packages/sim`).
   The diplomatic-victory resource (Federation standing) is raisable **only** by buying
   black-market contraband (+5/₡500, `commandProcessor.ts:352`) — twenty purchases wins.
8. **Panel chaos.** Research renders in the same right-edge slot as the colony panel with
   no exclusivity (pressing R while viewing your colony appears to do nothing); four
   overlays plus the transporter modal can cover the map simultaneously.

## 3. Mechanical fidelity table

What the original did (sources: `docs/gamespec.md` §A — endorsed as faithful;
[Wikipedia](https://en.wikipedia.org/wiki/Fragile_Allegiance) /
[Liquisearch gameplay mirror](https://www.liquisearch.com/fragile_allegiance/gameplay);
[GameFAQs PMillington FAQ](https://gamefaqs.gamespot.com/pc/197385-fragile-allegiance/faqs/11913)
(snippet-level; page blocks fetch);
[Steam guide "Buy. SELL!"](https://steamcommunity.com/sharedfiles/filedetails/?id=2930740645);
[ClassicReload](https://classicreload.com/fragile-allegiance.html)) versus what `opus`
ships. Statuses: **VIS** implemented-and-visible · **INV** implemented-but-invisible/
broken/unreachable · **ABS** absent.

| Original mechanic | Original behaviour (best evidence) | opus status | Notes / where |
|---|---|---|---|
| Visible calendar | Starts May 25 2496; date always on screen; day-paced | **ABS** | Header shows mm:ss + tick count |
| Starting stake | One building + **1,000,000 cr** runway you burn down (Wikipedia/ClassicReload) | **ABS** (inverted) | 15,000 cr, no expenses, trickle-up |
| Colonists | Arrive by transporter, need housing+life support, pay tax, strike, riot, leave | **ABS** | No population number exists; housing is pure liability (`resourceSystem.ts:53-66`) |
| Colony supervisors (salaries) | Hired managers, salaries that bankrupt careless players | **ABS** | Auto-hire checkbox is dead UI |
| Power | Deficit shuts things down | **INV** | Balance computed & displayed; deficit only drains cosmetic stability |
| Physical ore + loading | Ore stockpiles ON the asteroid; you load it onto the docked Federal Transporter from Asteroid View (Wikipedia: only screen where ore can be loaded); Ore Teleporter blueprint eases hauling | **ABS** | Ore teleports into a global player pool (`miningSystem.ts:42-43`); no storage caps despite a Storage Tower building |
| Ore market | Stock-market-style commodity prices (Liquisearch); huge per-ore bands (Steam guide: Selenium ~69 → Nexos ~211,695); selling is a timing decision | **INV** | Prices drift ±5%/3s in a 0.5–2× band but instant full-price sell makes timing irrelevant |
| Traders / merchants | Dock and trade whole goods categories — pharmaceuticals, liquors, gems, metals, APVs, missiles, agents (Steam guides) | **ABS** | Trader event = a second ore-sell modal at worse prices |
| Black market | Illicit ores, missiles, intel on spies/supervisors; caught = fines/termination | **INV** | 4 items incl. a historic no-op and the contraband standing exploit; investigation arc exists but is nearly unreachable in play |
| Sci-Tek | **Flat 36-item storefront, any order, money-gated** + building upgrade ladders in content (Mine→MK2, Deep Bore→MK2, Seismic Penetrator gated on Radiation Filter); community-known must-buys and traps (PMillington: MK2 Mine, Seismic Penetrator top priority) | **INV** (wrong shape) | Rebuilt as five strictly linear T1→T8 price ladders — *less* faithful than a flat shop; 16 of 44 blueprints unlock no-op buildings |
| Ship construction | Ship Yard (small hulls) vs orbital **Space Dock** (medium/large); hulls have **hardpoints you fit** with weapons/devices; fleets | **INV/ABS** | 6 hulls buildable from one Ship Yard; no Space Dock; `hardpoints` is just a damage multiplier; `shieldHp` unused in ship-vs-ship (`combatSystem.ts:54`); no fitting, no fleets |
| Defence | Laser/Plasma/Photon turrets, Anti-Missile Pod, Shields x40/x50, Turret Optimiser, Static Inducer, Repair Nullifier — a toolkit implying real sieges | **INV** | 7 turret-buildings collapse to one `defenseDps` number (this part does work — `combatSystem.ts:174-189`); no anti-missile, no shields-vs-missiles |
| Missiles | Built per silo, typed (nuke/stasis/virus…), targeted; APV toxin/antidote economy | **INV** | One generic missile: `fireMissile` destroys one random building (`missileSystem.ts:24-29`); launch UI only in SurfaceView; no types, no defence, no APV |
| Space battles | No unit micro — fleets auto-fight with lasers criss-crossing, buildings catching fire, turrets firing back: **legible spectacle** (Wikipedia) | **INV** | Combat resolves invisibly in the sim; on screen the map dots do nothing; laser FX exist in `sectorView.ts` but battles neither threaten nor resolve anything |
| Asteroid Engine | Bolt engines to your rock, fly it, ram (the endgame) | **INV (dead)** | Unobtainable — see §2.3 |
| Espionage | 20 named agents, missions, spy satellites, counter-intel, stochastic attribution | **VIS/INV** | Agent hire + 5 missions exist (`agentSystem.ts`); agents differ only in one stealth number; no satellites; results barely surfaced |
| Diplomacy | Treaties with teeth, accusations, fines, videophone ambassadors | **INV** | One-click auto-accepted treaties; Kryll accusation + Motkaj break traits exist in sim but are invisible in play; 6 of 10 personality fields never read (only `aggression`, `tradeBias`, `expansionBias`, `bribeReceptiveness`) |
| AI rivals expand & attack | Belt is contested early | **INV** | AI scouts/settles (`aiSystem.ts:216-292`) and caps itself at 2 assault craft; passive player is never attacked below Director |
| Win/lose | Multiple endings; you can be wiped out | **ABS** | Unloseable; economic "win" = idle to 1M cr |

Cost implication: **VIS** items need polish; **INV** items need surfacing or small sim
patches (cheap: power enforcement, market friction, diplomacy costs, missile targeting);
**ABS** items are the rewrite core (colonists/tax, physical ore, traders, fitting,
calendar). The table above is the work breakdown for Pillar 2.

## 4. Sibling triage under the three lenses

**Did anyone build the isometric surface, the diegetic console, or date pacing? No one
finished any of them — but the parts exist across three attempts:**

- **`copilot-opus` (26k loc) — the systems donor and the art pipeline.** Verified live
  (`npx vite` in `apps/web`, played the tutorial): it boots, the canvas takes clicks,
  speed presets 1×–8×/pause work, the colony has real population ("Rock-0 · pop 50"),
  credits **drain** from upkeep in real time, the Research storefront is flat with
  original-shaped pricing (Mine Mk2 ₡5,000 → Nexos Enrichment ₡250,000), and at tick
  1200 the Federal Council imposed sanctions on the player unprovoked
  (`council.embargo`) — autonomous pressure that opus completely lacks. Caveats: its own
  8-step tutorial also breaks at step 2 (the promised Buildings panel never opens on
  `1`), no surface/tile view was reachable in play, and raw unformatted floats leak
  throughout the UI. **Its value is the sim + content + assets, not the app.**
  - Time model: `TICKS_PER_SIM_DAY = 1200`, all content rates per sim-day
    (`packages/content/src/data/buildings.ts:17-19`), `monthlyUpkeep` per building,
    correct per-tick conversion (`packages/sim/src/systems/economy.ts:60-80`).
  - Colonists: population grows toward housing cap when supplied, starves otherwise;
    **mining requires population > 0** (`systems/mining.ts:57-60`,
    `systems/population.ts`); radiation→happiness feedback.
  - Per-asteroid ore stocks (`asteroid.stocks.ores`) — the physical-ore model.
  - Data-driven scenario-objective tutorial engine in the sim (`systems/tutorial.ts`).
  - Victory that implies opposition (`systems/victory.ts`: economic = control market
    price of ≥3 ores sustained; diplomatic = ≥5 alliances; survival = time limit with
    pop alive).
  - Rendering: a real layered PixiJS scene (`packages/render/src/layers/` — asteroid,
    building sprites with construction arcs, ships, missiles, effects, starfield,
    background planets; atlas loader with race tinting). Sector-level sprites, not an
    isometric surface, but a working sprite pipeline.
  - **Assets: the proof the art problem is solvable in-house.** `assets/dist/` has
    packed atlases (buildings/ships/effects/ores/planets/ui), 7 race portraits, title
    logo, menu background, music and sfx; `assets/dist/concept/` holds Minimax-generated
    concept art (per-building pieces plus a `generation-log.json`) of genuinely high
    quality; `assets/raw/{kenney,minimax}` + `tools/minimax` is the generation pipeline,
    credentialed via `E:\data\src\fracturedalliance\minimax-api`.
- **`kimi-claudecode-designed` — the console blueprint.** A claude.ai/design handoff
  bundle (`design-handoff/README.md`: "recreate them pixel-perfectly") containing a
  complete diegetic ops-console mockup: fixed chrome with F-key section tabs (SECTOR /
  COLONY / SCI-TEK / COMMERCE / DIPLOMACY / TACTICAL / BLACK CELL), colony vitals bar
  with **per-day** rates (pop 380/400, food/water/air per day, rad in mSv), categorized
  searchable build palette, SURFACE/DEEP/ORBITAL layer tabs, 0.5×–8× speed bar with
  match clock, timestamped live feed, colony switcher, and theme/scanline options
  (`03-colony.png`, `design-handoff/project/Fractured Alliance.html`). This is the
  presentation target, ready to implement.
- **`tamux` (1,680 loc)** — day-boundary economy cadence in 71 lines
  (`packages/sim/src/systems/economy.ts`). Right instinct, nothing else to take.
- **`minimaxver`** — enforces ore storage caps (`packages/sim/systems/economy.ts:20`);
  its "isometric" grid is flat coloured rects (`apps/web/src/world/IsometricGrid.ts`) —
  a stub, not a surface. (Its 438-file count is inflated by `.worktrees` copies.)
- **`gemini`** — shares the no-consequence disease (life-support shortage handler is an
  empty branch with a "for now, keep going" comment,
  `packages/sim/src/systems/life-support.ts:24-30`). Nothing to take that copilot-opus
  lacks.
- **`kimicode`** — a pressure-event catalog worth adopting as the event deck (pirate
  raid, supply shortage, ore vein, envoy — `packages/content/src/events.ts`).
- Not worth further mining: `copilot`, `kimi-claudecode` (per-race AI files are ~25
  lines each), `opencode_minimax` (conventional sibling, nothing distinctive found),
  `glm` (empty), `temp`.

**Build-vs-port: a firm recommendation, not a coin flip.** Keep `opus` as the base and
**adopt `copilot-opus`'s `packages/sim` + `packages/content` wholesale as workspace
packages** behind opus's worker bridge — do not transliterate them line-by-line into
opus's current sim, and do not promote copilot-opus to mainline. Reasoning:

1. Under the fidelity lens the deciding asset is the simulation, and copilot-opus's is
   the closest to the original (colonists, upkeep, per-asteroid stocks, day model,
   council pressure, opposition-shaped victories — all verified live above). That asset
   is a cleanly-seamed package designed to be consumed via a bridge; adopting the
   package captures it at near-zero translation loss.
2. The presentation must be rebuilt to the diegetic-console + isometric target in
   *either* codebase — copilot-opus's UI is also incomplete and its golden path also
   broken, so promoting it buys no working game, only a different pile of panels.
3. What is unique and live in opus is the product shell: GH Pages deploy from a
   sub-path, PWA/offline, a11y tokens, save-slot UI, e2e infra, and the human's
   iteration history. Switching trunks forfeits that for nothing.

Fallback if package adoption hits a wall (schema/domain conflicts): port system-by-
system in the Stage-1 order below. Either way the opus shell stays and the copilot-opus
simulation wins.

## 5. Art pipeline (first-class, not polish)

Target look (legal: mechanically faithful spiritual successor — original name, art,
audio only; rights sit with Urbanscan Ltd and the game is sold on GOG/Steam — never
clone assets or the name):

- Warm rock palette (browns/tans/steel), hard single-sun lighting, pre-rendered-3D
  look, curved asteroid horizon against starfield.
- Per size class (S/M/L/XL): one asteroid surface backplate with height variation and
  unbuildable crater/ridge cells (this restores placement as a spatial decision).
- ~25–30 building sprites at one isometric angle, distinct silhouettes, 2 damage states
  + construction scaffold state. Ships, missiles, FX from the copilot-opus atlases as
  interim.
- Diegetic console chrome per the kimi mockup (DOM/CSS — keeps the a11y win; the world
  is canvas, the console is DOM).
- Pipeline: Minimax image generation (credentials in
  `E:\data\src\fracturedalliance\minimax-api`; working example with generation log in
  `copilot-opus/assets/dist/concept/` and scripts in `copilot-opus/tools/minimax`) →
  background removal/downscale → `free-tex-packer` atlases (pipeline exists in
  `copilot-opus/tools/asset-pipeline`). Kenney CC0 (`E:\data\src\fracturedalliance\kenney.nl`)
  remains the fallback for ships/FX/icons.
- Race ambassador portraits: 7 already generated (`copilot-opus/assets/dist/portraits/`)
  — use them in the diplomacy screen day one.

Research question, not assumption: whether Minimax can hold one consistent isometric
style across 30 building sprites (the concept pieces are single hero images). Mitigation:
generate 3× candidates per building against a strict style prompt; a day of curation.

## 6. The plan

Two pillars, staged so every stage ships something playable. Pillar work can proceed in
parallel (sim rewrite vs presentation) after Stage 0.

### Stage 0 — Unbreak the inputs and the clock (days)

1. `App.tsx:78`: `pointerEvents:"none"` on the wrapper, `auto` on actual HUD children.
   Add a Playwright test that canvas-clicks an asteroid and asserts the inspector opens.
2. Calendar: `TICKS_PER_SIM_DAY = 1200`; header shows **25-05-2496** advancing, not
   ticks. All content rates re-expressed per sim-day (mechanical conversion of
   `buildings.json` + `miningSystem`/`resourceSystem` divisors).
3. Speed presets {pause, 1×, 2×, 4×, 8×} wired to the existing `timeScale`
   (`renderLoop.ts:186`); keybinds space/+/−.
4. Panel exclusivity: one left + one right panel max.
   **Now playable as:** the same game, but you can touch the world and feel a day pass.

### Stage 1 — Pillar 2 core: the world model rewrite (the big one)

Adopt `copilot-opus`'s sim/content packages per §4 (this is a sim rewrite in port's
clothing — say it plainly: the current 15 systems' *model* is discarded, their command
surface kept where sane). Target behaviours, in order:

1. **Colonists**: population per colony; arrives via scheduled colonist transporter;
   needs housing + food/water/air; pays **tax** (primary early income); strikes/leaves;
   mining and shipyards need workers. Start credits become a runway (raise start stake,
   add upkeep + salaries) per the original's 1M-credit shape.
2. **Physical ore**: per-asteroid stocks with Storage Tower caps; the Federal
   Transporter docks on calendar schedule and you **load** ore from Asteroid View
   (button-per-stack first; drag later); spot market removed or discounted to 0.6×;
   traders buy at premium for their demand ores.
3. **Power enforcement**: deficit deactivates buildings (life support last); delete the
   cosmetic stability drain.
4. **Elimination**: colonies can fall (captured at stability 0 under bombardment, or
   collapse at pop 0); `alive=false` when a player holds nothing; defeat screen fires.
5. Fix happiness/stability to one 0–100 scale, reachable thresholds.
   **Now playable as:** a colony sim where you can go bankrupt, starve a colony, or be
   driven off the belt — and expansion (Settle, now clickable) is the escape valve.

### Stage 2 — Pillar 1: the place (parallel with Stage 1)

1. Isometric asteroid surface view (revive/replace the dead `asteroidView.ts`):
   backplate per size class, height/crater mask making some cells unbuildable, building
   sprites with silhouettes, construction scaffolds, damage/fire states. Click-to-place
   with ghost preview. The DOM grid dies.
2. Diegetic console shell per the kimi handoff: fixed chrome, F-key sections, vitals
   bar with per-day rates, categorized build palette **with stat lines** (the data is
   already in `buildings.json`; the picker just doesn't render it), live feed, colony
   switcher, date + speed bar.
3. Sector view: asteroids as textured rocks (copilot-opus atlas), ships visibly moving,
   transporter arrival rendered as a ship docking, laser/battle FX legible.
4. Diplomacy screen: ambassador portraits (already generated) + treaty state visible.
   **Now playable as:** it looks and reads like a place. This stage is where "I don't
   know what to do" dies — the world itself becomes the primary display.

### Stage 3 — The original's economy

1. Sci-Tek back to a **flat storefront** (undo the five linear ladders): every blueprint
   visible with price, any order; depth comes from building prerequisite chains
   (Mine→MK2; Seismic Penetrator requires Radiation Filter on-colony or radiation soars)
   and from deliberate trap/priority texture (some blueprints are famous bargains, some
   famous traps — that asymmetry is a mastery mechanic, keep it).
   *"Tech upgrade paths" resolved:* the original's structure was **flat money-gated
   storefront + per-building upgrade ladders + prerequisite chains**, not a research
   tree — confirmed by Wikipedia ("36 blueprints at any time"), the PMillington priority
   list (MK2 Mine / Seismic Penetrator top picks imply ladders), and copilot-opus's
   faithful flat implementation observed live. Do **not** build a generic 4X tech tree;
   that is a different game.
2. Traders carry goods categories (pharma, luxuries, tools, rare ores, missiles, agents)
   with per-race demand — buy-low-sell-high becomes a real activity; black market as the
   risk-priced channel with the investigation arc surfaced (remove contraband→standing;
   Federation standing accrues from ore sold to the Federation + treaties honoured).
3. Stock-market price movement with visible per-ore sparklines so holding ore is a
   decision.
   **Now playable as:** a trading game inside the colony game.

### Stage 4 — Conflict worth watching

1. Ships: Space Dock (orbital) gates capital hulls; hardpoint fitting (pick weapons per
   hull); fleets as orderable groups. Shields absorb before hull everywhere.
2. Missiles: typed (HE, nuke leaves radiation, stasis), built per silo, targeted at a
   building via the enemy surface view; Anti-Missile Pod intercepts.
3. Battle legibility: auto-resolved but **staged on screen** — lasers criss-cross,
   buildings burn (damage states from Stage 2), turrets visibly return fire; red alert +
   camera-jump-to-battle affordance. No unit micro — fidelity to the original.
4. **Asteroid Engine exists**: buildable (blueprint-gated, expensive), 1–6 engines set
   speed, public broadcast on ignition, Gravity Nullifier deflects; ramming razes both.
   The command plumbing (`setAsteroidDestination`) is already there.
5. AI: unprovoked aggression scaled by `aggression × (1 − treatyRespect)` on all
   difficulties (telegraphed 60 s ahead); treaty proposals evaluated (cost, grudge,
   sweeteners) instead of auto-accepted; wire the six dead personality fields; Mauna
   becomes the outlaw the fiction claims (aggression 0.15 → 0.85). Event deck from
   kimicode's catalog for mid-game interrupts.
   **Now playable as:** a war you can lose, watch, and win.

### Stage 5 — Onboarding, difficulty, victory

1. Tutorial: copilot-opus's data-driven objective engine, ~10 objectives ending with
   surviving a scripted raid. (Today's 5-step tutorial teaches neither power nor
   housing and dead-ends visually when the Research panel opens under the colony panel.)
2. Victory rework: economic = sustained market control (port), diplomatic = alliances
   held, military = elimination (now reachable), independence = the secession arc the
   spec designed. Delete the 1M-idle win.
3. Difficulty re-tune against the new economy; scenario objectives per scenario.

### Verification per stage

| Stage | Observable outcome |
|---|---|
| 0 | Canvas-click e2e green; date visibly advances; 4× feels different from 1× |
| 1 | A mines-only player loses a colony inside 20 min; tax income line visible; settling a second rock is necessary, possible, and felt |
| 2 | A screenshot of the colony reads as a place; a new player can say what a colony does without opening a panel |
| 3 | A player holds ore for a price spike on purpose; a trader visit changes a decision |
| 4 | An unprovoked, telegraphed attack lands by minute ~25 on Manager; a battle is watchable; an asteroid ram occurs in a long game |
| 5 | A new player reaches a second colony and survives the tutorial raid unaided |

## 7. Cut-and-deepen list (net effect: more game, not less)

Cuts are of *redundancy and dead weight*; every cut funds a depth item the human asked
for. Do not read this as shrinking the game.

- Delete no-op buildings: `doomsdayDevice`, `omniscienceNode`, `bioResearchLab`,
  `warpResearch`, `quantumProcessor`, `materialsSynth`, `xenologyLab`,
  `computingArray`, `galacticExchange`, `monopolyOffice`, `creditMint`,
  `pricingOffice`, `smugglerBay`, `ecc`, `gravityPlating`, `recyclingCentre`,
  `biosphereDome`, `atmosphericCondenser`, `commandCentre`, `fortressWall`,
  `antimatterMine`; fold `megaHabitat`/`arcology` into a Resiblock tier and
  `advHydroponics` into Hydroponics MK2. (~57 → ~30, and each survivor gains a real
  function under Stages 1–4: Storage Tower caps, Security counter-intel, Repair vs
  damage states, turret tiers vs missiles/ships.)
- Blueprints 44 → ~30: kill the science/commerce ladders; flat storefront + building
  ladders per §6.3.
- Espionage 20 agents → ~8 with 2–3 meaningful stats and mission fit.
- Black-market contraband→standing: removed (replaced by legitimate standing sources).
- The 1,000,000-credit idle victory: removed.
- HUD themes: keep Default; Hacker/Amber only if free under the console redesign.
- The instant full-price spot market: removed/discounted (Stage 1).
- Depth added in exchange: colonists+tax, physical ore+loading, traders with goods,
  hardpoint fitting, Space Dock, typed missiles+anti-missile, asteroid engines,
  battle spectacle, AI treaty evaluation, calendar pacing.

## 8. Research questions (not implementation tasks)

1. **Primary-source depth**: GameFAQs and the manual PDF resisted automated fetch; the
   PMillington FAQ and the GOG manual should be read by a human (or a browser session)
   before Stage 3 locks the market/Sci-Tek numbers — especially transporter schedule/
   capacity, tax rates, and supervisor salaries. What is confirmed so far: 36 flat
   blueprints, shipyard vs space dock, hardpoint fitting, no-micro spectacle combat,
   May 25 2496 start, ~1M starting credits, commodity trading in goods categories,
   ore loading from Asteroid View only.
2. **Minimax style consistency** across ~30 isometric building sprites (§5).
3. **Terrain granularity**: full heightmap vs backplate + unbuildable-cell mask. The
   mask is 10% of the cost and 80% of the feel; recommend starting there.
4. **Target match length** (spec says 60–180 min) — pick before tuning Stage 1 rates.
5. **Save compatibility**: the Stage-1 world model breaks saves; decide whether to
   version-migrate (persistence layer already has migrations) or declare a clean break
   pre-1.0. Recommend clean break.

---

*Read-only review; the only file created is this one. Tree verified at commit `bddb8f2`,
2026-07-24. v2 supersedes v1 in place after the Fragile Allegiance reframe and the
mechanical-fidelity directive; the v1 bug inventory is carried forward in §2. v2.1 adds
the deployed-build corroboration of the input bug, the live copilot-opus playtest, the
firm adopt-the-sim-packages recommendation, and the Sci-Tek structure resolution.*
