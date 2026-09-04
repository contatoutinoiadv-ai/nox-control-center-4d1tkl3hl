# CENTRAL NOX V2 — MAPA DO DUAL-STORE E SOURCE OF TRUTH (FASE 2)

> **Documento:** Mapa Operacional de Dual-Store e Transição para Fonte Única de Verdade (PocketBase)  
> **Status:** Homologado para Execução Fase 2A / 2B  
> **Data:** Março de 2026  
> **Ambiente:** Skip Cloud / PocketBase + React TypeScript SPA  
> **Regra Primária:** Migração progressiva, sem perda de dados, sem exclusão destrutiva, sem criar coleções duplicadas (reutilizar -> evoluir), preservação estrita de deadlineEngine e cadeias relacionais.

---

## 1. INVENTÁRIO REAL DE LOCALSTORAGE E SESSIONSTORAGE

Varredura estrita realizada em todo o código-fonte da aplicação (`src/**/*.ts*`):

| #   | Chave de Armazenamento             | Arquivo de Origem                         | Tipo de Dado                      | Módulo Principal                      | Leitura              | Escrita                             | Criticidade | Equivalente no PocketBase         | Classificação (A, B, C, D, E)            | Ação Recomendada na Fase 2                                                                                                                                                                                                       |
| :-- | :--------------------------------- | :---------------------------------------- | :-------------------------------- | :------------------------------------ | :------------------- | :---------------------------------- | :---------- | :-------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `nox_control_center_clients_v1`    | `src/services/dataStore.ts`               | `NoxClient[]` (JSON)              | Clientes & Atendimentos               | `init()` (linha 171) | `saveClients()` (linha 872)         | **ALTA**    | Sim (`clients`)                   | **A: MIGRAR PARA POCKETBASE**            | Migrar dados legados órfãos do localStorage para `clients`, manter cache em memória RAM no singleton `dataStore`, ler de `clients` no PB e sincronizar via SSE. Manter backup local transitório somente até confirmação do sync. |
| 2   | `nox_sentinela_agenda_v1`          | `src/services/dataStore.ts`               | `AgendaEvent[]` (JSON)            | Central de Prazos / Compromissos      | `init()` (linha 156) | `saveAgenda()` (linha 2521)         | **ALTA**    | Sim (`sentinela_agenda`)          | **A: MIGRAR PARA POCKETBASE**            | Migrar eventos legados órfãos para `sentinela_agenda`. PocketBase é a fonte de verdade oficial. Suporte SSE em tempo real.                                                                                                       |
| 3   | `nox_control_center_production_v1` | `src/services/dataStore.ts`               | `ProductionItem[]` (JSON)         | Produção de Peças                     | `init()` (linha 178) | `saveProductionItems()` (linha 881) | **ALTA**    | Sim (`production_items`)          | **A: MIGRAR PARA POCKETBASE**            | Importar itens órfãos para `production_items`. Leitura inicial via PocketBase `getFullList`, mutações gravadas direto no PB com update de memória no frontend.                                                                   |
| 4   | `nox_sentinela_tasks_v1`           | `src/services/dataStore.ts`               | `SentinelaTask[]` (JSON)          | Central de Prazos / Sentinela         | `init()` (linha 153) | `saveTasks()` (linha 2479)          | **ALTA**    | Sim (`sentinela_tasks`)           | **A: MIGRAR PARA POCKETBASE**            | Importar tarefas órfãos do localStorage para `sentinela_tasks` no PB. Sincronizar em tempo real com status de prazo do LEX TEMPUS.                                                                                               |
| 5   | `nox_sentinela_communications_v1`  | `src/services/dataStore.ts`               | `SentinelaCommunication[]` (JSON) | Sentinela DJEN / LEX TEMPUS           | `init()` (linha 150) | `saveCommunications()` (linha 2040) | **ALTA**    | Sim (`sentinela_communications`)  | **A: MIGRAR PARA POCKETBASE**            | Publicações do DJEN e diários são gravadas em `sentinela_communications`. Deduplicação por `external_id` / `hashSha256`. Migrar órfãos sem sobrescrever dados já existentes no banco.                                            |
| 6   | `nox_control_center_records_v1`    | `src/services/dataStore.ts`               | `NoxRecord[]` (JSON)              | Processos / Imports CSV               | `init()` (linha 136) | `saveRecords()` (linha 845)         | **ALTA**    | Sim (`records`)                   | **A: MIGRAR PARA POCKETBASE**            | Registros de importação e radar de processos migram para `records`. O dataStore carrega do PB com fallback em memória.                                                                                                           |
| 7   | `nox_control_center_imports_v1`    | `src/services/dataStore.ts`               | `ImportBatch[]` (JSON)            | Importações CSV                       | `init()` (linha 139) | `saveImports()` (linha 854)         | **MÉDIA**   | Sim (`imports`)                   | **A: MIGRAR PARA POCKETBASE**            | Metadados de lotes de importação migram para a coleção `imports` do PB.                                                                                                                                                          |
| 8   | `nox_control_center_audit_logs_v1` | `src/services/dataStore.ts`               | `AuditLogEntry[]` (JSON)          | Trilha de Auditoria                   | `init()` (linha 142) | `saveAuditLogs()` (linha 863)       | **CRÍTICA** | Sim (`audit_logs`)                | **A: MIGRAR PARA POCKETBASE**            | Eventos de auditoria gravam diretamente na collection `audit_logs` do PocketBase (imutável, append-only). Migrar logs locais que não existam no banco.                                                                           |
| 9   | `nox_sentinela_automations_v1`     | `src/services/dataStore.ts`               | `AutomationRule[]` (JSON)         | Sentinela / Automações                | `init()` (linha 159) | `toggleAutomation()` (linha 2704)   | **MÉDIA**   | Sim (`sentinela_automations`)     | **A: MIGRAR PARA POCKETBASE**            | A collection `sentinela_automations` já existe no PocketBase. Na Fase 2, sincronizar regras ativas com o backend mantendo execução de client-side controlada.                                                                    |
| 10  | `nox_sentinela_incidents_v1`       | `src/services/dataStore.ts`               | `IncidentCrisisRoom[]` (JSON)     | Sentinela / Salas de Crise            | `init()` (linha 165) | `createIncident()` (linha 2722)     | **MÉDIA**   | Sim (`sentinela_incidents`)       | **A: MIGRAR PARA POCKETBASE**            | A collection `sentinela_incidents` já existe no PocketBase. Gravar e consultar diretamente do PocketBase.                                                                                                                        |
| 11  | `nox_sentinela_decision_memory_v1` | `src/services/dataStore.ts`               | `DecisionMemoryItem[]` (JSON)     | Sentinela / Decisões                  | `init()` (linha 168) | Purge legado (linha 132)            | **BAIXA**   | Não (embutido)                    | **C: CACHE APENAS / IN-MEMORY**          | Cache analítico derivado em memória; histórico consolidado das homologações do LEX TEMPUS reside em `audit_logs` e `sentinela_communications.custody`.                                                                           |
| 12  | `nox_sentinela_api_health_v1`      | `src/services/dataStore.ts`               | `SentinelaApiHealth[]` (JSON)     | Sentinela / Telemetria                | `init()` (linha 162) | N/A (estático inicial)              | **BAIXA**   | Não (runtime)                     | **B: MANTER LOCAL / UI STATE**           | Telemetria dinâmica e probes de rede são estado de interface em memória RAM transitória.                                                                                                                                         |
| 13  | `nox_control_center_settings_v1`   | `src/services/dataStore.ts`               | `AppSettings` (JSON)              | Configurações do Escritório / Titular | `init()` (linha 145) | `saveSettings()` (linha 1612)       | **MÉDIA**   | Não                               | **B: MANTER LOCAL COM BACKUP**           | Preferências visuais do operador (motion, refresh interval). Configurações corporativas do escritório e advogado âncora podem ficar locais por operador.                                                                         |
| 14  | `nox_zero_clean_v2`                | `src/services/dataStore.ts`               | String ('true')                   | Sistema / Flag de Purge               | `init()` (linha 123) | `init()` (linha 133)                | **BAIXA**   | N/A                               | **D: LEGADO A REMOVER FUTURAMENTE**      | Flag de controle que limpava artefatos de demonstração sintética. Substituída pelo `legacyStorageAdapter`.                                                                                                                       |
| 15  | `nox_feature_flags_v1`             | `src/services/featureFlags.ts`            | `FeatureFlags` (JSON)             | Governança / Sistema                  | Linha 57             | Linha 86                            | **BAIXA**   | N/A                               | **B: MANTER LOCAL (UI/Feature Toggle)**  | Controle de recursos no navegador do desenvolvedor/operador. Mantém-se local.                                                                                                                                                    |
| 16  | `nox_doc_templates_${userId}`      | `src/services/documentTemplateService.ts` | `DocumentTemplateItem[]` (JSON)   | Modelos de Documento                  | Linha 157            | Linha 174                           | **MÉDIA**   | Sim (`document_templates`)        | **C: CACHE APENAS (Fallback offline)**   | A collection `document_templates` já é a fonte primária de verdade. O localStorage opera apenas como cache local com fallback resiliente.                                                                                        |
| 17  | `pocketbase_auth`                  | SDK PocketBase (`pb.authStore`)           | Token JWT + Record JSON           | Autenticação / Sessão                 | SDK Nativo           | SDK Nativo                          | **CRÍTICA** | Sim (Sessão nativa do PocketBase) | **B: MANTER LOCAL (Auth Token Oficial)** | Armazenamento seguro oficial de autenticação gerenciado pelo SDK do PocketBase.                                                                                                                                                  |

_Nota sobre sessionStorage:_ Nenhum uso de `sessionStorage` foi detectado no código-fonte.

---

## 2. MAPA DE SOURCE OF TRUTH POR DOMÍNIO

| Domínio de Negócio | Fonte Anterior (V1)                                  | Fonte Desejada (Fase 2)                                        | Collection Correspondente no PocketBase                       | Camada de Leitura Primária                                                                  | Camada de Escrita Primária                                         | Estratégia de Fallback e Resiliência                                          |
| :----------------- | :--------------------------------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **CLIENTES**       | Dual (`localStorage` + sync tardio PB)               | **PocketBase (`clients`)**                                     | `clients`                                                     | `pb.collection('clients').getFullList({ sort: '-created' })`                                | `pb.collection('clients').create()` / `.update()`                  | Se offline, exibe aviso de sincronização pendente e retém em memória RAM.     |
| **PROCESSOS**      | Híbrido (`dataStore.records` + `datajudService`)     | **PocketBase (`processos_monitorados` e `records`)**           | `processos_monitorados`, `records`, `processos_datajud_cache` | `pb.collection('processos_monitorados').getFullList({ expand: 'client_id' })`               | Backend hooks `/backend/v1/datajud/*` e SDK direto                 | Cache local em memória; consultas DataJud mantêm deduplicação SHA-256.        |
| **MOVIMENTAÇÕES**  | **PocketBase (`movimentacoes_processo`)**            | **PocketBase (`movimentacoes_processo`)**                      | `movimentacoes_processo`                                      | `pb.collection('movimentacoes_processo').getFullList()`                                     | Hook `/backend/v1/datajud/consultar`                               | Já era 100% PocketBase. Mantido sem alteração. Deduplicação por `hash_dedup`. |
| **PRAZOS**         | `dataStore.communications` + `deadlineEngine.ts`     | **PocketBase (`sentinela_communications`)**                    | `sentinela_communications`                                    | `pb.collection('sentinela_communications').getFullList({ sort: '-data_disponibilizacao' })` | `pb.collection('sentinela_communications').create()` / `.update()` | `deadlineEngine.ts` permanece puro e determinístico no client/server.         |
| **PRODUÇÃO**       | Dual (`localStorage` + background sync PB)           | **PocketBase (`production_items`)**                            | `production_items`                                            | `pb.collection('production_items').getFullList({ sort: '-created' })`                       | `pb.collection('production_items').create()` / `.update()`         | Atualização reativa de interface com salvamento assíncrono garantido no PB.   |
| **COMPROMISSOS**   | Dual (`localStorage` + background sync PB)           | **PocketBase (`sentinela_agenda`)**                            | `sentinela_agenda`                                            | `pb.collection('sentinela_agenda').getFullList({ sort: '-start_date' })`                    | `pb.collection('sentinela_agenda').create()` / `.update()`         | Sincronizado com status de preparação de audiência (`preparacao_habilitada`). |
| **ALERTAS**        | PocketBase (`alertas_movimentacao`) + Local          | **PocketBase (`alertas_movimentacao`)**                        | `alertas_movimentacao`                                        | `pb.collection('alertas_movimentacao').getFullList({ sort: '-created' })`                   | Hook cron DataJud e consultas CNJ                                  | Totalmente no PocketBase com flag `lido: bool`.                               |
| **AUDITORIA**      | Dual (`localStorage` + PB pontual)                   | **PocketBase (`audit_logs`)**                                  | `audit_logs`                                                  | `pb.collection('audit_logs').getFullList({ sort: '-created' })`                             | `pb.collection('audit_logs').create()`                             | Append-only imutável. Regras de API impedem update e delete.                  |
| **USUÁRIOS**       | **PocketBase (`users` e `user_module_permissions`)** | **PocketBase (`users` e `user_module_permissions`)**           | `users`, `user_module_permissions`                            | Hook `/backend/v1/auth/me` e `/backend/v1/users`                                            | Hooks `/backend/v1/users*`                                         | Já era 100% PocketBase. Mantido sem alteração.                                |
| **SENTINELA**      | Dual (`localStorage` + ingestão DJEN)                | **PocketBase (`sentinela_communications`, `sentinela_tasks`)** | `sentinela_communications`, `sentinela_tasks`                 | Ingestão DJEN direta no frontend gravando em `sentinela_communications`                     | `pb.collection('sentinela_communications')`                        | Snapshot de custódia com hash SHA-256 e timeline gravados no banco.           |

---

## 3. ORDEM DE MIGRAÇÃO (DEPENDÊNCIAS E BAIXO RISCO -> ALTO RISCO)

A sequência de migração respeita as dependências de chaves estrangeiras e a criticidade das operações jurídicas:

```text
[Lote 1: Baixo Risco - Domínios Folha / Auditoria]
1. AUDIT_LOGS (audit_logs): Independente, append-only, rastreabilidade base de todas as etapas seguintes.
2. TAREFAS (sentinela_tasks): Dados simples de fluxo operacional, vinculados a prazos.
3. COMPROMISSOS (sentinela_agenda): Agenda de audiências e reuniões, isolada de cálculos de prazo.

[Lote 2: Risco Médio - Entidades Mestres de Relacionamento]
4. CLIENTES (clients): Entidade âncora; necessária para vincular processos, produções e preparações de audiência.
5. PRODUÇÃO (production_items): Depende de `client_id` e `numero_processo`.

[Lote 3: Alto Risco - Núcleo de Prazos e Monitoramento Judicial]
6. PUBLICAÇÕES SENTINELA (sentinela_communications): Publicações DJEN/PJe e memoriais de prazo.
7. PROCESSOS & MOVIMENTAÇÕES (processos_monitorados, records, movimentacoes_processo):
   - Máxima cautela: preservar integridade da cadeia CLIENTE -> PROCESSO -> MOVIMENTAÇÃO -> SENTINELA.
   - NUNCA alterar deadlineEngine.ts.
```

---

## 4. MAPEAMENTO DE IDENTIFICADORES (IDs LOCAIS VS IDs POCKETBASE)

O PocketBase utiliza chaves primárias do tipo texto de exatamente **15 caracteres alfanuméricos** em minúsculas (ex: `u9wcaim6yazrj7k`).  
O sistema legado em `dataStore.ts` gerava identificadores locais arbitrários em vários formatos:

- `cli_1725268800000_a1b2` (clientes locais)
- `prod_1725268800000_c3d4` (itens de produção)
- `task_1725268800000` (tarefas)
- `agenda_1725268800000` (agenda)
- `comm-imp-1-djen123` / `comm-djen-713397092` (comunicações)
- `rec-djen-713397092` (registros)

### Regras Estritas de Mapeamento:

1. **Nunca presumir que ID local = ID PocketBase.**
2. Quando um registro legado existir apenas localmente no `localStorage`, o `legacyStorageAdapter` normalizará os dados e deixará o PocketBase gerar um novo `id` canônico de 15 caracteres (ou usará sanitização de 15 caracteres válidos).
3. **Mapeamento de client_id:**
   - Se um processo ou item de produção aponta para um `clientId` local (ex: `cli_...`), o adaptador resolve o cliente real no PocketBase comparando primeiro por `client_code` (ex: `CLI-2026-001`), depois por `cpf`, e por fim por `nome`.
   - O `client_id` no PocketBase recebe o `id` canônico de 15 caracteres do registro em `clients`.
4. **Mapeamento de process_id / numero_processo:**
   - O número CNJ padronizado (20 dígitos numéricos ou formato `NNNNNNN-DD.AAAA.J.TR.OOOO`) é a chave natural imutável de identificação entre tribunais, diários e processos.
5. **Mapeamento de user_id / responsavel:**
   - O responsável textual padrão (`Higor Utinoi de Oliveira`) é mantido nos campos legíveis, enquanto as permissões e sessões associam-se ao `user_id` autenticado via `pb.authStore.model.id`.

---

## 5. REGRAS DE RESOLUÇÃO DE CONFLITO (LOCAL VS POCKETBASE)

Em caso de divergência de conteúdo entre dados locais e dados do PocketBase:

1. **Regra de Prevalência do Servidor:** O PocketBase é a **Única Fonte de Verdade (Source of Truth)**. Dados já gravados no banco têm precedência de integridade.
2. **Não Descarte Silencioso:** Registros que existirem _apenas_ no localStorage e não no PocketBase são detectados, validados e importados para o PocketBase, registrando o evento de auditoria `LEGACY_DATA_IMPORTED`.
3. **Detecção de Duplicidade:**
   - Clientes: duplicidade checada por `cpf` (normalizado sem pontuação) ou `client_code`.
   - Comunicações Sentinela: duplicidade checada por `external_id` ou hash do teor.
   - Movimentações DataJud: duplicidade estrita por `hash_dedup` SHA-256 no banco.
   - Tarefas e Agenda: duplicidade checada por combinação de `process_number` + `title` + `start_date`.
4. **Conflito com Conteúdo Diferente:** Se um registro com a mesma chave natural existir no PocketBase e no localStorage mas com dados conflitantes:
   - Os dados do PocketBase são mantidos intactos como canônicos.
   - O conteúdo local conflitante é preservado e anotado na trilha de auditoria (`LEGACY_DATA_CONFLICT`) para revisão do operador, sem sobrescrever o banco silenciosamente.
5. **Marcação de Migração:** Chaves já migradas do `localStorage` recebem a marcação `nox_migrated_${dominio}_v2 = true` para evitar reimportações redundantes e loops de sincronização.

---

_Fim do Documento — CENTRAL NOX MAPA DO DUAL-STORE (FASE 2)._
