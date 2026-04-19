import type { Command, DifficultyLevel } from "@fa/sim";
import { useCallback, useEffect, useRef, useState } from "react";
import { initPixi } from "./game/pixiApp.ts";
import type { RenderLoopHandle } from "./game/renderLoop.ts";
import { startRenderLoop } from "./game/renderLoop.ts";
import { HUD } from "./hud/HUD.tsx";
import { NewGameScreen } from "./hud/NewGameScreen.tsx";
import { useUiStore } from "./store/uiStore.ts";
import SimWorker from "./workers/sim.worker.ts?worker";

interface GameParams {
  seed: number;
  difficulty: DifficultyLevel;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<RenderLoopHandle | null>(null);
  const [gameParams, setGameParams] = useState<GameParams | null>(null);
  const colorPalette = useUiStore((s) => s.colorPalette);
  const fontScale = useUiStore((s) => s.fontScale);

  useEffect(() => {
    loopRef.current?.setColorPalette(colorPalette);
  }, [colorPalette]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontScale + "%";
  }, [fontScale]);

  useEffect(() => {
    if (gameParams === null || !canvasRef.current) return;
    let cancelled = false;

    void initPixi(canvasRef.current).then(() => {
      if (cancelled) return;
      loopRef.current = startRenderLoop(SimWorker, gameParams.seed, gameParams.difficulty);
    });

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [gameParams]);

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

  function handleStart(seed: number, difficulty: DifficultyLevel) {
    setGameParams({ seed, difficulty });
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {gameParams === null && <NewGameScreen onStart={handleStart} />}
      {gameParams !== null && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", position: "relative", height: "100%" }}>
            <HUD onSave={handleSave} onLoad={handleLoad} onCommand={handleCommand} />
          </div>
        </div>
      )}
    </div>
  );
}
