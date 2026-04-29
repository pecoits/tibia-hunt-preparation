# Hunt Element Planner

Static GitHub Pages tool for comparing preferred elemental damage in Tibia hunts.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run validate-data
npm run build
```

## Updating monster data

Admins can run the `Update monster data` GitHub Action manually. The workflow scrapes TibiaWiki/Fandom, validates `public/data/monsters.json`, runs the build, commits directly to `main` only when validation passes and data changed, then deploys GitHub Pages from `dist`.

The app also includes an `Admin tools` panel that can trigger the same workflow directly from the browser. It requires:

1. A GitHub personal access token with `actions:write` for this repository.
2. Explicit unlock phrase confirmation in the UI.

## Deployment

The `Deploy GitHub Pages` workflow runs on pushes to `main` and manual runs from `main`. It tests, builds, and publishes the static site from `dist`.

## Offline usage (PWA)

The app ships with a lightweight service worker:

1. After the first successful load, the app shell is cached for offline access.
2. `public/data/monsters.json` uses `NetworkFirst` with cache fallback to support unstable mobile networks.
3. The footer displays `Data version` based on `generatedAt` from the loaded dataset.

## In-app tutorial

The app includes a short guided tutorial for first-time users:

1. It opens automatically on first access.
2. Users can skip it, reopen it from `How to use`, and complete it later.
3. After completion, it stays hidden on subsequent visits in the same browser (local storage).

## Data Attribution

Creature data and damage modifiers are sourced from TibiaWiki/Fandom:

- https://tibia.fandom.com/wiki/Main_Page
- https://tibia.fandom.com/wiki/List_of_Creatures
- https://tibia.fandom.com/wiki/Damage_Modifiers

Fandom content is available under CC BY-SA unless otherwise noted.
