import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, LogOut, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Brand from '../Brand/Brand'

export default function MainLayout() {
  const { currentProfile, switchProfile, PROFILES } = useAuth()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const dismiss = (event) => {
      if (event.key === 'Escape' || (event.type === 'pointerdown' && !profileRef.current?.contains(event.target))) setProfileDropdownOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [])

  const handleProfileSwitch = (role) => {
    switchProfile(role)
    setProfileDropdownOpen(false)
    if (role === 'LAWYER' && (location.pathname === '/monitoramento' || location.pathname === '/simulacao')) navigate('/triagem')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="app-header">
        <Link to="/triagem" className="brand-link" aria-label="Suits AI — início"><Brand compact /></Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <NavLink to="/triagem" className={({ isActive }) => isActive || location.pathname === '/cases' ? 'nav-item active' : 'nav-item'}>Processos</NavLink>
          {currentProfile.id === 'LAWYER' && location.pathname.startsWith('/workspace/') && <NavLink to={location.pathname} className="nav-item active">Workspace</NavLink>}
          {(currentProfile.id === 'BANK' || currentProfile.id === 'FDE') && (
            <>
              <NavLink to="/monitoramento" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Governança</NavLink>
              <NavLink to="/simulacao" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Simulação 60k (FDE)</NavLink>
            </>
          )}
        </nav>
        <div className="header-actions">
          <span className="demo-label"><span className="status-dot" /> Demonstração</span>
          <div className="profile-control" ref={profileRef}>
            <button type="button" className="profile-trigger" aria-label={'Perfil: ' + currentProfile.name} aria-expanded={profileDropdownOpen} aria-controls="profile-options" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
              <span className="avatar">{currentProfile.avatar}</span><span className="profile-trigger-name">{currentProfile.name}</span><ChevronDown size={14} />
            </button>
            {profileDropdownOpen && <div className="profile-menu" id="profile-options">
              <div className="profile-menu-heading"><strong>{currentProfile.name}</strong><span>{currentProfile.organization}</span></div>
              <p className="eyebrow">ALTERAR PERFIL</p>
              {Object.values(PROFILES).map(profile => <button key={profile.id} type="button" className="profile-menu-item" onClick={() => handleProfileSwitch(profile.id)}><span>{profile.badge}</span>{currentProfile.id === profile.id ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>)}
              <Link to="/login" className="profile-menu-item profile-menu-exit" onClick={() => setProfileDropdownOpen(false)}><span>Voltar ao início</span><LogOut size={15} /></Link>
            </div>}
          </div>
        </div>
      </header>
      <main id="main-content" className="app-main"><Outlet /></main>
      <footer className="app-footer"><span>Suits AI</span><span>Inteligência para o contencioso <span className="small-square" /></span></footer>
    </div>
  )
}
