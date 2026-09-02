import {
  NoxRecord,
  ImportBatch,
  AuditLogEntry,
  NoxSystemStats,
  NoxClient,
  ClientGeneratedDoc,
  ClientStage,
  ProductionItem,
  ProductionStage,
  ProductionNivel,
  TriagemEvidenciasCamadas,
  StressTestValidation,
} from '@/types/nox'
import { classificarNivelProducao } from '@/services/complexityService'
import { generateFullSyntheticDataset, INITIAL_BATCH, INITIAL_AUDIT_LOGS } from '@/data/mockData'
import {
  SentinelaCommunication,
  SentinelaTask,
  AgendaEvent,
  AutomationRule,
  SentinelaApiHealth,
  DecisionMemoryItem,
  IncidentCrisisRoom,
  OperationalTwinCapacity,
  GapItem,
  DailyBriefingData,
  RecoveredTimeMetric,
  DeadlineMemorial,
} from '@/types/sentinela'
import {
  INITIAL_SENTINELA_COMMUNICATIONS,
  INITIAL_SENTINELA_TASKS,
  INITIAL_AGENDA_EVENTS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_API_HEALTH,
  INITIAL_OPERATIONAL_TWIN,
  INITIAL_GAPS,
  INITIAL_DECISION_MEMORY,
  INITIAL_INCIDENT_ROOMS,
} from '@/data/sentinelaData'

const STORAGE_KEYS = {
  RECORDS: 'nox_control_center_records_v1',
  IMPORTS: 'nox_control_center_imports_v1',
  AUDIT_LOGS: 'nox_control_center_audit_logs_v1',
  SETTINGS: 'nox_control_center_settings_v1',
  COMMUNICATIONS: 'nox_sentinela_communications_v1',
  TASKS: 'nox_sentinela_tasks_v1',
  AGENDA: 'nox_sentinela_agenda_v1',
  AUTOMATIONS: 'nox_sentinela_automations_v1',
  API_HEALTH: 'nox_sentinela_api_health_v1',
  INCIDENTS: 'nox_sentinela_incidents_v1',
  DECISION_MEMORY: 'nox_sentinela_decision_memory_v1',
  CLIENTS: 'nox_control_center_clients_v1',
  PRODUCTION: 'nox_control_center_production_v1',
}

export interface AppSettings {
  demoMode: boolean
  reducedMotionPreference: boolean
  autoRefreshRadar: boolean
  refreshIntervalSeconds: number
  lexTempusFeatureFlag: boolean
  strictCnjValidation: boolean
  defaultResponsible: string
  lawyerName: string
  lawyerOab: string
  lawyerUf: string
  lawyerEmail: string
  lawyerPhone: string
  officeName: string
}

const DEFAULT_SETTINGS: AppSettings = {
  demoMode: false,
  reducedMotionPreference: false,
  autoRefreshRadar: true,
  refreshIntervalSeconds: 15,
  lexTempusFeatureFlag: false,
  strictCnjValidation: true,
  defaultResponsible: 'Higor Utinoi de Oliveira',
  lawyerName: 'Higor Utinoi de Oliveira',
  lawyerOab: 'OAB/MS 15.400',
  lawyerUf: 'MS',
  lawyerEmail: 'contato@utinoiadvocacia.com.br',
  lawyerPhone: '(67) 3000-0000',
  officeName: 'Higor Utinói Advocacia',
}

export class NoxDataStore {
  private static instance: NoxDataStore
  private records: NoxRecord[] = []
  private imports: ImportBatch[] = []
  private auditLogs: AuditLogEntry[] = []
  private communications: SentinelaCommunication[] = []
  private tasks: SentinelaTask[] = []
  private agendaEvents: AgendaEvent[] = []
  private automations: AutomationRule[] = []
  private apiHealth: SentinelaApiHealth[] = []
  private incidents: IncidentCrisisRoom[] = []
  private decisionMemory: DecisionMemoryItem[] = []
  private clients: NoxClient[] = []
  private productionItems: ProductionItem[] = []
  private settings: AppSettings = DEFAULT_SETTINGS
  private listeners: Set<() => void> = new Set()

  private constructor() {
    this.init()
  }

  public static getInstance(): NoxDataStore {
    if (!NoxDataStore.instance) {
      NoxDataStore.instance = new NoxDataStore()
    }
    return NoxDataStore.instance
  }

  private init() {
    // Purge legacy demo artifacts from localStorage if version marker is not clean
    try {
      const isCleaned = localStorage.getItem('nox_zero_clean_v2')
      if (!isCleaned) {
        localStorage.removeItem(STORAGE_KEYS.RECORDS)
        localStorage.removeItem(STORAGE_KEYS.IMPORTS)
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
        localStorage.removeItem(STORAGE_KEYS.COMMUNICATIONS)
        localStorage.removeItem(STORAGE_KEYS.TASKS)
        localStorage.removeItem(STORAGE_KEYS.AGENDA)
        localStorage.removeItem(STORAGE_KEYS.INCIDENTS)
        localStorage.removeItem(STORAGE_KEYS.DECISION_MEMORY)
        localStorage.setItem('nox_zero_clean_v2', 'true')
      }

      const storedRecs = localStorage.getItem(STORAGE_KEYS.RECORDS)
      this.records = storedRecs ? JSON.parse(storedRecs) : []

      const storedImports = localStorage.getItem(STORAGE_KEYS.IMPORTS)
      this.imports = storedImports ? JSON.parse(storedImports) : []

      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : []

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      }

      const storedComms = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS)
      this.communications = storedComms ? JSON.parse(storedComms) : []

      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS)
      this.tasks = storedTasks ? JSON.parse(storedTasks) : []

      const storedAgenda = localStorage.getItem(STORAGE_KEYS.AGENDA)
      this.agendaEvents = storedAgenda ? JSON.parse(storedAgenda) : []

      const storedAutos = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS)
      this.automations = storedAutos ? JSON.parse(storedAutos) : [...INITIAL_AUTOMATION_RULES]

      const storedHealth = localStorage.getItem(STORAGE_KEYS.API_HEALTH)
      this.apiHealth = storedHealth ? JSON.parse(storedHealth) : [...INITIAL_API_HEALTH]

      const storedIncidents = localStorage.getItem(STORAGE_KEYS.INCIDENTS)
      this.incidents = storedIncidents ? JSON.parse(storedIncidents) : []

      const storedMemory = localStorage.getItem(STORAGE_KEYS.DECISION_MEMORY)
      this.decisionMemory = storedMemory ? JSON.parse(storedMemory) : []

      const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS)
      if (storedClients) {
        this.clients = JSON.parse(storedClients)
      } else {
        this.clients = this.generateInitialClients()
      }

      const storedProd = localStorage.getItem(STORAGE_KEYS.PRODUCTION)
      if (storedProd) {
        this.productionItems = JSON.parse(storedProd)
      } else {
        this.productionItems = this.generateInitialProductionItems(this.clients)
      }
    } catch {
      this.records = []
      this.imports = []
      this.auditLogs = []
      this.communications = []
      this.tasks = []
      this.agendaEvents = []
      this.automations = [...INITIAL_AUTOMATION_RULES]
      this.apiHealth = [...INITIAL_API_HEALTH]
      this.incidents = []
      this.decisionMemory = []
      this.clients = this.generateInitialClients()
      this.productionItems = this.generateInitialProductionItems(this.clients)
      this.settings = DEFAULT_SETTINGS
    }

    // Inicializar sincronização com PocketBase
    this.initPocketBaseSync()
  }

  public async initPocketBaseSync(): Promise<void> {
    try {
      const pb = (await import('@/lib/pocketbase/client')).default

      // 1. Carregar clientes do PocketBase
      try {
        const pbClients = await pb.collection('clients').getFullList({
          sort: '-created',
        })
        if (pbClients && pbClients.length > 0) {
          const mapped: NoxClient[] = pbClients.map((rec: any) => ({
            id: rec.id,
            clientCode: rec.client_code || `CLI-${rec.id.slice(0, 4)}`,
            protocolo: rec.protocolo || `INT-${rec.id.slice(0, 4)}`,
            nome: rec.nome,
            cpf: rec.cpf,
            rg: rec.rg,
            telefone: rec.telefone,
            email: rec.email,
            endereco: rec.endereco,
            profissao: rec.profissao,
            nacionalidade: rec.nacionalidade || 'brasileiro(a)',
            estadoCivil: rec.estado_civil || 'solteiro(a)',
            demanda: rec.demanda || 'outro',
            descricaoCaso: rec.descricao_caso || '',
            origem: rec.origem || 'intake_site',
            estagio: rec.estagio || 'novo',
            docsGerados: rec.docs_gerados || [],
            processosVinculados: rec.processos_vinculados || [],
            obs: rec.obs,
            responsavel: rec.responsavel || 'Higor Utinoi de Oliveira',
            createdAt: rec.created,
            updatedAt: rec.updated,
          }))

          // Merge com locais, dando prioridade para registros do banco
          const existingIds = new Set(mapped.map((c) => c.id))
          const existingCodes = new Set(mapped.map((c) => c.clientCode))
          const localOnly = this.clients.filter(
            (c) => !existingIds.has(c.id) && !existingCodes.has(c.clientCode),
          )
          this.clients = [...mapped, ...localOnly]
          this.saveClients()
        }
      } catch (err) {
        console.warn('PocketBase initial load clients failed (using local):', err)
      }

      // 2. Realtime listener para novas inserções (ex: Intake pelo endpoint público)
      try {
        pb.collection('clients').subscribe('*', (e: any) => {
          if (e.action === 'create') {
            const rec = e.record
            const exists = this.clients.some(
              (c) => c.id === rec.id || (rec.protocolo && c.protocolo === rec.protocolo),
            )
            if (!exists) {
              const newC: NoxClient = {
                id: rec.id,
                clientCode: rec.client_code || `CLI-${rec.id.slice(0, 4)}`,
                protocolo: rec.protocolo || `INT-${rec.id.slice(0, 4)}`,
                nome: rec.nome,
                cpf: rec.cpf,
                rg: rec.rg,
                telefone: rec.telefone,
                email: rec.email,
                endereco: rec.endereco,
                profissao: rec.profissao,
                nacionalidade: rec.nacionalidade || 'brasileiro(a)',
                estadoCivil: rec.estado_civil || 'solteiro(a)',
                demanda: rec.demanda || 'outro',
                descricaoCaso: rec.descricao_caso || '',
                origem: rec.origem || 'intake_site',
                estagio: rec.estagio || 'novo',
                docsGerados: rec.docs_gerados || [],
                processosVinculados: rec.processos_vinculados || [],
                obs: rec.obs,
                responsavel: rec.responsavel || 'Higor Utinoi de Oliveira',
                createdAt: rec.created,
                updatedAt: rec.updated,
              }
              this.clients.unshift(newC)
              this.saveClients()
            }
          } else if (e.action === 'update') {
            const rec = e.record
            const idx = this.clients.findIndex((c) => c.id === rec.id)
            if (idx !== -1) {
              this.clients[idx] = {
                ...this.clients[idx],
                nome: rec.nome || this.clients[idx].nome,
                estagio: rec.estagio || this.clients[idx].estagio,
                demanda: rec.demanda || this.clients[idx].demanda,
                descricaoCaso: rec.descricao_caso || this.clients[idx].descricaoCaso,
                updatedAt: rec.updated || new Date().toISOString(),
              }
              this.saveClients()
            }
          } else if (e.action === 'delete') {
            this.clients = this.clients.filter((c) => c.id !== e.record.id)
            this.saveClients()
          }
        })
      } catch (subErr) {
        console.warn('Realtime subscribe to clients not available:', subErr)
      }
    } catch (_) {
      /* non blocking */
    }
  }

  private generateInitialProductionItems(clients: NoxClient[]): ProductionItem[] {
    const now = new Date()
    const dDaysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString()

    const cli1 = clients.find((c) => c.clientCode === 'CLI-2026-001') || clients[0]
    const cli2 = clients.find((c) => c.clientCode === 'CLI-2026-002') || clients[1]
    const cli3 = clients.find((c) => c.clientCode === 'CLI-2026-003') || clients[2]
    const cli4 = clients.find((c) => c.clientCode === 'CLI-2026-004') || clients[3]

    const initial: ProductionItem[] = []

    if (cli1) {
      initial.push({
        id: 'prod-item-001',
        clientId: cli1.id,
        clientName: cli1.nome,
        clientCode: cli1.clientCode,
        numeroProcesso:
          (cli1.processosVinculados && cli1.processosVinculados[0]) || '1045230-89.2026.8.26.0100',
        tituloPeca: `Petição Inicial / Tutela de Urgência — ${cli1.nome}`,
        nivel: 3, // Litígio bancário => Nível 3 automático
        estagio: 'tese_em_definicao',
        responsavel: 'Higor Utinoi de Oliveira',
        triagemEvidencias: {
          essencial: 4,
          util: 2,
          neutro: 1,
          perigoso: 1,
          dispensavel: 3,
          completa: true,
          itensDetalhados: [
            {
              id: 'tri-1',
              descricao: 'Extrato bancário demonstrando débito abusivo não autorizado',
              camada: 'essencial',
            },
            {
              id: 'tri-2',
              descricao: 'Comprovante de negativação indevida nos órgãos SPC/SERASA',
              camada: 'essencial',
            },
            {
              id: 'tri-3',
              descricao: 'Contrato de adesão original com cláusulas leoninas',
              camada: 'essencial',
            },
            {
              id: 'tri-4',
              descricao: 'Protocolos de atendimento no SAC bancário sem resolução',
              camada: 'essencial',
            },
            {
              id: 'tri-5',
              descricao: 'Troca de e-mails com a ouvidoria da instituição',
              camada: 'util',
            },
            { id: 'tri-6', descricao: 'Comprovante de renda familiar atualizado', camada: 'util' },
            {
              id: 'tri-7',
              descricao: 'Declaração de imposto de renda ano anterior',
              camada: 'neutro',
            },
            {
              id: 'tri-8',
              descricao: 'Notificação prévia com aceite parcial do autor (atenção)',
              camada: 'perigoso',
              observacao: 'Mitigar na fundamentação inicial',
            },
            {
              id: 'tri-9',
              descricao: 'Comprovantes de endereço antigos repetidos',
              camada: 'dispensavel',
            },
          ],
        },
        teseDominante:
          'Abusividade das tarifas e desvio produtivo do consumidor em litígio bancário',
        motivoTravamento: 'Aguardando fechamento do eixo narrativo de dano moral reflexo',
        dataEntradaEstagioAtual: dDaysAgo(6), // 6 dias parado em Tese em Definição (alerta de gargalo)
        stressTestAprovado: false,
        stressTestDetalhes: {
          tecnicaJuridica: false,
          coerenciaNarrativa: false,
          humanizacao: false,
          observacoes: 'Aguardando redação para submissão ao stress-test adversarial',
        },
        historicoEstagios: [
          {
            stage: 'triagem_evidencias',
            enteredAt: dDaysAgo(10),
            leftAt: dDaysAgo(6),
            durationDays: 4,
            actor: 'Higor Utinoi de Oliveira',
            justification: 'Triagem de 5 camadas finalizada com sucesso',
          },
          {
            stage: 'tese_em_definicao',
            enteredAt: dDaysAgo(6),
            actor: 'Higor Utinoi de Oliveira',
          },
        ],
        createdAt: dDaysAgo(10),
        updatedAt: dDaysAgo(6),
      })
    }

    if (cli2) {
      initial.push({
        id: 'prod-item-002',
        clientId: cli2.id,
        clientName: cli2.nome,
        clientCode: cli2.clientCode,
        numeroProcesso:
          (cli2.processosVinculados && cli2.processosVinculados[0]) || '0018492-44.2026.8.26.0001',
        tituloPeca: `Ação Indenizatória por Extravio de Bagagem — ${cli2.nome}`,
        nivel: 3, // Companhia aérea / grande porte => Nível 3
        estagio: 'em_redacao',
        responsavel: 'Higor Utinoi de Oliveira',
        triagemEvidencias: {
          essencial: 5,
          util: 3,
          neutro: 0,
          perigoso: 0,
          dispensavel: 2,
          completa: true,
        },
        teseDominante:
          'Inaplicabilidade da Convenção de Montreal para danos morais (Tema 210 STF) e falha na assistência material',
        motivoTravamento: '',
        dataEntradaEstagioAtual: dDaysAgo(2),
        stressTestAprovado: false,
        stressTestDetalhes: {
          tecnicaJuridica: false,
          coerenciaNarrativa: false,
          humanizacao: false,
        },
        historicoEstagios: [
          {
            stage: 'triagem_evidencias',
            enteredAt: dDaysAgo(5),
            leftAt: dDaysAgo(3),
            durationDays: 2,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'tese_em_definicao',
            enteredAt: dDaysAgo(3),
            leftAt: dDaysAgo(2),
            durationDays: 1,
            actor: 'Higor Utinoi de Oliveira',
          },
          { stage: 'em_redacao', enteredAt: dDaysAgo(2), actor: 'Higor Utinoi de Oliveira' },
        ],
        createdAt: dDaysAgo(5),
        updatedAt: dDaysAgo(2),
      })
    }

    if (cli3) {
      initial.push({
        id: 'prod-item-003',
        clientId: cli3.id,
        clientName: cli3.nome,
        clientCode: cli3.clientCode,
        numeroProcesso:
          (cli3.processosVinculados && cli3.processosVinculados[0]) || '5001290-77.2026.8.26.0200',
        tituloPeca: `Contestação Trabalhista — ${cli3.nome}`,
        nivel: 2,
        estagio: 'stress_test_adversarial',
        responsavel: 'Higor Utinoi de Oliveira',
        triagemEvidencias: {
          essencial: 6,
          util: 4,
          neutro: 2,
          perigoso: 1,
          dispensavel: 1,
          completa: true,
        },
        teseDominante:
          'Inexistência de periculosidade habitual e validade dos registros de ponto por telemetria',
        motivoTravamento:
          'Necessária validação da camada de humanização e adequação de jurisprudência do TRT',
        dataEntradaEstagioAtual: dDaysAgo(3),
        stressTestAprovado: false,
        stressTestDetalhes: {
          tecnicaJuridica: true,
          coerenciaNarrativa: true,
          humanizacao: false, // Bloqueante!
          observacoes:
            'Ajustar tom da narrativa em relação ao autor para demonstrar cumprimento integral das NRs sem desumanizar a rotina.',
          reprovacoesHistorico: [
            {
              data: dDaysAgo(1),
              motivo: 'Voltou para redação técnica: Camada de Humanização reprovada',
              camadasReprovadas: ['humanizacao'],
              actor: 'Revisor Sênior NOX',
            },
          ],
        },
        historicoEstagios: [
          {
            stage: 'triagem_evidencias',
            enteredAt: dDaysAgo(8),
            leftAt: dDaysAgo(6),
            durationDays: 2,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'tese_em_definicao',
            enteredAt: dDaysAgo(6),
            leftAt: dDaysAgo(5),
            durationDays: 1,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'em_redacao',
            enteredAt: dDaysAgo(5),
            leftAt: dDaysAgo(3),
            durationDays: 2,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'stress_test_adversarial',
            enteredAt: dDaysAgo(3),
            actor: 'Higor Utinoi de Oliveira',
          },
        ],
        createdAt: dDaysAgo(8),
        updatedAt: dDaysAgo(1),
      })
    }

    if (cli4) {
      initial.push({
        id: 'prod-item-004',
        clientId: cli4.id,
        clientName: cli4.nome,
        clientCode: cli4.clientCode,
        numeroProcesso: '0809122-30.2026.8.12.0001',
        tituloPeca: `Notificação Extrajudicial & Minuta de Rescisão — ${cli4.nome}`,
        nivel: 3, // Litígio de grande maquinário agrícola
        estagio: 'pronto_protocolo',
        responsavel: 'Higor Utinoi de Oliveira',
        triagemEvidencias: {
          essencial: 4,
          util: 3,
          neutro: 1,
          perigoso: 0,
          dispensavel: 0,
          completa: true,
        },
        teseDominante:
          'Vício redibitório oculto do maquinário e quebra da boa-fé objetiva pré-contratual',
        motivoTravamento: '',
        dataEntradaEstagioAtual: dDaysAgo(1),
        stressTestAprovado: true,
        stressTestDetalhes: {
          tecnicaJuridica: true,
          coerenciaNarrativa: true,
          humanizacao: true,
          observacoes:
            'Stress-test de 3 camadas aprovado com nota máxima. Peça liberada para ato de protocolo.',
        },
        historicoEstagios: [
          {
            stage: 'triagem_evidencias',
            enteredAt: dDaysAgo(7),
            leftAt: dDaysAgo(5),
            durationDays: 2,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'tese_em_definicao',
            enteredAt: dDaysAgo(5),
            leftAt: dDaysAgo(4),
            durationDays: 1,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'em_redacao',
            enteredAt: dDaysAgo(4),
            leftAt: dDaysAgo(2),
            durationDays: 2,
            actor: 'Higor Utinoi de Oliveira',
          },
          {
            stage: 'stress_test_adversarial',
            enteredAt: dDaysAgo(2),
            leftAt: dDaysAgo(1),
            durationDays: 1,
            actor: 'Higor Utinoi de Oliveira',
          },
          { stage: 'pronto_protocolo', enteredAt: dDaysAgo(1), actor: 'Higor Utinoi de Oliveira' },
        ],
        createdAt: dDaysAgo(7),
        updatedAt: dDaysAgo(1),
      })
    }

    return initial
  }

  private generateInitialClients(): NoxClient[] {
    const now = new Date()
    const d1 = new Date(now.getTime() - 2 * 86400000).toISOString()
    const d2 = new Date(now.getTime() - 5 * 86400000).toISOString()
    const d3 = new Date(now.getTime() - 8 * 86400000).toISOString()

    const initialClients: NoxClient[] = [
      {
        id: 'cli-intake-001',
        clientCode: 'CLI-2026-001',
        protocolo: 'INT-2026-8801',
        nome: 'Marcos Vinícius Silveira',
        cpf: '382.910.450-88',
        rg: '44.891.203-X SSP/SP',
        telefone: '(11) 98455-1234',
        email: 'marcos.silveira@email.com',
        endereco: 'Rua das Palmeiras, 450, Apto 82, Cerqueira César, São Paulo - SP',
        profissao: 'Engenheiro de Software',
        nacionalidade: 'brasileiro(a)',
        estadoCivil: 'casado(a)',
        demanda: 'bancario',
        descricaoCaso:
          'Cobrança indevida de juros abusivos em contrato de financiamento imobiliário e negativação indevida nos órgãos de proteção ao crédito (SPC/SERASA). O banco incluiu tarifas e vendas casadas não autorizadas.',
        origem: 'intake_site',
        estagio: 'novo',
        docsGerados: [],
        processosVinculados: ['1045230-89.2026.8.26.0100'],
        responsavel: 'Higor Utinoi de Oliveira',
        createdAt: d1,
        updatedAt: d1,
      },
      {
        id: 'cli-intake-002',
        clientCode: 'CLI-2026-002',
        protocolo: 'INT-2026-8802',
        nome: 'Ana Carolina Mendonça Prado',
        cpf: '219.840.118-45',
        rg: '38.102.994-1 SSP/SP',
        telefone: '(11) 97120-9988',
        email: 'ana.mendonca@adv.com',
        endereco: 'Av. Paulista, 1500, Conj 41, Bela Vista, São Paulo - SP',
        profissao: 'Arquiteta e Urbanista',
        nacionalidade: 'brasileiro(a)',
        estadoCivil: 'solteiro(a)',
        demanda: 'consumidor',
        descricaoCaso:
          'Cancelamento unilateral de passagem aérea internacional de lua de mel e extravio definitivo de bagagem em viagem para a Europa, sem assistência material prestada pela companhia aérea.',
        origem: 'intake_site',
        estagio: 'aguardando_documentos',
        docsGerados: [
          {
            id: 'doc-g-001',
            nomeModelo: 'Procuração Ad Judicia et Extra',
            criadoEm: d2,
            autor: 'Higor Utinoi de Oliveira',
            status: 'gerado',
          },
        ],
        processosVinculados: ['0018492-44.2026.8.26.0001'],
        responsavel: 'Higor Utinoi de Oliveira',
        createdAt: d2,
        updatedAt: d2,
      },
      {
        id: 'cli-manual-003',
        clientCode: 'CLI-2026-003',
        protocolo: 'DIR-2026-103',
        nome: 'Transportadora Rápido Bandeirantes Ltda',
        cpf: '18.940.231/0001-90',
        rg: 'IE 109.842.110.119',
        telefone: '(19) 3455-8900',
        email: 'juridico@rapidobandeirantes.com.br',
        endereco: 'Rodovia Anhanguera, KM 110, Distrito Industrial, Campinas - SP',
        profissao: 'Pessoa Jurídica (Transporte Rodoviário)',
        nacionalidade: 'brasileira',
        estadoCivil: 'Pessoa Jurídica',
        demanda: 'trabalhista',
        descricaoCaso:
          'Reclamatória trabalhista proposta por ex-motorista carreteiro requerendo horas extras e adicional de periculosidade. Atendimento presencial no escritório de Campinas com entrega de fichas de tacógrafo.',
        origem: 'manual',
        estagio: 'ativo',
        docsGerados: [
          {
            id: 'doc-g-002',
            nomeModelo: 'Contrato de Prestação de Serviços Advocatícios',
            criadoEm: d3,
            autor: 'Higor Utinoi de Oliveira',
            status: 'gerado',
          },
          {
            id: 'doc-g-003',
            nomeModelo: 'Procuração com Poderes Específicos',
            criadoEm: d3,
            autor: 'Higor Utinoi de Oliveira',
            status: 'gerado',
          },
        ],
        processosVinculados: ['5001290-77.2026.8.26.0200', '0001928-11.2026.5.02.0040'],
        responsavel: 'Higor Utinoi de Oliveira',
        createdAt: d3,
        updatedAt: d3,
      },
      {
        id: 'cli-wpp-004',
        clientCode: 'CLI-2026-004',
        protocolo: 'WPP-2026-5504',
        nome: 'Carlos Eduardo Nogueira',
        cpf: '145.670.328-91',
        rg: '50.128.441-2 SSP/MS',
        telefone: '(67) 99123-4567',
        email: 'carlos.nogueira@fazenda.com.br',
        endereco: 'Rua Afonso Pena, 2200, Centro, Campo Grande - MS',
        profissao: 'Produtor Rural',
        nacionalidade: 'brasileiro(a)',
        estadoCivil: 'casado(a)',
        demanda: 'civel',
        descricaoCaso:
          'Ação de rescisão contratual cumulada com perdas e danos referente à compra e venda de maquinário agrícola com vício oculto de fabricação. Primeiro contato realizado pelo WhatsApp institucional.',
        origem: 'whatsapp',
        estagio: 'em_atendimento',
        docsGerados: [],
        processosVinculados: [],
        responsavel: 'Higor Utinoi de Oliveira',
        createdAt: d1,
        updatedAt: d1,
      },
    ]

    // Garantir que os eventos de auditoria iniciais contenham o INTAKE_RECEBIDO para os clientes originados do site
    setTimeout(() => {
      this.ensureIntakeAuditLogs(initialClients)
    }, 0)

    return initialClients
  }

  private ensureIntakeAuditLogs(clients: NoxClient[]) {
    for (const cli of clients) {
      if (cli.origem === 'intake_site') {
        const hasLog = this.auditLogs.some(
          (l) =>
            l.action === 'INTAKE_RECEBIDO' &&
            (l.targetId === cli.id || l.targetId === cli.clientCode),
        )
        if (!hasLog) {
          const entry: AuditLogEntry = {
            id: `aud_intake_${cli.id}`,
            action: 'INTAKE_RECEBIDO',
            category: 'sistema',
            actor: 'Intake Site / api/intake_submit.php',
            targetId: cli.id,
            details: {
              client_code: cli.clientCode,
              protocolo: cli.protocolo,
              nome: cli.nome,
              cpf: cli.cpf,
              telefone: cli.telefone,
              email: cli.email,
              demanda: cli.demanda,
              descricao_caso: cli.descricaoCaso,
              origem: cli.origem,
              estagio_inicial: 'novo',
              timestamp_captura: cli.createdAt,
            },
            ipAddress: '187.12.90.44 (Visitante Web)',
            createdAt: cli.createdAt,
          }
          this.auditLogs.push(entry)
        }
      }
    }
    this.saveAuditLogs()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  private saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(this.records))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveImports() {
    try {
      localStorage.setItem(STORAGE_KEYS.IMPORTS, JSON.stringify(this.imports))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveAuditLogs() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveClients() {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveProductionItems() {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTION, JSON.stringify(this.productionItems))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  // ================= Produção NOX Getters and Operations =================

  public getProductionItems(): ProductionItem[] {
    return [...this.productionItems]
  }

  public getProductionItemById(id: string): ProductionItem | undefined {
    return this.productionItems.find((p) => p.id === id)
  }

  public getProductionItemsByClientId(clientId: string): ProductionItem[] {
    return this.productionItems.filter((p) => p.clientId === clientId)
  }

  public addProductionItem(
    itemData: {
      clientId: string
      numeroProcesso?: string
      tituloPeca: string
      nivel?: ProductionNivel
      responsavel?: string
      triagemEvidencias?: Partial<TriagemEvidenciasCamadas>
      teseDominante?: string
      motivoTravamento?: string
    },
    actor = 'Operador NOX',
  ): { success: boolean; item?: ProductionItem; error?: string } {
    // 1. Validação estrita: vínculo de cliente é obrigatório
    const client = this.getClientById(itemData.clientId)
    if (!client) {
      return {
        success: false,
        error:
          'Vínculo de cliente obrigatório. Selecione um cliente cadastrado no módulo Clientes.',
      }
    }

    if (!itemData.tituloPeca || !itemData.tituloPeca.trim()) {
      return {
        success: false,
        error: 'Título da peça é obrigatório.',
      }
    }

    // 2. Classificação de Nível (Nível 3 padrão; sensor de litigante)
    const contextText = `${itemData.tituloPeca} ${client.nome} ${client.demanda} ${client.descricaoCaso || ''} ${itemData.numeroProcesso || ''}`
    const classif = classificarNivelProducao(contextText, itemData.nivel)
    const nivelFinal: ProductionNivel = classif.nivel

    const nowIso = new Date().toISOString()
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const defaultTriagem: TriagemEvidenciasCamadas = {
      essencial: itemData.triagemEvidencias?.essencial || 0,
      util: itemData.triagemEvidencias?.util || 0,
      neutro: itemData.triagemEvidencias?.neutro || 0,
      perigoso: itemData.triagemEvidencias?.perigoso || 0,
      dispensavel: itemData.triagemEvidencias?.dispensavel || 0,
      completa: itemData.triagemEvidencias?.completa ?? false,
      itensDetalhados: itemData.triagemEvidencias?.itensDetalhados || [],
    }

    const newItem: ProductionItem = {
      id,
      clientId: client.id,
      clientName: client.nome,
      clientCode: client.clientCode,
      numeroProcesso: itemData.numeroProcesso || client.processosVinculados[0] || undefined,
      tituloPeca: itemData.tituloPeca.trim(),
      nivel: nivelFinal,
      estagio: 'triagem_evidencias',
      responsavel:
        itemData.responsavel ||
        client.responsavel ||
        this.settings.lawyerName ||
        'Higor Utinoi de Oliveira',
      triagemEvidencias: defaultTriagem,
      teseDominante: itemData.teseDominante || '',
      motivoTravamento: itemData.motivoTravamento || '',
      dataEntradaEstagioAtual: nowIso,
      stressTestAprovado: false,
      stressTestDetalhes: {
        tecnicaJuridica: false,
        coerenciaNarrativa: false,
        humanizacao: false,
      },
      historicoEstagios: [
        {
          stage: 'triagem_evidencias',
          enteredAt: nowIso,
          actor,
          justification: 'Item inserido na esteira de produção',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    this.productionItems.unshift(newItem)
    this.saveProductionItems()

    // Registrar no audit_logs
    this.logAction('ITEM_PRODUCAO_CRIADO', 'producao', actor, newItem.id, {
      titulo_peca: newItem.tituloPeca,
      client_id: client.id,
      client_code: client.clientCode,
      cliente: client.nome,
      nivel: newItem.nivel,
      reclassificado_automatico: classif.reclassificadoAutomatico,
      motivo_nivel: classif.motivo,
      estagio_inicial: 'triagem_evidencias',
    })

    // Sincronizar em background com PocketBase
    this.syncProductionItemToPocketBase(newItem).catch((e) =>
      console.warn('Background sync production item error:', e),
    )

    return { success: true, item: newItem }
  }

  public updateProductionItem(
    id: string,
    updates: Partial<ProductionItem>,
    actor = 'Operador NOX',
  ): boolean {
    const item = this.productionItems.find((p) => p.id === id)
    if (!item) return false

    // Se o cliente for alterado, validar
    if (updates.clientId && updates.clientId !== item.clientId) {
      const newCli = this.getClientById(updates.clientId)
      if (!newCli) return false
      item.clientId = newCli.id
      item.clientName = newCli.nome
      item.clientCode = newCli.clientCode
    }

    // Reavaliar sensor de litigante se titulo mudar ou nivel for omitido
    if (updates.tituloPeca && !updates.nivel) {
      const contextText = `${updates.tituloPeca} ${item.clientName || ''} ${updates.numeroProcesso || item.numeroProcesso || ''}`
      const classif = classificarNivelProducao(contextText, item.nivel)
      updates.nivel = classif.nivel
    }

    Object.assign(item, updates, { updatedAt: new Date().toISOString() })
    this.saveProductionItems()

    this.logAction('ITEM_PRODUCAO_ATUALIZADO', 'producao', actor, item.id, {
      titulo: item.tituloPeca,
      campos_alterados: Object.keys(updates),
    })

    this.syncProductionItemToPocketBase(item).catch((e) =>
      console.warn('Background sync production item error:', e),
    )

    return true
  }

  /**
   * Avanço MANUAL de estágio no Pipeline.
   * Mudança de estágio é SEMPRE manual — o sistema nunca avança sozinho.
   */
  public advanceProductionStage(
    id: string,
    targetStage: ProductionStage,
    actor = 'Operador NOX',
    justification?: string,
  ): { success: boolean; error?: string } {
    const item = this.productionItems.find((p) => p.id === id)
    if (!item) return { success: false, error: 'Item de produção não encontrado.' }

    const oldStage = item.estagio
    if (oldStage === targetStage) return { success: true }

    const nowIso = new Date().toISOString()
    const nowDate = new Date(nowIso)
    const prevDate = new Date(item.dataEntradaEstagioAtual)
    const durationDays = Math.max(
      0,
      Math.round((nowDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)),
    )

    // Fechar estágio anterior no histórico
    const history = item.historicoEstagios || []
    if (history.length > 0) {
      const last = history[history.length - 1]
      if (last && !last.leftAt) {
        last.leftAt = nowIso
        last.durationDays = durationDays
      }
    }

    // Adicionar novo estágio
    history.push({
      stage: targetStage,
      enteredAt: nowIso,
      actor,
      justification,
    })

    item.estagio = targetStage
    item.dataEntradaEstagioAtual = nowIso
    item.historicoEstagios = history
    item.updatedAt = nowIso

    // Se saiu de um estágio de travamento ou resolveu, limpar motivo
    if (justification?.toLowerCase().includes('resolvido')) {
      item.motivoTravamento = ''
    }

    this.saveProductionItems()

    this.logAction('ESTAGIO_PRODUCAO_ALTERADO', 'producao', actor, item.id, {
      titulo_peca: item.tituloPeca,
      estagio_anterior: oldStage,
      estagio_novo: targetStage,
      dias_no_estagio_anterior: durationDays,
      justificativa: justification || 'Avanço manual de produção',
    })

    this.syncProductionItemToPocketBase(item).catch((e) =>
      console.warn('Background sync production item error:', e),
    )

    return { success: true }
  }

  /**
   * Atualiza a triagem de evidências (5 camadas: essencial, util, neutro, perigoso, dispensavel)
   */
  public updateTriagemEvidencias(
    id: string,
    triagem: TriagemEvidenciasCamadas,
    actor = 'Operador NOX',
  ): boolean {
    const item = this.productionItems.find((p) => p.id === id)
    if (!item) return false

    item.triagemEvidencias = { ...triagem }
    item.updatedAt = new Date().toISOString()
    this.saveProductionItems()

    this.logAction('TRIAGEM_EVIDENCIAS_MARCADA', 'producao', actor, item.id, {
      titulo_peca: item.tituloPeca,
      essencial: triagem.essencial,
      util: triagem.util,
      neutro: triagem.neutro,
      perigoso: triagem.perigoso,
      dispensavel: triagem.dispensavel,
      completa: triagem.completa,
    })

    this.syncProductionItemToPocketBase(item).catch((e) =>
      console.warn('Background sync production item error:', e),
    )

    return true
  }

  /**
   * Avalia as 3 camadas de stress-test adversarial (técnica jurídica, coerência narrativa, humanização).
   * Se alguma reprovar, grava motivo e permite retornar pra redação.
   */
  public evaluateStressTest(
    id: string,
    validation: {
      tecnicaJuridica: boolean
      coerenciaNarrativa: boolean
      humanizacao: boolean
      observacoes?: string
      retornarParaRedacaoSeFalhar?: boolean
    },
    actor = 'Operador NOX',
  ): { aprovado: boolean; camadasPendentes: string[] } {
    const item = this.productionItems.find((p) => p.id === id)
    if (!item) return { aprovado: false, camadasPendentes: [] }

    const camadasPendentes: string[] = []
    if (!validation.tecnicaJuridica) camadasPendentes.push('Técnica Jurídica')
    if (!validation.coerenciaNarrativa) camadasPendentes.push('Coerência Narrativa')
    if (!validation.humanizacao) camadasPendentes.push('Humanização')

    const aprovado = camadasPendentes.length === 0
    const nowIso = new Date().toISOString()

    const detalhes: StressTestValidation = {
      tecnicaJuridica: validation.tecnicaJuridica,
      coerenciaNarrativa: validation.coerenciaNarrativa,
      humanizacao: validation.humanizacao,
      observacoes: validation.observacoes,
      reprovacoesHistorico: item.stressTestDetalhes?.reprovacoesHistorico || [],
    }

    if (!aprovado) {
      detalhes.reprovacoesHistorico?.unshift({
        data: nowIso,
        motivo: validation.observacoes || 'Camadas pendentes no Stress-Test',
        camadasReprovadas: camadasPendentes,
        actor,
      })
    }

    item.stressTestAprovado = aprovado
    item.stressTestDetalhes = detalhes
    item.updatedAt = nowIso

    // Se reprovado e solicitado retorno pra redação
    if (
      !aprovado &&
      validation.retornarParaRedacaoSeFalhar &&
      item.estagio === 'stress_test_adversarial'
    ) {
      this.advanceProductionStage(
        item.id,
        'em_redacao',
        actor,
        `Retorno de Stress-Test Adversarial: ${camadasPendentes.join(', ')} reprovada(s).`,
      )
    } else {
      this.saveProductionItems()
    }

    this.logAction(
      aprovado ? 'STRESS_TEST_APROVADO' : 'STRESS_TEST_REPROVADO',
      'producao',
      actor,
      item.id,
      {
        titulo_peca: item.tituloPeca,
        aprovado,
        camadasPendentes,
        observacoes: validation.observacoes,
      },
    )

    this.syncProductionItemToPocketBase(item).catch((e) =>
      console.warn('Background sync production item error:', e),
    )

    return { aprovado, camadasPendentes }
  }

  public deleteProductionItem(id: string, actor = 'Operador NOX'): boolean {
    const idx = this.productionItems.findIndex((p) => p.id === id)
    if (idx === -1) return false

    const item = this.productionItems[idx]
    this.productionItems.splice(idx, 1)
    this.saveProductionItems()

    this.logAction('ITEM_PRODUCAO_EXCLUIDO', 'producao', actor, id, {
      titulo_peca: item.tituloPeca,
      cliente: item.clientName,
    })

    return true
  }

  private async syncProductionItemToPocketBase(item: ProductionItem): Promise<void> {
    try {
      const pb = (await import('@/lib/pocketbase/client')).default
      // Verificar se existe
      try {
        const existing = await pb.collection('production_items').getOne(item.id)
        if (existing) {
          await pb.collection('production_items').update(item.id, {
            client_id: item.clientId,
            client_name: item.clientName,
            numero_processo: item.numeroProcesso,
            titulo_peca: item.tituloPeca,
            nivel: item.nivel,
            estagio: item.estagio,
            responsavel: item.responsavel,
            triagem_evidencias: item.triagemEvidencias,
            tese_dominante: item.teseDominante,
            motivo_travamento: item.motivoTravamento,
            data_entrada_estagio_atual: item.dataEntradaEstagioAtual,
            stress_test_aprovado: item.stressTestAprovado,
            stress_test_detalhes: item.stressTestDetalhes,
            historico_estagios: item.historicoEstagios,
          })
          return
        }
      } catch (_) {
        // Not found, create
      }

      await pb.collection('production_items').create({
        id: item.id.replace(/[^a-z0-9_]/gi, '').slice(0, 15),
        client_id: item.clientId,
        client_name: item.clientName,
        numero_processo: item.numeroProcesso,
        titulo_peca: item.tituloPeca,
        nivel: item.nivel,
        estagio: item.estagio,
        responsavel: item.responsavel,
        triagem_evidencias: item.triagemEvidencias,
        tese_dominante: item.teseDominante,
        motivo_travamento: item.motivoTravamento,
        data_entrada_estagio_atual: item.dataEntradaEstagioAtual,
        stress_test_aprovado: item.stressTestAprovado,
        stress_test_detalhes: item.stressTestDetalhes,
        historico_estagios: item.historicoEstagios,
      })
    } catch {
      // Ignora falha de sync local offline
    }
  }

  // ================= Clientes NOX Getters and Operations =================

  public getClients(): NoxClient[] {
    return [...this.clients]
  }

  public getClientById(id: string): NoxClient | undefined {
    return this.clients.find((c) => c.id === id || c.clientCode === id || c.protocolo === id)
  }

  public getClientByCpf(cpf: string): NoxClient | undefined {
    if (!cpf) return undefined
    const clean = cpf.replace(/\D/g, '')
    return this.clients.find((c) => c.cpf && c.cpf.replace(/\D/g, '') === clean)
  }

  public addClient(
    clientData: Omit<
      NoxClient,
      'id' | 'clientCode' | 'createdAt' | 'updatedAt' | 'docsGerados' | 'processosVinculados'
    > & {
      docsGerados?: ClientGeneratedDoc[]
      processosVinculados?: string[]
      clientCode?: string
    },
  ): NoxClient {
    const nextNum = this.clients.length + 1
    const code = clientData.clientCode || `CLI-2026-${String(nextNum).padStart(3, '0')}`
    const id = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const nowIso = new Date().toISOString()

    const newClient: NoxClient = {
      id,
      clientCode: code,
      protocolo:
        clientData.protocolo ||
        (clientData.origem === 'intake_site'
          ? `INT-2026-${Math.floor(1000 + Math.random() * 9000)}`
          : `MAN-${Math.floor(100 + Math.random() * 900)}`),
      nome: clientData.nome,
      cpf: clientData.cpf,
      rg: clientData.rg,
      telefone: clientData.telefone,
      email: clientData.email,
      endereco: clientData.endereco,
      profissao: clientData.profissao,
      nacionalidade: clientData.nacionalidade || 'brasileiro(a)',
      estadoCivil: clientData.estadoCivil || 'solteiro(a)',
      demanda: clientData.demanda,
      descricaoCaso: clientData.descricaoCaso,
      origem: clientData.origem,
      estagio: clientData.estagio || 'novo',
      docsGerados: clientData.docsGerados || [],
      processosVinculados: clientData.processosVinculados || [],
      obs: clientData.obs,
      responsavel: clientData.responsavel || this.settings.lawyerName || 'Higor Utinoi de Oliveira',
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    this.clients.unshift(newClient)
    this.saveClients()

    // Registrar no audit_logs
    const isIntake = newClient.origem === 'intake_site'
    this.logAction(
      isIntake ? 'INTAKE_RECEBIDO' : 'CLIENTE_CADASTRADO_MANUAL',
      'sistema',
      isIntake ? 'Intake Site / api/intake_submit.php' : newClient.responsavel || 'Operador NOX',
      newClient.id,
      {
        client_code: newClient.clientCode,
        protocolo: newClient.protocolo,
        nome: newClient.nome,
        cpf: newClient.cpf,
        origem: newClient.origem,
        estagio: newClient.estagio,
        demanda: newClient.demanda,
        descricao_caso: newClient.descricaoCaso,
      },
    )

    return newClient
  }

  public updateClient(id: string, updates: Partial<NoxClient>, actor = 'Operador NOX'): boolean {
    const cli = this.clients.find((c) => c.id === id || c.clientCode === id)
    if (!cli) return false

    const oldStage = cli.estagio
    Object.assign(cli, updates, { updatedAt: new Date().toISOString() })
    this.saveClients()

    if (updates.estagio && updates.estagio !== oldStage) {
      this.logAction('STATUS_CLIENTE_ALTERADO', 'revisao', actor, cli.id, {
        cliente: cli.nome,
        client_code: cli.clientCode,
        estagio_anterior: oldStage,
        estagio_novo: updates.estagio,
      })
    } else {
      this.logAction('DADOS_CLIENTE_ATUALIZADOS', 'revisao', actor, cli.id, {
        cliente: cli.nome,
        campos_alterados: Object.keys(updates),
      })
    }

    return true
  }

  public updateClientStage(id: string, newStage: ClientStage, actor = 'Operador NOX'): boolean {
    const cli = this.clients.find((c) => c.id === id || c.clientCode === id)
    if (!cli) return false

    const oldStage = cli.estagio
    cli.estagio = newStage
    cli.updatedAt = new Date().toISOString()
    this.saveClients()

    this.logAction('STATUS_CLIENTE_ALTERADO', 'revisao', actor, cli.id, {
      cliente: cli.nome,
      client_code: cli.clientCode,
      estagio_anterior: oldStage,
      estagio_novo: newStage,
    })

    return true
  }

  public linkProcessToClient(
    clientId: string,
    processNumber: string,
    actor = 'Operador NOX',
  ): boolean {
    const cli = this.clients.find((c) => c.id === clientId || c.clientCode === clientId)
    if (!cli) return false

    if (!cli.processosVinculados.includes(processNumber)) {
      cli.processosVinculados.push(processNumber)
      cli.updatedAt = new Date().toISOString()
      this.saveClients()
    }

    // Também atualizar em records e em communications se existirem
    const rec = this.records.find(
      (r) => r.numeroProcesso === processNumber || r.recordCode === processNumber,
    )
    if (rec) {
      rec.clientId = cli.id
      rec.clientCode = cli.clientCode
      this.saveRecords()
    }

    const comms = this.communications.filter((c) => c.numeroProcesso === processNumber)
    for (const comm of comms) {
      comm.clientId = cli.id
      comm.clientCode = cli.clientCode
      comm.clientName = cli.nome
    }
    if (comms.length > 0) {
      this.saveCommunications()
    }

    this.logAction('PROCESSO_VINCULADO_AO_CLIENTE', 'revisao', actor, cli.id, {
      cliente: cli.nome,
      client_code: cli.clientCode,
      numero_processo: processNumber,
    })

    return true
  }

  public unlinkProcessFromClient(
    clientId: string,
    processNumber: string,
    actor = 'Operador NOX',
  ): boolean {
    const cli = this.clients.find((c) => c.id === clientId || c.clientCode === clientId)
    if (!cli) return false

    cli.processosVinculados = cli.processosVinculados.filter((p) => p !== processNumber)
    cli.updatedAt = new Date().toISOString()
    this.saveClients()

    this.logAction('PROCESSO_DESVINCULADO_DO_CLIENTE', 'revisao', actor, cli.id, {
      cliente: cli.nome,
      client_code: cli.clientCode,
      numero_processo: processNumber,
    })

    return true
  }

  public addGeneratedDocToClient(
    clientId: string,
    doc: Omit<ClientGeneratedDoc, 'id' | 'criadoEm'>,
    actor = 'Operador NOX',
  ): ClientGeneratedDoc | null {
    const cli = this.clients.find((c) => c.id === clientId || c.clientCode === clientId)
    if (!cli) return null

    const newDoc: ClientGeneratedDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      templateId: doc.templateId,
      nomeModelo: doc.nomeModelo,
      criadoEm: new Date().toISOString(),
      autor: actor,
      conteudoHtml: doc.conteudoHtml,
      status: doc.status || 'gerado',
      downloadUrl: doc.downloadUrl,
    }

    cli.docsGerados.unshift(newDoc)
    cli.updatedAt = new Date().toISOString()
    this.saveClients()

    this.logAction('DOCUMENTO_GERADO_CLIENTE', 'sistema', actor, cli.id, {
      cliente: cli.nome,
      client_code: cli.clientCode,
      nome_documento: newDoc.nomeModelo,
      doc_id: newDoc.id,
    })

    return newDoc
  }

  public deleteClient(id: string, actor = 'Operador NOX'): boolean {
    const idx = this.clients.findIndex((c) => c.id === id || c.clientCode === id)
    if (idx === -1) return false

    const cli = this.clients[idx]
    this.clients.splice(idx, 1)
    this.saveClients()

    this.logAction('CLIENTE_EXCLUIDO', 'sistema', actor, id, {
      cliente: cli.nome,
      client_code: cli.clientCode,
    })

    return true
  }

  public saveSettings(newSettings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings))
    } catch {
      /* intentionally ignored */
    }
    this.logAction(
      'CONFIGURACOES_ATUALIZADAS',
      'configuracao',
      'Operador NOX',
      'SETTINGS-01',
      newSettings,
    )
    this.notify()
  }

  public getSettings(): AppSettings {
    return { ...this.settings }
  }

  public getRecords(): NoxRecord[] {
    return [...this.records]
  }

  public getRecordById(id: string): NoxRecord | undefined {
    return this.records.find((r) => r.id === id || r.recordCode === id)
  }

  public getImports(): ImportBatch[] {
    return [...this.imports]
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs]
  }

  public getStats(): NoxSystemStats {
    const total = this.records.length
    const critical = this.records.filter((r) => r.severity === 'critico').length
    const high = this.records.filter((r) => r.severity === 'alto').length
    const medium = this.records.filter((r) => r.severity === 'medio').length
    const info = this.records.filter((r) => r.severity === 'informativo').length

    const newRecs = this.records.filter((r) => r.status === 'novo').length
    const inReview = this.records.filter((r) => r.status === 'em_revisao').length
    const quarantined = this.records.filter((r) => r.status === 'quarentena').length
    const resolved = this.records.filter((r) => r.status === 'resolvido').length

    const lastBatch = this.imports[0]

    return {
      totalMonitored: total,
      criticalAlerts: critical,
      highAlerts: high,
      mediumAlerts: medium,
      infoAlerts: info,
      newRecords: newRecs,
      inReviewRecords: inReview,
      quarantinedRecords: quarantined,
      resolvedRecords: resolved,
      lastImportTimestamp: lastBatch?.createdAt || '',
      sentinelaConnected: this.imports.length > 0,
      sentinelaSyncMode: 'IMPORT_CSV_ISOLATED',
    }
  }

  public updateRecordStatus(
    recordId: string,
    newStatus: NoxRecord['status'],
    actor = 'Operador NOX',
    noteText?: string,
  ): boolean {
    const rec = this.records.find((r) => r.id === recordId || r.recordCode === recordId)
    if (!rec) return false

    const oldStatus = rec.status
    rec.status = newStatus
    rec.updatedAt = new Date().toISOString()

    const historyEntry = {
      id: `h_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: `Status alterado de "${oldStatus}" para "${newStatus}"`,
      details: noteText,
    }
    rec.history.unshift(historyEntry)

    if (noteText) {
      rec.notes.unshift({
        id: `n_${Date.now()}`,
        author: actor,
        text: noteText,
        createdAt: new Date().toISOString(),
      })
    }

    this.logAction('STATUS_REGISTRO_ALTERADO', 'revisao', actor, rec.recordCode, {
      de: oldStatus,
      para: newStatus,
      processo: rec.numeroProcesso,
    })

    this.saveRecords()
    return true
  }

  public updateRecordDetails(
    recordId: string,
    updates: {
      responsible?: string
      priority?: NoxRecord['priority']
      tags?: string[]
      notes?: string
    },
    actor = 'Operador NOX',
  ): boolean {
    const rec = this.records.find((r) => r.id === recordId || r.recordCode === recordId)
    if (!rec) return false

    if (updates.responsible) rec.responsible = updates.responsible
    if (updates.priority) rec.priority = updates.priority
    if (updates.tags) rec.tags = updates.tags
    if (updates.notes) {
      rec.notes.unshift({
        id: `n_${Date.now()}`,
        author: actor,
        text: updates.notes,
        createdAt: new Date().toISOString(),
      })
    }

    rec.updatedAt = new Date().toISOString()
    rec.history.unshift({
      id: `h_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: 'Metadados operacionais atualizados',
    })

    this.logAction('METADADOS_OPERACIONAIS_ATUALIZADOS', 'revisao', actor, rec.recordCode, updates)
    this.saveRecords()
    return true
  }

  public async addImportBatch(
    batch: ImportBatch,
    newRecords: NoxRecord[],
  ): Promise<{ success: boolean; message: string }> {
    // Duplicate check
    const existing = this.imports.find((i) => i.hash === batch.hash)
    if (existing) {
      return {
        success: false,
        message: `Arquivo duplicado! O lote "${existing.filename}" com o mesmo SHA-256 (${batch.hash.slice(0, 10)}...) já foi importado em ${new Date(existing.createdAt).toLocaleString('pt-BR')}.`,
      }
    }

    // Set records directly from imported batch (replace synthetic demo default)
    this.imports = [batch, ...this.imports.filter((i) => i.id !== 'batch_sentinela_2026_09_01')]
    this.records = [...newRecords]

    // Also convert imported records to Sentinela Communications so all Sentinela/Triagem/Prazos tabs reflect the dataset
    const importedComms = this.buildCommunicationsFromRecords(newRecords, batch)
    if (importedComms.length > 0) {
      this.communications = importedComms
      this.saveCommunications()
    }

    this.logAction('LOTE_IMPORTADO_NOVO', 'importacao', 'Operador NOX', batch.id, {
      filename: batch.filename,
      hash: batch.hash,
      total_linhas: batch.totalRows,
      aceitos: batch.acceptedCount,
      quarentena: batch.quarantinedCount,
      rejeitados: batch.rejectedCount,
    })

    this.saveImports()
    this.saveRecords()

    // Asynchronously persist to PocketBase backend collections `imports` and `records`
    this.syncToPocketBase(batch, newRecords).catch((err) => {
      console.warn('PocketBase sync background warning:', err)
    })

    return {
      success: true,
      message: `Lote importado com sucesso: ${batch.acceptedCount} aceitos, ${batch.quarantinedCount} em quarentena.`,
    }
  }

  private buildCommunicationsFromRecords(
    records: NoxRecord[],
    batch: ImportBatch,
  ): SentinelaCommunication[] {
    return records.map((rec, idx) => {
      const isQuarantine = rec.status === 'quarentena'
      const urgency =
        rec.severity === 'critico'
          ? ('critica' as const)
          : rec.severity === 'alto'
            ? ('alta' as const)
            : rec.severity === 'medio'
              ? ('media' as const)
              : ('baixa' as const)

      return {
        id: `comm-imp-${idx + 1}-${rec.recordCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        externalId: rec.recordCode || `IMP-${idx + 100}`,
        source: 'DJEN' as const,
        numeroProcesso: rec.numeroProcesso,
        tribunal: rec.tribunal || 'TJSP',
        orgaoJulgador: rec.orgaoJulgador || 'Vara Cível',
        comarca: rec.normalizedData?.uf || 'SP',
        classeJudicial: rec.classeJudicial || 'Procedimento Cível',
        destinatario: rec.partes || 'Higor Utinoi de Oliveira (OAB/MS 15.400)',
        tipoComunicacao: isQuarantine
          ? 'INTIMACAO'
          : rec.severity === 'critico'
            ? 'CITACAO'
            : 'INTIMACAO',
        dataDisponibilizacao: rec.dataDistribuicao || new Date().toISOString().split('T')[0],
        dataPublicacao: rec.dataDistribuicao || new Date().toISOString().split('T')[0],
        teorResumido: isQuarantine
          ? `[QUARENTENA SCHEMA] ${rec.alertDescription || 'Registro em quarentena por inconsistência estrutural.'}`
          : `${rec.alertTitle}: ${rec.alertDescription}`,
        teorCompleto: `${rec.alertTitle}. Processo ${rec.numeroProcesso} em trâmite no ${rec.tribunal} (${rec.orgaoJulgador}). Partes: ${rec.partes}. Assunto: ${rec.assunto}.`,
        status: isQuarantine
          ? ('REVISAO_HUMANA' as const)
          : rec.status === 'em_revisao'
            ? ('REVISAO_HUMANA' as const)
            : ('ANALISADA' as const),
        triageCategory: isQuarantine
          ? ('ambigua' as const)
          : urgency === 'critica' || urgency === 'alta'
            ? ('urgente' as const)
            : ('nova' as const),
        urgencyLevel: urgency,
        riskScore:
          urgency === 'critica' ? 95 : urgency === 'alta' ? 80 : urgency === 'media' ? 55 : 25,
        assignedTo: rec.responsible || 'Higor Utinoi de Oliveira',
        custody: {
          communicationId: `comm-imp-${idx + 1}`,
          snapshot: {
            hashSha256: batch.hash,
            capturedAt: batch.createdAt,
            source: 'DJEN',
            externalId: rec.recordCode,
            rawPayloadSnippet: `CSV.${batch.filename}.${rec.recordCode}.${rec.numeroProcesso}`,
            contentLength: batch.byteSize,
            sanitized: true,
            promptInjectionCheck: { clean: true, riskScore: 0 },
          },
          processNumber: rec.numeroProcesso,
          suggestedClassification: isQuarantine
            ? 'Revisão Técnica de Quarentena'
            : `${rec.classeJudicial} (${rec.assunto})`,
          confidence: isQuarantine ? 0.6 : 0.95,
          humanReviewRequired: isQuarantine,
          humanReviewReason: isQuarantine
            ? rec.validationErrors?.map((v) => v.message).join('; ')
            : undefined,
          generatedArtifacts: {},
          isDuplicate: false,
          timeline: [
            {
              id: `step-imp-${idx}-1`,
              stage: 'CAPTURADA',
              timestamp: batch.createdAt,
              actor: 'Importador CSV Sentinela NOX',
              actorRole: 'SISTEMA_IA',
              sourceConfidence: 1.0,
              actionSummary: `Importado do lote ${batch.filename} (Hash SHA-256: ${batch.hash.slice(0, 16)}...).`,
              evidenceHash: batch.hash.slice(0, 16),
            },
            {
              id: `step-imp-${idx}-2`,
              stage: isQuarantine ? 'REVISAO_HUMANA' : 'VALIDADA',
              timestamp: new Date().toISOString(),
              actor: 'Motor de Integridade NOX',
              actorRole: 'SISTEMA_IA',
              sourceConfidence: isQuarantine ? 0.65 : 0.98,
              actionSummary: isQuarantine
                ? 'Registro encaminhado para quarentena técnica.'
                : 'Registro validado com sucesso e disponibilizado para operações.',
            },
          ],
        },
        deadlineCalculated: isQuarantine
          ? undefined
          : {
              id: `dead-imp-${idx + 1}`,
              communicationId: `comm-imp-${idx + 1}`,
              numeroProcesso: rec.numeroProcesso,
              originText: `Intimação referente a ${rec.assunto || rec.alertTitle}`,
              generatingAct: 'DISPONIBILIZACAO_DJEN',
              legalRuleName: 'Prazo Geral de Manifestação (15 dias úteis)',
              legalRuleArticle: 'Art. 219 e 335 do CPC',
              daysCount: 15,
              daysType: 'uteis' as const,
              initialDateMarker: rec.dataDistribuicao || '2026-09-01',
              firstDayCounted: '2026-09-02',
              tribunal: rec.tribunal || 'TJSP',
              comarca: rec.normalizedData?.uf || 'SP',
              holidaysApplied: [
                {
                  date: '2026-09-07',
                  name: 'Independência do Brasil',
                  type: 'FERIADO_NACIONAL' as const,
                },
              ],
              calculationSteps: [
                {
                  stepNumber: 1,
                  date: rec.dataDistribuicao || '2026-09-01',
                  dayOfWeek: 'Terça-feira',
                  isBusinessDay: true,
                  description: 'Disponibilização da publicação no DJEN',
                },
                {
                  stepNumber: 2,
                  date: '2026-09-24',
                  dayOfWeek: 'Quinta-feira',
                  isBusinessDay: true,
                  description: '15º dia útil — Vencimento fatal CPC',
                },
              ],
              finalDeadlineDate: '2026-09-24',
              finalDeadlineTime: '23:59',
              confidenceScore: 0.98,
              confidenceLevel: 'ALTA' as const,
              isDeterminable: true,
              reviewApprovalStatus: 'PENDENTE' as const,
              ruleVersion: 'CPC_2015_V2',
              internalDeadlineDate: '2026-09-22',
              notes: 'Calculado automaticamente pelo Motor de Prazos NOX.',
            },
        createdAt: batch.createdAt,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  private async syncToPocketBase(batch: ImportBatch, records: NoxRecord[]): Promise<void> {
    try {
      const pb = (await import('@/lib/pocketbase/client')).default

      // Save batch in `imports` collection
      await pb.collection('imports').create({
        filename: batch.filename,
        hash: batch.hash,
        encoding: batch.encoding,
        delimiter: batch.delimiter,
        raw_content: batch.rawContent,
        total_rows: batch.totalRows,
        accepted_count: batch.acceptedCount,
        quarantined_count: batch.quarantinedCount,
        rejected_count: batch.rejectedCount,
        mapping_applied: batch.columnMapping,
        stats: {
          status: batch.status,
          importedAt: batch.createdAt,
        },
      })

      // Batch save records in `records` collection
      for (const rec of records) {
        await pb.collection('records').create({
          record_code: rec.recordCode,
          numero_processo: rec.numeroProcesso,
          tribunal: rec.tribunal,
          orgao_julgador: rec.orgaoJulgador,
          classe_judicial: rec.classeJudicial,
          assunto: rec.assunto,
          partes: rec.partes,
          status: rec.status,
          severity: rec.severity,
          alert_type: rec.alertType,
          alert_title: rec.alertTitle,
          alert_description: rec.alertDescription,
          priority: rec.priority,
          responsible: rec.responsible,
          tags: rec.tags,
          notes: rec.notes,
          raw_source_row: rec.rawSourceRow,
          normalized_data: rec.normalizedData,
          validation_errors: rec.validationErrors,
          source_batch_id: batch.id,
          source_row_index: rec.sourceRowIndex,
        })
      }
    } catch (err) {
      console.error('PocketBase sync failed:', err)
    }
  }

  public logAction(
    action: string,
    category: AuditLogEntry['category'],
    actor: string,
    targetId?: string,
    details: Record<string, unknown> = {},
  ): void {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action,
      category,
      actor,
      targetId,
      details,
      ipAddress: '127.0.0.1 (Local Session)',
      createdAt: new Date().toISOString(),
    }
    this.auditLogs.unshift(entry)
    this.saveAuditLogs()
  }

  // ================= Sentinela NOX Getters and Operations =================

  public getCommunications(): SentinelaCommunication[] {
    return [...this.communications]
  }

  public getCommunicationById(id: string): SentinelaCommunication | undefined {
    return this.communications.find((c) => c.id === id || c.externalId === id)
  }

  public saveCommunications() {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMUNICATIONS, JSON.stringify(this.communications))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public addCommunications(newComms: SentinelaCommunication[]): number {
    if (!Array.isArray(newComms) || newComms.length === 0) return 0
    const existingIds = new Set(
      this.communications.map((c) => c.externalId || c.id).filter(Boolean),
    )
    let addedCount = 0
    const toAdd: SentinelaCommunication[] = []

    for (const comm of newComms) {
      const key = comm.externalId || comm.id
      if (key && !existingIds.has(key)) {
        existingIds.add(key)
        toAdd.push(comm)
        addedCount++
      }
    }

    if (toAdd.length > 0) {
      this.communications = [...toAdd, ...this.communications]
      this.saveCommunications()
      this.logAction(
        'COMUNICACOES_DJEN_IMPORTADAS_API',
        'sistema',
        this.getLawyerProfile().nome || 'Operador NOX',
        `LOTE_DJEN_${Date.now()}`,
        { totalAdicionadas: addedCount },
      )
    }

    return addedCount
  }

  public advanceCommunicationStatus(
    commId: string,
    targetStage: SentinelaCommunication['status'],
    actor = 'Operador NOX',
    justification?: string,
  ): boolean {
    const comm = this.communications.find((c) => c.id === commId)
    if (!comm) return false

    const old = comm.status
    comm.status = targetStage
    comm.updatedAt = new Date().toISOString()

    const step = {
      id: `step_${Date.now()}`,
      stage: targetStage,
      timestamp: new Date().toISOString(),
      actor,
      actorRole: 'ADVOGADO_SENIOR' as const,
      sourceConfidence: 1.0,
      actionSummary: `Status da comunicação avançado de "${old}" para "${targetStage}".`,
      justification,
    }
    comm.custody.timeline.unshift(step)

    this.logAction('COMUNICACAO_STATUS_AVANCADO', 'revisao', actor, comm.id, {
      de: old,
      para: targetStage,
      processo: comm.numeroProcesso,
      justificativa: justification,
    })

    this.saveCommunications()
    return true
  }

  public approveCommunicationDeadline(
    commId: string,
    customMemorial: DeadlineMemorial,
    actor?: string,
  ): { task: SentinelaTask; event: AgendaEvent } | null {
    const comm = this.communications.find((c) => c.id === commId)
    if (!comm) return null

    const defaultLawyer = this.settings.lawyerName || 'Higor Utinoi de Oliveira'
    const actualActor = actor || defaultLawyer

    comm.status = 'PRAZO_TAREFA_AGENDA'
    comm.deadlineCalculated = customMemorial
    comm.custody.reviewedBy = actualActor
    comm.custody.reviewedAt = new Date().toISOString()

    // Create Synchronized Task
    const taskId = `task_${Date.now()}`
    const newTask: SentinelaTask = {
      id: taskId,
      title: `Tratar prazo: ${customMemorial.legalRuleName} - ${comm.numeroProcesso}`,
      description: `Originado de ${comm.source} (#${comm.externalId}): ${comm.teorResumido}`,
      status: 'A_FAZER',
      priority:
        comm.urgencyLevel === 'critica' || comm.urgencyLevel === 'alta' ? 'URGENTE' : 'MEDIA',
      responsible: comm.assignedTo || defaultLawyer,
      collaborators: [],
      estimatedHours: 6,
      startDate: new Date().toISOString().split('T')[0],
      internalDueDate: customMemorial.internalDeadlineDate,
      legalDeadlineDate: customMemorial.finalDeadlineDate,
      processNumber: comm.numeroProcesso,
      communicationId: comm.id,
      deadlineId: customMemorial.id,
      subtasks: [
        { id: 'st-1', text: 'Análise aprofundada dos autos', completed: false },
        { id: 'st-2', text: 'Elaboração da peça processual', completed: false },
        { id: 'st-3', text: 'Revisão técnica e protocolo tempestivo', completed: false },
      ],
      dependenciesTaskIds: [],
      isBlocked: false,
      tags: [comm.tribunal, 'Prazo Judicial', customMemorial.daysType],
      comments: [
        {
          id: `c_${Date.now()}`,
          author: actualActor,
          text: 'Prazo homologado pelo Motor de Verdade Temporal.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Create Synchronized Agenda Event
    const eventId = `agenda_${Date.now()}`
    const newEvent: AgendaEvent = {
      id: eventId,
      title: `Vencimento: ${customMemorial.legalRuleName}`,
      description: `Processo ${comm.numeroProcesso} (${comm.tribunal}) - ${comm.teorResumido}`,
      eventType: 'VENCIMENTO_PRAZO',
      startDate: `${customMemorial.finalDeadlineDate}T23:59:59Z`,
      endDate: `${customMemorial.finalDeadlineDate}T23:59:59Z`,
      isAllDay: true,
      isVirtual: false,
      processNumber: comm.numeroProcesso,
      responsible: comm.assignedTo || actualActor,
      participants: [actualActor],
      tribunal: comm.tribunal,
      communicationId: comm.id,
      deadlineId: customMemorial.id,
      taskId: newTask.id,
      status: 'AGENDADO',
      remindersMinutesBefore: [1440, 240, 60],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    comm.custody.generatedArtifacts = {
      deadlineId: customMemorial.id,
      taskId: newTask.id,
      agendaId: newEvent.id,
    }

    comm.custody.timeline.unshift({
      id: `step_${Date.now()}`,
      stage: 'PRAZO_TAREFA_AGENDA',
      timestamp: new Date().toISOString(),
      actor: actualActor,
      actorRole: 'ADVOGADO_SENIOR',
      sourceConfidence: 1.0,
      actionSummary: `Prazo homologado para ${customMemorial.finalDeadlineDate}. Tarefa #${taskId} e Agenda #${eventId} geradas sincronizadamente.`,
      legalBasis: customMemorial.legalRuleArticle,
    })

    this.tasks.unshift(newTask)
    this.agendaEvents.unshift(newEvent)

    this.saveCommunications()
    this.saveTasks()
    this.saveAgenda()

    this.logAction('PRAZO_HOMOLOGADO_E_DISTRIBUIDO', 'revisao', actualActor, comm.id, {
      fatalDate: customMemorial.finalDeadlineDate,
      internalDate: customMemorial.internalDeadlineDate,
      taskId,
      eventId,
    })
    return { task: newTask, event: newEvent }
  }

  // ================= Tasks Operations =================

  public getTasks(): SentinelaTask[] {
    return [...this.tasks]
  }

  public saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public addTask(task: SentinelaTask) {
    this.tasks.unshift(task)
    this.saveTasks()
    this.logAction('TAREFA_CRIADA', 'sistema', task.responsible, task.id, { title: task.title })
  }

  public updateTask(id: string, updates: Partial<SentinelaTask>) {
    const t = this.tasks.find((task) => task.id === id)
    if (!t) return false
    Object.assign(t, updates, { updatedAt: new Date().toISOString() })
    this.saveTasks()
    return true
  }

  public toggleSubtask(taskId: string, subtaskId: string, actor = 'Operador NOX') {
    const t = this.tasks.find((task) => task.id === taskId)
    if (!t) return false
    const st = t.subtasks.find((s) => s.id === subtaskId)
    if (!st) return false
    st.completed = !st.completed
    st.completedAt = st.completed ? new Date().toISOString() : undefined
    st.completedBy = st.completed ? actor : undefined
    t.updatedAt = new Date().toISOString()
    this.saveTasks()
    return true
  }

  // ================= Agenda Operations =================

  public getAgendaEvents(): AgendaEvent[] {
    return [...this.agendaEvents]
  }

  public saveAgenda() {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(this.agendaEvents))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public addAgendaEvent(event: AgendaEvent) {
    this.agendaEvents.unshift(event)
    this.saveAgenda()
    this.logAction('EVENTO_AGENDA_CRIADO', 'sistema', event.responsible, event.id, {
      title: event.title,
      date: event.startDate,
    })
  }

  public updateAgendaEvent(id: string, updates: Partial<AgendaEvent>) {
    const e = this.agendaEvents.find((event) => event.id === id)
    if (!e) return false
    Object.assign(e, updates, { updatedAt: new Date().toISOString() })
    this.saveAgenda()
    return true
  }

  // ================= Automations & Health =================

  public getAutomations(): AutomationRule[] {
    return [...this.automations]
  }

  public toggleAutomation(id: string) {
    const a = this.automations.find((item) => item.id === id)
    if (!a) return
    a.active = !a.active
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(this.automations))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public getApiHealth(): SentinelaApiHealth[] {
    return [...this.apiHealth]
  }

  public getIncidents(): IncidentCrisisRoom[] {
    return [...this.incidents]
  }

  public createIncident(incident: IncidentCrisisRoom) {
    this.incidents.unshift(incident)
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(this.incidents))
    } catch {
      /* ignore */
    }
    this.logAction('SALA_INCIDENTE_ABERTA', 'sistema', incident.incidentLeader, incident.id, {
      title: incident.title,
    })
    this.notify()
  }

  public getLawyerProfile(): {
    nome: string
    oab: string
    uf: string
    email: string
    telefone: string
    escritorio: string
    cargo: string
  } {
    return {
      nome: this.settings.lawyerName || 'Higor Utinoi de Oliveira',
      oab: this.settings.lawyerOab || 'OAB/MS 15.400',
      uf: this.settings.lawyerUf || 'MS',
      email: this.settings.lawyerEmail || 'contato@utinoiadvocacia.com.br',
      telefone: this.settings.lawyerPhone || '(67) 3000-0000',
      escritorio: this.settings.officeName || 'Higor Utinói Advocacia',
      cargo: 'Advogado Titular / Responsável Técnico',
    }
  }

  public updateLawyerProfile(
    profile: Partial<{
      nome: string
      oab: string
      uf: string
      email: string
      telefone: string
      escritorio: string
    }>,
  ) {
    const updates: Partial<AppSettings> = {}
    if (profile.nome !== undefined) {
      updates.lawyerName = profile.nome
      updates.defaultResponsible = profile.nome
    }
    if (profile.oab !== undefined) updates.lawyerOab = profile.oab
    if (profile.uf !== undefined) updates.lawyerUf = profile.uf
    if (profile.email !== undefined) updates.lawyerEmail = profile.email
    if (profile.telefone !== undefined) updates.lawyerPhone = profile.telefone
    if (profile.escritorio !== undefined) updates.officeName = profile.escritorio

    this.saveSettings(updates)
  }

  public getDecisionMemory(): DecisionMemoryItem[] {
    return [...this.decisionMemory]
  }

  public getOperationalTwin(): OperationalTwinCapacity[] {
    return []
  }

  public getGaps(): GapItem[] {
    return []
  }

  public getRecoveredTimeMetric(): RecoveredTimeMetric {
    const automatedCommunications = this.communications.length
    const automatedDeadlines = this.communications.filter((c) => c.deadlineCalculated).length
    const automatedTasks = this.tasks.length

    const commMins = automatedCommunications * 20 // 20 min per manual capture & check
    const deadlineMins = automatedDeadlines * 35 // 35 min per manual court holiday calculation
    const taskMins = automatedTasks * 15 // 15 min per manual distribution

    const totalMins = commMins + deadlineMins + taskMins

    return {
      totalMinutesSaved: totalMins,
      totalActionsAutomated: automatedCommunications + automatedDeadlines + automatedTasks,
      manualBaselineHours: Math.round((totalMins / 60) * 10) / 10,
      actualProcessingHours: Math.round((totalMins / 60) * 0.05 * 10) / 10,
      breakdown: [
        {
          category: 'Captura & Sanitização DJEN/PJe',
          count: automatedCommunications,
          minutesPerUnitSaved: 20,
          totalHours: Math.round((commMins / 60) * 10) / 10,
        },
        {
          category: 'Cálculo de Prazo & Memorial Temporal',
          count: automatedDeadlines,
          minutesPerUnitSaved: 35,
          totalHours: Math.round((deadlineMins / 60) * 10) / 10,
        },
        {
          category: 'Distribuição e Sincronização de Tarefas',
          count: automatedTasks,
          minutesPerUnitSaved: 15,
          totalHours: Math.round((taskMins / 60) * 10) / 10,
        },
      ],
    }
  }

  public getDailyBriefing(): DailyBriefingData {
    const todayStr = new Date().toISOString().split('T')[0]
    const defaultLawyer = this.settings.lawyerName || 'Higor Utinoi de Oliveira'

    const urgentDeadlines = this.communications
      .filter((c) => c.deadlineCalculated && c.deadlineCalculated.finalDeadlineDate === todayStr)
      .map((c) => ({
        id: c.deadlineCalculated!.id,
        process: c.numeroProcesso,
        title: c.deadlineCalculated!.legalRuleName,
        responsible: c.assignedTo || defaultLawyer,
        hoursLeft: 12,
      }))

    const upcomingCommitments = this.agendaEvents.slice(0, 5).map((ev) => ({
      id: ev.id,
      time: ev.startDate.includes('T') ? ev.startDate.split('T')[1].slice(0, 5) : '09:00',
      title: ev.title,
      type: ev.eventType,
      responsible: ev.responsible,
    }))

    const pendingReviews = this.communications.filter(
      (c) => c.status === 'REVISAO_HUMANA' || c.status === 'VALIDADA',
    ).length

    const highRisk = this.records.filter((r) => r.severity === 'critico').length

    return {
      date: todayStr,
      urgentDeadlinesToday: urgentDeadlines,
      upcomingCommitments,
      pendingReviewsCount: pendingReviews,
      highRiskAlertsCount: highRisk,
      captureHealthStatus: 'ESTAVEL',
      bottlenecks:
        this.records.length === 0
          ? ['Nenhum gargalo identificado — aguardando importação de lote Sentinela.']
          : [],
      explainableRecommendations:
        this.records.length === 0
          ? [
              {
                title: 'Importar lote de publicações Sentinela',
                reason: 'O sistema está em estado limpo pronto para receber dados reais.',
                suggestedAction: 'Acessar Importações e carregar o arquivo CSV.',
                targetRoute: '/importacoes',
              },
            ]
          : [],
    }
  }

  public isUsingRealImportedData(): boolean {
    return this.imports.length > 0 && this.records.length > 0
  }

  public getActiveBatch(): ImportBatch | undefined {
    return this.imports[0]
  }

  public clearAllData(): void {
    this.records = []
    this.imports = []
    this.auditLogs = []
    this.communications = []
    this.tasks = []
    this.agendaEvents = []
    this.incidents = []
    this.decisionMemory = []
    this.clients = []
    this.productionItems = []

    try {
      localStorage.removeItem(STORAGE_KEYS.RECORDS)
      localStorage.removeItem(STORAGE_KEYS.IMPORTS)
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
      localStorage.removeItem(STORAGE_KEYS.COMMUNICATIONS)
      localStorage.removeItem(STORAGE_KEYS.TASKS)
      localStorage.removeItem(STORAGE_KEYS.AGENDA)
      localStorage.removeItem(STORAGE_KEYS.INCIDENTS)
      localStorage.removeItem(STORAGE_KEYS.DECISION_MEMORY)
      localStorage.removeItem(STORAGE_KEYS.CLIENTS)
      localStorage.removeItem(STORAGE_KEYS.PRODUCTION)
    } catch {
      /* ignore */
    }

    this.notify()
  }

  public resetToSyntheticDemo(): void {
    this.clearAllData()
    this.clients = this.generateInitialClients()
    this.saveClients()
    this.productionItems = this.generateInitialProductionItems(this.clients)
    this.saveProductionItems()
  }
}

export const dataStore = NoxDataStore.getInstance()
