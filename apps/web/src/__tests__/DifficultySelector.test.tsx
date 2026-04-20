import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DifficultySelector } from "../hud/DifficultySelector";

describe("DifficultySelector", () => {
  it("renders all difficulty levels", () => {
    render(<DifficultySelector value="manager" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /intern/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /manager/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /director/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ceo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /board/i })).toBeTruthy();
  });

  it("calls onChange when a level is clicked", () => {
    const onChange = vi.fn();
    render(<DifficultySelector value="manager" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /director/i }));
    expect(onChange).toHaveBeenCalledWith("director");
  });

  it("marks selected level as aria-pressed=true and others as false", () => {
    render(<DifficultySelector value="ceo" onChange={vi.fn()} />);
    const ceoBtn = screen.getByRole("button", { name: /ceo/i });
    const managerBtn = screen.getByRole("button", { name: /manager/i });
    expect(ceoBtn.getAttribute("aria-pressed")).toBe("true");
    expect(managerBtn.getAttribute("aria-pressed")).toBe("false");
  });
});
