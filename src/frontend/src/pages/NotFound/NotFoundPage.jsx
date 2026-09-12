import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-3xl text-ink">Página não encontrada</h1>
      <p className="text-sm text-muted mt-1 max-w-md">
        Não encontramos a página ou o processo solicitado. Consulte a lista de processos para continuar.
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

