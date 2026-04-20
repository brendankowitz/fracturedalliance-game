import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { AsteroidInspector } from "../hud/AsteroidInspector";
import { useUiStore } from "../store/uiStore";
import { useGameStore } from "../store/gameStore";
import type { HudSnapshot } from "@fa/sim";

function makeSnapshot(): HudSnapshot {
  return {
    tick: 1, seed: 1, difficulty: "manager", credits: 10000,
    federationStanding: 50, suspicion: 0, humanPlayerId: "p1",
    traderActive: false, oreInventory: {}, blueprintsOwned: [],
    players: [{ id: "p1", raceId: "helionCorp", isHuman: true, alive: true, credits: 10000 }],
    asteroids: [{
      id: "ast1" as any, name: "Home", ownerId: "p1",
      sector: { x: 0, y: 0 }, sizeClass: "M", deposits: {},
      radiation: 0, stability: 100, happiness: 0.8,
      buildingKinds: [], buildingsGrid: [], buildQueue: [],
      powerBalance: 0,
      engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    }],
    ships: [], events: [], marketPrices: {}, combatFlashes: [],
    diplomacy: [], gameEndState: null, agents: [],
  } as HudSnapshot;
}

describe("AsteroidInspector auto-hire", () => {
  it("shows auto-hire checkbox for owned asteroid", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ selectedAsteroidId: "ast1" as any });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByLabelText(/auto-hire workers/i)).toBeInTheDocument();
  });

  it("shows slider when checkbox enabled", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ selectedAsteroidId: "ast1" as any, autoHireBudgets: { ast1: 2000 } });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
