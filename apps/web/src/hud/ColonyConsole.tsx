import type { AsteroidId } from "@fa/domain";
import type { AsteroidSnapshot, HudSnapshot } from "@fa/sim";
import type { ReactNode } from "react";
import { useBuildStore } from "../store/buildStore.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { BuildPalette } from "./BuildPalette.tsx";
import { ColonySwitcher } from "./ColonySwitcher.tsx";
import { ConsoleShell } from "./ConsoleShell.tsx";
import { type ConsoleTab, ConsoleTabs } from "./ConsoleTabs.tsx";
import { type ColonyStocks, VitalsBar } from "./VitalsBar.tsx";

/**
 * Composes the console chrome around whatever the HUD already renders.
 *
 * All the wiring lives here rather than in `HUD.tsx` so that landing this is a wrapper
 * element and nothing more — `HUD.tsx` is shared, and a large edit there would collide
 * with the panel rework happening in parallel.
 */

export interface ColonyConsoleProps {
  snapshot: HudSnapshot;
  children: ReactNode;
}

/**
 * Population and life-support stocks only exist on the adapter's richer snapshot. Read
 * them structurally rather than importing its type: this package must keep building
 * whichever simulation is wired in.
 */
interface ColonyExtras {
  population: number;
  stocks: { food: number; water: number; air: number };
}

function readColonyExtras(snapshot: HudSnapshot, asteroidId: string): ColonyExtras | null {
  const extras = (snapshot as { colonyExtras?: Record<string, ColonyExtras> }).colonyExtras;
  return extras?.[asteroidId] ?? null;
}

function StatusBar({
  snapshot,
  colony,
}: {
  snapshot: HudSnapshot;
  colony: AsteroidSnapshot | null;
}) {
  return (
    <>
      <span style={{ color: "#79c188" }}>● READY</span>
      <span>
        {colony
          ? `Viewing ${colony.name} · ${colony.sizeClass}-class`
          : "Select an asteroid to inspect"}
      </span>
      <span style={{ marginLeft: "auto" }}>SEED {snapshot.seed}</span>
      <span>DAY {snapshot.day}</span>
      <span style={{ color: snapshot.traderActive ? "#e8a04a" : "#556680" }}>
        {snapshot.traderActive ? "TRADER DOCKED" : "NO TRADER"}
      </span>
    </>
  );
}

export function ColonyConsole({ snapshot, children }: ColonyConsoleProps) {
  const selectedId = useUiStore((s) => s.selectedAsteroidId);
  const selectAsteroid = useUiStore((s) => s.selectAsteroid);
  const selectedCell = useUiStore((s) => s.selectedCell);
  const armedKind = useBuildStore((s) => s.armedKind);
  const armKind = useBuildStore((s) => s.armKind);

  const colony = snapshot.asteroids.find((a) => a.id === selectedId) ?? null;
  const ownColonies = snapshot.asteroids.filter((a) => a.ownerId === snapshot.humanPlayerId);
  const extras = colony ? readColonyExtras(snapshot, colony.id) : null;
  const stocks: ColonyStocks | null = extras ? extras.stocks : null;

  const tabs: ConsoleTab[] = [
    {
      id: "sector",
      label: "Sector",
      hint: "F2",
      active: selectedId === null,
      onSelect: () => {
        selectAsteroid(null);
      },
    },
    {
      id: "colony",
      label: "Colony",
      hint: "F3",
      active: selectedId !== null,
      onSelect: () => {
        const target = ownColonies[0];
        if (target) selectAsteroid(target.id);
      },
    },
    ...(
      [
        ["scitek", "Sci-Tek", "F4", "toggleBlueprintShop"],
        ["commerce", "Commerce", "F5", "toggleTradePanel"],
        ["diplomacy", "Diplomacy", "F6", "toggleDiplomacyPanel"],
        ["tactical", "Tactical", "F7", "toggleEspionagePanel"],
        ["blackcell", "Black Cell", "F8", "toggleBlackMarket"],
      ] as const
    ).map(([id, label, hint, action]) => ({
      id,
      label,
      hint,
      active: false,
      onSelect: () => {
        useUiStore.getState()[action]();
      },
    })),
  ];

  return (
    <ConsoleShell
      header={<ConsoleHeader snapshot={snapshot} />}
      tabs={<ConsoleTabs tabs={tabs} />}
      leftRail={
        <BuildPalette
          blueprintsOwned={new Set(snapshot.blueprintsOwned)}
          credits={snapshot.credits}
          canPlace={selectedCell !== null}
          selectedKind={armedKind}
          onSelectKind={armKind}
        />
      }
      rightRail={<BuildQueueRail colony={colony} />}
      viewportHeader={
        colony ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "6px 16px",
                borderBottom: "1px solid #12203a",
              }}
            >
              <ColonySwitcher
                colonies={ownColonies}
                currentId={colony.id}
                onSelect={(id: AsteroidId) => {
                  selectAsteroid(id);
                }}
                onBackToMap={() => {
                  selectAsteroid(null);
                }}
              />
            </div>
            <VitalsBar
              asteroid={colony}
              day={snapshot.day}
              worldKey={String(snapshot.seed)}
              population={extras ? extras.population : null}
              populationCap={null}
              stocks={stocks}
            />
          </>
        ) : null
      }
      footer={<StatusBar snapshot={snapshot} colony={colony} />}
    >
      {children}
    </ConsoleShell>
  );
}

function ConsoleHeader({ snapshot }: { snapshot: HudSnapshot }) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 40, padding: "0 14px", gap: 18 }}>
      <div style={{ lineHeight: 1.1 }}>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            color: "var(--accent)",
          }}
        >
          {"FRACTURED // ALLIANCE"}
        </div>
        <div
          style={{ fontFamily: "var(--font-ui)", fontSize: 8, color: "#556680", letterSpacing: 1 }}
        >
          HELION CORP · OPS CONSOLE
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
        <Reading label="Fed-Stand" value={formatSigned(snapshot.federationStanding)} />
        <Reading label="Credits" value={snapshot.credits.toLocaleString()} tone="#e8a04a" />
      </div>
    </div>
  );
}

function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function Reading({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#8899bb",
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-data)", fontSize: 14, color: tone ?? "#c8d8ff" }}>
        {value}
      </span>
    </div>
  );
}

function BuildQueueRail({ colony }: { colony: AsteroidSnapshot | null }) {
  const events = useGameStore((s) => s.snapshot)?.events ?? [];
  const queueKeys = uniqueKeys(colony?.buildQueue ?? [], (item) => `${item.buildingKind}`);
  const feed = events.slice(-14);
  const feedKeys = uniqueKeys(feed, (event) => event.kind);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RailHeading>Build Queue</RailHeading>
      <div style={{ padding: "0 10px 8px", fontFamily: "monospace", fontSize: 10 }}>
        {!colony || colony.buildQueue.length === 0 ? (
          <div style={{ color: "#556680" }}>Idle</div>
        ) : (
          colony.buildQueue.map((item, index) => {
            const pct =
              item.totalTicks > 0 ? Math.round((item.progressTicks / item.totalTicks) * 100) : 0;
            return (
              <div key={queueKeys[index]} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#c8d8ff" }}>
                  <span>{item.buildingKind}</span>
                  <span style={{ color: "#8899bb" }}>{pct}%</span>
                </div>
                <div style={{ height: 2, background: "#0e1a2c", marginTop: 2 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#e8a04a" }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <RailHeading>Live Feed</RailHeading>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 8px", fontSize: 10 }}>
        {events.length === 0 ? (
          <div style={{ color: "#556680", fontFamily: "monospace" }}>No traffic</div>
        ) : (
          feed.map((event, index) => (
            <div
              key={feedKeys[index]}
              style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 3 }}
            >
              <span style={{ color: priorityColour(event.priority) }}>■</span>
              <span style={{ color: "#8899bb", fontFamily: "monospace" }}>{event.kind}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Keys for ordered lists whose items carry no id. Position is the identity for a queue,
 * but a bare index makes React reuse the wrong row when the list shifts, so the key is
 * built from the item's own fields with a counter breaking any ties.
 */
function uniqueKeys<T>(items: ReadonlyArray<T>, baseOf: (item: T) => string): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = baseOf(item);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}#${n}`;
  });
}

function priorityColour(priority: string): string {
  if (priority === "red") return "#cc3322";
  if (priority === "amber") return "#e8a04a";
  if (priority === "green") return "#79c188";
  return "#556680";
}

function RailHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 9,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        color: "#8899bb",
        padding: "8px 10px 5px",
      }}
    >
      {children}
    </div>
  );
}
