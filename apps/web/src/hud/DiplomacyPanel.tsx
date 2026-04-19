import { getRaceDef } from "@fa/content";
import type { TreatyKind } from "@fa/domain";
import type { Command, DiplomacyEntry, HudSnapshot } from "@fa/sim";
import { useUiStore } from "../store/uiStore.ts";

const TREATY_LABELS: Record<TreatyKind, string> = {
  nonAggression: "Non-Aggression Pact",
  peace: "Peace Treaty",
  trade: "Trade Agreement",
  noCovert: "No-Covert Pact",
  openBorders: "Open Borders",
  defensivePact: "Defensive Pact",
  jointWar: "Joint War",
};

const ALL_PROPOSABLE: ReadonlyArray<TreatyKind> = [
  "nonAggression",
  "peace",
  "trade",
  "noCovert",
  "openBorders",
  "defensivePact",
  "jointWar",
];

function repLabel(reputation: number): string {
  if (reputation >= 20) return "Friendly";
  if (reputation <= -20) return "Hostile";
  return "Neutral";
}

function DiplomacyRow({
  entry,
  onCommand,
}: {
  entry: DiplomacyEntry;
  onCommand: (cmd: Command) => void;
}) {
  const raceDef = getRaceDef(entry.raceId);
  const raceName = raceDef?.name ?? entry.raceId;
  const activeKinds = new Set(entry.activeTreaties.map((t) => t.kind));

  return (
    <div style={{ marginBottom: 10, borderBottom: "1px solid #224", paddingBottom: 8 }}>
      <div style={{ fontWeight: "bold" }}>{raceName}</div>
      <div style={{ fontSize: 11, color: "#8af" }}>
        Rep: {repLabel(entry.reputation)} ({entry.reputation > 0 ? "+" : ""}
        {entry.reputation})
        {entry.grudgeScore > 0 && (
          <span style={{ color: "#f88", marginLeft: 8 }}>Grudge: {entry.grudgeScore}</span>
        )}
      </div>
      {entry.activeTreaties.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {entry.activeTreaties.map((t) => (
            <div key={t.kind} style={{ fontSize: 11, color: "#4f8" }}>
              ✓ {TREATY_LABELS[t.kind]}
              {t.expiresTick !== null ? ` (exp. ${t.expiresTick})` : " (permanent)"}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
        {ALL_PROPOSABLE.filter((k) => !activeKinds.has(k)).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() =>
              onCommand({ kind: "proposeTreaty", targetPlayerId: entry.playerId, treatyKind: k })
            }
            style={{
              background: "#1a2840",
              border: "1px solid #449",
              color: "#c8d8ff",
              fontFamily: "monospace",
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            + {TREATY_LABELS[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  snapshot: HudSnapshot;
  onCommand: (cmd: Command) => void;
}

export function DiplomacyPanel({ snapshot, onCommand }: Props) {
  const open = useUiStore((s) => s.diplomacyPanelOpen);
  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: 16,
        width: 300,
        maxHeight: "60vh",
        overflowY: "auto",
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        padding: 12,
        zIndex: 12,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>Diplomacy</div>
      {snapshot.diplomacy.length === 0 && <div style={{ color: "#667" }}>No AI factions</div>}
      {snapshot.diplomacy.map((entry) => (
        <DiplomacyRow key={entry.playerId} entry={entry} onCommand={onCommand} />
      ))}
    </div>
  );
}
