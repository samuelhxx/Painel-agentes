import { memo } from 'react'
import { Html } from '@react-three/drei'
import { steel, darkSteel, brandDark, paintYellow, neon, hazard } from './materials.js'
import { overlay } from './overlay.js'
import { focarEm } from './focus.js'

export const DECK_Y = 0.6 // altura do piso da plataforma
const DECK_T = 0.22 // espessura do piso
const RAIL_H = 1.0 // altura do guarda-corpo
const POST_GAP = 1.3 // espaçamento máximo entre montantes

// Um lado do guarda-corpo: montantes verticais + travessa superior.
function RailSide({ from, to }) {
  const [x1, z1] = from
  const [x2, z2] = to
  const len = Math.hypot(x2 - x1, z2 - z1)
  const n = Math.max(1, Math.ceil(len / POST_GAP))
  const posts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    posts.push(
      <mesh key={i} material={steel} position={[x1 + (x2 - x1) * t, DECK_Y + RAIL_H / 2, z1 + (z2 - z1) * t]}>
        <cylinderGeometry args={[0.03, 0.03, RAIL_H, 8]} />
      </mesh>,
    )
  }
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1)
  return (
    <group>
      {posts}
      <mesh
        material={steel}
        position={[(x1 + x2) / 2, DECK_Y + RAIL_H, (z1 + z2) / 2]}
        rotation={alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.035, 0.035, len, 8]} />
      </mesh>
    </group>
  )
}

// Linha amarela pintada no chão.
function Paint({ x, z, w, d }) {
  return (
    <mesh material={paintYellow} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

function Sector({ nome, numero, x, z, w, d, color }) {
  const hw = w / 2
  const hd = d / 2
  const ri = 0.12 // recuo do guarda-corpo em relação à borda
  const deckMid = DECK_Y - DECK_T / 2
  const glow = neon(color)
  const o = 0.8 // distância da demarcação amarela até a plataforma
  const lw = 0.09 // largura da linha pintada

  // Clique na plataforma ou na placa: a câmera vai até o setor.
  const focar = () => focarEm(x, z, { dist: Math.max(9, Math.max(w, d) * 1.7) })
  const clique = (e) => {
    e.stopPropagation()
    if (e.delta > 6) return // foi um arrasto para girar, não um clique
    focar()
  }

  return (
    <group
      onClick={clique}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <group position={[x, 0, z]}>
        {/* Piso de aço */}
        <mesh material={steel} position={[0, deckMid, 0]}>
          <boxGeometry args={[w, DECK_T, d]} />
        </mesh>

        {/* Pés de sustentação */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].map(([sx, sz], i) => (
          <mesh key={i} material={brandDark} position={[sx * (hw - 0.3), (DECK_Y - DECK_T) / 2, sz * (hd - 0.3)]}>
            <boxGeometry args={[0.18, DECK_Y - DECK_T, 0.18]} />
          </mesh>
        ))}

        {/* Faixa zebrada nas bordas */}
        <mesh material={hazard(w)} position={[0, deckMid, hd + 0.011]}>
          <boxGeometry args={[w + 0.02, DECK_T, 0.02]} />
        </mesh>
        <mesh material={hazard(w)} position={[0, deckMid, -hd - 0.011]}>
          <boxGeometry args={[w + 0.02, DECK_T, 0.02]} />
        </mesh>
        <mesh material={hazard(d)} position={[hw + 0.011, deckMid, 0]}>
          <boxGeometry args={[0.02, DECK_T, d + 0.02]} />
        </mesh>
        <mesh material={hazard(d)} position={[-hw - 0.011, deckMid, 0]}>
          <boxGeometry args={[0.02, DECK_T, d + 0.02]} />
        </mesh>

        {/* Tira de neon por baixo da plataforma */}
        <mesh material={glow} position={[0, DECK_Y - DECK_T - 0.03, hd - 0.05]}>
          <boxGeometry args={[w - 0.2, 0.04, 0.04]} />
        </mesh>
        <mesh material={glow} position={[0, DECK_Y - DECK_T - 0.03, -hd + 0.05]}>
          <boxGeometry args={[w - 0.2, 0.04, 0.04]} />
        </mesh>
        <mesh material={glow} position={[hw - 0.05, DECK_Y - DECK_T - 0.03, 0]}>
          <boxGeometry args={[0.04, 0.04, d - 0.2]} />
        </mesh>
        <mesh material={glow} position={[-hw + 0.05, DECK_Y - DECK_T - 0.03, 0]}>
          <boxGeometry args={[0.04, 0.04, d - 0.2]} />
        </mesh>
        <pointLight color={color} intensity={6} distance={Math.max(w, d) + 2} decay={1.5} position={[0, 0.15, 0]} />

        {/* Guarda-corpo */}
        <RailSide from={[-hw + ri, -hd + ri]} to={[hw - ri, -hd + ri]} />
        <RailSide from={[hw - ri, -hd + ri]} to={[hw - ri, hd - ri]} />
        <RailSide from={[-hw + ri, -hd + ri]} to={[-hw + ri, hd - ri]} />
        {/* frente com abertura central (entrada) */}
        <RailSide from={[-hw + ri, hd - ri]} to={[-0.6, hd - ri]} />
        <RailSide from={[0.6, hd - ri]} to={[hw - ri, hd - ri]} />

        {/* Degraus da entrada */}
        <mesh material={darkSteel} position={[0, 0.2, hd + 0.17]}>
          <boxGeometry args={[1.1, 0.4, 0.3]} />
        </mesh>
        <mesh material={darkSteel} position={[0, 0.1, hd + 0.47]}>
          <boxGeometry args={[1.1, 0.2, 0.3]} />
        </mesh>

        <Html center position={[0, 0.05, hd + o + 0.35]} zIndexRange={[40, 0]} portal={overlay}>
          <div className="sector-sign sector-sign-link" style={{ '--c': color }} onClick={focar} title={`Aproximar do setor ${nome}`}>
            <span>SETOR {String(numero).padStart(2, '0')}</span> {nome}
          </div>
        </Html>
      </group>

      {/* Demarcação amarela no chão em volta da plataforma */}
      <Paint x={x} z={z - hd - o} w={w + 2 * o + lw} d={lw} />
      <Paint x={x} z={z + hd + o} w={w + 2 * o + lw} d={lw} />
      <Paint x={x - hw - o} z={z} w={lw} d={d + 2 * o} />
      <Paint x={x + hw + o} z={z} w={lw} d={d + 2 * o} />
    </group>
  )
}

export default memo(Sector)
