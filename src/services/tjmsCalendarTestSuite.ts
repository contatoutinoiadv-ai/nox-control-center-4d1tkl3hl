/**
 * SUÍTE DE TESTES NAVEGÁVEIS: CALENDÁRIO TJMS + RETIFICAÇÃO DE PRAZOS
 *
 * Cenários validados conforme especificação da tarefa:
 * 1. Prazo que atravessa 07/09 (Feriado Nacional - Independência) suspende em todas as comarcas.
 * 2. Prazo em comarca Corumbá que atravessa 21/09 (Feriado Municipal - Fundação) = SUSPENDE.
 * 3. Prazo em comarca Campo Grande que atravessa 21/09 = NÃO SUSPENDE (dia útil em Campo Grande).
 * 4. Prazo que atravessa 08/12 em comarca que NÃO tem feriado municipal (ex.: Campo Grande) = SUSPENDE por Feriado Nacional (Dia da Justiça).
 * 5. Prazo iniciado antes de 20/12 e terminando após 31/12 = Feriado Forense Art. 268 CODJ (20 a 31/12) suspende em todas as comarcas, empurrando para o primeiro dia útil após 31/12.
 * 6. Ponto Facultativo de 07/12: NÃO suspende prazo (dia útil), devidamente registrado no calendário.
 * 7. Feriados municipais em cascata (Amambai vs Aparecida do Taboado, Bonito, Chapadão do Sul, Anaurilândia).
 */

import {
  calculateLegalDeadline,
  getHolidayOrSuspension,
  normalizeComarcaName,
} from './deadlineEngine'

export interface TjmsCalendarTestResult {
  id: string
  name: string
  status: 'PASS' | 'FAIL'
  details: string
  metrics?: Record<string, any>
}

export interface TjmsCalendarSuiteSummary {
  total: number
  passed: number
  failed: number
  timestamp: string
  results: TjmsCalendarTestResult[]
}

export class TjmsCalendarTestSuite {
  public static async runAllTests(): Promise<TjmsCalendarSuiteSummary> {
    const results: TjmsCalendarTestResult[] = []

    // TESTE 1: Prazo que atravessa 07/09 suspende em todas as comarcas (Feriado Nacional - Independência)
    try {
      // 04/09/2026 é sexta-feira. Disponibilização: 04/09/2026.
      // Primeiro dia útil: 07/09/2026 é feriado (Segunda-feira). Portanto 1º dia útil passa para 08/09/2026 (Terça).
      const calc = calculateLegalDeadline({
        originText: 'Intimação de sentença em 04/09/2026',
        initialDate: '2026-09-04',
        customDays: 5,
        customDaysType: 'uteis',
        tribunal: 'TJMS',
        comarca: 'Campo Grande',
      })

      const holidayFound = calc.holidaysApplied.some(
        (h) => h.date === '2026-09-07' && h.name.includes('Independência'),
      )

      // 04/09 (sex) disp -> 07/09 (seg) feriado -> 08/09 (ter) dia 1 -> 09/09 (qua) dia 2 -> 10/09 (qui) dia 3 -> 11/09 (sex) dia 4 -> 12-13 fim de semana -> 14/09 (seg) dia 5
      if (holidayFound && calc.finalDeadlineDate === '2026-09-14') {
        results.push({
          id: 'TEST_CAL_1',
          name: 'Prazo que atravessa 07/09 (Independência) suspende em todas as comarcas',
          status: 'PASS',
          details: `07/09 suspenso com sucesso. 1º dia em 08/09, prazo fatal calculado: ${calc.finalDeadlineDate}.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_1',
          name: 'Prazo que atravessa 07/09 (Independência) suspende em todas as comarcas',
          status: 'FAIL',
          details: `Esperado suspensão em 07/09 e final 2026-09-14, obtido: final=${calc.finalDeadlineDate}, feriado=${holidayFound}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_1',
        name: 'Prazo que atravessa 07/09 (Independência) suspende em todas as comarcas',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 2: Comarca Corumbá que atravessa 21/09 (Feriado Municipal de Fundação) = SUSPENDE
    try {
      // 21/09/2026 é Segunda-feira. Disponibilização: 18/09/2026 (Sexta).
      // Em Corumbá: 21/09 é feriado municipal (Fundação de Corumbá). Logo o 1º dia útil é 22/09/2026 (Terça).
      const calcCorumba = calculateLegalDeadline({
        originText: 'Publicação em Corumbá 18/09/2026',
        initialDate: '2026-09-18',
        customDays: 3,
        customDaysType: 'uteis',
        tribunal: 'TJMS',
        comarca: 'Corumbá',
      })

      const corumbaSuspended = calcCorumba.holidaysApplied.some(
        (h) => h.date === '2026-09-21' && h.name.includes('Corumbá'),
      )

      // 18/09 (sex) disp -> 21/09 (seg) suspenso -> 22/09 (ter) dia 1 -> 23/09 (qua) dia 2 -> 24/09 (qui) dia 3 (final)
      if (corumbaSuspended && calcCorumba.finalDeadlineDate === '2026-09-24') {
        results.push({
          id: 'TEST_CAL_2',
          name: 'Comarca Corumbá que atravessa 21/09 (Fundação) = SUSPENDE prazo',
          status: 'PASS',
          details: `Feriado municipal de Corumbá aplicado. Vencimento: ${calcCorumba.finalDeadlineDate}.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_2',
          name: 'Comarca Corumbá que atravessa 21/09 (Fundação) = SUSPENDE prazo',
          status: 'FAIL',
          details: `Corumbá não suspendeu adequadamente: final=${calcCorumba.finalDeadlineDate}, suspenso=${corumbaSuspended}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_2',
        name: 'Comarca Corumbá que atravessa 21/09 (Fundação) = SUSPENDE prazo',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 3: Comarca Campo Grande que atravessa 21/09 = NÃO SUSPENDE (dia útil em Campo Grande)
    try {
      // Em Campo Grande 21/09 é dia útil. Logo 1º dia útil é 21/09 (Segunda), dia 2 é 22/09 (Terça), dia 3 é 23/09 (Quarta).
      const calcCampoGrande = calculateLegalDeadline({
        originText: 'Publicação em Campo Grande 18/09/2026',
        initialDate: '2026-09-18',
        customDays: 3,
        customDaysType: 'uteis',
        tribunal: 'TJMS',
        comarca: 'Campo Grande',
      })

      const cgSuspended = calcCampoGrande.holidaysApplied.some((h) => h.date === '2026-09-21')

      if (!cgSuspended && calcCampoGrande.finalDeadlineDate === '2026-09-23') {
        results.push({
          id: 'TEST_CAL_3',
          name: 'Comarca Campo Grande que atravessa 21/09 = NÃO SUSPENDE (dia útil)',
          status: 'PASS',
          details: `Comarca Campo Grande sem feriado em 21/09: 21/09 contado como dia útil 1, final em ${calcCampoGrande.finalDeadlineDate}.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_3',
          name: 'Comarca Campo Grande que atravessa 21/09 = NÃO SUSPENDE (dia útil)',
          status: 'FAIL',
          details: `Campo Grande foi suspenso indevidamente ou data incorreta: final=${calcCampoGrande.finalDeadlineDate}, suspenso=${cgSuspended}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_3',
        name: 'Comarca Campo Grande que atravessa 21/09 = NÃO SUSPENDE (dia útil)',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 4: Prazo atravessando 08/12 em comarca SEM feriado municipal (ex.: Campo Grande) = SUSPENDE por Feriado Nacional (Dia da Justiça)
    try {
      // 08/12/2026 é Terça-feira. Disponibilização: 07/12/2026 (Segunda).
      // 07/12 é Ponto Facultativo (não suspende).
      // 08/12 é Feriado Nacional (Dia da Justiça) -> SUSPENDE em Campo Grande e todas as comarcas.
      // 1º dia útil: 09/12/2026 (Quarta). Prazo de 1 dia útil vence em 09/12/2026.
      const calc08Dez = calculateLegalDeadline({
        originText: 'Publicação de intimação em 07/12/2026',
        initialDate: '2026-12-07',
        customDays: 1,
        customDaysType: 'uteis',
        tribunal: 'TJMS',
        comarca: 'Campo Grande',
      })

      const diaJusticaFound = calc08Dez.holidaysApplied.some(
        (h) => h.date === '2026-12-08' && h.name.includes('Dia da Justiça'),
      )

      if (diaJusticaFound && calc08Dez.finalDeadlineDate === '2026-12-09') {
        results.push({
          id: 'TEST_CAL_4',
          name: 'Prazo atravessando 08/12 em comarca geral = SUSPENDE por Feriado Nacional (Dia da Justiça)',
          status: 'PASS',
          details: `08/12 suspenso em Campo Grande por Feriado Nacional. 1º dia útil: ${calc08Dez.finalDeadlineDate}.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_4',
          name: 'Prazo atravessando 08/12 em comarca geral = SUSPENDE por Feriado Nacional (Dia da Justiça)',
          status: 'FAIL',
          details: `08/12 não suspenso adequadamente: final=${calc08Dez.finalDeadlineDate}, feriado=${diaJusticaFound}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_4',
        name: 'Prazo atravessando 08/12 em comarca geral = SUSPENDE por Feriado Nacional (Dia da Justiça)',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 5: Ponto facultativo de 07/12: NÃO suspende prazo (dia útil)
    try {
      // getHolidayOrSuspension com onlySuspensions=true deve retornar undefined para 07/12 (dia útil)
      const suspensao0712 = getHolidayOrSuspension('2026-12-07', 'TJMS', 'Campo Grande', [], true)
      // getHolidayOrSuspension com onlySuspensions=false deve retornar o registro de "Ponto facultativo"
      const info0712 = getHolidayOrSuspension('2026-12-07', 'TJMS', 'Campo Grande', [], false)

      const isDiaUtilNoCalculo = suspensao0712 === undefined
      const isRegistradoNoCalendario =
        info0712 !== undefined && info0712.name.toLowerCase().includes('ponto facultativo')

      if (isDiaUtilNoCalculo && isRegistradoNoCalendario) {
        results.push({
          id: 'TEST_CAL_5',
          name: 'Ponto Facultativo de 07/12: NÃO suspende prazo (dia útil) e visível no calendário',
          status: 'PASS',
          details: `Confirmado: 07/12 é dia útil para contagem temporal e registrado como ponto facultativo no calendário.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_5',
          name: 'Ponto Facultativo de 07/12: NÃO suspende prazo (dia útil) e visível no calendário',
          status: 'FAIL',
          details: `Inconsistência em 07/12: diaUtil=${isDiaUtilNoCalculo}, visivel=${isRegistradoNoCalendario}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_5',
        name: 'Ponto Facultativo de 07/12: NÃO suspende prazo (dia útil) e visível no calendário',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 6: Feriado Forense 20 a 31 de dezembro (Art. 268 CODJ) suspende em todas as comarcas
    try {
      // Publicação em 18/12/2026 (Sexta).
      // 19-20/12 é fim de semana. A partir de 20/12 até 31/12 é Feriado Forense (Art. 268 CODJ).
      // 01/01/2027 é Confraternização Universal (Feriado Nacional - Sexta).
      // 02-03/01/2027 é fim de semana (Sábado e Domingo).
      // 1º dia útil após o recesso: 04/01/2027 (Segunda-feira).
      const calcRecesso = calculateLegalDeadline({
        originText: 'Intimação antes do recesso em 18/12/2026',
        initialDate: '2026-12-18',
        customDays: 1,
        customDaysType: 'uteis',
        tribunal: 'TJMS',
        comarca: 'Corumbá',
      })

      const recessoApplied = calcRecesso.holidaysApplied.some(
        (h) => h.type === 'RECESSO_FORENSE' || h.name.includes('Art. 268'),
      )

      if (recessoApplied && calcRecesso.finalDeadlineDate === '2027-01-04') {
        results.push({
          id: 'TEST_CAL_6',
          name: 'Feriado Forense 20 a 31/12 (Art. 268 CODJ) empurra prazo para 1º dia útil de janeiro',
          status: 'PASS',
          details: `Recesso forense aplicado. Prazo que caiu no recesso postergado para ${calcRecesso.finalDeadlineDate} (04/01/2027).`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_6',
          name: 'Feriado Forense 20 a 31/12 (Art. 268 CODJ) empurra prazo para 1º dia útil de janeiro',
          status: 'FAIL',
          details: `Falha no recesso forense: final=${calcRecesso.finalDeadlineDate}, recesso=${recessoApplied}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_6',
        name: 'Feriado Forense 20 a 31/12 (Art. 268 CODJ) empurra prazo para 1º dia útil de janeiro',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 7: Feriados municipais em comarcas diversas (Bonito em 02/10 vs Naviraí em 11/11)
    try {
      // Bonito em 02/10 (Aniversário da cidade)
      const hBonito = getHolidayOrSuspension('2026-10-02', 'TJMS', 'Bonito')
      const hOutra = getHolidayOrSuspension('2026-10-02', 'TJMS', 'Dourados')

      // Naviraí em 11/11 (Aniversário da cidade)
      const hNavirai = getHolidayOrSuspension('2026-11-11', 'TJMS', 'Naviraí')
      const hNaviraiOutra = getHolidayOrSuspension('2026-11-11', 'TJMS', 'Campo Grande')

      const isBonitoOk = hBonito !== undefined && hOutra === undefined
      const isNaviraiOk = hNavirai !== undefined && hNaviraiOutra === undefined

      if (isBonitoOk && isNaviraiOk) {
        results.push({
          id: 'TEST_CAL_7',
          name: 'Feriados municipais em cascata (Bonito 02/10, Naviraí 11/11) isolados com match exato',
          status: 'PASS',
          details: `Filtro exato por comarca validado sem colisão com outras circunscrições.`,
        })
      } else {
        results.push({
          id: 'TEST_CAL_7',
          name: 'Feriados municipais em cascata (Bonito 02/10, Naviraí 11/11) isolados com match exato',
          status: 'FAIL',
          details: `Match de comarca falhou: bonitoOk=${isBonitoOk}, naviraiOk=${isNaviraiOk}`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_CAL_7',
        name: 'Feriados municipais em cascata (Bonito 02/10, Naviraí 11/11) isolados com match exato',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    const passed = results.filter((r) => r.status === 'PASS').length
    return {
      total: results.length,
      passed,
      failed: results.length - passed,
      timestamp: new Date().toISOString(),
      results,
    }
  }
}
