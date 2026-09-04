# CENTRAL NOX — PLANO MESTRE DE EVOLUÇÃO E REARQUITETURA V2

> **Documento:** Plano Mestre de Evolução, Segurança e Rearquitetura Sistêmica (Fase 0)  
> **Status da Versão:** V2.0 — Auditoria, Diagnóstico Real e Planejamento em 15 Fases  
> **Data de Emissão:** Março de 2026  
> **Convenção de Auditoria:**
>
> - `[CONFIRMADO]`: Verificado diretamente no código-fonte, nos arquivos de configuração ou no live schema do PocketBase/Skip Cloud.
> - `[INFERÊNCIA]`: Dedução técnica fundamentada em convenções de código, tipagens ou padrões observados.
> - `[NÃO CONFIRMADO]`: Ponto externo ou condicional não mensurável exclusivamente pelos arquivos deste repositório.
>
> **Regra de Execução:** Fase 0 estritamente documental. Nenhuma alteração de código, migração ou dependência foi instalada nesta etapa. Implementação aguardará autorização explícita para cada fase subsequente.

---

## 1. INVESTIGAÇÃO PRIORITÁRIA: BUG DA ROTA `/login` NO `ErrorBoundary`

### 1.1 Diagnóstico do Problema Reportado

O usuário relatou que a rota `/login` está renderizando o componente `ErrorBoundary` em vez da tela real de login (`LoginPage`).

### 1.2 Análise do Código Atual

[CONFIRMADO] O mapeamento de rotas em `src/App.tsx` possui a seguinte estrutura hierárquica:

```tsx
<BrowserRouter>
  <HashToPathSync />
  <TooltipProvider>
    <ErrorBoundary moduleName="NOX Control Center (Global)">
      <Toaster />
      <Sonner position="top-right" richColors theme="dark" />
      <Routes>
        {/* Rota pública de Login */}
        <Route
          path="/login"
          element={
            <ErrorBoundary moduleName="Autenticação NOX">
              <LoginPage />
            </ErrorBoundary>
          }
        />
```

### 1.3 Causas Técnicas Prováveis Identificadas no Código

1. **Conflito de Redirecionamento de Hash (`HashToPathSync`) com Google Tradutor ou Navegadores com Extensões:**  
   [CONFIRMADO] O componente `HashToPathSync` em `src/App.tsx` (linhas 72-88) avalia `window.location.hash`. Quando o usuário entra em URLs como `#/login`, o hook executa `navigate(targetPath, { replace: true })`. Concomitantemente, o componente `ErrorBoundary.tsx` contém um handler específico para `isDomRemoveChildError` (conflito de tradução de DOM pelo Google Tradutor, linhas 21-31). Se uma extensão de navegador (ou o próprio tradutor) mutar elementos do card de login antes do término da hidratação do React 19, o erro `NotFoundError: Failed to execute 'removeChild'` é disparado, acionando o ErrorBoundary do módulo ou o Global.
2. **Dependência de Leitura Síncrona do PocketBase SDK (`pb.authStore`) durante Render Inicial:**  
   [CONFIRMADO] Em `src/services/authUsersService.ts`, chamadas a `pb.authStore.isValid`, `pb.authStore.token` e `pb.authStore.record` assumem que `localStorage` está disponível e não corrompido. Se `localStorage` contiver um token serializado em formato inválido ou string não parseável por versão anterior do SDK (`pocketbase ~0.26.9` vs template original `0.25.0`), a inicialização do SDK lança exceção em tempo de leitura antes do componente montar.
3. **Resolução de Estado `location.state` nulo ou malformado em `LoginPage.tsx`:**  
   [CONFIRMADO] A linha 33 de `src/pages/LoginPage.tsx` lê:  
   `const fromLocation = (location.state as any)?.from?.pathname || '/'`  
   Embora possua encadeamento opcional, caso `location.state` seja um tipo primitivo não objeto (por exemplo uma string serializada por redirecionamento direto de histórico), o acesso em navegadores legados ou engines estritas pode gerar exceção não tratada na renderização de topo do componente.
4. **Ausência de Reset de Erro na Transição de Rotas:**  
   [CONFIRMADO] Em `src/components/ErrorBoundary.tsx`, o estado `{ hasError: true }` não escuta mudanças de `location.pathname`. Se um erro ocorrer previamente em qualquer módulo protegido e o usuário for redirecionado pelo `RequireAuth` para `/login`, o `ErrorBoundary` pai (`NOX Control Center (Global)`) permanece em estado de erro, envelopando a tela de login na caixa de recuperação.

### 1.4 Plano de Correção Imediata (Fase 1 / Pré-Fase 1)

- **Arquivo Afetado Principal:** `src/components/ErrorBoundary.tsx` e `src/App.tsx`.
- **Ação:**
  1. Tornar o `ErrorBoundary` reativo à troca de rota (resetar `hasError: false` quando `location.pathname` mudar, ou chavear o ErrorBoundary com `key={location.pathname}`).
  2. Proteger a leitura de `pb.authStore` com bloco `try/catch` defensivo em `src/services/authUsersService.ts`.
  3. Adicionar validação estrita em `LoginPage.tsx` para `location.state`.

---

## 2. DIAGNÓSTICO: ARQUITETURA ENCONTRADA HOJE VS. DOSSIÊ ANTERIOR

### 2.1 Visão Geral do Sistema Atual

[CONFIRMADO] A Central NOX é uma aplicação de inteligência operacional e controladoria jurídica voltada à advocacia contenciosa e consultiva. O ambiente produtivo é suportado por:

- **Frontend SPA:** React 19.2.7 com TypeScript 6.0.3, Vite 8.0.16 e Tailwind CSS 3.4.19 (`package.json`).
- **Backend BaaS:** Skip Cloud gerenciado com PocketBase (banco relacional SQLite embutido, runtime JS Goja em `pocketbase/hooks/` e rotinas agendadas `cronAdd`).
- **Coleções Ativas no Live State:** 16 coleções existentes (`users`, `imports`, `records`, `audit_logs`, `sentinela_communications`, `sentinela_tasks`, `sentinela_agenda`, `sentinela_automations`, `sentinela_incidents`, `clients`, `production_items`, `user_module_permissions`, `processos_monitorados`, `processos_datajud_cache`, `movimentacoes_processo`, `alertas_movimentacao`, `document_templates`).
- **Migrations Aplicadas no Backend:** 16 migrations aplicadas (`0001` a `0016`). Próximo ordinal disponível para migrations futuras: `0017`.

### 2.2 Divergências entre o Dossiê Anterior (`CENTRAL_NOX_ARQUITETURA_ATUAL.md`) e o Código Real

| Ponto de Comparação                     | Descrição no Dossiê Anterior                                                                                           | Estado Real no Código Atual                                                                                                                                                                                                                                                                                                                                             | Impacto Arquitetural                                                                                                                                             |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Versões de Core**                     | React 18.3.1, Vite 6.0.7, TS 5.6.2, PocketBase 0.25.0                                                                  | React 19.2.7, Vite 8.0.16, TS 6.0.3, PocketBase 0.26.9                                                                                                                                                                                                                                                                                                                  | [CONFIRMADO] Atualização de major do React e Vite. Demanda atenção a tipagens e ciclo de vida.                                                                   |
| **Linha do Tempo em ProcessDetailPage** | Descrito como busca paralela básica e exibição simples                                                                 | [CONFIRMADO] `ProcessDetailPage.tsx` evoluiu significativamente (versões 0.0.43 a 0.0.49). Possui unificação cronológica (oldest-first) com merge de `movimentacoes_processo` e `sentinela_communications`, badges por sigilo CNJ, filtro tolerante com 3 variações de número de processo e trigger para busca de publicações sob demanda (`puxarPublicacoesProcesso`). | O componente já opera como o núcleo da linha do tempo integrada; deve ser protegido contra regressões.                                                           |
| **datajudService.ts**                   | Descrito como cliente HTTP básico para `/backend/v1/datajud/consultar`                                                 | [CONFIRMADO] Possui lógica avançada de tolerância: `puxarPublicacoesProcesso`, resolução rigorosa de pares J.TR (`8.12`, `8.24`, `8.09`, `5.24`, `3.00`), cache e sincronização multilateral.                                                                                                                                                                           | O serviço é mais robusto do que o dossiê documentava, atuando como orquestrador do DataJud e DJEN.                                                               |
| **Relacionamento Processo-Cliente**     | Dossiê apontava relacionamento via texto rótulo `cliente`                                                              | [CONFIRMADO] Migration `0016_processos_monitorados_client_id.js` criou a relação formal `client_id` (relation -> `clients`). No código de `datajudService.ts`, o campo `client_id` é preenchido e expandido com sucesso.                                                                                                                                                | A modelagem relacional entre clientes e processos já possui chave estrangeira no banco; deve-se eliminar os campos de rótulo textual legados.                    |
| **Segredos em Backend**                 | Dossiê citava `DATAJUD_API_KEY`, `DATAJUD_API_URL`, `GEMINI_API_KEY`, `SKIP_AI_GATEWAY_API_KEY`, `SKIP_AI_GATEWAY_URL` | [CONFIRMADO via `list_secrets`] Atualmente o backend possui configurados: `PB_INSTANCE_URL`, `PB_SUPERUSER_TOKEN`, `SITE_URL`, `SKIP_AI_GATEWAY_API_KEY`, `SKIP_AI_GATEWAY_URL`. Os segredos `DATAJUD_API_KEY` e `GEMINI_API_KEY` NÃO constam na lista ativa de secrets da infraestrutura, forçando os hooks a usarem as constantes de fallback em texto.               | [ALTO RISCO] Vulnerabilidade ativa confirmada: chamadas do DataJud estão usando a chave pública comunitária hardcoded no código por falta de secret no ambiente. |
| **Realtime do PocketBase**              | Dossiê citava apenas subscrição em `clients`                                                                           | [CONFIRMADO] Existem chamadas ativas de `subscribe` para `clients` em `dataStore.ts`. Não há subscrições ativas para `movimentacoes_processo` ou `alertas_movimentacao` no frontend, dependendo de polling manual.                                                                                                                                                      | A reatividade em tempo real está subutilizada no ecossistema de andamentos processuais.                                                                          |

---

## 3. ARQUITETURA QUE SERÁ PRESERVADA (NÃO MODIFICAR OU REMOVER)

Nenhum dos componentes estruturais abaixo poderá ser removido ou substituído por soluções genéricas. Eles formam a fundação jurídica e técnica comprovada do sistema:

1. **Motor Determinístico de Prazos (`src/services/deadlineEngine.ts`):**  
   [CONFIRMADO] Obedece estritamente às regras do CPC/2015 (Art. 219, 220 e 224), CLT (Art. 775) e CPP (Art. 798). A separação entre interpretação de texto e cômputo matemático é a regra de ouro do sistema. Nenhuma IA fará cálculo direto de prazos.
2. **Oráculo NOX como Interpretador Qualitativo (`pocketbase/hooks/gemini_proxy.js`, `src/services/aiOraculoService.ts`):**  
   [CONFIRMADO] A IA permanece restrita à hermenêutica do ato (identificar natureza da intimação, sugerir preset de prazo e sintetizar o teor), com trava de mérito para o público externo (`preparacao_chat.js`) e fallbacks heurísticos locais (`generateLocalFallbackResponse`).
3. **Módulo de Movimentações DataJud e Linha do Tempo Unificada (`src/components/MovimentacoesDatajudView.tsx`, `src/pages/ProcessDetailPage.tsx`):**  
   [CONFIRMADO] Deduplicação rígida por hash SHA-256 (`hash_dedup`), resolução por J.TR (Resolução CNJ 65/2008) e linha do tempo unificada com atos de tribunal e publicações do diário.
4. **Agendamento de Background Jobs (`pocketbase/hooks/datajud_cron.js`):**  
   [CONFIRMADO] Crons nativos do PocketBase: `datajud_diario` (`0 6 * * *`) e `datajud_semanal` (`0 3 * * 0`).
5. **Cadeia de Custódia Criptográfica (`src/types/sentinela.ts`):**  
   [CONFIRMADO] Snapshots com hash SHA-256 da publicação bruta, etapas de ciclo de vida (`CAPTURADA` -> `VALIDADA` -> `ANALISADA` -> `HOMOLOGADA`) e auditoria em `audit_logs`.
6. **Autenticação RBAC e Segurança de Módulos (`src/services/authUsersService.ts`, `pocketbase/hooks/auth_me.js`, `user_module_permissions`):**  
   [CONFIRMADO] Validação de sessão JWT, diferenciação entre `admin` e `operador`, e proteção granular por chave de módulo.

---

## 4. DÍVIDA TÉCNICA E VULNERABILIDADES CONFIRMADAS

### 4.1 Persistência Híbrida / Dual-Store (`dataStore.ts` vs PocketBase)

- [CONFIRMADO] O arquivo `src/services/dataStore.ts` possui 2.927 linhas e mantém armazenamento duplo em `localStorage` (`nox_control_center_records_v1`, `nox_sentinela_communications_v1`, etc.) e PocketBase.
- **Risco:** Falha de limite de cota (`QuotaExceededError`) nos navegadores ao ultrapassar 5MB; descompasso de dados entre operadores utilizando navegadores diferentes.

### 4.2 Falta de Chaves de Segredo e Credenciais Hardcoded

- [CONFIRMADO] Constante `OFICIAL_PUBLIC_API_KEY` gravada em texto puro nos arquivos `pocketbase/hooks/datajud_consultar.js` (linha 101), `datajud_lote.js` (linha 25) e `datajud_cron.js` (linhas 12 e 321).
- **Risco:** Dependência de chave comunitária do CNJ suscetível a bloqueios, rate-limits ou revogação.

### 4.3 Regras de Acesso Abertas no PocketBase (API Rules)

- [CONFIRMADO no schema] As coleções `clients`, `sentinela_communications`, `records`, `sentinela_agenda`, `sentinela_tasks` e `production_items` possuem regras de API abertas para leitura/gravação sem filtro `@request.auth.id != ""` nos métodos de lista e detalhe.
- **Risco:** Exposição inadvertida caso endpoints nativos do PocketBase sejam consultados sem o intermediador do frontend.

### 4.4 Ausência de Sanitização HTML Robusta (XSS)

- [CONFIRMADO] Uso de `dangerouslySetInnerHTML` em `src/components/TemplateManagerModal.tsx` (linhas 503 e 573) na pré-visualização de arquivos `.docx` convertidos via JSZip.
- **Risco:** Execução de scripts maliciosos caso arquivos Word externos contenham payloads manipulados. Falta biblioteca dedicada de higienização de DOM (DOMPurify).

### 4.5 Gargalos de Paginação com `getFullList()`

- [CONFIRMADO] Consultas em `datajudService.ts`, `ProcessDetailPage.tsx` e `ClientesPage.tsx` utilizam `getFullList()` sem limite de paginação. Em escritórios com mais de 1.000 movimentações, isso causará latência excessiva no cliente.

---

## 5. PLANO MESTRE DE EVOLUÇÃO EM 15 FASES

Abaixo estão descritas as 15 fases sequenciais. A execução deve seguir rigorosamente a ordem abaixo, com verificação de qualidade (`run_qa`) e aprovação entre as fases.

```text
[Fase 0: Auditoria & Plano] -> [Fase 1: Segurança Crítica & Bug Login] -> [Fase 2: Eliminação do Dual-Store]
                                                                                │
[Fase 5: Módulo Atendimento 3 Colunas] <- [Fase 4: Motor de Prazos Determinístico] <- [Fase 3: Schema Atendimento (Migrations)]
             │
[Fase 6: WhatsApp & Canais] -> [Fase 7: Webhooks & Automações] -> [Fase 8: Oráculo Jurídico V2 (RAG)]
                                                                                │
[Fase 11: Portal do Cliente & Intake] <- [Fase 10: Auditoria Criptográfica] <- [Fase 9: Performance & Paginação]
             │
[Fase 12: Produção Jurídica & DOCX] -> [Fase 13: Monitoramento & Observabilidade] -> [Fase 14: Hardening & Homologação Final]
```

---

### FASE 0: AUDITORIA SISTÊMICA E PLANO MESTRE DE EVOLUÇÃO (ESTA FASE)

- **Objetivo:** Radiografia completa do sistema, comparação do código real com a documentação prévia, identificação do bug de login e planejamento detalhado das 15 etapas.
- **Entregável Único Permitido:** `CENTRAL_NOX_PLANO_DE_EVOLUCAO_V2.md` na raiz do projeto.
- **Alterações de Código:** Nenhuma.
- **Rollback:** Exclusão do arquivo Markdown criado.
- **Critério de Saída:** Validação do documento, aprovação formal do usuário e relatório factual.

---

### FASE 1: SEGURANÇA CRÍTICA, CORREÇÃO DO LOGIN E BLINDAGEM DE ACESSO

- **Objetivo:** Resolver com máxima prioridade o bug da rota `/login` caindo no ErrorBoundary, blindar regras de API no PocketBase e isolar segredos.
- **Arquivos Afetados:**
  - `src/components/ErrorBoundary.tsx` (reset por rota e tratamento de erro de DOM).
  - `src/App.tsx` (estabilização do roteamento de login e tratamento de `HashToPathSync`).
  - `src/pages/LoginPage.tsx` (sanitização de `location.state` e tratamento defensivo).
  - `src/services/authUsersService.ts` (checagem segura de token em `pb.authStore`).
  - `pocketbase/hooks/datajud_consultar.js`, `datajud_lote.js`, `datajud_cron.js` (remoção da credencial pública fixa e exigência de variável de ambiente via `set_env`).
  - `pocketbase/migrations/0017_security_rules_hardening.js` (planejada: fechar API rules abertas para `@request.auth.id != ""`).
- **Estratégia de Rollback:** Reversão das migrations de API rules e retorno ao commit da Fase 0.
- **Plano de Testes:**
  - Teste manual e automatizado de acesso direto à URL `/login`.
  - Teste de redirecionamento de usuário não autenticado.
  - Teste de requisição REST sem token JWT aos endpoints das coleções (esperado HTTP 401/403).

---

### FASE 2: ELIMINAÇÃO DEFINITIVA DO DUAL-STORE (UNIFICAÇÃO NO POCKETBASE)

- **Objetivo:** Descontinuar o uso de `localStorage` para registros operacionais volumosos, transformando o PocketBase na única fonte de verdade.
- **Arquivos Afetados:**
  - `src/services/dataStore.ts` (remoção gradual de serializações JSON no `localStorage`, delegando CRUD diretamente ao PocketBase SDK com cache de memória transitório).
  - `src/components/Layout.tsx` (atualização dos contadores de badges para leitura reativa do PocketBase).
  - `src/pages/CentralPrazosPage.tsx`, `src/pages/SentinelaPage.tsx`, `src/pages/ClientesPage.tsx`.
- **Estratégia de Rollback:** Preservar chaves no `localStorage` sob flag de contingência (`featureFlags.ts`) durante 1 sprint antes da exclusão física dos métodos legados.
- **Plano de Testes:**
  - Inserção de registro em uma aba e verificação imediata na outra sem reload (SSE).
  - Simulação de cota cheia no navegador (`QuotaExceededError`) comprovando imunidade da aplicação.

---

### FASE 3: MODELAGEM DE DADOS DO ATENDIMENTO JURÍDICO (MIGRATIONS PLANEJADAS)

- **Objetivo:** Estruturar as 9 coleções necessárias para a futura Central de Atendimento Multicanal no PocketBase, sem criar as migrations prematuramente.
- **Migrations Planejadas (Ordem de Execução Sequencial a partir de `0018`):**
  1. `0018_create_nox_conversations.js`: Tabela mestre de atendimentos/conversas (vínculo com `clients`, canal: WhatsApp/Site/Email, status: triagem/atendimento/concluído, prioridade, responsável).
  2. `0019_create_nox_messages.js`: Histórico de mensagens (conversa_id, remetente: cliente/operador/ia, conteúdo textual, status de entrega: pendente/enviada/lida, external_message_id).
  3. `0020_create_nox_message_attachments.js`: Anexos (mensagem_id, arquivo, tipo_mime, tamanho, hash_sha256).
  4. `0021_create_nox_conversation_participants.js`: Relação entre operadores e conversas para atendimento colaborativo.
  5. `0022_create_nox_assignments.js`: Histórico de distribuição de carga de trabalho e transferências de filas.
  6. `0023_create_nox_internal_notes.js`: Notas internas confidenciais visíveis apenas para a banca jurídica sobre a conversa.
  7. `0024_create_nox_ai_analysis.js`: Triagem cognitiva automática por mensagem/conversa (sentimento, urgência jurídica, risco preclusivo, intenção).
  8. `0025_create_nox_webhook_events.js`: Log de entrada de webhooks para garantir idempotência contra reenvios.
  9. `0026_create_nox_automation_events.js`: Disparos e réguas automáticas executadas pela central.
- **Estratégia de Rollback:** Script de migração com bloco `down()` implementado em cada arquivo para drop seguro de collections.
- **Plano de Testes:**
  - Execução de migração em ambiente de homologação.
  - Teste de integridade referencial e deleção em cascata controlada.

---

### FASE 4: EXPANSÃO E BLINDAGEM DO MOTOR DE PRAZOS DETERMINÍSTICO (LEX TEMPUS)

- **Objetivo:** Reforçar a cobertura de prazos com tribunais de 2º grau e cortes superiores, mantendo isolamento absoluto contra inferências erráticas de LLMs.
- **Arquivos Afetados:**
  - `src/services/deadlineEngine.ts` (adição de tabelas de feriados locais dos tribunais mapeados: TJMS, TJSC, TJGO, TRT24, STJ para 2026-2027).
  - `src/services/lexTempusService.ts` (validação de pré-requisitos antes da homologação).
  - `src/pages/LexTempusPage.tsx` (interface de auditoria visual passo a passo do cômputo).
- **Estratégia de Rollback:** Preservação estrita dos presets originais do CPC (`LEGAL_RULES_PRESETS`); novas regras adicionadas como extensões desativáveis por configuração.
- **Plano de Testes:**
  - Bateria de testes unitários com casos reais do STJ e TJMS contendo feriados forenses regimentais.
  - Verificação de exclusão do dia de começo (Art. 224 CPC) e prorrogação para o primeiro dia útil subsequente.

---

### FASE 5: CENTRAL DE ATENDIMENTO NOX V2 (LAYOUT DE 3 COLUNAS)

- **Objetivo:** Planejar e construir o cockpit integrado de atendimento da advocacia em 3 colunas simultâneas:
  - **Coluna 1 (Esquerda - 25%):** Lista de conversas ativas, filtros de status (Novos, Em Atendimento, Prazos Críticos), badges de SLA e canais.
  - **Coluna 2 (Centro - 45%):** Timeline de mensagens unificada, chat em tempo real, visualização de áudios/documentos, editor com variáveis de cliente.
  - **Coluna 3 (Direita - 30%):** Inteligência Operacional NOX (Ficha 360º do cliente, processos vinculados no DataJud, prazos fatais detectados, sugestões do Oráculo NOX e notas internas).
- **Arquivos Afetados (Futuros):**
  - `src/pages/AtendimentoPage.tsx` (nova tela).
  - `src/components/atendimento/ConversationsList.tsx`.
  - `src/components/atendimento/ChatTimeline.tsx`.
  - `src/components/atendimento/NoxIntelligencePanel.tsx`.
  - `src/types/nox.ts`, `src/services/authUsersService.ts`, `src/components/Layout.tsx` (registro nos 4 pontos obrigatórios).
- **Estratégia de Rollback:** Remoção da rota e ocultação do item no menu lateral sem afetar nenhum outro módulo.
- **Plano de Testes:**
  - Teste de responsividade (painéis retráteis em telas inferiores a 1280px).
  - Teste de envio de mensagens e sincronização via SSE.

---

### FASE 6: INTEGRAÇÃO COM EVOLUTION API / WHATSAPP E CANAIS

- **Objetivo:** Estabelecer canal bidirecional oficial com WhatsApp para notificações de clientes e recepção de demandas.
- **Arquivos Afetados:**
  - `pocketbase/hooks/whatsapp_webhook.js` (novo hook no backend).
  - `src/services/whatsappService.ts` (novo serviço client-side).
  - Configuração de segredos (`EVOLUTION_API_KEY`, `EVOLUTION_API_URL`).
- **Estratégia de Rollback:** Flag de ativação de canal no `SettingsPage.tsx`; desativação instantânea do webhook sem afetar o banco.
- **Plano de Testes:**
  - Simulação de payload de webhook com assinatura HMAC.
  - Teste de idempotência contra repetições de entrega de mensagens pelo WhatsApp.

---

### FASE 7: MOTOR DE WEBHOOKS GENÉRICOS E ORQUESTRAÇÃO VIA N8N

- **Objetivo:** Permitir que fluxos externos (n8n, formulários parceiros, alertas de tribunais) acionem ações na Central NOX com segurança.
- **Arquivos Afetados:**
  - `pocketbase/hooks/webhooks_inbound.js` (autenticação por token secreto `X-Nox-Webhook-Token`).
  - `pocketbase/hooks/webhooks_outbound.js` (disparo de eventos para n8n em mudança de estágio de clientes ou prazos fatais).
- **Estratégia de Rollback:** Remoção do hook de roteamento de webhooks e revogação do token de integração.
- **Plano de Testes:**
  - Teste de rejeição HTTP 401 para payloads sem header de autorização.
  - Teste de processamento assíncrono garantindo que o webhook responda em menos de 500ms.

---

### FASE 8: ORÁCULO JURÍDICO V2 COM RAG E MEMÓRIA PERSISTIDA

- **Objetivo:** Evoluir o Oráculo NOX para utilizar Retrieval-Augmented Generation (RAG) nativo do Skip Cloud (`$ai.embed` / `$ai.agents`), consultando o acervo de peças e decisões do escritório.
- **Arquivos Afetados:**
  - `pocketbase/hooks/ai_oraculo.js` (injeção semântica baseada em vetores).
  - `pocketbase/migrations/0027_create_knowledge_embeddings.js` (planejada: tabela de fragmentos de peças e teses).
  - `src/services/aiOraculoService.ts`.
- **Estratégia de Rollback:** Chave seletora no frontend permitindo alternar entre modo RAG avançado e modo Heurístico Determinístico local.
- **Plano de Testes:**
  - Verificação anti-alucinação: medição de aderência da resposta às peças indexadas.
  - Teste de barreira ética: bloqueio de consultas sobre mérito a usuários externos.

---

### FASE 9: PERFORMANCE, PAGINAÇÃO CURSOR-BASED E REDUÇÃO DE LATÊNCIA

- **Objetivo:** Substituir chamadas `getFullList()` por paginação infinita / cursor-based em todas as tabelas volumosas.
- **Arquivos Afetados:**
  - `src/services/datajudService.ts` (`getMovimentacoes`, `getAlertasMovimentacao`).
  - `src/pages/ProcessDetailPage.tsx` (carregamento sob demanda de movimentações antigas).
  - `src/pages/ClientesPage.tsx`, `src/pages/ProcessesPage.tsx`.
- **Estratégia de Rollback:** Retorno a blocos de carregamento com `perPage: 50` caso a paginação virtualizada apresente instabilidade de scroll.
- **Plano de Testes:**
  - Teste de carga com simulação de 5.000 movimentações em tela única sem perda de FPS.

---

### FASE 10: AUDITORIA CRIPTOGRÁFICA DE PONTA A PONTA E COMPLIANCE

- **Objetivo:** Blindar a coleção `audit_logs` tornando-a imutável (bloqueio de UPDATE e DELETE via hooks do PocketBase) e gerando assinatura SHA-256 encadeada (hash chaining).
- **Arquivos Afetados:**
  - `pocketbase/hooks/audit_protection.js` (hook rejeitando alterações em `audit_logs`).
  - `src/pages/AuditPage.tsx` (interface com validador de integridade da cadeia de logs).
- **Estratégia de Rollback:** Reversão do hook de travamento em caso de necessidade de intervenção estrutural de emergência por superusuário.
- **Plano de Testes:**
  - Tentativa de exclusão de registro de auditoria via API autenticada (esperado HTTP 403).
  - Teste de verificação de hash chaining demonstrando detecção de adulteração.

---

### FASE 11: PORTAL DO CLIENTE E EXPANSÃO DO INTAKE DIGITAL

- **Objetivo:** Modernizar os portais públicos (`/intake` e `/preparacao`), adicionando verificação por código OTP de WhatsApp antes da liberação de simulação de audiência e envio de procuração digital.
- **Arquivos Afetados:**
  - `pocketbase/hooks/preparacao_auth.js` (validação OTP associada ao CPF).
  - `src/pages/PreparacaoPublicPage.tsx`.
  - `src/pages/IntakePublicPage.tsx`.
- **Estratégia de Rollback:** Manter o fallback de autenticação direta por CPF caso o gateway de envio de SMS/WhatsApp esteja indisponível.
- **Plano de Testes:**
  - Fluxo completo de simulação de audiência do cliente com verificação de rito e bloqueio de mérito.

---

### FASE 12: ESTEIRA DE PRODUÇÃO JURÍDICA E PARSER DE DOCUMENTOS SEGURO

- **Objetivo:** Sanitizar integralmente o upload e conversão de minutas `.docx` com `DOMPurify` e integrar a esteira de 5 camadas de evidência ao novo fluxo de atendimento.
- **Arquivos Afetados:**
  - `src/lib/docxParser.ts` (integração de sanitização contra tags maliciosas).
  - `src/components/TemplateManagerModal.tsx`, `src/components/DocumentReviewEditorModal.tsx`.
  - `src/pages/ProducaoPage.tsx`.
- **Estratégia de Rollback:** Retorno à exportação tradicional em texto puro/Word caso o parser encontre arquivos com formatação XML proprietária não mapeada.
- **Plano de Testes:**
  - Tentativa de injeção de script XSS através de arquivo `.docx` manipulado com `<script>alert(1)</script>`.

---

### FASE 13: MONITORAMENTO OPERACIONAL, OBSERVABILIDADE E ALERTAS

- **Objetivo:** Criar barramento de telemetria interna, monitorando tempos de resposta da API DataJud, taxas de rate-limit do DJEN (HTTP 429) e saúde dos crons em tempo real.
- **Arquivos Afetados:**
  - `src/components/MiniRadar.tsx`, `src/pages/RadarPage.tsx`.
  - `pocketbase/hooks/telemetry.js` (novo hook agregador de métricas).
- **Estratégia de Rollback:** O sistema operacional continua funcionando independentemente do painel de telemetria.
- **Plano de Testes:**
  - Simulação de erro HTTP 502 do DataJud e conferência de disparo de alerta visual ao operador.

---

### FASE 14: HARDENING FINAL, HOMOLOGAÇÃO JURÍDICA E DISASTER RECOVERY

- **Objetivo:** Auditoria geral de vulnerabilidades, stress-test com carga máxima de processos, plano documentado de recuperação de desastres (SQLite backups) e homologação formal da banca jurídica.
- **Arquivos Afetados:** Todos os serviços de auditoria e configurações de ambiente.
- **Estratégia de Rollback:** Snapshot de volume Skip Cloud restaurável em menos de 10 minutos.
- **Plano de Testes:**
  - Execução completa da esteira de QA (`oxlint`, `tsc --noEmit`, build de produção).
  - Checklist jurídico de conformidade com o Código de Ética e Disciplina da OAB.

---

## 6. MATRIZ DE ARQUIVOS AFETADOS POR FASE

| Fase        | Foco Principal                 | Arquivos do Frontend                                                                                             | Arquivos do Backend / Migrations                   |
| :---------- | :----------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **Fase 0**  | Auditoria e Plano              | Nenhum                                                                                                           | Nenhum (apenas este `.md`)                         |
| **Fase 1**  | Bug /login, Segurança, Secrets | `src/components/ErrorBoundary.tsx`, `src/App.tsx`, `src/pages/LoginPage.tsx`, `src/services/authUsersService.ts` | `pocketbase/hooks/datajud_*.js`, migration `0017`  |
| **Fase 2**  | Eliminação Dual-Store          | `src/services/dataStore.ts`, `src/components/Layout.tsx`, `src/pages/CentralPrazosPage.tsx`                      | N/A (consumo de collections existentes)            |
| **Fase 3**  | Migrations Atendimento         | N/A                                                                                                              | Migrations `0018` a `0026`                         |
| **Fase 4**  | Motor Prazos LEX TEMPUS        | `src/services/deadlineEngine.ts`, `src/services/lexTempusService.ts`, `src/pages/LexTempusPage.tsx`              | `pocketbase/hooks/gemini_proxy.js`                 |
| **Fase 5**  | Atendimento 3 Colunas          | `src/pages/AtendimentoPage.tsx`, `src/components/atendimento/*`, `src/types/nox.ts`                              | `pocketbase/hooks/conversations_*.js`              |
| **Fase 6**  | WhatsApp / Evolution           | `src/services/whatsappService.ts`, `src/pages/SettingsPage.tsx`                                                  | `pocketbase/hooks/whatsapp_webhook.js`             |
| **Fase 7**  | Webhooks & n8n                 | N/A                                                                                                              | `pocketbase/hooks/webhooks_*.js`                   |
| **Fase 8**  | Oráculo RAG V2                 | `src/services/aiOraculoService.ts`                                                                               | `pocketbase/hooks/ai_oraculo.js`, migration `0027` |
| **Fase 9**  | Paginação & Performance        | `src/services/datajudService.ts`, `src/pages/ProcessDetailPage.tsx`, `src/pages/ClientesPage.tsx`                | Otimização de queries no PocketBase                |
| **Fase 10** | Trilha Imutável / Compliance   | `src/pages/AuditPage.tsx`                                                                                        | `pocketbase/hooks/audit_protection.js`             |
| **Fase 11** | Portais Públicos & OTP         | `src/pages/PreparacaoPublicPage.tsx`, `src/pages/IntakePublicPage.tsx`                                           | `pocketbase/hooks/preparacao_auth.js`              |
| **Fase 12** | Produção & DOCX DOMPurify      | `src/lib/docxParser.ts`, `src/components/TemplateManagerModal.tsx`                                               | N/A                                                |
| **Fase 13** | Telemetria & Observabilidade   | `src/pages/RadarPage.tsx`, `src/components/MiniRadar.tsx`                                                        | `pocketbase/hooks/telemetry.js`                    |
| **Fase 14** | Hardening & Homologação        | Todo o projeto (validações estáticas)                                                                            | Scripts de backup e checagem de integridade        |

---

## 7. ESPECIFICAÇÃO DE TESTES E CONTROLE DE QUALIDADE POR FASE

Para garantir estabilidade durante toda a rearquitetura, cada fase terá requisitos de teste estritos:

1. **Testes Unitários:**
   - Cálculo de prazos em dias úteis com pontes de feriado e prorrogação ex vi legis (`deadlineEngine.ts`).
   - Normalização e validação de números de processo padrão CNJ (20 dígitos).
   - Sanitização de texto contra Prompt Injection (`sanitizeExternalText`).
2. **Testes de Integração:**
   - Deduplicação de movimentos no DataJud por hash SHA-256 (`hash_dedup`).
   - Comunicação backend entre `pocketbase/hooks/` e endpoints externos do CNJ com simulação de timeout.
3. **Testes de Permissão (RBAC):**
   - Verificação de bloqueio para usuários com `role = "operador"` tentando acessar `/usuarios` ou disparar mutações administrativas.
   - Verificação de acesso negado (`AccessDeniedView`) para módulos não autorizados no payload de `/backend/v1/auth/me`.
4. **Testes de Idempotência e Webhooks:**
   - Reenvio do mesmo payload de mensagem externa garantindo que apenas 1 registro seja persistido em `nox_messages`.
5. **Testes de Interface (E2E Essencial):**
   - Carregamento limpo da rota `/login` sem disparo do `ErrorBoundary`.
   - Navegação na Linha do Tempo Unificada em `ProcessDetailPage.tsx` com alternância entre filtros DataJud e Sentinela.

---

## 8. PLANO VISUAL V2: DESIGN SYSTEM NOX & CENTRAL DE ATENDIMENTO

### 8.1 Princípios de Design e Paleta Oficial NOX

[CONFIRMADO no CSS atual `src/main.css`] A interface adota identidade visual de cockpit de alta tecnologia jurídica (High-Precision Dark Architecture):

- **Cores de Fundo:**
  - Base Primária: `#030712` (Black Slate / Deep Void).
  - Shell / Sidebar: `#080d1a` (Dark Navy profundo).
  - Cards e Superfícies: `#0b1329` com efeito de vidro fosco (`nox-glass`, `backdrop-blur-xl`).
- **Acentos e Destaques:**
  - Acento Primário: Azul Elétrico / Cyan (`#06b6d4`, HSL `189 94% 43%`).
  - Alertas Críticos / Vencimentos Fatais: Coral / Magenta (`#f43f5e`, HSL `345 84% 60%`).
  - Publicações / Avisos Operacionais: Âmbar Ouro (`#f59e0b`).
  - Identidade de IA / Sentinela: Aurora Violet / Deep Indigo (`#8b5cf6`).
- **Tipografia:**
  - Títulos e Interface: `Plus Jakarta Sans`, moderna, legível e robusta.
  - Dados Técnicos, CNJ, Hash e Horários: `JetBrains Mono` com números tabulares (`font-mono-nums`).

### 8.2 Conceito Estrutural da Central de Atendimento (3 Colunas)

A futura interface da Central de Atendimento seguirá a disposição:

```text
┌─────────────────────────┬──────────────────────────────────────────┬────────────────────────────┐
│ COLUNA 1: FILA & SESSÕES│ COLUNA 2: CHAT & LINHA TEMPORAL          │ COLUNA 3: NOX INTELIGENCE  │
│ (25% Width)             │ (45% Width)                              │ (30% Width)                │
├─────────────────────────┼──────────────────────────────────────────┼────────────────────────────┤
│ • Barra de busca rápida │ • Cabeçalho com nome do cliente, canal,  │ • Ficha Cadastral 360º     │
│ • Filtros por status:   │   SLA e indicador de segurança           │ • Processos Ativos (CNJ)   │
│   [Novos] [Ativos]      │ • Área de mensagens em bolhas coloridas: │ • Prazos Fatais Detectados │
│   [Prazos] [Críticos]   │   - Verde/Esmeralda: Cliente (WhatsApp)  │ • Assistente Oráculo NOX:  │
│ • Cards de conversas:   │   - Azul/Cyan: Operador / Advogado       │   - Resumo do caso         │
│   - Foto/Avatar         │   - Violeta: Sugestão IA NOX             │   - Minuta de resposta     │
│   - Nome do Cliente     │ • Visualizador de áudio e docs (.docx)   │   - Alerta preclusivo      │
│   - Última mensagem     │ • Editor de resposta com:                │ • Notas Internas da Banca  │
│   - Badge de canal      │   - Templates rápidos                    │ • Linha de Custódia        │
│   - Badge de risco      │   - Variáveis automáticas                │                            │
│   - Tempo sem resposta  │   - Disparo direto ou homologação        │                            │
└─────────────────────────┴──────────────────────────────────────────┴────────────────────────────┘
```

---

## 9. RECOMENDAÇÃO DE PRÓXIMO PASSO IMEDIATO

A Fase 0 foi concluída com êxito sem alterar nenhum arquivo de código, preservando a estabilidade e o histórico do repositório.

A recomendação técnica para a **Fase 1** consiste em:

1. Aplicar a correção do `ErrorBoundary` no roteamento de `src/App.tsx` e `src/components/ErrorBoundary.tsx` para garantir que `/login` renderize com estabilidade.
2. Migrar os segredos de API (`DATAJUD_API_KEY`) para o gerenciador de variáveis de ambiente (`set_env`), eliminando o fallback hardcoded nos hooks.
3. Submeter a Fase 1 à verificação de QA e aguardar validação antes de avançar para o desacoplamento do `dataStore`.

---

_Fim do Documento — CENTRAL NOX PLANO DE EVOLUÇÃO V2._
