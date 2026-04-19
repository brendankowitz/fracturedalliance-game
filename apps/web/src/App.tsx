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

  const handleSave = useCallback((slot: number, label: string) => {
    void loopRef.current?.saveToSlot(slot, label);
  }, []);

  const handleLoad = useCallback((slot: number) => {
    void loopRef.current?.loadFromSlot(slot);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", position: "relative", height: "100%" }}>
          <HUD onSave={handleSave} onLoad={handleLoad} />
        </div>
      </div>
    </div>
  );
}
