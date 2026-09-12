import { useState, useEffect } from 'react'
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
  Scale,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertOctagon,
  Check,
  Copy,
  ChevronRight
} from 'lucide-react'
import { fetchCases } from '../../services/api'

export default function WorkspacePage() {
  const { caseId } = useParams()
  const [activeTab, setActiveTab] = useState('autos')
  const [chatMessage, setChatMessage] = useState('')
  const [currentCase, setCurrentCase] = useState(null)
  const [copied, setCopied] = useState(false)
  const [counterOffer, setCounterOffer] = useState(2500)
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Analisei os autos e os subsídios bancários deste caso. O score de conformidade documental é de 3/3. Como deseja proceder?`,
    },
  ])

  useEffect(() => {
    fetchCases().then(({ data }) => {
      const found = data.find((c) => String(c.id) === String(caseId)) || data[0]
      setCurrentCase(found)
      if (found?.settlementPricing?.target) {
        setCounterOffer(found.settlementPricing.target)
      }
    })
  }, [caseId])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    const newMsg = { sender: 'user', text: chatMessage }
    setMessages((prev) => [...prev, newMsg])
    const prompt = chatMessage.toLowerCase()
    setChatMessage('')

    setTimeout(() => {
      let aiReply = `Com base na cadeia probatória analisada pelo EnterOS, a probabilidade de vitória na tese de regularidade da contratação é de ${(100 - (currentCase?.lossProbability || 0.1) * 100).toFixed(0)}%. Os documentos essenciais estão validados.`
      if (prompt.includes('acordo') || prompt.includes('alçada') || prompt.includes('valor')) {
        aiReply = `A recomendação atuarial do Banco Unicamp indica Piso de R$ ${currentCase?.settlementPricing?.floor?.toLocaleString('pt-BR')}, Valor Alvo de R$ ${currentCase?.settlementPricing?.target?.toLocaleString('pt-BR')} e Teto de Alçada de R$ ${currentCase?.settlementPricing?.ceiling?.toLocaleString('pt-BR')}.`
      } else if (prompt.includes('petição') || prompt.includes('resumo') || prompt.includes('autor')) {
        aiReply = `O autor alega desconhecimento da contratação do empréstimo pessoal com descontos em folha. Contudo, juntamos a CCB assinada digitalmente com biometria facial e comprovante de TED para conta bancária do próprio autor.`
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
        },
      ])
    }, 450)
  }

  const handleCopyCNJ = () => {
    if (currentCase?.caseNumber) {
      navigator.clipboard.writeText(currentCase.caseNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isDefense = currentCase?.recommendation === 'DEFESA'
  const isWithinCeiling = counterOffer <= (currentCase?.settlementPricing?.ceiling || 3500)

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Case Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/triagem"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
            title="Voltar para Triagem"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {currentCase?.claimant || 'Carlos Eduardo da Silva'}
              </h1>
              <span className="text-slate-500 font-mono text-xs">
                {currentCase?.caseNumber || '0801234-56.2024.8.10.0001'}
              </span>
              <button
                onClick={handleCopyCNJ}
                className="text-slate-500 hover:text-slate-300 p-0.5"
                title="Copiar CNJ"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentCase?.court || '1ª Vara Cível'} • Valor da Causa: R$ {currentCase?.claimValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`px-2.5 py-1 rounded-md font-semibold border ${
              isDefense
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                : 'text-amber-400 bg-amber-950/40 border-amber-800/60'
            }`}
          >
            {currentCase?.recommendation || 'DEFESA'}
          </span>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Gerar Minuta</span>
          </button>
        </div>
      </div>

      {/* Structured Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Document Viewer & War Room */}
        <div className="lg:col-span-8 border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.01] flex flex-col min-h-[560px]">
          {/* Tabs */}
          <div className="flex items-center border-b border-white/[0.08] px-3 bg-white/[0.02]">
            <button
              onClick={() => setActiveTab('autos')}
              className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'autos'
                  ? 'border-blue-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Autos da Ação (Petição Inicial)
            </button>
            <button
              onClick={() => setActiveTab('subsidios')}
              className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'subsidios'
                  ? 'border-blue-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Subsídios do Banco (3/3)
            </button>
            <button
              onClick={() => setActiveTab('warroom')}
              className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'warroom'
                  ? 'border-blue-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              War Room Judicial
            </button>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[500px]">
            {activeTab === 'autos' && (
              <div className="space-y-3 font-mono bg-black/40 p-4 rounded-lg border border-white/[0.06]">
                <div className="text-[11px] text-blue-400 font-bold border-b border-white/[0.08] pb-1.5">
                  EXTRATO DOS AUTOS • PETIÇÃO INICIAL ID #098172
                </div>
                <p>
                  <strong>ALEGAÇÃO PRINCIPAL:</strong> O Autor declara que jamais contratou o empréstimo consignado com o Banco Unicamp, alegando descontos mensais indevidos de R$ 420,00 diretamente em seu benefício previdenciário.
                </p>
                <p>
                  <strong>PEDIDOS FORMULADOS:</strong> Declaração de nulidade do contrato, devolução em dobro do montante descontado e R$ 15.000,00 de indenização por danos morais.
                </p>
              </div>
            )}

            {activeTab === 'subsidios' && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Contrato Digital CCB #502348719
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Assinatura digital via biometria facial (selfie + liveness) com IP geolocalizado no domicílio do autor.
                  </p>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Comprovante de Transferência TED
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Valor integral de R$ 18.500,00 creditado na conta bancária de mesma titularidade (CPF idêntico).
                  </p>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Certidão BACEN / SCR
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Registro formalizado no Banco Central sem anotações de fraude.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'warroom' && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <span className="font-semibold text-amber-400">Teses Prováveis do Autor:</span>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Súmula 479/STJ alegando fortuito interno e responsabilidade objetiva bancária.
                  </p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <span className="font-semibold text-emerald-400">Neutralização Recomendada:</span>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Art. 373, II, CPC: Comprovação do efetivo usufruto do crédito em conta própria afasta o dano moral e confirma a regularidade do negócio.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Alçada & Copilot */}
        <div className="lg:col-span-4 space-y-4">
          {/* Alçada Simulator */}
          <div className="border border-white/[0.08] rounded-xl p-4 bg-white/[0.01] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Simulador de Alçada</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isWithinCeiling
                    ? 'text-emerald-400 bg-emerald-950/40'
                    : 'text-rose-400 bg-rose-950/40'
                }`}
              >
                {isWithinCeiling ? 'Dentro da Alçada' : 'Excede Limite'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Proposta:</span>
                <span className="text-slate-200 font-bold">
                  R$ {counterOffer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max={Math.max((currentCase?.claimValue || 10000), 5000)}
                step="100"
                value={counterOffer}
                onChange={(e) => setCounterOffer(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Alvo: R$ {currentCase?.settlementPricing?.target || 2500}</span>
                <span>Teto: R$ {currentCase?.settlementPricing?.ceiling || 3500}</span>
              </div>
            </div>
          </div>

          {/* Copilot Chat (Flat & Clean) */}
          <div className="border border-white/[0.08] rounded-xl bg-white/[0.01] flex flex-col h-[380px]">
            <div className="p-3 border-b border-white/[0.08] flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>Copiloto EnterOS</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg max-w-[92%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white ml-auto'
                      : 'bg-white/[0.04] text-slate-300 border border-white/[0.06] mr-auto'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-white/[0.08] flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Perguntar ao copiloto..."
                className="flex-1 bg-white/[0.03] text-white text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
