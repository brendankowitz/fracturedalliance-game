# Belt Baron: a browser remaster spec for Fragile Allegiance

**Bottom line up front.** This document is a from-scratch game design and technical specification for a browser-based spiritual successor to Gremlin Interactive's 1996 *Fragile Allegiance*. The original is a real-time-with-pause 4X / colony-sim / trading hybrid set in an asteroid belt, owned today by **Urbanscan Ltd** (Ian Stewart's post-Gremlin rights vehicle) and actively sold on GOG and Steam — meaning a *faithful remaster under the original name carries real legal risk*. The build plan below is therefore a **mechanically-faithful spiritual successor with an original name, original art, and original audio**, shipped as a TypeScript PWA with an optional **.NET 10 Minimal API** backend. Recommended stack: **PixiJS v8 + React 19 + Zustand + XState v5**, with the game simulation living in a **Web Worker** behind a deterministic fixed-timestep loop. Solo-dev-with-Claude-Code estimate for a playable MVP is **10–14 weeks**, content-complete alpha **7–9 months**.

Three important corrections to the original brief surfaced during research and are threaded through this document: (1) the race names supplied in the prompt (*Bbrritt, Dha'leen, Mbwun…*) do not appear in any canonical source for the original game; the actual races are **Terrans, Artemia, Mikotaj, Achean Gatherings, Braccatia, Rigellians, and Mauna**. (2) The "mass driver" feature is actually the **Asteroid Engine** — propulsion units bolted to your own asteroid that let you fly it into an enemy. (3) The *Tyrants: Fight Through Time* codename claim is incorrect; that is the North American title of Sensible Software's *Mega-Lo-Mania*. The composer was **Patrick Phelan**, not Barry Leitch.

---

## Part A — What the original actually was

### A.1 Pedigree and premise

Fragile Allegiance is a direct PC remake of Gremlin's 1994 Amiga title **K240**, which was itself a sequel to *Utopia: The Creation of a Nation* (1991). Gremlin Interactive (Sheffield, UK) published it in Europe in December 1996; **Interplay Productions** published the North American version on 31 March 1997. Design credits: **Alex Metallis, Jon Medhurst, Chris Allan Mills, James Hartshorn** (Cajji Software) and **Kim Blake** (Gremlin Interactive). Music by **Patrick Phelan**. Reception was mixed-positive: *PC Gamer UK* 91% ("Game of Distinction"), *GameSpot* 6.2, *Gamezilla* 75%, *GameRankings* aggregate 65%, and a modern Steam "Very Positive" 93%.

The fiction is set in **2496** under a multi-racial "Federation" formed after the 2437 coup that deposed Terran Emperor Dramon Salaria. The player is a new hire at **TetraCorp**, a megacorporation operating in the remote **Fragmented Sectors**. The opening cinematic is a TetraCorp recruitment video interrupted by dissident broadcasts accusing the company of worker exploitation and xenocide-via-commerce — establishing the *fragile allegiance* to your employer without ever actually shipping a "declare independence" button. Breaking Federation law (black-market trade, dealing with the Mauna) risks fines and in-fiction termination, but there is no scripted secession arc. **That narrative vacuum is the single biggest design opportunity the remaster has.**

### A.2 Genre and pacing

Real-time strategy with variable game speed (Alt-F7 slowed, Alt-F8 sped) and pause-on-menu. Perspective is top-down / slight diagonal, rendered as pre-rendered 3D sprites over illustrated backdrops at 640×480 SVGA. There is no micromanaged tactical combat — you order fleets and watch lasers criss-cross the screen. Mass-driver/asteroid-engine campaigns, missile salvos, and espionage are the strategic levers.

### A.3 Core loop

Minute-to-minute: click an asteroid, place buildings on its crater grid, queue construction, dispatch scouts to neighbouring sectors, colonise with the Federal Transporter, mine, sell to either the monthly Federal Ore Transporter or to independent traders, reinvest in **Sci-Tek blueprints** and fleets. Session-to-session: grow from one to dozens of asteroids, unlock tech, sign/break treaties with the six AI races, escalate to missile bombardment and asteroid ramming. There is no conventional tech tree — just a flat 36-item Sci-Tek storefront where any blueprint can be bought at any time for credits.

### A.4 Asteroids, buildings, and ores

Each asteroid has a **size class** (determining surface-grid capacity), an ore-deposit profile revealed by an automatic Geo Survey when first colonised, and sector coordinates. The ten fictional ores, in ascending rarity, are **Selenium, Asteros, Barium, Crystalite, Quazinc, Bytanium, Korellium, Dragonium, Traxium, Nexos**, with Traxium and Nexos gated behind the Seismic Penetrator (radiation hazard, requires a Radiation Filter). Other resources are Credits, Population, Food, Water, Air, and Power.

The building catalogue spans life-support (Air Processor, Hydration, Hydroponics, ECC, Living Quarters, Resiblock, Pleasure Dome, Medical, Security, Radiation Filter, CPU), mining (Mine, MK2 Mine, Deep Bore Mine, MK2 Deep Bore Mine, Seismic Penetrator, Geo Survey), power (Solar Matrix, Power Plant, High Energy Power, Power Amp/Store), logistics (Protected Storage Tower, Ore Teleporter, Repair Facility, Gravity Nullifier), defence (Laser/Plasma/Photon Turrets, Anti-Missile Pod, Missile Silo, Satellite Silo, Weapons Factory, Building Armour, Screen Generator, Shield x40/x50, Turret Optimiser, Static Inducer, Repair Nullifier), production (Ship Yard, Space Dock — in orbit for medium/large hulls), and the signature **Asteroid Engine**.

### A.5 Races (canonical spellings)

| Race | Federation? | Disposition | Notes |
|---|---|---|---|
| **Terrans (TetraCorp)** | Yes | Player | Ambassador Jane Fong |
| **Artemia** | Yes | Aggressive | Ethically critical of Terran corporates |
| **Mikotaj** | Yes | Aggressive | Paired threat with Artemia |
| **Achean Gatherings** | Yes | Peaceful | Trade-friendly, easy neighbours |
| **Braccatia** | Yes | Neutral-reactive | Peaceful unless provoked |
| **Rigellians** | Yes | Peaceful | Paired with Acheans |
| **Mauna** | **No** | Hostile | Trading with them is illegal; "kill them" (PC Gamer tips) |

Only Terrans are playable in the original — a chief community complaint. Diplomacy uses Gremlin's first-ever **facial motion-capture** ambassador videos with real-time lip-sync, a 1996 marketing centrepiece.

### A.6 Trade, combat, diplomacy, espionage

**Trade** flows through three channels: the monthly **Federal Ore Transporter**, roaming **independent Merchants** (who dock at an asteroid of the player's choice and sell medicines, luxuries, tools, specialist gear, sometimes rare ores and Anti-Virus missiles), and the illegal **Black Market**. Prices fluctuate across a universe-wide market with race-specific demand modifiers.

**Combat** is fought with small ships (Scout, Assault Craft, Combat Eagle) and capital classes (Fleet Battleship, Destructor, Terminator, Command Cruiser). Weapon tiers: Laser → Photon → Plasma with roughly 1×/2×/3× damage scaling. Orbital bombardment adds Napalm Orbs, Vortex, Chaos Bombs. Missile arsenal includes basic, Nuclear, Mega, Stasis (freezes target), Virus (requires Anti-Virus counter), and Nexos Warhead. **The player has no direct tactical control during battles** — a recurring critique.

**Diplomacy** treaties cover Non-Aggression, No-Covert-Action, Joint Combat (with a progress percentage), Peace, and Trade. All breakable, all finable. **Espionage** uses named agents (Alex de Navarre, Reynald Malchique, Vyvyan Beauregard…) priced per target race, Spy Satellites launched from Satellite Silos, and sabotage options against Space Docks, life-support ("fatal building" — destroys the colony), power, defences, construction, transporters, and APV systems. Counter-intel comes from defensive agents and extra Security Centres. Captured spies reveal their employer only stochastically, enabling plausible deniability.

### A.7 The Asteroid Engine (the "mass driver")

Bolt enough Asteroid Engines onto one of your own asteroids and you can fly it. Uses: faster sector scouting, colony relocation, or **ramming an enemy asteroid** for catastrophic mutual destruction. Defenders counter with the **Gravity Nullifier** building or by destroying the attacker's engines and life support in flight. Travel takes in-game months, long enough for the victim to see it coming. The community widely considers it the endgame "I win" button — diplomatically it counts as neither covert nor overt, enabling a treaty-evasion exploit. **This is the single most important mechanic to re-balance in the remaster.**

### A.8 The Sci-Tek blueprint shop

Thirty-six flat, money-gated blueprints — no prerequisites, any order, any time. PC Gamer UK's 1996 tip sheet rates them 1 (must-buy) to 10 (trap). Must-buys: MK2 Mine, MK2 Deep Bore Mine, Seismic Penetrator, High Energy Power, Power Amp, Improved Sensor. Trap-tier: Virus Missile, Solar Matrix (redundant), Long Range Transmitter. This lack of dependency structure was praised as frictionless and damned as strategically shallow.

### A.9 What hurts in 2026

Research surfaced these consistent pain points across reviews, Steam/GOG forums, VOGONS, and Abandonia:

**UI and onboarding.** Nested sub-menus of sub-menus; undocumented icons surfaced only via Ctrl-hover; passive video tutorial that is essentially a voiced-over manual; double-click vs single-click diverging behaviour; broken aspect ratios on modern displays.

**Late-game pacing.** Mine-out → demolish-or-ram → repeat. Once you can provoke AIs into breaking NAPs for penalty cash, the economy becomes a printing press.

**AI.** Reactive, non-adaptive, no persistent grudge memory.

**Balance.** The Asteroid Engine endgame. Residential +50/+150 mismatched with Air/Water +400. Colony Supervisor salaries bankrupt new players who never notice them. APV antidote exploit (infect, then sell the cure).

**Stability.** Save-rename crash; `_MA\_MA` load crash on some DOSBox configs; Alt-Tab crashes on Windows 95 build; no autosave; IPX multiplayer broken in every modern wrapper.

**Content.** One playable faction (TetraCorp). No difficulty scaling inside scenarios. Fixed scenario objectives only.

---

## Part B — Modern improvement thesis

The remaster's value proposition is **"1996's strategic depth with 2026's quality-of-life."** The following modernisations are the spec's first-class requirements, not stretch goals.

**Onboarding and UI clarity.** Replace the video tutorial with an **interactive scripted first colony** that introduces one system at a time (mining → life support → scouts → trade → diplomacy → combat) using in-world objectives. Flat information architecture: one primary left rail, one bottom HUD, contextual right inspector. Universal tooltips on every icon, keyboard shortcuts surfaced everywhere, global search (Cmd/Ctrl-K) to jump to any asteroid, building, or menu. Expose hidden stats the community has begged for (weapon damage tables, ore price bands, supervisor skill numbers).

**Quality-of-life automation.** Global build queue across all colonies. Build-order templates ("standard mining colony," "forward fortress") stored per save. Smart resource routing replacing the single late-unlock Ore Teleporter. Colony Supervisor auto-hire with budget caps. Notification feed with priority tiers (red: colony under attack; amber: famine projected in 3 months; grey: trader arrived). Pause-on-event options per category.

**Balance and pacing.** Asteroid Engine receives a hard cost, a visible long charge-up with a public warning broadcast to all players, Gravity Nullifier buffed and cheaper, and treaty rules explicitly reclassify asteroid ramming as overt military action. AI gets **persistent grudge memory** and a utility penalty on self-destructive provocation loops. Scenario difficulty sliders (AI aggression, starting resources, tech pace). Optional slow-sim mode for true turn-feel.

**Accessibility.** WCAG 2.2 AA throughout. Colourblind-safe palettes (three presets). Text scaling 100%–200%. Full keyboard navigation, focus rings. ARIA-live announcement of critical notifications for screen readers. Configurable palette for alert colours. Remappable keybinds. Don't-rely-on-colour: every diplomatic status and alert uses icon + colour + text.

**Smarter AI.** Layered utility AI (strategic/operational/tactical split, see §D.7) with parameterisable "personalities" per race, exposing traits like aggression, trade-love, grudge-decay-rate. Deterministic replay-driven AI regression tests so balance patches don't silently break opponents.

**Replayability.** Procedurally generated asteroid belts seeded by a user-visible seed string. Scenario editor (JSON). Weekly community challenge seed. Daily quick-game mode (30-minute timer, single victory condition). Achievements/medals. Optional ironman mode.

**Save system.** IndexedDB multi-slot with autosave every sim-minute and quicksave. Optional cloud sync to the .NET 10 backend. Save files are JSON + gzip with schema versioning and forward migrations. Export/import save to file for sharing and bug reports.

**Telemetry.** Opt-in (off by default), Do-Not-Track respected, no PII. Events: anonymous session length, final score/verdict, blueprints bought in order, first-death cause, AI difficulty setting. Dashboard in the backend for balance tuning. **No third-party ad SDKs, ever.**

**Modding and customisation.** All content — races, buildings, blueprints, ores, scenarios — loaded from versioned JSON at startup. A `/mods` folder in the Tauri desktop build; URL query-string mod loading in the web build (`?mod=https://example.com/manifest.json`). A deterministic simulation test harness ships with the source so modders can validate their changes.

**Reach.** PWA-installable, offline-capable. **Tauri 2.0** desktop wrapper for Steam Deck and optional Steam shipping. Touch-first controls on tablets (pinch-zoom, long-press context). Gamepad API for controller play. Cross-device cloud saves via the backend.

---

## Part C — Game design document

### C.1 Vision statement and pillars

**Vision.** *Belt Baron is a deep, single-session strategy game about running a mining conglomerate in a lawless asteroid belt, where your allegiance to your employer is as fragile as the vacuum-welded habitats you build. Mining, trading, diplomacy, and dirty tricks decide who survives when two asteroids play chicken.*

**Pillars.**
1. **Every colony is a moral choice.** Mining deeper means richer ore *and* radiation; hiring more workers means more productivity *and* more unrest; trading with outlaws pays *and* risks termination. Every number you pick has a price.
2. **Diplomacy is mechanical, not cosmetic.** Treaties have teeth, memory, and exploits; the AI remembers you provoking it, and your reputation with the Corporate Federation is a persistent resource.
3. **The endgame is apocalyptic but not cheap.** Asteroid ramming is real and terrifying, but telegraphed, counterable, and expensive — so it's a climax, not a cheese strategy.
4. **The game respects your time.** A full match runs 60–180 minutes. Pause anywhere, quicksave anywhere, speed controls always one key away.
5. **Readable at a glance.** From any screen in ≤2 clicks you can answer "what do I need to do next?"

### C.2 Target audience

Primary: **35–55 year-old strategy enthusiasts** who played the original, K240, *Outpost 2*, *Imperium Galactica*, early *Master of Orion*, or modern spiritual kin like *Surviving Mars*, *Offworld Trading Company*, and *Terra Invicta*. Secondary: younger 4X fans who enjoy *Stellaris*, *Endless Space 2*, or *Against the Storm* and want a shorter, punchier session. Tertiary: lapsed strategy players who want a browser-or-Steam-Deck-friendly lunch-break game.

### C.3 Core loops

| Loop | Duration | Activity |
|---|---|---|
| **Micro** (seconds) | 5–30 s | Click asteroid, place a building, queue construction, confirm trade, issue fleet order |
| **Minute-to-minute** | 1–3 min | Process notifications, rebalance build queue across colonies, check trader inventories, deal with one diplomatic event |
| **Session** (colony) | 5–15 min | Bring a new asteroid online: colonise → life-support → mining → storage → basic defence → first ore shipment |
| **Session** (strategic) | 30–60 min | Scout a sub-sector, establish a trade route, form and test a treaty, unlock 3–6 blueprints |
| **Match** | 60–180 min | Achieve one victory condition: Corporate, Independence, Scientific, Military, or Survival (see C.8) |
| **Meta** (across matches) | 10+ matches | Unlock ambient cosmetics, leaderboards, weekly seeds, optional persistent megacorp reputation |

### C.4 Colony management spec

**Asteroid.** Size classes S/M/L/XL with build grids of 5×5, 7×7, 9×9, 11×11 respectively (inclusive of the CPU). Every asteroid has: a random ore deposit profile generated from a seeded table; a "depth" layer for deep-bore and Seismic Penetrator access; a radiation background that compounds with Seismic Penetrator operation; a stability score that decays when Asteroid Engines fire.

**Build grid.** Placement uses simple cell adjacency rules. Some buildings (Power Plant) project power in a 3-cell radius and must be within range of consumers. Storage is cap-based, not adjacency-based. Relocation is paid and destroys 25% of building value.

**Population.** A colony hosts **100 × sum-of-habitat-capacities** workers. Happiness is a 0–100 score with modifiers for food surplus, water surplus, medical coverage, security, overcrowding, and pleasure-dome coverage. Below 30 happiness, productivity halves and strike events fire. Below 10, the colony secedes to the local race or is destroyed.

**Build queue.** Per-asteroid and global. Priorities drag-and-drop. Construction Droids blueprint multiplies throughput ×2. Asteroid Supervisors auto-fill the queue from a user-chosen template.

**Starting values (balance framework).**

| Building | Credits | Build Time (sim-days) | Power | Pop | Notes |
|---|---|---|---|---|---|
| CPU (free, starting) | 0 | 0 | −5 | — | Mandatory, one per colony |
| Air Processor | 400 | 3 | −4 | — | Critical; colony dies without |
| Hydration Plant | 400 | 3 | −3 | — | |
| Hydroponics | 600 | 4 | −4 | — | +20 food/day |
| Living Quarters | 300 | 3 | −1 | +50 | |
| Resiblock | 900 | 6 | −3 | +150 | +5 unrest/day baseline |
| Pleasure Dome | 1,500 | 8 | −5 | — | +10 happiness in radius |
| Medical Centre | 1,200 | 6 | −3 | — | −50% disease events |
| Security Centre | 1,000 | 5 | −2 | — | +25% spy detection |
| Mine (Mk1) | 500 | 4 | −2 | — | 1.0× ore rate |
| Mine Mk2 | 1,400 | 7 | −3 | — | 2.0× ore rate (requires blueprint) |
| Deep Bore | 1,200 | 6 | −4 | — | Accesses mid-depth ores |
| Seismic Penetrator | 3,000 | 12 | −8 | — | Traxium/Nexos; +radiation |
| Power Plant | 700 | 5 | +10 | — | |
| High Energy Power | 2,000 | 9 | +30 | — | Blueprint-gated |
| Storage Tower | 600 | 4 | −1 | — | +500 ore cap |
| Radiation Filter | 1,100 | 6 | −2 | — | |
| Laser Turret | 800 | 5 | −3 | — | Anti-ship |
| Missile Silo | 1,500 | 8 | −4 | — | Launches player missiles |
| Ship Yard | 2,500 | 10 | −5 | — | Small ships |
| Space Dock (orbital) | 6,000 | 15 | −10 | — | Capital ships |
| Gravity Nullifier | 4,000 | 12 | −6 | — | **Asteroid-ram counter** |
| Asteroid Engine | 8,000 | 18 | −12 | — | 1 engine = slow, 6 = fast |

All numbers are starting values and will be tuned in playtesting; the framework keeps a ~2.5× cost jump between tier 1 and tier 2 of every category and a ~12–18 sim-day build time for capital structures.

### C.5 Economy and trade

**Credits** are the single currency. Base daily income from a colony = sum of (ore tonnage × current market price × 0.7) when sold to the Federal Transporter; 1.0× when sold to a Merchant; up to 1.6× on the Black Market with a 15% termination risk per sale.

**Ore market** prices fluctuate as a stepped sinusoid per ore with added random walk, seeded by match RNG. Race demand modifiers multiply per-race buy prices (e.g. Mikotaj love Korellium +30%, Acheans undervalue Quazinc −20%).

**Merchants** arrive on a Poisson schedule (λ scales with player reputation and colony count). Each carries a randomised inventory drawn from tables: medicines, luxury goods, tools, rare ores, missiles, Anti-Virus, satellites. Inventory refresh on re-dock is **removed** (it was an exploit in the original).

**Black Market** is a hidden tab unlocked after first contact with a shady NPC event. Sales increment a "suspicion" meter, which decays slowly; above 70 the Federation opens a formal investigation, above 100 imposes fines or (at very high levels) revokes your corporate licence — the in-fiction trigger for the **Independence** path (see C.8).

### C.6 Blueprint system (research replacement)

Keep the flat shop from the original *and* add a light prerequisite graph for strategic depth. Blueprints are grouped into five disciplines — **Extraction, Power, Defence, Offence, Logistics** — with ~8 blueprints per discipline (40 total, up from 36). Any blueprint is money-gated, but tier-2 blueprints also require owning one tier-1 blueprint in the same discipline. This preserves the "flexible, any order" feel while rewarding specialisation. Blueprint costs start at 5,000 cr for tier 1 and scale to 250,000 cr for tier 4 ultimates (Asteroid Engine, Nexos Warhead, Shield x50).

### C.7 Diplomacy, espionage, and reputation

**Treaty types.** Non-Aggression Pact, No-Covert-Action Pact, Trade Agreement (tariff free), Open Borders (ships traverse enemy sectors), Defensive Pact (auto-war if signatory attacked), Joint War (time-boxed alliance against third party), Peace Treaty (ends active war, 30-sim-day cooldown).

**Reputation** is a −100..+100 scalar per race, plus a global **Corporate Standing** with the Federation. Modifiers: honouring treaties (+1/month), breaking treaties (−20 immediate), trading with Mauna (−30 if caught), gifting (+5–15), tattling on rivals (+5 with Federation, −15 with rival), asteroid ramming (−50, now classified overt).

**AI memory.** Each AI stores a rolling 24-month event log per player. Utility AI consults the log when scoring diplomatic moves; this closes the "provoke for cash" exploit because repeat provocation compounds grudge weight.

**Espionage.** Agents are a pool of 20 named operatives with stats (stealth, sabotage, intel, cost-per-race-target, ethics tags). Missions: recon (reveals enemy asteroid grid), tech-steal (discounts a random blueprint by 50%), sabotage (list below), blackmail (extracts tribute), liberate (flip a low-happiness enemy colony). Sabotage targets: life support, power, defences, construction, missile silos, transporter dock, APV plants. Success is a d100 vs (agent skill − defender Security score − defending agent counter). Captured agents reveal employer with p = 0.4, inverse to agent stealth.

**Spy satellites.** Launched from Satellite Silo for 2,500 cr; orbit until destroyed; reveal enemy building grid and queue.

### C.8 Victory conditions

Five win paths, any one triggers victory evaluation at the next sim-day boundary:

1. **Corporate Loyalty.** Earn 10,000,000 cr in total Federal ore sales and hold Corporate Standing ≥ +75 for 60 sim-days.
2. **Independence.** Trigger the secession arc (black-market suspicion ≥ 100 or player-initiated "Declare Independence" after researching the *Autonomy Manifesto* tier-4 blueprint), survive a 90-day Federation punitive expedition, and hold ≥ 5 asteroids at the end.
3. **Scientific Supremacy.** Purchase all 40 blueprints.
4. **Military Dominance.** Own ≥ 60% of all non-neutral asteroids in the sector.
5. **Survivor.** Last non-eliminated player at match time-limit (default 180 sim-days; configurable).

Secondary **Endings** narrate the win path — TetraCorp CEO promotes you, or you establish the Free Belt Confederation, or you die rich and bored, and so on. Scripted cinematic bespoke to each ending, with optional "Ironman" ending scaling.

### C.9 Races (original cast, new names)

To avoid IP overlap, races are renamed but retain the original's role archetypes:

| In-spec name | Original analogue | Disposition | Trade love | Trade hate | Signature trait |
|---|---|---|---|---|---|
| **Terrans / Helion Corp (player)** | Terrans/TetraCorp | Player | — | — | Only faction with Federation Standing; access to Corporate path |
| **Kryll Collective** | Artemia | Aggressive-principled | Crystalite | Luxury goods | Moral-grandstanding casus belli; bonus damage after accusing player |
| **Motkaj Clans** | Mikotaj | Aggressive-opportunist | Korellium | Food | First to break NAPs for profit |
| **Achar Gatherings** | Achean Gatherings | Peaceful-trader | All ores | Missiles | +30% trade prices; refuses war for 30 days after treaty signing |
| **Brakkat Dominion** | Braccatia | Neutral-reactive | Bytanium | Ores sold below market | Doubles retaliation after first insult |
| **Rigal Conclave** | Rigellians | Peaceful-scientist | Dragonium | Weapons | Sells tech-steal intel at half price; refuses to buy Nexos |
| **Mauna** | Mauna | Hostile-outlaw | Traxium, Nexos | Nothing | Not in Federation; trading with them = Black Market flag |

Each race has a personality vector fed to the utility AI: `{aggression, grudge_decay, trade_bias, tech_bias, expansion_bias, treaty_respect, ram_willingness}`.

### C.10 Progression and difficulty curve

Match pacing target: **first colony stable at 3–5 sim-minutes, first blueprint at 8–12, first contact with another race at 15–20, first combat at 25–35, first endgame weapon at 60–90, match end at 90–180.** Difficulty presets (Intern / Manager / Director / CEO / Board) adjust: AI starting asteroids (+0/+1/+2/+3/+4 over player), AI economy multiplier (0.9/1.0/1.2/1.4/1.7), AI aggression bias, trader generosity, Federation grace period. "Board" difficulty enables the Mauna as an active aggressor from day one.

### C.11 Onboarding / tutorial design

**Tutorial is a scripted scenario,** not a separate mode. Fade-in voice-over (corporate recruitment, homage to the original), then interactive prompts on the first colony: place an Air Processor; place a Hydration; select the mine and queue; watch the Federal Transporter arrive; sell to it; scout an adjacent asteroid; colonise it; establish an ore run; receive a diplomatic event from one race; negotiate; then the tutorial hands off into a "short game" seed. Tutorial dismissible at any step. **Contextual help bubbles** remain available on every icon and screen thereafter, disableable.

A second **Advanced Primer** scenario introduces espionage, asteroid engines, and blackmail, unlockable after the first completed match.

---

## Part D — Technical architecture

### D.1 High-level diagram

```
┌────────────────────────────────────────────────────────────┐
│  Browser tab                                               │
│  ┌──────────────────────────┐  ┌────────────────────────┐ │
│  │ React 19 HUD (DOM)       │  │ PixiJS v8 world canvas │ │
│  │  menus, panels, dialogs  │  │  isometric tiles, ships │ │
│  └──────────┬───────────────┘  └──────────┬─────────────┘ │
│             │ Zustand selectors           │ ticker reads  │
│             ▼                             ▼               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  UI Projection Store (Zustand 5)                     │ │
│  │  read-only snapshots published from worker           │ │
│  └──────────┬───────────────────────────────────────────┘ │
│             │ Comlink RPC                                  │
│  ┌──────────▼───────────────────────────────────────────┐ │
│  │  Sim Web Worker                                      │ │
│  │  ├─ World (plain TS domain model)                    │ │
│  │  ├─ Fixed-timestep loop (20 Hz)                      │ │
│  │  ├─ Utility AI (strategic/operational/tactical)      │ │
│  │  ├─ Seeded PRNG (mulberry32)                         │ │
│  │  └─ Serializer (JSON + pako)                         │ │
│  └──────────┬───────────────────────────────────────────┘ │
│             │ idb / Dexie                                  │
│  ┌──────────▼───────────────────────────────────────────┐ │
│  │  IndexedDB (save slots, settings, telemetry queue)   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                    │ HTTPS (optional cloud sync / MP)
                    ▼
┌────────────────────────────────────────────────────────────┐
│  ASP.NET Core 10 Minimal API  (.NET 10 LTS)                │
│  /saves  /accounts  /telemetry  /multiplayer (SignalR, v2) │
│  EF Core 10 → PostgreSQL │ Hosted on Azure Container Apps  │
└────────────────────────────────────────────────────────────┘
```

### D.2 Frontend stack and justification

**Bundler:** Vite 6. **Language:** TypeScript 5.7+ with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`. **Lint/format:** Biome 2 (one tool, fast, single config). **UI:** React 19 for HUD chrome, menus, dialogs. **Rendering:** PixiJS v8 imperatively for the game world; HTML canvas sits beneath the React tree, mounted once. **UI state:** Zustand 5. **Flow state:** XState v5 for `mainMenu → loading → playing → paused → combat → gameOver → victory`. **Testing:** Vitest + Playwright. **PWA:** vite-plugin-pwa (Workbox).

**Why PixiJS over Phaser 4 for this project.** Fragile Allegiance is HUD-heavy and world-light. PixiJS v8's WebGPU-first renderer plus React-owned HUD gives the best accessibility story (DOM menus are universally screen-reader-friendly, tabulatable, and CSS-scalable). Phaser 4 would ship a playable vertical slice faster because of its built-in tilemap/input/audio, but it pushes UI either into the canvas (bad for a11y) or through a React-Phaser event bridge (decent but more ceremony). Given the user's a11y and UI-density priorities, **PixiJS + React wins**. **Fallback option** if solo-dev velocity matters more than peak UI quality in Phase 0/1: start on **Phaser 4** for scene/audio/input freebies, then migrate the world layer to PixiJS in Phase 3. The sim layer is identical either way because it lives in a worker.

**Why Zustand over Jotai/RTK/Valtio.** Smallest API, no ceremony, works fine with Suspense, DevTools via middleware, plays well with Comlink-sourced snapshots. RTK is over-engineered for this; Jotai's atomic model is nice but adds mental overhead; Valtio's proxy approach works but Zustand has more community muscle in 2026.

**Why not put the sim in React state.** React's reconciler is not built for 20 Hz object mutation across hundreds of entities. Putting the world in React causes jank and reconciliation storms. The correct pattern is a plain TS/ECS world, read by Pixi directly for hot paths, with occasional snapshots published into Zustand for the HUD.

### D.3 Rendering strategy

**Isometric grid.** 2D sprite game with a staggered-tile look. Tile size 64×32 logical pixels, artwork rendered at 2× for retina. The asteroid surface grid uses **diamond isometric projection**: screen-x = (grid-x − grid-y) × 32, screen-y = (grid-x + grid-y) × 16. Depth sorting is by `grid-y + z-offset`.

**Camera.** `@pixi/viewport` plugin for pan (click-drag, middle-mouse, WASD), pinch-zoom on touch, scroll-wheel zoom on desktop, clamped bounds. Two camera modes: **Sector view** (free-pan across the asteroid belt), **Asteroid view** (locked to one asteroid's grid, pans within bounds). Smooth transition via a tween on zoom + target-shift.

**Layering.**
1. Starfield background (parallax, PixiJS `ParticleContainer`).
2. Asteroid sprites with per-asteroid ownership tint.
3. Ship lanes and trajectories (line graphics).
4. Ships (sprites with sub-pixel movement).
5. Selection / range indicators.
6. FX (lasers, missiles, explosions — particle containers).
7. World-space labels (ship names, incoming-threat timers).

The React HUD sits on a DOM layer *above* the canvas, absolute-positioned with `pointer-events: none` on containers and `pointer-events: auto` on interactive elements, so clicks pass through to Pixi only where the HUD doesn't intercept.

**Asset pipeline.** Art authored as PNG, baked into texture atlases via **TexturePacker** (or free alternative **free-tex-packer-core** invoked in a Vite plugin). One atlas per asset category (buildings, ships, UI icons, effects). Audio as `.ogg` + `.mp3` fallback, lazy-loaded per scene. Asset manifest JSON keyed by logical id, not filename. Placeholder art in Phase 0–2 uses **Kenney.nl CC0** space-themed packs (Space Shooter Redux, Space Station, Sci-Fi UI) — free, permissive, excellent quality. Custom art commissioned in Phase 3.

### D.4 Core game loop architecture

**Fixed-timestep accumulator, sim inside a Web Worker, render on the main thread.** Canonical pattern from Glenn Fiedler's "Fix Your Timestep!" adapted for pause and Comlink:

```ts
// main thread — renderLoop.ts
const worker = Comlink.wrap<SimApi>(new Worker(new URL('./sim.worker.ts', import.meta.url)));
const FIXED_STEP_MS = 50; // 20 Hz sim
let accumulator = 0;
let lastFrame = performance.now();
let timeScale = 1; // 0 = paused

function frame(now: number) {
  const rawDt = now - lastFrame;
  lastFrame = now;
  accumulator += rawDt * timeScale;

  while (accumulator >= FIXED_STEP_MS) {
    worker.tick(FIXED_STEP_MS); // Comlink async; we don't await — the UI updates one tick late, acceptable at 20 Hz
    accumulator -= FIXED_STEP_MS;
  }
  pixiApp.render(); // reads latest worker snapshot via SharedArrayBuffer or Comlink proxy
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Pause sets `timeScale = 0`; UI animations still run at RAF rate. Speed controls set `timeScale ∈ {0, 0.5, 1, 2, 4, 8}`. Sim is deterministic because it only reads from the worker's state, the seeded PRNG, and queued commands from the main thread.

**Why the sim goes in a Web Worker.** AI scoring for 6 opponents × N asteroids × M actions is the hottest path and can spike to 10–30 ms. Keeping it off the main thread prevents the UI from stuttering when the AI thinks. Comlink (Google Chrome Labs) wraps the worker in a typed RPC proxy, making calls feel like normal async methods. Vite has `vite-plugin-comlink` for ergonomic imports.

**Why fixed timestep.** Determinism. Replays, saves, bug reports, and future lockstep multiplayer all require that the same inputs on the same seed produce the same state. Variable timestep makes that essentially impossible.

**SharedArrayBuffer for hot paths.** Ship positions (an `Float32Array` of `[x, y, vx, vy]` per ship) are placed in a SharedArrayBuffer so Pixi's render loop reads them zero-copy. Requires `COOP: same-origin` and `COEP: require-corp` headers on the host.

### D.5 Domain model (TypeScript)

```ts
// domain/ids.ts
export type AsteroidId = string & { readonly __brand: 'AsteroidId' };
export type BuildingId = string & { readonly __brand: 'BuildingId' };
export type ShipId     = string & { readonly __brand: 'ShipId' };
export type PlayerId   = string & { readonly __brand: 'PlayerId' };
export type BlueprintId = string & { readonly __brand: 'BlueprintId' };

export type OreKind =
  | 'selenium' | 'asteros' | 'barium' | 'crystalite' | 'quazinc'
  | 'bytanium' | 'korellium' | 'dragonium' | 'traxium' | 'nexos';

export type Resources = {
  credits: number;
  ores: Record<OreKind, number>;
  population: number;
  food: number; water: number; air: number; power: number;
};

// domain/asteroid.ts
export interface Asteroid {
  id: AsteroidId;
  name: string;
  ownerId: PlayerId | null;
  sector: { x: number; y: number };
  sizeClass: 'S' | 'M' | 'L' | 'XL';
  grid: { width: number; height: number };
  deposits: Partial<Record<OreKind, number>>; // tonnes remaining
  radiation: number;  // 0..100
  stability: number;  // 0..100, decays on engine fire
  happiness: number;  // 0..100
  buildings: BuildingId[];
  buildQueue: BuildQueueItem[];
  inOrbit: ShipId[];
  engines: { count: number; destination: AsteroidId | null; etaTick: number | null };
}

// domain/building.ts
export interface BuildingDef {
  kind: string;
  costCredits: number;
  buildTimeTicks: number;
  powerDelta: number;
  popCapDelta: number;
  foodDelta: number; waterDelta: number; airDelta: number;
  oreProduction?: Partial<Record<OreKind, number>>;
  blueprintRequired?: BlueprintId;
}

export interface Building {
  id: BuildingId;
  defKind: string;
  asteroidId: AsteroidId;
  cell: { x: number; y: number };
  hp: number; maxHp: number;
  constructionProgress: number; // 0..1
  active: boolean;
  damage: number;
}

// domain/ship.ts
export interface ShipClassDef {
  kind: 'scout' | 'assault' | 'combatEagle' | 'fleetBattleship' | 'commandCruiser' | 'destructor';
  hullHp: number; shieldHp: number; speed: number;
  hardpoints: number; cargoCap: number; fuelRange: number;
  costCredits: number; buildTimeTicks: number;
  blueprintRequired?: BlueprintId;
}

export interface Ship {
  id: ShipId;
  defKind: ShipClassDef['kind'];
  ownerId: PlayerId;
  hullHp: number; shieldHp: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  order: ShipOrder;
  cargo: Partial<Record<OreKind, number>>;
  hardpoints: Hardpoint[];
}

export type ShipOrder =
  | { kind: 'idle' }
  | { kind: 'moveTo'; target: { x: number; y: number } }
  | { kind: 'attackAsteroid'; target: AsteroidId }
  | { kind: 'defend'; target: AsteroidId }
  | { kind: 'trade'; target: AsteroidId; payload: Partial<Record<OreKind, number>> }
  | { kind: 'scout'; target: { x: number; y: number } };

// domain/race.ts
export interface RaceDef {
  id: string; name: string;
  personality: {
    aggression: number;      // 0..1
    grudgeDecayPerDay: number;
    tradeBias: number;       // negative = dislikes trade
    techBias: number;
    expansionBias: number;
    treatyRespect: number;
    ramWillingness: number;
  };
  tradeLove: OreKind[]; tradeHate: OreKind[];
  federationMember: boolean;
}

// domain/treaty.ts
export type TreatyKind =
  | 'nonAggression' | 'noCovert' | 'trade' | 'openBorders'
  | 'defensivePact' | 'jointWar' | 'peace';

export interface Treaty {
  id: string;
  parties: [PlayerId, PlayerId];
  kind: TreatyKind;
  signedTick: number;
  expiresTick?: number;
  metadata?: Record<string, unknown>;
}

// domain/player.ts
export interface Player {
  id: PlayerId;
  raceId: string;
  isHuman: boolean;
  credits: number;
  reputation: Record<PlayerId, number>;        // -100..+100
  federationStanding: number;                  // -100..+100, Terran only
  blueprintsOwned: Set<BlueprintId>;
  eventLog: AiEvent[];                         // rolling 24-month window
  alive: boolean;
}

// domain/world.ts
export interface World {
  tick: number;
  seed: number;
  asteroids: Map<AsteroidId, Asteroid>;
  buildings: Map<BuildingId, Building>;
  ships: Map<ShipId, Ship>;
  players: Map<PlayerId, Player>;
  treaties: Treaty[];
  marketPrices: Record<OreKind, number>;       // current universe price
  eventQueue: GameEvent[];
  rng: Prng;                                   // seeded
  version: number;                             // schema version for migrations
}
```

All collections are `Map<Branded, T>` to leverage TypeScript's structural typing for ids while keeping O(1) lookup. `Set<BlueprintId>` for unlocks. Branded types catch cross-kind id bugs at compile time.

### D.6 Save/load format

**Serialize** via a `toJSON(world: World): SaveV1` function that converts `Map` → object, `Set` → array, inlines ids. **Compress** with `pako.deflate` to gzip. **Persist** to IndexedDB through `idb` at key `save:{slotId}`. Typical save size uncompressed ~200–800 KB, compressed ~30–120 KB.

```ts
interface SaveV1 {
  schemaVersion: 1;
  createdAtIso: string;
  gameVersion: string;
  playerName: string;
  verdict: 'inProgress' | 'won' | 'lost';
  difficulty: Difficulty;
  worldSnapshot: SerializedWorld;
  uiPrefs: UiPrefs;
  rngSeed: number;
  rngState: number;
}

const migrations = [
  /* from 0 to 1 */ (raw: any): SaveV1 => ({ ...raw, schemaVersion: 1 }),
  /* from 1 to 2 */ (v1: SaveV1): SaveV2 => ({ ...v1, schemaVersion: 2, newField: defaultNewField() }),
];
```

Cloud sync (optional, via the backend) uploads the same blob with an ETag-style `updatedAt` so last-writer-wins is predictable. Conflict resolution defers to the user via a "which save do you want?" dialog.

### D.7 AI architecture

**Layered utility AI**, scored per decision, per AI player, per sim tick (strategic layer runs every 5 ticks, operational every tick, tactical every tick during combat).

```ts
interface UtilityAction<Ctx> {
  name: string;
  consider: (ctx: Ctx) => number;              // returns score in 0..1
  perform: (ctx: Ctx) => void;
}

function pickAction<Ctx>(actions: UtilityAction<Ctx>[], ctx: Ctx): UtilityAction<Ctx> | null {
  let best: UtilityAction<Ctx> | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    const s = a.consider(ctx);
    if (s > bestScore) { best = a; bestScore = s; }
  }
  return best && bestScore > 0.05 ? best : null;
}
```

**Strategic actions (per AI empire).** Expand, Consolidate, TechUp, TradeNet, AttackPlayer, AttackAI, Diplomacy. Each `consider` function combines 3–6 response curves over empire state: credits-relative-to-mean, asteroids-relative-to-mean, hostility toward target, grudge-accumulator, recent-combat-loss recency.

**Operational actions (per asteroid).** BuildMine, BuildDefense, BuildLifeSupport, QueueShip, LaunchTrade, LaunchScout. Scores read local asteroid state plus empire-level directives.

**Tactical.** Small behavior tree via **`mistreevous`** (TypeScript-first, actively maintained, 2025 releases): root Selector ⟶ (HealthLowRetreat ⟶ Flee) ⟵ (EnemyInRange ⟶ EngagePreferredTarget) ⟵ (GoToObjective). One tree instance per ship, tree ticked once per sim tick during combat.

**Personality curves** are stored in `RaceDef.personality` and used as multipliers on relevant `consider` outputs so Kryll Collective naturally picks Attack more often than Rigal Conclave, without hand-rolled per-race logic.

**AI debug overlay** (dev-mode only) visualises each AI's top-5 action scores per tick for balance tuning.

**AI runs in the worker** so its compute budget doesn't jank the UI. Hard cap of 10 ms per AI player per tick; if exceeded, score is re-used from the previous tick and a counter increments (warn in telemetry).

### D.8 Pathfinding and movement

Space is sparse; A* is overkill. Ships use **Reynolds steering**:

- `seek(target)`: accelerate toward target, clamp to max speed.
- `arrive(target, slowdownRadius)`: damped approach.
- `avoid(obstacles)`: lateral force when raycast toward velocity intersects a circle obstacle.

Trade/scout routes are pre-computed straight lines with optional waypoints around known hazardous sectors.

**Inside an asteroid**, if Phase 2+ adds on-surface pathing for sabotage animations, a simple A* on the 11×11 build grid suffices (≤80 lines of TypeScript).

### D.9 Event system

Pub/sub within the worker and Comlink-forwarded to the main thread for UI notifications:

```ts
type GameEvent =
  | { kind: 'colony.under_attack'; asteroidId: AsteroidId; attackerId: PlayerId }
  | { kind: 'trader.arrived'; asteroidId: AsteroidId; trader: TraderSnapshot }
  | { kind: 'blueprint.unlocked'; playerId: PlayerId; blueprintId: BlueprintId }
  | { kind: 'treaty.broken'; by: PlayerId; against: PlayerId; treaty: TreatyKind }
  | { kind: 'asteroid.incoming'; asteroidId: AsteroidId; etaTick: number }
  | { kind: 'colony.starved'; asteroidId: AsteroidId }
  // … open union
  ;
```

Events are priority-tagged (red/amber/grey), persisted to the event feed UI, and can auto-pause the game per user preference. The HUD notification feed subscribes via a Zustand slice updated by the worker snapshot.

### D.10 Random number generation

**`mulberry32`** seeded from a 32-bit integer. The seed is stored in `World.seed`, and the full RNG state is serialised with saves. Every stochastic decision flows through one of a small number of named sub-generators (marketRng, combatRng, aiRng, eventRng), each reseeded deterministically from the master seed plus a label hash, so one subsystem's coin flips don't derail another's sequence. Replay tests and golden-state hashes rely on this discipline.

### D.11 Performance budget

20 Hz sim, 60 Hz render. Per sim tick budget: **≤8 ms** in the worker (AI 4 ms, physics/movement 2 ms, economy 1 ms, bookkeeping 1 ms). Per render frame budget: **≤10 ms** on the main thread (Pixi 6 ms, React 2 ms, other 2 ms) — leaves headroom on a Steam Deck. Object pooling for missiles, lasers, damage-numbers, and asteroid-debris particles. Texture atlases minimise draw calls. `PIXI.ParticleContainer` for homogeneous effects. `cacheAsTexture` on static HUD backgrounds. Offscreen canvas for minimap rendered at 10 Hz.

### D.12 Testing strategy

**Unit (Vitest).** All pure game rules: economy formulas, combat resolution, blueprint prerequisites, AI `consider` functions, pathfinding, PRNG determinism. Target ≥80% line coverage on the `domain/` and `systems/` folders.

**Property-based (`fast-check`).** Invariants: total ore in world is non-increasing; credits never NaN; saving then loading is idempotent; AI action scores always in [0,1].

**Deterministic replay (Vitest fixtures).** Record seeded "tape" (seed + command log), run N ticks, hash the world state, compare to committed fixture. Catches regressions across balance changes and engine refactors cheaply. Run in CI.

**Component (Vitest + Testing Library).** React HUD components in isolation.

**E2E (Playwright).** Boot app → start new game → complete tutorial step 1 → save → reload → assert state. One full-match-at-4× smoke test per release.

**Benchmark (Vitest bench + `mitata`).** AI tick, serializer, large-battle simulation — fail CI if regressing >15% over baseline.

### D.13 Build, lint, format

Vite 6; TypeScript 5.7; Biome 2 as the only linter/formatter (`biome format`, `biome lint`). `biome.json` with recommended rules plus `noUnusedImports: error`, `useExhaustiveDependencies: error`. Husky + `lint-staged` pre-commit hook. GitHub Actions CI: `biome ci`, `vitest run --coverage`, `playwright test`, `tsc --noEmit`.

### D.14 Optional backend (.NET 10 Minimal API)

**When it's needed.**
- **Phase 1+:** optional user accounts for cloud save sync (drop-in — if user never logs in, game is fully functional offline).
- **Phase 4:** SignalR-based multiplayer room coordination.
- Ops: leaderboards, telemetry ingestion, mod registry.

**Endpoints (v1).**

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /api/accounts/register` | Register with email/passkey | — |
| `POST /api/accounts/login` | Cookie or JWT | — |
| `GET /api/saves` | List user's cloud saves | Authenticated |
| `GET /api/saves/{slot}` | Download a save blob | Authenticated |
| `PUT /api/saves/{slot}` | Upload a save blob (ETag) | Authenticated |
| `DELETE /api/saves/{slot}` | Remove cloud save | Authenticated |
| `POST /api/telemetry/events` | Opt-in anonymous events | — |
| `GET /api/leaderboards/{mode}` | Top verdicts | — |

**Minimal API scaffold (C# 14 / .NET 10).**

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services
    .AddAuthentication().AddBearerToken();
builder.Services.AddAuthorization();
builder.Services
    .AddDbContext<GameDbContext>(o => o.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres")));
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration["WebOrigin"]!)
    .AllowCredentials().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.MapOpenApi();
app.UseAuthentication();
app.UseAuthorization();

var saves = app.MapGroup("/api/saves").RequireAuthorization();

saves.MapGet("/", async (ClaimsPrincipal u, GameDbContext db) =>
    await db.Saves
        .Where(s => s.UserId == u.GetUserId())
        .Select(s => new SaveSummaryDto(s.Slot, s.UpdatedAt, s.ByteSize))
        .ToListAsync());

saves.MapPut("/{slot:int}", async (int slot, HttpRequest req,
    ClaimsPrincipal u, GameDbContext db, CancellationToken ct) =>
{
    if (req.ContentLength is null or > 2_000_000) // 2 MB cap
        return Results.BadRequest(new { error = "save too large" });

    using var ms = new MemoryStream();
    await req.Body.CopyToAsync(ms, ct);
    var bytes = ms.ToArray();

    var userId = u.GetUserId();
    var existing = await db.Saves
        .FirstOrDefaultAsync(s => s.UserId == userId && s.Slot == slot, ct);

    if (existing is null)
        db.Saves.Add(new SaveBlob(userId, slot, bytes, DateTime.UtcNow));
    else
    {
        existing.Bytes = bytes;
        existing.UpdatedAt = DateTime.UtcNow;
    }

    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

app.Run();
```

**Auth.** ASP.NET Core Identity with passkey support (new in .NET 10). Cookie auth for the web, JWT for the Tauri wrapper. GitHub/Google external login optional.

**Data.** EF Core 10 + PostgreSQL (via Npgsql). Single table for save blobs (user_id, slot, bytes, updated_at). Separate tables for users (Identity), telemetry_events (append-only), leaderboard_entries.

**Deployment.** **Azure Container Apps** as default — scale-to-zero, HTTPS, built-in ingress, auto-upgrade. Dockerfile from the `dotnet/sdk:10.0` base; multi-stage build to `dotnet/aspnet:10.0`. Azure SignalR Service reserved for Phase 4 multiplayer. Alternative: Fly.io for cheaper scale-to-zero with Postgres in-region.

**Phase 4 multiplayer (SignalR).** Hubs map to "game rooms" (groups). Clients send player commands (build X, attack Y); server runs the authoritative sim (same worker code compiled to Node/Bun server or, more likely, the browser runs a client-side copy and the server validates with lockstep). Caveat: SignalR is not Native-AOT-compatible, so the multiplayer service stays non-AOT while the save-sync minimal API can go AOT for cold-start perf.

---

## Part E — Repo structure and roadmap

### E.1 Monorepo layout (pnpm workspaces)

```
belt-baron/
├── apps/
│   ├── web/                  # Vite + React + PixiJS app
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── hud/          # React components
│   │   │   ├── world/        # Pixi scenes & systems
│   │   │   ├── store/        # Zustand, XState machines
│   │   │   └── sw.ts         # PWA worker
│   │   ├── public/
│   │   └── vite.config.ts
│   ├── api/                  # ASP.NET Core 10 minimal API
│   │   ├── Program.cs
│   │   ├── Endpoints/
│   │   ├── Persistence/
│   │   ├── Auth/
│   │   └── BeltBaron.Api.csproj
│   └── desktop/              # Tauri 2 wrapper (Phase 4)
│       └── src-tauri/
├── packages/
│   ├── domain/               # Pure TS: types, entities, IDs
│   ├── sim/                  # World, systems, fixed-timestep loop (runs in worker)
│   ├── ai/                   # Utility AI, behavior tree
│   ├── content/              # JSON: buildings, races, blueprints, scenarios
│   ├── persistence/          # Save serialization, idb adapter, migrations
│   └── shared-ui/            # React primitives, design tokens
├── tools/
│   ├── balance-sim/          # Headless match runner for balance tuning
│   └── asset-pipeline/       # TexturePacker scripts, audio transcode
├── tests/
│   ├── replay-fixtures/      # Golden deterministic tapes
│   └── e2e/                  # Playwright
├── docs/                     # This spec + art bible + balance sheets
├── biome.json
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── .github/workflows/        # CI: web build, api build, tests
```

**Why monorepo.** Shared `domain` and `sim` packages are imported by both the web app (in a worker) and the balance-sim headless runner (in Node), so they must live in the same TS compile graph. `pnpm workspaces` gives cheap cross-package dev without Lerna-era complexity.

### E.2 Phased roadmap (solo dev with heavy AI coding assistance)

| Phase | Scope | Success criteria | Weeks (solo + Claude Code) |
|---|---|---|---|
| **0 — Prototype** | Single asteroid, 3 building types (air, mine, storage), one ore, fixed-timestep loop in worker, Pixi rendering a grid, Zustand wired, save/load to IndexedDB | Click to place a mine; watch ore accumulate; close tab, reopen, resume | **2–3** |
| **1 — MVP** | Multi-asteroid sector (6–10 roids), all life-support + power + mining buildings, 4 ore types, scout/trade ships, one AI opponent, simple combat, first tutorial pass, Federal Transporter, basic diplomacy screen (no treaties yet) | Win condition: survive 30 sim-days or destroy AI's last asteroid | **6–8** |
| **2 — Content completeness** | All 40 blueprints, all 7 races with personalities, full diplomacy (7 treaty types + memory), espionage, Asteroid Engine + ramming + counter, Black Market, independence arc, merchant trade with fluctuating market, 5 victory conditions | Match plays end-to-end; all 5 victories demonstrably achievable | **10–14** |
| **3 — Polish** | Final art replacement (commissioned), original music score, sound design, difficulty tuning pass, extensive playtesting, scenarios, accessibility audit, PWA, Tauri desktop build | Lighthouse ≥90 on PWA; WCAG AA; first 100 beta testers satisfied | **8–12** |
| **4 — Multiplayer & extras (optional)** | ASP.NET SignalR MP, cloud sync GA, leaderboards, modding docs, Steam page | 2-player hotseat + 4-player online stable | **10–16** |

**Total solo estimate to shippable v1 (Phases 0–3):** **26–37 weeks (~7–9 months)** including art commissioning lead time.
**Playable alpha milestone (end of Phase 2):** **~18–25 weeks (~5–6 months)**.
**Vertical-slice demo (end of Phase 1):** **~8–11 weeks (~2–3 months)**.

These estimates assume: (1) heavy use of Claude Code / similar agentic AI for boilerplate, tests, and refactors; (2) ~20–30 focused hours/week; (3) art commissioned, not self-produced; (4) no major framework change mid-flight.

---

## Part F — Risk register

### F.1 IP and legal

**Risk — trademark / copyright.** "Fragile Allegiance" is not a registered word-mark visible in Justia/Trademarkia USPTO indexes, but the **software, characters, artwork, soundtrack, and distinctive elements are copyright-protected** and actively monetised by Urbanscan Ltd via GOG (since 14 June 2012) and Alternative Software on Steam (since 30 June 2015). A direct remaster using the original name, soundtrack, character names, or art would draw a takedown. **Mitigation:** ship as a spiritual successor with an original title (see §G), original art, original soundtrack, renamed races and buildings (while retaining mechanical roles), and a disclaimer that the game is "inspired by the classic 1990s belt-colony strategy genre." Do not reuse *any* assets from the original distribution — not even the manual or the Phelan OST that ships with GOG.

**Risk — name collisions.** Verify final name against USPTO TSDR, EUIPO eSearch Plus, and UK IPO databases directly (the automated mirror searches used in research are not authoritative). Engage a trademark attorney for a clearance search before any public announcement; expect $500–2,000 USD for a formal clearance opinion in one class (009 — downloadable software).

**Risk — AI-generated art licensing.** Current US Copyright Office guidance (as of 2025–26) treats purely AI-generated images as uncopyrightable; mixed human-AI work qualifies only for the human-authored portions. **Mitigation:** use AI only for placeholder art in Phases 0–2; commission human artists (or acquire CC-BY/CC0 assets from Kenney.nl, OpenGameArt, or itch.io asset packs) for Phase 3 final art. Keep a written asset provenance log.

### F.2 Browser performance

**Risk — Web Worker / SharedArrayBuffer hosting quirks.** COOP/COEP headers are required for `SharedArrayBuffer` and are easy to forget on shared hosts. **Mitigation:** document the headers in deployment guide, lint for them in CI against a staging deploy, fall back gracefully to Comlink-only (copying) on hosts that don't set them.

**Risk — Safari WebGPU regressions.** Safari's WebGPU support is shipping but historically flaky. **Mitigation:** Pixi v8's WebGL fallback handles this transparently; test every release in Safari Technology Preview.

**Risk — Steam Deck thermal.** Heavy AI tick can cause fan noise in handheld mode. **Mitigation:** the 10 ms per-player AI cap plus an "Eco" graphics preset that drops particle count and disables bloom.

### F.3 Scope creep

**Risk — feature creep from community requests (multiplayer, map editor, real 3D).** **Mitigation:** freeze the Phase 2 content list in a versioned `scope.md`; require a written "next-phase ticket" for any deferred request; keep a stretch-goals.md separate from the roadmap; ship an MVP before admitting *any* stretch feature.

**Risk — art production cost underestimation.** Custom sprite sets for 40+ buildings, 8+ ship classes, 6 alien ambassadors, and UI icons can run $15–40k commissioned. **Mitigation:** adopt a single visual style that leans on procedural/tileable elements (vector-ish flat with 2-tone shading), reuse silhouettes with palette swaps per faction, use Kenney.nl CC0 placeholder-through-MVP, and budget for commissioning only after Phase 2 playtest proves the game is fun.

**Risk — AI quality arms race.** It is easy to spend forever tuning AI. **Mitigation:** set a Turing-test-lite benchmark (beta testers correctly identify human vs AI at ≤65% across a 5-match trial) and stop tuning once hit.

### F.4 Market and audience

**Risk — tiny niche.** Fragile Allegiance's Steam owner estimate is 20k–50k with ~8 CCU. **Mitigation:** the spiritual-successor framing expands addressable audience to fans of *Surviving Mars*, *Offworld Trading Company*, and *Terra Invicta*; web-browser accessibility opens a no-commit trial funnel; Steam Deck support taps handheld strategy audience.

**Risk — browser-only stigma.** Some hardcore strategy fans dismiss browser games. **Mitigation:** ship the Tauri desktop + Steam build alongside from Phase 3; make the web version the playable demo, charge for the desktop/Steam SKU, with full feature parity plus cloud saves and achievements.

### F.5 Asset sourcing concretely

| Asset class | Phase 0–2 source | Phase 3 source |
|---|---|---|
| Building sprites | Kenney.nl Space Station pack (CC0) | Commission from a pixel/isometric specialist (~$50–150 per sprite) |
| Ship sprites | Kenney.nl Space Shooter Extension (CC0) | Commission set of 8 hulls × 3 damage states |
| UI icons | Lucide / Game-icons.net (MIT / CC-BY) | Custom icon set commissioned as family |
| Music | freemusicarchive.org ambient space tracks (CC-BY) | Commission original score from a composer who understands Phelan's synthy atmospheric style ($2–6k for ~30 minutes) |
| SFX | Freesound.org + Kenney SFX (CC0) | Foley pass by an audio designer (~$1.5–3k) |
| Ambassador art | Stable placeholder (stylised portraits) | Commission 8 race ambassadors with 3 facial states each (~$3–8k) |

---

## Part G — Naming suggestions

Ten original names that evoke the asteroid-colony-corporate-intrigue theme while dodging trademark overlap. Preference order follows my taste; all will need a formal trademark clearance search in class 009.

1. **Belt Baron** — my top pick. Sharp, evocative, unambiguous genre signal, memorable two-word pair. `.com` availability should be checked; `.io`, `.game` likely open.
2. **Fractured Accord** — retains the "fragile treaty" flavour without using either word directly.
3. **Rogue Asteroid, Inc.** — leans hard into the corporate-satire framing; works as both title and in-fiction name.
4. **The Tetra Directive** — homage to TetraCorp without reusing the trademark-adjacent "Tetracorp"; "Directive" implies the corporate-overlord tension.
5. **Ore & Allegiance** — lyrical, readable, signals trade + diplomacy.
6. **Sectorfall** — single word, SEO-distinctive, evokes collapse of a sector of space.
7. **Mantle & Mammon** — literary, dual-themed (mining + money), niche but memorable.
8. **Fragmented Shares** — puns on "Fragmented Sectors" (original's setting name) + corporate stock.
9. **Breakaway Belt** — directly names the independence arc; punchy alliteration.
10. **Sublight Holdings** — corporate-jargon title that reads like a shell-company name, fits the satirical tone.

My recommendation: **Belt Baron** for its brevity and clarity; **Fractured Accord** if you want a more literary register; **Rogue Asteroid, Inc.** if you want the satirical TetraCorp flavour upfront.

---

## Conclusion — what changes between 1996 and tomorrow's build

The original *Fragile Allegiance* succeeded because it stacked four then-novel systems (mine-and-trade, real-time diplomacy, asteroid-as-weapon, and animated alien ambassadors) into one coherent corporate-dystopia setting. It failed, where it failed, because the UI was a maze, the AI never held a grudge, and the endgame collapsed into "ram the next asteroid." A 2026 remaster has every tool it needs to keep the magic and repair the wounds: **deterministic fixed-timestep sim in a Web Worker** for replay-quality multiplayer and test confidence; **utility AI with persistent memory** to make diplomacy mean something; a **DOM HUD** that's accessible and scalable; and an **Asteroid Engine rebalance** that turns the signature weapon from a cheese strategy into a climax.

The single most important architectural commitment: **make the game simulation a pure, deterministic, serializable TypeScript module that knows nothing about PixiJS or React, and publishes read-only snapshots to the UI.** Draw that line cleanly on day one, and every other choice — which renderer, which ECS, which state library, which backend — becomes swappable without rewriting the game.

The single most important product commitment: **ship an original name and original assets.** Urbanscan is alive, selling on GOG today, and will notice. A clean spiritual successor with a sharp new name (*Belt Baron*, *Fractured Accord*, *Rogue Asteroid, Inc.*) is both safer and, frankly, a better product than a fan-remake that spends its cycles defending itself. The original deserves a successor that respects both its craft and its corporate-satire soul — and then improves on it.