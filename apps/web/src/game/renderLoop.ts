import type { AsteroidId } from "@fa/domain";
import type { SaveV1 } from "@fa/persistence";
import type { Command, SimApi } from "@fa/sim";
import type { Remote } from "comlink";
import * as Comlink from "comlink";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { getPixiApp } from "./pixiApp.ts";
import { SectorView } from "./views/sectorView.ts";

const FIXED_STEP_MS = 50;

export interface RenderLoopHandle {
  stop: () => void;
  setTimeScale: (scale: number) => void;
  sendCommand: (cmd: Command) => void;
  saveToSlot: (slot: number, label: string) => Promise<void>;
  loadFromSlot: (slot: number) => Promise<void>;
}

export function startRenderLoop(WorkerClass: new () => Worker): RenderLoopHandle {
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

  void (async () => {
    instance = await new RemoteSimApi({ seed: Date.now(), humanPlayerRaceId: "helionCorp" });

    const pixiApp = getPixiApp();
    sectorView = new SectorView(pixiApp, (id: AsteroidId) => {
      useUiStore.getState().selectAsteroid(id);
    });

    const frame = async (now: number) => {
      if (!running) return;
      const dt = now - lastFrame;
      lastFrame = now;

      if (instance !== null && timeScale > 0) {
        accumulator += dt * timeScale;
        let ticked = false;
        while (accumulator >= FIXED_STEP_MS) {
          for (const cmd of pendingCommands) {
            await instance.enqueueCommand(cmd);
          }
          pendingCommands.length = 0;
          await instance.tick(FIXED_STEP_MS);
          accumulator -= FIXED_STEP_MS;
          ticked = true;
        }
        if (ticked) {
          const snap = await instance.getSnapshot();
          useGameStore.getState().setSnapshot(snap);
          sectorView?.update(snap);
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
      const { loadFromSlot: idbLoad } = await import("@fa/persistence");
      const save = await idbLoad(slot);
      if (!save) return;
      // Full restore wired in Phase 1 when SimApi.restore(save) is implemented
    },
  };
}
