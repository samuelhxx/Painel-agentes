import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fosco, brilho } from './materials.js'
import { MARCA } from '../marca.js'
import Mesclar from './Mesclar.jsx'

// Corpo humano montado com primitivas. Unidade = 1 cabeça = 0,25.
// Em pé: ~7 cabeças de altura; ombros com 2 cabeças de largura; ombro→quadril 2,5 cabeças.
// A pessoa é montada olhando para -z (para a mesa); a origem fica no chão, sob o quadril.
const SEG = 12

const PELES = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#A0662F', '#FFDBAC']
const CAMISAS = ['#2B3A55', '#3A3F47', '#4A3B2F', '#2F4A3A', '#4B2F3F', '#34495E']
const CALCA = '#1E2530'
const SAPATO = '#15171C'
// Uniforme da AS: colete e capacete no roxo da marca, faixa refletiva prateada no colete.
const UNIFORME = MARCA.roxoMarca
const REFLETIVO = '#D9DDE2'

export function hashId(id) {
  let h = 7
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

// Cilindro de um ponto a outro (braços e pernas).
function Membro({ a, b, r, material }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const dir = vb.clone().sub(va)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { pos: va.add(vb).multiplyScalar(0.5).toArray(), quat: q, len: dir.length() }
  }, [a, b])
  return (
    <mesh material={material} position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r * 0.9, len, SEG]} />
    </mesh>
  )
}

// Pontos das articulações em cada pose (x positivo = lado direito; espelhado para o esquerdo).
const POSES = {
  sentado: {
    quadril: 0.56,
    cotovelo: [0.25, 0.82, -0.2],
    pulso: [0.15, 0.815, -0.52],
    joelho: [0.11, 0.56, -0.44],
    tornozelo: [0.11, 0.08, -0.46],
    pe: [0.11, 0.035, -0.53],
  },
  em_pe: {
    quadril: 0.95,
    cotovelo: [0.26, 1.2, -0.12],
    pulso: [0.22, 1.03, -0.38],
    joelho: [0.1, 0.5, -0.02],
    tornozelo: [0.1, 0.08, 0],
    pe: [0.1, 0.035, -0.07],
  },
}
const esp = ([x, y, z]) => [-x, y, z]

function Person({ id, pose = 'sentado', capacete = UNIFORME, trabalhando = false, fone = false }) {
  const P = POSES[pose]
  const h = hashId(id)
  // ±5% de altura e largura, fixo por id: ninguém fica igual.
  const alt = 0.95 + ((h % 11) / 10) * 0.1
  const larg = 0.95 + (((h >> 4) % 11) / 10) * 0.1
  const pele = fosco(PELES[h % PELES.length], 0.6)
  const camisa = fosco(CAMISAS[(h >> 3) % CAMISAS.length])
  const calca = fosco(CALCA)
  const sapato = fosco(SAPATO, 0.5)
  const colete = fosco(UNIFORME, 0.7)
  const faixa = brilho(REFLETIVO, 0.35)
  const helmet = fosco(capacete, 0.35)

  const Y = P.quadril
  const ombro = [0.2, Y + 0.54, 0]
  const junta = [0.1, Y - 0.02, 0]
  const cabecaY = Y + 0.77

  const tronco = useRef()
  const cabeca = useRef()
  const fase = (h % 628) / 100

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const k = Math.min(1, delta * 4)
    // Trabalhando: tronco sobe e desce de leve; cabeça balança devagar, como quem lê.
    const dy = trabalhando ? Math.sin(t * 2.2 + fase) * 0.012 : 0
    const rx = trabalhando ? 0.1 + Math.sin(t * 1.1 + fase) * 0.06 : 0
    const ry = trabalhando ? Math.sin(t * 0.55 + fase) * 0.14 : 0
    tronco.current.position.y += (dy - tronco.current.position.y) * k
    cabeca.current.rotation.x += (rx - cabeca.current.rotation.x) * k
    cabeca.current.rotation.y += (ry - cabeca.current.rotation.y) * k
  })

  return (
    <group scale={[larg, alt, larg]}>
      {/* parte parada (quadril, pernas, braços): poucas peças, ver Mesclar.jsx */}
      <Mesclar>
      {/* Quadril */}
      <mesh material={calca} position={[0, Y, 0]}>
        <boxGeometry args={[0.36, 0.16, 0.24]} />
      </mesh>

      {/* Pernas: coxas e canelas, pés no chão */}
      {[1, -1].map((s) => {
        const m = s === 1 ? (p) => p : esp
        return (
          <group key={s}>
            <Membro a={m(junta)} b={m(P.joelho)} r={0.075} material={calca} />
            <Membro a={m(P.joelho)} b={m(P.tornozelo)} r={0.055} material={calca} />
            <mesh material={sapato} position={m(P.pe)}>
              <boxGeometry args={[0.1, 0.07, 0.24]} />
            </mesh>
          </group>
        )
      })}

      {/* Braços: do ombro ao cotovelo e do cotovelo ao pulso, com as mãos */}
      {[1, -1].map((s) => {
        const m = s === 1 ? (p) => p : esp
        const [px, py, pz] = m(P.pulso)
        return (
          <group key={s}>
            <Membro a={m(ombro)} b={m(P.cotovelo)} r={0.048} material={camisa} />
            <Membro a={m(P.cotovelo)} b={m(P.pulso)} r={0.04} material={camisa} />
            <mesh material={pele} position={[px, py - 0.005, pz - 0.06]} scale={[1, 0.45, 1.35]}>
              <sphereGeometry args={[0.048, SEG, 8]} />
            </mesh>
          </group>
        )
      })}

      </Mesclar>

      {/* Tronco, ombros, colete, pescoço e cabeça (parte que se mexe) */}
      <group ref={tronco} userData={{ vivo: true }}>
        <Mesclar>
        <mesh material={camisa} position={[0, Y + 0.33, 0]} scale={[1, 1, 0.6]}>
          <cylinderGeometry args={[0.2, 0.15, 0.5, SEG]} />
        </mesh>
        {/* colete: capa roxa por cima da camisa, com duas faixas refletivas */}
        <mesh material={colete} position={[0, Y + 0.31, 0]} scale={[1, 1, 0.62]}>
          <cylinderGeometry args={[0.212, 0.168, 0.42, SEG]} />
        </mesh>
        {[
          [Y + 0.2, 0.185],
          [Y + 0.38, 0.203],
        ].map(([y, r]) => (
          <mesh key={y} material={faixa} position={[0, y, 0]} scale={[1, 1, 0.62]}>
            <cylinderGeometry args={[r, r, 0.035, SEG, 1, true]} />
          </mesh>
        ))}
        {[1, -1].map((s) => (
          <mesh key={s} material={camisa} position={[s * 0.2, Y + 0.54, 0]}>
            <sphereGeometry args={[0.075, SEG, 8]} />
          </mesh>
        ))}
        <mesh material={pele} position={[0, Y + 0.625, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.09, SEG]} />
        </mesh>

        </Mesclar>
        <group ref={cabeca} position={[0, cabecaY, 0]}>
          <Mesclar>
          <mesh material={pele} scale={[1, 0.93, 1]}>
            <sphereGeometry args={[0.11, SEG, 10]} />
          </mesh>
          {/* capacete: meia-esfera + aba na frente */}
          <mesh material={helmet} position={[0, 0.015, 0]}>
            <sphereGeometry args={[0.122, SEG, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={helmet} position={[0, 0.015, -0.035]}>
            <cylinderGeometry args={[0.15, 0.15, 0.01, SEG]} />
          </mesh>
          {fone && (
            <>
              {[1, -1].map((s) => (
                <mesh key={s} material={fosco('#1A1D24', 0.4)} position={[s * 0.118, 0, 0]}>
                  <sphereGeometry args={[0.042, SEG, 8]} />
                </mesh>
              ))}
              <mesh material={fosco('#1A1D24', 0.4)} position={[0, 0, 0]}>
                <torusGeometry args={[0.14, 0.011, 6, SEG, Math.PI]} />
              </mesh>
            </>
          )}
          </Mesclar>
        </group>
      </group>
    </group>
  )
}

export default memo(Person)
