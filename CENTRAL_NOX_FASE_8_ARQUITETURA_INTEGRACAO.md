# CENTRAL NOX V2 - FASE 8: ARQUITETURA DA INTEGRAÇÃO EVOLUTION API

## 1. Topologia da Integração e Princípio da Fonte da Verdade

```
 [WhatsApp / Cliente]
          ▲
          │ Baileys / Protocolo WhatsApp
          ▼
 [Evolution API Server] (Instância: HUA-ATENDIMENTO)
          ▲
          │ Webhook HTTP POST (Autenticado por EVOLUTION_WEBHOOK_SECRET)
          ▼
 [Backend NOX - PocketBase Hooks]
   ├─ POST /api/integrations/evolution/webhook (ACK rápido + Idempotência)
   ├─ POST /api/integrations/evolution/send (Proxy com Kill Switch + Proteção de Notas)
   ├─ GET  /api/integrations/evolution/health (Diagnóstico sem credenciais)
   └─ POST /api/integrations/evolution/discover (Descoberta passiva de versão)
          ▲
          │ SSE Realtime + REST SDK Authenticated
          ▼
 [Frontend NOX - Central de Atendimento]
   ├─ EvolutionGateway (Camada abstrata IMessagingProvider)
   ├─ MessageService & ConversationService
   ├─ MessageComposer & Timeline
   └─ Indicador Visual de Conectividade
```

### Regras Fundamentais da Topologia:

1. **Evolution é Transporte, NOX é Fonte da Verdade**: Todas as conversas, clientes vinculados, mensagens, tarefas derivadas e notas internas pertencem exclusivamente ao banco da NOX. A perda do banco da Evolution não afeta o histórico processual e probatório do escritório.
2. **Backend-to-Backend Exclusivo**: O frontend React NUNCA se comunica diretamente com a Evolution API. Não existem chaves `VITE_` e nenhum token de API trafega para o navegador.
3. **Decisão Pendente Documentada**: A topologia de rede assume que a Evolution API e o backend PocketBase (Skip Cloud) possuem conectividade HTTPS direta. Caso a Evolution esteja em rede local ou atrás de NAT sem IP público, será necessário um túnel seguro reverso (como Cloudflare Tunnel ou WireGuard) apontando o webhook para a URL pública do Skip Cloud.

---

## 2. Camadas de Segurança e Proteção

### A. Proteção Multi-Camada da Nota Interna (Zero Leaks)

A nota interna (`nox_internal_notes`) possui proteção em quatro barreiras independentes:

1. **Barreira de Banco**: Tabela separada no banco (`nox_internal_notes` vs `nox_messages`).
2. **Barreira de Tipos (TypeScript)**: Contratos `SendTextMessagePayload` não aceitam objetos do tipo `NoxInternalNoteRecord`.
3. **Barreira de Serviço (`MessageService.sendExternal`)**: Rejeita ativamente e retorna falha se o payload contiver qualquer indício de nota interna (`isInternalNote: true`, `type: 'INTERNAL_NOTE'`).
4. **Barreira de Gateway (`EvolutionGateway` & hook `evolution_send_proxy`)**: Valida em runtime e no backend se o objeto tenta enviar nota interna, abortando com HTTP 403 e registrando incidente de auditoria de segurança imediato.

### B. Kill Switch Administrativo

- Registrado na coleção `nox_integration_settings` com a chave `KILL_SWITCH_WHATSAPP_SENDING`.
- Quando acionado (`is_enabled: true`), o backend bloqueia imediatamente qualquer envio externo via WhatsApp.
- O recebimento de webhooks e a operação interna (notas, tarefas, agenda) continuam intactos.

---

## 3. Fluxo de Webhook e ACK Rápido

Para garantir que a Evolution API não sofra timeouts nem reenvie eventos em massa por atraso de processamento, o webhook segue a arquitetura de ACK rápido:

```
[Chegada do Webhook]
       │
       ▼
1. RECEBER & VALIDAR ORIGEM (EVOLUTION_WEBHOOK_SECRET)
       │
       ▼
2. IDENTIFICAR ID ÚNICO & GERAR HASH SHA-256
       │
       ▼
3. PERSISTIR EM `nox_webhook_events` (Verifica UNIQUE index)
       │
       ├─ Se duplicado ──► Retorna 200 { idempotent: true } IMEDIATO
       │
       ▼
4. PROCESSAR DADOS DE FORMA LEVE
       ├─ MESSAGES_UPSERT: Deduplica echo, normaliza E.164, vincula cliente, salva mensagem.
       ├─ MESSAGES_UPDATE: Atualiza status (DELIVERED, READ).
       └─ CONNECTION_UPDATE: Atualiza estado da instância.
       │
       ▼
5. RESPOSTA 200 ACK
```

---

## 4. Abstração de Provedor (`IMessagingProvider`)

O sistema adota o padrão Adapter/Provider através da interface:

```typescript
export interface IMessagingProvider {
  readonly providerName: string
  checkHealth(): Promise<IntegrationHealthResponse>
  sendTextMessage(payload: SendTextMessagePayload): Promise<GatewaySendResult>
  toggleKillSwitch(active: boolean, reason?: string): Promise<boolean>
  runDiscovery(): Promise<DiscoveryResponse>
}
```

A classe `EvolutionGateway` implementa esse contrato. No futuro, caso o escritório decida adotar o WhatsApp Cloud API oficial da Meta ou outro provedor, bastará criar um `MetaOfficialMessagingProvider` implementando o mesmo contrato, sem modificar uma única linha das páginas ou componentes de atendimento.
