import type { AsteroidId } from "@fa/domain";
import type { SaveV1 } from "@fa/persistence";
import type { Command, DifficultyLevel, SimApi } from "@fa/sim";
import type { Remote } from "comlink";
import * as Comlink from "comlink";
import { Assets } from "pixi.js";
import { musicPlayer, playSound, SFX } from "../audio.ts";
import { detectAchievements } from "../store/achievementDetector.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { getPixiApp } from "./pixiApp.ts";
import type { ColorPalette } from "./views/sectorView.ts";
import { SECTOR_ASSET_URLS, SectorView } from "./views/sectorView.ts";

const FIXED_STEP_MS = 50;

export interface RenderLoopHandle {
  stop: () => void;
  setTimeScale: (scale: number) => void;
  sendCommand: (cmd: Command) => void;
  saveToSlot: (slot: number, label: string) => Promise<void>;
  loadFromSlot: (slot: number) => Promise<void>;
  setColorPalette: (p: ColorPalette) => void;
}

export function startRenderLoop(
  WorkerClass: new () => Worker,
  seed: number,
  difficulty: DifficultyLevel = "manager",
): RenderLoopHandle {
  const rawWorker = new WorkerClass();
  const RemoteSimApi = Comlink.wrap<typeof SimApi>(rawWorker);

  let instance: Remote<InstanceType<typeof SimApi>> | null = null;
  let timeScale = 1;
  let accumulator = 0;
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
          // Auto-select human colony on first tick so inspector is immediately visible
          if (snap.tick === 1 && useUiStore.getState().selectedAsteroidId === null) {
            const colony = snap.asteroids.find((a) => a.ownerId === snap.humanPlayerId);
            if (colony) useUiStore.getState().selectAsteroid(colony.id);
          }
          for (const ev of snap.events) {
            switch (ev.kind) {
              case "asteroid.settled":
                playSound(SFX.treatySigned);
                break;
              case "construction.done":
                playSound(SFX.buildComplete);
                break;
              case "blackmarket.purchase":
                playSound(SFX.blackMarket);
                break;
              case "asteroid.engine_charging":
                playSound(SFX.engineCharging);
                break;
              case "asteroid.destroyed":
                playSound(SFX.attack);
                break;
              case "missile.launched":
                playSound(SFX.engineCharging);
                break;
              case "missile.impact":
                playSound(SFX.attack);
                break;
              case "expedition.enforcer_arrived":
                playSound(SFX.attack);
                break;
              case "agent.mission_failed":
                playSound(SFX.espionage);
                break;
              case "bribe.accepted":
                playSound(SFX.treatySigned);
                break;
              case "bribe.rejected":
              case "treaty.broken":
              case "colony.seceded":
              case "trader.arrived":
              case "federation.investigation_warning":
              case "federation.license_revoked":
              case "asteroid.independence":
                playSound(SFX.notification);
                break;
              case "victory.independence":
                playSound(SFX.victoryFanfare);
                musicPlayer.stop();
                break;
              case "game.ended":
                if (snap.gameEndState === "defeat") playSound(SFX.defeat);
                else playSound(SFX.victoryFanfare);
                musicPlayer.stop();
                break;
            }
          }
          if (
            snap.events.some(
              (e) => e.kind === "asteroid.destroyed" || e.kind === "expedition.enforcer_arrived",
            )
          ) {
            musicPlayer.play("combat");
          }
          // Autosave to slot -1 every 60 ticks (skip tick 0)
          if (snap.tick > 0 && snap.tick % 60 === 0) {
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
    setTimeScale(scale) {
      timeScale = scale;
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
