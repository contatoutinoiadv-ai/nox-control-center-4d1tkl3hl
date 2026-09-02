/* Main App Component - Handles routing, query client and other providers */
import { HashRouter, Routes, Route } from 'react-router-dom'
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
import NotFound from './pages/NotFound'

const App = () => (
  <div translate="no" className="notranslate min-h-screen">
    <HashRouter>
      <TooltipProvider>
        <ErrorBoundary moduleName="NOX Control Center (Global)">
          <Toaster />
          <Sonner position="top-right" richColors theme="dark" />
          <Routes>
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
                path="/central-prazos"
                element={
                  <ErrorBoundary moduleName="Central de Prazos">
                    <CentralPrazosPage />
                  </ErrorBoundary>
                }
              />
              <Route path="/radar" element={<RadarPage />} />
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
    </HashRouter>
  </div>
)

export default App
