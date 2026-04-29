import { describe, expect, it } from 'vitest';
import { transformMonsterPage } from './monsterTransform.mjs';

describe('transformMonsterPage', () => {
  it('extracts combat fields from Creature template wikitext', () => {
    const monster = transformMonsterPage(
      'Dragon Lord',
      `{{Creature
| name = Dragon Lord
| hp = 1900
| isboss = no
| physicalDmgMod = 100%
| earthDmgMod = 20%
| fireDmgMod = 0%
| energyDmgMod = 100%
| iceDmgMod = 110%
| holyDmgMod = 100%
| deathDmgMod = 100%
}}`
    );

    expect(monster).toEqual({
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
    });
  });

  it('marks explicit boss records as special', () => {
    const monster = transformMonsterPage(
      'Boss Example',
      `{{Creature
| name = Boss Example
| hp = 1000
| isboss = yes
| physicalDmgMod = 100%
| earthDmgMod = 100%
| fireDmgMod = 100%
| energyDmgMod = 100%
| iceDmgMod = 100%
| holyDmgMod = 100%
| deathDmgMod = 100%
}}`
    );

    expect(monster).toMatchObject({
      huntRelevant: false,
      special: true,
      incomplete: false
    });
  });

  it('marks records incomplete when required combat fields are absent', () => {
    const monster = transformMonsterPage('Training Dummy', '{{Creature| name = Training Dummy }}');

    expect(monster).toMatchObject({
      id: 'training-dummy',
      name: 'Training Dummy',
      hitpoints: null,
      elements: {},
      huntRelevant: false,
      incomplete: true
    });
  });
});
