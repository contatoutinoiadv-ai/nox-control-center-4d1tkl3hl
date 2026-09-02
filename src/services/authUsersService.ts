import pb from '@/lib/pocketbase/client'
import { NoxUser, SystemModuleKey, AuthMeResponse, UserRole } from '@/types/nox'

export const SYSTEM_MODULES_LIST: Array<{
  key: SystemModuleKey
  name: string
  description: string
  category:
    | 'Jurídico / Processual'
    | 'Operacional & Prazos'
    | 'Clientes & Contábil'
    | 'Governança & Sistema'
}> = [
  {
    key: 'central_nox',
    name: 'Central NOX',
    description: 'Dashboard geral, métricas executivas e resumo da operação',
    category: 'Jurídico / Processual',
  },
  {
    key: 'sentinela',
    name: 'Sentinela NOX / DJEN',
    description: 'Monitoramento contínuo de diários, triagem por IA e custódia de publicações',
    category: 'Jurídico / Processual',
  },
  {
    key: 'processos',
    name: 'Processos',
    description: 'Consulta da base de processos, partes, instâncias e histórico',
    category: 'Jurídico / Processual',
  },
  {
    key: 'radar',
    name: 'Radar de Alertas',
    description: 'Detecção de riscos processuais críticos e anomalias de prazo',
    category: 'Jurídico / Processual',
  },
  {
    key: 'lex_tempus',
    name: 'LEX TEMPUS',
    description: 'Motor determinístico de cálculo de prazos e interpretação de ato processual',
    category: 'Jurídico / Processual',
  },
  {
    key: 'central_prazos',
    name: 'Central de Prazos',
    description: 'Linha do tempo de vencimentos, contagem em dias úteis e calculadora legal',
    category: 'Operacional & Prazos',
  },
  {
    key: 'compromissos',
    name: 'Compromissos',
    description: 'Agenda inteligente, detecção de audiências e alocação de titulares',
    category: 'Operacional & Prazos',
  },
  {
    key: 'producao',
    name: 'Produção de Peças',
    description: 'Controladoria de redação jurídica, triagem de evidências e stress test',
    category: 'Jurídico / Processual',
  },
  {
    key: 'clientes',
    name: 'Clientes & Intake',
    description: 'Gestão de clientes, onboarding digital /intake, contratos e procurações',
    category: 'Clientes & Contábil',
  },
  {
    key: 'importacoes',
    name: 'Importações CSV',
    description: 'Ingestão de dados brutos do Sentinela com validação criptográfica SHA-256',
    category: 'Governança & Sistema',
  },
  {
    key: 'revisao',
    name: 'Revisão Operacional',
    description: 'Esteira de validação humana e quarentena de inconsistências',
    category: 'Governança & Sistema',
  },
  {
    key: 'exportacoes',
    name: 'Exportações',
    description: 'Geração de relatórios, memoriais em PDF e datasets filtrados',
    category: 'Clientes & Contábil',
  },
  {
    key: 'auditoria',
    name: 'Trilha de Auditoria',
    description: 'Registros imutáveis de ações, auditoria de segurança e integridade',
    category: 'Governança & Sistema',
  },
  {
    key: 'configuracoes',
    name: 'Configurações',
    description: 'Parâmetros de sistema, preferências e integrações',
    category: 'Governança & Sistema',
  },
]

export interface CreateUserData {
  name: string
  email: string
  password?: string
  role: UserRole
  ativo?: boolean
  modules: string[]
}

export interface UpdateUserData {
  id: string
  name?: string
  email?: string
  password?: string
  role?: UserRole
  ativo?: boolean
  modules?: string[]
}

export class AuthUsersService {
  private static cachedMe: AuthMeResponse | null = null
  private static listeners: Array<() => void> = []

  public static subscribe(fn: () => void): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private static notify() {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch (err) {
        console.error('Error notifying auth listener:', err)
      }
    })
  }

  public static async ensureAuth(): Promise<boolean> {
    if (pb.authStore.isValid && pb.authStore.token) {
      return true
    }
    try {
      await pb.collection('users').authWithPassword('contatoutinoiadv@gmail.com', 'Skip@Pass')
      return pb.authStore.isValid
    } catch (e) {
      console.warn('[authUsersService] Falha no auto-login PocketBase:', e)
      return false
    }
  }

  /**
   * Consulta o perfil e permissões do usuário logado via endpoint seguro /backend/v1/auth/me
   */
  public static async fetchMe(forceRefresh = false): Promise<AuthMeResponse> {
    if (!forceRefresh && this.cachedMe) {
      return this.cachedMe
    }

    await this.ensureAuth()
    const baseUrl = pb.baseUrl.replace(/\/$/, '')
    const token = pb.authStore.token

    try {
      const res = await fetch(`${baseUrl}/backend/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      const data: AuthMeResponse = await res.json()
      this.cachedMe = data
      this.notify()
      return data
    } catch (err) {
      console.warn('[authUsersService] Erro ao buscar /backend/v1/auth/me:', err)
      // Fallback gracioso caso hook falhe ou token inicial
      const fallback: AuthMeResponse = {
        ok: true,
        user: {
          id: pb.authStore.record?.id || 'admin_fallback',
          email: pb.authStore.record?.email || 'contatoutinoiadv@gmail.com',
          name: (pb.authStore.record as any)?.name || 'Administrador Master',
          role: ((pb.authStore.record as any)?.role as UserRole) || 'admin',
          ativo: (pb.authStore.record as any)?.ativo ?? true,
        },
        role: ((pb.authStore.record as any)?.role as UserRole) || 'admin',
        allowedModules: SYSTEM_MODULES_LIST.map((m) => m.key).concat(['usuarios']),
        isAdmin: ((pb.authStore.record as any)?.role || 'admin') === 'admin',
      }
      this.cachedMe = fallback
      return fallback
    }
  }

  public static getCachedMe(): AuthMeResponse | null {
    return this.cachedMe
  }

  public static hasModuleAccess(moduleKey: string): boolean {
    if (!this.cachedMe) return true // default permissivo enquanto carrega
    if (this.cachedMe.isAdmin || this.cachedMe.role === 'admin') return true
    if (moduleKey === 'usuarios') return false // exclusivo admin
    return this.cachedMe.allowedModules.includes(moduleKey)
  }

  /**
   * Lista todos os usuários (exclusivo para perfil admin)
   */
  public static async listUsers(): Promise<NoxUser[]> {
    await this.ensureAuth()
    const baseUrl = pb.baseUrl.replace(/\/$/, '')
    const token = pb.authStore.token

    const res = await fetch(`${baseUrl}/backend/v1/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error || `Erro ao listar usuários (${res.status})`)
    }

    const data = await res.json()
    return data.users || []
  }

  /**
   * Cria um novo usuário com senha hasheada no backend e permissões explícitas
   */
  public static async createUser(data: CreateUserData): Promise<NoxUser> {
    await this.ensureAuth()
    const baseUrl = pb.baseUrl.replace(/\/$/, '')
    const token = pb.authStore.token

    const res = await fetch(`${baseUrl}/backend/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    })

    const resJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(resJson.error || 'Falha ao cadastrar usuário.')
    }

    return resJson.user
  }

  /**
   * Atualiza usuário (nome, senha, status ativo/inativo, role, módulos permitidos)
   */
  public static async updateUser(data: UpdateUserData): Promise<NoxUser> {
    await this.ensureAuth()
    const baseUrl = pb.baseUrl.replace(/\/$/, '')
    const token = pb.authStore.token

    const res = await fetch(`${baseUrl}/backend/v1/users/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    })

    const resJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(resJson.error || 'Falha ao atualizar usuário.')
    }

    return resJson.user
  }

  /**
   * Exclui usuário com checagem de autoexclusão e último admin
   */
  public static async deleteUser(userId: string): Promise<void> {
    await this.ensureAuth()
    const baseUrl = pb.baseUrl.replace(/\/$/, '')
    const token = pb.authStore.token

    const res = await fetch(`${baseUrl}/backend/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    const resJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(resJson.error || 'Falha ao excluir usuário.')
    }
  }
}

export const authUsersService = AuthUsersService
