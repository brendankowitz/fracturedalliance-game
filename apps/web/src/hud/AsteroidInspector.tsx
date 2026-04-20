import { findBuildingDef, getOreDef, getRaceDef } from "@fa/content";
import { SIZE_CLASS_GRID, asteroidId as mkAsteroidId } from "@fa/domain";
import type { Command } from "@fa/sim";
import { ARRIVAL_RADIUS } from "@fa/sim";
import { BuildTemplates } from "./BuildTemplates.tsx";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

function formatKind(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

interface AsteroidInspectorProps {
  onCommand: (cmd: Command) => void;
}

export function AsteroidInspector({ onCommand }: AsteroidInspectorProps) {
  const selectedId = useUiStore((s) => s.selectedAsteroidId);
  const selectAsteroid = useUiStore((s) => s.selectAsteroid);
  const selectCell = useUiStore((s) => s.selectCell);
  const toggleBuildingPanel = useUiStore((s) => s.toggleBuildingPanel);
  const selectedCell = useUiStore((s) => s.selectedCell);
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
      Math.hypot(s.position.x - asteroid.sector.x, s.position.y - asteroid.sector.y) <= ARRIVAL_RADIUS,
  );

  const isOwnedByHuman = asteroid.ownerId === snapshot.humanPlayerId;

  const gridDims =
    (SIZE_CLASS_GRID as Record<string, { width: number; height: number }>)[asteroid.sizeClass] ??
    { width: 7, height: 7 };

  const occupiedCells = new Map<string, string>(
    asteroid.buildingsGrid.map((b) => [`${b.cell.x},${b.cell.y}`, b.kind]),
  );

  const { engines } = asteroid;

  const otherAsteroids = snapshot.asteroids.filter((a) => a.id !== asteroid.id);

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

      {isOwnedByHuman && (
        <section style={{ padding: "6px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 4, fontSize: 10 }}>
            Surface Grid ({gridDims.width}×{gridDims.height})
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridDims.width}, 1fr)`,
              gap: 2,
            }}
          >
            {Array.from({ length: gridDims.height }, (_, y) =>
              Array.from({ length: gridDims.width }, (_, x) => {
                const key = `${x},${y}`;
                const building = occupiedCells.get(key);
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                return (
                  <button
                    key={key}
                    type="button"
                    title={building ? formatKind(building) : `Cell (${x},${y})`}
                    aria-label={building ? formatKind(building) : `Empty cell ${x},${y}`}
                    onClick={() => {
                      selectCell({ x, y });
                      if (!building) {
                        const bpOpen = useUiStore.getState().buildingPanelOpen;
                        if (!bpOpen) toggleBuildingPanel();
                      }
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      background: building
                        ? "#1a3860"
                        : isSelected
                          ? "#2a4870"
                          : "#0a1420",
                      border: `1px solid ${isSelected ? "#4488cc" : building ? "#336" : "#1a2840"}`,
                      color: building ? "#c8d8ff" : "#334",
                      fontFamily: "monospace",
                      fontSize: 7,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {building ? building.slice(0, 2).toUpperCase() : ""}
                  </button>
                );
              }),
            )}
          </div>
          {selectedCell && (
            <div style={{ fontSize: 9, color: "#667", marginTop: 2 }}>
              Selected: ({selectedCell.x},{selectedCell.y}){" "}
              {occupiedCells.get(`${selectedCell.x},${selectedCell.y}`) ? "— occupied" : "— empty"}
            </div>
          )}
        </section>
      )}

      {asteroid.buildingsGrid.length > 0 && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 2 }}>
            Buildings ({asteroid.buildingsGrid.length})
          </div>
          {asteroid.buildingsGrid.map((b, i) => {
            const label = findBuildingDef(b.kind)?.label ?? formatKind(b.kind);
            return (
              <div key={`${b.kind}-${i}`} style={{ color: "#aaa" }}>
                {label} ({b.cell.x},{b.cell.y})
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
              <div key={`${item.buildingKind}-${item.queuedAt}`} style={{ marginBottom: 4 }}>
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

      {isOwnedByHuman && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <BuildTemplates
            currentQueue={asteroid.buildQueue.map((q) => q.buildingKind)}
            onApplyTemplate={(buildings) => {
              const occupied = new Set(
                asteroid.buildingsGrid.map((b) => `${b.cell.x},${b.cell.y}`),
              );
              let placed = 0;
              outer: for (const buildingKind of buildings) {
                for (let y = 0; y < gridDims.height; y++) {
                  for (let x = 0; x < gridDims.width; x++) {
                    const key = `${x},${y}`;
                    if (!occupied.has(key)) {
                      occupied.add(key);
                      onCommand({ kind: "placeBuilding", asteroidId: asteroid.id, buildingKind, cell: { x, y } });
                      placed++;
                      continue outer;
                    }
                  }
                }
                break;
              }
            }}
          />
        </section>
      )}

      {isOwnedByHuman && engines.count > 0 && (
        <section style={{ padding: "4px 8px", borderBottom: "1px solid #112" }}>
          <div style={{ fontWeight: "bold", color: "#c8d8ff", marginBottom: 4 }}>
            Engines ({engines.count})
          </div>
          {engines.chargeTick !== null && engines.etaTick === null && (
            <div>
              <div style={{ color: "#fa4", fontSize: 10, marginBottom: 4 }}>
                Charging... (fires at tick {engines.chargeTick})
              </div>
              <button
                type="button"
                onClick={() =>
                  onCommand({ kind: "cancelAsteroidEngine", asteroidId: asteroid.id })
                }
                style={{
                  background: "#1a1830",
                  border: "1px solid #442",
                  color: "#fa4",
                  fontFamily: "monospace",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: "2px 8px",
                }}
              >
                Cancel
              </button>
            </div>
          )}
          {engines.etaTick !== null && (
            <div style={{ color: "#4af", fontSize: 10 }}>
              In transit... (arrives tick {engines.etaTick})
            </div>
          )}
          {engines.chargeTick === null && engines.etaTick === null && (
            <EngineTargetSelector
              asteroidId={asteroid.id}
              otherAsteroids={otherAsteroids.map((a) => ({ id: a.id, name: a.name }))}
              onCommand={onCommand}
            />
          )}
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

interface EngineTargetSelectorProps {
  asteroidId: string;
  otherAsteroids: Array<{ id: string; name: string }>;
  onCommand: (cmd: Command) => void;
}

function EngineTargetSelector({ asteroidId, otherAsteroids, onCommand }: EngineTargetSelectorProps) {
  const handleLaunch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const select = form.elements.namedItem("destination") as HTMLSelectElement;
    const raw = select.value;
    if (!raw) return;
    onCommand({
      kind: "setAsteroidDestination",
      asteroidId,
      destinationId: mkAsteroidId(raw),
    });
  };

  return (
    <form onSubmit={handleLaunch} style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select
        name="destination"
        defaultValue=""
        style={{
          background: "#0a1830",
          border: "1px solid #224",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 10,
          flex: 1,
        }}
      >
        <option value="" disabled>
          Select target...
        </option>
        {otherAsteroids.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        style={{
          background: "#1a1830",
          border: "1px solid #224",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 10,
          cursor: "pointer",
          padding: "2px 8px",
        }}
      >
        Launch
      </button>
    </form>
  );
}
