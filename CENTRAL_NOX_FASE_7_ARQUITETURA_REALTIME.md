# CENTRAL NOX V2 — FASE 7: ARQUITETURA REALTIME E SSE

Documento técnico de especificação arquitetural, topologia de rede, ciclo de vida e garantias de sincronização multiusuário do sistema CENTRAL NOX V2 (frontend React + Vite + TypeScript e backend PocketBase Skip Cloud).

Data: 2026-09-02  
Status: Implementado e Homologado  
Autor: Equipe de Engenharia e Arquitetura NOX

---

## 1. Visão Geral da Arquitetura

O sistema CENTRAL NOX V2 adota um modelo de reatividade orientada a eventos baseado em Server-Sent Events (SSE) gerenciado pelo singleton central `RealtimeService`.

### 1.1 Diagrama de Topologia de Dados e Eventos

```
+-------------------------------------------------------------------------+
|                  PocketBase Backend (Skip Cloud)                        |
|                                                                         |
|  Coleções Operacionais:       Coleções da Central de Atendimento:      |
|  - clients                    - nox_conversations                       |
|  - sentinela_agenda           - nox_messages                            |
|  - sentinela_tasks            - nox_internal_notes                      |
|  - production_items           - nox_assignments                         |
|  - processos_monitorados      - nox_ai_analysis                         |
|  - audit_logs                                                           |
+-------------------------------------------------------------------------+
                                    |
                                    | Canal Único SSE (EventSource)
                                    v
+-------------------------------------------------------------------------+
|                       RealtimeService (Singleton)                       |
|                                                                         |
|  1. Pooling de Subscrições com Reference Counting por coleção           |
|  2. Proibição Absoluta de unsubscribe('*')                              |
|  3. Monitor de Conexão: ONLINE / RECONNECTING / OFFLINE                 |
|  4. Backoff Exponencial Controlado (1s, 2s, 4s, 8s, 16s, teto 30s)     |
|  5. Mecanismo de Resync Obrigatório pós-reconexão                       |
|  6. Normalização para RealtimeEvent e Deduplicação Canônica             |
|  7. Ordenação Determinística de Timelines e Mensagens                   |
|  8. Tratamento de Erros e Telemetria Limpa sem dados sensíveis          |
+-------------------------------------------------------------------------+
           |                                             |
           v                                             v
+------------------------------------+   +------------------------------------+
|  Camada de Repositórios & Facade   |   |   Componentes de Apresentação      |
|                                    |   |                                    |
| - dataStore (única fonte para      |   | - Layout / Topbar:                 |
|   useClients, useAppointments,     |   |   Status "ATENDIMENTO ONLINE"      |
|   useTasks, CentralPrazosPage)     |   |                                    |
| - PocketBaseConversationRepository |   | - CentralAtendimentoPage:          |
|   (emite conversation:updated,     |   |   Fila dinâmica, Timeline reativa, |
|   message:created, etc.)           |   |   Preview, Badges e Unread count   |
+------------------------------------+   +------------------------------------+
```

---

## 2. Decisão Arquitetural: Subscription Global vs Por `conversation_id`

### 2.1 Contexto e Dilema

No PocketBase, é possível assinar uma coleção inteira (`pb.collection('nox_messages').subscribe('*')`) ou criar conexões filtradas por registro específico.

### 2.2 Decisão Adotada

Optou-se pela **subscrição em nível de coleção compartilhada (`nox_messages`)** com roteamento e filtragem em memória na camada de aplicação:

1. **Economia de Conexões HTTP:** O browser mantém exatamente um stream SSE ativo com o PocketBase, evitando o limite de conexões simultâneas HTTP/1.1 (6 conexões por domínio).
2. **Atualização da Fila Global:** Quando uma mensagem chega para uma conversa que NÃO está aberta na tela, a fila precisa atualizar o preview do último texto, a data `last_message_at` e o contador de não lidas (`unread_count`). Se a subscrição fosse restrita ao `conversation_id` da tela aberta, os cards da fila lateral não seriam atualizados em tempo real.
3. **Despacho em Memória:** Ao receber o evento SSE normalizado:
   - Se o `conversation_id` corresponder à conversa ativa, a mensagem é inserida na timeline aberta com deduplicação canônica e ordenação estável.
   - Independentemente de estar aberta ou não, a lista lateral atualiza o card correspondente.

---

## 3. Reference Counting e Prevenção de `unsubscribe('*')`

### 3.1 O Problema Anterior

Anteriormente, cinco repositórios executavam `pb.collection(...).unsubscribe('*')` na desmontagem de qualquer componente que tivesse chamado `.subscribe()`. Esse comando destrutivo encerrava todas as subscrições daquela coleção para a aplicação inteira.

### 3.2 Solução Implementada

O `RealtimeService` gerencia um mapa interno de coleções:

- Cada coleção possui um conjunto (`Set`) de listeners locais.
- A chamada a `subscribe(collection, listener)` adiciona o listener e incrementa o contador. A subscrição real no PocketBase só é estabelecida na primeira assinatura (quando `refCount === 1`).
- A função de retorno (cleanup) remove apenas aquele listener específico.
- A subscrição física no PocketBase só é desfeita quando `refCount === 0`.
- É estritamente proibido o uso de asterisco no unsubscribe.

---

## 4. Normalização de Eventos e Formato Interno

A interface de usuário e os componentes de domínio nunca recebem o payload bruto do PocketBase. Todos os eventos são encapsulados no tipo `RealtimeEvent`:

```typescript
export interface RealtimeEvent<T = Record<string, unknown>> {
  domain: string
  action: 'create' | 'update' | 'delete'
  recordId: string
  payload: T
  receivedAt: string
}
```

Isso garante isolamento completo: se o backend alterar detalhes da estrutura interna do evento SSE, apenas o método `handleIncomingRawEvent` do `RealtimeService` necessita de adaptação.

---

## 5. Resync Obrigatório Pós-Reconexão

### 5.1 O Risco da Perda de Pacotes

Eventos SSE trafegam por streaming unidirecional. Se a conexão de rede oscilar por 5 segundos, quaisquer eventos emitidos pelo backend durante essa janela são perdidos pelo cliente.

### 5.2 Fluxo de Recuperação

1. Ao detectar queda ou falha, o estado transiciona para `RECONNECTING`.
2. O algoritmo de backoff exponencial agenda tentativas de reconexão:
   - Tentativa 1: 1 segundo
   - Tentativa 2: 2 segundos
   - Tentativa 3: 4 segundos
   - Tentativa 4: 8 segundos
   - Tentativa 5: 16 segundos (teto em 30 segundos)
3. Após reestabelecer o canal e validar `pb.health.check()`, o `RealtimeService` executa `triggerResync()`.
4. Todos os ouvintes registrados no canal de resync recebem notificação contendo o domínio e o último timestamp visto (`lastSeenTimestamp`).
5. A Central de Atendimento refaz a consulta da fila (`listConversations`) e revalida as mensagens da conversa aberta (`getMessages`).
6. Os registros retornados passam pelo `RealtimeService.mergeRecord`, garantindo que nenhuma alteração seja perdida e nenhum item seja duplicado.

---

## 6. Deduplicação Canônica e Ordenação

### 6.1 Deduplicação por ID e Timestamp

Para evitar anomalias visuais causadas por concorrência entre respostas de busca (`fetch`) e eventos instantâneos (`SSE`), utiliza-se o método estático:

```typescript
RealtimeService.mergeRecord(existingList, incomingRecord)
```

- Se o ID não constar na lista, o item é inserido.
- Se o ID já constar, a versão com maior timestamp (`updated` ou `created`) substitui a anterior, preservando atributos locais se necessário.

### 6.2 Ordenação Determinística

Timelines de mensagens aplicam ordenação estável:

```typescript
RealtimeService.sortTimelineMessages(messages)
```

O critério ordena cronologicamente por `sentAt` ou `createdAt` e, em caso de empate de milissegundos, desempata pela ordem léxica estável do identificador único do registro (`id`).

---

## 7. Isolamento e Segurança de Notas Internas

Notas internas (`nox_internal_notes`) são estritamente separadas de mensagens externas de clientes (`nox_messages`):

- O canal de subscrição de notas internas opera sob sua própria coleção no PocketBase.
- O mapeamento visual converte notas internas para o formato de mensagem com propriedade `isInternalNote = true`.
- Conforme homologado no teste crítico da Fase 6 e ratificado na Fase 7, o serviço externo `MessageService.sendExternal` rejeita de forma imediata e intransigente qualquer tentativa de envio de notas internas para canais públicos externos.

---

## 8. Sincronização Multiusuário Homologada

| Cenário Multiusuário            | Ação do Operador A                                  | Reflexo no Operador B                                                             |
| :------------------------------ | :-------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Atualização de Status**       | Altera para `EM_ATENDIMENTO`                        | Badge de status do card e cabeçalho atualizam em menos de 100ms.                  |
| **Transferência de Custódia**   | Transfere para Operador B com nota de transferência | Card do Operador B recebe indicação de novo responsável e nota interna vinculada. |
| **Nota Interna Estratégica**    | Redige nota com orientação jurídica                 | Operador B visualiza a nota em amarelo na timeline da conversa.                   |
| **Alteração de Prioridade**     | Eleva conversa para `CRITICA`                       | Card move-se para o topo dos urgentes com badge carmim pulsante.                  |
| **Queda de Conexão e Blackout** | Desconecta por 10 segundos enquanto B altera status | Ao restabelecer conexão, o resync atualiza o estado sem duplicar o registro.      |
