# CENTRAL NOX V2 - FASE 8: RUNBOOK OPERACIONAL (EVOLUTION & WHATSAPP)

Este runbook orienta os operadores e administradores do NOX Control Center na manutenção, diagnóstico e resposta a incidentes na integração com o WhatsApp via Evolution API.

---

## 1. Como Verificar a Saúde da Conexão

1. No cabeçalho da **Central de Atendimento**, observe o badge de status do WhatsApp:
   - `WHATSAPP CONECTADO`: Instância operando perfeitamente e conectada ao Baileys.
   - `WHATSAPP CONECTANDO...`: A instância está reconectando com os servidores do WhatsApp.
   - `WHATSAPP DESCONECTADO`: A sessão caiu ou foi desconectada no celular.
   - `WHATSAPP NÃO CONFIGURADO`: Os segredos de ambiente ainda não foram preenchidos.
2. Para diagnóstico detalhado via API:
   - Chame o endpoint: `GET /api/integrations/evolution/health`
   - O campo `status` reportará o estado operacional exato sem vazar credenciais.

---

## 2. Como Verificar a Instância HUA-ATENDIMENTO

- Nome oficial da instância: `HUA-ATENDIMENTO`
- **REGRA DE OURO**: NUNCA delete a instância, NUNCA crie outra instância com outro nome, NUNCA altere o banco da Evolution.
- Se a instância estiver com status `close` ou desconectada:
  1. Verifique se o celular com o chip do escritório possui conexão à internet.
  2. Verifique se a bateria do aparelho não está em modo de economia extrema.
  3. Não reinicie o container da Evolution API abruptamente sem necessidade.

---

## 3. Diagnóstico de Webhook (Eventos Não Chegando)

1. Acesse o console do PocketBase e filtre a coleção `nox_webhook_events`.
2. Verifique o campo `created` ordenado de forma decrescente.
3. Se nenhum registro estiver sendo criado:
   - Verifique a URL do webhook cadastrada na Evolution API: deve apontar para `https://<SEU_BACKEND>/api/integrations/evolution/webhook`.
   - Verifique se o cabeçalho `x-webhook-secret` ou `apikey` enviado pela Evolution corresponde exatamente ao valor de `EVOLUTION_WEBHOOK_SECRET`.
4. Se registros estiverem com status `FAILED`:
   - Leia o campo `error_summary` para identificar o motivo da falha.

---

## 4. Como Identificar e Tratar Mensagens com Status FAILED

1. Mensagens que falharam ao serem transmitidas são sinalizadas na timeline com o badge vermelho `NÃO ENVIADA`.
2. No banco de dados, o registro em `nox_messages` possui `status: "FAILED"` e o detalhe do erro gravado em `failure_reason`.
3. Procedimento de resolução:
   - O operador deve verificar se o número do cliente possui WhatsApp ativo e DDD válido.
   - O operador pode clicar em tentar novamente ou reescrever a mensagem.
   - O sistema NÃO executa retry automático infinito para evitar bloqueio por spam no WhatsApp.

---

## 5. Como Agir em Caso de Duplicidade (Deduplicação)

- O NOX possui 2 mecanismos automáticos de prevenção:
  1. Índice UNIQUE em `nox_webhook_events` (`idx_nox_wh_dedup`) impedindo que o mesmo payload execute duas vezes.
  2. Verificação de `external_message_id` em `nox_messages`, tratando confirmações de envio (echos) como atualizações de status da mensagem original.
- Se o operador identificar duas mensagens idênticas:
  - Verifique se o operador enviou duas mensagens distintas manualmente pelo composer.
  - O sistema registra o `sender_type` como `OPERADOR` ou `WHATSAPP_EXTERNO`.

---

## 6. Procedimento de Emergência: Kill Switch

Em caso de anomalia (ex: disparo inadvertido, comportamento inesperado ou instabilidade grave no provedor):

1. **Acionamento do Kill Switch**:
   - Um administrador pode chamar `POST /api/integrations/evolution/killswitch` com `{ "active": true, "reason": "Manutenção preventiva" }`.
   - Ou alterar o registro `KILL_SWITCH_WHATSAPP_SENDING` na coleção `nox_integration_settings` para `is_enabled: true`.
2. **Efeito Imediato**:
   - Todo disparo externo é imediatamente suspenso no backend.
   - A Central de Atendimento exibe o badge `KILL SWITCH ATIVO`.
   - O botão de envio fica desabilitado para mensagens ao cliente.
   - O registro de notas internas e o recebimento de mensagens continuam operacionais.
3. **Desativação pós-incidente**:
   - Chamar `POST /api/integrations/evolution/killswitch` com `{ "active": false }`.

---

## 7. Onde Ficam os Logs e Como Rotacionar Credenciais

1. **Logs**:
   - Os eventos de negócio ficam gravados na coleção `audit_logs` com categoria `atendimento` e `seguranca`.
   - Ações monitoradas: `WHATSAPP_MESSAGE_SENT`, `WHATSAPP_MESSAGE_FAILED`, `WHATSAPP_MESSAGE_RECEIVED`, `KILL_SWITCH_ACTIVATED`, `SECURITY_VIOLATION_INTERNAL_NOTE_BLOCKED`.
2. **Rotação de Credenciais**:
   - Quando for necessário alterar o `EVOLUTION_API_KEY` ou `EVOLUTION_WEBHOOK_SECRET`:
   - Atualize os valores no painel Skip Cloud (Secrets).
   - Atualize simultaneamente as configurações da Evolution API correspondente.
   - NUNCA registre valores literais de segredos em arquivos de documentação, commits ou chats.
