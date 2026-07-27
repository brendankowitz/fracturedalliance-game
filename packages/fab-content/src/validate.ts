import { ORE_KINDS, type OreKind } from '@fab/domain';
import { z } from 'zod';
import type { ContentBundle } from './data/content-types';

/**
 * Structural (zod) + cross-reference validation for the content bundle.
 *
 * Schemas here describe *shape*; branded ids collapse to plain strings under
 * zod. That is fine — branding is a compile-time construct, not a runtime one.
 * We only use `safeParse` to surface issues; we never feed parsed output back
 * into typed APIs.
 */

const nonNegative = z.number().nonnegative().finite();
const unitInterval = z.number().min(0).max(1);
const brandedId = z.string().min(1);

const oreKindSchema = z.enum(ORE_KINDS as unknown as [OreKind, ...OreKind[]]);
const oreBagSchema = z.partialRecord(oreKindSchema, nonNegative);

const oreDefSchema = z.object({
  kind: oreKindSchema,
  displayName: z.string().min(1),
  baseValue: nonNegative,
  volatilityIndex: unitInterval,
  radiationRisk: unitInterval,
  rarityTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  flavour: z.string().min(1),
});

const buildingCategorySchema = z.enum([
  'cpu',
  'lifeSupport',
  'housing',
  'mining',
  'power',
  'storage',
  'defence',
  'production',
  'logistics',
  'engine',
]);

const footprintSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const buildingDefSchema = z.object({
  kind: z.string().min(1),
  displayName: z.string().min(1),
  category: buildingCategorySchema,
  costCredits: nonNegative,
  buildTimeTicks: nonNegative,
  powerDelta: z.number().finite(),
  popCapDelta: z.number().finite(),
  foodDelta: z.number().finite(),
  waterDelta: z.number().finite(),
  airDelta: z.number().finite(),
  oreProduction: oreBagSchema.optional(),
  oreConsumption: oreBagSchema.optional(),
  oreCost: oreBagSchema.optional(),
  monthlyUpkeep: nonNegative.optional(),
  creditsProduction: z.number().finite().optional(),
  footprint: footprintSchema.optional(),
  powerRadius: z.number().int().nonnegative().optional(),
  blueprintRequired: brandedId.optional(),
  blueprintsRequired: z.array(brandedId).optional(),
  maxPerColony: z.number().int().positive().optional(),
  unique: z.boolean().optional(),
  flavour: z.string().optional(),
});

const blueprintDisciplineSchema = z.enum(['extraction', 'power', 'defence', 'offence', 'logistics']);
const blueprintTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const blueprintDefSchema = z.object({
  id: brandedId,
  displayName: z.string().min(1),
  discipline: blueprintDisciplineSchema,
  tier: blueprintTierSchema,
  costCredits: nonNegative,
  researchTimeTicks: nonNegative.optional(),
  requires: z.array(brandedId),
  unlocks: z.array(z.string().min(1)),
  description: z.string().min(1),
  flavour: z.string().optional(),
});

const weaponKindSchema = z.enum(['laser', 'photon', 'plasma']);

const shipKindSchema = z.enum([
  'scout',
  'assault',
  'combatEagle',
  'fleetBattleship',
  'commandCruiser',
  'destructor',
  'terminator',
  'federalTransporter',
  'merchant',
]);

const shipClassDefSchema = z.object({
  kind: shipKindSchema,
  displayName: z.string().min(1),
  role: z.string().optional(),
  hullHp: z.number().positive(),
  shieldHp: nonNegative,
  shieldRegenPerTick: nonNegative,
  speed: nonNegative,
  turnRate: nonNegative.optional(),
  hardpoints: z.number().int().nonnegative(),
  hardpointTypes: z.array(weaponKindSchema).optional(),
  cargoCap: nonNegative,
  fuelRange: nonNegative,
  costCredits: nonNegative,
  buildTimeTicks: nonNegative,
  blueprintRequired: brandedId.optional(),
  flavour: z.string().optional(),
});

const weaponDefSchema = z.object({
  kind: weaponKindSchema,
  displayName: z.string().min(1),
  damage: nonNegative,
  cooldownTicks: z.number().int().positive(),
  range: z.number().positive(),
  accuracy: unitInterval,
  vsShield: nonNegative,
  vsHull: nonNegative,
  blueprintRequired: brandedId.optional(),
  flavour: z.string().optional(),
});

const missileKindSchema = z.enum(['basic', 'nuclear', 'mega', 'stasis', 'virus', 'nexos', 'antiVirus']);

const missileDefSchema = z.object({
  kind: missileKindSchema,
  displayName: z.string().min(1),
  damage: nonNegative,
  speed: nonNegative,
  accuracy: unitInterval,
  countermeasureResistance: unitInterval,
  blueprintRequired: brandedId.optional(),
  isCounter: z.boolean().optional(),
  flavour: z.string().optional(),
});

const bombardmentKindSchema = z.enum(['napalm', 'vortex', 'chaos']);

const bombardmentDefSchema = z.object({
  kind: bombardmentKindSchema,
  displayName: z.string().min(1),
  radius: z.number().positive(),
  damage: nonNegative,
  accuracy: unitInterval,
  blueprintRequired: brandedId.optional(),
  flavour: z.string().optional(),
});

const raceDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  originalAnalogue: z.string().min(1),
  disposition: z.enum([
    'player',
    'aggressive-principled',
    'aggressive-opportunist',
    'peaceful-trader',
    'neutral-reactive',
    'peaceful-scientist',
    'hostile-outlaw',
  ]),
  federationMember: z.boolean(),
  tradeLove: z.array(z.union([oreKindSchema, z.literal('allOres')])),
  tradeHate: z.array(
    z.union([
      oreKindSchema,
      z.literal('luxuryGoods'),
      z.literal('food'),
      z.literal('missiles'),
      z.literal('weapons'),
    ]),
  ),
  personality: z.object({
    aggression: unitInterval,
    grudgeDecayPerDay: unitInterval,
    tradeBias: z.number().min(-1).max(1),
    techBias: unitInterval,
    expansionBias: unitInterval,
    treatyRespect: unitInterval,
    ramWillingness: unitInterval,
  }),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  flavour: z.string().min(1),
});

const resourcesSchema = z.object({
  credits: z.number().finite(),
  ores: z.record(oreKindSchema, nonNegative),
  population: nonNegative,
  food: z.number().finite(),
  water: z.number().finite(),
  air: z.number().finite(),
  power: z.number().finite(),
});

const scenarioDefSchema = z.object({
  id: brandedId,
  displayName: z.string().min(1),
  description: z.string().min(1),
  playerCount: z.number().int().positive(),
  aiRaces: z.array(z.string().min(1)),
  asteroidCount: z.number().int().positive(),
  startingResources: resourcesSchema,
  victoryConditions: z.array(
    z.enum(['corporateLoyalty', 'independence', 'scientificSupremacy', 'militaryDominance', 'survivor']),
  ),
  timeLimitDays: z.number().int().positive().nullable(),
  objectives: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(1),
      trigger: z.enum([
        'onBuild',
        'onResearch',
        'onMine',
        'onTick',
        'onCommand',
        'onCombat',
        'buildingConstructed',
        'asteroidColonised',
        'tradeCompleted',
        'blueprintPurchased',
        'shipBuilt',
        'raceMet',
        'treatySigned',
        'espionageMission',
        'asteroidEngineFired',
      ]),
      hint: z.string().optional(),
      params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      rewardCredits: nonNegative.optional(),
      completionReward: nonNegative.optional(),
      optional: z.boolean().optional(),
    }),
  ),
  kind: z.enum(['tutorial', 'primer', 'skirmish', 'campaign']).optional(),
});

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const pushZodIssues = (issues: ValidationIssue[], prefix: string, err: z.ZodError): void => {
  for (const issue of err.issues) {
    issues.push({
      path: `${prefix}${issue.path.length > 0 ? `.${issue.path.join('.')}` : ''}`,
      message: issue.message,
    });
  }
};

const validateSchemas = (bundle: ContentBundle, issues: ValidationIssue[]): void => {
  const runRows = <T>(prefix: string, rows: readonly T[], schema: z.ZodType): void => {
    for (let i = 0; i < rows.length; i += 1) {
      const r = schema.safeParse(rows[i]);
      if (!r.success) pushZodIssues(issues, `${prefix}[${i}]`, r.error);
    }
  };
  for (const [kind, def] of Object.entries(bundle.ores)) {
    const r = oreDefSchema.safeParse(def);
    if (!r.success) pushZodIssues(issues, `ores.${kind}`, r.error);
  }
  runRows('buildings', bundle.buildings, buildingDefSchema);
  runRows('blueprints', bundle.blueprints, blueprintDefSchema);
  runRows('ships', bundle.ships, shipClassDefSchema);
  runRows('weapons', bundle.weapons, weaponDefSchema);
  runRows('missiles', bundle.missiles, missileDefSchema);
  runRows('bombardments', bundle.bombardments, bombardmentDefSchema);
  runRows('races', bundle.races, raceDefSchema);
  runRows('scenarios', bundle.scenarios, scenarioDefSchema);
};

const validateOreKinds = (bundle: ContentBundle, issues: ValidationIssue[]): void => {
  const oreKinds = new Set(Object.keys(bundle.ores));
  for (const k of ORE_KINDS) {
    if (!oreKinds.has(k)) issues.push({ path: 'ores', message: `missing OreKind: ${k}` });
  }
};

const validateBlueprintPrereqs = (
  bundle: ContentBundle,
  blueprintIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): void => {
  for (const bp of bundle.blueprints) {
    for (const req of bp.requires) {
      if (!blueprintIds.has(req as string)) {
        issues.push({
          path: `blueprints.${String(bp.id)}.requires`,
          message: `unknown blueprint prerequisite: ${String(req)}`,
        });
      }
    }
  }
};

const validateBlueprintDag = (bundle: ContentBundle, issues: ValidationIssue[]): void => {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const bp of bundle.blueprints) indegree.set(bp.id as string, 0);
  for (const bp of bundle.blueprints) {
    for (const req of bp.requires) {
      indegree.set(bp.id as string, (indegree.get(bp.id as string) ?? 0) + 1);
      const list = adjacency.get(req as string) ?? [];
      list.push(bp.id as string);
      adjacency.set(req as string, list);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of indegree) if (deg === 0) queue.push(id);
  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift() as string;
    processed += 1;
    for (const next of adjacency.get(id) ?? []) {
      const nd = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nd);
      if (nd === 0) queue.push(next);
    }
  }
  if (processed !== bundle.blueprints.length) {
    issues.push({ path: 'blueprints', message: 'blueprint graph contains a cycle' });
  }
};

const validateBlueprintGates = (
  bundle: ContentBundle,
  blueprintIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): void => {
  const checkGate = (path: string, id: string | undefined): void => {
    if (id !== undefined && !blueprintIds.has(id)) {
      issues.push({ path, message: `unknown blueprint gate: ${id}` });
    }
  };
  for (const b of bundle.buildings) {
    checkGate(`buildings.${b.kind}.blueprintRequired`, b.blueprintRequired as string | undefined);
    for (const req of b.blueprintsRequired ?? []) {
      checkGate(`buildings.${b.kind}.blueprintsRequired`, req as string);
    }
  }
  for (const s of bundle.ships) {
    checkGate(`ships.${s.kind}.blueprintRequired`, s.blueprintRequired as string | undefined);
  }
  for (const w of bundle.weapons) {
    checkGate(`weapons.${w.kind}.blueprintRequired`, w.blueprintRequired as string | undefined);
  }
  for (const m of bundle.missiles) {
    checkGate(`missiles.${m.kind}.blueprintRequired`, m.blueprintRequired as string | undefined);
  }
  for (const b of bundle.bombardments) {
    checkGate(`bombardments.${b.kind}.blueprintRequired`, b.blueprintRequired as string | undefined);
  }
};

/** Validates the bundle. Returns `{ ok: true }` or a list of issues. */
export const validateContent = (bundle: ContentBundle): ValidationResult => {
  const issues: ValidationIssue[] = [];
  validateSchemas(bundle, issues);
  validateOreKinds(bundle, issues);
  const blueprintIds = new Set(bundle.blueprints.map((b) => b.id as string));
  validateBlueprintPrereqs(bundle, blueprintIds, issues);
  validateBlueprintDag(bundle, issues);
  validateBlueprintGates(bundle, blueprintIds, issues);
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
};

/** Throws a descriptive `Error` if the bundle fails validation. */
export const assertValidContent = (bundle: ContentBundle): void => {
  const r = validateContent(bundle);
  if (!r.ok) {
    const lines = r.issues.map((i) => ` • ${i.path}: ${i.message}`).join('\n');
    throw new Error(`Invalid ContentBundle:\n${lines}`);
  }
};
