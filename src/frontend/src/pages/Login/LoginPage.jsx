import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, Cpu, CornerDownLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Brand from '../../components/Brand/Brand'

const roles = [
  {
    key: 'LAWYER',
    title: 'Advogado',
    description: 'Analise processos, consulte documentos e prepare sua estratégia com alçadas.',
    icon: BriefcaseBusiness,
  },
  {
    key: 'BANK',
    title: 'Diretoria jurídica',
    description: 'Acompanhe a operação e os indicadores de governança em tempo real.',
    icon: Building2,
  },
  {
    key: 'FDE',
    title: 'Forward Deployed Engineer',
    description: 'Simule a carteira histórica de 60k casos e projete o ROI atuarial da operação.',
    icon: Cpu,
  },
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
          <p className="login-description">Dos documentos à decisão. Um espaço para entender cada caso e construir o próximo passo.</p>
          <div className="login-signature" aria-hidden="true">
            <span className="signature-line" /><span className="signature-word">Contexto. Estratégia. Ação.</span>
            <CornerDownLeft size={22} strokeWidth={1.2} />
          </div>
        </section>
        <section className="login-access" aria-labelledby="access-title">
          <div className="access-heading"><span className="eyebrow">COMECE POR AQUI</span><span className="access-number">01 — 03</span></div>
          <h2 id="access-title">Qual é o seu perfil?</h2>
          <p className="access-description">Escolha como deseja acessar a plataforma.</p>
          <div className="profile-options">
            {roles.map(({ key, title, description, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleEnter(key)}
                className={'profile-option ' + (currentProfile.id === key ? 'profile-option--selected' : '')}
              >
                <span className="profile-icon"><Icon size={22} strokeWidth={1.4} /></span>
                <span className="profile-content">
                  <span className="profile-title">{title}</span>
                  <span className="profile-description">{description}</span>
                  <span className="profile-person">{PROFILES[key].name} ({PROFILES[key].organization})</span>
                </span>
                <span className="profile-arrow"><ArrowUpRight size={22} strokeWidth={1.5} /></span>
              </button>
            ))}
          </div>
          <p className="access-note">Perfis de demonstração para conhecer a plataforma.</p>
        </section>
      </main>
      <div className="login-bottom-band"><span>O próximo passo começa com contexto.</span><ArrowRight size={24} strokeWidth={1.4} /></div>
      <footer className="login-footer"><span>Enter OS · Hackathon 2026</span><span>Decisões com contexto. Revisão humana em cada etapa.</span></footer>
    </div>
  )
}
