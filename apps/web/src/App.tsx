import type { Command } from "@fa/sim";
import { useCallback, useEffect, useRef } from "react";
import { initPixi } from "./game/pixiApp.ts";
import type { RenderLoopHandle } from "./game/renderLoop.ts";
import { startRenderLoop } from "./game/renderLoop.ts";
import { HUD } from "./hud/HUD.tsx";
import SimWorker from "./workers/sim.worker.ts?worker";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<RenderLoopHandle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    void initPixi(canvasRef.current).then(() => {
      if (cancelled) return;
      loopRef.current = startRenderLoop(SimWorker);
    });

    return () => {
      cancelled = true;
      loopRef.current?.stop();
    };
  }, []);

  const handleSave = useCallback(
    (slot: number, label: string): Promise<void> =>
      loopRef.current?.saveToSlot(slot, label) ?? Promise.resolve(),
    [],
  );

  const handleLoad = useCallback((slot: number) => {
    void loopRef.current?.loadFromSlot(slot);
  }, []);

  const handleCommand = useCallback((cmd: Command) => {
    loopRef.current?.sendCommand(cmd);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", position: "relative", height: "100%" }}>
          <HUD onSave={handleSave} onLoad={handleLoad} onCommand={handleCommand} />
        </div>
      </div>
    </div>
  );
}
