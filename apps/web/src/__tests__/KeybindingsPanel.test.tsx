import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { KeybindingsPanel } from "../hud/KeybindingsPanel";
import { useKeybindStore } from "../store/keybindStore";

describe("KeybindingsPanel", () => {
  beforeEach(() => {
    useKeybindStore.getState().resetKeybinds();
  });

  it("renders all action labels", () => {
    render(<KeybindingsPanel />);
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("Espionage")).toBeInTheDocument();
    expect(screen.getByText("Diplomacy")).toBeInTheDocument();
  });

  it("shows SPC for space keybind", () => {
    render(<KeybindingsPanel />);
    expect(screen.getByText("SPC")).toBeInTheDocument();
  });

  it("reset button restores defaults", () => {
    useKeybindStore.getState().setKeybind("pause", "p");
    render(<KeybindingsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(useKeybindStore.getState().keybinds.pause).toBe(" ");
  });

  it("clicking a bind enters listening mode then captures keydown on window", () => {
    render(<KeybindingsPanel />);
    fireEvent.click(screen.getByText("SPC"));
    expect(screen.getByText("…")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "p" });
    expect(useKeybindStore.getState().keybinds.pause).toBe("p");
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("Escape cancels listening without changing the bind", () => {
    render(<KeybindingsPanel />);
    fireEvent.click(screen.getByText("SPC"));
    expect(screen.getByText("…")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useKeybindStore.getState().keybinds.pause).toBe(" ");
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("shows duplicate warning when two actions share a key", () => {
    useKeybindStore.getState().setKeybind("openEspionage", " ");
    render(<KeybindingsPanel />);
    const warnings = screen.getAllByText(/⚠/);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
