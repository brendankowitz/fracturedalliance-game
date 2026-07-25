import type { EventPriority } from "@fa/domain";
import { useEffect, useRef, useState } from "react";
import { playSound, SFX } from "../audio.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { EVENT_KIND_META, eventLabel } from "./eventKindMeta.ts";

interface NotificationEntry {
  id: number;
  tick: number;
  kind: string;
  priority: EventPriority;
  label: string;
}

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
  const pauseOnPriority = useUiStore((s) => s.pauseOnPriority);
  const setPauseOnPriority = useUiStore((s) => s.setPauseOnPriority);
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
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
      const detail = (ev as { detail?: string }).detail;
      newEntries.push({
        id: idRef.current++,
        tick: snapshot.tick,
        kind: ev.kind,
        priority: ev.priority,
        // Unknown kinds pass through with their raw kind string — an event
        // must never vanish because a table missed it (spec §5).
        label: detail ? `${eventLabel(ev.kind)} — ${detail}` : eventLabel(ev.kind),
      });
    }
    if (newEntries.length === 0) return;

    const shouldPause = newEntries.some(
      (e) =>
        (e.priority === "red" && pauseOnPriority.red) ||
        (e.priority === "amber" && pauseOnPriority.amber),
    );
    if (shouldPause && !paused) {
      setPaused(true);
    }

    const latestRed = newEntries.find((e) => e.priority === "red");
    if (latestRed) setAriaAnnounce(latestRed.label);

    for (const entry of newEntries) {
      const meta = EVENT_KIND_META[entry.kind];
      if (meta) {
        if (meta.sfx) playSound(SFX[meta.sfx], meta.volume ?? 0.5);
      } else if (entry.priority === "red") {
        playSound(SFX.notification, 0.7);
      } else if (entry.priority === "amber") {
        playSound(SFX.notification, 0.35);
      }
    }

    setEntries((prev) => [...newEntries, ...prev].slice(0, MAX_ENTRIES));
  }, [snapshot, pauseOnPriority, paused, setPaused]);

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
              onClick={() => setPauseOnPriority("red", !pauseOnPriority.red)}
              aria-pressed={pauseOnPriority.red}
              title="Auto-pause on critical events"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderColor: pauseOnPriority.red ? "var(--red)" : "var(--border)",
                color: pauseOnPriority.red ? "var(--red)" : "var(--text-lo)",
              }}
            >
              ⏸ RED
            </button>
            <button
              type="button"
              className="fa-btn"
              onClick={() => setPauseOnPriority("amber", !pauseOnPriority.amber)}
              aria-pressed={pauseOnPriority.amber}
              title="Auto-pause on warning events"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderColor: pauseOnPriority.amber ? "var(--amber)" : "var(--border)",
                color: pauseOnPriority.amber ? "var(--amber)" : "var(--text-lo)",
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
                    role="img"
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
