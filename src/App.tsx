/* Main App Component - Handles routing, query client and other providers */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import Index from './pages/Index'
import RadarPage from './pages/RadarPage'
import ProcessesPage from './pages/ProcessesPage'
import ImportsPage from './pages/ImportsPage'
import ReviewPage from './pages/ReviewPage'
import ExportsPage from './pages/ExportsPage'
import LexTempusPage from './pages/LexTempusPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import SentinelaPage from './pages/SentinelaPage'
import UsuariosPage from './pages/UsuariosPage'
import { AccessDeniedView } from './components/AccessDeniedView'
import { authUsersService } from './services/authUsersService'
import CentralPrazosPage from './pages/CentralPrazosPage'
import CompromissosPage from './pages/CompromissosPage'
import ClientesPage from './pages/ClientesPage'
import ProducaoPage from './pages/ProducaoPage'
import IntakePublicPage from './pages/IntakePublicPage'
import NotFound from './pages/NotFound'

// Componente de Guarda de Rota com Dupla Camada (Front-end + Back-end)
const ProtectedModuleRoute: React.FC<{
  moduleKey: string
  moduleName: string
  requiredAdmin?: boolean
  children: React.ReactNode
}> = ({ moduleKey, moduleName, requiredAdmin, children }) => {
  const cachedMe = authUsersService.getCachedMe()
  const isAdmin = cachedMe?.isAdmin || cachedMe?.role === 'admin'

  if (requiredAdmin) {
    if (!isAdmin) {
      return (
        <AccessDeniedView
          moduleName={moduleName}
          moduleKey={moduleKey}
          requiredRole="Administrador (admin)"
        />
      )
    }
  } else if (!authUsersService.hasModuleAccess(moduleKey)) {
    return <AccessDeniedView moduleName={moduleName} moduleKey={moduleKey} />
  }

  return <>{children}</>
}

// Component to seamlessly handle legacy hash URLs (e.g. /#/intake or /#/processos)
const HashToPathSync = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (window.location.hash) {
      const rawHash = window.location.hash.replace(/^#/, '')
      if (rawHash && rawHash !== '/' && rawHash !== location.pathname) {
        // Clean leading slash if any
        const targetPath = rawHash.startsWith('/') ? rawHash : `/${rawHash}`
        navigate(targetPath, { replace: true })
      }
    }
  }, [navigate, location.pathname])

  return null
}

const App = () => (
  <div translate="no" className="notranslate min-h-screen">
    <BrowserRouter>
      <HashToPathSync />
      <TooltipProvider>
        <ErrorBoundary moduleName="NOX Control Center (Global)">
          <Toaster />
          <Sonner position="top-right" richColors theme="dark" />
          <Routes>
            {/* Rota pública de Intake sem autenticação, sem verificação de sessão e sem Layout administrativo */}
            <Route
              path="/intake"
              element={
                <ErrorBoundary moduleName="Intake Público">
                  <IntakePublicPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/intake/*"
              element={
                <ErrorBoundary moduleName="Intake Público">
                  <IntakePublicPage />
                </ErrorBoundary>
              }
            />

            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route
                path="/sentinela"
                element={
                  <ProtectedModuleRoute moduleKey="sentinela" moduleName="Sentinela NOX / DJEN">
                    <ErrorBoundary moduleName="Sentinela NOX / DJEN">
                      <SentinelaPage />
                    </ErrorBoundary>
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/sentinela/:subarea"
                element={
                  <ProtectedModuleRoute moduleKey="sentinela" moduleName="Sentinela NOX / DJEN">
                    <ErrorBoundary moduleName="Sentinela NOX / DJEN">
                      <SentinelaPage />
                    </ErrorBoundary>
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedModuleRoute moduleKey="clientes" moduleName="Clientes & Intake">
                    <ErrorBoundary moduleName="Clientes (Controladoria Jurídica)">
                      <ClientesPage />
                    </ErrorBoundary>
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/central-prazos"
                element={
                  <ProtectedModuleRoute moduleKey="central_prazos" moduleName="Central de Prazos">
                    <ErrorBoundary moduleName="Central de Prazos">
                      <CentralPrazosPage />
                    </ErrorBoundary>
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/compromissos"
                element={
                  <ProtectedModuleRoute moduleKey="compromissos" moduleName="Compromissos">
                    <ErrorBoundary moduleName="Compromissos">
                      <CompromissosPage />
                    </ErrorBoundary>
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/radar"
                element={
                  <ProtectedModuleRoute moduleKey="radar" moduleName="Radar de Alertas">
                    <RadarPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/producao"
                element={
                  <ProtectedModuleRoute moduleKey="producao" moduleName="Produção de Peças">
                    <ProducaoPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/processos"
                element={
                  <ProtectedModuleRoute moduleKey="processos" moduleName="Processos">
                    <ProcessesPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/importacoes"
                element={
                  <ProtectedModuleRoute moduleKey="importacoes" moduleName="Importações CSV">
                    <ImportsPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/revisao"
                element={
                  <ProtectedModuleRoute moduleKey="revisao" moduleName="Revisão Operacional">
                    <ReviewPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/exportacoes"
                element={
                  <ProtectedModuleRoute moduleKey="exportacoes" moduleName="Exportações">
                    <ExportsPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/lex-tempus"
                element={
                  <ProtectedModuleRoute moduleKey="lex_tempus" moduleName="LEX TEMPUS">
                    <LexTempusPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/auditoria"
                element={
                  <ProtectedModuleRoute moduleKey="auditoria" moduleName="Trilha de Auditoria">
                    <AuditPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <ProtectedModuleRoute moduleKey="configuracoes" moduleName="Configurações">
                    <SettingsPage />
                  </ProtectedModuleRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ErrorBoundary moduleName="Usuários e Permissões">
                    <ProtectedModuleRoute
                      moduleKey="usuarios"
                      moduleName="Usuários e Permissões"
                      requiredAdmin
                    >
                      <UsuariosPage />
                    </ProtectedModuleRoute>
                  </ErrorBoundary>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </TooltipProvider>
    </BrowserRouter>
  </div>
)

export default App
