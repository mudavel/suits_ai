import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileCheck,
  FileSpreadsheet,
  Bot,
  Send,
  Sparkles,
  Download,
  Swords,
  Scale
} from 'lucide-react'

export default function WorkspacePage() {
  const { caseId } = useParams()
  const [activeTab, setActiveTab] = useState('autos')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Olá, Dr(a). Sou o Copiloto Jurídico do EnterOS. Analisei os autos e subsídios do caso #${caseId}. Como posso auxiliar na sua estratégia de defesa ou na minuta de acordo?`,
    },
  ])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    const newMsg = { sender: 'user', text: chatMessage }
    setMessages((prev) => [...prev, newMsg])
    setChatMessage('')

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Entendido. Com base nos dados do Banco Unicamp e na jurisprudência recente desta comarca, nossa probabilidade de êxito na tese de regularidade da contratação é de 82%.`,
        },
      ])
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Voltar para Triagem"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Processo nº 1002345-89.2024.8.26.0100
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                Recomendação: DEFESA
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autor: Carlos Eduardo da Silva • 2ª Vara Cível de Campinas/SP • Valor da Causa: R$ 18.500,00
            </p>
          </div>
        </div>

        {/* Quick Decision Actions */}
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
            <Scale className="w-4 h-4" />
            Minuta de Contestação
          </button>
          <button className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
            <Download className="w-4 h-4" />
            Baixar PDF Timbrado (WeasyPrint)
          </button>
        </div>
      </div>

      {/* EnterOS Policy Intelligence Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Diagnóstico EnterOS Jurimetria Calibrada
            </div>
            <h2 className="text-lg font-bold text-white">
              Cadeia Probatória Conforme — Risco Baixo de Condenação
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O banco possui o instrumento contratual digital assinado via selfie/biometria facial, comprovante de transferência TED para conta de mesma titularidade e histórico cadastral sem contestações prévias no BACEN/Consumidor.gov.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-slate-800/80 p-4 rounded-lg border border-slate-700 shrink-0">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Custo Esperado E[Perda]</p>
              <p className="text-xl font-black text-rose-400">R$ 2.100,00</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Alçada Máx. Acordo</p>
              <p className="text-xl font-black text-amber-400">R$ 3.500,00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Split-View (Autos vs Subsídios) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[580px]">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('autos')}
              className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'autos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Autos da Ação (Petição Inicial & Procuração)
            </button>
            <button
              onClick={() => setActiveTab('subsidios')}
              className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'subsidios'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Subsídios do Banco Unicamp (Dossiê Probatório)
            </button>
            <button
              onClick={() => setActiveTab('warroom')}
              className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'warroom'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Swords className="w-4 h-4 text-amber-500" />
              War Room Judiciário
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 flex-1 text-sm text-slate-700 overflow-y-auto">
            {activeTab === 'autos' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">Resumo da Petição Inicial</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    O Autor alega jamais ter contratado o empréstimo consignado nº 98412-BR no valor de R$ 18.500,00 debitado em sua conta corrente. Requer a declaração de inexistência do débito e indenização por danos morais no montante de R$ 10.000,00.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-100 p-3 rounded-lg bg-white">
                    <span className="text-slate-400 font-medium">Data do Ajuizamento:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">14/08/2024</p>
                  </div>
                  <div className="border border-slate-100 p-3 rounded-lg bg-white">
                    <span className="text-slate-400 font-medium">Comarca:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">Campinas / SP (2ª Vara Cível)</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subsidios' && (
              <div className="space-y-4">
                <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded-r-lg">
                  <h3 className="font-bold text-emerald-900 text-sm">Dossiê de Defesa Validado</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Todos os 3 subsídios críticos foram localizados e checados contra a base interna do Banco Unicamp.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800">1. Contrato Digital com Biometria</span>
                      <p className="text-[11px] text-slate-500">Hash SHA-256 verificado • IP: 187.32.11.90</p>
                    </div>
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-0.5 rounded">Conforme</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800">2. Comprovante de TED / PIX</span>
                      <p className="text-[11px] text-slate-500">Mesma titularidade do autor (CPF conferido)</p>
                    </div>
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-0.5 rounded">Conforme</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800">3. Consulta Histórico BACEN</span>
                      <p className="text-[11px] text-slate-500">Inexistência de reclamação anterior ou contestação de fraude</p>
                    </div>
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-0.5 rounded">Conforme</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'warroom' && (
              <div className="space-y-4">
                <div className="border border-slate-200 p-4 rounded-lg">
                  <h3 className="font-bold text-slate-900 text-xs uppercase text-amber-600 mb-1 flex items-center gap-1.5">
                    <Swords className="w-4 h-4" /> Teses do Atacante (Autor)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Alegam vulnerabilidade do consumidor e fraude de terceiro com inversão do ônus da prova (Súmula 479 do STJ).
                  </p>
                </div>
                <div className="border border-slate-200 p-4 rounded-lg">
                  <h3 className="font-bold text-slate-900 text-xs uppercase text-blue-600 mb-1 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" /> Tendência do Juízo Local
                  </h3>
                  <p className="text-xs text-slate-600">
                    Juiz titular da 2ª Vara Cível exige apenas contrato com selfie e comprovante de destinação do crédito para julgar improcedente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Lawyer Copilot Chat */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[580px]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50 rounded-t-xl">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Copiloto Jurídico GPT-4o</h2>
              <p className="text-[11px] text-slate-500">Contextualizado nos autos do caso #{caseId}</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                    : 'mr-auto bg-slate-100 text-slate-800 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Pergunte ao copiloto sobre o caso..."
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
