---
title: Fractured Alliance — Implementation Design
date: 2026-04-18
status: approved
---

# Fractured Alliance — Implementation Design

Full game spec lives at `docs/gamespec.md`. This document captures the confirmed implementation decisions made during the brainstorming session and serves as the entry point for the implementation plan.

## Confirmed Decisions

### Scope
- Full end-to-end implementation across all 5 phases (Phase 0 → Phase 4)
- Linear phase-by-phase plan; phases 0 and 1 task-granular, phases 2–4 feature-granular
- Backend (.NET 10 Minimal API) deferred — placeholder scaffold only until Phase 1+

### Stack
| Concern | Choice |
|---|---|
| Package manager / monorepo | pnpm workspaces |
| Bundler | Vite 6 |
| Language | TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| UI framework | React 19 |
| Game renderer | PixiJS v8 (from day one — no Phaser fallback) |
| UI state | Zustand 5 |
| Flow state | XState v5 |
| Lint / format | Biome 2 |
| Testing | Vitest + Playwright + fast-check |
| PWA | vite-plugin-pwa (Workbox) |
| Worker bridge | Comlink |

### Architecture
- Sim runs in a **Web Worker** at 20 Hz fixed timestep; deterministic; seeded `mulberry32` PRNG
- **Comlink RPC** bridges worker ↔ main thread
- **Zustand 5** holds read-only HUD snapshots published from the worker
- **SharedArrayBuffer** for hot ship-position paths (requires `COOP: same-origin` + `COEP: require-corp`)
- **PixiJS RAF loop** reads worker state; React DOM sits above canvas for all HUD/menus
- **XState v5** machine: `mainMenu → loading → playing → paused → combat → gameOver → victory`
- Domain model is pure TypeScript (`Map<BrandedId, T>`) — knows nothing about Pixi or React

### Monorepo Layout
```
belt-baron/
├── apps/
│   ├── web/          # Vite + React + PixiJS
│   └── api/          # ASP.NET Core 10 (empty placeholder until Phase 1+)
├── packages/
│   ├── domain/       # Pure TS types, branded IDs, entity interfaces
│   ├── sim/          # World, systems, fixed-timestep loop (runs in worker)
│   ├── ai/           # Utility AI + mistreevous behavior trees
│   ├── content/      # JSON data: buildings, races, blueprints, scenarios
│   ├── persistence/  # Save serialisation, idb adapter, migrations
│   └── shared-ui/    # React primitives, design tokens
├── tools/
│   ├── balance-sim/  # Headless match runner
│   └── asset-pipeline/
├── tests/
│   ├── replay-fixtures/
│   └── e2e/
└── docs/
```

### Phase Roadmap
| Phase | Scope | Success Criteria | Est. Weeks |
|---|---|---|---|
| **0 — Prototype** | Single asteroid · 3 buildings (Air, Mine, Storage) · 1 ore · fixed-timestep worker loop · Pixi grid · Zustand · save/load IndexedDB | Click to place a mine; watch ore accumulate; close tab, reopen, resume | 2–3 |
| **1 — MVP** | Multi-asteroid sector (6–10) · all life-support/power/mining buildings · 4 ore types · scout/trade ships · 1 AI opponent · simple combat · Federal Transporter · tutorial pass · basic diplomacy screen | Survive 30 sim-days or destroy AI's last asteroid | 6–8 |
| **2 — Content Complete** | All 40 blueprints · all 7 races + personalities · full diplomacy (7 treaty types + AI memory) · espionage · Asteroid Engine + ramming + Gravity Nullifier · Black Market + Independence arc · 5 victory conditions | All 5 victories demonstrably achievable end-to-end | 10–14 |
| **3 — Polish** | Commissioned art + audio · WCAG 2.2 AA · difficulty tuning · scenarios · PWA · Tauri 2.0 desktop | Lighthouse ≥90 PWA · WCAG AA · 100 beta testers satisfied | 8–12 |
| **4 — Multiplayer** | ASP.NET SignalR MP · cloud sync GA · leaderboards · modding docs · Steam page | 2-player hotseat + 4-player online stable | 10–16 |

## Key Invariants to Preserve
1. The sim package must never import from React, Pixi, or any browser-rendering API.
2. All stochastic decisions flow through named sub-generators reseeded from the master seed.
3. Saving then loading must be idempotent (property-based tested).
4. AI compute is hard-capped at 10 ms per player per tick.
5. Every icon, status indicator, and alert uses icon + colour + text (never colour alone).
