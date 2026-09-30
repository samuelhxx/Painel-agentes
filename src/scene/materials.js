import * as THREE from 'three'
import { MARCA, SEGURANCA } from '../marca.js'

// Materiais compartilhados: criados uma vez e reutilizados por todas as peças,
// para não multiplicar trabalho na GPU. Tudo fosco ou quase: galpão iluminado de dia,
// sem reflexo caro nem brilho de pós-processamento (roda no tablet).
export const steel = new THREE.MeshStandardMaterial({ color: '#8E959D', metalness: 0.45, roughness: 0.5 })
export const darkSteel = new THREE.MeshStandardMaterial({ color: '#4B5159', metalness: 0.4, roughness: 0.55 })
export const bodyMat = new THREE.MeshStandardMaterial({ color: '#6E757E', metalness: 0.3, roughness: 0.6 })
export const paintYellow = new THREE.MeshStandardMaterial({ color: SEGURANCA.amarelo, roughness: 0.7 })
export const paintGreen = new THREE.MeshStandardMaterial({ color: SEGURANCA.verde, roughness: 0.7 })
export const paintWhite = new THREE.MeshStandardMaterial({ color: '#E9ECEF', roughness: 0.7 })
export const lampBulb = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF6E0', emissiveIntensity: 1.6 })
export const lampShade = new THREE.MeshStandardMaterial({ color: '#C9CED4', metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })

// Parede de galpão: chapa cinza claro.
export const parede = new THREE.MeshStandardMaterial({ color: '#C4C8CD', roughness: 0.85 })
// Telha translúcida: branca, deixa passar a luz do dia. Sem transmissão física (cara).
export const telhaTranslucida = new THREE.MeshStandardMaterial({
  color: '#FFFFFF',
  emissive: '#F4F8FF',
  emissiveIntensity: 0.55,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  side: THREE.DoubleSide,
})

const neonCache = new Map()
// Emissivo na mesma cor (lâmpadas de sinalização).
export function neon(color, intensidade = 1.4) {
  const k = color + intensidade
  if (!neonCache.has(k)) {
    neonCache.set(k, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidade }))
  }
  return neonCache.get(k)
}

// Concreto polido: cinza com manchas suaves, desenhado num canvas (sem imagens externas).
let concretoMap
function concretoTexture() {
  if (!concretoMap) {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    g.fillStyle = '#B8BCC0'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 1400; i++) {
      const v = 160 + Math.floor(Math.random() * 50)
      g.fillStyle = `rgba(${v},${v + 2},${v + 5},0.10)`
      const r = 2 + Math.random() * 14
      g.beginPath()
      g.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2)
      g.fill()
    }
    // juntas de dilatação do piso
    g.fillStyle = 'rgba(90,95,100,0.35)'
    g.fillRect(0, 0, 256, 1)
    g.fillRect(0, 0, 1, 256)
    concretoMap = new THREE.CanvasTexture(c)
    concretoMap.colorSpace = THREE.SRGBColorSpace
    concretoMap.wrapS = concretoMap.wrapT = THREE.RepeatWrapping
    concretoMap.repeat.set(26, 26)
    concretoMap.anisotropy = 4
  }
  return concretoMap
}
let concretoMat
export function concreto() {
  if (!concretoMat) concretoMat = new THREE.MeshStandardMaterial({ map: concretoTexture(), roughness: 0.42, metalness: 0.05 })
  return concretoMat
}

// Faixa zebrada amarela e preta, desenhada num canvas.
let hazardBase
function hazardTexture() {
  if (!hazardBase) {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 32
    const g = c.getContext('2d')
    g.fillStyle = SEGURANCA.preto
    g.fillRect(0, 0, 128, 32)
    g.fillStyle = SEGURANCA.amarelo
    for (let x = -32; x < 160; x += 32) {
      g.beginPath()
      g.moveTo(x, 32)
      g.lineTo(x + 16, 32)
      g.lineTo(x + 32, 0)
      g.lineTo(x + 16, 0)
      g.closePath()
      g.fill()
    }
    hazardBase = new THREE.CanvasTexture(c)
    hazardBase.colorSpace = THREE.SRGBColorSpace
    hazardBase.wrapS = THREE.RepeatWrapping
    hazardBase.anisotropy = 4
  }
  return hazardBase
}

const hazardCache = new Map()
export function hazard(length) {
  const reps = Math.max(1, Math.round(length / 0.5))
  if (!hazardCache.has(reps)) {
    const map = hazardTexture().clone()
    map.repeat.set(reps, 1)
    map.needsUpdate = true
    hazardCache.set(reps, new THREE.MeshStandardMaterial({ map, roughness: 0.7 }))
  }
  return hazardCache.get(reps)
}

// Roxo da marca AS Construction nas peças da empresa.
export const brandDark = new THREE.MeshStandardMaterial({ color: MARCA.roxoMarca, metalness: 0.2, roughness: 0.55 })
export const brand = new THREE.MeshStandardMaterial({ color: MARCA.roxo, metalness: 0.2, roughness: 0.55 })

// Tela de monitor neutra.
export const screen = new THREE.MeshStandardMaterial({ color: '#10141A', emissive: '#CFE2FF', emissiveIntensity: 0.55 })

// Cinza metálico das cadeiras.
export const chairMetal = new THREE.MeshStandardMaterial({ color: '#5E6570', metalness: 0.4, roughness: 0.45 })

// Materiais foscos por cor (pele, roupa, papel...), um por cor.
const foscoCache = new Map()
export function fosco(color, roughness = 0.75) {
  const k = color + roughness
  if (!foscoCache.has(k)) foscoCache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 }))
  return foscoCache.get(k)
}

// Emissivo com intensidade escolhida (telas, faixa refletiva...).
const brilhoCache = new Map()
export function brilho(color, intensidade) {
  const k = color + intensidade
  if (!brilhoCache.has(k)) {
    brilhoCache.set(k, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidade, roughness: 0.5 }))
  }
  return brilhoCache.get(k)
}

// Placa de chapa com texto (nome do setor, faixa AS CONSTRUCTION), desenhada num canvas.
// Letra condensada em caixa alta, como sinalização industrial.
const placaCache = new Map()
export function placa(texto, { fundo = MARCA.roxoMarca, cor = '#FFFFFF', w = 512, h = 128, fonte = 72, sub } = {}) {
  const k = [texto, fundo, cor, w, h, fonte, sub].join('|')
  if (!placaCache.has(k)) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    const desenhar = () => {
      g.fillStyle = fundo
      g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(255,255,255,0.35)'
      g.lineWidth = 4
      g.strokeRect(8, 8, w - 16, h - 16)
      g.fillStyle = cor
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = `700 ${fonte}px 'Barlow Condensed', 'Arial Narrow', sans-serif`
      g.fillText(texto, w / 2, sub ? h * 0.42 : h / 2 + 2)
      if (sub) {
        g.font = `600 ${Math.round(fonte * 0.36)}px 'Barlow Condensed', 'Arial Narrow', sans-serif`
        g.fillStyle = 'rgba(255,255,255,0.8)'
        g.fillText(sub, w / 2, h * 0.78)
      }
    }
    desenhar()
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    // redesenha quando a fonte Barlow terminar de carregar
    document.fonts?.ready.then(() => { desenhar(); tex.needsUpdate = true })
    placaCache.set(k, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
  }
  return placaCache.get(k)
}
