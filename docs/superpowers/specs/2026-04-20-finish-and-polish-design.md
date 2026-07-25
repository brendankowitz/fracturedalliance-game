# Belt Baron — Finish & Polish Design

**Date:** 2026-04-20  
**Scope:** Full spec completion excluding backend (no .NET API, no multiplayer, no leaderboards). Art via Kenney.nl CC0 + Minimax API. Audio via Minimax API + Kenney.nl music packs.

---

## Section 1: Gameplay Mechanics

### Black Market / Independence Arc
- Suspicion ≥ 100 triggers Federation license revocation: merchant arrivals stop, buy/sell disabled
- 90-day survival counter starts — "punitive expedition" — Federation enforcement fleet spawns outside belt and advances on player asteroids
- Survive 90 days → Independence victory triggers
- Capitulate (asteroids drop below threshold) or die → game over
- **Autonomy Manifesto**: tier-4 blueprint that voluntarily triggers the arc early, bypassing the suspicion grind

### Population Happiness Consequences
- Below 30 happiness: productivity halves, strike events fire (building halts 5 ticks)
- Below 10 happiness: colony secedes — asteroid flips to dominant worker race or is destroyed if mixed
- Happiness already tracked in sim; wire consequence hooks and secession event

### Asteroid Stability Decay
- Each tick an Asteroid Engine fires, structural integrity degrades by configurable rate
- At 0 integrity: asteroid fragments, all ships and buildings destroyed
- Adds risk/cost to ramming strategy

### Race-Specific Ore Demand Modifiers
- `demandModifiers` table per race in content JSON
- Applied at trade price calculation (e.g. Motkaj Clans +30% Korellium, Achar Gatherings −20% Quazinc)

### Blueprint Tier-2 Prerequisites
- Purchasing a tier-2 blueprint requires owning ≥1 tier-1 in the same discipline (mining, military, trade, science)
- Validated at purchase time in BlueprintShop

### Difficulty Presets
Five tiers: **Intern / Manager / Director / CEO / Board**

| Tier | AI Economy | AI Aggression | Trader Generosity | Federation Grace | Special |
|------|-----------|---------------|-------------------|-----------------|---------|
| Intern | 0.6× | 0.4× | 1.4× | 60 days | — |
| Manager | 0.8× | 0.7× | 1.2× | 45 days | — |
| Director | 1.0× | 1.0× | 1.0× | 30 days | — |
| CEO | 1.3× | 1.3× | 0.8× | 20 days | — |
| Board | 1.6× | 1.6× | 0.6× | 10 days | Mauna day-1 aggressor |

Stored as `DifficultyConfig` in game state. Selected on scenario screen before game start.

---

## Section 2: Espionage Depth

### Blackmail Mission
- Target: enemy colony with happiness < 40
- Success: target pays tribute (credits) each cycle for 10 ticks or until agent recalled/captured
- Failure: agent captured, relation drops, casus belli logged

### Liberate Mission
- Target: enemy colony with happiness < 20
- Success: asteroid ownership flips to player — buildings intact, workers serve player
- Failure: agent captured, enemy colony happiness spikes

### Spy Satellites
- New building: **Satellite Silo** (2,500 cr, tier-2 military)
- Launches satellite orbiting target asteroid for 30 days
- Reveals full building grid, construction queue, ship loadout
- 30% chance per tick of being shot down by enemy security center
- `SurfaceView` intel panel shows "SATELLITE ACTIVE" badge when satellite is covering the asteroid

---

## Section 3: AI Personality Traits

| Race | Signature Mechanic |
|------|-------------------|
| Kryll Collective | +25% accusation success rate; bonus damage after successful accusation |
| Motkaj Clans | First to break NAPs under economic pressure (halved loyalty threshold) |
| Achar Gatherings | 30-day no-war grace period after any treaty signing |
| Brakkat Dominion | Double retaliation — one insult triggers two counter-strikes |
| Rigal Conclave | Tech-steal missions cost 50% agent time; refuses to buy Nexos |
| Mauna | Board difficulty only: assault fleet spawns day 1, targets nearest player asteroid |

Each trait implemented as a modifier callback at the relevant AI decision point, not a full rewrite of the utility system.

---

## Section 4: Tutorial & Help System

### Tutorial Mechanical Gating
- Each of the 5 existing `tutorialMachine.ts` steps gets a completion predicate checked against sim state
- Next-step button disabled until predicate passes
- `TutorialTooltip` gains a progress indicator

### Advanced Primer Scenario
- Second scripted scenario, unlocked after player completes any match
- Covers: espionage (steal-tech), asteroid engines (ram a target), Blackmail mission
- Authored as a JSON scenario file with `objectiveScript` entries matching existing scenario structure

### Contextual Help Bubbles
- Every HUD icon gets a `HelpTip` component: 2–3 sentence explanation of the mechanic, costs, and risks
- Togglable via "Show help" setting in options
- No new data layer — inline copy per component

---

## Section 5: QoL / UI

### Build-Queue Templates
- "Save as template" button on any asteroid build queue snapshots queue order to IndexedDB
- "Load template" dropdown on any asteroid applies it — existing buildings skipped, missing prerequisites flagged
- Pre-loaded templates: "Standard Mining Colony", "Forward Fortress"

### Asteroid Supervisor Auto-Hire
- Per-asteroid toggle: "Auto-hire workers up to [N] credits/tick budget"
- When on, sim fills vacant posts each tick up to budget cap
- Budget slider in `SurfaceView`

### Pause-on-Event Per Category
- Options screen checklist: which event categories auto-pause the sim
- Maps to existing notification priority system
- Red events default on, green default off

### Slow-Sim Mode
- Options toggle: "Turn-based feel"
- Sim ticks only on "End Turn" click or configurable idle timer (5s default)
- Tick-gate flag in game loop — no architectural change

### Remappable Keybinds
- Keybindings screen in options
- `keymap` stored in localStorage
- All existing shortcuts read from keymap rather than hardcoded
- Conflict detection highlights duplicate bindings in red

---

## Section 6: Audio

**SFX** (generated via Minimax API):
- `build_complete.wav` — mechanical clunk
- `treaty_signed.wav` — formal chime
- `espionage_detected.wav` — tense alert sting
- `notification.wav` — neutral ping
- `black_market_visit.wav` — seedy ambient effect
- `colony_attack.wav` — urgent alarm
- `colony_starved.wav` — low warning tone
- `asteroid_incoming.wav` — deep rumble
- `ship_launched.wav` — engine ignition
- `blueprint_purchased.wav` — acquisition chime
- `independence_triggered.wav` — dramatic sting

**Ambient music** (Kenney.nl Space Music or Minimax): 3 tracks — exploration (calm), conflict (tense), endgame (epic).

**Wiring:** `audio.ts` infrastructure already present. Add files + 6 new event→sound mappings in `NotificationFeed` and `BlackMarketPanel`.

---

## Section 7: Art

- **Primary source:** Kenney.nl Space Kit + Space Shooter assets (already in use)
- **Minimax image generation:** 6 race ambassador portraits × 3 facial states = 18 images; start-screen background; missing building sprites
- No full sprite sheet replacement — fill genuine gaps only

---

## Section 8: Achievements

12 achievements stored in IndexedDB, shown on post-match screen and main menu:

| Achievement | Trigger |
|-------------|---------|
| First Blood | Win first match |
| Corporate Raider | Economic victory |
| Warlord | Military victory |
| Diplomat | Diplomatic victory |
| Mad Scientist | Scientific victory |
| Outlaw | Independence victory |
| Paranoid | Survive Federation expedition (90 days) |
| Ghost | Complete match without being attacked |
| Betrayer | Break 3 treaties in one match |
| Kingmaker | Liberate 5 colonies |
| Extortionist | Collect blackmail tribute 10 times |
| Asteroid Surfer | Ram 3 asteroids with engines |

---

## Section 9: Meta-Loop

### Weekly Seed
- Belt layout, ore distribution, race starting positions seeded from `YYYY-Www` (ISO week number)
- Shown on scenario screen as "Weekly Challenge"
- Client-side only

### Ambient Cosmetics
- 3 unlockable HUD colour themes earned via achievements
- Stored in localStorage, no gameplay effect

### Persistent Megacorp Reputation
- Cross-match `megacorp` record in IndexedDB: total matches, wins per victory type, reputation tier (Rookie → Veteran → Legend)
- Shown on start screen, purely cosmetic

---

## Out of Scope
- .NET backend, cloud sync, leaderboards, multiplayer
- Scenario editor
- Modding system (`/mods` folder, `?mod=` URL loading)
- Commissioned art (replaced by Kenney.nl + Minimax)
- Tutorial voice-over (text prompts only)
