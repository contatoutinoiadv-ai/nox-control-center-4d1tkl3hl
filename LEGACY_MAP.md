# LEGACY_MAP.md — Mapeamento e Rastreabilidade Completa (Legado centraln.html → NOX Control Center)

> **Documento de Auditoria e Rastreabilidade Arquitetural**  
> **Referência:** `centraln.html` (versão sanitizada)  
> **Sistema Alvo:** NOX Control Center & Suíte Sentinela NOX (React + Vite + TypeScript + Tailwind/shadcn + PocketBase/Skip Cloud)  
> **Política de Segurança:** Isolamento estrito de tokens/chaves no frontend, proteção contra Prompt Injection, imunização contra CSV Formula Injection, presunção de dados como texto inerte e cadeia de custódia imutável (SHA-256).

---

## 1. Visão Geral e Princípios de Migração

O sistema legado `centraln.html` operava como uma Single-Page Application (SPA) monolítica em HTML/JavaScript vanilla com persistência direta no `localStorage` do navegador e integrações pontuais com proxies PHP (`central_api.php`, `gemini_proxy.php`, `anthropic_proxy.php`, `gcal_proxy.php`) e chamadas diretas a APIs externas.

Na arquitetura **NOX Control Center**, a operação jurídica e a suíte **Sentinela NOX** foram elevadas a um padrão corporativo auditável:

1. **Núcleo Jurídico Preservado e Blindado:** Fluxo de Ingestão (`CAPTURADA` → `VALIDADA` → `VINCULADA` → `ANALISADA` → `REVISAO_HUMANA` → `PRAZO_TAREFA_AGENDA` → `CONCLUIDA`), Motor de Verdade Temporal com memorial passo a passo e Trilha de Custódia.
2. **Módulos Opcionais / Fora do Núcleo:** Módulos de gestão empresarial (Contabilidade, Assistência Técnica, Faturamentos MEI, Ideias, Dominus e Rotinas Administrativas) são mapeados sem poluir a operação jurídica principal, mantendo contratos limpos e prontos para expansão ou isolamento departamental.
3. **Segurança Crítica:** Eliminação total de chaves de API (`PET_AKEY`, `x-api-key`, Gemini/Anthropic) no bundle do cliente.

---

## 2. Matriz de Rastreabilidade Função a Função

### Domínios NOX Alvo:

- `sentinela-ingestion`: Ingestão, captura e busca DJEN/PJe
- `sentinela-triage`: Triagem, classificação, métricas visuais e urgência
- `case-intelligence`: Análise individual com IA, Oráculo NOX e histórico
- `deadline-engine`: Calculadora de prazos, regras CPC/CLT/CPP e feriados TJMS/nacionais
- `agenda`: Agenda sincronizada, audiências, compromissos e integração .ICS
- `tasks`: Gestão de tarefas, checklists e subtarefas operacionais
- `workflow-orchestrator`: Automações QUANDO/SE/ENTÃO, motor de análise e sala de situação
- `documents-ai`: Gerador de peças, petições, modelos e exportação DOCX
- `clients-crm`: CRM contábil, intake de clientes e dominus onboarding
- `audit-evidence`: Cadeia de custódia, logs imutáveis e hashes SHA-256
- `analytics`: Radar de saúde operacional, KPIs executivos e gêmeo operacional
- `integrations`: Adapters para ComunicaAPI, Google Calendar, Outlook e LLMs via backend

---

### MÓDULO 1: NAVEGAÇÃO, AUTENTICAÇÃO E PERFIS

| Função / Identificador Legado | Domínio NOX Destino                   | Status       | Contrato / Implementação NOX                                                             | Teste / Cobertura                               |
| :---------------------------- | :------------------------------------ | :----------- | :--------------------------------------------------------------------------------------- | :---------------------------------------------- |
| `sv(v)`                       | `workflow-orchestrator` / `analytics` | Implementado | Roteamento React Router (`src/App.tsx`, `src/components/Layout.tsx`) cobrindo as 9 telas | Navegação SPA sem reload, preservação de estado |
| `PERFIS`                      | `workflow-orchestrator`               | Implementado | RBAC e permissões de operador / advogado / gestor em `dataStore` / `Layout.tsx`          | Validação de perfil e visualização restrita     |
| `aplicarPerfil(perfil, nome)` | `workflow-orchestrator`               | Implementado | `NoxDataStore.saveSettings` e metadados de sessão em `Layout.tsx`                        | Alternância de perfil e auditoria de ações      |
| `ABA_IDS`                     | `workflow-orchestrator`               | Implementado | Mapeamento de rotas e menus laterais no `Layout.tsx`                                     | Verificação de rotas ativas e breadcrumbs       |
| `iniciarComPerfil()`          | `workflow-orchestrator`               | Implementado | Sessão gerenciada pelo cliente PocketBase (`src/lib/pocketbase/client.ts`)               | Auth state listener                             |

---

### MÓDULO 2: DASHBOARD EXECUTIVO & RADAR DE SAÚDE

| Função / Identificador Legado    | Domínio NOX Destino | Status       | Contrato / Implementação NOX                                                           | Teste / Cobertura                                   |
| :------------------------------- | :------------------ | :----------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `loadDash()`                     | `analytics`         | Implementado | `NoxDataStore.getStats()` & `NoxDataStore.getDailyBriefing()` em `src/pages/Index.tsx` | Teste de carga de estatísticas consolidadas         |
| `renderBizCards()`               | `analytics`         | Implementado | Cards de visão geral dos negócios (Advocacia, Oráculo NOX, Prazos) em `Index.tsx`      | Verificação de contadores e status visual           |
| `renderRadar()`                  | `analytics`         | Implementado | `MiniRadar.tsx` e radar multidimensional em `src/pages/RadarPage.tsx`                  | Eixos Volume, Prazos, Ideias, Fiscal/OS, Tarefas    |
| `renderAgendaDia()`              | `agenda`            | Implementado | Briefing diário com compromissos e audiências em `SentinelaPage.tsx` e `Index.tsx`     | Teste de filtragem por data atual                   |
| `renderAlertas()`                | `analytics`         | Implementado | Alertas de anomalia, prazos fatais e divergências em `Index.tsx` e `RadarPage.tsx`     | Classificação por severidade (crítico, alto, médio) |
| `concluirAg(id)`                 | `agenda`            | Implementado | `NoxDataStore.updateAgendaEvent` com status `REALIZADO` / `CONCLUIDO`                  | Auditoria de conclusão de compromisso               |
| `dashExecRender()`               | `analytics`         | Implementado | Renderização consolidada do painel executivo em `src/pages/Index.tsx`                  | Sincronização em tempo real                         |
| `dashRenderAlertaBar()`          | `analytics`         | Implementado | Faixa de alertas consolidados (prazos <= 3d, audiências, publicações urgentes)         | Alerta dinâmico e banner verde quando em dia        |
| `dashRenderKPIs()`               | `analytics`         | Implementado | Grid de 4 KPIs no topo do dashboard com status crítico/seguro                          | Validação de limites e cores                        |
| `dashRenderRotinasHoje()`        | `tasks`             | Implementado | Lista de rotinas e tarefas com vencimento hoje em `Index.tsx`                          | Indicador visual de atraso                          |
| `dashRenderAudienciasProximas()` | `agenda`            | Implementado | Tabela de audiências dos próximos 30 dias com badge de contagem regressiva             | Ordenação cronológica e destaque <= 1 dia           |

---

### MÓDULO 3: ADVOCACIA, INTAKE, PIPELINE & DOCUMENTOS

| Função / Identificador Legado         | Domínio NOX Destino               | Status       | Contrato / Implementação NOX                                                              | Teste / Cobertura                                  |
| :------------------------------------ | :-------------------------------- | :----------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `advTab(t)`                           | `workflow-orchestrator`           | Implementado | Sub-abas na Central de Prazos (`CentralPrazosPage.tsx`) e Sentinela (`SentinelaPage.tsx`) | Alternância fluida de abas sem perda de formulário |
| `loadAdv()`                           | `case-intelligence`               | Implementado | `NoxDataStore.getRecords()` em `src/pages/ProcessesPage.tsx`                              | Listagem de processos com filtros                  |
| `renderGovBar()`                      | `analytics`                       | Implementado | Indicadores de governança (casos ativos vs críticos) em `ProcessesPage.tsx`               | Validação de threshold <= 5 dias                   |
| `renderBuffer()`                      | `deadline-engine`                 | Implementado | Buffer de prazo ativo (garantia D-2) no `DeadlineCalculatorView.tsx`                      | Cálculo de prazo interno vs prazo fatal            |
| `renderPipeline()`                    | `tasks` / `workflow-orchestrator` | Implementado | Kanban e esteira de fases processuais em `ProcessesPage.tsx`                              | Transição de fases com trilha de auditoria         |
| `renderAdvAlertas()`                  | `case-intelligence`               | Implementado | Alertas de risco processual e prazos no `ProcessDetailDrawer.tsx`                         | Verificação de alertas por processo                |
| `loadIntake()`                        | `clients-crm`                     | Implementado | Ingestão e triagem de novos clientes em `src/pages/ImportsPage.tsx`                       | Validação de dados cadastrais                      |
| `intakeFilter(el, f)`                 | `clients-crm`                     | Implementado | Filtros por área (Cível, Trabalhista, Consumidor, Bancário)                               | Filtragem dinâmica reativa                         |
| `renderIntake()`                      | `clients-crm`                     | Implementado | Tabela e cards de novos atendimentos                                                      | Visualização com badges de status                  |
| `abrirIntakeDet(id)`                  | `clients-crm`                     | Implementado | Drawer de detalhes do caso / atendimento                                                  | Exibição de histórico e qualificação               |
| `mudarStatusIntake(id, st)`           | `clients-crm`                     | Implementado | Transição de status do intake com log de auditoria                                        | Registro de ator e timestamp                       |
| `gerarDocs(id, nome)`                 | `documents-ai`                    | Implementado | Geração automatizada de procuração, declaração de hipossuficiência e contratos            | Substituição de variáveis no cliente               |
| `gdocAplicarVariaveis(corpo, r)`      | `documents-ai`                    | Implementado | Parser de interpolação segura `{CLIENTE}`, `{CPF}`, `{ENDERECO}`, `{DATA}`                | Sanitização contra injection                       |
| `gtplCarregarLista()`                 | `documents-ai`                    | Implementado | Catálogo de templates jurídicos padronizados                                              | Listagem de modelos por área                       |
| `gtplNovoTemplate()` / `gtplSalvar()` | `documents-ai`                    | Implementado | Criação e salvamento de templates                                                         | Validação de campos obrigatórios                   |
| `gtplExcluir(id, nome)`               | `documents-ai`                    | Implementado | Remoção segura de template                                                                | Confirmação de segurança                           |
| `gtplInserirVar(variavel)`            | `documents-ai`                    | Implementado | Inserção de marcadores contextuais no editor                                              | Posicionamento de cursor                           |
| `gtplUploadDocx(input)`               | `documents-ai`                    | Implementado | Ingestão de arquivos `.docx` para conversão em modelo                                     | Parser de documento                                |
| `gdocImprimir()`                      | `documents-ai`                    | Implementado | Impressão e exportação de documento formatado                                             | CSS print stylesheet                               |
| `openAdvModal(mode, etapa)`           | `case-intelligence`               | Implementado | Modal de criação/edição de caso jurídico                                                  | Formulário controlado                              |
| `editCaso(id)` / `saveAdv()`          | `case-intelligence`               | Implementado | Atualização de processo em `NoxDataStore.updateRecordDetails`                             | Log em `AuditPage.tsx`                             |

---

### MÓDULO 4: CALCULADORA DE PRAZOS & TJMS 2026

| Função / Identificador Legado      | Domínio NOX Destino   | Status       | Contrato / Implementação NOX                                                       | Teste / Cobertura                                    |
| :--------------------------------- | :-------------------- | :----------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `pzInitDates()`                    | `deadline-engine`     | Implementado | Inicialização de datas atuais e marcos processuais em `DeadlineCalculatorView.tsx` | Formato ISO e D-0                                    |
| `pzCalc1()`                        | `deadline-engine`     | Implementado | `calculateLegalDeadline` em `src/services/deadlineEngine.ts`                       | CPC (dias úteis), CPP/CLT, feriados                  |
| `pzGetComarca()`                   | `deadline-engine`     | Implementado | Seleção de Comarcas do TJMS e Tribunais Federais/Trabalhistas                      | Mapeamento comarcas MS + capitais                    |
| `pzIsSusp(d)`                      | `deadline-engine`     | Implementado | `getHolidayOrSuspension` em `src/services/deadlineEngine.ts`                       | Checagem de feriados nacionais e TJMS 2025/2026/2027 |
| `pzAddUteisComMemorial(d, n)`      | `deadline-engine`     | Implementado | Geração do array `calculationSteps` com memorial auditável                         | Contagem de dias úteis e pulados                     |
| `pzRenderMemorial(pulados, fatal)` | `deadline-engine`     | Implementado | Componente `Memorial Explicável Oficial` em `DeadlineCalculatorView.tsx`           | Explicação jurídica passo a passo                    |
| `pzFmtKey(d)`                      | `deadline-engine`     | Implementado | `formatDateIso` em `src/services/deadlineEngine.ts`                                | Formatação `YYYY-MM-DD`                              |
| `pzSubTab(t)`                      | `deadline-engine`     | Implementado | Alternância entre Memorial Oficial e Simulador Hipotético ("E Se?")                | Isolamento de cenário de simulação                   |
| `pzToggleArt(hd)`                  | `deadline-engine`     | Implementado | Acordeão de fundamentação legal do CPC/Regimento                                   | Exibição de artigos aplicáveis                       |
| `pzImportPDF(input)`               | `deadline-engine`     | Implementado | Ingestão de texto de diário/PDF para extração de publicações                       | Sanitização contra injection                         |
| `pzGetTipos()`                     | `deadline-engine`     | Implementado | `LEGAL_RULES_PRESETS` (Contestação 15d, Apelação 15d, Agravo 15d, ED 5d, etc.)     | Presets CPC/CLT                                      |
| `pzParsePublicacoes(text)`         | `sentinela-ingestion` | Implementado | Parser regex para extração de processo, data, partes, classe e teor                | Extração de metadados                                |
| `pzRenderPubs(pubs)`               | `sentinela-triage`    | Implementado | Lista de publicações parseadas com botão de cálculo inline                         | Renderização rápida                                  |
| `pzCalcPub(i)`                     | `deadline-engine`     | Implementado | Cálculo de prazo inline contextualizado                                            | Feedback imediato                                    |
| `pzDataLimiteManual(i, val)`       | `deadline-engine`     | Implementado | Sobrescrita manual com justificativa obrigatória                                   | Registro na Cadeia de Custódia                       |
| `pzVerTeor(i)`                     | `case-intelligence`   | Implementado | Modal/Drawer de visualização integral do teor                                      | Sanitização de HTML                                  |
| `PZ_TJMS_TODAS` / `PZ_NOMES`       | `deadline-engine`     | Implementado | `BRAZILIAN_HOLIDAYS_AND_SUSPENSIONS` em `deadlineEngine.ts`                        | Tabela completa 2026/2027 TJMS                       |

---

### MÓDULO 5: PIPELINE DE PRAZOS & PIPELINE DE PRODUÇÃO

| Função / Identificador Legado | Domínio NOX Destino         | Status       | Contrato / Implementação NOX                                     | Teste / Cobertura                      |
| :---------------------------- | :-------------------------- | :----------- | :--------------------------------------------------------------- | :------------------------------------- |
| `pzpList` / `pzpSave()`       | `deadline-engine` / `tasks` | Implementado | `NoxDataStore.getCommunications()` + `NoxDataStore.getTasks()`   | Persistência reativa e sincronizada    |
| `pzpDiasRestantes(dtStr)`     | `deadline-engine`           | Implementado | Cálculo de delta de dias entre hoje e a data fatal               | Retorno numérico exato                 |
| `pzpUrgClass(dias)`           | `sentinela-triage`          | Implementado | Badges de urgência: Crítico (<=3d), Semana (<=7d), Em Dia (>7d)  | Classes visuais e animação de pulso    |
| `loadPzPipeline()`            | `deadline-engine`           | Implementado | Visão Kanban de prazos em `CentralPrazosPage.tsx`                | Categorização por urgência             |
| `pzpConcluir(i)`              | `tasks`                     | Implementado | `NoxDataStore.updateTask` (status `CONCLUIDA`)                   | Conclusão de prazo com log             |
| `pzpRemover(i)`               | `tasks`                     | Implementado | Arquivamento auditado de item                                    | Trilha de auditoria                    |
| `pzpMoverProducao(i)`         | `workflow-orchestrator`     | Implementado | Transição de Prazo homologado para Tarefa de Produção            | Sincronização automática               |
| `pzpAdicionarDePub(pub)`      | `workflow-orchestrator`     | Implementado | Conversão direta de publicação DJEN em caso/prazo                | Vínculo de hash e id                   |
| `openPzpModal()`              | `deadline-engine`           | Implementado | Modal de cadastro manual de prazo com memorial                   | Validação de marco inicial             |
| `prodList` / `prodSave()`     | `tasks`                     | Implementado | Fila de elaboração de peças e petições                           | Persistência em store                  |
| `loadProducao()`              | `tasks`                     | Implementado | Kanban de Produção (A Fazer, Em Andamento, Revisão, Protocolado) | Métricas de peças atrasadas e no prazo |
| `prodMover(i, dir)`           | `tasks`                     | Implementado | Avanço de etapa no Kanban de produção                            | Atualização de estágio                 |
| `prodRemover(i)`              | `tasks`                     | Implementado | Remoção com confirmação                                          | Auditoria                              |
| `openProdModal()`             | `tasks`                     | Implementado | Modal de criação de peça no pipeline de produção                 | Atribuição de responsável              |

---

### MÓDULO 6: SENTINELA NOX (DJEN / COMUNICAÇÃO DE PUBLICAÇÕES) — MÓDULO CENTRAL

| Função / Identificador Legado               | Domínio NOX Destino     | Status       | Contrato / Implementação NOX                                                                                                                          | Teste / Cobertura                          |
| :------------------------------------------ | :---------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| `djenInit()`                                | `sentinela-ingestion`   | Implementado | Inicialização do módulo Sentinela com datas padrão de hoje e conexão ativa                                                                            | Setup de estado e conectividade            |
| `djenAplicarModo()`                         | `sentinela-ingestion`   | Implementado | Alternância entre modos de busca: OAB como âncora principal (Higor Utinói OAB/MS 15.400), Nome da Parte, Número de Processo                           | Bloqueio/liberação de campos conforme modo |
| `djenVerificarConexao()`                    | `integrations`          | Implementado | Verificação de conectividade com `comunicaapi.pje.jus.br` e fallback seguro                                                                           | Indicador visual de status de gateway      |
| `djenBuscarHoje()`                          | `sentinela-ingestion`   | Implementado | Atalho de busca rápida para data atual                                                                                                                | Preenchimento e execução de busca          |
| `djenLimparFiltros()`                       | `sentinela-ingestion`   | Implementado | Reset de filtros e retorno aos parâmetros padrão                                                                                                      | Limpeza de formulário                      |
| `djenMontarParams(pagina)`                  | `sentinela-ingestion`   | Implementado | Construtor de parâmetros com `itensPorPagina=100`, `meio=D`, `numeroOab`, `ufOab`, `siglaTribunal`, `dataInicio`/`Fim`                                | `PjeApiQueryParams` em `adapters.ts`       |
| `djenBuscar(pagina)`                        | `sentinela-ingestion`   | Implementado | Consulta segura à API PJe/DJEN com loading e sanitização anti-prompt-injection                                                                        | Paginação e tratamento de erros            |
| `djenLocalPag(pag)`                         | `sentinela-triage`      | Implementado | Paginação local de 10 em 10 itens na tela independente do lote da API                                                                                 | Navegação fluida em memória                |
| `djenRenderizarPagina()`                    | `sentinela-triage`      | Implementado | Renderização da fatia ativa de publicações                                                                                                            | Renderização de cards com status           |
| `djenAtualizarBarraPag()`                   | `sentinela-triage`      | Implementado | Barra de paginação com setas anterior/próxima, números e indicador "Carregar Tudo"                                                                    | Controles de paginação dupla               |
| `djenPagIr(pagina)`                         | `sentinela-ingestion`   | Implementado | Busca de próxima página no servidor da API                                                                                                            | Carga paginada remota                      |
| `djenCarregarTudo()`                        | `sentinela-ingestion`   | Implementado | Carregamento progressivo de todas as páginas da API com barra de progresso                                                                            | Loop assíncrono com feedback               |
| `djenAtualizarMetricas()`                   | `sentinela-triage`      | Implementado | 5 cards de métricas com sparkbars visuais: Total, Citações, Intimações, Urgentes, Analisadas                                                          | Gráficos sparkline em CSS/Tailwind         |
| `djenAtualizarBadge()`                      | `sentinela-triage`      | Implementado | Badge com contagem de urgências não agendadas no cabeçalho                                                                                            | Atualização de contadores                  |
| `djenFiltrarTipo(tipo)`                     | `sentinela-triage`      | Implementado | Filtragem rápida por Citações, Intimações ou Analisadas                                                                                               | Filtro reativo instantâneo                 |
| `djenFiltrarUrgente()`                      | `sentinela-triage`      | Implementado | Filtro exclusivo para publicações com urgência alta                                                                                                   | Filtro de emergência                       |
| `djenRenderizar(lista)`                     | `sentinela-triage`      | Implementado | Cards detalhados de publicação com cores por tipo (azul citação, dourado intimação, vermelho urgência)                                                | Card visual responsivo                     |
| `djenToggleCard(id)`                        | `sentinela-triage`      | Implementado | Expansão/recolhimento do teor completo da publicação                                                                                                  | Acordeão com preservação de estado         |
| `djenAbrirNox(id)`                          | `case-intelligence`     | Implementado | Abertura do painel lateral NOX com banner de urgência, countdown, ação necessária, resumo e grid                                                      | Split view com painel lateral              |
| `djenFecharNox()`                           | `case-intelligence`     | Implementado | Fechamento do painel lateral e retorno à visualização completa                                                                                        | Transição fluida de layout                 |
| `djenMostrarNox(id, an, item)`              | `case-intelligence`     | Implementado | Preenchimento dinâmico do painel lateral com metadados estruturados da IA                                                                             | Grid de detalhes e botões de ação          |
| `djenAbrirItem(id)` / `djenFecharAnalise()` | `case-intelligence`     | Implementado | Métodos de compatibilidade de abertura e fechamento                                                                                                   | Wrappers compatíveis                       |
| `djenAnalisarNOX(id, silencioso)`           | `case-intelligence`     | Implementado | Análise por IA via backend seguro retornando JSON estruturado (`urgencia`, `tipo_ato`, `prazo_dias_uteis`, `data_fatal`, `resumo`, `acao_necessaria`) | Parser JSON e proteção contra injeção      |
| `djenEnviarPipeline(id)`                    | `workflow-orchestrator` | Implementado | Criação de caso jurídico no pipeline a partir de publicação analisada                                                                                 | Vínculo de processo e partes               |
| `djenCriarTarefa(id)`                       | `tasks`                 | Implementado | Criação automática de tarefa no módulo de tarefas sincronizada                                                                                        | Prevenção de duplicatas                    |
| `djenAgendarFatal(id)`                      | `agenda`                | Implementado | Agendamento do vencimento fatal diretamente na Agenda Operacional                                                                                     | Criação de evento tipo `VENCIMENTO_PRAZO`  |
| `djenEnviarTudoAgenda()`                    | `workflow-orchestrator` | Implementado | Agendamento em lote de todos os prazos calculados e urgentes                                                                                          | Processamento em lote com toast            |
| `djenAnalisarTodos()`                       | `case-intelligence`     | Implementado | Análise sequencial em lote com barra de progresso e envio automático para a agenda                                                                    | Execução assíncrona tolerante a falhas     |
| `djenFmtData(s)` / `djenTruncar(s, n)`      | `case-intelligence`     | Implementado | Funções utilitárias de formatação de datas e corte seguro de texto                                                                                    | Utilitários em `src/lib/utils.ts`          |
| `snCalcExecutar(id)`                        | `deadline-engine`       | Implementado | Execução do cálculo inline com memorial por publicação                                                                                                | Cálculo isolado por card                   |
| `snCalcMostrarResultado(...)`               | `deadline-engine`       | Implementado | Exibição visual do resultado (data fatal, dias restantes coloridos, memorial de feriados)                                                             | Grid de resultado inline                   |
| `snCalcComNOX(id, proc, tipo)`              | `deadline-engine`       | Implementado | Sugestão automática de prazo pela IA e aplicação direta no cálculo inline                                                                             | Integração IA + Motor de Prazo             |
| `snCalcAgendar(id, proc, tipo)`             | `agenda`                | Implementado | Agendamento do prazo calculado inline diretamente na agenda                                                                                           | Inserção de evento no store                |
| `djenAbrirGerencial()`                      | `case-intelligence`     | Implementado | Abertura do painel de chat gerencial com contexto total (ORÁCULO NOX)                                                                                 | Painel gerencial e histórico               |
| `djenFecharGerencial()`                     | `case-intelligence`     | Implementado | Fechamento do painel gerencial                                                                                                                        | Reset de layout                            |
| `snGerMontarContexto()`                     | `case-intelligence`     | Implementado | Montagem de prompt estruturado com resumo quantitativo, tribunais, analisadas e pendentes                                                             | Agregação contextual                       |
| `snGerAnaliseInicial()`                     | `case-intelligence`     | Implementado | Análise gerencial automática disparada ao abrir o painel                                                                                              | Diagnóstico executivo inicial              |
| `snGerEnviar()` / `snGerPergunta()`         | `case-intelligence`     | Implementado | Chat interativo com o Oráculo NOX sobre a base de publicações                                                                                         | Mensagens de usuário e respostas IA        |
| `snGerAdicionarMensagem(tipo, txt)`         | `case-intelligence`     | Implementado | Inserção de bolha de chat com formatação forense                                                                                                      | Interface de conversação                   |
| `snGerFormatarResposta(texto)`              | `case-intelligence`     | Implementado | Formatação markdown (negrito, listas, tópicos)                                                                                                        | Renderização segura                        |
| `snGerChamarAPI(prompt, label)`             | `integrations`          | Implementado | Envio de mensagens ao backend seguro de IA                                                                                                            | Chamada via adapter seguro                 |
| `snGerLimpar()`                             | `case-intelligence`     | Implementado | Limpeza do histórico de conversa                                                                                                                      | Reset de chat                              |
| `snDecodeHTML(h)`                           | `sentinela-triage`      | Implementado | Decodificação segura de entidades HTML                                                                                                                | Sanitização                                |
| `snStatusUI()`                              | `sentinela-triage`      | Implementado | Habilitação/desabilitação de botões de exportação                                                                                                     | Reatividade                                |
| `snCompletar()`                             | `sentinela-ingestion`   | Implementado | Garantia de que todas as páginas foram carregadas antes de exportar                                                                                   | Sincronizador de exportação                |
| `snExportarMarkdown()`                      | `documents-ai`          | Implementado | Exportação de relatório completo em Markdown para chat ou documentação                                                                                | Download de arquivo `.md`                  |
| `snExportarCSV()`                           | `audit-evidence`        | Implementado | Exportação CSV com imunização contra Formula Injection (`sanitizeCsvField`)                                                                           | Sanitização de `=,+,-,@`                   |

---

### MÓDULO 7: AUDIÊNCIAS, AGENDA & ROTINAS

| Função / Identificador Legado               | Domínio NOX Destino   | Status       | Contrato / Implementação NOX                                          | Teste / Cobertura                    |
| :------------------------------------------ | :-------------------- | :----------- | :-------------------------------------------------------------------- | :----------------------------------- |
| `audLoadFromAPI()` / `audGetList()`         | `agenda`              | Implementado | `NoxDataStore.getAgendaEvents()` filtrado por `eventType: AUDIENCIA`  | Leitura de eventos de audiência      |
| `audDiasRestantes(dtStr)`                   | `agenda`              | Implementado | Cálculo de proximidade da audiência com destaque para HOJE / D-1      | Alerta de proximidade                |
| `audFmt(dtStr)`                             | `agenda`              | Implementado | Formatação de data em padrão brasileiro DD/MM/AAAA                    | Formatação consistente               |
| `loadAudiencias()` / `loadAudiencias2()`    | `agenda`              | Implementado | Renderização de audiências na Agenda e na aba Advocacia               | Exibição de link virtual/sala        |
| `audToggleComm(id, campo, val)`             | `agenda`              | Implementado | Atualização de flags de comunicação e preparação de audiência         | Metadados operacionais               |
| `audRealizar(id)`                           | `agenda`              | Implementado | Marcação de audiência como realizada com log de auditoria             | Atualização de status                |
| `audExcluir(id)`                            | `agenda`              | Implementado | Remoção auditada de audiência                                         | Confirmação e trilha                 |
| `audSalvarNova()`                           | `agenda`              | Implementado | Cadastro de nova audiência via modal                                  | Validação de data/hora/processo      |
| `audImportXLSX(input)`                      | `sentinela-ingestion` | Implementado | Ingestão em massa de audiências via planilha                          | Parser tabular em `ImportsPage.tsx`  |
| `ROT_DEFAULTS` / `rotGetCadastros()`        | `tasks`               | Implementado | Rotinas operacionais recorrentes (DJe diário, conferência semanal)    | Seed de rotinas padrão               |
| `rotGetMesKey()` / `rotGerarMes()`          | `tasks`               | Implementado | Geração de ciclo mensal de rotinas                                    | Fechamento de competência            |
| `rotMarcar(idx, status)`                    | `tasks`               | Implementado | Check/uncheck de rotina com status feito/atrasado                     | Atualização de checklist mensal      |
| `loadRotinas()` / `renderRotList()`         | `tasks`               | Implementado | Painel de controle de rotinas por área (advocacia/geral)              | Indicador visual de pendência        |
| `rotExcluir(i)` / `rotSalvarNova()`         | `tasks`               | Implementado | Gestão de templates de rotina                                         | Cadastro e exclusão                  |
| `tarGet()` / `tarSave()`                    | `tasks`               | Implementado | `NoxDataStore.getTasks()` e `NoxDataStore.saveTasks()`                | Persistência unificada               |
| `tarFiltro(neg, st)`                        | `tasks`               | Implementado | Filtro por status (todas, pendente, andamento, concluida)             | Reatividade do Kanban                |
| `renderTarefas()` / `renderTarefasGeral()`  | `tasks`               | Implementado | Componente `TasksView.tsx`                                            | Visualização Lista e Kanban          |
| `tarMudarSt(id, st)`                        | `tasks`               | Implementado | Atualização de status da tarefa                                       | Log de auditoria                     |
| `tarExcluir(id)` / `tarSalvarNova()`        | `tasks`               | Implementado | Operações CRUD de tarefas em `TasksView.tsx`                          | Modal controlado com subtarefas      |
| `renderAtendimentos()` / `atendSalvar()`    | `clients-crm`         | Implementado | Gestão de compromissos de atendimento ao cliente                      | Integração com Agenda                |
| `loadGcalParaAgenda()`                      | `integrations`        | Implementado | `SafeCalendarAdapter.syncGoogleCalendar` em `adapters.ts`             | Sincronização e exportação .ICS      |
| `loadAgenda()` / `renderCal()` / `calNav()` | `agenda`              | Implementado | Visualizações Mensal, Semanal, Diária e Timeline em `AgendaView.tsx`  | Navegação de meses e dias            |
| `saveAg()` / `concAg()` / `excluirAg()`     | `agenda`              | Implementado | Operações de ciclo de vida de compromissos em `AgendaView.tsx`        | Diálogo modal com validação          |
| `importAgXLSX(input)`                       | `sentinela-ingestion` | Implementado | Ingestão de compromissos via arquivo tabular                          | Parser com normalização de data/hora |
| `normData(v)` / `normHora(v)`               | `sentinela-ingestion` | Implementado | Normalização robusta de formatos de data/hora (ISO, BR, serial Excel) | Sanitização de tipos                 |

---

### MÓDULO 8: PETIÇÕES IA (MÓDULO v2) & GERAÇÃO DE PEÇAS

| Função / Identificador Legado                       | Domínio NOX Destino | Status                                  | Contrato / Implementação NOX                                                                      | Teste / Cobertura                 |
| :-------------------------------------------------- | :------------------ | :-------------------------------------- | :------------------------------------------------------------------------------------------------ | :-------------------------------- |
| `petInit()` / `petTab(t)`                           | `documents-ai`      | Implementado                            | Gerenciamento de abas: Nova Peça, Configurar IA, Ver Rascunhos                                    | Navegação interna                 |
| `petModo(m)`                                        | `documents-ai`      | Implementado                            | Alternância entre Arquitetura de Tese (diagnóstico) e Rascunho Completo                           | Seleção de modo de redação        |
| `petAtualizarTipos()`                               | `documents-ai`      | Implementado                            | Tipos de peças por área (Cível, Criminal, Trabalhista, Consumidor, Família)                       | `PET_TIPOS` sincronizado          |
| `petSalvarKey(v)` / `petToggleKey()`                | `integrations`      | **RECONCILIADO / REMOVIDO DO FRONTEND** | Removido do client-side por violação de segurança. Chaves configuradas via backend `ENV_GUIDE.md` | Proteção de credenciais           |
| `petSalvarSysPrompt()`                              | `documents-ai`      | Implementado                            | Prompt do sistema do escritório Higor Utinói OAB/MS 15.400 configurável                           | Preservação de teses e estilos    |
| `petCarregarArquivo(slot, input)`                   | `documents-ai`      | Implementado                            | Ingestão de documentos do caso (PDF/DOCX/imagem) para contexto                                    | Leitura segura e truncamento      |
| `petRemoverArquivo(slot)`                           | `documents-ai`      | Implementado                            | Limpeza do arquivo anexado                                                                        | Reset de slot                     |
| `petGerar()`                                        | `documents-ai`      | Implementado                            | Redação jurídica estruturada com IA via backend seguro                                            | Streaming e tratamento de timeout |
| `petCopiar()` / `petSalvar()`                       | `documents-ai`      | Implementado                            | Cópia para clipboard e arquivamento em rascunhos                                                  | Feedback via Sonner toast         |
| `petLimparOutput()` / `petLimparForm()`             | `documents-ai`      | Implementado                            | Limpeza de tela e formulário                                                                      | Reset de estado                   |
| `petBaixarWord()` / `petGerarDocxZip()`             | `documents-ai`      | Implementado                            | Geração de documento DOCX nativo com margens ABNT e cabeçalho formal                              | Download de `.docx` formatado     |
| `petGetLista()` / `petRenderSide()`                 | `documents-ai`      | Implementado                            | Fila lateral de rascunhos gerados                                                                 | Listagem de histórico             |
| `petAbrirRascunho(idx)` / `petExcluirRascunho(idx)` | `documents-ai`      | Implementado                            | Visualização e exclusão de rascunhos                                                              | Gestão de histórico               |
| `SYS_PADRAO`                                        | `documents-ai`      | Implementado                            | Prompt de sistema institucional (TJMS, presunção hipossuficiência, danos morais min. 10 salários) | Template institucional            |

---

### MÓDULO 9: CONTROLE DE PRODUÇÃO, MOTOR AUTÔNOMO & ORÁCULO

| Função / Identificador Legado                | Domínio NOX Destino     | Status       | Contrato / Implementação NOX                                                      | Teste / Cobertura                     |
| :------------------------------------------- | :---------------------- | :----------- | :-------------------------------------------------------------------------------- | :------------------------------------ |
| `cpSubTab(t)`                                | `workflow-orchestrator` | Implementado | Sub-painéis de controle (geral, histórico, fichas, motor, oráculo, gestão)        | Navegação de controle                 |
| `loadControle()`                             | `analytics`             | Implementado | Carga agregada de produções, prazos e métricas                                    | Dashboard consolidado                 |
| `_calcStatus(item)`                          | `tasks`                 | Implementado | Semáforo de prazo: Verde (concluído/no prazo), Amarelo (D-2), Vermelho (atrasado) | Regra de SLA interno                  |
| `_renderCpItem(item, tipo)`                  | `tasks`                 | Implementado | Renderização de card de produção com responsável e status                         | Exibição padronizada                  |
| `renderCpGeral()` / `renderCpHist()`         | `analytics`             | Implementado | Visão geral e histórico dos últimos 30 dias de produção jurídica                  | Histórico de entregas                 |
| `renderCpFichas()`                           | `analytics`             | Implementado | Carga de trabalho por membro da equipe (Dr. Higor, assessores)                    | Gêmeo Operacional (`OperationalTwin`) |
| `marcarConcluido(id, tipo)`                  | `tasks`                 | Implementado | Protocolo e conclusão de peça                                                     | Trilha de auditoria                   |
| `executarMotor()`                            | `workflow-orchestrator` | Implementado | Motor de análise autônomo com passos animados de auditoria                        | Barra de progresso e log              |
| `loadMotorLog()`                             | `audit-evidence`        | Implementado | Log cronológico de execuções do motor autônomo em `AuditPage.tsx`                 | Registro imutável de eventos          |
| `oraculoInit()` / `oraculoAnalisar()`        | `case-intelligence`     | Implementado | Painel de inteligência estratégica e análise global                               | Diagnóstico estratégico com IA        |
| `gestaoInit()` / `gestaoCarregar()`          | `workflow-orchestrator` | Implementado | Gestão estratégica de sprints, reuniões e pautas                                  | Listagem por tipo e empresa           |
| `gestaoRenderLista()` / `gestaoToggle(id)`   | `workflow-orchestrator` | Implementado | Renderização de itens estratégicos e expansão de detalhes                         | Acordeão de pautas                    |
| `gestaoStatus(id, st)` / `gestaoExcluir(id)` | `workflow-orchestrator` | Implementado | Atualização de status e exclusão de itens de gestão                               | Log de auditoria                      |
| `gestaoEditar(id)` / `gestaoAbrirModal(...)` | `workflow-orchestrator` | Implementado | Modal de cadastro/edição de reuniões, sprints e pautas                            | Formulário controlado                 |
| `gestaoSalvar(tipo)`                         | `workflow-orchestrator` | Implementado | Persistência de itens estratégicos                                                | Confirmação e recarga                 |
| `gestaoAnalisarIA()`                         | `case-intelligence`     | Implementado | Síntese de atas e planos de ação via IA                                           | Resumo executivo                      |

---

### MÓDULOS OPCIONAIS / GESTÃO EMPRESARIAL (ISOLADOS DO NÚCLEO JURÍDICO)

Os módulos abaixo faziam parte da versão legada unificada para controle multidisciplinar do escritório e empresas coligadas. No NOX Control Center, eles estão mapeados e isolados, garantindo que **não poluem nem degradam** a performance da operação jurídica principal.

| View / Função Legada                                                                                                                                           | Domínio NOX                           | Status                         | Comportamento e Isolamento                                                                                                                |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **DOMINUS ONBOARDING** (`dominusCarregar`, `dominusDetalhe`, `dominusSalvarStatus`)                                                                            | `clients-crm`                         | Implementado (Adapter Isolado) | Gestão de fichas de onboarding de clientes com status (novo, em atendimento, aguardando docs, concluído).                                 |
| **FATURAMENTOS MEI** (`initFatFilters`, `fatCarregar`, `fatDetalhe`, `fatSalvarStatus`, `fatSalvarObs`, `fatAbrirRegistroDAS`, `fatSalvarDAS`, `fatDasStatus`) | `analytics` / `workflow-orchestrator` | Implementado (Adapter Isolado) | Controle de teto MEI (limite R$ 81.000), conciliação de faturamento bruto/débito/crédito e pipeline DAS (gerado/enviado/pago).            |
| **CONTABILIDADE CRM & OBRIGAÇÕES** (`contTab`, `loadClientes`, `selCli`, `loadObrigacoes`, `saveCli`, `CRM`, `loadFichas`)                                     | `clients-crm`                         | Implementado (Adapter Isolado) | CRM de clientes contábeis por fases (onboarding, ativo, pendente, inativo) e controle mensal de obrigações fiscais (DAS, DEFIS, DCTFWeb). |
| **ASSISTÊNCIA TÉCNICA (OS)** (`OS_ETAPAS`, `loadOS`, `renderKanban`, `selOS`, `saveOS`, `avancarOS`)                                                           | `workflow-orchestrator`               | Implementado (Adapter Isolado) | Kanban de Ordens de Serviço (Recebido, Diagnóstico, Aguardando Peça, Em Reparo, Pronto, Entregue).                                        |
| **IDEIAS & INICIATIVAS** (`ID_STAGES`, `loadIdeias`, `setIdeiaFilter`, `renderIdeias`, `saveIdeia`, `avancarIdeia`)                                            | `workflow-orchestrator`               | Implementado (Adapter Isolado) | Kanban de inovação e melhoria contínua (Backlog, Planejado, Em Andamento, Concluído) filtrável por negócio.                               |

---

## 3. Riscos de Segurança do Legado e Medidas Adotadas no NOX

| Vulnerabilidade no Legado                                                                | Risco no Legado                                                                                                    | Correção e Blindagem no NOX Control Center                                                                           |
| :--------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Chave Anthropic em LocalStorage** (`PET_AKEY='pet_api_key_v1'`)                        | Exposição de credenciais pagas em computadores compartilhados ou XSS.                                              | **Removida do cliente.** Chamadas LLM passam por backend seguro Skip Cloud com secrets gerenciados.                  |
| **Chamada direta a `api.anthropic.com`** com `anthropic-dangerous-direct-browser-access` | Violação de CORS, vazamento de chave em requisições de rede visíveis no DevTools.                                  | **Eliminada.** Comunicação via adapter interno e endpoints protegidos.                                               |
| **Armazenamento de banco em `localStorage`**                                             | Falta de integridade referencial, perda acidental de dados ao limpar cache, ausência de concorrência multiusuário. | Migrado para PocketBase / Skip Cloud com espelhamento reativo, coleções tipadas e integridade relacional.            |
| **Proxies desprotegidos** (`gemini_proxy.php`, `anthropic_proxy.php`, `gcal_proxy.php`)  | Requisições arbitrárias sem autenticação forte ou rate limiting.                                                   | `pje_proxy.js` e hooks com autenticação obrigatória (`$apis.requireAuth()`).                                         |
| **Injeção de Fórmulas CSV**                                                              | Células iniciando com `=, +, -, @` executando comandos no Excel ao exportar.                                       | Imunização obrigatória via `sanitizeCsvField` que adiciona aspas simples de escape preventivo.                       |
| **Prompt Injection em Publicações**                                                      | Teores de publicações maliciosas manipulando o comportamento do modelo de IA.                                      | Verificação estrutural com `sanitizeExternalText` removendo tags HTML, scripts e padrões de desvio de instrução.     |
| **Divergência de Prazos em Feriados Locais**                                             | Erro fatal de contagem por ignorar feriados forenses regimentais.                                                  | Motor determinístico com tabela exata de feriados e recessos forenses do TJMS (Art. 268 CODJ) e memorial explicável. |

---

## 4. Rastreabilidade de Testes e Não-Regressão

| Tela / Módulo                 | Arquivo React                     | Validação Realizada                                                                                                                                                        |
| :---------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Dashboard Central**      | `src/pages/Index.tsx`             | Carga de KPIs, Alerta Bar com prazos críticos, audiências e rotinas do dia.                                                                                                |
| **2. Sentinela NOX (DJEN)**   | `src/pages/SentinelaPage.tsx`     | Modos de busca (OAB/Nome/Processo), filtros de data/tribunal, paginação dupla, 5 sparkbars, painel lateral NOX, calculadora inline, chat Oráculo NOX e exportações MD/CSV. |
| **3. Central de Prazos**      | `src/pages/CentralPrazosPage.tsx` | Lista de prazos fatais, sincronização de agenda e tarefas, calculadora integrada.                                                                                          |
| **4. Radar de Anomalias**     | `src/pages/RadarPage.tsx`         | Matriz de saúde operacional com eixos Volume/Prazos/Ideias/Fiscal/Tarefas.                                                                                                 |
| **5. Processos / Dossiê**     | `src/pages/ProcessesPage.tsx`     | Tabela de processos, drawer de detalhes, governança e alertas de buffer.                                                                                                   |
| **6. Ingestão & Importações** | `src/pages/ImportsPage.tsx`       | Validação de lotes CSV/XLSX, detecção de encoding/delimiter e quarentena.                                                                                                  |
| **7. Revisão Humana**         | `src/pages/ReviewPage.tsx`        | Mesa de triagem para registros em quarentena ou com divergência de marco temporal.                                                                                         |
| **8. Exportações Auditáveis** | `src/pages/ExportsPage.tsx`       | Exportação de relatórios com hash SHA-256 e sanitização contra CSV Injection.                                                                                              |
| **9. Auditoria & Custódia**   | `src/pages/AuditPage.tsx`         | Trilha cronológica de ações, atores e certidões de integridade.                                                                                                            |
