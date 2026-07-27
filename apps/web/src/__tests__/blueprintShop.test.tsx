import type { HudSnapshot } from "@fa/sim";
import type { HudSnapshotV2 } from "@fa/sim-adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlueprintShop } from "../hud/BlueprintShop.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { makeTestSnapshot } from "./testSnapshot.ts";

function makeSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return makeTestSnapshot({ credits: 10000, ...overrides });
}

function makeV2Snapshot(overrides: Partial<HudSnapshotV2> = {}): HudSnapshotV2 {
  return {
    ...makeTestSnapshot({ credits: 10000 }),
    transporterNextTick: 6000,
    queuedOrders: [],
    colonyExtras: {},
    council: { embargoes: [], tariffs: [], openVotes: [] },
    researchInProgress: null,
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
    expect(onCommand).toHaveBeenCalledWith({
      kind: "buyBlueprint",
      blueprintId: "blueprint.mineMk2",
    });
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

describe("BlueprintShop — V2 (adopted sim) Sci-Tek storefront", () => {
  it("renders vendored discipline tabs and entries", () => {
    useGameStore.setState({ snapshot: makeV2Snapshot() });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    expect(screen.getByText("extraction")).toBeTruthy();
    expect(screen.getAllByText(/Mine Mk2/).length).toBeGreaterThan(0);
  });

  it("sends buyBlueprint with the vendored blueprint id", () => {
    const onCommand = vi.fn();
    useGameStore.setState({ snapshot: makeV2Snapshot({ credits: 10_000 }) });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={onCommand} />);
    const researchButtons = screen.getAllByText("Research");
    fireEvent.click(researchButtons[0]!);
    expect(onCommand).toHaveBeenCalledWith({
      kind: "buyBlueprint",
      blueprintId: "bp.extraction.mine-mk2",
    });
  });

  it("shows research progress and blocks a second project", () => {
    useGameStore.setState({
      snapshot: makeV2Snapshot({
        credits: 100_000,
        researchInProgress: {
          blueprintId: "bp.extraction.mine-mk2",
          remainingTicks: 600,
          totalTicks: 1200,
        },
      }),
    });
    useUiStore.setState({ blueprintShopOpen: true });
    render(<BlueprintShop onCommand={vi.fn()} />);
    expect(screen.getByText(/RESEARCHING/)).toBeTruthy();
    expect(screen.getByText("IN PROGRESS")).toBeTruthy();
    expect(screen.queryAllByText("Research")).toHaveLength(0);
  });
});
