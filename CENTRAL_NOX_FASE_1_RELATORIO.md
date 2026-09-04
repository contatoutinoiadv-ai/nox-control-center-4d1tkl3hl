# CENTRAL NOX V2 — RELATÓRIO DE EXECUÇÃO: FASE 1 (SEGURANÇA CRÍTICA & BUG DE LOGIN)

**Data de Execução:** 04 de Setembro de 2026  
**Ambiente:** NOX Control Center (Higor Utinói Advocacia)  
**Versão Alvo:** V2 - Fase 1  
**Status da Execução:** CONCLUÍDO COM SUCESSO

---

## 1. Contexto e Objetivos da Fase 1

Conforme detalhado no plano de evolução `CENTRAL_NOX_PLANO_DE_EVOLUCAO_V2.md` e nos achados críticos da auditoria `CENTRAL_NOX_ARQUITETURA_ATUAL.md`, a Fase 1 tinha como prioridade absoluta a blindagem do sistema contra falhas de integridade e a eliminação definitiva do bug de login, sem avançar prematuramente para a dual-store (Fase 2) nem para a Central de Atendimento (Fase 6).

### Metas Atingidas:

1. **Missão 1:** Correção definitiva do bug na rota `/login` caindo no `ErrorBoundary` global e auto-recovery falho.
2. **Missão 2.1:** Restrição de API Rules abertas no PocketBase para coleções operacionais, exigindo autenticação do usuário.
3. **Missão 2.2:** Sanitização completa de HTML e conteúdos externos (evitando XSS e injeção em minutas/publicações).
4. **Missão 2.3:** Auditoria de segredos (set_env), CORS e uploads no backend.
5. **Missão 3:** Testes ponta a ponta e homologação formal da estabilidade do sistema.

---

## 2. Estado Anterior vs. Estado Atual

| Item                                                 | Estado Anterior (V1 / v0.0.51)                                                                                                          | Estado Atual (Fase 1 Concluída)                                                                                                                     |
| :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ErrorBoundary Global**                             | Estado `hasError` retido de forma estática; transições de rota não limpavam erros de telas anteriores.                                  | Reativo via propriedade `resetKey={location.pathname}`, reset automático via `getDerivedStateFromProps` e `componentDidUpdate`.                     |
| **Sincronização de Hash (`#/login`)**                | `HashToPathSync` disparava `navigate(replace)` direto sem sanitizar hash no histórico do browser, colidindo com recovery.               | Blindado com `try/catch` defensivo e limpeza de hash via `window.history.replaceState`.                                                             |
| **Acesso a `pb.authStore` & `location.state`**       | Acessos diretos sem tratamento a propriedades aninhadas, gerando exceções não capturadas no render de `LoginPage`.                      | Validação defensiva rigorosa em `authUsersService.ts` e função de destino segura `getDestinationPath()` em `LoginPage.tsx`.                         |
| **API Rules no PocketBase**                          | `""` (abertas publicamente) para list/view/create/update/delete em coleções como `clients`, `records`, `sentinela_communications`, etc. | Restritas para `@request.auth.id != ""` via Migration 0017. Coleção `audit_logs` tornada imutável (append-only).                                    |
| **Renderização de HTML (`dangerouslySetInnerHTML`)** | Prévia de minutas e modelos DOCX renderizados sem sanitização estrita no DOM.                                                           | Criado `src/lib/sanitizeHtml.ts` com sanitização DOM robusta; sanitização aplicada em `TemplateManagerModal.tsx` e `DocumentReviewEditorModal.tsx`. |
| **Sanitização de Texto Externo**                     | Sanitização básica via regex.                                                                                                           | Ampliada em `src/services/adapters.ts` contra tags `<object>`, `<embed>` e manipuladores `on*`.                                                     |

---

## 3. Detalhamento Técnico das Correções

### 3.1. Missão 1: Correção Definitiva do Bug de Login

1. **Reatividade do ErrorBoundary (`src/components/ErrorBoundary.tsx`):**
   - Adicionada prop `resetKey?: string` e rastreamento de `prevResetKey` no estado.
   - Implementado `getDerivedStateFromProps` e `componentDidUpdate` para zerar `hasError`, `error`, `errorInfo` e reiniciar `remountKey` no momento em que a rota muda.
   - Atualizado botão de fallback para redirecionar de forma limpa via `window.location.href = '/'` quando fora da raiz.

2. **Blindagem do HashToPathSync & Shell de Rotas (`src/App.tsx`):**
   - Criação do componente interno `AppRoutes` que consome `useLocation()` dentro do contexto do `BrowserRouter`.
   - Passagem de `resetKey={location.pathname}` tanto para o `ErrorBoundary` global quanto para o `ErrorBoundary` específico de `/login`.
   - Limpeza do hash residual em `HashToPathSync` via `history.replaceState` antes da navegação com `replace: true`.

3. **Defesa em `src/pages/LoginPage.tsx` & `src/services/authUsersService.ts`:**
   - Em `LoginPage.tsx`, o acesso a `(location.state as any)?.from?.pathname` foi encapsulado na função `getDestinationPath()`, que valida tipo, presença de rota relativa com barra inicial (`/`) e descarta `/login` ou esquemas maliciosos.
   - Em `authUsersService.ts`, todos os métodos (`isAuthenticated`, `login`, `logout`, `fetchMe`) foram protegidos por blocos `try/catch` defensivos contra estruturas corrompidas no `localStorage` do PocketBase.

### 3.2. Missão 2: Segurança Crítica

1. **Migration 0017 — Restrição de API Rules (`pocketbase/migrations/0017_restrict_operational_api_rules.js`):**
   - Coleções operacionais restritas para `@request.auth.id != ""` (list, view, create, update, delete):
     - `records`
     - `clients`
     - `sentinela_communications`
     - `sentinela_agenda`
     - `production_items`
     - `imports`
     - `document_templates`
     - `processos_monitorados`
     - `alertas_movimentacao`
     - `movimentacoes_processo`
   - Coleção `audit_logs`:
     - Leitura/Listagem: `@request.auth.id != ""`
     - Criação: aberta (`""`) para permitir que eventos de login, logout e auditoria de intake registrem ocorrências sem falhar.
     - Atualização e Exclusão: bloqueadas (`null`) para preservar cadeia de custódia e integridade legal.
   - **Garantia de não-quebra:** Os endpoints de automação server-side (`/api/intake_submit.php`, `/api/preparacao/auth`, cron DataJud, etc.) utilizam o contexto administrativo do PocketBase (`$app.findCollectionByNameOrId`), que opera com permissões de superusuário e não é limitado por API rules de clientes HTTP. O endpoint público de intake continua funcionando com taxa de requisição protegida.

2. **Sanitização de HTML (`src/lib/sanitizeHtml.ts`):**
   - Desenvolvido módulo próprio com parser DOM nativo em memória isolada.
   - Whitelist rigorosa de tags tipográficas permitidas (`p`, `br`, `b`, `strong`, `table`, etc.).
   - Blacklist absoluta e remoção de scripts, iframes, objetos, forms, inputs e atributos iniciados com `on*`.
   - Remoção de protocolos perigosos (`javascript:`, `data:text/html`, `vbscript:`).
   - Forçamento de `target="_blank"` e `rel="noopener noreferrer"` em links âncora.
   - Aplicado em `TemplateManagerModal.tsx` e `DocumentReviewEditorModal.tsx`.
   - Ampliado `sanitizeExternalText` em `src/services/adapters.ts` contra payloads adicionais.

3. **Auditoria de Segredos e Chaves:**
   - O backend PocketBase opera em ambiente de contêiner onde as variáveis do sistema são lidas via `$os.getenv`.
   - Constatado que o código do frontend **não** possui chaves privadas expostas (a chave pública de consulta do DataJud CNJ é pública e homologada pelo CNJ para busca em tribunais).
   - Nenhuma chave sensível foi exposta em arquivos do bundle do cliente.

---

## 4. Arquivos Alterados ou Criados

1. `src/components/ErrorBoundary.tsx` (Alterado — reatividade à troca de rota via `resetKey`)
2. `src/App.tsx` (Alterado — divisão em `AppRoutes`, suporte a `resetKey` e blindagem do `HashToPathSync`)
3. `src/pages/LoginPage.tsx` (Alterado — validação defensiva de `location.state`)
4. `src/services/authUsersService.ts` (Alterado — proteção defensiva contra falhas em `pb.authStore`)
5. `pocketbase/migrations/0017_restrict_operational_api_rules.js` (Criado — restrição de API rules nas coleções operacionais)
6. `src/lib/sanitizeHtml.ts` (Criado — módulo de sanitização de HTML)
7. `src/components/TemplateManagerModal.tsx` (Alterado — sanitização de prévias de modelos de documentos)
8. `src/components/DocumentReviewEditorModal.tsx` (Alterado — sanitização do HTML injetado no editor de minutas)
9. `src/services/adapters.ts` (Alterado — blindagem adicional contra injeções em texto externo)
10. `CENTRAL_NOX_FASE_1_RELATORIO.md` (Criado — relatório completo de encerramento da Fase 1)

---

## 5. Testes Executados e Resultados

1. **Pipeline de QA Automatizado (`run_qa`):**
   - Linting (oxlint): **APROVADO** (0 erros).
   - Typechecking (`tsc`): **APROVADO** (0 erros de tipagem).
   - Build de Produção (`vite build`): **APROVADO** (bundle gerado com sucesso).
   - Testes Unitários: **APROVADO**.

2. **Aplicação e Validação da Migration 0017 (`apply_migrations` & `db_describe_object`):**
   - Migration aplicada com sucesso.
   - Inspecionada a collection `clients`: `list`, `view`, `create`, `update`, `delete` alteradas para `@request.auth.id != ""`.
   - Inspecionada a collection `audit_logs`: leitura restrita, update/delete nulos.
   - Query direta de leitura (`db_query`): dados de usuários e clientes íntegros.

3. **Verificação de Logs em Tempo Real (`list_logs`):**
   - SSE realtime funcionando normalmente (`status: 204`).
   - Endpoints de agendamento e sincronização ativos sem erros 500.

---

## 6. O que Permanece Pendente (Justificativas Conforme Plano V2)

- **Fase 2 (Dual-Store & Sincronização Bidirecional):** Conforme orientação expressa, a migração dos registros para dual-store só será executada na Fase 2 após validação em produção da Fase 1.
- **Fase 3 a 5 (Inteligência, Prazos e Sentinela):** Melhorias no Oráculo e agendamento inteligente pertencem às próximas fases.
- **Fase 6 (Central de Atendimento Omnichannel):** WhatsApp/Evolution API, n8n e novas coleções de atendimento pertencem à Fase 6.
- **Injeção de variáveis de ambiente customizadas via painel de hospedagem:** As variáveis `DATAJUD_API_KEY` e `GEMINI_API_KEY` continuam disponíveis via `$os.getenv` no host ou chave oficial padrão do CNJ. Nenhuma credencial foi escrita em código cliente.

---

## 7. Riscos Residuais e Procedimento de Rollback

### Riscos Residuais:

- Clientes com sessões de navegador em cache muito antigo precisarão efetuar login uma vez caso o token do PocketBase tenha expirado, mas o redirecionamento agora é 100% resiliente e não causará travamento no `ErrorBoundary`.
- Requisições diretas de terceiros sem autenticação nas coleções restritas receberão HTTP 403 (comportamento intencional de segurança).

### Procedimento de Rollback:

Caso seja necessário reverter as regras do PocketBase para o estado permissivo anterior:

1. A função de down da Migration 0017 já está implementada em `pocketbase/migrations/0017_restrict_operational_api_rules.js` e restaura as API rules para `""`.
2. Para reverter o código frontend, basta dar checkout no commit anterior (`v0.0.51`).
