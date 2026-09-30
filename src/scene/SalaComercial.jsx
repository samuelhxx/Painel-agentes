import { memo, useEffect, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { steel, darkSteel, parede, placa, fosco, brandDark } from './materials.js'
import { MARCA } from '../marca.js'
import { STATUS } from '../status.js'
import { reais } from '../crm.js'
import Mesclar from './Mesclar.jsx'
import { overlay } from './overlay.js'

// Sala comercial colada na lateral direita do galpão: vidro na frente e nas laterais,
// parede sólida no fundo com o telão de CRM. Mesmo padrão industrial e cores da AS.
export const SALA_W = 9 // largura (x)
export const SALA_D = 8 // profundidade (z)
const PE = 3.4 // pé-direito
const TW = 6 // telão: largura
const TH = 3.375 // telão: altura (16:9)
const TY = 2.35 // telão: altura do centro
const CW = 2048
const CH = 1152
const FONTE = "'Barlow Condensed', 'Arial Narrow', sans-serif"
const MONO = "'JetBrains Mono', Consolas, monospace"
const LINHAS_POR_PAGINA = 12

// Onde a câmera fica para enquadrar o telão de frente (usado pela alça COMERCIAL).
export function poseTelao(x0, zMin) {
  const cx = x0 + SALA_W / 2
  return { pos: [cx, TY + 0.15, zMin + 7.35], alvo: [cx, TY, zMin + 0.2] }
}

const vidro = new THREE.MeshStandardMaterial({ color: '#D9E6F0', transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide })
const pisoSala = fosco('#8E949B', 0.5)
const tampo = fosco('#5B4636', 0.6)
const estofado = fosco('#2E3136', 0.8)

const STATUS_TXT = { em_negociacao: 'EM NEGOCIAÇÃO', fechada: 'FECHADA', perdida: 'PERDIDA', enviada: 'ENVIADA' }
const STATUS_COR = { em_negociacao: STATUS.aguardando_aprovacao.color, fechada: STATUS.trabalhando.color, perdida: STATUS.ocioso.color }

function desenharFechado(g, r) {
  g.fillStyle = MARCA.fundo
  g.fillRect(0, 0, CW, CH)
  g.fillStyle = MARCA.roxoMarca
  g.fillRect(0, 0, CW, 110)
  g.fillStyle = '#FFFFFF'
  g.font = `700 60px ${FONTE}`
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillText('COMERCIAL · AS CONSTRUCTION', 60, 58)
  const blocos = r
    ? [
        ['EM NEGOCIAÇÃO', reais(r.negociacao.valor), `em ${String(r.negociacao.n).padStart(2, '0')} propostas`, '#FFFFFF'],
        ['FECHADO NO MÊS', reais(r.fechado.valor), `em ${String(r.fechado.n).padStart(2, '0')}`, STATUS.trabalhando.color],
        ['PARADAS HOJE', String(r.paradas).padStart(2, '0'), 'propostas vencidas', r.paradas ? STATUS.aguardando_aprovacao.color : '#FFFFFF'],
        ['ESPERANDO VOCÊ', String(r.esperando).padStart(2, '0'), 'e-mails mandados sem resposta sua', r.esperando ? MARCA.roxo : '#FFFFFF'],
      ]
    : null
  if (!blocos) {
    g.fillStyle = MARCA.apoio
    g.font = `600 64px ${FONTE}`
    g.textAlign = 'center'
    g.fillText('LENDO A PLANILHA…', CW / 2, CH / 2)
    return
  }
  blocos.forEach(([rotulo, grande, sub, cor], i) => {
    const x = 60 + (i % 2) * (CW / 2)
    const y = 170 + Math.floor(i / 2) * 470
    g.fillStyle = 'rgba(140,44,225,0.35)'
    g.fillRect(x, y, 8, 400)
    g.textAlign = 'left'
    g.fillStyle = MARCA.apoio
    g.font = `600 58px ${FONTE}`
    g.fillText(rotulo, x + 40, y + 50)
    g.fillStyle = cor
    g.font = `700 190px ${FONTE}`
    g.fillText(grande, x + 36, y + 200)
    g.fillStyle = '#FFFFFF'
    g.font = `500 54px ${FONTE}`
    g.fillText(sub, x + 40, y + 340)
  })
}

function desenharDetalhe(g, linhas, pagina) {
  const paginas = Math.max(1, Math.ceil(linhas.length / LINHAS_POR_PAGINA))
  const pg = pagina % paginas
  g.fillStyle = MARCA.fundo
  g.fillRect(0, 0, CW, CH)
  g.fillStyle = MARCA.roxoMarca
  g.fillRect(0, 0, CW, 110)
  g.fillStyle = '#FFFFFF'
  g.font = `700 60px ${FONTE}`
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillText('PROPOSTAS · POR VALOR', 60, 58)
  g.textAlign = 'right'
  g.fillText(`${pg + 1} / ${paginas}`, CW - 60, 58)
  const cols = [[60, 'CLIENTE', 'left'], [620, 'OBRA', 'left'], [1480, 'VALOR', 'right'], [1680, 'DIAS', 'right'], [1740, 'STATUS', 'left']]
  g.font = `600 40px ${FONTE}`
  g.fillStyle = MARCA.apoio
  cols.forEach(([x, t, a]) => { g.textAlign = a; g.fillText(t, x, 160) })
  g.fillStyle = 'rgba(140,44,225,0.5)'
  g.fillRect(60, 190, CW - 120, 3)
  const corta = (txt, max) => {
    let s = String(txt || '—')
    while (g.measureText(s).width > max && s.length > 1) s = s.slice(0, -2) + '…'
    return s
  }
  linhas.slice(pg * LINHAS_POR_PAGINA, (pg + 1) * LINHAS_POR_PAGINA).forEach((l, i) => {
    const y = 240 + i * 76
    if (i % 2) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(40, y - 36, CW - 80, 72) }
    g.font = `600 44px ${FONTE}`
    g.fillStyle = '#FFFFFF'
    g.textAlign = 'left'
    g.fillText(corta(l.cliente, 540), 60, y)
    g.font = `500 40px ${FONTE}`
    g.fillStyle = '#D6D9E3'
    g.fillText(corta(l.obra, 780), 620, y)
    g.textAlign = 'right'
    g.font = `600 44px ${MONO}`
    g.fillStyle = '#FFFFFF'
    g.fillText(l.valor ? reais(l.valor) : '—', 1480, y)
    g.fillText(l.dias == null ? '—' : String(l.dias), 1680, y)
    g.textAlign = 'left'
    g.font = `600 40px ${FONTE}`
    g.fillStyle = STATUS_COR[l.status] || MARCA.apoio
    g.fillText(STATUS_TXT[l.status] || String(l.status || '—').toUpperCase(), 1740, y)
  })
}

function Telao({ resumo, detalhe }) {
  const [pagina, setPagina] = useState(0)
  const [fontes, setFontes] = useState(0)
  useEffect(() => { document.fonts?.ready.then(() => setFontes(1)) }, [])
  // lista com mais de uma página: troca sozinha a cada 10 s
  useEffect(() => {
    setPagina(0)
    if (!detalhe || detalhe.length <= LINHAS_POR_PAGINA) return
    const t = setInterval(() => setPagina((p) => p + 1), 10000)
    return () => clearInterval(t)
  }, [detalhe])

  const tela = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CW
    canvas.height = CH
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { canvas, tex, mat: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) }
  }, [])
  useEffect(() => () => { tela.tex.dispose(); tela.mat.dispose() }, [tela])
  useEffect(() => {
    const g = tela.canvas.getContext('2d')
    if (detalhe) desenharDetalhe(g, detalhe, pagina)
    else desenharFechado(g, resumo)
    tela.tex.needsUpdate = true
  }, [tela, resumo, detalhe, pagina, fontes])

  return (
    <mesh material={tela.mat}>
      <planeGeometry args={[TW, TH]} />
    </mesh>
  )
}

function SalaComercial({ x0, zMin, aberta, resumo, detalhe, onVerDetalhe }) {
  const cx = x0 + SALA_W / 2
  const cz = zMin + SALA_D / 2
  const zF = zMin + SALA_D // frente de vidro
  // montantes de aço do vidro
  const montantes = useMemo(() => {
    const m = []
    for (let x = x0; x <= x0 + SALA_W + 0.01; x += SALA_W / 6) m.push([x, zF])
    for (let z = zMin; z <= zF + 0.01; z += SALA_D / 5) { m.push([x0, z]); m.push([x0 + SALA_W, z]) }
    return m
  }, [x0, zMin, zF])

  return (
    <group>
      <Mesclar deps={[x0, zMin]}>
        {/* piso da sala, um degrau acima do galpão */}
        <mesh material={pisoSala} position={[cx, 0.06, cz]}>
          <boxGeometry args={[SALA_W, 0.12, SALA_D]} />
        </mesh>
        {/* parede do fundo, sólida, com o telão */}
        <mesh material={parede} position={[cx, PE / 2, zMin - 0.1]}>
          <boxGeometry args={[SALA_W, PE, 0.2]} />
        </mesh>
        {/* caixilhos de aço e travessa do vidro */}
        {montantes.map(([x, z], i) => (
          <mesh key={i} material={darkSteel} position={[x, PE / 2, z]}>
            <boxGeometry args={[0.08, PE, 0.08]} />
          </mesh>
        ))}
        {[[cx, zF, SALA_W, 0.08], [x0, cz, 0.08, SALA_D], [x0 + SALA_W, cz, 0.08, SALA_D]].map(([x, z, w, d], i) => (
          <mesh key={`t${i}`} material={darkSteel} position={[x, PE, z]}>
            <boxGeometry args={[w, 0.1, d]} />
          </mesh>
        ))}
        {/* moldura do telão */}
        <mesh material={darkSteel} position={[cx, TY, zMin + 0.03]}>
          <boxGeometry args={[TW + 0.2, TH + 0.2, 0.08]} />
        </mesh>
        {/* mesa de reunião e duas cadeiras viradas para o telão */}
        <mesh material={tampo} position={[cx, 0.86, cz + 0.6]}>
          <boxGeometry args={[3.0, 0.07, 1.3]} />
        </mesh>
        {[[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]].map(([dx, dz], i) => (
          <mesh key={`p${i}`} material={steel} position={[cx + dx, 0.47, cz + 0.6 + dz]}>
            <boxGeometry args={[0.06, 0.78, 0.06]} />
          </mesh>
        ))}
        {[-0.7, 0.7].map((dx) => (
          <group key={dx} position={[cx + dx, 0.12, cz + 2.0]}>
            <mesh material={steel} position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.44, 10]} />
            </mesh>
            <mesh material={estofado} position={[0, 0.48, 0]}>
              <boxGeometry args={[0.55, 0.08, 0.52]} />
            </mesh>
            <mesh material={estofado} position={[0, 0.82, 0.24]}>
              <boxGeometry args={[0.55, 0.62, 0.07]} />
            </mesh>
            <mesh material={brandDark} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.28, 0.28, 0.04, 12]} />
            </mesh>
          </group>
        ))}
      </Mesclar>

      {/* vidros: frente e laterais */}
      <mesh material={vidro} position={[cx, PE / 2, zF]}>
        <planeGeometry args={[SALA_W, PE]} />
      </mesh>
      {[x0, x0 + SALA_W].map((x) => (
        <mesh key={x} material={vidro} position={[x, PE / 2, cz]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[SALA_D, PE]} />
        </mesh>
      ))}

      {/* placa de chapa COMERCIAL acima do vidro da frente */}
      <mesh material={placa('COMERCIAL', { w: 512, h: 128, fonte: 84 })} position={[cx, PE + 0.45, zF + 0.02]}>
        <planeGeometry args={[2.8, 0.7]} />
      </mesh>

      <group position={[cx, TY, zMin + 0.09]}>
        <Telao resumo={resumo} detalhe={detalhe} />
      </group>

      {/* Botão embaixo do telão, só com a sala aberta e a lista ainda fechada.
          portal={overlay}: fica fora da área de cliques da cena 3D. Sem isso, o toque
          no botão chegava na cena como "clique no vazio" e fechava a sala. */}
      {aberta && !detalhe && (
        <Html center position={[cx, TY - TH / 2 - 0.28, zMin + 0.12]} zIndexRange={[60, 50]} portal={overlay}>
          <button className="crm-ver" onClick={onVerDetalhe}>VER DETALHE</button>
        </Html>
      )}
    </group>
  )
}

export default memo(SalaComercial)
