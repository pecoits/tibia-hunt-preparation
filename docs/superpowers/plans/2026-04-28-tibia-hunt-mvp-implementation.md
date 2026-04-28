# Tibia Hunt MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first GitHub Pages-ready Tibia hunt elemental damage recommendation site, including static UI, calculation engine, monster data validation, scraper/importer, and protected manual GitHub Actions refresh.

**Architecture:** Use a static Vite + TypeScript app that loads `public/data/monsters.json` at runtime. Keep domain logic in small pure modules (`src/domain`) so calculations and data validation are testable without the browser. Keep scraping/admin automation in `scripts/` and publish updates through a manual GitHub Actions workflow.

**Tech Stack:** Vite, TypeScript, Vitest, jsdom, plain HTML/CSS/DOM, Node.js scripts, GitHub Actions, GitHub Pages.

---

## File Structure

- Create `package.json`: project scripts and dev dependencies.
- Create `tsconfig.json`: TypeScript compiler settings.
- Create `vite.config.ts`: Vite/Vitest configuration and GitHub Pages-compatible base.
- Create `index.html`: root app shell.
- Create `src/main.ts`: browser entrypoint and state wiring.
- Create `src/styles.css`: responsive utilitarian UI styling.
- Create `src/domain/types.ts`: shared monster, element, hunt, and result types.
- Create `src/domain/elements.ts`: canonical element list, labels, and importance weights.
- Create `src/domain/calculateRecommendation.ts`: pure recommendation engine.
- Create `src/domain/validateMonsterData.ts`: pure monster data validation.
- Create `src/data/loadMonsters.ts`: runtime fetch for `data/monsters.json`.
- Create `src/ui/renderApp.ts`: DOM rendering and event handling.
- Create `src/domain/*.test.ts`: unit tests for calculation and validation.
- Create `src/ui/renderApp.test.ts`: smoke tests for main UI behavior.
- Create `scripts/update-monsters.mjs`: scraper/importer entrypoint.
- Create `scripts/validate-monsters.mjs`: CLI JSON validation.
- Create `scripts/lib/tibiaWikiClient.mjs`: Fandom/TibiaWiki API access.
- Create `scripts/lib/monsterTransform.mjs`: imported data normalization.
- Create `public/data/monsters.json`: initial generated/sample data for local app use.
- Create `.github/workflows/update-monsters.yml`: protected manual refresh workflow.
- Create `.github/workflows/deploy-pages.yml`: build and deploy static site to GitHub Pages.
- Modify `README.md`: local development, data update, attribution, deployment.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `public/data/monsters.json`
- Modify: `README.md`

- [ ] **Step 1: Create project metadata and scripts**

Create `package.json`:

```json
{
  "name": "tibia-hunt-preparation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "update-data": "node scripts/update-monsters.mjs",
    "validate-data": "node scripts/validate-monsters.mjs public/data/monsters.json"
  },
  "devDependencies": {
    "jsdom": "^24.1.3",
    "typescript": "^5.5.4",
    "vite": "^5.4.19",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 3: Create TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts']
  }
});
```

- [ ] **Step 4: Create static app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tibia Hunt Preparation</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root #app was not found.');
}

app.innerHTML = `
  <section class="app-shell">
    <h1>Tibia Hunt Preparation</h1>
    <p>Build a hunt and compare elemental damage recommendations.</p>
  </section>
`;
```

Create `src/styles.css`:

```css
:root {
  color: #1d252c;
  background: #f4f1ea;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

.app-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}
```

- [ ] **Step 5: Create initial data file**

Create `public/data/monsters.json`:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-04-28T00:00:00.000Z",
  "source": {
    "name": "TibiaWiki/Fandom",
    "url": "https://tibia.fandom.com/wiki/Main_Page",
    "license": "CC BY-SA unless otherwise noted"
  },
  "monsters": [
    {
      "id": "dragon-lord",
      "name": "Dragon Lord",
      "hitpoints": 1900,
      "elements": {
        "physical": 100,
        "earth": 20,
        "fire": 0,
        "energy": 100,
        "ice": 110,
        "holy": 100,
        "death": 100
      },
      "sourceUrl": "https://tibia.fandom.com/wiki/Dragon_Lord",
      "huntRelevant": true,
      "special": false,
      "incomplete": false
    }
  ]
}
```

- [ ] **Step 6: Document the project commands**

Create or update `README.md`:

```md
# Tibia Hunt Preparation

Static GitHub Pages tool for comparing preferred elemental damage in Tibia hunts.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
npm run validate-data
```

## Data Attribution

Creature data and damage modifiers are sourced from TibiaWiki/Fandom:

- https://tibia.fandom.com/wiki/Main_Page
- https://tibia.fandom.com/wiki/List_of_Creatures
- https://tibia.fandom.com/wiki/Damage_Modifiers

Fandom content is available under CC BY-SA unless otherwise noted.
```

- [ ] **Step 7: Verify scaffold**

Run: `npm run build`

Expected: Vite build exits with code 0 and creates `dist/`.

- [ ] **Step 8: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/styles.css public/data/monsters.json README.md
git commit -m "chore: scaffold static app"
```

## Task 2: Domain Types and Data Validation

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/elements.ts`
- Create: `src/domain/validateMonsterData.ts`
- Create: `src/domain/validateMonsterData.test.ts`
- Modify: `scripts/validate-monsters.mjs`

- [ ] **Step 1: Write failing validation tests**

Create `src/domain/validateMonsterData.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateMonsterDatabase } from './validateMonsterData';

const validDatabase = {
  schemaVersion: 1,
  generatedAt: '2026-04-28T00:00:00.000Z',
  source: {
    name: 'TibiaWiki/Fandom',
    url: 'https://tibia.fandom.com/wiki/Main_Page',
    license: 'CC BY-SA unless otherwise noted'
  },
  monsters: [
    {
      id: 'dragon-lord',
      name: 'Dragon Lord',
      hitpoints: 1900,
      elements: {
        physical: 100,
        earth: 20,
        fire: 0,
        energy: 100,
        ice: 110,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Dragon_Lord',
      huntRelevant: true,
      special: false,
      incomplete: false
    }
  ]
};

describe('validateMonsterDatabase', () => {
  it('accepts a valid monster database', () => {
    const result = validateMonsterDatabase(validDatabase);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects duplicate monster ids', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [validDatabase.monsters[0], validDatabase.monsters[0]]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Duplicate monster id: dragon-lord');
  });

  it('rejects hunt relevant monsters with missing element modifiers', () => {
    const result = validateMonsterDatabase({
      ...validDatabase,
      monsters: [
        {
          ...validDatabase.monsters[0],
          elements: {
            physical: 100,
            earth: 100,
            fire: 100,
            energy: 100,
            ice: 100,
            holy: 100
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Monster Dragon Lord is missing death modifier.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/validateMonsterData.test.ts`

Expected: FAIL because `validateMonsterData.ts` does not exist.

- [ ] **Step 3: Implement shared types and elements**

Create `src/domain/types.ts`:

```ts
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
```

Create `src/domain/elements.ts`:

```ts
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
```

- [ ] **Step 4: Implement validation**

Create `src/domain/validateMonsterData.ts`:

```ts
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
      const modifier = monster.elements[element];
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

  const database = input as MonsterDatabase;

  if (database.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!database.generatedAt) errors.push('generatedAt is required.');
  if (!database.source?.url) errors.push('source.url is required.');
  if (!Array.isArray(database.monsters) || database.monsters.length === 0) {
    errors.push('monsters must be a non-empty array.');
  }

  const seenIds = new Set<string>();
  for (const monster of database.monsters ?? []) {
    if (seenIds.has(monster.id)) {
      errors.push(`Duplicate monster id: ${monster.id}`);
    }
    seenIds.add(monster.id);
    validateMonster(monster, errors);
  }

  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 5: Run validation tests**

Run: `npm test -- src/domain/validateMonsterData.test.ts`

Expected: PASS.

- [ ] **Step 6: Add CLI validator**

Create `scripts/validate-monsters.mjs`:

```js
import { readFile } from 'node:fs/promises';

const requiredElements = ['physical', 'earth', 'fire', 'energy', 'ice', 'holy', 'death'];
const filePath = process.argv[2] ?? 'public/data/monsters.json';

function validateMonsterDatabase(database) {
  const errors = [];

  if (database.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!database.generatedAt) errors.push('generatedAt is required.');
  if (!database.source?.url) errors.push('source.url is required.');
  if (!Array.isArray(database.monsters) || database.monsters.length === 0) {
    errors.push('monsters must be a non-empty array.');
  }

  const seenIds = new Set();
  for (const monster of database.monsters ?? []) {
    if (seenIds.has(monster.id)) errors.push(`Duplicate monster id: ${monster.id}`);
    seenIds.add(monster.id);

    if (!monster.id) errors.push('Monster is missing id.');
    if (!monster.name) errors.push(`Monster ${monster.id || '<unknown>'} is missing name.`);
    if (!monster.sourceUrl) errors.push(`Monster ${monster.name || monster.id} is missing sourceUrl.`);

    if (monster.huntRelevant) {
      if (typeof monster.hitpoints !== 'number' || !Number.isFinite(monster.hitpoints) || monster.hitpoints <= 0) {
        errors.push(`Monster ${monster.name} has invalid hitpoints.`);
      }

      for (const element of requiredElements) {
        if (typeof monster.elements?.[element] !== 'number' || !Number.isFinite(monster.elements[element])) {
          errors.push(`Monster ${monster.name} is missing ${element} modifier.`);
        }
      }
    }
  }

  return errors;
}

const database = JSON.parse(await readFile(filePath, 'utf8'));
const errors = validateMonsterDatabase(database);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${database.monsters.length} monsters from ${filePath}.`);
```

- [ ] **Step 7: Verify validation**

Run:

```bash
npm test -- src/domain/validateMonsterData.test.ts
npm run validate-data
```

Expected: tests PASS and validator prints `Validated 1 monsters from public/data/monsters.json.`

- [ ] **Step 8: Commit validation layer**

Run:

```bash
git add src/domain/types.ts src/domain/elements.ts src/domain/validateMonsterData.ts src/domain/validateMonsterData.test.ts scripts/validate-monsters.mjs
git commit -m "feat: validate monster database"
```

## Task 3: Recommendation Engine

**Files:**
- Create: `src/domain/calculateRecommendation.ts`
- Create: `src/domain/calculateRecommendation.test.ts`

- [ ] **Step 1: Write failing calculation tests**

Create `src/domain/calculateRecommendation.test.ts` with tests for ranking, importance, and incomplete exclusion:

```ts
import { describe, expect, it } from 'vitest';
import { calculateRecommendation } from './calculateRecommendation';
import type { Monster } from './types';

const dragonLord: Monster = {
  id: 'dragon-lord',
  name: 'Dragon Lord',
  hitpoints: 1900,
  elements: {
    physical: 100,
    earth: 20,
    fire: 0,
    energy: 100,
    ice: 110,
    holy: 100,
    death: 100
  },
  sourceUrl: 'https://tibia.fandom.com/wiki/Dragon_Lord',
  huntRelevant: true,
  special: false,
  incomplete: false
};

const iceGolem: Monster = {
  id: 'ice-golem',
  name: 'Ice Golem',
  hitpoints: 300,
  elements: {
    physical: 100,
    earth: 100,
    fire: 120,
    energy: 100,
    ice: 0,
    holy: 100,
    death: 100
  },
  sourceUrl: 'https://tibia.fandom.com/wiki/Ice_Golem',
  huntRelevant: true,
  special: false,
  incomplete: false
};

describe('calculateRecommendation', () => {
  it('recommends the element with the highest weighted score', () => {
    const result = calculateRecommendation([
      { monster: dragonLord, importance: 'normal' },
      { monster: iceGolem, importance: 'normal' }
    ]);

    expect(result.recommended?.element).toBe('ice');
    expect(result.ranking[0].element).toBe('ice');
  });

  it('uses user importance to change monster impact', () => {
    const result = calculateRecommendation([
      { monster: dragonLord, importance: 'low' },
      { monster: iceGolem, importance: 'high' }
    ]);

    expect(result.recommended?.element).toBe('fire');
  });

  it('excludes incomplete monsters from the calculation and reports them', () => {
    const incomplete: Monster = {
      ...dragonLord,
      id: 'unknown',
      name: 'Unknown',
      hitpoints: null,
      incomplete: true
    };

    const result = calculateRecommendation([{ monster: incomplete, importance: 'normal' }]);

    expect(result.recommended).toBeNull();
    expect(result.excludedMonsters).toEqual([{ id: 'unknown', name: 'Unknown', reason: 'Missing hitpoints.' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/calculateRecommendation.test.ts`

Expected: FAIL because `calculateRecommendation.ts` does not exist.

- [ ] **Step 3: Implement recommendation engine**

Create `src/domain/calculateRecommendation.ts`:

```ts
import { ELEMENTS, IMPORTANCE_WEIGHTS } from './elements';
import type { ElementType, Importance, Monster } from './types';

export interface HuntSelection {
  monster: Monster;
  importance: Importance;
}

export interface ElementScore {
  element: ElementType;
  score: number;
}

export interface MonsterContribution {
  monsterId: string;
  monsterName: string;
  selectedImportance: Importance;
  recommendedModifier: number;
  contribution: number;
  summary: 'favors' | 'neutral' | 'resists';
}

export interface ExcludedMonster {
  id: string;
  name: string;
  reason: string;
}

export interface RecommendationResult {
  recommended: ElementScore | null;
  ranking: ElementScore[];
  contributions: MonsterContribution[];
  excludedMonsters: ExcludedMonster[];
}

function getExclusionReason(monster: Monster): string | null {
  if (typeof monster.hitpoints !== 'number' || !Number.isFinite(monster.hitpoints) || monster.hitpoints <= 0) {
    return 'Missing hitpoints.';
  }

  for (const element of ELEMENTS) {
    const modifier = monster.elements[element];
    if (typeof modifier !== 'number' || !Number.isFinite(modifier)) {
      return `Missing ${element} modifier.`;
    }
  }

  return null;
}

function summarizeModifier(modifier: number): MonsterContribution['summary'] {
  if (modifier > 100) return 'favors';
  if (modifier < 100) return 'resists';
  return 'neutral';
}

export function calculateRecommendation(selections: HuntSelection[]): RecommendationResult {
  const scores = new Map<ElementType, number>(ELEMENTS.map((element) => [element, 0]));
  const validSelections: HuntSelection[] = [];
  const excludedMonsters: ExcludedMonster[] = [];

  for (const selection of selections) {
    const reason = getExclusionReason(selection.monster);
    if (reason) {
      excludedMonsters.push({
        id: selection.monster.id,
        name: selection.monster.name,
        reason
      });
      continue;
    }

    validSelections.push(selection);
    const weight = IMPORTANCE_WEIGHTS[selection.importance];

    for (const element of ELEMENTS) {
      const modifier = selection.monster.elements[element] as number;
      const score = (selection.monster.hitpoints as number) * weight * modifier;
      scores.set(element, (scores.get(element) ?? 0) + score);
    }
  }

  const ranking = ELEMENTS.map((element) => ({
    element,
    score: scores.get(element) ?? 0
  })).sort((a, b) => b.score - a.score);

  const recommended = validSelections.length > 0 ? ranking[0] : null;
  const contributions: MonsterContribution[] = recommended
    ? validSelections.map((selection) => {
        const modifier = selection.monster.elements[recommended.element] as number;
        const weight = IMPORTANCE_WEIGHTS[selection.importance];
        return {
          monsterId: selection.monster.id,
          monsterName: selection.monster.name,
          selectedImportance: selection.importance,
          recommendedModifier: modifier,
          contribution: (selection.monster.hitpoints as number) * weight * modifier,
          summary: summarizeModifier(modifier)
        };
      })
    : [];

  return {
    recommended,
    ranking,
    contributions,
    excludedMonsters
  };
}
```

- [ ] **Step 4: Run calculation tests**

Run: `npm test -- src/domain/calculateRecommendation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit recommendation engine**

Run:

```bash
git add src/domain/calculateRecommendation.ts src/domain/calculateRecommendation.test.ts
git commit -m "feat: calculate elemental recommendations"
```

## Task 4: Runtime Data Loading and UI

**Files:**
- Create: `src/data/loadMonsters.ts`
- Create: `src/ui/renderApp.ts`
- Create: `src/ui/renderApp.test.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write UI smoke tests**

Create `src/ui/renderApp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderApp } from './renderApp';
import type { MonsterDatabase } from '../domain/types';

const database: MonsterDatabase = {
  schemaVersion: 1,
  generatedAt: '2026-04-28T00:00:00.000Z',
  source: {
    name: 'TibiaWiki/Fandom',
    url: 'https://tibia.fandom.com/wiki/Main_Page',
    license: 'CC BY-SA unless otherwise noted'
  },
  monsters: [
    {
      id: 'dragon-lord',
      name: 'Dragon Lord',
      hitpoints: 1900,
      elements: {
        physical: 100,
        earth: 20,
        fire: 0,
        energy: 100,
        ice: 110,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Dragon_Lord',
      huntRelevant: true,
      special: false,
      incomplete: false
    }
  ]
};

describe('renderApp', () => {
  it('renders autocomplete, add button, and attribution', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    expect(root.querySelector('input[list="monster-options"]')).not.toBeNull();
    expect(root.querySelector('button[data-action="add-monster"]')?.textContent).toContain('Add');
    expect(root.textContent).toContain('TibiaWiki/Fandom');
  });

  it('adds a selected monster and calculates the recommendation', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const button = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');

    if (!input || !button) throw new Error('Expected input and add button.');

    input.value = 'Dragon Lord';
    button.click();

    expect(root.textContent).toContain('Dragon Lord');
    expect(root.textContent).toContain('Recommended');
    expect(root.textContent).toContain('Ice');
  });
});
```

- [ ] **Step 2: Run UI tests to verify failure**

Run: `npm test -- src/ui/renderApp.test.ts`

Expected: FAIL because `renderApp.ts` does not exist.

- [ ] **Step 3: Implement data loader**

Create `src/data/loadMonsters.ts`:

```ts
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
```

- [ ] **Step 4: Implement UI rendering**

Create `src/ui/renderApp.ts`:

```ts
import { ELEMENT_LABELS } from '../domain/elements';
import { calculateRecommendation, type HuntSelection } from '../domain/calculateRecommendation';
import type { Importance, Monster, MonsterDatabase } from '../domain/types';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return entities[char];
  });
}

function importanceLabel(importance: Importance): string {
  return importance === 'low' ? 'Low' : importance === 'high' ? 'High' : 'Normal';
}

function contributionText(summary: 'favors' | 'neutral' | 'resists'): string {
  if (summary === 'favors') return 'favors the recommended element';
  if (summary === 'resists') return 'resists the recommended element';
  return 'is neutral to the recommended element';
}

export function renderApp(root: HTMLElement, database: MonsterDatabase): void {
  const state: { selections: HuntSelection[]; includeAdvanced: boolean } = {
    selections: [],
    includeAdvanced: false
  };

  const findMonsterByName = (name: string): Monster | undefined =>
    database.monsters.find((monster) => monster.name.toLowerCase() === name.trim().toLowerCase());

  const visibleMonsters = (): Monster[] =>
    database.monsters
      .filter((monster) => state.includeAdvanced || (monster.huntRelevant && !monster.incomplete && !monster.special))
      .sort((a, b) => a.name.localeCompare(b.name));

  const rerender = (): void => {
    const result = calculateRecommendation(state.selections);
    const recommendedLabel = result.recommended ? ELEMENT_LABELS[result.recommended.element] : null;

    root.innerHTML = `
      <section class="app-shell">
        <header class="page-header">
          <div>
            <p class="eyebrow">Tibia hunt preparation</p>
            <h1>Elemental damage recommendation</h1>
          </div>
        </header>

        <section class="tool-grid">
          <div class="panel">
            <h2>Hunt monsters</h2>
            <div class="add-row">
              <input name="monster-search" list="monster-options" placeholder="Search monster" />
              <datalist id="monster-options">
                ${visibleMonsters().map((monster) => `<option value="${escapeHtml(monster.name)}"></option>`).join('')}
              </datalist>
              <button type="button" data-action="add-monster">Add</button>
            </div>
            <label class="advanced-toggle">
              <input type="checkbox" name="include-advanced" ${state.includeAdvanced ? 'checked' : ''} />
              Include special and incomplete creatures
            </label>
            <div class="hunt-list">
              ${
                state.selections.length === 0
                  ? '<p class="muted">Add one or more monsters to calculate a recommendation.</p>'
                  : state.selections
                      .map(
                        (selection, index) => `
                          <article class="hunt-item">
                            <div>
                              <strong>${escapeHtml(selection.monster.name)}</strong>
                              <span>${importanceLabel(selection.importance)} importance</span>
                            </div>
                            <select data-action="change-importance" data-index="${index}">
                              <option value="low" ${selection.importance === 'low' ? 'selected' : ''}>Low</option>
                              <option value="normal" ${selection.importance === 'normal' ? 'selected' : ''}>Normal</option>
                              <option value="high" ${selection.importance === 'high' ? 'selected' : ''}>High</option>
                            </select>
                            <button type="button" data-action="remove-monster" data-index="${index}">Remove</button>
                          </article>
                        `
                      )
                      .join('')
              }
            </div>
          </div>

          <div class="panel">
            <h2>Result</h2>
            ${
              recommendedLabel
                ? `<p class="recommendation">Recommended: <strong>${recommendedLabel}</strong></p>`
                : '<p class="muted">No recommendation available yet.</p>'
            }
            <ol class="ranking">
              ${result.ranking
                .map((item) => `<li><span>${ELEMENT_LABELS[item.element]}</span><strong>${Math.round(item.score).toLocaleString()}</strong></li>`)
                .join('')}
            </ol>
            ${
              result.contributions.length > 0
                ? `<h3>Monster summary</h3><ul>${result.contributions
                    .map(
                      (item) =>
                        `<li>${escapeHtml(item.monsterName)} ${contributionText(item.summary)} (${item.recommendedModifier}%).</li>`
                    )
                    .join('')}</ul>`
                : ''
            }
            ${
              result.excludedMonsters.length > 0
                ? `<div class="warning"><strong>Excluded from calculation:</strong><ul>${result.excludedMonsters
                    .map((item) => `<li>${escapeHtml(item.name)}: ${escapeHtml(item.reason)}</li>`)
                    .join('')}</ul></div>`
                : ''
            }
            <p class="credits">Creature data and damage modifiers are credited to <a href="${database.source.url}">TibiaWiki/Fandom</a>. Fandom content is available under ${escapeHtml(database.source.license)}.</p>
          </div>
        </section>

        <footer class="site-footer">
          Data credited to <a href="${database.source.url}">TibiaWiki/Fandom</a>. Fandom content is available under ${escapeHtml(database.source.license)}.
        </footer>
      </section>
    `;

    root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]')?.addEventListener('click', () => {
      const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
      const monster = input ? findMonsterByName(input.value) : undefined;
      if (monster && !state.selections.some((selection) => selection.monster.id === monster.id)) {
        state.selections.push({ monster, importance: 'normal' });
      }
      rerender();
    });

    root.querySelector<HTMLInputElement>('input[name="include-advanced"]')?.addEventListener('change', (event) => {
      state.includeAdvanced = (event.currentTarget as HTMLInputElement).checked;
      rerender();
    });

    root.querySelectorAll<HTMLSelectElement>('select[data-action="change-importance"]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const index = Number((event.currentTarget as HTMLSelectElement).dataset.index);
        state.selections[index].importance = (event.currentTarget as HTMLSelectElement).value as Importance;
        rerender();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('button[data-action="remove-monster"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        const index = Number((event.currentTarget as HTMLButtonElement).dataset.index);
        state.selections.splice(index, 1);
        rerender();
      });
    });
  };

  rerender();
}
```

- [ ] **Step 5: Wire browser entrypoint**

Replace `src/main.ts` with:

```ts
import './styles.css';
import { loadMonsters } from './data/loadMonsters';
import { renderApp } from './ui/renderApp';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('App root #app was not found.');
}

app.innerHTML = '<main class="app-shell"><p>Loading monster data...</p></main>';

try {
  const database = await loadMonsters();
  renderApp(app, database);
} catch (error) {
  app.innerHTML = `
    <main class="app-shell">
      <h1>Tibia Hunt Preparation</h1>
      <p class="warning">Could not load monster data. Please try again later.</p>
    </main>
  `;
  console.error(error);
}
```

- [ ] **Step 6: Replace styling**

Replace `src/styles.css` with:

```css
:root {
  color: #1d252c;
  background: #f3efe7;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

a {
  color: #0b5a8f;
}

button,
input,
select {
  font: inherit;
}

button {
  min-height: 40px;
  border: 1px solid #25445c;
  border-radius: 6px;
  padding: 0 14px;
  color: #ffffff;
  background: #25445c;
  cursor: pointer;
}

button:hover {
  background: #183246;
}

input,
select {
  min-height: 40px;
  border: 1px solid #b9c1c9;
  border-radius: 6px;
  padding: 0 10px;
  color: #1d252c;
  background: #ffffff;
}

.app-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 20px;
}

.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #6b5f4f;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  overflow-wrap: anywhere;
}

h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.15;
}

h2 {
  margin: 0 0 16px;
  font-size: 1.15rem;
}

h3 {
  margin: 18px 0 8px;
  font-size: 1rem;
}

.tool-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
  gap: 18px;
  align-items: start;
}

.panel {
  border: 1px solid #d6d0c5;
  border-radius: 8px;
  padding: 18px;
  background: #fffdf8;
}

.add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 16px;
  color: #4c5660;
  font-size: 0.92rem;
}

.advanced-toggle input {
  min-height: auto;
}

.hunt-list {
  display: grid;
  gap: 10px;
}

.hunt-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 8px;
  align-items: center;
  border-top: 1px solid #e3ded5;
  padding-top: 10px;
}

.hunt-item strong,
.hunt-item span {
  display: block;
}

.hunt-item span,
.muted,
.credits,
.site-footer {
  color: #5a6570;
}

.recommendation {
  margin: 0 0 14px;
  border-left: 4px solid #2f7d4f;
  padding: 10px 12px;
  background: #edf7f0;
}

.ranking {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 22px;
}

.ranking li {
  padding: 6px 0;
}

.ranking span {
  display: inline-block;
  min-width: 90px;
}

.warning {
  margin-top: 14px;
  border: 1px solid #d9a441;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff6df;
}

.credits {
  margin: 18px 0 0;
  font-size: 0.88rem;
}

.site-footer {
  margin-top: 20px;
  border-top: 1px solid #d6d0c5;
  padding-top: 14px;
  font-size: 0.88rem;
}

@media (max-width: 760px) {
  .app-shell {
    width: min(100% - 20px, 1120px);
    padding-top: 18px;
  }

  h1 {
    font-size: 1.55rem;
  }

  .tool-grid,
  .add-row,
  .hunt-item {
    grid-template-columns: 1fr;
  }

  .hunt-item button,
  .hunt-item select {
    width: 100%;
  }
}
```

- [ ] **Step 7: Run UI tests and build**

Run:

```bash
npm test -- src/ui/renderApp.test.ts
npm run build
```

Expected: tests PASS and build exits with code 0.

- [ ] **Step 8: Commit UI**

Run:

```bash
git add src/data/loadMonsters.ts src/ui/renderApp.ts src/ui/renderApp.test.ts src/main.ts src/styles.css
git commit -m "feat: build hunt recommendation UI"
```

## Task 5: Scraper and Data Importer

**Files:**
- Create: `scripts/lib/tibiaWikiClient.mjs`
- Create: `scripts/lib/monsterTransform.mjs`
- Create: `scripts/update-monsters.mjs`
- Modify: `public/data/monsters.json`

- [ ] **Step 1: Implement TibiaWiki/Fandom API client**

Create `scripts/lib/tibiaWikiClient.mjs`:

```js
const API_URL = 'https://tibia.fandom.com/api.php';

export async function fetchWikiJson(params) {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TibiaWiki request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCreaturePageTitles() {
  const titles = [];
  let cmcontinue;

  do {
    const data = await fetchWikiJson({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Creatures',
      cmlimit: '500',
      ...(cmcontinue ? { cmcontinue } : {})
    });

    titles.push(...data.query.categorymembers.map((item) => item.title));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);

  return titles;
}

export async function fetchPageWikitext(title) {
  const data = await fetchWikiJson({
    action: 'parse',
    page: title,
    prop: 'wikitext'
  });

  return data.parse?.wikitext?.['*'] ?? '';
}
```

- [ ] **Step 2: Implement monster transform**

Create `scripts/lib/monsterTransform.mjs`:

```js
const elements = ['physical', 'earth', 'fire', 'energy', 'ice', 'holy', 'death'];

export function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNumber(value) {
  if (!value) return null;
  const normalized = String(value).replace(/,/g, '').match(/\d+/)?.[0];
  return normalized ? Number(normalized) : null;
}

function getTemplateValue(wikitext, keys) {
  for (const key of keys) {
    const match = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|}]+)`, 'i'));
    if (match) return match[1].trim();
  }
  return null;
}

function parseModifier(wikitext, element) {
  const raw = getTemplateValue(wikitext, [
    `${element}DmgMod`,
    `${element}Mod`,
    `${element}`,
    `${element}Percent`
  ]);
  const parsed = parseNumber(raw);
  return parsed;
}

export function transformCreaturePage(title, wikitext) {
  const hitpoints = parseNumber(getTemplateValue(wikitext, ['hitpoints', 'hp', 'health']));
  const mappedElements = Object.fromEntries(elements.map((element) => [element, parseModifier(wikitext, element)]));
  const missingElement = elements.some((element) => typeof mappedElements[element] !== 'number');
  const incomplete = !hitpoints || missingElement;

  return {
    id: slugifyName(title),
    name: title,
    hitpoints,
    elements: mappedElements,
    sourceUrl: `https://tibia.fandom.com/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
    huntRelevant: !incomplete,
    special: /\b(summon|event|deprecated|object|npc)\b/i.test(wikitext),
    incomplete
  };
}
```

- [ ] **Step 3: Implement update script**

Create `scripts/update-monsters.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchCreaturePageTitles, fetchPageWikitext } from './lib/tibiaWikiClient.mjs';
import { transformCreaturePage } from './lib/monsterTransform.mjs';

const outputPath = 'public/data/monsters.json';
const titles = await fetchCreaturePageTitles();
const monsters = [];

for (const title of titles) {
  const wikitext = await fetchPageWikitext(title);
  monsters.push(transformCreaturePage(title, wikitext));
}

monsters.sort((a, b) => a.name.localeCompare(b.name));

const database = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    name: 'TibiaWiki/Fandom',
    url: 'https://tibia.fandom.com/wiki/Main_Page',
    license: 'CC BY-SA unless otherwise noted'
  },
  monsters
};

await mkdir('public/data', { recursive: true });
await writeFile(outputPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
console.log(`Wrote ${monsters.length} monsters to ${outputPath}.`);
```

- [ ] **Step 4: Run importer**

Run: `npm run update-data`

Expected: `public/data/monsters.json` is rewritten with a list of creature records. If Fandom blocks or changes templates, capture the exact failure and adjust `tibiaWikiClient.mjs` or `monsterTransform.mjs`.

- [ ] **Step 5: Validate imported data**

Run: `npm run validate-data`

Expected: PASS. If many monsters are incomplete, the validator should still pass because only `huntRelevant` monsters require complete HP and modifiers.

- [ ] **Step 6: Commit importer**

Run:

```bash
git add scripts/lib/tibiaWikiClient.mjs scripts/lib/monsterTransform.mjs scripts/update-monsters.mjs public/data/monsters.json
git commit -m "feat: import TibiaWiki monster data"
```

## Task 6: GitHub Actions for Data Refresh and Pages Deploy

**Files:**
- Create: `.github/workflows/update-monsters.yml`
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Add protected manual data update workflow**

Create `.github/workflows/update-monsters.yml`:

```yaml
name: Update monster data

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update-monsters:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Update data
        run: npm run update-data

      - name: Validate data
        run: npm run validate-data

      - name: Build
        run: npm run build

      - name: Commit updated data
        run: |
          if git diff --quiet -- public/data/monsters.json; then
            echo "No monster data changes."
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/data/monsters.json
          git commit -m "chore: update monster data"
          git push
```

- [ ] **Step 2: Add GitHub Pages deploy workflow**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verify workflows locally as YAML files**

Run:

```bash
npm test
npm run build
npm run validate-data
```

Expected: all commands exit with code 0.

- [ ] **Step 4: Commit workflows**

Run:

```bash
git add .github/workflows/update-monsters.yml .github/workflows/deploy-pages.yml
git commit -m "ci: add data refresh and pages deploy workflows"
```

## Task 7: Final MVP Verification

**Files:**
- Modify: `README.md`
- Review: all MVP files

- [ ] **Step 1: Update README with complete usage**

Ensure `README.md` includes:

```md
## Updating monster data

Admins can run the `Update monster data` GitHub Action manually. The workflow scrapes TibiaWiki/Fandom, validates `public/data/monsters.json`, runs the build, and commits directly to `main` only when validation passes.

## Deployment

The `Deploy GitHub Pages` workflow builds and publishes the static site from `dist`.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run validate-data
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Run local smoke test**

Run: `npm run dev`

Expected: Vite prints a local URL. Open the URL, add `Dragon Lord`, confirm the result recommends `Ice`, shows the full ranking, shows monster summary, and shows TibiaWiki/Fandom credits in both result panel and footer.

- [ ] **Step 4: Review MVP criteria**

Confirm these requirements from the spec are implemented:

- static site loads from built assets;
- autocomplete adds multiple monsters;
- each monster has low, normal, high importance;
- result highlights best element;
- full ranking for physical, earth, fire, energy, ice, holy, death appears;
- monster contribution summary appears;
- incomplete data is excluded with a warning;
- TibiaWiki/Fandom credits appear in footer and results;
- manual GitHub Action updates and validates data before committing.

- [ ] **Step 5: Commit final docs polish**

Run:

```bash
git add README.md
git commit -m "docs: document MVP usage"
```

## Self-Review Notes

- Spec coverage: all MVP requirements are mapped to tasks. UI, calculation, data model, scraper, validation, credits, GitHub Actions, and deployment are covered.
- Placeholder scan: plan contains no deferred-work markers. Code-changing steps include concrete file content or exact command blocks.
- Type consistency: `ElementType`, `Importance`, `Monster`, `MonsterDatabase`, `HuntSelection`, and `RecommendationResult` names are introduced before use.
- Risk: scraper field extraction may require adjustment after the first real Fandom API run. The plan explicitly captures that feedback loop in Task 5 Step 4.
