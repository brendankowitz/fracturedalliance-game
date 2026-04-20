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

  it("detects duplicate keybinds", () => {
    useKeybindStore.getState().setKeybind("openEspionage", " "); // same as pause
    expect(useKeybindStore.getState().hasDuplicate("openEspionage")).toBe(true);
    expect(useKeybindStore.getState().hasDuplicate("pause")).toBe(true);
  });

  it("resets keybinds to defaults", () => {
    useKeybindStore.getState().setKeybind("pause", "p");
    useKeybindStore.getState().resetKeybinds();
    expect(useKeybindStore.getState().keybinds.pause).toBe(" ");
  });

  it("no duplicate for unique key", () => {
    expect(useKeybindStore.getState().hasDuplicate("pause")).toBe(false);
  });
});
