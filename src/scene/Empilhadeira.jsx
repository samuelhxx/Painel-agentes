import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { brandDark, darkSteel, steel, fosco, neon } from './materials.js'
import Mesclar from './Mesclar.jsx'

const VEL = 1.1 // m/s: devagar, como dentro de galpão
const GIRO = 0.9 // rad/s na manobra da ponta
const pneu = fosco('#1B1C1F', 0.9)
const madeira = fosco('#A9804F', 0.9)
const carga = fosco('#C9B08A', 0.9)
const cupula = neon('#F5A300', 1.1)
const facho = neon('#FFC43A', 3)

// Empilhadeira montada com caixas. Olha para +x; a origem fica no chão, no centro.
function Modelo({ giroflex }) {
  return (
    <Mesclar>
      {/* chassi e contrapeso na cor da marca */}
      <mesh material={brandDark} position={[-0.1, 0.55, 0]}>
        <boxGeometry args={[1.5, 0.6, 1.0]} />
      </mesh>
      <mesh material={brandDark} position={[-0.72, 0.95, 0]}>
        <boxGeometry args={[0.36, 0.5, 0.96]} />
      </mesh>
      {/* banco do operador */}
      <mesh material={darkSteel} position={[-0.3, 0.95, 0]}>
        <boxGeometry args={[0.45, 0.2, 0.5]} />
      </mesh>
      <mesh material={darkSteel} position={[-0.52, 1.2, 0]}>
        <boxGeometry args={[0.08, 0.45, 0.5]} />
      </mesh>
      {/* proteção do operador: 4 colunas e teto */}
      {[[0.25, 0.42], [0.25, -0.42], [-0.6, 0.42], [-0.6, -0.42]].map(([x, z]) => (
        <mesh key={`${x}${z}`} material={darkSteel} position={[x, 1.55, z]}>
          <boxGeometry args={[0.06, 1.4, 0.06]} />
        </mesh>
      ))}
      <mesh material={darkSteel} position={[-0.18, 2.27, 0]}>
        <boxGeometry args={[0.95, 0.06, 0.92]} />
      </mesh>
      {/* giroflex no teto */}
      <group position={[-0.5, 2.36, 0]}>
        <mesh material={cupula}>
          <cylinderGeometry args={[0.09, 0.11, 0.14, 12]} />
        </mesh>
        <mesh ref={giroflex} material={facho} position={[0, 0.02, 0]} userData={{ vivo: true }}>
          <boxGeometry args={[0.02, 0.1, 0.26]} />
        </mesh>
      </group>
      {/* rodas */}
      {[[0.45, 0.46], [0.45, -0.46], [-0.6, 0.44], [-0.6, -0.44]].map(([x, z]) => (
        <mesh key={`r${x}${z}`} material={pneu} position={[x, 0.26, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.2, 14]} />
        </mesh>
      ))}
      {/* torre (mastro) e garfos */}
      {[0.32, -0.32].map((z) => (
        <mesh key={`m${z}`} material={steel} position={[0.72, 1.25, z]}>
          <boxGeometry args={[0.1, 2.5, 0.1]} />
        </mesh>
      ))}
      <mesh material={steel} position={[0.78, 0.55, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.8]} />
      </mesh>
      {[0.24, -0.24].map((z) => (
        <mesh key={`g${z}`} material={darkSteel} position={[1.25, 0.34, z]}>
          <boxGeometry args={[1.0, 0.05, 0.12]} />
        </mesh>
      ))}
      {/* palete com carga nos garfos */}
      <mesh material={madeira} position={[1.3, 0.42, 0]}>
        <boxGeometry args={[1.0, 0.1, 1.0]} />
      </mesh>
      <mesh material={carga} position={[1.3, 0.8, 0]}>
        <boxGeometry args={[0.9, 0.66, 0.9]} />
      </mesh>
    </Mesclar>
  )
}

// Vai e volta pelo corredor entre xA e xB, manobrando 180° em cada ponta.
function Empilhadeira({ xA, xB, z, atraso = 0 }) {
  const corpo = useRef()
  const giroflex = useRef()
  const st = useRef({ x: xA + (xB - xA) * atraso, dir: 1, girando: 0, ang: 0 })

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1) // aba voltando de segundo plano não dá salto
    const s = st.current
    giroflex.current.rotation.y += d * 9
    if (s.girando > 0) {
      const passo = Math.min(s.girando, GIRO * d)
      s.ang += passo
      s.girando -= passo
    } else {
      s.x += s.dir * VEL * d
      if ((s.dir > 0 && s.x >= xB) || (s.dir < 0 && s.x <= xA)) {
        s.x = Math.min(xB, Math.max(xA, s.x))
        s.dir *= -1
        s.girando = Math.PI
      }
    }
    corpo.current.position.x = s.x
    corpo.current.rotation.y = s.ang
  })

  return (
    <group ref={corpo} position={[xA, 0, z]}>
      <Modelo giroflex={giroflex} />
    </group>
  )
}

export default memo(Empilhadeira)
