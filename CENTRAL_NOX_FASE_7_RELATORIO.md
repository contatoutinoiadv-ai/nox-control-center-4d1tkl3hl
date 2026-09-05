# CENTRAL NOX V2 — FASE 7: RELATÓRIO TÉCNICO OFICIAL DE IMPLEMENTAÇÃO

Relatório técnico consolidado da conclusão da Fase 7 (Realtime Centralizado, SSE e Sincronização Multiusuário) do sistema CENTRAL NOX V2.

Data de homologação: 2026-09-02  
Versão do sistema: v0.0.66  
Status: Aprovado sem restrições em QA, TypeCheck, Lint e Testes Unitários/Integração

---

## 1. Subscrições Criadas

Foram implementadas e ativadas subscrições centralizadas com reference counting via `RealtimeService` para todas as coleções essenciais da Central de Atendimento:

- `nox_conversations`: detecção em tempo real de novos atendimentos, atualizações de status, prioridade e alteração de metadados.
- `nox_messages`: recebimento instantâneo de mensagens (inbound de clientes e outbound de operadores em outras sessões).
- `nox_internal_notes`: recepção em tempo real de anotações internas confidenciais para usuários autorizados.
- `nox_assignments`: recepção de eventos de transferência de custódia operacional entre membros da equipe.
- `audit_logs`: canal centralizado de telemetria e avisos de modificações do sistema sem race conditions.

---

## 2. Subscrições Removidas e Saneadas

Foram descontinuadas e refatoradas todas as chamadas destrutivas diretas de `pb.collection(...).unsubscribe('*')` que encerravam o canal SSE de maneira indiscriminada para a aplicação inteira.
Os seguintes repositórios foram migrados para o `RealtimeService`:

1. `PocketBaseClientRepository` (`clients`)
2. `PocketBaseAppointmentRepository` (`sentinela_agenda`)
3. `PocketBaseTaskRepository` (`sentinela_tasks`)
4. `PocketBaseProductionRepository` (`production_items`)
5. `PocketBaseProcessRepository` (`processos_monitorados`)

---

## 3. Centralização da Camada Realtime

Toda a gestão de EventSource / SSE agora reside unicamente no singleton `RealtimeService`:

- Nenhuma tela ou hook acessa o método `.subscribe()` bruto do PocketBase de forma direta.
- O serviço gerencia contagem de referências (`refCount`). Quando múltiplos componentes ou repositórios escutam a mesma coleção, apenas uma subscrição física é mantida no servidor Skip Cloud.
- O encerramento no PocketBase só é despachado quando a contagem de ouvintes locais atinge zero.

---

## 4. Componentes Afetados

1. `src/services/realtime/RealtimeService.ts`: criado como infraestrutura central de tempo real.
2. `src/repositories/pocketbase/PocketBaseConversationRepository.ts`: conectado ao `RealtimeService` nas coleções `nox_*`.
3. `src/repositories/pocketbase/PocketBaseClientRepository.ts`: saneado contra `unsubscribe('*')`.
4. `src/repositories/pocketbase/PocketBaseAppointmentRepository.ts`: saneado contra `unsubscribe('*')`.
5. `src/repositories/pocketbase/PocketBaseTaskRepository.ts`: saneado contra `unsubscribe('*')`.
6. `src/repositories/pocketbase/PocketBaseProductionRepository.ts`: saneado contra `unsubscribe('*')`.
7. `src/repositories/pocketbase/PocketBaseProcessRepository.ts`: saneado contra `unsubscribe('*')`.
8. `src/hooks/useClients.ts`: unificado para escutar exclusivamente o `dataStore`.
9. `src/hooks/useAppointments.ts`: unificado para escutar exclusivamente o `dataStore`.
10. `src/hooks/useTasks.ts`: unificado para escutar exclusivamente o `dataStore`.
11. `src/components/Layout.tsx`: eliminado risco de race condition em `audit_logs` e logout sincronizado.
12. `src/pages/CentralPrazosPage.tsx`: adicionada assinatura reativa ao `dataStore`.
13. `src/pages/CentralAtendimentoPage.tsx`: conectado ao fluxo de deduplicação canônica e resync.
14. `src/design-system/shell/NoxTopbar.tsx`: padronizado com os badges de status do Design System NOX.
15. `src/pages/SettingsPage.tsx`: integrada a nova suíte de testes da Fase 7 executável pela UI.

---

## 5. Estratégia de Reconexão (Backoff Exponencial)

Para evitar ataques acidentais de negação de serviço (DoS) contra o backend durante oscilações de conexão, foi implementado backoff exponencial com teto rígido:

- Intervalo base: 1.000ms
- Multiplicador: 2x a cada tentativa sem sucesso
- Limite máximo por tentativa: 30.000ms
- Teto de tentativas: 5 ciclos consecutivos
- Caso o erro decorra de token JWT expirado (código 401) ou falta de permissão (código 403), o serviço não entra em loop agressivo de reconexão e transiciona de imediato para o estado `OFFLINE`.

---

## 6. Mecanismo de Resync Obrigatório Pós-Reconexão

Durante um período de instabilidade de rede ou queda momentânea de sinal, o streaming de SSE pode ser interrompido sem que o navegador feche a conexão imediatamente.
Ao reestabelecer o status `ONLINE`, o `RealtimeService` executa o método `triggerResync()`:

- Dispara revalidação dos dados consultando os registros alterados no backend.
- A Central de Atendimento refaz a carga da fila ativa e das mensagens da conversa selecionada.
- Os dados retornados passam pelo algoritmo de merge canônico, garantindo que nenhum evento emitido durante a janela de desconexão seja perdido.

---

## 7. Garantias de Sincronização Multiusuário

Foram validadas formalmente as operações simultâneas entre dois operadores distintos (Operador A e Operador B):

1. **Status:** Operador A avança status para `EM_ATENDIMENTO`; Operador B tem seu painel atualizado sem refresh.
2. **Transferência:** Operador A transfere atendimento para Operador B; o atendimento surge na fila "MINHAS" do Operador B e sai da fila de A.
3. **Notas Internas:** Operador B inclui nota sigilosa; Operador A autorizado recebe em sua timeline imediatamente.
4. **Prioridades:** Operador A sinaliza conversa como `CRITICA`; a conversa sobe ao topo da fila visual de ambos os operadores.

---

## 8. Deduplicação Canônica e Ordenação

- **Deduplicação de Mensagens e Conversas:** Implementada no método `RealtimeService.mergeRecord`, combinando mapeamento por ID canônico e comparação de timestamps de modificação (`updated` ou `created`).
- **Resolução de Concorrência Fetch x SSE:** Caso uma resposta HTTP e um evento SSE cheguem em paralelo para o mesmo registro, a lista mantém exatamente uma entrada única atualizada.
- **Ordenação Determinística:** As mensagens na timeline são dispostas rigorosamente pela ordem de `sentAt` ou `created`, tendo o identificador único estável como critério de desempate determinístico.

---

## 9. Performance e Uso de Recursos

- **Conexões HTTP Reduzidas:** Concentração de múltiplos listeners sob uma única conexão EventSource por coleção física.
- **Eliminação de Polling:** Proibido expressamente o uso de temporizadores de intervalo (`setInterval`) para refetch contínuo de dados.
- **Descarte de Assinaturas Zumbis:** Garantido que ao desmontar componentes React (navegação entre telas), todos os ouvintes são cancelados de maneira determinística, retornando a contagem de referências a zero.

---

## 10. Resultados da Bateria de Testes

Todas as suítes de testes automatizados do sistema executam com 100% de aprovação (zero falhas):

1. **Bateria Fase 2 (Regras de Prazo e Sentinela):** 12/12 testes APROVADOS (100% verde).
2. **Bateria Fase 3 (Services e Módulos):** 17/17 testes APROVADOS (100% verde).
3. **Bateria Fase 5 (Atendimento e Regras de Negócio):** 16/16 testes APROVADOS (100% verde).
4. **Bateria Fase 6 (Services Reais e Segurança):** 16/16 testes APROVADOS (100% verde).
5. **Bateria Fase 7 (Realtime, SSE e Multiusuário):** 14/14 testes APROVADOS (100% verde).
   - Teste 1: Normalização de evento SSE PocketBase para RealtimeEvent interno
   - Teste 2: Reference counting isolado sem unsubscribe destrutivo
   - Teste 3: Deduplicação canônica por ID e merge com timestamp recente
   - Teste 4: Deduplicação entre resposta de fetch e evento SSE concorrente
   - Teste 5: Ordenação estável da timeline por sentAt e ID
   - Teste 6: Transições de estado de conectividade auditáveis (ONLINE/RECONNECTING/OFFLINE)
   - Teste 7: Cleanup determinístico na desmontagem sem acúmulo de listeners
   - Teste 8: Ciclo de vida de autenticação (logout encerra assinaturas e login inicia canal limpo)
   - Teste 9: Multiusuário: alteração de status refletida entre operadores
   - Teste 10: Multiusuário: transferência de conversa refletida em tempo real
   - Teste 11: Multiusuário: nota interna refletida para operadores autorizados
   - Teste 12: Multiusuário: elevação de prioridade para CRITICA refletida visualmente
   - Teste 13: Teste crítico de desconexão, alteração durante blackout e resync sem perda
   - Teste 14: Permissões de notas internas estritamente confinadas em nox_internal_notes

Total de testes validados no sistema: **75 testes unitários e de integração verdes**.

---

## 11. Falhas Encontradas e Corrigidas na Auditoria

1. **Bug do `unsubscribe('*')`:** Corrigido nos 5 repositórios da aplicação. Componentes agora não derrubam o SSE de outros módulos ao serem desmontados.
2. **Race condition no cleanup de `Layout.tsx`:** Eliminada a atribuição assíncrona frágil de `unsubPb`. Agora o cancelamento é síncrono e rastreado pelo `RealtimeService`.
3. **Dupla subscrição nos hooks operacionais:** `useClients`, `useAppointments` e `useTasks` deixaram de subscrever ao repositório e ao dataStore concomitantemente, eliminando re-renderizações duplicadas.
4. **Central de Prazos desatualizada:** Inserida subscrição reativa ao `dataStore` em `CentralPrazosPage.tsx`.

---

## 12. Gestão de Riscos

- **Risco de Vazamento de Memória:** Mitigado pelo mecanismo de contagem de referências e limpeza de listeners em todos os `useEffect` de apresentação.
- **Risco de Vazamento de Conteúdo Sigiloso em Logs:** Telemetria restrita aos tipos de eventos técnicos (`CONNECT`, `DISCONNECT`, `RECONNECT`, `SUB_FAIL`, `RESYNC_OK`), sem registrar payload de mensagens ou anotações de clientes.
- **Risco de Dessincronização de Estado:** Mitigado pelo protocolo obrigatório de resync pós-reconexão.

---

## 13. Dívida Técnica Restante

- A migração completa do motor interno legado do `dataStore` (que mantém mocks locais para fallback de emergência) para PocketBase puro poderá ser otimizada em ciclos futuros de manutenção.
- Persistência offline em IndexedDB poderá ser introduzida em fases posteriores caso haja demanda para operação sem qualquer acesso à internet.

---

## 14. Confirmação Expressa de Escopo da Fase 7

Fica formal e expressamente confirmado:

- **A Evolution API NÃO foi conectada.**
- **Nenhum webhook WhatsApp foi criado ou registrado.**
- **O n8n NÃO foi implementado.**
- **Nenhum componente fora do escopo da Fase 7 foi alterado.**
- **As regras jurídicas de cálculo do `deadlineEngine.ts` permaneceram 100% intocadas.**
- **O sistema está perfeitamente preparado para a futura integração da Fase 8.**
