import { memo, useMemo } from 'react'
import * as THREE from 'three'
import {
  steel, darkSteel, paintYellow, paintGreen, paintWhite, lampBulb, lampShade,
  parede, telhaTranslucida, concreto, hazard, placa, fosco,
} from './materials.js'

export const TRUSS_Y = 8 // altura da treliça
export const TRUSS_H = 0.9 // altura entre banzo superior e inferior
const TRUSS_W = 0.8 // largura (duas faces paralelas)
const BAY = 1.5 // espaçamento dos montantes da treliça
export const PAREDE_H = 10.2 // altura das paredes do galpão

// Piso de concreto polido. Clicar no chão vazio (sem arrastar) chama onVazio.
export const Floor = memo(function Floor({ onVazio }) {
  return (
    <mesh
      material={concreto()}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta <= 6) onVazio?.()
      }}
    >
      <planeGeometry args={[160, 160]} />
    </mesh>
  )
})

// Faixa pintada no chão, retangular, no plano do piso.
export function Faixa({ x, z, w, d, material = paintYellow, y = 0.012 }) {
  return (
    <mesh material={material} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

// Quadrado zebrado amarelo e preto numa quina do piso.
export function Zebra({ x, z, s = 0.6, rot = 0 }) {
  return (
    <mesh material={hazard(s)} position={[x, 0.014, z]} rotation={[-Math.PI / 2, 0, rot]}>
      <planeGeometry args={[s, s * 0.34]} />
    </mesh>
  )
}

// Corredores de norma: pedestre em verde (com bordas brancas) e o corredor principal
// das empilhadeiras delimitado em amarelo. Cor de segurança, nunca cor da marca.
export const Aisles = memo(function Aisles({ xMin, xMax, zPedestre, zCorredor, zMeio }) {
  const len = xMax - xMin - 1
  const cx = (xMin + xMax) / 2
  return (
    <group>
      {/* corredor de pedestre: faixa verde de 1 m com bordas brancas e zebras nas pontas */}
      <Faixa x={cx} z={zPedestre} w={len} d={1.0} material={paintGreen} />
      <Faixa x={cx} z={zPedestre - 0.55} w={len} d={0.08} material={paintWhite} y={0.013} />
      <Faixa x={cx} z={zPedestre + 0.55} w={len} d={0.08} material={paintWhite} y={0.013} />
      {/* corredor principal das empilhadeiras: linhas amarelas contínuas */}
      <Faixa x={cx} z={zCorredor - 1.3} w={len} d={0.12} />
      <Faixa x={cx} z={zCorredor + 1.3} w={len} d={0.12} />
      {[xMin + 0.8, xMax - 0.8].map((x) => (
        <group key={x}>
          <Zebra x={x} z={zCorredor - 0.65} s={1.2} rot={Math.PI / 2} />
          <Zebra x={x} z={zCorredor + 0.65} s={1.2} rot={Math.PI / 2} />
        </group>
      ))}
      {/* corredor do meio, entre as fileiras de células */}
      {zMeio != null && (
        <>
          <Faixa x={cx} z={zMeio - 0.75} w={len} d={0.1} />
          <Faixa x={cx} z={zMeio + 0.75} w={len} d={0.1} />
        </>
      )}
    </group>
  )
})

// Uma barra de aço entre dois pontos (para as diagonais da treliça).
export function Beam({ a, b, size = 0.07, material = steel }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const dir = vb.clone().sub(va)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { pos: va.add(vb).multiplyScalar(0.5).toArray(), quat: q, len: dir.length() }
  }, [a, b])
  return (
    <mesh material={material} position={pos} quaternion={quat}>
      <boxGeometry args={[size, len, size]} />
    </mesh>
  )
}

// Pilar de galpão: perfil de aço cinza com a base zebrada (proteção contra batida).
export function Pilar({ x, z, h = TRUSS_Y + TRUSS_H / 2 }) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={steel} position={[0, h / 2, 0]}>
        <boxGeometry args={[0.42, h, 0.42]} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
        <mesh key={r} material={hazard(0.44)} position={[Math.sin(r) * 0.221, 0.6, Math.cos(r) * 0.221]} rotation={[0, r, 0]}>
          <planeGeometry args={[0.44, 1.2]} />
        </mesh>
      ))}
    </group>
  )
}

// Tesoura metálica atravessando o galpão, apoiada em pilares nas pontas,
// com luminárias de galpão acesas penduradas em fileira.
export const Truss = memo(function Truss({ length, z, lampadas = true }) {
  const n = Math.ceil(length / BAY)
  const L = n * BAY
  const x0 = -L / 2
  const top = TRUSS_Y + TRUSS_H / 2
  const bot = TRUSS_Y - TRUSS_H / 2
  const faces = [-TRUSS_W / 2, TRUSS_W / 2]

  const pecas = useMemo(() => {
    const p = []
    for (const fz of faces) {
      for (let i = 0; i < n; i++) {
        const xa = x0 + i * BAY
        const xb = xa + BAY
        p.push(i % 2 === 0 ? [[xa, bot, fz], [xb, top, fz]] : [[xa, top, fz], [xb, bot, fz]])
      }
    }
    return p
  }, [n, x0, top, bot])

  // uma luminária a cada 4 m
  const lampX = useMemo(() => {
    const q = Math.max(2, Math.floor(L / 4))
    return Array.from({ length: q }, (_, i) => x0 + (L / q) * (i + 0.5))
  }, [L, x0])

  return (
    <group position={[0, 0, z]}>
      {faces.map((fz) =>
        [top, bot].map((y) => (
          <mesh key={`${fz}-${y}`} material={steel} position={[0, y, fz]}>
            <boxGeometry args={[L, 0.1, 0.1]} />
          </mesh>
        )),
      )}
      {pecas.map(([a, b], i) => (
        <Beam key={i} a={a} b={b} />
      ))}
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} material={steel} position={[x0 + i * BAY, TRUSS_Y, 0]}>
          <boxGeometry args={[0.06, TRUSS_H, TRUSS_W]} />
        </mesh>
      ))}
      <Pilar x={x0 - 0.3} z={0} />
      <Pilar x={-x0 + 0.3} z={0} />
      {lampadas && lampX.map((x) => <Lamp key={x} x={x} z={0} />)}
    </group>
  )
})

// Luminária de galpão (campânula) acesa. Sem luz real: a claridade vem da luz do dia
// da cena; cada holofote real pesaria no tablet.
export const Lamp = memo(function Lamp({ x, z }) {
  const hang = 6.6
  return (
    <group position={[x, 0, z]}>
      <mesh material={darkSteel} position={[0, (TRUSS_Y - TRUSS_H / 2 + hang) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, TRUSS_Y - TRUSS_H / 2 - hang, 4]} />
      </mesh>
      <mesh material={lampShade} position={[0, hang, 0]}>
        <coneGeometry args={[0.42, 0.42, 16, 1, true]} />
      </mesh>
      <mesh material={lampBulb} position={[0, hang - 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
      </mesh>
    </group>
  )
})

// Casca do galpão: paredes só no fundo e na esquerda (o lado oposto à câmera, para não
// tapar a vista), faixa de telha translúcida no alto, beirada de telhado, portão,
// abrigo de extintor e a faixa AS CONSTRUCTION.
export const Galpao = memo(function Galpao({ xMin, xMax, zMin, zMax }) {
  const W = xMax - xMin
  const D = zMax - zMin
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const faixaY = PAREDE_H - 1.2 // faixa translúcida no alto das paredes
  const portaoZ = zMin + D * 0.62

  // pilares ao longo das paredes, a cada 6 m
  const pilaresFundo = useMemo(() => {
    const q = Math.max(2, Math.round(W / 6))
    return Array.from({ length: q + 1 }, (_, i) => xMin + (W / q) * i)
  }, [W, xMin])
  const pilaresEsq = useMemo(() => {
    const q = Math.max(2, Math.round(D / 6))
    return Array.from({ length: q + 1 }, (_, i) => zMin + (D / q) * i)
  }, [D, zMin])

  const faixaAS = placa('AS CONSTRUCTION', { w: 1024, h: 128, fonte: 96 })
  const extintor = fosco('#C8102E', 0.5)

  return (
    <group>
      {/* parede do fundo */}
      <mesh material={parede} position={[cx, (PAREDE_H - 1.6) / 2, zMin]}>
        <boxGeometry args={[W, PAREDE_H - 1.6, 0.2]} />
      </mesh>
      <mesh material={telhaTranslucida} position={[cx, faixaY, zMin + 0.02]}>
        <planeGeometry args={[W, 1.6]} />
      </mesh>
      {/* parede da esquerda, com vão para o portão */}
      <mesh material={parede} position={[xMin, (PAREDE_H - 1.6) / 2, (zMin + portaoZ - 2.6) / 2]}>
        <boxGeometry args={[0.2, PAREDE_H - 1.6, portaoZ - 2.6 - zMin]} />
      </mesh>
      <mesh material={parede} position={[xMin, (PAREDE_H - 1.6) / 2, (portaoZ + 2.6 + zMax) / 2]}>
        <boxGeometry args={[0.2, PAREDE_H - 1.6, zMax - portaoZ - 2.6]} />
      </mesh>
      <mesh material={parede} position={[xMin, 6.6 + (PAREDE_H - 1.6 - 6.6) / 2, portaoZ]}>
        <boxGeometry args={[0.2, PAREDE_H - 1.6 - 6.6, 5.2]} />
      </mesh>
      <mesh material={telhaTranslucida} position={[xMin + 0.02, faixaY, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, 1.6]} />
      </mesh>

      {/* portão de enrolar: lâminas cinza, batente zebrado e faixa zebrada no piso */}
      <group position={[xMin + 0.06, 0, portaoZ]}>
        {Array.from({ length: 22 }, (_, i) => (
          <mesh key={i} material={i % 2 ? steel : darkSteel} position={[0, 0.15 + i * 0.3, 0]}>
            <boxGeometry args={[0.06, 0.28, 5.0]} />
          </mesh>
        ))}
        {[-2.6, 2.6].map((dz) => (
          <mesh key={dz} material={hazard(6.6)} position={[0.05, 3.3, dz]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
            <planeGeometry args={[6.6, 0.25]} />
          </mesh>
        ))}
        <mesh material={darkSteel} position={[0.25, 6.85, 0]}>
          <boxGeometry args={[0.5, 0.5, 5.4]} />
        </mesh>
      </group>
      <mesh material={hazard(5)} position={[xMin + 0.9, 0.014, portaoZ]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[5, 0.5]} />
      </mesh>

      {/* beirada do telhado: chapas cinza alternando com telhas translúcidas */}
      {pilaresFundo.slice(0, -1).map((x, i) => (
        <mesh
          key={x}
          material={i % 3 === 1 ? telhaTranslucida : parede}
          position={[x + W / (pilaresFundo.length - 1) / 2, PAREDE_H + 0.25, zMin + 1.6]}
          rotation={[-Math.PI / 2 + 0.12, 0, 0]}
        >
          <planeGeometry args={[W / (pilaresFundo.length - 1), 3.3]} />
        </mesh>
      ))}
      {pilaresEsq.slice(0, -1).map((z, i) => (
        <mesh
          key={z}
          material={i % 3 === 1 ? telhaTranslucida : parede}
          position={[xMin + 1.6, PAREDE_H + 0.25, z + D / (pilaresEsq.length - 1) / 2]}
          rotation={[-Math.PI / 2, -0.12, 0]}
        >
          <planeGeometry args={[3.3, D / (pilaresEsq.length - 1)]} />
        </mesh>
      ))}

      {/* pilares encostados nas paredes */}
      {pilaresFundo.map((x) => <Pilar key={`f${x}`} x={x} z={zMin + 0.35} h={PAREDE_H} />)}
      {pilaresEsq.map((z) => <Pilar key={`e${z}`} x={xMin + 0.35} z={z} h={PAREDE_H} />)}

      {/* faixa AS CONSTRUCTION no alto da parede do fundo */}
      <mesh material={faixaAS} position={[cx, PAREDE_H - 3.0, zMin + 0.12]}>
        <planeGeometry args={[Math.min(16, W * 0.5), 2.0]} />
      </mesh>

      {/* abrigos de extintor nas paredes */}
      {[xMin + W * 0.2, xMin + W * 0.78].map((x) => (
        <group key={x} position={[x, 0, zMin + 0.13]}>
          <mesh material={extintor} position={[0, 1.35, 0.05]}>
            <boxGeometry args={[0.55, 0.9, 0.12]} />
          </mesh>
          <mesh material={paintWhite} position={[0, 1.35, 0.112]}>
            <planeGeometry args={[0.36, 0.5]} />
          </mesh>
          <mesh material={extintor} position={[0, 2.1, 0.02]}>
            <boxGeometry args={[0.7, 0.35, 0.03]} />
          </mesh>
        </group>
      ))}
      <group position={[xMin + 0.13, 0, zMin + D * 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={extintor} position={[0, 1.35, 0.05]}>
          <boxGeometry args={[0.55, 0.9, 0.12]} />
        </mesh>
        <mesh material={paintWhite} position={[0, 1.35, 0.112]}>
          <planeGeometry args={[0.36, 0.5]} />
        </mesh>
      </group>
    </group>
  )
})
