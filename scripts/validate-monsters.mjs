import { readFile } from 'node:fs/promises';

const requiredElements = ['physical', 'earth', 'fire', 'energy', 'ice', 'holy', 'death'];
const filePath = process.argv[2] ?? 'public/data/monsters.json';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMonsterDatabase(database) {
  const errors = [];

  if (!isObject(database)) {
    return ['Database must be an object.'];
  }

  if (database.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!database.generatedAt) errors.push('generatedAt is required.');
  if (!database.source?.url) errors.push('source.url is required.');
  if (!Array.isArray(database.monsters) || database.monsters.length === 0) {
    errors.push('monsters must be a non-empty array.');
  }

  const monsters = Array.isArray(database.monsters) ? database.monsters : [];
  const seenIds = new Set();
  for (const monster of monsters) {
    if (!isObject(monster)) {
      errors.push('Monster record must be an object.');
      continue;
    }

    if (monster.id) {
      if (seenIds.has(monster.id)) errors.push(`Duplicate monster id: ${monster.id}`);
      seenIds.add(monster.id);
    }

    if (!monster.id) errors.push('Monster is missing id.');
    if (!monster.name) errors.push(`Monster ${monster.id || '<unknown>'} is missing name.`);
    if (!monster.sourceUrl) errors.push(`Monster ${monster.name || monster.id} is missing sourceUrl.`);

    if (monster.huntRelevant) {
      if (typeof monster.hitpoints !== 'number' || !Number.isFinite(monster.hitpoints) || monster.hitpoints <= 0) {
        errors.push(`Monster ${monster.name} has invalid hitpoints.`);
      }

      for (const element of requiredElements) {
        const modifier = monster.elements?.[element];
        if (typeof modifier !== 'number' || !Number.isFinite(modifier)) {
          errors.push(`Monster ${monster.name} is missing ${element} modifier.`);
        }
      }
    }
  }

  return errors;
}

let database;

try {
  database = JSON.parse(await readFile(filePath, 'utf8'));
} catch (error) {
  const message = error instanceof SyntaxError ? 'Invalid JSON' : 'Could not read file';
  console.error(`${message}: ${filePath}`);
  process.exit(1);
}

const errors = validateMonsterDatabase(database);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${database.monsters.length} monsters from ${filePath}.`);
