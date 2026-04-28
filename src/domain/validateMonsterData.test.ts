import { describe, expect, it } from 'vitest';
import { validateMonsterDatabase } from './validateMonsterData';

const validDatabase = {
  schemaVersion: 1,
  generatedAt: '2026-04-28T00:00:00.000Z',
  source: {
    name: 'TibiaWiki/Fandom',
    url: 'https://tibia.fandom.com/wiki/Main_Page',
    license: 'CC BY-SA unless otherwise noted'
  },
  monsters: [
    {
      id: 'dragon-lord',
      name: 'Dragon Lord',
      hitpoints: 1900,
      elements: {
        physical: 100,
        earth: 20,
        fire: 0,
        energy: 100,
        ice: 110,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Dragon_Lord',
      huntRelevant: true,
      special: false,
      incomplete: false
    }
  ]
};

describe('validateMonsterDatabase', () => {
  it('accepts a valid monster database', () => {
    const result = validateMonsterDatabase(validDatabase);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a null database without throwing', () => {
    expect(() => validateMonsterDatabase(null)).not.toThrow();

    const result = validateMonsterDatabase(null);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(['Database must be an object.']);
  });

  it('rejects duplicate monster ids', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [validDatabase.monsters[0], validDatabase.monsters[0]]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Duplicate monster id: dragon-lord');
  });

  it('rejects hunt relevant monsters with missing element modifiers', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [
        {
          ...validDatabase.monsters[0],
          elements: {
            physical: 100,
            earth: 100,
            fire: 100,
            energy: 100,
            ice: 100,
            holy: 100
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster Dragon Lord is missing death modifier.');
  });

  it('rejects malformed monsters without throwing', () => {
    expect(() =>
      validateMonsterDatabase({
        ...validDatabase,
        monsters: {}
      })
    ).not.toThrow();

    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: {}
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('monsters must be a non-empty array.');
  });

  it('rejects null monster records without throwing', () => {
    expect(() =>
      validateMonsterDatabase({
        ...validDatabase,
        monsters: [null]
      })
    ).not.toThrow();

    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [null]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster record must be an object.');
    expect(result.errors).not.toContain('Duplicate monster id: undefined');
  });

  it('rejects string monster records without throwing', () => {
    expect(() =>
      validateMonsterDatabase({
        ...validDatabase,
        monsters: ['bad']
      })
    ).not.toThrow();

    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: ['bad']
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster record must be an object.');
    expect(result.errors).not.toContain('Duplicate monster id: undefined');
  });

  it('does not report duplicate undefined ids for malformed object records', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [{}, {}]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster is missing id.');
    expect(result.errors).not.toContain('Duplicate monster id: undefined');
  });

  it('rejects hunt relevant monsters with missing elements without throwing', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [
        {
          ...validDatabase.monsters[0],
          elements: undefined
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster Dragon Lord is missing physical modifier.');
    expect(result.errors).toContain('Monster Dragon Lord is missing death modifier.');
  });
});
