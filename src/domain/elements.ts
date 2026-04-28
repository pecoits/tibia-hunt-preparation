import type { ElementType, Importance } from './types';

export const ELEMENTS = ['physical', 'earth', 'fire', 'energy', 'ice', 'holy', 'death'] as const;

export const ELEMENT_LABELS: Record<ElementType, string> = {
  physical: 'Physical',
  earth: 'Earth',
  fire: 'Fire',
  energy: 'Energy',
  ice: 'Ice',
  holy: 'Holy',
  death: 'Death'
};

export const IMPORTANCE_WEIGHTS: Record<Importance, number> = {
  low: 0.5,
  normal: 1,
  high: 2
};
