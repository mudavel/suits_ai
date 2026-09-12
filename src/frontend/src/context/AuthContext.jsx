import { createContext, useContext, useState } from 'react'

const PROFILES = {
  LAWYER: {
    id: 'LAWYER',
    name: 'Dr. Lucas Ramos',
    title: 'Advogado Sênior Contencioso',
    organization: 'Pinheiro & Associados Advogados',
    badge: 'Advogado Credenciado',
    avatar: 'LR',
    color: 'blue',
    defaultRoute: '/triagem',
  },
  BANK: {
    id: 'BANK',
    name: 'Dra. Mariana Souza',
    title: 'Diretora Jurídica & Governança',
    organization: 'Banco Unicamp S.A.',
    badge: 'Diretoria Jurídica',
    avatar: 'MS',
    color: 'indigo',
    defaultRoute: '/monitoramento',
  },
  FDE: {
    id: 'FDE',
    name: 'Alexandre Prado',
    title: 'Forward Deployed Engineer',
    organization: 'Enter AI Solutions',
    badge: 'Engenharia de Implantação (FDE)',
    avatar: 'AP',
    color: 'emerald',
    defaultRoute: '/simulacao',
  },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentProfile, setCurrentProfile] = useState(() => {
    const saved = localStorage.getItem('enter_profile')
    return PROFILES[saved] || PROFILES.LAWYER
  })

  const switchProfile = (roleKey) => {
    const newProfile = PROFILES[roleKey] || PROFILES.LAWYER
    setCurrentProfile(newProfile)
    localStorage.setItem('enter_profile', newProfile.id)
  }

  return (
    <AuthContext.Provider value={{ currentProfile, switchProfile, PROFILES }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
