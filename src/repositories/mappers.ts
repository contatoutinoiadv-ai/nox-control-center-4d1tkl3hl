/**
 * Mappers e conversores entre registros PocketBase e modelos de dominio.
 */

import { NoxClient, ProductionItem, AuditLogEntry } from '@/types/nox'
import { AgendaEvent, SentinelaTask, SentinelaCommunication } from '@/types/sentinela'
import { ProcessoMonitorado, MovimentacaoProcesso } from '@/services/datajudService'

export function mapRecordToClient(rec: any): NoxClient {
  return {
    id: rec.id,
    clientCode: rec.client_code || `CLI-${rec.id.slice(0, 4)}`,
    protocolo: rec.protocolo || `INT-${rec.id.slice(0, 4)}`,
    nome: rec.nome || '',
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
    docsGerados: Array.isArray(rec.docs_gerados) ? rec.docs_gerados : [],
    processosVinculados: Array.isArray(rec.processos_vinculados) ? rec.processos_vinculados : [],
    obs: rec.obs,
    responsavel: rec.responsavel || 'Higor Utinoi de Oliveira',
    alegacoesProcesso: rec.alegacoes_processo || undefined,
    aprovadoParaCliente: !!rec.aprovado_para_cliente,
    createdAt: rec.created,
    updatedAt: rec.updated,
  }
}

export function mapClientToRecordPayload(client: Partial<NoxClient>): Record<string, any> {
  const payload: Record<string, any> = {}
  if (client.clientCode !== undefined) payload.client_code = client.clientCode
  if (client.protocolo !== undefined) payload.protocolo = client.protocolo
  if (client.nome !== undefined) payload.nome = client.nome
  if (client.cpf !== undefined) payload.cpf = client.cpf
  if (client.rg !== undefined) payload.rg = client.rg
  if (client.telefone !== undefined) payload.telefone = client.telefone
  if (client.email !== undefined) payload.email = client.email
  if (client.endereco !== undefined) payload.endereco = client.endereco
  if (client.profissao !== undefined) payload.profissao = client.profissao
  if (client.nacionalidade !== undefined) payload.nacionalidade = client.nacionalidade
  if (client.estadoCivil !== undefined) payload.estado_civil = client.estadoCivil
  if (client.demanda !== undefined) payload.demanda = client.demanda
  if (client.descricaoCaso !== undefined) payload.descricao_caso = client.descricaoCaso
  if (client.origem !== undefined) payload.origem = client.origem
  if (client.estagio !== undefined) payload.estagio = client.estagio
  if (client.docsGerados !== undefined) payload.docs_gerados = client.docsGerados
  if (client.processosVinculados !== undefined)
    payload.processos_vinculados = client.processosVinculados
  if (client.obs !== undefined) payload.obs = client.obs
  if (client.responsavel !== undefined) payload.responsavel = client.responsavel
  if (client.alegacoesProcesso !== undefined) payload.alegacoes_processo = client.alegacoesProcesso
  if (client.aprovadoParaCliente !== undefined)
    payload.aprovado_para_cliente = client.aprovadoParaCliente
  return payload
}

export function mapRecordToAppointment(rec: any): AgendaEvent {
  return {
    id: rec.id,
    title: rec.title || '',
    description: rec.description || '',
    eventType: rec.event_type || 'AUDIENCIA',
    startDate: rec.start_date || '',
    endDate: rec.end_date || '',
    isAllDay: !!rec.is_all_day,
    locationOrLink: rec.location_or_link || '',
    isVirtual: !!rec.is_virtual,
    processNumber: rec.process_number || '',
    responsible: rec.responsible || 'Higor Utinoi de Oliveira',
    participants: Array.isArray(rec.participants) ? rec.participants : [],
    tribunal: rec.tribunal || '',
    communicationId: rec.communication_id || '',
    status: rec.status || 'CONFIRMADO',
    preparacaoHabilitada: !!rec.preparacao_habilitada,
    clientId: rec.client_id || '',
    clientCpf: rec.client_cpf || '',
    clientName: rec.client_name || '',
    alegacoesProcesso: rec.alegacoes_processo || undefined,
    aprovadoParaCliente: !!rec.aprovado_para_cliente,
    tipoAudiencia: rec.tipo_audiencia || undefined,
    remindersMinutesBefore: [1440, 60],
    createdAt: rec.created,
    updatedAt: rec.updated,
  }
}

export function mapAppointmentToRecordPayload(event: Partial<AgendaEvent>): Record<string, any> {
  const payload: Record<string, any> = {}
  if (event.title !== undefined) payload.title = event.title
  if (event.description !== undefined) payload.description = event.description
  if (event.eventType !== undefined) payload.event_type = event.eventType
  if (event.startDate !== undefined) payload.start_date = event.startDate
  if (event.endDate !== undefined) payload.end_date = event.endDate
  if (event.isAllDay !== undefined) payload.is_all_day = !!event.isAllDay
  if (event.locationOrLink !== undefined) payload.location_or_link = event.locationOrLink
  if (event.isVirtual !== undefined) payload.is_virtual = !!event.isVirtual
  if (event.processNumber !== undefined) payload.process_number = event.processNumber
  if (event.responsible !== undefined) payload.responsible = event.responsible
  if (event.participants !== undefined) payload.participants = event.participants
  if (event.tribunal !== undefined) payload.tribunal = event.tribunal
  if (event.communicationId !== undefined) payload.communication_id = event.communicationId
  if (event.status !== undefined) payload.status = event.status
  if (event.preparacaoHabilitada !== undefined)
    payload.preparacao_habilitada = !!event.preparacaoHabilitada
  if (event.clientId !== undefined) payload.client_id = event.clientId
  if (event.clientCpf !== undefined) payload.client_cpf = event.clientCpf
  if (event.clientName !== undefined) payload.client_name = event.clientName
  if (event.alegacoesProcesso !== undefined) payload.alegacoes_processo = event.alegacoesProcesso
  if (event.aprovadoParaCliente !== undefined)
    payload.aprovado_para_cliente = !!event.aprovadoParaCliente
  if (event.tipoAudiencia !== undefined) payload.tipo_audiencia = event.tipoAudiencia
  return payload
}

export function mapRecordToTask(rec: any): SentinelaTask {
  return {
    id: rec.id,
    title: rec.title || '',
    description: rec.description || '',
    status: rec.status || 'PENDENTE',
    priority: rec.priority || 'media',
    responsible: rec.responsible || 'Higor Utinoi de Oliveira',
    collaborators: Array.isArray(rec.collaborators) ? rec.collaborators : [],
    dependenciesTaskIds: Array.isArray(rec.dependencies_task_ids) ? rec.dependencies_task_ids : [],
    estimatedHours: rec.estimated_hours || 1,
    internalDueDate: rec.internal_due_date || '',
    legalDeadlineDate: rec.legal_deadline_date || '',
    processNumber: rec.process_number || '',
    clientName: rec.client_name || '',
    communicationId: rec.communication_id || '',
    deadlineId: rec.deadline_id || '',
    subtasks: Array.isArray(rec.subtasks) ? rec.subtasks : [],
    isBlocked: !!rec.is_blocked,
    blockReason: rec.block_reason || '',
    tags: Array.isArray(rec.tags) ? rec.tags : [],
    comments: Array.isArray(rec.comments) ? rec.comments : [],
    createdAt: rec.created,
    updatedAt: rec.updated,
  }
}

export function mapTaskToRecordPayload(task: Partial<SentinelaTask>): Record<string, any> {
  const payload: Record<string, any> = {}
  if (task.title !== undefined) payload.title = task.title
  if (task.description !== undefined) payload.description = task.description
  if (task.status !== undefined) payload.status = task.status
  if (task.priority !== undefined) payload.priority = task.priority
  if (task.responsible !== undefined) payload.responsible = task.responsible
  if (task.collaborators !== undefined) payload.collaborators = task.collaborators
  if (task.dependenciesTaskIds !== undefined)
    payload.dependencies_task_ids = task.dependenciesTaskIds
  if (task.estimatedHours !== undefined) payload.estimated_hours = task.estimatedHours
  if (task.internalDueDate !== undefined) payload.internal_due_date = task.internalDueDate
  if (task.legalDeadlineDate !== undefined) payload.legal_deadline_date = task.legalDeadlineDate
  if (task.processNumber !== undefined) payload.process_number = task.processNumber
  if (task.clientName !== undefined) payload.client_name = task.clientName
  if (task.communicationId !== undefined) payload.communication_id = task.communicationId
  if (task.deadlineId !== undefined) payload.deadline_id = task.deadlineId
  if (task.subtasks !== undefined) payload.subtasks = task.subtasks
  if (task.isBlocked !== undefined) payload.is_blocked = !!task.isBlocked
  if (task.blockReason !== undefined) payload.block_reason = task.blockReason
  if (task.tags !== undefined) payload.tags = task.tags
  if (task.comments !== undefined) payload.comments = task.comments
  return payload
}

export function mapRecordToProductionItem(rec: any): ProductionItem {
  return {
    id: rec.id,
    clientId: rec.client_id || '',
    clientName: rec.client_name || '',
    clientCode: rec.client_code || '',
    numeroProcesso: rec.numero_processo || undefined,
    tituloPeca: rec.titulo_peca || '',
    nivel: rec.nivel || 1,
    estagio: rec.estagio || 'triagem_evidencias',
    responsavel: rec.responsavel || 'Higor Utinoi de Oliveira',
    triagemEvidencias: rec.triagem_evidencias || {
      essencial: 0,
      util: 0,
      neutro: 0,
      perigoso: 0,
      dispensavel: 0,
      completa: false,
      itensDetalhados: [],
    },
    teseDominante: rec.tese_dominante || '',
    motivoTravamento: rec.motivo_travamento || '',
    dataEntradaEstagioAtual: rec.data_entrada_estagio_atual || rec.created,
    stressTestAprovado: !!rec.stress_test_aprovado,
    stressTestDetalhes: rec.stress_test_detalhes || {
      tecnicaJuridica: false,
      coerenciaNarrativa: false,
      humanizacao: false,
    },
    historicoEstagios: Array.isArray(rec.historico_estagios) ? rec.historico_estagios : [],
    createdAt: rec.created,
    updatedAt: rec.updated,
  }
}

export function mapProductionItemToRecordPayload(
  item: Partial<ProductionItem>,
): Record<string, any> {
  const payload: Record<string, any> = {}
  if (item.clientId !== undefined) payload.client_id = item.clientId
  if (item.clientName !== undefined) payload.client_name = item.clientName
  if (item.clientCode !== undefined) payload.client_code = item.clientCode
  if (item.numeroProcesso !== undefined) payload.numero_processo = item.numeroProcesso
  if (item.tituloPeca !== undefined) payload.titulo_peca = item.tituloPeca
  if (item.nivel !== undefined) payload.nivel = item.nivel
  if (item.estagio !== undefined) payload.estagio = item.estagio
  if (item.responsavel !== undefined) payload.responsavel = item.responsavel
  if (item.triagemEvidencias !== undefined) payload.triagem_evidencias = item.triagemEvidencias
  if (item.teseDominante !== undefined) payload.tese_dominante = item.teseDominante
  if (item.motivoTravamento !== undefined) payload.motivo_travamento = item.motivoTravamento
  if (item.dataEntradaEstagioAtual !== undefined)
    payload.data_entrada_estagio_atual = item.dataEntradaEstagioAtual
  if (item.stressTestAprovado !== undefined)
    payload.stress_test_aprovado = !!item.stressTestAprovado
  if (item.stressTestDetalhes !== undefined) payload.stress_test_detalhes = item.stressTestDetalhes
  if (item.historicoEstagios !== undefined) payload.historico_estagios = item.historicoEstagios
  return payload
}

export function mapRecordToAuditLog(rec: any): AuditLogEntry {
  return {
    id: rec.id,
    createdAt: rec.created,
    action: rec.action || '',
    category: rec.category || 'sistema',
    actor: rec.actor || 'Sistema NOX',
    targetId: rec.target_id || '',
    details: rec.details || {},
    ipAddress: rec.ip_address || 'local',
  }
}
