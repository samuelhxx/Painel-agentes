import { STATUS, AMBAR, MAGENTA, isStuck, isLate } from '../status.js'
import { useNow, duracao, diaHora } from '../time.js'

function Linha({ k, v, cor }) {
  return (
    <div className="term-line">
      <span className="term-key">{k.padEnd(12, '.')}</span>{' '}
      <span style={cor ? { color: cor, textShadow: `0 0 6px ${cor}` } : undefined}>{v}</span>
    </div>
  )
}

// Painel de detalhe estilo terminal do agente clicado (atualiza ao vivo).
export default function Terminal({ agente: a, onClose }) {
  const now = useNow(1000)
  const cfg = STATUS[a.status] ?? STATUS.ocioso
  const travado = isStuck(a, now)
  const atrasada = isLate(a, now)

  const ultima =
    a.status === 'trabalhando'
      ? `em andamento · iniciada há ${duracao(now - a.desde)}`
      : a.atualizado
        ? `${diaHora(a.atualizado, now)} (há ${duracao(now - a.atualizado)})`
        : '—'

  const proxima =
    a.proxima == null
      ? 'sem rotina'
      : atrasada
        ? `${diaHora(a.proxima, now)} · ROTINA ATRASADA há ${duracao(now - a.proxima)}`
        : `${diaHora(a.proxima, now)} (em ${duracao(a.proxima - now)})`

  return (
    <aside className="terminal">
      <div className="term-bar">
        <span>root@as-construction:~/agentes/{a.id}</span>
        <button onClick={onClose} aria-label="Fechar">[X]</button>
      </div>
      <div className="term-body">
        <div className="term-dim">&gt; conectando ao agente #{a.id}...</div>
        <div className="term-dim">&gt; conexão estabelecida</div>
        <br />
        <Linha k="ID" v={a.id} />
        <Linha k="NOME" v={a.nome.toUpperCase()} />
        <Linha k="SETOR" v={a.setor} />
        <Linha k="STATUS" v={`● ${cfg.label} há ${duracao(now - a.desde)}`} cor={cfg.color} />
        {travado && <Linha k="ALERTA" v={`POSSIVELMENTE TRAVADO · sem resposta há ${duracao(now - a.desde)}`} cor={AMBAR} />}
        <Linha k="TAREFA" v={a.tarefa || '(nenhuma)'} />
        <br />
        <Linha k="ÚLT. EXEC." v={ultima} />
        <Linha k="PRÓX. EXEC." v={proxima} cor={atrasada ? MAGENTA : undefined} />
        <br />
        <div>
          &gt; <span className="cursor">█</span>
        </div>
      </div>
      <div className="term-foot">ESC PARA FECHAR</div>
    </aside>
  )
}
