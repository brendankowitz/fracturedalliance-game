/**
 * Espionage system (spec §C.7).
 *
 * Two entry points:
 *   • `handleDispatchAgent` — validates a `dispatchAgent` command, deducts
 *     hire cost, allocates a free agent, and inserts a mission scheduled
 *     for `DEFAULT_MISSION_RESOLUTION_TICKS` later.
 *   • `espionagePhase` — drains missions whose `resolveTick ≤ world.tick`,
 *     rolls d100 vs (skill - Security - counterIntel), applies side-effects
 *     (sabotage damage, intel-gather suspicion bump, recon afterglow), and
 *     stochastically captures-and-reveals on failure.
 *
 * Determinism: all rolls draw from the `'espionage'` sub-generator. Mission
 * id is `mis-<resolveTick>-<missionsLength>` so save/restore keeps the same
 * ordering when missions are inserted in the same tick.
 */

import {
  AGENT_CATALOGUE,
  type Agent,
  BLACK_MARKET_SUSPICION_THRESHOLD,
  CAPTURE_REVEAL_PROBABILITY,
  DEFAULT_MISSION_RESOLUTION_TICKS,
  type EspionageMission,
  type EspionageMissionKind,
  type EspionageState,
  initialEspionageState,
  type PlayerCommand,
  type PlayerId,
  SABOTAGE_BUILDING_DAMAGE,
  type World,
} from '@fab/domain';
import type { Prng } from '../rng/mulberry32';
import type { PrngRegistry } from '../rng/subGenerators';
import { emitEvent } from './events';

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Lazily install the EspionageState the first time a player engages the system. */
const ensureState = (world: World): EspionageState => {
  if (!world.espionage) {
    world.espionage = initialEspionageState();
  }
  return world.espionage;
};

const findAgent = (state: EspionageState, agentId: string): Agent | undefined =>
  state.agents.find((a) => a.id === agentId);

const baseSkillFor = (agentId: string): number => AGENT_CATALOGUE.find((d) => d.id === agentId)?.skill ?? 0;

const hireCostFor = (agentId: string): number => AGENT_CATALOGUE.find((d) => d.id === agentId)?.hireCost ?? 0;

const isMissionKind = (s: string): s is EspionageMissionKind =>
  s === 'recon' ||
  s === 'techSteal' ||
  s === 'sabotageLifeSupport' ||
  s === 'sabotagePower' ||
  s === 'sabotageDefences' ||
  s === 'sabotageConstruction' ||
  s === 'plantVirus' ||
  s === 'blackmail' ||
  s === 'intelGather' ||
  s === 'liberate';

/** Validate + queue a dispatchAgent command. */
export const handleDispatchAgent = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'dispatchAgent' }>,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: command handler validates target, employer, agent availability and suspicion threshold inline — splitting would scatter precondition rules.
): HandlerResult => {
  const state = ensureState(world);
  // We need an issuer; dispatchAgent has no `from` field in the spec — derive
  // from "first owned-asteroid" heuristic per AI ai-sanity convention. UIs
  // that know the player should pre-assign by checking suspicion.
  // Convention: the *target* is encoded in the command; the employer is the
  // first non-target alive player who has the credits to pay.
  if (!isMissionKind(cmd.mission)) return { ok: false, reason: 'invalid mission kind' };
  const target = world.players.get(cmd.targetPlayer);
  if (!target) return { ok: false, reason: 'target player not found' };

  const agent = findAgent(state, cmd.agentId);
  if (!agent) return { ok: false, reason: 'agent not found' };
  if (agent.captured) return { ok: false, reason: 'agent captured' };
  if (agent.employer) return { ok: false, reason: 'agent already on mission' };

  // Pick employer: any human player by default, else the first non-target alive.
  let employer: PlayerId | null = null;
  for (const p of world.players.values()) {
    if (p.id === cmd.targetPlayer) continue;
    if (!p.alive) continue;
    if (p.isHuman) {
      employer = p.id;
      break;
    }
  }
  if (!employer) {
    for (const p of world.players.values()) {
      if (p.id === cmd.targetPlayer) continue;
      if (p.alive) {
        employer = p.id;
        break;
      }
    }
  }
  if (!employer) return { ok: false, reason: 'no eligible employer' };

  const employerPlayer = world.players.get(employer);
  if (!employerPlayer) return { ok: false, reason: 'employer missing' };
  const cost = hireCostFor(cmd.agentId);
  if (employerPlayer.credits < cost) return { ok: false, reason: 'insufficient credits' };

  employerPlayer.credits -= cost;
  // Mutate agent in place — state.agents is readonly to outside but we own it.
  (agent as { employer: PlayerId | null }).employer = employer;

  const veteranBonus = Math.min(25, agent.successes * 5);
  const skill = baseSkillFor(cmd.agentId) + veteranBonus;
  const mission: EspionageMission = {
    id: `mis-${world.tick}-${state.missions.length}`,
    agentId: cmd.agentId,
    employer,
    target: cmd.targetPlayer,
    targetAsteroid: cmd.targetAsteroid ?? null,
    kind: cmd.mission,
    resolveTick: world.tick + DEFAULT_MISSION_RESOLUTION_TICKS,
    skill,
  };
  (state.missions as EspionageMission[]).push(mission);

  emitEvent(world, {
    kind: 'espionage.mission.dispatched',
    severity: 'grey',
    employer,
    target: cmd.targetPlayer,
    agentId: cmd.agentId,
    mission: cmd.mission,
    tick: world.tick,
  });
  return { ok: true };
};

/** Sum of `Security Centre` HP fractions on the target's asteroids, ×10. */
const securityRating = (world: World, target: PlayerId): number => {
  let total = 0;
  for (const a of world.asteroids.values()) {
    if (a.ownerId !== target) continue;
    for (const bid of a.buildings) {
      const b = world.buildings.get(bid);
      if (!b?.active) continue;
      if (b.defKind === 'bld.security-centre') total += 15;
      if (b.defKind === 'bld.cpu-core') total += 5;
    }
  }
  return total;
};

/** Apply sabotage damage to one matching building on the target asteroid. */
const applySabotage = (world: World, mission: EspionageMission): boolean => {
  const targetAsteroid = mission.targetAsteroid ? world.asteroids.get(mission.targetAsteroid) : null;
  if (!targetAsteroid) return false;

  const wantedKinds: Record<EspionageMissionKind, string[]> = {
    recon: [],
    techSteal: [],
    sabotageLifeSupport: ['bld.oxygen-generator', 'bld.water-recycler', 'bld.hydroponics-farm'],
    sabotagePower: ['bld.solar-array', 'bld.fission-reactor', 'bld.fission-reactor-he'],
    sabotageDefences: ['bld.orbital-defence-platform', 'bld.photon-turret', 'bld.amp-pod'],
    sabotageConstruction: ['bld.shipyard', 'bld.repair-facility', 'bld.refinery'],
    plantVirus: ['bld.cpu-core'],
    blackmail: [],
    intelGather: [],
    liberate: [],
  };
  const targets = wantedKinds[mission.kind];
  if (targets.length === 0) return false;

  for (const bid of targetAsteroid.buildings) {
    const b = world.buildings.get(bid);
    if (!b || !targets.includes(b.defKind)) continue;
    b.damage = Math.min(b.maxHp, b.damage + SABOTAGE_BUILDING_DAMAGE);
    b.hp = Math.max(0, b.hp - SABOTAGE_BUILDING_DAMAGE);
    if (b.hp === 0) b.active = false;
    const recent = world.espionage?.recentSabotage as string[] | undefined;
    if (recent) recent.push(bid);
    return true;
  }
  return false;
};

/** Resolve one due mission. Mutates `state.missions`. Returns the mission for caller logging. */
const resolveMission = (
  world: World,
  state: EspionageState,
  mission: EspionageMission,
  rng: Prng,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mission resolution is one self-contained state-machine — capture, suspicion, payload, reveal — and is clearer in one place than fanned out into helpers.
): void => {
  const agent = findAgent(state, mission.agentId);
  if (!agent) return;
  // d100 vs (skill - Security - counter)
  const counter = state.counterIntel[mission.target] ?? 0;
  const security = securityRating(world, mission.target);
  const target = mission.skill - security - counter;
  const roll = Math.floor(rng.next() * 100) + 1;
  const success = roll <= target;

  if (success) {
    (agent as { successes: number }).successes += 1;
    // Side-effects.
    if (
      mission.kind === 'sabotageLifeSupport' ||
      mission.kind === 'sabotagePower' ||
      mission.kind === 'sabotageDefences' ||
      mission.kind === 'sabotageConstruction' ||
      mission.kind === 'plantVirus'
    ) {
      applySabotage(world, mission);
    }
    if (mission.kind === 'techSteal') {
      const employer = world.players.get(mission.employer);
      const targetP = world.players.get(mission.target);
      if (employer && targetP) {
        // Steal one random blueprint they don't own.
        for (const bp of targetP.blueprintsOwned) {
          if (!employer.blueprintsOwned.has(bp)) {
            employer.blueprintsOwned.add(bp);
            break;
          }
        }
      }
    }
    if (mission.kind === 'intelGather') {
      // Bump employer reputation knowledge — small credit kickback as proxy.
      const employer = world.players.get(mission.employer);
      if (employer) employer.credits += 500;
    }
    // Successful infiltration still bumps target counter-intel modestly.
    const counter = state.counterIntel as Record<string, number>;
    counter[mission.target] = Math.min(100, (counter[mission.target] ?? 0) + 3);
  } else {
    // Failure — bump target counter-intel substantially.
    const counter = state.counterIntel as Record<string, number>;
    counter[mission.target] = Math.min(100, (counter[mission.target] ?? 0) + 10);
    // Capture roll.
    if (rng.next() < CAPTURE_REVEAL_PROBABILITY) {
      (agent as { captured: boolean }).captured = true;
      emitEvent(world, {
        kind: 'espionage.agent.captured',
        severity: 'red',
        employer: mission.employer,
        target: mission.target,
        agentId: mission.agentId,
        revealed: true,
        tick: world.tick,
      });
      // Reputation collapse.
      const targetP = world.players.get(mission.target);
      if (targetP) {
        const cur = targetP.reputation[mission.employer] ?? 0;
        targetP.reputation[mission.employer] = Math.max(-100, cur - 30);
      }
    }
  }

  // Suspicion meter on the *employer* — represents their cumulative shady-ness.
  const employerP = world.players.get(mission.employer);
  if (employerP) {
    employerP.suspicion = Math.min(100, employerP.suspicion + (success ? 4 : 8));
    if (employerP.suspicion >= BLACK_MARKET_SUSPICION_THRESHOLD) {
      emitEvent(world, {
        kind: 'blackMarket.unlocked',
        severity: 'grey',
        playerId: mission.employer,
        tick: world.tick,
      });
    }
  }

  // Free the agent if not captured.
  if (!agent.captured) {
    (agent as { employer: PlayerId | null }).employer = null;
  }

  emitEvent(world, {
    kind: 'espionage.mission.resolved',
    severity: success ? ('grey' as const) : ('amber' as const),
    employer: mission.employer,
    target: mission.target,
    agentId: mission.agentId,
    mission: mission.kind,
    success,
    tick: world.tick,
  } as Parameters<typeof emitEvent>[1]);
};

/** Tick phase — resolve all due missions. */
export const espionagePhase = (world: World, reg: PrngRegistry): void => {
  if (!world.espionage) return;
  const state = world.espionage;
  // Reset transient sabotage list each tick.
  (state as unknown as { recentSabotage: string[] }).recentSabotage = [];
  if (state.missions.length === 0) return;
  const rng = reg.get('espionage');
  const stillActive: EspionageMission[] = [];
  for (const m of state.missions) {
    if (m.resolveTick > world.tick) {
      stillActive.push(m);
      continue;
    }
    resolveMission(world, state, m, rng);
  }
  (state as unknown as { missions: EspionageMission[] }).missions = stillActive;
};
