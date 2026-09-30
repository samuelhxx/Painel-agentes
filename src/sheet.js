import { REFRESH_MS, INATIVO_MS } from './config.js'
import { API_URL, CHAVE_PAINEL, jsonp } from './aprovacoes.js'
import { normalizeStatus } from './status.js'
import { parseDate } from './time.js'

// Deixa cada linha num formato único, lida da planilha.
// Aceita a coluna antiga "sala" como sinônimo de "setor".
function normalizar(a) {
  return {
    id: a.id,
    nome: a.nome || `Agente ${a.id}`,
    setor: (a.setor || a.sala || 'Sem setor').toUpperCase(),
    status: normalizeStatus(a.status),
    tarefa: a.tarefa || '',
    atualizado: parseDate(a.atualizado_em),
    proxima: parseDate(a.proxima_execucao),
  }
}

// Uma leitura só traz as duas abas: agentes inteira e os últimos eventos.
// A chave do evento é horario + agente + evento: o mesmo evento tem sempre a mesma chave,
// não importa em qual linha ou em qual leitura ele venha.
export async function fetchPainel() {
  const r = await jsonp(API_URL, { chave: CHAVE_PAINEL, acao: 'ler_painel' })
  if (!r || !Array.isArray(r.agentes) || !Array.isArray(r.eventos)) {
    throw new Error(r && r.erro ? String(r.erro) : 'resposta inesperada')
  }
  const agentes = r.agentes.filter((a) => a.id).map(normalizar)
  const eventos = r.eventos
    .map((e, i) => ({
      id: `${e.horario}|${e.agente}|${e.evento}`,
      ordem: i,
      t: parseDate(e.horario),
      setor: (e.setor || '').toUpperCase(),
      agente: e.agente,
      status: normalizeStatus(e.status),
      texto: e.evento,
    }))
    .filter((e) => e.t != null)
  return { agentes, eventos }
}

// Quem manda nas leituras. Cada leitura é uma execução do Apps Script, da mesma cota
// que o follow-up e o vigia usam; se a cota estourar, param os agentes também.
// Por isso o painel só pergunta quando alguém está olhando:
// 1. aba escondida (segundo plano, minimizada, atrás de outra janela) = não pergunta;
// 2. voltou a ficar visível = pergunta uma vez na hora e retoma o intervalo;
// 3. 30 min sem mouse nem teclado = para sozinho, até alguém chamar retomar().
// ler() é quem guarda o último estado: se ela falhar, a tela continua com o que tinha.
export function iniciarLeitura(ler, { aoPausar } = {}) {
  let timer = null
  let parado = false
  let lendo = false
  let ultimaAtividade = Date.now()
  const visivel = () => document.visibilityState === 'visible'

  async function tick() {
    if (parado || lendo || !visivel()) return
    if (Date.now() - ultimaAtividade >= INATIVO_MS) return pausar()
    lendo = true // uma leitura lenta não empilha outra por cima
    try { await ler() } finally { lendo = false }
  }
  const pararTimer = () => { clearInterval(timer); timer = null }
  const agendar = () => { pararTimer(); timer = setInterval(tick, REFRESH_MS) }

  function pausar() {
    parado = true
    pararTimer()
    aoPausar?.(true)
  }
  function retomar() {
    parado = false
    ultimaAtividade = Date.now()
    aoPausar?.(false)
    if (visivel()) { tick(); agendar() }
  }

  const onVisibilidade = () => {
    if (!visivel()) return pararTimer()
    if (!parado) { tick(); agendar() }
  }
  // Mexer no painel parado não volta a ler sozinho: só o botão retomar.
  const onAtividade = () => { ultimaAtividade = Date.now() }
  const atividades = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']

  document.addEventListener('visibilitychange', onVisibilidade)
  atividades.forEach((ev) => window.addEventListener(ev, onAtividade, { passive: true }))
  if (visivel()) { tick(); agendar() }

  return {
    retomar,
    encerrar() {
      pararTimer()
      document.removeEventListener('visibilitychange', onVisibilidade)
      atividades.forEach((ev) => window.removeEventListener(ev, onAtividade))
    },
  }
}
