import { NavLink, Outlet } from 'react-router-dom'
import { Scale, LayoutDashboard, Briefcase, BarChart3, ShieldCheck } from 'lucide-react'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white flex items-center gap-2">
                  EnterOS
                  <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-500/30">
                    Banco Unicamp
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 -mt-0.5">
                  Política Inteligente de Acordos & Governança Jurídica
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Briefcase className="w-4 h-4" />
                Triagem de Casos
              </NavLink>

              <NavLink
                to="/workspace/1"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Workspace
              </NavLink>

              <NavLink
                to="/monitoramento"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <BarChart3 className="w-4 h-4" />
                Cockpit Governança & ROI
              </NavLink>
            </nav>

            {/* Status / Compliance Tag */}
            <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Engine Híbrida Ativa</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          EnterOS Jurídico • Hackathon Unicamp • React 19 + Vite + Tailwind CSS + FastAPI
        </p>
      </footer>
    </div>
  )
}

