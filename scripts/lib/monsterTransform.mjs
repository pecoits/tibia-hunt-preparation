const ELEMENT_KEYS = {
  physical: ['physicalDmgMod', 'physical', 'physDmgMod'],
  earth: ['earthDmgMod', 'earth'],
  fire: ['fireDmgMod', 'fire'],
  energy: ['energyDmgMod', 'energy'],
  ice: ['iceDmgMod', 'ice'],
  holy: ['holyDmgMod', 'holy'],
  death: ['deathDmgMod', 'death']
};

const REQUIRED_ELEMENTS = Object.keys(ELEMENT_KEYS);

function slugifyTitle(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceUrlForTitle(title) {
  return `https://tibia.fandom.com/wiki/${encodeURIComponent(title.trim().replaceAll(' ', '_'))}`;
}

function stripWikiMarkup(value) {
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{(?:formatnum:)?([^{}|]+)(?:\|[^{}]*)?\}\}/gi, '$1')
    .replace(/'''?/g, '')
    .trim();
}

function normalizeKey(key) {
  return stripWikiMarkup(key).replace(/\s+/g, '').toLowerCase();
}

function parseTemplateFields(wikitext) {
  const fields = new Map();
  const text = String(wikitext).replace(/\r\n/g, '\n');
  const linePattern = /^\s*\|\s*([^=\n]+?)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*}}|$)/gm;
  let match;

  while ((match = linePattern.exec(text)) !== null) {
    fields.set(normalizeKey(match[1]), stripWikiMarkup(match[2]));
  }

  for (const part of text.split('|')) {
    const inlineMatch = part.match(/^\s*([^=]+?)\s*=\s*([\s\S]*?)(?:}})?\s*$/);
    if (inlineMatch) {
      const key = normalizeKey(inlineMatch[1]);
      if (!fields.has(key)) {
        fields.set(key, stripWikiMarkup(inlineMatch[2].replace(/}}+$/, '')));
      }
    }
  }

  return fields;
}

function getFirstField(fields, keys) {
  for (const key of keys) {
    const value = fields.get(normalizeKey(key));
    if (value !== undefined && value !== '') return value;
  }
  return null;
}

function parseNumber(value) {
  if (value === null) return null;
  const match = stripWikiMarkup(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseElements(fields) {
  const elements = {};

  for (const [element, keys] of Object.entries(ELEMENT_KEYS)) {
    const value = parseNumber(getFirstField(fields, keys));
    if (value !== null && Number.isFinite(value)) {
      elements[element] = value;
    }
  }

  return elements;
}

function hasAllElements(elements) {
  return REQUIRED_ELEMENTS.every((element) => typeof elements[element] === 'number' && Number.isFinite(elements[element]));
}

function isSpecialCreature(title, fields, wikitext) {
  const flags = [getFirstField(fields, ['boss', 'isboss', 'bosstype']), getFirstField(fields, ['event', 'isevent'])]
    .filter((value) => {
      const normalized = String(value).trim().toLowerCase();
      return normalized !== '' && normalized !== 'no' && normalized !== 'false' && normalized !== '--';
    })
    .join(' ')
    .toLowerCase();

  if (/\b(boss|event|raid|summon|yes|true)\b/.test(flags)) return true;
  return /\[\[Category:(?:Bosses|Event Creatures|Summons|Special Creatures)(?:\|[^\]]*)?\]\]/i.test(wikitext) || /\(creature\)$/i.test(title) === false && /\(.*\)/.test(title);
}

export function transformMonsterPage(title, wikitext) {
  const fields = parseTemplateFields(wikitext);
  const name = getFirstField(fields, ['name']) ?? title;
  const hitpoints = parseNumber(getFirstField(fields, ['hp', 'hitpoints', 'health']));
  const elements = parseElements(fields);
  const complete = hitpoints !== null && hitpoints > 0 && hasAllElements(elements);
  const special = isSpecialCreature(title, fields, wikitext);

  return {
    id: slugifyTitle(title),
    name: stripWikiMarkup(name),
    hitpoints,
    elements,
    sourceUrl: sourceUrlForTitle(title),
    huntRelevant: complete && !special,
    special,
    incomplete: !complete
  };
}
