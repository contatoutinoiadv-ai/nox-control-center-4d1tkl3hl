/**
 * Regras e transições de status da Central de Atendimento NOX.
 *
 * Mapeamentos canônicos entre a camada de UI (PT-BR) e os enums do PocketBase (DB).
 */

import {
  ConversationStatus,
  ConversationPriority,
  NoxDbStatus,
  NoxDbPriority,
} from '@/types/atendimento'

export const STATUS_UI_TO_DB: Record<ConversationStatus, NoxDbStatus> = {
  NOVA: 'NEW',
  EM_TRIAGEM: 'TRIAGE',
  EM_ATENDIMENTO: 'IN_PROGRESS',
  AGUARDANDO_CLIENTE: 'WAITING_CLIENT',
  AGUARDANDO_ESCRITORIO: 'WAITING_OFFICE',
  AGUARDANDO_DOCUMENTO: 'WAITING_DOCUMENT',
  CONCLUIDA: 'COMPLETED',
  ARQUIVADA: 'ARCHIVED',
}

export const STATUS_DB_TO_UI: Record<NoxDbStatus, ConversationStatus> = {
  NEW: 'NOVA',
  TRIAGE: 'EM_TRIAGEM',
  IN_PROGRESS: 'EM_ATENDIMENTO',
  WAITING_CLIENT: 'AGUARDANDO_CLIENTE',
  WAITING_OFFICE: 'AGUARDANDO_ESCRITORIO',
  WAITING_DOCUMENT: 'AGUARDANDO_DOCUMENTO',
  COMPLETED: 'CONCLUIDA',
  ARCHIVED: 'ARQUIVADA',
}

export const PRIORITY_UI_TO_DB: Record<ConversationPriority, NoxDbPriority> = {
  CRITICA: 'CRITICAL',
  ALTA: 'HIGH',
  MEDIA: 'MEDIUM',
  BAIXA: 'LOW',
}

export const PRIORITY_DB_TO_UI: Record<NoxDbPriority, ConversationPriority> = {
  CRITICAL: 'CRITICA',
  HIGH: 'ALTA',
  MEDIUM: 'MEDIA',
  LOW: 'BAIXA',
}

/**
 * Grafo de transições válidas de status de atendimento no NOX.
 * Protege contra saltos de estado arbitrários.
 */
export const VALID_STATUS_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  NOVA: ['EM_TRIAGEM', 'EM_ATENDIMENTO', 'ARQUIVADA'],
  EM_TRIAGEM: [
    'EM_ATENDIMENTO',
    'AGUARDANDO_DOCUMENTO',
    'AGUARDANDO_CLIENTE',
    'CONCLUIDA',
    'ARQUIVADA',
  ],
  EM_ATENDIMENTO: [
    'AGUARDANDO_CLIENTE',
    'AGUARDANDO_ESCRITORIO',
    'AGUARDANDO_DOCUMENTO',
    'CONCLUIDA',
    'ARQUIVADA',
  ],
  AGUARDANDO_CLIENTE: ['EM_ATENDIMENTO', 'AGUARDANDO_ESCRITORIO', 'CONCLUIDA', 'ARQUIVADA'],
  AGUARDANDO_ESCRITORIO: ['EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'CONCLUIDA', 'ARQUIVADA'],
  AGUARDANDO_DOCUMENTO: ['EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'CONCLUIDA', 'ARQUIVADA'],
  CONCLUIDA: ['EM_ATENDIMENTO', 'ARQUIVADA', 'NOVA'],
  ARQUIVADA: ['NOVA', 'EM_ATENDIMENTO'],
}

export function isValidStatusTransition(
  fromStatus: ConversationStatus,
  toStatus: ConversationStatus,
): boolean {
  if (fromStatus === toStatus) return true
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus] || []
  return allowed.includes(toStatus)
}

export function isValidPriority(priority: string): priority is ConversationPriority {
  return ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'].includes(priority)
}

export function isValidDbPriority(priority: string): priority is NoxDbPriority {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority)
}
