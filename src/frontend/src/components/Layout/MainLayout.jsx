import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Layers,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

export default function MainLayout() {
  const { currentProfile, switchProfile } = useAuth()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleProfileSwitch = (roleKey) => {
    switchProfile(roleKey)
    if (roleKey === 'LAWYER' && location.pathname === '/monitoramento') {
      navigate('/triagem')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-slate-100 font-sans selection:bg-blue-600">
      {/* Top Navbar — Sleek Enterprise Dark Header */}
      <header className="bg-[#07090E]/90 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Brand & Title */}
            <div className="flex items-center gap-6">
              <Link to="/triagem" className="flex items-center gap-2.5 group">
                <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  ENTER<span className="text-blue-400 font-normal">OS</span>
                  <span className="text-[10px] text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                    BANCO UNICAMP
                  </span>
                </span>
              </Link>

              {/* Central Navigation Tabs — Role-based access */}
              <nav className="hidden md:flex items-center gap-1 border-l border-white/[0.08] pl-6">
                {currentProfile.id === 'LAWYER' ? (
                  <>
                    <NavLink
                      to="/triagem"
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'text-white bg-white/[0.08] font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`
                      }
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Triagem de Casos
                    </NavLink>

                    <NavLink
                      to="/workspace/1"
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'text-white bg-white/[0.08] font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`
                      }
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Workspace do Caso
                    </NavLink>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/monitoramento"
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'text-white bg-white/[0.08] font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`
                      }
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Cockpit Governança & ROI
                    </NavLink>

                    <NavLink
                      to="/triagem"
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'text-white bg-white/[0.08] font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`
                      }
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Auditoria de Casos
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            {/* Right: Status Indicator & Active Persona Dropdown */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Random Forest Calibrado v2.4</span>
              </div>

              {/* Profile Dropdown / Quick Switch */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-xs"
                >
                  <div
                    className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center text-white ${
                      currentProfile.id === 'LAWYER' ? 'bg-blue-600' : 'bg-indigo-600'
                    }`}
                  >
                    {currentProfile.avatar}
                  </div>
                  <span className="font-medium text-slate-200 max-w-[130px] truncate">
                    {currentProfile.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.1] bg-[#0E121B] shadow-2xl p-1.5 z-50 text-xs space-y-1"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                      <p className="font-bold text-white">{currentProfile.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentProfile.organization}</p>
                    </div>

                    <div className="pt-1">
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Alternar Perfil em 1 Clique:
                      </p>
                      <button
                        type="button"
                        onClick={() => handleProfileSwitch('LAWYER')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          currentProfile.id === 'LAWYER'
                            ? 'bg-blue-600/20 text-blue-300 font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>Dr. Lucas Ramos (Advogado)</span>
                        {currentProfile.id === 'LAWYER' && <span className="text-[10px]">●</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleProfileSwitch('BANK')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          currentProfile.id === 'BANK'
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>Dra. Mariana Souza (Banco)</span>
                        {currentProfile.id === 'BANK' && <span className="text-[10px]">●</span>}
                      </button>
                    </div>

                    <div className="border-t border-white/[0.06] pt-1">
                      <Link
                        to="/login"
                        className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Ir para tela de Login</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Continuous Workspace View (No excess boxes) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
