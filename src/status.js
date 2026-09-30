// Paleta FIXA de status: as mesmas cores da torre de andon (apagado, verde, amarelo,
// vermelho), em todo o painel, para ler igual na cena, nas listas e no log.
// Não usar estas cores para setores nem para a marca.
export const STATUS = {
  ocioso: { label: 'OCIOSO', color: '#8A9099', glow: 0.8, bob: false, pulse: false, verbo: 'terminou' },
  trabalhando: { label: 'TRABALHANDO', color: '#22C55E', glow: 3, bob: true, pulse: false, verbo: 'iniciou' },
  aguardando_aprovacao: { label: 'AGUARDANDO APROVAÇÃO', color: '#F5B400', glow: 3, bob: false, pulse: true, verbo: 'pediu aprovação' },
  erro: { label: 'ERRO', color: '#E5242B', glow: 3, bob: false, pulse: false, verbo: 'falhou' },
}

// Ordem de gravidade: a torre de um setor com vários agentes mostra o pior deles.
export const GRAVIDADE = ['erro', 'aguardando_aprovacao', 'trabalhando', 'ocioso']
export function piorStatus(lista) {
  for (const s of GRAVIDADE) if (lista.some((a) => a.status === s)) return s
  return 'ocioso'
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
