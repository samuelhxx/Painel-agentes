import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STATUS } from '../status.js'
import { useNow, hhmm } from '../time.js'
import { darkSteel, steel } from './materials.js'
import { TRUSS_Y, TRUSS_H } from './Hall.jsx'
import { MARCA } from '../marca.js'

// Telão de chão de fábrica, pendurado na treliça.
const W = 6 // largura da tela
const H = 3.375 // altura da tela (16:9)
const CW = 1024 // canvas principal
const CH = 576
const PX = CW / W // pixels por unidade
const TOPO = 7.0 // altura da borda de cima do telão
const INCLINA = 0.14 // inclinado para baixo, como telão de aeroporto
const FONTE = "'JetBrains Mono', ui-monospace, Consolas, monospace"
const ROXO = MARCA.roxo // roxo de destaque da AS: o que acende sobre fundo escuro

// y do canvas (px) → y na tela (unidades)
const yTela = (cy) => (0.5 - cy / CH) * H

function novaTextura(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { canvas, tex }
}

function desenharTela(g, { trabalhando, aguardando, ociosos, relogio }) {
  g.fillStyle = '#05070D'
  g.fillRect(0, 0, CW, CH)
  // leve textura de LEDs
  g.fillStyle = 'rgba(255,255,255,0.025)'
  for (let y = 0; y < CH; y += 4) g.fillRect(0, y, CW, 1)

  // faixa do topo
  g.fillStyle = 'rgba(140,44,225,0.28)'
  g.fillRect(0, 0, CW, 64)
  g.fillStyle = ROXO
  g.fillRect(0, 62, CW, 3)
  g.font = `700 26px ${FONTE}`
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.fillStyle = '#FFFFFF'
  g.fillText('AS CONSTRUCTION · PAINEL DE AGENTES', 24, 33)
  g.textAlign = 'right'
  g.fillStyle = '#FFFFFF'
  g.fillText(relogio, CW - 24, 33)

  // três números gigantes
  const cols = [
    [trabalhando, 'TRABALHANDO', STATUS.trabalhando.color],
    [aguardando, 'AGUARDANDO', STATUS.aguardando_aprovacao.color],
    [ociosos, 'OCIOSOS', STATUS.ocioso.color],
  ]
  cols.forEach(([n, rotulo, cor], i) => {
    const cx = (CW / 3) * (i + 0.5)
    g.textAlign = 'center'
    g.fillStyle = cor
    g.font = `700 190px ${FONTE}`
    g.fillText(String(n).padStart(2, '0'), cx, 215)
    g.font = `600 24px ${FONTE}`
    g.fillStyle = '#9AA3B5'
    g.fillText(rotulo, cx, 338)
    if (i > 0) {
      g.fillStyle = 'rgba(140,44,225,0.35)'
      g.fillRect((CW / 3) * i - 1, 100, 2, 250)
    }
  })

  // moldura da faixa do letreiro
  g.fillStyle = 'rgba(140,44,225,0.35)'
  g.fillRect(0, 494, CW, 2)
}

function desenharErro(g, erros, w, h) {
  g.fillStyle = '#C0102B'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#FFFFFF'
  g.font = `700 44px ${FONTE}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(`⚠ ${erros} ${erros === 1 ? 'AGENTE' : 'AGENTES'} EM ERRO`, w / 2, h / 2 + 2)
}

function Billboard({ x, z, trabalhando, aguardando, ociosos, erros, ultimo }) {
  const minuto = useNow(60000)
  // Redesenha quando a fonte monoespaçada terminar de carregar.
  const [fontes, setFontes] = useState(0)
  useEffect(() => {
    document.fonts?.ready.then(() => setFontes(1))
  }, [])

  const tela = useMemo(() => novaTextura(CW, CH), [])
  const erro = useMemo(() => novaTextura(CW, 84), [])
  const letreiro = useMemo(() => novaTextura(CW, 76), [])
  useEffect(() => () => { tela.tex.dispose(); erro.tex.dispose(); letreiro.tex.dispose() }, [tela, erro, letreiro])

  // Tela principal: só redesenha quando os dados mudam (ou o minuto do relógio vira).
  useEffect(() => {
    desenharTela(tela.canvas.getContext('2d'), { trabalhando, aguardando, ociosos, relogio: hhmm(minuto) })
    tela.tex.needsUpdate = true
  }, [tela, trabalhando, aguardando, ociosos, minuto, fontes])

  useEffect(() => {
    if (!erros) return
    desenharErro(erro.canvas.getContext('2d'), erros, CW, 84)
    erro.tex.needsUpdate = true
  }, [erro, erros, fontes])

  // Letreiro: desenha o texto uma vez; a rolagem é só o deslocamento da textura (sem redesenhar).
  useEffect(() => {
    const texto = `  ÚLTIMO EVENTO ▸ ${ultimo || 'sem eventos no histórico'}     ◆     `
    const c = letreiro.canvas
    const g = c.getContext('2d')
    g.font = `600 34px ${FONTE}`
    const largura = Math.max(CW, Math.ceil(g.measureText(texto).width))
    c.width = largura
    g.font = `600 34px ${FONTE}`
    g.fillStyle = '#05070D'
    g.fillRect(0, 0, largura, 76)
    g.fillStyle = '#FFD400'
    g.textBaseline = 'middle'
    g.fillText(texto, 0, 40)
    letreiro.tex.dispose() // o canvas mudou de tamanho: a GPU precisa de uma textura nova
    letreiro.tex.image = c
    letreiro.tex.wrapS = THREE.RepeatWrapping
    letreiro.tex.repeat.x = CW / largura
    letreiro.tex.needsUpdate = true
  }, [letreiro, ultimo, fontes])

  const erroMesh = useRef()
  useFrame((state, delta) => {
    letreiro.tex.offset.x = (letreiro.tex.offset.x + delta * 0.06) % 1
    if (erroMesh.current) erroMesh.current.visible = Math.floor(state.clock.elapsedTime * 1.6) % 2 === 0
  })

  const centroY = TOPO - H / 2 - 0.2
  const apoio = TRUSS_Y - TRUSS_H / 2
  const rotY = Math.PI / 4 // de frente para a diagonal do galpão (para onde a câmera olha)
  // Barra de suspensão presa por baixo da treliça do fundo, no mesmo ângulo do telão.
  const barra = W + 0.8

  const telaMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tela.tex, toneMapped: false }), [tela])
  const erroMat = useMemo(() => new THREE.MeshBasicMaterial({ map: erro.tex, toneMapped: false }), [erro])
  const letreiroMat = useMemo(() => new THREE.MeshBasicMaterial({ map: letreiro.tex, toneMapped: false }), [letreiro])

  const alvo = useMemo(() => new THREE.Object3D(), [])

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* barra de suspensão presa na treliça + cabos */}
      <mesh material={steel} position={[0, apoio - 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.12, barra, 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={darkSteel} position={[s * (W / 2 - 0.3), (apoio + TOPO) / 2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, apoio - TOPO, 6]} />
        </mesh>
      ))}

      <group position={[0, centroY, 0]} rotation={[INCLINA, 0, 0]}>
        {/* moldura de metal escuro */}
        <mesh material={darkSteel} position={[0, 0, -0.1]}>
          <boxGeometry args={[W + 0.36, H + 0.36, 0.2]} />
        </mesh>
        <mesh material={steel} position={[0, H / 2 + 0.2, -0.1]}>
          <boxGeometry args={[W + 0.5, 0.08, 0.26]} />
        </mesh>
        {/* tela */}
        <mesh material={telaMat} position={[0, 0, 0.005]}>
          <planeGeometry args={[W, H]} />
        </mesh>
        {/* bloco de erro piscando (só aparece se houver erro) */}
        {erros > 0 && (
          <mesh ref={erroMesh} material={erroMat} position={[0, yTela(445), 0.012]}>
            <planeGeometry args={[W - 0.3, 84 / PX]} />
          </mesh>
        )}
        {/* letreiro rolando */}
        <mesh material={letreiroMat} position={[0, yTela(536), 0.012]}>
          <planeGeometry args={[W, 76 / PX]} />
        </mesh>
        <primitive object={alvo} position={[0, 0, 0]} />
      </group>

      {/* duas luzes de leitura apontadas para a moldura */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 + 0.2), apoio - 0.15, 1.3]}>
          <mesh material={darkSteel} rotation={[-0.9, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.11, 0.22, 12, 1, true]} />
          </mesh>
          <spotLight target={alvo} color="#DDE6FF" intensity={18} angle={0.55} penumbra={0.8} decay={1.6} distance={9} />
        </group>
      ))}
    </group>
  )
}

export default memo(Billboard)
