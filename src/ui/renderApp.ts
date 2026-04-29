import { calculateRecommendation, type HuntSelection } from '../domain/calculateRecommendation';
import { ELEMENT_LABELS } from '../domain/elements';
import type { Importance, Monster, MonsterDatabase } from '../domain/types';

const IMPORTANCE_LEVELS: Importance[] = ['low', 'normal', 'high'];
const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High'
};
const FALLBACK_SOURCE_URL = 'https://tibia.fandom.com/wiki/Main_Page';
const WIKI_FILE_PATH_URL = 'https://tibia.fandom.com/wiki/Special:FilePath/';
const REPOSITORY_URL = 'https://github.com/pecoits/tibia-hunt-preparation';
const LICENSE_LABEL = 'CC BY-NC 4.0 International';

interface SelectedMonster {
  monster: Monster;
  importance: Importance;
}

function appendText(parent: HTMLElement, tagName: keyof HTMLElementTagNameMap, text: string, className?: string): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function formatScore(score: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(score);
}

function findVisibleMonster(database: MonsterDatabase, query: string, includeAdvanced: boolean): Monster | undefined {
  const normalized = query.trim().toLocaleLowerCase();
  return database.monsters.find(
    (monster) =>
      shouldShowInAutocomplete(monster, includeAdvanced) &&
      (monster.name.toLocaleLowerCase() === normalized || monster.id.toLocaleLowerCase() === normalized)
  );
}

function findAutocompleteMatches(database: MonsterDatabase, query: string, includeAdvanced: boolean): Monster[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const exact: Monster[] = [];
  const contains: Monster[] = [];
  for (const monster of database.monsters) {
    if (!shouldShowInAutocomplete(monster, includeAdvanced)) continue;
    const name = monster.name.toLocaleLowerCase();
    const id = monster.id.toLocaleLowerCase();
    if (name === normalized || id === normalized) {
      exact.push(monster);
      continue;
    }
    if (name.includes(normalized) || id.includes(normalized)) {
      contains.push(monster);
    }
  }

  return [...exact, ...contains].slice(0, 8);
}

function shouldShowInAutocomplete(monster: Monster, includeAdvanced: boolean): boolean {
  if (includeAdvanced) return true;
  return monster.huntRelevant && !monster.special && !monster.incomplete;
}

function getSafeSourceUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return parsedUrl.href;
    }
  } catch {
    return FALLBACK_SOURCE_URL;
  }

  return FALLBACK_SOURCE_URL;
}

function renderAttribution(parent: HTMLElement, database: MonsterDatabase, className: string): void {
  const paragraph = appendText(parent, 'p', 'Data: ', className);
  const link = document.createElement('a');
  link.href = getSafeSourceUrl(database.source.url);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = database.source.name;
  paragraph.append(link, document.createTextNode(`. ${database.source.license}.`));
}

function getMonsterSpriteCandidates(monster: Monster): string[] {
  try {
    const source = new URL(monster.sourceUrl);
    if (source.hostname !== 'tibia.fandom.com') return [];
    const title = decodeURIComponent(source.pathname.replace('/wiki/', '').trim());
    if (!title || title.includes('/')) return [];
    const normalizedTitle = title.replaceAll(' ', '_');
    return [`${WIKI_FILE_PATH_URL}${encodeURIComponent(`${normalizedTitle}.gif`)}`];
  } catch {
    return [];
  }
}

function createMonsterSprite(monster: Monster): HTMLElement {
  const frame = document.createElement('div');
  frame.className = 'monster-sprite';

  const image = document.createElement('img');
  image.alt = `${monster.name} gif`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.width = 56;
  image.height = 56;

  const [candidate] = getMonsterSpriteCandidates(monster);
  if (!candidate) {
    frame.classList.add('monster-sprite-fallback');
    frame.textContent = monster.name.slice(0, 2).toLocaleUpperCase();
    return frame;
  }

  image.src = candidate;
  image.addEventListener('error', () => {
    image.remove();
    frame.classList.add('monster-sprite-fallback');
    frame.textContent = monster.name.slice(0, 2).toLocaleUpperCase();
  });
  frame.append(image);
  return frame;
}

function getNextImportance(current: Importance, direction: -1 | 1): Importance {
  const currentIndex = IMPORTANCE_LEVELS.indexOf(current);
  const nextIndex = Math.min(IMPORTANCE_LEVELS.length - 1, Math.max(0, currentIndex + direction));
  return IMPORTANCE_LEVELS[nextIndex];
}

function renderProjectMeta(parent: HTMLElement, className: string): void {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  paragraph.append('Developed by Pecoits under ');

  const license = document.createElement('strong');
  license.textContent = LICENSE_LABEL;
  paragraph.append(license, document.createTextNode('. '));

  const link = document.createElement('a');
  link.href = REPOSITORY_URL;
  link.rel = 'noreferrer';
  link.textContent = 'GitHub';
  paragraph.append(link);
  parent.append(paragraph);
}

export function renderApp(root: HTMLElement, database: MonsterDatabase): void {
  const selected: SelectedMonster[] = [];
  let includeAdvanced = false;
  let draftQuery = '';

  const container = root.tagName.toLocaleLowerCase() === 'main' ? root : document.createElement('main');
  container.className = 'app-shell';
  if (container !== root) {
    root.replaceChildren(container);
  }

  const rerender = (): void => {
    container.replaceChildren();

    const header = document.createElement('header');
    header.className = 'app-header';
    appendText(header, 'h1', 'Hunt Element Planner');
    appendText(header, 'p', 'Plan your hunt loadout with weighted monster importance and elemental ranking.');
    container.append(header);

    const layout = document.createElement('section');
    layout.className = 'tool-layout';
    container.append(layout);

    const builder = document.createElement('section');
    builder.className = 'tool-panel builder-panel';
    builder.setAttribute('aria-labelledby', 'builder-title');
    appendText(builder, 'h2', 'Hunt builder').id = 'builder-title';

    const controls = document.createElement('div');
    controls.className = 'add-controls';

    const inputLabel = document.createElement('label');
    inputLabel.className = 'field-label';
    inputLabel.textContent = 'Monster';
    const input = document.createElement('input');
    input.name = 'monster-search';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'Type a monster name';
    input.setAttribute('aria-autocomplete', 'list');
    input.value = draftQuery;
    const addSelectedMonster = (): void => {
      const monster = findVisibleMonster(database, input.value, includeAdvanced);
      if (!monster) return;
      if (!selected.some((selection) => selection.monster.id === monster.id)) {
        selected.push({ monster, importance: 'normal' });
      }
      draftQuery = '';
      input.value = '';
      rerender();
    };
    input.addEventListener('input', () => {
      draftQuery = input.value;
      const caret = input.selectionStart ?? draftQuery.length;
      rerender();
      const refreshedInput = container.querySelector<HTMLInputElement>('input[name="monster-search"]');
      if (refreshedInput) {
        refreshedInput.focus();
        refreshedInput.setSelectionRange(caret, caret);
      }
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addSelectedMonster();
    });
    inputLabel.append(input);

    const suggestions = document.createElement('ul');
    suggestions.className = 'autocomplete-list';
    suggestions.setAttribute('aria-label', 'Monster suggestions');
    const matches = findAutocompleteMatches(database, draftQuery, includeAdvanced);
    for (const monster of matches) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'autocomplete-option';
      button.textContent = monster.name;
      button.addEventListener('click', () => {
        draftQuery = monster.name;
        input.value = monster.name;
        addSelectedMonster();
      });
      item.append(button);
      suggestions.append(item);
    }

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.dataset.action = 'add-monster';
    addButton.textContent = 'Add';
    addButton.addEventListener('click', addSelectedMonster);

    controls.append(inputLabel, addButton);
    builder.append(controls);
    if (matches.length > 0) {
      builder.append(suggestions);
    }

    const advancedLabel = document.createElement('label');
    advancedLabel.className = 'toggle-row';
    const advancedInput = document.createElement('input');
    advancedInput.type = 'checkbox';
    advancedInput.checked = includeAdvanced;
    advancedInput.addEventListener('change', () => {
      includeAdvanced = advancedInput.checked;
      rerender();
    });
    advancedLabel.append(advancedInput, document.createTextNode('Include special and incomplete creatures'));
    builder.append(advancedLabel);

    const selectedList = document.createElement('div');
    selectedList.className = 'selected-list';
    if (selected.length === 0) {
      appendText(selectedList, 'p', 'No monsters selected yet.', 'empty-state');
    } else {
      for (const selection of selected) {
        const row = document.createElement('article');
        row.className = 'selected-monster';

        const media = createMonsterSprite(selection.monster);
        const details = document.createElement('div');
        appendText(details, 'h3', selection.monster.name);
        const flags = [
          selection.monster.special ? 'Special' : '',
          selection.monster.incomplete ? 'Incomplete' : '',
          selection.monster.huntRelevant ? '' : 'Not hunt relevant'
        ].filter(Boolean);
        appendText(details, 'p', flags.length > 0 ? flags.join(' · ') : 'Standard hunt creature', 'monster-flags');

        const actions = document.createElement('div');
        actions.className = 'selected-actions';

        const importanceControl = document.createElement('div');
        importanceControl.className = 'importance-control';
        const lowButton = document.createElement('button');
        lowButton.type = 'button';
        lowButton.className = 'stepper-button';
        lowButton.textContent = '-';
        lowButton.disabled = selection.importance === 'low';
        lowButton.addEventListener('click', () => {
          selection.importance = getNextImportance(selection.importance, -1);
          rerender();
        });

        const importanceValue = document.createElement('p');
        importanceValue.className = 'importance-value';
        importanceValue.textContent = `Importance: ${IMPORTANCE_LABELS[selection.importance]}`;

        const highButton = document.createElement('button');
        highButton.type = 'button';
        highButton.className = 'stepper-button';
        highButton.textContent = '+';
        highButton.disabled = selection.importance === 'high';
        highButton.addEventListener('click', () => {
          selection.importance = getNextImportance(selection.importance, 1);
          rerender();
        });
        importanceControl.append(lowButton, importanceValue, highButton);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'secondary-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          const index = selected.findIndex((item) => item.monster.id === selection.monster.id);
          if (index >= 0) selected.splice(index, 1);
          rerender();
        });

        actions.append(importanceControl, removeButton);
        row.append(media, details, actions);
        selectedList.append(row);
      }
    }
    builder.append(selectedList);
    layout.append(builder);

    const resultPanel = document.createElement('section');
    resultPanel.className = 'tool-panel result-panel';
    resultPanel.setAttribute('aria-labelledby', 'result-title');
    appendText(resultPanel, 'h2', 'Results').id = 'result-title';

    const recommendation = calculateRecommendation(selected as HuntSelection[]);
    if (!recommendation.recommended) {
      appendText(resultPanel, 'p', 'Add at least one complete monster to calculate a recommendation.', 'empty-state');
    } else {
      const recommendedLabel = ELEMENT_LABELS[recommendation.recommended.element];
      appendText(resultPanel, 'p', 'Recommended', 'eyebrow');
      appendText(resultPanel, 'h3', recommendedLabel, 'recommended-element');
      appendText(resultPanel, 'p', `Top raw score: ${formatScore(recommendation.recommended.score)}`, 'score-note');

      appendText(resultPanel, 'h3', 'Full ranking', 'section-heading');
      const rankingList = document.createElement('ol');
      rankingList.className = 'ranking-list';
      for (const item of recommendation.ranking) {
        const rankingItem = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = ELEMENT_LABELS[item.element];
        const score = document.createElement('strong');
        score.textContent = formatScore(item.score);
        rankingItem.append(label, score);
        rankingList.append(rankingItem);
      }
      resultPanel.append(rankingList);

      appendText(resultPanel, 'h3', 'Monster summary', 'section-heading');
      const summaryList = document.createElement('ul');
      summaryList.className = 'summary-list';
      const sourceByMonsterId = new Map<string, string>(selected.map((item) => [item.monster.id, item.monster.sourceUrl]));
      for (const contribution of recommendation.contributions) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = getSafeSourceUrl(sourceByMonsterId.get(contribution.monsterId) ?? FALLBACK_SOURCE_URL);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = contribution.monsterName;
        item.append(
          link,
          document.createTextNode(
            `: ${contribution.recommendedModifier}% ${contribution.summary}, ${contribution.selectedImportance} importance, contribution ${formatScore(contribution.contribution)}.`
          )
        );
        summaryList.append(item);
      }
      resultPanel.append(summaryList);
    }

    if (recommendation.excludedMonsters.length > 0) {
      const warning = document.createElement('div');
      warning.className = 'warning';
      appendText(warning, 'h3', 'Excluded monsters');
      const list = document.createElement('ul');
      for (const monster of recommendation.excludedMonsters) {
        const item = document.createElement('li');
        item.textContent = `${monster.name}: ${monster.reason}`;
        list.append(item);
      }
      warning.append(list);
      resultPanel.append(warning);
    }

    renderAttribution(resultPanel, database, 'credit-line');
    layout.append(resultPanel);

    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    renderProjectMeta(footer, 'project-meta');
    renderAttribution(footer, database, 'credit-line');
    container.append(footer);
  };

  rerender();
}
