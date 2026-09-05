# CENTRAL NOX V2 - FASE 8: MAPA DE DESCOBERTA DA EVOLUTION API

## 1. Objetivo e Filosofia

A integração da Central NOX V2 com a Evolution API adota o princípio de descoberta automatizada e tolerante a versões. Em vez de acoplar o sistema a suposições rígidas de versões hipotéticas da Evolution API (v1.x, v2.x, Baileys), a NOX opera de forma **passiva e inerte** até que os segredos reais sejam cadastrados.

Assim que os 4 segredos existirem nas variáveis de ambiente do backend PocketBase (Skip Cloud):

1. `EVOLUTION_API_URL`
2. `EVOLUTION_API_KEY`
3. `EVOLUTION_INSTANCE_NAME` (valor fixo e imutável: `HUA-ATENDIMENTO`)
4. `EVOLUTION_WEBHOOK_SECRET`

A rotina de descoberta automática entra em ação na primeira consulta de health check ou via acionamento manual do hook `/api/integrations/evolution/discover`.

---

## 2. Estrutura do Mapa de Descoberta (Coleção `nox_integration_discovery`)

O resultado da descoberta é persistido na coleção `nox_integration_discovery` com os seguintes campos:

| Campo                   | Tipo   | Descrição                         | Valores Possíveis                                                      |
| :---------------------- | :----- | :-------------------------------- | :--------------------------------------------------------------------- |
| `provider`              | text   | Identificador do provedor         | `EVOLUTION`                                                            |
| `status`                | select | Estado da descoberta              | `PENDING`, `NOT_CONFIGURED`, `DISCOVERED`, `FAILED`                    |
| `detected_version`      | text   | Versão retornada pela rota raiz   | Ex: `2.1.2`, `v2.2.0`, `UNKNOWN`                                       |
| `instance_name`         | text   | Nome da instância alvo auditada   | `HUA-ATENDIMENTO`                                                      |
| `instance_state`        | text   | Estado de conexão da instância    | `CONNECTED` (open), `CONNECTING`, `DISCONNECTED` (close)               |
| `endpoints_confirmed`   | json   | Mapa de rotas testadas e status   | `{ "GET /": "HTTP_200", "GET /instance/connectionState": "HTTP_200" }` |
| `events_available`      | json   | Lista de eventos suportados       | `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`              |
| `webhook_format`        | json   | Formato de autenticação aceito    | `{ authHeader: "apikey", secretHeader: "x-webhook-secret" }`           |
| `auth_mode`             | text   | Modo de cabeçalho de autenticação | `API_KEY_HEADER`                                                       |
| `raw_summary_sanitized` | json   | Resumo técnico auditável          | Dados estruturais sem credenciais                                      |
| `error_message`         | text   | Detalhes de eventual falha        | Mensagem de erro truncada em caso de falha de rede                     |
| `executed_at`           | text   | Timestamp ISO da descoberta       | Ex: `2026-09-02T14:30:00.000Z`                                         |

---

## 3. Endpoints Auditados na Descoberta (Somente-Leitura Estrita)

Para respeitar a regra absoluta de infraestrutura ("NÃO reinstalar Evolution, NÃO recriar instância, NÃO alterar banco"), a rotina de descoberta executa **exclusivamente requisições HTTP GET de diagnóstico**:

1. **GET `/`**
   - Objetivo: aferir se o serviço está respondendo e capturar os metadados de versão/build do servidor.
2. **GET `/instance/connectionState/{instanceName}`**
   - Objetivo: aferir o estado atual da sessão WhatsApp sem interferir no Baileys.
   - Resposta esperada: `{ "instance": { "state": "open" } }` ou `{ "state": "open" }`.
3. **GET `/instance/fetchInstances`**
   - Objetivo: confirmar a presença da instância `HUA-ATENDIMENTO` na lista de instâncias cadastradas.

Rotas proibidas na descoberta:

- `POST /instance/create` (PROIBIDO)
- `DELETE /instance/delete` (PROIBIDO)
- `DELETE /instance/logout` (PROIBIDO)
- `PUT /instance/restart` (PROIBIDO)

---

## 4. Instrução Operacional: Como Ler o Resultado pós-Cadastro dos Segredos

Após o usuário cadastrar os 4 segredos no painel Skip Cloud:

1. Acesse o NOX Control Center na página de **Central de Atendimento**.
2. O indicador no topo transitará automaticamente de `WHATSAPP NÃO CONFIGURADO` para:
   - `WHATSAPP CONECTADO` (se a sessão já estiver pareada e ativa no celular do escritório).
   - `WHATSAPP CONECTANDO...` (se a sessão estiver em processo de reconexão do Baileys).
   - `WHATSAPP DESCONECTADO` (se a sessão precisar de reautenticação manual fora do NOX).
3. Para inspecionar os detalhes brutos da descoberta:
   - Consulte os registros da coleção `nox_integration_discovery` via console do PocketBase ou via endpoint `GET /api/integrations/evolution/health`.
   - O campo `detected_version` trará a versão real reportada pelo container.
   - O campo `endpoints_confirmed` confirmará a disponibilidade de cada rota de transporte.
