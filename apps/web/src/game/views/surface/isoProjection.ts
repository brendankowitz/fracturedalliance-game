/**
 * 2:1 isometric projection for the asteroid surface.
 *
 * Cell (0,0) is the top of the diamond; +x runs down-right, +y runs down-left. Screen
 * coordinates are relative to the diamond's apex, so a scene positions the whole surface
 * by translating its container rather than by baking offsets in here.
 */

export const TILE_W = 52;
export const TILE_H = 26;

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Centre of a cell's floor diamond. */
export function cellToScreen(cell: Cell): Point {
  return {
    x: (cell.x - cell.y) * (TILE_W / 2),
    y: (cell.x + cell.y) * (TILE_H / 2),
  };
}

/**
 * Inverse of {@link cellToScreen}, rounded to the containing cell. Returns a cell even
 * when the point lies outside the grid — callers bounds-check against their own dims.
 */
export function screenToCell(point: Point): Cell {
  const halfW = TILE_W / 2;
  const halfH = TILE_H / 2;
  return {
    x: Math.round(point.x / (2 * halfW) + point.y / (2 * halfH)),
    y: Math.round(point.y / (2 * halfH) - point.x / (2 * halfW)),
  };
}

/** The four corners of a cell's floor diamond, clockwise from the top. */
export function cellCorners(cell: Cell): readonly Point[] {
  const { x, y } = cellToScreen(cell);
  return [
    { x, y: y - TILE_H / 2 },
    { x: x + TILE_W / 2, y },
    { x, y: y + TILE_H / 2 },
    { x: x - TILE_W / 2, y },
  ];
}

/** Pixel extent of a whole grid, used to centre the surface in its viewport. */
export function gridExtent(
  width: number,
  height: number,
): {
  readonly width: number;
  readonly height: number;
  readonly originX: number;
  readonly originY: number;
} {
  return {
    width: (width + height) * (TILE_W / 2),
    height: (width + height) * (TILE_H / 2),
    // Distance from the diamond's left-most point back to cell (0,0).
    originX: height * (TILE_W / 2),
    originY: TILE_H / 2,
  };
}

/**
 * Painter's-algorithm order: cells further from the camera draw first so nearer
 * buildings overlap them correctly.
 */
export function depthOf(cell: Cell): number {
  return cell.x + cell.y;
}
