import type { HudSnapshot } from "@fa/sim";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HUD } from "../hud/HUD.tsx";
import { ResourceBar } from "../hud/ResourceBar.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

describe("ResourceBar", () => {
  it("displays credits", () => {
    render(
      <ResourceBar
        credits={12345}
        federationStanding={50}
        date="25-05-2496"
        day={0}
        seed={42183}
        difficulty="manager"
      />,
    );
    expect(screen.getByText(/12,345/)).toBeTruthy();
  });

  it("displays the in-fiction calendar date", () => {
    render(
      <ResourceBar
        credits={0}
        federationStanding={50}
        date="04-06-2496"
        day={10}
        seed={99}
        difficulty="manager"
      />,
    );
    expect(screen.getByText("04-06-2496")).toBeTruthy();
    expect(screen.getByText(/DAY 10/)).toBeTruthy();
  });

  it("displays seed", () => {
    render(
      <ResourceBar
        credits={0}
        federationStanding={50}
        date="25-05-2496"
        day={0}
        seed={42183}
        difficulty="director"
      />,
    );
    expect(screen.getByText(/42183/)).toBeTruthy();
  });
});

const mockSnap: HudSnapshot = {
  tick: 1,
  day: 0,
  date: "25-05-2496",
  seed: 42,
  credits: 0,
  federationStanding: 50,
  suspicion: 0,
  humanPlayerId: "player-human",
  traderActive: false,
  oreInventory: {},
  players: [],
  asteroids: [],
  ships: [],
  events: [],
  marketPrices: {},
  combatFlashes: [],
  diplomacy: [],
  gameEndState: null,
  blueprintsOwned: [],
  agents: [],
  difficulty: "manager",
};

describe("HUD slowSimMode", () => {
  it("shows END TURN button when slowSimMode is true", () => {
    useGameStore.getState().setSnapshot(mockSnap);
    useUiStore.setState({ slowSimMode: true });
    render(<HUD onSave={async () => {}} onLoad={() => {}} onCommand={() => {}} />);
    expect(screen.getByText("END TURN")).toBeTruthy();
  });

  it("does not show END TURN button when slowSimMode is false", () => {
    useGameStore.getState().setSnapshot(mockSnap);
    useUiStore.setState({ slowSimMode: false });
    render(<HUD onSave={async () => {}} onLoad={() => {}} onCommand={() => {}} />);
    expect(screen.queryByText("END TURN")).toBeNull();
  });
});
