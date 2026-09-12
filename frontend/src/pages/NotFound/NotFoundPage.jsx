import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-black text-slate-300">404</h1>
      <h2 className="text-xl font-bold text-slate-800 mt-2">Página não encontrada</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-md">
        A rota informada não existe ou o processo judicial não foi localizado no sistema EnterOS.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
      >
        <Home className="w-4 h-4" />
        Voltar para a Triagem
      </Link>
    </div>
  )
}

