import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach } from "vitest";
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
});
