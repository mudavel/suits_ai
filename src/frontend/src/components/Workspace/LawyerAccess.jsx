import { useAuth } from '../../context/AuthContext'

export default function LawyerAccess({ purpose, disabled }) {
  const { currentProfile, switchProfile } = useAuth()
  if (currentProfile.id === 'LAWYER') return null
  return <div className="notice space-y-3">
    <p>Você está no perfil <strong>{currentProfile.badge}</strong>. Para {purpose}, use o perfil Advogado desta demonstração.</p>
    <button type="button" className="button-primary" disabled={disabled} onClick={() => switchProfile('LAWYER')}>Continuar como Advogado</button>
  </div>
}
