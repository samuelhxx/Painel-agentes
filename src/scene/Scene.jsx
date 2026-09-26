import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Sector from './Sector.jsx'
import Agent from './Agent.jsx'
import { Floor, Aisles, Truss, Lamp } from './Hall.jsx'
import { overlay } from './overlay.js'
import { foco } from './focus.js'
import Billboard from './Billboard.jsx'
import Direction from './Direction.jsx'
import { STATUS } from '../status.js'
import { hhmm } from '../time.js'

const BG = '#05070F'
const ORIGEM = new THREE.Vector3()

// Enquadra a cena inteira (galpão, telão e mezanino) na primeira vez que os dados chegam.
function CameraRig({ minX, maxX, minZ, maxZ, ready }) {
  const { camera, controls, size } = useThree()
  const feito = useRef(false)
  useEffect(() => {
    if (!ready || !controls || feito.current) return
    feito.current = true
    const aspect = size.width / size.height
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    // Na vista diagonal, o que ocupa a largura da tela é a extensão ao longo de (1, 0, -1).
    const span = ((maxX - minX) + (maxZ - minZ)) / Math.SQRT2
    const dist = Math.min(78, (span * 0.72 + 4) * Math.max(1, 1.5 / aspect))
    const alvo = new THREE.Vector3(cx, 2.4, cz)
    camera.position.copy(alvo).add(new THREE.Vector3(1, 0.85, 1).normalize().multiplyScalar(dist))
    controls.target.copy(alvo)
    controls.update()
    // guarda a visão geral para o botão VISÃO GERAL / Esc / clique no vazio
    foco.casa = { pos: camera.position.clone(), alvo: alvo.clone() }
  }, [ready, controls, minX, maxX, minZ, maxZ, camera, size])
  return null
}

// Executa os pedidos de focarEm() / voltarVisaoGeral(): transição suave de 0,8 s.
// Os controles nunca são travados: se o usuário arrastar ou der scroll, o movimento
// para na hora e a câmera fica onde ele deixou.
const DURACAO = 0.8
const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

function CameraFocus() {
  const { camera, controls } = useThree()
  const anim = useRef(null)
  useEffect(() => {
    if (!controls) return
    const cancelar = () => { anim.current = null }
    controls.addEventListener('start', cancelar)
    return () => controls.removeEventListener('start', cancelar)
  }, [controls])
  useFrame((_, delta) => {
    if (!controls) return
    const p = foco.pedido
    if (p) {
      foco.pedido = null
      let alvo, pos
      if (p.casa) {
        if (!foco.casa) return
        alvo = foco.casa.alvo.clone()
        pos = foco.casa.pos.clone()
      } else {
        // mantém o ângulo atual de visão, só muda o ponto e a distância
        alvo = new THREE.Vector3(p.x, p.y, p.z)
        const dir = camera.position.clone().sub(controls.target).normalize()
        pos = alvo.clone().add(dir.multiplyScalar(p.dist))
      }
      anim.current = { t: 0, deAlvo: controls.target.clone(), dePos: camera.position.clone(), alvo, pos }
    }
    const a = anim.current
    if (!a) return
    a.t = Math.min(1, a.t + delta / DURACAO)
    const e = suave(a.t)
    controls.target.lerpVectors(a.deAlvo, a.alvo, e)
    camera.position.lerpVectors(a.dePos, a.pos, e)
    controls.update()
    if (a.t >= 1) anim.current = null
  })
  return null
}

// Grava no container o nível de zoom (perto/médio/longe) e a escala das plaquinhas.
// É uma escrita direta no DOM, só quando muda: nenhum componente React redesenha.
function ZoomWatcher() {
  const controls = useThree((s) => s.controls)
  const ultimo = useRef('')
  useFrame(({ camera }) => {
    const el = overlay.current
    if (!el) return
    const d = camera.position.distanceTo(controls?.target ?? ORIGEM)
    const zoom = d < 17 ? 'near' : d > 40 ? 'far' : 'mid'
    const escala = Math.min(1.1, Math.max(0.6, 24 / d)).toFixed(2)
    const chave = zoom + escala
    if (chave !== ultimo.current) {
      ultimo.current = chave
      el.dataset.zoom = zoom
      el.style.setProperty('--tag-scale', escala)
    }
  })
  return null
}

function Scene({ layout, agentes, eventos, selectedId, onSelect, onVazio }) {
  const { sectors, posicoes, width, depth, rowZ } = layout

  // Mezanino da Direção atrás da fileira do fundo; telão na ponta esquerda, pendurado na treliça do fundo.
  const zMez = -depth / 2 - 4.6
  const xTelao = -width / 2 - 1.6

  const n = useMemo(() => {
    const c = { trabalhando: 0, aguardando_aprovacao: 0, ocioso: 0, erro: 0 }
    for (const a of agentes) c[a.status]++
    return c
  }, [agentes])
  const e = eventos[0]
  const ultimo = e ? `${hhmm(e.t)} · ${e.setor} · ${e.agente} · ${(STATUS[e.status] ?? STATUS.ocioso).verbo} · ${e.texto}` : ''

  return (
    <div className="scene" ref={overlay} data-zoom="mid">
      <Canvas
        dpr={[1, 1.5]}
        onCreated={({ gl }) => { gl.transmissionResolutionScale = 0.5 }}
        camera={{ position: [17, 14, 17], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onPointerMissed={(e) => { if (e.type === 'click') onVazio() }}
      >
        <color attach="background" args={[BG]} />
        <fogExp2 attach="fog" args={[BG, 0.02]} />
        <ambientLight intensity={0.04} />

        <OrbitControls
          makeDefault
          zoomToCursor
          target={[0, 0.8, 0]}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={7}
          maxDistance={80}
          minPolarAngle={0.25}
          maxPolarAngle={1.3}
        />
        <CameraRig minX={xTelao - 1.5} maxX={width / 2 + 6.5} minZ={zMez - 2.5} maxZ={depth / 2 + 1} ready={sectors.length > 0} />
        <ZoomWatcher />
        <CameraFocus />

        <Floor onVazio={onVazio} />
        <Aisles width={width} depth={depth} />

        {rowZ.map((z, i) => (
          <Truss key={i} length={width + 6} z={z} />
        ))}

        {sectors.map((s, i) => (
          <group key={s.nome}>
            <Sector nome={s.nome} numero={i + 1} x={s.x} z={s.z} w={s.w} d={s.d} color={s.color} />
            <Lamp x={s.x} z={s.z} />
          </group>
        ))}

        {rowZ.length > 0 && (
          <Billboard
            x={xTelao}
            z={rowZ[0]}
            trabalhando={n.trabalhando}
            aguardando={n.aguardando_aprovacao}
            ociosos={n.ocioso}
            erros={n.erro}
            ultimo={ultimo}
          />
        )}
        {sectors.length > 0 && <Direction zc={zMez} agentes={agentes} />}

        {posicoes.map(({ agente, cor, x, z }) => (
          <Agent
            key={agente.id}
            id={agente.id}
            nome={agente.nome}
            status={agente.status}
            desde={agente.desde}
            setor={agente.setor}
            cor={cor}
            x={x}
            z={z}
            selected={agente.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        <EffectComposer multisampling={4}>
          <Bloom intensity={1.6} luminanceThreshold={0.2} mipmapBlur />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

export default memo(Scene)
