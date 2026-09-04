# CENTRAL NOX V2: MAPA COMPLETO DA CAMADA DE SERVICES (FASE 3)

> **Documento:** Inventario Arquitetural e Plano de Refatoracao da Camada de Services  
> **Versao:** 0.0.57  
> **Data:** Marco de 2026  
> **Ambiente:** Skip Cloud (PocketBase) + React TypeScript SPA  
> **Regra de Estilo:** Portugues sem nenhum uso de travesao em qualquer parte deste documento.

---

## 1. VISÃO GERAL DO INVENTÁRIO

Este inventario audita integralmente o monolito `src/services/dataStore.ts` (~3.365 linhas), o adaptador `src/services/legacyStorageAdapter.ts` (~1.210 linhas), `src/services/datajudService.ts` (~753 linhas), `src/services/aiOraculoService.ts` (~443 linhas), `src/services/djenService.ts` (~625 linhas) e seus consumidores na interface.

O objetivo desta Fase 3 e retirar responsabilidades de infraestrutura, persistencia bruta e regras operacionais dos componentes React e do monolito `dataStore.ts`, estabelecendo a arquitetura formal em 5 camadas:

```text
[UI COMPONENTES / PAGINAS]
          │
          ▼
[HOOKS / CONTROLLERS] (ex: useClients, useAppointments, useTasks)
          │
          ▼
[DOMAIN SERVICES] (regras operacionais, validacao, deduplicacao, normalizacao)
          │
          ▼
[REPOSITORIES / ADAPTERS] (PocketBaseClientRepository, DataJudClient, etc.)
          │
          ▼
[POCKETBASE / APIS EXTERNAS] (REST, SSE, DataJud CNJ, Skip AI)
```

Nenhum componente de interface deve lidar diretamente com nomes de colecoes do PocketBase, sintaxe de filtros PocketBase, paginacao interna de SDK ou tratamento bruto de excecoes de rede.

---

## 2. MATRIZ DE RESPONSABILIDADES POR DOMÍNIO

Abaixo estao mapeadas todas as responsabilidades do sistema agrupadas nas 13 categorias obrigatorias:

| #   | Dominio       | Metodo / Responsabilidade                                                           | Componente / Pagina que Chama                                                         | Tipo (L/E)        | Regra de Negocio vs Infraestrutura                                                   | Dependencias                                                    | Extracao Possivel                                | Risco de Regressao |
| --- | ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------ | ------------------ |
| 1   | CLIENTES      | `getClients()`, `getClientById()`, `getClientByCpf()`                               | ClientesPage, CommandPalette, Layout, PreparacaoAudienciaControl, ProcessDetailDrawer | Leitura           | Leitura com ordenacao e busca por CPF/ID                                             | In-memory cache + PocketBase `clients`                          | Sim (ClientRepository + ClientService)           | Baixo              |
| 2   | CLIENTES      | `addClient(client, actor)`                                                          | ClientesPage, IntakePublicPage                                                        | Escrita           | Validacao de CPF, unicidade de client_code, geracao de protocolo                     | PocketBase `clients`, AuditLog                                  | Sim (ClientService.create)                       | Baixo              |
| 3   | CLIENTES      | `updateClient(id, updates, actor)`                                                  | ClientesPage, PreparacaoAudienciaControl                                              | Escrita           | Validacao cadastral, mesclagem parcial, auditoria                                    | PocketBase `clients`, AuditLog                                  | Sim (ClientService.update)                       | Baixo              |
| 4   | CLIENTES      | `updateClientStage(id, stage, actor)`                                               | ClientesPage                                                                          | Escrita           | Transicao de estagio Kanban, validacao de fluxo                                      | PocketBase `clients`, AuditLog                                  | Sim (ClientService.updateStage)                  | Baixo              |
| 5   | CLIENTES      | `linkProcessToClient(id, proc, actor)`, `unlinkProcessFromClient`                   | ClientesPage, ProcessDetailDrawer, PreparacaoAudienciaControl                         | Escrita           | Vinculacao bidirecional processo x cliente, saneamento de numero CNJ                 | PocketBase `clients`, `processos_monitorados`                   | Sim (ClientService.linkProcess)                  | Medio              |
| 6   | CLIENTES      | `addGeneratedDocToClient(id, doc, actor)`                                           | ClientesPage, DocumentReviewEditorModal                                               | Escrita           | Registro de minuta no historico do cliente                                           | PocketBase `clients`, AuditLog                                  | Sim (ClientService.addDoc)                       | Baixo              |
| 7   | CLIENTES      | `deleteClient(id, actor)`                                                           | ClientesPage                                                                          | Escrita           | Verificacao de vinculos antes de exclusao, auditoria                                 | PocketBase `clients`, AuditLog                                  | Sim (ClientService.delete)                       | Baixo              |
| 8   | COMPROMISSOS  | `getAgendaEvents()`                                                                 | AgendaView, CentralPrazosPage, CompromissosPage, PreparacaoAudienciaControl           | Leitura           | Filtro por data, ordenacao cronologica                                               | PocketBase `sentinela_agenda`                                   | Sim (AppointmentRepository + AppointmentService) | Baixo              |
| 9   | COMPROMISSOS  | `addAgendaEvent(event)`                                                             | AgendaView, CompromissosPage                                                          | Escrita           | Validacao de horario, resolucao de cliente por CPF/ID                                | PocketBase `sentinela_agenda`, AuditLog                         | Sim (AppointmentService.create)                  | Baixo              |
| 10  | COMPROMISSOS  | `updateAgendaEvent(id, updates)`                                                    | AgendaView, CompromissosPage, PreparacaoAudienciaControl                              | Escrita           | Atualizacao parcial, recalculacao de lembretes                                       | PocketBase `sentinela_agenda`                                   | Sim (AppointmentService.update)                  | Baixo              |
| 11  | COMPROMISSOS  | `deleteAgendaEvent(id, actor)`                                                      | AgendaView, CompromissosPage                                                          | Escrita           | Exclusao com registro em trilha de auditoria                                         | PocketBase `sentinela_agenda`, AuditLog                         | Sim (AppointmentService.delete)                  | Baixo              |
| 12  | COMPROMISSOS  | `togglePreparacaoAudiencia(id, habilitar, actor)`                                   | PreparacaoAudienciaControl, CompromissosPage                                          | Escrita           | Habilitacao de simulador de audiência externa, checagem de rito                      | PocketBase `sentinela_agenda`, AuditLog                         | Sim (AppointmentService.togglePreparacao)        | Baixo              |
| 13  | COMPROMISSOS  | `updateAlegacoesProcesso(id, alegacoes, aprovado, actor)`                           | PreparacaoAudienciaControl                                                            | Escrita           | Sincronizacao de alegacoes entre cliente e agenda                                    | PocketBase `sentinela_agenda`, `clients`, AuditLog              | Sim (AppointmentService.updateAlegacoes)         | Medio              |
| 14  | PRODUÇÃO      | `getProductionItems()`, `getProductionItemById()`, `getProductionItemsByClientId()` | ProducaoPage, Layout, CommandPalette                                                  | Leitura           | Agrupamento por estagio Kanban, contadores de esteira                                | PocketBase `production_items`                                   | Sim (ProductionRepository + ProductionService)   | Baixo              |
| 15  | PRODUÇÃO      | `addProductionItem(item, actor)`                                                    | ProducaoPage                                                                          | Escrita           | Resolucao estrita de client_id canônico, classificacao de nivel                      | PocketBase `production_items`, complexityService                | Sim (ProductionService.create)                   | Baixo              |
| 16  | PRODUÇÃO      | `updateProductionItem(id, updates, actor)`                                          | ProducaoPage                                                                          | Escrita           | Atualizacao de campos de minuta e evidencias                                         | PocketBase `production_items`                                   | Sim (ProductionService.update)                   | Baixo              |
| 17  | PRODUÇÃO      | `advanceProductionStage(id, nextStage, motivo, actor)`                              | ProducaoPage                                                                          | Escrita           | Maquina de estados da producao, validacao de pre-requisitos de saida                 | PocketBase `production_items`, AuditLog                         | Sim (ProductionService.advanceStage)             | Medio              |
| 18  | PRODUÇÃO      | `updateTriagemEvidencias(id, triagem, actor)`                                       | ProducaoPage                                                                          | Escrita           | Calculo e classificacao de 5 camadas probatorias                                     | PocketBase `production_items`                                   | Sim (ProductionService.updateTriagem)            | Baixo              |
| 19  | PRODUÇÃO      | `evaluateStressTest(id, detalhes, aprovado, actor)`                                 | ProducaoPage                                                                          | Escrita           | Avaliacao de 3 dimensoes de stress adversarial, liberacao de protocolo               | PocketBase `production_items`, AuditLog                         | Sim (ProductionService.evaluateStressTest)       | Baixo              |
| 20  | PRODUÇÃO      | `deleteProductionItem(id, actor)`                                                   | ProducaoPage                                                                          | Escrita           | Exclusao com auditoria                                                               | PocketBase `production_items`, AuditLog                         | Sim (ProductionService.delete)                   | Baixo              |
| 21  | TAREFAS       | `getTasks()`                                                                        | TasksView, CentralPrazosPage, SentinelaPage                                           | Leitura           | Ordenacao por urgencia e vencimento interno                                          | PocketBase `sentinela_tasks`                                    | Sim (TaskRepository + TaskService)               | Baixo              |
| 22  | TAREFAS       | `addTask(task)`                                                                     | TasksView, SentinelaPage                                                              | Escrita           | Validacao de prazo processual, vinculo com publicacao                                | PocketBase `sentinela_tasks`                                    | Sim (TaskService.create)                         | Baixo              |
| 23  | TAREFAS       | `updateTask(id, updates)`                                                           | TasksView, SentinelaPage                                                              | Escrita           | Atualizacao de status, prioridade e responsavel                                      | PocketBase `sentinela_tasks`                                    | Sim (TaskService.update)                         | Baixo              |
| 24  | TAREFAS       | `deleteTask(id, actor)`                                                             | TasksView, SentinelaPage                                                              | Escrita           | Exclusao com log                                                                     | PocketBase `sentinela_tasks`                                    | Sim (TaskService.delete)                         | Baixo              |
| 25  | TAREFAS       | `toggleSubtask(taskId, subtaskId, actor)`                                           | TasksView                                                                             | Escrita           | Conclusao pontual de item da checklist                                               | PocketBase `sentinela_tasks`                                    | Sim (TaskService.toggleSubtask)                  | Baixo              |
| 26  | PROCESSOS     | `getProcessosMonitorados()`, `getProcessoByNumero()`                                | ProcessesPage, ProcessDetailPage, ClientesPage, CentralPrazosPage                     | Leitura           | Listagem com status de monitoramento e vinculo de cliente                            | PocketBase `processos_monitorados`                              | Sim (ProcessRepository + ProcessService)         | Baixo              |
| 27  | PROCESSOS     | `adicionarProcessoMonitorado(numero, cliente, tribunal, clientId)`                  | ProcessesPage, ClientesPage                                                           | Escrita           | Normalizacao CNJ (20 digitos), deduplicacao, resolucao J.TR                          | PocketBase `processos_monitorados`, datajudService              | Sim (ProcessService.addMonitored)                | Medio              |
| 28  | PROCESSOS     | `removerProcessoMonitorado(id)`                                                     | ProcessesPage                                                                         | Escrita           | Exclusao ou desativacao do monitoramento                                             | PocketBase `processos_monitorados`                              | Sim (ProcessService.removeMonitored)             | Baixo              |
| 29  | PROCESSOS     | `getLinhaDoTempoUnificada(numeroProcesso)`                                          | ProcessDetailPage                                                                     | Leitura           | Fusao e ordenacao cronologica entre atos DataJud e DJEN                              | PocketBase `movimentacoes_processo`, `sentinela_communications` | Sim (ProcessService.getTimeline)                 | Medio              |
| 30  | MOVIMENTAÇÕES | `consultarProcesso(numero)`                                                         | MovimentacoesDatajudView, CentralPrazosPage, ProcessesPage                            | Escrita / Leitura | Chamada ao hook DataJud do backend, deduplicacao SHA-256 no banco                    | Hook `/backend/v1/datajud/consultar`, CNJ API                   | Sim (DataJudService via DataJudClient)           | Alto               |
| 31  | MOVIMENTAÇÕES | `sincronizarLote()`                                                                 | MovimentacoesDatajudView, CentralPrazosPage                                           | Escrita           | Orquestracao em lote via hook backend                                                | Hook `/backend/v1/datajud/sincronizar-lote`                     | Sim (DataJudService)                             | Medio              |
| 32  | MOVIMENTAÇÕES | `getMovimentacoes(numeroProcesso)`                                                  | MovimentacoesDatajudView, ProcessDetailPage                                           | Leitura           | Filtro e ordenacao de atos por data decrescente                                      | PocketBase `movimentacoes_processo`                             | Sim (ProcessRepository)                          | Baixo              |
| 33  | PRAZOS        | `getCommunications()`                                                               | SentinelaPage, LexTempusPage, CentralPrazosPage, RadarPage                            | Leitura           | Listagem com filtros de triagem e risco preclusivo                                   | PocketBase `sentinela_communications`                           | Sim (DeadlineRepository + DeadlineService)       | Baixo              |
| 34  | PRAZOS        | `calculateLegalDeadline(...)`                                                       | DeadlineCalculatorView, LexTempusPage, sentinelaData                                  | Regra Pura        | Calculo matematico de prazos CPC, CLT, CPP (permanece intocado em deadlineEngine.ts) | Nenhuma (puro deterministico)                                   | Nao alterar (deadlineEngine.ts inviolavel)       | Zero               |
| 35  | PRAZOS        | `homologateLexTempusResult(id, options)`                                            | LexTempusPage                                                                         | Escrita           | Gravacao de memorial de contagem e criacao de tarefa/agenda                          | PocketBase `sentinela_communications`, AuditLog, deadlineEngine | Sim (DeadlineService.homologate)                 | Medio              |
| 36  | ALERTAS       | `getAlertasMovimentacao()`, `marcarAlertaLido()`                                    | MovimentacoesDatajudView, CentralPrazosPage, Index                                    | L / E             | Leitura de novos atos e marcacao de leitura                                          | PocketBase `alertas_movimentacao`                               | Sim (AlertRepository + AlertService)             | Baixo              |
| 37  | AUDITORIA     | `logAction(action, category, actor, targetId, details)`                             | Em todos os services e telas                                                          | Escrita           | Gravacao append-only de log imutavel                                                 | PocketBase `audit_logs`                                         | Sim (AuditRepository + AuditService)             | Baixo              |
| 38  | AUDITORIA     | `getAuditLogs()`                                                                    | AuditPage                                                                             | Leitura           | Listagem historica com filtros por categoria e ator                                  | PocketBase `audit_logs`                                         | Sim (AuditRepository + AuditService)             | Baixo              |
| 39  | USUÁRIOS      | `login()`, `logout()`, `getCurrentUser()`, `hasModuleAccess()`                      | LoginPage, Layout, App, UsuariosPage                                                  | L / E             | Autenticacao JWT e checagem RBAC                                                     | PocketBase `users`, hook `/backend/v1/auth/me`                  | Ja isolado em `authUsersService.ts`              | Baixo              |
| 40  | SENTINELA     | Ingestao DJEN, Quarentena, Custodia                                                 | SentinelaPage, ImportsPage                                                            | L / E             | Sanitizacao anti prompt injection, SHA-256 e timeline de custodia                    | `djenService.ts`, `csvEngine.ts`, `adapters.ts`                 | Sim (SentinelaService)                           | Medio              |
| 41  | CONFIGURAÇÕES | `getSettings()`, `saveSettings()`, `getLawyerProfile()`, `updateLawyerProfile()`    | SettingsPage, Layout, PreparacaoAudienciaControl, ClientesPage                        | L / E             | Preferencias ergonomicas de UI do operador e perfil profissional                     | LocalStorage + fallback estruturado                             | Sim (SettingsService)                            | Baixo              |
| 42  | UTILITÁRIOS   | `getStats()`, `getRecoveredTimeMetric()`, `getDailyBriefing()`                      | Index, Layout, SentinelaPage                                                          | Leitura           | Consolidacao analitica de metricas operacionais                                      | In-memory aggregation                                           | Sim (MetricsService / Facade)                    | Baixo              |
| 43  | LEGADO        | `legacyStorageAdapter`, imports CSV manuais                                         | SettingsPage, MigrationStatusBanner, ImportsPage                                      | L / E             | Adaptador de transicao e compatibilidade da Fase 2                                   | LocalStorage e PocketBase                                       | Manter como adaptador auxiliar                   | Baixo              |

---

## 3. ARQUITETURA ALVO DA FASE 3

### 3.1 Estrutura de Diretorios Proposta

```text
src/
├── core/
│   ├── errors/
│   │   └── AppErrors.ts             # Classes tipadas de erro (NetworkError, ValidationError, etc.)
│   └── results/
│       └── ServiceResult.ts         # Contrato padronizado { success, data, error, meta }
├── repositories/
│   ├── contracts/
│   │   ├── IClientRepository.ts     # Contrato abstrato de clientes
│   │   ├── IAppointmentRepository.ts# Contrato abstrato de agenda
│   │   ├── ITaskRepository.ts       # Contrato abstrato de tarefas
│   │   ├── IProductionRepository.ts # Contrato abstrato de producao
│   │   ├── IProcessRepository.ts    # Contrato abstrato de processos e movimentacoes
│   │   ├── IAuditRepository.ts      # Contrato abstrato de auditoria
│   │   └── IAlertRepository.ts      # Contrato abstrato de alertas
│   └── pocketbase/
│       ├── PocketBaseClientRepository.ts
│       ├── PocketBaseAppointmentRepository.ts
│       ├── PocketBaseTaskRepository.ts
│       ├── PocketBaseProductionRepository.ts
│       ├── PocketBaseProcessRepository.ts
│       ├── PocketBaseAuditRepository.ts
│       └── PocketBaseAlertRepository.ts
├── services/
│   ├── clients/
│   │   └── ClientService.ts         # Regras operacionais de clientes
│   ├── appointments/
│   │   └── AppointmentService.ts    # Regras de agenda e preparacao
│   ├── tasks/
│   │   └── TaskService.ts           # Regras de tarefas e prazos
│   ├── production/
│   │   └── ProductionService.ts     # Regras de producao e esteira de pecas
│   ├── processes/
│   │   └── ProcessService.ts        # Regras de processos e linha do tempo
│   ├── datajud/
│   │   ├── DataJudClient.ts         # Chamadas HTTP brutas aos endpoints /backend/v1/datajud/*
│   │   └── DataJudService.ts        # Fachada de alto nivel
│   ├── ai/
│   │   └── OraculoProvider.ts       # Interface desacoplada de provedor LLM
│   ├── audit/
│   │   └── AuditService.ts          # Central de registro de auditoria
│   ├── settings/
│   │   └── SettingsService.ts       # Preferencias e perfil do advogado
│   ├── dataStore.ts                 # Compatibility Facade progressiva
│   ├── deadlineEngine.ts            # Intocado (regra inviolavel)
│   └── ...
└── hooks/
    ├── useClients.ts                # Hook reativo de clientes
    ├── useAppointments.ts           # Hook reativo de compromissos
    └── useTasks.ts                  # Hook reativo de tarefas
```

---

## 4. ORDEM DE EXTRAÇÃO CONTROLADA

A extracao e implementada dominio por dominio, do menor risco ao maior risco:

1. **Camada Base:** Erros tipados e contrato `ServiceResult<T>`.
2. **Dominio 1 - Clientes:** `IClientRepository` + `PocketBaseClientRepository` + `ClientService` + `useClients`.
3. **Dominio 2 - Compromissos / Agenda:** `IAppointmentRepository` + `PocketBaseAppointmentRepository` + `AppointmentService` + `useAppointments`.
4. **Dominio 3 - Producao e Tarefas:** Repositories e Services dedicados + `useTasks`.
5. **Dominio 4 - Processos e Movimentacoes:** `ProcessService` + `DataJudClient` + `DataJudService`.
6. **Dominio 5 - Oraculo NOX:** Interface conceitual de IA `IOraculoProvider` para permitir futura troca de provider sem tocar nos componentes.
7. **Dominio 6 - Auditoria e Settings:** `AuditService` e `SettingsService`.
8. **Compatibilidade:** `dataStore.ts` mantem os mesmos metodos publicos delegando as chamadas para os novos services, garantindo zero quebra de codigo existente.

---

## 5. REGRAS INVIOLÁVEIS NA EXECUÇÃO

1. `deadlineEngine.ts` **nao pode ser alterado sob nenhuma hipotese**.
2. Nenhuma migration deve ser criada caso nao seja estritamente necessaria.
3. Nao usar travesao em nenhum texto de interface, doc ou comentario.
4. Nao quebrar nenhum fluxo de tela visual (regressao visual zero).
5. QA completo verde ao final (oxlint, tsc, build Vite, suite de testes).

---

_Fim do Documento: CENTRAL NOX FASE 3 MAPA DE SERVICES._
