import type { AsteroidId, PlayerId } from './ids.ts';
import type { TreatyKind } from './treaty.ts';

export type EventPriority = 'red' | 'amber' | 'grey';

export type GameEvent =
  | { kind: 'colony.under_attack';  priority: 'red';   asteroidId: AsteroidId; attackerId: PlayerId }
  | { kind: 'colony.starved';       priority: 'red';   asteroidId: AsteroidId }
  | { kind: 'colony.captured';      priority: 'red';   asteroidId: AsteroidId; byPlayerId: PlayerId }
  | { kind: 'asteroid.incoming';    priority: 'red';   targetId: AsteroidId; etaTick: number }
  | { kind: 'trader.arrived';       priority: 'amber'; asteroidId: AsteroidId }
  | { kind: 'construction.done';    priority: 'grey';  asteroidId: AsteroidId; buildingKind: string }
  | { kind: 'treaty.broken';        priority: 'amber'; by: PlayerId; against: PlayerId; treaty: TreatyKind }
  | { kind: 'blueprint.purchased';  priority: 'grey';  playerId: PlayerId; blueprintId: string };
