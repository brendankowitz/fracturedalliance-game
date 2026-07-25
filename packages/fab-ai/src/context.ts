/**
 * Context passed to every utility action. Kept tiny — actions grab what they
 * need from `world` directly but use this for pre-computed per-player data.
 */

import type { PlayerId, RaceDef, World } from '@fab/domain';
import type { Prng } from '@fab/sim';

export interface AiContext {
  world: World;
  player: PlayerId;
  race: RaceDef;
  rng: Prng;
  tick: number;
}
