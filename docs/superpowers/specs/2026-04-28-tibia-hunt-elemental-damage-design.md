# Tibia Hunt Elemental Damage - MVP Design

## Objetivo

Criar um site estatico para GitHub Pages que ajude jogadores de Tibia a escolher o melhor tipo de dano elemental para uma hunt. O usuario informa os monstros que pretende enfrentar, define a importancia relativa de cada um e recebe uma recomendacao de dano preferencial.

O MVP deve comparar estes tipos de dano:

- physical
- earth
- fire
- energy
- ice
- holy
- death

## Fonte de dados e atribuicao

A base de monstros sera gerada a partir do TibiaWiki/Fandom:

- pagina principal: https://tibia.fandom.com/wiki/Main_Page
- lista de criaturas: https://tibia.fandom.com/wiki/List_of_Creatures
- documentacao de modificadores: https://tibia.fandom.com/wiki/Damage_Modifiers

O site deve exibir creditos ao TibiaWiki/Fandom em dois lugares:

- rodape global da aplicacao;
- area de resultados, junto da recomendacao calculada.

O texto de credito deve indicar que os dados de criaturas e modificadores foram obtidos do TibiaWiki/Fandom e apontar para a fonte original. Quando aplicavel, deve mencionar que o conteudo do Fandom e disponibilizado sob CC BY-SA, salvo indicacao em contrario.

## Escopo do MVP

### Entrada da hunt

O usuario adiciona monstros por um campo com autocomplete. O fluxo principal e:

1. digitar parte do nome do monstro;
2. escolher uma sugestao;
3. clicar em um botao de adicionar;
4. ver o monstro entrar na lista da hunt.

A hunt pode ter varios monstros. Cada item da lista deve permitir:

- alterar importancia: baixa, normal ou alta;
- remover o monstro da hunt.

Por padrao, o autocomplete deve mostrar apenas criaturas uteis para hunt. Deve existir uma opcao avancada para incluir criaturas especiais, incompletas ou normalmente ocultas.

### Resultado

A area de resultados deve mostrar:

- o melhor tipo de dano recomendado;
- um ranking completo dos sete tipos de dano;
- um resumo por monstro explicando se ele favorece ou prejudica o elemento recomendado;
- avisos para monstros excluidos do calculo por dados incompletos;
- creditos ao TibiaWiki/Fandom.

## Modelo de dados

A aplicacao deve consumir um arquivo versionado gerado pelo scraper, por exemplo `data/monsters.json`.

Cada monstro deve conter, no minimo:

- identificador estavel;
- nome;
- HP;
- modificadores para physical, earth, fire, energy, ice, holy e death;
- URL da pagina fonte no TibiaWiki/Fandom;
- flags de classificacao para autocomplete, como `huntRelevant`, `special`, `incomplete`;
- metadados basicos de origem e data de importacao.

Exemplo conceitual:

```json
{
  "id": "dragon-lord",
  "name": "Dragon Lord",
  "hitpoints": 1900,
  "elements": {
    "physical": 100,
    "earth": 20,
    "fire": 0,
    "energy": 100,
    "ice": 110,
    "holy": 100,
    "death": 100
  },
  "sourceUrl": "https://tibia.fandom.com/wiki/Dragon_Lord",
  "huntRelevant": true,
  "special": false,
  "incomplete": false
}
```

## Atualizacao da base

A base completa de monstros deve ser produzida por um scraper/importador. O scraper deve ser executado por uma GitHub Action manual com `workflow_dispatch`.

Como o site sera publicado no GitHub Pages, a pagina publica nao deve ter credenciais nem permissao para alterar dados. A atualizacao fica protegida pelas permissoes do proprio GitHub: somente usuarios com acesso adequado ao repositorio poderao executar a Action.

Fluxo da Action:

1. executar o scraper;
2. gerar `data/monsters.json`;
3. validar o JSON gerado;
4. falhar sem commit se houver erro de validacao;
5. se a validacao passar e houver mudanca real, commitar direto na branch principal.

Validacoes minimas:

- JSON valido;
- lista nao vazia;
- IDs unicos;
- nomes duplicados desambiguados por ID e URL de origem;
- HP numerico para monstros usados no calculo;
- sete modificadores elementais presentes para monstros usados no calculo;
- URLs de origem presentes;
- metadados de importacao presentes.

## Calculo

Para cada monstro valido da hunt, cada elemento recebe uma contribuicao baseada em:

```text
hitpoints * peso_importancia * multiplicador_elemental
```

O multiplicador elemental vem da wiki como percentual. Exemplos:

- `110` significa fraqueza de 10%;
- `80` significa resistencia de 20%;
- `0` significa imunidade.

O score final de cada elemento e a soma das contribuicoes entre todos os monstros validos selecionados. O maior score e recomendado.

Pesos de importancia:

- baixa: `0.5`
- normal: `1`
- alta: `2`

Monstros com HP ausente ou modificadores ausentes devem ser excluidos do calculo e listados em aviso. Eles nao devem receber valores neutros automaticos, para evitar distorcao do resultado.

## UX e estados

Estados principais:

- carregando base de monstros;
- erro ao carregar base;
- hunt vazia;
- hunt com monstros validos;
- hunt com um ou mais monstros incompletos;
- resultado calculado;
- nenhuma recomendacao possivel por falta de dados validos.

A interface deve ser direta e utilitaria, adequada para jogadores que querem uma resposta rapida. A primeira tela deve ser a ferramenta, nao uma landing page.

## Limites e decisoes fora do MVP

Fora do MVP:

- backend proprio;
- login/admin dentro do site;
- edicao manual de monstros pela UI publica;
- pesos numericos customizados;
- simulacao de quantidade exata de criaturas;
- recomendacao por vocacao, spell, arma ou charm.

Esses itens podem ser adicionados depois sem alterar a base do design, desde que o motor de calculo continue separado da UI e do importador.

## Testes e verificacao

O plano de implementacao deve incluir:

- testes unitarios para o motor de calculo;
- testes unitarios ou de integracao para validacao do JSON;
- pelo menos um teste com monstros incompletos excluidos do calculo;
- verificacao de build para GitHub Pages;
- smoke test da UI principal.

## Criterios de aceite

O MVP sera considerado pronto quando:

- o site carregar em ambiente estatico;
- o autocomplete permitir montar uma hunt com varios monstros;
- cada monstro aceitar importancia baixa, normal ou alta;
- o resultado destacar o melhor elemento;
- o ranking completo dos sete tipos de dano for exibido;
- o resumo por monstro for exibido;
- dados incompletos forem avisados e excluidos do calculo;
- creditos ao TibiaWiki/Fandom aparecerem no rodape e nos resultados;
- a GitHub Action manual conseguir atualizar e validar a base antes de commitar.
