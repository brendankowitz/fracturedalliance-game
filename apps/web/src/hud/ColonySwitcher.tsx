import type { AsteroidId } from "@fa/domain";
import type { AsteroidSnapshot } from "@fa/sim";

/**
 * Steps between the colonies the player holds, without a trip back to the sector map.
 * The original put this in the frame for the same reason: switching colonies is a
 * navigation act you do constantly, not a search you start from scratch each time.
 */

export interface ColonySwitcherProps {
  colonies: ReadonlyArray<AsteroidSnapshot>;
  currentId: string;
  onSelect: (id: AsteroidId) => void;
  onBackToMap: () => void;
}

const buttonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #224466",
  color: "#c8d8ff",
  fontFamily: "monospace",
  fontSize: 11,
  padding: "2px 8px",
  cursor: "pointer",
};

export function ColonySwitcher({
  colonies,
  currentId,
  onSelect,
  onBackToMap,
}: ColonySwitcherProps) {
  const index = colonies.findIndex((c) => c.id === currentId);
  const step = (delta: number) => {
    if (colonies.length === 0) return;
    const next = colonies[(index + delta + colonies.length) % colonies.length];
    if (next) onSelect(next.id);
  };

  const multiple = colonies.length > 1;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" onClick={onBackToMap} style={buttonStyle} title="Back to sector map">
        ← Sector
      </button>
      <button
        type="button"
        onClick={() => {
          step(-1);
        }}
        disabled={!multiple}
        aria-label="Previous colony"
        style={{ ...buttonStyle, opacity: multiple ? 1 : 0.35 }}
      >
        ‹
      </button>
      <span
        style={{
          fontFamily: "var(--font-data)",
          fontSize: 12,
          color: "#e8a04a",
          letterSpacing: 1,
          minWidth: 96,
          textAlign: "center",
        }}
      >
        {colonies[index]?.name ?? "—"}
      </span>
      <button
        type="button"
        onClick={() => {
          step(1);
        }}
        disabled={!multiple}
        aria-label="Next colony"
        style={{ ...buttonStyle, opacity: multiple ? 1 : 0.35 }}
      >
        ›
      </button>
      {multiple && (
        <span style={{ fontFamily: "var(--font-data)", fontSize: 9, color: "#556680" }}>
          {index + 1}/{colonies.length}
        </span>
      )}
    </div>
  );
}
