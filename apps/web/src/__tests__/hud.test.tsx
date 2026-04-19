import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourceBar } from "../hud/ResourceBar.tsx";

describe("ResourceBar", () => {
  it("displays credits", () => {
    render(
      <ResourceBar credits={12345} federationStanding={50} tick={100} seed={42183} difficulty="normal" />,
    );
    expect(screen.getByText(/12,345/)).toBeTruthy();
  });

  it("displays tick count", () => {
    render(<ResourceBar credits={0} federationStanding={50} tick={42} seed={99} difficulty="normal" />);
    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it("displays seed", () => {
    render(<ResourceBar credits={0} federationStanding={50} tick={0} seed={42183} difficulty="hard" />);
    expect(screen.getByText(/42183/)).toBeTruthy();
  });
});
