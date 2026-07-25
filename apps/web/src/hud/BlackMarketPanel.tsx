import type { BlackMarketItemKind } from "@fa/domain";
import { playerId } from "@fa/domain";
import type { Command } from "@fa/sim";
import { useEffect, useState } from "react";
import { playSound, SFX } from "../audio.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

interface Props {
  onCommand: (cmd: Command) => void;
}

const ITEMS: Array<{ kind: BlackMarketItemKind; label: string; cost: number; desc: string }> = [
  { kind: "oreCache", label: "Ore Cache", cost: 800, desc: "+12 Selenium" },
  { kind: "stealth", label: "Stealth Package", cost: 2000, desc: "Recruit a free agent" },
  { kind: "sabotageKit", label: "Sabotage Kit", cost: 1500, desc: "+800 credits bounty" },
  { kind: "contraband", label: "Contraband", cost: 500, desc: "+5 Federation Standing" },
];

const BRIBE_AMOUNTS = [500, 1000, 2000] as const;

export function BlackMarketPanel({ onCommand }: Props) {
  const open = useUiStore((s) => s.blackMarketOpen);
  const snapshot = useGameStore((s) => s.snapshot);
  const [selectedBribeTarget, setSelectedBribeTarget] = useState("");
  const [bribeAmount, setBribeAmount] = useState<500 | 1000 | 2000>(500);

  useEffect(() => {
    if (open) playSound(SFX.blackMarket, 0.4);
  }, [open]);

  if (!open || !snapshot) return null;

  const maunaAlive = snapshot.players.some((p) => p.raceId === "mauna" && p.alive);
  const aiPlayers = snapshot.players.filter((p) => !p.isHuman && p.alive);
  const canBribe = !!selectedBribeTarget && snapshot.credits >= bribeAmount;

  const suspicionPct = Math.round(snapshot.suspicion);
  const suspicionColor = suspicionPct >= 80 ? "#f44" : suspicionPct >= 50 ? "#fa4" : "#4d8";

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        right: 16,
        width: 280,
        maxHeight: "75vh",
        overflowY: "auto",
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        fontFamily: "var(--font-data)",
        fontSize: 13,
        zIndex: 20,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>
        Black Market
        <HelpTip text="Purchase illegal goods from the black market. Each buy raises your suspicion level." />
      </div>

      <div style={{ marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: "#7090b0" }}>Suspicion: </span>
        <span style={{ color: suspicionColor, fontWeight: "bold" }}>{suspicionPct}%</span>
        <div
          style={{
            marginTop: 4,
            height: 4,
            background: "#112",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${suspicionPct}%`,
              background: suspicionColor,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {!maunaAlive ? (
        <div style={{ color: "#446", fontSize: 12, padding: "8px 0" }}>
          Black market unavailable (Mauna faction destroyed)
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "#7090b0", marginBottom: 6 }}>ITEMS</div>
          {ITEMS.map((item) => {
            const canAfford = snapshot.credits >= item.cost;
            return (
              <div
                key={item.kind}
                style={{
                  marginBottom: 6,
                  padding: "6px 8px",
                  border: "1px solid #224",
                  background: "#060e20",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 12 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "#7090b0" }}>{item.desc}</div>
                </div>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onCommand({ kind: "blackMarketBuy", itemKind: item.kind })}
                  style={{
                    background: canAfford ? "#1a3060" : "#111",
                    border: "1px solid #224",
                    color: canAfford ? "#c8d8ff" : "#446",
                    fontFamily: "monospace",
                    fontSize: 11,
                    padding: "2px 8px",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  {"\u20a1"}
                  {item.cost.toLocaleString()}
                </button>
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: "#7090b0", marginTop: 10, marginBottom: 6 }}>
            BRIBE OFFICIAL
          </div>
          <select
            value={selectedBribeTarget}
            onChange={(e) => setSelectedBribeTarget(e.target.value)}
            style={{
              background: "#0a1830",
              border: "1px solid #224",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 11,
              padding: "2px 4px",
              marginBottom: 6,
              width: "100%",
            }}
          >
            <option value="">Select faction…</option>
            {aiPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.raceId}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {BRIBE_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBribeAmount(amt)}
                style={{
                  flex: 1,
                  background: bribeAmount === amt ? "#1a3060" : "#060e20",
                  border: `1px solid ${bribeAmount === amt ? "#448" : "#224"}`,
                  color: "#c8d8ff",
                  fontFamily: "monospace",
                  fontSize: 11,
                  padding: "2px 0",
                  cursor: "pointer",
                }}
              >
                {"\u20a1"}
                {amt}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!canBribe}
            onClick={() => {
              if (!selectedBribeTarget) return;
              onCommand({
                kind: "bribeOfficial",
                targetPlayerId: playerId(selectedBribeTarget),
                credits: bribeAmount,
              });
            }}
            style={{
              width: "100%",
              background: canBribe ? "#1a3060" : "#111",
              border: "1px solid #224",
              color: canBribe ? "#c8d8ff" : "#446",
              fontFamily: "monospace",
              fontSize: 12,
              padding: "4px 0",
              cursor: canBribe ? "pointer" : "not-allowed",
            }}
          >
            Bribe
          </button>
        </>
      )}
    </div>
  );
}
