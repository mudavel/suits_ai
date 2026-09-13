import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/Login/LoginPage'
import CaseSelectionPage from './pages/CaseSelection/CaseSelectionPage'
import WorkspacePage from './pages/Workspace/WorkspacePage'
const MonitoringPage = lazy(() => import('./pages/Monitoring/MonitoringPage'))
const HistoricalPage = lazy(() => import('./pages/Monitoring/HistoricalPage'))
import NotFoundPage from './pages/NotFound/NotFoundPage'
import RoleRoute from './components/Auth/RoleRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Tela Inicial: Login & Seleção de Perfil */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Autenticadas com Shell/Layout Principal */}
          <Route element={<MainLayout />}>
            <Route path="/triagem" element={<CaseSelectionPage />} />
            <Route path="/cases" element={<CaseSelectionPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/workspace/:caseId" element={<WorkspacePage />} />
            <Route
              path="/monitoramento"
              element={
                <RoleRoute allowedRoles={['BANK']}>
                  <Suspense fallback={<p role="status">Carregando governança...</p>}><MonitoringPage /></Suspense>
                </RoleRoute>
              }
            />
            <Route path="/simulacao" element={<Navigate to="/monitoramento" replace />} />
            <Route path="/base-historica" element={<RoleRoute allowedRoles={['BANK']}><Suspense fallback={<p role="status">Carregando base histórica...</p>}><HistoricalPage /></Suspense></RoleRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
