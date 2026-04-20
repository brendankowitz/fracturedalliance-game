import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpTip } from "../hud/HelpTip";
import { useUiStore } from "../store/uiStore";

describe("HelpTip", () => {
  it("renders nothing when showHelp is false", () => {
    useUiStore.setState({ showHelp: false });
    const { container } = render(<HelpTip text="Test" />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders ? button when showHelp is true", () => {
    useUiStore.setState({ showHelp: true });
    render(<HelpTip text="Test help" />);
    expect(screen.getByRole("button", { name: /help/i })).toBeInTheDocument();
  });

  it("shows tooltip on mouse enter", () => {
    useUiStore.setState({ showHelp: true });
    render(<HelpTip text="Tooltip text here" />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: /help/i }));
    expect(screen.getByText("Tooltip text here")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    useUiStore.setState({ showHelp: true });
    render(<HelpTip text="Tooltip text here" />);
    const btn = screen.getByRole("button", { name: /help/i });
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(screen.queryByText("Tooltip text here")).toBeNull();
  });
});
