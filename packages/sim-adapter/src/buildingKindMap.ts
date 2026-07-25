/**
 * opus building/ship kind ids → vendored (@fab) catalogue ids.
 *
 * Only kinds with a genuine equivalent are mapped; unmapped kinds are
 * forwarded verbatim so the sim's command validation rejects them with a
 * visible `command.rejected` event instead of the adapter silently eating
 * the click. The reverse map feeds the HUD snapshot so existing panels keep
 * rendering the opus kind ids they know.
 */

export const OPUS_TO_FAB_BUILDING: Readonly<Record<string, string>> = {
  cpu: "bld.cpu-core",
  airProcessor: "bld.oxygen-generator",
  hydrationPlant: "bld.water-recycler",
  hydroponics: "bld.hydroponics-farm",
  advHydroponics: "bld.hydroponics-farm",
  livingQuarters: "bld.habitat-dome",
  resiblock: "bld.resiblock",
  powerPlant: "bld.fission-reactor",
  fusionReactor: "bld.fusion-reactor",
  mineMk1: "bld.mine",
  mineMk2: "bld.mine-mk2",
  deepBoreMine: "bld.deep-shaft-mine",
  storageTower: "bld.storage-tower",
  pleasureDome: "bld.pleasure-dome",
  medicalCentre: "bld.medical-centre",
  securityCentre: "bld.security-centre",
  radiationFilter: "bld.radiation-filter",
  repairFacility: "bld.repair-facility",
  shipYard: "bld.shipyard",
  missileSilo: "bld.missile-silo",
  turretBattery: "bld.laser-turret",
  ionCannon: "bld.plasma-turret",
  researchLab: "bld.research-lab",
  tradingPost: "bld.market",
  gravityNullifier: "bld.gravity-nullifier",
};

export const FAB_TO_OPUS_BUILDING: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(OPUS_TO_FAB_BUILDING)
    // advHydroponics folds into hydroponics; prefer the canonical reverse entry.
    .filter(([opus]) => opus !== "advHydroponics")
    .map(([opus, fab]) => [fab, opus]),
);

export const OPUS_TO_FAB_SHIP: Readonly<Record<string, string>> = {
  scout: "scout",
  assaultCraft: "assault",
  combatEagle: "combatEagle",
  fleetBattleship: "fleetBattleship",
  destructor: "destructor",
  commandCruiser: "commandCruiser",
};

export const FAB_TO_OPUS_SHIP: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(OPUS_TO_FAB_SHIP).map(([opus, fab]) => [fab, opus]),
);

export const mapBuildingKind = (opusKind: string): string =>
  OPUS_TO_FAB_BUILDING[opusKind] ?? opusKind;

export const unmapBuildingKind = (fabKind: string): string =>
  FAB_TO_OPUS_BUILDING[fabKind] ?? fabKind;

export const mapShipKind = (opusKind: string): string => OPUS_TO_FAB_SHIP[opusKind] ?? opusKind;

export const unmapShipKind = (fabKind: string): string => FAB_TO_OPUS_SHIP[fabKind] ?? fabKind;
