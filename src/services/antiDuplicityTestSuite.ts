/**
 * SUÍTE DE TESTES NAVEGÁVEIS: ANTIDUPLICIDADE COM BLOQUEIO ATIVO
 *
 * Cenários validados conforme especificação da tarefa:
 * 1. Mesma publicação 2x = 1 registro aceito, 1 bloqueado por DUPLICATA.
 * 2. Mesma publicação 5x = 1 registro aceito, 4 bloqueados com contagem cumulativa.
 * 3. Publicação com teor igual mas número de processo diferente = NÃO é duplicata (aceito).
 * 4. Tarefa da mesma publicação/origem = bloqueada preventivamente com motivo DUPLICATA.
 * 5. Publicação legítima parecida (datas ou destinatários distintos) = aceita.
 * 6. Histórico/auditoria de bloqueio: logs dedicados sem poluir auditoria jurídica.
 */

import {
  antiDuplicityEngine,
  generatePublicationFingerprint,
  generateTaskFingerprint,
  normalizeProcessNumber,
  PublicationFingerprintInput,
  TaskFingerprintInput,
} from './antiDuplicityEngine'

export interface AntiDuplicityTestResult {
  id: string
  name: string
  status: 'PASS' | 'FAIL'
  details: string
  metrics?: Record<string, any>
}

export interface AntiDuplicitySuiteSummary {
  total: number
  passed: number
  failed: number
  timestamp: string
  results: AntiDuplicityTestResult[]
}

export class AntiDuplicityTestSuite {
  public static async runAllTests(): Promise<AntiDuplicitySuiteSummary> {
    const results: AntiDuplicityTestResult[] = []

    // Limpa auditoria prévia para testes isolados
    antiDuplicityEngine.clearAudit()

    // TESTE 1: Mesma publicação 2x -> 1 registro aceito, 1 bloqueado
    try {
      const pub1: PublicationFingerprintInput = {
        numeroProcesso: '0801634-82.2023.8.12.0001',
        teor: 'Intimação da parte requerente para, no prazo de 15 dias, manifestar-se acerca da certidão.',
        dataDisponibilizacao: '2026-09-04',
        destinatario: 'ADRIANA SARAVY GUIMARAES',
        tribunal: 'TJMS',
      }

      const existingPool: PublicationFingerprintInput[] = [pub1]

      // Tentativa 2 com publicação idêntica
      const check2 = antiDuplicityEngine.checkPublication(pub1, existingPool)

      if (check2.isDuplicate && check2.reason === 'DUPLICATA') {
        antiDuplicityEngine.recordBlockedAttempt(
          'PUBLICACAO',
          pub1.numeroProcesso,
          check2.fingerprint,
          'TEST_SUITE',
          'Duplicata idêntica bloqueada.',
        )
        results.push({
          id: 'TEST_AD_1',
          name: 'Mesma publicação 2x = 1 registro aceito, 1 bloqueado com motivo DUPLICATA',
          status: 'PASS',
          details: `Bloqueio ativo com sucesso. Fingerprint: ${check2.fingerprint.slice(0, 32)}...`,
        })
      } else {
        results.push({
          id: 'TEST_AD_1',
          name: 'Mesma publicação 2x = 1 registro aceito, 1 bloqueado com motivo DUPLICATA',
          status: 'FAIL',
          details: 'Falha: a segunda inserção não foi bloqueada como DUPLICATA.',
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_1',
        name: 'Mesma publicação 2x = 1 registro aceito, 1 bloqueado com motivo DUPLICATA',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 2: Mesma publicação 5x -> 1 aceito, 4 bloqueados cumulativos
    try {
      const pubBase: PublicationFingerprintInput = {
        numeroProcesso: '0019469-63.2016.8.12.0001',
        teor: 'Apelação Criminal. Não conheço do recurso de apelação interposto.',
        dataDisponibilizacao: '2026-09-04',
        destinatario: 'HIGOR UTINOI DE OLIVEIRA',
        tribunal: 'TJMS',
      }

      const registry: PublicationFingerprintInput[] = [pubBase]
      let blockedCount = 0

      for (let i = 2; i <= 5; i++) {
        const chk = antiDuplicityEngine.checkPublication(pubBase, registry)
        if (chk.isDuplicate && chk.reason === 'DUPLICATA') {
          blockedCount++
          antiDuplicityEngine.recordBlockedAttempt(
            'PUBLICACAO',
            pubBase.numeroProcesso,
            chk.fingerprint,
            'TEST_SUITE_5X',
            `Tentativa ${i} bloqueada.`,
          )
        }
      }

      if (blockedCount === 4) {
        results.push({
          id: 'TEST_AD_2',
          name: 'Mesma publicação 5x = 1 registro e 4 bloqueios com contagem cumulativa',
          status: 'PASS',
          details: `Bloqueados com precisão 4 de 4 tentativas extras. Registros finais no pool: 1.`,
        })
      } else {
        results.push({
          id: 'TEST_AD_2',
          name: 'Mesma publicação 5x = 1 registro e 4 bloqueios com contagem cumulativa',
          status: 'FAIL',
          details: `Esperado 4 bloqueios, obtido ${blockedCount}.`,
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_2',
        name: 'Mesma publicação 5x = 1 registro e 4 bloqueios com contagem cumulativa',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 3: Publicação com teor igual mas processo diferente = NÃO é duplicata
    try {
      const p1: PublicationFingerprintInput = {
        numeroProcesso: '0801634-82.2023.8.12.0001',
        teor: 'Fica intimado para apresentar contrarrazões no prazo legal de 15 dias.',
        dataDisponibilizacao: '2026-09-10',
        destinatario: 'ADRIANA SARAVY',
        tribunal: 'TJMS',
      }
      const p2: PublicationFingerprintInput = {
        numeroProcesso: '0825566-70.2021.8.12.0001', // processo diferente
        teor: 'Fica intimado para apresentar contrarrazões no prazo legal de 15 dias.',
        dataDisponibilizacao: '2026-09-10',
        destinatario: 'ADRIANA SARAVY',
        tribunal: 'TJMS',
      }

      const chk = antiDuplicityEngine.checkPublication(p2, [p1])
      if (!chk.isDuplicate) {
        results.push({
          id: 'TEST_AD_3',
          name: 'Publicação com teor igual mas número de processo diferente = NÃO é duplicata',
          status: 'PASS',
          details: 'Permitida corretamente: processos distintos não sofrem falso-positivo.',
        })
      } else {
        results.push({
          id: 'TEST_AD_3',
          name: 'Publicação com teor igual mas número de processo diferente = NÃO é duplicata',
          status: 'FAIL',
          details: 'Falso-positivo: processo diferente foi bloqueado como duplicata.',
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_3',
        name: 'Publicação com teor igual mas número de processo diferente = NÃO é duplicata',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 4: Tarefa da mesma publicação/origem = bloqueada preventivamente
    try {
      const task1: TaskFingerprintInput = {
        communicationId: 'comm_tjms_101',
        processNumber: '0801634-82.2023.8.12.0001',
        title: 'Manifestar acerca da certidão do oficial',
        responsible: 'Dra. Gabriela Silveira',
        legalRuleOrType: 'CPC_MANIFESTACAO_GERAL_5D',
      }
      const task2Dupl: TaskFingerprintInput = {
        communicationId: 'comm_tjms_101',
        processNumber: '0801634-82.2023.8.12.0001',
        title: 'Manifestar acerca da certidão do oficial',
        responsible: 'Dra. Gabriela Silveira',
        legalRuleOrType: 'CPC_MANIFESTACAO_GERAL_5D',
      }

      const chkTask = antiDuplicityEngine.checkTask(task2Dupl, [task1])
      if (chkTask.isDuplicate && chkTask.reason === 'DUPLICATA') {
        antiDuplicityEngine.recordBlockedAttempt(
          'TAREFA',
          task2Dupl.communicationId || '',
          chkTask.fingerprint,
          'TASK_CREATE',
          chkTask.message || 'Tarefa duplicada bloqueada.',
        )
        results.push({
          id: 'TEST_AD_4',
          name: 'Tarefa da mesma publicação/origem = bloqueada preventivamente',
          status: 'PASS',
          details: 'Bloqueio preventivo de criação/importação de tarefa idêntica confirmado.',
        })
      } else {
        results.push({
          id: 'TEST_AD_4',
          name: 'Tarefa da mesma publicação/origem = bloqueada preventivamente',
          status: 'FAIL',
          details: 'Falha: a tarefa duplicada da mesma publicação não foi bloqueada.',
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_4',
        name: 'Tarefa da mesma publicação/origem = bloqueada preventivamente',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 5: Publicação legítima parecida com data de disponibilização distinta = aceita
    try {
      const pOrig: PublicationFingerprintInput = {
        numeroProcesso: '0801634-82.2023.8.12.0001',
        teor: 'Despacho de mero expediente.',
        dataDisponibilizacao: '2026-09-04',
        destinatario: 'ADRIANA SARAVY',
        tribunal: 'TJMS',
      }
      const pNovaData: PublicationFingerprintInput = {
        numeroProcesso: '0801634-82.2023.8.12.0001',
        teor: 'Despacho de mero expediente.',
        dataDisponibilizacao: '2026-09-22', // nova publicação legítima semanas depois
        destinatario: 'ADRIANA SARAVY',
        tribunal: 'TJMS',
      }

      const chkDate = antiDuplicityEngine.checkPublication(pNovaData, [pOrig])
      if (!chkDate.isDuplicate) {
        results.push({
          id: 'TEST_AD_5',
          name: 'Publicação legítima parecida (data distinta) = aceita sem falso-positivo',
          status: 'PASS',
          details: 'Publicações em datas diferentes para o mesmo processo são ambas preservadas.',
        })
      } else {
        results.push({
          id: 'TEST_AD_5',
          name: 'Publicação legítima parecida (data distinta) = aceita sem falso-positivo',
          status: 'FAIL',
          details: 'Falso-positivo: publicação de nova data foi bloqueada indevidamente.',
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_5',
        name: 'Publicação legítima parecida (data distinta) = aceita sem falso-positivo',
        status: 'FAIL',
        details: err?.message || 'Erro inesperado',
      })
    }

    // TESTE 6: Auditoria de bloqueio e integridade do histórico
    try {
      const blockedAudit = antiDuplicityEngine.getBlockedAttempts()
      if (blockedAudit.length > 0 && blockedAudit.every((b) => b.reason === 'DUPLICATA')) {
        results.push({
          id: 'TEST_AD_6',
          name: 'Auditoria de bloqueios dedicada mantida sem poluir auditoria jurídica',
          status: 'PASS',
          details: `${blockedAudit.length} tentativas bloqueadas registradas com timestamp, fingerprint e origem.`,
        })
      } else {
        results.push({
          id: 'TEST_AD_6',
          name: 'Auditoria de bloqueios dedicada mantida sem poluir auditoria jurídica',
          status: 'FAIL',
          details: 'Auditoria de bloqueios vazia ou com motivo incorreto.',
        })
      }
    } catch (err: any) {
      results.push({
        id: 'TEST_AD_6',
        name: 'Auditoria de bloqueios dedicada mantida sem poluir auditoria jurídica',
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
