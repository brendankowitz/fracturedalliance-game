import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourceBar } from "../hud/ResourceBar.tsx";

describe("ResourceBar", () => {
  it("displays credits", () => {
    render(<ResourceBar credits={12345} federationStanding={50} tick={100} />);
    expect(screen.getByText(/12,345/)).toBeTruthy();
  });

  it("displays tick count", () => {
    render(<ResourceBar credits={0} federationStanding={50} tick={42} />);
    expect(screen.getByText(/42/)).toBeTruthy();
  });
});
