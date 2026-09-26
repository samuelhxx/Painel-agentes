import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAgents, fetchEvents } from './sheet.js'
import { REFRESH_MS, MAX_EVENTOS } from './config.js'
import { computeLayout } from './layout.js'
import { focarEm, voltarVisaoGeral, useAproximado, estaAproximado } from './scene/focus.js'
import Scene from './scene/Scene.jsx'
import SidePanel from './ui/SidePanel.jsx'
import EventLog from './ui/EventLog.jsx'
import Terminal from './ui/Terminal.jsx'
import Aprovacoes from './ui/Aprovacoes.jsx'

export default function App() {
  const [agentes, setAgentes] = useState([])
  const [eventos, setEventos] = useState([])
  const [erro, setErro] = useState(null)
  const [sync, setSync] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [gaveta, setGaveta] = useState(false)
  const [aprovacoesAbertas, setAprovacoesAbertas] = useState(false)
  const aproximado = useAproximado()

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
        const [dados, evs] = await Promise.all([fetchAgents(), fetchEvents()])
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
        primeiraLeitura.current = false
        setErro(null)
        setSync(now)
      } catch (e) {
        if (ativo) setErro(e.message)
      }
    }
    carregar()
    const timer = setInterval(carregar, REFRESH_MS)
    return () => { ativo = false; clearInterval(timer) }
  }, [])

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
  const sair = useCallback(() => {
    setSelectedId(null)
    voltarVisaoGeral()
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
      <Scene layout={layout} agentes={agentes} eventos={eventos} selectedId={selectedId} onSelect={selecionar} onVazio={onVazio} />
      {aproximado && (
        <button className="overview-btn" onClick={sair}>
          ◱ VISÃO GERAL
        </button>
      )}
      <button className="drawer-toggle" onClick={() => setGaveta((g) => !g)} aria-expanded={gaveta}>
        {gaveta ? '✕' : '☰'} <span>AS CONSTRUCTION</span>
      </button>
      <SidePanel
        agentes={agentes}
        setores={layout.sectors.length}
        fonte="PLANILHA"
        sync={sync}
        erro={erro}
        aberto={gaveta}
        onSelect={selecionarDaLista}
      />
      <EventLog eventos={eventos} />
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
