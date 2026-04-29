import { calculateRecommendation, type HuntSelection } from '../domain/calculateRecommendation';
import { ELEMENT_LABELS } from '../domain/elements';
import type { Monster, MonsterDatabase, PlayerVocation } from '../domain/types';

type AppLanguage = 'pt' | 'en' | 'pl';

const WEIGHT_PRESET_VALUES = [25, 50, 75] as const;
const DEFAULT_WEIGHT = 50;
const FALLBACK_SOURCE_URL = 'https://tibia.fandom.com/wiki/Main_Page';
const WIKI_FILE_PATH_URL = 'https://tibia.fandom.com/wiki/Special:FilePath/';
const REPOSITORY_URL = 'https://github.com/pecoits/tibia-hunt-preparation';
const LICENSE_LABEL = 'CC BY-NC 4.0 International';
const SHARE_PARAM = 'hunt';
const ADMIN_UNLOCK_PHRASE = 'UPDATE';
const UPDATE_WORKFLOW_ENDPOINT =
  'https://api.github.com/repos/pecoits/tibia-hunt-preparation/actions/workflows/update-monsters.yml/dispatches';
const TUTORIAL_STORAGE_KEY = 'hunt-element-planner-tutorial-v1';
const LANGUAGE_STORAGE_KEY = 'hunt-element-planner-language-v1';
const DEFAULT_VOCATION: PlayerVocation = 'any';
const DEFAULT_LEVEL = 200;
const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' }
];

interface SelectedMonster {
  monster: Monster;
  weight: number;
}

interface SharedHuntPayload {
  v: 1 | 2 | 3;
  a: 0 | 1;
  s: Array<[string, number]>;
  c?: PlayerVocation;
  l?: number;
  g?: AppLanguage;
}

interface BatchImportReport {
  total: number;
  matched: number;
  added: number;
  duplicates: string[];
  missing: string[];
}

interface TutorialStep {
  title: string;
  body: string;
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
  return ['any', 'knight', 'paladin', 'druid', 'sorcerer'].includes(value);
}

function getLocale(language: AppLanguage): string {
  if (language === 'pt') return 'pt-BR';
  if (language === 'pl') return 'pl-PL';
  return 'en-US';
}

function formatScore(score: number, language: AppLanguage): string {
  return new Intl.NumberFormat(getLocale(language), { maximumFractionDigits: 0 }).format(score);
}

function formatPercent(value: number, language: AppLanguage): string {
  return `${new Intl.NumberFormat(getLocale(language), { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDataVersion(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(getLocale(language), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const I18N = {
  pt: {
    appTitle: 'Hunt Element Planner',
    appSubtitle: 'Planeje sua hunt com peso por monstro e ranking elemental.',
    howToUse: 'Como usar',
    language: 'Idioma',
    stepLabel: 'Passo {current} de {total}',
    skip: 'Pular',
    back: 'Voltar',
    next: 'Próximo',
    finishTutorial: 'Concluir tutorial',
    huntBuilder: 'Montar hunt',
    monster: 'Monstro',
    typeMonsterName: 'Digite o nome do monstro',
    add: 'Adicionar',
    copyHuntLink: 'Copiar link da hunt',
    linkCopied: 'Link copiado.',
    bulkImport: 'Importação em lote',
    bulkImportHint: 'Cole nomes ou IDs de monstros separados por vírgula ou quebra de linha.',
    monsterList: 'Lista de monstros',
    importList: 'Importar lista',
    processedReport: 'Processados {total}. Encontrados {matched}, adicionados {added}, duplicados {duplicates}, não encontrados {missing}.',
    missingLabel: 'Não encontrados: {items}.',
    vocationAndLevel: 'Vocação e nível',
    vocation: 'Vocação',
    level: 'Nível',
    anyVocation: 'Qualquer vocação',
    adminTools: 'Ferramentas de admin',
    adminNote: 'Requer token GitHub com actions:write para este repositório. Use apenas para atualização controlada da base.',
    githubToken: 'Token GitHub',
    typeUpdateToEnable: 'Digite UPDATE para habilitar',
    updating: 'Atualizando...',
    runMonsterDataUpdate: 'Executar atualização da base',
    workflowDispatched: 'Workflow disparado com sucesso.',
    dispatchFailed: 'Falha no disparo',
    includeAdvanced: 'Incluir criaturas especiais e incompletas',
    noMonstersSelected: 'Nenhum monstro selecionado.',
    special: 'Especial',
    incomplete: 'Incompleto',
    notHuntRelevant: 'Fora de hunt',
    standardHuntCreature: 'Criatura padrão de hunt',
    weight: 'Peso',
    weightLow: 'Baixo',
    weightNormal: 'Normal',
    weightHigh: 'Alto',
    remove: 'Remover',
    results: 'Resultados',
    addOneCompleteMonster: 'Adicione ao menos um monstro completo para calcular a recomendação.',
    recommended: 'Recomendado',
    topRawScore: 'Melhor score bruto: {score}',
    profile: 'Perfil: {vocation}, nível {level}.',
    ineligibleTopRaw: '{element} tem o melhor score bruto, mas não é elegível para este perfil ({reason}).',
    whyThisElement: 'Por que este elemento?',
    leadsBy: '{recommended} está à frente de {alternative} por {delta} pontos.',
    onlyRankedRecommendation: '{recommended} é atualmente a única recomendação ranqueada com dados válidos.',
    impactFormula: 'Fórmula por monstro: Hitpoints × (Peso / 50) × Modificador Elemental.',
    top3Elements: 'Top 3 elementos',
    baseline: 'base',
    behind: '{delta} atrás',
    fullRanking: 'Ranking completo',
    monsterSummary: 'Resumo por monstro',
    contributionLine:
      '{modifier}% {summary}, peso {weight} (x{factor}), contribuição {contribution} ({share} do score recomendado).',
    excludedMonsters: 'Monstros excluídos',
    dataVersion: 'Versão da base: {version}',
    dataPrefix: 'Dados: ',
    developedBy: 'Desenvolvido por Pecoits sob',
    missingHitpoints: 'HP ausente.',
    missingModifier: 'Modificador {element} ausente.',
    incompleteData: 'Dados incompletos do monstro.',
    favors: 'favorece',
    neutral: 'neutro',
    resists: 'resiste',
    requiresVocation: 'requer vocação',
    requiresLevel: 'requer nível',
    tutorialTip: 'Dica: regras atuais {vocation}, nível {level}. Elementos não elegíveis ficam no ranking, mas nunca são recomendados.'
  },
  en: {
    appTitle: 'Hunt Element Planner',
    appSubtitle: 'Plan your hunt loadout with weighted monster importance and elemental ranking.',
    howToUse: 'How to use',
    language: 'Language',
    stepLabel: 'Step {current} of {total}',
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    finishTutorial: 'Finish tutorial',
    huntBuilder: 'Hunt builder',
    monster: 'Monster',
    typeMonsterName: 'Type a monster name',
    add: 'Add',
    copyHuntLink: 'Copy hunt link',
    linkCopied: 'Link copied.',
    bulkImport: 'Bulk import',
    bulkImportHint: 'Paste monster names or IDs separated by commas or new lines.',
    monsterList: 'Monster list',
    importList: 'Import list',
    processedReport: 'Processed {total}. Matched {matched}, added {added}, duplicates {duplicates}, missing {missing}.',
    missingLabel: 'Missing: {items}.',
    vocationAndLevel: 'Vocation and level',
    vocation: 'Vocation',
    level: 'Level',
    anyVocation: 'Any vocation',
    adminTools: 'Admin tools',
    adminNote: 'Requires a GitHub token with actions:write for this repository. Use only for controlled data refresh.',
    githubToken: 'GitHub token',
    typeUpdateToEnable: 'Type UPDATE to enable',
    updating: 'Updating...',
    runMonsterDataUpdate: 'Run monster data update',
    workflowDispatched: 'Workflow dispatched successfully.',
    dispatchFailed: 'Dispatch failed',
    includeAdvanced: 'Include special and incomplete creatures',
    noMonstersSelected: 'No monsters selected yet.',
    special: 'Special',
    incomplete: 'Incomplete',
    notHuntRelevant: 'Not hunt relevant',
    standardHuntCreature: 'Standard hunt creature',
    weight: 'Weight',
    weightLow: 'Low',
    weightNormal: 'Normal',
    weightHigh: 'High',
    remove: 'Remove',
    results: 'Results',
    addOneCompleteMonster: 'Add at least one complete monster to calculate a recommendation.',
    recommended: 'Recommended',
    topRawScore: 'Top raw score: {score}',
    profile: 'Profile: {vocation}, level {level}.',
    ineligibleTopRaw: '{element} has the best raw score but is not eligible for this profile ({reason}).',
    whyThisElement: 'Why this element?',
    leadsBy: '{recommended} leads {alternative} by {delta} score points.',
    onlyRankedRecommendation: '{recommended} is currently the only ranked recommendation with valid hunt data.',
    impactFormula: 'Impact formula used per monster: Hitpoints × (Weight / 50) × Element Modifier.',
    top3Elements: 'Top 3 elements',
    baseline: 'baseline',
    behind: '{delta} behind',
    fullRanking: 'Full ranking',
    monsterSummary: 'Monster summary',
    contributionLine:
      '{modifier}% {summary}, weight {weight} (x{factor}), contribution {contribution} ({share} of recommended score).',
    excludedMonsters: 'Excluded monsters',
    dataVersion: 'Data version: {version}',
    dataPrefix: 'Data: ',
    developedBy: 'Developed by Pecoits under',
    missingHitpoints: 'Missing hitpoints.',
    missingModifier: 'Missing {element} modifier.',
    incompleteData: 'Incomplete monster data.',
    favors: 'favors',
    neutral: 'neutral',
    resists: 'resists',
    requiresVocation: 'requires vocation',
    requiresLevel: 'requires level',
    tutorialTip:
      'Tip: your current rules are {vocation}, level {level}. Ineligible elements stay in ranking but are never recommended.'
  },
  pl: {
    appTitle: 'Hunt Element Planner',
    appSubtitle: 'Planuj hunta z wagą potworów i rankingiem żywiołów.',
    howToUse: 'Jak używać',
    language: 'Język',
    stepLabel: 'Krok {current} z {total}',
    skip: 'Pomiń',
    back: 'Wstecz',
    next: 'Dalej',
    finishTutorial: 'Zakończ tutorial',
    huntBuilder: 'Budowa hunta',
    monster: 'Potwór',
    typeMonsterName: 'Wpisz nazwę potwora',
    add: 'Dodaj',
    copyHuntLink: 'Kopiuj link hunta',
    linkCopied: 'Link skopiowany.',
    bulkImport: 'Import zbiorczy',
    bulkImportHint: 'Wklej nazwy lub ID potworów oddzielone przecinkami lub nowymi liniami.',
    monsterList: 'Lista potworów',
    importList: 'Importuj listę',
    processedReport: 'Przetworzono {total}. Dopasowano {matched}, dodano {added}, duplikaty {duplicates}, brak {missing}.',
    missingLabel: 'Brak: {items}.',
    vocationAndLevel: 'Profesja i poziom',
    vocation: 'Profesja',
    level: 'Poziom',
    anyVocation: 'Dowolna profesja',
    adminTools: 'Narzędzia admina',
    adminNote: 'Wymaga tokenu GitHub z actions:write dla tego repozytorium. Używaj tylko do kontrolowanej aktualizacji danych.',
    githubToken: 'Token GitHub',
    typeUpdateToEnable: 'Wpisz UPDATE aby włączyć',
    updating: 'Aktualizacja...',
    runMonsterDataUpdate: 'Uruchom aktualizację bazy',
    workflowDispatched: 'Workflow uruchomiony poprawnie.',
    dispatchFailed: 'Błąd uruchomienia',
    includeAdvanced: 'Uwzględnij specjalne i niekompletne stwory',
    noMonstersSelected: 'Nie wybrano jeszcze potworów.',
    special: 'Specjalny',
    incomplete: 'Niekompletny',
    notHuntRelevant: 'Poza huntem',
    standardHuntCreature: 'Standardowy potwór hunta',
    weight: 'Waga',
    weightLow: 'Niska',
    weightNormal: 'Normalna',
    weightHigh: 'Wysoka',
    remove: 'Usuń',
    results: 'Wyniki',
    addOneCompleteMonster: 'Dodaj przynajmniej jednego kompletnego potwora, aby obliczyć rekomendację.',
    recommended: 'Rekomendowane',
    topRawScore: 'Najlepszy surowy wynik: {score}',
    profile: 'Profil: {vocation}, poziom {level}.',
    ineligibleTopRaw: '{element} ma najlepszy surowy wynik, ale nie jest dostępny dla tego profilu ({reason}).',
    whyThisElement: 'Dlaczego ten żywioł?',
    leadsBy: '{recommended} wyprzedza {alternative} o {delta} punktów.',
    onlyRankedRecommendation: '{recommended} to obecnie jedyna sklasyfikowana rekomendacja z prawidłowymi danymi.',
    impactFormula: 'Wzór wpływu na potwora: Hitpoints × (Waga / 50) × Modyfikator żywiołu.',
    top3Elements: 'Top 3 żywioły',
    baseline: 'bazowy',
    behind: '{delta} mniej',
    fullRanking: 'Pełny ranking',
    monsterSummary: 'Podsumowanie potworów',
    contributionLine:
      '{modifier}% {summary}, waga {weight} (x{factor}), wkład {contribution} ({share} zalecanego wyniku).',
    excludedMonsters: 'Wykluczone potwory',
    dataVersion: 'Wersja danych: {version}',
    dataPrefix: 'Dane: ',
    developedBy: 'Stworzone przez Pecoits na licencji',
    missingHitpoints: 'Brak punktów życia.',
    missingModifier: 'Brak modyfikatora {element}.',
    incompleteData: 'Niekompletne dane potwora.',
    favors: 'korzystny',
    neutral: 'neutralny',
    resists: 'odporny',
    requiresVocation: 'wymaga profesji',
    requiresLevel: 'wymaga poziomu',
    tutorialTip:
      'Wskazówka: aktualne reguły to {vocation}, poziom {level}. Niedozwolone żywioły pozostają w rankingu, ale nie są rekomendowane.'
  }
} as const;

type I18nKey = keyof (typeof I18N)['en'];

function applyTemplate(template: string, params: Record<string, string | number> = {}): string {
  let text = template;
  for (const [key, value] of Object.entries(params)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}

function t(language: AppLanguage, key: I18nKey, params?: Record<string, string | number>): string {
  return applyTemplate(I18N[language][key], params);
}

function isAppLanguage(value: string): value is AppLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}

function getBrowserLanguage(): AppLanguage {
  const locale = navigator.language.toLowerCase();
  if (locale.startsWith('pt')) return 'pt';
  if (locale.startsWith('pl')) return 'pl';
  return 'en';
}

function readLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
    if (isAppLanguage(saved)) return saved;
  } catch {
    // Ignore storage read errors.
  }
  return getBrowserLanguage();
}

function persistLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage write errors.
  }
}

function getVocationOptions(language: AppLanguage): Array<{ value: PlayerVocation; label: string }> {
  return [
    { value: 'any', label: t(language, 'anyVocation') },
    { value: 'knight', label: 'Knight' },
    { value: 'paladin', label: 'Paladin' },
    { value: 'druid', label: 'Druid' },
    { value: 'sorcerer', label: 'Sorcerer' }
  ];
}

function getWeightPresetLabel(language: AppLanguage, value: number): string {
  if (value === 25) return t(language, 'weightLow');
  if (value === 75) return t(language, 'weightHigh');
  return t(language, 'weightNormal');
}

function getElementLabel(element: keyof typeof ELEMENT_LABELS, language: AppLanguage): string {
  if (language === 'en') return ELEMENT_LABELS[element];
  const labels = {
    pt: {
      physical: 'Físico',
      earth: 'Terra',
      fire: 'Fogo',
      energy: 'Energia',
      ice: 'Gelo',
      holy: 'Sagrado',
      death: 'Morte'
    },
    pl: {
      physical: 'Fizyczny',
      earth: 'Ziemia',
      fire: 'Ogień',
      energy: 'Energia',
      ice: 'Lód',
      holy: 'Święty',
      death: 'Śmierć'
    }
  } as const;
  return labels[language][element];
}

function readTutorialCompleted(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

function persistTutorialCompleted(): void {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
  } catch {
    // Ignore storage errors.
  }
}

function getTutorialSteps(language: AppLanguage): TutorialStep[] {
  if (language === 'pt') {
    return [
      {
        title: 'Adicione monstros',
        body: 'Digite o nome de um monstro e adicione na lista da hunt. Você também pode importar vários nomes em Importação em lote.'
      },
      {
        title: 'Defina o peso',
        body: 'Ajuste o peso de cada monstro (0-100) para representar frequência ou importância na rota.'
      },
      {
        title: 'Leia a recomendação',
        body: 'Use o elemento recomendado, o top 3 e a contribuição por monstro para justificar a escolha.'
      },
      {
        title: 'Compartilhe a configuração',
        body: 'Use Copiar link da hunt para compartilhar composição, pesos e regras de vocação/nível.'
      }
    ];
  }
  if (language === 'pl') {
    return [
      {
        title: 'Dodaj potwory',
        body: 'Wpisz nazwę potwora i dodaj go do listy hunta. Możesz też zaimportować wiele nazw przez Import zbiorczy.'
      },
      {
        title: 'Ustaw wagę',
        body: 'Dostosuj wagę każdego potwora (0-100), aby odzwierciedlić częstotliwość lub znaczenie.'
      },
      {
        title: 'Odczytaj rekomendację',
        body: 'Użyj rekomendowanego żywiołu, top 3 i wkładu potworów do uzasadnienia wyboru.'
      },
      {
        title: 'Udostępnij konfigurację',
        body: 'Użyj Kopiuj link hunta, aby udostępnić skład, wagi i zasady profesji/poziomu.'
      }
    ];
  }
  return [
    {
      title: 'Add monsters',
      body: 'Type a monster name and add it to your hunt list. You can also import multiple names with Bulk import.'
    },
    {
      title: 'Set monster weight',
      body: 'Adjust each monster weight (0-100) to represent frequency or importance in your route.'
    },
    {
      title: 'Read recommendation',
      body: 'Use the recommended element, top 3, and monster contribution breakdown to justify your damage choice.'
    },
    {
      title: 'Share your setup',
      body: 'Use Copy hunt link to share the exact hunt composition, including weights and vocation/level rules.'
    }
  ];
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

function localizeContributionSummary(summary: 'favors' | 'neutral' | 'resists', language: AppLanguage): string {
  if (summary === 'favors') return t(language, 'favors');
  if (summary === 'resists') return t(language, 'resists');
  return t(language, 'neutral');
}

function localizeExclusionReason(reason: string, language: AppLanguage): string {
  if (reason === 'Missing hitpoints.') return t(language, 'missingHitpoints');
  if (reason === 'Incomplete monster data.') return t(language, 'incompleteData');

  const missingModifierMatch = reason.match(/^Missing ([a-z]+) modifier\.$/i);
  if (missingModifierMatch) {
    const element = missingModifierMatch[1].toLowerCase();
    return t(language, 'missingModifier', { element: getElementLabel(element as keyof typeof ELEMENT_LABELS, language) });
  }
  return reason;
}

function localizeEligibilityReason(reason: string | null, language: AppLanguage): string {
  if (!reason) return '-';
  const lower = reason.toLowerCase();
  if (lower.startsWith('requires ') && lower.endsWith(' vocation.')) {
    const profession = reason.replace(/^Requires /, '').replace(/ vocation\.$/, '');
    return `${t(language, 'requiresVocation')}: ${profession}`;
  }
  if (lower.startsWith('requires level ')) {
    const level = reason.replace(/^Requires level /, '').replace(/\.\s*$/, '');
    return `${t(language, 'requiresLevel')} ${level}`;
  }
  return reason;
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

function renderAttribution(parent: HTMLElement, database: MonsterDatabase, className: string, language: AppLanguage): void {
  const paragraph = appendText(parent, 'p', t(language, 'dataPrefix'), className);
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

function renderProjectMeta(parent: HTMLElement, className: string, language: AppLanguage): void {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  paragraph.append(`${t(language, 'developedBy')} `);

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
  level: number,
  language: AppLanguage
): string | null {
  const normalizedLevel = clampLevel(level);
  if (
    selected.length === 0 &&
    !includeAdvanced &&
    vocation === DEFAULT_VOCATION &&
    normalizedLevel === DEFAULT_LEVEL &&
    language === 'en'
  ) {
    return null;
  }
  const payload: SharedHuntPayload = {
    v: 3,
    a: includeAdvanced ? 1 : 0,
    s: selected.map((item) => [item.monster.id, clampWeight(item.weight)]),
    c: vocation,
    l: normalizedLevel,
    g: language
  };
  return JSON.stringify(payload);
}

function parseHuntState(
  database: MonsterDatabase,
  raw: string | null
): { selected: SelectedMonster[]; includeAdvanced: boolean; vocation: PlayerVocation; level: number; language: AppLanguage } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SharedHuntPayload;
    if ((parsed.v !== 1 && parsed.v !== 2 && parsed.v !== 3) || !Array.isArray(parsed.s)) return null;

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
      level: clampLevel(Number(parsed.l ?? DEFAULT_LEVEL)),
      language: isAppLanguage(parsed.g ?? '') ? (parsed.g as AppLanguage) : readLanguage()
    };
  } catch {
    return null;
  }
}

function getHuntUrl(
  selected: SelectedMonster[],
  includeAdvanced: boolean,
  vocation: PlayerVocation,
  level: number,
  language: AppLanguage
): string {
  const url = new URL(window.location.href);
  const serialized = serializeHuntState(selected, includeAdvanced, vocation, level, language);
  if (serialized) {
    url.searchParams.set(SHARE_PARAM, serialized);
  } else {
    url.searchParams.delete(SHARE_PARAM);
  }
  return url.toString();
}

function persistHuntUrl(
  selected: SelectedMonster[],
  includeAdvanced: boolean,
  vocation: PlayerVocation,
  level: number,
  language: AppLanguage
): void {
  try {
    const url = getHuntUrl(selected, includeAdvanced, vocation, level, language);
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
  let language: AppLanguage = urlState?.language ?? readLanguage();
  let draftQuery = '';
  let shareFeedback = '';
  let batchInput = '';
  let batchReport: BatchImportReport | null = null;
  let adminToken = '';
  let adminUnlock = '';
  let adminStatus = '';
  let adminBusy = false;
  let adminPanelOpen = false;
  let tutorialOpen = !readTutorialCompleted();
  let tutorialStepIndex = 0;

  const container = root.tagName.toLocaleLowerCase() === 'main' ? root : document.createElement('main');
  container.className = 'app-shell';
  if (container !== root) {
    root.replaceChildren(container);
  }

  const rerender = (): void => {
    persistLanguage(language);
    persistHuntUrl(selected, includeAdvanced, vocation, level, language);
    container.replaceChildren();
    const vocationOptions = getVocationOptions(language);

    const header = document.createElement('header');
    header.className = 'app-header';
    appendText(header, 'h1', t(language, 'appTitle'));
    appendText(header, 'p', t(language, 'appSubtitle'));
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const languageLabel = document.createElement('label');
    languageLabel.className = 'field-label compact-field-label';
    languageLabel.textContent = t(language, 'language');
    const languageSelect = document.createElement('select');
    languageSelect.name = 'app-language';
    for (const option of LANGUAGE_OPTIONS) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      node.selected = option.value === language;
      languageSelect.append(node);
    }
    languageSelect.addEventListener('change', () => {
      language = isAppLanguage(languageSelect.value) ? languageSelect.value : 'en';
      rerender();
    });
    languageLabel.append(languageSelect);
    headerActions.append(languageLabel);

    const tutorialButton = document.createElement('button');
    tutorialButton.type = 'button';
    tutorialButton.className = 'secondary-button';
    tutorialButton.textContent = t(language, 'howToUse');
    tutorialButton.addEventListener('click', () => {
      tutorialOpen = true;
      tutorialStepIndex = 0;
      rerender();
    });
    headerActions.append(tutorialButton);
    header.append(headerActions);
    container.append(header);

    if (tutorialOpen) {
      const steps = getTutorialSteps(language);
      const step = steps[Math.min(tutorialStepIndex, steps.length - 1)];
      const tutorial = document.createElement('section');
      tutorial.className = 'tutorial-panel';
      tutorial.setAttribute('aria-live', 'polite');
      appendText(tutorial, 'p', t(language, 'stepLabel', { current: tutorialStepIndex + 1, total: steps.length }), 'eyebrow');
      appendText(tutorial, 'h3', step.title);
      appendText(tutorial, 'p', step.body, 'score-note');
      if (vocation !== DEFAULT_VOCATION || level !== DEFAULT_LEVEL) {
        appendText(
          tutorial,
          'p',
          t(language, 'tutorialTip', {
            vocation: vocationOptions.find((option) => option.value === vocation)?.label ?? t(language, 'anyVocation'),
            level
          }),
          'score-note'
        );
      }

      const tutorialActions = document.createElement('div');
      tutorialActions.className = 'tutorial-actions';

      const skipButton = document.createElement('button');
      skipButton.type = 'button';
      skipButton.className = 'secondary-button';
      skipButton.textContent = t(language, 'skip');
      skipButton.addEventListener('click', () => {
        tutorialOpen = false;
        rerender();
      });
      tutorialActions.append(skipButton);

      if (tutorialStepIndex > 0) {
        const backButton = document.createElement('button');
        backButton.type = 'button';
        backButton.className = 'secondary-button';
        backButton.textContent = t(language, 'back');
        backButton.addEventListener('click', () => {
          tutorialStepIndex = Math.max(0, tutorialStepIndex - 1);
          rerender();
        });
        tutorialActions.append(backButton);
      }

      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.textContent = tutorialStepIndex >= steps.length - 1 ? t(language, 'finishTutorial') : t(language, 'next');
      nextButton.addEventListener('click', () => {
        if (tutorialStepIndex >= steps.length - 1) {
          persistTutorialCompleted();
          tutorialOpen = false;
          rerender();
          return;
        }
        tutorialStepIndex += 1;
        rerender();
      });
      tutorialActions.append(nextButton);
      tutorial.append(tutorialActions);
      container.append(tutorial);
    }

    const layout = document.createElement('section');
    layout.className = 'tool-layout';
    container.append(layout);

    const builder = document.createElement('section');
    builder.className = 'tool-panel builder-panel';
    builder.setAttribute('aria-labelledby', 'builder-title');
    appendText(builder, 'h2', t(language, 'huntBuilder')).id = 'builder-title';

    const controls = document.createElement('div');
    controls.className = 'add-controls';

    const inputLabel = document.createElement('label');
    inputLabel.className = 'field-label';
    inputLabel.textContent = t(language, 'monster');
    const input = document.createElement('input');
    input.name = 'monster-search';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = t(language, 'typeMonsterName');
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
    suggestions.setAttribute('aria-label', `${t(language, 'monster')} suggestions`);
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
    addButton.textContent = t(language, 'add');
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
    shareButton.textContent = t(language, 'copyHuntLink');
    shareButton.addEventListener('click', async () => {
      const url = getHuntUrl(selected, includeAdvanced, vocation, level, language);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          shareFeedback = t(language, 'linkCopied');
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
    appendText(batchSection, 'h3', t(language, 'bulkImport'), 'section-heading');
    appendText(batchSection, 'p', t(language, 'bulkImportHint'), 'score-note');

    const batchInputLabel = document.createElement('label');
    batchInputLabel.className = 'field-label';
    batchInputLabel.textContent = t(language, 'monsterList');
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
    batchButton.textContent = t(language, 'importList');
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
        t(language, 'processedReport', {
          total: batchReport.total,
          matched: batchReport.matched,
          added: batchReport.added,
          duplicates: batchReport.duplicates.length,
          missing: batchReport.missing.length
        }),
        'score-note'
      );
      if (batchReport.missing.length > 0) {
        appendText(batchSection, 'p', t(language, 'missingLabel', { items: batchReport.missing.join(', ') }), 'warning-inline');
      }
    }

    builder.append(batchSection);

    const playerRules = document.createElement('div');
    playerRules.className = 'player-rules';
    appendText(playerRules, 'h3', t(language, 'vocationAndLevel'), 'section-heading');

    const playerFields = document.createElement('div');
    playerFields.className = 'player-rules-fields';

    const vocationLabel = document.createElement('label');
    vocationLabel.className = 'field-label';
    vocationLabel.textContent = t(language, 'vocation');
    const vocationSelect = document.createElement('select');
    vocationSelect.name = 'player-vocation';
    for (const option of vocationOptions) {
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
    levelLabel.textContent = t(language, 'level');
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
    adminSummary.textContent = t(language, 'adminTools');
    adminPanel.append(adminSummary);
    appendText(
      adminPanel,
      'p',
      t(language, 'adminNote'),
      'admin-note'
    );

    const tokenLabel = document.createElement('label');
    tokenLabel.className = 'field-label';
    tokenLabel.textContent = t(language, 'githubToken');
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
    unlockLabel.textContent = t(language, 'typeUpdateToEnable');
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
    adminActionButton.textContent = adminBusy ? t(language, 'updating') : t(language, 'runMonsterDataUpdate');
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
          adminStatus = t(language, 'workflowDispatched');
          adminUnlock = '';
        } else {
          const responseText = await response.text();
          adminStatus = `${t(language, 'dispatchFailed')} (${response.status}): ${responseText || response.statusText}`;
        }
      } catch (error) {
        adminStatus = `${t(language, 'dispatchFailed')}: ${error instanceof Error ? error.message : String(error)}`;
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
    advancedLabel.append(advancedInput, document.createTextNode(t(language, 'includeAdvanced')));
    builder.append(advancedLabel);

    const selectedList = document.createElement('div');
    selectedList.className = 'selected-list';
    if (selected.length === 0) {
      appendText(selectedList, 'p', t(language, 'noMonstersSelected'), 'empty-state');
    } else {
      for (const selection of selected) {
        const row = document.createElement('article');
        row.className = 'selected-monster';

        const media = createMonsterSprite(selection.monster);
        const details = document.createElement('div');
        appendText(details, 'h3', selection.monster.name);
        const flags = [
          selection.monster.special ? t(language, 'special') : '',
          selection.monster.incomplete ? t(language, 'incomplete') : '',
          selection.monster.huntRelevant ? '' : t(language, 'notHuntRelevant')
        ].filter(Boolean);
        appendText(details, 'p', flags.length > 0 ? flags.join(' · ') : t(language, 'standardHuntCreature'), 'monster-flags');

        const actions = document.createElement('div');
        actions.className = 'selected-actions';

        const weightControl = document.createElement('div');
        weightControl.className = 'importance-control';

        const weightLabel = document.createElement('label');
        weightLabel.className = 'weight-label';
        weightLabel.textContent = t(language, 'weight');
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
        for (const value of WEIGHT_PRESET_VALUES) {
          const presetButton = document.createElement('button');
          presetButton.type = 'button';
          presetButton.className = 'weight-preset';
          presetButton.textContent = getWeightPresetLabel(language, value);
          presetButton.disabled = clampWeight(selection.weight) === value;
          presetButton.addEventListener('click', () => {
            selection.weight = value;
            rerender();
          });
          presetRow.append(presetButton);
        }

        const weightValue = document.createElement('p');
        weightValue.className = 'importance-value';
        weightValue.textContent = `${t(language, 'weight')}: ${clampWeight(selection.weight)}`;

        weightControl.append(weightLabel, presetRow, weightValue);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'secondary-button';
        removeButton.textContent = t(language, 'remove');
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
    appendText(resultPanel, 'h2', t(language, 'results')).id = 'result-title';

    const recommendation = calculateRecommendation(selected as HuntSelection[], {
      player: { vocation, level }
    });
    if (!recommendation.recommended) {
      appendText(resultPanel, 'p', t(language, 'addOneCompleteMonster'), 'empty-state');
    } else {
      const recommendedLabel = getElementLabel(recommendation.recommended.element, language);
      const totalContribution = recommendation.contributions.reduce((sum, item) => sum + item.contribution, 0);
      const primaryAlternative = recommendation.topAlternatives.find(
        (item) => item.element !== recommendation.recommended?.element
      );
      const activeVocationLabel =
        vocationOptions.find((option) => option.value === vocation)?.label ?? vocationOptions[0].label;
      const topRaw = recommendation.ranking[0];
      const topRawEligibility = recommendation.eligibility.find((item) => item.element === topRaw.element);
      appendText(resultPanel, 'p', t(language, 'recommended'), 'eyebrow');
      appendText(resultPanel, 'h3', recommendedLabel, 'recommended-element');
      appendText(resultPanel, 'p', t(language, 'topRawScore', { score: formatScore(recommendation.recommended.score, language) }), 'score-note');
      appendText(resultPanel, 'p', t(language, 'profile', { vocation: activeVocationLabel, level }), 'score-note');
      if (topRaw.element !== recommendation.recommended.element && topRawEligibility && !topRawEligibility.eligible) {
        appendText(
          resultPanel,
          'p',
          t(language, 'ineligibleTopRaw', {
            element: getElementLabel(topRaw.element, language),
            reason: localizeEligibilityReason(topRawEligibility.reason, language)
          }),
          'score-note'
        );
      }

      appendText(resultPanel, 'h3', t(language, 'whyThisElement'), 'section-heading');
      const explanation = document.createElement('div');
      explanation.className = 'explanation-block';
      if (primaryAlternative) {
        appendText(
          explanation,
          'p',
          t(language, 'leadsBy', {
            recommended: recommendedLabel,
            alternative: getElementLabel(primaryAlternative.element, language),
            delta: formatScore(primaryAlternative.deltaFromRecommended, language)
          })
        );
      } else {
        appendText(explanation, 'p', t(language, 'onlyRankedRecommendation', { recommended: recommendedLabel }));
      }
      appendText(explanation, 'p', t(language, 'impactFormula'));
      resultPanel.append(explanation);

      appendText(resultPanel, 'h3', t(language, 'top3Elements'), 'section-heading');
      const topList = document.createElement('ol');
      topList.className = 'ranking-list';
      for (const item of recommendation.topAlternatives) {
        const topItem = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = getElementLabel(item.element, language);
        const score = document.createElement('strong');
        const deltaText =
          item.deltaFromRecommended === 0
            ? t(language, 'baseline')
            : t(language, 'behind', { delta: formatScore(item.deltaFromRecommended, language) });
        score.textContent = `${formatScore(item.score, language)} (${deltaText})`;
        topItem.append(label, score);
        topList.append(topItem);
      }
      resultPanel.append(topList);

      appendText(resultPanel, 'h3', t(language, 'fullRanking'), 'section-heading');
      const rankingList = document.createElement('ol');
      rankingList.className = 'ranking-list';
      for (const item of recommendation.ranking) {
        const rankingItem = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = getElementLabel(item.element, language);
        const score = document.createElement('strong');
        score.textContent = formatScore(item.score, language);
        rankingItem.append(label, score);
        rankingList.append(rankingItem);
      }
      resultPanel.append(rankingList);

      appendText(resultPanel, 'h3', t(language, 'monsterSummary'), 'section-heading');
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
            `: ${t(language, 'contributionLine', {
              modifier: contribution.recommendedModifier,
              summary: localizeContributionSummary(contribution.summary, language),
              weight: contribution.selectedWeight,
              factor: weightFactor.toFixed(2),
              contribution: formatScore(contribution.contribution, language),
              share: formatPercent(contributionShare, language)
            })}`
          )
        );
        summaryList.append(item);
      }
      resultPanel.append(summaryList);
    }

    if (recommendation.excludedMonsters.length > 0) {
      const warning = document.createElement('div');
      warning.className = 'warning';
      appendText(warning, 'h3', t(language, 'excludedMonsters'));
      const list = document.createElement('ul');
      for (const monster of recommendation.excludedMonsters) {
        const item = document.createElement('li');
        item.textContent = `${monster.name}: ${localizeExclusionReason(monster.reason, language)}`;
        list.append(item);
      }
      warning.append(list);
      resultPanel.append(warning);
    }

    renderAttribution(resultPanel, database, 'credit-line', language);
    layout.append(resultPanel);

    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    renderProjectMeta(footer, 'project-meta', language);
    appendText(footer, 'p', t(language, 'dataVersion', { version: formatDataVersion(database.generatedAt, language) }), 'project-meta');
    renderAttribution(footer, database, 'credit-line', language);
    container.append(footer);
  };

  rerender();
}
