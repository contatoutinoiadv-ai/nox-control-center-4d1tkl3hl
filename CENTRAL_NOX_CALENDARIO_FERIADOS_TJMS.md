# CENTRAL NOX — CALENDÁRIO FORENSE TJMS & RETIFICAÇÃO DE MOTOR DE PRAZOS

## 1. Origem dos Dados e Fundamento Legal

- **Fonte Oficial:** Calendário Forense Oficial do Tribunal de Justiça de Mato Grosso do Sul (TJMS).
- **Legislação Aplicada:** Artigo 268 do Código de Organização e Divisão Judiciárias do Estado de Mato Grosso do Sul (CODJ), Artigos 219, 220 e 224 do Código de Processo Civil (CPC/2015), e Artigo 62 da Lei Federal 5.010/1966.
- **Natureza:** Recorrente e anual (aplicável de forma perene a todos os anos do sistema).

---

## 2. Tabela Canônica de Feriados e Suspensões TJMS

### SETEMBRO

- **07/09:** Feriado Nacional (Independência do Brasil) — Suspende em TODAS as comarcas.
- **21/09:** Feriado Municipal em **Corumbá** (Fundação do Município) — Suspende apenas na Comarca de Corumbá.
- **28/09:** Feriado Municipal em **Amambai** (Emancipação do município) e **Aparecida do Taboado** (Aniversário da cidade) — Suspende apenas nessas comarcas.
- **29/09:** Feriado Municipal em **São Gabriel do Oeste** (Arcanjo São Gabriel - Padroeiro da cidade) e **Deodápolis** (Homenagem ao Fundador do Município) — Suspende apenas nessas comarcas.
- **30/09:** Feriado Municipal em **Camapuã** (Aniversário da cidade) — Suspende apenas na Comarca de Camapuã.

### OUTUBRO

- **02/10:** Feriado Municipal em **Bonito** (Aniversário da cidade) — Suspende apenas na Comarca de Bonito.
- **07/10:** Feriado Municipal em **Dois Irmãos do Buriti** (Padroeira da Cidade) — Suspende apenas na Comarca de Dois Irmãos do Buriti.
- **08/10:** Feriado Municipal em **Anaurilândia** (São João Calábria) — Suspende apenas na Comarca de Anaurilândia.
- **12/10:** Feriado Nacional (Nossa Senhora Aparecida) — Suspende em TODAS as comarcas.
- **23/10:** Feriado Municipal em **Chapadão do Sul** (Aniversário da cidade) — Suspende apenas na Comarca de Chapadão do Sul.
- **27/10:** Feriado Municipal em **Nova Alvorada do Sul** (Aniversário da cidade) — Suspende apenas na Comarca de Nova Alvorada do Sul.
- **30/10:** Feriado Regimental TJMS (Dia do Servidor Público) — Suspende em TODAS as comarcas.

### NOVEMBRO

- **02/11:** Feriado Nacional (Finados) — Suspende em TODAS as comarcas.
- **11/11:** Feriado Municipal em **Anaurilândia**, **Ivinhema**, **Naviraí** e **Pedro Gomes** (Aniversário da cidade) — Suspende apenas nessas comarcas.
- **12/11:** Feriado Municipal em **Batayporã** (Aniversário da cidade) — Suspende apenas na Comarca de Batayporã.
- **13/11:** Feriado Municipal em **Dois Irmãos do Buriti** (Emancipação da Cidade) — Suspende apenas na Comarca de Dois Irmãos do Buriti.
- **15/11:** Feriado Nacional (Proclamação da República) — Suspende em TODAS as comarcas.
- **20/11:** Feriado Nacional (Dia Nacional de Zumbi e da Consciência Negra) — Suspende em TODAS as comarcas.
- **27/11:** Feriado Municipal em **Mundo Novo** (Padroeira do Município - Nossa Senhora das Graças) — Suspende apenas na Comarca de Mundo Novo.

### DEZEMBRO

- **07/12:** **Ponto Facultativo em todas as Comarcas** — **NÃO suspende prazos (dia útil para contagem temporal)**, ficando registrado com destaque informativo no calendário.
- **08/12:** **Feriado Nacional (Dia da Justiça)** c/c Feriado Municipal em **Aquidauana, Dourados, Iguatemi, Miranda, Porto Murtinho (Nossa Senhora do Cacupê), Rio Brilhante, Ribas do Rio Pardo, Sete Quedas e Coronel Sapucaia (Nossa Senhora da Conceição)** — **Suspende prazo em TODAS as comarcas** devido à força do Feriado Nacional / Forense do Dia da Justiça (Art. 62, I, Lei 5.010/66).
- **10/12:** Feriado Municipal em **Itaporã** (Aniversário da cidade) — Suspende apenas na Comarca de Itaporã.
- **11/12:** Feriado Municipal em **Bataguassu** e **Sidrolândia** (Aniversário da cidade) — Suspende apenas nessas comarcas.
- **15/12:** Feriado Municipal em **Coronel Sapucaia** (Aniversário da cidade) — Suspende apenas na Comarca de Coronel Sapucaia.
- **16/12:** Feriado Municipal em **Rio Verde de Mato Grosso** (Aniversário da cidade) — Suspende apenas na Comarca de Rio Verde de Mato Grosso.
- **20 a 31/12:** **Feriado Forense de 20 a 31 de Dezembro (Art. 268, CODJ)** — **Suspende prazos em todas as comarcas**. Prazos que recaírem nesse período são automaticamente empurrados para o primeiro dia útil de janeiro subsequente (observados finais de semana e feriado de 01/01 Confraternização Universal).

---

## 3. Regras de Cálculo Processual Implementadas (`deadlineEngine.ts`)

1. **Correspondência Exata de Comarca:**
   - A função `normalizeComarcaName()` elimina prefixos como "Comarca de", pontuação e diacríticos.
   - Não há correspondência por dígitos parciais ou sufixos ambíguos. A suspensão municipal só é concedida se a comarca do processo corresponder à circunscrição legalmente prevista.
2. **Exclusão do Ponto Facultativo da Suspensão:**
   - O dia 07/12 permanece computado como dia útil regular, protegendo o operador jurídico contra perda prematura de prazo.
3. **Memorial Passo a Passo Auditável:**
   - O cálculo retorna a cadeia completa das etapas, explicitando cada dia suspenso por feriado nacional, municipal ou recesso forense do Art. 268 do CODJ.

---

## 4. Suíte de Testes Navegável

Disponível em `/configuracoes` sob a ação **"Bateria Calendário TJMS"** (`TjmsCalendarTestSuite`):

- `TEST_CAL_1`: Prazo atravessando 07/09 (Independência) suspende em todas as comarcas.
- `TEST_CAL_2`: Comarca Corumbá atravessando 21/09 (Fundação) = SUSPENDE prazo processual.
- `TEST_CAL_3`: Comarca Campo Grande atravessando 21/09 = NÃO SUSPENDE (dia útil em Campo Grande).
- `TEST_CAL_4`: Prazo atravessando 08/12 em Campo Grande = SUSPENDE por Feriado Nacional do Dia da Justiça.
- `TEST_CAL_5`: Ponto facultativo de 07/12 não suspende contagem (dia útil) e é visível no calendário.
- `TEST_CAL_6`: Recesso Forense 20 a 31/12 (Art. 268 CODJ) posterga o termo final para o primeiro dia útil de janeiro (04/01/2027).
- `TEST_CAL_7`: Feriados municipais em cascata (Bonito 02/10 vs Naviraí 11/11) com isolamento estrito de circunscrição.
