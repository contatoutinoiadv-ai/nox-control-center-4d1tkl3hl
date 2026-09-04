# CENTRAL NOX V2 - RELATORIO DE CONCLUSAO DA FASE 2

## TRANSICAO DE DUAL-STORE PARA POCKETBASE COMO SOURCE OF TRUTH

> **Documento:** Relatorio Tecnico e Operacional de Entrega da Fase 2  
> **Versao da Aplicacao:** 0.0.54  
> **Data:** Marco de 2026  
> **Ambiente:** Skip Cloud (PocketBase) e React TypeScript SPA  
> **Status:** Concluido com Sucesso e Homologado (QA Verde)

---

### 1. ESTADO ANTERIOR (DUAL-STORE, DATASTORE.TS ~2900 LINHAS, LOCALSTORAGE COMO FONTE CONCORRENTE)

No inicio do projeto NOX Control Center, a aplicacao dependia fortemente de persistencia local via `localStorage`. Essa arquitetura, consolidada ao longo da Fase 1 e nos primeiros estagios da Fase 2, apresentava as seguintes caracteristicas e limitacoes estruturais:

1. **Persistencia Concorrente e Fragmentada:**
   - O arquivo central de gerenciamento de dados (`src/services/dataStore.ts`) continha aproximadamente 2.900 linhas de codigo (expandido para ~3.360 linhas ao absorver a camada de contingencia e sincronizacao), acumulando responsabilidades de armazenamento em memoria RAM, serializacao JSON para `localStorage`, controle de auditoria, geracao de dados sinteticos e chamadas esparsas de backend.
   - O `localStorage` atuava como fonte concorrente da verdade. Quando um operador atualizava clientes, compromissos ou pecas processuais, o estado era imediatamente gravado em disco local do navegador e apenas opcionalmente ou tardiamente propagado para o banco de dados.

2. **Divergencia Multiusuario e Falta de Sincronizacao em Tempo Real:**
   - Modificacoes realizadas por um operador em um terminal nao se refletiam para os demais membros da equipe ate que houvesse uma atualizacao manual de pagina ou reimportacao de dados.
   - Conflitos silenciosos ocorriam quando dois navegadores gravavam dados com identificadores locais gerados por timestamps do cliente.

3. **Inconsistencia de Identificadores:**
   - O `localStorage` utilizava identificadores arbitrarios com prefixos locais (por exemplo: `cli_1725268800000_a1b2`, `prod_1725268800000_c3d4`, `agenda_1725268800000`, `task_1725268800000`), enquanto o PocketBase exige chaves primarias canônicas de texto alfanumerico de exatamente 15 caracteres (como `u9wcaim6yazrj7k`).
   - A ausencia de uma camada formal de remapeamento gerava descompasso nos relacionamentos de chave estrangeira entre clientes, processos, tarefas e producoes.

---

### 2. DOMINIOS MIGRADOS

Na Fase 2 (lotes 2B, 2C e 2D), quatro dominios operacionais criticos foram formalmente migrados para o PocketBase, que passou a atuar como a Fonte Unica de Verdade (Source of Truth) oficial do sistema:

1. **Clientes (`clients`):**
   - **Leitura Prioritaria:** Ao inicializar ou recarregar (`dataStore.initPocketBaseSync`), os clientes sao obtidos diretamente da colecao `clients` do PocketBase via `pb.collection('clients').getFullList({ sort: '-created' })`. O cache em memoria e o armazenamento local servem unicamente como contingencia e aceleracao visual.
   - **Escrita Primaria no PocketBase:** Criacao (`addClient`), alteracao de dados (`updateClient`), mudanca de estagio de atendimento (`updateClientStage`), vinculo de processos (`linkProcessToClient`) e exclusao (`deleteClient`) realizam mutacoes no PocketBase com reflexo no estado reativo local.
   - **Remapeamento de Identificadores:** Identificadores locais legados foram preservados no atributo `legacy_id` no PocketBase. Na criacao de novos registros pelo sistema, o PocketBase gera o ID canônico de 15 caracteres ou sanitiza os identificadores em conformidade estrita com o schema.

2. **Compromissos e Audiencias (`sentinela_agenda`):**
   - **Leitura e Escrita:** Centralizados na colecao `sentinela_agenda` do PocketBase. Todas as audiencias, sessoes de julgamento, reunioes e compromissos operacionais sao gravados e consultados a partir do banco.
   - **Remapeamento de client_id e client_code:** Eventos de agenda legados com referencias a clientes locais tiveram seus vínculos resolvidos no PocketBase buscando sucessivamente por `client_id`, `client_code`, `cpf` normalizado e nome do cliente, gravando o ID canônico de 15 caracteres do cliente no campo `client_id`.
   - **Integracao de Preparacao de Audiencia:** O status `preparacao_habilitada`, as alegacoes e a autorizacao de visualizacao pelo cliente final sao mantidos de forma persistente e auditada no PocketBase.

3. **Producao Juridica (`production_items`):**
   - **Leitura e Escrita:** A esteira de producao de pecas (peticoes iniciais, contestacoes, recursos) e gerida na colecao `production_items` do PocketBase.
   - **Vinculacao Estrita:** Cada item de producao exige vinculo formal com um cliente existente. O adaptador e o `dataStore` resolvem o `client_id` canônico no servidor.
   - **Preservacao de Metadados Complexos:** Triagem de evidencias em 5 camadas (essencial, util, neutro, perigoso, dispensavel), sensor de grandes litigantes com reclassificacao automatica de nivel (Nivel 1, 2 ou 3), stress-test adversarial de 3 dimensoes (tecnica juridica, coerencia narrativa e humanizacao) e historico completo de estagios sao salvos no banco.

4. **Tarefas Operacionais (`sentinela_tasks`):**
   - **Leitura e Escrita:** Gravadas e consultadas na colecao `sentinela_tasks`.
   - **Sincronizacao de Prazos e Subtarefas:** Vinculo com prazos do DJEN (`communication_id`, `legal_deadline_date`), matriz de responsaveis, subtasks com checklist interativo e bloqueios operacionais sao persistidos diretamente no PocketBase.

---

### 3. DADOS PRESERVADOS

A migracao foi conduzida sob o principio da nao-destrutividade e da integridade probatoria. Nenhum dado valido foi descartado durante a transicao:

1. **Nenhum Registro Descartado:**
   - Todo registro encontrado no `localStorage` durante a execucao do `legacyStorageAdapter` foi inspecionado, validado contra o esquema do dominio correspondente e processado para integracao ao PocketBase.
   - Registros parciais ou com campos faltantes receberam valores padrao consistentes (por exemplo: responsavel padrao, nacionalidade brasileira, estagio inicial "novo") sem truncamento de informacao existente.

2. **Deduplicacao Idempotente:**
   - Antes de qualquer operacao de gravacao no PocketBase, o adaptador executa uma consulta completa (`getFullList`) e monta mapas em memoria RAM para deteccao de duplicidades.
   - A checagem de duplicidade ocorre atraves de chaves naturais e identificadores:
     - Clientes: checagem por `cpf` (somente digitos), `client_code` e `legacy_id`.
     - Agenda: checagem por assinatura combinada (`title + start_date + process_number`) e `legacy_id`.
     - Producao: checagem por assinatura (`titulo_peca + numero_processo`) e `legacy_id`.
     - Tarefas: checagem por assinatura (`title + process_number + internal_due_date`) e `legacy_id`.
   - Registros ja existentes no banco foram pulados de forma limpa (`duplicatesSkipped`), garantindo execucao idempotente que pode ser repetida multiplas vezes sem criar duplicatas.

3. **Rastreabilidade por legacy_id:**
   - O campo `legacy_id` foi adicionado as colecoes `clients`, `sentinela_agenda`, `sentinela_tasks` e `production_items`.
   - Qualquer chave anterior do `localStorage` (ex: `cli_...` ou `prod_...`) permanece gravada no registro do PocketBase, permitindo auditoria retroativa, reconstrucao de historico e reversibilidade total.

---

### 4. CONFLITOS ENCONTRADOS E A REGRA APLICADA

Para cenarios em que um mesmo registro existia tanto no `localStorage` quanto no PocketBase com dados divergentes, aplicou-se uma regra estrita de resolucao:

1. **Prevalencia do PocketBase (Servidor Autoritativo):**
   - O PocketBase e a Fonte Unica de Verdade. Em nenhuma circunstancia dados locais desatualizados ou divergentes sobrescrevem o banco de dados de maneira automatica ou silenciosa.
   - O registro persistido no banco e preservado intacto como versao canônica ativa.

2. **Preservacao do Dado Local para Revisao Humana:**
   - Os valores locais divergentes nao sao descartados no lixo. O adaptador captura o objeto local completo (`localValue`) e o objeto do servidor (`serverValue`), estruturando um registro de conflito (`LegacyConflictRecord`).
   - Os conflitos sao mantidos na memoria reativa e persistidos na chave `nox_migration_conflicts_v2` para que o operador possa visualiza-los detalhadamente atraves do modal "Revisar Conflitos" acionado pelo componente `MigrationStatusBanner`.

3. **Auditoria Rigorosa com Evento LEGACY_DATA_CONFLICT:**
   - Cada ocorrencia de conflito dispara a criacao imediata de um registro na colecao `audit_logs` no PocketBase sob a categoria `migracao`.
   - O log de auditoria registra: acao `LEGACY_DATA_CONFLICT`, autor, identificador de alvo (`dominio:chave`), motivo da divergencia (por exemplo, "Divergencia de nome: Servidor=... vs Local=...") e sumarios higienizados dos registros, sem expor dados sigilosos ou senhas nos detalhes.

---

### 5. MIGRATIONS APLICADAS

Duas migrations JavaScript foram desenvolvidas e executadas com sucesso no backend PocketBase:

1. **Migration 0018 (`pocketbase/migrations/0018_fase2_schema_and_rules.js`):**
   - **Expansao de Categorias em audit_logs:** Atualizou o campo `category` (tipo `select`) da colecao `audit_logs` para permitir os novos valores `migracao` e `seguranca`, necessarios para o rastreamento das operacoes do adaptador e eventos de governanca.
   - **Alinhamento de API Rules:** Ajustou as regras de acesso (`listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`) das colecoes `sentinela_tasks`, `sentinela_automations` e `sentinela_incidents` para `@request.auth.id != ""`, exigindo autenticacao valida e fechando brechas de leitura publica.
   - **Campo legacy_id em clients:** Adicionou o campo textual opcional `legacy_id` na colecao `clients` para indexacao e busca reversa de clientes legados.
   - **Reversibilidade:** Bloco de down-migration implementado para restaurar regras e remover campos caso necessario.

2. **Migration 0019 (`pocketbase/migrations/0019_fase2_audit_and_legacy_fields.js`):**
   - **Consolidacao de SelectField em audit_logs:** Garantiu a lista completa de valores validos da categoria (`importacao`, `revisao`, `exportacao`, `sistema`, `configuracao`, `lex_tempus`, `migracao`, `seguranca`) com `maxSelect = 1`.
   - **Campos legacy_id nos demais dominios:** Criou formalmente o campo `legacy_id` (tipo `text`) nas colecoes `sentinela_agenda`, `sentinela_tasks` e `production_items`.
   - **Idempotencia:** Verifica a existencia prévia de cada campo antes de tentar adiciona-lo, evitando falhas de migracao em ambientes ja inicializados.

---

### 6. ARQUIVOS ALTERADOS E CRIADOS

A implementacao da Fase 2 envolveu os seguintes arquivos no repositorio:

1. **`src/services/legacyStorageAdapter.ts` (Criado - ~1.210 linhas):**
   - Servico singleton dedicado a inspecionar o `localStorage`, deduplicar, normalizar dados, efetuar batch import no PocketBase, auditar eventos e notificar listeners de interface sobre o progresso e eventuais conflitos.
2. **`src/services/dataStore.ts` (Alterado - ~3.365 linhas):**
   - Atualizado para priorizar carregamento a partir do PocketBase em `initPocketBaseSync`, manter subscricoes SSE em tempo real via `initRealtimeSubscriptions`, delegar persistencia remota no `create`, `update` e `delete` dos 4 dominios e registrar status de conexao e sincronizacao (`getSyncStatus`).
3. **`src/services/phase2TestSuite.ts` (Criado - ~293 linhas):**
   - Suite de testes automatizados contendo os 13 cenarios de validacao de integridade de migracao, idempotencia, resiliencia offline e remapeamento relacional.
4. **`src/components/MigrationStatusBanner.tsx` (Criado - ~188 linhas):**
   - Componente visual de topo responsavel por informar o operador sobre o status da conexao (modo offline), progresso da sincronizacao de dados, presenca de dados legados no navegador e dialogo detalhado de revisao de conflitos.
5. **`src/components/Layout.tsx` (Alterado):**
   - Inclusao do `MigrationStatusBanner` no topo do layout principal e orquestracao automatica da rotina de deteccao e migracao legada no bootstrap de usuarios autenticados.
6. **`src/pages/LoginPage.tsx` (Alterado):**
   - Integracao do gatilho de migracao transparente pos-autenticacao bem-sucedida, disparando `legacyStorageAdapter.runFullMigration()` assim que o token JWT e estabelecido.
7. **`src/pages/SettingsPage.tsx` (Alterado):**
   - Adicao do painel de controle operacional da Fase 2, contendo acionamento manual de sincronizacao, botao para rodar a suite de testes automatizados e exibicao detalhada dos resultados das 13 baterias de teste.
8. **Migrations 0018 e 0019 (`pocketbase/migrations/`):**
   - Scripts de banco responsaveis pela expansao do esquema, criacao de `legacy_id` e enrijecimento de regras de acesso via API.

---

### 7. LOCALSTORAGE QUE PERMANECE COM JUSTIFICATIVA POR CHAVE

Nem todo dado do sistema deve residir obrigatoriamente no banco de dados centralizado. As seguintes chaves permanecem no `localStorage` por motivos tecnicos legitimos:

| Chave de Armazenamento                     | Tipo / Formato                  | Justificativa Tecnica de Retencao                                                                                                                                                                                                                                                     |
| :----------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nox_control_center_settings_v1`           | `AppSettings` (JSON)            | Preferencias ergonomicas de interface do operador local (animacoes reduzidas `reducedMotionPreference`, intervalo de atualizacao automatica do radar e flags de visualizacao no cliente).                                                                                             |
| `nox_lawyer_profile_v1`                    | `Object` (JSON)                 | Cache de personalizacao local do advogado titular (nome de exibicao, telefone e cargo para formatacao rapida de documentos e peticoes no frontend sem requisicoes repetitivas de rede).                                                                                               |
| `nox_migrated_v2_${dominio}`               | Booleano (`"true"`)             | Flags de idempotencia criadas pelo `legacyStorageAdapter` (para `clients`, `sentinela_agenda`, `sentinela_tasks`, `production_items`, `records`, `sentinela_communications`, `audit_logs`). Evitam que o sistema execute reimportacoes desnecessarias a cada inicializacao da pagina. |
| `nox_migration_conflicts_v2`               | `LegacyConflictRecord[]` (JSON) | Fila de registros em conflito preservados localmente para consulta e resolucao pelo operador no banner de governanca.                                                                                                                                                                 |
| `pocketbase_auth`                          | JWT Token + Record (JSON)       | Token oficial de sessao criptografada gerenciado nativamente pelo PocketBase SDK para manter o usuario conectado.                                                                                                                                                                     |
| `nox_control_center_clients_v1` (Cache)    | `NoxClient[]` (JSON)            | Cache de contingencia offline. Permite que o operador continue visualizando informacoes cadastrais se houver queda transitoria da conexao de internet ou latencia de rede.                                                                                                            |
| `nox_sentinela_agenda_v1` (Cache)          | `AgendaEvent[]` (JSON)          | Cache de contingencia offline para consulta imediata de compromissos e audiencias sem travar a interface.                                                                                                                                                                             |
| `nox_control_center_production_v1` (Cache) | `ProductionItem[]` (JSON)       | Cache de contingencia offline para manter o pipeline de producao visivel em momentos de indisponibilidade de conexao.                                                                                                                                                                 |
| `nox_sentinela_tasks_v1` (Cache)           | `SentinelaTask[]` (JSON)        | Cache de contingencia offline para consulta de tarefas em andamento.                                                                                                                                                                                                                  |

---

### 8. JUSTIFICATIVA DO QUE PERMANECE LOCAL (UI STATE VS SERVER STATE)

A separacao entre Server State (estado do servidor) e UI State (estado da interface) obedece as boas praticas universais de engenharia de software web:

1. **Server State (Centralizado no PocketBase):**
   - Dados de negocio compartilhados, juridicamente sensiveis ou com valor probatorio (clientes, processos monitorados, movimentacoes do DataJud, comunicacoes do DJEN, prazos processuais calculados, itens em producao e logs imutaveis de auditoria) pertencem exclusivamente ao servidor.
   - Devem ser consistentes, auditados, protegidos por regras de autorizacao RBAC e propagados a todos os operadores conectados em tempo real.

2. **UI State (Retido no Navegador Local):**
   - Preferencias de uso individual, configuracoes visuais de tema/densidade, estado de gavetas e modais abertos, termos de busca digitados em caixas de filtro e status efêmeros de navegacao pertencem a sessao do navegador.
   - Gravar preferencias de interface local no banco sobrecarregaria o backend com escritas superfluas e causaria conflito entre operadores que utilizam resolucoes de tela ou perfis de trabalho distintos.

---

### 9. TESTES EXECUTADOS: SUITE PHASE2TESTSUITE.TS COM OS 13 CENARIOS

Foi implementada no modulo `src/services/phase2TestSuite.ts` uma bateria completa de 13 testes automatizados, acessivel e executavel diretamente atraves do painel de Configuracoes (`SettingsPage.tsx`). Os cenarios e seus respectivos resultados sao:

1. **Cenario 1: Banco Vazio (`T1_BANCO_VAZIO`):**
   - **Objetivo:** Garantir que o `legacyStorageAdapter` e o `dataStore` inicializem sem lancar excecoes mesmo quando as colecoes do banco nao possuirem nenhum registro.
   - **Resultado:** Aprovado. Retorno consistente e degradacao graciosa.
2. **Cenario 2: Usuario Sem Dados Legados (`T2_SEM_DADOS_LEGADOS`):**
   - **Objetivo:** Simular navegador recem-instalado sem chaves no `localStorage`.
   - **Resultado:** Aprovado. O processo marca o dominio como migrado sem disparar criacoes fantasmas.
3. **Cenario 3: Usuario Com Dados Legados (`T3_COM_DADOS_LEGADOS`):**
   - **Objetivo:** Verificar a correta deteccao booleana de dados pendentes pelo metodo `hasPendingLegacyData()`.
   - **Resultado:** Aprovado. Deteccao precisa das chaves nao migradas.
4. **Cenario 4: Registro Apenas Local (`T4_REGISTRO_APENAS_LOCAL`):**
   - **Objetivo:** Criar cliente exclusivo no `localStorage` e verificar a importacao correta para o PocketBase com preservacao de atributos.
   - **Resultado:** Aprovado. Registro migrado com geracao de `legacy_id`.
5. **Cenario 5: Registro Apenas PocketBase (`T5_REGISTRO_APENAS_POCKETBASE`):**
   - **Objetivo:** Confirmar que registros existentes apenas no servidor sao carregados e prevalecem no `dataStore` e nas interfaces de listagem.
   - **Resultado:** Aprovado. Dados do PocketBase sao consumidos diretamente.
6. **Cenario 6: Registro Duplicado (`T6_REGISTRO_DUPLICADO`):**
   - **Objetivo:** Executar a rotina de migracao duas vezes consecutivas para validar a rejeicao de duplicidades.
   - **Resultado:** Aprovado. Segunda execucao pula registros identicos com zero duplicatas criadas (idempotencia garantida).
7. **Cenario 7: Registro Conflitante com Regra Explicita (`T7_REGISTRO_CONFLITANTE_REGRA_EXPLICITA`):**
   - **Objetivo:** Simular registro com mesma chave natural e dados divergentes.
   - **Resultado:** Aprovado. O servidor prevalece como canônico, o dado local divergente e preservado na fila de revisao e o evento `LEGACY_DATA_CONFLICT` e registrado na auditoria.
8. **Cenario 8: IDs Diferentes e Remapeamento (`T8_IDS_DIFERENTES`):**
   - **Objetivo:** Avaliar a transicao de identificadores legados (strings variaveis) para IDs canônicos do PocketBase (15 caracteres alfanumericos).
   - **Resultado:** Aprovado. Chaves mapeadas sem quebra de integridade.
9. **Cenario 9: Integridade Relacional Cliente -> Processo -> Compromisso/Tarefa (`T9_INTEGRIDADE_RELACIONAMENTOS`):**
   - **Objetivo:** Verificar se itens de producao, eventos de agenda e tarefas mantem vinculo estrito com o cliente canônico no PocketBase.
   - **Resultado:** Aprovado. A cadeia relacional e mantida e validada na criacao e atualizacao.
10. **Cenario 10: Refresh de Pagina (`T10_REFRESH_PERSISTENCIA`):**
    - **Objetivo:** Validar a resiliencia do estado apos recarregamento do ciclo de vida da aplicacao React.
    - **Resultado:** Aprovado. O `initPocketBaseSync` reidrata o estado de forma transparente.
11. **Cenario 11: Logout e Login Bootstrap (`T11_LOGOUT_LOGIN_BOOTSTRAP`):**
    - **Objetivo:** Testar se ao autenticar no `LoginPage` o sistema dispara a migracao automatica caso haja dados pendentes no dispositivo.
    - **Resultado:** Aprovado. Orquestracao no callback de login e no `Layout` em perfeito funcionamento.
12. **Cenario 12: Multiusuario SSE / Dois Navegadores (`T12_DOIS_NAVEGADORES_SSE`):**
    - **Objetivo:** Confirmar que eventos de criacao, alteracao e remocao emitidos via PocketBase Realtime (Server-Sent Events) propagam alteracoes para outras sessoes ativas.
    - **Resultado:** Aprovado. Subscricoes registradas para as quatro colecoes oficiais.
13. **Cenario 13: Falha de Rede e Resiliencia Offline (`T13_OFFLINE_RESILIENCE`):**
    - **Objetivo:** Simular interrupcao de conectividade com a API e checar comportamento do banner e do estado `isOffline`.
    - **Resultado:** Aprovado. O sistema aciona o `MigrationStatusBanner` informando operacao em modo offline e retem operacoes em memoria sem travar a interface nem iludir o usuario sobre salvamento remoto.

---

### 10. REGRESSOES VERIFICADAS

Durante a entrega da Fase 2, os testes de garantia de qualidade (QA) foram executados estritamente, cobrindo todo o ecossistema da aplicacao:

1. **Pipeline de QA (Zero Erros):**
   - **Linter (oxlint):** Analise estatica completa em todos os arquivos TypeScript e componentes TSX sem nenhuma violacao ou advertencia pendente.
   - **TypeScript Compiler (tsc):** Checagem estrita de tipos com zero erros de compilacao (`0 errors`).
   - **Build Vite:** Compilacao de producao concluida com sucesso gerando os bundles estaticos otimizados.
   - **Test Suite:** Suite interna rodando verde com 100% de aproveitamento.

2. **Integridade da Cadeia Operacional:**
   - Foi confirmado que a cadeia juridica vital:
     ```text
     CLIENTE  --->  PROCESSO  --->  MOVIMENTACAO  --->  SENTINELA (PUBLICACAO/PRAZO)
     ```
     permanece perfeitamente integra. A integracao do DataJud (`processos_monitorados`, `movimentacoes_processo`), a captura de comunicacoes do DJEN e o vinculo com clientes e producao estao funcionando de maneira coesa e auditavel.

3. **Inviolabilidade do Motor de Prazos (`deadlineEngine.ts`):**
   - **Confirmacao Absoluta:** O arquivo `src/services/deadlineEngine.ts` **nao foi alterado**.
   - As regras processuais civis (CPC/2015, CPP, CLT, JEF), a tabela de feriados nacionais e forenses, os memoriais de contagem e os metodos deterministas de calculo de prazos foram mantidos 100% intocados e puros.

---

### 11. RISCOS RESIDUAIS

Embora a transicao para Source of Truth tenha sido bem-sucedida, registram-se os seguintes riscos residuais mitigados:

1. **Cache Local Transitório em Navegadores Compartilhados:**
   - Se multiplos operadores utilizarem o mesmo perfil de navegador sem abas privativas ou perfis dedicados, dados em cache no `localStorage` poderao ser visualizados durante o milissegundo inicial antes da reidratacao pelo PocketBase.
   - _Mitigacao:_ O login exige credenciais individuais e o `initPocketBaseSync` sobrescreve a memoria assim que a conexao e estabelecida.
2. **Latencia na Primeira Sincronizacao em Redes Móveis Instaveis:**
   - Em conexoes 3G/4G de alta perda de pacotes, a primeira leitura de colecoes com dezenas de itens pode apresentar pequeno atraso visual.
   - _Mitigacao:_ O `MigrationStatusBanner` e o indicador de carregamento reativo sinalizam o estado da conexao com clareza.
3. **Volume de Logs de Auditoria no Servidor:**
   - A politica append-only de gravacao detalhada de auditoria gera registros continuos em `audit_logs`.
   - _Mitigacao:_ A colecao foi indexada no PocketBase e as buscas operacionais utilizam paginacao estrita.

---

### 12. PLANO DE ROLLBACK E REVERSIBILIDADE

O design da Fase 2 foi estruturado com base em operacoes totalmente reversiveis e nao-destrutivas:

1. **Reversibilidade das Migrations de Banco:**
   - As migrations `0018` e `0019` contam com rotinas completas de down-migration implementadas no segundo argumento da funcao `migrate((app) => { ... }, (app) => { ... })`.
   - Caso seja necessario desfazer alteracoes de esquema no PocketBase, os campos `legacy_id` adicionados e as regras de colecao podem ser revertidos de forma segura.
2. **Flags Idempotentes e Reset de Migracao:**
   - O adaptador fornece os metodos `legacyStorageAdapter.resetDomainMigration(domain)` e `legacyStorageAdapter.resetAllMigrations()`.
   - Se for necessario reprocessar os dados legados ou retornar a um ponto anterior de sincronizacao, a limpeza das chaves `nox_migrated_v2_*` no `localStorage` reativa a rotina de deteccao sem perda dos dados originais.
3. **Preservacao de Backups em Memoria:**
   - Como os dados legados receberam copias seguras com `legacy_id` gravado no banco, qualquer dado pode ser reexportado para formato local a qualquer momento.

---

### 13. DIVIDA TECNICA REMANESCENTE

Identificam-se os seguintes pontos de atencao para manutencao e evolucao futura:

1. **Tamanho do Arquivo `src/services/dataStore.ts`:**
   - O arquivo atualmente possui cerca de 3.365 linhas. Ele ainda agrega responsabilidades de estado geral, funcoes legadas de mock, configuracoes de advogado titular e operacoes de producao e radar.
   - Deve ser decomposto em modulos e servicos especificos (ex: `clientService.ts`, `agendaService.ts`, `productionService.ts`, `settingsService.ts`).
2. **Remocao de Fallbacks Legados Pos-Homologacao:**
   - Apos um ciclo completo de operacao estavel em producao com os usuarios reais, as chamadas residuais que salvam no `localStorage` dentro dos metodos de mutacao do `dataStore` poderao ser substituidas por uma camada pura de cache em memoria com react-query ou SWR.
3. **Residuos Locais em Dominios Secundarios:**
   - Dominios de apoio como `records` (lotes manuais de importacao de CSV antigo) e `automations` ainda contam com partes do estado local e devem ser completamente harmonizados com as colecoes correspondentes do PocketBase.

---

### 14. RECOMENDACAO PARA A FASE 3 (REFATORACAO DA CAMADA DE SERVICES)

Para a proxima etapa do projeto (Fase 3), recomenda-se o seguinte direcionamento arquitetural:

1. **Desacoplamento e Decomposicao do `dataStore.ts`:**
   - Modularizar o monólito `dataStore.ts` criando servicos autonomos orientados a dominio (`src/services/clients/`, `src/services/agenda/`, `src/services/production/`, `src/services/tasks/`), cada um responsavel por seu ciclo de chamadas ao PocketBase, tipagem e regras de validacao.
2. **Adocao de Gerenciamento de Estado Server-Driven:**
   - Migrar gradualmente o padrao de singleton customizado com listeners manuais para bibliotecas robustas de gestao de cache remoto (como TanStack Query / React Query), garantindo revalidacao em background, paginacao infinita, mutacoes otimistas e controle granular de status de rede.
3. **Limpeza Segura de Codigo Legado:**
   - Eliminar os mocks estaticos sinteticos que ainda residem em `src/data/mockData.ts` e `src/data/sentinelaData.ts`, uma vez que os dados reais do escritorio e do DJEN/DataJud ja sao provisionados via PocketBase.
4. **Preservacao Contínua:**
   - Manter de forma perene a regra de ouro do NOX: **o modulo `src/services/deadlineEngine.ts` nao deve ser contaminado** com regras de persistencia de banco, mantendo seu carater puramente computacional, deterministico e matematico para calculo de tempestividade processual.

---

_Fim do Documento - CENTRAL NOX V2 RELATORIO FASE 2._
