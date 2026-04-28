import { validateMonsterDatabase } from '../domain/validateMonsterData';
import type { MonsterDatabase } from '../domain/types';

export async function loadMonsters(): Promise<MonsterDatabase> {
  const response = await fetch('data/monsters.json');
  if (!response.ok) {
    throw new Error(`Failed to load monster data: ${response.status}`);
  }

  const data: unknown = await response.json();
  const validation = validateMonsterDatabase(data);
  if (!validation.ok) {
    throw new Error(`Invalid monster data: ${validation.errors.join('; ')}`);
  }

  return data as MonsterDatabase;
}
