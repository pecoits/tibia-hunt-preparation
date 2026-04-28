import { ELEMENTS } from './elements';
import type { Monster, MonsterDatabase, ValidationResult } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMonster(monster: Monster, errors: string[]): void {
  if (!monster.id) errors.push('Monster is missing id.');
  if (!monster.name) errors.push(`Monster ${monster.id || '<unknown>'} is missing name.`);
  if (!monster.sourceUrl) errors.push(`Monster ${monster.name || monster.id} is missing sourceUrl.`);

  if (monster.huntRelevant) {
    if (typeof monster.hitpoints !== 'number' || !Number.isFinite(monster.hitpoints) || monster.hitpoints <= 0) {
      errors.push(`Monster ${monster.name} has invalid hitpoints.`);
    }

    for (const element of ELEMENTS) {
      const modifier = monster.elements?.[element];
      if (typeof modifier !== 'number' || !Number.isFinite(modifier)) {
        errors.push(`Monster ${monster.name} is missing ${element} modifier.`);
      }
    }
  }
}

export function validateMonsterDatabase(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return { ok: false, errors: ['Database must be an object.'] };
  }

  const database = input as unknown as MonsterDatabase;

  if (database.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!database.generatedAt) errors.push('generatedAt is required.');
  if (!database.source?.url) errors.push('source.url is required.');
  if (!Array.isArray(database.monsters) || database.monsters.length === 0) {
    errors.push('monsters must be a non-empty array.');
  }

  const monsters = Array.isArray(database.monsters) ? database.monsters : [];
  const seenIds = new Set<string>();
  for (const monster of monsters) {
    if (seenIds.has(monster.id)) {
      errors.push(`Duplicate monster id: ${monster.id}`);
    }
    seenIds.add(monster.id);
    validateMonster(monster, errors);
  }

  return { ok: errors.length === 0, errors };
}
