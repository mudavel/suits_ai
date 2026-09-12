import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react'

export default function RoleRoute({ allowedRoles, children }) {
  const { currentProfile, switchProfile } = useAuth()

  if (!allowedRoles.includes(currentProfile.id)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="h-14 w-14 rounded-lg bg-negative-soft border border-line text-negative flex items-center justify-center mx-auto shadow-none shadow-none">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-negative bg-negative-soft border border-line px-2.5 py-1 rounded-full">
            Perfil da diretoria
          </span>
          <h2 className="text-2xl font-bold text-ink tracking-tight mt-3">
            Governança do contencioso
          </h2>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            O painel de <strong>Governança e acompanhamento do contencioso</strong> é de acesso restrito à Diretoria Jurídica e Gestão Centralizada do <strong>Banco Unicamp S.A.</strong>
          </p>
        </div>

        <div className="p-4 rounded-lg border border-line bg-surface text-xs text-muted max-w-lg mx-auto text-left space-y-1.5">
          <div className="text-ink font-semibold flex items-center gap-1.5">
            <span>Perfil Ativo:</span>
            <span className="text-accent-ink">{currentProfile.name} ({currentProfile.badge})</span>
          </div>
          <p>
            Advogados credenciados têm permissão de acesso à <strong>Triagem de Casos</strong> e ao <strong>Ambiente de Elaboração de Peças e Consulta de Alçada</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/triagem"
            className="w-full sm:w-auto px-4 py-2 bg-accent hover:bg-accent text-ink text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Triagem de Casos</span>
          </Link>

          <button
            onClick={() => switchProfile('BANK')}
            className="w-full sm:w-auto px-4 py-2 bg-surface hover:bg-surface-hover border border-line text-ink text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-accent-ink" />
            <span>Alternar para Diretoria (Banco)</span>
          </button>

          <button
            onClick={() => switchProfile('FDE')}
            className="w-full sm:w-auto px-4 py-2 bg-surface hover:bg-surface-hover border border-line text-ink text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-accent-ink" />
            <span>Alternar para FDE (Enter AI)</span>
          </button>
        </div>
      </div>
    )
  }

  return children
}
