import type { BlueprintDef, BlueprintId } from '@fab/domain';
import { asBlueprintId } from '@fab/domain';

/**
 * 40-node blueprint DAG — 8 per discipline × 5 disciplines.
 *
 * Tier progression: t1 (5k cr) → t2 (20k) → t3 (80k) → t4 (250k).
 * Tier-n requires at least one tier-(n−1) prerequisite in the same
 * discipline, matching spec §C.6. Cross-discipline dependencies are
 * allowed at tier 3+ to surface strategic breadth (e.g. Fusion Reactor
 * gating Dreadnought construction).
 *
 * `researchTimeTicks` is expressed in 20 Hz sim ticks. 20 ticks/s ×
 * 60 s/min × minutes ≈ tier-appropriate pacing: t1 ≈ 2 min, t4 ≈ 20 min.
 */

const bp = (s: string): BlueprintId => asBlueprintId(s);

// ─── Extraction ───────────────────────────────────────────────────────────────
const EX_1 = bp('bp.extraction.mine-mk2');
const EX_2 = bp('bp.extraction.deep-bore');
const EX_3 = bp('bp.extraction.deep-bore-mk2');
const EX_4 = bp('bp.extraction.seismic-penetrator');
const EX_5 = bp('bp.extraction.radiation-filter');
const EX_6 = bp('bp.extraction.geo-survey');
const EX_7 = bp('bp.extraction.refinery-advanced');
const EX_8 = bp('bp.extraction.nexos-enrichment');

// ─── Power ────────────────────────────────────────────────────────────────────
const PW_1 = bp('bp.power.solar-matrix');
const PW_2 = bp('bp.power.power-amp');
const PW_3 = bp('bp.power.high-energy');
const PW_4 = bp('bp.power.fusion-core');
const PW_5 = bp('bp.power.power-storage');
const PW_6 = bp('bp.power.superconductor-grid');
const PW_7 = bp('bp.power.antimatter-tap');
const PW_8 = bp('bp.power.grid-automation');

// ─── Defence ──────────────────────────────────────────────────────────────────
const DF_1 = bp('bp.defence.building-armour');
const DF_2 = bp('bp.defence.plasma-turret');
const DF_3 = bp('bp.defence.photon-turret');
const DF_4 = bp('bp.defence.anti-missile-pod');
const DF_5 = bp('bp.defence.shield-x40');
const DF_6 = bp('bp.defence.shield-x50');
const DF_7 = bp('bp.defence.gravity-nullifier');
const DF_8 = bp('bp.defence.orbital-platform');

// ─── Offence ──────────────────────────────────────────────────────────────────
const OF_1 = bp('bp.offence.laser-mk2');
const OF_2 = bp('bp.offence.photon-lasing');
const OF_3 = bp('bp.offence.plasma-projector');
const OF_4 = bp('bp.offence.nuclear-missile');
const OF_5 = bp('bp.offence.virus-missile');
const OF_6 = bp('bp.offence.anti-virus');
const OF_7 = bp('bp.offence.mega-missile');
const OF_8 = bp('bp.offence.nexos-warhead');

// ─── Logistics ────────────────────────────────────────────────────────────────
const LG_1 = bp('bp.logistics.protected-storage');
const LG_2 = bp('bp.logistics.construction-droids');
const LG_3 = bp('bp.logistics.ore-teleporter');
const LG_4 = bp('bp.logistics.asteroid-supervisors');
const LG_5 = bp('bp.logistics.improved-sensors');
const LG_6 = bp('bp.logistics.repair-facility');
const LG_7 = bp('bp.logistics.asteroid-engine');
const LG_8 = bp('bp.logistics.autonomy-manifesto');

export const BLUEPRINT_IDS = {
  // extraction
  mineMk2: EX_1,
  deepBore: EX_2,
  deepBoreMk2: EX_3,
  seismicPenetrator: EX_4,
  radiationFilter: EX_5,
  geoSurvey: EX_6,
  refineryAdvanced: EX_7,
  nexosEnrichment: EX_8,
  // power
  solarMatrix: PW_1,
  powerAmp: PW_2,
  highEnergy: PW_3,
  fusionCore: PW_4,
  powerStorage: PW_5,
  superconductorGrid: PW_6,
  antimatterTap: PW_7,
  gridAutomation: PW_8,
  // defence
  buildingArmour: DF_1,
  plasmaTurret: DF_2,
  photonTurret: DF_3,
  antiMissilePod: DF_4,
  shieldX40: DF_5,
  shieldX50: DF_6,
  gravityNullifier: DF_7,
  orbitalPlatform: DF_8,
  // offence
  laserMk2: OF_1,
  photonLasing: OF_2,
  plasmaProjector: OF_3,
  nuclearMissile: OF_4,
  virusMissile: OF_5,
  antiVirus: OF_6,
  megaMissile: OF_7,
  nexosWarhead: OF_8,
  // logistics
  protectedStorage: LG_1,
  constructionDroids: LG_2,
  oreTeleporter: LG_3,
  asteroidSupervisors: LG_4,
  improvedSensors: LG_5,
  repairFacility: LG_6,
  asteroidEngine: LG_7,
  autonomyManifesto: LG_8,
} as const;

const T1_TICKS = 20 * 60 * 2; //    2 min
const T2_TICKS = 20 * 60 * 5; //    5 min
const T3_TICKS = 20 * 60 * 10; //  10 min
const T4_TICKS = 20 * 60 * 20; //  20 min

export const BLUEPRINTS = {
  // ── EXTRACTION ──────────────────────────────────────────────────────────────
  [EX_1]: {
    id: EX_1,
    displayName: 'Mine Mk2',
    discipline: 'extraction',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['building:bld.mine-mk2'],
    description: 'Doubles surface-ore throughput per mine.',
    flavour: 'Stacked drills, wider scoop, identical footprint.',
  },
  [EX_2]: {
    id: EX_2,
    displayName: 'Deep Bore',
    discipline: 'extraction',
    tier: 1,
    costCredits: 5_500,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['building:bld.deep-shaft-mine'],
    description: 'Access to mid-depth ore veins (Quazinc, Bytanium).',
    flavour: 'Torque spike in every pump the first hour. It stabilises.',
  },
  [EX_6]: {
    id: EX_6,
    displayName: 'Geo Survey',
    discipline: 'extraction',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:asteroid-deposit-reveal'],
    description: 'Reveals full deposit profile of colonised asteroids.',
    flavour: "The scanners always knew. You just hadn't bought the software.",
  },
  [EX_3]: {
    id: EX_3,
    displayName: 'Deep Bore Mk2',
    discipline: 'extraction',
    tier: 2,
    costCredits: 20_000,
    researchTimeTicks: T2_TICKS,
    requires: [EX_2],
    unlocks: ['building:bld.deep-shaft-mine-mk2'],
    description: '2× deep-bore rate; slightly less power draw.',
    flavour: 'Turns out the drillheads liked the vibration.',
  },
  [EX_5]: {
    id: EX_5,
    displayName: 'Radiation Filter',
    discipline: 'extraction',
    tier: 2,
    costCredits: 22_000,
    researchTimeTicks: T2_TICKS,
    requires: [EX_1],
    unlocks: ['building:bld.radiation-filter'],
    description: 'Cuts ambient colony radiation. Prerequisite for Seismic Penetrator use.',
    flavour: 'Keeps the miners glowing only metaphorically.',
  },
  [EX_7]: {
    id: EX_7,
    displayName: 'Advanced Refining',
    discipline: 'extraction',
    tier: 2,
    costCredits: 25_000,
    researchTimeTicks: T2_TICKS,
    requires: [EX_1],
    unlocks: ['building:bld.refinery-advanced', 'mechanic:refined-ore-bonus'],
    description: '+30% credits on all refined-ore sales.',
    flavour: 'Turns out customers pay more when the slag is visually absent.',
  },
  [EX_4]: {
    id: EX_4,
    displayName: 'Seismic Penetrator',
    discipline: 'extraction',
    tier: 3,
    costCredits: 80_000,
    researchTimeTicks: T3_TICKS,
    requires: [EX_3, EX_5],
    unlocks: ['building:bld.seismic-penetrator', 'ore:traxium'],
    description: 'Unlocks Traxium & Nexos extraction. High radiation.',
    flavour: 'It sounds exactly like you would expect. The colony learns to sleep through it.',
  },
  [EX_8]: {
    id: EX_8,
    displayName: 'Nexos Enrichment',
    discipline: 'extraction',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [EX_4, EX_7],
    unlocks: ['mechanic:nexos-refinement', 'building:bld.nexos-enricher'],
    description: 'Refined Nexos sells at 2.5× raw. Required for the Nexos warhead.',
    flavour: 'Each kilo is walked past two spy satellites. They always notice.',
  },

  // ── POWER ───────────────────────────────────────────────────────────────────
  [PW_1]: {
    id: PW_1,
    displayName: 'Solar Matrix',
    discipline: 'power',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['building:bld.solar-array'],
    description: 'Passive +3 power, no upkeep. Mediocre but free to run.',
    flavour: 'PC Gamer 1996 rated this a trap. They were right. We balanced it.',
  },
  [PW_2]: {
    id: PW_2,
    displayName: 'Power Amp',
    discipline: 'power',
    tier: 1,
    costCredits: 6_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:power-radius+2'],
    description: "+2 tiles to every building's power projection radius.",
    flavour: "A must-buy in '96. Still a must-buy.",
  },
  [PW_5]: {
    id: PW_5,
    displayName: 'Power Storage',
    discipline: 'power',
    tier: 1,
    costCredits: 5_500,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:power-capacitor'],
    description: 'Colonies store 60 s of power surplus; rides out brief outages.',
    flavour: 'A literal capacitor bank the size of a transit car.',
  },
  [PW_3]: {
    id: PW_3,
    displayName: 'High Energy Power',
    discipline: 'power',
    tier: 2,
    costCredits: 22_000,
    researchTimeTicks: T2_TICKS,
    requires: [PW_2],
    unlocks: ['building:bld.fission-reactor-he'],
    description: '+30 power per reactor. The mid-game backbone.',
    flavour: 'Three times the output, four times the paperwork.',
  },
  [PW_6]: {
    id: PW_6,
    displayName: 'Superconductor Grid',
    discipline: 'power',
    tier: 2,
    costCredits: 24_000,
    researchTimeTicks: T2_TICKS,
    requires: [PW_5],
    unlocks: ['mechanic:power-transmission-loss-zero'],
    description: 'Eliminates across-colony power transmission loss.',
    flavour: 'Quazinc doped lattices. Worth its weight in suspiciously-cheap Quazinc.',
  },
  [PW_8]: {
    id: PW_8,
    displayName: 'Grid Automation',
    discipline: 'power',
    tier: 2,
    costCredits: 20_000,
    researchTimeTicks: T2_TICKS,
    requires: [PW_1],
    unlocks: ['mechanic:auto-powerdown-idle'],
    description: 'Idle buildings auto-power-down, saving 20% draw.',
    flavour: 'The CPU finally admits it was awake for the whole shift.',
  },
  [PW_4]: {
    id: PW_4,
    displayName: 'Fusion Core',
    discipline: 'power',
    tier: 3,
    costCredits: 85_000,
    researchTimeTicks: T3_TICKS,
    requires: [PW_3, PW_6],
    unlocks: ['building:bld.fusion-reactor'],
    description: '+80 power. Prerequisite for Dreadnought-class ships.',
    flavour: 'Hot enough to taste. Cool enough to keep running.',
  },
  [PW_7]: {
    id: PW_7,
    displayName: 'Antimatter Tap',
    discipline: 'power',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [PW_4, EX_4],
    unlocks: ['building:bld.antimatter-tap', 'mechanic:capital-ship-drive'],
    description: 'Ends all power-rationing. Enables Dreadnought drives.',
    flavour: 'We store the containment keys in a different sector. Obviously.',
  },

  // ── DEFENCE ─────────────────────────────────────────────────────────────────
  [DF_1]: {
    id: DF_1,
    displayName: 'Building Armour',
    discipline: 'defence',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:building-hp+50%'],
    description: '+50% HP on every colony building.',
    flavour: "Bolted on. Doesn't fool spy satellites but slows the drill missile.",
  },
  [DF_4]: {
    id: DF_4,
    displayName: 'Anti-Missile Pod',
    discipline: 'defence',
    tier: 1,
    costCredits: 6_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['building:bld.amp-pod', 'mechanic:missile-intercept'],
    description: 'Intercepts 60% of incoming basic missiles.',
    flavour: 'The pod hums before firing. Miners hate the pitch.',
  },
  [DF_2]: {
    id: DF_2,
    displayName: 'Plasma Turret',
    discipline: 'defence',
    tier: 2,
    costCredits: 22_000,
    researchTimeTicks: T2_TICKS,
    requires: [DF_1],
    unlocks: ['building:bld.plasma-turret'],
    description: 'Heavy anti-ship turret. 3× laser damage, higher upkeep.',
    flavour: 'Over-engineered for the threat and exactly right for your neighbour.',
  },
  [DF_5]: {
    id: DF_5,
    displayName: 'Shield ×40',
    discipline: 'defence',
    tier: 2,
    costCredits: 24_000,
    researchTimeTicks: T2_TICKS,
    requires: [DF_4],
    unlocks: ['mechanic:colony-shield-40'],
    description: 'Colony-wide kinetic shield. +40 effective HP per building.',
    flavour: 'A gauzy blue halo above the dome. Looks harmless. Is not.',
  },
  [DF_3]: {
    id: DF_3,
    displayName: 'Photon Turret',
    discipline: 'defence',
    tier: 3,
    costCredits: 80_000,
    researchTimeTicks: T3_TICKS,
    requires: [DF_2],
    unlocks: ['building:bld.photon-turret'],
    description: 'Long-range photon cannon. Shield-biased damage.',
    flavour: 'The after-image lingers longer than the shot took.',
  },
  [DF_6]: {
    id: DF_6,
    displayName: 'Shield ×50',
    discipline: 'defence',
    tier: 3,
    costCredits: 90_000,
    researchTimeTicks: T3_TICKS,
    requires: [DF_5],
    unlocks: ['mechanic:colony-shield-50'],
    description: 'Upgraded colony shield. +50 HP; +20% against plasma.',
    flavour: 'Extra harmonics tuned against plasma. Trust the Rigellian formula.',
  },
  [DF_7]: {
    id: DF_7,
    displayName: 'Gravity Nullifier',
    discipline: 'defence',
    tier: 4,
    costCredits: 220_000,
    researchTimeTicks: T4_TICKS,
    requires: [DF_6],
    unlocks: ['building:bld.gravity-nullifier', 'mechanic:ram-counter'],
    description: 'Only known counter to an incoming rammed asteroid.',
    flavour: 'Turns a planet-sized impactor into a planet-sized shrug.',
  },
  [DF_8]: {
    id: DF_8,
    displayName: 'Orbital Defence Platform',
    discipline: 'defence',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [DF_3, DF_6],
    unlocks: ['building:bld.orbital-defence-platform'],
    description: 'Orbital fortress. Covers all buildings in the colony.',
    flavour: 'The insurance premium that pays itself off mid-battle.',
  },

  // ── OFFENCE ─────────────────────────────────────────────────────────────────
  [OF_1]: {
    id: OF_1,
    displayName: 'Laser Mk2',
    discipline: 'offence',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['weapon:laser-mk2'],
    description: '+25% damage on all laser hardpoints.',
    flavour: 'Same cavity, tighter mirrors.',
  },
  [OF_4]: {
    id: OF_4,
    displayName: 'Nuclear Missile',
    discipline: 'offence',
    tier: 2,
    costCredits: 22_000,
    researchTimeTicks: T2_TICKS,
    requires: [OF_1],
    unlocks: ['missile:nuclear'],
    description: 'High-yield missile, modest guidance. 3× basic damage.',
    flavour: 'Vintage but effective. Ship them far from population centres.',
  },
  [OF_2]: {
    id: OF_2,
    displayName: 'Photon Lasing',
    discipline: 'offence',
    tier: 2,
    costCredits: 24_000,
    researchTimeTicks: T2_TICKS,
    requires: [OF_1],
    unlocks: ['weapon:photon'],
    description: 'Unlocks photon weapons on ships and turrets.',
    flavour: "It's a laser but more expensive.",
  },
  [OF_5]: {
    id: OF_5,
    displayName: 'Virus Missile',
    discipline: 'offence',
    tier: 3,
    costCredits: 80_000,
    researchTimeTicks: T3_TICKS,
    requires: [OF_4],
    unlocks: ['missile:virus'],
    description: 'Biological payload; triggers happiness collapse on hit.',
    flavour: 'Forbidden by the Federation. Lucrative.',
  },
  [OF_3]: {
    id: OF_3,
    displayName: 'Plasma Projector',
    discipline: 'offence',
    tier: 3,
    costCredits: 85_000,
    researchTimeTicks: T3_TICKS,
    requires: [OF_2],
    unlocks: ['weapon:plasma'],
    description: 'Top-tier direct-fire weapon. 3× laser damage.',
    flavour: 'Not a beam so much as an argument.',
  },
  [OF_6]: {
    id: OF_6,
    displayName: 'Anti-Virus',
    discipline: 'offence',
    tier: 3,
    costCredits: 60_000,
    researchTimeTicks: T3_TICKS,
    requires: [OF_4],
    unlocks: ['missile:antiVirus'],
    description: 'Counter-missile neutralises virus payloads in flight.',
    flavour: 'One vial of it costs more than the missile it stops.',
  },
  [OF_7]: {
    id: OF_7,
    displayName: 'Mega Missile',
    discipline: 'offence',
    tier: 4,
    costCredits: 220_000,
    researchTimeTicks: T4_TICKS,
    requires: [OF_5, OF_3],
    unlocks: ['missile:mega'],
    description: '10× basic damage. Single-shot, colony-wrecking.',
    flavour: 'Requires two colonies to launch and one to aim.',
  },
  [OF_8]: {
    id: OF_8,
    displayName: 'Nexos Warhead',
    discipline: 'offence',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [OF_7, EX_8],
    unlocks: ['missile:nexos'],
    description: 'Ultimate offensive weapon. Ends matches.',
    flavour: 'If you can aim it, you have already won. If you miss, everyone loses.',
  },

  // ── LOGISTICS ───────────────────────────────────────────────────────────────
  [LG_1]: {
    id: LG_1,
    displayName: 'Protected Storage',
    discipline: 'logistics',
    tier: 1,
    costCredits: 5_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['building:bld.storage-tower-protected'],
    description: 'Storage towers survive orbital bombardment.',
    flavour: 'Double-walled. Triple-insured.',
  },
  [LG_2]: {
    id: LG_2,
    displayName: 'Construction Droids',
    discipline: 'logistics',
    tier: 1,
    costCredits: 6_000,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:build-speed-2x'],
    description: '2× build-queue throughput, colony-wide.',
    flavour: 'Tireless, uncomplaining, mildly racist towards scaffolding.',
  },
  [LG_5]: {
    id: LG_5,
    displayName: 'Improved Sensors',
    discipline: 'logistics',
    tier: 1,
    costCredits: 5_500,
    researchTimeTicks: T1_TICKS,
    requires: [],
    unlocks: ['mechanic:radar-range+50%', 'building:bld.radar-tower'],
    description: '+50% radar range. Enables the Radar Tower.',
    flavour: 'You can finally see the merchants before they see you.',
  },
  [LG_3]: {
    id: LG_3,
    displayName: 'Ore Teleporter',
    discipline: 'logistics',
    tier: 2,
    costCredits: 22_000,
    researchTimeTicks: T2_TICKS,
    requires: [LG_1],
    unlocks: ['building:bld.ore-teleporter'],
    description: 'Instant ore transfer between owned colonies.',
    flavour: 'Arrives slightly warm. Not radioactive. Probably.',
  },
  [LG_4]: {
    id: LG_4,
    displayName: 'Asteroid Supervisors',
    discipline: 'logistics',
    tier: 2,
    costCredits: 20_000,
    researchTimeTicks: T2_TICKS,
    requires: [LG_2],
    unlocks: ['mechanic:auto-build-queue'],
    description: 'Auto-fill build queue from templates. The exploit-free version.',
    flavour: 'In the original they also bankrupted you. Not any more.',
  },
  [LG_6]: {
    id: LG_6,
    displayName: 'Repair Facility',
    discipline: 'logistics',
    tier: 2,
    costCredits: 21_000,
    researchTimeTicks: T2_TICKS,
    requires: [LG_5],
    unlocks: ['building:bld.repair-facility', 'mechanic:ship-repair'],
    description: 'Docked ships repair 5 HP/tick.',
    flavour: "Two welders, a mass-printer, and the galaxy's worst coffee.",
  },
  [LG_7]: {
    id: LG_7,
    displayName: 'Asteroid Engine',
    discipline: 'logistics',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [LG_3, PW_4],
    unlocks: ['building:bld.asteroid-engine', 'mechanic:asteroid-ram'],
    description: 'Bolt enough of these onto a rock and you can fly it.',
    flavour: 'Now classified overt. Diplomatic consequences included.',
  },
  [LG_8]: {
    id: LG_8,
    displayName: 'Autonomy Manifesto',
    discipline: 'logistics',
    tier: 4,
    costCredits: 250_000,
    researchTimeTicks: T4_TICKS,
    requires: [LG_4, LG_6],
    unlocks: ['mechanic:declare-independence'],
    description: 'Enables the Independence victory path.',
    flavour: 'Forty-two pages of corporate rebellion, footnoted.',
  },
} as const satisfies Readonly<Record<BlueprintId, BlueprintDef>>;

/** Ordered array form. */
export const BLUEPRINTS_LIST: readonly BlueprintDef[] = Object.values(BLUEPRINTS);
