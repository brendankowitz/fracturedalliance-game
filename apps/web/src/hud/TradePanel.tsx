import type { AsteroidId, OreKind } from "@fa/domain";
import { ALL_ORES } from "@fa/domain";
import type { Command } from "@fa/sim";
import { TICKS_PER_SIM_DAY } from "@fa/sim";
import { isV2Snapshot } from "@fa/sim-adapter";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

interface Props {
  onCommand: (cmd: Command) => void;
}

const TRADE_QUANTITY = 10;

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 72,
  right: 16,
  width: 320,
  maxHeight: "75vh",
  overflowY: "auto",
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-data)",
  fontSize: 13,
  zIndex: 20,
  padding: 12,
};

const qtyButtonStyle = (enabled: boolean): React.CSSProperties => ({
  background: enabled ? "#1a3060" : "#111",
  border: "1px solid #224",
  color: enabled ? "#c8d8ff" : "#446",
  fontFamily: "monospace",
  fontSize: 10,
  padding: "2px 5px",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
});

/**
 * V2 (adopted sim): a per-colony ore ledger. Selling queues a Federal
 * Transporter order drained on the transporter cadence — the timing IS the
 * decision; there is no spot sale. The legacy sim (?sim=v1) keeps the old
 * global instant-sale table below.
 */
export function TradePanel({ onCommand }: Props) {
  const open = useUiStore((s) => s.tradePanelOpen);
  const snapshot = useGameStore((s) => s.snapshot);

  if (!open || !snapshot) return null;

  if (!isV2Snapshot(snapshot)) {
    return <LegacyTradePanel onCommand={onCommand} />;
  }

  const colonies = snapshot.asteroids.filter((a) => a.ownerId === snapshot.humanPlayerId);
  const daysToDrain = Math.max(
    0,
    Math.ceil((snapshot.transporterNextTick - snapshot.tick) / TICKS_PER_SIM_DAY),
  );

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>
        Ore Ledger
        <HelpTip text="Ore is stockpiled on each colony. Queue sell orders; the Federal Transporter collects and pays when it docks." />
      </div>

      <div style={{ marginBottom: 8, fontSize: 12, color: "#7090b0" }}>
        Credits:{" "}
        <span style={{ color: "#c8d8ff", fontWeight: "bold" }}>
          &#x20a1;{Math.floor(snapshot.credits).toLocaleString()}
        </span>
        <span style={{ marginLeft: 10, color: "var(--amber)" }}>
          Transporter{daysToDrain === 0 ? " docking now" : ` in ${daysToDrain}d`}
        </span>
      </div>

      {snapshot.queuedOrders.length > 0 && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 8px",
            border: "1px solid var(--border)",
            background: "rgba(255,146,0,0.06)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 4 }}>
            QUEUED FOR TRANSPORTER
          </div>
          {snapshot.queuedOrders.map((o, i) => {
            const colonyName =
              snapshot.asteroids.find((a) => a.id === o.asteroidId)?.name ?? o.asteroidId;
            return (
              <div
                key={`${o.side}-${o.ore}-${i}`}
                style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ textTransform: "capitalize" }}>
                  {o.side} {o.tonnes}t {o.ore}
                </span>
                <span style={{ color: "#7090b0" }}>{colonyName}</span>
              </div>
            );
          })}
        </div>
      )}

      {colonies.map((colony) => {
        const stocks = snapshot.colonyExtras[colony.id]?.stocks.ores ?? {};
        const oresHere = ALL_ORES.filter((ore) => (stocks[ore] ?? 0) >= 1);
        return (
          <div key={colony.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: "var(--text-hi)",
                borderBottom: "1px solid #224",
                paddingBottom: 3,
                marginBottom: 4,
              }}
            >
              {colony.name}
              <span style={{ color: "#7090b0", fontWeight: "normal", marginLeft: 8 }}>
                pop {Math.floor(snapshot.colonyExtras[colony.id]?.population ?? 0)}
              </span>
            </div>
            {oresHere.length === 0 ? (
              <div style={{ fontSize: 11, color: "#668" }}>No ore stockpiled.</div>
            ) : (
              oresHere.map((oreKind) => {
                const stock = Math.floor(stocks[oreKind] ?? 0);
                const price = snapshot.marketPrices[oreKind] ?? 0;
                return (
                  <div
                    key={oreKind}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "4px 8px",
                      alignItems: "center",
                      padding: "3px 0",
                      borderBottom: "1px solid #112",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, textTransform: "capitalize" }}>{oreKind}</span>
                      <span style={{ fontSize: 10, color: "#7090b0", marginLeft: 6 }}>
                        {stock}t
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11 }}>
                      &#x20a1;{price.toFixed(0)}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        disabled={stock < 1}
                        onClick={() =>
                          onCommand({
                            kind: "sellOre",
                            oreKind,
                            quantity: Math.min(TRADE_QUANTITY, stock),
                            asteroidId: colony.id as AsteroidId,
                          })
                        }
                        style={qtyButtonStyle(stock >= 1)}
                      >
                        Queue {Math.min(TRADE_QUANTITY, stock)}
                      </button>
                      <button
                        type="button"
                        disabled={stock < 1}
                        onClick={() =>
                          onCommand({
                            kind: "sellOre",
                            oreKind,
                            quantity: stock,
                            asteroidId: colony.id as AsteroidId,
                          })
                        }
                        style={qtyButtonStyle(stock >= 1)}
                      >
                        All
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: "#668", marginTop: 4 }}>
        Orders settle at market price &#177;5% when the transporter docks.
      </div>
    </div>
  );
}

/** Legacy global instant-sale table — reachable only via ?sim=v1. */
function LegacyTradePanel({ onCommand }: Props) {
  const snapshot = useGameStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>
        Ore Market
        <HelpTip text="Trade ore with passing transporters. Prices vary by supply, demand, and race." />
      </div>

      <div style={{ marginBottom: 10, fontSize: 12, color: "#7090b0" }}>
        Credits:{" "}
        <span style={{ color: "#c8d8ff", fontWeight: "bold" }}>
          &#x20a1;{snapshot.credits.toLocaleString()}
        </span>
      </div>

      {ALL_ORES.map((oreKind: OreKind) => {
        const price = snapshot.marketPrices[oreKind] ?? 0;
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
            <div style={{ textAlign: "right", fontSize: 12 }}>&#x20a1;{price.toLocaleString()}</div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                disabled={!canSell}
                onClick={() => onCommand({ kind: "sellOre", oreKind, quantity: TRADE_QUANTITY })}
                style={qtyButtonStyle(canSell)}
              >
                Sell {TRADE_QUANTITY}
              </button>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => onCommand({ kind: "buyOre", oreKind, quantity: TRADE_QUANTITY })}
                style={qtyButtonStyle(canBuy)}
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
