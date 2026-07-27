import type { AsteroidId } from "@fa/domain";
import type { SaveV1 } from "@fa/persistence";
import type { Command, DifficultyLevel, SimApi } from "@fa/sim";
import { TICKS_PER_SIM_DAY } from "@fa/sim";
import type { Remote } from "comlink";
import * as Comlink from "comlink";
import { Assets } from "pixi.js";
import { musicPlayer, playSound, SFX } from "../audio.ts";
import { detectAchievements } from "../store/achievementDetector.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useTimeStore } from "../store/timeStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { getPixiApp } from "./pixiApp.ts";
import type { ColorPalette } from "./views/sectorView.ts";
import { SECTOR_ASSET_URLS, SectorView } from "./views/sectorView.ts";

const FIXED_STEP_MS = 50;

export interface RenderLoopHandle {
  stop: () => void;
  sendCommand: (cmd: Command) => void;
  saveToSlot: (slot: number, label: string) => Promise<void>;
  loadFromSlot: (slot: number) => Promise<void>;
  setColorPalette: (p: ColorPalette) => void;
}

/**
 * Phase C (Stage 1 adoption): the adopted engine (SimApiV2 over the vendored
 * copilot-opus sim) is the default. `?sim=v1` selects the legacy sim — the
 * documented rollback path until Phase E deletes it.
 */
function chooseSimWorker(LegacyWorkerClass: new () => Worker): Worker {
  const wantsLegacy =
    typeof location !== "undefined" && new URLSearchParams(location.search).get("sim") === "v1";
  if (wantsLegacy) return new LegacyWorkerClass();
  return new Worker(new URL("../workers/sim.worker.v2.ts", import.meta.url), { type: "module" });
}

export function startRenderLoop(
  WorkerClass: new () => Worker,
  seed: number,
  difficulty: DifficultyLevel = "manager",
): RenderLoopHandle {
  const rawWorker = chooseSimWorker(WorkerClass);
  const RemoteSimApi = Comlink.wrap<typeof SimApi>(rawWorker);

  let instance: Remote<InstanceType<typeof SimApi>> | null = null;
  let accumulator = 0;
  let autoSelectedColony = false;
  let lastFrame = performance.now();
  let rafId = 0;
  let running = true;
  const pendingCommands: Command[] = [];
  let sectorView: SectorView | null = null;

  musicPlayer.play("exploration");

  void (async () => {
    instance = await new RemoteSimApi({ seed, humanPlayerRaceId: "helionCorp", difficulty });

    await Assets.load(SECTOR_ASSET_URLS);

    const pixiApp = getPixiApp();
    sectorView = new SectorView(pixiApp, (id: AsteroidId) => {
      useUiStore.getState().selectAsteroid(id);
    });
    sectorView.setColorPalette(useUiStore.getState().colorPalette);
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__faSelectAsteroid = (id: string) =>
        useUiStore.getState().selectAsteroid(id as AsteroidId);
    }

    const frame = async (now: number) => {
      if (!running) return;
      const dt = now - lastFrame;
      lastFrame = now;

      const uiState = useUiStore.getState();
      const timeScale = useTimeStore.getState().timeScale;
      const shouldTick = !uiState.paused && (!uiState.slowSimMode || uiState.pendingEndTurn);

      if (instance !== null && timeScale > 0 && shouldTick) {
        accumulator += dt * timeScale;
        let ticked = false;
        const maxTicks = uiState.slowSimMode ? 1 : Infinity;
        let tickCount = 0;
        while (accumulator >= FIXED_STEP_MS && tickCount < maxTicks) {
          for (const cmd of pendingCommands) {
            await instance.enqueueCommand(cmd);
          }
          pendingCommands.length = 0;
          await instance.tick(FIXED_STEP_MS);
          accumulator -= FIXED_STEP_MS;
          ticked = true;
          tickCount++;
        }
        if (ticked) {
          const snap = await instance.getSnapshot();
          useGameStore.getState().setSnapshot(snap);
          sectorView?.update(snap);
          detectAchievements(snap);
          // Open the player's colony as soon as one exists, so the game does not start
          // on an empty map with the surface unreachable. This cannot key off a single
          // tick: the accumulator runs a batch of ticks per frame and only snapshots
          // afterwards, so tick 1 is routinely never observed. Latches after the first
          // success so a deliberate deselection is never overridden.
          if (!autoSelectedColony) {
            const colony = snap.asteroids.find((a) => a.ownerId === snap.humanPlayerId);
            if (colony) {
              autoSelectedColony = true;
              if (useUiStore.getState().selectedAsteroidId === null) {
                useUiStore.getState().selectAsteroid(colony.id);
              }
            }
          }
          // Per-event SFX now live in NotificationFeed via the shared
          // eventKindMeta table (one table, both sims' vocabularies, and the
          // feed's dedup stops repeat-fire). The render loop keeps only the
          // music-level transitions.
          for (const ev of snap.events) {
            if (ev.kind === "victory.independence") {
              playSound(SFX.victoryFanfare);
              musicPlayer.stop();
            } else if (ev.kind === "game.ended" || ev.kind === "game.over") {
              if (snap.gameEndState === "defeat") playSound(SFX.defeat);
              else playSound(SFX.victoryFanfare);
              musicPlayer.stop();
            }
          }
          if (
            snap.events.some(
              (e) =>
                e.kind === "asteroid.destroyed" ||
                e.kind === "expedition.enforcer_arrived" ||
                e.kind === "colony.under_attack",
            )
          ) {
            musicPlayer.play("combat");
          }
          // Autosave to slot -1 once per sim-day, so the cadence holds at any speed preset
          if (snap.tick > 0 && snap.tick % TICKS_PER_SIM_DAY === 0) {
            void (async () => {
              try {
                const blob = await instance.getSaveBlob();
                const { saveToSlot: idbSave } = await import("@fa/persistence");
                await idbSave(-1, JSON.parse(blob) as import("@fa/persistence").SaveV1, "Autosave");
              } catch (err) {
                console.warn("[autosave] failed:", err);
              }
            })();
          }
          if (useUiStore.getState().slowSimMode) {
            useUiStore.getState().consumeEndTurn();
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
  })();

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      sectorView?.destroy();
      sectorView = null;
      rawWorker.terminate();
      musicPlayer.stop();
    },
    sendCommand(cmd) {
      pendingCommands.push(cmd);
    },
    async saveToSlot(slot, label) {
      if (!instance) return;
      const json = await instance.getSaveBlob();
      const { saveToSlot: idbSave } = await import("@fa/persistence");
      await idbSave(slot, JSON.parse(json) as SaveV1, label);
    },
    async loadFromSlot(slot) {
      if (!instance) return;
      const { loadFromSlot: idbLoad } = await import("@fa/persistence");
      const save = await idbLoad(slot);
      if (!save) return;
      await instance.restore(JSON.stringify(save));
      const snap = await instance.getSnapshot();
      useGameStore.getState().setSnapshot(snap);
      sectorView?.update(snap);
    },
    setColorPalette(p) {
      sectorView?.setColorPalette(p);
    },
  };
}
