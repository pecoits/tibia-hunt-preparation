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

const neutralElements: Monster['elements'] = {
  physical: 0,
  earth: 0,
  fire: 0,
  energy: 0,
  ice: 100,
  holy: 0,
  death: 0
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

  it('reports contributions for the recommended element with raw scores and summaries', () => {
    const iceWeak: Monster = {
      id: 'ice-weak',
      name: 'Ice Weak',
      hitpoints: 100,
      elements: { ...neutralElements, ice: 120 },
      sourceUrl: 'https://example.com/ice-weak',
      huntRelevant: true,
      special: false,
      incomplete: false
    };
    const iceNeutral: Monster = {
      id: 'ice-neutral',
      name: 'Ice Neutral',
      hitpoints: 80,
      elements: { ...neutralElements, ice: 100 },
      sourceUrl: 'https://example.com/ice-neutral',
      huntRelevant: true,
      special: false,
      incomplete: false
    };
    const iceResistant: Monster = {
      id: 'ice-resistant',
      name: 'Ice Resistant',
      hitpoints: 50,
      elements: { ...neutralElements, ice: 80 },
      sourceUrl: 'https://example.com/ice-resistant',
      huntRelevant: true,
      special: false,
      incomplete: false
    };

    const result = calculateRecommendation([
      { monster: iceWeak, importance: 'high' },
      { monster: iceNeutral, importance: 'normal' },
      { monster: iceResistant, importance: 'low' }
    ]);

    expect(result.recommended?.element).toBe('ice');
    expect(result.contributions).toEqual([
      {
        monsterId: 'ice-weak',
        monsterName: 'Ice Weak',
        selectedImportance: 'high',
        recommendedModifier: 120,
        contribution: 100 * 2 * 120,
        summary: 'favors'
      },
      {
        monsterId: 'ice-neutral',
        monsterName: 'Ice Neutral',
        selectedImportance: 'normal',
        recommendedModifier: 100,
        contribution: 80 * 1 * 100,
        summary: 'neutral'
      },
      {
        monsterId: 'ice-resistant',
        monsterName: 'Ice Resistant',
        selectedImportance: 'low',
        recommendedModifier: 80,
        contribution: 50 * 0.5 * 80,
        summary: 'resists'
      }
    ]);
  });

  it('excludes incomplete monsters with missing hitpoints and reports the missing hitpoints reason', () => {
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

  it('excludes monsters flagged as incomplete even when all calculation fields are present', () => {
    const incomplete: Monster = {
      ...dragonLord,
      id: 'flagged-incomplete',
      name: 'Flagged Incomplete',
      incomplete: true
    };

    const result = calculateRecommendation([{ monster: incomplete, importance: 'normal' }]);

    expect(result.recommended).toBeNull();
    expect(result.excludedMonsters).toEqual([
      { id: 'flagged-incomplete', name: 'Flagged Incomplete', reason: 'Incomplete monster data.' }
    ]);
  });
});
