import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BriefcaseBusiness, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Brand from '../../components/Brand/Brand'

const roles = [
  { key: 'LAWYER', title: 'Advogado', description: 'Trabalhe em cada processo: confira o parecer, prepare a minuta e registre a decisão.', icon: BriefcaseBusiness },
  { key: 'BANK', title: 'Diretoria jurídica', description: 'Supervisione a efetividade da política, a aderência dos advogados e as lacunas documentais.', icon: Building2 },
]

export default function LoginPage() {
  const { currentProfile, switchProfile, PROFILES } = useAuth()
  const navigate = useNavigate()

  const handleEnter = (role) => {
    switchProfile(role)
    navigate(PROFILES[role].defaultRoute)
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <span className="login-context"><span className="status-dot" /> Ambiente de demonstração</span>
      </header>
      <main className="login-main">
        <section className="login-intro" aria-labelledby="login-title">
          <p className="eyebrow"><span className="small-square" /> INTELIGÊNCIA PARA O CONTENCIOSO</p>
          <h1 id="login-title">Seu jurídico,<br />com mais <span className="title-emphasis">clareza.</span></h1>
          <p className="login-description">Pareceres fundamentados nos autos, preparação de minutas e acompanhamento da carteira em um só lugar.</p>
        </section>
        <section className="login-access" aria-labelledby="access-title">
          <h2 id="access-title">Qual é o seu perfil?</h2>
          <div className="profile-options">
            {roles.map(({ key, title, description, icon: Icon }) => (
              <button key={key} type="button" onClick={() => handleEnter(key)} className={'profile-option ' + (currentProfile.id === key ? 'profile-option--selected' : '')}>
                <span className="profile-icon"><Icon size={22} strokeWidth={1.4} /></span>
                <span className="profile-content"><span className="profile-title">{title}</span><span className="profile-description">{description}</span><span className="profile-person">{PROFILES[key].name}</span></span>
                <span className="profile-arrow"><ArrowUpRight size={22} strokeWidth={1.5} /></span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className="login-footer"><span>Enter OS · Hackathon 2026</span><span>Revisão humana em cada etapa.</span></footer>
    </div>
  )
}
