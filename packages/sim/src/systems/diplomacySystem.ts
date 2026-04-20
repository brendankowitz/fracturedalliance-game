import type { Player, TreatyKind, World } from "@fa/domain";

const ATTACK_VIOLATING_KINDS: ReadonlyArray<TreatyKind> = ["nonAggression", "peace", "openBorders"];
const TREATY_BREAKING_KINDS: ReadonlyArray<TreatyKind> = ["nonAggression", "peace", "openBorders", "trade", "noCovert"];

const GRUDGE_WINDOW_TICKS = 2400;

const GRUDGE_WEIGHTS: Readonly<Record<string, number>> = {
  human_attacked_asteroid: 5,
  human_captured_asteroid: 30,
};

const KRYLL_ACCUSATION_MULTIPLIER = 1.25;
const MOTKAJ_LOW_CREDITS_THRESHOLD = 2000;
const MOTKAJ_BREAK_BASE_CHANCE = 0.05; // 5% per tick when low credits
const ACHAR_GRACE_PERIOD_TICKS = 500;

export function computeGrudgeScore(aiPlayer: Player): number {
  return aiPlayer.eventLog.reduce((sum, e) => sum + (GRUDGE_WEIGHTS[e.kind] ?? 0), 0);
}

/**
 * Resolves a Kryll Collective accusation against a target player.
 * Kryll receives a 1.25x multiplier to their success roll.
 * On success, `accusationBonusActive` is set on the Kryll player for next combat.
 * @returns "success" | "failed"
 */
export function resolveKryllAccusation(
  kryllPlayer: Player,
  _targetPlayer: Player,
  baseSuccessChance: number,
  roll: number,
): "success" | "failed" {
  const effectiveChance =
    kryllPlayer.raceId === "kryllCollective"
      ? baseSuccessChance * KRYLL_ACCUSATION_MULTIPLIER
      : baseSuccessChance;
  if (roll <= effectiveChance) {
    if (kryllPlayer.raceId === "kryllCollective") {
      kryllPlayer.accusationBonusActive = true;
    }
    return "success";
  }
  return "failed";
}

/**
 * Called when a treaty is signed involving any player.
 * If one party is an Achar player, sets their gracePeriodUntil.
 */
export function applyTreatySignedTraits(world: World, partyA: Player, partyB: Player): void {
  if (partyA.raceId === "achar") {
    partyA.gracePeriodUntil = world.tick + ACHAR_GRACE_PERIOD_TICKS;
  }
  if (partyB.raceId === "achar") {
    partyB.gracePeriodUntil = world.tick + ACHAR_GRACE_PERIOD_TICKS;
  }
}

export function tickDiplomacy(world: World): void {
  const now = world.tick;
  world.treaties = world.treaties.filter((t) => t.expiresTick == null || t.expiresTick > now);

  // Trim AI event logs to rolling 2400-tick window
  const cutoff = world.tick - GRUDGE_WINDOW_TICKS;
  for (const player of world.players.values()) {
    if (player.isHuman) continue;
    player.eventLog = player.eventLog.filter((e) => e.tick >= cutoff);
  }

  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  // Record grudge events when human ships attack AI asteroids (every 20 ticks)
  for (const ship of world.ships.values()) {
    if (ship.ownerId !== human.id) continue;
    if (ship.order.kind !== "attackAsteroid") continue;
    const target = world.asteroids.get(ship.order.target);
    if (!target?.ownerId) continue;
    const aiOwner = world.players.get(target.ownerId);
    if (!aiOwner || aiOwner.isHuman || !aiOwner.alive) continue;
    if (world.tick % 20 === 0) {
      aiOwner.eventLog.push({
        tick: world.tick,
        kind: "human_attacked_asteroid",
        data: { by: human.id as string, asteroidId: target.id as string },
      });
    }
  }

  // Detect treaty violations — AI ships attacking human asteroids
  for (const ship of world.ships.values()) {
    if (ship.order.kind !== "attackAsteroid") continue;
    const shipOwner = world.players.get(ship.ownerId);
    if (!shipOwner || shipOwner.isHuman || !shipOwner.alive) continue;

    const targetAsteroid = world.asteroids.get(ship.order.target);
    if (!targetAsteroid?.ownerId) continue;
    if (targetAsteroid.ownerId !== human.id) continue;

    for (const kind of ATTACK_VIOLATING_KINDS) {
      const treatyIndex = world.treaties.findIndex(
        (t) =>
          t.kind === kind &&
          t.parties.includes(ship.ownerId) &&
          t.parties.includes(human.id),
      );
      if (treatyIndex === -1) continue;

      world.eventQueue.push({
        kind: "treaty.broken",
        priority: "amber",
        by: ship.ownerId,
        against: human.id,
        treaty: kind,
      });
      world.treaties.splice(treatyIndex, 1);

      const current = human.reputation.get(ship.ownerId) ?? 0;
      human.reputation.set(ship.ownerId, current - 20);
    }
  }

  // Motkaj Clans: when low on credits, they break treaties more easily
  // Each tick there is a MOTKAJ_BREAK_BASE_CHANCE chance per treaty that Motkaj breaks it
  // when their credits < MOTKAJ_LOW_CREDITS_THRESHOLD (loyalty threshold effectively halved).
  for (const player of world.players.values()) {
    if (player.isHuman || !player.alive || player.raceId !== "motkaj") continue;
    if (player.credits >= MOTKAJ_LOW_CREDITS_THRESHOLD) continue;

    const motkajTreatyIndices: number[] = [];
    for (let i = 0; i < world.treaties.length; i++) {
      const t = world.treaties[i];
      if (
        t &&
        TREATY_BREAKING_KINDS.includes(t.kind) &&
        t.parties.includes(player.id) &&
        t.parties.includes(human.id)
      ) {
        motkajTreatyIndices.push(i);
      }
    }

    for (let i = motkajTreatyIndices.length - 1; i >= 0; i--) {
      const idx = motkajTreatyIndices[i];
      if (idx === undefined) continue;
      // 2x break probability (halved threshold) at low credits
      const breakRoll = world.prng.next();
      if (breakRoll < MOTKAJ_BREAK_BASE_CHANCE * 2) {
        const treaty = world.treaties[idx];
        if (!treaty) continue;
        world.eventQueue.push({
          kind: "treaty.broken",
          priority: "amber",
          by: player.id,
          against: human.id,
          treaty: treaty.kind,
        });
        world.treaties.splice(idx, 1);
        const rep = human.reputation.get(player.id) ?? 0;
        human.reputation.set(player.id, rep - 20);
      }
    }
  }
}
