# Stage 1 Adoption Spec — copilot-opus sim behind the opus worker bridge

2026-07-25. Read-only seam analysis for adopting `copilot-opus`'s simulation packages
into `opus`, per the accepted v2.1 recommendation. All paths verified today. Where
`opus`'s sim is being edited in parallel (branch `feature/playability`, agents
`stage0-clock` / `stage0-ui`), this spec targets the seam contract and the adopted
packages' shapes, which those agents are not touching.

**Verdict up front: GO — wholesale adoption is real, with three conditions (§7).**
The seam is narrower than feared: opus's UI already talks to its sim through one
Comlink class with five methods, and copilot-opus's sim is drivable through one
exported function. The adapter between them is a bounded, testable piece of code.
The genuine cost is not the seam — it is the HUD panels whose *model* changes
(global ore pool → per-asteroid stocks; instant treaties → negotiated ones), and
that cost is the point of the adoption.

---

## 1. The seam

### 1.1 opus today (the contract to preserve)

One Comlink-exposed class; the main thread owns the clock.

- Worker entry: `apps/web/src/workers/sim.worker.ts` — 4 lines,
  `Comlink.expose(SimApi)`.
- Class: `packages/sim/src/api.ts` — **`SimApi`**:
  - `new SimApi({ seed, humanPlayerRaceId, difficulty })`
  - `tick(deltaMs)` — applies queued commands, advances exactly one fixed step
  - `enqueueCommand(cmd: Command)` — `Command` = 20-variant union
    (`packages/sim/src/commands.ts:15-40`)
  - `getSnapshot(): HudSnapshot` — purpose-built projection
    (`packages/sim/src/snapshot.ts:79-99`): tick, credits, federationStanding,
    suspicion, oreInventory (global), players[], asteroids[] (deposits, grid,
    queue, power, engines, incomingMissile), ships[], events[{kind, priority}],
    marketPrices, diplomacy[], gameEndState, blueprintsOwned, agents[],
    combatFlashes[]
  - `getSaveBlob(): string` — JSON `SaveV1` envelope {schemaVersion: 1,
    difficulty, rngSeed, rngState, worldSnapshot, …}
  - `restore(blob)` — throws unless `schemaVersion === 1`
- Driver: `apps/web/src/game/renderLoop.ts` — RAF accumulator at
  `FIXED_STEP_MS = 50`, `timeScale` and slow-sim ("Turn") implemented **main-thread
  side**; after each tick batch it pulls the snapshot, feeds
  `useGameStore.setSnapshot`, `sectorView.update`, `detectAchievements`, an SFX
  `switch` over ~24 event-kind strings (`renderLoop.ts:93-151`), and autosaves every
  60 ticks through `@fa/persistence` (idb + pako, envelope-agnostic —
  `packages/persistence/src/idb.ts`).

### 1.2 copilot-opus today (the engine to adopt)

The worker owns the clock; snapshots are pushed.

- Bridge contract: `packages/render/src/bridge/workerApi.ts` — **`SimWorkerApi`**:
  `createWorld({seed, scenarioId, difficulty})`, `applyCommand(PlayerCommand)`,
  `start(tickHz, snapshotEveryNTicks)` / `stop()`, `subscribe(cb)` push of full
  **`SerializedWorld`**, `getSnapshotForSave()`, `restoreFromSave()`.
- Engine surface (`packages/sim/src/index.ts`): **`createWorld(opts)`** +
  **`populateFromScenario`** (`world/create.ts:189,243`), **`tickOnce(world)`**
  (`tick.ts:64`) — a pure function over a plain-data `World`, 17 phases in canonical
  order, PRNG restored/snapshotted per tick — plus `serializeWorld` /
  `deserializeWorld` / `migrateSave` (`serializer/`, `CURRENT_SCHEMA_VERSION = 2`),
  and the time model (`time.ts`: `TICKS_PER_SIM_DAY = 1200`,
  `FED_TRANSPORTER_INTERVAL_TICKS = 6000`, life-support demand constants).
- AI: **not inside the sim.** `@fa/ai` registers itself via
  `setAiDriver(aiPhase)` **as an import side effect** (`packages/ai/src/index.ts:9`,
  hook at `sim/src/tick.ts:56-61`). Strategic pass every 100 ticks, operational
  diplomacy replies every 10 ticks.
- Commands: `PlayerCommand`, 25-variant union
  (`packages/domain/src/commands.ts`) — a functional superset of opus's
  (adds respondTreaty/breakTreaty/declareWar, typed missiles, bombardment, fleets,
  produceShip, satellites, council votes, per-asteroid `sellOres`/queued orders,
  `setAsteroidCourse` with thrust). Handler cases: `sim/src/systems/commands.ts:114-167`.

### 1.3 Reconciliation — keep opus's contract, replace its implementation

**Do not adopt copilot-opus's push bridge.** Opus's pull model is what its render
loop, slow-sim mode, timeScale, and autosave are built on, and `tickOnce` slots into
it directly. The adapter is a new `SimApi`-shaped class (same five methods, same
Comlink exposure) whose internals are:

| SimApi method | Implementation over adopted engine |
|---|---|
| `constructor(cfg)` | `import '@fab/ai'` (driver registration side effect — see §5); `createWorld` + `populateFromScenario(scenario)` where scenario comes from the re-authored opus scenario set (§4.9) |
| `tick(dt)` | translate + push queued opus `Command`s onto `world.commandQueue`; `tickOnce(world)` |
| `enqueueCommand` | buffer (unchanged) |
| `getSnapshot()` | **new `takeHudSnapshot(world)` projection** — same `HudSnapshot` field names where semantics survive, plus new fields: `date` (from tick via `TICKS_PER_SIM_DAY`), per-asteroid `population`, `stocks`, `radiation`, council state, research-in-progress |
| `getSaveBlob()` / `restore()` | same `SaveV1` envelope, `worldSnapshot = serializeWorld(world)`, envelope `schemaVersion: 2` (§3) |

Command translation (opus → adopted), the whole table:

| opus `Command` | adopted `PlayerCommand` | Note |
|---|---|---|
| placeBuilding | queueBuild | building kind ids differ (`mineMk1` → `bld.mine`): one static rename map in the adapter |
| cancelBuildQueue | cancelBuild | direct |
| launchShip | produceShip | direct |
| orderShip | issueShipOrder / launchFleet | order unions differ modestly; map at adapter |
| sellOre / buyOre (instant) | queueSellOrder / queueBuyOrder | **semantics change on purpose** — adopted market drains queued orders on the transporter cadence (`FED_TRANSPORTER_INTERVAL_TICKS`); the instant-full-price exploit dies here (§4.1) |
| sellOreToTrader | sellOres channel:'merchant' | per-asteroid |
| proposeTreaty | proposeTreaty | **no longer auto-accepts** — AI answers via its operational pass; UI needs pending state (§4.4) |
| buyBlueprint | startResearch | research takes time now (§4.3) |
| hireAgent / assignMission | dispatchAgent | espionage models differ (§4.5) |
| fireMissile | launchMissile (typed) | pick a default missile kind until Stage 4 UI |
| setAsteroidDestination / cancelAsteroidEngine | setAsteroidCourse / abortEngine | engines become *buildable* (`bld.asteroid-engine` exists in the adopted catalogue) — the unobtainable-engine bug fixes itself |
| settleAsteroid | **no equivalent — gap** | §7 condition (a): port opus's handler (`commandProcessor.ts`, scout-in-orbit + 3000 cr) into the adopted `commands.ts` as a new case. Neither sim has transporter colonization; that stays a Stage 1 content task |
| blackMarketBuy / bribeOfficial | **no equivalent — gap** | opus-specific item shop; park behind the old panel until the Stage 3 market redesign (the adopted sim has the `blackMarket` sell channel + espionage instead) |

Everything above is boundary-adaptable. Nothing in this table forces edits inside
the adopted sim except the two flagged gaps (settle: small new handler; black
market items: deliberately deferred).

## 2. Domain-type collision

Smaller than expected. Both codebases use **branded string ids with identical
names** — `AsteroidId`, `BuildingId`, `ShipId`, `PlayerId`, `BlueprintId`,
`AgentId`, `TreatyId` (adopted side adds `ScenarioId`). Encodings differ (opus:
`__brand` property brand, `packages/domain/src/ids.ts`; adopted: unique-symbol
brand, `copilot-opus/packages/domain/src/ids.ts`) so they are nominally
incompatible — but both are plain strings at runtime.

The resolution is structural, not clever: **the two domains never meet inside sim
code.** The adopted packages are internally self-consistent (domain ← content ←
sim ← ai). Opus's UI never sees the adopted `World` — only `HudSnapshot`, whose id
fields are opus-branded strings minted by the adapter. All casts live in exactly
two files: the command translator and `takeHudSnapshot`. Grep-auditable.

**We take the adopted domain package too** (it is the sim's vocabulary — 1,382
lines, no test debt). Opus's `@fa/domain` shrinks to what the UI layer still
imports (ids + snapshot-facing enums) and dies at Phase E.

**Package-name collision is real and must be handled first:** both workspaces
name their packages `@fa/domain`, `@fa/sim`, `@fa/content` (verified via both
`package.json` sets). Vendor the adopted four as **`@fab/domain`, `@fab/content`,
`@fab/sim`, `@fab/ai`** during transition; rename to `@fa/*` at Phase E when the
old sim is deleted. Also: adopted code is single-quote/Prettier-ish and will fail
opus's Biome — add `packages/fab-*` to `biome.json` ignore until Phase E, then
reformat in one commit.

Adoption set size: ~9,200 LOC source + ~4,200 LOC tests (domain 1,382; content
2,727; sim 4,212 + tests; ai 850). The tests come along and run under opus's
vitest workspace with only config touches.

**Clear-eyed answer: this seams cleanly.** The six-week-transliteration risk
materialises only if someone tries to make opus's UI consume the adopted `World`
directly, or merge the two domain packages. The adapter boundary forbids both.

## 3. Save-format break

**Decision: clean break.** Confirmed mechanics:

- Opus's envelope (`SaveV1` — pako-deflated JSON in idb slot store,
  `packages/persistence/src/{serializer,idb}.ts`) is agnostic to `worldSnapshot`'s
  contents and **survives unchanged**, including the slot UI and the autosave path.
- The payload changes entirely: `worldSnapshot` becomes the adopted
  `SerializedWorld`, which carries **its own** `schemaVersion` (currently 2) and
  migration chain (`copilot-opus/packages/sim/src/serializer/migrations.ts`) —
  we inherit a working migration story going forward.
- Envelope `schemaVersion` bumps 1 → 2. `restore()` rejects v1 with an explicit
  message ("save from an earlier version — start a new game"); `listSaveSlots()`
  still lists old slots so nothing looks lost; no idb deletion, no migration
  written. Nobody has saves worth preserving pre-1.0; this is the decision, made
  here, not an accident.

## 4. Breakage list — opus features vs the adopted sim

Ordered by severity. "Adapter" = survives via `takeHudSnapshot` compatibility
fields; "Rework" = the panel's model genuinely changes.

| # | Feature (where) | Verdict |
|---|---|---|
| 1 | **Trade/Transporter panels** (`hud/TradePanel.tsx`, `TransporterPanel.tsx`) — built on the global `oreInventory` and instant full-price `sellOre` | **Rework, severity 1.** The adopted model is per-asteroid stocks + queued orders drained on the transporter cadence. This is the single largest UI change and it is the *desired* gameplay change (selling becomes a timed decision). Interim shim: adapter exposes `oreInventory` = Σ stocks for display, panels re-target `queueSellOrder` per colony |
| 2 | **Event-kind consumers**: SFX switch (`game/renderLoop.ts:93-151`), `NotificationFeed` label map, achievement trigger `"blackmarket.purchase"` | **Mechanical remap, severity 1 by breadth.** Adopted kinds are a different vocabulary (`colony.starved`, `population.unrest`, `council.embargo`, `market.shock`, `tutorial.objective.completed`, `command.rejected`, …). Build ONE shared `eventKindMeta` table (label, priority, SFX) in the UI; unknown kinds must render with a generic label, **never be dropped** (§5) |
| 3 | **BlueprintShop** (`hud/BlueprintShop.tsx`) | **Rework, severity 2.** `buyBlueprint` → `startResearch` with duration (`researchPhase`); blueprint ids/content change (flat storefront — closer to the original); needs an in-progress affordance. The five-linear-ladders UI dies happily |
| 4 | **DiplomacyPanel** | **Rework, severity 2 — and an upgrade.** Proposals are now *answered* (AI operational pass replies within ~10 ticks via `respondTreaty`); panel needs a pending-proposal state and gains breakTreaty/declareWar/council votes. The one-click-peace exploit dies at the seam |
| 5 | **EspionagePanel** | **Rework, severity 2.** Opus's 20-agent hire list vs adopted `dispatchAgent` + `EspionageState` + detection + satellites. Redesign was already planned (agents were a price ladder) |
| 6 | **SurfaceView commands** (`hud/SurfaceView.tsx`) | **Adapter, severity 2.** queueBuild/produceShip/launchMissile map cleanly; **Settle needs the §1.3 gap patch**; building-kind rename map feeds the palette; the adopted catalogue's ids/categories (46 buildings incl. `bld.asteroid-engine`, `bld.space-dock`, seismic chain) replace opus's 57 |
| 7 | **achievementDetector** (`store/achievementDetector.ts`) | **Adapter, severity 3.** Reads snapshot fields that survive (credits, asteroids, diplomacy, agents, tick) + `gameEndState` strings + one event kind — both mapped in the adapter (`GameOutcome` → `"victory:*"` strings) |
| 8 | **tutorialMachine** (`machines/tutorialMachine.ts`) | **Adapter now, delete later, severity 3.** XState steps use snapshot predicates that survive the adapter. Replaced in Stage 5 by the adopted sim-side tutorial engine (`systems/tutorial.ts` + scenario objectives), which is better |
| 9 | **Scenarios & weekly seed** (`content/scenarios.ts`, NewGameScreen) | **Re-author, severity 3.** Opus's 4 scenarios (label/seed/difficulty) become adopted `ScenarioDef`s — *gaining* victoryConditions, startingResources, timeLimitDays, and objective scripts. Weekly-seed UI unchanged (`createWorld({seed})`) |
| 10 | **Difficulty tiers** | **Extend, severity 3.** Opus has 5 (intern…board), adopted has 3 (`DIFFICULTY_MODIFIERS`, `domain/difficulty.ts`). Extend the table to opus's five labels (it is explicitly the single place for such knobs); map ceo/board to added rows with Mauna-style pressure once Stage 4 lands |
| 11 | **Untouched**: keybinds, a11y (palettes, font scale, ARIA), HUD themes, SaveLoad panel, PWA/deploy, pixi SectorView (consumes adapter snapshot; `combatFlashes` synthesized from adopted missiles/fleets — richer than today) | **Survive as-is, severity none** |

## 5. The Federal Council — making sure the crown jewel survives

The autonomous-pressure machinery observed live (unprovoked `council.embargo`
sanctions at tick 1200) is carried by exactly three things:

1. **State + types**: `world.council` (`FederalCouncilState`,
   `copilot-opus/packages/domain/src/federalCouncil.ts`) — serialised with the
   world, so it also survives save/load.
2. **The phase**: `federalCouncilPhase` inside `tickOnce`
   (`sim/src/tick.ts` order; logic in `sim/src/systems/federalCouncil.ts` —
   convenes on an interval, embargoes the lowest-standing player, tariffs ores,
   opens votes that auto-pass if unanswered). It runs *unconditionally* — adopting
   `tickOnce` unmodified is sufficient. **Never re-implement the tick pipeline; call
   the exported one.**
3. **Its outputs**: events (`council.*`) + market effects (tariff multipliers,
   embargo checks in `marketPhase`) + the `councilVoteRespond` command.

Three seam rules so it cannot be dropped silently:

- **AI registration is load-bearing and invisible.** Without `import '@fab/ai'` in
  the worker entry, `setAiDriver` never runs and the sim ticks with **no AI at
  all** — no rivals, and pressure halved. Add a boot assertion in the adapter
  constructor (fail loudly if no driver registered) — this is the single most
  likely thing to be "forgotten at the seam".
- **Unknown event kinds pass through** the adapter and the UI's `eventKindMeta`
  falls back to a visible generic entry. Council events must reach the feed from
  day one even before bespoke UI exists.
- **A determinism fixture test in opus CI**: fixed seed, run N ticks, assert a
  `council.*` event occurred and an embargo is active — the canary that pressure
  machinery is alive after any adapter change.

Expose `councilVoteRespond` as a minimal feed-inline Accept/Reject in the same PR
that lands the event remap (votes otherwise auto-pass — functional but invisible
agency).

## 6. Migration sequence

Lanes: **(A/B/C)** can run while `stage0-clock` / `stage0-ui` continue on
`feature/playability` — their day-model and store/test work should be re-pointed at
the adapter once Phase B exists (flag to the lead: `stage0-clock`'s content-rate
conversions belong in the *adapted* content tables, not opus's dying
`buildings.json`).

- **Phase A — vendor (build stays green).** Copy `domain`, `content`, `sim`, `ai`
  from copilot-opus into `packages/fab-*` as `@fab/*`; wire into pnpm workspace +
  vitest; Biome-ignore the four dirs. Their own test suites run in opus CI. No
  consumer yet. *Deliverable: green build, ~4,200 LOC of adopted tests passing.*
- **Phase B — adapter package (green).** New `packages/sim-adapter`: `SimApiV2`
  (same five-method Comlink surface), command translator, `takeHudSnapshot`,
  building-kind rename map, envelope v2 save path, AI-registration assertion, the
  §5 council canary test, and the **settle command patch** inside `@fab/sim`'s
  `commands.ts` (the one sanctioned edit inside the vendored code — commit it
  separately, marked as a delta from upstream). New worker entry
  `sim.worker.v2.ts`. *Deliverable: a headless vitest that plays 10 sim-minutes
  through SimApiV2 — builds, mines, queues a sell order, gets a council event.*
- **Phase C — flag flip behind a query param (green).** `renderLoop` chooses worker
  by `?sim=v2` (default v1). Event remap table + NotificationFeed/SFX rewire (works
  for both sims via the table). **This is the rollback point: default stays v1
  until Phase D exits.** *Deliverable: the game boots and is playable end-to-end on
  `?sim=v2` with known-broken panels listed on screen (dev banner).*
- **Phase D — panel rework (the planned red window, scoped to `apps/web`).** In
  order: Trade/Transporter (per-asteroid stocks + queued orders), BlueprintShop
  (research-in-progress), Diplomacy (pending proposals + council votes), Espionage.
  Scenario re-authoring + 5-tier difficulty table land here. Each panel PR keeps
  `?sim=v1` working (panels branch on a `simVersion` capability field in the
  snapshot). e2e: canvas-click test + a v2 golden-path test (tutorial scenario to
  second colony). *Exit: default flips to v2.*
- **Phase E — burn the boats (brief, deliberately red mid-PR).** Delete
  `packages/sim` internals + old worker + v1 flag; rename `@fab/*` → `@fa/*`;
  shrink old `@fa/domain` to UI-facing types or fold it; Biome reformat of adopted
  code; delete `tutorialMachine` when the sim-side tutorial wires up (Stage 5 may
  precede this). *Exit: one sim, one domain, green.*

Guaranteed-red moments: only Phase E's rename/delete commit (contained, single
PR), and transient panel states inside Phase D PRs (masked by the v1 default).
Rollback at any point before Phase D exit = ship with `?sim` defaulting to v1.

## 7. Go / no-go, restated after the seam work

**GO.** The seam analysis strengthened the recommendation:

- The engine is drivable through `tickOnce` + plain-data `World` — it fits opus's
  existing pull-model bridge *better* than its own push bridge does.
- The domain collision dissolves at the adapter boundary; casts are confined to two
  files; the package-name clash has a mechanical fix.
- The save break is an envelope version bump; we *inherit* a better migration
  story.
- The Federal Council + AI pressure machinery ride along with `tickOnce` + one
  import, guarded by an assertion and a canary test.

Conditions attached to the GO:

- **(a)** The settle-command gap is patched in the vendored sim in Phase B (small,
  one handler); without it adoption regresses the only working expansion path.
- **(b)** All cross-domain casts live in `sim-adapter` — enforce by review; any PR
  importing `@fab/domain` inside `apps/web` is rejected.
- **(c)** The AI-driver boot assertion and council canary test land in Phase B, not
  later.

Fallback trigger (checked at Phase B exit): if the headless SimApiV2 test cannot be
made to pass within ~3 working days of adapter effort — e.g. the PrngRegistry or
scenario coupling resists driving outside its own worker — drop to the
system-by-system port (population → economy → market → council, in that order,
into opus's sim). Nothing in this analysis predicts that outcome; the engine has no
DOM/timer imports (`sim/src/index.ts` header comment, verified by reading the tick
pipeline) and its own InMemoryBridge already drives it synchronously in tests.

---

*Read-only analysis; the only file created is this spec. Companion review:
`2026-07-25-playability-review.md` (v2.1).*
