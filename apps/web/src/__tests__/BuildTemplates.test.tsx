import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuildTemplates } from "../hud/BuildTemplates.tsx";
import { useUiStore } from "../store/uiStore.ts";

describe("BuildTemplates", () => {
  it("renders Save as Template button", () => {
    render(<BuildTemplates currentQueue={[]} onApplyTemplate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /save as template/i })).toBeInTheDocument();
  });

  it("calls onApplyTemplate when template selected", () => {
    useUiStore.setState({
      buildTemplates: { "My Template": ["airProcessor", "mineMk1"] },
    });
    const onApply = vi.fn();
    render(<BuildTemplates currentQueue={[]} onApplyTemplate={onApply} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "My Template" } });
    expect(onApply).toHaveBeenCalledWith(["airProcessor", "mineMk1"]);
  });
});
