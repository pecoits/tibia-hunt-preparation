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
      huntRelevant: true,
      special: false,
      incomplete: true
    }
  ]
};

describe('renderApp', () => {
  it('renders autocomplete, add button, and attribution', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    expect(root.querySelector('input[name="monster-search"]')).not.toBeNull();
    expect(root.querySelector('button[data-action="add-monster"]')?.textContent).toContain('Add');
    expect(root.textContent).toContain('TibiaWiki/Fandom');
    expect(root.textContent).toContain('Developed by Pecoits');
    expect(root.textContent).toContain('CC BY-NC 4.0 International');
    const githubLink = root.querySelector<HTMLAnchorElement>('footer a[href="https://github.com/pecoits/tibia-hunt-preparation"]');
    expect(githubLink).not.toBeNull();
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
    const summaryMonsterLink = root.querySelector<HTMLAnchorElement>('.summary-list a');
    expect(summaryMonsterLink?.textContent).toBe('Dragon Lord');
    expect(summaryMonsterLink?.getAttribute('href')).toBe('https://tibia.fandom.com/wiki/Dragon_Lord');
    expect(summaryMonsterLink?.getAttribute('target')).toBe('_blank');
    const sprite = root.querySelector<HTMLImageElement>('.monster-sprite img');
    expect(sprite).not.toBeNull();
    expect(sprite?.getAttribute('src')).toContain('/wiki/Special:FilePath/Dragon_Lord.gif');
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

  it('updates importance via stepper controls and recalculates score', () => {
    const root = document.createElement('main');

    renderApp(root, database);

    const input = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
    const addButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');
    if (!input || !addButton) throw new Error('Expected add controls.');

    input.value = 'Dragon Lord';
    addButton.click();

    expect(root.textContent).toContain('Importance: Normal');
    expect(root.textContent).toContain('Top raw score: 209,000');

    let stepperButtons = root.querySelectorAll<HTMLButtonElement>('.importance-control .stepper-button');
    if (stepperButtons.length !== 2) throw new Error('Expected two stepper buttons.');
    stepperButtons[1].click();

    expect(root.textContent).toContain('Importance: High');
    expect(root.textContent).toContain('Top raw score: 418,000');

    stepperButtons = root.querySelectorAll<HTMLButtonElement>('.importance-control .stepper-button');
    stepperButtons[0].click();
    stepperButtons = root.querySelectorAll<HTMLButtonElement>('.importance-control .stepper-button');
    stepperButtons[0].click();

    expect(root.textContent).toContain('Importance: Low');
    expect(root.textContent).toContain('Top raw score: 104,500');
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

      const updatedToggle = root.querySelector<HTMLInputElement>('.toggle-row input[type="checkbox"]');
      const updatedInput = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
      const updatedButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');

      if (!updatedToggle || !updatedInput || !updatedButton) throw new Error('Expected controls after rerender.');

      updatedToggle.checked = true;
      updatedToggle.dispatchEvent(new Event('change', { bubbles: true }));

      const advancedInput = root.querySelector<HTMLInputElement>('input[name="monster-search"]');
      const advancedButton = root.querySelector<HTMLButtonElement>('button[data-action="add-monster"]');

      if (!advancedInput || !advancedButton) throw new Error('Expected controls with advanced enabled.');

      advancedInput.value = monsterName;
      advancedButton.click();

      expect(root.querySelectorAll('.selected-monster')).toHaveLength(1);
      expect(root.textContent).toContain(monsterName);
    }
  );

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
});
