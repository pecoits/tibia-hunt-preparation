import { ELEMENTS } from './elements';
import type { ElementType, Monster, PlayerVocation } from './types';

const DEFAULT_PLAYER: PlayerProfile = { vocation: 'any', level: 999 };

const ELEMENT_RULES: Record<ElementType, { minLevel: number; allowedVocations: ReadonlySet<PlayerVocation> }> = {
  physical: { minLevel: 1, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) },
  earth: { minLevel: 8, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) },
  fire: { minLevel: 8, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) },
  energy: { minLevel: 8, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) },
  ice: { minLevel: 8, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) },
  holy: { minLevel: 20, allowedVocations: new Set(['paladin']) },
  death: { minLevel: 8, allowedVocations: new Set(['any', 'knight', 'paladin', 'druid', 'sorcerer']) }
};

export interface HuntSelection {
  monster: Monster;
  weight: number;
}

export interface ElementScore {
  element: ElementType;
  score: number;
}

export interface RankedElement extends ElementScore {
  deltaFromRecommended: number;
}

export interface MonsterContribution {
  monsterId: string;
  monsterName: string;
  selectedWeight: number;
  recommendedModifier: number;
  contribution: number;
  summary: 'favors' | 'neutral' | 'resists';
}

export interface PlayerProfile {
  vocation: PlayerVocation;
  level: number;
}

export interface RecommendationOptions {
  player?: PlayerProfile;
}

export interface ElementEligibility {
  element: ElementType;
  eligible: boolean;
  reason: string | null;
}

export interface ExcludedMonster {
  id: string;
  name: string;
  reason: string;
}

export interface RecommendationResult {
  recommended: ElementScore | null;
  ranking: ElementScore[];
  topAlternatives: RankedElement[];
  contributions: MonsterContribution[];
  eligibility: ElementEligibility[];
  excludedMonsters: ExcludedMonster[];
}

function getExclusionReason(monster: Monster): string | null {
  if (typeof monster.hitpoints !== 'number' || !Number.isFinite(monster.hitpoints) || monster.hitpoints <= 0) {
    return 'Missing hitpoints.';
  }

  for (const element of ELEMENTS) {
    const modifier = monster.elements[element];
    if (typeof modifier !== 'number' || !Number.isFinite(modifier)) {
      return `Missing ${element} modifier.`;
    }
  }

  if (monster.incomplete) {
    return 'Incomplete monster data.';
  }

  return null;
}

function summarizeModifier(modifier: number): MonsterContribution['summary'] {
  if (modifier > 100) return 'favors';
  if (modifier < 100) return 'resists';
  return 'neutral';
}

function normalizeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.min(100, Math.max(0, weight));
}

function calculateElementContribution(hitpoints: number, weight: number, modifier: number): number {
  const normalizedWeight = normalizeWeight(weight);
  return hitpoints * (normalizedWeight / 50) * modifier;
}

function getPlayerProfile(player?: PlayerProfile): PlayerProfile {
  if (!player) return DEFAULT_PLAYER;
  return {
    vocation: player.vocation,
    level: Number.isFinite(player.level) ? Math.max(1, Math.floor(player.level)) : 1
  };
}

function getElementEligibility(element: ElementType, player: PlayerProfile): ElementEligibility {
  const rule = ELEMENT_RULES[element];
  if (!rule.allowedVocations.has(player.vocation)) {
    return {
      element,
      eligible: false,
      reason: `Requires ${Array.from(rule.allowedVocations).join(', ')} vocation.`
    };
  }

  if (player.level < rule.minLevel) {
    return {
      element,
      eligible: false,
      reason: `Requires level ${rule.minLevel}+.`
    };
  }

  return { element, eligible: true, reason: null };
}

export function calculateRecommendation(selections: HuntSelection[], options: RecommendationOptions = {}): RecommendationResult {
  const player = getPlayerProfile(options.player);
  const scores = new Map<ElementType, number>(ELEMENTS.map((element) => [element, 0]));
  const validSelections: HuntSelection[] = [];
  const excludedMonsters: ExcludedMonster[] = [];

  for (const selection of selections) {
    const reason = getExclusionReason(selection.monster);
    if (reason) {
      excludedMonsters.push({
        id: selection.monster.id,
        name: selection.monster.name,
        reason
      });
      continue;
    }

    validSelections.push(selection);
    for (const element of ELEMENTS) {
      const modifier = selection.monster.elements[element] as number;
      const score = calculateElementContribution(selection.monster.hitpoints as number, selection.weight, modifier);
      scores.set(element, (scores.get(element) ?? 0) + score);
    }
  }

  const ranking = ELEMENTS.map((element) => ({
    element,
    score: scores.get(element) ?? 0
  })).sort((a, b) => b.score - a.score);
  const eligibility = ELEMENTS.map((element) => getElementEligibility(element, player));
  const eligibleByElement = new Map(eligibility.map((item) => [item.element, item.eligible]));

  const recommended =
    validSelections.length > 0 ? ranking.find((item) => eligibleByElement.get(item.element) === true) ?? null : null;
  const contributions: MonsterContribution[] = recommended
    ? validSelections.map((selection) => {
        const modifier = selection.monster.elements[recommended.element] as number;
        return {
          monsterId: selection.monster.id,
          monsterName: selection.monster.name,
          selectedWeight: normalizeWeight(selection.weight),
          recommendedModifier: modifier,
          contribution: calculateElementContribution(selection.monster.hitpoints as number, selection.weight, modifier),
          summary: summarizeModifier(modifier)
        };
      })
    : [];
  const topAlternatives: RankedElement[] = recommended
    ? ranking
        .slice(0, 3)
        .map((item) => ({
          ...item,
          deltaFromRecommended: recommended.score - item.score
        }))
    : [];

  return {
    recommended,
    ranking,
    topAlternatives,
    contributions,
    eligibility,
    excludedMonsters
  };
}
