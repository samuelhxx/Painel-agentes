import * as THREE from 'three'

// Materiais compartilhados: criados uma vez e reutilizados por todas as peças,
// para não multiplicar trabalho na GPU.
export const steel = new THREE.MeshStandardMaterial({ color: '#2A3038', metalness: 0.8, roughness: 0.38 })
export const darkSteel = new THREE.MeshStandardMaterial({ color: '#171B21', metalness: 0.8, roughness: 0.5 })
export const bodyMat = new THREE.MeshStandardMaterial({ color: '#3B4452', metalness: 0.4, roughness: 0.55 })
export const paintYellow = new THREE.MeshStandardMaterial({
  color: '#FFD400',
  emissive: '#FFD400',
  emissiveIntensity: 0.35,
  roughness: 0.9,
})
export const lampBulb = new THREE.MeshStandardMaterial({
  color: '#FFF4DC',
  emissive: '#FFF4DC',
  emissiveIntensity: 3,
  toneMapped: false,
})
export const lampShade = new THREE.MeshStandardMaterial({
  color: '#2A3038',
  metalness: 0.8,
  roughness: 0.35,
  side: THREE.DoubleSide,
})

const neonCache = new Map()
// Material de neon: emissive na mesma cor, intensidade 3.
export function neon(color) {
  if (!neonCache.has(color)) {
    neonCache.set(
      color,
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, toneMapped: false }),
    )
  }
  return neonCache.get(color)
}

// Faixa zebrada amarela e preta, desenhada num canvas (sem imagens externas).
let hazardBase
function hazardTexture() {
  if (!hazardBase) {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 32
    const g = c.getContext('2d')
    g.fillStyle = '#0B0D10'
    g.fillRect(0, 0, 128, 32)
    g.fillStyle = '#FFD400'
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
    hazardCache.set(
      reps,
      new THREE.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: '#FFFFFF',
        emissiveIntensity: 0.18,
        roughness: 0.7,
        metalness: 0.2,
      }),
    )
  }
  return hazardCache.get(reps)
}

// Roxo da marca AS Construction (#73018C) nas partes estruturais escuras.
export const brandDark = new THREE.MeshStandardMaterial({ color: '#73018C', metalness: 0.6, roughness: 0.45 })

// Tela de monitor neutra (branco-azulado): a cor de status fica só no anel e na plaquinha.
export const screen = new THREE.MeshStandardMaterial({
  color: '#000000',
  emissive: '#BFD8FF',
  emissiveIntensity: 0.9,
  toneMapped: false,
})

// Cinza metálico das cadeiras.
export const chairMetal = new THREE.MeshStandardMaterial({ color: '#6B7380', metalness: 0.7, roughness: 0.35 })

// Materiais foscos por cor (pele, roupa, papel...), um por cor.
const foscoCache = new Map()
export function fosco(color, roughness = 0.75) {
  const k = color + roughness
  if (!foscoCache.has(k)) foscoCache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 }))
  return foscoCache.get(k)
}

// Emissivo com intensidade escolhida (capacete = 1, colete = 3...).
const brilhoCache = new Map()
export function brilho(color, intensidade) {
  const k = color + intensidade
  if (!brilhoCache.has(k)) {
    brilhoCache.set(
      k,
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidade, roughness: 0.5, toneMapped: intensidade < 2 }),
    )
  }
  return brilhoCache.get(k)
}
