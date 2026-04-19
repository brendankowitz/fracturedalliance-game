import { findBuildingDef, getOreDef, getRaceDef } from "@fa/content";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

function formatKind(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function AsteroidInspector() {
  const selectedId = useUiStore((s) => s.selectedAsteroidId);
  const selectAsteroid = useUiStore((s) => s.selectAsteroid);
  const snapshot = useGameStore((s) => s.snapshot);

  if (!selectedId || !snapshot) return null;

  const asteroid = snapshot.asteroids.find((a) => a.id === selectedId);
  if (!asteroid) return null;

  const ownerPlayer = snapshot.players.find((p) => p.id === asteroid.ownerId);
  const ownerName = ownerPlayer
    ? (getRaceDef(ownerPlayer.raceId)?.name ?? ownerPlayer.raceId)
    : "Unclaimed";

  const deposits = Object.entries(asteroid.deposits)
    .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
    .sort(([, a], [, b]) => b - a);

  const shipsHere = snapshot.ships.filter(
    (s) =>
      Math.hypot(s.position.x - asteroid.sector.x, s.position.y - asteroid.sector.y) < 1.0,
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        right: 16,
        width: 220,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 11,
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid #224",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", fontSize: 12 }}>{asteroid.name}</div>
          <div style={{ color: "#8af", fontSize: 10 }}>
            {ownerName} · {asteroid.sizeClass}
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectAsteroid(null)}
          style={{
            background: "none",
            border: "none",
            color: "#667",
            fontFamily: "monospace",
            fontSize: 14,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{ padding: "4px 8px", borderBottom: "1px solid #112", fontSize: 10, color: "#8af" }}
      >
        <span>Stability: {Math.round(asteroid.stability * 100)}%</span>
        {" · "}
        <span>Happiness: {Math.round(asteroid.happiness * 100)}%</span>
        {" · "}
        <span>
          Power: {asteroid.powerBalance >= 0 ? "+" : ""}
          {asteroid.powerBalance}
        </span>
      </div>

      {deposits.length > 0 && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 2 }}>Deposits</div>
          {deposits.map(([kind, amount]) => {
            const label = getOreDef(kind)?.label ?? formatKind(kind);
            return (
              <div key={kind} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#aaa" }}>{label}</span>
                <span>{amount.toLocaleString()}</span>
              </div>
            );
          })}
        </section>
      )}

      {asteroid.buildingKinds.length > 0 && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 2 }}>
            Buildings ({asteroid.buildingKinds.length})
          </div>
          {asteroid.buildingKinds.map((kind, i) => {
            const label = findBuildingDef(kind)?.label ?? formatKind(kind);
            return (
              <div key={`${kind}-${i}`} style={{ color: "#aaa" }}>
                {label}
              </div>
            );
          })}
        </section>
      )}

      {asteroid.buildQueue.length > 0 && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 2 }}>
            Build Queue ({asteroid.buildQueue.length})
          </div>
          {asteroid.buildQueue.map((item, i) => {
            const pct =
              item.totalTicks > 0
                ? Math.round((item.progressTicks / item.totalTicks) * 100)
                : 0;
            const label = findBuildingDef(item.buildingKind)?.label ?? formatKind(item.buildingKind);
            return (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ color: "#aaa" }}>{label}</div>
                <div
                  style={{
                    height: 4,
                    background: "#112",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "#4af",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div style={{ color: "#667", fontSize: 9 }}>{pct}%</div>
              </div>
            );
          })}
        </section>
      )}

      <section style={{ padding: "4px 8px" }}>
        <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 2 }}>
          Ships at location: {shipsHere.length}
        </div>
        {shipsHere.map((s) => (
          <div key={s.id} style={{ color: "#aaa" }}>
            {formatKind(s.defKind)} ({s.orderKind})
          </div>
        ))}
        {shipsHere.length === 0 && <div style={{ color: "#445" }}>None</div>}
      </section>
    </div>
  );
}
