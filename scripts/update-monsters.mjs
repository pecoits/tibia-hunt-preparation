import { writeFile } from 'node:fs/promises';
import { fetchCreaturePageTitles, fetchPageWikitext } from './lib/tibiaWikiClient.mjs';
import { transformMonsterPage } from './lib/monsterTransform.mjs';

const OUTPUT_PATH = 'public/data/monsters.json';
const CONCURRENCY = 6;
const SOURCE = {
  name: 'TibiaWiki/Fandom',
  url: 'https://tibia.fandom.com/wiki/Main_Page',
  license: 'CC BY-SA unless otherwise noted'
};

function isLikelyCreaturePage(title) {
  return (
    !title.includes('/') &&
    !title.startsWith('Category:') &&
    !title.startsWith('List of ') &&
    !title.startsWith('Creatures ') &&
    title !== 'Creatures' &&
    !/Creatures$/i.test(title)
  );
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function importMonsters() {
  console.log('Fetching creature page titles from TibiaWiki...');
  const allTitles = await fetchCreaturePageTitles();
  const titles = allTitles.filter(isLikelyCreaturePage);
  console.log(`Found ${allTitles.length} category entries; importing ${titles.length} likely creature pages.`);

  const monsters = await mapWithConcurrency(titles, CONCURRENCY, async (title, index) => {
    if (index === 0 || (index + 1) % 25 === 0 || index + 1 === titles.length) {
      console.log(`Fetching creature ${index + 1}/${titles.length}: ${title}`);
    }

    const wikitext = await fetchPageWikitext(title);
    return transformMonsterPage(title, wikitext);
  });

  monsters.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const database = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    monsters
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(database, null, 2)}\n`, 'utf8');

  const incompleteCount = monsters.filter((monster) => monster.incomplete).length;
  const huntRelevantCount = monsters.filter((monster) => monster.huntRelevant).length;
  console.log(`Wrote ${monsters.length} monsters to ${OUTPUT_PATH}.`);
  console.log(`Complete hunt-relevant: ${huntRelevantCount}. Incomplete: ${incompleteCount}.`);
}

try {
  await importMonsters();
} catch (error) {
  console.error('Monster import failed.');
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
