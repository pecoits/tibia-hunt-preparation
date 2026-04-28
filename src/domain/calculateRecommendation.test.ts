import { describe, expect, it } from 'vitest';
import { calculateRecommendation } from './calculateRecommendation';
import type { Monster } from './types';

const dragonLord: Monster = {
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
};

const iceGolem: Monster = {
  id: 'ice-golem',
  name: 'Ice Golem',
  hitpoints: 300,
  elements: {
    physical: 100,
    earth: 100,
    fire: 120,
    energy: 100,
    ice: 0,
    holy: 100,
    death: 100
  },
  sourceUrl: 'https://tibia.fandom.com/wiki/Ice_Golem',
  huntRelevant: true,
  special: false,
  incomplete: false
};

describe('calculateRecommendation', () => {
  it('uses raw wiki percentage modifiers when ranking a single monster', () => {
    const result = calculateRecommendation([{ monster: dragonLord, importance: 'normal' }]);

    expect(result.recommended?.element).toBe('ice');
    expect(result.ranking[0].element).toBe('ice');
    expect(result.ranking[0].score).toBe(1900 * 1 * 110);
  });

  it('can recommend physical when it has the highest total raw score in a mixed hunt', () => {
    const result = calculateRecommendation([
      { monster: dragonLord, importance: 'normal' },
      { monster: iceGolem, importance: 'normal' }
    ]);

    expect(result.recommended?.element).toBe('physical');
    expect(result.ranking[0]).toEqual({ element: 'physical', score: 1900 * 1 * 100 + 300 * 1 * 100 });
  });

  it('uses user importance weights with raw percentage modifiers to change the winner', () => {
    const iceFocused: Monster = {
      id: 'ice-focused',
      name: 'Ice Focused',
      hitpoints: 100,
      elements: {
        physical: 100,
        earth: 100,
        fire: 100,
        energy: 100,
        ice: 200,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://example.com/ice-focused',
      huntRelevant: true,
      special: false,
      incomplete: false
    };
    const fireFocused: Monster = {
      id: 'fire-focused',
      name: 'Fire Focused',
      hitpoints: 100,
      elements: {
        physical: 100,
        earth: 100,
        fire: 250,
        energy: 100,
        ice: 100,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://example.com/fire-focused',
      huntRelevant: true,
      special: false,
      incomplete: false
    };

    const icePriority = calculateRecommendation([
      { monster: iceFocused, importance: 'high' },
      { monster: fireFocused, importance: 'low' }
    ]);
    const firePriority = calculateRecommendation([
      { monster: iceFocused, importance: 'low' },
      { monster: fireFocused, importance: 'high' }
    ]);

    expect(icePriority.recommended?.element).toBe('ice');
    expect(firePriority.recommended?.element).toBe('fire');
  });

  it('excludes incomplete monsters from the calculation and reports them', () => {
    const incomplete: Monster = {
      ...dragonLord,
      id: 'unknown',
      name: 'Unknown',
      hitpoints: null,
      incomplete: true
    };

    const result = calculateRecommendation([{ monster: incomplete, importance: 'normal' }]);

    expect(result.recommended).toBeNull();
    expect(result.excludedMonsters).toEqual([{ id: 'unknown', name: 'Unknown', reason: 'Missing hitpoints.' }]);
  });
});
