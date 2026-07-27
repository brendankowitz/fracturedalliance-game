import type { ReactNode } from "react";

/**
 * Fixed console chrome.
 *
 * The original framed its world view in heavy industrial chrome — you are sitting at a
 * TetraCorp terminal, not looking at floating windows. This provides that frame: a header
 * strip, two rails, a status bar, and a large central viewport.
 *
 * The viewport is a positioning context on purpose. Existing panels position themselves
 * absolutely against their containing block, so rendering them inside it re-homes them
 * into the frame without any of them being edited.
 */

export interface ConsoleShellProps {
  header: ReactNode;
  tabs: ReactNode;
  leftRail: ReactNode;
  rightRail: ReactNode;
  footer: ReactNode;
  /** Optional strip directly above the viewport — the colony vitals. */
  viewportHeader?: ReactNode;
  children: ReactNode;
}

const RAIL_WIDTH = 236;
const CHROME = "#0a1420";
const BORDER = "#1a2840";

const railStyle = (side: "left" | "right"): React.CSSProperties => ({
  width: RAIL_WIDTH,
  flexShrink: 0,
  background: CHROME,
  [side === "left" ? "borderRight" : "borderLeft"]: `1px solid ${BORDER}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export function ConsoleShell({
  header,
  tabs,
  leftRail,
  rightRail,
  footer,
  viewportHeader,
  children,
}: ConsoleShellProps) {
  return (
    <div
      className="fa-console-root"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header style={{ flexShrink: 0, background: CHROME, borderBottom: `1px solid ${BORDER}` }}>
        {header}
        {tabs}
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0, pointerEvents: "none" }}>
        <aside style={railStyle("left")}>{leftRail}</aside>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {viewportHeader}
          <div
            className="fa-console-viewport"
            style={{
              // Containing block for every absolutely-positioned panel rendered below.
              position: "relative",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </main>

        <aside style={railStyle("right")}>{rightRail}</aside>
      </div>

      <footer
        style={{
          flexShrink: 0,
          background: CHROME,
          borderTop: `1px solid ${BORDER}`,
          height: 26,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 16,
          fontFamily: "var(--font-data)",
          fontSize: 10,
          color: "#556680",
        }}
      >
        {footer}
      </footer>
    </div>
  );
}
