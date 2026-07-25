import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { asteroidId, playerId } from "@fa/domain";
import type { HudSnapshot } from "@fa/sim";
import { describe, expect, it } from "vitest";
import { AsteroidInspector } from "../hud/AsteroidInspector.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { makeTestAsteroid, makeTestSnapshot } from "./testSnapshot.ts";

const ASTEROID_ID = asteroidId("ast1");
const PLAYER_ID = playerId("p1");

function makeSnapshot(): HudSnapshot {
  return makeTestSnapshot({
    tick: 1,
    federationStanding: 50,
    humanPlayerId: PLAYER_ID,
    credits: 10000,
    players: [{ id: PLAYER_ID, raceId: "helionCorp", isHuman: true, alive: true, credits: 10000 }],
    asteroids: [
      makeTestAsteroid({
        id: ASTEROID_ID,
        name: "Home",
        ownerId: PLAYER_ID,
        sizeClass: "M",
        stability: 100,
        happiness: 0.8,
      }),
    ],
  });
}

describe("AsteroidInspector auto-hire", () => {
  it("shows auto-hire checkbox for owned asteroid", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByLabelText(/auto-hire workers/i)).toBeInTheDocument();
  });

  it("shows slider when checkbox enabled", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID, autoHireBudgets: { ast1: 2000 } });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
