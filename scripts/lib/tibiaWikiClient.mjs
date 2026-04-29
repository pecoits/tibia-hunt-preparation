const API_URL = 'https://tibia.fandom.com/api.php';
const MAX_ATTEMPTS = 4;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchWikiJson(params) {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }

      lastError = new Error(`TibiaWiki request failed: ${response.status} ${response.statusText}`);
      if (response.status < 500 && response.status !== 429) {
        break;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) {
      await wait(750 * attempt);
    }
  }

  throw lastError;
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

    titles.push(...(data.query?.categorymembers ?? []).map((item) => item.title));
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
