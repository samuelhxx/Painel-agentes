import { memo, useMemo } from 'react'
import { Grid, Html } from '@react-three/drei'
import * as THREE from 'three'
import { isStuck, AMBAR } from '../status.js'
import { useNow } from '../time.js'
import { steel, darkSteel, paintYellow, neon, hazard, brilho, lampBulb, lampShade } from './materials.js'
import { overlay } from './overlay.js'
import Person, { hashId } from './Person.jsx'
import { focarEm } from './focus.js'

// Sala da Direção: mezanino elevado de frente para o galpão. Fixa no código, não vem da planilha.
const MY = 4.2 // altura do piso do mezanino
const DX = 9 // largura do mezanino
const DZ = 5 // profundidade do mezanino
const RW = 7 // largura da sala de vidro
const RH = 2.6 // pé-direito da sala
const RAIL = 1.0 // altura do guarda-corpo
const ROXO = '#A855F7'
const DEGRAUS = 20
const PISADA = 0.28

const vidro = new THREE.MeshPhysicalMaterial({
  color: '#CFE0FF',
  transmission: 0.95,
  opacity: 0.18,
  transparent: true,
  roughness: 0.05,
  metalness: 0,
  thickness: 0.02,
  ior: 1.45,
  depthWrite: false,
})

// Cilindro de um ponto a outro (tubos do corrimão e guarda-corpo).
function Tubo({ a, b, r = 0.03, material = steel }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const dir = vb.clone().sub(va)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { pos: va.add(vb).multiplyScalar(0.5).toArray(), quat: q, len: dir.length() }
  }, [a, b])
  return (
    <mesh material={material} position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8]} />
    </mesh>
  )
}

// Guarda-corpo reto: montantes + travessa superior.
function Guarda({ de, ate, y }) {
  const [x1, z1] = de
  const [x2, z2] = ate
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 1.3))
  return (
    <group>
      {Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n
        const x = x1 + (x2 - x1) * t
        const z = z1 + (z2 - z1) * t
        return <Tubo key={i} a={[x, y, z]} b={[x, y + RAIL, z]} />
      })}
      <Tubo a={[x1, y + RAIL, z1]} b={[x2, y + RAIL, z2]} r={0.035} />
    </group>
  )
}

// Uma pasta âmbar para cada item em REQUER ATENÇÃO. Zero itens: mesa limpa.
const Pastas = memo(function Pastas({ agentes }) {
  const now = useNow(15000)
  const n = agentes.filter((a) => a.status === 'erro' || a.status === 'aguardando_aprovacao' || isStuck(a, now)).length
  const mat = brilho(AMBAR, 1.2)
  return (
    <group>
      {Array.from({ length: Math.min(n, 14) }, (_, i) => {
        const h = hashId(`pasta${i}`)
        return (
          <mesh key={i} material={mat} position={[((h % 7) - 3) * 0.008, 0.016 + i * 0.03, ((h >> 3) % 7 - 3) * 0.008]} rotation={[0, ((h % 13) - 6) * 0.025, 0]}>
            <boxGeometry args={[0.31, 0.026, 0.23]} />
          </mesh>
        )
      })}
    </group>
  )
})

function Direction({ zc, agentes }) {
  const zf = zc + DZ / 2 // borda da frente do mezanino (virada para o galpão)
  const zb = zc - DZ / 2 + 0.4 // fundo da sala
  const zr = zf - 0.7 // frente da sala (vidro)
  const RD = zr - zb // profundidade da sala
  const zm = (zb + zr) / 2
  const escZ = zf - 0.55 // eixo da escada
  const x0 = DX / 2 // a escada sai da lateral direita do mezanino
  const topoSala = MY + RH

  const glow = neon(ROXO)
  const mesaZ = zr - 2.0
  const mesaY = MY + 0.75

  // 12 arestas da caixa de vidro em neon roxo
  const arestas = useMemo(() => {
    const a = []
    const xs = [-RW / 2, RW / 2]
    const zs = [zb, zr]
    for (const x of xs) for (const z of zs) a.push({ p: [x, MY + RH / 2, z], s: [0.045, RH, 0.045] })
    for (const y of [MY + 0.02, topoSala]) {
      for (const z of zs) a.push({ p: [0, y, z], s: [RW, 0.045, 0.045] })
      for (const x of xs) a.push({ p: [x, y, zm], s: [0.045, 0.045, RD] })
    }
    return a
  }, [zb, zr, zm, RD, topoSala])

  const alvoLuz = useMemo(() => new THREE.Object3D(), [])

  // Clique no mezanino ou na placa: a câmera vai até a sala da Direção.
  const focar = () => focarEm(0, zm, { y: MY + 1.2, dist: 11 })
  const clique = (e) => {
    e.stopPropagation()
    if (e.delta > 6) return
    focar()
  }

  return (
    <group
      onClick={clique}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      {/* ── Estrutura: colunas de aço e vigas aparentes ── */}
      {[-DX / 2 + 0.3, 0, DX / 2 - 0.3].map((x) =>
        [zc - DZ / 2 + 0.3, zc + DZ / 2 - 0.3].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh material={darkSteel} position={[0, (MY - 0.4) / 2, 0]}>
              <boxGeometry args={[0.32, MY - 0.4, 0.32]} />
            </mesh>
            <mesh material={paintYellow} position={[0, 0.5, 0]}>
              <boxGeometry args={[0.34, 1, 0.34]} />
            </mesh>
          </group>
        )),
      )}
      {[zc - DZ / 2 + 0.3, zc + DZ / 2 - 0.3].map((z) => (
        <mesh key={z} material={steel} position={[0, MY - 0.3, z]}>
          <boxGeometry args={[DX, 0.36, 0.22]} />
        </mesh>
      ))}
      {[-DX / 2 + 0.3, -1.5, 0, 1.5, DX / 2 - 0.3].map((x) => (
        <mesh key={x} material={steel} position={[x, MY - 0.25, zc]}>
          <boxGeometry args={[0.16, 0.26, DZ]} />
        </mesh>
      ))}

      {/* ── Piso do mezanino: chapa + grelha metálica + faixa zebrada ── */}
      <mesh material={steel} position={[0, MY - 0.06, zc]}>
        <boxGeometry args={[DX, 0.12, DZ]} />
      </mesh>
      <Grid
        position={[0, MY + 0.004, zc]}
        args={[DX, DZ]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1A2029"
        sectionSize={2.5}
        sectionThickness={1.1}
        sectionColor="#2A3038"
        fadeDistance={200}
      />
      <mesh material={hazard(DX)} position={[0, MY - 0.06, zf + 0.011]}>
        <boxGeometry args={[DX + 0.02, 0.12, 0.02]} />
      </mesh>

      {/* guarda-corpo do mezanino (aberto onde chega a escada) */}
      <Guarda de={[-DX / 2 + 0.08, zf - 0.08]} ate={[DX / 2 - 0.08, zf - 0.08]} y={MY} />
      <Guarda de={[-DX / 2 + 0.08, zc - DZ / 2 + 0.08]} ate={[-DX / 2 + 0.08, zf - 0.08]} y={MY} />
      <Guarda de={[DX / 2 - 0.08, zc - DZ / 2 + 0.08]} ate={[DX / 2 - 0.08, escZ - 0.6]} y={MY} />

      {/* ── Escada metálica: degraus, longarinas, corrimão e guarda-corpo dos dois lados ── */}
      {Array.from({ length: DEGRAUS - 1 }, (_, i) => (
        <mesh key={i} material={steel} position={[x0 + (DEGRAUS - 1 - i) * PISADA - PISADA / 2, (i + 1) * (MY / DEGRAUS) - 0.02, escZ]}>
          <boxGeometry args={[PISADA, 0.04, 1.0]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => {
        const z = escZ + s * 0.52
        const fim = x0 + DEGRAUS * PISADA
        return (
          <group key={s}>
            <Tubo a={[x0, MY - 0.1, z]} b={[fim, -0.02, z]} r={0.05} material={darkSteel} />
            <Tubo a={[x0, MY + RAIL, z]} b={[fim, RAIL, z]} r={0.03} />
            <Tubo a={[x0, MY + RAIL / 2, z]} b={[fim, RAIL / 2, z]} r={0.02} />
            {[0, 5, 10, 15, 20].map((k) => {
              const x = x0 + k * PISADA
              const y = MY - (k * MY) / DEGRAUS
              return <Tubo key={k} a={[x, y, z]} b={[x, y + RAIL, z]} r={0.025} />
            })}
          </group>
        )
      })}

      {/* ── A sala de vidro ── */}
      {/* mureta da frente, onde o diretor apoia as mãos */}
      <mesh material={darkSteel} position={[0, MY + 0.5, zr - 0.06]}>
        <boxGeometry args={[RW, 1.0, 0.12]} />
      </mesh>
      {/* vidros: frente (acima da mureta), fundo e laterais */}
      <mesh material={vidro} position={[0, MY + 1.0 + (RH - 1.0) / 2, zr]}>
        <planeGeometry args={[RW, RH - 1.0]} />
      </mesh>
      <mesh material={vidro} position={[0, MY + RH / 2, zb]}>
        <planeGeometry args={[RW, RH]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={vidro} position={[s * (RW / 2), MY + RH / 2, zm]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[RD, RH]} />
        </mesh>
      ))}
      {arestas.map((e, i) => (
        <mesh key={i} material={glow} position={e.p}>
          <boxGeometry args={e.s} />
        </mesh>
      ))}
      {/* teto baixo de metal escuro */}
      <mesh material={darkSteel} position={[0, topoSala + 0.07, zm]}>
        <boxGeometry args={[RW + 0.2, 0.12, RD + 0.2]} />
      </mesh>

      {/* luminária só da sala, luz branca mais forte */}
      <group position={[0, topoSala - 0.1, mesaZ + 0.6]}>
        <mesh material={lampShade} position={[0, -0.12, 0]}>
          <coneGeometry args={[0.32, 0.3, 16, 1, true]} />
        </mesh>
        <mesh material={lampBulb} position={[0, -0.26, 0]}>
          <sphereGeometry args={[0.1, 12, 8]} />
        </mesh>
        <primitive object={alvoLuz} position={[0, -RH, 0]} />
        <spotLight target={alvoLuz} position={[0, -0.3, 0]} color="#FFFFFF" intensity={70} angle={1.05} penumbra={0.6} decay={1.5} distance={7} />
      </group>

      {/* mesa maior, virada para o galpão, com três monitores roxos */}
      <group position={[0, 0, mesaZ]}>
        <mesh material={darkSteel} position={[0, mesaY, 0]}>
          <boxGeometry args={[2.4, 0.06, 0.95]} />
        </mesh>
        {[[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].map(([x, z], i) => (
          <mesh key={i} material={steel} position={[x, MY + 0.36, z]}>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
          </mesh>
        ))}
        {[-0.72, 0, 0.72].map((x, i) => (
          <group key={x} position={[x, mesaY + 0.4, -0.3]} rotation={[0, (i - 1) * -0.25, 0]}>
            <mesh material={darkSteel}>
              <boxGeometry args={[0.66, 0.4, 0.04]} />
            </mesh>
            <mesh material={brilho(ROXO, 2)} position={[0, 0, 0.022]}>
              <planeGeometry args={[0.6, 0.34]} />
            </mesh>
            <mesh material={steel} position={[0, -0.27, -0.02]}>
              <cylinderGeometry args={[0.025, 0.04, 0.16, 8]} />
            </mesh>
          </group>
        ))}
        {/* pilha de pastas: uma por item em REQUER ATENÇÃO */}
        <group position={[0.85, mesaY + 0.03, 0.2]}>
          <Pastas agentes={agentes} />
        </group>
      </group>

      {/* o diretor, em pé, encostado no vidro olhando o galpão */}
      <group position={[-0.9, MY, zr - 0.47]} rotation={[0, Math.PI, 0]}>
        <Person id="direcao-samuel" pose="em_pe" capacete="#F4F4F4" />
      </group>

      {/* placa da sala e plaquinha do diretor (sempre visíveis) */}
      <Html center position={[0, topoSala + 0.45, zr]} zIndexRange={[40, 0]} portal={overlay}>
        <div className="sector-sign sector-sign-link" style={{ '--c': ROXO }} onClick={focar} title="Aproximar da Direção">
          DIREÇÃO
        </div>
      </Html>
      <Html center position={[-0.9, MY + 2.3, zr - 0.47]} zIndexRange={[3000, 2900]} portal={overlay} style={{ pointerEvents: 'none' }}>
        <div className="boss-tag">SAMUEL · DIRETOR COMERCIAL</div>
      </Html>
    </group>
  )
}

export default memo(Direction)
