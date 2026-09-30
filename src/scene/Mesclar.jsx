import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Junta as peças paradas que usam o mesmo material numa peça só, para a placa de vídeo
// desenhar uma vez em vez de centenas (cada viga, degrau e perna de mesa era um desenho).
// É isso que deixa o galpão leve no tablet.
//
// - As peças originais continuam na cena, invisíveis: são elas que recebem o clique.
// - Material compartilhado continua compartilhado: mudar a cor dele (luz do andon)
//   muda a peça mesclada também.
// - Não entra: o que se mexe. Marque o grupo ou a peça com userData={{ vivo: true }}.
// - deps: quando mudar, desfaz e mescla de novo (setor novo, largura nova...).
export default function Mesclar({ children, deps = [] }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.updateMatrixWorld(true)
    const inv = g.matrixWorld.clone().invert()
    const porMaterial = new Map()
    const escondidas = []

    const visitar = (o) => {
      if (o.userData?.vivo || o.userData?.mesclada) return
      if (o.isMesh && o.visible && !Array.isArray(o.material) && o.geometry?.index) {
        const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)
        const geo = o.geometry.clone().applyMatrix4(m)
        for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k)
        geo.clearGroups()
        if (!porMaterial.has(o.material)) porMaterial.set(o.material, [])
        porMaterial.get(o.material).push(geo)
        escondidas.push(o)
      }
      for (const c of o.children) visitar(c)
    }
    for (const c of g.children) visitar(c)

    const criadas = []
    for (const [material, geos] of porMaterial) {
      if (geos.length < 2) { geos.forEach((x) => x.dispose()); continue } // peça única: não ganha nada
      const unida = mergeGeometries(geos, false)
      geos.forEach((x) => x.dispose())
      if (!unida) continue
      const mesh = new THREE.Mesh(unida, material)
      mesh.userData.mesclada = true
      mesh.raycast = () => {} // o clique fica com as originais
      g.add(mesh)
      criadas.push(mesh)
    }
    // só esconde as originais cujo material virou peça mesclada
    const mesclados = new Set(criadas.map((m) => m.material))
    const ocultas = escondidas.filter((o) => mesclados.has(o.material))
    ocultas.forEach((o) => { o.visible = false })

    return () => {
      criadas.forEach((m) => { g.remove(m); m.geometry.dispose() })
      ocultas.forEach((o) => { o.visible = true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return <group ref={ref}>{children}</group>
}
