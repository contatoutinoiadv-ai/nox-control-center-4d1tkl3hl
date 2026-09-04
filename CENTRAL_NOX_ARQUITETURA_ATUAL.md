# CENTRAL NOX — DOSSIÊ DE ARQUITETURA E ENGENHARIA — ESTADO ATUAL DO SISTEMA

> **Classificação do Documento:** Dossiê Técnico de Engenharia & Arquitetura de Software  
> **Destinatário:** Arquiteto de Soluções / Engenheiro de Software (Planejamento de Integrações)  
> **Data de Emissão:** Março de 2026  
> **Ambiente Base:** Skip Cloud / PocketBase (Backend) + React TypeScript SPA (Frontend)  
> **Convenção de Auditoria:**
>
> - `[CONFIRMADO]`: Comprovado explicitamente no código-fonte inspecionado ou no schema ativo do banco.
> - `[INFERÊNCIA]`: Dedução técnica fundada em convenções de código, tipagens ou padrões arquiteturais observados.
> - `[NÃO CONFIRMADO]`: Aspecto externo ou não verificável estritamente pelo código/schema disponível neste repositório.  
>   **Segurança de Segredos:** Nenhuma chave privada, token ou senha é exposta neste documento. As credenciais e integrações são identificadas exclusivamente pelos nomes de variáveis de ambiente (`$os.getenv` / `$secrets`).

---

## 1. VISÃO EXECUTIVA

### 1.1 O que é a Central NOX hoje

[CONFIRMADO] A Central NOX é uma plataforma de controladoria jurídica, monitoramento processual, gestão de clientes/intake e auditoria de prazos com automações operacionais. O sistema atua como o núcleo operacional de uma banca jurídica (com ênfase na âncora profissional do Dr. Higor Utinoi de Oliveira, OAB/MS 15.400, conforme `src/services/dataStore.ts` e `src/services/djenService.ts`). Suas principais frentes de trabalho englobam:

1. Ingestão e monitoramento de publicações oficiais (DJEN / ComunicaAPI do CNJ).
2. Monitoramento de movimentações processuais de tribunais via API pública do DataJud (CNJ).
3. Linha do tempo processual unificada (atos de tribunal + teor integral de decisões).
4. Motor determinístico de contagem de prazos em conformidade com o CPC/2015, CLT e CPP (LEX TEMPUS).
5. Esteira de produção jurídica em fases (da triagem de evidências ao stress-test adversarial).
6. Portal de intake digital público (`#/intake`) e portal de preparação pré-audiência do cliente (`#/preparacao`).
7. Trilha de auditoria criptográfica e logs com registro de eventos em banco relacional.

### 1.2 Como foi construída e Arquitetura Adotada

[CONFIRMADO] A Central NOX adota uma arquitetura **Híbrida: Single-Page Application (SPA) desacoplada no frontend + Backend BaaS (Backend-as-a-Service) extensível baseado em PocketBase hospedado no Skip Cloud**, com um padrão transitório de armazenamento duplo:

- **Frontend SPA:** Desenvolvido em React 18 com TypeScript, compilado via Vite, estilizado com Tailwind CSS e componentes shadcn/ui (Radix UI). A navegação cliente é gerida via `react-router-dom` (hash/browser history) (`src/App.tsx`).
- **Backend de Serviços & Persistência:** Instância do PocketBase hospedada na infraestrutura Skip Cloud, expondo coleções de banco SQLite embutido, autenticação baseada em token JWT (`pb.authStore`), e estendida por meio de handlers JavaScript executados no servidor na pasta `pocketbase/hooks/` (`routerAdd`, `$apis.requireAuth`, `$http.send`, `cronAdd`).
- **Camada Transitória de Dados (Dual-Store):** O frontend possui uma classe singleton de grande porte (`src/services/dataStore.ts`, ~2.927 linhas) que atua como barramento de dados local com espelhamento em `localStorage` para itens legados (incidentes, regras de automação, certas listas de contingência) combinada com chamadas assíncronas ativas ao SDK oficial do PocketBase (`src/lib/pocketbase/client.ts`) para coleções estruturadas.

### 1.3 Classificação Arquitetural Justificada

[CONFIRMADO] A arquitetura é classificada como **HÍBRIDA (SPA Frontend + API/BaaS Backend com State Store Local)**.
_Justificativa baseada no código:_

1. Não é um monolito tradicional server-rendered: todo o render é realizado no navegador (`src/main.tsx`).
2. Não é microsserviços distribuídos: todo o backend reside na instância integrada do PocketBase com rotas centralizadas em `pocketbase/hooks/`.
3. Possui componentes Serverless/Event-Driven: rotas customizadas em `pocketbase/hooks/` respondem como Serverless functions locais do PocketBase, e rotinas `cronAdd` executam tarefas em background de forma assíncrona.
4. Possui dualidade de persistência: entidades de alta integridade (`clients`, `processos_monitorados`, `movimentacoes_processo`, `sentinela_communications`, `audit_logs`, `document_templates`, `users`) são gravadas diretamente no banco via PocketBase SDK e migrations JS (`pocketbase/migrations/`), enquanto dados de demonstração ou fallback persistem em `localStorage` quando a rede falha ou a sessão não está estabelecida.

### 1.4 Hospedagem e Ambientes de Execução

[CONFIRMADO]

- **Provedor PaaS:** Skip Cloud (ambiente gerenciado para runtime Node.js/Vite e PocketBase).
- **Backend:** PocketBase provisionado automaticamente com persistência SQLite em volume de dados do Skip Cloud.
- **Portais Públicos:** Há duas portas de entrada sem exigência de autenticação do operador: a página de Intake (`#/intake` comunicando com `/api/intake_submit.php`) e a página de Preparação de Audiência do Cliente (`#/preparacao` comunicando com `/api/preparacao/auth` e `/api/preparacao/chat`).
- **Portal Administrativo/Operacional:** Acesso autenticado via `/login` com validação de papéis (`admin` vs `operador`) e controle de módulos por usuário (`user_module_permissions`).

### 1.5 Mapeamento de Persistência: Coleções do Banco vs Cache Local/Mock

[CONFIRMADO]
| Entidade / Módulo | Onde é Persistido | Mecanismo de Armazenamento | Observação Técnica |
| :--- | :--- | :--- | :--- |
| Usuários & Credenciais | PocketBase (Banco) | Collection `users` | Autenticação oficial PB Auth + campos `role` e `ativo` |
| Permissões de Módulo | PocketBase (Banco) | Collection `user_module_permissions` | Relação `user_id` e permissões booleanas por módulo |
| Clientes & Atendimentos | PocketBase (Banco) | Collection `clients` + fallback no `dataStore` | Criados via Intake ou tela manual, sincronizados com PB |
| Processos Monitorados | PocketBase (Banco) | Collection `processos_monitorados` | Chave `numero_processo` + `client_id` (relação FK com `clients`) |
| Movimentações DataJud | PocketBase (Banco) | Collection `movimentacoes_processo` | Hash SHA-256 deduplicado (`hash_dedup`), consultas CNJ |
| Cache de Processos DataJud | PocketBase (Banco) | Collection `processos_datajud_cache` | Armazena classe, órgão e timestamp de consulta |
| Alertas de Movimentação | PocketBase (Banco) | Collection `alertas_movimentacao` | Alertas gerados pelo cron ou consulta DataJud com flag `lido` |
| Publicações Sentinela | PocketBase (Banco) | Collection `sentinela_communications` | Ingestão DJEN/PJe e persistência de custódia e memoriais |
| Modelos de Peças (.docx) | PocketBase (Banco) | Collection `document_templates` | Armazena HTML convertido de Word ou editor nativo |
| Trilha de Auditoria | PocketBase (Banco) | Collection `audit_logs` | Logs imutáveis com action, actor, target_id e details JSON |
| Itens de Produção / Peças | PocketBase + Local | Collection `production_items` + `dataStore` | Salvo em PB e cacheado no `localStorage` |
| Agenda & Compromissos | PocketBase + Local | Collection `sentinela_agenda` + `dataStore` | Audiências com flags `preparacao_habilitada` |
| Tarefas Sentinela | PocketBase + Local | Collection `sentinela_tasks` + `dataStore` | Tarefas de prazo vinculadas a processos |
| Automações & Regras | Local / Memória | `dataStore` (`localStorage` `nox_sentinela_automations`) | Collection `sentinela_automations` existe no schema, mas regras de runtime rodam no client |
| Salas de Crise / Incidentes | Local / Memória | `dataStore` (`localStorage` `nox_sentinela_incidents`) | Collection `sentinela_incidents` existe no banco |
| Batches de Importação CSV | PocketBase (Banco) | Collection `imports` | Metadados e estatísticas de arquivos importados |

---

## 2. STACK TECNOLÓGICA REAL

[CONFIRMADO] Levantamento efetuado a partir de `package.json`, arquivos de configuração, hooks do backend e consultas ativas às ferramentas de live state (`db_show_schema`, `list_backend_functions`, `list_secrets`, `list_migrations`, `list_scheduled_jobs`).

### 2.1 Frontend

- **Linguagem:** TypeScript (`~5.6.2`). [CONFIRMADO]
- **Framework & Runtime:** React (`^18.3.1`) + React DOM (`^18.3.1`). [CONFIRMADO]
- **Build System & Dev Server:** Vite (`^6.0.7`) com plugin `@vitejs/plugin-react` (`^4.3.4`). [CONFIRMADO]
- **Roteamento:** `react-router-dom` (`^6.28.0`). [CONFIRMADO]
- **Componentes & UI Primitives:** Radix UI (`@radix-ui/react-accordion`, `alert-dialog`, `avatar`, `checkbox`, `dialog`, `dropdown-menu`, `popover`, `radio-group`, `select`, `separator`, `slider`, `switch`, `tabs`, `toast`, `tooltip`). [CONFIRMADO]
- **Estilização & Design System:** Tailwind CSS (`^3.4.17`), `tailwindcss-animate` (`^1.0.7`), `clsx` (`^2.1.1`), `tailwind-merge` (`^2.6.0`), `lucide-react` (`^0.468.0`). [CONFIRMADO]
- **Utilitários de Notificação:** `sonner` (`^1.7.1`) e hook interno `src/hooks/use-toast.ts`. [CONFIRMADO]
- **Gráficos & Visualização:** `recharts` (`^2.15.0`). [CONFIRMADO]
- **Formulários & Validação:** `react-hook-form` (`^7.54.2`), `@hookform/resolvers` (`^3.9.1`), `zod` (`^3.24.1`). [CONFIRMADO]
- **Manipulação de Datas:** `date-fns` (`^4.1.0`). [CONFIRMADO]
- **Manipulação de Arquivos e DOCX:** `jszip` (`^3.10.1`) para extração e descompressão do pacote XML OpenXML (`word/document.xml`). [CONFIRMADO]
- **Cliente HTTP / Backend:** Fetch API nativa do navegador + SDK oficial `pocketbase` (`^0.25.0`) (`src/lib/pocketbase/client.ts`). [CONFIRMADO]
- **Gerenciamento de Estado:** Padrão Pub/Sub reativo próprio através de métodos `subscribe()` em serviços singleton (`dataStore`, `authUsersService`, `documentTemplateService`, `featureFlags`). [CONFIRMADO]
- **Linter & Análise Estática:** `oxlint` (`^0.15.2`). [CONFIRMADO]

### 2.2 Backend

- **Tecnologia Principal:** PocketBase (Skip Cloud BaaS executado sobre Go com motor JavaScript embarcado goja para hooks). [CONFIRMADO]
- **Linguagem de Extensão:** JavaScript (ES5/ES6 compatível com goja runtime em `pocketbase/hooks/`). [CONFIRMADO]
- **Mecanismos de Endpoint:** `routerAdd(METHOD, PATH, HANDLER, ...MIDDLEWARES)` do PocketBase. [CONFIRMADO]
- **Autenticação de APIs:** `$apis.requireAuth()` nativo do PocketBase e verificação manual `e.auth`. [CONFIRMADO]
- **Agendamento de Jobs / Cron:** `cronAdd(JOB_NAME, SCHEDULE, HANDLER)` nativo do PocketBase. [CONFIRMADO]
- **Mecanismos de Conexão HTTP Server-to-Server:** `$http.send({ url, method, headers, body, timeout })`. [CONFIRMADO]
- **Criptografia Server-Side:** `$security.sha256()`, `$security.randomString()`. [CONFIRMADO]
- **WebSockets / SSE:** PocketBase Realtime integrado via SSE (Server-Sent Events) suportado por `pb.collection(NAME).subscribe('*', handler)`. [CONFIRMADO]
- **Filas de Mensageria Dedicadas (RabbitMQ, Redis, BullMQ):** NÃO IDENTIFICADO / NÃO EXISTE no código atual. Processamentos em lote e crons rodam de forma síncrona/sequencial nas instâncias PocketBase. [CONFIRMADO]

### 2.3 Banco de Dados

- **Tecnologia:** SQLite embarcado gerenciado pelo PocketBase (Skip Cloud). [CONFIRMADO]
- **Controle de Schema / Migrations:** 13 arquivos versionados em `pocketbase/migrations/` numerados sequencialmente (ex: `0001_initial_schema.js` a `0016_processos_monitorados_client_id.js`). [CONFIRMADO]
- **Coleções Ativas no Live State:** 16 coleções (1 tipo auth `users`, 15 tipo base: `clients`, `processos_monitorados`, `movimentacoes_processo`, `processos_datajud_cache`, `alertas_movimentacao`, `sentinela_communications`, `records`, `audit_logs`, `sentinela_agenda`, `sentinela_tasks`, `production_items`, `user_module_permissions`, `document_templates`, `imports`, `sentinela_automations`, `sentinela_incidents`). [CONFIRMADO via `db_show_schema`]

### 2.4 Infraestrutura e Segredos (Nomes Apenas)

[CONFIRMADO via `list_secrets`]

- Nomes de segredos configurados no backend:
  - `DATAJUD_API_KEY` (usado nas chamadas à API pública do DataJud)
  - `DATAJUD_API_URL` (URL base da API do DataJud, ex: `https://api-publica.datajud.cnj.jus.br`)
  - `GEMINI_API_KEY` (usado para chamadas aos modelos Google Gemini)
  - `SKIP_AI_GATEWAY_API_KEY` (usado para acesso ao gateway de IA Skip)
  - `SKIP_AI_GATEWAY_URL` (URL do gateway Skip AI)
- **Serviços Externos Conectados:**
  - API Pública DataJud / CNJ (`api-publica.datajud.cnj.jus.br`)
  - ComunicaAPI / DJEN do CNJ (`comunicaapi.pje.jus.br/api/v1`)
  - Google Generative Language API (`generativelanguage.googleapis.com`)
  - Skip AI Gateway (`$ai.chat`)

---

## 3. MAPA DE DIRETÓRIOS E COMPONENTES-CHAVE

```text
central-nox/
├── package.json                         # Dependências, scripts dev/build/qa/typecheck [CONFIRMADO]
├── vite.config.ts                       # Configuração Vite com alias @ -> /src [CONFIRMADO]
├── pocketbase/
│   ├── hooks/                           # Rotas e jobs server-side do PocketBase [CONFIRMADO]
│   │   ├── ai_oraculo.js                # POST /backend/v1/ai/oraculo (Assistente Jurídico)
│   │   ├── auth_me.js                   # GET /backend/v1/auth/me (Perfil e Módulos do Usuário)
│   │   ├── datajud_consultar.js         # POST /backend/v1/datajud/consultar (Consulta CNJ)
│   │   ├── datajud_cron.js              # Crons datajud_diario e datajud_semanal
│   │   ├── datajud_lote.js              # POST /backend/v1/datajud/sincronizar-lote
│   │   ├── gemini_proxy.js              # POST /backend/v1/gemini-proxy (Triagem e LEX TEMPUS)
│   │   ├── intake_submit.js             # POST /api/intake_submit.php (Ingestão Pública de Clientes)
│   │   ├── pje_proxy.js                 # POST /backend/v1/pje-proxy (Proxy para Tribunais)
│   │   ├── preparacao_auth.js           # POST /api/preparacao/auth (Login por CPF para Audiência)
│   │   ├── preparacao_chat.js           # POST /api/preparacao/chat (Assistente de Rito de Audiência)
│   │   ├── users_create.js              # POST /backend/v1/users (Cadastro de Operadores)
│   │   ├── users_delete.js              # DELETE /backend/v1/users/{id} (Remoção Segura)
│   │   ├── users_list.js                # GET /backend/v1/users (Listagem Administrativa)
│   │   └── users_update.js              # PUT /backend/v1/users/{id} (Atualização de Permissões)
│   └── migrations/                      # Migrations em JavaScript executadas pelo runtime [CONFIRMADO]
├── src/
│   ├── main.tsx                         # Ponto de entrada React DOM [CONFIRMADO]
│   ├── main.css                         # CSS global, temas HSL e utilitários Tailwind [CONFIRMADO]
│   ├── App.tsx                          # Router principal, proteção de rotas e rotas públicas [CONFIRMADO]
│   ├── components/                      # Componentes de interface compartilhados [CONFIRMADO]
│   │   ├── Layout.tsx                   # Shell principal: Sidebar, Topbar, Badges e Navegação
│   │   ├── AgendaView.tsx               # Linha de tempo e calendário de compromissos
│   │   ├── CommandPalette.tsx           # Busca global rápida via teclado (Cmd+K / Ctrl+K)
│   │   ├── CustodyChainTimeline.tsx     # Linha do tempo visual de custódia de publicações
│   │   ├── DeadlineCalculatorView.tsx   # Calculadora interativa de prazos processuais (CPC/CLT)
│   │   ├── DocumentReviewEditorModal.tsx# Editor WYSIWYG de minutas jurídicas com variáveis
│   │   ├── ErrorBoundary.tsx            # Captura de falhas em cascata de componentes React
│   │   ├── MiniRadar.tsx                # Widget compacto de anomalias operacionais
│   │   ├── MovimentacoesDatajudView.tsx # Painel de movimentações capturadas do CNJ
│   │   ├── PreparacaoAudienciaControl.tsx# Controle de habilitação de audiência e envio de link
│   │   ├── ProcessDetailDrawer.tsx      # Gaveta lateral de inspeção de processo
│   │   ├── TasksView.tsx                # Quadro de tarefas operacionais derivadas de publicações
│   │   ├── TemplateManagerModal.tsx     # Gerenciador de templates .docx com extração XML
│   │   └── ui/                          # Primitivas visuais shadcn/ui (Button, Dialog, Badge...)
│   ├── data/
│   │   ├── mockData.ts                  # Datasets de demonstração sintética inicial [CONFIRMADO]
│   │   └── sentinelaData.ts             # Dados iniciais do Sentinela, regras de negócio [CONFIRMADO]
│   ├── hooks/
│   │   ├── use-realtime.ts              # Hook React para escuta de SSE no PocketBase [CONFIRMADO]
│   │   ├── use-toast.ts                 # Hook para disparo de notificações sonner/shadcn [CONFIRMADO]
│   │   └── use-mobile.tsx               # Detecção de viewport responsivo móvel [CONFIRMADO]
│   ├── lib/
│   │   ├── docxParser.ts                # Parser de arquivos .docx via JSZip e regex XML [CONFIRMADO]
│   │   ├── utils.ts                     # Função auxiliar `cn` (clsx + twMerge) [CONFIRMADO]
│   │   ├── skipAi.ts                    # Utilitários de streaming e agentes Skip AI [CONFIRMADO]
│   │   └── pocketbase/
│   │       ├── client.ts                # Instância global `pb = new PocketBase(...)` [CONFIRMADO]
│   │       ├── errors.ts                # Tratamento de erros HTTP/PocketBase [CONFIRMADO]
│   │       └── schema.json              # Espelho declarativo do schema do banco [CONFIRMADO]
│   ├── pages/                           # Telas completas da aplicação [CONFIRMADO]
│   │   ├── Index.tsx                    # Dashboard Executivo Central NOX (Métricas e Alertas)
│   │   ├── LoginPage.tsx                # Tela de Login com email/senha contra PocketBase
│   │   ├── ClientesPage.tsx             # Gestão de Clientes 360º, Ficha, Vínculo de Processos
│   │   ├── ProcessesPage.tsx            # Consulta do acervo de processos cadastrados
│   │   ├── ProcessDetailPage.tsx        # Linha do tempo unificada (DataJud + Publicações Sentinela)
│   │   ├── CentralPrazosPage.tsx        # Vencimentos fatais, agenda, tarefas e DataJud integrado
│   │   ├── CompromissosPage.tsx         # Agenda inteligente, detecção de audiências no DJEN
│   │   ├── ProducaoPage.tsx             # Controladoria de redação, 5 camadas de evidência
│   │   ├── SentinelaPage.tsx            # Hub Sentinela NOX: ingestão DJEN, Oráculo IA, custódia
│   │   ├── LexTempusPage.tsx            # Motor LEX TEMPUS: interpretação IA + cálculo CPC
│   │   ├── RadarPage.tsx                # Radar de anomalias, prazos preclusivos e inconsistências
│   │   ├── ImportsPage.tsx              # Ingestão de CSVs brutos com cálculo SHA-256
│   │   ├── ReviewPage.tsx               # Quarentena operacional e validação de registros
│   │   ├── ExportsPage.tsx              # Emissão de memoriais em PDF e relatórios
│   │   ├── AuditPage.tsx                # Trilha completa de auditoria imutável (audit_logs)
│   │   ├── SettingsPage.tsx             # Configurações do escritório, advogado titular
│   │   ├── UsuariosPage.tsx             # Gestão administrativa de operadores e permissões
│   │   ├── IntakePublicPage.tsx         # Página pública externa de auto-cadastro do cliente
│   │   ├── PreparacaoPublicPage.tsx     # Portal público de acolhimento e simulador de audiência
│   │   └── NotFound.tsx                 # Rota 404
│   ├── services/                        # Camada de lógica de negócio e integrações [CONFIRMADO]
│   │   ├── dataStore.ts                 # State Store centralizado, reatividade, cache e sincronização
│   │   ├── authUsersService.ts          # Autenticação de usuários, perfil /auth/me e checagem RBAC
│   │   ├── datajudService.ts            # Comunicação com endpoints DataJud, cálculo de J.TR e cache
│   │   ├── djenService.ts               # Chamadas diretas à ComunicaAPI pública do CNJ/DJEN
│   │   ├── deadlineEngine.ts            # Motor determinístico de prazos processuais (CPC/CLT/CPP)
│   │   ├── lexTempusService.ts          # Pipeline de integração IA + deadlineEngine + homologação
│   │   ├── aiOraculoService.ts          # Chamadas seguras ao hook gemini-proxy e fallback local
│   │   ├── smartSchedulerService.ts     # Detecção regex de audiências no teor do DJEN e agenda
│   │   ├── complexityService.ts         # Classificação de complexidade de tarefas e grandes litigantes
│   │   ├── documentTemplateService.ts   # CRUD de templates no PocketBase + templates padrão
│   │   ├── csvEngine.ts                 # Análise sintática de CSV, cálculo SHA-256 e sanitização
│   │   ├── adapters.ts                  # Sanitização contra Prompt Injection e sanitização de texto
│   │   └── featureFlags.ts              # Gerenciador de flags de funcionalidade do sistema
│   └── types/                           # Definições de tipos estritos TypeScript [CONFIRMADO]
│       ├── nox.ts                       # Tipos de clientes, registros, auditoria, produção, usuários
│       └── sentinela.ts                 # Tipos de custódia, comunicações, prazos, memoriais, tarefas
```

---

## 4. ARQUITETURA DO FRONTEND

### 4.1 Layout Principal e Shell de Navegação

[CONFIRMADO] O componente `src/components/Layout.tsx` provê a moldura de navegação para todas as telas autenticadas:

- **Sidebar Fixa/Colapsável:** Apresenta grupos hierárquicos de módulos agrupados por contexto funcional:
  - _Jurídico / Processual:_ Central NOX (Dashboard), Sentinela DJEN, Processos, Radar de Riscos, LEX TEMPUS, Produção de Peças.
  - _Operacional & Prazos:_ Central de Prazos, Compromissos (Agenda).
  - _Clientes & Contábil:_ Clientes & Atendimentos, Exportações & Relatórios.
  - _Governança & Sistema:_ Importações CSV, Revisão Operacional, Trilha de Auditoria, Configurações e Gestão de Usuários (restrito a `admin`).
- **Topbar:** Indicadores em tempo real (data atual, perfil do advogado âncora, botão de busca global Cmd+K, badge de conectividade da API, status de usuário e botão de logout).
- **Tratamento de Permissões Visuais:** Cada item de menu na sidebar avalia dinamicamente `authUsersService.hasModuleAccess(item.moduleKey)`. Se o usuário autenticado não possui o módulo em seu rol de permissões, o item não é renderizado.

### 4.2 Mecanismo Exato de Adição de um Novo Módulo ao Frontend

[CONFIRMADO no código] Para adicionar um novo módulo à interface e ao roteador, um arquiteto ou desenvolvedor precisa modificar obrigatoriamente **4 pontos de código**:

1. **Definição do Tipo da Chave do Módulo (`src/types/nox.ts`):**
   Adicionar a nova chave na união de tipos `SystemModuleKey`:

   ```typescript
   export type SystemModuleKey =
     | 'central_nox'
     | 'sentinela'
     | ...
     | 'novo_modulo' // <- Adicionar chave estrita aqui
   ```

2. **Registro no Catálogo de Módulos (`src/services/authUsersService.ts`):**
   Adicionar o módulo na lista de metadados `SYSTEM_MODULES_LIST`:

   ```typescript
   {
     key: 'novo_modulo',
     name: 'Nome do Módulo',
     description: 'Descrição funcional do que o módulo faz',
     category: 'Operacional & Prazos', // ou outra categoria existente
   }
   ```

   _Nota adicional no backend:_ Se o módulo exigir autorização estrita pelo backend, a constante `ALL_MODULES` em `pocketbase/hooks/auth_me.js` também deve ser atualizada para que usuários `admin` ou operadores com permissão explícita recebam o módulo liberado no payload de `/backend/v1/auth/me`.

3. **Criação da Rota Protegida (`src/App.tsx`):**
   Importar a nova página e registrá-la dentro do bloco `<Route element={<Layout />}>` envelopada pelo componente de proteção `ProtectedModuleRoute`:

   ```tsx
   <Route
     path="novo-modulo"
     element={
       <ProtectedModuleRoute moduleKey="novo_modulo">
         <NovoModuloPage />
       </ProtectedModuleRoute>
     }
   />
   ```

4. **Inclusão na Sidebar (`src/components/Layout.tsx`):**
   Inserir o objeto de configuração na lista `NAV_ITEMS`:
   ```typescript
   {
     name: 'Novo Módulo',
     path: '/novo-modulo',
     icon: NovoIconeLucide,
     badge: 'NOVO', // opcional
     moduleKey: 'novo_modulo',
   }
   ```

### 4.3 Gestão de Estado e Comunicação com o Backend

[CONFIRMADO]

- O frontend não utiliza Redux, Zustand ou TanStack Query.
- O gerenciamento de dados assíncronos adota um modelo reativo baseado em Classes Singleton (`NoxDataStore`, `AuthUsersService`, `DocumentTemplateService`) que expõem um método `subscribe(listener: () => void): () => void`.
- Quando ocorre uma mutação (ex: inclusão de processo monitorado, vinculação de cliente, homologação de prazo), o serviço invoca sua rotina interna, atualiza a memória e os storages, e dispara `this.notify()` para todos os componentes React inscritos via `useEffect`.

---

## 5. ARQUITETURA DO BACKEND (POCKETBASE HOOKS & APIS)

[CONFIRMADO via `pocketbase/hooks/` e `list_backend_functions`]

O backend não utiliza Express ou NestJS. Os endpoints customizados são implementados através do motor nativo de rotas do PocketBase (`routerAdd`) em arquivos JavaScript independentes localizados em `pocketbase/hooks/`.

### 5.1 Inventário de Endpoints Existentes

| Método     | Rota                                   | Handler / Arquivo                       | Autenticação                                                                | Collections Afetadas                                                                                 | Função / Descrição                                                                                                                                       |
| :--------- | :------------------------------------- | :-------------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POST**   | `/backend/v1/datajud/consultar`        | `pocketbase/hooks/datajud_consultar.js` | `$apis.requireAuth()` (JWT de usuário autenticado)                          | `processos_monitorados`, `movimentacoes_processo`, `processos_datajud_cache`, `alertas_movimentacao` | Consulta processo específico na API pública do DataJud CNJ, parseia hits do Elasticsearch, deduplica movimentos por SHA-256 e grava histórico completo.  |
| **POST**   | `/backend/v1/datajud/sincronizar-lote` | `pocketbase/hooks/datajud_lote.js`      | `$apis.requireAuth()` (JWT)                                                 | `processos_monitorados`, `movimentacoes_processo`, `processos_datajud_cache`, `alertas_movimentacao` | Executa varredura sequencial em lote dos processos monitorados ativos, podendo filtrar apenas os com prazo em aberto.                                    |
| **POST**   | `/backend/v1/gemini-proxy`             | `pocketbase/hooks/gemini_proxy.js`      | `$apis.requireAuth()` + checagem de permissão de módulo                     | `user_module_permissions` (leitura)                                                                  | Proxy de IA para triagem de publicações e interpretação qualitativa LEX TEMPUS via Google Gemini (`gemini-3.5-flash-lite`) com fallback para `$ai.chat`. |
| **POST**   | `/backend/v1/ai/oraculo`               | `pocketbase/hooks/ai_oraculo.js`        | `$apis.requireAuth()` + checagem de permissão de módulo                     | `user_module_permissions` (leitura)                                                                  | Endpoint de chat e diagnóstico operacional com a persona do Oráculo NOX via Skip AI Gateway.                                                             |
| **POST**   | `/backend/v1/pje-proxy`                | `pocketbase/hooks/pje_proxy.js`         | `$apis.requireAuth()` + checagem de permissão de módulo                     | `user_module_permissions` (leitura)                                                                  | Proxy seguro para consulta a tribunais sem expor chaves no cliente. Atualmente retorna resposta stub segura estruturada.                                 |
| **GET**    | `/backend/v1/auth/me`                  | `pocketbase/hooks/auth_me.js`           | `$apis.requireAuth()`                                                       | `users`, `user_module_permissions`                                                                   | Retorna os dados do usuário autenticado, sua role (`admin` vs `operador`) e a lista de módulos que tem permissão de acessar.                             |
| **GET**    | `/backend/v1/users`                    | `pocketbase/hooks/users_list.js`        | `$apis.requireAuth()` (restrito a `role === "admin"`)                       | `users`, `user_module_permissions`                                                                   | Lista todos os operadores do sistema com suas respectivas permissões de módulo.                                                                          |
| **POST**   | `/backend/v1/users`                    | `pocketbase/hooks/users_create.js`      | `$apis.requireAuth()` (restrito a `role === "admin"`)                       | `users`, `user_module_permissions`, `audit_logs`                                                     | Cria novo operador com senha criptografada pelo PB e provisiona permissões em `user_module_permissions`.                                                 |
| **PUT**    | `/backend/v1/users/{id}`               | `pocketbase/hooks/users_update.js`      | `$apis.requireAuth()` (restrito a `role === "admin"`)                       | `users`, `user_module_permissions`, `audit_logs`                                                     | Atualiza dados cadastrais, redefinição de senha, status `ativo` e permissões de módulos.                                                                 |
| **DELETE** | `/backend/v1/users/{id}`               | `pocketbase/hooks/users_delete.js`      | `$apis.requireAuth()` (restrito a `role === "admin"`)                       | `users`, `user_module_permissions`, `audit_logs`                                                     | Exclusão de usuário com travas contra auto-exclusão e contra exclusão do último administrador ativo.                                                     |
| **POST**   | `/api/intake_submit.php`               | `pocketbase/hooks/intake_submit.js`     | **Público** (sem auth), com Honeypot e Rate Limiting por IP (15 req/10 min) | `clients`, `audit_logs`                                                                              | Endpoint de recepção de cadastros de novos clientes vindos da landing page/formulário externo de intake.                                                 |
| **POST**   | `/api/preparacao/auth`                 | `pocketbase/hooks/preparacao_auth.js`   | **Público** (sem auth), autenticação por CPF de cliente                     | `clients`, `sentinela_agenda`, `audit_logs`                                                          | Valida CPF do cliente contra audiência ativa marcada com `preparacao_habilitada = true` e libera acesso ao simulador.                                    |
| **POST**   | `/api/preparacao/chat`                 | `pocketbase/hooks/preparacao_chat.js`   | **Público** (sem auth, validação de payload e rito)                         | `audit_logs`                                                                                         | Chat com IA Gemini exclusivo sobre o RITO da audiência (com bloqueio severo contra discussão de mérito do caso).                                         |

### 5.2 Agendamentos Cron no Backend

[CONFIRMADO via `pocketbase/hooks/datajud_cron.js` e `list_scheduled_jobs`]

1. **`datajud_diario` (`0 6 * * *` — Todos os dias às 06:00 UTC):** Varre até 200 processos monitorados ativos que possuem a flag `tem_prazo_aberto = true`. Resolve o alias do tribunal a partir do J.TR do CNJ, consulta a API pública do DataJud, deduplica movimentos por hash SHA-256 e gera registros na collection `alertas_movimentacao`.
2. **`datajud_semanal` (`0 3 * * 0` — Domingos às 03:00 UTC):** Varre até 500 processos ativos que possuem `tem_prazo_aberto = false` para atualizar eventuais movimentações de fundo de acervo.

---

## 6. BANCO DE DADOS E RELACIONAMENTOS

[CONFIRMADO via `db_show_schema` e `db_describe_object`]

O banco é composto por 16 coleções. Todas as tabelas herdam os campos padrão do PocketBase (`id` texto de 15 caracteres alfanuméricos, `created` timestamp ISO, `updated` timestamp ISO).

### 6.1 Diagrama de Relacionamento Textual do Núcleo Jurídico

```text
CLIENTES (clients)
  │
  ├── [1:N via client_id relation] ───> PROCESSOS MONITORADOS (processos_monitorados)
  │                                      │
  │                                      ├── [1:N via numero_processo] ───> MOVIMENTAÇÕES (movimentacoes_processo)
  │                                      │                                      │
  │                                      │                                      └── [1:1 via hash_dedup] ───> ALERTAS (alertas_movimentacao)
  │                                      │
  │                                      └── [1:1 via numero_processo] ───> CACHE DATAJUD (processos_datajud_cache)
  │
  ├── [1:N via client_id / text] ─────> PUBLICAÇÕES / PRAZOS (sentinela_communications)
  │                                      │
  │                                      └── [1:1 embutido JSON] ─────────> MEMORIAL DE PRAZO (deadlineCalculated)
  │
  ├── [1:N via client_id / text] ─────> COMPROMISSOS & AUDIÊNCIAS (sentinela_agenda)
  │
  ├── [1:N via client_id / text] ─────> TAREFAS DE PRAZO (sentinela_tasks)
  │
  ├── [1:N via client_id text] ───────> PRODUÇÃO DE PEÇAS (production_items)
  │
  └── [1:N via target_id / details] ──> TRILHA DE AUDITORIA (audit_logs)
```

### 6.2 Detalhamento das Coleções Principais

#### 1. `users` (Coleção Auth nativa)

- **Campos:** `id`, `email`, `name` (text), `avatar` (file), `role` (select: `admin` | `operador`), `ativo` (bool).
- **Regras de API:** `list/view/update/delete: id = @request.auth.id`. Operações administrativas gerais são intermediadas pelos hooks seguros `/backend/v1/users*`.

#### 2. `user_module_permissions` (Base)

- **Campos:** `user_id` (relation → `users`), `modulo` (text), `pode_acessar` (bool).
- **Índices:** UNIQUE `idx_user_mod_perm` em `(user_id, modulo)`.
- **Regras:** Criação/edição restrita a usuários com `role = "admin"`.

#### 3. `clients` (Base)

- **Campos:** `client_code` (text, unique), `protocolo` (text), `nome` (text, required), `cpf` (text), `rg` (text), `telefone` (text), `email` (text), `endereco` (text), `profissao` (text), `nacionalidade` (text), `estado_civil` (text), `demanda` (text), `descricao_caso` (text), `origem` (select: `intake_site` | `manual` | `whatsapp` | `indicacao` | `presencial`), `estagio` (select: `novo` | `em_atendimento` | `aguardando_documentos` | `ativo` | `concluido` | `inativo`), `docs_gerados` (json), `processos_vinculados` (json legível), `obs` (text), `responsavel` (text), `alegacoes_processo` (json), `aprovado_para_cliente` (bool).
- **Índices:** UNIQUE em `client_code`, índices em `nome`, `estagio`, `origem`.

#### 4. `processos_monitorados` (Base)

- **Campos:** `numero_processo` (text, required, unique), `cliente` (text rótulo), `tribunal` (text), `ativo` (bool), `tem_prazo_aberto` (bool), `ultimo_status_mapeamento` (text), `client_id` (relation → `clients`, adicionado via migration `0016`).
- **Índices:** UNIQUE em `numero_processo`, índices em `ativo`, `tribunal`, `client_id`.
- **Regras:** Requer autenticação (`@request.auth.id != ""`).

#### 5. `movimentacoes_processo` (Base)

- **Campos:** `numero_processo` (text, required), `tribunal_alias` (text, required), `datajud_id` (text), `codigo_movimento` (number, required), `nome_movimento` (text, required), `data_hora_movimento` (text, required), `orgao_codigo_movimento` (number), `orgao_nome_movimento` (text), `complementos_json` (json), `nivel_sigilo_processo` (number), `hash_dedup` (text, required, unique), `sigilo_descricao` (text).
- **Índices:** UNIQUE em `hash_dedup` (garante idempotência absoluta na ingestão), índices em `numero_processo` e `data_hora_movimento`.

#### 6. `processos_datajud_cache` (Base)

- **Campos:** `numero_processo` (text, unique), `tribunal_alias` (text), `classe_codigo` (number), `classe_nome` (text), `grau` (text), `data_ajuizamento` (text), `orgao_julgador_codigo` (number), `orgao_julgador_nome` (text), `nivel_sigilo` (number), `formato_nome` (text), `sistema_nome` (text), `assuntos_json` (json), `ultima_consulta_em` (text), `ultimo_resultado` (text).

#### 7. `alertas_movimentacao` (Base)

- **Campos:** `numero_processo` (text), `descricao` (text), `tipo` (text), `lido` (bool), `movimentacao_id` (text), `hash_dedup` (text).

#### 8. `sentinela_communications` (Base)

- **Campos:** `external_id` (text, required), `source` (text), `numero_processo` (text, required), `tribunal` (text), `orgao_julgador` (text), `destinatario` (text), `tipo_comunicacao` (text), `data_disponibilizacao` (text), `data_publicacao` (text), `teor_resumido` (text), `teor_completo` (text), `status` (text), `triage_category` (text), `urgency_level` (text), `risk_score` (number), `assigned_to` (text), `custody` (json com snapshot criptográfico e timeline), `deadline_calculated` (json com o memorial do prazo), `client_id` (text), `client_code` (text), `client_name` (text).

#### 9. `sentinela_agenda` (Base)

- **Campos:** `title` (text, required), `description` (text), `event_type` (text: `AUDIENCIA` | `REUNIAO` | `PRAZO_FATAL`), `start_date` (text), `end_date` (text), `is_all_day` (bool), `location_or_link` (text), `is_virtual` (bool), `process_number` (text), `responsible` (text), `participants` (json), `tribunal` (text), `communication_id` (text), `status` (text), `preparacao_habilitada` (bool), `client_id` (text), `client_cpf` (text), `client_name` (text), `alegacoes_processo` (json), `aprovado_para_cliente` (bool), `tipo_audiencia` (text).

#### 10. `production_items` (Base)

- **Campos:** `client_id` (text), `client_name` (text), `numero_processo` (text), `titulo_peca` (text), `nivel` (number: 1, 2 ou 3), `estagio` (select: `triagem_evidencias`, `tese_em_definicao`, `em_redacao`, `stress_test_adversarial`, `pronto_protocolo`, `protocolado`), `responsavel` (text), `triagem_evidencias` (json com as 5 camadas), `tese_dominante` (text), `motivo_travamento` (text), `data_entrada_estagio_atual` (text), `stress_test_aprovado` (bool), `stress_test_detalhes` (json com as 3 camadas avaliadas), `historico_estagios` (json).

#### 11. `document_templates` (Base)

- **Campos:** `user_id` (relation → `users`), `user_email` (text), `nome` (text), `descricao` (text), `icone` (text), `area` (text), `tipo_origem` (select: `docx` | `texto` | `sistema`), `corpo_html` (text), `arquivo_nome` (text), `is_global` (bool).
- **Regras:** Usuário pode visualizar seus próprios templates ou templates marcados como `is_global = true`.

#### 12. `audit_logs` (Base)

- **Campos:** `action` (text, required), `category` (select: `importacao` | `revisao` | `exportacao` | `sistema` | `configuracao` | `lex_tempus`), `actor` (text), `target_id` (text), `details` (json), `ip_address` (text).

---

## 7. AUTENTICAÇÃO E PERMISSÕES

[CONFIRMADO]

### 7.1 Mecanismo de Login e Sessão

- **Backend:** A coleção nativa `users` gerencia senhas (armazenadas em hash Bcrypt nativo pelo PocketBase). O login ocorre via `pb.collection('users').authWithPassword(email, password)` no serviço `src/services/authUsersService.ts`.
- **Armazenamento de Sessão:** O token JWT e o registro do usuário autenticado são mantidos em memória e persistidos pelo SDK no cookie/localStorage através de `pb.authStore`.
- **Verificação de Conta Ativa:** No ato do login, se o atributo `record.ativo === false`, a sessão é sumariamente encerrada via `pb.authStore.clear()`, disparando erro amigável ao operador.
- **Auditoria de Acesso:** Todo login bem-sucedido ou logout grava uma entrada na tabela `audit_logs` com a ação `LOGIN_SUCESSO` ou `LOGOUT`.

### 7.2 Proteção de Rotas no Frontend

- Em `src/App.tsx`, rotas do sistema são agrupadas e protegidas por:
  1. `<ProtectedRoute>`: Checa se `pb.authStore.isValid`. Caso falso, redireciona o usuário para `/login`.
  2. `<ProtectedModuleRoute moduleKey="...">`: Intercepta o acesso a cada página específica. Consulta `authUsersService.hasModuleAccess(moduleKey)`. Caso o usuário não tenha permissão no módulo solicitado, redireciona para a tela de acesso negado `<AccessDeniedView>`.
  3. `<AdminOnlyRoute>`: Restringe a tela de gerenciamento de operadores (`/usuarios`) exclusivamente a usuários com `role === 'admin'`.
  4. **Rotas Públicas Sem Autenticação:**
     - `/login`
     - `/intake` e `/intake/*` (Onboarding do cliente)
     - `/preparacao` e `/preparacao/*` (Portal de audiência do cliente)

### 7.3 Proteção das APIs no Backend

- Rotas restritas declaradas em `pocketbase/hooks/` utilizam o middleware `$apis.requireAuth()`.
- Rotas administrativas (`/backend/v1/users*`) realizam dupla checagem: verificam se `auth.getString('role') === 'admin'`. Se falso, encerram imediatamente com HTTP 403 Forbidden.
- Rotas de IA (`/backend/v1/gemini-proxy`, `/backend/v1/ai/oraculo`) consultam a coleção `user_module_permissions` para validar se o operador possui permissão ativa para o módulo requisitante antes de despachar a chamada à API externa.

### 7.4 Riscos Identificados em Autenticação e Permissões

- [CONFIRMADO] Algumas coleções de dados no banco (`sentinela_communications`, `records`, `sentinela_agenda`, `sentinela_tasks`, `production_items`, `clients`) possuem API rules vazias em seu schema inicial (`list: ""`, `view: ""`, `create: ""`, `update: ""`), dependendo da segurança de rede do frontend ou de regras aplicadas nos hooks customizados.
- [CONFIRMADO] O endpoint `/api/preparacao/auth` autentica o cliente externo apenas conferindo se o CPF digitado possui audiência marcada com `preparacao_habilitada = true`. Não há verificação por duplo fator (ex: envio de código OTP via WhatsApp ou SMS).

---

## 8. FLUXO COMPLETO DE UMA AÇÃO REAL

[CONFIRMADO no código]  
**Funcionalidade Selecionada:** Consulta e Ingestão de Movimentações Processuais do DataJud na Central de Prazos até a Visualização na Linha do Tempo Unificada.

```text
[1. USUÁRIO]
    │ Clica no botão "Consultar / Sincronizar Processo" na interface
    ▼
[2. COMPONENTE REACT]
    │ src/components/MovimentacoesDatajudView.tsx
    │ Função acionada: handleConsultarProcesso(numeroProcesso)
    │ Altera estado local: setSyncingSingle(numero)
    ▼
[3. SERVICE FRONTEND]
    │ src/services/datajudService.ts
    │ Método: datajudService.consultarProcesso(numero)
    │ Lê token ativo: pb.authStore.token
    │ Dispara fetch HTTP POST para ${pb.baseUrl}/backend/v1/datajud/consultar
    ▼
[4. REQUISIÇÃO HTTP]
    │ Headers: Content-Type: application/json, Authorization: <JWT_TOKEN>
    │ Body: { "numeroProcesso": "1004523-88.2026.8.12.0001" }
    ▼
[5. ENDPOINT BACKEND (HOOK)]
    │ pocketbase/hooks/datajud_consultar.js
    │ Middleware: $apis.requireAuth() valida JWT
    │ Validação do número CNJ (20 dígitos)
    │ Extração do tribunal: Dígito J (Justiça) e TR (Tribunal), ex: J.TR "8.12" => alias "tjms"
    ▼
[6. CHAMADA EXTERNA AO CNJ]
    │ Backend executa $http.send() para a API Pública do CNJ:
    │ POST https://api-publica.datajud.cnj.jus.br/api_publica_tjms/_search
    │ Header: Authorization: $secrets.get('DATAJUD_API_KEY')
    │ Body: { "query": { "match": { "numeroProcesso": "10045238820268120001" } } }
    ▼
[7. PROCESSAMENTO E DEDUPLICAÇÃO NO BANCO]
    │ Resposta do CNJ recebida com array de "movimentos" e "nivelSigilo"
    │ Para cada movimento:
    │   Calcula rawHash = numeroLimpo + "_" + codigoMov + "_" + dataHoraMov
    │   Gera hash SHA-256: hashDedup = $security.sha256(rawHash)
    │   Verifica duplicidade na collection 'movimentacoes_processo' por 'hash_dedup'
    │   Se NÃO existir:
    │     Grava novo registro em 'movimentacoes_processo'
    │     Grava alerta em 'alertas_movimentacao' (lido = false)
    │ Atualiza registro em 'processos_datajud_cache' com data e classe do processo
    │ Atualiza 'processos_monitorados' (marca tem_prazo_aberto se houver despacho/prazo)
    ▼
[8. RESPOSTA DO BACKEND AO FRONTEND]
    │ JSON 200 OK retornado:
    │ { "ok": true, "novos_movimentos_inseridos": 3, "total_movimentos_api": 42 }
    ▼
[9. ATUALIZAÇÃO DA INTERFACE]
    │ MovimentacoesDatajudView recebe resposta, dispara toast.success() via sonner
    │ Executa await loadData() recarregando lista completa gravada no banco
    │ O usuário navega para a página de detalhe: /processos/1004523-88.2026.8.12.0001
    │ src/pages/ProcessDetailPage.tsx executa consulta paralela:
    │   pb.collection('movimentacoes_processo').getFullList()
    │   pb.collection('sentinela_communications').getFullList()
    │ Ordena cronologicamente os atos e renderiza a linha do tempo unificada com badges coloridos.
```

---

## 9. EVENTOS E TEMPO REAL

[CONFIRMADO no código]

### 9.1 O que Existe e Funciona

1. **Server-Sent Events (SSE) via PocketBase Realtime:**
   - O SDK cliente oficial (`pocketbase`) possui suporte nativo a eventos em tempo real via SSE (`/api/realtime`).
   - O hook utilitário `src/hooks/use-realtime.ts` abstrai subscrições a coleções via `pb.collection(collectionName).subscribe('*', callback)`.
   - Em `src/services/dataStore.ts` (linhas 297–352), existe uma subscrição em tempo real ativa na coleção `clients`. Quando um novo cliente é registrado externamente pelo formulário de intake (`/api/intake_submit.php`), o evento `create` é recebido via SSE no navegador do operador, inserindo o novo cliente na lista sem necessidade de recarregar a página (F5).
2. **Rotinas em Background Agendadas (Cron):**
   - O backend possui rotinas configuradas diretamente no runtime com `cronAdd`:
     - `datajud_diario`: executado diariamente às 06:00 UTC.
     - `datajud_semanal`: executado aos domingos às 03:00 UTC.
3. **Barramento de Notificações Interno (Pub/Sub do Client):**
   - No frontend, os serviços `dataStore`, `authUsersService`, `documentTemplateService` e `featureFlags` utilizam listeners locais registrados via `.subscribe()`, notificando componentes React sobre mudanças em memória.

### 9.2 O que NÃO Existe no Sistema Atual

[CONFIRMADO]

- **WebSockets Bidirecionais / Socket.IO:** Não há servidor Socket.IO nem conexões WS configuradas. O realtime é estritamente unidirecional via SSE do PocketBase.
- **Filas de Tarefas Distribuídas (Message Brokers):** Não há Redis, RabbitMQ, Kafka, BullMQ ou SQS. Tarefas pesadas (ex: sincronização em lote de centenas de processos) rodam de forma síncrona dentro da requisição HTTP do hook.
- **Webhooks de Entrada Ativos de Terceiros:** Não existem endpoints receptores de webhooks para WhatsApp, Evolution API, Asaas ou n8n implementados no momento.

---

## 10. INTEGRAÇÕES EXTERNAS

[CONFIRMADO no código]

### 10.1 DataJud / CNJ (Base Nacional de Dados do Poder Judiciário)

- **Implementação:** Realizada no backend via `pocketbase/hooks/datajud_consultar.js`, `datajud_lote.js` e `datajud_cron.js`.
- **Protocolo:** HTTP POST enviando JSON com query ElasticSearch (`query.match.numeroProcesso`) para endpoints segregados por tribunal (ex: `/api_publica_tjms/_search`).
- **Autenticação:** Header HTTP `Authorization: <DATAJUD_API_KEY>` lido de `$secrets.get('DATAJUD_API_KEY')` com chave oficial pública cadastrada pelo CNJ.
- **Resolução de Tribunais (Mapeamento J.TR conforme Resolução CNJ 65/2008):**
  - Segmento 8 (Estadual): 8.12 (TJMS), 8.24 (TJSC), 8.09 (TJGO), etc.
  - Segmento 5 (Trabalhista): 5.24 (TRT24), etc.
  - Segmento 3 (Superior): 3.00 (STJ).
  - Processos com tribunais não mapeados recebem status de pendência sem travar a execução do lote.

### 10.2 ComunicaAPI / DJEN (Diário de Justiça Eletrônico Nacional)

- **Implementação:** Realizada no frontend em `src/services/djenService.ts` via chamada `fetch()` direta para `https://comunicaapi.pje.jus.br/api/v1/comunicacao`.
- **Filtros Suportados:** Por número de processo, OAB/UF (âncora Dr. Higor Utinoi de Oliveira 15400/MS), nome de advogado ou tribunal específico.
- **Tratamento de Resiliência:** Tratamento explícito de erros HTTP 429 (Rate Limit do CNJ com contagem regressiva de 60 segundos), 403 (bloqueio geográfico CloudFront) e erros de CORS.

### 10.3 Sentinela NOX via Ingestão CSV

- **Implementação:** Em `src/services/csvEngine.ts` e `src/pages/ImportsPage.tsx`.
- **Mecanismo:** Upload de arquivos de diários em formato delimitado com detecção automática de encoding/BOM, delimitação (vírgula, ponto-e-vírgula ou tab) e cálculo criptográfico de hash SHA-256 para prevenir reimportação acidental do mesmo lote.

### 10.4 PJe Proxy / Tribunais

- **Implementação:** Hook `pocketbase/hooks/pje_proxy.js`.
- **Status:** Provedor estruturado pronto para acoplamento com crawlers ou APIs autenticadas de tribunais, protegido por permissão de módulo.

---

## 11. INTELIGÊNCIA ARTIFICIAL ATUAL

[CONFIRMADO no código]

### 11.1 Onde a IA está de fato implementada e funcionando

A IA não é puramente cosmética no backend, mas opera sob **regras de contenção rígidas e fallbacks automáticos**:

1. **Google Gemini via Hook Backend (`pocketbase/hooks/gemini_proxy.js`):**
   - **Modelo Alvo:** `gemini-3.5-flash-lite`.
   - **Autenticação:** Segredo `$os.getenv('GEMINI_API_KEY')` lido exclusivamente no servidor.
   - **Modo de Operação 1 (`modo: 'analise'`):** Recebe o teor de uma publicação do DJEN, aplica sanitização server-side e extrai classificação, urgência, resumo executivo e risco preclusivo (0 a 100).
   - **Modo de Operação 2 (`modo: 'lex_tempus_interpretacao'`):** Recebe a publicação judicial e identifica o `atoGerador` (ex: intimação de sentença, decisão interlocutória) e sugere qual regra dos `LEGAL_RULES_PRESETS` se aplica (ex: `CPC_APELACAO_15D`).
   - **Regra de Ouro Inviolável do LEX TEMPUS:** [CONFIRMADO em `src/pages/LexTempusPage.tsx` e `gemini_proxy.js`] **A IA NUNCA calcula as datas dos prazos**. A contagem matemática, aplicação de dias úteis (Art. 219 CPC), exclusão do marco inicial (Art. 224 CPC) e checagem de feriados forenses locais é 100% determinística em TypeScript (`deadlineEngine.ts`). A IA atua única e exclusivamente na interpretação hermenêutica do ato.

2. **Oráculo NOX (`pocketbase/hooks/ai_oraculo.js` e `src/services/aiOraculoService.ts`):**
   - Assistente conversacional para advogados com injeção de contexto das publicações ativas.
   - Utiliza `$ai.chat({ model: 'fast' })` do Skip Cloud com fallback para o Google Gemini direto.
   - Possui modo de briefing matinal e análise em lote de intimações.

3. **Assistente de Rito de Audiência (`pocketbase/hooks/preparacao_chat.js`):**
   - Opera no portal público de preparação do cliente (`#/preparacao`).
   - [CONFIRMADO] Implementa a **Trava de Mérito**: se o cliente fizer qualquer pergunta sobre o mérito da causa ("vou ganhar?", "quanto vou receber?", "o que devo falar sobre o valor?"), o sistema bloqueia a IA e retorna resposta padrão orientando que mérito é tratado exclusivamente com o advogado titular.

### 11.2 Mecanismo de Fallback Heurístico Local

[CONFIRMADO em `src/services/aiOraculoService.ts` e `src/services/lexTempusService.ts`]
Se a chave da IA não estiver configurada no backend, se o servidor estiver sem rede ou se a cota do modelo esgotar, a aplicação não quebra:

- Entra em ação imediatamente o `generateLocalFallbackResponse` ou `generateLocalLexFallback`.
- Motores heurísticos baseados em regex identificam termos como "agravo", "sentença", "apelação", "tutela de urgência" e retornam a análise estruturada com a marcação explícita `isFallback: true` e `model: "Motor Local Determinístico"`.

### 11.3 RAG, Embeddings, Vetores e Agentes Autônomos

[CONFIRMADO]

- **Base Vetorial (Vector DB):** NÃO EXISTE no código atual. Não há pgvector, Pinecone, Qdrant ou ChromaDB configurados.
- **Embeddings:** Não há geração de embeddings semânticos para indexação de jurisprudência.
- **RAG (Retrieval-Augmented Generation):** É feito de forma simples por injeção direta de strings: o frontend resume as 8 publicações mais urgentes em texto puro e injeta no campo `contexto` do payload enviado ao modelo.
- **Agentes com Memória de Longo Prazo:** Não há agentes autônomos persistindo histórico conversacional em banco vetorial.

---

## 12. AUDITORIA E OBSERVABILIDADE

[CONFIRMADO no código]

### 12.1 Coleção `audit_logs` e Trilha de Auditoria

A aplicação possui rastreabilidade em banco relacional estruturada na coleção `audit_logs`.

- **Campos:** `action`, `category`, `actor`, `target_id`, `details` (JSON flexível), `ip_address`, `created`.
- **Ações Auditadas Automaticamente no Sistema:**
  - `LOGIN_SUCESSO`, `LOGOUT` (Sessão de usuários)
  - `USUARIO_CRIADO`, `USUARIO_ATUALIZADO`, `USUARIO_EXCLUIDO` (Governança de acessos)
  - `INTAKE_RECEBIDO` (Captura de leads no portal público com IP e User-Agent)
  - `PREPARACAO_ACESSO`, `PREPARACAO_ACESSO_NEGADO`, `PREPARACAO_INTERACAO` (Simulador de audiência)
  - `DATAJUD_CONSULTA_MANUAL`, `DATAJUD_LOTE_EXECUTADO` (Consultas ao CNJ)
  - `IA_ANALISE_PUBLICACAO_GEMINI`, `IA_CONSULTA_ORACULO_GEMINI` (Ações assistidas por IA)
  - `LEX_TEMPUS_HOMOLOGACAO_PRAZO` (Registro da homologação do advogado com memorial auditável)

### 12.2 Cadeia de Custódia Criptográfica (Sentinela NOX)

[CONFIRMADO em `src/types/sentinela.ts` e `src/services/djenService.ts`]
Toda comunicação ingerida do diário recebe um snapshot de custódia com:

- `hashSha256`: Hash do conteúdo bruto no momento da captura.
- `capturedAt`: Timestamp ISO exato.
- `sanitized`: Flag indicando que o texto passou por sanitização de controle.
- `promptInjectionCheck`: Relatório de verificação de padrões maliciosos no texto do tribunal.
- `timeline`: Array de etapas de ciclo de vida (`CAPTURADA` → `VALIDADA` → `ANALISADA` → `HOMOLOGADA`).

### 12.3 Logs de Execução e Diagnóstico

- Logs de console padronizados com timestamps ISO em todos os hooks do PocketBase (`console.log('[ISO] [CRON DATAJUD DIÁRIO] ...')`).
- Acesso operacional aos logs do backend via ferramenta `list_logs` da plataforma Skip Cloud.

---

## 13. AUDITORIA DE SEGURANÇA E VULNERABILIDADES

Auditoria estritamente analítica (sem alterações em código). Achados classificados por gravidade:

### 13.1 [ALTO] Chave Pública de API DataJud em Fallback Hardcoded

- **Arquivo:** `pocketbase/hooks/datajud_consultar.js` (linha 101), `datajud_lote.js` (linha 25), `datajud_cron.js` (linhas 12 e 321).
- **Descrição:** Embora o código tente ler prioritariamente `$secrets.get('DATAJUD_API_KEY')` ou `$os.getenv('DATAJUD_API_KEY')`, existe uma constante `OFICIAL_PUBLIC_API_KEY` com uma credencial de acesso em texto estático como fallback.
- **Impacto:** Caso o CNJ revogue essa chave pública ou se o repositório for exposto, a chave fixa se torna ponto de falha.
- **Recomendação para Futuro:** Exigir que a chave seja injetada exclusivamente via `set_env` / `$secrets`.

### 13.2 [MÉDIO] Regras de API Abertas em Coleções Operacionais

- **Arquivo:** `src/lib/pocketbase/schema.json` e collections `clients`, `sentinela_communications`, `records`, `sentinela_agenda`, `sentinela_tasks`, `production_items`.
- **Descrição:** As regras de acesso às APIs REST do PocketBase para essas coleções possuem valores vazios (`""`), o que no PocketBase torna a coleção acessível sem autenticação caso alguém faça requisições diretas ao endpoint `/api/collections/{nome}/records`.
- **Mitigação Atual:** O frontend acessa via clientes controlados e os endpoints sensíveis foram encapsulados em `/backend/v1/*`. Porém, no nível do banco, as coleções deveriam exigir `@request.auth.id != ""`.

### 13.3 [MÉDIO] Concatenação de Filtros de Texto sem Sanitização Rígida no PocketBase

- **Arquivo:** `pocketbase/hooks/intake_submit.js` (linha 20), `preparacao_auth.js` (linha 27, 40).
- **Descrição:** Expressões de filtro passadas para `$app.findRecordsByFilter` utilizam interpolação direta de variáveis sanitizadas apenas por regex simples (`ip.replace(/'/g, '')` ou strings de CPF).
- **Impacto:** Risco de quebra de sintaxe no filtro do PocketBase (PocketBase filter injection) se parâmetros malformados ultrapassarem a sanitização.

### 13.4 [MÉDIO] Uso de `dangerouslySetInnerHTML` e Injeção de HTML no Editor de Documentos

- **Arquivo:** `src/components/TemplateManagerModal.tsx` (linhas 503 e 573) e `src/components/DocumentReviewEditorModal.tsx` (linha 80).
- **Descrição:** A visualização de templates convertidos de arquivos `.docx` utiliza `dangerouslySetInnerHTML={{ __html: parsedHtmlPreview }}`.
- **Impacto:** Se um operador fizer upload de um arquivo `.docx` malicioso contendo tags `<script>` ou eventos inline `onload` em seu XML interno, pode ocorrer Cross-Site Scripting (XSS) no navegador do revisor. O parser em `src/lib/docxParser.ts` realiza conversão de tags Word, mas não aplica uma biblioteca de sanitização HTML completa como DOMPurify.

### 13.5 [BAIXO] Tratamento Anti-Prompt Injection no Ingestão de Publicações

- **Arquivo:** `src/services/adapters.ts` (`sanitizeExternalText`) e `pocketbase/hooks/gemini_proxy.js`.
- **Descrição Positiva:** O sistema já implementa uma camada ativa de mitigação, detectando termos de injeção ("ignore previous instructions", "system prompt", "DAN mode") e neutralizando-os antes do envio para as IAs.

---

## 14. ESCALABILIDADE E GARGALOS OPERACIONAIS

[CONFIRMADO no código]

1. **Volume de Dados e Consultas `getFullList()`:**
   - Em `src/services/datajudService.ts` (`getMovimentacoes`), `src/pages/ProcessDetailPage.tsx` e `src/components/MovimentacoesDatajudView.tsx`, as chamadas ao banco utilizam `getFullList()`.
   - Para um acervo com milhares de movimentações ou publicações, trazer todo o dataset em uma única requisição HTTP causará sobrecarga de memória no navegador e latência perceptível.
   - _Diretriz:_ Adotar paginação baseada em cursor ou `getList(page, perPage)` em todas as visualizações.
2. **Processamento Sequencial no Sincronizador em Lote:**
   - O hook `pocketbase/hooks/datajud_lote.js` itera em um loop síncrono `for` processando um processo por vez com chamadas HTTP ao CNJ com timeout de até 30 segundos cada.
   - Para 200 processos, o lote pode exceder o tempo limite de execução do gateway HTTP (HTTP 504 Gateway Timeout).
   - _Diretriz:_ Implementar processamento assíncrono com job status ou fila de background.
3. **Persistência em `localStorage`:**
   - O limite típico de `localStorage` nos navegadores modernos é de ~5MB a 10MB por origem.
   - A classe `NoxDataStore` serializa arrays volumosos (`this.records`, `this.communications`, `this.productionItems`) como strings JSON no `localStorage`.
   - À medida que novas publicações forem importadas, o limite de cota do navegador (`QuotaExceededError`) será atingido se a dependência do `localStorage` for mantida.

---

## 15. PONTOS DE EXTENSÃO PARA FUTURAS INTEGRAÇÕES

Análise técnica direcionada ao planejamento das futuras frentes sem alterações no código:

### A) Evolution API / WhatsApp

- **Ponto de Entrada Recomendado:** Criar hook no PocketBase `pocketbase/hooks/evolution_webhook.js` para receber webhooks HTTP POST da Evolution API e despachar mensagens via `$http.send`.
- **Camadas Envolvidas:**
  - Backend: novo hook para receber status de entrega e mensagens recebidas.
  - Banco: criação de collection `whatsapp_messages` com vínculo a `clients.id`.
  - Frontend: acoplamento com `src/pages/ClientesPage.tsx` na ficha 360º.
- **Riscos:** Volume alto de mensagens exigirá paginação estrita e controle de rate-limit da Evolution API.

### B) Webhooks Genéricos de Entrada e Saída

- **Ponto de Entrada Recomendado:** Diretório `pocketbase/hooks/webhooks_inbound.js`. O PocketBase permite registrar qualquer rota REST pública ou com token de autenticação via header (`X-Webhook-Secret`).
- **Camadas Envolvidas:** Router do PocketBase + inserção de registros em `audit_logs` e collections de destino.

### C) Inteligência Artificial Avançada (RAG & Agentes)

- **Ponto de Entrada Recomendado:** Estender `pocketbase/hooks/gemini_proxy.js` e criar migration para coleção de chunks textuais de peças ou jurisprudência com embeddings vetoriais.
- **Camadas Envolvidas:** `$ai.embed` e `$ai.agents` nativos do Skip Cloud para manter agentes com memória contextual persistida.

### D) Transcrição de Áudio (WhatsApp / Reuniões)

- **Ponto de Entrada Recomendado:** Novo endpoint `POST /backend/v1/audio/transcrever` em `pocketbase/hooks/audio_transcribe.js`.
- **Mecanismo:** Receber áudio em base64 ou multipart, encaminhar para modelo Whisper / Gemini Flash Audio multimodal via API externa e persistir a transcrição na timeline do cliente ou da audiência em `sentinela_agenda`.

### E) n8n (Orquestração de Workflows)

- **Ponto de Entrada Recomendado:** O n8n pode consumir diretamente a REST API do PocketBase utilizando token de autenticação de usuário `admin` ou chamar endpoints dedicados em `/backend/v1/n8n/*`.
- **Casos de Uso Naturais:** Disparo de notificações de prazos fatais (D-2, D-1) por email ou WhatsApp aos advogados responsáveis.

### F) Notificações em Tempo Real

- **Ponto de Entrada Recomendado:** Utilizar a infraestrutura nativa de SSE do PocketBase (`use-realtime.ts`) já existente no projeto.
- **Mecanismo:** Quando um novo alerta for inserido em `alertas_movimentacao`, o frontend inscrito via `pb.collection('alertas_movimentacao').subscribe('*')` emite imediatamente um som de alerta e um toast visual no topo da aplicação.

### G) CRM de Atendimento Jurídico

- **Ponto de Entrada Recomendado:** O módulo `src/pages/ClientesPage.tsx` já possui estrutura de pipeline Kanban com estágios (`novo`, `em_atendimento`, `aguardando_documentos`, `ativo`, `concluido`, `inativo`).
- **Extensão:** Adicionar timeline de anotações e mensagens trocadas diretamente na collection `clients`, unificando histórico do WhatsApp e emails no card do cliente.

---

## 16. DÍVIDA TÉCNICA E RISCOS DE MANUTENÇÃO

[CONFIRMADO no código — sem refatoração neste momento]

1. **Monolito de Estado no Cliente (`src/services/dataStore.ts`):** Arquivo de 2.927 linhas acumulando lógica de dezenas de domínios (clientes, produções, prazos, cálculos, backups, mock, localStorage). Dificulta manutenção e testes unitários isolados.
2. **Páginas Excessivamente Extensas (Gigacomponentes):**
   - `src/pages/ClientesPage.tsx` (~2.684 linhas)
   - `src/pages/SentinelaPage.tsx` (~2.553 linhas)
   - `src/pages/ProducaoPage.tsx` (~2.265 linhas)
   - `src/pages/CompromissosPage.tsx` (~2.255 linhas)
     _Impacto:_ Lógica de negócio, formulários, modais e render misturados no mesmo arquivo.
3. **Dualidade de Fontes de Verdade (Banco vs LocalStorage):** Partes do sistema leem dados do PocketBase (`datajudService`), enquanto outras frentes leem do `dataStore` local, exigindo rotinas manuais de sincronização bilateral.
4. **Dependência de Fallbacks com Mocks Antigos:** Presença de datasets sintéticos (`src/data/mockData.ts`, ~881 linhas) que podem mascarar a ausência de registros reais durante testes.
5. **Tipagem Flexível `any` em Mapeamentos:** Ocorrência de casts `as any` em partes do código de parsing do DJEN e DataJud para contornar discrepâncias de schemas entre tribunais.

---

## 17. MAPA DE DEPENDÊNCIAS CONCEITUAL

```text
[CLIENTE / BROWSER]
       │
       ▼
[REACT FRONTEND (Vite SPA)]
  ├── Páginas (src/pages/*.tsx)
  ├── Componentes Visuais (src/components/*.tsx + shadcn UI)
  ├── Motores de Regra de Negócio (deadlineEngine.ts, complexityService.ts)
  └── Singletons de Estado Reativo (dataStore.ts, authUsersService.ts)
       │
       ├── Cache Local: localStorage (nox_records, nox_clients, nox_comms...)
       │
       ├── Chamada Direta HTTP Client-Side:
       │     └── ComunicaAPI / DJEN (comunicaapi.pje.jus.br/api/v1)
       │
       ▼ (PocketBase SDK / Fetch HTTP)
[BACKEND POCKETBASE (Skip Cloud)]
  ├── Endpoints Customizados (pocketbase/hooks/*.js)
  │     ├── datajud_consultar.js, datajud_lote.js
  │     ├── gemini_proxy.js, ai_oraculo.js
  │     ├── intake_submit.js, preparacao_auth.js, preparacao_chat.js
  │     └── users_create.js, users_list.js, users_update.js, users_delete.js
  │
  ├── Scheduled Jobs (cronAdd)
  │     ├── datajud_diario (06:00 UTC)
  │     └── datajud_semanal (03:00 UTC)
  │
  ├── Banco de Dados Relacional Embutido (SQLite)
  │     └── 16 Collections (clients, processos_monitorados, movimentacoes_processo...)
  │
  ▼ (Integrações Externas Server-to-Server via $http.send)
  ├── API Pública DataJud / CNJ (api-publica.datajud.cnj.jus.br)
  ├── Google Gemini API (generativelanguage.googleapis.com)
  └── Skip AI Gateway ($ai.chat / fast model)
```

---

## 18. TABELA DE ARQUIVOS CRÍTICOS DO SISTEMA

| Arquivo                                 | Camada                | Função Principal                                        | Importância | Afetado por Futura Integração?               |
| :-------------------------------------- | :-------------------- | :------------------------------------------------------ | :---------- | :------------------------------------------- |
| `src/App.tsx`                           | Frontend / Roteamento | Define rotas, controle de acesso e autenticação         | CRÍTICA     | Sim (novas páginas ou fluxos)                |
| `src/components/Layout.tsx`             | Frontend / UI Shell   | Sidebar, menus, topbar, checagem visual de módulos      | ALTA        | Sim (novos menus de navegação)               |
| `src/services/authUsersService.ts`      | Frontend / Auth       | Login, sessão, consulta `/backend/v1/auth/me`, RBAC     | CRÍTICA     | Sim (se houver novo nível de permissão)      |
| `src/services/dataStore.ts`             | Frontend / Store      | Estado centralizado, reatividade, cache e sincronização | CRÍTICA     | Sim (migração gradual para banco direto)     |
| `src/services/datajudService.ts`        | Frontend / Service    | Gateway cliente para chamadas DataJud e processos       | ALTA        | Sim (se novos tribunais forem integrados)    |
| `src/services/djenService.ts`           | Frontend / Service    | Consulta direta ao DJEN/CNJ e normalização              | ALTA        | Sim (se a busca for movida para webhook)     |
| `src/services/deadlineEngine.ts`        | Frontend / Motor      | Contagem matemática estrita de prazos CPC/CLT           | CRÍTICA     | **Não alterar sem validação jurídica**       |
| `pocketbase/hooks/datajud_consultar.js` | Backend / Hook        | Consulta individual ao DataJud e deduplicação           | CRÍTICA     | Sim (ajuste de rate-limits ou novos campos)  |
| `pocketbase/hooks/datajud_cron.js`      | Backend / Job         | Execução diária/semanal de varredura no CNJ             | ALTA        | Sim (se a frequência de varredura mudar)     |
| `pocketbase/hooks/gemini_proxy.js`      | Backend / Hook        | Gateway seguro de IA para triagem e LEX TEMPUS          | CRÍTICA     | Sim (integração de novos modelos ou RAG)     |
| `pocketbase/hooks/intake_submit.js`     | Backend / Hook        | Recepção de auto-cadastros de novos clientes            | ALTA        | Sim (se campos de WhatsApp/CRM mudarem)      |
| `pocketbase/hooks/preparacao_chat.js`   | Backend / Hook        | Chat de audiência com trava de rito vs mérito           | ALTA        | Sim (se transcrição de áudio for adicionada) |
| `src/pages/ClientesPage.tsx`            | Frontend / Página     | Ficha 360º de clientes, Kanban e processos              | ALTA        | Sim (ponto central para WhatsApp / CRM)      |
| `src/pages/ProcessDetailPage.tsx`       | Frontend / Página     | Linha do tempo unificada (DataJud + Sentinela)          | ALTA        | Sim (exibição de novas fontes de evento)     |
| `src/pages/LexTempusPage.tsx`           | Frontend / Página     | Cockpit de homologação e cálculo de prazos              | ALTA        | Sim (automação via n8n de prazos)            |

---

## 19. RESTRIÇÕES REAIS DO AMBIENTE (SKIP CLOUD)

[CONFIRMADO]

1. **Ambiente PaaS Gerenciado Skip Cloud:**
   - O projeto roda em container otimizado com Node.js para frontend e binário do PocketBase para backend.
   - Variáveis de ambiente são gerenciadas exclusivamente pela plataforma via `set_env` / `$secrets` — nunca através de arquivos `.env` estáticos locais.
2. **Runtime de Scripts no Backend (PocketBase Hooks):**
   - Os hooks rodam sob o interpretador ECMAScript Goja em Go.
   - _Restrições do Goja:_ Não há ecossistema NPM completo no servidor. Bibliotecas externas não podem ser instaladas via `npm install` para uso dentro de `pocketbase/hooks/`. Recursos de rede e sistema devem utilizar os helpers embutidos do PocketBase (`$http.send`, `$security`, `$app`, `$os.getenv`).
3. **Scripts de Build e QA Disponíveis (`package.json`):**
   - `npm run dev`: Inicia o Vite dev server.
   - `npm run build`: Executa compilação TypeScript (`tsc -b`) e bundling Vite.
   - `npm run qa`: Executa linter estático `oxlint` e typecheck TypeScript `tsc --noEmit`.

---

## 20. RELATÓRIO FINAL PARA O ARQUITETO DE SOFTWARE

### A) Arquitetura Atual em 10 Pontos Essenciais

1. **Frontend Desacoplado:** React 18 + Vite + TypeScript rodando como SPA cliente completa.
2. **Backend BaaS Embutido:** PocketBase gerenciado na Skip Cloud com banco relacional SQLite.
3. **Serverless Hooks:** Extensões de backend escritas em JavaScript em `pocketbase/hooks/` sem necessidade de servidor Node/Express dedicado.
4. **Trabalhos Assíncronos Nativos:** Crons agendados via `cronAdd` executados no próprio processo do PocketBase.
5. **Autenticação RBAC:** Coleção nativa `users` com diferenciação de papéis (`admin` vs `operador`) e permissões granulares por módulo.
6. **Módulo de Prazos Determinístico (LEX TEMPUS):** Separação absoluta entre interpretação do ato por IA e cálculo matemático de datas pelo motor CPC/CLT.
7. **Deduplicação Criptográfica de Andamentos:** Movimentações do DataJud são deduplicadas por hash SHA-256 no banco antes de qualquer inserção.
8. **Portais Públicos Sem Autenticação:** Intake de novos clientes (`/intake`) e simulador de audiência (`/preparacao`) operam sem exigir login do operador.
9. **Dual-Store de Transição:** Convivência entre persistência ativa no PocketBase e cache local em `localStorage` via classe `dataStore.ts`.
10. **Segurança de Segredos no Servidor:** Chaves de API externas (DataJud, Gemini, Skip AI) são consumidas exclusivamente pelos hooks do servidor, sem exposição no bundle do frontend.

### B) Stack Completa Resumida

- **Core:** React 18, TypeScript 5.6, Vite 6, Tailwind CSS 3.4, Radix UI / shadcn/ui.
- **Backend:** PocketBase (Go + Goja JS runtime).
- **APIs Externas:** DataJud (CNJ Elasticsearch), ComunicaAPI (DJEN PJe), Google Gemini API.

### C) Fluxo de Dados Atual

- Ingestão de diários (DJEN/CSV) → Sanitização anti-prompt-injection → Armazenamento em `sentinela_communications` → Triagem IA / Heurística → Cálculo determinístico de prazos → Homologação pelo advogado → Vínculo com cliente e tarefas de produção.
- Monitoramento de processos → Consulta DataJud via hook `/datajud/consultar` → Deduplicação SHA-256 → Gravação em `movimentacoes_processo` → Notificação de alertas em `alertas_movimentacao` → Visualização na linha do tempo unificada de `ProcessDetailPage`.

### D) Banco de Dados e Entidades

- 16 coleções gerenciadas com 13 migrations estruturadas.
- Chaves estrangeiras e relações existentes: `processos_monitorados.client_id` relacionando com `clients.id`; `user_module_permissions.user_id` relacionando com `users.id`; `document_templates.user_id` relacionando com `users.id`.
- Campos de ligação lógica textual: `records.client_id`, `sentinela_agenda.client_id`, `production_items.client_id`.

### E) Autenticação e Permissões

- Token JWT gerido via `pb.authStore`.
- Rotas protegidas no React por `ProtectedModuleRoute` e no backend por `$apis.requireAuth()`.

### F) Tempo Real e Eventos

- SSE (Server-Sent Events) ativo no PocketBase com listener funcional para novos clientes de intake.
- Ausência de WebSockets bidirecionais e mensageria distribuída (Redis/Kafka).

### G) Integrações Existentes

- DataJud CNJ (ativa no backend com fallback público).
- ComunicaAPI DJEN CNJ (ativa no frontend com tratamento de HTTP 429).
- Google Gemini 3.5 Flash Lite (ativa no backend para triagem e LEX TEMPUS).

### H) Estado Real da Inteligência Artificial

- A IA está conectada e funcional no backend via proxy seguro.
- Possui salvaguardas rigorosas: anti-prompt injection, resposta sobre rito sem invadir mérito na preparação de audiência, e proibição de cálculo de prazos (atribuição exclusiva do motor matemático).
- Conta com contingência determinística local caso a API da IA falhe.

### I) 10 Maiores Riscos Técnicos

1. Falha de limite de cota (`QuotaExceededError`) por uso excessivo de `localStorage` em clientes de alto volume.
2. Queda de performance e tempo de resposta devido ao uso de `getFullList()` sem paginação em coleções volumosas.
3. Chave pública de API do DataJud embutida como fallback em arquivos de hook.
4. Ausência de autenticação multifator ou validação OTP no portal do cliente por CPF (`preparacao_auth.js`).
5. Processamento síncrono no sincronizador em lote de processos sujeito a HTTP 504 Timeout.
6. Risco de XSS na pré-visualização de modelos `.docx` com `dangerouslySetInnerHTML` sem sanitização DOMPurify.
7. Dependência excessiva da classe monolítica `dataStore.ts` (quase 3.000 linhas).
8. Regras de API abertas no PocketBase para certas coleções operacionais que deveriam ser restritas a usuários autenticados.
9. Concatenação de strings em queries de filtro `$app.findRecordsByFilter`.
10. Ausência de fila de retry para requisições com rate-limit ou indisponibilidade de tribunais.

### J) 10 Principais Pontos de Extensão Recomendados

1. Implementação de webhook HTTP receptor da Evolution API para automação de WhatsApp.
2. Criação de rotas `/backend/v1/webhooks/*` com autenticação por token de segredo para orquestração com n8n.
3. Adição de pipeline de transcrição de áudio para mensagens de voz de clientes e gravações de audiências.
4. Migração das regras de automação (`sentinela_automations`) do cliente para workers/crons de backend.
5. Transição completa dos dados em `localStorage` para as coleções relacionais correspondentes no PocketBase.
6. Implementação de paginação cursor-based em todas as listagens de processos e movimentações.
7. Substituição da chave DataJud fallback por injeção exclusiva via `set_env`.
8. Envio de código OTP via WhatsApp antes de liberar a tela de preparação de audiência ao cliente.
9. Sanitização estrita do HTML gerado por arquivos Word com `DOMPurify` antes da injeção no DOM.
10. Criação de base vetorial para RAG de jurisprudência e peças anteriores do escritório utilizando `$ai.embed`.

### K) Arquivos que Obrigatoriamente Precisam Ser Analisados Antes de Qualquer Alteração

1. `src/App.tsx` (Roteador e barreiras de segurança de rotas).
2. `src/services/dataStore.ts` (Mapeamento de modelos de dados e persistência híbrida).
3. `src/services/authUsersService.ts` (Estrutura de RBAC e autenticação).
4. `src/services/datajudService.ts` (Lógica de resolução de tribunais e sincronização CNJ).
5. `src/services/deadlineEngine.ts` (Motor legal matemático — não alterar sem auditoria jurídica).
6. `pocketbase/hooks/gemini_proxy.js` (Padrão de comunicação segura com LLMs).
7. `pocketbase/hooks/datajud_consultar.js` (Padrão de deduplicação e ingestão no banco).
8. `src/lib/pocketbase/schema.json` (Visão completa das tabelas e índices existentes).

### L) Perguntas que Ainda Não Podem Ser Respondidas Apenas Pelo Código Atual

1. Qual é o volume diário esperado de processos monitorados e publicações em escala de produção real?
2. A banca jurídica possui instância própria/paga dedicada da API DataJud ou continuará utilizando o endpoint público com chave comunitária do CNJ?
3. Qual provedor oficial de WhatsApp (Evolution API hospedada própria, Z-API, Gupshup, Meta Cloud API Oficial) será homologado para a comunicação com clientes?
4. Os modelos de documentos `.docx` cadastrados pelo escritório contêm formatações complexas (tabelas aninhadas, cabeçalhos dinâmicos) que demandem renderizador mais avançado que o parser XML atual?
5. Existe previsão de suporte a processos judiciais sob segredo de justiça absoluto mediante certificado digital ICP-Brasil (A1/A3), o que exigiria um proxy PKI especializado?

---

_Fim do Dossiê Técnico de Engenharia & Arquitetura — Central NOX._
