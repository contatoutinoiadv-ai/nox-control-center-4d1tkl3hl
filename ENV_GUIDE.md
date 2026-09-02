# NOX Control Center & Sentinela NOX — Guia Seguro de Configuração de Ambiente

> **POLÍTICA DE SEGURANÇA E ZERO VAZAMENTO:**  
> NUNCA insira chaves de produção, senhas ou tokens de API no repositório de código-fonte frontend ou nos logs. Todas as chaves e segredos de IA/serviços de tribunais devem ser gerenciados estritamente através das variáveis de ambiente e segredos de backend (Skip Cloud / PocketBase / pb_hooks).

---

## 1. Visão Geral das Variáveis de Ambiente Necessárias

Para operar o NOX Control Center em ambiente completo de produção com todas as integrações de tribunais, inteligência jurídica e calendários sincronizados, configure as seguintes variáveis no painel seguro:

| Variável                        | Descrição / Finalidade                                                                    | Onde Configurar               | Exemplo de Formato                      |
| :------------------------------ | :---------------------------------------------------------------------------------------- | :---------------------------- | :-------------------------------------- |
| `POCKETBASE_URL`                | URL base do backend PocketBase / Skip Cloud                                               | Frontend & Backend            | `https://api.meuescritorio.skip.cloud`  |
| `PJE_COMUNICA_API_URL`          | Endpoint da API do Diário de Justiça Eletrônico Nacional (CNJ)                            | Backend pb_hooks              | `https://comunicaapi.pje.jus.br/api/v1` |
| `PJE_API_TOKEN`                 | Token de autenticação da aplicação junto ao CNJ/PJe (se aplicável)                        | Backend Secret                | `Bearer eyJhbGciOi...`                  |
| `ANTHROPIC_API_KEY`             | Chave de API Anthropic (Claude 3.5 Sonnet / Claude 3 Opus) para Oráculo NOX e Petições IA | Backend Secret (`$os.getenv`) | `sk-ant-api03-...`                      |
| `GEMINI_API_KEY`                | Chave de API Google Gemini (2.5 Flash / Pro) para triagem rápida                          | Backend Secret (`$os.getenv`) | `AIzaSy...`                             |
| `GOOGLE_CALENDAR_CLIENT_ID`     | Client ID OAuth 2.0 para sincronização da Agenda Google                                   | Backend Secret / OAuth        | `xxxx.apps.googleusercontent.com`       |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Client Secret OAuth 2.0 para sincronização da Agenda Google                               | Backend Secret                | `GOCSPX-...`                            |
| `MICROSOFT_GRAPH_CLIENT_ID`     | Client ID Azure AD / Microsoft Graph para Outlook Calendar                                | Backend Secret / OAuth        | `00000000-0000-0000-0000-000000000000`  |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | Segredo do aplicativo no Azure AD para Outlook                                            | Backend Secret                | `~xxxxxxxxxxxxxxxxxxxx`                 |
| `NOX_AUDIT_SIGNING_SALT`        | Salt de segurança para assinatura e certificação da cadeia de custódia SHA-256            | Backend Secret                | `string_aleatoria_forte_64chars`        |

---

## 2. Instruções de Configuração no Skip Cloud / PocketBase

1. **Configuração de Segredos:**
   - Acesse o Dashboard do Skip Cloud da sua aplicação.
   - Navegue até **Settings** → **Secrets & Environment Variables**.
   - Adicione cada variável acima com seu respectivo valor confidencial.
   - O backend lê essas variáveis dinamicamente nos `pb_hooks` utilizando `$os.getenv('NOME_DA_VARIAVEL')`.

2. **Como o Frontend Consome os Serviços:**
   - O frontend React **NUNCA** faz chamadas diretas a `https://api.anthropic.com` ou `https://api.openai.com` com chaves expostas no cabeçalho.
   - O frontend dispara requisições para a rota de proxy segura do Skip Cloud (`/backend/v1/pje-proxy` ou endpoints autenticados de IA), que injeta os segredos de forma protegida e devolve o resultado sanitizado.

3. **Fallback e Modo Demonstração Seguro:**
   - Quando as chaves não estão configuradas ou em ambiente local de desenvolvimento, o sistema opera de modo transparente com o dataset sintético auditável e os adapters determinísticos (`SafePjeComunicaAdapter` e `SafeCalendarAdapter`), garantindo 100% de usabilidade sem dependência de credenciais externas.
