import React, { useState } from 'react'
import {
  Palette,
  Layout,
  Type,
  SquareCheck,
  MousePointer,
  Bell,
  Sparkles,
  Shield,
  Layers,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Folder,
} from 'lucide-react'
import {
  NoxPageHeader,
  NoxCard,
  NoxMetricCard,
  NoxButton,
  NoxInput,
  NoxSearchInput,
  NoxTextarea,
  NoxStatusBadge,
  NoxDenseTable,
  NoxTableColumn,
  NoxEmptyState,
  NoxErrorState,
  NoxDisplay,
  NoxH1,
  NoxH2,
  NoxH3,
  NoxBody,
  NoxSmall,
  NoxCaption,
  NoxLabel,
  NoxMono,
  NoxAiSignature,
  NoxInsight,
  NoxRecommendation,
  NoxRisk,
  NOX_TOKENS,
} from '@/design-system'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ShowcaseFixtureItem {
  id: string
  codigo: string
  cnj: string
  cliente: string
  tribunal: string
  status: 'PENDENTE' | 'PROCESSADO' | 'RESOLVIDO' | 'BLOQUEADO'
  prazoFatal: string
  valor: number
}

const SHOWCASE_FIXTURES: ShowcaseFixtureItem[] = [
  {
    id: 'fxt-1',
    codigo: 'NOX-FX-001',
    cnj: '0801234-56.2024.8.12.0001',
    cliente: 'Agropecuária Vale Verde Ltda.',
    tribunal: 'TJMS',
    status: 'BLOQUEADO',
    prazoFatal: '2025-05-18',
    valor: 1540000,
  },
  {
    id: 'fxt-2',
    codigo: 'NOX-FX-002',
    cnj: '5004321-12.2024.4.03.6000',
    cliente: 'Banco Cooperativo Central S.A.',
    tribunal: 'TRF3',
    status: 'PENDENTE',
    prazoFatal: '2025-05-22',
    valor: 489000,
  },
  {
    id: 'fxt-3',
    codigo: 'NOX-FX-003',
    cnj: '0000892-44.2024.5.24.0002',
    cliente: 'Transportadora Pantaneira Eireli',
    tribunal: 'TRT24',
    status: 'PROCESSADO',
    prazoFatal: '2025-05-30',
    valor: 78500,
  },
  {
    id: 'fxt-4',
    codigo: 'NOX-FX-004',
    cnj: '0812999-01.2023.8.12.0001',
    cliente: 'Espólio de Jerônimo Albuquerque',
    tribunal: 'TJMS',
    status: 'RESOLVIDO',
    prazoFatal: '2025-06-05',
    valor: 3200000,
  },
]

export const DesignSystemShowcasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('tokens')
  const [inputValue, setInputValue] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'info' | 'confirm' | 'danger'>('info')
  const [loadingDemo, setLoadingDemo] = useState(false)

  const triggerLoading = () => {
    setLoadingDemo(true)
    setTimeout(() => {
      setLoadingDemo(false)
      toast.success('Operação executada com sucesso!')
    }, 1500)
  }

  const tableColumns: NoxTableColumn<ShowcaseFixtureItem>[] = [
    {
      key: 'codigo',
      title: 'Código',
      render: (row) => <NoxMono className="text-cyan-400 font-bold">{row.codigo}</NoxMono>,
      sortable: true,
    },
    {
      key: 'cnj',
      title: 'Número CNJ',
      render: (row) => <NoxMono className="text-slate-300">{row.cnj}</NoxMono>,
    },
    {
      key: 'cliente',
      title: 'Cliente',
      render: (row) => <span className="font-medium text-slate-200">{row.cliente}</span>,
      sortable: true,
    },
    {
      key: 'tribunal',
      title: 'Tribunal',
      render: (row) => (
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
          {row.tribunal}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status Operacional',
      render: (row) => <NoxStatusBadge status={row.status} size="sm" showDot />,
    },
    {
      key: 'valor',
      title: 'Valor Causa',
      render: (row) => (
        <NoxMono className="text-emerald-400">
          {row.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </NoxMono>
      ),
      align: 'right',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <NoxPageHeader
        title="Showcase Design System NOX V2"
        description="Catálogo vivo de componentes, tokens CSS com prefixo --nox-, tipografia técnica, cards operacionais, badges de estado e componentes de inteligência artificial jurídica."
        icon={Palette}
        badge={
          <NoxStatusBadge status="ONLINE" customLabel="FASE 4 FINAL (LOTE 2)" size="sm" showDot />
        }
        actions={
          <div className="flex items-center gap-2">
            <NoxButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={loadingDemo}
              onClick={triggerLoading}
            >
              Simular Loading
            </NoxButton>
            <NoxButton
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={() => toast.info('Design System NOX V2 validado e ativo.')}
            >
              Testar Toast
            </NoxButton>
          </div>
        }
      />

      {/* Tabs de Navegação do Showcase */}
      <div className="flex items-center gap-1.5 bg-[#0b1222] p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto">
        {[
          { id: 'tokens', label: 'Tokens & Cores', icon: Palette },
          { id: 'typography', label: 'Tipografia', icon: Type },
          { id: 'buttons', label: 'Botões', icon: MousePointer },
          { id: 'forms', label: 'Formulários', icon: SquareCheck },
          { id: 'badges', label: 'Badges & Estados', icon: Bell },
          { id: 'cards', label: 'Cards & Métricas', icon: Layout },
          { id: 'tables', label: 'Tabelas Densas', icon: Database },
          { id: 'states', label: 'Empty & Error', icon: Layers },
          { id: 'intelligence', label: 'Intelligence (IA)', icon: Sparkles },
          { id: 'dialogs', label: 'Modais & Drawers', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* 1. TOKENS & CORES */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <NoxCard variant="glass" className="p-5">
            <NoxH3 className="mb-2">Paleta Institucional NOX V2</NoxH3>
            <NoxBody className="text-slate-400 text-xs mb-4">
              Cores primárias escuras, destaques em Cyan/Teal (#06b6d4) e semáforo estrito para
              criticidade jurídica (Rose, Amber, Emerald, Purple).
            </NoxBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { name: 'Nox Primary (Cyan)', hex: '#06b6d4', var: '--nox-color-primary' },
                { name: 'Nox Primary Dark', hex: '#0891b2', var: '--nox-color-primary-dark' },
                { name: 'Nox BG Deep', hex: '#030712', var: '--nox-color-bg-base' },
                { name: 'Nox Surface', hex: '#0a101f', var: '--nox-color-bg-surface' },
                { name: 'Nox Danger (Rose)', hex: '#f43f5e', var: '--nox-color-danger' },
                { name: 'Nox Warning (Amber)', hex: '#f59e0b', var: '--nox-color-warning' },
                { name: 'Nox Success (Emerald)', hex: '#10b981', var: '--nox-color-success' },
                { name: 'Nox Intelligence (Purple)', hex: '#8b5cf6', var: '--nox-color-info' },
                { name: 'Nox Border Base', hex: '#1e293b', var: '--nox-color-border-base' },
                { name: 'Nox Border Highlight', hex: '#334155', var: '--nox-color-border-hover' },
                { name: 'Nox Text Primary', hex: '#f8fafc', var: '--nox-color-text-primary' },
                { name: 'Nox Text Muted', hex: '#64748b', var: '--nox-color-text-muted' },
              ].map((c) => (
                <div
                  key={c.name}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div
                    className="w-full h-10 rounded-lg mb-2 border border-slate-700/50 shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="text-xs font-semibold text-slate-200">{c.name}</div>
                  <NoxMono className="text-[10px] text-cyan-400">{c.hex}</NoxMono>
                  <NoxMono className="text-[9px] text-slate-500 block truncate">{c.var}</NoxMono>
                </div>
              ))}
            </div>
          </NoxCard>

          <NoxCard variant="surface" className="p-5">
            <NoxH3 className="mb-2">Espaçamento & Raios (Tokens)</NoxH3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                <span className="text-slate-500">Radius Sm:</span>{' '}
                <span className="text-slate-200">0.375rem (6px)</span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                <span className="text-slate-500">Radius Md:</span>{' '}
                <span className="text-slate-200">0.5rem (8px)</span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                <span className="text-slate-500">Radius Lg:</span>{' '}
                <span className="text-slate-200">0.75rem (12px)</span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                <span className="text-slate-500">Radius Xl:</span>{' '}
                <span className="text-slate-200">1rem (16px)</span>
              </div>
            </div>
          </NoxCard>
        </div>
      )}

      {/* 2. TIPOGRAFIA */}
      {activeTab === 'typography' && (
        <NoxCard variant="glass" className="p-6 space-y-5">
          <div>
            <NoxCaption className="text-cyan-400">NoxDisplay (40px / 800)</NoxCaption>
            <NoxDisplay>Operação Central NOX</NoxDisplay>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-cyan-400">NoxH1 (32px / 700)</NoxCaption>
            <NoxH1>Controle Jurídico de Prazos Fatais</NoxH1>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-cyan-400">NoxH2 (24px / 600)</NoxCaption>
            <NoxH2>Cadeia de Custódia e Imutabilidade</NoxH2>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-cyan-400">NoxH3 (18px / 600)</NoxCaption>
            <NoxH3>Metadados Processuais e Auditoria</NoxH3>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-cyan-400">NoxBody (14px / 400)</NoxCaption>
            <NoxBody>
              Texto padrão de parágrafos operacionais, descrições de alertas e relatórios técnicos.
              Preserva clareza e contraste em modo dark.
            </NoxBody>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-cyan-400">
              NoxMono (Fonte Monoespaçada JetBrains/Courier)
            </NoxCaption>
            <div className="flex items-center gap-3">
              <NoxMono className="text-cyan-300 font-bold">0801234-56.2024.8.12.0001</NoxMono>
              <NoxMono className="text-amber-400 font-bold">SHA-256: 4a3f89e1...b012</NoxMono>
            </div>
          </div>
        </NoxCard>
      )}

      {/* 3. BOTÕES */}
      {activeTab === 'buttons' && (
        <NoxCard variant="glass" className="p-6 space-y-6">
          <div>
            <NoxH3 className="mb-3">Variantes de NoxButton</NoxH3>
            <div className="flex items-center gap-3 flex-wrap">
              <NoxButton variant="primary" icon={Sparkles}>
                Primary Action
              </NoxButton>
              <NoxButton variant="secondary" icon={Database}>
                Secondary Action
              </NoxButton>
              <NoxButton variant="secondary" icon={Folder}>
                Outline Action
              </NoxButton>
              <NoxButton variant="ghost" icon={ArrowRight}>
                Ghost Action
              </NoxButton>
              <NoxButton variant="danger" icon={XCircle}>
                Destructive Action
              </NoxButton>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <NoxH3 className="mb-3">Tamanhos (sm, md, lg)</NoxH3>
            <div className="flex items-center gap-3 flex-wrap">
              <NoxButton variant="primary" size="sm">
                Small (sm)
              </NoxButton>
              <NoxButton variant="primary" size="md">
                Medium (md)
              </NoxButton>
              <NoxButton variant="primary" size="lg">
                Large (lg)
              </NoxButton>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <NoxH3 className="mb-3">Estados de Loading e Desabilitado</NoxH3>
            <div className="flex items-center gap-3 flex-wrap">
              <NoxButton variant="primary" loading>
                Carregando...
              </NoxButton>
              <NoxButton variant="secondary" disabled>
                Desabilitado
              </NoxButton>
              <NoxButton variant="danger" loading>
                Excluindo...
              </NoxButton>
            </div>
          </div>
        </NoxCard>
      )}

      {/* 4. FORMULÁRIOS */}
      {activeTab === 'forms' && (
        <NoxCard variant="glass" className="p-6 space-y-4 max-w-2xl">
          <NoxH3 className="mb-2">Campos de Entrada (NoxForms)</NoxH3>
          <div>
            <NoxLabel>NoxSearchInput</NoxLabel>
            <NoxSearchInput
              id="demo-search"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Pesquisar por CNJ, cliente ou processo..."
              className="mt-1"
            />
          </div>

          <div>
            <NoxLabel>NoxInput Padrão</NoxLabel>
            <NoxInput
              id="demo-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite o título da peça ou tese jurídica..."
              className="mt-1"
            />
          </div>

          <div>
            <NoxLabel>NoxTextarea (Fundamentação)</NoxLabel>
            <NoxTextarea
              id="demo-textarea"
              placeholder="Insira notas operacionais ou fundamentos da decisão..."
              rows={3}
              className="mt-1"
            />
          </div>
        </NoxCard>
      )}

      {/* 5. BADGES & ESTADOS */}
      {activeTab === 'badges' && (
        <NoxCard variant="glass" className="p-6 space-y-5">
          <NoxH3 className="mb-2">NoxStatusBadge (Estados Jurídicos e Operacionais)</NoxH3>
          <div className="flex items-center gap-3 flex-wrap">
            <NoxStatusBadge status="ONLINE" showDot />
            <NoxStatusBadge status="SYNC" showDot />
            <NoxStatusBadge status="PENDENTE" showDot />
            <NoxStatusBadge status="PROCESSADO" showDot />
            <NoxStatusBadge status="RESOLVIDO" showDot />
            <NoxStatusBadge status="BLOQUEADO" showDot />
            <NoxStatusBadge status="CANCELADO" showDot />
            <NoxStatusBadge status="RASCUNHO" showDot />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <NoxCaption className="text-slate-400 mb-2 block">
              Com Custom Label e Tamanhos (sm, md)
            </NoxCaption>
            <div className="flex items-center gap-3 flex-wrap">
              <NoxStatusBadge status="BLOQUEADO" customLabel="PRAZO FATAL HOJE" size="sm" showDot />
              <NoxStatusBadge
                status="RESOLVIDO"
                customLabel="HOMOLOGADO PELO TITULAR"
                size="md"
                showDot
              />
              <NoxStatusBadge status="ONLINE" customLabel="SSE CONECTADO" size="sm" showDot />
            </div>
          </div>
        </NoxCard>
      )}

      {/* 6. CARDS & MÉTRICAS */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <NoxMetricCard
              label="Processos Ativos"
              value="1.420"
              icon={Database}
              statusVariant="cyan"
              variation={{ value: '+14', direction: 'up', text: 'este mês' }}
            />
            <NoxMetricCard
              label="Prazos Fatais"
              value="8"
              icon={AlertTriangle}
              statusVariant="danger"
              variation={{ value: '3 hoje', direction: 'down', text: 'requer ação' }}
            />
            <NoxMetricCard
              label="Tarefas Concluídas"
              value="94%"
              icon={CheckCircle2}
              statusVariant="success"
              variation={{ value: '+5%', direction: 'up', text: 'vs semana anterior' }}
            />
            <NoxMetricCard
              label="Em Revisão"
              value="23"
              icon={Clock}
              statusVariant="warning"
              variation={{ value: 'Fila', direction: 'neutral', text: 'operadores' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NoxCard variant="glass" className="p-4 space-y-2">
              <NoxH3>NoxCard Glass</NoxH3>
              <NoxBody className="text-slate-400 text-xs">
                Backdrop blur de alta densidade com bordas com brilho sutil em cyan.
              </NoxBody>
            </NoxCard>
            <NoxCard variant="surface" className="p-4 space-y-2">
              <NoxH3>NoxCard Surface</NoxH3>
              <NoxBody className="text-slate-400 text-xs">
                Fundo opaco de contraste neutro ideal para formulários e painéis de dados densos.
              </NoxBody>
            </NoxCard>
            <NoxCard variant="accent" interactive className="p-4 space-y-2">
              <NoxH3>NoxCard Accent</NoxH3>
              <NoxBody className="text-slate-400 text-xs">
                Interactive com animação suave de hover e borda em destaque.
              </NoxBody>
            </NoxCard>
          </div>
        </div>
      )}

      {/* 7. TABELAS DENSAS */}
      {activeTab === 'tables' && (
        <NoxCard variant="surface" className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <NoxH3>NoxDenseTable</NoxH3>
              <NoxCaption className="text-slate-400">
                Tabela de alta densidade para dados jurídicos com ordenação e formatação
                monoespaçada.
              </NoxCaption>
            </div>
            <NoxButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => toast.info('Tabela atualizada.')}
            >
              Recarregar
            </NoxButton>
          </div>
          <NoxDenseTable
            columns={tableColumns}
            data={SHOWCASE_FIXTURES}
            keyExtractor={(item) => item.id}
          />
        </NoxCard>
      )}

      {/* 8. EMPTY & ERROR STATES */}
      {activeTab === 'states' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <NoxCard variant="glass" className="p-6">
            <NoxCaption className="text-slate-400 mb-2 block">NoxEmptyState</NoxCaption>
            <NoxEmptyState
              icon={Database}
              title="Nenhum prazo fatal pendente"
              description="Todas as publicações do Sentinela foram triadas e seus prazos estão regularizados."
              actionLabel="Ver histórico completo"
              onAction={() => toast.info('Ação do empty state disparada')}
            />
          </NoxCard>

          <NoxCard variant="glass" className="p-6">
            <NoxCaption className="text-slate-400 mb-2 block">NoxErrorState</NoxCaption>
            <NoxErrorState
              title="Falha na sincronização do DataJud"
              description="A API do tribunal retornou tempo limite esgotado. Nenhuma alteração foi gravada na base."
              actionLabel="Tentar Reconexão"
              onAction={() => toast.info('Tentativa de reconexão executada')}
            />
          </NoxCard>
        </div>
      )}

      {/* 9. INTELLIGENCE (IA NOX) */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4 max-w-3xl">
          <NoxCard variant="glass" className="p-5 space-y-4">
            <NoxH3>Componentes de Inteligência Jurídica</NoxH3>

            <NoxAiSignature sourceModel="Gemini 1.5 Pro / Oráculo NOX" confidence="alta" />

            <NoxInsight title="Padrão Jurisprudencial Detectado">
              Identificada convergência de 87% na 2ª Turma do TRF3 pela procedência de pedidos
              análogos em contratos bancários com taxa abusiva.
            </NoxInsight>

            <NoxRecommendation
              title="Estratégia Recomendada para o Caso"
              actionLabel="Adotar Tese no Rascunho"
              onAction={() => toast.success('Tese incorporada à minuta.')}
            >
              Recomenda-se protocolar manifestação prévia em até 48 horas destacando a
              jurisprudência vinculante do STJ (Tema 1021).
            </NoxRecommendation>

            <NoxRisk
              severity="alto"
              title="Risco de Preclusão Temporal Detectado"
              description="Antecipar protocolo para data D-2 de garantia operacional."
              actionLabel="Ver Mitigação"
              onAction={() => toast.info('Ação de mitigação de risco acionada.')}
            >
              <p className="text-xs text-slate-300 mt-1">
                Publicação de intimação com contagem em dias úteis CPC com feriado local na comarca.
              </p>
            </NoxRisk>
          </NoxCard>
        </div>
      )}

      {/* 10. MODAIS & DRAWERS */}
      {activeTab === 'dialogs' && (
        <NoxCard variant="glass" className="p-6 space-y-4">
          <NoxH3>Feedback de Modais & Confirmações</NoxH3>
          <NoxBody className="text-slate-400 text-xs">
            Padronização de diálogos sem tela branca e com foco semântico para ações perigosas ou
            confirmações de atos processuais.
          </NoxBody>

          <div className="flex items-center gap-3 flex-wrap pt-2">
            <NoxButton
              variant="secondary"
              onClick={() => {
                setModalType('info')
                setModalOpen(true)
              }}
            >
              Modal Informativo
            </NoxButton>
            <NoxButton
              variant="primary"
              onClick={() => {
                setModalType('confirm')
                setModalOpen(true)
              }}
            >
              Modal Confirmação
            </NoxButton>
            <NoxButton
              variant="danger"
              onClick={() => {
                setModalType('danger')
                setModalOpen(true)
              }}
            >
              Modal Ação Destrutiva
            </NoxButton>
          </div>
        </NoxCard>
      )}

      {/* MODAL DE DEMONSTRAÇÃO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0b1222] border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === 'danger' ? (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-300">Ação Destrutiva Crítica</span>
                </>
              ) : modalType === 'confirm' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  <span>Confirmar Homologação</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Informação Operacional</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-2">
              {modalType === 'danger'
                ? 'Esta ação removerá o registro da fila de revisão e registrará log permanente na trilha de auditoria.'
                : modalType === 'confirm'
                  ? 'O cálculo de prazo fatal será homologado e propagado à agenda e compromissos do titular.'
                  : 'Detalhes operacionais sobre o lote importado do Sentinela NOX.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <NoxButton variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </NoxButton>
            <NoxButton
              variant={modalType === 'danger' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => {
                setModalOpen(false)
                toast.success('Ação confirmada com sucesso!')
              }}
            >
              Confirmar Operação
            </NoxButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
