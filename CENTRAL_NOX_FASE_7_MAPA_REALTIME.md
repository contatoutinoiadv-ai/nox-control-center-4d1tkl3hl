# CENTRAL NOX V2 — FASE 7: MAPA DE AUDITORIA REALTIME E SSE

Documento técnico oficial de mapeamento, auditoria e diagnóstico das subscrições em tempo real do sistema CENTRAL NOX V2 (frontend React + Vite + TypeScript e backend PocketBase Skip Cloud).

Data da auditoria: 2026-09-02  
Status: Aprovado para implementação da Fase 7  
Autor: Equipe de Engenharia e Arquitetura NOX

---

## 1. Sumário Executivo

A auditoria completa de código identificou um total de 10 assinaturas diretas ao barramento SSE do PocketBase (`pb.collection(...).subscribe`), distribuídas da seguinte forma:

- 4 assinaturas diretas dentro de `src/services/dataStore.ts` (coleções `clients`, `sentinela_agenda`, `sentinela_tasks` e `production_items`).
- 1 assinatura direta em `src/components/Layout.tsx` (coleção `audit_logs`), apresentando race condition crítica no fluxo assíncrono de cleanup.
- 5 assinaturas diretas nos repositórios PocketBase em `src/repositories/pocketbase/`:
  - `PocketBaseClientRepository.ts` (`clients`)
  - `PocketBaseAppointmentRepository.ts` (`sentinela_agenda`)
  - `PocketBaseTaskRepository.ts` (`sentinela_tasks`)
  - `PocketBaseProductionRepository.ts` (`production_items`)
  - `PocketBaseProcessRepository.ts` (`processos_monitorados`)

Além destas 10 assinaturas ativas em tempo de execução, foi localizado o hook utilitário `src/hooks/use-realtime.ts`, que implementa uma chamada direta `pb.collection.subscribe` mas possui atualmente 0 importações no projeto (código ocioso, porém com padrão defensivo de cleanup que será aproveitado).

Por outro lado, o módulo de Central de Atendimento (criado na Fase 5 e estruturado na Fase 6 com as coleções `nox_conversations`, `nox_messages`, `nox_internal_notes`, `nox_assignments`, `nox_ai_analysis`) opera atualmente apenas com um pub/sub em memória local (`PocketBaseConversationRepository.notify`), sem qualquer subscrição SSE nas tabelas `nox_*`. Em decorrência disso, ações executadas por outro operador ou mensagens recebidas em outra sessão não são sincronizadas sem recarregar a página.

---

## 2. Riscos Arquiteturais Identificados

### 2.1 Risco Crítico: Unsubscribe Global Destrutivo

Os 5 repositórios PocketBase (`PocketBaseClientRepository`, `PocketBaseAppointmentRepository`, `PocketBaseTaskRepository`, `PocketBaseProductionRepository` e `PocketBaseProcessRepository`) implementam o método `.subscribe(callback)` retornando uma função de cancelamento que invoca:

```typescript
pb.collection(this.collectionName).unsubscribe('*')
```

Como não é passado o listener específico para o método `unsubscribe`, o PocketBase desliga todas as conexões SSE daquela coleção para a aplicação inteira. Se um componente for desmontado, todos os demais componentes do sistema que dependem da mesma coleção perdem o recebimento de eventos SSE em tempo real.

### 2.2 Risco Alto: Dupla Subscrição Paralela e Renderizações Redundantes

Para as coleções `clients`, `sentinela_agenda`, `sentinela_tasks` e `production_items`, tanto o `dataStore.ts` quanto os repositórios correspondentes assinam o SSE do PocketBase em paralelo.
Os hooks React `useClients`, `useAppointments` e `useTasks` realizam duas assinaturas simultâneas:

1. `dataStore.subscribe(...)`
2. `service.subscribe(...)`
   Cada evento disparado pelo backend gera duas notificações no componente React, dobrando o custo de processamento e re-renderização.

### 2.3 Risco Médio: Race Condition no Cleanup de `audit_logs`

Em `src/components/Layout.tsx`, a subscrição de `audit_logs` utiliza uma Promise assíncrona para guardar o handler de cancelamento (`unsubPb = fn`). Caso o componente seja desmontado antes da resolução da Promise (por exemplo, login/logout rápido ou transição de rota), o cleanup executa antes da atribuição da variável, deixando a conexão SSE aberta e provocando vazamento de memória (memory leak).

### 2.4 Risco Médio: Falta de Reatividade na Central de Prazos

O arquivo `src/pages/CentralPrazosPage.tsx` instancia seu estado local a partir do `dataStore` na montagem do componente, mas não se inscreve nas mudanças do `dataStore`. Alterações de prazos, tarefas e eventos vindas de outras telas ou via SSE permanecem invisíveis até que o usuário recarregue a página manualmente.

### 2.5 Risco Alto: Ausência de Realtime Multiusuário na Central de Atendimento

A Central de Atendimento (`CentralAtendimentoPage.tsx`) comunica-se apenas através de eventos in-memory locais disparados pelo repositório. Nenhuma coleção `nox_*` está conectada ao SSE. Em um cenário com dois operadores (Operador A e Operador B), o Operador B não visualiza novas mensagens, mudanças de status, atribuições de operador ou notas internas feitas pelo Operador A.

### 2.6 Risco Médio: Indicador de Conectividade Limitado a `navigator.onLine`

O monitoramento de status no topo da aplicação considera apenas eventos de rede do navegador (`navigator.onLine`), não detectando interrupções da conexão SSE (como expiração de token JWT, fechamento do EventSource pelo servidor ou erro transitório de proxy com a internet ativa).

---

## 3. Tabela Detalhada de Ocorrências Auditadas

| Coleção / Domínio       | Arquivo e Linha                                                      | Evento                       | Subscriber                      | Ciclo de Vida                           | Cleanup Presente                           | Risco de Duplicidade           | Risco de Memory Leak                  | Polling Equivalente | Ação Proposta                                                                |
| :---------------------- | :------------------------------------------------------------------- | :--------------------------- | :------------------------------ | :-------------------------------------- | :----------------------------------------- | :----------------------------- | :------------------------------------ | :------------------ | :--------------------------------------------------------------------------- |
| `clients`               | `src/services/dataStore.ts:413`                                      | `*` (create, update, delete) | `dataStore`                     | Global (tempo de execução da aplicação) | Não (permanente)                           | Alto (duplica com repositório) | Baixo                                 | Inexistente         | Centralizar via `RealtimeService`                                            |
| `sentinela_agenda`      | `src/services/dataStore.ts:475`                                      | `*` (create, update, delete) | `dataStore`                     | Global                                  | Não (permanente)                           | Alto (duplica com repositório) | Baixo                                 | Inexistente         | Centralizar via `RealtimeService`                                            |
| `sentinela_tasks`       | `src/services/dataStore.ts:539`                                      | `*` (create, update, delete) | `dataStore`                     | Global                                  | Não (permanente)                           | Alto (duplica com repositório) | Baixo                                 | Inexistente         | Centralizar via `RealtimeService`                                            |
| `production_items`      | `src/services/dataStore.ts:599`                                      | `*` (create, update, delete) | `dataStore`                     | Global                                  | Não (permanente)                           | Alto (duplica com repositório) | Baixo                                 | Inexistente         | Centralizar via `RealtimeService`                                            |
| `audit_logs`            | `src/components/Layout.tsx:85`                                       | `*`                          | `Layout` (badge de atualização) | Montagem do Layout                      | Sim (com race condition assíncrona)        | Médio                          | Alto (se desmontar antes de resolver) | Inexistente         | Centralizar via `RealtimeService`                                            |
| `clients`               | `src/repositories/pocketbase/PocketBaseClientRepository.ts:146`      | `*`                          | Ouvintes do repositório         | Por assinatura local                    | Sim (invoca `unsubscribe('*')` destrutivo) | Alto (duplica com dataStore)   | Médio (desliga SSE para o app todo)   | Inexistente         | Centralizar via `RealtimeService` com listener específico                    |
| `sentinela_agenda`      | `src/repositories/pocketbase/PocketBaseAppointmentRepository.ts:129` | `*`                          | Ouvintes do repositório         | Por assinatura local                    | Sim (invoca `unsubscribe('*')` destrutivo) | Alto (duplica com dataStore)   | Médio (desliga SSE para o app todo)   | Inexistente         | Centralizar via `RealtimeService` com listener específico                    |
| `sentinela_tasks`       | `src/repositories/pocketbase/PocketBaseTaskRepository.ts:108`        | `*`                          | Ouvintes do repositório         | Por assinatura local                    | Sim (invoca `unsubscribe('*')` destrutivo) | Alto (duplica com dataStore)   | Médio (desliga SSE para o app todo)   | Inexistente         | Centralizar via `RealtimeService` com listener específico                    |
| `production_items`      | `src/repositories/pocketbase/PocketBaseProductionRepository.ts:123`  | `*`                          | Ouvintes do repositório         | Por assinatura local                    | Sim (invoca `unsubscribe('*')` destrutivo) | Alto (duplica com dataStore)   | Médio (desliga SSE para o app todo)   | Inexistente         | Centralizar via `RealtimeService` com listener específico                    |
| `processos_monitorados` | `src/repositories/pocketbase/PocketBaseProcessRepository.ts:144`     | `*`                          | Ouvintes do repositório         | Por assinatura local                    | Sim (invoca `unsubscribe('*')` destrutivo) | Baixo                          | Médio (desliga SSE para o app todo)   | Inexistente         | Centralizar via `RealtimeService` com listener específico                    |
| `nox_conversations`     | Ausente                                                              | Nenhum                       | Nenhum                          | N/A                                     | Ausente                                    | N/A                            | N/A                                   | Inexistente         | Criar subscrição centralizada no `RealtimeService`                           |
| `nox_messages`          | Ausente                                                              | Nenhum                       | Nenhum                          | N/A                                     | Ausente                                    | N/A                            | N/A                                   | Inexistente         | Criar subscrição centralizada no `RealtimeService`                           |
| `nox_internal_notes`    | Ausente                                                              | Nenhum                       | Nenhum                          | N/A                                     | Ausente                                    | N/A                            | N/A                                   | Inexistente         | Criar subscrição centralizada no `RealtimeService` com filtro de autorização |
| `nox_assignments`       | Ausente                                                              | Nenhum                       | Nenhum                          | N/A                                     | Ausente                                    | N/A                            | N/A                                   | Inexistente         | Criar subscrição centralizada no `RealtimeService`                           |

---

## 4. Arquitetura Alvo

A arquitetura alvo unifica todo o tráfego em tempo real sob um único serviço gerenciador (`RealtimeService`). O PocketBase mantém exatamente uma conexão SSE por coleção física, gerenciada por contagem de referências (`refCount`). Quando a quantidade de ouvintes ativos para uma coleção chega a zero, a subscrição PocketBase correspondente é desfeita de forma limpa, sem nunca utilizar `unsubscribe('*')`.

```
+-------------------------------------------------------------+
|                     PocketBase Backend                      |
|          (Skip Cloud - EventSource / SSE Engine)            |
+-------------------------------------------------------------+
                              |
                              | Server-Sent Events (SSE)
                              v
+-------------------------------------------------------------+
|                RealtimeService (Singleton)                  |
|  - Conexão SSE unificada com pooling e Reference Counting   |
|  - Monitor de Saúde: ONLINE / RECONNECTING / OFFLINE        |
|  - Reconnect automático com Backoff Exponencial Controlado  |
|  - Resync Obrigatório pós-reconexão                         |
|  - Deduplicação canônica por ID e Timestamp (Merge)         |
|  - Normalização para RealtimeEvent interno                  |
+-------------------------------------------------------------+
           |                    |                    |
           v                    v                    v
+--------------------+ +--------------------+ +--------------------+
|  Domínio Atendimento| | Domínio Operacional| | Domínio Auditoria  |
| - nox_conversations| | - clients          | | - audit_logs       |
| - nox_messages     | | - sentinela_agenda | |                    |
| - nox_internal_notes | sentinela_tasks    | |                    |
| - nox_assignments  | | - production_items | |                    |
+--------------------+ +--------------------+ +--------------------+
           |                    |                    |
           v                    v                    v
+--------------------+ +--------------------+ +--------------------+
| UI: Atendimento    | | UI: Clientes,      | | UI: Topbar /       |
| (Fila, Chat,       | | Prazos, Produção,  | | Indicador Conexão  |
| Inteligência)      | | Agenda             | | Notificações       |
+--------------------+ +--------------------+ +--------------------+
```

---

## 5. Diretrizes para Implementação na Fase 7

1. **Singleton `RealtimeService`:**
   Gerenciador central com pooling de coleções. Suporta múltiplos ouvintes locais apontando para a mesma coleção remota sem abrir conexões adicionais no PocketBase.
2. **Proibição Absoluta de `unsubscribe('*')`:**
   Todo cancelamento passa pelo RealtimeService ou repassa o callback exato para a coleção do PocketBase, garantindo que a desmontagem de um componente não afete outros módulos.
3. **Unificação dos Hooks Reativos:**
   Os hooks `useClients`, `useAppointments` e `useTasks` passam a escutar uma única fonte de verdade (`dataStore`), e este atualiza seu estado a partir dos eventos entregues pelo `RealtimeService`.
4. **Resync Pós-Reconexão:**
   Sempre que o SSE for restabelecido após uma queda transitória, o `RealtimeService` emite sinal de ressincronização para que os repositórios atualizem registros alterados durante a desconexão.
5. **Deduplicação Canônica e Ordenação:**
   Todas as listas e timelines utilizam mesclagem por chave de ID e ordenação estável por timestamp (`created`/`sent_at`), impedindo duplicações entre respostas de fetch inicial e eventos SSE.
6. **Segurança de Notas Internas:**
   Notas internas continuam restritas à coleção `nox_internal_notes`, acessíveis somente a operadores autorizados, nunca sendo tratadas como mensagens externas de chat.
