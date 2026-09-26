import { useCallback, useEffect, useRef, useState } from 'react'
import { AMBAR, MAGENTA } from '../status.js'
import { useNow, parseDate, haExtenso } from '../time.js'
import { listarAprovacoes, decidir } from '../aprovacoes.js'

const SAIDA_MS = 320 // duração da animação de saída do cartão
const MSG_REDE = 'Não deu pra falar com o servidor. Tente de novo.'

const chave = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

// Agentes do painel que correspondem a uma pendência (pelo nome; o setor desempata).
function agentesDa(p, agentes) {
  const porNome = agentes.filter((a) => chave(a.nome) === chave(p.agente))
  const porSetor = porNome.filter((a) => chave(a.setor) === chave(p.setor))
  return porSetor.length ? porSetor : porNome
}

function CampoPin({ onEnviar, verificando, erro }) {
  const [valor, setValor] = useState('')
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])
  // PIN errado: limpa o campo e devolve o foco.
  useEffect(() => {
    if (erro?.pin) {
      setValor('')
      ref.current?.focus()
    }
  }, [erro])

  const enviar = (v) => { if (v.length === 4 && !verificando) onEnviar(v) }

  return (
    <form className="apv-pin" onSubmit={(e) => { e.preventDefault(); enviar(valor) }}>
      <label htmlFor="apv-pin">DIGITE O PIN</label>
      <input
        id="apv-pin"
        ref={ref}
        className={erro?.pin ? 'apv-pin-bad' : undefined}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={valor}
        disabled={verificando}
        aria-invalid={!!erro?.pin}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 4)
          setValor(v)
          if (v.length === 4) enviar(v) // no celular o teclado numérico não tem Enter
        }}
      />
      <p className={`apv-pin-msg${erro ? ' apv-pin-msg-bad' : ''}`} role="status">
        {verificando ? 'VERIFICANDO…' : erro ? erro.texto : '4 DÍGITOS · ENTER CONFIRMA'}
      </p>
      <button type="submit" className="apv-entrar" disabled={valor.length !== 4 || verificando}>
        ENTRAR
      </button>
    </form>
  )
}

function Cartao({ p, now, estado, saindo, aviso, onDecidir }) {
  const criado = parseDate(p.criado)
  const travado = !!estado || saindo
  return (
    <li className={`apv-card${saindo ? ' apv-card-out' : ''}`}>
      <div className="apv-card-top">
        <span className="apv-ref">{p.ref}</span>
        <span className="apv-quando">{criado != null ? `esperando ${haExtenso(criado, now)}` : ''}</span>
      </div>
      <div className="apv-origem">
        {p.setor} · {p.agente}
      </div>
      <h3 className="apv-titulo">{p.titulo}</h3>
      {p.detalhe && <p className="apv-detalhe">{p.detalhe}</p>}
      {aviso && <p className="apv-aviso" role="alert">{aviso}</p>}
      <div className="apv-botoes">
        <button
          className={`apv-btn apv-sim${estado === 'aprovado' ? ' apv-btn-load' : ''}`}
          disabled={travado}
          onClick={() => onDecidir(p, 'aprovado')}
        >
          {estado === 'aprovado' ? 'ENVIANDO…' : '✓ APROVAR'}
        </button>
        <button
          className={`apv-btn apv-nao${estado === 'reprovado' ? ' apv-btn-load' : ''}`}
          disabled={travado}
          onClick={() => onDecidir(p, 'reprovado')}
        >
          {estado === 'reprovado' ? 'ENVIANDO…' : '✕ REPROVAR'}
        </button>
      </div>
    </li>
  )
}

// Indicador de aprovações (canto da tela) + painel para aprovar/reprovar.
// O PIN fica só neste estado, em memória: recarregou a página, pede de novo.
export default function Aprovacoes({ agentes, aberto, onAbrir, onFechar, onResolvidos }) {
  const now = useNow(30000)
  const [pin, setPin] = useState(null)
  const [verificando, setVerificando] = useState(false)
  const [erroPin, setErroPin] = useState(null) // { texto, pin: bool }
  const [pendentes, setPendentes] = useState(null) // null = ainda não carregou
  const [carregando, setCarregando] = useState(false)
  const [erroLista, setErroLista] = useState(null)
  const [enviando, setEnviando] = useState({}) // ref -> 'aprovado' | 'reprovado'
  const [saindo, setSaindo] = useState({}) // ref -> true
  const [avisos, setAvisos] = useState({}) // ref -> mensagem de erro no cartão

  const aguardando = agentes.filter((a) => a.status === 'aguardando_aprovacao')
  const agentesRef = useRef(agentes)
  agentesRef.current = agentes
  const pendentesRef = useRef(pendentes)
  pendentesRef.current = pendentes

  // Servidor diz que não há mais nada pendente para estes agentes: tira do "aguardando" na hora.
  const resolverSemPendencia = useCallback(
    (lista) => {
      const comPendencia = new Set(lista.flatMap((p) => agentesDa(p, agentesRef.current)).map((a) => a.id))
      const ids = agentesRef.current
        .filter((a) => a.status === 'aguardando_aprovacao' && !comPendencia.has(a.id))
        .map((a) => a.id)
      if (ids.length) onResolvidos(ids)
    },
    [onResolvidos],
  )

  const carregar = useCallback(
    async (p) => {
      setCarregando(true)
      setErroLista(null)
      try {
        const lista = await listarAprovacoes(p)
        setPendentes(lista)
        setAvisos({})
        if (lista.length === 0) resolverSemPendencia([])
        return true
      } catch (e) {
        if (e.tipo === 'pin') {
          setPin(null)
          setErroPin({ texto: 'PIN INCORRETO', pin: true })
        } else setErroLista(e.tipo === 'rede' ? MSG_REDE : `Erro do servidor: ${e.message}`)
        return false
      } finally {
        setCarregando(false)
      }
    },
    [resolverSemPendencia],
  )

  const enviarPin = useCallback(
    async (p) => {
      setVerificando(true)
      setErroPin(null)
      try {
        const lista = await listarAprovacoes(p)
        setPin(p)
        setPendentes(lista)
        setErroLista(null)
        if (lista.length === 0) resolverSemPendencia([])
      } catch (e) {
        if (e.tipo === 'pin') setErroPin({ texto: 'PIN INCORRETO', pin: true })
        else if (e.tipo === 'negado') setErroPin({ texto: 'CHAVE DO PAINEL RECUSADA', pin: false })
        else if (e.tipo === 'rede') setErroPin({ texto: 'NÃO DEU PRA FALAR COM O SERVIDOR', pin: false })
        else setErroPin({ texto: 'RESPOSTA INESPERADA DO SERVIDOR', pin: false })
      } finally {
        setVerificando(false)
      }
    },
    [resolverSemPendencia],
  )

  // Ao abrir (com PIN já aceito), busca a lista de novo: pode ter chegado pendência nova.
  useEffect(() => {
    if (aberto && pin) carregar(pin)
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha só este painel (captura no document, antes do Esc do App que fecha o terminal).
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onFechar()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [aberto, onFechar])

  const onDecidir = useCallback(
    async (p, decisao) => {
      setEnviando((s) => ({ ...s, [p.ref]: decisao }))
      setAvisos(({ [p.ref]: _, ...resto }) => resto)
      let aviso = null
      let sai = false
      try {
        const r = await decidir(pin, p.ref, decisao)
        if (r === 'aprovado' || r === 'reprovado') sai = true
        // Já não está pendente no servidor: sai da lista também (a lista do servidor é quem manda).
        else if (r === 'ja_decidido' || r === 'nao_encontrado') sai = true
        else if (r === 'decisao_invalida') aviso = 'O servidor recusou a decisão (decisão inválida).'
        else aviso = `Resposta inesperada do servidor: ${r}`
      } catch (e) {
        if (e.tipo === 'pin') {
          setPin(null)
          setErroPin({ texto: 'PIN RECUSADO · DIGITE DE NOVO', pin: true })
        }
        aviso = e.tipo === 'rede' ? MSG_REDE : e.tipo === 'pin' ? 'PIN recusado.' : `Erro do servidor: ${e.message}`
      }
      setEnviando(({ [p.ref]: _, ...resto }) => resto)
      if (!sai) {
        setAvisos((s) => ({ ...s, [p.ref]: aviso }))
        return
      }
      setSaindo((s) => ({ ...s, [p.ref]: true }))
      setTimeout(() => {
        const resto = (pendentesRef.current ?? []).filter((q) => q.ref !== p.ref)
        setPendentes(resto)
        setSaindo(({ [p.ref]: _, ...s }) => s)
        // O agente sai de "aguardando" já, sem esperar o CSV (que tem cache de alguns minutos),
        // a não ser que ainda tenha outra pendência.
        resolverSemPendencia(resto)
      }, SAIDA_MS)
    },
    [pin, resolverSemPendencia],
  )

  // Enquanto a lista não carregou, conta os agentes aguardando; depois, as pendências reais.
  const qtd = pendentes && pin ? pendentes.length : aguardando.length
  const mostrarIndicador = aguardando.length > 0 && qtd > 0

  return (
    <>
      {mostrarIndicador && !aberto && (
        <button className="apv-indicador" onClick={onAbrir} style={{ '--c': AMBAR }}>
          <b>{qtd}</b> APROVAÇ{qtd === 1 ? 'ÃO' : 'ÕES'}
        </button>
      )}

      {aberto && (
        <div className="apv-fundo" onClick={onFechar}>
          <aside
            className="apv-painel"
            role="dialog"
            aria-modal="true"
            aria-label="Aprovações pendentes"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="apv-head">
              <h2>
                APROVAÇÕES{pin && pendentes?.length ?<span> · {pendentes.length} PENDENTE{pendentes.length === 1 ? '' : 'S'}</span> : null}
              </h2>
              <button onClick={onFechar} aria-label="Fechar">[X]</button>
            </header>

            {!pin ? (
              <CampoPin onEnviar={enviarPin} verificando={verificando} erro={erroPin} />
            ) : (
              <div className="apv-corpo">
                {erroLista && (
                  <div className="apv-erro" role="alert" style={{ '--c': MAGENTA }}>
                    <span>{erroLista}</span>
                    <button onClick={() => carregar(pin)} disabled={carregando}>TENTAR DE NOVO</button>
                  </div>
                )}
                {carregando && !pendentes && <p className="apv-vazio">CARREGANDO…</p>}
                {pendentes && pendentes.length === 0 && !carregando && (
                  <p className="apv-vazio">
                    NENHUMA APROVAÇÃO PENDENTE
                    <span>tudo respondido ✓</span>
                  </p>
                )}
                {pendentes && pendentes.length > 0 && (
                  <ul className="apv-lista">
                    {pendentes.map((p) => (
                      <Cartao
                        key={p.ref}
                        p={p}
                        now={now}
                        estado={enviando[p.ref]}
                        saindo={!!saindo[p.ref]}
                        aviso={avisos[p.ref]}
                        onDecidir={onDecidir}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
            <footer className="apv-foot">{carregando && pendentes ? 'ATUALIZANDO…' : 'ESC PARA FECHAR'}</footer>
          </aside>
        </div>
      )}
    </>
  )
}
