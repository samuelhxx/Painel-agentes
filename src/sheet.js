import { REFRESH_MS, INATIVO_MS, SHEET_CSV_URL, EVENTS_CSV_URL } from './config.js'
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

// A chave do evento é horario + agente + evento: o mesmo evento tem sempre a mesma chave,
// não importa em qual linha, leitura ou fonte (porta ou CSV) ele venha.
function normalizarEventos(lista) {
  return lista
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
}

// Fonte principal: a porta, ao vivo. Uma leitura traz agentes inteira e os últimos eventos.
async function lerPorta() {
  const r = await jsonp(API_URL, { chave: CHAVE_PAINEL, acao: 'ler_painel' })
  if (!r || !Array.isArray(r.agentes) || !Array.isArray(r.eventos)) {
    throw new Error(r && r.erro ? String(r.erro) : 'resposta inesperada')
  }
  return { agentes: r.agentes.filter((a) => a.id).map(normalizar), eventos: normalizarEventos(r.eventos) }
}

// Lê um CSV simples (aceita campos entre aspas, com vírgulas e quebras de linha dentro).
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const [header = [], ...data] = rows
  const cols = header.map((h) => h.trim().toLowerCase())
  return data.map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? '').trim()])))
}

async function fetchCsv(url) {
  // O parâmetro extra evita que o navegador devolva uma cópia antiga (cache).
  const res = await fetch(`${url}&_=${Date.now()}`)
  if (!res.ok) throw new Error(`planilha respondeu ${res.status}`)
  return parseCsv(await res.text())
}

// Reserva: a planilha publicada na web. ~1 min atrasada, mas não depende do Apps Script.
async function lerCsv() {
  const [ags, evs] = await Promise.all([fetchCsv(SHEET_CSV_URL), fetchCsv(EVENTS_CSV_URL)])
  return { agentes: ags.filter((a) => a.id).map(normalizar), eventos: normalizarEventos(evs).slice(-100) }
}

// Tenta a porta; se ela não responder, lê a reserva na mesma rodada.
// fonte diz de onde veio ('PORTA' ou 'CSV'); motivo guarda por que a porta falhou.
export async function fetchPainel() {
  try {
    return { ...(await lerPorta()), fonte: 'PORTA' }
  } catch (e) {
    return { ...(await lerCsv()), fonte: 'CSV', motivo: e.message }
  }
}

// Quem manda nas leituras. Cada leitura é uma execução do Apps Script, da mesma cota
// que o follow-up e o vigia usam; se a cota estourar, param os agentes também.
// Por isso o painel só pergunta quando alguém está olhando:
// 1. aba escondida (segundo plano, minimizada, atrás de outra janela) = não pergunta;
// 2. voltou a ficar visível = pergunta uma vez na hora e retoma o intervalo;
// 3. 30 min sem mouse nem teclado = para sozinho, até alguém chamar retomar().
// ler() é quem guarda o último estado: se ela falhar, a tela continua com o que tinha.
export function iniciarLeitura(ler, { aoPausar, intervalo = REFRESH_MS } = {}) {
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
  const agendar = () => { pararTimer(); timer = setInterval(tick, intervalo) }

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
