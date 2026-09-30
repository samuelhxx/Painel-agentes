import { memo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { STATUS, TRAVADO_MS } from '../status.js'
import { useNow, duracao } from '../time.js'
import { darkSteel, steel, chairMetal, screen, paintWhite } from './materials.js'
import Person from './Person.jsx'
import SetorProp, { chaveSetor } from './SetorProp.jsx'
import { DECK_Y } from './Sector.jsx'
import { overlay } from './overlay.js'
import Mesclar from './Mesclar.jsx'

// Plaquinha do agente. Por padrão é só um ponto neon; vira plaquinha completa quando
// o agente pede atenção (erro, aguardando, travado), ao passar o mouse, ao selecionar
// ou quando a câmera está bem perto. Quem decide o que aparece é o CSS (ver styles.css),
// a partir do nível de zoom gravado no container da cena.
function Tag({ nome, status, desde, force }) {
  const now = useNow(10000)
  const cfg = STATUS[status] ?? STATUS.ocioso
  const travado = status === 'trabalhando' && now - desde > TRAVADO_MS
  const atencao = travado || status === 'erro' || status === 'aguardando_aprovacao'
  const cls = ['pin', atencao && 'pin-attention', force && 'pin-force', travado && 'pin-stuck'].filter(Boolean).join(' ')
  return (
    <div className={cls} style={{ '--c': cfg.color }}>
      <span className="pin-dot" />
      <span className="tag">
        {nome} · {cfg.label} <em>há {duracao(now - desde)}</em>
      </span>
    </div>
  )
}

// Um agente: mesa, monitor, cadeira e a pessoa sentada.
// memo + props simples: só redesenha quando nome/status/posição/seleção mudam.
// As animações rodam no useFrame mexendo direto nos objetos, sem re-render do React.
function Agent({ id, nome, status, desde, setor, cor, x, z, selected, onSelect }) {
  const [hover, setHover] = useState(false)
  const ring = useRef()

  // O status agora fica na torre de andon do setor. O aro no chão só marca
  // o agente selecionado ou sob o mouse.
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const ativo = selected || hover
    ring.current.visible = ativo
    if (!ativo) return
    const s = 1.3 + Math.sin(t * 3) * 0.05
    ring.current.scale.x += (s - ring.current.scale.x) * Math.min(1, delta * 8)
    ring.current.scale.z = ring.current.scale.x
  })

  const clique = (e) => {
    e.stopPropagation()
    if (e.delta > 6) return // foi um arrasto para girar, não um clique
    onSelect(id)
  }
  const force = selected || hover

  return (
    <group
      position={[x, DECK_Y, z]}
      onClick={clique}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
    >
      <Mesclar deps={[setor]}>
      {/* Mesa */}
      <mesh material={darkSteel} position={[0, 0.75, -0.45]}>
        <boxGeometry args={[1.5, 0.06, 0.75]} />
      </mesh>
      {[[-0.68, -0.12], [0.68, -0.12], [-0.68, -0.78], [0.68, -0.78]].map(([lx, lz], i) => (
        <mesh key={i} material={steel} position={[lx, 0.36, lz]}>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
        </mesh>
      ))}

      {/* Monitor com tela emissiva (cor neutra) */}
      <mesh material={steel} position={[0, 0.88, -0.62]}>
        <cylinderGeometry args={[0.03, 0.05, 0.22, 8]} />
      </mesh>
      <mesh material={darkSteel} position={[0, 1.22, -0.64]}>
        <boxGeometry args={[0.84, 0.5, 0.04]} />
      </mesh>
      <mesh material={screen} position={[0, 1.22, -0.618]}>
        <planeGeometry args={[0.76, 0.42]} />
      </mesh>

      {/* Cadeira: assento, encosto e pé central em cinza metálico */}
      <mesh material={chairMetal} position={[0, 0.21, 0.35]}>
        <cylinderGeometry args={[0.04, 0.04, 0.42, 12]} />
      </mesh>
      <mesh material={chairMetal} position={[0, 0.02, 0.35]}>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 12]} />
      </mesh>
      <mesh material={chairMetal} position={[0, 0.45, 0.35]}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
      </mesh>
      <mesh material={chairMetal} position={[0, 0.8, 0.6]}>
        <boxGeometry args={[0.5, 0.56, 0.05]} />
      </mesh>

      {/* Objeto típico do setor */}
      <SetorProp setor={setor} />
      </Mesclar>

      {/* A pessoa, sentada de frente para a mesa */}
      <group position={[0, 0, 0.3]}>
        <Person id={id} trabalhando={status === 'trabalhando'} fone={chaveSetor(setor) === 'CONTEUDO'} />
      </group>

      {/* Aro branco no chão: agente selecionado ou sob o mouse */}
      <mesh ref={ring} material={paintWhite} position={[0, 0.02, 0.15]} visible={false}>
        <cylinderGeometry args={[0.62, 0.62, 0.025, 40, 1, true]} />
      </mesh>

      <Html
        center
        position={[0, 1.85, 0.33]}
        zIndexRange={force ? [1000, 900] : [100, 50]}
        portal={overlay}
        style={{ pointerEvents: 'none' }}
      >
        <Tag nome={nome} status={status} desde={desde} force={force} />
      </Html>
    </group>
  )
}

export default memo(Agent)
