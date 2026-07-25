import { useEffect, useRef, useState } from "react";
import { AsteroidSurfaceView, type SurfaceBuilding } from "../game/views/asteroidSurfaceView.ts";
import type { Cell } from "../game/views/surface/isoProjection.ts";

interface SurfaceCanvasProps {
  asteroidId: string;
  gridWidth: number;
  gridHeight: number;
  buildings: ReadonlyArray<SurfaceBuilding>;
  pending: ReadonlyArray<Cell>;
  selected: Cell | null;
  ghostKind: string | null;
  interactive: boolean;
  onSelectCell: (cell: Cell | null) => void;
  /** Rejected because a crater occupies the cell — the caller surfaces the reason. */
  onBlockedCell: (cell: Cell) => void;
}

const WIDTH = 520;
const HEIGHT = 300;

export function SurfaceCanvas({
  asteroidId,
  gridWidth,
  gridHeight,
  buildings,
  pending,
  selected,
  ghostKind,
  interactive,
  onSelectCell,
  onBlockedCell,
}: SurfaceCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<AsteroidSurfaceView | null>(null);
  const [ready, setReady] = useState(false);

  // Callbacks are read through a ref so the view is built once, not on every render.
  const handlersRef = useRef({ onSelectCell, onBlockedCell });
  handlersRef.current = { onSelectCell, onBlockedCell };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Each mount gets its own canvas. React's StrictMode mounts effects twice, and two
    // PixiJS Applications initialising against one canvas fight over its WebGL context.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "Asteroid surface");
    canvas.style.display = "block";
    host.appendChild(canvas);

    let cancelled = false;
    void AsteroidSurfaceView.create(canvas, WIDTH, HEIGHT, {
      onSelectCell: (cell) => {
        if (cell && viewRef.current?.isBlocked(cell)) {
          handlersRef.current.onBlockedCell(cell);
          return;
        }
        handlersRef.current.onSelectCell(cell);
      },
      onHoverCell: () => {
        // Hover feedback is drawn inside the view; React does not need to re-render.
      },
    }).then((view) => {
      if (cancelled) {
        view.destroy();
        canvas.remove();
        return;
      }
      viewRef.current = view;
      setReady(true);
    });

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
      canvas.remove();
      setReady(false);
    };
  }, []);

  // The snapshot ticks 20x a second and the caller rebuilds these arrays each render, so
  // redraw is gated on the content actually changing rather than on array identity.
  const signature = [
    asteroidId,
    gridWidth,
    gridHeight,
    buildings.map((b) => `${b.kind}@${b.cell.x},${b.cell.y}`).join("|"),
    pending.map((c) => `${c.x},${c.y}`).join("|"),
    selected ? `${selected.x},${selected.y}` : "-",
    ghostKind ?? "-",
    interactive,
  ].join(";");
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    viewRef.current?.update({
      asteroidId,
      gridWidth,
      gridHeight,
      buildings,
      pending,
      selected,
      ghostKind,
      interactive,
    });
  });

  return (
    <div
      ref={hostRef}
      style={{
        width: WIDTH,
        height: HEIGHT,
        border: "1px solid #1a2840",
        cursor: interactive ? "pointer" : "default",
        overflow: "hidden",
      }}
    />
  );
}
