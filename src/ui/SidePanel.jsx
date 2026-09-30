import { STATUS, AMBAR, MAGENTA, isStuck, isLate } from '../status.js'
import { REFRESH_MS } from '../config.js'
import { useNow, ha, duracao, hhmmss, quando } from '../time.js'
import { MARCA } from '../marca.js'

const CONTADORES = [
  { key: 'total', label: 'TOTAL', color: MARCA.roxo },
  { key: 'trabalhando', label: 'TRABALHANDO' },
  { key: 'aguardando_aprovacao', label: 'AGUARDANDO APROVAÇÃO' },
  { key: 'ocioso', label: 'OCIOSOS' },
  { key: 'erro', label: 'ERRO' },
]

function Nome({ agente, onSelect }) {
  return (
    <button className="row-name" onClick={() => onSelect(agente.id)}>
      {agente.nome}
    </button>
  )
}

function motivo(a, now) {
  if (isStuck(a, now)) return { texto: `sem resposta há ${duracao(now - a.desde)}`, cor: AMBAR }
  if (a.status === 'erro') return { texto: `erro há ${duracao(now - a.desde)} · ${a.tarefa}`, cor: MAGENTA }
  return { texto: `aguardando aprovação há ${duracao(now - a.desde)} · ${a.tarefa}`, cor: AMBAR }
}

// Painel da esquerda: gaveta que desliza para dentro pela alça AGENTES.
export default function SidePanel({ agentes, setores, fonte, sync, erro, aberto, onSelect }) {
  const now = useNow(1000)

  const n = { total: agentes.length }
  for (const a of agentes) n[a.status] = (n[a.status] ?? 0) + 1

  const execucao = agentes.filter((a) => a.status === 'trabalhando').sort((a, b) => a.desde - b.desde)
  const atencao = agentes
    .filter((a) => a.status === 'erro' || a.status === 'aguardando_aprovacao' || isStuck(a, now))
    .sort((a, b) => (a.status === 'erro' ? -1 : 0) - (b.status === 'erro' ? -1 : 0) || a.desde - b.desde)
  const proximas = agentes.filter((a) => a.proxima != null).sort((a, b) => a.proxima - b.proxima)

  return (
    <aside className={`side${aberto ? ' side-open' : ''}`} aria-hidden={!aberto}>
      <header className="side-head">
        <h1>AS CONSTRUCTION</h1>
        <p className="side-sub">PAINEL DE AGENTES</p>
        <p className="side-meta">
          FONTE: {fonte} · SYNC {REFRESH_MS / 1000}S · {sync ? hhmmss(sync) : '--:--:--'}
        </p>
        {erro && <p className="side-error">⚠ SEM CONEXÃO · MOSTRANDO O ÚLTIMO ESTADO{sync ? ` (${hhmmss(sync)})` : ''}</p>}
        {!erro && fonte === 'CSV' && <p className="side-error side-warn">⚠ PORTA LENTA · LENDO A PLANILHA PUBLICADA (~1 MIN DE ATRASO)</p>}
      </header>

      <div className="counters">
        {CONTADORES.map(({ key, label, color }) => (
          <div key={key} className="counter" style={{ '--c': color ?? STATUS[key].color }}>
            <b>{String(n[key] ?? 0).padStart(2, '0')}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="side-scroll">
        <section className="block">
          <h2>EM EXECUÇÃO</h2>
          {execucao.length === 0 ? (
            <p className="empty">nenhum agente em execução</p>
          ) : (
            <ul>
              {execucao.map((a) => (
                <li key={a.id} style={{ '--c': STATUS.trabalhando.color }}>
                  <div className="row-top">
                    <Nome agente={a} onSelect={onSelect} />
                    <span className={`row-time${isStuck(a, now) ? ' row-warn' : ''}`}>{ha(a.desde, now)}</span>
                  </div>
                  <div className="row-meta">{a.setor}</div>
                  <div className="row-task">{a.tarefa || '—'}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="block block-attention">
          <h2>REQUER ATENÇÃO</h2>
          {atencao.length === 0 ? (
            <p className="empty">nada pendente</p>
          ) : (
            <ul>
              {atencao.map((a) => {
                const m = motivo(a, now)
                return (
                  <li key={a.id} style={{ '--c': m.cor }}>
                    <div className="row-top">
                      <Nome agente={a} onSelect={onSelect} />
                    </div>
                    <div className="row-meta">{a.setor}</div>
                    <div className="row-task row-reason">{m.texto}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="block">
          <h2>PRÓXIMAS EXECUÇÕES</h2>
          {proximas.length === 0 ? (
            <p className="empty">nenhuma rotina agendada</p>
          ) : (
            <ul>
              {proximas.map((a) => {
                const atrasada = isLate(a, now)
                return (
                  <li key={a.id} className="row-inline" style={{ '--c': atrasada ? MAGENTA : MARCA.roxo }}>
                    <Nome agente={a} onSelect={onSelect} />
                    <span className={`row-time${atrasada ? ' row-late' : ''}`}>
                      {atrasada ? `atrasada há ${duracao(now - a.proxima)}` : quando(a.proxima, now)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="side-foot">
        <span>
          {setores} SETORES · {agentes.length} AGENTES
        </span>
        <span>{hhmmss(now)}</span>
      </footer>
    </aside>
  )
}
