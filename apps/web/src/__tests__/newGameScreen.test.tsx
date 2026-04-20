import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewGameScreen } from "../hud/NewGameScreen.tsx";

describe("NewGameScreen scenario lock", () => {
  it("shows advanced-primer as disabled", () => {
    const onStart = vi.fn();
    render(<NewGameScreen onStart={onStart} />);
    const btn = screen.getByRole("button", { name: /advanced primer/i });
    expect(btn).toBeDisabled();
  });

  it("shows unlock hint on locked scenarios", () => {
    const onStart = vi.fn();
    render(<NewGameScreen onStart={onStart} />);
    expect(screen.getByText(/unlock: win once/i)).toBeInTheDocument();
  });
});
