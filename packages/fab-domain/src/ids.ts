// Branded id types — catch cross-kind mixups at compile time.
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type AsteroidId = Brand<string, 'AsteroidId'>;
export type BuildingId = Brand<string, 'BuildingId'>;
export type ShipId = Brand<string, 'ShipId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type BlueprintId = Brand<string, 'BlueprintId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type TreatyId = Brand<string, 'TreatyId'>;
export type ScenarioId = Brand<string, 'ScenarioId'>;

export const asAsteroidId = (s: string): AsteroidId => s as AsteroidId;
export const asBuildingId = (s: string): BuildingId => s as BuildingId;
export const asShipId = (s: string): ShipId => s as ShipId;
export const asPlayerId = (s: string): PlayerId => s as PlayerId;
export const asBlueprintId = (s: string): BlueprintId => s as BlueprintId;
export const asAgentId = (s: string): AgentId => s as AgentId;
export const asTreatyId = (s: string): TreatyId => s as TreatyId;
export const asScenarioId = (s: string): ScenarioId => s as ScenarioId;
