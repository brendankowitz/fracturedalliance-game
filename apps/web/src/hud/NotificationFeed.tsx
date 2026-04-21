import type { EventPriority } from "@fa/domain";
import { useEffect, useRef, useState } from "react";
import { playSound } from "../audio.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

interface NotificationEntry {
  id: number;
  tick: number;
  kind: string;
  priority: EventPriority;
  label: string;
}

export const EVENT_LABELS: Partial<Record<string, string>> = {
  "colony.under_attack": "Colony under attack",
  "colony.starved": "Colony starving",
  "colony.captured": "Colony captured",
  "asteroid.incoming": "Asteroid incoming",
  "trader.arrived": "Transporter arrived",
  "construction.done": "Construction complete",
  "treaty.broken": "Treaty broken",
  "blueprint.purchased": "Blueprint acquired",
};

const PRIORITY_COLORS: Record<EventPriority, string> = {
  red: "var(--red)",
  amber: "var(--amber)",
  grey: "var(--text-lo)",
  green: "var(--green)",
};

const PRIORITY_ICONS: Record<EventPriority, string> = {
  red: "⚠",
  amber: "!",
  grey: "·",
  green: "✓",
};

const PRIORITY_LABELS: Record<EventPriority, string> = {
  red: "Critical",
  amber: "Warning",
  grey: "Info",
  green: "OK",
};

const MAX_ENTRIES = 50;

export function NotificationFeed() {
  const open = useUiStore((s) => s.notificationFeedOpen);
  const paused = useUiStore((s) => s.paused);
  const setPaused = useUiStore((s) => s.setPaused);
  const snapshot = useGameStore((s) => s.snapshot);
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [autoPause, setAutoPause] = useState({ red: true, amber: false });
  const [ariaAnnounce, setAriaAnnounce] = useState("");
  const idRef = useRef(0);
  const lastTickRef = useRef(-1);
  const lastShownTickByKind = useRef<Map<string, number>>(new Map());

  const DEDUP_TICKS = 150; // same event kind suppressed for ~7s

  useEffect(() => {
    if (!snapshot || snapshot.events.length === 0) return;
    if (snapshot.tick === lastTickRef.current) return;
    lastTickRef.current = snapshot.tick;

    const seenKindsThisBatch = new Set<string>();
    const newEntries: NotificationEntry[] = [];
    for (const ev of snapshot.events) {
      if (seenKindsThisBatch.has(ev.kind)) continue; // dedupe within same tick
      const lastTick = lastShownTickByKind.current.get(ev.kind) ?? -DEDUP_TICKS;
      if (snapshot.tick - lastTick < DEDUP_TICKS) continue; // suppress repeat
      seenKindsThisBatch.add(ev.kind);
      lastShownTickByKind.current.set(ev.kind, snapshot.tick);
      newEntries.push({
        id: idRef.current++,
        tick: snapshot.tick,
        kind: ev.kind,
        priority: ev.priority,
        label: EVENT_LABELS[ev.kind] ?? ev.kind,
      });
    }
    if (newEntries.length === 0) return;

    const shouldPause = newEntries.some(
      (e) => (e.priority === "red" && autoPause.red) || (e.priority === "amber" && autoPause.amber),
    );
    if (shouldPause && !paused) {
      setPaused(true);
    }

    const latestRed = newEntries.find((e) => e.priority === "red");
    if (latestRed) setAriaAnnounce(latestRed.label);

    for (const entry of newEntries) {
      if (entry.kind === "construction.done") {
        playSound("/audio/sfx/build_complete.wav");
      } else if (entry.kind === "treaty.signed" || entry.kind === "treaty.broken") {
        playSound("/audio/sfx/treaty_signed.wav");
      } else if (entry.kind === "espionage.detected") {
        playSound("/audio/sfx/espionage_detected.wav");
      } else if (entry.priority === "red") {
        playSound("/audio/sfx/notification.wav", 0.7);
      } else if (entry.priority === "amber") {
        playSound("/audio/sfx/notification.wav", 0.35);
      }
    }

    setEntries((prev) => [...newEntries, ...prev].slice(0, MAX_ENTRIES));
  }, [snapshot, autoPause, paused, setPaused]);

  return (
    <>
      {/* Accessible live region — always rendered, visually hidden */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {ariaAnnounce}
      </div>

      {open && (
        <div
          className="fa-panel fa-panel-slide"
          style={{
            position: "absolute",
            top: 72,
            right: 16,
            width: 280,
            zIndex: 12,
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 100px)",
            borderTop: "2px solid var(--amber)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-head)",
                fontSize: 11,
                color: "var(--amber)",
                letterSpacing: 2,
                flex: 1,
              }}
            >
              EVENT LOG
            </span>

            {/* Auto-pause toggles */}
            <button
              type="button"
              className="fa-btn"
              onClick={() => setAutoPause((p) => ({ ...p, red: !p.red }))}
              aria-pressed={autoPause.red}
              title="Auto-pause on critical events"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderColor: autoPause.red ? "var(--red)" : "var(--border)",
                color: autoPause.red ? "var(--red)" : "var(--text-lo)",
              }}
            >
              ⏸ RED
            </button>
            <button
              type="button"
              className="fa-btn"
              onClick={() => setAutoPause((p) => ({ ...p, amber: !p.amber }))}
              aria-pressed={autoPause.amber}
              title="Auto-pause on warning events"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderColor: autoPause.amber ? "var(--amber)" : "var(--border)",
                color: autoPause.amber ? "var(--amber)" : "var(--text-lo)",
              }}
            >
              ⏸ AMB
            </button>
          </div>

          {/* Entry list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {entries.length === 0 ? (
              <div
                style={{
                  padding: "20px 0",
                  textAlign: "center",
                  color: "var(--text-lo)",
                  fontSize: 11,
                }}
              >
                No events yet
              </div>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 10px 5px 8px",
                    borderBottom: "1px solid var(--border-dim)",
                    borderLeft: `3px solid ${PRIORITY_COLORS[e.priority]}`,
                  }}
                >
                  <span
                    style={{
                      color: PRIORITY_COLORS[e.priority],
                      flexShrink: 0,
                      fontSize: 11,
                      width: 12,
                      textAlign: "center",
                    }}
                    title={PRIORITY_LABELS[e.priority]}
                    aria-label={PRIORITY_LABELS[e.priority]}
                  >
                    {PRIORITY_ICONS[e.priority]}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: "var(--text-hi)",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 500,
                    }}
                  >
                    {e.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-lo)",
                      flexShrink: 0,
                      fontFamily: "var(--font-data)",
                    }}
                  >
                    T{e.tick}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "6px 10px",
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="fa-btn"
              onClick={() => setEntries([])}
              style={{ fontSize: 10, padding: "2px 10px", letterSpacing: 1 }}
            >
              CLEAR
            </button>
          </div>
        </div>
      )}
    </>
  );
}
