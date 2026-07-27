import { describe, expect, it } from 'vitest';
import { CONTENT, validateContent } from './index';

describe('CONTENT', () => {
  it('passes full-bundle validation at import time', () => {
    const result = validateContent(CONTENT);
    if (!result.ok) {
      const msg = result.issues.map((i) => `${i.path}: ${i.message}`).join('\n');
      throw new Error(`validateContent failed:\n${msg}`);
    }
    expect(result.ok).toBe(true);
  });

  it('exposes all expected tables', () => {
    expect(CONTENT.ores).toBeDefined();
    expect(CONTENT.buildings.length).toBeGreaterThan(0);
    expect(CONTENT.blueprints.length).toBe(40);
    expect(CONTENT.ships.length).toBeGreaterThan(0);
    expect(CONTENT.weapons.length).toBe(3);
    expect(CONTENT.missiles.length).toBe(7);
    expect(CONTENT.bombardments.length).toBe(3);
    expect(CONTENT.scenarios.length).toBe(5);
    expect(CONTENT.races.length).toBe(7);
  });
});
