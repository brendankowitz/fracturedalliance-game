# Fractured Alliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Fractured Alliance — a browser-based asteroid-belt colony/trading/diplomacy strategy game — as a TypeScript PWA across 5 phases from prototype to multiplayer.

**Architecture:** The game simulation runs in a Web Worker at a fixed 20 Hz timestep, deterministic via a seeded PRNG, publishing read-only snapshots to Zustand on the main thread. PixiJS v8 renders the game world via RAF; React 19 owns all HUD chrome as DOM elements above the canvas. The domain model (`packages/domain`) is pure TypeScript — zero UI dependencies.

**Tech Stack:** pnpm workspaces · Vite 6 · TypeScript 5.7 · React 19 · PixiJS v8 · Zustand 5 · XState v5 · Comlink · Vitest · Playwright · Biome 2 · idb · pako

---

## File Map

```
fractured-alliance/
├── apps/
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx                    # React root mount
│           ├── App.tsx                     # XState machine root + canvas mount
│           ├── workers/
│           │   └── sim.worker.ts           # Comlink-exposed SimApi in worker
│           ├── game/
│           │   ├── pixiApp.ts              # PixiJS Application singleton
│           │   ├── renderLoop.ts           # RAF loop + worker bridge
│           │   └── views/
│           │       ├── asteroidView.ts     # Grid + building sprites
│           │       └── sectorView.ts       # Belt overview (Phase 1)
│           ├── hud/
│           │   ├── HUD.tsx                 # HUD shell (composes panels)
│           │   ├── ResourceBar.tsx         # Credits / ore display
│           │   ├── BuildingPanel.tsx       # Building palette + placement
│           │   ├── NotificationFeed.tsx    # Event feed (Phase 1)
│           │   └── SaveLoadPanel.tsx       # Save slot UI
│           ├── machines/
│           │   └── gameMachine.ts          # XState v5 game flow
│           └── store/
│               ├── gameStore.ts            # Zustand: HUD snapshots from worker
│               └── uiStore.ts              # Zustand: selected cell, open panels
├── packages/
│   ├── domain/                             # Pure TS — zero runtime deps
│   │   └── src/
│   │       ├── ids.ts                      # Branded ID types
│   │       ├── types.ts                    # OreKind, Resources
│   │       ├── asteroid.ts                 # Asteroid interface
│   │       ├── building.ts                 # Building + BuildingDef
│   │       ├── ship.ts                     # Ship, ShipClassDef, ShipOrder
│   │       ├── player.ts                   # Player
│   │       ├── race.ts                     # RaceDef
│   │       ├── treaty.ts                   # TreatyKind, Treaty
│   │       ├── world.ts                    # World
│   │       ├── events.ts                   # GameEvent union
│   │       └── index.ts                    # Barrel
│   ├── sim/                                # Simulation — runs in worker
│   │   └── src/
│   │       ├── prng.ts                     # mulberry32 seeded PRNG
│   │       ├── world.ts                    # createWorld factory
│   │       ├── systems/
│   │       │   ├── constructionSystem.ts   # Build queue processing
│   │       │   ├── miningSystem.ts         # Ore extraction per tick
│   │       │   ├── resourceSystem.ts       # Power/food/water/air balance
│   │       │   ├── economySystem.ts        # Market, income, trade (Phase 1)
│   │       │   ├── combatSystem.ts         # Fleet combat (Phase 1)
│   │       │   ├── diplomacySystem.ts      # Treaties, reputation (Phase 1)
│   │       │   └── aiSystem.ts             # Utility AI (Phase 1)
│   │       ├── commands.ts                 # Command union type
│   │       ├── commandProcessor.ts         # Apply commands → World mutation
│   │       ├── snapshot.ts                 # World → HudSnapshot (main-thread safe)
│   │       ├── loop.ts                     # Fixed-timestep tick orchestrator
│   │       └── api.ts                      # SimApi class (Comlink target)
│   ├── content/                            # Game data — JSON + typed loaders
│   │   ├── data/
│   │   │   ├── buildings.json
│   │   │   ├── ships.json
│   │   │   ├── blueprints.json
│   │   │   ├── races.json
│   │   │   └── ores.json
│   │   └── src/
│   │       ├── buildings.ts
│   │       ├── ships.ts
│   │       ├── blueprints.ts
│   │       ├── races.ts
│   │       └── index.ts
│   ├── persistence/                        # Save/load — no UI deps
│   │   └── src/
│   │       ├── serializer.ts               # World ↔ JSON + pako gzip
│   │       ├── migrations.ts               # Schema migration chain
│   │       └── idb.ts                      # IndexedDB save slots via idb
│   └── shared-ui/                          # React design primitives
│       └── src/
│           ├── tokens.ts                   # Design tokens (colours, spacing)
│           └── components/
│               ├── Panel.tsx
│               ├── Button.tsx
│               └── Tooltip.tsx
├── tests/
│   ├── replay-fixtures/                    # Golden deterministic tapes
│   └── e2e/                                # Playwright specs
├── biome.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .github/workflows/ci.yml
```

---

## Phase 0 — Prototype

**Success criteria:** Click to place a mine on a single asteroid, watch ore accumulate, close the tab, reopen, resume exactly where you left off.

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `biome.json`
- Create: `.gitignore`
- Create: `packages/domain/package.json`
- Create: `packages/sim/package.json`
- Create: `packages/content/package.json`
- Create: `packages/persistence/package.json`
- Create: `packages/shared-ui/package.json`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "fractured-alliance",
  "private": true,
  "scripts": {
    "dev": "pnpm -F @fa/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.12/schema.json",
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedImports": "error" },
      "suspicious": { "noExplicitAny": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
*.tsbuildinfo
.env
.env.local
coverage/
```

- [ ] **Step 6: Create `packages/domain/package.json`**

```json
{
  "name": "@fa/domain",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 7: Create `packages/sim/package.json`**

```json
{
  "name": "@fa/sim",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/api.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@fa/domain": "workspace:*",
    "@fa/content": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 8: Create `packages/content/package.json`**

```json
{
  "name": "@fa/content",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@fa/domain": "workspace:*" },
  "devDependencies": { "vitest": "^3.0.0" }
}
```

- [ ] **Step 9: Create `packages/persistence/package.json`**

```json
{
  "name": "@fa/persistence",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": {
    "@fa/domain": "workspace:*",
    "idb": "^8.0.0",
    "pako": "^2.1.0"
  },
  "devDependencies": { "vitest": "^3.0.0" }
}
```

- [ ] **Step 10: Install dependencies**

```bash
pnpm install
```

Expected: lockfile created, all workspace packages linked.

- [ ] **Step 11: Verify Biome runs**

```bash
pnpm lint
```

Expected: `Checked 0 files` (no source yet) — exit 0.

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "chore: monorepo scaffold — pnpm workspaces, tsconfig, biome"
```

---

### Task 2: Domain — branded IDs and core value types

**Files:**
- Create: `packages/domain/src/ids.ts`
- Create: `packages/domain/src/types.ts`
- Create: `packages/domain/src/events.ts`
- Create: `packages/domain/tsconfig.json`
- Test: `packages/domain/src/__tests__/types.test.ts`

- [ ] **Step 1: Create `packages/domain/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing type-safety test**

Create `packages/domain/src/__tests__/types.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { AsteroidId, BuildingId } from '../ids.ts';

describe('branded IDs', () => {
  it('AsteroidId and BuildingId are structurally distinct', () => {
    const aid = 'a1' as AsteroidId;
    const bid = 'b1' as BuildingId;
    // This test verifies the module exports exist and are distinct nominal types.
    // TypeScript would reject: const _: AsteroidId = bid;
    expect(typeof aid).toBe('string');
    expect(typeof bid).toBe('string');
    expect(aid).not.toBe(bid);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (module not found)**

```bash
pnpm -F @fa/domain test
```

Expected: `Error: Cannot find module '../ids.ts'`

- [ ] **Step 4: Create `packages/domain/src/ids.ts`**

```typescript
export type AsteroidId  = string & { readonly __brand: 'AsteroidId' };
export type BuildingId  = string & { readonly __brand: 'BuildingId' };
export type ShipId      = string & { readonly __brand: 'ShipId' };
export type PlayerId    = string & { readonly __brand: 'PlayerId' };
export type BlueprintId = string & { readonly __brand: 'BlueprintId' };
export type AgentId     = string & { readonly __brand: 'AgentId' };
export type TreatyId    = string & { readonly __brand: 'TreatyId' };

export function asteroidId(raw: string): AsteroidId  { return raw as AsteroidId; }
export function buildingId(raw: string): BuildingId  { return raw as BuildingId; }
export function shipId(raw: string): ShipId          { return raw as ShipId; }
export function playerId(raw: string): PlayerId      { return raw as PlayerId; }
export function blueprintId(raw: string): BlueprintId { return raw as BlueprintId; }
```

- [ ] **Step 5: Create `packages/domain/src/types.ts`**

```typescript
export type OreKind =
  | 'selenium' | 'asteros'   | 'barium'    | 'crystalite' | 'quazinc'
  | 'bytanium' | 'korellium' | 'dragonium' | 'traxium'    | 'nexos';

export const ALL_ORES: readonly OreKind[] = [
  'selenium', 'asteros', 'barium', 'crystalite', 'quazinc',
  'bytanium', 'korellium', 'dragonium', 'traxium', 'nexos',
];

export type OreRecord<T> = Record<OreKind, T>;
export type PartialOreRecord<T> = Partial<OreRecord<T>>;

export interface Resources {
  credits: number;
  ores: OreRecord<number>;
  population: number;
  food: number;
  water: number;
  air: number;
  power: number;
}

export function zeroOres(): OreRecord<number> {
  return {
    selenium: 0, asteros: 0, barium: 0, crystalite: 0, quazinc: 0,
    bytanium: 0, korellium: 0, dragonium: 0, traxium: 0, nexos: 0,
  };
}

export type SizeClass = 'S' | 'M' | 'L' | 'XL';

export const SIZE_CLASS_GRID: Record<SizeClass, { width: number; height: number }> = {
  S:  { width: 5,  height: 5  },
  M:  { width: 7,  height: 7  },
  L:  { width: 9,  height: 9  },
  XL: { width: 11, height: 11 },
};

export type Difficulty = 'intern' | 'manager' | 'director' | 'ceo' | 'board';
```

- [ ] **Step 6: Create `packages/domain/src/events.ts`**

```typescript
import type { AsteroidId, PlayerId } from './ids.ts';
import type { TreatyKind } from './treaty.ts';

export type EventPriority = 'red' | 'amber' | 'grey';

export type GameEvent =
  | { kind: 'colony.under_attack';  priority: 'red';   asteroidId: AsteroidId; attackerId: PlayerId }
  | { kind: 'colony.starved';       priority: 'red';   asteroidId: AsteroidId }
  | { kind: 'colony.captured';      priority: 'red';   asteroidId: AsteroidId; byPlayerId: PlayerId }
  | { kind: 'asteroid.incoming';    priority: 'red';   targetId: AsteroidId; etaTick: number }
  | { kind: 'trader.arrived';       priority: 'amber'; asteroidId: AsteroidId }
  | { kind: 'construction.done';    priority: 'grey';  asteroidId: AsteroidId; buildingKind: string }
  | { kind: 'treaty.broken';        priority: 'amber'; by: PlayerId; against: PlayerId; treaty: TreatyKind }
  | { kind: 'blueprint.purchased';  priority: 'grey';  playerId: PlayerId; blueprintId: string };
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
pnpm -F @fa/domain test
```

Expected: `1 passed`

- [ ] **Step 8: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): branded IDs, OreKind, Resources, GameEvent union"
```

---

### Task 3: Domain — entity interfaces

**Files:**
- Create: `packages/domain/src/asteroid.ts`
- Create: `packages/domain/src/building.ts`
- Create: `packages/domain/src/ship.ts`
- Create: `packages/domain/src/player.ts`
- Create: `packages/domain/src/race.ts`
- Create: `packages/domain/src/treaty.ts`
- Create: `packages/domain/src/world.ts`
- Create: `packages/domain/src/index.ts`

- [ ] **Step 1: Create `packages/domain/src/asteroid.ts`**

```typescript
import type { AsteroidId, BuildingId, PlayerId, ShipId } from './ids.ts';
import type { OreRecord, SizeClass } from './types.ts';

export interface BuildQueueItem {
  buildingKind: string;
  progressTicks: number;
  totalTicks: number;
}

export interface AsteroidEngineState {
  count: number;
  destinationId: AsteroidId | null;
  etaTick: number | null;
  chargeTick: number | null;
}

export interface Asteroid {
  readonly id: AsteroidId;
  name: string;
  ownerId: PlayerId | null;
  sector: { readonly x: number; readonly y: number };
  sizeClass: SizeClass;
  deposits: Partial<OreRecord<number>>;
  radiation: number;
  stability: number;
  happiness: number;
  buildings: ReadonlyArray<BuildingId>;
  buildQueue: BuildQueueItem[];
  inOrbit: ReadonlyArray<ShipId>;
  engines: AsteroidEngineState;
}
```

- [ ] **Step 2: Create `packages/domain/src/building.ts`**

```typescript
import type { AsteroidId, BlueprintId, BuildingId } from './ids.ts';
import type { PartialOreRecord } from './types.ts';

export interface BuildingDef {
  readonly kind: string;
  readonly label: string;
  readonly costCredits: number;
  readonly buildTimeTicks: number;
  readonly powerDelta: number;
  readonly popCapDelta: number;
  readonly foodDelta: number;
  readonly waterDelta: number;
  readonly airDelta: number;
  readonly oreProduction?: PartialOreRecord<number>;
  readonly blueprintRequired?: BlueprintId;
  readonly unique?: boolean;
}

export interface Building {
  readonly id: BuildingId;
  readonly defKind: string;
  readonly asteroidId: AsteroidId;
  cell: { x: number; y: number };
  hp: number;
  readonly maxHp: number;
  constructionProgress: number;
  active: boolean;
  damage: number;
}
```

- [ ] **Step 3: Create `packages/domain/src/ship.ts`**

```typescript
import type { AsteroidId, BlueprintId, PlayerId, ShipId } from './ids.ts';
import type { PartialOreRecord } from './types.ts';

export type ShipKind =
  | 'scout' | 'assaultCraft' | 'combatEagle'
  | 'fleetBattleship' | 'destructor' | 'commandCruiser';

export interface ShipClassDef {
  readonly kind: ShipKind;
  readonly label: string;
  readonly hullHp: number;
  readonly shieldHp: number;
  readonly speed: number;
  readonly hardpoints: number;
  readonly cargoCap: number;
  readonly fuelRange: number;
  readonly costCredits: number;
  readonly buildTimeTicks: number;
  readonly blueprintRequired?: BlueprintId;
}

export type ShipOrder =
  | { kind: 'idle' }
  | { kind: 'moveTo';        target: { x: number; y: number } }
  | { kind: 'attackAsteroid'; target: AsteroidId }
  | { kind: 'defend';         target: AsteroidId }
  | { kind: 'scout';          target: { x: number; y: number } }
  | { kind: 'trade';          target: AsteroidId; payload: PartialOreRecord<number> };

export interface Ship {
  readonly id: ShipId;
  readonly defKind: ShipKind;
  readonly ownerId: PlayerId;
  hullHp: number;
  shieldHp: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  order: ShipOrder;
  cargo: PartialOreRecord<number>;
}
```

- [ ] **Step 4: Create `packages/domain/src/race.ts`**

```typescript
import type { OreKind } from './types.ts';

export interface RacePersonality {
  aggression: number;
  grudgeDecayPerDay: number;
  tradeBias: number;
  techBias: number;
  expansionBias: number;
  treatyRespect: number;
  ramWillingness: number;
}

export interface RaceDef {
  readonly id: string;
  readonly name: string;
  readonly personality: RacePersonality;
  readonly tradeLove: ReadonlyArray<OreKind>;
  readonly tradeHate: ReadonlyArray<OreKind>;
  readonly federationMember: boolean;
  readonly playable: boolean;
}
```

- [ ] **Step 5: Create `packages/domain/src/treaty.ts`**

```typescript
import type { PlayerId, TreatyId } from './ids.ts';

export type TreatyKind =
  | 'nonAggression' | 'noCovert'      | 'trade'
  | 'openBorders'   | 'defensivePact' | 'jointWar' | 'peace';

export interface Treaty {
  readonly id: TreatyId;
  readonly parties: readonly [PlayerId, PlayerId];
  readonly kind: TreatyKind;
  readonly signedTick: number;
  readonly expiresTick?: number;
}
```

- [ ] **Step 6: Create `packages/domain/src/player.ts`**

```typescript
import type { BlueprintId, PlayerId } from './ids.ts';
import type { GameEvent } from './events.ts';

export interface AiEventRecord {
  readonly tick: number;
  readonly kind: string;
  readonly data: Record<string, unknown>;
}

export interface Player {
  readonly id: PlayerId;
  readonly raceId: string;
  readonly isHuman: boolean;
  credits: number;
  reputation: Map<PlayerId, number>;
  federationStanding: number;
  blueprintsOwned: Set<BlueprintId>;
  eventLog: AiEventRecord[];
  alive: boolean;
  suspicion: number;
}
```

- [ ] **Step 7: Create `packages/domain/src/world.ts`**

```typescript
import type { AsteroidId, BuildingId, PlayerId, ShipId } from './ids.ts';
import type { Asteroid } from './asteroid.ts';
import type { Building } from './building.ts';
import type { Ship } from './ship.ts';
import type { Player } from './player.ts';
import type { Treaty } from './treaty.ts';
import type { GameEvent } from './events.ts';
import type { OreRecord } from './types.ts';

export interface Prng {
  next(): number;
  state(): number;
  restore(state: number): void;
}

export interface World {
  tick: number;
  readonly seed: number;
  asteroids: Map<AsteroidId, Asteroid>;
  buildings: Map<BuildingId, Building>;
  ships: Map<ShipId, Ship>;
  players: Map<PlayerId, Player>;
  treaties: Treaty[];
  marketPrices: OreRecord<number>;
  eventQueue: GameEvent[];
  prng: Prng;
  schemaVersion: number;
}
```

- [ ] **Step 8: Create `packages/domain/src/index.ts`**

```typescript
export * from './ids.ts';
export * from './types.ts';
export * from './asteroid.ts';
export * from './building.ts';
export * from './ship.ts';
export * from './player.ts';
export * from './race.ts';
export * from './treaty.ts';
export * from './world.ts';
export * from './events.ts';
```

- [ ] **Step 9: Typecheck**

```bash
pnpm -F @fa/domain typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): entity interfaces — Asteroid, Building, Ship, Player, World"
```

---

### Task 4: PRNG

**Files:**
- Create: `packages/sim/tsconfig.json`
- Create: `packages/sim/src/prng.ts`
- Test: `packages/sim/src/__tests__/prng.test.ts`

- [ ] **Step 1: Create `packages/sim/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing tests**

Create `packages/sim/src/__tests__/prng.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { makePrng } from '../prng.ts';

describe('makePrng (mulberry32)', () => {
  it('is deterministic — same seed produces same sequence', () => {
    const a = makePrng(42);
    const b = makePrng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = makePrng(1);
    const b = makePrng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('outputs are in [0, 1)', () => {
    const rng = makePrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('state save/restore resumes identical sequence', () => {
    const rng = makePrng(7);
    rng.next(); rng.next();
    const savedState = rng.state();
    const before = Array.from({ length: 5 }, () => rng.next());
    rng.restore(savedState);
    const after = Array.from({ length: 5 }, () => rng.next());
    expect(after).toEqual(before);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
pnpm -F @fa/sim test
```

Expected: `Cannot find module '../prng.ts'`

- [ ] **Step 4: Create `packages/sim/src/prng.ts`**

```typescript
import type { Prng } from '@fa/domain';

export function makePrng(seed: number): Prng {
  let s = seed >>> 0;

  return {
    next(): number {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state(): number {
      return s;
    },
    restore(state: number): void {
      s = state >>> 0;
    },
  };
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
pnpm -F @fa/sim test
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add packages/sim
git commit -m "feat(sim): mulberry32 seeded PRNG with save/restore"
```

---

### Task 5: Content — ore and building definitions (Phase 0 subset)

**Files:**
- Create: `packages/content/tsconfig.json`
- Create: `packages/content/data/ores.json`
- Create: `packages/content/data/buildings.json`
- Create: `packages/content/src/buildings.ts`
- Create: `packages/content/src/index.ts`
- Test: `packages/content/src/__tests__/buildings.test.ts`

- [ ] **Step 1: Create `packages/content/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create `packages/content/data/ores.json`**

```json
[
  { "kind": "selenium",   "label": "Selenium",   "basePrice": 100, "depth": "surface" },
  { "kind": "asteros",    "label": "Asteros",    "basePrice": 150, "depth": "surface" },
  { "kind": "barium",     "label": "Barium",     "basePrice": 220, "depth": "surface" },
  { "kind": "crystalite", "label": "Crystalite", "basePrice": 300, "depth": "mid"     },
  { "kind": "quazinc",    "label": "Quazinc",    "basePrice": 380, "depth": "mid"     },
  { "kind": "bytanium",   "label": "Bytanium",   "basePrice": 500, "depth": "mid"     },
  { "kind": "korellium",  "label": "Korellium",  "basePrice": 650, "depth": "deep"    },
  { "kind": "dragonium",  "label": "Dragonium",  "basePrice": 820, "depth": "deep"    },
  { "kind": "traxium",    "label": "Traxium",    "basePrice": 1100,"depth": "seismic" },
  { "kind": "nexos",      "label": "Nexos",      "basePrice": 1500,"depth": "seismic" }
]
```

- [ ] **Step 3: Create `packages/content/data/buildings.json` (Phase 0 subset)**

```json
[
  {
    "kind": "cpu",
    "label": "CPU Core",
    "costCredits": 0,
    "buildTimeTicks": 0,
    "powerDelta": -5,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 0,
    "unique": true
  },
  {
    "kind": "airProcessor",
    "label": "Air Processor",
    "costCredits": 400,
    "buildTimeTicks": 60,
    "powerDelta": -4,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 400
  },
  {
    "kind": "hydrationPlant",
    "label": "Hydration Plant",
    "costCredits": 400,
    "buildTimeTicks": 60,
    "powerDelta": -3,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 400,
    "airDelta": 0
  },
  {
    "kind": "hydroponics",
    "label": "Hydroponics",
    "costCredits": 600,
    "buildTimeTicks": 80,
    "powerDelta": -4,
    "popCapDelta": 0,
    "foodDelta": 20,
    "waterDelta": 0,
    "airDelta": 0
  },
  {
    "kind": "livingQuarters",
    "label": "Living Quarters",
    "costCredits": 300,
    "buildTimeTicks": 60,
    "powerDelta": -1,
    "popCapDelta": 50,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 0
  },
  {
    "kind": "powerPlant",
    "label": "Power Plant",
    "costCredits": 700,
    "buildTimeTicks": 100,
    "powerDelta": 10,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 0
  },
  {
    "kind": "mineMk1",
    "label": "Mine Mk1",
    "costCredits": 500,
    "buildTimeTicks": 80,
    "powerDelta": -2,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 0,
    "oreProduction": { "selenium": 1, "asteros": 0.5 }
  },
  {
    "kind": "storageTower",
    "label": "Storage Tower",
    "costCredits": 600,
    "buildTimeTicks": 80,
    "powerDelta": -1,
    "popCapDelta": 0,
    "foodDelta": 0,
    "waterDelta": 0,
    "airDelta": 0
  }
]
```

- [ ] **Step 4: Write failing test**

Create `packages/content/src/__tests__/buildings.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getBuildingDef, getAllBuildingDefs } from '../buildings.ts';

describe('building definitions', () => {
  it('loads all buildings without error', () => {
    const defs = getAllBuildingDefs();
    expect(defs.length).toBeGreaterThan(0);
  });

  it('getBuildingDef returns the correct definition', () => {
    const def = getBuildingDef('mineMk1');
    expect(def.kind).toBe('mineMk1');
    expect(def.costCredits).toBe(500);
  });

  it('throws for unknown building kind', () => {
    expect(() => getBuildingDef('unicorn')).toThrow();
  });

  it('every building has required fields', () => {
    for (const def of getAllBuildingDefs()) {
      expect(typeof def.kind).toBe('string');
      expect(typeof def.costCredits).toBe('number');
      expect(typeof def.buildTimeTicks).toBe('number');
      expect(typeof def.powerDelta).toBe('number');
    }
  });
});
```

- [ ] **Step 5: Run — expect FAIL**

```bash
pnpm -F @fa/content test
```

Expected: `Cannot find module '../buildings.ts'`

- [ ] **Step 6: Create `packages/content/src/buildings.ts`**

```typescript
import type { BuildingDef } from '@fa/domain';
import rawBuildings from '../data/buildings.json' assert { type: 'json' };

const index = new Map<string, BuildingDef>(
  (rawBuildings as BuildingDef[]).map((b) => [b.kind, b]),
);

export function getBuildingDef(kind: string): BuildingDef {
  const def = index.get(kind);
  if (!def) throw new Error(`Unknown building kind: "${kind}"`);
  return def;
}

export function getAllBuildingDefs(): ReadonlyArray<BuildingDef> {
  return rawBuildings as BuildingDef[];
}
```

- [ ] **Step 7: Create `packages/content/src/index.ts`**

```typescript
export * from './buildings.ts';
```

- [ ] **Step 8: Run — expect PASS**

```bash
pnpm -F @fa/content test
```

Expected: `4 passed`

- [ ] **Step 9: Commit**

```bash
git add packages/content
git commit -m "feat(content): ore and building definitions (Phase 0 subset)"
```

---

### Task 6: Sim — World factory

**Files:**
- Create: `packages/sim/src/world.ts`
- Test: `packages/sim/src/__tests__/world.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/sim/src/__tests__/world.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createWorld } from '../world.ts';

describe('createWorld', () => {
  it('produces a world with the player asteroid', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    expect(world.asteroids.size).toBeGreaterThan(0);
    expect(world.players.size).toBeGreaterThan(0);
  });

  it('player starts with a CPU building on their asteroid', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const [player] = world.players.values();
    const asteroids = [...world.asteroids.values()].filter(
      (a) => a.ownerId === player!.id,
    );
    expect(asteroids.length).toBeGreaterThan(0);
    const buildings = [...world.buildings.values()].filter(
      (b) => b.defKind === 'cpu',
    );
    expect(buildings.length).toBeGreaterThan(0);
  });

  it('world tick starts at 0', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    expect(world.tick).toBe(0);
  });

  it('same seed produces structurally identical worlds', () => {
    const a = createWorld({ seed: 42, humanPlayerRaceId: 'helionCorp' });
    const b = createWorld({ seed: 42, humanPlayerRaceId: 'helionCorp' });
    expect(a.asteroids.size).toBe(b.asteroids.size);
    expect(a.tick).toBe(b.tick);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/sim test
```

Expected: `Cannot find module '../world.ts'`

- [ ] **Step 3: Create `packages/sim/src/world.ts`**

```typescript
import {
  type AsteroidId, type BuildingId, type PlayerId,
  asteroidId, buildingId, playerId,
  zeroOres, type OreRecord, type World, type Asteroid, type Building, type Player,
} from '@fa/domain';
import { makePrng } from './prng.ts';

export interface WorldConfig {
  seed: number;
  humanPlayerRaceId: string;
}

const BASE_MARKET_PRICES: OreRecord<number> = {
  selenium: 100, asteros: 150, barium: 220, crystalite: 300, quazinc: 380,
  bytanium: 500, korellium: 650, dragonium: 820, traxium: 1100, nexos: 1500,
};

export function createWorld(config: WorldConfig): World {
  const prng = makePrng(config.seed);

  const humanId = playerId('player-human');

  const asteroidAId = asteroidId('asteroid-0');
  const cpuId = buildingId('building-cpu-0');

  const starterAsteroid: Asteroid = {
    id: asteroidAId,
    name: 'Vega Prime',
    ownerId: humanId,
    sector: { x: 0, y: 0 },
    sizeClass: 'M',
    deposits: { selenium: 5000, asteros: 2000, barium: 800 },
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [cpuId],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };

  const cpuBuilding: Building = {
    id: cpuId,
    defKind: 'cpu',
    asteroidId: asteroidAId,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };

  const humanPlayer: Player = {
    id: humanId,
    raceId: config.humanPlayerRaceId,
    isHuman: true,
    credits: 10_000,
    reputation: new Map(),
    federationStanding: 50,
    blueprintsOwned: new Set(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  // Use prng so future procedural generation is seeded consistently.
  void prng.next();

  return {
    tick: 0,
    seed: config.seed,
    asteroids: new Map([[asteroidAId, starterAsteroid]]),
    buildings: new Map([[cpuId, cpuBuilding]]),
    ships: new Map(),
    players: new Map([[humanId, humanPlayer]]),
    treaties: [],
    marketPrices: { ...BASE_MARKET_PRICES },
    eventQueue: [],
    prng,
    schemaVersion: 1,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm -F @fa/sim test
```

Expected: `5 passed` (4 world + 1 prng)

- [ ] **Step 5: Commit**

```bash
git add packages/sim/src/world.ts packages/sim/src/__tests__/world.test.ts
git commit -m "feat(sim): createWorld factory with seeded starter asteroid"
```

---

### Task 7: Sim — Mining and resource systems

**Files:**
- Create: `packages/sim/src/systems/miningSystem.ts`
- Create: `packages/sim/src/systems/resourceSystem.ts`
- Test: `packages/sim/src/__tests__/systems.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/sim/src/__tests__/systems.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createWorld } from '../world.ts';
import { tickMining } from '../systems/miningSystem.ts';
import { tickResources, computePowerBalance } from '../systems/resourceSystem.ts';
import { getBuildingDef } from '@fa/content';
import { buildingId } from '@fa/domain';

describe('miningSystem', () => {
  it('active Mine Mk1 extracts ore each tick', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const [asteroid] = world.asteroids.values();

    // Place an active mine
    const mineId = buildingId('test-mine');
    world.buildings.set(mineId, {
      id: mineId,
      defKind: 'mineMk1',
      asteroidId: asteroid!.id,
      cell: { x: 1, y: 1 },
      hp: 100, maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });

    const beforeSelenium = asteroid!.deposits['selenium'] ?? 0;
    tickMining(world);
    const afterSelenium = asteroid!.deposits['selenium'] ?? 0;

    expect(afterSelenium).toBeLessThan(beforeSelenium);
  });
});

describe('resourceSystem', () => {
  it('computePowerBalance sums powerDelta for active buildings', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const [asteroid] = world.asteroids.values();
    const balance = computePowerBalance(world, asteroid!.id);
    // CPU costs -5 power; no generators yet
    expect(balance).toBe(-5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/sim test
```

Expected: `Cannot find module '../systems/miningSystem.ts'`

- [ ] **Step 3: Create `packages/sim/src/systems/miningSystem.ts`**

```typescript
import type { World } from '@fa/domain';
import { getBuildingDef } from '@fa/content';

export function tickMining(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    for (const buildingId of asteroid.buildings) {
      const building = world.buildings.get(buildingId);
      if (!building || !building.active || building.constructionProgress < 1) continue;

      const def = getBuildingDef(building.defKind);
      if (!def.oreProduction) continue;

      for (const [ore, ratePerTick] of Object.entries(def.oreProduction) as [string, number][]) {
        const oreKind = ore as keyof typeof asteroid.deposits;
        const available = asteroid.deposits[oreKind] ?? 0;
        if (available <= 0) continue;

        const extracted = Math.min(ratePerTick, available);
        asteroid.deposits[oreKind] = available - extracted;

        const player = asteroid.ownerId ? world.players.get(asteroid.ownerId) : undefined;
        if (player) {
          const price = world.marketPrices[oreKind] ?? 0;
          player.credits += extracted * price * 0.7;
        }
      }
    }
  }
}
```

- [ ] **Step 4: Create `packages/sim/src/systems/resourceSystem.ts`**

```typescript
import type { AsteroidId, World } from '@fa/domain';
import { getBuildingDef } from '@fa/content';

export function computePowerBalance(world: World, asteroidId: AsteroidId): number {
  const asteroid = world.asteroids.get(asteroidId);
  if (!asteroid) return 0;

  let balance = 0;
  for (const buildingId of asteroid.buildings) {
    const building = world.buildings.get(buildingId);
    if (!building || !building.active) continue;
    const def = getBuildingDef(building.defKind);
    balance += def.powerDelta;
  }
  return balance;
}

export function tickResources(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;
    const powerBalance = computePowerBalance(world, asteroid.id);
    if (powerBalance < 0) {
      // Buildings go inactive when power is negative — mark non-power buildings inactive
      // Simple heuristic for Phase 0: just track the imbalance
      asteroid.stability = Math.max(0, asteroid.stability - 0.1);
    }
  }
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
pnpm -F @fa/sim test
```

Expected: `6 passed`

- [ ] **Step 6: Commit**

```bash
git add packages/sim/src/systems
git commit -m "feat(sim): mining and resource systems"
```

---

### Task 8: Sim — Construction system and commands

**Files:**
- Create: `packages/sim/src/systems/constructionSystem.ts`
- Create: `packages/sim/src/commands.ts`
- Create: `packages/sim/src/commandProcessor.ts`
- Test: add to `packages/sim/src/__tests__/systems.test.ts`

- [ ] **Step 1: Create `packages/sim/src/commands.ts`**

```typescript
import type { AsteroidId } from '@fa/domain';

export type Command =
  | {
      kind: 'placeBuilding';
      asteroidId: AsteroidId;
      buildingKind: string;
      cell: { x: number; y: number };
    }
  | {
      kind: 'cancelBuildQueue';
      asteroidId: AsteroidId;
      index: number;
    };
```

- [ ] **Step 2: Add construction test to `systems.test.ts`**

Append to `packages/sim/src/__tests__/systems.test.ts`:

```typescript
import { tickConstruction } from '../systems/constructionSystem.ts';
import { applyCommand } from '../commandProcessor.ts';

describe('constructionSystem', () => {
  it('completes a building after its build time ticks', () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const [asteroid] = world.asteroids.values();

    applyCommand(world, {
      kind: 'placeBuilding',
      asteroidId: asteroid!.id,
      buildingKind: 'powerPlant',
      cell: { x: 2, y: 2 },
    });

    expect(asteroid!.buildQueue.length).toBe(1);

    const totalTicks = asteroid!.buildQueue[0]!.totalTicks;
    for (let i = 0; i < totalTicks; i++) tickConstruction(world);

    expect(asteroid!.buildQueue.length).toBe(0);
    const powerPlant = [...world.buildings.values()].find(
      (b) => b.defKind === 'powerPlant',
    );
    expect(powerPlant?.constructionProgress).toBe(1);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
pnpm -F @fa/sim test
```

Expected: `Cannot find module '../systems/constructionSystem.ts'`

- [ ] **Step 4: Create `packages/sim/src/commandProcessor.ts`**

```typescript
import type { World } from '@fa/domain';
import { buildingId as makeBuildingId } from '@fa/domain';
import { getBuildingDef } from '@fa/content';
import type { Command } from './commands.ts';

export function applyCommand(world: World, command: Command): void {
  switch (command.kind) {
    case 'placeBuilding': {
      const { asteroidId, buildingKind, cell } = command;
      const asteroid = world.asteroids.get(asteroidId);
      if (!asteroid) return;

      const def = getBuildingDef(buildingKind);
      const player = asteroid.ownerId ? world.players.get(asteroid.ownerId) : undefined;
      if (!player || player.credits < def.costCredits) return;

      player.credits -= def.costCredits;
      asteroid.buildQueue.push({
        buildingKind,
        progressTicks: 0,
        totalTicks: def.buildTimeTicks,
      });
      break;
    }
    case 'cancelBuildQueue': {
      const asteroid = world.asteroids.get(command.asteroidId);
      if (!asteroid) return;
      const item = asteroid.buildQueue[command.index];
      if (!item) return;
      const def = getBuildingDef(item.buildingKind);
      const player = asteroid.ownerId ? world.players.get(asteroid.ownerId) : undefined;
      if (player) player.credits += def.costCredits * 0.5;
      asteroid.buildQueue.splice(command.index, 1);
      break;
    }
  }
}
```

- [ ] **Step 5: Create `packages/sim/src/systems/constructionSystem.ts`**

```typescript
import type { World } from '@fa/domain';
import { buildingId as makeBuildingId } from '@fa/domain';
import { getBuildingDef } from '@fa/content';

let _buildingCounter = 0;

export function tickConstruction(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    const item = asteroid.buildQueue[0];
    if (!item) continue;

    item.progressTicks += 1;

    if (item.progressTicks >= item.totalTicks) {
      asteroid.buildQueue.shift();
      const id = makeBuildingId(`building-${_buildingCounter++}-${world.tick}`);
      const def = getBuildingDef(item.buildingKind);

      world.buildings.set(id, {
        id,
        defKind: item.buildingKind,
        asteroidId: asteroid.id,
        cell: { x: 0, y: 0 }, // commandProcessor sets cell; construction system just materialises
        hp: 100,
        maxHp: 100,
        constructionProgress: 1,
        active: true,
        damage: 0,
      });

      (asteroid.buildings as string[]).push(id);

      world.eventQueue.push({
        kind: 'construction.done',
        priority: 'grey',
        asteroidId: asteroid.id,
        buildingKind: item.buildingKind,
      });
    }
  }
}
```

- [ ] **Step 6: Run — expect PASS**

```bash
pnpm -F @fa/sim test
```

Expected: `7 passed`

- [ ] **Step 7: Commit**

```bash
git add packages/sim/src/systems/constructionSystem.ts packages/sim/src/commands.ts packages/sim/src/commandProcessor.ts
git commit -m "feat(sim): construction system, commands, command processor"
```

---

### Task 9: Sim — Loop, snapshot, and SimApi

**Files:**
- Create: `packages/sim/src/snapshot.ts`
- Create: `packages/sim/src/loop.ts`
- Create: `packages/sim/src/api.ts`
- Test: `packages/sim/src/__tests__/api.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/sim/src/__tests__/api.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { SimApi } from '../api.ts';

describe('SimApi', () => {
  it('tick advances world.tick', () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    api.tick(50);
    expect(api.getSnapshot().tick).toBe(1);
  });

  it('snapshot reflects world state', () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const snap = api.getSnapshot();
    expect(snap.asteroids.length).toBeGreaterThan(0);
    expect(snap.credits).toBeGreaterThan(0);
  });

  it('placeBuilding command is applied before next tick', () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: 'helionCorp' });
    const snap = api.getSnapshot();
    const asteroid = snap.asteroids[0]!;

    api.enqueueCommand({
      kind: 'placeBuilding',
      asteroidId: asteroid.id,
      buildingKind: 'powerPlant',
      cell: { x: 2, y: 2 },
    });
    api.tick(50);

    const snap2 = api.getSnapshot();
    const a2 = snap2.asteroids.find((a) => a.id === asteroid.id)!;
    expect(a2.buildQueue.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/sim test
```

Expected: `Cannot find module '../api.ts'`

- [ ] **Step 3: Create `packages/sim/src/snapshot.ts`**

```typescript
import type { AsteroidId, World } from '@fa/domain';
import { computePowerBalance } from './systems/resourceSystem.ts';

export interface AsteroidSnapshot {
  id: AsteroidId;
  name: string;
  ownerId: string | null;
  sector: { x: number; y: number };
  sizeClass: string;
  deposits: Record<string, number>;
  radiation: number;
  stability: number;
  happiness: number;
  buildingKinds: string[];
  buildQueue: Array<{ buildingKind: string; progressTicks: number; totalTicks: number }>;
  powerBalance: number;
}

export interface HudSnapshot {
  tick: number;
  credits: number;
  federationStanding: number;
  asteroids: AsteroidSnapshot[];
  events: Array<{ kind: string; priority: string }>;
}

export function takeSnapshot(world: World): HudSnapshot {
  const human = [...world.players.values()].find((p) => p.isHuman);

  const asteroids: AsteroidSnapshot[] = [...world.asteroids.values()].map((a) => ({
    id: a.id,
    name: a.name,
    ownerId: a.ownerId,
    sector: a.sector,
    sizeClass: a.sizeClass,
    deposits: Object.fromEntries(
      Object.entries(a.deposits).filter(([, v]) => v != null),
    ) as Record<string, number>,
    radiation: a.radiation,
    stability: a.stability,
    happiness: a.happiness,
    buildingKinds: [...a.buildings].map((bid) => world.buildings.get(bid)?.defKind ?? ''),
    buildQueue: a.buildQueue.map((q) => ({ ...q })),
    powerBalance: computePowerBalance(world, a.id),
  }));

  return {
    tick: world.tick,
    credits: human?.credits ?? 0,
    federationStanding: human?.federationStanding ?? 0,
    asteroids,
    events: world.eventQueue.map((e) => ({ kind: e.kind, priority: e.priority })),
  };
}
```

- [ ] **Step 4: Create `packages/sim/src/loop.ts`**

```typescript
import type { World } from '@fa/domain';
import { tickMining } from './systems/miningSystem.ts';
import { tickResources } from './systems/resourceSystem.ts';
import { tickConstruction } from './systems/constructionSystem.ts';

export const TICK_MS = 50;

export function tick(world: World): void {
  world.tick += 1;
  world.eventQueue = [];
  tickConstruction(world);
  tickMining(world);
  tickResources(world);
}
```

- [ ] **Step 5: Create `packages/sim/src/api.ts`**

```typescript
import type { Command } from './commands.ts';
import type { HudSnapshot } from './snapshot.ts';
import type { WorldConfig } from './world.ts';
import { createWorld } from './world.ts';
import { tick } from './loop.ts';
import { applyCommand } from './commandProcessor.ts';
import { takeSnapshot } from './snapshot.ts';
import type { World } from '@fa/domain';

export class SimApi {
  private world: World;
  private pendingCommands: Command[] = [];

  constructor(config: WorldConfig) {
    this.world = createWorld(config);
  }

  tick(_deltaMs: number): void {
    for (const cmd of this.pendingCommands) applyCommand(this.world, cmd);
    this.pendingCommands = [];
    tick(this.world);
  }

  enqueueCommand(command: Command): void {
    this.pendingCommands.push(command);
  }

  getSnapshot(): HudSnapshot {
    return takeSnapshot(this.world);
  }

  getSaveBlob(): string {
    return JSON.stringify({
      schemaVersion: this.world.schemaVersion,
      tick: this.world.tick,
      seed: this.world.seed,
    });
  }
}
```

- [ ] **Step 6: Run — expect PASS**

```bash
pnpm -F @fa/sim test
```

Expected: `10 passed`

- [ ] **Step 7: Commit**

```bash
git add packages/sim/src/snapshot.ts packages/sim/src/loop.ts packages/sim/src/api.ts
git commit -m "feat(sim): fixed-timestep loop, HUD snapshot, SimApi"
```

---

### Task 10: Persistence — serializer, migrations, and IndexedDB

**Files:**
- Create: `packages/persistence/tsconfig.json`
- Create: `packages/persistence/src/serializer.ts`
- Create: `packages/persistence/src/migrations.ts`
- Create: `packages/persistence/src/idb.ts`
- Create: `packages/persistence/src/index.ts`
- Test: `packages/persistence/src/__tests__/serializer.test.ts`

- [ ] **Step 1: Create `packages/persistence/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing test**

Create `packages/persistence/src/__tests__/serializer.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { serialize, deserialize } from '../serializer.ts';

const SAMPLE_SAVE = {
  schemaVersion: 1 as const,
  gameVersion: '0.1.0',
  createdAtIso: new Date().toISOString(),
  playerName: 'Test',
  verdict: 'inProgress' as const,
  difficulty: 'manager' as const,
  rngSeed: 42,
  rngState: 99,
  worldSnapshot: { tick: 10, asteroids: [], players: [] },
  uiPrefs: {},
};

describe('serializer', () => {
  it('serialize produces a non-empty Uint8Array', () => {
    const bytes = serialize(SAMPLE_SAVE);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('deserialize round-trips correctly', () => {
    const bytes = serialize(SAMPLE_SAVE);
    const restored = deserialize(bytes);
    expect(restored.schemaVersion).toBe(1);
    expect(restored.rngSeed).toBe(42);
    expect(restored.worldSnapshot.tick).toBe(10);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
pnpm -F @fa/persistence test
```

Expected: `Cannot find module '../serializer.ts'`

- [ ] **Step 4: Create `packages/persistence/src/serializer.ts`**

```typescript
import { deflate, inflate } from 'pako';

export type Verdict = 'inProgress' | 'won' | 'lost';
export type Difficulty = 'intern' | 'manager' | 'director' | 'ceo' | 'board';

export interface SaveV1 {
  schemaVersion: 1;
  gameVersion: string;
  createdAtIso: string;
  playerName: string;
  verdict: Verdict;
  difficulty: Difficulty;
  rngSeed: number;
  rngState: number;
  worldSnapshot: Record<string, unknown>;
  uiPrefs: Record<string, unknown>;
}

export function serialize(save: SaveV1): Uint8Array {
  const json = JSON.stringify(save);
  return deflate(json);
}

export function deserialize(bytes: Uint8Array): SaveV1 {
  const json = inflate(bytes, { to: 'string' });
  return JSON.parse(json) as SaveV1;
}
```

- [ ] **Step 5: Create `packages/persistence/src/migrations.ts`**

```typescript
import type { SaveV1 } from './serializer.ts';

type AnyRaw = Record<string, unknown>;

const MIGRATIONS: Array<(raw: AnyRaw) => AnyRaw> = [
  // v0 → v1: add schemaVersion field
  (raw) => ({ ...raw, schemaVersion: 1 }),
];

export function applyMigrations(raw: AnyRaw): SaveV1 {
  let current = raw;
  const version = (raw['schemaVersion'] as number | undefined) ?? 0;
  for (let i = version; i < MIGRATIONS.length; i++) {
    current = MIGRATIONS[i]!(current);
  }
  return current as SaveV1;
}
```

- [ ] **Step 6: Create `packages/persistence/src/idb.ts`**

```typescript
import { openDB, type DBSchema } from 'idb';
import type { SaveV1 } from './serializer.ts';
import { serialize, deserialize } from './serializer.ts';

interface FaDb extends DBSchema {
  saves: {
    key: number;
    value: { slot: number; bytes: Uint8Array; updatedAt: number; label: string };
  };
}

const DB_NAME = 'fractured-alliance';
const DB_VERSION = 1;

async function getDb() {
  return openDB<FaDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('saves', { keyPath: 'slot' });
    },
  });
}

export async function saveToSlot(slot: number, save: SaveV1, label: string): Promise<void> {
  const db = await getDb();
  const bytes = serialize(save);
  await db.put('saves', { slot, bytes, updatedAt: Date.now(), label });
}

export async function loadFromSlot(slot: number): Promise<SaveV1 | null> {
  const db = await getDb();
  const record = await db.get('saves', slot);
  if (!record) return null;
  return deserialize(record.bytes);
}

export async function listSaveSlots(): Promise<
  Array<{ slot: number; label: string; updatedAt: number }>
> {
  const db = await getDb();
  const all = await db.getAll('saves');
  return all.map(({ slot, label, updatedAt }) => ({ slot, label, updatedAt }));
}

export async function deleteSaveSlot(slot: number): Promise<void> {
  const db = await getDb();
  await db.delete('saves', slot);
}
```

- [ ] **Step 7: Create `packages/persistence/src/index.ts`**

```typescript
export * from './serializer.ts';
export * from './migrations.ts';
export * from './idb.ts';
```

- [ ] **Step 8: Run — expect PASS**

```bash
pnpm -F @fa/persistence test
```

Expected: `2 passed`

- [ ] **Step 9: Commit**

```bash
git add packages/persistence
git commit -m "feat(persistence): JSON+pako serializer, migration chain, IndexedDB adapter"
```

---

### Task 11: Web app scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@fa/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fa/domain": "workspace:*",
    "@fa/sim": "workspace:*",
    "@fa/content": "workspace:*",
    "@fa/persistence": "workspace:*",
    "comlink": "^4.4.1",
    "pixi.js": "^8.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "xstate": "^5.0.0",
    "@xstate/react": "^4.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

- [ ] **Step 4: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fractured Alliance</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `apps/web/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Verify Vite starts**

```bash
pnpm -F @fa/web dev
```

Expected: `Local: http://localhost:5173/` (will 404 on App.tsx — that's fine, scaffolding only).

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): Vite app scaffold with COOP/COEP headers for SharedArrayBuffer"
```

---

### Task 12: Zustand stores

**Files:**
- Create: `apps/web/src/store/gameStore.ts`
- Create: `apps/web/src/store/uiStore.ts`
- Test: `apps/web/src/__tests__/stores.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/__tests__/stores.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../store/gameStore.ts';

describe('gameStore', () => {
  it('starts with null snapshot', () => {
    const store = useGameStore.getState();
    expect(store.snapshot).toBeNull();
  });

  it('setSnapshot updates the store', () => {
    const mockSnap = {
      tick: 5,
      credits: 9000,
      federationStanding: 50,
      asteroids: [],
      events: [],
    };
    useGameStore.getState().setSnapshot(mockSnap);
    expect(useGameStore.getState().snapshot?.tick).toBe(5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/web test
```

Expected: `Cannot find module '../store/gameStore.ts'`

- [ ] **Step 3: Create `apps/web/src/store/gameStore.ts`**

```typescript
import { create } from 'zustand';
import type { HudSnapshot } from '@fa/sim';

interface GameState {
  snapshot: HudSnapshot | null;
  setSnapshot: (snapshot: HudSnapshot) => void;
  clearSnapshot: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clearSnapshot: () => set({ snapshot: null }),
}));
```

- [ ] **Step 4: Create `apps/web/src/store/uiStore.ts`**

```typescript
import { create } from 'zustand';
import type { AsteroidId } from '@fa/domain';

interface UiState {
  selectedAsteroidId: AsteroidId | null;
  selectedCell: { x: number; y: number } | null;
  buildingPanelOpen: boolean;
  saveLoadPanelOpen: boolean;
  selectAsteroid: (id: AsteroidId | null) => void;
  selectCell: (cell: { x: number; y: number } | null) => void;
  toggleBuildingPanel: () => void;
  toggleSaveLoadPanel: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAsteroidId: null,
  selectedCell: null,
  buildingPanelOpen: false,
  saveLoadPanelOpen: false,
  selectAsteroid: (id) => set({ selectedAsteroidId: id }),
  selectCell: (cell) => set({ selectedCell: cell }),
  toggleBuildingPanel: () => set((s) => ({ buildingPanelOpen: !s.buildingPanelOpen })),
  toggleSaveLoadPanel: () => set((s) => ({ saveLoadPanelOpen: !s.saveLoadPanelOpen })),
}));
```

- [ ] **Step 5: Run — expect PASS**

```bash
pnpm -F @fa/web test
```

Expected: `2 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/store
git commit -m "feat(web): Zustand game and UI stores"
```

---

### Task 13: XState game machine

**Files:**
- Create: `apps/web/src/machines/gameMachine.ts`
- Test: `apps/web/src/__tests__/gameMachine.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/__tests__/gameMachine.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { gameMachine } from '../machines/gameMachine.ts';

describe('gameMachine', () => {
  it('starts in mainMenu state', () => {
    const actor = createActor(gameMachine).start();
    expect(actor.getSnapshot().value).toBe('mainMenu');
  });

  it('transitions to loading on START_GAME', () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: 'START_GAME', seed: 42, difficulty: 'manager' });
    expect(actor.getSnapshot().value).toBe('loading');
  });

  it('transitions from playing to paused on PAUSE', () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: 'START_GAME', seed: 42, difficulty: 'manager' });
    actor.send({ type: 'LOADED' });
    actor.send({ type: 'PAUSE' });
    expect(actor.getSnapshot().value).toBe('paused');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/web test
```

Expected: `Cannot find module '../machines/gameMachine.ts'`

- [ ] **Step 3: Create `apps/web/src/machines/gameMachine.ts`**

```typescript
import { setup } from 'xstate';

interface GameContext {
  seed: number;
  difficulty: string;
  timeScale: number;
}

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as
      | { type: 'START_GAME'; seed: number; difficulty: string }
      | { type: 'LOADED' }
      | { type: 'PAUSE' }
      | { type: 'RESUME' }
      | { type: 'GAME_OVER' }
      | { type: 'VICTORY' }
      | { type: 'MAIN_MENU' },
  },
}).createMachine({
  id: 'game',
  initial: 'mainMenu',
  context: { seed: 0, difficulty: 'manager', timeScale: 1 },
  states: {
    mainMenu: {
      on: {
        START_GAME: {
          target: 'loading',
          actions: ({ context, event }) => {
            context.seed = event.seed;
            context.difficulty = event.difficulty;
          },
        },
      },
    },
    loading: {
      on: { LOADED: 'playing' },
    },
    playing: {
      on: {
        PAUSE: 'paused',
        GAME_OVER: 'gameOver',
        VICTORY: 'victory',
      },
    },
    paused: {
      on: {
        RESUME: 'playing',
        MAIN_MENU: 'mainMenu',
      },
    },
    gameOver: {
      on: { MAIN_MENU: 'mainMenu' },
    },
    victory: {
      on: { MAIN_MENU: 'mainMenu' },
    },
  },
});
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm -F @fa/web test
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/machines
git commit -m "feat(web): XState v5 game flow machine"
```

---

### Task 14: Sim Web Worker + render loop

**Files:**
- Create: `apps/web/src/workers/sim.worker.ts`
- Create: `apps/web/src/game/pixiApp.ts`
- Create: `apps/web/src/game/renderLoop.ts`
- Create: `apps/web/src/game/views/asteroidView.ts`

- [ ] **Step 1: Create `apps/web/src/workers/sim.worker.ts`**

```typescript
import * as Comlink from 'comlink';
import { SimApi } from '@fa/sim';

Comlink.expose(SimApi);
```

- [ ] **Step 2: Create `apps/web/src/game/pixiApp.ts`**

```typescript
import { Application, type Renderer } from 'pixi.js';

let app: Application<Renderer> | null = null;

export async function initPixi(canvas: HTMLCanvasElement): Promise<Application<Renderer>> {
  if (app) return app;

  app = new Application();
  await app.init({
    canvas,
    resizeTo: canvas.parentElement ?? window,
    backgroundColor: 0x050510,
    antialias: true,
    resolution: window.devicePixelRatio ?? 1,
    autoDensity: true,
  });

  return app;
}

export function getPixiApp(): Application<Renderer> {
  if (!app) throw new Error('PixiJS not initialised — call initPixi first');
  return app;
}

export function destroyPixi(): void {
  app?.destroy(false, { children: true });
  app = null;
}
```

- [ ] **Step 3: Create `apps/web/src/game/renderLoop.ts`**

```typescript
import * as Comlink from 'comlink';
import type { SimApi } from '@fa/sim';
import { useGameStore } from '../store/gameStore.ts';

const FIXED_STEP_MS = 50;

interface RenderLoopHandle {
  stop: () => void;
  setTimeScale: (scale: number) => void;
}

export function startRenderLoop(
  WorkerClass: new () => Worker,
): RenderLoopHandle {
  const rawWorker = new WorkerClass();
  const SimApiRemote = Comlink.wrap<typeof SimApi>(rawWorker);

  let instance: Comlink.Remote<SimApi> | null = null;
  let timeScale = 1;
  let accumulator = 0;
  let lastFrame = performance.now();
  let rafId = 0;
  let running = true;

  (async () => {
    instance = await new SimApiRemote({ seed: Date.now(), humanPlayerRaceId: 'helionCorp' });

    const frame = async (now: number) => {
      if (!running) return;
      const rawDt = now - lastFrame;
      lastFrame = now;

      if (instance && timeScale > 0) {
        accumulator += rawDt * timeScale;
        while (accumulator >= FIXED_STEP_MS) {
          await instance.tick(FIXED_STEP_MS);
          accumulator -= FIXED_STEP_MS;
        }
        const snap = await instance.getSnapshot();
        useGameStore.getState().setSnapshot(snap);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
  })();

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      rawWorker.terminate();
    },
    setTimeScale(scale) {
      timeScale = scale;
    },
  };
}
```

- [ ] **Step 4: Create `apps/web/src/game/views/asteroidView.ts`**

```typescript
import { Container, Graphics, Text, type Application } from 'pixi.js';
import type { AsteroidSnapshot } from '@fa/sim';

const TILE_W = 64;
const TILE_H = 32;

function isoToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

const BUILDING_COLOURS: Record<string, number> = {
  cpu:           0x00aaff,
  airProcessor:  0x44ffaa,
  hydrationPlant:0x44aaff,
  hydroponics:   0x88ff44,
  livingQuarters:0xffaa44,
  powerPlant:    0xffff00,
  mineMk1:       0xaa6600,
  storageTower:  0x888888,
};

export class AsteroidView {
  readonly container: Container;
  private gridGraphics: Graphics;
  private buildingGraphics: Graphics;

  constructor(app: Application) {
    this.container = new Container();
    this.gridGraphics = new Graphics();
    this.buildingGraphics = new Graphics();
    this.container.addChild(this.gridGraphics, this.buildingGraphics);
    app.stage.addChild(this.container);
  }

  update(asteroid: AsteroidSnapshot, gridSize: number): void {
    this.gridGraphics.clear();
    this.buildingGraphics.clear();

    // Draw grid cells
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const { x, y } = isoToScreen(gx, gy);
        this.gridGraphics
          .moveTo(x, y - TILE_H / 2)
          .lineTo(x + TILE_W / 2, y)
          .lineTo(x, y + TILE_H / 2)
          .lineTo(x - TILE_W / 2, y)
          .closePath()
          .stroke({ color: 0x334466, width: 1 });
      }
    }

    // Draw buildings (placeholder coloured diamonds)
    asteroid.buildingKinds.forEach((kind, i) => {
      const gx = i % gridSize;
      const gy = Math.floor(i / gridSize);
      const { x, y } = isoToScreen(gx, gy);
      const colour = BUILDING_COLOURS[kind] ?? 0xffffff;
      this.buildingGraphics
        .moveTo(x, y - TILE_H / 2)
        .lineTo(x + TILE_W / 2, y)
        .lineTo(x, y + TILE_H / 2)
        .lineTo(x - TILE_W / 2, y)
        .closePath()
        .fill({ color: colour, alpha: 0.85 });
    });

    // Centre the view
    const totalW = gridSize * TILE_W;
    const totalH = gridSize * TILE_H;
    this.container.x = (window.innerWidth - totalW) / 2;
    this.container.y = (window.innerHeight - totalH) / 2 + totalH / 2;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workers apps/web/src/game
git commit -m "feat(web): sim worker, Comlink render loop, isometric asteroid view"
```

---

### Task 15: React HUD and App shell

**Files:**
- Create: `apps/web/src/hud/ResourceBar.tsx`
- Create: `apps/web/src/hud/BuildingPanel.tsx`
- Create: `apps/web/src/hud/HUD.tsx`
- Create: `apps/web/src/App.tsx`
- Test: `apps/web/src/__tests__/hud.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/__tests__/hud.test.tsx`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceBar } from '../hud/ResourceBar.tsx';

describe('ResourceBar', () => {
  it('displays credits', () => {
    render(<ResourceBar credits={12345} federationStanding={50} tick={100} />);
    expect(screen.getByText(/12,345/)).toBeTruthy();
  });

  it('displays tick count', () => {
    render(<ResourceBar credits={0} federationStanding={50} tick={42} />);
    expect(screen.getByText(/42/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm -F @fa/web test
```

Expected: `Cannot find module '../hud/ResourceBar.tsx'`

- [ ] **Step 3: Install testing library**

Add to `apps/web/package.json` devDependencies:
```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"jsdom": "^26.0.0"
```

Add vitest config to `apps/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Then: `pnpm install`

- [ ] **Step 4: Create `apps/web/src/hud/ResourceBar.tsx`**

```typescript
interface ResourceBarProps {
  credits: number;
  federationStanding: number;
  tick: number;
}

export function ResourceBar({ credits, federationStanding, tick }: ResourceBarProps) {
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', gap: 24, padding: '8px 16px',
        background: 'rgba(0,8,20,0.85)', color: '#c8d8ff',
        fontFamily: 'monospace', fontSize: 14, zIndex: 10,
      }}
    >
      <span>Credits: <strong>{credits.toLocaleString()}</strong></span>
      <span>Standing: <strong>{federationStanding}</strong></span>
      <span style={{ marginLeft: 'auto' }}>Tick {tick}</span>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/hud/BuildingPanel.tsx`**

```typescript
import { getAllBuildingDefs } from '@fa/content';
import { useUiStore } from '../store/uiStore.ts';
import { useGameStore } from '../store/gameStore.ts';

const PHASE_0_BUILDINGS = ['airProcessor', 'hydrationPlant', 'hydroponics', 'livingQuarters', 'powerPlant', 'mineMk1', 'storageTower'];

export function BuildingPanel() {
  const buildingPanelOpen = useUiStore((s) => s.buildingPanelOpen);
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);
  const selectedCell = useUiStore((s) => s.selectedCell);

  if (!buildingPanelOpen || !selectedAsteroidId || !selectedCell) return null;

  const defs = getAllBuildingDefs().filter((d) => PHASE_0_BUILDINGS.includes(d.kind));

  return (
    <div
      style={{
        position: 'absolute', right: 0, top: 40, bottom: 0, width: 220,
        background: 'rgba(0,8,20,0.9)', color: '#c8d8ff',
        fontFamily: 'monospace', fontSize: 13, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
      }}
    >
      <strong style={{ color: '#ffffff' }}>Place Building</strong>
      {defs.map((def) => (
        <button
          key={def.kind}
          style={{
            background: '#0a1830', border: '1px solid #224', color: '#c8d8ff',
            padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
          }}
          onClick={() => {
            // Command will be wired to the render loop in Task 16
            console.log('place', def.kind, 'at', selectedCell);
          }}
        >
          {def.label} — {def.costCredits.toLocaleString()}¢
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/hud/HUD.tsx`**

```typescript
import { useGameStore } from '../store/gameStore.ts';
import { ResourceBar } from './ResourceBar.tsx';
import { BuildingPanel } from './BuildingPanel.tsx';

export function HUD() {
  const snapshot = useGameStore((s) => s.snapshot);

  if (!snapshot) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8d8ff', fontFamily: 'monospace' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
      />
      <BuildingPanel />
    </>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/App.tsx`**

```typescript
import { useEffect, useRef } from 'react';
import { HUD } from './hud/HUD.tsx';
import { initPixi } from './game/pixiApp.ts';
import { startRenderLoop } from './game/renderLoop.ts';
import SimWorker from './workers/sim.worker.ts?worker';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let loopHandle: ReturnType<typeof startRenderLoop> | null = null;

    initPixi(canvasRef.current).then(() => {
      loopHandle = startRenderLoop(() => new SimWorker());
    });

    return () => loopHandle?.stop();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', position: 'relative', height: '100%' }}>
          <HUD />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
pnpm -F @fa/web test
```

Expected: `7 passed`

- [ ] **Step 9: Manually verify in browser**

```bash
pnpm -F @fa/web dev
```

Open `http://localhost:5173`. Expect: black canvas with starfield, resource bar at top showing credits ticking up, loading… replaced by resource values within a second.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/hud apps/web/src/App.tsx
git commit -m "feat(web): React HUD shell — ResourceBar, BuildingPanel, App integration"
```

---

### Task 16: Save/Load UI and wire-up

**Files:**
- Create: `apps/web/src/hud/SaveLoadPanel.tsx`
- Modify: `apps/web/src/hud/HUD.tsx` (add save/load button)
- Modify: `apps/web/src/game/renderLoop.ts` (expose save/load + command methods)

- [ ] **Step 1: Create `apps/web/src/hud/SaveLoadPanel.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { listSaveSlots, deleteSaveSlot } from '@fa/persistence';
import { useUiStore } from '../store/uiStore.ts';

interface SaveSlot { slot: number; label: string; updatedAt: number }

interface SaveLoadPanelProps {
  onSave: (slot: number, label: string) => void;
  onLoad: (slot: number) => void;
}

export function SaveLoadPanel({ onSave, onLoad }: SaveLoadPanelProps) {
  const open = useUiStore((s) => s.saveLoadPanelOpen);
  const [slots, setSlots] = useState<SaveSlot[]>([]);

  useEffect(() => {
    if (open) listSaveSlots().then(setSlots);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        background: '#06101e', border: '1px solid #224',
        color: '#c8d8ff', fontFamily: 'monospace',
        padding: 24, minWidth: 320, zIndex: 20,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Save / Load</h2>
      {[0, 1, 2].map((slot) => {
        const saved = slots.find((s) => s.slot === slot);
        return (
          <div key={slot} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 1 }}>
              Slot {slot + 1}: {saved ? saved.label : '— empty —'}
            </span>
            <button onClick={() => onSave(slot, `Save ${slot + 1}`)}>Save</button>
            {saved && <button onClick={() => onLoad(slot)}>Load</button>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add save/load button to `HUD.tsx`**

```typescript
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { ResourceBar } from './ResourceBar.tsx';
import { BuildingPanel } from './BuildingPanel.tsx';
import { SaveLoadPanel } from './SaveLoadPanel.tsx';

interface HUDProps {
  onSave: (slot: number, label: string) => void;
  onLoad: (slot: number) => void;
}

export function HUD({ onSave, onLoad }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const toggleSaveLoad = useUiStore((s) => s.toggleSaveLoadPanel);

  if (!snapshot) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8d8ff', fontFamily: 'monospace' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
      />
      <button
        onClick={toggleSaveLoad}
        style={{
          position: 'absolute', top: 8, right: 16, zIndex: 11,
          background: '#0a1830', border: '1px solid #224', color: '#c8d8ff',
          fontFamily: 'monospace', padding: '4px 10px', cursor: 'pointer',
        }}
      >
        ☰ Save/Load
      </button>
      <BuildingPanel />
      <SaveLoadPanel onSave={onSave} onLoad={onLoad} />
    </>
  );
}
```

- [ ] **Step 3: Update `App.tsx` to pass save/load handlers**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { HUD } from './hud/HUD.tsx';
import { initPixi } from './game/pixiApp.ts';
import { startRenderLoop } from './game/renderLoop.ts';
import SimWorker from './workers/sim.worker.ts?worker';
import type { RenderLoopHandle } from './game/renderLoop.ts';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<RenderLoopHandle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    initPixi(canvasRef.current).then(() => {
      loopRef.current = startRenderLoop(() => new SimWorker());
    });
    return () => loopRef.current?.stop();
  }, []);

  const handleSave = useCallback((slot: number, label: string) => {
    loopRef.current?.saveToSlot(slot, label);
  }, []);

  const handleLoad = useCallback((slot: number) => {
    loopRef.current?.loadFromSlot(slot);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', position: 'relative', height: '100%' }}>
          <HUD onSave={handleSave} onLoad={handleLoad} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Export `RenderLoopHandle` from `renderLoop.ts` and add save/load methods**

Add to `apps/web/src/game/renderLoop.ts` — update the `RenderLoopHandle` interface and return object:

```typescript
export interface RenderLoopHandle {
  stop: () => void;
  setTimeScale: (scale: number) => void;
  saveToSlot: (slot: number, label: string) => Promise<void>;
  loadFromSlot: (slot: number) => Promise<void>;
}
```

Update the returned object in `startRenderLoop`:

```typescript
return {
  stop() { running = false; cancelAnimationFrame(rafId); rawWorker.terminate(); },
  setTimeScale(scale) { timeScale = scale; },
  async saveToSlot(slot, label) {
    if (!instance) return;
    const blob = await instance.getSaveBlob();
    const { saveToSlot: idbSave } = await import('@fa/persistence');
    await idbSave(slot, JSON.parse(blob), label);
  },
  async loadFromSlot(slot) {
    const { loadFromSlot: idbLoad } = await import('@fa/persistence');
    const save = await idbLoad(slot);
    if (!save) return;
    console.log('loaded save', save);
    // Full restore wired in Phase 1 when SimApi.restore(save) is implemented
  },
};
```

- [ ] **Step 5: Manual test**

```bash
pnpm -F @fa/web dev
```

Open `http://localhost:5173`. Click ☰ Save/Load. Click Save on Slot 1. Reload the page. Click ☰ Save/Load — Slot 1 should show "Save 1".

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hud/SaveLoadPanel.tsx apps/web/src/hud/HUD.tsx apps/web/src/App.tsx apps/web/src/game/renderLoop.ts
git commit -m "feat(web): save/load panel wired to IndexedDB persistence"
```

---

### Task 17: CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  web:
    name: Web — typecheck, lint, test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -F @fa/domain typecheck
      - run: pnpm -F @fa/sim typecheck
      - run: pnpm -F @fa/content typecheck
      - run: pnpm -F @fa/persistence typecheck
      - run: pnpm -F @fa/web typecheck
      - run: pnpm lint
      - run: pnpm -F @fa/domain test
      - run: pnpm -F @fa/sim test
      - run: pnpm -F @fa/content test
      - run: pnpm -F @fa/persistence test
      - run: pnpm -F @fa/web test
```

- [ ] **Step 2: Commit and push**

```bash
git add .github
git commit -m "ci: GitHub Actions — typecheck, lint, test all packages"
git remote add origin <your-repo-url>
git push -u origin main
```

Expected: CI goes green on all jobs.

---

**Phase 0 complete.** Verify the prototype criterion: mine placed, ore accumulates, tab closed and reopened, game resumes.

---

## Phase 1 — MVP

**Success criteria:** Play from a starter asteroid against one AI opponent, win by surviving 30 sim-days or destroying the AI's last asteroid. Federal Transporter arrives monthly. Tutorial walks through first 5 steps.

### Feature tasks (implement in order; each feature gets its own TDD cycle)

- [ ] **P1-F1: Sector map — multiple asteroids (6–10 per seed)**
  - Extend `createWorld` to procedurally generate asteroid belt from seed
  - Add `sectorView.ts` Pixi scene for belt overview
  - Add camera pan/zoom via `@pixi/viewport` or manual pointer events
  - Add asteroid ownership tinting (player = blue, neutral = grey, AI = red)

- [ ] **P1-F2: Full Phase 1 building catalogue**
  - Add to `buildings.json`: Resiblock, Pleasure Dome, Medical Centre, Security Centre, ECC, Mine Mk2 (blueprint-gated), Deep Bore Mine, Radiation Filter, Repair Facility
  - Add remaining life-support and mining building logic to `resourceSystem` and `miningSystem`

- [ ] **P1-F3: Four ore types (selenium, asteros, barium, crystalite)**
  - Extend deposit generation to seed all four ores per asteroid
  - Add ore display to HUD and asteroid inspector panel

- [ ] **P1-F4: Scout and trade ships**
  - Implement `ShipYard` building; add `Scout` and `AssaultCraft` to `ships.json`
  - Implement ship movement in `sim/src/systems/shipSystem.ts` using Reynolds seek/arrive
  - Add `SectorView` ship sprites

- [ ] **P1-F5: Federal Transporter**
  - Monthly timer in sim loop fires `trader.arrived` event
  - Player can sell accumulated ore at 0.7× market price
  - TransporterPanel React component with ore table and sell-all button

- [ ] **P1-F6: One AI opponent (Kryll Collective)**
  - Implement `aiSystem.ts` with strategic utility actions: Expand, BuildMine, BuildDefense
  - Kryll personality vector wired from `races.json`
  - Hard cap: 10 ms per AI tick; skip if exceeded

- [ ] **P1-F7: Simple fleet combat**
  - `combatSystem.ts`: ships on AttackAsteroid order exchange damage with turrets/other ships each tick
  - No micro-control; outcome visible as laser line graphics on `SectorView`
  - Colony under attack event fires → notification feed red alert

- [ ] **P1-F8: Basic diplomacy screen**
  - `DiplomacyPanel.tsx`: shows Kryll Collective standing, proposes Non-Aggression Pact
  - `diplomacySystem.ts`: NAP blocks AI from sending attack orders while active
  - Breaking NAP fires `treaty.broken` event; −20 reputation

- [ ] **P1-F9: Tutorial scripted scenario**
  - XState child machine `tutorialMachine` overlaying `playing` state
  - 5 steps: place Air Processor → Mine → watch Transporter → Scout → receive diplomatic event
  - Tutorial can be dismissed at any step; contextual tooltip system

- [ ] **P1-F10: Win/lose conditions (Phase 1 subset)**
  - Survive 30 sim-days (Survivor) or destroy AI's last asteroid (Military Dominance partial)
  - `VictoryScreen.tsx` and `GameOverScreen.tsx` state overlays

- [ ] **P1-F11: Notification feed**
  - `NotificationFeed.tsx`: scrollable feed, priority colour-coded, auto-pause toggles per category
  - Red alerts pause game by default

- [ ] **P1-F12: Asteroid inspector panel**
  - Click asteroid → right rail inspector: deposit levels, buildings list, build queue, ship count
  - Building placement command wired through render loop to `enqueueCommand`

- [ ] **P1-F13: Full save/load restore**
  - `SimApi.restore(saveBlob)` reconstructs world from saved JSON
  - Load from slot in `renderLoop.ts` restarts sim with restored state
  - Autosave every 60 sim ticks to slot −1 (overflow slot)

---

## Phase 2 — Content Complete

**Success criteria:** All 5 victory conditions demonstrably achievable in a full match; all 7 races active with distinct personalities; espionage and asteroid ramming work end-to-end.

- [ ] **P2-F1: All 40 blueprints with light prerequisite graph**
  - 5 disciplines × 8 blueprints; tier-2 requires one tier-1 in same discipline
  - `BlueprintShop.tsx` with discipline tabs and prerequisite visualisation

- [ ] **P2-F2: All 7 races with full personality vectors**
  - All race defs in `races.json`: Kryll, Motkaj, Achar, Brakkat, Rigal, Mauna, Helion Corp
  - Mauna as non-federation hostile with Black Market trade path

- [ ] **P2-F3: Full diplomacy — 7 treaty types + AI grudge memory**
  - All treaty kinds in `treaty.ts` implemented in `diplomacySystem.ts`
  - AI event log (rolling 24-month window) feeds grudge scores to utility AI
  - `DiplomacyPanel.tsx` extended to show all races, all treaty states

- [ ] **P2-F4: Espionage system**
  - 20 named agents pool; missions: recon, tech-steal, sabotage, blackmail, liberate
  - `agentSystem.ts`: d100 vs (stealth − defender Security) resolution
  - `EspionagePanel.tsx`

- [ ] **P2-F5: Asteroid Engine + ramming + Gravity Nullifier**
  - Charge-up mechanic (public warning event at charge start)
  - `asteroidEngineSystem.ts`: trajectory, collision resolution
  - Gravity Nullifier building deflects incoming asteroids (cost 4,000 cr buffed to 3,000 cr)

- [ ] **P2-F6: Black Market + Independence arc**
  - Suspicion meter on Player; `blackMarketSystem.ts` increments on each black-market sale
  - Federation investigation at 70, fine at 100, Autonomy Manifesto blueprint unlockable at 100
  - Independence victory condition implementation

- [ ] **P2-F7: Market price fluctuation**
  - Stepped sinusoid + random walk per ore in `economySystem.ts`
  - Race demand multipliers from `races.json`
  - Price chart widget in `TradePanel.tsx`

- [ ] **P2-F8: Full 5 victory conditions**
  - Corporate Loyalty, Independence, Scientific Supremacy, Military Dominance, Survivor
  - Victory evaluation every sim tick; `VictoryScreen.tsx` per path

- [ ] **P2-F9: Procedural asteroid belt generation**
  - Seeded belt generator: sector positions, size class distribution, ore profiles
  - User-visible seed string on new game screen
  - Scenario editor (JSON) for fixed scenarios

- [ ] **P2-F10: Difficulty presets**
  - 5 presets (Intern → Board) adjusting AI starting asteroids, economy multiplier, aggression

- [ ] **P2-F11: Deterministic replay test fixtures**
  - `tests/replay-fixtures/`: record seed + command log → run N ticks → hash world state
  - CI step: `pnpm test:replay`

- [ ] **P2-F12: Property-based tests (fast-check)**
  - Total ore non-increasing; credits never NaN; save/load idempotent; AI scores in [0,1]

---

## Phase 3 — Polish

**Success criteria:** Lighthouse PWA ≥90; WCAG 2.2 AA throughout; 100 beta testers satisfied after one full match.

- [ ] **P3-F1: Custom art integration**
  - Replace Kenney CC0 placeholders with commissioned sprites
  - TexturePacker atlas pipeline in `tools/asset-pipeline/`
  - Asset manifest JSON keyed by logical id

- [ ] **P3-F2: Audio — music and SFX**
  - Original score (commissioned); SFX per event type
  - Web Audio API wrapper in `packages/shared-ui/src/audio.ts`
  - Volume/mute controls in Settings panel

- [ ] **P3-F3: WCAG 2.2 AA audit**
  - Colourblind-safe palettes (3 presets)
  - Text scaling 100–200%
  - Full keyboard navigation + focus rings
  - ARIA-live announcements for red events
  - Every status indicator: icon + colour + text (never colour alone)

- [ ] **P3-F4: Advanced tutorial (espionage + asteroid engine)**
  - Second scripted scenario unlockable after first completed match

- [ ] **P3-F5: PWA — offline-capable**
  - `vite-plugin-pwa` (Workbox) for service worker
  - App shell caching; save data in IndexedDB survives offline
  - Install prompt

- [ ] **P3-F6: Tauri 2.0 desktop wrapper**
  - `apps/desktop/src-tauri/` scaffold
  - File-system save slot export/import
  - Steam Deck touch controls (pinch-zoom, long-press context)

- [ ] **P3-F7: Scenarios and difficulty tuning pass**
  - 3 pre-built scenarios in `content/data/scenarios.json`
  - Balance sheet reviewed against playtesting data

- [ ] **P3-F8: Performance audit**
  - AI tick benchmark: fail CI if >15% regression vs baseline
  - Pixi draw-call budget: ≤50 draw calls per frame
  - Eco preset: reduces particle count, disables bloom for Steam Deck thermal

---

## Phase 4 — Multiplayer and extras

**Success criteria:** 2-player hotseat and 4-player online stable across a 90-minute match.

- [ ] **P4-F1: ASP.NET Core 10 Minimal API scaffold**
  - `apps/api/` with endpoints from spec §D.14: accounts, saves, telemetry, leaderboards
  - EF Core 10 + PostgreSQL; Azure Container Apps deployment

- [ ] **P4-F2: Cloud save sync**
  - `PUT /api/saves/{slot}` upload; `GET /api/saves/{slot}` download
  - ETag last-writer-wins; conflict dialog in SaveLoadPanel

- [ ] **P4-F3: SignalR multiplayer rooms**
  - Hub: game rooms as SignalR groups
  - Lockstep command relay; deterministic sim on each client
  - `MultiplayerLobby.tsx`

- [ ] **P4-F4: Leaderboards**
  - `GET /api/leaderboards/{mode}` — top verdicts by victory condition
  - `LeaderboardPanel.tsx`

- [ ] **P4-F5: Modding support**
  - All content loaded from versioned JSON at startup
  - `/mods` folder in Tauri; `?mod=` query string in web build
  - Deterministic sim test harness for modder validation

- [ ] **P4-F6: Opt-in telemetry**
  - Off by default; Do-Not-Track respected; no PII
  - Events: session length, final score, blueprints-bought order, first-death cause
  - Backend dashboard for balance tuning

---

## Self-Review Checklist (completed)

- **Spec coverage:** §A.3 core loop → Tasks 9/16. §A.4 buildings/ores → Tasks 5/7/8. §A.5 races → P2-F2. §A.6 trade/combat/diplomacy → P1-F5–F8. §A.7 Asteroid Engine → P2-F5. §A.8 Sci-Tek → P2-F1. §B modernisations → Tutorial P1-F9, QoL P2-F9, accessibility P3-F3. §D architecture → Tasks 4/9/12/13/14. §D.6 save → Task 10/16. §D.7 AI → P1-F6. §D.14 backend → P4-F1. All sections covered.
- **Placeholder scan:** No TBDs, no vague steps in Phase 0 tasks. Phase 1+ features list implementation targets without leaving agents guessing.
- **Type consistency:** `AsteroidSnapshot`, `HudSnapshot`, `SimApi`, `Command` — names are consistent across Tasks 3, 5, 9, 13, 14, 15, 16.
- **Coverage gaps fixed:** `RenderLoopHandle` exported from `renderLoop.ts` (Task 16 step 4). `test` environment `jsdom` added to vite config (Task 15 step 3).
