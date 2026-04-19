import { fireEvent, render, screen } from "@testing-library/react";
import type { HudSnapshot } from "@fa/sim";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlueprintShop } from "../hud/BlueprintShop.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

function makeSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return {
    tick: 0,
    credits: 10000,
    federationStanding: 0,
    suspicion: 0,
    humanPlayerId: "human",
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
    ...overrides,
  };
}

afterEach(() => {
  useUiStore.setState({ blueprintShopOpen: false });
  useGameStore.setState({ snapshot: null });
});

describe("BlueprintShop", () => {
  it("renders discipline tabs", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    expect(screen.getByText("Mining")).toBeTruthy();
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("Military")).toBeTruthy();
    expect(screen.getByText("Science")).toBeTruthy();
    expect(screen.getByText("Commerce")).toBeTruthy();
  });

  it("shows T1 Mining blueprint Mine Mk2 by default", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    expect(screen.getByText(/Mine Mk2/)).toBeTruthy();
  });

  it("shows Research button for Mine Mk2 when affordable and no prereq", () => {
    useGameStore.setState({ snapshot: makeSnapshot({ credits: 10000 }) });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    const buttons = screen.getAllByText("Research");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("calls onCommand with buyBlueprint when Research button is clicked", () => {
    const onCommand = vi.fn();
    useGameStore.setState({ snapshot: makeSnapshot({ credits: 10000 }) });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={onCommand} />);
    // Mine Mk2 is first Research button (T1 mining, affordable, no prereq)
    const researchButtons = screen.getAllByText("Research");
    fireEvent.click(researchButtons[0]!);
    expect(onCommand).toHaveBeenCalledWith({ kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
  });

  it("shows LOCKED for Deep Bore Mine when Mine Mk2 not owned", () => {
    useGameStore.setState({ snapshot: makeSnapshot({ credits: 50000, blueprintsOwned: [] }) });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    // Deep Bore Mine requires mineMk2 — should show LOCKED
    const lockedButtons = screen.getAllByText("LOCKED");
    expect(lockedButtons.length).toBeGreaterThan(0);
  });

  it("renders nothing when blueprintShopOpen is false", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ blueprintShopOpen: false });
    const { container } = render(<BlueprintShop onCommand={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when snapshot is null", () => {
    useGameStore.setState({ snapshot: null });
    useUiStore.setState({ blueprintShopOpen: true });
    const { container } = render(<BlueprintShop onCommand={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows OWNED for blueprints already owned", () => {
    useGameStore.setState({
      snapshot: makeSnapshot({ credits: 10000, blueprintsOwned: ["blueprint.mineMk2"] }),
    });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    expect(screen.getByText("OWNED")).toBeTruthy();
  });
});
