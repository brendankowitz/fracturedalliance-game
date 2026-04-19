import { getAllBlueprintDefs } from "@fa/content";
import type { BlueprintDiscipline } from "@fa/domain";
import type { Command } from "@fa/sim";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

const DISCIPLINES: BlueprintDiscipline[] = ["mining", "infrastructure", "military", "science", "commerce"];
const DISCIPLINE_LABELS: Record<BlueprintDiscipline, string> = {
  mining: "Mining",
  infrastructure: "Infrastructure",
  military: "Military",
  science: "Science",
  commerce: "Commerce",
};

const allBlueprints = getAllBlueprintDefs();

interface Props {
  onCommand: (cmd: Command) => void;
}

export function BlueprintShop({ onCommand }: Props) {
  const open = useUiStore((s) => s.blueprintShopOpen);
  const snapshot = useGameStore((s) => s.snapshot);
  const [activeDiscipline, setActiveDiscipline] = useState<BlueprintDiscipline>("mining");

  if (!open || !snapshot) return null;

  const owned = new Set(snapshot.blueprintsOwned);
  const disciplineBlueprints = allBlueprints
    .filter((b) => b.discipline === activeDiscipline)
    .sort((a, b) => a.tier - b.tier);

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 16,
        width: 340,
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 13,
        zIndex: 20,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 10, fontSize: 14 }}>Research & Blueprints</div>
      {/* Discipline tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setActiveDiscipline(d)}
            style={{
              background: activeDiscipline === d ? "#1a3060" : "#060e20",
              border: `1px solid ${activeDiscipline === d ? "#c8d8ff" : "#224"}`,
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 11,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {DISCIPLINE_LABELS[d]}
          </button>
        ))}
      </div>
      {/* Blueprint list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {disciplineBlueprints.map((bp, i) => {
          const isOwned = owned.has(bp.id);
          const prereqMet = bp.prerequisiteId === null || owned.has(bp.prerequisiteId);
          const canAfford = snapshot.credits >= bp.costCredits;
          const canBuy = !isOwned && prereqMet && canAfford;

          // Prerequisite chain arrow
          const prevBp = i > 0 ? disciplineBlueprints[i - 1] : null;

          return (
            <div key={bp.id}>
              {prevBp && (
                <div style={{ color: "#446", fontSize: 11, marginBottom: 2, paddingLeft: 8 }}>↓</div>
              )}
              <div
                style={{
                  border: `1px solid ${isOwned ? "#2a5" : prereqMet ? "#224" : "#111"}`,
                  background: isOwned ? "#061a0c" : "#060e20",
                  padding: "8px 10px",
                  opacity: !prereqMet ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: "bold", color: isOwned ? "#4d8" : "#c8d8ff" }}>
                      T{bp.tier} {bp.label}
                    </div>
                    <div style={{ color: "#7090b0", fontSize: 11, marginTop: 2 }}>{bp.description}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70, marginLeft: 8 }}>
                    {isOwned ? (
                      <span style={{ color: "#4d8", fontSize: 12 }}>OWNED</span>
                    ) : (
                      <>
                        <div style={{ color: canAfford ? "#c8d8ff" : "#866", fontSize: 12 }}>
                          ₡{bp.costCredits.toLocaleString()}
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
