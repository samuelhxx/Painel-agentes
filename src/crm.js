// Telão de CRM da sala comercial.
//
// A porta é que decide o que chega aqui:
// - ler_crm (só a chave do painel): valor, datas, alerta, status, tipo. Nenhum nome.
// - ler_crm_detalhe (chave + PIN): o mesmo, mais cliente e obra.
// E-mail, contato e observação do cliente nunca saem da porta, nem com o PIN certo.
import { API_URL, CHAVE_PAINEL, jsonp, ErroAprovacao } from './aprovacoes.js'

const MSG_TENTATIVAS = 'muitas tentativas, tente mais tarde'

async function chamar(params) {
  const r = await jsonp(API_URL, { chave: CHAVE_PAINEL, ...params })
  if (!r || typeof r !== 'object') throw new ErroAprovacao('resposta', 'resposta vazia')
  if (r.erro === 'pin') throw new ErroAprovacao('pin', 'PIN incorreto')
  if (r.erro === MSG_TENTATIVAS) throw new ErroAprovacao('bloqueado', MSG_TENTATIVAS)
  if (r.erro === 'negado') throw new ErroAprovacao('negado', 'chave do painel recusada')
  if (r.erro) throw new ErroAprovacao('resposta', String(r.erro))
  if (!Array.isArray(r.propostas)) throw new ErroAprovacao('resposta', 'lista ausente')
  return r
}

export const lerCrm = () => chamar({ acao: 'ler_crm' })
// O PIN vem de quem chama e fica só em memória (nunca em storage).
export const lerCrmDetalhe = (pin) => chamar({ acao: 'ler_crm_detalhe', pin })

// "150.000,00", "150000" ou 150000 → 150000
function numero(v) {
  if (typeof v === 'number') return v
  if (!v) return 0
  const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const dia = (s) => (s ? Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null)

// Dias parado com a mesma regra do follow-up: conta do último contato ou, sem ele,
// do envio. Sem nenhuma das duas datas: null.
export function diasParado(p, hoje) {
  const base = dia(p.ultimo_contato) ?? dia(p.enviado_em)
  return base == null ? null : Math.round((dia(hoje) - base) / 86400000)
}

// Os quatro números do telão fechado.
export function resumir(propostas, hoje) {
  const r = { negociacao: { valor: 0, n: 0 }, fechado: { valor: 0, n: 0 }, paradas: 0, esperando: 0 }
  const mes = hoje.slice(0, 7)
  for (const p of propostas) {
    const v = numero(p.valor)
    if (p.status === 'em_negociacao') {
      r.negociacao.valor += v
      r.negociacao.n++
      // parada = vencida pela regra do follow-up (e não adiada pelo Samuel)
      const adiada = p.adiar_ate && p.adiar_ate >= hoje
      const dias = diasParado(p, hoje)
      if (!adiada && dias != null && dias >= (Number(p.alerta_dias) || 7)) r.paradas++
    }
    // fechado no mês: status fechada com a última data (contato ou envio) neste mês
    const data = p.ultimo_contato || p.enviado_em || ''
    if (p.status === 'fechada' && data.slice(0, 7) === mes) {
      r.fechado.valor += v
      r.fechado.n++
    }
    // e-mail do follow-up mandado e ainda sem o clique do Samuel no ATUALIZAR
    if (p.avisado_em) r.esperando++
  }
  return r
}

// Lista do detalhe: maior valor primeiro; sem valor no fim.
export function ordenarDetalhe(propostas, hoje) {
  return propostas
    .map((p) => ({ cliente: p.cliente, obra: p.obra, valor: numero(p.valor), dias: diasParado(p, hoje), status: p.status }))
    .sort((a, b) => b.valor - a.valor)
}

export const reais = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
