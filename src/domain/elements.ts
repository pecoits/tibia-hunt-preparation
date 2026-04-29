import type { ElementType } from './types';

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

