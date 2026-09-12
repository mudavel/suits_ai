import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  Sparkles,
  Lock,
  CheckCircle2,
} from 'lucide-react'

export default function LoginPage() {
  const { currentProfile, switchProfile, PROFILES } = useAuth()
  const navigate = useNavigate()

  const handleSelectAndEnter = (roleKey) => {
    switchProfile(roleKey)
    const target = PROFILES[roleKey]?.defaultRoute || '/'
    navigate(target)
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-blue-600">
      {/* Top Brand Tag */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            ENTER<span className="text-blue-400 font-normal">OS</span>
            <span className="text-[10px] text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded ml-1 font-mono">
              v2.4
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Ambiente Seguro • Banco Unicamp</span>
        </div>
      </div>

      {/* Main Authentication & Profile Selection Flow */}
      <div className="max-w-2xl w-full mx-auto my-auto py-12 space-y-8">
        {/* Title & Headline */}
        <div className="space-y-2 text-center sm:text-left">
          <p className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
            Sistema Operacional de IA Jurídica
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Selecione seu perfil de acesso
          </h1>
          <p className="text-sm text-slate-400 max-w-lg">
            Acesse a esteira de análise contenciosa com calibragem atuarial em tempo real e copiloto de minutas.
          </p>
        </div>

        {/* Profile Selection Options (Minimalist Enterprise List) */}
        <div className="space-y-3">
          {/* Option 1: Lawyer */}
          <div
            onClick={() => handleSelectAndEnter('LAWYER')}
            className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
              currentProfile.id === 'LAWYER'
                ? 'bg-slate-900/90 border-blue-500/60 shadow-lg shadow-blue-900/20'
                : 'bg-slate-950/60 border-white/[0.08] hover:border-white/20 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                LR
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    Dr. Lucas Ramos
                  </span>
                  <span className="text-[10px] font-semibold text-blue-300 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-full">
                    Advogado Credenciado
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pinheiro & Associados Advogados • Fila de Triagem & Minutas de Defesa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Option 2: Bank Legal Board */}
          <div
            onClick={() => handleSelectAndEnter('BANK')}
            className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
              currentProfile.id === 'BANK'
                ? 'bg-slate-900/90 border-indigo-500/60 shadow-lg shadow-indigo-900/20'
                : 'bg-slate-950/60 border-white/[0.08] hover:border-white/20 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
                MS
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    Dra. Mariana Souza
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                    Diretoria do Banco
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Banco Unicamp S.A. • Cockpit de Governança, Aderência (A01) & ROI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Feature Highlights Minimal Line */}
        <div className="pt-4 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Random Forest Calibrado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Simulador Atuarial de Alçada</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Monitoramento Contrafactual</span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-5xl w-full mx-auto text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/[0.04]">
        <p>EnterOS • Hackathon UFMG / Unicamp 2026</p>
        <p>Desenvolvido para operações de contencioso massificado</p>
      </div>
    </div>
  )
}
