import { beforeEach, describe, expect, it } from 'vitest';
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
  quality: {
    lastValidatedAt: '2026-04-28T00:00:00.000Z'
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
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Dragon_Lord.gif',
      aliases: ['Dragon Lord', 'DL'],
      dataCompletenessScore: 100,
      huntRelevant: true,
      special: false,
      incomplete: false
    },
    {
      id: 'holy-scout',
      name: 'Holy Scout',
      hitpoints: 700,
      elements: {
        physical: 100,
        earth: 100,
        fire: 100,
        energy: 100,
        ice: 100,
        holy: 220,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Holy_Scout',
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Holy_Scout.gif',
      aliases: ['Holy Scout'],
      dataCompletenessScore: 100,
      huntRelevant: true,
      special: false,
      incomplete: false
    },
    {
      id: 'test-raid-boss',
      name: 'Test Raid Boss',
      hitpoints: 5000,
      elements: {
        physical: 100,
        earth: 100,
        fire: 100,
        energy: 100,
        ice: 100,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Test_Raid_Boss',
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Test_Raid_Boss.gif',
      aliases: ['Test Raid Boss'],
      dataCompletenessScore: 100,
      huntRelevant: true,
      special: true,
      incomplete: false
    },
    {
      id: 'test-incomplete-creature',
      name: 'Test Incomplete Creature',
      hitpoints: 3000,
      elements: {
        physical: 100,
        earth: 100,
        fire: 100,
        energy: 100,
        ice: 100,
        holy: 100,
        death: 100
      },
      sourceUrl: 'https://tibia.fandom.com/wiki/Test_Incomplete_Creature',
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Test_Incomplete_Creature.gif',
      aliases: ['Test Incomplete Creature'],
      dataCompletenessScore: 100,
      huntRelevant: true,
      special: false,
      incomplete: true
    }
  ]
};

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.removeItem('hunt-element-planner-tutorial-v1');
  window.localStorage.removeItem('hunt-element-planner-language-v1');
});

describe('renderApp', () => {
  function getButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === text);
  }

  it('renders autocomplete, share control, and attribution', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    expect(root.querySelector('input[name="monster-search"]')).not.toBeNull();
    expect(root.querySelector('button[data-action="add-monster"]')?.textContent).toContain('Add');
    expect(root.textContent).toContain('Copy hunt link');
    expect(root.textContent).not.toContain('Admin tools');
    expect(root.textContent).toContain('TibiaWiki/Fandom');
    expect(root.textContent).toContain('Developed by Pecoits');
    expect(root.textContent).toContain('CC BY-NC 4.0 International');
    expect(root.textContent).toContain('Data version:');
  });

  it('switches UI language without changing monster names', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const addButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !addButton) throw new Error('Expected add controls.');
    input.value = 'Dragon Lord';
    addButton.click();

    const languageSelect = root.querySelector<HTMLSelectElement>('select[name="app-language"]');
    if (!languageSelect) throw new Error('Expected language selector.');
    languageSelect.value = 'pt';
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(root.textContent).toContain('Montar hunt');
    expect(root.textContent).toContain('Dragon Lord');
  });

  it('keeps admin update action disabled until token and unlock phrase are valid', () => {
    window.history.replaceState({}, '', '/?admin=1');
    const root = document.createElement('main');
    renderApp(root, database);

    const actionButton = root.querySelector<HTMLButtonElement>('button[data-action="admin-run-update"]');
    const tokenInput = root.querySelector<HTMLInputElement>('input[name="admin-token"]');
    const unlockInput = root.querySelector<HTMLInputElement>('input[name="admin-unlock"]');
    if (!actionButton || !tokenInput || !unlockInput) throw new Error('Expected admin controls.');

    expect(actionButton.disabled).toBe(true);
    tokenInput.value = 'ghp_123456789012345678901234567890123456';
    tokenInput.dispatchEvent(new Event('input', { bubbles: true }));
    unlockInput.value = 'UPDATE';
    unlockInput.dispatchEvent(new Event('input', { bubbles: true }));

    const refreshedButton = root.querySelector<HTMLButtonElement>('button[data-action="admin-run-update"]');
    expect(refreshedButton?.disabled).toBe(false);
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
    expect(root.textContent).toContain('of recommended total');
    const summaryMonsterLink = root.querySelector<HTMLAnchorElement>('.summary-list a');
    expect(summaryMonsterLink?.textContent).toBe('Dragon Lord');
    expect(summaryMonsterLink?.getAttribute('href')).toBe('https://tibia.fandom.com/wiki/Dragon_Lord');
    expect(summaryMonsterLink?.getAttribute('target')).toBe('_blank');
  });

  it('adds a second monster by name after the first one', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const firstInput = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const firstButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!firstInput || !firstButton) throw new Error('Expected add controls.');

    firstInput.value = 'Dragon Lord';
    firstButton.click();

    const secondInput = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const secondButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!secondInput || !secondButton) throw new Error('Expected add controls after first insert.');

    secondInput.value = 'Holy Scout';
    secondButton.click();

    expect(root.querySelectorAll('.selected-monster')).toHaveLength(2);
    expect(root.textContent).toContain('Dragon Lord');
    expect(root.textContent).toContain('Holy Scout');
  });

  it('adds monster from partial query using first autocomplete match', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const button = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !button) throw new Error('Expected add controls.');

    input.value = 'holy';
    button.click();

    expect(root.querySelectorAll('.selected-monster')).toHaveLength(1);
    expect(root.textContent).toContain('Holy Scout');
  });

  it('shows mobile-friendly autocomplete options while typing', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    if (!input) throw new Error('Expected input.');

    input.value = 'drag';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const options = Array.from(root.querySelectorAll<HTMLButtonElement>('.autocomplete-option')).map((button) =>
      button.textContent?.trim()
    );
    expect(options).toContain('Dragon Lord');
  });

  it('updates numeric weight and recalculates score', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const addButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !addButton) throw new Error('Expected add controls.');

    input.value = 'Dragon Lord';
    addButton.click();

    expect(root.textContent).toContain('Weight: 50');
    expect(root.textContent).toContain('Top raw score: 209,000');

    const highPresetButton = Array.from(root.querySelectorAll<HTMLButtonElement>('.weight-preset')).find(
      (button) => button.textContent === 'High'
    );
    if (!highPresetButton) throw new Error('Expected high preset button.');
    highPresetButton.click();

    expect(root.textContent).toContain('Weight: 75');
    expect(root.textContent).toContain('Top raw score: 313,500');

    const weightInput = root.querySelector<HTMLInputElement>('.weight-input');
    if (!weightInput) throw new Error('Expected weight input.');
    weightInput.value = '25';
    weightInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(root.textContent).toContain('Weight: 25');
    expect(root.textContent).toContain('Top raw score: 104,500');
  });

  it('updates recommendation when vocation eligibility changes', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const addButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !addButton) throw new Error('Expected add controls.');

    input.value = 'Holy Scout';
    addButton.click();

    expect(root.textContent).toContain('Physical');

    const vocationSelect = root.querySelector<HTMLSelectElement>('select[name="player-vocation"]');
    const levelInput = root.querySelector<HTMLInputElement>('input[name="player-level"]');
    if (!vocationSelect || !levelInput) throw new Error('Expected vocation controls.');

    vocationSelect.value = 'paladin';
    vocationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    levelInput.value = '200';
    levelInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(root.textContent).toContain('Holy');
  });

  it('imports monsters in batch and reports missing entries', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const batchAccess = root.querySelector<HTMLButtonElement>('button[data-action="batch-access"]');
    if (!batchAccess) throw new Error('Expected batch access button.');
    batchAccess.click();

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[name="batch-import"]');
    const importButton = root.querySelector<HTMLButtonElement>('button[data-action="import-monsters"]');
    if (!textarea || !importButton) throw new Error('Expected batch import controls.');

    textarea.value = 'DL, Holy Scout\nUnknown Creature';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    importButton.click();

    expect(root.querySelectorAll('.selected-monster')).toHaveLength(2);
    expect(root.textContent).toContain('Processed 3. Matched 2, added 2, duplicates 0, missing 1.');
    expect(root.textContent).toContain('Missing: Unknown Creature.');
  });

  it.each(['Test Raid Boss', 'Test Incomplete Creature'])(
    'prevents hidden monster %s from being added until the advanced toggle is enabled',
    (monsterName) => {
      const root = document.createElement('main');

      renderApp(root, database);

      const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
      const button = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
      const advancedToggle = root.querySelector<HTMLInputElement>('.toggle-row input[type="checkbox"]');

      if (!input || !button || !advancedToggle) throw new Error('Expected input, add button, and advanced toggle.');

      input.value = monsterName;
      button.click();

      expect(root.querySelectorAll('.selected-monster')).toHaveLength(0);
      expect(root.textContent).not.toContain(monsterName);

      advancedToggle.checked = true;
      advancedToggle.dispatchEvent(new Event('change', { bubbles: true }));

      const advancedInput = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
      const advancedButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');

      if (!advancedInput || !advancedButton) throw new Error('Expected controls with advanced enabled.');

      advancedInput.value = monsterName;
      advancedButton.click();

      expect(root.querySelectorAll('.selected-monster')).toHaveLength(1);
      expect(root.textContent).toContain(monsterName);
    }
  );

  it('updates and restores hunt state through URL', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const addButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !addButton) throw new Error('Expected add controls.');

    input.value = 'Dragon Lord';
    addButton.click();

    expect(window.location.href).toContain('hunt=');

    const rootRestored = document.createElement('main');
    renderApp(rootRestored, database);
    expect(rootRestored.textContent).toContain('Dragon Lord');
    expect(rootRestored.textContent).toContain('Weight: 50');
  });

  it.each(['javascript:alert(1)', 'not a valid url'])(
    'falls back to the TibiaWiki URL for unsafe or malformed source URL %s',
    (url) => {
      const root = document.createElement('main');
      const unsafeDatabase: MonsterDatabase = {
        ...database,
        source: {
          ...database.source,
          url
        }
      };

      renderApp(root, unsafeDatabase);

      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.credit-line a'));

      expect(links).toHaveLength(2);
      expect(links.every((link) => link.getAttribute('href') === 'https://tibia.fandom.com/wiki/Main_Page')).toBe(true);
    }
  );

  it('adds a visible monster with the Enter key', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    if (!input) throw new Error('Expected input.');

    input.value = 'Dragon Lord';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(root.textContent).toContain('Dragon Lord');
    expect(root.textContent).toContain('Recommended');
  });

  it('shows tutorial on first access and allows skip/reopen', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    expect(root.textContent).toContain('Step 1 of 4');
    getButton(root, 'Skip')?.click();
    expect(root.textContent).not.toContain('Step 1 of 4');

    getButton(root, 'How to use')?.click();
    expect(root.textContent).toContain('Step 1 of 4');
  });

  it('persists tutorial completion and keeps it closed on next render', () => {
    const root = document.createElement('main');
    renderApp(root, database);

    getButton(root, 'Next')?.click();
    getButton(root, 'Next')?.click();
    getButton(root, 'Next')?.click();
    getButton(root, 'Finish tutorial')?.click();
    expect(window.localStorage.getItem('hunt-element-planner-tutorial-v1')).toBe('done');

    const secondRoot = document.createElement('main');
    renderApp(secondRoot, database);
    expect(secondRoot.textContent).not.toContain('Step 1 of 4');
  });
});
