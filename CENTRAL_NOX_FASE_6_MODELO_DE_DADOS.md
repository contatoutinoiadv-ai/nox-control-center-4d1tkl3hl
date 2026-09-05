# CENTRAL NOX V2: MODELO DE DADOS DA CENTRAL DE ATENDIMENTO

## FASE 6, LOTE 1: BACKEND E COLECOES REAIS DE ATENDIMENTO

Este documento estabelece o modelo de dados canônico, relacional e de segurança da Central de Atendimento Operacional do CENTRAL NOX.
Todas as coleções e regras descritas foram implementadas através de migração versionada e aplicadas no banco PocketBase (Skip Cloud).

---

### 1. AUDITORIA PREVIA E PRINCIPIO DE NAO DUPLICACAO

Antes da criação das novas entidades, foi realizada uma auditoria completa nas coleções existentes no banco PocketBase da aplicação.
A diretriz mandatória foi: **REUTILIZAR -> EVOLUIR -> CRIAR SOMENTE QUANDO ESTRITAMENTE NECESSARIO**.

Coleções existentes reutilizadas integralmente via relacionamentos (RelationField):

1. **users** (`_pb_users_auth_`): Reutilizada para operadores, advogados responsáveis, autores de notas internas, auditores e revisores de IA. Não foi criada nenhuma tabela paralela de atendentes ou operadores.
2. **clients**: Reutilizada como fonte da verdade de clientes e leads. Não há criação automática de cliente por mensagem recebida. Conversas iniciam sem cliente vinculado (`client_id = null`) até homologação humana.
3. **processos_monitorados**: Reutilizada para vínculo de processos judiciais CNJ à conversa (`process_id`). Garante integridade com os dados monitorados no DataJud e no Sentinela.
4. **audit_logs**: Reutilizada para custódia probatória e auditoria operacional, recebendo a nova categoria `atendimento`. Não foi criado sistema de auditoria paralelo.
5. **sentinela_tasks** e **sentinela_agenda**: Preservadas para integração futura de tarefas e audiências a partir de atendimentos.

---

### 2. COLECOES CRIADAS NA FASE 6 (LOTE 1)

Foram criadas 7 novas coleções no PocketBase, agrupadas no domínio da Central de Atendimento:

#### 2.1 Coleção: `nox_conversations`

Representa o canal e o ciclo de vida do diálogo com o contato.

- **Campos**:
  - `id`: Identificador alfanumérico padrão PocketBase (chave primária).
  - `channel`: Select (`WHATSAPP`, `INTERNAL`, `PORTAL`, `SISTEMA`). Canal de comunicação. Nesta fase preparado para conexão futura sem conexão ativa.
  - `external_conversation_id`: Texto. Identificador externo da conversa no provedor (preparado para Evolution API no futuro).
  - `phone_normalized`: Texto. Número de telefone padronizado em formato E.164 (apenas dígitos).
  - `contact_name`: Texto. Nome informado pelo contato ou identificado.
  - `client_id`: Relação opcional com `clients` (`maxSelect: 1`, `cascadeDelete: false`). Nulo quando cliente não identificado.
  - `process_id`: Relação opcional com `processos_monitorados` (`maxSelect: 1`, `cascadeDelete: false`). Nulo quando conversa não possui processo vinculado.
  - `assigned_user_id`: Relação opcional com `users` (`maxSelect: 1`, `cascadeDelete: false`). Responsável atual pelo atendimento.
  - `status`: Select (`NEW`, `TRIAGE`, `IN_PROGRESS`, `WAITING_CLIENT`, `WAITING_OFFICE`, `WAITING_DOCUMENT`, `COMPLETED`, `ARCHIVED`). Estados canônicos em inglês técnico. Labels em português ficam exclusivamente na camada de UI.
  - `priority`: Select (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). Prioridade operacional independente do status.
  - `last_message_at`: Texto ISO 8601. Timestamp da última mensagem trafegada.
  - `last_message_preview`: Texto. Resumo ou trecho da última mensagem para exibição na lista.
  - `unread_count`: Número. Contador de mensagens pendentes de leitura.
  - `is_archived`: Booleano. Flag para arquivamento operacional sem exclusão de registro.
  - `instance_id`: Texto. Reservado para instância multi-tenant ou conexão futura de mensageria.
  - `external_chat_id`: Texto. Reservado para identificação remota do chat no provedor.
  - `created`: Autodate PocketBase. Data de criação.
  - `updated`: Autodate PocketBase. Data de última atualização.
- **Índices**:
  - `idx_nox_conv_status`: B-Tree em `status` para filtros da fila de atendimento.
  - `idx_nox_conv_priority`: B-Tree em `priority` para ordenação e filtro de urgências.
  - `idx_nox_conv_assigned`: B-Tree em `assigned_user_id` para filtro de conversas do usuário autenticado (Minhas Conversas).
  - `idx_nox_conv_client`: B-Tree em `client_id` para cruzamento ágil no painel de cliente.
  - `idx_nox_conv_process`: B-Tree em `process_id` para cruzamento ágil no painel de processos.
  - `idx_nox_conv_last_msg`: B-Tree em `last_message_at DESC` para ordenação cronológica decrescente da lista.
  - `idx_nox_conv_phone`: B-Tree em `phone_normalized` para busca rápida por telefone.
  - `idx_nox_conv_ext_id`: B-Tree em `external_conversation_id` para reconciliação externa.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""` (Usuários autenticados)
  - `viewRule`: `@request.auth.id != ""` (Usuários autenticados)
  - `createRule`: `@request.auth.id != ""` (Usuários autenticados)
  - `updateRule`: `@request.auth.id != ""` (Usuários autenticados)
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"` (Exclusão restrita a administradores)

#### 2.2 Coleção: `nox_messages`

Representa o histórico de mensagens trocadas na conversa.

- **Campos**:
  - `id`: Identificador PocketBase.
  - `conversation_id`: Relação obrigatória com `nox_conversations` (`maxSelect: 1`, `cascadeDelete: true`).
  - `external_message_id`: Texto. ID da mensagem no provedor externo para controle de deduplicação e idempotência.
  - `direction`: Select (`INBOUND`, `OUTBOUND`, `INTERNAL_SYSTEM`). Direção do tráfego.
  - `type`: Select (`TEXT`, `IMAGE`, `AUDIO`, `VIDEO`, `DOCUMENT`, `SYSTEM`). Tipo de conteúdo de transporte.
  - `sender_type`: Texto (`CLIENT`, `OPERATOR`, `SYSTEM`).
  - `sender_user_id`: Relação opcional com `users` (`maxSelect: 1`, `cascadeDelete: false`). Preenchido para mensagens enviadas por operadores internos.
  - `sender_external_id`: Texto. ID ou telefone do remetente externo.
  - `content_text`: Texto. Conteúdo textual puro da mensagem (sanitizado, sem execução de script).
  - `status`: Select (`PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`). Estado de entrega da mensagem.
  - `reply_to_message_id`: Texto. ID da mensagem respondida (thread de citação).
  - `sent_at`: Texto ISO 8601. Timestamp do envio.
  - `delivered_at`: Texto ISO 8601. Timestamp de entrega.
  - `read_at`: Texto ISO 8601. Timestamp de confirmação de leitura.
  - `failed_at`: Texto ISO 8601. Timestamp de falha.
  - `failure_reason`: Texto. Descrição técnica da falha de envio.
  - `metadata_json`: JSON. Metadados do transporte.
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_msg_conv_created`: Composto em `(conversation_id, created ASC)` para carregamento ágil e cronológico da timeline da conversa.
  - `idx_nox_msg_ext_id`: B-Tree em `external_message_id` para busca e deduplicação de mensagens recebidas.
  - `idx_nox_msg_status`: B-Tree em `status` para monitoramento de mensagens pendentes ou falhas.
  - `idx_nox_msg_direction`: B-Tree em `direction`.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""`
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != ""`
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"`

#### 2.3 Coleção: `nox_message_attachments`

Armazena anexos de mensagens com validação de segurança e tipo MIME real.

- **Campos**:
  - `id`: Identificador PocketBase.
  - `message_id`: Relação obrigatória com `nox_messages` (`maxSelect: 1`, `cascadeDelete: true`).
  - `file`: Arquivo nativo PocketBase (`maxSize: 26214400` bytes / 25 MB).
    MIME Types permitidos e validados: imagens (`jpeg`, `png`, `webp`, `gif`), áudios (`ogg`, `mpeg`, `mp4`, `wav`), vídeos (`mp4`, `quicktime`), documentos (`pdf`, `doc`, `docx`, `xls`, `xlsx`, `txt`, `csv`). Extensões executáveis, scripts (`js`, `vbs`, `bat`, `sh`) e arquivos `html` são estritamente rejeitados na camada do servidor.
  - `mime_type`: Texto obrigatório. Tipo MIME real detectado no payload.
  - `original_name`: Texto obrigatório. Nome original do arquivo enviado.
  - `size`: Número. Tamanho em bytes.
  - `sha256`: Texto. Hash criptográfico SHA-256 do arquivo para integridade probatória e deduplicação.
  - `storage_provider`: Texto (`local`, `s3`, etc.).
  - `metadata_json`: JSON. Informações adicionais (ex: dimensões de imagem, duração de áudio).
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_attach_msg`: B-Tree em `message_id` para busca direta de arquivos da mensagem.
  - `idx_nox_attach_sha256`: B-Tree em `sha256` para auditoria e verificação de duplicidade de arquivos.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""`
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != ""`
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"`

#### 2.4 Coleção: `nox_assignments`

Registra o histórico operacional de transferências de responsabilidade de atendimento.

- **Campos**:
  - `id`: Identificador PocketBase.
  - `conversation_id`: Relação obrigatória com `nox_conversations` (`maxSelect: 1`, `cascadeDelete: true`).
  - `assigned_to_user_id`: Relação obrigatória com `users` (`maxSelect: 1`, `cascadeDelete: false`). Usuário que assumiu o atendimento.
  - `assigned_by_user_id`: Relação opcional com `users` (`maxSelect: 1`, `cascadeDelete: false`). Usuário ou operador que efetuou a atribuição.
  - `reason`: Texto. Motivo da transferência ou assunção.
  - `assigned_at`: Texto ISO 8601. Início do período de custódia.
  - `ended_at`: Texto ISO 8601. Fim do período quando o atendimento é transferido novamente.
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_assign_conv`: Composto em `(conversation_id, created DESC)` para histórico de custódia operacional.
  - `idx_nox_assign_user`: B-Tree em `assigned_to_user_id` para relatórios de produtividade e carga de trabalho.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""`
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != ""`
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"`

#### 2.5 Coleção: `nox_internal_notes` (CRITICA: SEPARACAO ESTRUTURAL)

Notas internas de discussão jurídica e operacional da equipe.
**Regra Arquitetural Absoluta**: NOTA INTERNA NUNCA E MENSAGEM OUTBOUND.
A separação não é apenas uma flag visual na UI, mas uma barreira estrutural de banco de dados. Uma nota interna não reside na tabela `nox_messages`, eliminando qualquer risco de um bug de query ou envio em massa expor notas para clientes ou canais externos.

- **Campos**:
  - `id`: Identificador PocketBase.
  - `conversation_id`: Relação obrigatória com `nox_conversations` (`maxSelect: 1`, `cascadeDelete: true`).
  - `author_user_id`: Relação obrigatória com `users` (`maxSelect: 1`, `cascadeDelete: false`).
  - `content`: Texto obrigatório. Conteúdo confidencial da anotação interna.
  - `mentions`: JSON. Lista de usuários mencionados (ex: nomes, IDs ou roles marcados com @).
  - `is_archived`: Booleano. Flag de arquivamento.
  - `deleted_at`: Texto ISO 8601. Soft delete para controle de exclusão.
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_notes_conv`: Composto em `(conversation_id, created ASC)` para timeline de notas internas.
  - `idx_nox_notes_author`: B-Tree em `author_user_id`.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""` (Somente usuários autenticados da banca)
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != "" && author_user_id = @request.auth.id` (Apenas o autor pode editar sua nota)
  - `deleteRule`: `@request.auth.id != "" && (@request.auth.role = "admin" || author_user_id = @request.auth.id)` (Apenas admin ou o autor)

#### 2.6 Coleção: `nox_ai_analysis`

Armazena análises, triagens semânticas, classificações e sugestões geradas por inteligência artificial.
**Regra Arquitetural**: A IA NOX NÃO É AUTORIDADE JURÍDICA CANÔNICA.
Seus resultados são sugestões auxiliares e nunca sobrescrevem diretamente os dados cadastrais do cliente ou do processo. Vínculos ou ações sugeridas exigem homologação humana expressa no fluxo operacional (human-in-the-loop).

- **Campos**:
  - `id`: Identificador PocketBase.
  - `conversation_id`: Relação obrigatória com `nox_conversations` (`maxSelect: 1`, `cascadeDelete: true`).
  - `message_id`: Relação opcional com `nox_messages` (`maxSelect: 1`, `cascadeDelete: false`). Mensagem específica que gerou a análise, quando aplicável.
  - `analysis_type`: Select obrigatório (`TRIAGE`, `SUMMARY`, `INTENT`, `URGENCY`, `CLASSIFICATION`, `RESPONSE_SUGGESTION`, `DOCUMENT_ANALYSIS`).
  - `provider`: Texto (ex: `skip-ai`, `openai`, `gemini-local`).
  - `model`: Texto (ex: `gpt-4o-mini`, `gemini-1.5-flash`).
  - `result_json`: JSON obrigatório contendo a estrutura completa da inferência (resumo, entidades, sugestão).
  - `confidence`: Número (0 a 1). Grau de certeza do modelo.
  - `review_status`: Select obrigatório (`PENDING`, `APPROVED`, `REJECTED`, `EDITED`, `NOT_REQUIRED`).
  - `reviewed_by`: Relação opcional com `users` (`maxSelect: 1`, `cascadeDelete: false`). Operador humano que revisou a sugestão.
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_ai_conv`: Composto em `(conversation_id, created DESC)` para carregar a última análise da conversa.
  - `idx_nox_ai_type`: B-Tree em `analysis_type`.
  - `idx_nox_ai_review`: B-Tree em `review_status` para identificar análises pendentes de revisão.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""`
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != ""`
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"`

#### 2.7 Coleção: `nox_webhook_events`

Tabela de recepção de eventos de transporte preparada para resiliência e garantia de idempotência (at-least-once delivery).
Nesta fase não há Evolution API conectada, mas o modelo está completamente protegido contra duplo processamento.

- **Campos**:
  - `id`: Identificador PocketBase.
  - `provider`: Texto obrigatório (`evolution`, `whatsapp`, etc.).
  - `event_type`: Texto obrigatório (ex: `messages.upsert`, `messages.update`).
  - `external_event_id`: Texto. ID externo do evento para controle de duplicações.
  - `payload_hash`: Texto obrigatório. Hash SHA-256 do payload para conferência e deduplicação de mensagens sem ID externo.
  - `status`: Select obrigatório (`RECEIVED`, `PROCESSING`, `PROCESSED`, `FAILED`, `IGNORED`).
  - `received_at`: Texto ISO 8601.
  - `processed_at`: Texto ISO 8601.
  - `attempts`: Número. Quantidade de tentativas de reprocessamento.
  - `error_summary`: Texto. Resumo de erro para diagnóstico sem persistir dados sensíveis de payload.
  - `metadata_json`: JSON. Metadados operacionais não sensíveis (headers relevantes, tamanho).
  - `created`: Autodate PocketBase.
  - `updated`: Autodate PocketBase.
- **Índices**:
  - `idx_nox_wh_dedup`: UNIQUE B-Tree em `(provider, external_event_id) WHERE external_event_id != ""` para garantia de idempotência no banco de dados SQLite. Eventos idênticos do mesmo provedor são rejeitados na inserção.
  - `idx_nox_wh_hash`: B-Tree em `payload_hash` para verificação secundária.
  - `idx_nox_wh_status`: B-Tree em `status` para fila de processamento assíncrono.
  - `idx_nox_wh_created`: B-Tree em `created DESC` para monitoramento operacional recente.
- **Regras de Acesso (API Rules)**:
  - `listRule`: `@request.auth.id != ""`
  - `viewRule`: `@request.auth.id != ""`
  - `createRule`: `@request.auth.id != ""`
  - `updateRule`: `@request.auth.id != ""`
  - `deleteRule`: `@request.auth.id != "" && @request.auth.role = "admin"`

---

### 3. JUSTIFICATIVA ARQUITETURAL DO QUE NAO FOI CRIADO

Em estrita consonância com a diretriz do projeto de evitar duplicação ou superengenharia prematura, as seguintes entidades conceituais foram avaliadas e justificadamente **NÃO CRIADAS COMO TABELAS SEPARADAS**:

1. **`nox_conversation_participants` (Não criada como coleção)**:
   - _Justificativa_: Na Central de Atendimento jurídico, o modelo é de canal direto individualizado (1 para 1 com cliente/contato) com atribuição de operador responsável.
   - Os dados do contato externo residem com alta eficiência diretamente em `nox_conversations` (`phone_normalized`, `contact_name`, `client_id`), enquanto a atribuição interna é gerida por `assigned_user_id` e historiada por `nox_assignments`.
   - Criar uma coleção intermediária `participants` adicionaria complexidade de junção SQL e latência desnecessária sem ganho funcional nesta fase. Caso surjam diálogos multi-partes em fase futura, uma migração simples pode introduzir a tabela sem quebrar as colunas canônicas existentes.

2. **`nox_automation_events` (Não criada como coleção redundante)**:
   - _Justificativa_: O sistema já possui a coleção canônica `sentinela_automations` para regras de automação ativas e a coleção `audit_logs` para histórico imutável de eventos operacionais.
   - Para o transporte e mensageria, criamos `nox_webhook_events`. Adicionar uma quarta coleção apenas para eventos de automação seria duplicação desnecessária e contraproducente.
   - Qualquer disparo de automação relacionado a atendimento é auditado na coleção unificada `audit_logs` sob a categoria `atendimento` ou `sistema`.

---

### 4. AUDITORIA INTEGRADA E CUSTODIA PROBATORIA

Nenhum subsistema paralelo de logs foi criado. A coleção canônica `audit_logs` foi evoluída na migração `0020` para admitir a categoria `atendimento`.

Eventos canônicos mínimos do módulo de Atendimento integrados ao `audit_logs`:

- `CONVERSATION_CREATED`: Criação de nova conversa na fila.
- `CONVERSATION_UPDATED`: Edição de metadados da conversa.
- `CONVERSATION_ASSIGNED`: Atribuição ou transferência de operador responsável.
- `CONVERSATION_STATUS_CHANGED`: Transição na máquina de estados de atendimento.
- `CLIENT_LINKED`: Associação manual de cliente cadastrado à conversa.
- `PROCESS_LINKED`: Associação de processo CNJ à conversa.
- `MESSAGE_CREATED`: Envio ou registro de mensagem na timeline.
- `INTERNAL_NOTE_CREATED`: Registro de nota interna da equipe jurídica.
- `AI_ANALYSIS_CREATED`: Geração e homologação de análise de IA.

Eventos de transporte de baixo nível (como chegada de pacotes HTTP brutos) não geram registros na coleção probatória de auditoria, garantindo que o log permaneça focado em atos operacionais relevantes.

---

### 5. PRIVACIDADE E MINIMIZACAO DE DADOS (LGPD E SIGILO OAB)

1. **Sem duplicação de dados sensíveis**: O cadastro do cliente (RG, CPF, endereço, situação jurídica completa) permanece unificado na coleção `clients`. A conversa armazena apenas chave estrangeira (`client_id`), nome informal e telefone de contato.
2. **Logs técnicos sem payload sensível**: Falhas e eventos registram metadados técnicos (código de erro, tamanho, hashes), jamais o conteúdo integral de mensagens privadas ou documentos sigilosos.
3. **Isolamento de credenciais**: Nenhuma chave de API, token ou segredo é persistido em banco.
4. **Proteção contra injeção e travessia**: Anexos possuem MIME types estritos permitidos na coleção, com validação de extensão e tamanho máximo de 25 MB.

---

### 6. MIGRATION REALIZADA

- **Arquivo**: `pocketbase/migrations/0020_nox_atendimento_collections.js`
- **Status**: Aplicada com sucesso via `apply_migrations`
- **Idempotência e Rollback**: Todas as coleções contêm métodos `up` com validação defensiva e blocos `down` com deleção em ordem inversa de dependências para reversão segura.
