import { useSyncExternalStore } from 'react'

// Relógio único compartilhado: um só setInterval para a página inteira.
let agora = Date.now()
const inscritos = new Set()
setInterval(() => {
  agora = Date.now()
  inscritos.forEach((f) => f())
}, 1000)
const inscrever = (f) => {
  inscritos.add(f)
  return () => inscritos.delete(f)
}

// Hora atual arredondada em "passo" ms: o componente só redesenha quando o valor muda.
export function useNow(passo = 1000) {
  return useSyncExternalStore(inscrever, () => Math.floor(agora / passo) * passo)
}

// Aceita 2026-09-26 14:30:00, ISO (2026-09-26T14:30:00) e o formato brasileiro (26/09/2026 14:30:00).
// Sem fuso explícito, a hora é lida como horário local.
export function parseDate(v) {
  if (!v) return null
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (m) return new Date(+m[3], m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime()
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (iso) return new Date(+iso[1], iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0), +(iso[6] || 0)).getTime()
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

// 4 min, 2 h, 3 d
export function duracao(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000)
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

export const ha = (t, now) => `há ${duracao(now - t)}`

export const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const hhmmss = (t) => new Date(t).toLocaleTimeString('pt-BR')

// "hoje 14:30", "amanhã 07:00" ou "28/09 07:00"
export function diaHora(t, now) {
  const d = new Date(t)
  const hoje = new Date(now)
  hoje.setHours(0, 0, 0, 0)
  const dia = Math.round((new Date(d).setHours(0, 0, 0, 0) - hoje) / 86400000)
  const prefixo =
    dia === 0 ? 'hoje' : dia === 1 ? 'amanhã' : dia === -1 ? 'ontem' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${prefixo} ${hhmm(t)}`
}

// Próxima execução sempre em hora do relógio, com a palavra do dia:
// "hoje 14:00", "amanhã 08:00", "sex 08:00" (até 6 dias à frente), "12/10 08:00".
// Nunca "em 7 h": quem olha o painel pensa no relógio da parede.
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function quando(t, now) {
  const d = new Date(t)
  const hoje = new Date(now)
  hoje.setHours(0, 0, 0, 0)
  const dia = Math.round((new Date(d).setHours(0, 0, 0, 0) - hoje) / 86400000)
  const prefixo =
    dia === 0 ? 'hoje'
      : dia === 1 ? 'amanhã'
        : dia > 1 && dia < 7 ? DIAS[d.getDay()]
          : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${prefixo} ${hhmm(t)}`
}

// "há 5 minutos", "há 2 horas", "há 3 dias" (texto corrido, para frases)
export function haExtenso(t, now) {
  const min = Math.floor(Math.max(0, now - t) / 60000)
  const n = (v, um, varios) => `há ${v} ${v === 1 ? um : varios}`
  if (min < 1) return 'agora há pouco'
  if (min < 60) return n(min, 'minuto', 'minutos')
  const h = Math.floor(min / 60)
  if (h < 24) return n(h, 'hora', 'horas')
  return n(Math.floor(h / 24), 'dia', 'dias')
}
