# NOX Control Center & Sentinela NOX — Guia Seguro de Configuração de Ambiente

> **POLÍTICA DE SEGURANÇA E ZERO VAZAMENTO:**  
> NUNCA insira chaves de produção, senhas ou tokens de API no repositório de código-fonte frontend ou nos logs. Todas as chaves e segredos de IA/serviços de tribunais devem ser gerenciados estritamente através das variáveis de ambiente e segredos de backend (Skip Cloud / PocketBase / pb_hooks).

---

## 1. Visão Geral das Variáveis de Ambiente Necessárias

Para operar o NOX Control Center em ambiente completo de produção com todas as integrações de tribunais, inteligência jurídica e calendários sincronizados, configure as seguintes variáveis no painel seguro:

| Variável                        | Descrição / Finalidade                                                         | Onde Configurar               | Exemplo de Formato                      |
| :------------------------------ | :----------------------------------------------------------------------------- | :---------------------------- | :-------------------------------------- |
| `POCKETBASE_URL`                | URL base do backend PocketBase / Skip Cloud                                    | Frontend & Backend            | `https://api.meuescritorio.skip.cloud`  |
| `PJE_COMUNICA_API_URL`          | Endpoint da API do Diário de Justiça Eletrônico Nacional (CNJ)                 | Backend pb_hooks              | `https://comunicaapi.pje.jus.br/api/v1` |
| `PJE_API_TOKEN`                 | Token de autenticação da aplicação junto ao CNJ/PJe (se aplicável)             | Backend Secret                | `Bearer eyJhbGciOi...`                  |
| `SKIP_AI_GATEWAY_URL`           | Gateway nativo Skip Cloud para roteamento dos modelos Google Gemini            | Backend Secret (`$os.getenv`) | Automático via Skip Cloud               |
| `SKIP_AI_GATEWAY_API_KEY`       | Chave de autenticação do Skip AI Gateway (injetada server-side nos hooks)      | Backend Secret (`$os.getenv`) | Automático via Skip Cloud               |
| `GOOGLE_CALENDAR_CLIENT_ID`     | Client ID OAuth 2.0 para sincronização da Agenda Google                        | Backend Secret / OAuth        | `xxxx.apps.googleusercontent.com`       |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Client Secret OAuth 2.0 para sincronização da Agenda Google                    | Backend Secret                | `GOCSPX-...`                            |
| `MICROSOFT_GRAPH_CLIENT_ID`     | Client ID Azure AD / Microsoft Graph para Outlook Calendar                     | Backend Secret / OAuth        | `00000000-0000-0000-0000-000000000000`  |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | Segredo do aplicativo no Azure AD para Outlook                                 | Backend Secret                | `~xxxxxxxxxxxxxxxxxxxx`                 |
| `NOX_AUDIT_SIGNING_SALT`        | Salt de segurança para assinatura e certificação da cadeia de custódia SHA-256 | Backend Secret                | `string_aleatoria_forte_64chars`        |

---

## 2. Instruções de Configuração no Skip Cloud / PocketBase

1. **Configuração de Segredos:**
   - Acesse o Dashboard do Skip Cloud da sua aplicação.
   - Navegue até **Settings** → **Secrets & Environment Variables**.
   - Adicione cada variável acima com seu respectivo valor confidencial.
   - O backend lê essas variáveis dinamicamente nos `pb_hooks` utilizando `$os.getenv('NOME_DA_VARIAVEL')`.

2. **Como o Frontend Consome os Serviços de IA (Google Gemini):**
   - O frontend React **NUNCA** faz chamadas diretas a `generativelanguage.googleapis.com` ou provedores externos com chaves expostas no navegador.
   - **NÃO é necessário `GEMINI_API_KEY` no navegador ou no bundle frontend.**
   - O frontend dispara requisições POST autenticadas para o endpoint `/backend/v1/ai/oraculo` do Skip Cloud (`pocketbase/hooks/ai_oraculo.js`).
   - O backend pb_hooks gerencia o modelo **Google Gemini** através do Skip AI Gateway (`SKIP_AI_GATEWAY_URL` + `SKIP_AI_GATEWAY_API_KEY`), aplicando sanitização server-side anti-prompt injection e system prompt jurídico estrito.

3. **Fallback e Modo de Contingência Local:**
   - Se o backend ou o gateway de IA estiverem temporariamente inacessíveis, sem rede ou com credenciais pendentes, o sistema ativa imediatamente o **Modo Local de Contingência** (`aiOraculoService.ts`), sem travar a interface.
   - O selo no cabeçalho do chat exibe `"GEMINI ATIVO"` quando conectado e `"GEMINI INDISPONÍVEL — MODO LOCAL"` no fallback, garantindo transparência operacional aos operadores.
   - Toda resposta gerada (seja por IA ou local) carrega a identificação da fonte, nível de confiança e o aviso mandatório: _"Revisão humana obrigatória por advogado responsável."_
