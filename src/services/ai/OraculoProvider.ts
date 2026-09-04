/**
 * Interface conceitual desacoplada de Provedor de IA para o Oraculo NOX.
 * Permite alternar providers (Gemini, Skip AI, OpenAI, Claude) futuramente sem alterar a UI.
 * Provider atual: Skip AI Gateway + Google Gemini Proxy.
 */

export interface OraculoContext {
  activeCommsSummary?: string
  lawyerName?: string
  officeName?: string
  totalMonitored?: number
}

export interface OraculoResponse {
  answer: string
  confidence: number
  modelUsed: string
  citations?: string[]
  isFallback?: boolean
}

export interface IOraculoProvider {
  name: string
  ask(prompt: string, context?: OraculoContext): Promise<OraculoResponse>
}

export class SkipAiOraculoProvider implements IOraculoProvider {
  public name = 'Skip AI Gateway / Google Gemini'

  public async ask(prompt: string, context?: OraculoContext): Promise<OraculoResponse> {
    const { queryOraculoGemini } = await import('@/services/aiOraculoService')
    const res = await queryOraculoGemini({
      messages: [{ role: 'user', content: prompt }],
      contexto: context?.activeCommsSummary || `Advogado: ${context?.lawyerName || 'Higor Utinoi'}`,
      commsFallback: [],
    })

    return {
      answer: res.content,
      confidence: res.isFallback ? 0.7 : 0.95,
      modelUsed: res.model,
      isFallback: res.isFallback,
    }
  }
}

export const defaultOraculoProvider: IOraculoProvider = new SkipAiOraculoProvider()
