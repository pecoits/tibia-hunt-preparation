import { ELEMENTS, IMPORTANCE_WEIGHTS } from './elements';
import type { ElementType, Importance, Monster } from './types';
const NON_RECOMMENDABLE_ELEMENTS: ReadonlySet<ElementType> = new Set(['holy']);

export interface HuntSelection {
  monster: Monster;
  importance: Importance;
}

export interface ElementScore {
  element: ElementType;
  score: number;
}

export interface MonsterContribution {
  monsterId: string;
  monsterName: string;
  selectedImportance: Importance;
  recommendedModifier: number;
  contribution: number;
  summary: 'favors' | 'neutral' | 'resists';
}

export interface ExcludedMonster {
  id: string;
  name: string;
  reason: string;
}

export interface RecommendationResult {
  recommended: ElementScore | null;
  ranking: ElementScore[];
  contributions: MonsterContribution[];
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

function calculateElementContribution(hitpoints: number, importance: Importance, modifier: number): number {
  return hitpoints * IMPORTANCE_WEIGHTS[importance] * modifier;
}

export function calculateRecommendation(selections: HuntSelection[]): RecommendationResult {
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
      const score = calculateElementContribution(selection.monster.hitpoints as number, selection.importance, modifier);
      scores.set(element, (scores.get(element) ?? 0) + score);
    }
  }

  const ranking = ELEMENTS.map((element) => ({
    element,
    score: scores.get(element) ?? 0
  })).sort((a, b) => b.score - a.score);

  const recommended =
    validSelections.length > 0 ? ranking.find((item) => !NON_RECOMMENDABLE_ELEMENTS.has(item.element)) ?? null : null;
  const contributions: MonsterContribution[] = recommended
    ? validSelections.map((selection) => {
        const modifier = selection.monster.elements[recommended.element] as number;
        return {
          monsterId: selection.monster.id,
          monsterName: selection.monster.name,
          selectedImportance: selection.importance,
          recommendedModifier: modifier,
          contribution: calculateElementContribution(selection.monster.hitpoints as number, selection.importance, modifier),
          summary: summarizeModifier(modifier)
        };
      })
    : [];

  return {
    recommended,
    ranking,
    contributions,
    excludedMonsters
  };
}
