import type { Player, World } from "@fa/domain";

const EXPEDITION_DURATION_TICKS = 1800;
const ENFORCER_CADENCE_TICKS = 200;
const SUSPICION_DECAY_TICK_PERIOD = 100;
const INDEPENDENCE_CHECK_TICK_PERIOD = 50;
const INDEPENDENCE_ROLL_THRESHOLD = 0.05;
const INVESTIGATION_ROLL_THRESHOLD = 0.3;
const INVESTIGATION_SUSPICION_FLOOR = 80;
const LICENSE_REVOKE_THRESHOLD = 100;
const INDEPENDENCE_HAPPINESS_FLOOR = 0.3;

export function tickBlackMarket(world: World): void {
  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  // Expedition countdown and enforcer spawns (runs before revocation trigger so
  // that the tick that *starts* the expedition preserves its initialized
  // ticksRemaining — the first decrement happens on the next tick).
  if (world.expeditionFleet.active) {
    world.expeditionFleet.ticksRemaining = Math.max(
      0,
      world.expeditionFleet.ticksRemaining - 1,
    );
    if (world.expeditionFleet.ticksRemaining <= 0) {
      world.expeditionFleet.active = false;
      world.eventQueue.push({ kind: "victory.independence", priority: "green" });
    } else {
      // Use expedition-relative ticks: fire at relative ticks 200, 400, 600...
      const elapsedTicks = EXPEDITION_DURATION_TICKS - world.expeditionFleet.ticksRemaining;
      if (elapsedTicks > 0 && elapsedTicks % ENFORCER_CADENCE_TICKS === 0) {
        spawnEnforcer(world, human);
      }
    }
  }

  // License revocation trigger — starts the expedition. Countdown has already
  // run for this tick, so ticksRemaining stays at the initialized value until
  // the next tick.
  if (!human.licenseRevoked && human.suspicion >= LICENSE_REVOKE_THRESHOLD) {
    human.licenseRevoked = true;
    world.expeditionFleet = {
      active: true,
      ticksRemaining: EXPEDITION_DURATION_TICKS,
      fleetsLaunched: 0,
    };
    world.eventQueue.push({ kind: "federation.license_revoked", priority: "red" });
  }

  // Periodic suspicion decay + investigation warnings (pre-revocation only)
  if (world.tick % SUSPICION_DECAY_TICK_PERIOD === 0) {
    human.suspicion = Math.max(0, human.suspicion - 1);

    if (
      !human.licenseRevoked &&
      human.suspicion >= INVESTIGATION_SUSPICION_FLOOR &&
      human.federationStanding > 0
    ) {
      if (world.prng.next() < INVESTIGATION_ROLL_THRESHOLD) {
        world.eventQueue.push({ kind: "federation.investigation_warning", priority: "amber" });
        human.federationStanding = Math.max(-100, human.federationStanding - 10);
      }
    }
  }

  // Asteroid independence from low happiness (pre-existing behaviour)
  if (world.tick % INDEPENDENCE_CHECK_TICK_PERIOD === 0) {
    for (const asteroid of world.asteroids.values()) {
      if (asteroid.ownerId !== human.id) continue;
      if (asteroid.happiness >= INDEPENDENCE_HAPPINESS_FLOOR) continue;
      if (world.prng.next() < INDEPENDENCE_ROLL_THRESHOLD) {
        asteroid.ownerId = null;
        world.eventQueue.push({
          kind: "asteroid.independence",
          priority: "amber",
          asteroidName: asteroid.name,
        });
        human.federationStanding = Math.max(-100, human.federationStanding - 5);
      }
    }
  }
}

function spawnEnforcer(world: World, human: Player): void {
  const humanAsteroids = [...world.asteroids.values()].filter((a) => a.ownerId === human.id);
  if (humanAsteroids.length === 0) return;
  const idx = Math.floor(world.prng.next() * humanAsteroids.length);
  const target = humanAsteroids[idx];
  if (!target) return;
  world.expeditionFleet.fleetsLaunched++;
  world.eventQueue.push({
    kind: "expedition.enforcer_arrived",
    priority: "red",
    asteroidName: target.name,
  });
}
