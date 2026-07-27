import { beforeEach, describe, expect, it } from "vitest";
import { useTimeStore } from "../store/timeStore.ts";

describe("timeStore", () => {
  beforeEach(() => {
    useTimeStore.setState({ timeScale: 1 });
  });

  it("starts at 1x", () => {
    expect(useTimeStore.getState().timeScale).toBe(1);
  });

  it("steps through the presets", () => {
    const { stepTimeScale } = useTimeStore.getState();
    stepTimeScale(1);
    expect(useTimeStore.getState().timeScale).toBe(2);
    stepTimeScale(1);
    expect(useTimeStore.getState().timeScale).toBe(4);
    stepTimeScale(-1);
    expect(useTimeStore.getState().timeScale).toBe(2);
  });

  it("clamps at both ends instead of wrapping", () => {
    const { stepTimeScale } = useTimeStore.getState();
    for (let i = 0; i < 5; i++) stepTimeScale(-1);
    expect(useTimeStore.getState().timeScale).toBe(1);
    for (let i = 0; i < 5; i++) stepTimeScale(1);
    expect(useTimeStore.getState().timeScale).toBe(8);
  });

  it("setTimeScale selects a preset directly", () => {
    useTimeStore.getState().setTimeScale(4);
    expect(useTimeStore.getState().timeScale).toBe(4);
  });
});
