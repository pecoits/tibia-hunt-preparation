import type { ELEMENTS } from './elements';

export type ElementType = (typeof ELEMENTS)[number];
export type Importance = 'low' | 'normal' | 'high';

export type ElementModifiers = Record<ElementType, number>;

export interface Monster {
  id: string;
  name: string;
  hitpoints: number | null;
  elements: Partial<ElementModifiers>;
  sourceUrl: string;
  huntRelevant: boolean;
  special: boolean;
  incomplete: boolean;
}

export interface MonsterDatabase {
  schemaVersion: number;
  generatedAt: string;
  source: {
    name: string;
    url: string;
    license: string;
  };
  monsters: Monster[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}
