import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Sector from './Sector.jsx'
import Agent from './Agent.jsx'
import { Floor, Aisles, Truss, Galpao } from './Hall.jsx'
import Empilhadeira from './Empilhadeira.jsx'
import Props from './Props.jsx'
import Mesclar from './Mesclar.jsx'
import { overlay } from './overlay.js'
import { foco } from './focus.js'
import Billboard from './Billboard.jsx'
import Direction from './Direction.jsx'
import { STATUS, piorStatus } from '../status.js'
import { hhmm } from '../time.js'

// Marca de tempo em window.__marcas quando o primeiro quadro com este conteúdo
// termina de ser desenhado (o rAF seguinte ao useFrame vem depois do desenho).
function Marca({ nome, aoMarcar }) {
  const feito = useRef(false)
  useFrame(() => {
    if (feito.current) return
    feito.current = true
    requestAnimationFrame(() => {
      const m = (window.__marcas ||= {})
      m[nome] ??= performance.now()
      aoMarcar?.()
    })
  })
  return null
}

// Galpão de dia: cinza claro no fundo, sem o preto do visual antigo.
const BG = '#D6DADF'
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
    const dist = Math.min(90, (span * 0.8 + 6) * Math.max(1, 1.5 / aspect))
    const alvo = new THREE.Vector3(cx, 2.4, cz)
    // vista mais de cima que antes: as tesouras do telhado atrapalham menos a leitura do chão
    camera.position.copy(alvo).add(new THREE.Vector3(1, 1.25, 1).normalize().multiplyScalar(dist))
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

function Scene({ layout, agentes, eventos, selectedId, onSelect, onVazio, onPronto }) {
  const { sectors, posicoes, width, depth, rowZ } = layout
  // Montagem em duas etapas: primeiro o que serve para trabalhar (chão, faixas, células,
  // placas, bonecos, andon); o enfeite só entra no quadro seguinte ao primeiro desenho.
  const [etapa2, setEtapa2] = useState(false)

  // Mezanino da Direção atrás da fileira do fundo; telão na ponta esquerda, pendurado na treliça do fundo.
  const zMez = -depth / 2 - 4.6
  const xTelao = -width / 2 - 1.6

  // Limites do galpão e corredores: crescem junto com as células quando entra setor novo.
  const xMin = -width / 2 - 8
  const xMax = width / 2 + 8
  const zMin = zMez - 3.2
  const zPedestre = depth / 2 + 1.9 // corredor verde de pedestre, na frente das células
  const zCorredor = depth / 2 + 4.4 // corredor principal das empilhadeiras
  const zMax = zCorredor + 2.4
  const zMeio = rowZ.length > 1 ? (rowZ[0] + rowZ[1]) / 2 : null

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
        camera={{ position: [17, 14, 17], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        // ?diag na URL: expõe a contagem de desenho por quadro, para medir peso da cena
        onCreated={({ gl }) => { if (location.search.includes('diag')) window.__diag = gl.info }}
        onPointerMissed={(e) => { if (e.type === 'click') onVazio() }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 70, 150]} />
        {/* luz de dia: céu claro + sol. Sem sombra calculada (pesada no tablet). */}
        <hemisphereLight args={['#FFFFFF', '#9EA4AA', 1.5]} />
        <directionalLight position={[10, 24, 14]} intensity={1.6} />
        <ambientLight intensity={0.25} />

        <OrbitControls
          makeDefault
          zoomToCursor
          target={[0, 0.8, 0]}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={7}
          maxDistance={95}
          minPolarAngle={0.25}
          maxPolarAngle={1.3}
        />
        <CameraRig minX={xTelao - 1.5} maxX={width / 2 + 6.5} minZ={zMez - 2.5} maxZ={zCorredor} ready={sectors.length > 0} />
        <ZoomWatcher />
        <CameraFocus />

        <Floor onVazio={onVazio} />
        {sectors.length > 0 && (
          <>
            {/* ── ETAPA 1: o que serve para trabalhar ── */}
            <Mesclar deps={[xMin, xMax, zMeio, zPedestre, zCorredor]}>
              <Aisles xMin={xMin} xMax={xMax} zPedestre={zPedestre} zCorredor={zCorredor} zMeio={zMeio} />
            </Mesclar>
            {sectors.map((s, i) => (
              <Sector key={s.nome} nome={s.nome} numero={i + 1} x={s.x} z={s.z} w={s.w} d={s.d} status={piorStatus(s.lista)} />
            ))}
            {/* primeiro quadro da etapa 1 desenhado: sai a tela de carregando e entra o enfeite */}
            <Marca nome="etapa1" aoMarcar={() => { setEtapa2(true); onPronto?.() }} />
          </>
        )}

        {/* ── ETAPA 2: enfeite, só no quadro seguinte ── */}
        {sectors.length > 0 && etapa2 && (
          <>
            <Marca nome="etapa2" />
            {/* tudo o que é parado no galpão vira poucas peças (ver Mesclar.jsx) */}
            <Mesclar deps={[xMin, xMax, zMin, zMax, zMeio, rowZ.join(',')]}>
              <Galpao xMin={xMin} xMax={xMax} zMin={zMin} zMax={zMax} />
              <Props xMin={xMin} xMax={xMax} zMin={zMin} zCorredor={zCorredor} />
              {/* tesouras do telhado sobre cada fileira de células */}
              {rowZ.map((z, i) => (
                <Truss key={i} length={xMax - xMin - 1} z={z} />
              ))}
            </Mesclar>
            {/* uma empilhadeira no corredor principal; a segunda no corredor do meio */}
            <Empilhadeira xA={xMin + 3.5} xB={xMax - 3.5} z={zCorredor} />
            {zMeio != null && <Empilhadeira xA={xMin + 3.5} xB={xMax - 3.5} z={zMeio} atraso={0.6} />}
          </>
        )}

        {etapa2 && rowZ.length > 0 && (
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
        {etapa2 && sectors.length > 0 && <Direction zc={zMez} agentes={agentes} />}

        {posicoes.map(({ agente, x, z }) => (
          <Agent
            key={agente.id}
            id={agente.id}
            nome={agente.nome}
            status={agente.status}
            desde={agente.desde}
            setor={agente.setor}
            x={x}
            z={z}
            selected={agente.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </Canvas>
    </div>
  )
}

export default memo(Scene)
