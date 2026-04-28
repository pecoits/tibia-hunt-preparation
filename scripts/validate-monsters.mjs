import { readFile } from 'node:fs/promises';

const filePath = process.argv[2] ?? 'public/data/monsters.json';

let database;

try {
  database = JSON.parse(await readFile(filePath, 'utf8'));
} catch (error) {
  console.error(`Could not read or parse ${filePath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!Array.isArray(database.monsters) || database.monsters.length === 0) {
  console.error(`${filePath} must contain a non-empty monsters array.`);
  process.exit(1);
}

console.log(`Validated ${database.monsters.length} monsters from ${filePath}.`);
