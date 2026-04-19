import type { Command } from "@fa/sim";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

interface Props {
  onCommand: (cmd: Command) => void;
}

const TRADE_QUANTITY = 10;

export function TradePanel({ onCommand }: Props) {
  const open = useUiStore((s) => s.tradePanelOpen);
  const snapshot = useGameStore((s) => s.snapshot);

  if (!open || !snapshot) return null;

  const oreEntries = Object.entries(snapshot.marketPrices);

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 16,
        width: 300,
        maxHeight: "75vh",
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
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>Ore Market</div>

      <div style={{ marginBottom: 10, fontSize: 12, color: "#7090b0" }}>
        Credits:{" "}
        <span style={{ color: "#c8d8ff", fontWeight: "bold" }}>
          &#x20a1;{snapshot.credits.toLocaleString()}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "4px 8px",
          alignItems: "center",
          fontSize: 11,
          color: "#7090b0",
          marginBottom: 4,
          paddingBottom: 4,
          borderBottom: "1px solid #224",
        }}
      >
        <span>Ore</span>
        <span style={{ textAlign: "right" }}>Price/u</span>
        <span style={{ textAlign: "center" }}>Actions</span>
      </div>

      {oreEntries.map(([oreKind, price]) => {
        const stock = snapshot.oreInventory[oreKind] ?? 0;
        const canSell = stock >= TRADE_QUANTITY;
        const canBuy = snapshot.credits >= price * TRADE_QUANTITY;

        return (
          <div
            key={oreKind}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "4px 8px",
              alignItems: "center",
              marginBottom: 6,
              padding: "4px 0",
              borderBottom: "1px solid #112",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: "bold", textTransform: "capitalize" }}>
                {oreKind}
              </div>
              <div style={{ fontSize: 10, color: "#7090b0" }}>Stock: {stock}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12 }}>
              &#x20a1;{price.toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                disabled={!canSell}
                onClick={() => onCommand({ kind: "sellOre", oreKind, quantity: TRADE_QUANTITY })}
                style={{
                  background: canSell ? "#1a3060" : "#111",
                  border: "1px solid #224",
                  color: canSell ? "#c8d8ff" : "#446",
                  fontFamily: "monospace",
                  fontSize: 10,
                  padding: "2px 5px",
                  cursor: canSell ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                Sell {TRADE_QUANTITY}
              </button>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => onCommand({ kind: "buyOre", oreKind, quantity: TRADE_QUANTITY })}
                style={{
                  background: canBuy ? "#1a3060" : "#111",
                  border: "1px solid #224",
                  color: canBuy ? "#c8d8ff" : "#446",
                  fontFamily: "monospace",
                  fontSize: 10,
                  padding: "2px 5px",
                  cursor: canBuy ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                Buy {TRADE_QUANTITY}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
