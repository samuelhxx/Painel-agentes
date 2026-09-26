import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial, Grid } from '@react-three/drei'
import { steel, darkSteel, brandDark, paintYellow, lampBulb, lampShade } from './materials.js'

export const TRUSS_Y = 8 // altura da treliça
export const TRUSS_H = 0.9 // altura entre banzo superior e inferior
const TRUSS_W = 0.8 // largura (duas faces paralelas)
const BAY = 1.5 // espaçamento dos montantes da treliça

// Chão reflexivo + grelha metálica.
// Clicar no chão vazio (sem arrastar) chama onVazio: volta para a visão geral.
export const Floor = memo(function Floor({ onVazio }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta <= 6) onVazio?.()
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <MeshReflectorMaterial
          color="#080A10"
          metalness={0.6}
          roughness={0.85}
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={30}
          mirror={0.7}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <Grid
        position={[0, 0.006, 0]}
        args={[160, 160]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1A2029"
        sectionSize={2.5}
        sectionThickness={1.1}
        sectionColor="#2A3038"
        fadeDistance={80}
        fadeStrength={1.2}
        infiniteGrid
      />
    </group>
  )
})

// Linhas amarelas de corredor, na frente e atrás das plataformas.
export const Aisles = memo(function Aisles({ width, depth }) {
  const len = width + 10
  return (
    <group>
      {[-1, 1].map((s) =>
        [0, 1.4].map((o) => (
          <mesh key={`${s}-${o}`} material={paintYellow} position={[0, 0.012, s * (depth / 2 + 2 + o)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[len, 0.12]} />
          </mesh>
        )),
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

// Treliça metálica atravessando a cena, apoiada em pilares nas pontas.
export const Truss = memo(function Truss({ length, z }) {
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
        // diagonal em zigue-zague
        p.push(i % 2 === 0 ? [[xa, bot, fz], [xb, top, fz]] : [[xa, top, fz], [xb, bot, fz]])
      }
    }
    return p
  }, [n, x0, top, bot])

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
        <group key={i}>
          <mesh material={steel} position={[x0 + i * BAY, TRUSS_Y, 0]}>
            <boxGeometry args={[0.06, TRUSS_H, TRUSS_W]} />
          </mesh>
        </group>
      ))}
      {/* pilares nas pontas */}
      {[x0 - 0.3, -x0 + 0.3].map((px) => (
        <group key={px} position={[px, 0, 0]}>
          <mesh material={brandDark} position={[0, (TRUSS_Y + TRUSS_H / 2) / 2, 0]}>
            <boxGeometry args={[0.45, TRUSS_Y + TRUSS_H / 2, 0.45]} />
          </mesh>
          <mesh material={paintYellow} position={[0, 0.5, 0]}>
            <boxGeometry args={[0.47, 1, 0.47]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})

// Luminária industrial pendurada: cabo, cúpula cônica de metal e lâmpada emissiva.
export const Lamp = memo(function Lamp({ x, z, light = true }) {
  const hang = 6.3
  const target = useMemo(() => new THREE.Object3D(), [])
  return (
    <group position={[x, 0, z]}>
      <mesh material={darkSteel} position={[0, (TRUSS_Y - TRUSS_H / 2 + hang) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, TRUSS_Y - TRUSS_H / 2 - hang, 4]} />
      </mesh>
      <mesh material={lampShade} position={[0, hang, 0]}>
        <coneGeometry args={[0.38, 0.4, 24, 1, true]} />
      </mesh>
      <mesh material={lampBulb} position={[0, hang - 0.2, 0]}>
        <sphereGeometry args={[0.13, 16, 12]} />
      </mesh>
      {light && (
        <>
          <primitive object={target} position={[0, 0, 0]} />
          <spotLight
            position={[0, hang - 0.2, 0]}
            target={target}
            color="#FFE8C4"
            intensity={220}
            angle={0.8}
            penumbra={0.75}
            decay={1.8}
            distance={14}
          />
        </>
      )}
    </group>
  )
})
