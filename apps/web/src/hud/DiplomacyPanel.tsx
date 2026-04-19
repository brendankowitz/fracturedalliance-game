import { getRaceDef } from "@fa/content";
import type { PlayerId } from "@fa/domain";
import type { Command, DiplomacyEntry, HudSnapshot } from "@fa/sim";
import { useUiStore } from "../store/uiStore.ts";

interface Props {
  snapshot: HudSnapshot;
  onCommand: (cmd: Command) => void;
}

function repLabel(reputation: number): string {
  if (reputation >= 20) return "Friendly";
  if (reputation <= -20) return "Hostile";
  return "Neutral";
}

function repSign(reputation: number): string {
  return reputation > 0 ? "+" : "";
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

  return (
    <div style={{ marginBottom: 10, borderBottom: "1px solid #224", paddingBottom: 8 }}>
      <div style={{ fontWeight: "bold" }}>{raceName}</div>
      <div style={{ fontSize: 11, color: "#8af" }}>
        Standing: {repLabel(entry.reputation)} ({repSign(entry.reputation)}
        {entry.reputation})
      </div>
      {entry.napActive ? (
        <div style={{ fontSize: 11, color: "#4f8" }}>
          NAP active — expires tick {entry.napExpiresTick ?? "?"}
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            onCommand({
              kind: "proposeTreaty",
              targetPlayerId: entry.playerId,
              treatyKind: "nonAggression",
            })
          }
          style={{
            marginTop: 4,
            background: "#1a2840",
            border: "1px solid #449",
            color: "#c8d8ff",
            fontFamily: "monospace",
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Propose NAP
        </button>
      )}
    </div>
  );
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
        width: 280,
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        padding: 12,
        zIndex: 12,
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
