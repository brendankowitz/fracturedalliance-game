import type {
  BombardmentDef,
  BombardmentKind,
  MissileDef,
  MissileKind,
  WeaponDef,
  WeaponKind,
} from '@fab/domain';
import { BLUEPRINT_IDS } from './blueprints';

/** Direct-fire ship and turret weapons (laser → photon → plasma). */
export const WEAPONS = {
  laser: {
    kind: 'laser',
    displayName: 'Laser Cannon',
    damage: 8,
    cooldownTicks: 20,
    range: 24,
    accuracy: 0.9,
    vsShield: 1.0,
    vsHull: 0.8,
    flavour: 'Predictable, fast, cheap. Pays the bills.',
  },
  photon: {
    kind: 'photon',
    displayName: 'Photon Cannon',
    damage: 16,
    cooldownTicks: 26,
    range: 30,
    accuracy: 0.85,
    vsShield: 1.3,
    vsHull: 1.0,
    blueprintRequired: BLUEPRINT_IDS.photonLasing,
    flavour: 'Shields hate it. Accountants hate it slightly more.',
  },
  plasma: {
    kind: 'plasma',
    displayName: 'Plasma Projector',
    damage: 28,
    cooldownTicks: 40,
    range: 28,
    accuracy: 0.75,
    vsShield: 1.1,
    vsHull: 1.6,
    blueprintRequired: BLUEPRINT_IDS.plasmaProjector,
    flavour: 'Not a beam so much as an argument.',
  },
} as const satisfies Readonly<Record<WeaponKind, WeaponDef>>;

export const WEAPONS_LIST: readonly WeaponDef[] = Object.values(WEAPONS);

/** Missile catalogue. `antiVirus` is the sole counter entry. */
export const MISSILES = {
  basic: {
    kind: 'basic',
    displayName: 'Basic Missile',
    damage: 40,
    speed: 3.5,
    accuracy: 0.8,
    countermeasureResistance: 0.2,
    flavour: 'The starter shell. Surprisingly lethal against unprepared hulls.',
  },
  nuclear: {
    kind: 'nuclear',
    displayName: 'Nuclear Missile',
    damage: 120,
    speed: 2.8,
    accuracy: 0.7,
    countermeasureResistance: 0.35,
    blueprintRequired: BLUEPRINT_IDS.nuclearMissile,
    flavour: 'Vintage but effective. Keep them far from habitat domes.',
  },
  mega: {
    kind: 'mega',
    displayName: 'Mega Missile',
    damage: 400,
    speed: 2.3,
    accuracy: 0.65,
    countermeasureResistance: 0.5,
    blueprintRequired: BLUEPRINT_IDS.megaMissile,
    flavour: 'Requires two colonies to launch and one to aim.',
  },
  stasis: {
    kind: 'stasis',
    displayName: 'Stasis Missile',
    damage: 0,
    speed: 3.0,
    accuracy: 0.75,
    countermeasureResistance: 0.3,
    flavour: 'No damage; freezes the target for 6 sim-days. An interrupt, not a kill.',
  },
  virus: {
    kind: 'virus',
    displayName: 'Virus Missile',
    damage: 20,
    speed: 2.6,
    accuracy: 0.8,
    countermeasureResistance: 0.4,
    blueprintRequired: BLUEPRINT_IDS.virusMissile,
    flavour: 'Happiness crashes to zero across the target colony. Forbidden. Lucrative.',
  },
  nexos: {
    kind: 'nexos',
    displayName: 'Nexos Warhead',
    damage: 2_000,
    speed: 2.5,
    accuracy: 0.6,
    countermeasureResistance: 0.85,
    blueprintRequired: BLUEPRINT_IDS.nexosWarhead,
    flavour: 'If it connects, match evaluation triggers at the next tick.',
  },
  antiVirus: {
    kind: 'antiVirus',
    displayName: 'Anti-Virus Missile',
    damage: 0,
    speed: 3.8,
    accuracy: 0.9,
    countermeasureResistance: 0.9,
    blueprintRequired: BLUEPRINT_IDS.antiVirus,
    isCounter: true,
    flavour: 'The single legitimate use for panicked spending.',
  },
} as const satisfies Readonly<Record<MissileKind, MissileDef>>;

export const MISSILES_LIST: readonly MissileDef[] = Object.values(MISSILES);

/** Orbital bombardment ordnance (spec §A.6). */
export const BOMBARDMENTS = {
  napalm: {
    kind: 'napalm',
    displayName: 'Napalm Orb',
    radius: 2,
    damage: 60,
    accuracy: 0.8,
    flavour: 'Sticks, spreads, lingers. Wrecks Hydroponics first.',
  },
  vortex: {
    kind: 'vortex',
    displayName: 'Vortex Round',
    radius: 3,
    damage: 45,
    accuracy: 0.7,
    flavour: "Rips buildings off the grid before they know they're flying.",
  },
  chaos: {
    kind: 'chaos',
    displayName: 'Chaos Bomb',
    radius: 4,
    damage: 35,
    accuracy: 0.55,
    blueprintRequired: BLUEPRINT_IDS.megaMissile,
    flavour: "Randomised damage distribution. Gambler's favourite.",
  },
} as const satisfies Readonly<Record<BombardmentKind, BombardmentDef>>;

export const BOMBARDMENTS_LIST: readonly BombardmentDef[] = Object.values(BOMBARDMENTS);
