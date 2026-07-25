/**
 * Single shared event-kind table (Stage 1 adoption spec §4.2) — label and
 * sound for every event kind either sim emits. NotificationFeed and the
 * render loop both read this so a new kind lands in one place.
 *
 * Rule (spec §5): unknown kinds must pass through visibly — consumers fall
 * back to showing the raw kind string, never dropping the event.
 */

import type { SFX } from "../audio.ts";

export interface EventKindMeta {
  label: string;
  /** Key into SFX, or null for silent events. */
  sfx: keyof typeof SFX | null;
  /** Volume for the sound, when quieter than default. */
  volume?: number;
}

export const EVENT_KIND_META: Readonly<Record<string, EventKindMeta>> = {
  // ── Shared / legacy-sim kinds ─────────────────────────────────────────
  "colony.under_attack": { label: "Colony under attack", sfx: "attack" },
  "colony.captured": { label: "Colony captured", sfx: "attack" },
  "colony.seceded": { label: "Colony seceded", sfx: "notification" },
  "asteroid.incoming": { label: "Asteroid incoming!", sfx: "attack" },
  "asteroid.settled": { label: "Asteroid settled", sfx: "treatySigned" },
  "asteroid.destroyed": { label: "Asteroid destroyed", sfx: "attack" },
  "asteroid.engine_charging": { label: "Asteroid engine charging", sfx: "engineCharging" },
  "asteroid.independence": { label: "Colony declared independence", sfx: "notification" },
  "construction.done": { label: "Construction complete", sfx: "buildComplete" },
  "trader.arrived": { label: "Transporter arrived", sfx: "notification", volume: 0.5 },
  "treaty.signed": { label: "Treaty signed", sfx: "treatySigned" },
  "treaty.broken": { label: "Treaty broken", sfx: "treatySigned" },
  "missile.launched": { label: "Missile launched", sfx: "engineCharging" },
  "missile.impact": { label: "Missile impact!", sfx: "attack" },
  "blueprint.purchased": { label: "Blueprint acquired", sfx: "notification", volume: 0.5 },
  "blackmarket.purchase": { label: "Black-market purchase", sfx: "blackMarket" },
  "bribe.accepted": { label: "Bribe accepted", sfx: "treatySigned" },
  "bribe.rejected": { label: "Bribe rejected", sfx: "notification" },
  "federation.investigation_warning": { label: "Federation investigation", sfx: "notification" },
  "federation.license_revoked": { label: "Corporate licence revoked", sfx: "notification" },
  "expedition.enforcer_arrived": { label: "Federation enforcers arrived", sfx: "attack" },
  "agent.mission_failed": { label: "Agent mission failed", sfx: "espionage" },
  "espionage.detected": { label: "Espionage detected", sfx: "espionage" },
  "victory.independence": { label: "Independence achieved", sfx: "victoryFanfare" },
  "game.ended": { label: "Game over", sfx: null }, // render loop picks victory/defeat sting
  "colony.starved": { label: "Colony starving", sfx: "notification" },

  // ── Vendored-sim kinds (Stage 1 adoption) ─────────────────────────────
  "buildQueue.completed": { label: "Construction complete", sfx: "buildComplete" },
  "blueprint.unlocked": { label: "Blueprint unlocked", sfx: "notification", volume: 0.5 },
  "research.started": { label: "Research started", sfx: null },
  "research.completed": { label: "Research complete", sfx: "buildComplete" },
  "federal.transporter": {
    label: "Federal Transporter departed",
    sfx: "notification",
    volume: 0.5,
  },
  "federal.investigation": { label: "Federation investigation", sfx: "notification" },
  "famine.projected": { label: "Famine projected", sfx: "notification" },
  "resource.deficit": { label: "Resource deficit", sfx: "notification", volume: 0.5 },
  "population.unrest": { label: "Population unrest", sfx: "notification" },
  "market.shock": { label: "Market shock", sfx: "notification", volume: 0.5 },
  "ship.destroyed": { label: "Ship destroyed", sfx: "attack" },
  "command.rejected": { label: "Order rejected", sfx: null },
  "council.embargo": { label: "Federal Council: embargo imposed", sfx: "notification" },
  "council.tariff": { label: "Federal Council: tariff imposed", sfx: "notification" },
  "council.vote.opened": { label: "Federal Council: vote opened", sfx: "notification" },
  "espionage.mission.dispatched": { label: "Agent dispatched", sfx: "espionage" },
  "espionage.mission.resolved": { label: "Espionage mission resolved", sfx: "espionage" },
  "espionage.agent.captured": { label: "Agent captured", sfx: "espionage" },
  "blackMarket.unlocked": { label: "Black market contact made", sfx: "blackMarket" },
  "satellite.launched": { label: "Satellite launched", sfx: "notification", volume: 0.5 },
  "satellite.destroyed": { label: "Satellite destroyed", sfx: "attack" },
  "odp.intercepted": { label: "Missile intercepted", sfx: "notification" },
  "game.over": { label: "Game over", sfx: null },
  "tutorial.objective.activated": { label: "New objective", sfx: null },
  "tutorial.objective.completed": { label: "Objective complete", sfx: "buildComplete" },
};

/** Label for a kind — falls back to the raw kind so nothing ever vanishes. */
export const eventLabel = (kind: string): string => EVENT_KIND_META[kind]?.label ?? kind;
