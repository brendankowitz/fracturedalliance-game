import { getAllOreDefs } from "@fa/content";
import type { OreKind, PlayerId } from "@fa/domain";
import type { Command, HudSnapshot } from "@fa/sim";
import { TICKS_PER_SIM_DAY } from "@fa/sim";
import { isV2Snapshot } from "@fa/sim-adapter";

interface TransporterPanelProps {
  snapshot: HudSnapshot;
  onCommand: (cmd: Command) => void;
}

/**
 * V2 (adopted sim): a top-centre status banner. The transporter collects
 * queued orders on its cadence — there is no docked instant-sale window, so
 * this shows the countdown and the outbound manifest instead of blocking
 * the map with a modal. Selling lives in the Ore Ledger (Trade panel).
 */
export function TransporterPanel({ snapshot, onCommand }: TransporterPanelProps) {
  if (isV2Snapshot(snapshot)) {
    const queued = snapshot.queuedOrders.filter((o) => o.side === "sell");
    const ticksLeft = snapshot.transporterNextTick - snapshot.tick;
    const docking = ticksLeft <= 600;
    if (!docking && queued.length === 0) return null;

    const daysLeft = Math.max(0, Math.ceil(ticksLeft / TICKS_PER_SIM_DAY));
    const tonnes = queued.reduce((s, o) => s + o.tonnes, 0);

    return (
      <div
        style={{
          position: "absolute",
          top: 46,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,8,20,0.92)",
          border: `1px solid ${docking ? "var(--amber)" : "var(--border)"}`,
          color: "var(--text)",
          fontFamily: "var(--font-data)",
          fontSize: 11,
          padding: "4px 14px",
          zIndex: 15,
          display: "flex",
          gap: 12,
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: docking ? "var(--amber)" : "#99bbdd" }}>
          {docking ? "⬢ FEDERAL TRANSPORTER DOCKING" : `⬡ Federal Transporter in ${daysLeft}d`}
        </span>
        {queued.length > 0 ? (
          <span style={{ color: "#aaffaa" }}>
            manifest: {tonnes}t across {queued.length} order{queued.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span style={{ color: "#668" }}>no orders queued — open Trade [T]</span>
        )}
      </div>
    );
  }

  return <LegacyTransporterModal snapshot={snapshot} onCommand={onCommand} />;
}

/** Legacy docked-sale modal — reachable only via ?sim=v1. */
function LegacyTransporterModal({ snapshot, onCommand }: TransporterPanelProps) {
  if (!snapshot.traderActive) return null;

  const oreDefs = getAllOreDefs();
  const sellableOres = oreDefs.filter((def) => (snapshot.oreInventory[def.kind] ?? 0) > 0);

  const handleSellOne = (kind: string) => {
    onCommand({
      kind: "sellOreToTrader",
      playerId: snapshot.humanPlayerId as PlayerId,
      oreKind: kind as OreKind,
    });
  };

  const handleSellAll = () => {
    for (const def of sellableOres) {
      onCommand({
        kind: "sellOreToTrader",
        playerId: snapshot.humanPlayerId as PlayerId,
        oreKind: def.kind as OreKind,
      });
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0,8,20,0.95)",
        border: "1px solid #445",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 13,
        padding: 16,
        minWidth: 280,
        zIndex: 20,
      }}
    >
      <div style={{ color: "#ffcc66", marginBottom: 10, fontSize: 14 }}>
        Federal Transporter Docked
      </div>
      {sellableOres.length === 0 ? (
        <div style={{ color: "#668" }}>No ore in inventory.</div>
      ) : (
        <>
          {sellableOres.map((def) => {
            const amount = Math.floor(snapshot.oreInventory[def.kind] ?? 0);
            const price = snapshot.marketPrices[def.kind] ?? def.basePrice;
            const earnings = Math.floor(amount * price * 0.7);
            return (
              <div
                key={def.kind}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <span style={{ color: "#99bbdd", minWidth: 90 }}>{def.label}</span>
                <span style={{ color: "#ffffff", minWidth: 60, textAlign: "right" }}>
                  {amount.toLocaleString()}
                </span>
                <span style={{ color: "#aaffaa", minWidth: 80, textAlign: "right" }}>
                  {earnings.toLocaleString()}¢
                </span>
                <button
                  type="button"
                  onClick={() => handleSellOne(def.kind)}
                  style={{
                    background: "#0a2040",
                    border: "1px solid #446",
                    color: "#c8d8ff",
                    padding: "2px 8px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  Sell
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleSellAll}
            style={{
              marginTop: 10,
              width: "100%",
              background: "#0a3060",
              border: "1px solid #446",
              color: "#c8d8ff",
              padding: "6px",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            Sell All Ore
          </button>
        </>
      )}
    </div>
  );
}
