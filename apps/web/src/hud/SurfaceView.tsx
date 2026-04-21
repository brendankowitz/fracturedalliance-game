import { findBuildingDef, getAllBuildingDefs, getAllShipDefs, getOreDef, getRaceDef } from "@fa/content";
import { SIZE_CLASS_GRID, asteroidId as mkAsteroidId, shipId as mkShipId } from "@fa/domain";
import type { Command } from "@fa/sim";
import { ARRIVAL_RADIUS } from "@fa/sim";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { BuildTemplates } from "./BuildTemplates.tsx";

interface SurfaceViewProps {
  onCommand: (cmd: Command) => void;
}

function formatKind(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

const BUILDING_COLORS: Record<string, string> = {
  airProcessor: "#0d2240",
  cpu: "#0d1a40",
  powerPlant: "#2a2000",
  fusionReactor: "#2a2000",
  geothermalTap: "#2a2000",
  ecc: "#1a0d30",
  radiationFilter: "#001a1a",
  repairFacility: "#1a1a00",
  mineMk1: "#2a1000",
  mineMk2: "#2a1000",
  deepBoreMine: "#3a1500",
  oreRefinery: "#3a1000",
  crystalSeparator: "#2a0a20",
  naniteExtractor: "#1a0030",
  astralMiner: "#1a0020",
  antimatterDrill: "#200010",
  shipYard: "#002020",
  turretBattery: "#200010",
  shieldGenerator: "#001020",
  missileSilo: "#200010",
  commandCentre: "#101a20",
  ionCannon: "#200015",
  antimatterMine: "#250010",
  fortressWall: "#202020",
  doomsdayDevice: "#300000",
  livingQuarters: "#001820",
  resiblock: "#001520",
  megaHabitat: "#001a28",
  arcology: "#00202a",
  hydroponics: "#002000",
  advHydroponics: "#003000",
  hydrationPlant: "#001a2a",
  medicalCentre: "#001a15",
  pleasureDome: "#1a0a20",
  securityCentre: "#1a1000",
  storageTower: "#101010",
  tradingPost: "#0a1a10",
  blackMarket: "#100010",
  smugglerBay: "#100015",
  pricingOffice: "#0a1510",
  federationLobby: "#0a0a1a",
  creditMint: "#1a1500",
  monopolyOffice: "#1a1000",
  galacticExchange: "#150a10",
  researchLab: "#001a25",
  computingArray: "#001520",
  xenologyLab: "#001a20",
  materialsSynth: "#0a1020",
  quantumProcessor: "#0a0a20",
  warpResearch: "#00001a",
  bioResearchLab: "#001510",
  omniscienceNode: "#000a15",
  biosphereDome: "#002010",
  recyclingCentre: "#0a1000",
  gravityPlating: "#101500",
  gravityNullifier: "#151000",
  atmosphericCondenser: "#001520",
};

const BUILDING_ICON: Record<string, string> = {
  airProcessor: "/assets/buildings/airProc.png",
  cpu: "/assets/buildings/cpu.png",
  powerPlant: "/assets/buildings/plant.png",
  fusionReactor: "/assets/buildings/fusion.png",
  geothermalTap: "/assets/buildings/volcanicTap.png",
  ecc: "/assets/buildings/cpu.png",
  radiationFilter: "/assets/buildings/airProc.png",
  repairFacility: "/assets/buildings/medBay.png",
  mineMk1: "/assets/buildings/mine.png",
  mineMk2: "/assets/buildings/mine.png",
  deepBoreMine: "/assets/buildings/deepBore.png",
  oreRefinery: "/assets/buildings/refinery.png",
  crystalSeparator: "/assets/buildings/refinery.png",
  naniteExtractor: "/assets/buildings/nanoExtract.png",
  astralMiner: "/assets/buildings/quantumDrill.png",
  antimatterDrill: "/assets/buildings/antimatter.png",
  shipYard: "/assets/buildings/shipyard.png",
  turretBattery: "/assets/buildings/laser.png",
  shieldGenerator: "/assets/buildings/solar.png",
  missileSilo: "/assets/buildings/missile.png",
  commandCentre: "/assets/buildings/assault.png",
  ionCannon: "/assets/buildings/laser.png",
  antimatterMine: "/assets/buildings/antimatter.png",
  fortressWall: "/assets/buildings/assault.png",
  doomsdayDevice: "/assets/buildings/planetKiller.png",
  livingQuarters: "/assets/buildings/quarters.png",
  resiblock: "/assets/buildings/resiblock.png",
  megaHabitat: "/assets/buildings/arcology.png",
  arcology: "/assets/buildings/arcology.png",
  hydroponics: "/assets/buildings/hydro.png",
  advHydroponics: "/assets/buildings/hydro.png",
  hydrationPlant: "/assets/buildings/hydrate.png",
  medicalCentre: "/assets/buildings/medBay.png",
  pleasureDome: "/assets/buildings/spa.png",
  securityCentre: "/assets/buildings/assault.png",
  storageTower: "/assets/buildings/storage.png",
  tradingPost: "/assets/buildings/market.png",
  blackMarket: "/assets/buildings/market.png",
  smugglerBay: "/assets/buildings/tradeFleet.png",
  pricingOffice: "/assets/buildings/market.png",
  federationLobby: "/assets/buildings/megaport.png",
  creditMint: "/assets/buildings/bank.png",
  monopolyOffice: "/assets/buildings/monopoly.png",
  galacticExchange: "/assets/buildings/stockExchange.png",
  researchLab: "/assets/buildings/seismicProbe.png",
  computingArray: "/assets/buildings/cpu.png",
  xenologyLab: "/assets/buildings/seismicProbe.png",
  materialsSynth: "/assets/buildings/refinery.png",
  quantumProcessor: "/assets/buildings/quantumDrill.png",
  warpResearch: "/assets/buildings/zeroPoint.png",
  bioResearchLab: "/assets/buildings/seismicProbe.png",
  omniscienceNode: "/assets/buildings/zeroPoint.png",
  biosphereDome: "/assets/buildings/arcology.png",
  recyclingCentre: "/assets/buildings/refinery.png",
  gravityPlating: "/assets/buildings/gravityNullifier.png",
  gravityNullifier: "/assets/buildings/gravityNullifier.png",
  atmosphericCondenser: "/assets/buildings/airProc.png",
};

const BUILDING_ABBR: Record<string, string> = {
  airProcessor: "AP",
  cpu: "CP",
  powerPlant: "PP",
  fusionReactor: "FR",
  geothermalTap: "GT",
  ecc: "EC",
  radiationFilter: "RF",
  repairFacility: "RP",
  mineMk1: "M1",
  mineMk2: "M2",
  deepBoreMine: "DM",
  oreRefinery: "OR",
  crystalSeparator: "CS",
  naniteExtractor: "NE",
  astralMiner: "AM",
  antimatterDrill: "AD",
  shipYard: "SY",
  turretBattery: "TB",
  shieldGenerator: "SG",
  missileSilo: "MS",
  commandCentre: "CC",
  ionCannon: "IC",
  antimatterMine: "AX",
  fortressWall: "FW",
  doomsdayDevice: "DD",
  livingQuarters: "LQ",
  resiblock: "RB",
  megaHabitat: "MH",
  arcology: "AC",
  hydroponics: "HY",
  advHydroponics: "AH",
  hydrationPlant: "HP",
  medicalCentre: "MC",
  pleasureDome: "PD",
  securityCentre: "SC",
  storageTower: "ST",
  tradingPost: "TP",
  blackMarket: "BM",
  smugglerBay: "SB",
  pricingOffice: "PO",
  federationLobby: "FL",
  creditMint: "CM",
  monopolyOffice: "MO",
  galacticExchange: "GE",
  researchLab: "RL",
  computingArray: "CA",
  xenologyLab: "XL",
  materialsSynth: "SY",
  quantumProcessor: "QP",
  warpResearch: "WR",
  bioResearchLab: "BR",
  omniscienceNode: "ON",
  biosphereDome: "BD",
  recyclingCentre: "RC",
  gravityPlating: "GP",
  gravityNullifier: "GN",
  atmosphericCondenser: "AC",
};

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
      asteroidId: mkAsteroidId(asteroidId),
      destinationId: mkAsteroidId(raw),
    });
  };

  return (
    <form onSubmit={handleLaunch} style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select
        name="destination"
        defaultValue=""
        style={{
          background: "#0a1830",
          border: "1px solid #224",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 11,
          flex: 1,
          padding: "2px 4px",
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
          border: "1px solid #446",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 11,
          cursor: "pointer",
          padding: "3px 10px",
        }}
      >
        Launch
      </button>
    </form>
  );
}

export function SurfaceView({ onCommand }: SurfaceViewProps) {
  // All hooks must be at the top — no hooks after early returns
  const selectedId = useUiStore((s) => s.selectedAsteroidId);
  const selectAsteroid = useUiStore((s) => s.selectAsteroid);
  const selectedCell = useUiStore((s) => s.selectedCell);
  const selectCell = useUiStore((s) => s.selectCell);
  const autoHireBudgets = useUiStore((s) => s.autoHireBudgets);
  const setAutoHireBudget = useUiStore((s) => s.setAutoHireBudget);
  const snapshot = useGameStore((s) => s.snapshot);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [orderingShipId, setOrderingShipId] = useState<string | null>(null);
  const [shipOrderTarget, setShipOrderTarget] = useState<string>("");
  const [missileTarget, setMissileTarget] = useState<string>("");

  if (!selectedId || !snapshot) return null;

  const asteroid = snapshot.asteroids.find((a) => a.id === selectedId);
  if (!asteroid) return null;

  const ownerPlayer = snapshot.players.find((p) => p.id === asteroid.ownerId);
  const ownerName = ownerPlayer
    ? (getRaceDef(ownerPlayer.raceId)?.name ?? ownerPlayer.raceId)
    : "Unclaimed";

  const isOwnedByHuman = asteroid.ownerId === snapshot.humanPlayerId;

  const gridDims =
    (SIZE_CLASS_GRID as Record<string, { width: number; height: number }>)[asteroid.sizeClass] ??
    { width: 7, height: 7 };

  const CELL_SIZE = Math.min(56, Math.floor(300 / gridDims.width));

  const occupiedCells = new Map<string, string>(
    asteroid.buildingsGrid.map((b) => [`${b.cell.x},${b.cell.y}`, b.kind]),
  );

  const deposits = Object.entries(asteroid.deposits)
    .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
    .sort(([, a], [, b]) => b - a);

  const shipsHere = snapshot.ships.filter(
    (s) =>
      Math.hypot(s.position.x - asteroid.sector.x, s.position.y - asteroid.sector.y) <=
      ARRIVAL_RADIUS,
  );

  const blueprintsOwned = new Set(snapshot.blueprintsOwned);
  const allBuildingDefs = getAllBuildingDefs();
  const otherAsteroids = snapshot.asteroids.filter((a) => a.id !== asteroid.id);

  const selectedCellKey = selectedCell ? `${selectedCell.x},${selectedCell.y}` : null;
  const selectedCellBuilding = selectedCellKey ? (occupiedCells.get(selectedCellKey) ?? null) : null;

  if (!isOwnedByHuman) {
    const ownerReputation =
      snapshot.diplomacy.find((d) => d.playerId === asteroid.ownerId)?.reputation ?? null;
    const humanShips = snapshot.ships.filter((s) => s.ownerId === snapshot.humanPlayerId);
    return (
      <AsteroidIntelPanel
        asteroidId={asteroid.id}
        asteroidName={asteroid.name}
        sector={asteroid.sector}
        ownerName={ownerName}
        ownerRaceId={ownerPlayer?.raceId ?? null}
        ownerReputation={ownerReputation}
        sizeClass={asteroid.sizeClass}
        gridDims={gridDims}
        deposits={deposits}
        shipsHere={shipsHere}
        buildingsGrid={asteroid.buildingsGrid}
        humanPlayerId={snapshot.humanPlayerId}
        humanShips={humanShips}
        incomingMissile={asteroid.incomingMissile}
        onCommand={onCommand}
        onClose={() => { selectAsteroid(null); }}
      />
    );
  }

  // ── Layout constants ────────────────────────────────────────────────────────

  const PANEL_STYLE: React.CSSProperties = {
    position: "absolute",
    top: 72,
    right: 0,
    bottom: 0,
    width: 560,
    zIndex: 20,
    overflowY: "auto",
    background: "var(--bg-panel)",
    backdropFilter: "blur(4px)",
    borderLeft: "1px solid var(--border)",
    fontFamily: "var(--font-data)",
    color: "var(--text)",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={PANEL_STYLE}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,8,20,0.6)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => { selectAsteroid(null); }}
          style={{
            background: "#0a1830",
            border: "1px solid #336",
            color: "#8899bb",
            fontFamily: "monospace",
            fontSize: 11,
            cursor: "pointer",
            padding: "3px 8px",
            whiteSpace: "nowrap",
          }}
        >
          ← Back to Map
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: "#e0eeff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {asteroid.name}
          </div>
          <div style={{ color: "#8899bb", fontSize: 11 }}>
            {ownerName}
            <span style={{ color: "#445566", marginInline: 4 }}>·</span>
            Class {asteroid.sizeClass}
            <span style={{ color: "#445566", marginInline: 4 }}>·</span>
            {gridDims.width}×{gridDims.height} grid
          </div>
        </div>
        {isOwnedByHuman && (
          <div style={{ color: "#44aa66", fontSize: 10, border: "1px solid #224", padding: "2px 6px" }}>
            OWNED
          </div>
        )}
      </div>

      {/* ── Incoming missile warning ── */}
      {asteroid.incomingMissile !== null && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(200,40,20,0.15)",
          border: "1px solid #cc3322",
          color: "#ff6655",
          fontFamily: "var(--font-data)",
          fontSize: 11,
          flexShrink: 0,
          letterSpacing: 0.5,
        }}>
          ⚠ INCOMING MISSILE — ETA tick {asteroid.incomingMissile.arrivalTick}
        </div>
      )}

      {/* ── Stats row ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "6px 12px",
          borderBottom: "1px solid #224",
          background: "rgba(0,5,15,0.4)",
          flexShrink: 0,
        }}
      >
        <StatPill label="Stability" value={`${Math.round(asteroid.stability * 100)}%`} />
        <StatPill label="Happiness" value={`${Math.round(asteroid.happiness * 100)}%`} />
        <StatPill
          label="Power"
          value={`${asteroid.powerBalance >= 0 ? "+" : ""}${asteroid.powerBalance}`}
          valueColor={asteroid.powerBalance >= 0 ? "#44cc88" : "#cc4444"}
        />
        <StatPill label="Build Queue" value={String(asteroid.buildQueue.length)} />
      </div>

      {/* ── Build queue progress ── */}
      {asteroid.buildQueue.length > 0 && (
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid #112",
            background: "rgba(0,5,15,0.3)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, color: "#8899bb", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
            Build Queue
          </div>
          {asteroid.buildQueue.map((item, i) => {
            const pct =
              item.totalTicks > 0
                ? Math.round((item.progressTicks / item.totalTicks) * 100)
                : 0;
            const label =
              findBuildingDef(item.buildingKind)?.label ?? formatKind(item.buildingKind);
            return (
              <div key={`${item.buildingKind}-${i}`} style={{ marginBottom: 5 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: "#c8d8ff" }}>{label}</span>
                  <span style={{ color: "#667" }}>{pct}%</span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: "#0a1428",
                    border: "1px solid #224",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "#2266aa",
                      borderRadius: 2,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Two-column body ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ── Left: Surface grid ── */}
        <div
          style={{
            flex: "0 0 auto",
            padding: "10px 10px 10px 12px",
            borderRight: "1px solid #1a2840",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1 }}>
            Surface
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridDims.width}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${gridDims.height}, ${CELL_SIZE}px)`,
              gap: 2,
            }}
          >
            {Array.from({ length: gridDims.height }, (_, y) =>
              Array.from({ length: gridDims.width }, (_, x) => {
                const key = `${x},${y}`;
                const buildingKind = occupiedCells.get(key);
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                const abbr = buildingKind
                  ? (BUILDING_ABBR[buildingKind] ?? buildingKind.slice(0, 2).toUpperCase())
                  : "";
                const bgColor = buildingKind
                  ? (BUILDING_COLORS[buildingKind] ?? "#122030")
                  : isSelected
                    ? "#0e2038"
                    : isHovered
                      ? "#0c1c30"
                      : "#0a1420";
                const borderColor = isSelected
                  ? "#4488cc"
                  : buildingKind
                    ? "#2a4060"
                    : "#1a2840";

                return (
                  <button
                    key={key}
                    type="button"
                    title={
                      buildingKind
                        ? (findBuildingDef(buildingKind)?.label ?? formatKind(buildingKind))
                        : `Cell (${x},${y})`
                    }
                    aria-label={
                      buildingKind
                        ? `${findBuildingDef(buildingKind)?.label ?? formatKind(buildingKind)} at ${x},${y}`
                        : `Empty cell ${x},${y}`
                    }
                    onClick={() => { selectCell({ x, y }); }}
                    onMouseEnter={() => { setHoveredCell({ x, y }); }}
                    onMouseLeave={() => { setHoveredCell(null); }}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      color: buildingKind ? "#c8d8ff" : "#334466",
                      fontFamily: "monospace",
                      fontSize: CELL_SIZE >= 40 ? 10 : 7,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      lineHeight: 1.1,
                      outline: isSelected ? "2px solid #4488cc" : "none",
                      outlineOffset: -2,
                    }}
                  >
                    {buildingKind && (
                      <>
                        {BUILDING_ICON[buildingKind] ? (
                          <img
                            src={BUILDING_ICON[buildingKind]}
                            alt={abbr}
                            style={{ width: CELL_SIZE >= 40 ? CELL_SIZE - 12 : CELL_SIZE - 6, height: CELL_SIZE >= 40 ? CELL_SIZE - 12 : CELL_SIZE - 6, objectFit: "contain", imageRendering: "pixelated" }}
                          />
                        ) : (
                          <span style={{ fontSize: CELL_SIZE >= 40 ? 12 : 8, fontWeight: "bold", color: "var(--text-hi)" }}>
                            {abbr}
                          </span>
                        )}
                      </>
                    )}
                    {!buildingKind && isOwnedByHuman && (
                      <span style={{ fontSize: CELL_SIZE >= 40 ? 16 : 10, color: "rgba(0,196,224,0.25)", lineHeight: 1 }}>+</span>
                    )}
                    {!buildingKind && !isOwnedByHuman && CELL_SIZE >= 40 && (
                      <span style={{ fontSize: 8, color: "var(--text-lo)" }}>{x},{y}</span>
                    )}
                  </button>
                );
              }),
            )}
          </div>
          {selectedCell && (
            <div style={{ fontSize: 10, color: "#8899bb", marginTop: 2 }}>
              Selected: ({selectedCell.x},{selectedCell.y})
              {" — "}
              {selectedCellBuilding
                ? (findBuildingDef(selectedCellBuilding)?.label ?? formatKind(selectedCellBuilding))
                : "empty"}
            </div>
          )}
        </div>

        {/* ── Right: Info column ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Deposits */}
          {deposits.length > 0 && (
            <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Ore Deposits
              </div>
              {deposits.map(([kind, amount]) => {
                const label = getOreDef(kind)?.label ?? formatKind(kind);
                return (
                  <div
                    key={kind}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: "#8899bb" }}>{label}</span>
                    <span style={{ color: "#c8d8ff" }}>{amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </section>
          )}

          {/* Ships present */}
          <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Ships Present ({shipsHere.length})
            </div>
            {shipsHere.length === 0 ? (
              <div style={{ color: "#445566", fontSize: 11 }}>None</div>
            ) : (
              shipsHere.map((s) => {
                const isHuman = s.ownerId === snapshot.humanPlayerId;
                const isOrdering = orderingShipId === s.id;
                return (
                  <div key={s.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{ color: isHuman ? "#6af" : "#aabbcc", flex: 1 }}>
                        {formatKind(s.defKind)}
                      </span>
                      <span style={{ color: "#445566", fontSize: 10 }}>{s.orderKind}</span>
                      {isHuman && (
                        <button
                          type="button"
                          onClick={() => { setOrderingShipId(isOrdering ? null : s.id); setShipOrderTarget(""); }}
                          style={{
                            background: isOrdering ? "#1a2840" : "#0a1428",
                            border: `1px solid ${isOrdering ? "#4488cc" : "#224"}`,
                            color: "#8ac8ff",
                            fontFamily: "monospace",
                            fontSize: 10,
                            cursor: "pointer",
                            padding: "2px 7px",
                          }}
                        >
                          {isOrdering ? "✕" : "Order"}
                        </button>
                      )}
                    </div>
                    {isHuman && isOrdering && (
                      <div style={{ marginTop: 4, padding: "6px 8px", background: "#060e1c", border: "1px solid #224", display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => { onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "idle" } }); setOrderingShipId(null); }}
                            style={{ background: "#0a1428", border: "1px solid #224", color: "#aabbcc", fontFamily: "monospace", fontSize: 10, cursor: "pointer", padding: "2px 8px" }}
                          >
                            Idle
                          </button>
                          <button
                            type="button"
                            onClick={() => { onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "defend", target: mkAsteroidId(asteroid.id) } }); setOrderingShipId(null); }}
                            style={{ background: "#0a1428", border: "1px solid #224", color: "#aabbcc", fontFamily: "monospace", fontSize: 10, cursor: "pointer", padding: "2px 8px" }}
                          >
                            Defend Here
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <select
                            value={shipOrderTarget}
                            onChange={(e) => setShipOrderTarget(e.target.value)}
                            style={{ background: "#0a1428", border: "1px solid #224", color: "#c8d8ff", fontFamily: "monospace", fontSize: 10, flex: 1, padding: "2px 4px" }}
                          >
                            <option value="" disabled>Target asteroid...</option>
                            {otherAsteroids.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!shipOrderTarget}
                            onClick={() => {
                              const tgt = snapshot.asteroids.find((a) => a.id === shipOrderTarget);
                              if (!tgt) return;
                              onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "scout", target: tgt.sector } });
                              setOrderingShipId(null);
                            }}
                            style={{ background: "#0a1428", border: "1px solid #224", color: shipOrderTarget ? "#aabbcc" : "#334", fontFamily: "monospace", fontSize: 10, cursor: shipOrderTarget ? "pointer" : "default", padding: "2px 8px" }}
                          >
                            Scout
                          </button>
                          <button
                            type="button"
                            disabled={!shipOrderTarget}
                            onClick={() => {
                              if (!shipOrderTarget) return;
                              onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "attackAsteroid", target: mkAsteroidId(shipOrderTarget) } });
                              setOrderingShipId(null);
                            }}
                            style={{ background: "#0a1428", border: "1px solid #224", color: shipOrderTarget ? "#ff6655" : "#334", fontFamily: "monospace", fontSize: 10, cursor: shipOrderTarget ? "pointer" : "default", padding: "2px 8px" }}
                          >
                            Attack
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* Ship Bay (human-owned only) */}
          {isOwnedByHuman && (() => {
            const hasShipYard = asteroid.buildingsGrid.some((b) => b.kind === "shipYard");
            const shipDefs = getAllShipDefs();
            return (
              <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Ship Bay
                </div>
                {!hasShipYard ? (
                  <div style={{ color: "#445566", fontSize: 11 }}>Build a Ship Yard to launch ships from this asteroid.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {shipDefs.map((def) => (
                      <button
                        key={def.kind}
                        type="button"
                        onClick={() => onCommand({ kind: "launchShip", asteroidId: mkAsteroidId(asteroid.id), shipKind: def.kind })}
                        style={{
                          background: "#0a1428",
                          border: "1px solid #224466",
                          color: "#c8d8ff",
                          fontFamily: "monospace",
                          fontSize: 11,
                          cursor: "pointer",
                          padding: "5px 8px",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>⬡ {def.label}</span>
                        <span style={{ color: "#8899bb", fontSize: 10 }}>{def.costCredits.toLocaleString()}¢ · {def.buildTimeTicks}t</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Missile Bay (human-owned only, silo present) */}
          {isOwnedByHuman && asteroid.buildingsGrid.some((b) => b.kind === "missileSilo") && (
            <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Missile Bay
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={missileTarget}
                  onChange={(e) => setMissileTarget(e.target.value)}
                  style={{ background: "#0a1428", border: "1px solid #224", color: "#c8d8ff", fontFamily: "monospace", fontSize: 11, flex: 1, padding: "2px 4px" }}
                >
                  <option value="" disabled>Select target...</option>
                  {otherAsteroids.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!missileTarget}
                  onClick={() => {
                    if (!missileTarget) return;
                    onCommand({ kind: "fireMissile", sourceAsteroidId: mkAsteroidId(asteroid.id), targetAsteroidId: mkAsteroidId(missileTarget) });
                    setMissileTarget("");
                  }}
                  style={{
                    background: missileTarget ? "#200a0a" : "#0a0a14",
                    border: `1px solid ${missileTarget ? "#662222" : "#222"}`,
                    color: missileTarget ? "#ff6655" : "#334",
                    fontFamily: "monospace",
                    fontSize: 11,
                    cursor: missileTarget ? "pointer" : "default",
                    padding: "4px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  🚀 Fire (2,000¢)
                </button>
              </div>
            </section>
          )}

          {/* Engines (human-owned only) */}
          {isOwnedByHuman && asteroid.engines.count > 0 && (
            <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Engines ({asteroid.engines.count})
              </div>
              {asteroid.engines.chargeTick !== null && asteroid.engines.etaTick === null && (
                <div>
                  <div style={{ color: "#ffaa44", fontSize: 11, marginBottom: 6 }}>
                    Charging... (fires at tick {asteroid.engines.chargeTick})
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onCommand({ kind: "cancelAsteroidEngine", asteroidId: asteroid.id })
                    }
                    style={{
                      background: "#1a1030",
                      border: "1px solid #442",
                      color: "#ffaa44",
                      fontFamily: "monospace",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: "3px 10px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {asteroid.engines.etaTick !== null && (
                <div style={{ color: "#44aaff", fontSize: 11 }}>
                  In transit... (arrives tick {asteroid.engines.etaTick})
                </div>
              )}
              {asteroid.engines.chargeTick === null && asteroid.engines.etaTick === null && (
                <EngineTargetSelector
                  asteroidId={asteroid.id}
                  otherAsteroids={otherAsteroids.map((a) => ({ id: a.id, name: a.name }))}
                  onCommand={onCommand}
                />
              )}
            </section>
          )}

          {/* Build templates (human-owned only) */}
          {isOwnedByHuman && (
            <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Build Templates
              </div>
              <BuildTemplates
                currentQueue={asteroid.buildQueue.map((q) => q.buildingKind)}
                onApplyTemplate={(buildings) => {
                  const occupied = new Set(
                    asteroid.buildingsGrid.map((b) => `${b.cell.x},${b.cell.y}`),
                  );
                  outer: for (const buildingKind of buildings) {
                    for (let y = 0; y < gridDims.height; y++) {
                      for (let x = 0; x < gridDims.width; x++) {
                        const key = `${x},${y}`;
                        if (!occupied.has(key)) {
                          occupied.add(key);
                          onCommand({ kind: "placeBuilding", asteroidId: asteroid.id, buildingKind, cell: { x, y } });
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

          {/* Auto-hire (human-owned only) */}
          {isOwnedByHuman && (
            <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Workforce
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--text-hi)",
                  cursor: "pointer",
                  marginBottom: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={(autoHireBudgets[asteroid.id] ?? 0) > 0}
                  onChange={(e) => setAutoHireBudget(asteroid.id, e.target.checked ? 2000 : 0)}
                  style={{ cursor: "pointer" }}
                />
                Auto-hire workers
              </label>
              {(autoHireBudgets[asteroid.id] ?? 0) > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="range"
                    min={500}
                    max={20000}
                    step={500}
                    value={autoHireBudgets[asteroid.id]}
                    onChange={(e) => setAutoHireBudget(asteroid.id, Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 10, color: "var(--text-lo)", minWidth: 46, fontFamily: "var(--font-data)" }}>
                    {((autoHireBudgets[asteroid.id] ?? 0) / 1000).toFixed(1)}k¢
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Buildings list */}
          {asteroid.buildingsGrid.length > 0 && (
            <section style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Installed ({asteroid.buildingsGrid.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {asteroid.buildingsGrid.map((b, i) => {
                  const label = findBuildingDef(b.kind)?.label ?? formatKind(b.kind);
                  return (
                    <div
                      key={`${b.kind}-${i}`}
                      style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
                    >
                      <span style={{ color: "#aabbcc" }}>{label}</span>
                      <span style={{ color: "#445566" }}>
                        ({b.cell.x},{b.cell.y})
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {isOwnedByHuman && selectedCell === null && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 12px",
          background: "rgba(0,196,224,0.04)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ color: "var(--accent)", fontSize: 14 }}>⬆</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-lo)" }}>
            Click any empty cell <span style={{ color: "var(--accent)" }}>+</span> on the grid above to place a building
          </span>
        </div>
      )}

      {/* ── Bottom: Build actions ── */}
      {selectedCell !== null && isOwnedByHuman && (
        <div
          style={{
            borderTop: "1px solid #224",
            padding: "10px 12px",
            background: "rgba(0,5,15,0.5)",
            flexShrink: 0,
          }}
        >
          {selectedCellBuilding ? (
            <div>
              <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Occupied — {findBuildingDef(selectedCellBuilding)?.label ?? formatKind(selectedCellBuilding)}
              </div>
              <div style={{ fontSize: 11, color: "#445566" }}>
                Cell ({selectedCell.x},{selectedCell.y}) is occupied. Select an empty cell to build.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: "var(--font-head)" }}>
                Build at cell ({selectedCell.x},{selectedCell.y})
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 5,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {allBuildingDefs.map((def) => {
                  const blueprintRequired = def.blueprintRequired;
                  const isLocked =
                    blueprintRequired != null && blueprintRequired !== ""
                      ? !blueprintsOwned.has(blueprintRequired)
                      : false;
                  return (
                    <button
                      key={def.kind}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked || selectedCell === null) return;
                        onCommand({
                          kind: "placeBuilding",
                          asteroidId: asteroid.id,
                          buildingKind: def.kind,
                          cell: selectedCell,
                        });
                      }}
                      style={{
                        background: isLocked ? "#08101e" : "#0a1828",
                        border: `1px solid ${isLocked ? "#1a2030" : "#224466"}`,
                        color: isLocked ? "#33445566" : "#c8d8ff",
                        fontFamily: "monospace",
                        fontSize: 10,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        padding: "5px 8px",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        opacity: isLocked ? 0.45 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {BUILDING_ICON[def.kind] && (
                          <img src={BUILDING_ICON[def.kind]} alt="" style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "pixelated", opacity: isLocked ? 0.3 : 0.9 }} />
                        )}
                        <span style={{ fontWeight: "bold", fontSize: 11, flex: 1, marginLeft: BUILDING_ICON[def.kind] ? 6 : 0 }}>{def.label}</span>
                        {isLocked && <span style={{ fontSize: 9, color: "#554466" }}>🔒</span>}
                      </div>
                      <span style={{ color: "#8899bb" }}>{def.costCredits.toLocaleString()} cr</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AsteroidIntelPanel helpers ───────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PORTRAIT_SETS = ["civpro", "matreKhan", "terran"] as const;

function getPortrait(raceId: string, reputation: number): string {
  const set = PORTRAIT_SETS[hashStr(raceId) % 3];
  const mood = reputation <= -10 ? "hostile" : "neutral";
  return `/assets/portraits/${set}-${mood}.png`;
}

// ── AsteroidIntelPanel ───────────────────────────────────────────────────────

interface AsteroidIntelPanelProps {
  asteroidId: string;
  asteroidName: string;
  sector: { x: number; y: number };
  ownerName: string;
  ownerRaceId: string | null;
  ownerReputation: number | null;
  sizeClass: string;
  gridDims: { width: number; height: number };
  deposits: Array<[string, number]>;
  shipsHere: Array<{ id: string; defKind: string; ownerId: string; orderKind: string }>;
  buildingsGrid: Array<{ kind: string; cell: { x: number; y: number } }>;
  humanPlayerId: string;
  humanShips: Array<{ id: string; defKind: string; orderKind: string }>;
  incomingMissile: { arrivalTick: number } | null;
  onCommand: (cmd: Command) => void;
  onClose: () => void;
}

function AsteroidIntelPanel({
  asteroidId,
  asteroidName,
  sector,
  ownerName,
  ownerRaceId,
  ownerReputation,
  sizeClass,
  gridDims,
  deposits,
  shipsHere,
  buildingsGrid,
  humanPlayerId,
  humanShips,
  incomingMissile,
  onCommand,
  onClose,
}: AsteroidIntelPanelProps) {
  const idleAssault = humanShips.filter((s) => s.defKind === "assaultCraft" && s.orderKind === "idle");
  const allScouts = humanShips.filter((s) => s.defKind === "scout");
  const repColor =
    ownerReputation === null
      ? "var(--text)"
      : ownerReputation >= 20
        ? "var(--green)"
        : ownerReputation <= -20
          ? "var(--red)"
          : "var(--amber)";

  const repBarWidth =
    ownerReputation !== null
      ? `${Math.max(0, Math.min(100, (ownerReputation + 100) / 2))}%`
      : "0%";

  const isUnclaimed = ownerRaceId === null;

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        right: 0,
        bottom: 0,
        width: 320,
        zIndex: 20,
        overflowY: "auto",
        background: "var(--bg-panel)",
        backdropFilter: "blur(4px)",
        borderLeft: "1px solid var(--border)",
        fontFamily: "var(--font-data)",
        color: "var(--text)",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,8,20,0.6)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#0a1830",
            border: "1px solid #336",
            color: "#8899bb",
            fontFamily: "monospace",
            fontSize: 11,
            cursor: "pointer",
            padding: "3px 8px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          ← Map
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: "bold",
              fontSize: 14,
              fontFamily: "var(--font-head, Orbitron, monospace)",
              color: "var(--text-hi)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {asteroidName}
          </div>
          <div style={{ color: "var(--text-lo)", fontSize: 11, marginTop: 2 }}>
            Class {sizeClass} · {gridDims.width}×{gridDims.height}
          </div>
        </div>
        {!isUnclaimed && ownerRaceId !== null && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <img
              src={getPortrait(ownerRaceId, ownerReputation ?? 0)}
              alt={ownerName}
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                border: "1px solid var(--border)",
                objectFit: "cover",
              }}
            />
            <div style={{ color: "var(--text-lo)", fontSize: 11, whiteSpace: "nowrap" }}>
              {ownerName}
            </div>
          </div>
        )}
        {isUnclaimed && (
          <div style={{ color: "var(--text-lo)", fontSize: 11, flexShrink: 0 }}>Unclaimed</div>
        )}
      </div>

      {/* ── Incoming missile warning ── */}
      {incomingMissile !== null && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(200,40,20,0.15)",
          border: "1px solid #cc3322",
          color: "#ff6655",
          fontFamily: "var(--font-data)",
          fontSize: 11,
          flexShrink: 0,
          letterSpacing: 0.5,
        }}>
          ⚠ INCOMING MISSILE — ETA tick {incomingMissile.arrivalTick}
        </div>
      )}

      {/* ── Reputation row ── */}
      {ownerReputation !== null && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--text-lo)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Reputation
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: repBarWidth,
                  height: "100%",
                  background: repColor,
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: repColor, fontWeight: "bold", minWidth: 32, textAlign: "right" }}>
              {ownerReputation > 0 ? "+" : ""}{ownerReputation}
            </span>
          </div>
        </div>
      )}

      {/* ── Ore Deposits ── */}
      <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-lo)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Ore Deposits
        </div>
        {deposits.length === 0 ? (
          <div style={{ color: "var(--text-lo)", fontSize: 11 }}>No detected deposits</div>
        ) : (
          deposits.map(([kind, amount]) => {
            const label = getOreDef(kind)?.label ?? formatKind(kind);
            return (
              <div
                key={kind}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 2,
                }}
              >
                <span style={{ color: "var(--text-lo)" }}>{label}</span>
                <span style={{ color: "var(--text-hi)" }}>{amount.toLocaleString()}</span>
              </div>
            );
          })
        )}
      </section>

      {/* ── Structures ── */}
      <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-lo)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Structures ({buildingsGrid.length})
        </div>
        {buildingsGrid.length === 0 ? (
          <div style={{ color: "var(--text-lo)", fontSize: 11 }}>No structures detected</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {buildingsGrid.map((b, i) => {
              const label = findBuildingDef(b.kind)?.label ?? formatKind(b.kind);
              const icon = BUILDING_ICON[b.kind];
              return (
                <div
                  key={`${b.kind}-${i}`}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      style={{
                        width: 20,
                        height: 20,
                        objectFit: "contain",
                        imageRendering: "pixelated",
                        opacity: 0.8,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{ width: 20, height: 20, flexShrink: 0 }} />
                  )}
                  <span style={{ color: "var(--text)", fontSize: 11 }}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Ships in area ── */}
      <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-lo)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Ships in Area ({shipsHere.length})
        </div>
        {shipsHere.length === 0 ? (
          <div style={{ color: "var(--text-lo)", fontSize: 11 }}>No ships in area</div>
        ) : (
          shipsHere.map((s) => (
            <div key={s.id} style={{ fontSize: 11, marginBottom: 2, color: "var(--text)" }}>
              {formatKind(s.defKind)}
              <span style={{ color: "var(--text-lo)", marginLeft: 6, fontSize: 10 }}>
                ({s.ownerId === humanPlayerId ? "Human" : "AI"})
              </span>
            </div>
          ))
        )}
      </section>

      {/* ── Scout / Attack actions ── */}
      {(isUnclaimed || !isUnclaimed) && (
        <section style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-lo)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            {isUnclaimed ? "Explore & Claim" : "Fleet Actions"}
          </div>

          {/* Scout dispatch */}
          {allScouts.length > 0 ? (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "var(--text-lo)", marginBottom: 4 }}>
                Send a Scout to this location:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {allScouts.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "scout", target: sector } })
                    }
                    style={{
                      background: "#0a1428",
                      border: "1px solid #224466",
                      color: "#6af",
                      fontFamily: "monospace",
                      fontSize: 10,
                      cursor: "pointer",
                      padding: "3px 8px",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>▶ Scout (ship {s.id.slice(-4)})</span>
                    <span style={{ color: "var(--text-lo)" }}>{s.orderKind}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-lo)", marginBottom: 6 }}>
              No scouts available — launch one from a Ship Yard.
            </div>
          )}

          {/* Attack dispatch (enemy asteroids) */}
          {!isUnclaimed && idleAssault.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "var(--text-lo)", marginBottom: 4 }}>
                Send Assault Craft:
              </div>
              {idleAssault.slice(0, 2).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onCommand({ kind: "orderShip", shipId: mkShipId(s.id), order: { kind: "attackAsteroid", target: mkAsteroidId(asteroidId) } })
                  }
                  style={{
                    background: "#200a0a",
                    border: "1px solid #442222",
                    color: "#ff6655",
                    fontFamily: "monospace",
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "3px 8px",
                    display: "block",
                    marginBottom: 3,
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  ⚔ Attack (ship {s.id.slice(-4)})
                </button>
              ))}
            </div>
          )}

          {/* Claim hint for unclaimed */}
          {isUnclaimed && (
            <div style={{ fontSize: 10, color: "var(--text-lo)", fontStyle: "italic", lineHeight: 1.5 }}>
              To claim this asteroid: hire an Espionage agent and assign a{" "}
              <span style={{ color: "var(--amber)" }}>Liberate</span> mission targeting this location.
            </div>
          )}
        </section>
      )}

      {/* ── Footer note ── */}
      <div style={{ padding: "10px 12px", marginTop: "auto", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "var(--text-lo)", fontStyle: "italic", lineHeight: 1.5 }}>
          Intel may be incomplete. Send scouts for full reconnaissance.
        </div>
      </div>
    </div>
  );
}

// ── StatPill ─────────────────────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatPill({ label, value, valueColor = "#c8d8ff" }: StatPillProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4px 0",
        borderRight: "1px solid #1a2840",
      }}
    >
      <span style={{ fontSize: 9, color: "#445566", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: valueColor, fontWeight: "bold" }}>{value}</span>
    </div>
  );
}
