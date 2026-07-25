import { getAllBuildingDefs } from "@fa/content";
import type { BuildingDef } from "@fa/domain";
import { type JSX, useMemo, useState } from "react";

export interface BuildPaletteProps {
  /** Blueprint ids the player owns; entries needing an unowned one render locked. */
  blueprintsOwned: ReadonlySet<string>;
  credits: number;
  /** false when no cell is selected — entries stay visible but show a hint. */
  canPlace: boolean;
  selectedKind: string | null;
  onSelectKind: (kind: string) => void;
}

const CATEGORY_ORDER = [
  "CORE",
  "LIFE SUPPORT",
  "POPULATION",
  "EXTRACTION",
  "POWER",
  "INDUSTRY",
  "DEFENCE",
  "COMMERCE",
  "SCIENCE",
  "OTHER",
] as const;

type Category = (typeof CATEGORY_ORDER)[number];

const CATEGORY_BY_KIND: Readonly<Record<string, Category>> = {
  cpu: "CORE",
  airProcessor: "LIFE SUPPORT",
  hydrationPlant: "LIFE SUPPORT",
  hydroponics: "LIFE SUPPORT",
  advHydroponics: "LIFE SUPPORT",
  atmosphericCondenser: "LIFE SUPPORT",
  biosphereDome: "LIFE SUPPORT",
  radiationFilter: "LIFE SUPPORT",
  recyclingCentre: "LIFE SUPPORT",
  livingQuarters: "POPULATION",
  resiblock: "POPULATION",
  pleasureDome: "POPULATION",
  medicalCentre: "POPULATION",
  securityCentre: "POPULATION",
  gravityPlating: "POPULATION",
  megaHabitat: "POPULATION",
  arcology: "POPULATION",
  mineMk1: "EXTRACTION",
  mineMk2: "EXTRACTION",
  deepBoreMine: "EXTRACTION",
  geothermalTap: "EXTRACTION",
  astralMiner: "EXTRACTION",
  antimatterDrill: "EXTRACTION",
  powerPlant: "POWER",
  fusionReactor: "POWER",
  storageTower: "INDUSTRY",
  repairFacility: "INDUSTRY",
  shipYard: "INDUSTRY",
  oreRefinery: "INDUSTRY",
  crystalSeparator: "INDUSTRY",
  naniteExtractor: "INDUSTRY",
  turretBattery: "DEFENCE",
  shieldGenerator: "DEFENCE",
  missileSilo: "DEFENCE",
  commandCentre: "DEFENCE",
  ionCannon: "DEFENCE",
  antimatterMine: "DEFENCE",
  fortressWall: "DEFENCE",
  doomsdayDevice: "DEFENCE",
  tradingPost: "COMMERCE",
  blackMarket: "COMMERCE",
  smugglerBay: "COMMERCE",
  pricingOffice: "COMMERCE",
  federationLobby: "COMMERCE",
  creditMint: "COMMERCE",
  monopolyOffice: "COMMERCE",
  galacticExchange: "COMMERCE",
  researchLab: "SCIENCE",
  computingArray: "SCIENCE",
  xenologyLab: "SCIENCE",
  materialsSynth: "SCIENCE",
  quantumProcessor: "SCIENCE",
  warpResearch: "SCIENCE",
  bioResearchLab: "SCIENCE",
  omniscienceNode: "SCIENCE",
  ecc: "OTHER",
  gravityNullifier: "OTHER",
};

function categoryOf(kind: string): Category {
  return CATEGORY_BY_KIND[kind] ?? "OTHER";
}

const COLOR = {
  bg: "#0a1420",
  border: "#1a2840",
  row: "#0e2038",
  text: "#c8d8ff",
  muted: "#8899bb",
  dim: "#556680",
  accent: "#e8a04a",
  danger: "#cc3322",
  ok: "#79c188",
} as const;

interface StatSegment {
  readonly text: string;
  readonly color: string;
}

function withSign(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function asPercent(value: number): string {
  return `${withSign(Math.round(value * 100))}%`;
}

function buildStatSegments(def: BuildingDef): StatSegment[] {
  const segments: StatSegment[] = [];

  if (def.powerDelta !== 0) {
    segments.push({
      text: `⚡${withSign(def.powerDelta)}`,
      color: def.powerDelta > 0 ? COLOR.ok : COLOR.muted,
    });
  }
  if (def.popCapDelta !== 0) {
    segments.push({ text: `♟${withSign(def.popCapDelta)} pop`, color: COLOR.muted });
  }
  if (def.foodDelta !== 0) {
    segments.push({ text: `🌾${withSign(def.foodDelta)} food`, color: COLOR.muted });
  }
  if (def.waterDelta !== 0) {
    segments.push({ text: `💧${withSign(def.waterDelta)} water`, color: COLOR.muted });
  }
  if (def.airDelta !== 0) {
    segments.push({ text: `🜁${withSign(def.airDelta)} air`, color: COLOR.muted });
  }
  if (def.oreProduction) {
    for (const [ore, amount] of Object.entries(def.oreProduction)) {
      if (amount) segments.push({ text: `⛏ ${ore} ${amount}`, color: COLOR.muted });
    }
  }
  if (def.oreMiningMultiplier) {
    segments.push({ text: `⛏×${asPercent(def.oreMiningMultiplier)}`, color: COLOR.muted });
  }
  if (def.happinessDelta) {
    segments.push({ text: `☺${asPercent(def.happinessDelta)}`, color: COLOR.muted });
  }
  if (def.radiationReduction) {
    segments.push({
      text: `☢-${Math.round(def.radiationReduction * 100)}% rad`,
      color: COLOR.muted,
    });
  }
  if (def.repairRate) {
    segments.push({ text: `🔧+${def.repairRate}`, color: COLOR.muted });
  }
  if (def.defenseDps) {
    segments.push({ text: `⚔${def.defenseDps} dps`, color: COLOR.muted });
  }

  return segments;
}

function isLockedEntry(def: BuildingDef, blueprintsOwned: ReadonlySet<string>): boolean {
  const required = def.blueprintRequired;
  return required != null && required !== "" ? !blueprintsOwned.has(required) : false;
}

interface BuildRowProps {
  readonly def: BuildingDef;
  readonly credits: number;
  readonly selected: boolean;
  readonly locked: boolean;
  readonly onSelect: (kind: string) => void;
}

function BuildRow({ def, credits, selected, locked, onSelect }: BuildRowProps): JSX.Element {
  const unaffordable = def.costCredits > credits;
  const segments = buildStatSegments(def);

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onSelect(def.kind)}
      style={{
        background: selected ? "rgba(232,160,74,0.12)" : COLOR.row,
        border: `1px solid ${selected ? COLOR.accent : COLOR.border}`,
        color: locked ? COLOR.dim : COLOR.text,
        fontFamily: "monospace",
        fontSize: 11,
        cursor: locked ? "not-allowed" : "pointer",
        padding: "5px 7px",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        opacity: locked ? 0.5 : 1,
        width: "100%",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}
      >
        <span
          style={{
            fontWeight: "bold",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {def.label}
        </span>
        {locked && <span style={{ fontSize: 9, color: COLOR.dim, flexShrink: 0 }}>🔒</span>}
        <span
          style={{
            fontSize: 10,
            flexShrink: 0,
            color: locked ? COLOR.dim : unaffordable ? COLOR.danger : COLOR.muted,
          }}
        >
          {def.costCredits.toLocaleString()} cr
        </span>
      </div>
      {segments.length > 0 && (
        <div
          style={{
            fontSize: 9,
            color: COLOR.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {segments.map((segment, index) => (
            <span key={segment.text} style={{ color: segment.color }}>
              {index > 0 && "  "}
              {segment.text}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

interface CategorySectionProps {
  readonly category: Category;
  readonly defs: readonly BuildingDef[];
  readonly collapsed: boolean;
  readonly forceExpanded: boolean;
  readonly onToggle: (category: Category) => void;
  readonly credits: number;
  readonly selectedKind: string | null;
  readonly blueprintsOwned: ReadonlySet<string>;
  readonly onSelectKind: (kind: string) => void;
}

function CategorySection({
  category,
  defs,
  collapsed,
  forceExpanded,
  onToggle,
  credits,
  selectedKind,
  blueprintsOwned,
  onSelectKind,
}: CategorySectionProps): JSX.Element | null {
  if (defs.length === 0) return null;
  const expanded = forceExpanded || !collapsed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        onClick={() => onToggle(category)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          padding: "2px 2px",
          cursor: "pointer",
          color: COLOR.muted,
          fontFamily: "monospace",
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {expanded ? "▾" : "▸"} {category}
        </span>
        <span style={{ fontSize: 9, color: COLOR.dim }}>{defs.length}</span>
      </button>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {defs.map((def) => (
            <BuildRow
              key={def.kind}
              def={def}
              credits={credits}
              selected={selectedKind === def.kind}
              locked={isLockedEntry(def, blueprintsOwned)}
              onSelect={onSelectKind}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BuildPalette(props: BuildPaletteProps): JSX.Element {
  const { blueprintsOwned, credits, canPlace, selectedKind, onSelectKind } = props;
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<Category>>(
    () => new Set(),
  );

  const defsByCategory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map<Category, BuildingDef[]>();
    for (const def of getAllBuildingDefs()) {
      if (query !== "" && !def.label.toLowerCase().includes(query)) continue;
      const category = categoryOf(def.kind);
      const bucket = grouped.get(category);
      if (bucket) bucket.push(def);
      else grouped.set(category, [def]);
    }
    return grouped;
  }, [search]);

  const isSearching = search.trim() !== "";

  function toggleCategory(category: Category): void {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: COLOR.bg,
        border: `1px solid ${COLOR.border}`,
        fontFamily: "monospace",
        color: COLOR.text,
        padding: 8,
      }}
    >
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search buildings…"
        style={{
          background: COLOR.row,
          border: `1px solid ${COLOR.border}`,
          color: COLOR.text,
          fontFamily: "monospace",
          fontSize: 11,
          padding: "5px 7px",
        }}
      />
      {!canPlace && (
        <div
          style={{
            fontSize: 10,
            color: COLOR.dim,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Select a cell to build
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {CATEGORY_ORDER.map((category) => (
          <CategorySection
            key={category}
            category={category}
            defs={defsByCategory.get(category) ?? []}
            collapsed={collapsedCategories.has(category)}
            forceExpanded={isSearching}
            onToggle={toggleCategory}
            credits={credits}
            selectedKind={selectedKind}
            blueprintsOwned={blueprintsOwned}
            onSelectKind={onSelectKind}
          />
        ))}
      </div>
    </div>
  );
}
