export type AsteroidId  = string & { readonly __brand: 'AsteroidId' };
export type BuildingId  = string & { readonly __brand: 'BuildingId' };
export type ShipId      = string & { readonly __brand: 'ShipId' };
export type PlayerId    = string & { readonly __brand: 'PlayerId' };
export type BlueprintId = string & { readonly __brand: 'BlueprintId' };
export type AgentId     = string & { readonly __brand: 'AgentId' };
export type TreatyId    = string & { readonly __brand: 'TreatyId' };

export function asteroidId(raw: string): AsteroidId  { return raw as AsteroidId; }
export function buildingId(raw: string): BuildingId  { return raw as BuildingId; }
export function shipId(raw: string): ShipId          { return raw as ShipId; }
export function playerId(raw: string): PlayerId      { return raw as PlayerId; }
export function blueprintId(raw: string): BlueprintId { return raw as BlueprintId; }
