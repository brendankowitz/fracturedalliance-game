import { getAllBlueprintDefs } from "@fa/content";
import type { BlueprintDiscipline } from "@fa/domain";
import type { Command } from "@fa/sim";
import { TICKS_PER_SIM_DAY } from "@fa/sim";
import type { HudSnapshotV2 } from "@fa/sim-adapter";
import { BLUEPRINT_CATALOG, BLUEPRINT_DISCIPLINES, isV2Snapshot } from "@fa/sim-adapter";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

interface Props {
  onCommand: (cmd: Command) => void;
}

const shellStyle: React.CSSProperties = {
  position: "absolute",
  top: 72,
  right: 16,
  width: 340,
  maxHeight: "80vh",
  overflowY: "auto",
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-data)",
  fontSize: 13,
  zIndex: 20,
  padding: 12,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#1a3060" : "#060e20",
  border: `1px solid ${active ? "#c8d8ff" : "#224"}`,
  color: "#c8d8ff",
  fontFamily: "monospace",
  fontSize: 11,
  padding: "3px 8px",
  cursor: "pointer",
  textTransform: "capitalize",
});

export function BlueprintShop({ onCommand }: Props) {
  const open = useUiStore((s) => s.blueprintShopOpen);
  const snapshot = useGameStore((s) => s.snapshot);

  if (!open || !snapshot) return null;
  if (isV2Snapshot(snapshot)) return <SciTekShop snapshot={snapshot} onCommand={onCommand} />;
  return <LegacyBlueprintShop onCommand={onCommand} />;
}

/**
 * V2 (adopted sim): the Sci-Tek storefront over the vendored catalogue.
 * Buying starts timed research (one active project at a time); tiered
 * prerequisites gate the deeper entries.
 */
function SciTekShop({ snapshot, onCommand }: Props & { snapshot: HudSnapshotV2 }) {
  const [discipline, setDiscipline] = useState<string>(BLUEPRINT_DISCIPLINES[0] ?? "extraction");
  const owned = new Set(snapshot.blueprintsOwned);
  const active = snapshot.researchInProgress;
  const entries = BLUEPRINT_CATALOG.filter((b) => b.discipline === discipline).sort(
    (a, b) => a.tier - b.tier || a.costCredits - b.costCredits,
  );

  return (
    <div style={shellStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 6, fontSize: 14 }}>
        Sci-Tek Blueprints
        <HelpTip text="Buy blueprints in any order — deeper tiers need their prerequisites. Research takes time; one project runs at a time." />
      </div>

      {active && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 8px",
            border: "1px solid var(--border-act)",
            fontSize: 11,
          }}
        >
          <div style={{ color: "var(--accent)" }}>
            RESEARCHING:{" "}
            {BLUEPRINT_CATALOG.find((b) => b.id === active.blueprintId)?.label ??
              active.blueprintId}
          </div>
          <div style={{ color: "#7090b0", marginTop: 2 }}>
            {Math.round((1 - active.remainingTicks / Math.max(1, active.totalTicks)) * 100)}% —{" "}
            {Math.ceil(active.remainingTicks / TICKS_PER_SIM_DAY)}d remaining
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {BLUEPRINT_DISCIPLINES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDiscipline(d)}
            style={tabStyle(discipline === d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((bp) => {
          const isOwned = owned.has(bp.id);
          const isActive = active?.blueprintId === bp.id;
          const prereqMet = bp.requires.every((r) => owned.has(r));
          const canAfford = snapshot.credits >= bp.costCredits;
          const canBuy = !isOwned && !isActive && prereqMet && canAfford && !active;

          return (
            <div
              key={bp.id}
              style={{
                border: `1px solid ${isOwned ? "#2a5" : prereqMet ? "#224" : "#111"}`,
                background: isOwned ? "#061a0c" : "#060e20",
                padding: "8px 10px",
                opacity: prereqMet || isOwned ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: isOwned ? "#4d8" : "#c8d8ff" }}>
                    T{bp.tier} {bp.label}
                  </div>
                  <div style={{ color: "#7090b0", fontSize: 11, marginTop: 2 }}>
                    {bp.description}
                  </div>
                  {!prereqMet && (
                    <div style={{ color: "#866", fontSize: 10, marginTop: 2 }}>
                      Requires:{" "}
                      {bp.requires
                        .filter((r) => !owned.has(r))
                        .map((r) => BLUEPRINT_CATALOG.find((c) => c.id === r)?.label ?? r)
                        .join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", minWidth: 76, marginLeft: 8 }}>
                  {isOwned ? (
                    <span style={{ color: "#4d8", fontSize: 12 }}>OWNED</span>
                  ) : isActive ? (
                    <span style={{ color: "var(--accent)", fontSize: 12 }}>IN PROGRESS</span>
                  ) : (
                    <>
                      <div style={{ color: canAfford ? "#c8d8ff" : "#866", fontSize: 12 }}>
                        &#x20a1;{bp.costCredits.toLocaleString()}
                      </div>
                      <div style={{ color: "#668", fontSize: 10 }}>
                        {Math.ceil(bp.researchTimeTicks / TICKS_PER_SIM_DAY)}d
                      </div>
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => onCommand({ kind: "buyBlueprint", blueprintId: bp.id })}
                        style={{
                          marginTop: 4,
                          background: canBuy ? "#1a3060" : "#111",
                          border: "1px solid #224",
                          color: canBuy ? "#c8d8ff" : "#446",
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: "2px 8px",
                          cursor: canBuy ? "pointer" : "not-allowed",
                        }}
                      >
                        {!prereqMet ? "LOCKED" : active ? "BUSY" : canBuy ? "Research" : "Funds"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Legacy shop (reachable only via ?sim=v1) ────────────────────────────────

const LEGACY_DISCIPLINES: BlueprintDiscipline[] = [
  "mining",
  "infrastructure",
  "military",
  "science",
  "commerce",
];
const LEGACY_DISCIPLINE_LABELS: Record<BlueprintDiscipline, string> = {
  mining: "Mining",
  infrastructure: "Infrastructure",
  military: "Military",
  science: "Science",
  commerce: "Commerce",
};

const legacyBlueprints = getAllBlueprintDefs();

function LegacyBlueprintShop({ onCommand }: Props) {
  const snapshot = useGameStore((s) => s.snapshot);
  const [activeDiscipline, setActiveDiscipline] = useState<BlueprintDiscipline>("mining");

  if (!snapshot) return null;

  const owned = new Set(snapshot.blueprintsOwned);
  const disciplineBlueprints = legacyBlueprints
    .filter((b) => b.discipline === activeDiscipline)
    .sort((a, b) => a.tier - b.tier);

  return (
    <div style={shellStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 10, fontSize: 14 }}>
        Research & Blueprints
        <HelpTip text="Purchase blueprints to unlock advanced buildings and ships. Tier-2 requires a tier-1 first." />
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {LEGACY_DISCIPLINES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setActiveDiscipline(d)}
            style={tabStyle(activeDiscipline === d)}
          >
            {LEGACY_DISCIPLINE_LABELS[d]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {disciplineBlueprints.map((bp, i) => {
          const isOwned = owned.has(bp.id);
          const prereqMet = bp.prerequisiteId === null || owned.has(bp.prerequisiteId);
          const canAfford = snapshot.credits >= bp.costCredits;
          const canBuy = !isOwned && prereqMet && canAfford;
          const prevBp = i > 0 ? disciplineBlueprints[i - 1] : null;

          return (
            <div key={bp.id}>
              {prevBp && (
                <div style={{ color: "#446", fontSize: 11, marginBottom: 2, paddingLeft: 8 }}>
                  ↓
                </div>
              )}
              <div
                style={{
                  border: `1px solid ${isOwned ? "#2a5" : prereqMet ? "#224" : "#111"}`,
                  background: isOwned ? "#061a0c" : "#060e20",
                  padding: "8px 10px",
                  opacity: !prereqMet ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", color: isOwned ? "#4d8" : "#c8d8ff" }}>
                      T{bp.tier} {bp.label}
                    </div>
                    <div style={{ color: "#7090b0", fontSize: 11, marginTop: 2 }}>
                      {bp.description}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70, marginLeft: 8 }}>
                    {isOwned ? (
                      <span style={{ color: "#4d8", fontSize: 12 }}>OWNED</span>
                    ) : (
                      <>
                        <div style={{ color: canAfford ? "#c8d8ff" : "#866", fontSize: 12 }}>
                          &#x20a1;{bp.costCredits.toLocaleString()}
                        </div>
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => onCommand({ kind: "buyBlueprint", blueprintId: bp.id })}
                          style={{
                            marginTop: 4,
                            background: canBuy ? "#1a3060" : "#111",
                            border: "1px solid #224",
                            color: canBuy ? "#c8d8ff" : "#446",
                            fontFamily: "monospace",
                            fontSize: 11,
                            padding: "2px 8px",
                            cursor: canBuy ? "pointer" : "not-allowed",
                          }}
                        >
                          {!prereqMet ? "LOCKED" : canBuy ? "Research" : "Funds"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
