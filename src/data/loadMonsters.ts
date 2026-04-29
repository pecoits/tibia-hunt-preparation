import { validateMonsterDatabase } from '../domain/validateMonsterData';
import type { MonsterDatabase } from '../domain/types';

export async function loadMonsters(): Promise<MonsterDatabase> {
  const dataUrl = `${import.meta.env.BASE_URL}data/monsters.json`;
  const response = await fetch(dataUrl);
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
