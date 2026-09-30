import { useEffect, useState } from 'react'

// Teclado numérico do telão comercial. Botões grandes (iPad/iPhone) e os dígitos
// escondidos. O PIN só vai para quem chama; nada fica guardado aqui depois de enviar.
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'apagar', '0', 'fechar']

export default function TecladoPin({ onEnviar, onFechar, verificando, erro }) {
  const [pin, setPin] = useState('')

  // erro de PIN: limpa para digitar de novo
  useEffect(() => { if (erro) setPin('') }, [erro])

  const tecla = (t) => {
    if (verificando) return
    if (t === 'fechar') return onFechar()
    if (t === 'apagar') return setPin((p) => p.slice(0, -1))
    const novo = (pin + t).slice(0, 4)
    setPin(novo)
    if (novo.length === 4) onEnviar(novo)
  }

  // teclado físico também funciona
  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) tecla(e.key)
      else if (e.key === 'Backspace') tecla('apagar')
      else if (e.key === 'Escape') { e.stopImmediatePropagation(); tecla('fechar') } // Esc fecha só o teclado, não a sala
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <div className="crm-teclado" role="dialog" aria-label="Digite o PIN para ver o detalhe">
      <div className="crm-teclado-caixa">
        <p className="crm-teclado-titulo">DIGITE O PIN</p>
        <div className={`crm-teclado-pontos${erro ? ' crm-teclado-erro' : ''}`} aria-live="polite">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'cheio' : undefined} />)}
        </div>
        <p className="crm-teclado-msg">{verificando ? 'conferindo…' : erro || ' '}</p>
        <div className="crm-teclado-grade">
          {TECLAS.map((t) => (
            <button
              key={t}
              type="button"
              className={t.length > 1 ? 'crm-tecla crm-tecla-acao' : 'crm-tecla'}
              onClick={() => tecla(t)}
              disabled={verificando && t !== 'fechar'}
            >
              {t === 'apagar' ? '⌫' : t === 'fechar' ? 'FECHAR' : t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
