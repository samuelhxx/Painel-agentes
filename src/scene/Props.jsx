import { memo } from 'react'
import { fosco, paintWhite } from './materials.js'

// Objetos soltos pelo galpão. Cores de fábrica de verdade (porta-palete azul e laranja,
// tambor azul, cone laranja), nenhuma é cor da marca nem cor de segurança do piso.
const madeira = fosco('#A9804F', 0.9)
const caixa = fosco('#C9B08A', 0.9)
const caixaEscura = fosco('#B0956C', 0.9)
const filme = fosco('#DDE3E8', 0.35)
const montante = fosco('#2F5FA7', 0.55)
const longarina = fosco('#E06A1B', 0.55)
const tambor = fosco('#2A5CA8', 0.45)
const tamborTampa = fosco('#1F4680', 0.45)
const cone = fosco('#F26B1D', 0.6)

// Palete de madeira; com carga, leva caixas embaladas em filme.
export function Palete({ x = 0, z = 0, y = 0, rot = 0, cheio = true }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh material={madeira} position={[0, 0.07, 0]}>
        <boxGeometry args={[1.2, 0.14, 1.0]} />
      </mesh>
      {cheio && (
        <>
          <mesh material={caixa} position={[-0.28, 0.42, 0]}>
            <boxGeometry args={[0.56, 0.56, 0.96]} />
          </mesh>
          <mesh material={caixaEscura} position={[0.29, 0.38, 0]}>
            <boxGeometry args={[0.56, 0.48, 0.96]} />
          </mesh>
          <mesh material={filme} position={[0, 0.44, 0]} scale={[1, 1, 1]}>
            <boxGeometry args={[1.16, 0.02, 0.98]} />
          </mesh>
        </>
      )}
    </group>
  )
}

// Porta-palete: montantes azuis, longarinas laranja, três níveis com paletes.
export function PortaPalete({ x, z, rot = 0, vaos = 2 }) {
  const L = vaos * 2.7
  const niveis = [0.15, 1.75, 3.35]
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {Array.from({ length: vaos + 1 }, (_, i) => -L / 2 + i * 2.7).map((px) =>
        [-0.5, 0.5].map((pz) => (
          <mesh key={`${px}${pz}`} material={montante} position={[px, 2.3, pz]}>
            <boxGeometry args={[0.09, 4.6, 0.09]} />
          </mesh>
        )),
      )}
      {niveis.slice(1).map((y) =>
        [-0.5, 0.5].map((pz) => (
          <mesh key={`${y}${pz}`} material={longarina} position={[0, y, pz]}>
            <boxGeometry args={[L, 0.12, 0.06]} />
          </mesh>
        )),
      )}
      {niveis.map((y, n) =>
        Array.from({ length: vaos }, (_, i) => (
          <Palete key={`${n}${i}`} x={-L / 2 + 1.35 + i * 2.7} y={y + 0.06} cheio={(n + i) % 3 !== 2} />
        )),
      )}
    </group>
  )
}

// Tambores de 200 L em grupo (e um empilhado de lado, deitado).
export function Tambores({ x, z }) {
  const pos = [[0, 0], [0.62, 0], [0.31, 0.55], [0.93, 0.55]]
  return (
    <group position={[x, 0, z]}>
      {pos.map(([dx, dz]) => (
        <group key={`${dx}${dz}`} position={[dx, 0, dz]}>
          <mesh material={tambor} position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.9, 16]} />
          </mesh>
          <mesh material={tamborTampa} position={[0, 0.91, 0]}>
            <cylinderGeometry args={[0.27, 0.29, 0.03, 16]} />
          </mesh>
        </group>
      ))}
      <Palete x={0.5} z={-0.9} cheio={false} />
    </group>
  )
}

// Cone de sinalização laranja com faixa branca.
export function Cone({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={cone} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.36, 0.04, 0.36]} />
      </mesh>
      <mesh material={cone} position={[0, 0.34, 0]}>
        <coneGeometry args={[0.15, 0.62, 12]} />
      </mesh>
      <mesh material={paintWhite} position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 12, 1, true]} />
      </mesh>
    </group>
  )
}

// Monta o conjunto de objetos a partir dos limites do galpão.
function Props({ xMin, xMax, zMin, zCorredor }) {
  return (
    <group>
      <PortaPalete x={xMin + 5} z={zMin + 1.4} vaos={2} />
      <PortaPalete x={xMax - 5} z={zMin + 1.4} vaos={2} />
      <Tambores x={xMin + 1.2} z={zMin + 4.2} />
      <Palete x={xMin + 1.4} z={zCorredor - 3.5} rot={0.1} />
      <Palete x={xMin + 1.3} z={zCorredor - 2.3} rot={-0.05} cheio={false} />
      <Palete x={xMax - 1.6} z={zMin + 4} rot={0.2} />
      <Cone x={xMin + 2.2} z={zCorredor - 1.6} />
      <Cone x={xMin + 2.2} z={zCorredor + 1.6} />
      <Cone x={xMax - 2.2} z={zCorredor - 1.6} />
      <Cone x={xMax - 2.2} z={zCorredor + 1.6} />
    </group>
  )
}

export default memo(Props)
