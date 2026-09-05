/**
 * EvolutionGateway — Camada exclusiva de comunicação com a integração WhatsApp / Evolution.
 *
 * REGRA ABSOLUTA DE SEGURANÇA:
 * 1. O frontend JAMAIS fala diretamente com a Evolution API nem manipula segredos.
 * 2. Todas as operações de diagnóstico, health check, kill switch e envio passam pelos endpoints
 *    backend próprios do NOX (/api/integrations/evolution/*).
 * 3. Ausência de credenciais resulta em estado seguro NOT_CONFIGURED, sem lançar erros de runtime.
 * 4. PROTEÇÃO ABSOLUTA DA NOTA INTERNA: O gateway recusa sumariamente qualquer tentativa de envio
 *    de nota interna, em múltiplas camadas (TypeScript types + runtime check defensivo).
 */

import pb from '@/lib/pocketbase/client'
import {
  IMessagingProvider,
  IntegrationHealthResponse,
  SendTextMessagePayload,
  GatewaySendResult,
  DiscoveryResponse,
} from '@/types/gateway'

export class EvolutionGateway implements IMessagingProvider {
  public readonly providerName = 'EVOLUTION'
  private static instance: EvolutionGateway | null = null

  public static getInstance(): EvolutionGateway {
    if (!EvolutionGateway.instance) {
      EvolutionGateway.instance = new EvolutionGateway()
    }
    return EvolutionGateway.instance
  }

  /**
   * Consulta a saúde da integração via backend próprio.
   * Se os segredos estiverem ausentes no servidor, responde NOT_CONFIGURED de forma limpa.
   */
  public async checkHealth(): Promise<IntegrationHealthResponse> {
    try {
      const response = await fetch(`${pb.baseURL}/api/integrations/evolution/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
        },
      })

      if (!response.ok) {
        return {
          configured: false,
          status: 'NOT_CONFIGURED',
          instanceName: null,
          killSwitchActive: false,
          discoveryStatus: 'NOT_CONFIGURED',
          details: `Backend respondeu status ${response.status}`,
          checkedAt: new Date().toISOString(),
        }
      }

      const data = await response.json()
      return {
        configured: Boolean(data.configured),
        status: data.status || 'UNKNOWN',
        instanceName: data.instanceName || null,
        killSwitchActive: Boolean(data.killSwitchActive),
        discoveryStatus: data.discoveryStatus || 'PENDING',
        detectedVersion: data.detectedVersion || null,
        details: data.details,
        checkedAt: data.checkedAt || new Date().toISOString(),
      }
    } catch {
      return {
        configured: false,
        status: 'NOT_CONFIGURED',
        instanceName: null,
        killSwitchActive: false,
        discoveryStatus: 'NOT_CONFIGURED',
        details: 'Serviço backend indisponível ou não configurado.',
        checkedAt: new Date().toISOString(),
      }
    }
  }

  /**
   * Executa a rotina de descoberta automática via backend próprio.
   */
  public async runDiscovery(): Promise<DiscoveryResponse> {
    try {
      const response = await fetch(`${pb.baseURL}/api/integrations/evolution/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
        },
      })

      const data = await response.json()
      return {
        success: Boolean(data.success),
        status: data.status || 'NOT_CONFIGURED',
        discoveryId: data.discoveryId || null,
        version: data.version || null,
        instanceName: data.instanceName || null,
        instanceState: data.instanceState || null,
        endpoints: data.endpoints || {},
        errors: data.errors || null,
        executedAt: data.executedAt || new Date().toISOString(),
        missing: data.missing,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        errors: err.message || 'Falha de rede ao acionar descoberta.',
        executedAt: new Date().toISOString(),
      }
    }
  }

  /**
   * Aciona ou desativa o Kill Switch administrativo
   */
  public async toggleKillSwitch(active: boolean, reason?: string): Promise<boolean> {
    try {
      const response = await fetch(`${pb.baseURL}/api/integrations/evolution/killswitch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
        },
        body: JSON.stringify({ active, reason }),
      })
      if (!response.ok) return false
      const data = await response.json()
      return Boolean(data.success)
    } catch {
      return false
    }
  }

  /**
   * Envia mensagem de texto externa via Gateway backend.
   *
   * PROTEÇÃO ABSOLUTA MULTI-CAMADA DA NOTA INTERNA:
   * Rejeita sumariamente qualquer payload que contenha atributos de nota interna.
   */
  public async sendTextMessage(
    payload:
      | SendTextMessagePayload
      | { isInternalNote?: boolean; type?: string; collection?: string },
  ): Promise<GatewaySendResult> {
    // CAMADA 1: Proteção em Runtime contra Nota Interna
    const unsafePayload = payload as any
    if (
      unsafePayload.isInternalNote === true ||
      unsafePayload.type === 'INTERNAL_NOTE' ||
      unsafePayload.collection === 'nox_internal_notes' ||
      (unsafePayload.metadata && unsafePayload.metadata.isInternalNote === true)
    ) {
      console.error(
        '[EvolutionGateway] BLOQUEIO CRÍTICO DE SEGURANÇA: Tentativa de envio de nota interna pelo gateway.',
      )
      return {
        success: false,
        status: 'FAILED',
        error:
          'VIOLAÇÃO DE SEGURANÇA: Uma nota interna (nox_internal_notes) NUNCA pode ser enviada ao WhatsApp.',
      }
    }

    try {
      const response = await fetch(`${pb.baseURL}/api/integrations/evolution/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.status === 423) {
        return {
          success: false,
          status: 'BLOCKED_BY_KILL_SWITCH',
          error: data.error || 'Envio suspenso temporariamente via Kill Switch administrativo.',
        }
      }

      if (response.status === 503) {
        return {
          success: false,
          status: 'NOT_CONFIGURED',
          error:
            data.error ||
            'Integração WhatsApp não configurada. Cadastre os segredos no painel Skip Cloud.',
        }
      }

      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          error: data.error || `Falha no envio (HTTP ${response.status})`,
        }
      }

      return {
        success: true,
        status: 'SENT',
        externalMessageId: data.externalMessageId || null,
        sentAt: data.sentAt || new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message || 'Erro de comunicação com o gateway backend.',
      }
    }
  }
}

export const evolutionGateway = EvolutionGateway.getInstance()
