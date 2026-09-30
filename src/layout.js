// Calcula onde fica cada setor (plataforma) e cada mesa na cena.

const DESK_X = 2.6 // distância entre mesas lado a lado
const DESK_Z = 2.9 // distância entre fileiras de mesas
const MAX_COLS = 3 // mesas por fileira dentro de um setor
const SECTORS_PER_ROW = 3
const GAP = 3.4 // corredor entre plataformas

export function computeLayout(agentes) {
  const grupos = new Map()
  for (const a of agentes) {
    if (!grupos.has(a.setor)) grupos.set(a.setor, [])
    grupos.get(a.setor).push(a)
  }

  const sectors = [...grupos.entries()].map(([nome, lista]) => {
    const cols = Math.min(lista.length, MAX_COLS)
    const rows = Math.ceil(lista.length / MAX_COLS)
    return { nome, lista, cols, rows, w: cols * DESK_X + 1.4, d: rows * DESK_Z + 1.2 }
  })

  // Distribui as plataformas em fileiras e centraliza tudo na origem.
  const linhas = []
  for (let i = 0; i < sectors.length; i += SECTORS_PER_ROW) linhas.push(sectors.slice(i, i + SECTORS_PER_ROW))
  const profundidades = linhas.map((l) => Math.max(...l.map((s) => s.d)))
  const totalD = Math.max(0, profundidades.reduce((a, b) => a + b, 0) + GAP * (linhas.length - 1))
  let z = -totalD / 2
  let width = 0
  const rowZ = []

  linhas.forEach((linha, li) => {
    const totalW = linha.reduce((a, s) => a + s.w, 0) + GAP * (linha.length - 1)
    width = Math.max(width, totalW)
    let x = -totalW / 2
    const cz = z + profundidades[li] / 2
    rowZ.push(cz)
    for (const s of linha) {
      s.x = x + s.w / 2
      s.z = cz
      x += s.w + GAP
    }
    z += profundidades[li] + GAP
  })

  const posicoes = []
  for (const s of sectors) {
    s.lista.forEach((a, i) => {
      const c = i % MAX_COLS
      const r = Math.floor(i / MAX_COLS)
      posicoes.push({
        agente: a,
        x: s.x + (c - (s.cols - 1) / 2) * DESK_X,
        z: s.z + (r - (s.rows - 1) / 2) * DESK_Z,
      })
    })
  }

  return { sectors, posicoes, width, depth: totalD, rowZ }
}
