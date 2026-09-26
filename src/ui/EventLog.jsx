import { memo } from 'react'
import { STATUS } from '../status.js'
import { hhmm } from '../time.js'

// Histórico de eventos no rodapé. O mais recente entra por cima;
// só os eventos novos (não os de exemplo) ganham o brilho de entrada.
function EventLog({ eventos }) {
  return (
    <section className="log">
      <header className="log-head">
        <span>LOG DE EVENTOS</span>
        <span className="log-hint">ARRASTE PARA GIRAR · SCROLL PARA ZOOM · CLIQUE NUM AGENTE</span>
      </header>
      <ol className="log-list">
        {eventos.length === 0 && <li className="log-empty">nenhum evento na aba de eventos</li>}
        {eventos.map((e) => {
          const cfg = STATUS[e.status] ?? STATUS.ocioso
          return (
            <li key={e.id} className={e.novo ? 'log-new' : undefined} style={{ '--c': cfg.color }}>
              <time>{hhmm(e.t)}</time>
              <span className="log-sep"> · </span>
              <span className="log-setor">{e.setor}</span>
              <span className="log-sep"> · </span>
              <span className="log-agente">{e.agente}</span>
              <span className="log-sep"> · </span>
              <b>{cfg.verbo}</b>
              {e.texto && (
                <>
                  <span className="log-sep"> · </span>
                  {e.texto}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default memo(EventLog)
