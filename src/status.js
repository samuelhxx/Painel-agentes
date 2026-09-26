// Paleta FIXA de status. Não usar estas cores para setores.
export const STATUS = {
  ocioso: { label: 'OCIOSO', color: '#3A6BB5', glow: 0.8, bob: false, pulse: false, verbo: 'terminou' },
  trabalhando: { label: 'TRABALHANDO', color: '#00F0FF', glow: 3, bob: true, pulse: false, verbo: 'iniciou' },
  aguardando_aprovacao: { label: 'AGUARDANDO APROVAÇÃO', color: '#FFB000', glow: 3, bob: false, pulse: true, verbo: 'pediu aprovação' },
  erro: { label: 'ERRO', color: '#FF2D95', glow: 3, bob: false, pulse: false, verbo: 'falhou' },
}

export const AMBAR = STATUS.aguardando_aprovacao.color
export const MAGENTA = STATUS.erro.color

const ALIASES = {
  aguardando: 'aguardando_aprovacao',
  aguardando_aprovacao: 'aguardando_aprovacao',
  pausado: 'aguardando_aprovacao',
  trabalhando: 'trabalhando',
  ocioso: 'ocioso',
  erro: 'erro',
}

// Aceita variações da planilha: "Aguardando aprovação", "ERRO", "trabalhando " etc.
export function normalizeStatus(raw) {
  const s = (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  return ALIASES[s] ?? 'ocioso'
}

// Trabalhando há mais de 30 min sem mudar: possivelmente travado.
export const TRAVADO_MS = 30 * 60 * 1000
export const isStuck = (a, now) => a.status === 'trabalhando' && now - a.desde > TRAVADO_MS

// Rotina atrasada: a próxima execução já passou (com 1 min de folga) e o agente não rodou desde então.
export const isLate = (a, now) =>
  a.proxima != null && a.proxima < now - 60000 && a.status !== 'trabalhando' && !(a.atualizado > a.proxima)
