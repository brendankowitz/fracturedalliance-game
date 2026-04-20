import { describe, expect, it, beforeEach } from "vitest";
import { useKeybindStore, DEFAULT_KEYBINDS } from "../store/keybindStore";

describe("keybindStore", () => {
  beforeEach(() => {
    useKeybindStore.getState().resetKeybinds();
  });

  it("defaults match DEFAULT_KEYBINDS", () => {
    expect(useKeybindStore.getState().keybinds).toEqual(DEFAULT_KEYBINDS);
  });

  it("sets a keybind", () => {
    useKeybindStore.getState().setKeybind("pause", "p");
    expect(useKeybindStore.getState().keybinds.pause).toBe("p");
  });

  it("resets keybinds to defaults", () => {
    useKeybindStore.getState().setKeybind("pause", "p");
    useKeybindStore.getState().resetKeybinds();
    expect(useKeybindStore.getState().keybinds.pause).toBe(" ");
  });

  it("keybinds can be set to a duplicate value", () => {
    useKeybindStore.getState().setKeybind("openEspionage", " ");
    expect(useKeybindStore.getState().keybinds.openEspionage).toBe(" ");
    expect(useKeybindStore.getState().keybinds.pause).toBe(" ");
  });
});
