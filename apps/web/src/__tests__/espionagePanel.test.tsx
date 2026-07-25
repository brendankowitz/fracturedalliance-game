import type { HudSnapshot } from "@fa/sim";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EspionagePanel } from "../hud/EspionagePanel.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { makeTestSnapshot } from "./testSnapshot.ts";

function makeSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return makeTestSnapshot({ credits: 10_000, humanPlayerId: "player-human", ...overrides });
}

afterEach(() => {
  useUiStore.setState({ espionagePanelOpen: false });
  useGameStore.setState({ snapshot: null });
});

describe("EspionagePanel", () => {
  it("renders nothing when espionagePanelOpen is false", () => {
    useGameStore.setState({ snapshot: makeSnapshot() });
    useUiStore.setState({ espionagePanelOpen: false });
    const { container } = render(<EspionagePanel onCommand={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when snapshot is null", () => {
    useGameStore.setState({ snapshot: null });
    useUiStore.setState({ espionagePanelOpen: true });
    const { container } = render(<EspionagePanel onCommand={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows AVAILABLE FOR HIRE section with agent name and hire button", () => {
    const agents = [
      {
        id: "agent-cipher",
        name: "Cipher",
        owned: false,
        stealth: 35,
        hireCost: 500,
        missionKind: null,
        missionTarget: null,
        missionCompleteTick: null,
      },
    ];
    useGameStore.setState({ snapshot: makeSnapshot({ agents }) });
    useUiStore.setState({ espionagePanelOpen: true });
    render(<EspionagePanel onCommand={vi.fn()} />);
    expect(screen.getByText(/AVAILABLE FOR HIRE/)).toBeTruthy();
    expect(screen.getByText("Cipher")).toBeTruthy();
    expect(screen.getByText(/Hire/)).toBeTruthy();
  });

  it("shows YOUR AGENTS section with owned agent name", () => {
    const agents = [
      {
        id: "agent-void",
        name: "Void",
        owned: true,
        stealth: 65,
        hireCost: 1300,
        missionKind: null,
        missionTarget: null,
        missionCompleteTick: null,
      },
    ];
    useGameStore.setState({ snapshot: makeSnapshot({ agents }) });
    useUiStore.setState({ espionagePanelOpen: true });
    render(<EspionagePanel onCommand={vi.fn()} />);
    expect(screen.getByText(/YOUR AGENTS/)).toBeTruthy();
    expect(screen.getByText("Void")).toBeTruthy();
  });

  it("shows both sections when there are owned and available agents", () => {
    const agents = [
      {
        id: "agent-cipher",
        name: "Cipher",
        owned: false,
        stealth: 35,
        hireCost: 500,
        missionKind: null,
        missionTarget: null,
        missionCompleteTick: null,
      },
      {
        id: "agent-void",
        name: "Void",
        owned: true,
        stealth: 65,
        hireCost: 1300,
        missionKind: null,
        missionTarget: null,
        missionCompleteTick: null,
      },
    ];
    useGameStore.setState({ snapshot: makeSnapshot({ agents }) });
    useUiStore.setState({ espionagePanelOpen: true });
    render(<EspionagePanel onCommand={vi.fn()} />);
    expect(screen.getByText(/YOUR AGENTS/)).toBeTruthy();
    expect(screen.getByText(/AVAILABLE FOR HIRE/)).toBeTruthy();
    expect(screen.getByText("Cipher")).toBeTruthy();
    expect(screen.getByText("Void")).toBeTruthy();
  });

  it("shows mission status for agent on a mission", () => {
    const agents = [
      {
        id: "agent-void",
        name: "Void",
        owned: true,
        stealth: 65,
        hireCost: 1300,
        missionKind: "recon" as const,
        missionTarget: "asteroid-kryll",
        missionCompleteTick: 350,
      },
    ];
    useGameStore.setState({ snapshot: makeSnapshot({ agents }) });
    useUiStore.setState({ espionagePanelOpen: true });
    render(<EspionagePanel onCommand={vi.fn()} />);
    expect(screen.getByText(/Mission: Recon/)).toBeTruthy();
    expect(screen.getByText(/done tick 350/)).toBeTruthy();
  });

  it("Hire button is disabled when insufficient credits", () => {
    const agents = [
      {
        id: "agent-crux",
        name: "Crux",
        owned: false,
        stealth: 90,
        hireCost: 3000,
        missionKind: null,
        missionTarget: null,
        missionCompleteTick: null,
      },
    ];
    useGameStore.setState({ snapshot: makeSnapshot({ credits: 100, agents }) });
    useUiStore.setState({ espionagePanelOpen: true });
    render(<EspionagePanel onCommand={vi.fn()} />);
    const hireButton = screen.getByText(/Hire/);
    expect(hireButton.closest("button")?.disabled).toBe(true);
  });
});
