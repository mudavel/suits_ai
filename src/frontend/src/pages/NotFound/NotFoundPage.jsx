import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-black text-ink">404</h1>
      <h2 className="text-xl font-bold text-ink mt-2">Página não encontrada</h2>
      <p className="text-sm text-muted mt-1 max-w-md">
        A rota informada não existe ou o processo judicial não foi localizado no sistema Suits AI.
      </p>
      <Link
        to="/triagem"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-ink text-xs font-semibold rounded-lg shadow-none transition-colors"
      >
        <Home className="w-4 h-4" />
        Voltar para a Triagem
      </Link>
    </div>
  )
}

