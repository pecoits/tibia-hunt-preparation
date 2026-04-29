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
npm run validate-data
npm run build
```

## Updating monster data

Admins can run the `Update monster data` GitHub Action manually. The workflow scrapes TibiaWiki/Fandom, validates `public/data/monsters.json`, runs the build, commits directly to `main` only when validation passes and data changed, then deploys GitHub Pages from `dist`.

## Deployment

The `Deploy GitHub Pages` workflow runs on pushes to `main` and manual runs from `main`. It tests, builds, and publishes the static site from `dist`.

## Data Attribution

Creature data and damage modifiers are sourced from TibiaWiki/Fandom:

- https://tibia.fandom.com/wiki/Main_Page
- https://tibia.fandom.com/wiki/List_of_Creatures
- https://tibia.fandom.com/wiki/Damage_Modifiers

Fandom content is available under CC BY-SA unless otherwise noted.
