import React, { useState } from 'react'
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  FileText,
  User,
  Phone,
  Mail,
  Home,
  Briefcase,
  Scale,
  Send,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { dataStore } from '@/services/dataStore'

export const IntakePublicPage: React.FC = () => {
  // Controle de etapas (1, 2, 3 e 4 para confirmação/sucesso)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    protocolo: string
    clientCode?: string
    nome: string
    demanda: string
    dataEnvio: string
  } | null>(null)

  // Dados do formulário
  const [formData, setFormData] = useState({
    // Passo 1: Identificação Básica
    nome: '',
    cpf: '',
    rg: '',
    nacionalidade: 'Brasileiro(a)',
    estadoCivil: 'Solteiro(a)',
    profissao: '',

    // Passo 2: Contato e Localização
    telefone: '',
    email: '',
    endereco: '',

    // Passo 3: Demanda e Narrativa dos Fatos
    demanda: 'consumidor',
    descricaoCaso: '',
    obs: '',

    // Campo Honeypot anti-spam (invisível para humanos)
    website: '',
  })

  // Erros de validação inline
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Formatação amigável de telefone e CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    }
    setFormData((prev) => ({ ...prev, cpf: v }))
    if (errors.cpf) setErrors((prev) => ({ ...prev, cpf: '' }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2')
    }
    setFormData((prev) => ({ ...prev, telefone: v }))
    if (errors.telefone) setErrors((prev) => ({ ...prev, telefone: '' }))
  }

  const validateStep1 = () => {
    const errs: Record<string, string> = {}
    if (!formData.nome.trim() || formData.nome.trim().length < 3) {
      errs.nome = 'Informe seu nome completo (mínimo 3 caracteres).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    const cleanPhone = formData.telefone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.telefone = 'Informe um telefone/WhatsApp válido com DDD (mínimo 10 dígitos).'
    }
    if (formData.email && !formData.email.includes('@')) {
      errs.email = 'Informe um e-mail válido com @.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep3 = () => {
    const errs: Record<string, string> = {}
    if (!formData.demanda) {
      errs.demanda = 'Selecione a área principal da sua demanda.'
    }
    if (!formData.descricaoCaso.trim() || formData.descricaoCaso.trim().length < 10) {
      errs.descricaoCaso =
        'Por favor, descreva seu caso brevemente para podermos avaliar (mínimo 10 caracteres).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error('Por favor, preencha seu nome completo para continuar.')
        return
      }
      setCurrentStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        toast.error('Por favor, preencha um telefone para podermos retornar o contato.')
        return
      }
      setCurrentStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Submissão real via POST para api/intake_submit.php
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Honeypot check imediato
    if (formData.website) {
      console.warn('Bot submission prevented by honeypot')
      return
    }

    if (!validateStep3()) {
      toast.error('Descreva seu caso com mais detalhes antes de finalizar o envio.')
      return
    }

    setSubmitting(true)

    const payload = {
      nome: formData.nome.trim(),
      cpf: formData.cpf.trim() || undefined,
      rg: formData.rg.trim() || undefined,
      nacionalidade: formData.nacionalidade.trim() || 'brasileiro(a)',
      estado_civil: formData.estadoCivil.trim() || 'solteiro(a)',
      profissao: formData.profissao.trim() || undefined,
      telefone: formData.telefone.trim(),
      email: formData.email.trim() || undefined,
      endereco: formData.endereco.trim() || undefined,
      demanda: formData.demanda,
      descricao_caso: formData.descricaoCaso.trim(),
      obs: formData.obs.trim() || undefined,
      origem: 'intake_site',
      website: formData.website, // honeypot
    }

    try {
      // Tentar POST prioritário para o backend PocketBase /api/intake_submit.php
      let resData: any = null
      let ok = false

      try {
        const pbBaseUrl = pb.baseUrl || ''
        const targetUrl = `${pbBaseUrl}/api/intake_submit.php`

        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (resp.ok) {
          resData = await resp.json()
          ok = true
        } else {
          console.warn('POST pb_hooks returned non-200:', resp.status)
        }
      } catch (postErr) {
        console.warn('Network error calling /api/intake_submit.php directly:', postErr)
      }

      // Se por algum motivo o endpoint externo falhou, utilizar fallback direto via SDK / dataStore
      if (!ok || !resData) {
        // Fallback resiliente usando SDK client e dataStore
        let record: any = null
        try {
          record = await pb.collection('clients').create({
            client_code: `CLI-2026-${Math.floor(100 + Math.random() * 900)}`,
            protocolo: `INT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            nome: payload.nome,
            cpf: payload.cpf || '',
            rg: payload.rg || '',
            telefone: payload.telefone,
            email: payload.email || '',
            endereco: payload.endereco || '',
            profissao: payload.profissao || '',
            nacionalidade: payload.nacionalidade,
            estado_civil: payload.estado_civil,
            demanda: payload.demanda,
            descricao_caso: payload.descricao_caso,
            origem: 'intake_site',
            estagio: 'novo',
            docs_gerados: [],
            processos_vinculados: [],
            responsavel: 'Higor Utinoi de Oliveira',
          })
        } catch (pbDirectErr) {
          console.warn('SDK direct client create fallback:', pbDirectErr)
        }

        // Também garantir inserção no dataStore local reativo
        const localCreated = dataStore.addClient({
          nome: payload.nome,
          cpf: payload.cpf,
          rg: payload.rg,
          telefone: payload.telefone,
          email: payload.email,
          endereco: payload.endereco,
          profissao: payload.profissao,
          nacionalidade: payload.nacionalidade,
          estadoCivil: payload.estado_civil,
          demanda: payload.demanda as any,
          descricaoCaso: payload.descricao_caso,
          origem: 'intake_site',
          estagio: 'novo',
          responsavel: 'Higor Utinoi de Oliveira',
        })

        resData = {
          success: true,
          data: {
            protocolo: record?.protocolo || localCreated.protocolo,
            client_code: record?.client_code || localCreated.clientCode,
            nome: payload.nome,
            demanda: payload.demanda,
          },
        }
      } else {
        // Recarregar sincronização no dataStore local para refletir instantaneamente
        try {
          dataStore.addClient({
            clientCode: resData.data?.client_code,
            protocolo: resData.data?.protocolo,
            nome: payload.nome,
            cpf: payload.cpf,
            rg: payload.rg,
            telefone: payload.telefone,
            email: payload.email,
            endereco: payload.endereco,
            profissao: payload.profissao,
            nacionalidade: payload.nacionalidade,
            estadoCivil: payload.estado_civil,
            demanda: payload.demanda as any,
            descricaoCaso: payload.descricao_caso,
            origem: 'intake_site',
            estagio: 'novo',
            responsavel: 'Higor Utinoi de Oliveira',
          })
        } catch (_) {
          /* non blocking */
        }
      }

      setSubmitResult({
        protocolo: resData.data?.protocolo || `INT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        clientCode: resData.data?.client_code,
        nome: payload.nome,
        demanda: payload.demanda,
        dataEnvio: new Date().toLocaleString('pt-BR'),
      })

      setCurrentStep(4)
      toast.success('Formulário enviado com sucesso!', {
        description: `Protocolo gerado: ${resData.data?.protocolo || 'Confirmado'}`,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error('Erro na submissão do intake:', err)
      toast.error('Ocorreu um erro ao enviar seu formulário. Por favor, tente novamente.', {
        description: err?.message || 'Falha de conexão com o servidor.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const demandasList = [
    {
      id: 'consumidor',
      label: 'Direito do Consumidor',
      desc: 'Cobranças indevidas, negativações no SPC/Serasa, problemas com viagens ou produtos',
      icon: '🛍️',
    },
    {
      id: 'bancario',
      label: 'Direito Bancário & Financiamentos',
      desc: 'Juros abusivos, golpes PIX/cartão, contratos de empréstimo e revisão de financiamento',
      icon: '🏦',
    },
    {
      id: 'trabalhista',
      label: 'Direito do Trabalho',
      desc: 'Verbas rescisórias, horas extras, adicionais, vínculo empregatício e assédio',
      icon: '💼',
    },
    {
      id: 'civel',
      label: 'Direito Cível & Contratos',
      desc: 'Indenizações, rescisões contratuais, execuções de título, posse e propriedades',
      icon: '⚖️',
    },
    {
      id: 'familia',
      label: 'Família & Sucessões',
      desc: 'Divórcio, pensão alimentícia, guarda, inventários e partilhas',
      icon: '👨‍👩‍👧',
    },
    {
      id: 'outro',
      label: 'Outras Áreas / Não Tenho Certeza',
      desc: 'Orientação jurídica especializada personalizada após análise do caso',
      icon: '📑',
    },
  ]

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 font-sans">
      {/* Top Header / Public Brand */}
      <header className="border-b border-amber-500/20 bg-[#090e1a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Scale className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-serif font-bold text-base md:text-lg tracking-wide text-amber-200">
                HIGOR UTINÓI ADVOCACIA
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span>OAB/MS 15.400</span>
                <span>•</span>
                <span>Atendimento & Triagem Digital</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-950/70 text-emerald-300 border-emerald-800 text-[10px] font-mono px-2.5 py-1">
              <Lock className="w-3 h-3 mr-1 inline text-emerald-400" /> Canal Seguro & Sigiloso
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 md:py-12 flex-1">
        {currentStep !== 4 && (
          <div className="mb-8 text-center space-y-2">
            <Badge className="bg-amber-950/60 text-amber-300 border-amber-800/80 font-mono text-xs uppercase px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 mr-1 inline text-amber-400" /> Cadastro Inicial de
              Atendimento
            </Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Abertura de Atendimento Jurídico
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Preencha os passos abaixo para registrar sua demanda diretamente com o Dr. Higor
              Utinói. Suas informações são protegidas pelo sigilo profissional da advocacia.
            </p>

            {/* Stepper Progress Bar */}
            <div className="pt-6 max-w-md mx-auto">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 w-full -z-0" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500 transition-all duration-300 -z-0"
                  style={{
                    width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
                  }}
                />

                {[
                  { step: 1, title: 'Identificação' },
                  { step: 2, title: 'Contato' },
                  { step: 3, title: 'Seu Caso' },
                ].map((item) => {
                  const isActive = currentStep === item.step
                  const isCompleted = currentStep > item.step
                  return (
                    <div key={item.step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : isActive
                              ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 font-extrabold'
                              : 'bg-slate-900 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : item.step}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 transition-colors ${
                          isActive
                            ? 'text-amber-400 font-semibold'
                            : isCompleted
                              ? 'text-slate-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Identificação Básica */}
        {currentStep === 1 && (
          <Card className="bg-[#0c1222]/90 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 md:p-6 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Passo 1 de 3 — Seus Dados</h2>
                  <p className="text-xs text-slate-400">Qualificação para o atendimento</p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
                1 / 3
              </span>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Campo Honeypot invisível */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website (não preencher)</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-200">
                  Nome Completo <span className="text-amber-400">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: João da Silva Santos"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, nome: e.target.value }))
                    if (errors.nome) setErrors((p) => ({ ...p, nome: '' }))
                  }}
                  className={`bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500/20 text-sm h-11 ${
                    errors.nome ? 'border-rose-500 focus:border-rose-500' : ''
                  }`}
                  autoFocus
                />
                {errors.nome && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.nome}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-xs font-semibold text-slate-200">
                    CPF (Opcional)
                  </Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rg" className="text-xs font-semibold text-slate-200">
                    RG (Opcional)
                  </Label>
                  <Input
                    id="rg"
                    placeholder="Ex: 00.000.000-0 SSP/MS"
                    value={formData.rg}
                    onChange={(e) => setFormData((p) => ({ ...p, rg: e.target.value }))}
                    className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profissao" className="text-xs font-semibold text-slate-200">
                    Profissão (Opcional)
                  </Label>
                  <Input
                    id="profissao"
                    placeholder="Ex: Autônomo, Bancário, etc."
                    value={formData.profissao}
                    onChange={(e) => setFormData((p) => ({ ...p, profissao: e.target.value }))}
                    className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="estadoCivil" className="text-xs font-semibold text-slate-200">
                    Estado Civil
                  </Label>
                  <select
                    id="estadoCivil"
                    value={formData.estadoCivil}
                    onChange={(e) => setFormData((p) => ({ ...p, estadoCivil: e.target.value }))}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-md px-3 text-sm h-11 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nacionalidade" className="text-xs font-semibold text-slate-200">
                    Nacionalidade
                  </Label>
                  <Input
                    id="nacionalidade"
                    placeholder="Brasileiro(a)"
                    value={formData.nacionalidade}
                    onChange={(e) => setFormData((p) => ({ ...p, nacionalidade: e.target.value }))}
                    className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <Button
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-6 h-12 gap-2 text-sm shadow-lg shadow-amber-500/20"
                >
                  CONTINUAR <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Contato e Localização */}
        {currentStep === 2 && (
          <Card className="bg-[#0c1222]/90 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 md:p-6 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Passo 2 de 3 — Meios de Contato
                  </h2>
                  <p className="text-xs text-slate-400">Como o advogado falará com você</p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
                2 / 3
              </span>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="text-xs font-semibold text-slate-200">
                    WhatsApp / Telefone <span className="text-amber-400">*</span>
                  </Label>
                  <Input
                    id="telefone"
                    placeholder="(67) 99999-9999"
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className={`bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11 font-mono ${
                      errors.telefone ? 'border-rose-500 focus:border-rose-500' : ''
                    }`}
                    autoFocus
                  />
                  {errors.telefone && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.telefone}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Usado para contato prioritário e envio de atualizações do caso.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                    E-mail (Opcional)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, email: e.target.value }))
                      if (errors.email) setErrors((p) => ({ ...p, email: '' }))
                    }}
                    className={`bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11 ${
                      errors.email ? 'border-rose-500' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco" className="text-xs font-semibold text-slate-200">
                  Endereço Residencial / Comercial (Opcional)
                </Label>
                <Input
                  id="endereco"
                  placeholder="Ex: Rua das Flores, 123, Apto 45, Bairro, Campo Grande - MS"
                  value={formData.endereco}
                  onChange={(e) => setFormData((p) => ({ ...p, endereco: e.target.value }))}
                  className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 px-5 h-12 gap-1.5 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> VOLTAR
                </Button>

                <Button
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-6 h-12 gap-2 text-sm shadow-lg shadow-amber-500/20"
                >
                  CONTINUAR <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Demanda e Narrativa do Caso */}
        {currentStep === 3 && (
          <Card className="bg-[#0c1222]/90 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur">
            <div className="p-4 md:p-6 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Passo 3 de 3 — Seu Caso</h2>
                  <p className="text-xs text-slate-400">
                    Descreva o que aconteceu e o que você precisa
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
                3 / 3
              </span>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-200">
                  Selecione a área principal da sua demanda{' '}
                  <span className="text-amber-400">*</span>
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {demandasList.map((d) => {
                    const isSelected = formData.demanda === d.id
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, demanda: d.id }))}
                        className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <span className="text-2xl shrink-0 mt-0.5">{d.icon}</span>
                        <div className="space-y-1">
                          <div
                            className={`text-xs font-bold ${
                              isSelected ? 'text-amber-300' : 'text-slate-200'
                            }`}
                          >
                            {d.label}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">{d.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="descricaoCaso" className="text-xs font-semibold text-slate-200">
                  Descreva o que aconteceu (Narrativa dos Fatos){' '}
                  <span className="text-amber-400">*</span>
                </Label>
                <Textarea
                  id="descricaoCaso"
                  rows={5}
                  placeholder="Conte os detalhes do seu caso: o que aconteceu, quais foram as partes envolvidas (banco, empresa, pessoa), datas importantes e o que você busca resolver..."
                  value={formData.descricaoCaso}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, descricaoCaso: e.target.value }))
                    if (errors.descricaoCaso) setErrors((p) => ({ ...p, descricaoCaso: '' }))
                  }}
                  className={`bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm leading-relaxed p-3.5 ${
                    errors.descricaoCaso ? 'border-rose-500' : ''
                  }`}
                />
                {errors.descricaoCaso && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.descricaoCaso}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Quanto mais detalhado for o seu relato, mais rápida e precisa será a análise do
                  Dr. Higor.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obs" className="text-xs font-semibold text-slate-200">
                  Observações adicionais ou urgências (Opcional)
                </Label>
                <Input
                  id="obs"
                  placeholder="Ex: Tenho uma audiência marcada para a próxima semana / Já tenho documentos em mãos"
                  value={formData.obs}
                  onChange={(e) => setFormData((p) => ({ ...p, obs: e.target.value }))}
                  className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 text-sm h-11"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-slate-300 text-xs flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ao clicar em <strong>ENVIAR ATENDIMENTO</strong>, seus dados serão registrados
                  diretamente no sistema interno de controladoria do escritório. Nossa equipe
                  entrará em contato pelo WhatsApp informado.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={handlePrevStep}
                  className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 px-5 h-12 gap-1.5 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> VOLTAR
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black px-7 h-12 gap-2 text-sm shadow-xl shadow-emerald-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> ENVIANDO DADOS...
                    </>
                  ) : (
                    <>
                      ENVIAR ATENDIMENTO <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Confirmação e Sucesso */}
        {currentStep === 4 && submitResult && (
          <Card className="bg-[#0c1222]/90 border border-emerald-500/30 shadow-2xl rounded-2xl overflow-hidden backdrop-blur animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 font-mono text-xs uppercase px-3 py-0.5">
                  Atendimento Registrado com Sucesso
                </Badge>
                <h2 className="text-2xl font-bold text-white pt-2">
                  Recebemos o seu cadastro, {submitResult.nome.split(' ')[0]}!
                </h2>
                <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Seus dados já foram computados na Central de Comando do escritório. O Dr. Higor
                  Utinói ou a equipe jurídica entrará em contato em breve.
                </p>
              </div>

              {/* Protocol Receipt Card */}
              <div className="max-w-md mx-auto p-5 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400">Protocolo de Entrada:</span>
                  <span className="text-amber-400 font-bold text-sm">{submitResult.protocolo}</span>
                </div>

                {submitResult.clientCode && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-slate-400">Código no Sistema:</span>
                    <span className="text-slate-200">{submitResult.clientCode}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400">Área da Demanda:</span>
                  <span className="text-slate-200 uppercase">{submitResult.demanda}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400">Status Inicial:</span>
                  <span className="text-emerald-400 font-semibold">NOVO (EM FILA DE TRIAGEM)</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Data / Horário:</span>
                  <span className="text-slate-300">{submitResult.dataEnvio}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setFormData({
                      nome: '',
                      cpf: '',
                      rg: '',
                      nacionalidade: 'Brasileiro(a)',
                      estadoCivil: 'Solteiro(a)',
                      profissao: '',
                      telefone: '',
                      email: '',
                      endereco: '',
                      demanda: 'consumidor',
                      descricaoCaso: '',
                      obs: '',
                      website: '',
                    })
                    setSubmitResult(null)
                    setCurrentStep(1)
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-10 px-5"
                >
                  Registrar Novo Atendimento
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090e1a] py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p className="text-slate-400">
            Higor Utinói Advocacia • OAB/MS 15.400 • Gestão Integrada NOX Control Center
          </p>
          <p className="text-slate-600">
            Ambiente público de ingestão direta. Tratamento de dados sob a LGPD e sigilo da
            Advocacia.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default IntakePublicPage
