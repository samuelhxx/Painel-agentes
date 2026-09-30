import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { steel, darkSteel, placa, fosco } from './materials.js'
import { Faixa, Zebra, TRUSS_Y, TRUSS_H } from './Hall.jsx'
import { focarEm } from './focus.js'
import Mesclar from './Mesclar.jsx'

export const DECK_Y = 0 // as células ficam no piso do galpão (não há mais plataforma)

// Torre de sinalização (andon): verde embaixo, amarelo no meio, vermelho em cima.
// ocioso = tudo apagado; trabalhando = verde; aguardando = amarelo; erro = vermelho piscando.
// Cor de norma, nunca da marca: dá para entender de longe, sem ler.
const LUZES = [
  { status: 'trabalhando', cor: '#22C55E', apagada: '#686D74' },
  { status: 'aguardando_aprovacao', cor: '#F5B400', apagada: '#6E737A' },
  { status: 'erro', cor: '#E5242B', apagada: '#686D74' },
]
const ANDON_H = 2.6 // altura do mastro até a primeira luz
const LUZ_H = 0.42 // luzes grandes: a cor tem que ler de longe, sem zoom
const LUZ_R = 0.26

function Andon({ status }) {
  // três materiais próprios desta torre: acender uma não acende a de outro setor.
  // Material sem iluminação: a cor sai exata (verde, amarelo, vermelho puros), sem
  // estourar para branco com a luz do dia. E é o mais barato de desenhar.
  const mats = useMemo(
    () => LUZES.map((l) => new THREE.MeshBasicMaterial({ color: l.apagada, toneMapped: false })),
    [],
  )
  const pisca = useRef(0)
  const acesas = useRef([])
  useFrame((_, delta) => {
    pisca.current += delta
    LUZES.forEach((l, i) => {
      let acesa = l.status === status
      if (acesa && status === 'erro') acesa = Math.floor(pisca.current * 2.5) % 2 === 0
      if (acesas.current[i] !== acesa) {
        acesas.current[i] = acesa
        mats[i].color.set(acesa ? l.cor : l.apagada)
      }
    })
  })
  return (
    <group>
      <mesh material={darkSteel} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 16]} />
      </mesh>
      <mesh material={steel} position={[0, ANDON_H / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, ANDON_H, 8]} />
      </mesh>
      {LUZES.map((l, i) => (
        <mesh key={l.status} material={mats[i]} position={[0, ANDON_H + LUZ_H / 2 + i * (LUZ_H + 0.02), 0]}>
          <cylinderGeometry args={[LUZ_R, LUZ_R, LUZ_H, 20]} />
        </mesh>
      ))}
      <mesh material={darkSteel} position={[0, ANDON_H + 3 * (LUZ_H + 0.02) + 0.04, 0]}>
        <cylinderGeometry args={[LUZ_R * 0.9, LUZ_R, 0.08, 20]} />
      </mesh>
    </group>
  )
}

// Bancada de trabalho encostada no fundo da célula: tampo de madeira, pés de aço
// e painel perfurado com ferramentas.
function Bancada({ w }) {
  const tampo = fosco('#9C7A52', 0.8)
  const painel = fosco('#7B838C', 0.7)
  return (
    <group>
      <mesh material={tampo} position={[0, 0.9, 0]}>
        <boxGeometry args={[w, 0.06, 0.7]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={steel} position={[s * (w / 2 - 0.08), 0.45, 0]}>
          <boxGeometry args={[0.06, 0.9, 0.6]} />
        </mesh>
      ))}
      <mesh material={steel} position={[0, 0.2, 0]}>
        <boxGeometry args={[w - 0.1, 0.04, 0.6]} />
      </mesh>
      <mesh material={painel} position={[0, 1.55, -0.33]}>
        <boxGeometry args={[w, 1.2, 0.04]} />
      </mesh>
      {[-0.35, 0, 0.35].map((dx, i) => (
        <mesh key={dx} material={darkSteel} position={[dx * (w / 2), 1.5 + (i % 2) * 0.2, -0.29]}>
          <boxGeometry args={[0.06, 0.34, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}

// Placa suspensa de sinalização industrial: chapa na cor da marca, pendurada na treliça
// por dois cabos, com o nome do setor dos dois lados.
function Placa({ nome, numero, largura, onClick }) {
  const mat = placa(nome, { sub: `SETOR ${String(numero).padStart(2, '0')}`, w: 512, h: 160, fonte: 84 })
  const h = largura * (160 / 512)
  const y = 5.2
  const topo = TRUSS_Y - TRUSS_H / 2
  return (
    <group onClick={onClick}>
      {[-1, 1].map((s) => (
        <mesh key={s} material={darkSteel} position={[s * largura * 0.4, (y + h / 2 + topo) / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, topo - y - h / 2, 4]} />
        </mesh>
      ))}
      <mesh material={mat} position={[0, y, 0.02]}>
        <planeGeometry args={[largura, h]} />
      </mesh>
      <mesh material={mat} position={[0, y, -0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[largura, h]} />
      </mesh>
      <mesh material={darkSteel} position={[0, y, 0]}>
        <boxGeometry args={[largura + 0.06, h + 0.06, 0.03]} />
      </mesh>
    </group>
  )
}

// Célula de trabalho: retângulo pintado no chão (área de equipamento em amarelo, com
// zebrado nas quinas), bancada no fundo, placa suspensa e torre de andon na frente.
function Sector({ nome, numero, x, z, w, d, status }) {
  const hw = w / 2
  const hd = d / 2
  const o = 0.8 // folga entre as mesas e a linha amarela
  const lw = 0.1 // largura da linha pintada
  const ex = hw + o // meia largura da área pintada
  const ez = hd + o

  // Clique na célula ou na placa: a câmera vai até o setor.
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
      <Mesclar deps={[x, z, w, d, nome, numero]}>
      {/* piso da célula, um tom mais escuro que o corredor */}
      <mesh material={fosco('#A7ACB2', 0.55)} position={[x, 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * ex, 2 * ez]} />
      </mesh>
      {/* demarcação amarela da área de equipamento */}
      <Faixa x={x} z={z - ez} w={2 * ex + lw} d={lw} />
      <Faixa x={x} z={z + ez} w={2 * ex + lw} d={lw} />
      <Faixa x={x - ex} z={z} w={lw} d={2 * ez} />
      <Faixa x={x + ex} z={z} w={lw} d={2 * ez} />
      {/* zebrado nas quatro quinas */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <group key={`${sx}${sz}`}>
          <Zebra x={x + sx * (ex - 0.35)} z={z + sz * (ez - 0.1)} s={0.7} />
          <Zebra x={x + sx * (ex - 0.1)} z={z + sz * (ez - 0.35)} s={0.7} rot={Math.PI / 2} />
        </group>
      ))}

      <group position={[x, 0, z - ez + 0.55]}>
        <Bancada w={Math.min(w - 0.6, 3.2)} />
      </group>

      <group position={[x, 0, z]}>
        <Placa nome={nome} numero={numero} largura={Math.min(3.4, w - 0.4)} onClick={clique} />
      </group>

      <group position={[x + ex - 0.45, 0, z + ez - 0.45]}>
        <Andon status={status} />
      </group>
      </Mesclar>
    </group>
  )
}

export default memo(Sector)
