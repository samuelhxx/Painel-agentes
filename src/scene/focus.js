import { useSyncExternalStore } from 'react'

// Pedidos de movimento de câmera. Quem executa é o <CameraFocus /> (Scene.jsx).
// Fica fora do React: pedir um foco não redesenha a cena.
export const foco = {
  pedido: null, // próximo movimento a fazer
  casa: null, // posição inicial (visão geral): { pos, alvo }
}

// "Aproximado" = a câmera saiu da visão geral por um foco. Controla o botão VISÃO GERAL.
let aproximado = false
const inscritos = new Set()
function setAproximado(v) {
  if (aproximado === v) return
  aproximado = v
  inscritos.forEach((f) => f())
}
export function useAproximado() {
  return useSyncExternalStore(
    (f) => { inscritos.add(f); return () => inscritos.delete(f) },
    () => aproximado,
  )
}

// x, z: centro do que focar; y: altura do ponto olhado; dist: distância final da câmera.
export function focarEm(x, z, { y = 1.2, dist = 12 } = {}) {
  foco.pedido = { x, y, z, dist }
  setAproximado(true)
}

// Volta suavemente para a posição inicial.
export function voltarVisaoGeral() {
  foco.pedido = { casa: true }
  setAproximado(false)
}

// Leva a câmera para uma posição e um alvo exatos (ex.: de frente para o telão da sala comercial).
export function focarPose(pos, alvo) {
  foco.pedido = { pos, alvo }
  setAproximado(true)
}

export const estaAproximado = () => aproximado
