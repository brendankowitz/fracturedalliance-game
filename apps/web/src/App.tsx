import { useEffect, useRef } from "react";
import { initPixi } from "./game/pixiApp.ts";
import { startRenderLoop } from "./game/renderLoop.ts";
import { HUD } from "./hud/HUD.tsx";
import SimWorker from "./workers/sim.worker.ts?worker";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let loopHandle: ReturnType<typeof startRenderLoop> | null = null;

    void initPixi(canvasRef.current).then(() => {
      loopHandle = startRenderLoop(SimWorker);
    });

    return () => {
      loopHandle?.stop();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", position: "relative", height: "100%" }}>
          <HUD />
        </div>
      </div>
    </div>
  );
}
