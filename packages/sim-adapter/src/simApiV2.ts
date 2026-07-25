/**
 * SimApiV2 — opus's five-method Comlink sim contract, reimplemented over
 * the vendored copilot-opus engine (Stage 1 adoption spec §1.3).
 *
 * The surface matches `@fa/sim`'s SimApi exactly (tick / enqueueCommand /
 * getSnapshot / getSaveBlob / restore) so the render loop, autosave, and
 * persistence envelope keep working; only the worker entry chooses which
 * implementation to expose.
 */

// Load-bearing side effect: registers the utility-AI driver via
// setAiDriver. Without it the sim ticks with no opponents, silently.
import "@fab/ai";

import type { Command, DifficultyLevel } from "@fa/sim";
import { SCENARIO_IDS, SCENARIOS } from "@fab/content";
import type { Difficulty, GameEvent, PlayerId, World } from "@fab/domain";
import {
  createWorld,
  deserializeWorld,
  hasAiDriver,
  migrateToLatest,
  type SerializedWorld,
  serializeWorld,
  tickOnce,
} from "@fab/sim";
import { translateCommand } from "./commandTranslator.ts";
import { type HudSnapshotV2, takeHudSnapshot } from "./hudSnapshot.ts";

/** Envelope schema for V2 saves. V1 envelopes carried the legacy world model. */
export const SAVE_ENVELOPE_VERSION = 2;

export interface SimApiV2Config {
  seed: number;
  humanPlayerRaceId?: string;
  difficulty?: DifficultyLevel;
  /** Vendored scenario id; defaults to the classic skirmish. */
  scenarioId?: string;
}

const DIFFICULTY_MAP: Record<DifficultyLevel, Difficulty> = {
  intern: "easy",
  manager: "normal",
  director: "hard",
  ceo: "hard",
  board: "hard",
};

interface SaveEnvelopeV2 {
  schemaVersion: typeof SAVE_ENVELOPE_VERSION;
  gameVersion: string;
  createdAtIso: string;
  playerName: string;
  verdict: "inProgress" | "won" | "lost";
  difficulty: DifficultyLevel;
  rngSeed: number;
  worldSnapshot: SerializedWorld;
  uiPrefs: Record<string, never>;
}

export class SimApiV2 {
  private world: World;
  private pendingCommands: Command[] = [];
  private eventCursor = 0;
  private readonly difficulty: DifficultyLevel;

  constructor(config: SimApiV2Config) {
    if (!hasAiDriver()) {
      throw new Error(
        "SimApiV2: no AI driver registered — the '@fab/ai' import side effect was lost. " +
          "The sim would run with no opponents. Refusing to start.",
      );
    }
    this.difficulty = config.difficulty ?? "manager";
    const scenarioId = config.scenarioId ?? SCENARIO_IDS.classicSkirmish;
    const scenario = (SCENARIOS as Record<string, (typeof SCENARIOS)[keyof typeof SCENARIOS]>)[
      scenarioId
    ];
    if (!scenario) throw new Error(`SimApiV2: unknown scenario id "${scenarioId}"`);
    this.world = createWorld({
      seed: config.seed,
      scenarioId,
      scenario,
      difficulty: DIFFICULTY_MAP[this.difficulty],
    });
  }

  tick(_deltaMs: number): void {
    const humanId = this.humanId();
    for (const cmd of this.pendingCommands) {
      const translated = translateCommand(cmd, humanId, this.world);
      if (translated) this.world.commandQueue.push(translated);
    }
    this.pendingCommands = [];
    tickOnce(this.world);
  }

  enqueueCommand(command: Command): void {
    this.pendingCommands.push(command);
  }

  getSnapshot(): HudSnapshotV2 {
    const newEvents: GameEvent[] = this.world.eventQueue.slice(this.eventCursor);
    this.eventCursor = this.world.eventQueue.length;
    return takeHudSnapshot(this.world, this.difficulty, newEvents);
  }

  getSaveBlob(): string {
    const outcome = this.world.outcome;
    const humanId = this.humanId();
    const verdict: SaveEnvelopeV2["verdict"] =
      outcome === null ? "inProgress" : outcome.winnerId === humanId ? "won" : "lost";
    const envelope: SaveEnvelopeV2 = {
      schemaVersion: SAVE_ENVELOPE_VERSION,
      gameVersion: "0.2.0",
      createdAtIso: new Date().toISOString(),
      playerName: "Commander",
      verdict,
      difficulty: this.difficulty,
      rngSeed: this.world.seed,
      worldSnapshot: serializeWorld(this.world),
      uiPrefs: {},
    };
    return JSON.stringify(envelope);
  }

  restore(blob: string): void {
    const save = JSON.parse(blob) as { schemaVersion?: number; worldSnapshot?: unknown };
    if (save.schemaVersion !== SAVE_ENVELOPE_VERSION) {
      throw new Error(
        `This save is from an earlier version of the game (schema ${String(
          save.schemaVersion ?? "unknown",
        )}) and cannot be loaded — please start a new game.`,
      );
    }
    const migrated = migrateToLatest(save.worldSnapshot);
    this.world = deserializeWorld(migrated);
    this.pendingCommands = [];
    this.eventCursor = this.world.eventQueue.length;
  }

  private humanId(): PlayerId {
    const human = [...this.world.players.values()].find((p) => p.isHuman);
    if (!human) throw new Error("SimApiV2: world has no human player");
    return human.id;
  }
}
