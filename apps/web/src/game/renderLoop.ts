import type { Command, SimApi } from "@fa/sim";
import type { Remote } from "comlink";
import * as Comlink from "comlink";
import { useGameStore } from "../store/gameStore.ts";

const FIXED_STEP_MS = 50;

export interface RenderLoopHandle {
  stop: () => void;
  setTimeScale: (scale: number) => void;
  sendCommand: (cmd: Command) => void;
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

  void (async () => {
    instance = await new RemoteSimApi({ seed: Date.now(), humanPlayerRaceId: "helionCorp" });

    const frame = async (now: number) => {
      if (!running) return;
      const dt = now - lastFrame;
      lastFrame = now;

      if (instance !== null && timeScale > 0) {
        accumulator += dt * timeScale;
        while (accumulator >= FIXED_STEP_MS) {
          for (const cmd of pendingCommands) {
            await instance.enqueueCommand(cmd);
          }
          pendingCommands.length = 0;
          await instance.tick(FIXED_STEP_MS);
          accumulator -= FIXED_STEP_MS;
        }
        const snap = await instance.getSnapshot();
        useGameStore.getState().setSnapshot(snap);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
  })();

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      rawWorker.terminate();
    },
    setTimeScale(scale) {
      timeScale = scale;
    },
    sendCommand(cmd) {
      pendingCommands.push(cmd);
    },
  };
}
