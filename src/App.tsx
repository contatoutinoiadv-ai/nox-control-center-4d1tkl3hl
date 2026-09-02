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
import CentralPrazosPage from './pages/CentralPrazosPage'
import CompromissosPage from './pages/CompromissosPage'
import ClientesPage from './pages/ClientesPage'
import ProducaoPage from './pages/ProducaoPage'
import IntakePublicPage from './pages/IntakePublicPage'
import NotFound from './pages/NotFound'

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
                  <ErrorBoundary moduleName="Sentinela NOX / DJEN">
                    <SentinelaPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/sentinela/:subarea"
                element={
                  <ErrorBoundary moduleName="Sentinela NOX / DJEN">
                    <SentinelaPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ErrorBoundary moduleName="Clientes (Controladoria Jurídica)">
                    <ClientesPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/central-prazos"
                element={
                  <ErrorBoundary moduleName="Central de Prazos">
                    <CentralPrazosPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/compromissos"
                element={
                  <ErrorBoundary moduleName="Compromissos">
                    <CompromissosPage />
                  </ErrorBoundary>
                }
              />
              <Route path="/radar" element={<RadarPage />} />
              <Route path="/producao" element={<ProducaoPage />} />
              <Route path="/processos" element={<ProcessesPage />} />
              <Route path="/importacoes" element={<ImportsPage />} />
              <Route path="/revisao" element={<ReviewPage />} />
              <Route path="/exportacoes" element={<ExportsPage />} />
              <Route path="/lex-tempus" element={<LexTempusPage />} />
              <Route path="/auditoria" element={<AuditPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </TooltipProvider>
    </BrowserRouter>
  </div>
)

export default App
