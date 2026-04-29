import { calculateRecommendation, type HuntSelection } from '../domain/calculateRecommendation';
import { ELEMENT_LABELS } from '../domain/elements';
import type { Monster, MonsterDatabase, PlayerVocation } from '../domain/types';

const WEIGHT_PRESETS = [
  { label: 'Low', value: 25 },
  { label: 'Normal', value: 50 },
  { label: 'High', value: 75 }
] as const;
const DEFAULT_WEIGHT = 50;
const FALLBACK_SOURCE_URL = 'https://tibia.fandom.com/wiki/Main_Page';
const WIKI_FILE_PATH_URL = 'https://tibia.fandom.com/wiki/Special:FilePath/';
const REPOSITORY_URL = 'https://github.com/pecoits/tibia-hunt-preparation';
const LICENSE_LABEL = 'CC BY-NC 4.0 International';
const SHARE_PARAM = 'hunt';
const ADMIN_UNLOCK_PHRASE = 'UPDATE';
const UPDATE_WORKFLOW_ENDPOINT =
  'https://api.github.com/repos/pecoits/tibia-hunt-preparation/actions/workflows/update-monsters.yml/dispatches';
const DEFAULT_VOCATION: PlayerVocation = 'any';
const DEFAULT_LEVEL = 200;
const VOCATION_OPTIONS: Array<{ value: PlayerVocation; label: string }> = [
  { value: 'any', label: 'Any vocation' },
  { value: 'knight', label: 'Knight' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'druid', label: 'Druid' },
  { value: 'sorcerer', label: 'Sorcerer' }
];

interface SelectedMonster {
  monster: Monster;
  weight: number;
}

interface SharedHuntPayload {
  v: 1 | 2;
  a: 0 | 1;
  s: Array<[string, number]>;
  c?: PlayerVocation;
  l?: number;
}

interface BatchImportReport {
  total: number;
  matched: number;
  added: number;
  duplicates: string[];
  missing: string[];
}

function appendText(parent: HTMLElement, tagName: keyof HTMLElementTagNameMap, text: string, className?: string): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2000, Math.max(1, Math.floor(value)));
}

function isPlayerVocation(value: string): value is PlayerVocation {
  return VOCATION_OPTIONS.some((option) => option.value === value);
}

function formatScore(score: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(score);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDataVersion(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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

function findMonsterByToken(database: MonsterDatabase, token: string, includeAdvanced: boolean): Monster | undefined {
  const normalized = token.trim().toLocaleLowerCase();
  if (!normalized) return undefined;

  for (const monster of database.monsters) {
    if (!shouldShowInAutocomplete(monster, includeAdvanced)) continue;
    if (monster.name.toLocaleLowerCase() === normalized || monster.id.toLocaleLowerCase() === normalized) {
      return monster;
    }
    if (monster.aliases.some((alias) => alias.toLocaleLowerCase() === normalized)) {
      return monster;
    }
  }
  return undefined;
}

function parseBatchTokens(text: string): string[] {
  return text
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
  const candidates = [];
  if (monster.spriteUrl) {
    candidates.push(monster.spriteUrl);
  }
  try {
    const source = new URL(monster.sourceUrl);
    if (source.hostname !== 'tibia.fandom.com') return candidates;
    const title = decodeURIComponent(source.pathname.replace('/wiki/', '').trim());
    if (!title || title.includes('/')) return candidates;
    const normalizedTitle = title.replaceAll(' ', '_');
    candidates.push(`${WIKI_FILE_PATH_URL}${encodeURIComponent(`${normalizedTitle}.gif`)}`);
    return candidates;
  } catch {
    return candidates;
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

function serializeHuntState(
  selected: SelectedMonster[],
  includeAdvanced: boolean,
  vocation: PlayerVocation,
  level: number
): string | null {
  const normalizedLevel = clampLevel(level);
  if (selected.length === 0 && !includeAdvanced && vocation === DEFAULT_VOCATION && normalizedLevel === DEFAULT_LEVEL) return null;
  const payload: SharedHuntPayload = {
    v: 2,
    a: includeAdvanced ? 1 : 0,
    s: selected.map((item) => [item.monster.id, clampWeight(item.weight)]),
    c: vocation,
    l: normalizedLevel
  };
  return JSON.stringify(payload);
}

function parseHuntState(
  database: MonsterDatabase,
  raw: string | null
): { selected: SelectedMonster[]; includeAdvanced: boolean; vocation: PlayerVocation; level: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SharedHuntPayload;
    if ((parsed.v !== 1 && parsed.v !== 2) || !Array.isArray(parsed.s)) return null;

    const selected: SelectedMonster[] = [];
    const seen = new Set<string>();
    for (const entry of parsed.s) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [monsterId, weight] = entry;
      if (typeof monsterId !== 'string' || seen.has(monsterId)) continue;
      const monster = database.monsters.find((candidate) => candidate.id === monsterId);
      if (!monster) continue;
      selected.push({ monster, weight: clampWeight(Number(weight)) });
      seen.add(monsterId);
    }

    return {
      selected,
      includeAdvanced: parsed.a === 1,
      vocation: isPlayerVocation(parsed.c ?? '') ? (parsed.c as PlayerVocation) : DEFAULT_VOCATION,
      level: clampLevel(Number(parsed.l ?? DEFAULT_LEVEL))
    };
  } catch {
    return null;
  }
}

function getHuntUrl(selected: SelectedMonster[], includeAdvanced: boolean, vocation: PlayerVocation, level: number): string {
  const url = new URL(window.location.href);
  const serialized = serializeHuntState(selected, includeAdvanced, vocation, level);
  if (serialized) {
    url.searchParams.set(SHARE_PARAM, serialized);
  } else {
    url.searchParams.delete(SHARE_PARAM);
  }
  return url.toString();
}

function persistHuntUrl(selected: SelectedMonster[], includeAdvanced: boolean, vocation: PlayerVocation, level: number): void {
  try {
    const url = getHuntUrl(selected, includeAdvanced, vocation, level);
    window.history.replaceState(null, '', url);
  } catch {
    // Ignore environments without writable location/history.
  }
}

export function renderApp(root: HTMLElement, database: MonsterDatabase): void {
  const urlState = parseHuntState(database, new URL(window.location.href).searchParams.get(SHARE_PARAM));
  const selected: SelectedMonster[] = urlState?.selected ?? [];
  let includeAdvanced = urlState?.includeAdvanced ?? false;
  let vocation: PlayerVocation = urlState?.vocation ?? DEFAULT_VOCATION;
  let level = clampLevel(urlState?.level ?? DEFAULT_LEVEL);
  let draftQuery = '';
  let shareFeedback = '';
  let batchInput = '';
  let batchReport: BatchImportReport | null = null;
  let adminToken = '';
  let adminUnlock = '';
  let adminStatus = '';
  let adminBusy = false;
  let adminPanelOpen = false;

  const container = root.tagName.toLocaleLowerCase() === 'main' ? root : document.createElement('main');
  container.className = 'app-shell';
  if (container !== root) {
    root.replaceChildren(container);
  }

  const rerender = (): void => {
    persistHuntUrl(selected, includeAdvanced, vocation, level);
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
        selected.push({ monster, weight: DEFAULT_WEIGHT });
      }
      draftQuery = '';
      shareFeedback = '';
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

    const sharingRow = document.createElement('div');
    sharingRow.className = 'sharing-row';
    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.className = 'secondary-button';
    shareButton.textContent = 'Copy hunt link';
    shareButton.addEventListener('click', async () => {
      const url = getHuntUrl(selected, includeAdvanced, vocation, level);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          shareFeedback = 'Link copied.';
        } else {
          shareFeedback = url;
        }
      } catch {
        shareFeedback = url;
      }
      rerender();
    });
    sharingRow.append(shareButton);
    if (shareFeedback) {
      appendText(sharingRow, 'p', shareFeedback, 'share-feedback');
    }
    builder.append(sharingRow);

    const batchSection = document.createElement('section');
    batchSection.className = 'batch-import';
    appendText(batchSection, 'h3', 'Bulk import', 'section-heading');
    appendText(batchSection, 'p', 'Paste monster names or IDs separated by commas or new lines.', 'score-note');

    const batchInputLabel = document.createElement('label');
    batchInputLabel.className = 'field-label';
    batchInputLabel.textContent = 'Monster list';
    const batchTextarea = document.createElement('textarea');
    batchTextarea.name = 'batch-import';
    batchTextarea.placeholder = 'Dragon Lord, Ice Golem\nJuggernaut';
    batchTextarea.value = batchInput;
    batchTextarea.rows = 4;
    batchTextarea.addEventListener('input', () => {
      batchInput = batchTextarea.value;
    });
    batchInputLabel.append(batchTextarea);
    batchSection.append(batchInputLabel);

    const batchButton = document.createElement('button');
    batchButton.type = 'button';
    batchButton.className = 'secondary-button';
    batchButton.dataset.action = 'import-monsters';
    batchButton.textContent = 'Import list';
    batchButton.addEventListener('click', () => {
      const tokens = parseBatchTokens(batchInput);
      const duplicates: string[] = [];
      const missing: string[] = [];
      let matched = 0;
      let added = 0;

      for (const token of tokens) {
        const monster = findMonsterByToken(database, token, includeAdvanced);
        if (!monster) {
          missing.push(token);
          continue;
        }
        matched += 1;
        if (selected.some((entry) => entry.monster.id === monster.id)) {
          duplicates.push(token);
          continue;
        }
        selected.push({ monster, weight: DEFAULT_WEIGHT });
        added += 1;
      }

      batchReport = {
        total: tokens.length,
        matched,
        added,
        duplicates,
        missing
      };
      shareFeedback = '';
      rerender();
    });
    batchSection.append(batchButton);

    if (batchReport) {
      appendText(
        batchSection,
        'p',
        `Processed ${batchReport.total}. Matched ${batchReport.matched}, added ${batchReport.added}, duplicates ${batchReport.duplicates.length}, missing ${batchReport.missing.length}.`,
        'score-note'
      );
      if (batchReport.missing.length > 0) {
        appendText(batchSection, 'p', `Missing: ${batchReport.missing.join(', ')}.`, 'warning-inline');
      }
    }

    builder.append(batchSection);

    const playerRules = document.createElement('div');
    playerRules.className = 'player-rules';
    appendText(playerRules, 'h3', 'Vocation and level', 'section-heading');

    const playerFields = document.createElement('div');
    playerFields.className = 'player-rules-fields';

    const vocationLabel = document.createElement('label');
    vocationLabel.className = 'field-label';
    vocationLabel.textContent = 'Vocation';
    const vocationSelect = document.createElement('select');
    vocationSelect.name = 'player-vocation';
    for (const option of VOCATION_OPTIONS) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      node.selected = option.value === vocation;
      vocationSelect.append(node);
    }
    vocationSelect.addEventListener('change', () => {
      vocation = isPlayerVocation(vocationSelect.value) ? vocationSelect.value : DEFAULT_VOCATION;
      shareFeedback = '';
      rerender();
    });
    vocationLabel.append(vocationSelect);

    const levelLabel = document.createElement('label');
    levelLabel.className = 'field-label';
    levelLabel.textContent = 'Level';
    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.name = 'player-level';
    levelInput.min = '1';
    levelInput.max = '2000';
    levelInput.step = '1';
    levelInput.value = String(level);
    levelInput.addEventListener('change', () => {
      level = clampLevel(Number(levelInput.value));
      shareFeedback = '';
      rerender();
    });
    levelLabel.append(levelInput);

    playerFields.append(vocationLabel, levelLabel);
    playerRules.append(playerFields);
    builder.append(playerRules);

    const adminPanel = document.createElement('details');
    adminPanel.className = 'admin-panel';
    if (adminPanelOpen) {
      adminPanel.setAttribute('open', 'open');
    }
    adminPanel.addEventListener('toggle', () => {
      adminPanelOpen = adminPanel.open;
    });
    const adminSummary = document.createElement('summary');
    adminSummary.textContent = 'Admin tools';
    adminPanel.append(adminSummary);
    appendText(
      adminPanel,
      'p',
      'Requires a GitHub token with actions:write for this repository. Use only for controlled data refresh.',
      'admin-note'
    );

    const tokenLabel = document.createElement('label');
    tokenLabel.className = 'field-label';
    tokenLabel.textContent = 'GitHub token';
    const tokenInput = document.createElement('input');
    tokenInput.type = 'password';
    tokenInput.name = 'admin-token';
    tokenInput.autocomplete = 'off';
    tokenInput.placeholder = 'ghp_xxx...';
    tokenInput.value = adminToken;
    tokenInput.addEventListener('input', () => {
      adminToken = tokenInput.value;
      adminPanelOpen = true;
      const caret = tokenInput.selectionStart ?? adminToken.length;
      rerender();
      const refreshed = container.querySelector<HTMLInputElement>('input[name="admin-token"]');
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(caret, caret);
      }
    });
    tokenLabel.append(tokenInput);
    adminPanel.append(tokenLabel);

    const unlockLabel = document.createElement('label');
    unlockLabel.className = 'field-label';
    unlockLabel.textContent = 'Type UPDATE to enable';
    const unlockInput = document.createElement('input');
    unlockInput.type = 'text';
    unlockInput.name = 'admin-unlock';
    unlockInput.autocomplete = 'off';
    unlockInput.placeholder = ADMIN_UNLOCK_PHRASE;
    unlockInput.value = adminUnlock;
    unlockInput.addEventListener('input', () => {
      adminUnlock = unlockInput.value;
      adminPanelOpen = true;
      const caret = unlockInput.selectionStart ?? adminUnlock.length;
      rerender();
      const refreshed = container.querySelector<HTMLInputElement>('input[name="admin-unlock"]');
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(caret, caret);
      }
    });
    unlockLabel.append(unlockInput);
    adminPanel.append(unlockLabel);

    const adminActionButton = document.createElement('button');
    adminActionButton.type = 'button';
    adminActionButton.className = 'secondary-button';
    adminActionButton.textContent = adminBusy ? 'Updating...' : 'Run monster data update';
    adminActionButton.disabled = adminBusy || adminToken.trim().length < 20 || adminUnlock.trim() !== ADMIN_UNLOCK_PHRASE;
    adminActionButton.addEventListener('click', async () => {
      adminBusy = true;
      adminStatus = '';
      rerender();
      try {
        const response = await fetch(UPDATE_WORKFLOW_ENDPOINT, {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${adminToken.trim()}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ref: 'main' })
        });

        if (response.status === 204 || response.status === 200) {
          adminStatus = 'Workflow dispatched successfully.';
          adminUnlock = '';
        } else {
          const responseText = await response.text();
          adminStatus = `Dispatch failed (${response.status}): ${responseText || response.statusText}`;
        }
      } catch (error) {
        adminStatus = `Dispatch failed: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        adminBusy = false;
        rerender();
      }
    });
    adminPanel.append(adminActionButton);
    if (adminStatus) {
      appendText(adminPanel, 'p', adminStatus, 'admin-status');
    }
    builder.append(adminPanel);

    const advancedLabel = document.createElement('label');
    advancedLabel.className = 'toggle-row';
    const advancedInput = document.createElement('input');
    advancedInput.type = 'checkbox';
    advancedInput.checked = includeAdvanced;
    advancedInput.addEventListener('change', () => {
      includeAdvanced = advancedInput.checked;
      shareFeedback = '';
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

        const weightControl = document.createElement('div');
        weightControl.className = 'importance-control';

        const weightLabel = document.createElement('label');
        weightLabel.className = 'weight-label';
        weightLabel.textContent = 'Weight';
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.max = '100';
        weightInput.step = '1';
        weightInput.className = 'weight-input';
        weightInput.value = String(clampWeight(selection.weight));
        weightInput.addEventListener('change', () => {
          selection.weight = clampWeight(Number(weightInput.value));
          rerender();
        });
        weightLabel.append(weightInput);

        const presetRow = document.createElement('div');
        presetRow.className = 'weight-preset-row';
        for (const preset of WEIGHT_PRESETS) {
          const presetButton = document.createElement('button');
          presetButton.type = 'button';
          presetButton.className = 'weight-preset';
          presetButton.textContent = preset.label;
          presetButton.disabled = clampWeight(selection.weight) === preset.value;
          presetButton.addEventListener('click', () => {
            selection.weight = preset.value;
            rerender();
          });
          presetRow.append(presetButton);
        }

        const weightValue = document.createElement('p');
        weightValue.className = 'importance-value';
        weightValue.textContent = `Weight: ${clampWeight(selection.weight)}`;

        weightControl.append(weightLabel, presetRow, weightValue);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'secondary-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          const index = selected.findIndex((item) => item.monster.id === selection.monster.id);
          if (index >= 0) selected.splice(index, 1);
          shareFeedback = '';
          rerender();
        });

        actions.append(weightControl, removeButton);
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

    const recommendation = calculateRecommendation(selected as HuntSelection[], {
      player: { vocation, level }
    });
    if (!recommendation.recommended) {
      appendText(resultPanel, 'p', 'Add at least one complete monster to calculate a recommendation.', 'empty-state');
    } else {
      const recommendedLabel = ELEMENT_LABELS[recommendation.recommended.element];
      const totalContribution = recommendation.contributions.reduce((sum, item) => sum + item.contribution, 0);
      const primaryAlternative = recommendation.topAlternatives.find(
        (item) => item.element !== recommendation.recommended?.element
      );
      const activeVocationLabel =
        VOCATION_OPTIONS.find((option) => option.value === vocation)?.label ?? VOCATION_OPTIONS[0].label;
      const topRaw = recommendation.ranking[0];
      const topRawEligibility = recommendation.eligibility.find((item) => item.element === topRaw.element);
      appendText(resultPanel, 'p', 'Recommended', 'eyebrow');
      appendText(resultPanel, 'h3', recommendedLabel, 'recommended-element');
      appendText(resultPanel, 'p', `Top raw score: ${formatScore(recommendation.recommended.score)}`, 'score-note');
      appendText(resultPanel, 'p', `Profile: ${activeVocationLabel}, level ${level}.`, 'score-note');
      if (topRaw.element !== recommendation.recommended.element && topRawEligibility && !topRawEligibility.eligible) {
        appendText(
          resultPanel,
          'p',
          `${ELEMENT_LABELS[topRaw.element]} has the best raw score but is not eligible for this profile (${topRawEligibility.reason ?? 'restricted'}).`,
          'score-note'
        );
      }

      appendText(resultPanel, 'h3', 'Why this element?', 'section-heading');
      const explanation = document.createElement('div');
      explanation.className = 'explanation-block';
      if (primaryAlternative) {
        appendText(
          explanation,
          'p',
          `${recommendedLabel} leads ${ELEMENT_LABELS[primaryAlternative.element]} by ${formatScore(primaryAlternative.deltaFromRecommended)} score points.`
        );
      } else {
        appendText(explanation, 'p', `${recommendedLabel} is currently the only ranked recommendation with valid hunt data.`);
      }
      appendText(explanation, 'p', 'Impact formula used per monster: Hitpoints × (Weight / 50) × Element Modifier.');
      resultPanel.append(explanation);

      appendText(resultPanel, 'h3', 'Top 3 elements', 'section-heading');
      const topList = document.createElement('ol');
      topList.className = 'ranking-list';
      for (const item of recommendation.topAlternatives) {
        const topItem = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = ELEMENT_LABELS[item.element];
        const score = document.createElement('strong');
        const deltaText =
          item.deltaFromRecommended === 0
            ? 'baseline'
            : `${formatScore(item.deltaFromRecommended)} behind`;
        score.textContent = `${formatScore(item.score)} (${deltaText})`;
        topItem.append(label, score);
        topList.append(topItem);
      }
      resultPanel.append(topList);

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
        const weightFactor = contribution.selectedWeight / 50;
        const contributionShare = totalContribution > 0 ? (contribution.contribution / totalContribution) * 100 : 0;
        item.append(
          link,
          document.createTextNode(
            `: ${contribution.recommendedModifier}% ${contribution.summary}, weight ${contribution.selectedWeight} (x${weightFactor.toFixed(2)}), contribution ${formatScore(contribution.contribution)} (${formatPercent(contributionShare)} of recommended score).`
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
    appendText(footer, 'p', `Data version: ${formatDataVersion(database.generatedAt)}`, 'project-meta');
    renderAttribution(footer, database, 'credit-line');
    container.append(footer);
  };

  rerender();
}
