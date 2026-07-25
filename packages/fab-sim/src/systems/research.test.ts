import { BLUEPRINT_IDS, BLUEPRINTS } from '@fab/content';
import type { BlueprintDef } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { researchPhase, startResearch } from './research';

const mustBp = (id: string): BlueprintDef => {
  const bp = (BLUEPRINTS as Readonly<Record<string, BlueprintDef>>)[id];
  if (!bp) throw new Error(`blueprint ${id} missing`);
  return bp;
};

describe('research', () => {
  it('rejects when prerequisites are missing', () => {
    const { world, playerId } = makeMiniWorld({ credits: 1_000_000 });
    const bpWithPrereq = mustBp(BLUEPRINT_IDS.deepBoreMk2);
    expect(bpWithPrereq.requires.length).toBeGreaterThan(0);
    const r = startResearch(world, {
      kind: 'startResearch',
      playerId,
      blueprint: bpWithPrereq.id,
    });
    expect(r.ok).toBe(false);
  });

  it('allows a tier-1 blueprint with empty requires[]', () => {
    const { world, playerId } = makeMiniWorld({ credits: 1_000_000 });
    const bp = mustBp(BLUEPRINT_IDS.geoSurvey);
    expect(bp.requires).toHaveLength(0);
    const r = startResearch(world, {
      kind: 'startResearch',
      playerId,
      blueprint: bp.id,
    });
    expect(r.ok).toBe(true);
    const player = world.players.get(playerId);
    if (!player) throw new Error('p');
    expect(player.activeResearch?.blueprintId).toBe(bp.id);
  });

  it('completes and adds blueprint to owned after researchTimeTicks', () => {
    const { world, playerId } = makeMiniWorld({ credits: 1_000_000 });
    const bp = mustBp(BLUEPRINT_IDS.geoSurvey);
    startResearch(world, { kind: 'startResearch', playerId, blueprint: bp.id });
    const total = bp.researchTimeTicks ?? 0;
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) researchPhase(world);
    const player = world.players.get(playerId);
    if (!player) throw new Error('p');
    expect(player.activeResearch).toBeNull();
    expect(player.blueprintsOwned.has(bp.id)).toBe(true);
    expect(world.eventQueue.some((e) => e.kind === 'research.completed')).toBe(true);
  });

  it('rejects a second research while one is active', () => {
    const { world, playerId } = makeMiniWorld({ credits: 1_000_000 });
    const bp = mustBp(BLUEPRINT_IDS.geoSurvey);
    expect(startResearch(world, { kind: 'startResearch', playerId, blueprint: bp.id }).ok).toBe(true);
    const bp2 = mustBp(BLUEPRINT_IDS.mineMk2);
    const r = startResearch(world, { kind: 'startResearch', playerId, blueprint: bp2.id });
    expect(r.ok).toBe(false);
  });
});
