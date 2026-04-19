import { Application } from "pixi.js";

// Module-level singleton — justified exception: PixiJS is a process-wide resource.
let _app: Application | null = null;

export async function initPixi(canvas: HTMLCanvasElement): Promise<Application> {
  if (_app) return _app;

  _app = new Application();
  await _app.init({
    canvas,
    resizeTo: canvas.parentElement ?? window,
    backgroundColor: 0x050510,
    antialias: true,
    resolution: window.devicePixelRatio ?? 1,
    autoDensity: true,
  });

  return _app;
}

export function getPixiApp(): Application {
  if (!_app) throw new Error("PixiJS not initialised — call initPixi first");
  return _app;
}

export function destroyPixi(): void {
  _app?.destroy(false, { children: true });
  _app = null;
}
