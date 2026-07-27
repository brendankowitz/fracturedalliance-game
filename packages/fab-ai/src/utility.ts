/** A discrete AI action scored in [0, 1]; the runner picks the highest score. */
export interface UtilityAction<Ctx> {
  name: string;
  consider: (ctx: Ctx) => number;
  perform: (ctx: Ctx) => void;
}

const MIN_ACTION_SCORE = 0.05;

export const pickAction = <Ctx>(
  actions: readonly UtilityAction<Ctx>[],
  ctx: Ctx,
): UtilityAction<Ctx> | null => {
  let best: UtilityAction<Ctx> | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    const s = a.consider(ctx);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return best && bestScore > MIN_ACTION_SCORE ? best : null;
};

/** Common response curves for utility scoring. All return [0, 1]. */
export const curves = {
  linear: (t: number): number => Math.min(1, Math.max(0, t)),
  quadratic: (t: number): number => {
    const c = Math.min(1, Math.max(0, t));
    return c * c;
  },
  inverseLinear: (t: number): number => Math.min(1, Math.max(0, 1 - t)),
  smoothstep: (t: number): number => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  },
  bellCurve: (t: number, peak = 0.5, width = 0.25): number => {
    const d = (t - peak) / width;
    return Math.exp(-d * d);
  },
};
