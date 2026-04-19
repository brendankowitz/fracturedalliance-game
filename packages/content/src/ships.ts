import type { ShipClassDef } from "@fa/domain";
import rawShips from "../data/ships.json" with { type: "json" };

type JsonShip = (typeof rawShips)[number];

function validateShip(raw: JsonShip): ShipClassDef {
  if (!raw.kind || typeof raw.kind !== "string") throw new Error(`Ship entry missing "kind"`);
  if (!raw.label || typeof raw.label !== "string") throw new Error(`Ship "${raw.kind}" missing "label"`);
  if (typeof raw.hullHp !== "number" || raw.hullHp <= 0) throw new Error(`Ship "${raw.kind}" invalid "hullHp"`);
  if (typeof raw.speed !== "number" || raw.speed <= 0) throw new Error(`Ship "${raw.kind}" invalid "speed"`);
  if (typeof raw.costCredits !== "number" || raw.costCredits < 0) throw new Error(`Ship "${raw.kind}" invalid "costCredits"`);
  return raw as unknown as ShipClassDef;
}

const allShipDefs: ShipClassDef[] = rawShips.map(validateShip);
const shipIndex = new Map<string, ShipClassDef>(allShipDefs.map((s) => [s.kind, s]));

export function getShipDef(kind: string): ShipClassDef | undefined {
  return shipIndex.get(kind);
}

export function getAllShipDefs(): ReadonlyArray<ShipClassDef> {
  return allShipDefs;
}
