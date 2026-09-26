import { SHEET_CSV_URL, EVENTS_CSV_URL } from './config.js'
import { normalizeStatus } from './status.js'
import { parseDate } from './time.js'

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
  return rows
}

function rowsToObjects(rows) {
  const [header = [], ...data] = rows
  const cols = header.map((h) => h.trim().toLowerCase())
  return data.map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? '').trim()])))
}

async function fetchCsv(url) {
  // O parâmetro extra evita que o navegador devolva uma cópia antiga (cache).
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}_=${Date.now()}`)
  if (!res.ok) throw new Error(`Planilha respondeu ${res.status}`)
  return rowsToObjects(parseCsv(await res.text()))
}

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

export async function fetchAgents() {
  if (!SHEET_CSV_URL) throw new Error('URL da planilha não configurada em src/config.js')
  return (await fetchCsv(SHEET_CSV_URL)).filter((a) => a.id).map(normalizar)
}

// Histórico de eventos lido da aba "eventos", na ordem das linhas.
// A chave é horario + agente + evento: o mesmo evento tem sempre a mesma chave,
// não importa em qual linha ou em qual versão do CSV ele venha.
export async function fetchEvents() {
  return (await fetchCsv(EVENTS_CSV_URL))
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
