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

  public static isAuthenticated(): boolean {
    return Boolean(pb.authStore.isValid && pb.authStore.token && pb.authStore.record)
  }

  public static async ensureAuth(): Promise<boolean> {
    return this.isAuthenticated()
  }

  /**
   * Realiza login real contra a coleção `users` do PocketBase,
   * valida se a conta está ativa e audita a sessão em `audit_logs`.
   */
  public static async login(emailInput: string, passwordInput: string): Promise<AuthMeResponse> {
    const cleanEmail = emailInput.trim().toLowerCase()
    const cleanPassword = passwordInput.trim()

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Informe o e-mail e a senha de acesso.')
    }

    try {
      const authData = await pb.collection('users').authWithPassword(cleanEmail, cleanPassword)
      const record = authData.record as any

      if (record && record.ativo === false) {
        pb.authStore.clear()
        this.cachedMe = null
        this.notify()
        throw new Error('Conta inativa ou suspensa. Contate o administrador do escritório.')
      }

      // Busca o perfil completo e permissões reais
      const me = await this.fetchMe(true)

      // Registra login bem-sucedido em audit_logs
      try {
        await pb.collection('audit_logs').create({
          action: 'LOGIN_SUCESSO',
          category: 'sistema',
          actor: cleanEmail,
          target_id: record?.id || 'unknown',
          details: {
            email: cleanEmail,
            name: record?.name || 'Usuário',
            role: record?.role || 'operador',
            timestamp: new Date().toISOString(),
          },
          ip_address: 'client_browser',
        })
      } catch (logErr) {
        console.warn('[authUsersService] Não foi possível salvar auditoria de login:', logErr)
      }

      return me
    } catch (err: any) {
      console.error('[authUsersService] Erro ao autenticar:', err)
      const msg = err.message || ''
      if (
        msg.includes('Failed to authenticate') ||
        msg.includes('Invalid') ||
        msg.includes('400') ||
        msg.includes('credentials')
      ) {
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
      throw new Error(msg || 'Erro ao realizar login.')
    }
  }

  /**
   * Encerra a sessão atual e limpa estado
   */
  public static async logout(): Promise<void> {
    const currentActor = this.cachedMe?.user.email || pb.authStore.record?.email || 'usuario'
    const currentId = this.cachedMe?.user.id || pb.authStore.record?.id

    try {
      if (pb.authStore.isValid && pb.authStore.token) {
        await pb.collection('audit_logs').create({
          action: 'LOGOUT',
          category: 'sistema',
          actor: currentActor,
          target_id: currentId || 'unknown',
          details: {
            email: currentActor,
            timestamp: new Date().toISOString(),
          },
          ip_address: 'client_browser',
        })
      }
    } catch (logErr) {
      console.warn('[authUsersService] Não foi possível salvar auditoria de logout:', logErr)
    }

    pb.authStore.clear()
    this.cachedMe = null
    this.notify()
  }

  /**
   * Consulta o perfil e permissões do usuário logado via endpoint seguro /backend/v1/auth/me
   */
  public static async fetchMe(forceRefresh = false): Promise<AuthMeResponse> {
    if (!forceRefresh && this.cachedMe) {
      return this.cachedMe
    }

    if (!pb.authStore.isValid || !pb.authStore.token) {
      this.cachedMe = null
      this.notify()
      throw new Error('Não autenticado')
    }

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
        if (res.status === 401 || res.status === 403) {
          pb.authStore.clear()
          this.cachedMe = null
          this.notify()
        }
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      const data: AuthMeResponse = await res.json()
      this.cachedMe = data
      this.notify()
      return data
    } catch (err: any) {
      console.warn('[authUsersService] Erro ao buscar /backend/v1/auth/me:', err)
      const currentRecord = pb.authStore.record as any
      if (currentRecord) {
        // Monta representação segura a partir do token/record autenticado
        const isAdm = currentRecord.role === 'admin'
        const fallback: AuthMeResponse = {
          ok: true,
          user: {
            id: currentRecord.id,
            email: currentRecord.email,
            name: currentRecord.name || currentRecord.email?.split('@')[0] || 'Usuário',
            role: (currentRecord.role as UserRole) || 'operador',
            ativo: currentRecord.ativo ?? true,
          },
          role: (currentRecord.role as UserRole) || 'operador',
          allowedModules: isAdm
            ? SYSTEM_MODULES_LIST.map((m) => m.key).concat(['usuarios'])
            : ['central_nox'],
          isAdmin: isAdm,
        }
        this.cachedMe = fallback
        this.notify()
        return fallback
      }
      this.cachedMe = null
      this.notify()
      throw err
    }
  }

  public static getCachedMe(): AuthMeResponse | null {
    return this.cachedMe
  }

  public static hasModuleAccess(moduleKey: string): boolean {
    if (!this.cachedMe) return false
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
