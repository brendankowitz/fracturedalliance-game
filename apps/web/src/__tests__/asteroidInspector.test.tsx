import { asteroidId, playerId, shipId } from "@fa/domain";
import type { AsteroidSnapshot, HudSnapshot } from "@fa/sim";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AsteroidInspector } from "../hud/AsteroidInspector.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { makeTestAsteroid, makeTestSnapshot } from "./testSnapshot.ts";

const ASTEROID_ID = asteroidId("a1");
const SHIP_ID = shipId("s1");
const PLAYER_ID = playerId("p1");

function makeSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return makeTestSnapshot(overrides);
}

function makeAsteroid(overrides: Partial<AsteroidSnapshot> = {}): AsteroidSnapshot {
  return makeTestAsteroid({ id: ASTEROID_ID, ...overrides });
}

afterEach(() => {
  useUiStore.setState({ selectedAsteroidId: null });
  useGameStore.setState({ snapshot: null });
});

describe("AsteroidInspector", () => {
  it("renders nothing when no asteroid is selected", () => {
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [makeAsteroid()] }) });
    const { container } = render(<AsteroidInspector onCommand={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the asteroid name when selected", () => {
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [makeAsteroid()] }) });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText("Vega Prime")).toBeTruthy();
  });

  it("shows Unclaimed when asteroid has no owner", () => {
    useGameStore.setState({
      snapshot: makeSnapshot({ asteroids: [makeAsteroid({ ownerId: null })] }),
    });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText(/Unclaimed/)).toBeTruthy();
  });

  it("shows non-zero deposits and hides zero-quantity deposits", () => {
    const asteroid = makeAsteroid({ deposits: { iron: 500, carbon: 0, titanium: 300 } });
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [asteroid] }) });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText("500")).toBeTruthy();
    expect(screen.getByText("300")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows build queue item with percentage text", () => {
    const asteroid = makeAsteroid({
      buildQueue: [
        { buildingKind: "airProcessor", progressTicks: 50, totalTicks: 100, queuedAt: 0 },
      ],
    });
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [asteroid] }) });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("shows Ships at location: 0 when no ships are nearby", () => {
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [makeAsteroid()], ships: [] }) });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText(/Ships at location: 0/)).toBeTruthy();
  });

  it("shows Ships at location: 1 when a ship is at the asteroid sector", () => {
    const asteroid = makeAsteroid({ sector: { x: 2, y: 3 } });
    const ship = {
      id: SHIP_ID,
      defKind: "scout",
      ownerId: PLAYER_ID,
      position: { x: 2, y: 3 },
      orderKind: "idle",
    };
    useGameStore.setState({ snapshot: makeSnapshot({ asteroids: [asteroid], ships: [ship] }) });
    useUiStore.setState({ selectedAsteroidId: ASTEROID_ID });
    render(<AsteroidInspector onCommand={() => {}} />);
    expect(screen.getByText(/Ships at location: 1/)).toBeTruthy();
  });
});
