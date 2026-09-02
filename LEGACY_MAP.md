# LEGACY_MAP.md — Inventário e Scaffold de Migração Sentinela NOX

> **Status:** SCAFFOLD PREVENTIVO / MAPA INICIAL DE CAPACIDADES
>
> **Aviso Importante:** O arquivo de referência `centraln.html` mencionado pelo solicitante **não se encontra presente no projeto** (não foi anexado no repositório). Portanto, este documento atua como um inventário estruturado e contrato de acoplamento para mapear cada função quando o arquivo real for fornecido, sem inventar trechos de código não fornecidos.

---

## 1. Tabela de Mapeamento de Capacidades (Sentinela Legado → NOX Control Center)

| ID do Módulo | Função Legada Referenciada                 | Novo Módulo / Domínio NOX                                   | Status de Implementação                                 | Contrato / Adapter Ativo                            | Teste / Cobertura              |
| ------------ | ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| **LEG-01**   | Ingestão e Leitura de Publicações DJEN     | `src/types/sentinela.ts` & `src/services/adapters.ts`       | Concluído (Adapter Mock/Gateway)                        | `SafePjeComunicaAdapter` (`comunicaapi.pje.jus.br`) | Teste de Sanitização e Hash    |
| **LEG-02**   | Proteção de Ingestão e Validação           | `src/services/adapters.ts`                                  | Concluído                                               | `sanitizeExternalText` (Anti-Prompt-Injection)      | 8 Regras de Sanitização        |
| **LEG-03**   | Triagem e Deduplicação                     | `src/pages/SentinelaPage.tsx`                               | Concluído                                               | Triage Flow (`CAPTURADA` → `CONCLUIDA`)             | Deduplicação por SHA-256       |
| **LEG-04**   | Motor de Cálculo de Prazos                 | `src/services/deadlineEngine.ts`                            | Concluído                                               | `calculateLegalDeadline` (Memorial Explicável)      | CPC/CLT/CPP + Feriados 2025-27 |
| **LEG-05**   | Simulador Temporal ("E Se?")               | `src/components/DeadlineCalculatorView.tsx`                 | Concluído                                               | Isolamento de cenário sem corrupção                 | Teste de Variação de Marco     |
| **LEG-06**   | Agenda Operacional e Audiências            | `src/components/AgendaView.tsx`                             | Concluído                                               | `SafeCalendarAdapter` (Exportação .ICS)             | RFC-5545 VCalendar             |
| **LEG-07**   | Gestão de Tarefas e Checklists             | `src/components/TasksView.tsx`                              | Concluído                                               | Kanban, Lista e Minha Fila                          | Sincronização com Prazos       |
| **LEG-08**   | Cadeia de Custódia Imutável                | `src/components/CustodyChainTimeline.tsx`                   | Concluído                                               | Trilha com Snapshot, Hash e Atores                  | Exportação de Certidão JSON    |
| **LEG-09**   | Gêmeo Operacional do Escritório            | `src/data/sentinelaData.ts` & `src/pages/SentinelaPage.tsx` | Concluído                                               | Matriz de Carga de Trabalho                         | Alerta de Sobrecarga (>100%)   |
| **LEG-10**   | Briefing Diário e Lacunas                  | `src/data/sentinelaData.ts` & `src/services/dataStore.ts`   | Concluído                                               | `DailyBriefingData` + `Detector de Lacunas`         | 3 Lacunas Monitoradas          |
| **LEG-11**   | Modo Incidente / Sala de Crise             | `src/data/sentinelaData.ts` & `src/pages/SentinelaPage.tsx` | Concluído                                               | `IncidentCrisisRoom` (Contingência)                 | Certidões de Indisponibilidade |
| **LEG-12**   | Automações e Orquestrador                  | `src/types/sentinela.ts` & `src/data/sentinelaData.ts`      | Concluído                                               | Padrão QUANDO/SE/ENTÃO com Aprovação                | 5 Regras Pré-configuradas      |
| **LEG-13**   | Saúde de Conexões e APIs                   | `src/data/sentinelaData.ts` & `src/pages/SentinelaPage.tsx` | Concluído                                               | Monitoramento de latência e filas                   | 5 Endpoints PJe/DJEN           |
| **LEG-14**   | Mapeamento HTML Original (`centraln.html`) | `LEGACY_MAP.md`                                             | **Pendente (Aguardando anexo do arquivo pelo usuário)** | Scaffold preparado                                  | -                              |

---

## 2. Instruções para Preenchimento quando `centraln.html` for fornecido

1. Copie o arquivo `centraln.html` para a raiz do projeto ou diretório `legacy/`.
2. Não execute o HTML diretamente no navegador por questões de isolamento e segurança.
3. Extraia as rotas, formulários e regras específicas contidas no script do legado.
4. Preencha as linhas correspondentes nesta tabela `LEGACY_MAP.md` atualizando os campos com o seletor/função original.
5. Conecte os seletores identificados aos adapters criados em `src/services/adapters.ts`.
