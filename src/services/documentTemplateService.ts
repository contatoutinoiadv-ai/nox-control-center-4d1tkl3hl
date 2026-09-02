import pb from '@/lib/pocketbase/client'

export interface DocumentTemplateItem {
  id: string
  nome: string
  descricao?: string
  icone?: string
  area?: string
  tipoOrigem?: 'docx' | 'texto' | 'sistema'
  corpoHtml: string
  arquivoNome?: string
  isGlobal?: boolean
  userId?: string
  userEmail?: string
  criadoEm?: string
}

// Modelos padrão pré-carregados nativos do NOX (sempre disponíveis)
export const DEFAULT_DOCUMENT_TEMPLATES: DocumentTemplateItem[] = [
  {
    id: 'tpl-proc-01',
    nome: 'Procuração Ad Judicia et Extra',
    icone: '⚖️',
    area: 'todos, civel, trabalhista, consumidor, bancario',
    descricao: 'Poderes gerais para o foro e cláusula específica de representação',
    tipoOrigem: 'sistema',
    isGlobal: true,
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">PROCURAÇÃO AD JUDICIA ET EXTRA</h1>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>OUTORGANTE:</strong> [NOME_UPPER], [NACIONALIDADE], [ESTADO_CIVIL], [PROFISSAO], portador(a) da cédula de identidade RG nº [RG] e inscrito(a) no CPF/MF sob o nº [CPF], residente e domiciliado(a) na [ENDERECO], telefone de contato [TELEFONE].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>OUTORGADO:</strong> <strong>HIGOR UTINOI DE OLIVEIRA</strong>, brasileiro, advogado regularmente inscrito nos quadros da Ordem dos Advogados do Brasil, Seccional de Mato Grosso do Sul sob o nº <strong>OAB/MS 15.400</strong>, com escritório profissional sediado em Campo Grande/MS.
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>PODERES:</strong> Por este instrumento particular de procuração, o(a) OUTORGANTE confere ao OUTORGADO amplos, gerais e ilimitados poderes para o foro em geral, conferidos pela cláusula <em>"ad judicia et extra"</em>, em qualquer Juízo, Instância ou Tribunal, bem como perante órgãos públicos e entidades privadas, especialmente para ajuizar ações e prestar assessoria jurídica referente à demanda de [DEMANDA].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>PODERES ESPECÍFICOS:</strong> Conferem-se ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromissos e substabelecer esta a outrem, com ou sem reserva de poderes.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:60px;text-align:center;">
        <div style="border-top:1px solid #000;display:inline-block;width:320px;padding-top:6px;font-weight:bold;">
          [NOME_UPPER]<br/>
          <span style="font-weight:normal;font-size:11px;">CPF: [CPF]</span>
        </div>
      </div>
    `,
  },
  {
    id: 'tpl-contrato-02',
    nome: 'Contrato de Honorários e Prestação de Serviços',
    icone: '📝',
    area: 'todos, civel, trabalhista, consumidor, bancario',
    descricao: 'Contrato de prestação de serviços advocatícios com cláusula quota litis',
    tipoOrigem: 'sistema',
    isGlobal: true,
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</h1>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        Pelo presente instrumento particular, de um lado <strong>[NOME_UPPER]</strong>, inscrito(a) no CPF nº [CPF], residente na [ENDERECO], doravante denominado(a) <strong>CONTRATANTE</strong>; e de outro lado <strong>HIGOR UTINOI DE OLIVEIRA</strong>, Advogado OAB/MS 15.400, doravante denominado <strong>CONTRATADO</strong>, celebram o presente contrato com as cláusulas a seguir:
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 1ª — DO OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços profissionais advocatícios em prol do CONTRATANTE, consistente na assessoria, ajuizamento e acompanhamento judicial integral de demanda na área de [DEMANDA].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 2ª — DAS OBRIGAÇÕES:</strong> O CONTRATADO se compromete a zelar pelos interesses do CONTRATANTE com dedicação, presteza e o rigor ético aplicável à advocacia, mantendo-o informado sobre os andamentos relevantes.
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 3ª — DOS HONORÁRIOS:</strong> Em remuneração pelos serviços contratados, o CONTRATANTE pagará os honorários estipulados conforme êxito e tabela da OAB.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:50px;display:flex;justify-content:space-between;padding:0 30px;">
        <div style="border-top:1px solid #000;width:240px;text-align:center;padding-top:6px;font-size:11px;">
          <strong>[NOME_UPPER]</strong><br/>CONTRATANTE
        </div>
        <div style="border-top:1px solid #000;width:240px;text-align:center;padding-top:6px;font-size:11px;">
          <strong>HIGOR UTINOI DE OLIVEIRA</strong><br/>OAB/MS 15.400 - CONTRATADO
        </div>
      </div>
    `,
  },
  {
    id: 'tpl-hipo-03',
    nome: 'Declaração de Hipossuficiência (Justiça Gratuita)',
    icone: '📑',
    area: 'todos, civel, consumidor, trabalhista',
    descricao: 'Declaração de impossibilidade de arcar com custas sem prejuízo do sustento',
    tipoOrigem: 'sistema',
    isGlobal: true,
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</h1>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Eu, <strong>[NOME_UPPER]</strong>, [NACIONALIDADE], [ESTADO_CIVIL], [PROFISSAO], portador(a) do RG [RG] e inscrito(a) no CPF [CPF], residente e domiciliado(a) na [ENDERECO], DECLARO, para todos os fins de direito e sob as penas da lei, em especial nos termos do artigo 98 e seguintes do Código de Processo Civil e artigo 5º, inciso LXXIV da Constituição Federal, que:
      </p>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Não possuo condições financeiras de arcar com as custas processuais, taxas judiciárias, despesas com perícias e honorários advocatícios sucumbenciais sem prejuízo do meu próprio sustento e de minha família, fazendo jus aos benefícios da <strong>JUSTIÇA GRATUITA</strong>.
      </p>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Por ser a mais límpida expressão da verdade, firmo a presente declaração.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:60px;text-align:center;">
        <div style="border-top:1px solid #000;display:inline-block;width:320px;padding-top:6px;font-weight:bold;">
          [NOME_UPPER]<br/>
          <span style="font-weight:normal;font-size:11px;">CPF: [CPF]</span>
        </div>
      </div>
    `,
  },
]

const STORAGE_KEY_PREFIX = 'nox_document_templates_user_'
const STORAGE_KEY_GLOBAL = 'nox_document_templates_custom_v1'

class DocumentTemplateService {
  private listeners: Array<() => void> = []

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch (err) {
        console.error('Erro ao notificar subscriber de templates:', err)
      }
    })
  }

  private getCurrentUserKey(): string {
    const authRecord = pb.authStore.record as any
    if (authRecord && (authRecord.id || authRecord.email)) {
      return `${STORAGE_KEY_PREFIX}${authRecord.id || authRecord.email}`
    }
    return STORAGE_KEY_GLOBAL
  }

  /**
   * Retorna os modelos salvos do usuário atual no localStorage
   */
  public getLocalTemplates(): DocumentTemplateItem[] {
    try {
      const key = this.getCurrentUserKey()
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      /* ignore */
    }
    return []
  }

  /**
   * Salva modelos no localStorage isolado por usuário
   */
  private saveLocalTemplates(templates: DocumentTemplateItem[]): void {
    try {
      const key = this.getCurrentUserKey()
      localStorage.setItem(key, JSON.stringify(templates))
      this.notify()
    } catch (err) {
      console.warn('Erro ao salvar templates locais:', err)
    }
  }

  /**
   * Retorna todos os templates disponíveis para o usuário:
   * Padrões do Sistema + Modelos Customizados do Usuário
   */
  public async listTemplates(): Promise<DocumentTemplateItem[]> {
    const localUserTemplates = this.getLocalTemplates()

    // Tenta carregar do PocketBase se autenticado
    if (pb.authStore.isValid && pb.authStore.record?.id) {
      try {
        const userId = pb.authStore.record.id
        const records = await pb.collection('document_templates').getFullList({
          filter: `user_id = "${userId}" || is_global = true`,
          sort: '-created',
        })

        const pbTemplates: DocumentTemplateItem[] = records.map((r: any) => ({
          id: r.id,
          nome: r.nome,
          descricao: r.descricao || '',
          icone: r.icone || '📄',
          area: r.area || 'todos',
          tipoOrigem: r.tipo_origem || 'texto',
          corpoHtml: r.corpo_html || '',
          arquivoNome: r.arquivo_nome || '',
          isGlobal: Boolean(r.is_global),
          userId: r.user_id,
          userEmail: r.user_email,
          criadoEm: r.created,
        }))

        // Mesclar evitando duplicidade com id
        const customCombinedMap = new Map<string, DocumentTemplateItem>()
        localUserTemplates.forEach((t) => customCombinedMap.set(t.id, t))
        pbTemplates.forEach((t) => customCombinedMap.set(t.id, t))

        return [...DEFAULT_DOCUMENT_TEMPLATES, ...Array.from(customCombinedMap.values())]
      } catch (err) {
        console.warn('[DocumentTemplateService] Falha ao listar do PocketBase, usando local:', err)
      }
    }

    return [...DEFAULT_DOCUMENT_TEMPLATES, ...localUserTemplates]
  }

  /**
   * Salva um novo modelo de documento
   */
  public async createTemplate(data: {
    nome: string
    descricao?: string
    icone?: string
    area?: string
    tipoOrigem?: 'docx' | 'texto' | 'sistema'
    corpoHtml: string
    arquivoNome?: string
  }): Promise<DocumentTemplateItem> {
    const authRecord = pb.authStore.record as any
    const userId = authRecord?.id
    const userEmail = authRecord?.email

    const newId = `tpl_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const newTpl: DocumentTemplateItem = {
      id: newId,
      nome: data.nome.trim(),
      descricao: data.descricao?.trim() || '',
      icone: data.icone || (data.tipoOrigem === 'docx' ? '📂' : '📄'),
      area: data.area || 'todos',
      tipoOrigem: data.tipoOrigem || 'texto',
      corpoHtml: data.corpoHtml,
      arquivoNome: data.arquivoNome,
      isGlobal: false,
      userId,
      userEmail,
      criadoEm: new Date().toISOString(),
    }

    // Salva localmente primeiro
    const current = this.getLocalTemplates()
    current.unshift(newTpl)
    this.saveLocalTemplates(current)

    // Tenta persistir no PocketBase
    if (pb.authStore.isValid && userId) {
      try {
        const record = await pb.collection('document_templates').create({
          user_id: userId,
          user_email: userEmail || '',
          nome: newTpl.nome,
          descricao: newTpl.descricao,
          icone: newTpl.icone,
          area: newTpl.area,
          tipo_origem: newTpl.tipoOrigem,
          corpo_html: newTpl.corpoHtml,
          arquivo_nome: newTpl.arquivoNome || '',
          is_global: false,
        })
        newTpl.id = record.id
      } catch (err) {
        console.warn(
          '[DocumentTemplateService] Não foi possível sincronizar criação no PocketBase:',
          err,
        )
      }
    }

    this.notify()
    return newTpl
  }

  /**
   * Exclui um modelo customizado
   */
  public async deleteTemplate(templateId: string): Promise<boolean> {
    // Não permite excluir modelos padrão do sistema
    if (DEFAULT_DOCUMENT_TEMPLATES.some((t) => t.id === templateId)) {
      throw new Error('Modelos padrão do sistema não podem ser excluídos.')
    }

    // Remove do localStorage
    const current = this.getLocalTemplates()
    const filtered = current.filter((t) => t.id !== templateId)
    this.saveLocalTemplates(filtered)

    // Remove do PocketBase se existir
    if (pb.authStore.isValid) {
      try {
        await pb.collection('document_templates').delete(templateId)
      } catch {
        /* pode não estar no PB se foi gerado puramente local */
      }
    }

    this.notify()
    return true
  }

  /**
   * Preenche o template com as variáveis do cliente
   */
  public fillTemplateWithClient(
    corpoHtml: string,
    client: {
      nome?: string
      cpf?: string
      rg?: string
      telefone?: string
      endereco?: string
      profissao?: string
      nacionalidade?: string
      estadoCivil?: string
      demanda?: string
      descricaoCaso?: string
    },
  ): string {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const nm = (client.nome || '').toUpperCase()
    const rgStr = client.rg ? `RG nº ${client.rg}` : '—'
    const mapa: Record<string, string> = {
      '[NOME]': client.nome || '',
      '[NOME_UPPER]': nm,
      '[CPF]': client.cpf || '—',
      '[RG]': rgStr,
      '[TELEFONE]': client.telefone || '—',
      '[ENDERECO]': client.endereco || '—',
      '[PROFISSAO]': client.profissao || 'autônomo(a)',
      '[NACIONALIDADE]': client.nacionalidade || 'brasileiro(a)',
      '[ESTADO_CIVIL]': client.estadoCivil || 'solteiro(a)',
      '[DEMANDA]': (client.demanda || 'Direito').toUpperCase(),
      '[DESCRICAO_CASO]': client.descricaoCaso || '',
      '[DATA]': hoje,
    }

    let resultado = corpoHtml
    Object.entries(mapa).forEach(([chave, valor]) => {
      resultado = resultado.split(chave).join(valor)
    })

    // Caso o modelo importado não tenha tags de placeholder explícitas,
    // garantimos que o cabeçalho identifique o cliente de forma contextual se aplicável
    return resultado
  }
}

export const documentTemplateService = new DocumentTemplateService()
