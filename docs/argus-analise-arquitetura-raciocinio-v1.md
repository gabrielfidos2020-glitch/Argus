# Argus — Análise de Arquitetura e Engenharia de Sistemas de Raciocínio

Repositório: [gabrielfidos2020-glitch/Argus](https://github.com/gabrielfidos2020-glitch/Argus) — analisado no commit `feat(scraper): implementar Puppeteer...` (2026-07-13).

---

## 1. O que o projeto realmente é

Apesar do README dizer só "sistema de prospecção", o que está implementado é um **pipeline agentic composto** clássico:

```
Captação (scrape)  →  Diagnóstico (LLM)  →  Geração de mensagem (LLM + template)  →  Aprovação humana  →  Ação (envio WhatsApp)
   Workflow A            Workflow B                Workflow C                        UI (Postgres)         argus-ui/backend
```

Isso é relevante porque a maior parte dos erros de projetos desse tipo não está no scraping ou no CRUD — está em como o LLM é "encaixado" no meio de um fluxo determinístico. O projeto já demonstra intuições corretas nesse ponto (seção 2), e os gaps são pontuais e claramente enumeráveis (seção 3).

---

## 2. Decisões de design do "raciocínio" — o que está bem feito

| Decisão | Onde | Por que é uma boa escolha |
|---|---|---|
| Separar "o que está errado" de "como dizer isso" | [workflow-b.json](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-b.json) gera diagnóstico; [workflow-c.json](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-c.json) gera copy | Decompor a tarefa em dois LLM calls especializados reduz a chance de um único prompt "fazer tudo mal". É o mesmo princípio por trás de arquiteturas multi-agente. |
| Mensagem = template fixo + **um único bloco** gerado por LLM (`b4_problema`) | [workflow-c.json:20](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-c.json#L20) | Minimiza a "superfície de alucinação". Em vez de deixar o modelo escrever a mensagem inteira, ele só reescreve uma frase — o resto é determinístico. É a estratégia certa para produção com modelo local pequeno (7B). |
| Validador pós-geração (contagem de frases, regex de jargão, regex de frases proibidas) | [workflow-c.json:45](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-c.json#L45) | Isso é, na prática, um **guardrail/critic node** — um padrão central em sistemas de raciocínio confiáveis: não confiar cegamente no output do modelo, validar antes de usar. |
| `temperature: 0.1` nas duas chamadas ao Ollama | workflow-b.json, workflow-c.json | Escolha correta para tarefa estruturada/determinística — mostra entendimento de que criatividade alta prejudica aderência a formato. |
| Parsing de JSON com fallback em cascata | [workflow-b.json:95](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-b.json#L95) | LLMs locais pequenos frequentemente "quase" respeitam o JSON pedido. Ter uma função `extrairJSON` com múltiplas tentativas antes de desistir é maduro — evidencia teste empírico prévio contra falhas reais. |
| Prompt por nicho (4 variações) em vez de 1 prompt genérico | workflow-b.json | Contextualizar o prompt ao domínio de negócio aumenta a qualidade do diagnóstico — mostra que o "prompt engineering" foi pensado com o usuário final (dono de negócio local) em mente, não só com o modelo. |
| `docs/sprints.md` com DoD/DoR, critérios de aceitação testáveis por história | [docs/sprints.md](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/docs/sprints.md) | Isso é raro em projetos pessoais desse porte. Já demonstra Bloom nível **Aplicar/Analisar** em gestão de produto, independente do código. |

---

## 3. Achados — gaps concretos

### 3.1 Bugs funcionais

- **Canal Instagram é um beco sem saída.** [workflow-a.json:69](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-a.json#L69) ainda alterna `canal = par ? 'whatsapp' : 'instagram'`, mas [argus-ui/backend/server.js:79-114](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/argus-ui/backend/server.js#L79-L114) — a única rota que efetivamente envia mensagem — só chama a Evolution API (WhatsApp), ignorando o campo `canal`. Todo lead marcado como `instagram` (~50% dos leads com site) é aprovado, mas nunca é enviado, sem erro visível. O commit `refactor: remove instagram integration due to API blacklist` removeu o envio mas não removeu a classificação que ainda direciona metade dos leads para esse canal morto.
- **`status: 'erro_copy'` e `'erro_parse'` não têm saída.** Quando o validador de [workflow-c.json:45](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-c.json#L45) rejeita a mensagem, ou quando o parse do diagnóstico falha em workflow-b.json, o lead fica nesse status para sempre — não há retry, nem fallback de template, nem ação na UI para "regenerar". Isso viola o próprio DoD do projeto ("tratamento de erro implementado").
- **Cache por domínio, prometido no DoD do Sprint 2** ("segunda execução com mesma URL não chama LM Studio" — [docs/sprints.md:329](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/docs/sprints.md#L329)), **não existe** em workflow-b.json. Toda execução repete scrape + chamada ao modelo.

### 3.2 Confiabilidade do "raciocínio" (a parte mais importante para evoluir)

- **JSON garantido só por prompt + regex, não por contrato.** O Ollama tem suporte nativo a `format: "json"` (JSON mode), não usado em nenhuma das chamadas (workflow-b.json, workflow-c.json). Hoje a confiabilidade depende 100% do modelo "obedecer" a instrução textual — funciona, mas é o motivo dos 7 arquivos `n8n/test-workflow-c-ai-*.js` de tentativa-e-erro no repositório.
- **Nenhuma suíte de avaliação (eval) reutilizável.** Existem 11 scripts de teste em `n8n/` (`test-etapa1-ollama.js`, `test-nicho-ollama.js`, `test-workflow-c-ai.js`, `...-final.js`, `...-updated.js`, `...-lead3.js`, `...-library.js`, `...-block4.js`) — claramente iterações sucessivas do mesmo teste, mantidas como arquivos separados em vez de um harness único com casos fixos. Isso indica que o ajuste de prompt foi feito por tentativa manual, não por medição sistemática (taxa de JSON válido, taxa de violação de regra, etc. ao longo de versões do prompt).
- **Superfície de prompt injection não tratada.** HTML de sites de terceiros (não controlados) é injetado diretamente no prompt em [workflow-b.json:40](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/n8n/workflow-b.json#L40), sem sanitização. Risco baixo hoje (o output só alimenta uma mensagem de prospecção), mas é o padrão exato que quebra sistemas mais críticos — vale internalizar o princípio agora: **texto de origem não confiável que entra num prompt cujo output aciona uma ação automatizada é sempre superfície de ataque.**

### 3.3 Infraestrutura e segurança

- Segredos com fallback hardcoded diretamente no código-fonte versionado, não só no `.env.example`: `EVOLUTION_API_KEY: 'changeme'` em [server.js:97](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/argus-ui/backend/server.js#L97) e em [test-e2e.js:146](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/test-e2e.js#L146); `POSTGRES_PASSWORD=postgres` fixo em [docker-compose.yml:81](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/docker-compose.yml#L81). Sem risco real hoje (tudo local), mas é hábito a corrigir antes de qualquer exposição externa.
- `n8n/db_temp.sqlite` (binário de estado interno do n8n) está commitado — deveria estar no `.gitignore`.
- `n8n/all-workflows-export.json` está vazio (0 bytes) — artefato quebrado/morto.

### 3.4 Documentação desatualizada em relação ao "as-built"

`docs/sprints.md` ainda descreve LM Studio (não Ollama), planilha Google Sheets para acompanhamento (não a UI kanban + Postgres que foi de fato construída) e envio via Instagram ativo. Nada disso é errado — o projeto evoluiu e pivotou bem — mas não há nenhum documento que descreva o estado atual real. Isso não é grave num projeto solo, mas é exatamente o hábito que separa "só codar" de "engenharia": manter um registro (mesmo curto) de por que cada pivô aconteceu.

---

## 4. Conhecimento necessário — avaliação via Taxonomia de Bloom

A taxonomia vai de **Lembrar → Entender → Aplicar → Analisar → Avaliar → Criar**. Para cada domínio de conhecimento que o projeto exige, abaixo está o nível que o código já demonstra (com evidência) e o próximo degrau a mirar.

| Domínio | Nível atual demonstrado (evidência) | Próximo nível-alvo | Como treinar isso |
|---|---|---|---|
| **Automação de scraping** (Puppeteer, anti-bot) | **Aplicar** — usa `puppeteer-extra` + `StealthPlugin`, trata CAPTCHA explicitamente ([scraper/index.js:76](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/scraper/index.js#L76)), navega card a card com delay de respeito | **Analisar** — hoje depende de seletores CSS frágeis (`.hfpxzc`, `DUwDvf`) que quebram a cada mudança do Google Maps sem aviso | Adicionar teste que roda o scraper semanalmente contra 1 busca fixa e alerta se `leads.length === 0` — transforma fragilidade silenciosa em falha visível |
| **Orquestração de workflows (n8n)** | **Aplicar** — 3 workflows encadeados via `executeWorkflow`, uso correto de `IF` nodes e branching | **Analisar** — não há tratamento do caso "Workflow B falha no meio" além do fallback local; falta visão de retry/dead-letter | Desenhar (só no papel) o que aconteceria se o Ollama caísse no meio de uma rodada de 50 leads — que estado cada lead fica? |
| **Prompt engineering** | **Analisar** — já decompõe a tarefa (bloco único gerado), varia prompt por nicho, define regras negativas explícitas (sem jargão, sem saudação) | **Avaliar** — falta medir objetivamente se uma mudança de prompt piora ou melhora o resultado | Construir um conjunto de 15-20 "casos de ouro" (HTML real + resultado esperado) e rodar contra eles a cada mudança de prompt, registrando taxa de acerto |
| **Confiabilidade de output de LLM (JSON/contratos)** | **Aplicar** — parsing defensivo com fallback em regex | **Analisar/Avaliar** — não usa JSON mode nativo do Ollama nem valida contra schema (ex.: JSON Schema / Zod) | Trocar regex-fallback por `format: "json"` no Ollama + validação com schema; comparar taxa de falha antes/depois |
| **Backend/API (Express + Postgres)** | **Aplicar** — BFF funcional, rotas REST simples, `pg.Pool` corretamente usado | **Analisar** — lógica de "quem envia a mensagem" está espalhada entre n8n (planejado) e Express (implementado), sem um dono único documentado | Escrever um diagrama de sequência simples do fluxo real "aprovar → enviar" e comparar com o que `docs/sprints.md` descreve |
| **Modelagem de dados / máquina de estados** | **Aplicar** — schema em [postgres-init.sql](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/postgres-init.sql) reflete bem os campos do domínio | **Entender→Aplicar** (gap, não déficit de nível) — os estados possíveis (`erro_copy`, `erro_parse`, `aguardando_aprovacao`...) não têm uma máquina de estados explícita nem transições documentadas | Desenhar o diagrama de estados do campo `status` e verificar se toda transição tem um caminho de saída |
| **Infra/containers (Docker Compose)** | **Aplicar** — 7 serviços orquestrados, healthchecks, rede compartilhada, volumes nomeados | **Analisar** — segredos hardcoded como fallback no próprio compose/código | Mover todo fallback de secret para exigir `.env` (falhar explicitamente se ausente, em vez de usar `changeme`) |
| **Segurança (superfície de ataque em sistemas com LLM)** | **Entender** — não há tratamento hoje, mas o projeto já expõe o padrão de risco (HTML externo → prompt → ação automatizada) | **Aplicar** | Ler sobre prompt injection em pipelines RAG/scraping e aplicar 1 mitigação simples (ex.: truncar/sanitizar antes de interpolar) |
| **Testes / avaliação sistemática** | **Aplicar**, mas de forma não reutilizável (11 scripts ad-hoc) | **Avaliar/Criar** — este é o maior salto de competência disponível no projeto agora | Consolidar os 11 scripts em 1 harness parametrizado com fixtures — ver task list |
| **Gestão de produto/processo** (sprints, DoD/DoR, backlog) | **Analisar** — já compara trade-offs explicitamente (tabela OSS vs Outscraper em [docs/sprints.md:158](https://github.com/gabrielfidos2020-glitch/Argus/blob/main/docs/sprints.md#L158)) | **Avaliar** — falta fechar o loop: comparar o que foi planejado vs o que foi de fato entregue e por quê pivotou | Fazer 1 retrospectiva curta (mesmo que só para ele) documentando os 3 principais desvios do plano original |

**Leitura geral:** ele já opera predominantemente em **Aplicar/Analisar** na maioria dos domínios técnicos — isso é avançado para quem está montando o primeiro sistema desse tipo. O salto de maior alavancagem agora não é "aprender mais tecnologia", é **Avaliar**: introduzir medição sistemática (evals, logs estruturados, retrospectiva) sobre decisões que hoje são tomadas por intuição e teste manual. É exatamente essa transição — de "funciona quando eu testei" para "eu meço que funciona" — que separa scripts pessoais de engenharia de sistemas de IA.

---

## 5. Task list sugerida

### Tier 1 — Correções funcionais (curto prazo, "fechar buracos")
1. Corrigir ou remover o roteamento para canal `instagram` em `workflow-a.json` (hoje ~metade dos leads com site são aprovados e nunca enviados, silenciosamente).
2. Dar uma saída para leads em `erro_copy`/`erro_parse`: no mínimo, cair no template estático (o mesmo já usado para leads sem site) em vez de ficar travado.
3. Implementar o cache por domínio em Workflow B, que já está no DoD do Sprint 2 e nunca foi feito.
4. Adicionar `n8n/*.sqlite` ao `.gitignore` e remover `db_temp.sqlite` do repositório; apagar `all-workflows-export.json` vazio ou regenerá-lo.

### Tier 2 — Confiabilidade do raciocínio (o maior ganho de competência)
5. Consolidar os 11 scripts de teste do `n8n/` em um único harness de avaliação com 15-20 casos fixos (HTML real salvo em disco), medindo: % JSON válido, % violação de regra de estilo, % severidade fora do enum.
6. Ativar `format: "json"` nas chamadas ao Ollama em vez de depender só de instrução textual + regex.
7. Adicionar 1 mitigação simples de prompt injection na filtragem de HTML (ex.: remover linhas que pareçam instrução para o modelo antes de truncar).

### Tier 3 — Observabilidade
8. Persistir cada chamada ao Ollama (prompt, resposta bruta, latência, sucesso/erro) em uma tabela própria — hoje só existe `console.log`, que se perde.
9. Padronizar timeout + retry com backoff nas chamadas HTTP entre serviços (scraper, ollama, evolution-api).

### Tier 4 — Segurança e higiene de repositório
10. Remover todos os fallbacks de secret hardcoded (`changeme`, `postgres/postgres`) do código versionado — exigir `.env` explicitamente.

### Tier 5 — Documentação viva
11. Criar `docs/arquitetura-atual.md` descrevendo o as-built real (Ollama, Postgres+UI kanban, Instagram descontinuado) — o `docs/sprints.md` vira histórico, não guia atual.
12. Registrar em 2-3 parágrafos por que cada pivô aconteceu (LM Studio→Ollama, Sheets→Postgres, remoção do Instagram) — não precisa ser um ADR formal, só o "porquê" por escrito.

### Tier 6 — Evolução de competência (nível Criar)
13. Depois de estabilizado o Tier 1-2, generalizar o padrão de guardrail já usado em Workflow C (validação pós-LLM) para Workflow B também — hoje só C tem validador.
14. Fazer uma retrospectiva curta comparando `docs/sprints.md` vs o que foi entregue — exercício de metacognição que fecha o ciclo planejar→construir→avaliar.
