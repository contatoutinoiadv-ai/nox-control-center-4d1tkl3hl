# NOX Control Center & Sentinela NOX — Guia Seguro de Configuração de Ambiente

# NUNCA insira chaves de produção no repositório frontend.

Para configurar integrações externas no Skip Cloud:

1. **Skip Cloud / PocketBase:** Gerenciado automaticamente pela plataforma.
2. **PJe / DJEN Comunica API:** Cadastre o token de autenticação através do painel seguro do Skip Cloud ou adapter.
3. **Google Calendar & Outlook:** Configure os Client IDs OAuth nos respectivos portais de desenvolvedor.
4. **Anthropic / LLM Backend:** Defina secrets no backend usando variáveis de servidor, nunca no código cliente do navegador.
