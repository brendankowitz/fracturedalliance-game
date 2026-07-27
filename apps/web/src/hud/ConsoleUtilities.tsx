import { useState } from "react";
import { ACHIEVEMENTS, useAchievementStore } from "../store/achievementStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { AchievementsPanel } from "./AchievementsPanel.tsx";
import { KeybindingsPanel } from "./KeybindingsPanel.tsx";

/**
 * Accessibility and utility toggles for the console's top-right corner.
 *
 * These lived in the floating nav strip the console replaces. They own the two panels
 * they open, so nothing about them has to be threaded through the shared HUD.
 */

const toggleStyle = (active: boolean, tint: string): React.CSSProperties => ({
  background: active ? `${tint}1f` : "transparent",
  border: `1px solid ${active ? tint : "#1a2840"}`,
  color: active ? tint : "#8899bb",
  fontFamily: "var(--font-data)",
  fontSize: 9,
  padding: "2px 5px",
  cursor: "pointer",
});

const ACCENT = "#00c4e0";
const AMBER = "#e8a04a";
const GREEN = "#79c188";

function Divider() {
  return <span style={{ color: "#1a2840" }}>|</span>;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 9,
        color: "#556680",
        letterSpacing: 1,
      }}
    >
      {children}
    </span>
  );
}

export function ConsoleUtilities() {
  const colorPalette = useUiStore((s) => s.colorPalette);
  const setColorPalette = useUiStore((s) => s.setColorPalette);
  const fontScale = useUiStore((s) => s.fontScale);
  const setFontScale = useUiStore((s) => s.setFontScale);
  const ecoMode = useUiStore((s) => s.ecoMode);
  const toggleEcoMode = useUiStore((s) => s.toggleEcoMode);
  const showHelp = useUiStore((s) => s.showHelp);
  const toggleHelp = useUiStore((s) => s.toggleHelp);
  const slowSimMode = useUiStore((s) => s.slowSimMode);
  const toggleSlowSimMode = useUiStore((s) => s.toggleSlowSimMode);
  const toggleSaveLoad = useUiStore((s) => s.toggleSaveLoadPanel);
  const unlockedAchs = useAchievementStore((s) => s.unlocked);

  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  return (
    <>
      <GroupLabel>COLOUR</GroupLabel>
      {(["normal", "deuteranopia", "protanopia"] as const).map((palette) => (
        <button
          key={palette}
          type="button"
          onClick={() => {
            setColorPalette(palette);
          }}
          aria-pressed={colorPalette === palette}
          aria-label={`Colour palette ${palette}`}
          style={toggleStyle(colorPalette === palette, ACCENT)}
        >
          {palette === "normal" ? "STD" : palette === "deuteranopia" ? "DEU" : "PRO"}
        </button>
      ))}

      <Divider />
      <GroupLabel>TEXT</GroupLabel>
      {([100, 125, 150, 175, 200] as const).map((scale) => (
        <button
          key={scale}
          type="button"
          onClick={() => {
            setFontScale(scale);
          }}
          aria-pressed={fontScale === scale}
          aria-label={`Font size ${scale}%`}
          style={toggleStyle(fontScale === scale, ACCENT)}
        >
          {scale}%
        </button>
      ))}

      <Divider />
      <button
        type="button"
        onClick={toggleEcoMode}
        aria-pressed={ecoMode}
        aria-label="Eco mode — reduces visual effects for performance"
        style={toggleStyle(ecoMode, GREEN)}
      >
        Eco
      </button>
      <button
        type="button"
        onClick={toggleHelp}
        aria-pressed={showHelp}
        aria-label="Toggle help tooltips"
        style={toggleStyle(showHelp, ACCENT)}
      >
        Help
      </button>
      <button
        type="button"
        onClick={toggleSlowSimMode}
        aria-pressed={slowSimMode}
        aria-label="Slow simulation mode"
        style={toggleStyle(slowSimMode, GREEN)}
      >
        Turn
      </button>
      <button
        type="button"
        onClick={toggleSaveLoad}
        aria-label="Save and load"
        style={toggleStyle(false, ACCENT)}
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          setKeybindingsOpen(!keybindingsOpen);
        }}
        aria-pressed={keybindingsOpen}
        aria-label="Keybindings"
        style={toggleStyle(keybindingsOpen, "#cc88ff")}
      >
        Keys
      </button>
      <button
        type="button"
        onClick={() => {
          setAchievementsOpen(!achievementsOpen);
        }}
        aria-pressed={achievementsOpen}
        aria-label="Achievements"
        style={toggleStyle(achievementsOpen, AMBER)}
      >
        ★ {unlockedAchs.size}/{ACHIEVEMENTS.length}
      </button>

      {keybindingsOpen && (
        <div style={{ position: "absolute", top: 72, right: 12, zIndex: 40, width: 220 }}>
          <KeybindingsPanel />
        </div>
      )}
      {achievementsOpen && (
        <AchievementsPanel
          onClose={() => {
            setAchievementsOpen(false);
          }}
        />
      )}
    </>
  );
}
