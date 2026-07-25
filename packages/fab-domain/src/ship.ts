import type { AsteroidId, BlueprintId, PlayerId, ShipId } from './ids';
import type { OreKind } from './resources';

export type ShipKind =
  | 'scout'
  | 'assault'
  | 'combatEagle'
  | 'fleetBattleship'
  | 'commandCruiser'
  | 'destructor'
  | 'terminator'
  | 'federalTransporter'
  | 'merchant';

export type WeaponKind = 'laser' | 'photon' | 'plasma';

export interface Hardpoint {
  weapon: WeaponKind;
  cooldownTicks: number;
  cooldownRemaining: number;
}

export interface ShipClassDef {
  kind: ShipKind;
  displayName: string;
  /** Human-readable combat role label. */
  role?: string;
  hullHp: number;
  shieldHp: number;
  shieldRegenPerTick: number;
  speed: number;
  /** Radians per tick at cruise speed. */
  turnRate?: number;
  hardpoints: number;
  /** Weapon kinds legal for the hardpoints on this class. */
  hardpointTypes?: readonly WeaponKind[];
  cargoCap: number;
  fuelRange: number;
  costCredits: number;
  buildTimeTicks: number;
  blueprintRequired?: BlueprintId;
  flavour?: string;
}

export type ShipOrder =
  | { kind: 'idle' }
  | { kind: 'moveTo'; target: { x: number; y: number } }
  | { kind: 'attackAsteroid'; target: AsteroidId }
  | { kind: 'attackShip'; target: ShipId }
  | { kind: 'defend'; target: AsteroidId }
  | { kind: 'trade'; target: AsteroidId; payload: Partial<Record<OreKind, number>> }
  | { kind: 'scout'; target: { x: number; y: number } }
  | { kind: 'dock'; target: AsteroidId };

export interface Ship {
  id: ShipId;
  defKind: ShipKind;
  ownerId: PlayerId;
  hullHp: number;
  shieldHp: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  order: ShipOrder;
  cargo: Partial<Record<OreKind, number>>;
  hardpoints: Hardpoint[];
}

export type MissileKind = 'basic' | 'nuclear' | 'mega' | 'stasis' | 'virus' | 'nexos' | 'antiVirus';

export type BombardmentKind = 'napalm' | 'vortex' | 'chaos';

export interface WeaponDef {
  kind: WeaponKind;
  displayName: string;
  /** Damage per shot before shield/armour modifiers. */
  damage: number;
  /** Ticks between shots. */
  cooldownTicks: number;
  /** Effective range in world units. */
  range: number;
  /** 0..1 base hit probability at mid-range. */
  accuracy: number;
  /** Multiplier against shields. 1 = neutral. */
  vsShield: number;
  /** Multiplier against hull. */
  vsHull: number;
  blueprintRequired?: BlueprintId;
  flavour?: string;
}

export interface MissileDef {
  kind: MissileKind;
  displayName: string;
  /** Damage on direct hit (asteroid building radius). */
  damage: number;
  speed: number;
  /** 0..1 base guidance accuracy. */
  accuracy: number;
  /** 0..1 resistance to Anti-Missile Pods. 1 = unstoppable. */
  countermeasureResistance: number;
  blueprintRequired?: BlueprintId;
  /** True if this is a counter-weapon rather than an offensive one. */
  isCounter?: boolean;
  flavour?: string;
}

export interface BombardmentDef {
  kind: BombardmentKind;
  displayName: string;
  /** Area-of-effect damage radius in grid cells. */
  radius: number;
  damage: number;
  accuracy: number;
  blueprintRequired?: BlueprintId;
  flavour?: string;
}

export interface Missile {
  id: string;
  kind: MissileKind;
  ownerId: PlayerId;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  targetAsteroid: AsteroidId | null;
  targetShip: ShipId | null;
  damage: number;
  /** Ticks remaining before self-destruct / fuel-out. */
  remainingTicks: number;
}
