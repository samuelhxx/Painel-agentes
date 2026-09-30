import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchPainel, iniciarLeitura } from './sheet.js'
import { MAX_EVENTOS } from './config.js'
import { hhmmss } from './time.js'
import { computeLayout } from './layout.js'
import { focarEm, focarPose, foco, voltarVisaoGeral, useAproximado, estaAproximado } from './scene/focus.js'
import { lerCrm, lerCrmDetalhe, resumir, ordenarDetalhe } from './crm.js'
import TecladoPin from './ui/TecladoPin.jsx'
import Scene from './scene/Scene.jsx'
import SidePanel from './ui/SidePanel.jsx'
import EventLog from './ui/EventLog.jsx'
import Terminal from './ui/Terminal.jsx'
import Aprovacoes from './ui/Aprovacoes.jsx'

// Tela de carregando (fica no index.html): avança a barra e some quando a cena está pronta.
function carregando(pct, etapa) {
  const barra = document.getElementById('carregando-barra')
  const texto = document.getElementById('carregando-etapa')
  if (barra) barra.style.width = `${pct}%`
  if (texto && etapa) texto.textContent = etapa
}
function fimDoCarregando() {
  const tela = document.getElementById('carregando')
  if (!tela) return
  carregando(100, 'pronto')
  tela.classList.add('saindo')
  setTimeout(() => tela.remove(), 400)
}
carregando(35, 'lendo a planilha')

export default function App() {
  const [agentes, setAgentes] = useState([])
  const [eventos, setEventos] = useState([])
  const [erro, setErro] = useState(null)
  const [sync, setSync] = useState(null)
  const [fonte, setFonte] = useState('PORTA') // de onde veio a última leitura: PORTA ou CSV (reserva)
  const [pausado, setPausado] = useState(false)
  const leitura = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  // Os dois painéis começam recolhidos: a tela abre limpa, só o galpão.
  const [gaveta, setGaveta] = useState(false)
  const [logAberto, setLogAberto] = useState(false)
  const [aprovacoesAbertas, setAprovacoesAbertas] = useState(false)
  const aproximado = useAproximado()

  // Sala comercial. O PIN aceito fica só neste ref e só enquanto a sala está aberta:
  // fechou a sala, a lista e o PIN somem da memória; abrir de novo pede o PIN de novo.
  const [salaAberta, setSalaAberta] = useState(false)
  const [crmResumo, setCrmResumo] = useState(null)
  const [crmDetalhe, setCrmDetalhe] = useState(null)
  const [teclado, setTeclado] = useState(false)
  const [pinErro, setPinErro] = useState(null)
  const [pinConferindo, setPinConferindo] = useState(false)
  const pinSala = useRef(null)

  // O cache do Google às vezes serve versões diferentes (e mais antigas) do CSV.
  // Por isso nada é substituído às cegas:
  // - agentes: um agente que já apareceu nunca some, e uma linha mais velha não sobrescreve a mais nova;
  // - eventos: só acumulam (append-only). Se apareceu uma vez, existe.
  const estadoAgentes = useRef(new Map()) // id -> agente (com "desde")
  const historico = useRef(new Map()) // chave horario|agente|evento -> evento
  const primeiraLeitura = useRef(true)
  // Agentes cuja aprovação foi decidida neste painel: id -> momento da decisão.
  // O CSV publicado tem cache de alguns minutos e continua dizendo "aguardando_aprovacao";
  // enquanto ele não trouxer uma linha mais nova que a decisão, vale o que decidimos aqui.
  const resolvidos = useRef(new Map())

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const { agentes: dados, eventos: evs, fonte: veio } = await fetchPainel()
        if (!ativo) return
        const now = Date.now()

        const estado = estadoAgentes.current
        for (let a of dados) {
          const decidido = resolvidos.current.get(a.id)
          if (decidido != null) {
            if (a.status === 'aguardando_aprovacao' && !(a.atualizado > decidido)) a = { ...a, status: 'ocioso' }
            else resolvidos.current.delete(a.id) // o CSV alcançou a decisão (ou há um pedido novo)
          }
          const prev = estado.get(a.id)
          if (prev && prev.atualizado && a.atualizado && a.atualizado < prev.atualizado) continue // versão velha
          let desde
          if (!prev) desde = a.atualizado ?? now
          else if (prev.status !== a.status) desde = a.atualizado && a.atualizado > prev.desde ? a.atualizado : now
          else desde = prev.desde
          estado.set(a.id, { ...a, desde })
        }
        setAgentes([...estado.values()])

        const hist = historico.current
        let mudou = false
        for (const e of evs) {
          if (hist.has(e.id)) continue
          hist.set(e.id, { ...e, novo: !primeiraLeitura.current })
          mudou = true
        }
        if (mudou || primeiraLeitura.current) {
          setEventos(
            [...hist.values()]
              .sort((a, b) => b.t - a.t || b.ordem - a.ordem) // mais recente primeiro
              .slice(0, MAX_EVENTOS),
          )
        }
        // marca de tempo: quando chegaram os primeiros dados (medição de abertura)
        const marcas = (window.__marcas ||= {})
        if (marcas.dados == null) carregando(70, 'montando o galpão')
        marcas.dados ??= performance.now()
        primeiraLeitura.current = false
        setFonte(veio)
        setErro(null)
        setSync(now)
      } catch (e) {
        // A tela fica com o último estado recebido; só aparece o aviso.
        if (ativo) setErro(e.message)
        if (window.__marcas?.dados == null) carregando(35, 'sem conexão com a planilha · tentando de novo')
      }
    }
    leitura.current = iniciarLeitura(carregar, { aoPausar: (p) => ativo && setPausado(p) })
    return () => { ativo = false; leitura.current?.encerrar() }
  }, [])
  const retomar = useCallback(() => leitura.current?.retomar(), [])

  // Chamado pelo painel de aprovações assim que o servidor confirma a decisão.
  const marcarResolvidos = useCallback((ids) => {
    const t = Date.now()
    const estado = estadoAgentes.current
    for (const id of ids) {
      resolvidos.current.set(id, t)
      const a = estado.get(id)
      if (a?.status === 'aguardando_aprovacao') estado.set(id, { ...a, status: 'ocioso', desde: t })
    }
    setAgentes([...estado.values()])
  }, [])
  const abrirAprovacoes = useCallback(() => { setAprovacoesAbertas(true); setGaveta(false) }, [])
  const fecharAprovacoes = useCallback(() => setAprovacoesAbertas(false), [])

  const layout = useMemo(() => computeLayout(agentes), [agentes])
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  // Selecionar um agente (na cena ou nas listas) abre o detalhe e aproxima a câmera dele.
  // A câmera nunca fica presa: arrastar e dar zoom continuam livres.
  const selecionar = useCallback((id) => {
    setSelectedId(id)
    const p = layoutRef.current.posicoes.find((q) => q.agente.id === id)
    if (p) focarEm(p.x, p.z, { y: 1.1, dist: 7.5 })
  }, [])
  const selecionarDaLista = useCallback((id) => { selecionar(id); setGaveta(false) }, [selecionar])

  // Sair (Esc, X do painel, clique no vazio, botão VISÃO GERAL): fecha o detalhe e volta à visão geral.
  const fecharSala = useCallback(() => {
    pinSala.current = null
    setCrmDetalhe(null)
    setTeclado(false)
    setPinErro(null)
    setSalaAberta(false)
  }, [])

  const sair = useCallback(() => {
    setSelectedId(null)
    fecharSala()
    voltarVisaoGeral()
  }, [fecharSala])

  const alternarSala = useCallback(() => {
    if (salaAberta) { fecharSala(); voltarVisaoGeral(); return }
    setSelectedId(null)
    setSalaAberta(true)
    if (foco.sala) focarPose(foco.sala.pos, foco.sala.alvo)
  }, [salaAberta, fecharSala])

  // Telão: uma leitura por minuto, só com a sala aberta (e a aba visível, como o resto).
  // Com PIN aceito, a leitura já é a do detalhe; os números saem da mesma resposta.
  useEffect(() => {
    if (!salaAberta) return
    let ativo = true
    async function lerTelao() {
      try {
        const pin = pinSala.current
        const r = pin ? await lerCrmDetalhe(pin) : await lerCrm()
        if (!ativo) return
        setCrmResumo(resumir(r.propostas, r.hoje))
        if (pin && pinSala.current === pin) setCrmDetalhe(ordenarDetalhe(r.propostas, r.hoje))
      } catch (e) {
        // PIN deixou de valer (trocado ou bloqueado): a lista some e volta a pedir PIN
        if (ativo && (e.tipo === 'pin' || e.tipo === 'bloqueado')) { pinSala.current = null; setCrmDetalhe(null) }
      }
    }
    const l = iniciarLeitura(lerTelao, { intervalo: 60000, aoPausar: (p) => { if (p && ativo) sair() } })
    return () => { ativo = false; l.encerrar() }
  }, [salaAberta, sair])

  const enviarPin = useCallback(async (pin) => {
    setPinConferindo(true)
    setPinErro(null)
    try {
      const r = await lerCrmDetalhe(pin)
      pinSala.current = pin
      setCrmResumo(resumir(r.propostas, r.hoje))
      setCrmDetalhe(ordenarDetalhe(r.propostas, r.hoje))
      setTeclado(false)
    } catch (e) {
      setPinErro(
        e.tipo === 'pin' ? 'PIN INCORRETO'
          : e.tipo === 'bloqueado' ? 'MUITAS TENTATIVAS · TENTE MAIS TARDE'
            : 'SEM RESPOSTA DA PORTA · TENTE DE NOVO',
      )
    } finally {
      setPinConferindo(false)
    }
  }, [])

  // Clique no chão/fundo vazio só "sai" se houver algo aberto ou a câmera estiver aproximada;
  // assim um clique à toa não desfaz um zoom feito na mão.
  const selecionadoRef = useRef(null)
  selecionadoRef.current = selectedId
  const onVazio = useCallback(() => {
    if (selecionadoRef.current || estaAproximado()) sair()
  }, [sair])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') sair() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sair])

  const selecionado = agentes.find((a) => a.id === selectedId)

  return (
    <>
      <Scene layout={layout} agentes={agentes} eventos={eventos} selectedId={selectedId} onSelect={selecionar} onVazio={onVazio} onPronto={fimDoCarregando}
        salaAberta={salaAberta} crmResumo={crmResumo} crmDetalhe={crmDetalhe} onVerDetalhe={() => { setPinErro(null); setTeclado(true) }} />
      {aproximado && (
        <button className="overview-btn" onClick={sair}>
          ◱ VISÃO GERAL
        </button>
      )}
      {/* alças de painel elétrico: esquerda abre os agentes, embaixo abre o log */}
      <button
        className={`alca alca-side${gaveta ? ' alca-aberta' : ''}`}
        onClick={() => setGaveta((g) => !g)}
        aria-expanded={gaveta}
        title={gaveta ? 'Recolher painel de agentes' : 'Abrir painel de agentes'}
      >
        <span className="alca-grip" />
        <span className="alca-txt">AGENTES</span>
        <span className="alca-grip" />
      </button>
      <button
        className={`alca alca-crm${salaAberta ? ' alca-aberta' : ''}`}
        onClick={alternarSala}
        aria-expanded={salaAberta}
        title={salaAberta ? 'Voltar para o galpão' : 'Ir para a sala comercial'}
      >
        <span className="alca-grip" />
        <span className="alca-txt">COMERCIAL</span>
        <span className="alca-grip" />
      </button>
      {teclado && salaAberta && (
        <TecladoPin onEnviar={enviarPin} onFechar={() => setTeclado(false)} verificando={pinConferindo} erro={pinErro} />
      )}
      <button
        className={`alca alca-log${logAberto ? ' alca-aberta' : ''}`}
        onClick={() => setLogAberto((a) => !a)}
        aria-expanded={logAberto}
        title={logAberto ? 'Recolher log de eventos' : 'Abrir log de eventos'}
      >
        <span className="alca-grip" />
        <span className="alca-txt">EVENTOS</span>
        <span className="alca-grip" />
      </button>
      <SidePanel
        agentes={agentes}
        setores={layout.sectors.length}
        fonte={fonte}
        sync={sync}
        erro={erro}
        aberto={gaveta}
        onSelect={selecionarDaLista}
      />
      <EventLog eventos={eventos} aberto={logAberto} />
      {/* aviso discreto no alto da tela, visível mesmo com os painéis recolhidos */}
      {(erro || fonte === 'CSV') && (
        <div className={`aviso-fonte${erro ? ' aviso-fonte-erro' : ''}`} role="status">
          {erro
            ? sync
              ? `⚠ SEM CONEXÃO · MOSTRANDO O ÚLTIMO ESTADO (${hhmmss(sync)})`
              : '⚠ SEM CONEXÃO COM A PLANILHA · TENTANDO DE NOVO'
            : '⚠ PORTA LENTA · USANDO A PLANILHA PUBLICADA (ATRASO ~1 MIN)'}
        </div>
      )}
      {pausado && (
        <button className="retomar-btn" onClick={retomar} title="Parado depois de 30 min sem uso, para poupar a cota do Apps Script">
          ▶ RETOMAR
        </button>
      )}
      {selecionado && <Terminal agente={selecionado} onClose={sair} onAprovacoes={abrirAprovacoes} />}
      <Aprovacoes
        agentes={agentes}
        aberto={aprovacoesAbertas}
        onAbrir={abrirAprovacoes}
        onFechar={fecharAprovacoes}
        onResolvidos={marcarResolvidos}
      />
    </>
  )
}
