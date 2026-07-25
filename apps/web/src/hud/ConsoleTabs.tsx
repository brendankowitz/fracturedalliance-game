/**
 * Section tabs along the console's top edge.
 *
 * Replaces the floating nav strip. Sections are always visible and always in the same
 * place, so the player learns where things are rather than hunting for a toggle — and the
 * active section is legible without opening anything.
 */

export interface ConsoleTab {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly active: boolean;
  readonly onSelect: () => void;
}

export interface ConsoleTabsProps {
  tabs: ReadonlyArray<ConsoleTab>;
  /** Rendered hard right — accessibility and utility toggles. */
  trailing?: React.ReactNode;
}

export function ConsoleTabs({ tabs, trailing }: ConsoleTabsProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 30,
        borderTop: "1px solid #12203a",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={tab.onSelect}
          aria-pressed={tab.active}
          aria-label={`${tab.label} section`}
          title={`${tab.hint} — ${tab.label}`}
          style={{
            background: tab.active ? "rgba(232,160,74,0.10)" : "transparent",
            border: "none",
            borderRight: "1px solid #12203a",
            borderBottom: `2px solid ${tab.active ? "#e8a04a" : "transparent"}`,
            color: tab.active ? "#e8a04a" : "#8899bb",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            padding: "0 13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {tab.label}
          <span style={{ fontSize: 8, opacity: 0.5 }}>{tab.hint}</span>
        </button>
      ))}
      {trailing && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 10px",
            borderLeft: "1px solid #12203a",
          }}
        >
          {trailing}
        </div>
      )}
    </nav>
  );
}
