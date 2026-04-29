# Hunt Element Planner v2 - Backlog de Issues

Ordem de prioridade definida: `2 -> 3 -> 5 -> 6 -> 7 -> 1 -> 4 -> 8`.

## Sprint 1

### Issue 1 - Classificacao avancada por peso numerico (0-100)
- **Prioridade:** P0
- **Sprint:** 1
- **Estimativa:** M
- **Dependencias:** Nenhuma
- **Objetivo:** Substituir a importancia fixa (`low/normal/high`) por peso numerico sem perder presets rapidos.
- **Escopo tecnico:**
  - Atualizar modelo de selecao para armazenar `weight` (`0-100`).
  - Manter presets de UX: `Low=25`, `Normal=50`, `High=75`.
  - Ajustar calculo de score para usar `weight` normalizado.
  - Garantir compatibilidade com estado legado (`low/normal/high`) quando necessario.
- **Arquivos provaveis:**
  - `src/domain/calculateRecommendation.ts`
  - `src/ui/renderApp.ts`
  - `src/domain/types.ts`
  - `src/ui/renderApp.test.ts`
  - `src/domain/calculateRecommendation.test.ts`
- **Criterios de aceite:**
  - Alterar peso muda ranking e recomendacao de forma previsivel.
  - Pesos extremos (`0`, `100`) funcionam sem quebrar a UI.
  - Testes automatizados cobrindo regressao passam.

### Issue 2 - Compartilhamento de hunt por URL
- **Prioridade:** P0
- **Sprint:** 1
- **Estimativa:** M
- **Dependencias:** Issue 1
- **Objetivo:** Permitir abrir a aplicacao com monstros e pesos pre-preenchidos.
- **Escopo tecnico:**
  - Serializar estado da hunt em querystring.
  - Ler querystring no bootstrap e popular estado.
  - Botao "Copiar link da hunt".
  - Tratamento de querystring invalida sem quebrar a pagina.
- **Arquivos provaveis:**
  - `src/main.ts`
  - `src/ui/renderApp.ts`
  - `src/ui/renderApp.test.ts`
  - `src/domain/types.ts`
- **Criterios de aceite:**
  - Link aberto em outro navegador reproduz os mesmos monstros/pesos.
  - Querystring invalida exibe fallback seguro e app continua funcional.

## Sprint 2

### Issue 3 - Pipeline de dados com spriteUrl e metadados de qualidade
- **Prioridade:** P1
- **Sprint:** 2
- **Estimativa:** M
- **Dependencias:** Nenhuma
- **Objetivo:** Eliminar heuristica de sprite no front e consolidar qualidade no importador.
- **Escopo tecnico:**
  - Adicionar `spriteUrl` na transformacao do scraper.
  - Adicionar metadados de qualidade (`lastValidatedAt`, opcionalmente `aliases`).
  - Atualizar validacao do schema para os novos campos.
  - Regenerar `public/data/monsters.json`.
- **Arquivos provaveis:**
  - `scripts/lib/monsterTransform.mjs`
  - `scripts/update-monsters.mjs`
  - `scripts/validate-monsters.mjs`
  - `src/domain/validateMonsterData.ts`
  - `src/domain/types.ts`
- **Criterios de aceite:**
  - Front consegue renderizar sprite sem derivacao por `sourceUrl`.
  - `npm run validate-data` falha para `spriteUrl` invalido quando esperado.

### Issue 4 - Explicacao da recomendacao no resultado
- **Prioridade:** P1
- **Sprint:** 2
- **Estimativa:** M
- **Dependencias:** Issue 1
- **Objetivo:** Tornar o resultado explicavel para decisao de hunt.
- **Escopo tecnico:**
  - Bloco "Por que este elemento?".
  - Mostrar contribuicao por monstro no elemento recomendado.
  - Mostrar top 3 elementos com diferenca de score.
  - Exibir impacto relativo do peso por monstro.
- **Arquivos provaveis:**
  - `src/domain/calculateRecommendation.ts`
  - `src/ui/renderApp.ts`
  - `src/domain/calculateRecommendation.test.ts`
  - `src/ui/renderApp.test.ts`
- **Criterios de aceite:**
  - Usuario consegue justificar a recomendacao apenas pelo resultado exibido.
  - Bloco some/ajusta corretamente para lista vazia.

## Sprint 3

### Issue 5 - Painel admin protegido para atualizar base
- **Prioridade:** P1
- **Sprint:** 3
- **Estimativa:** G
- **Dependencias:** Issue 3
- **Objetivo:** Permitir atualizacao de base com controle de acesso e rastreabilidade.
- **Escopo tecnico:**
  - Criar area admin protegida por token/chave.
  - Disparar workflow de update de dados com feedback de status.
  - Registrar execucoes basicas (quem/quando/status).
- **Arquivos provaveis:**
  - `src/ui/renderApp.ts` (ou modulo admin dedicado)
  - `.github/workflows/update-monsters.yml`
  - `README.md`
- **Criterios de aceite:**
  - Sem credencial valida, acao e bloqueada.
  - Com credencial valida, workflow e disparado e retorno e visivel.

### Issue 6 - Regras por vocacao e nivel
- **Prioridade:** P2
- **Sprint:** 3
- **Estimativa:** M
- **Dependencias:** Issue 1
- **Objetivo:** Recomendacao final deve considerar restricoes reais da vocacao.
- **Escopo tecnico:**
  - Inputs de vocacao e nivel no builder.
  - Matriz de elegibilidade por elemento.
  - Ranking bruto preservado; recomendacao final respeita elegibilidade.
- **Arquivos provaveis:**
  - `src/domain/calculateRecommendation.ts`
  - `src/domain/types.ts`
  - `src/ui/renderApp.ts`
  - `src/domain/calculateRecommendation.test.ts`
  - `src/ui/renderApp.test.ts`
- **Criterios de aceite:**
  - Elementos nao elegiveis nunca aparecem como recomendados.
  - Mudanca de vocacao altera recomendacao quando aplicavel.

### Issue 7 - Importacao em lote por texto colado
- **Prioridade:** P2
- **Sprint:** 3
- **Estimativa:** P/M
- **Dependencias:** Issue 1
- **Objetivo:** Acelerar composicao de hunts com muitos monstros.
- **Escopo tecnico:**
  - Campo para colar lista (`\n` e `,` como separadores).
  - Matching por nome (e alias quando existir).
  - Relatorio de encontrados/nao encontrados.
- **Arquivos provaveis:**
  - `src/ui/renderApp.ts`
  - `src/ui/renderApp.test.ts`
- **Criterios de aceite:**
  - Lista longa e processada em uma acao.
  - Nao encontrados aparecem claramente e nao quebram a inclusao dos validos.

## Sprint 4

### Issue 8 - PWA leve com cache offline
- **Prioridade:** P3
- **Sprint:** 4
- **Estimativa:** M
- **Dependencias:** Issue 3
- **Objetivo:** Garantir uso em mobile com rede instavel.
- **Escopo tecnico:**
  - Service worker para shell + `monsters.json`.
  - Estrategia de invalidacao de cache por versao.
  - Indicador de versao de dados carregados.
- **Arquivos provaveis:**
  - `vite.config.ts`
  - `src/main.ts`
  - `src/ui/renderApp.ts`
  - `README.md`
- **Criterios de aceite:**
- App abre offline apos primeira carga.
- Atualizacao de base nao deixa cache quebrado.

## Backlog Final (ultimo passo)

### Issue 9 - Minitutorial guiado de uso da ferramenta
- **Prioridade:** P4 (ultima)
- **Sprint:** Pos Sprint 4
- **Estimativa:** P/M
- **Dependencias:** Issue 1, Issue 2, Issue 4, Issue 6
- **Objetivo:** Facilitar onboarding rapido para novos usuarios sem exigir leitura externa.
- **Escopo tecnico:**
  - Criar minitutorial em passos curtos dentro da aplicacao.
  - Cobrir fluxo base: adicionar monstro, ajustar peso, interpretar recomendacao e copiar link.
  - Incluir dica sobre regras de vocacao (quando filtros estiverem ativos).
  - Permitir fechar/pular tutorial e nao exibir novamente apos concluir (persistencia local).
- **Arquivos provaveis:**
  - `src/ui/renderApp.ts` (ou modulo dedicado de tutorial)
  - `src/styles.css`
  - `src/ui/renderApp.test.ts`
  - `README.md`
- **Criterios de aceite:**
  - Primeiro acesso exibe tutorial curto e objetivo.
  - Usuario consegue pular e retomar tutorial manualmente.
  - Estado "ja concluido" persiste entre recarregamentos no mesmo navegador.

---

## Ordem de execucao recomendada
1. Issue 1
2. Issue 2
3. Issue 3
4. Issue 5
5. Issue 4
6. Issue 6
7. Issue 7
8. Issue 8
9. Issue 9

## Definicao de pronto (DoD) por issue
- Testes automatizados relevantes atualizados e passando.
- `npm test` e `npm run build` sem erro.
- Sem regressao visual evidente no fluxo principal.
- Documentacao minima atualizada (`README.md` quando aplicavel).
