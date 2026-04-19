import type { EventPriority } from "@fa/domain";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

interface NotificationEntry {
  id: number;
  tick: number;
  kind: string;
  priority: EventPriority;
  label: string;
}

const EVENT_LABELS: Partial<Record<string, string>> = {
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
  red: "#f44",
  amber: "#fa4",
  grey: "#888",
};

const MAX_ENTRIES = 50;

export function NotificationFeed() {
  const open = useUiStore((s) => s.notificationFeedOpen);
  const paused = useUiStore((s) => s.paused);
  const setPaused = useUiStore((s) => s.setPaused);
  const snapshot = useGameStore((s) => s.snapshot);
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [autoPause, setAutoPause] = useState({ red: true, amber: false });
  const idRef = useRef(0);
  const lastTickRef = useRef(-1);

  useEffect(() => {
    if (!snapshot || snapshot.events.length === 0) return;
    if (snapshot.tick === lastTickRef.current) return;
    lastTickRef.current = snapshot.tick;

    const newEntries: NotificationEntry[] = snapshot.events.map((ev) => ({
      id: idRef.current++,
      tick: snapshot.tick,
      kind: ev.kind,
      priority: ev.priority,
      label: EVENT_LABELS[ev.kind] ?? ev.kind,
    }));

    const { paused: isPaused, setPaused: doSetPaused } = useUiStore.getState();
    const shouldPause = newEntries.some(
      (e) => (e.priority === "red" && autoPause.red) || (e.priority === "amber" && autoPause.amber),
    );
    if (shouldPause && !isPaused) {
      doSetPaused(true);
    }

    setEntries((prev) => [...newEntries, ...prev].slice(0, MAX_ENTRIES));
  }, [snapshot, autoPause]);

  return (
    <>
      {/* Always-visible PAUSED indicator, regardless of feed open state */}
      {paused && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 16,
            background: "#220",
            border: "1px solid #440",
            color: "#fa4",
            fontFamily: "monospace",
            fontSize: 12,
            padding: "4px 10px",
            zIndex: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: "bold" }}>⏸ PAUSED</span>
          <button
            type="button"
            onClick={() => setPaused(false)}
            style={{
              background: "#1a2840",
              border: "1px solid #449",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            ▶ Resume
          </button>
        </div>
      )}
      {/* Collapsible feed panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: paused ? 84 : 44,
            right: 16,
            width: 260,
            maxHeight: 320,
            background: "#0a1830",
            border: "1px solid #224",
            color: "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 11,
            zIndex: 12,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {entries.length === 0 && (
              <div style={{ padding: "6px 8px", color: "#446" }}>No events yet</div>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                style={{ padding: "2px 8px", borderBottom: "1px solid #112", display: "flex", gap: 6 }}
              >
                <span style={{ color: PRIORITY_COLORS[e.priority], flexShrink: 0 }}>●</span>
                <span style={{ flex: 1 }}>{e.label}</span>
                <span style={{ color: "#445", flexShrink: 0 }}>T{e.tick}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid #224",
              padding: "4px 8px",
              display: "flex",
              gap: 6,
              fontSize: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setAutoPause((p) => ({ ...p, red: !p.red }))}
              style={{
                background: autoPause.red ? "#2a0a0a" : "#1a2840",
                border: `1px solid ${autoPause.red ? "#f44" : "#449"}`,
                color: autoPause.red ? "#f44" : "#c8d8ff",
                fontFamily: "monospace",
                fontSize: 10,
                padding: "2px 5px",
                cursor: "pointer",
              }}
            >
              ⏸ Red
            </button>
            <button
              type="button"
              onClick={() => setAutoPause((p) => ({ ...p, amber: !p.amber }))}
              style={{
                background: autoPause.amber ? "#1a1200" : "#1a2840",
                border: `1px solid ${autoPause.amber ? "#fa4" : "#449"}`,
                color: autoPause.amber ? "#fa4" : "#c8d8ff",
                fontFamily: "monospace",
                fontSize: 10,
                padding: "2px 5px",
                cursor: "pointer",
              }}
            >
              ⏸ Amber
            </button>
            <button
              type="button"
              onClick={() => setEntries([])}
              style={{
                marginLeft: "auto",
                background: "#1a2840",
                border: "1px solid #449",
                color: "#667",
                fontFamily: "monospace",
                fontSize: 10,
                padding: "2px 5px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
