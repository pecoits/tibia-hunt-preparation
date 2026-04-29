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
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Dragon_Lord.gif',
      aliases: ['Dragon Lord'],
      dataCompletenessScore: 100,
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
      spriteUrl: 'https://tibia.fandom.com/wiki/Special:FilePath/Training_Dummy.gif',
      aliases: ['Training Dummy'],
      dataCompletenessScore: 0,
      huntRelevant: false,
      incomplete: true
    });
  });

  it('extracts hp and modifiers from single-line infobox wikitext', () => {
    const monster = transformMonsterPage(
      'Bashmu',
      '{{Infobox Creature|List={{{1|}}}|GetValue={{{GetValue|}}} | name = Bashmu | hp = 8200 | physicalDmgMod = 95% | earthDmgMod = 80% | fireDmgMod = 100% | deathDmgMod = 110% | energyDmgMod = 95% | holyDmgMod = 110% | iceDmgMod = 105% }}'
    );

    expect(monster).toMatchObject({
      id: 'bashmu',
      name: 'Bashmu',
      hitpoints: 8200,
      huntRelevant: true,
      special: false,
      incomplete: false
    });
    expect(monster.elements).toMatchObject({
      physical: 95,
      earth: 80,
      fire: 100,
      energy: 95,
      ice: 105,
      holy: 110,
      death: 110
    });
  });

  it('detects boss category links with sort keys as special', () => {
    const monster = transformMonsterPage(
      'Category Boss',
      `{{Creature
| name = Category Boss
| hp = 1000
| physicalDmgMod = 100%
| earthDmgMod = 100%
| fireDmgMod = 100%
| energyDmgMod = 100%
| iceDmgMod = 100%
| holyDmgMod = 100%
| deathDmgMod = 100%
}}
[[Category:Bosses|Category Boss]]`
    );

    expect(monster).toMatchObject({
      huntRelevant: false,
      special: true,
      incomplete: false
    });
  });
});
