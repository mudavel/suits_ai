import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, ArrowLeft, RefreshCw, UserCheck } from 'lucide-react'

export default function RoleRoute({ allowedRoles, children }) {
  const { currentProfile, switchProfile } = useAuth()

  if (!allowedRoles.includes(currentProfile.id)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="h-14 w-14 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-950/40">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/40 border border-rose-900/60 px-2.5 py-1 rounded-full">
            Acesso Restrito • 403 Proibido
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-3">
            Cockpit Exclusivo da Defesa do Banco
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            O painel de <strong>Governança, Aderência (A01) e Sensibilidade Contrafactual</strong> é de acesso restrito à Diretoria Jurídica e Gestão Centralizada do <strong>Banco Unicamp S.A.</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs text-slate-400 max-w-lg mx-auto text-left space-y-1.5">
          <div className="text-slate-200 font-semibold flex items-center gap-1.5">
            <span>Perfil Ativo:</span>
            <span className="text-blue-400">{currentProfile.name} ({currentProfile.badge})</span>
          </div>
          <p>
            Advogados credenciados têm permissão de acesso à <strong>Triagem de Casos</strong> e ao <strong>Workspace de Elaboração de Peças e Simulação de Alçada</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/triagem"
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Triagem de Casos</span>
          </Link>

          <button
            onClick={() => switchProfile('BANK')}
            className="w-full sm:w-auto px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Alternar para Dra. Mariana Souza (Banco)</span>
          </button>
        </div>
      </div>
    )
  }

  return children
}
