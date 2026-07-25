import { getAllBuildingDefs } from "@fa/content";
import { describe, expect, it } from "vitest";
import { formOf, paintBuilding } from "../game/views/surface/buildingForms.ts";
import { CELL_HALF, FORM_NOMINAL_HALF, FORM_UNIT } from "../game/views/surface/isoVolumes.ts";

/**
 * Records the horizontal extent of everything a painter draws. Buildings must sit inside
 * their diamond, and "it looks about right" is exactly the check that let them drift out
 * of it in the first place.
 */
function measure(paint: (g: MeasuringGraphics) => void): { left: number; right: number } {
  const g = new MeasuringGraphics();
  paint(g);
  return { left: g.minX, right: g.maxX };
}

class MeasuringGraphics {
  minX = 0;
  maxX = 0;
  private cursorX = 0;

  private see(x: number): void {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
  }

  poly(points: number[]): this {
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      if (x !== undefined) this.see(x);
    }
    return this;
  }
  rect(x: number, _y: number, w: number): this {
    this.see(x);
    this.see(x + w);
    return this;
  }
  circle(x: number, _y: number, r: number): this {
    this.see(x - r);
    this.see(x + r);
    return this;
  }
  ellipse(x: number, _y: number, rx: number): this {
    this.see(x - rx);
    this.see(x + rx);
    return this;
  }
  moveTo(x: number): this {
    this.cursorX = x;
    this.see(x);
    return this;
  }
  lineTo(x: number): this {
    this.cursorX = x;
    this.see(x);
    return this;
  }
  bezierCurveTo(cx1: number, _cy1: number, cx2: number, _cy2: number, x: number): this {
    this.see(cx1);
    this.see(cx2);
    this.see(x);
    this.cursorX = x;
    return this;
  }
  fill(): this {
    return this;
  }
  stroke(): this {
    return this;
  }
}

describe("building forms", () => {
  it("scales from the tile, not from a magic number", () => {
    expect(CELL_HALF).toBe(26);
    expect(FORM_UNIT).toBeCloseTo(CELL_HALF / FORM_NOMINAL_HALF, 10);
  });

  it("every form's footprint fits inside its cell once scaled", () => {
    const offenders: string[] = [];
    const seen = new Set<string>();
    for (const def of getAllBuildingDefs()) {
      const form = formOf(def.kind);
      if (seen.has(form)) continue;
      seen.add(form);

      const { left, right } = measure((g) => {
        paintBuilding(g as unknown as Parameters<typeof paintBuilding>[0], def.kind, {
          x: 0,
          y: 0,
        });
      });
      const scaledLeft = Math.abs(left) * FORM_UNIT;
      const scaledRight = right * FORM_UNIT;
      if (scaledLeft > CELL_HALF || scaledRight > CELL_HALF) {
        offenders.push(
          `${form}: extends ${scaledLeft.toFixed(1)} left / ${scaledRight.toFixed(1)} right, cell allows ${CELL_HALF}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("covers every building kind with a form", () => {
    for (const def of getAllBuildingDefs()) {
      expect(typeof formOf(def.kind)).toBe("string");
    }
  });
});
