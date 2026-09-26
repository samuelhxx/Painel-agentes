import { memo } from 'react'
import { fosco, brilho, darkSteel } from './materials.js'

// "DOCUMENTAÇÃO" → "DOCUMENTACAO", para comparar com ou sem acento.
export const chaveSetor = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

const MESA = 0.78 // altura do tampo da mesa
const papel = fosco('#E8E4D8', 0.9)
const papelao = fosco('#9C7446', 0.95)
const papelaoEscuro = fosco('#7E5C35', 0.95)

// Pilha de papéis levemente desalinhada.
function Papeis() {
  const folhas = [0.05, -0.08, 0.12, -0.03, 0.09]
  return (
    <group position={[0.48, MESA, -0.4]}>
      {folhas.map((r, i) => (
        <mesh key={i} material={papel} position={[r * 0.12, 0.006 + i * 0.012, -r * 0.1]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.21, 0.01, 0.29]} />
        </mesh>
      ))}
    </group>
  )
}

// Prancheta inclinada sobre a mesa.
function Prancheta() {
  return (
    <group position={[0.5, MESA + 0.06, -0.38]} rotation={[-0.45, -0.25, 0]}>
      <mesh material={fosco('#6B4A2B', 0.8)}>
        <boxGeometry args={[0.24, 0.012, 0.33]} />
      </mesh>
      <mesh material={papel} position={[0, 0.008, 0.015]}>
        <boxGeometry args={[0.2, 0.004, 0.27]} />
      </mesh>
      <mesh material={darkSteel} position={[0, 0.014, -0.15]}>
        <boxGeometry args={[0.1, 0.02, 0.04]} />
      </mesh>
    </group>
  )
}

// Celular deitado na mesa, com a tela acesa.
function Celular() {
  return (
    <group position={[0.45, MESA + 0.006, -0.3]} rotation={[0, 0.35, 0]}>
      <mesh material={fosco('#111318', 0.4)}>
        <boxGeometry args={[0.075, 0.012, 0.15]} />
      </mesh>
      <mesh material={brilho('#9FD8FF', 1.5)} position={[0, 0.0065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.064, 0.13]} />
      </mesh>
    </group>
  )
}

// Duas caixas de papelão empilhadas ao lado da mesa.
function Caixas() {
  return (
    <group position={[1.05, 0, -0.35]}>
      <mesh material={papelao} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.45, 0.4, 0.4]} />
      </mesh>
      <mesh material={papelaoEscuro} position={[0.03, 0.54, -0.02]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.34, 0.28, 0.3]} />
      </mesh>
    </group>
  )
}

// Objeto característico de cada setor (o fone do CONTEÚDO fica na cabeça da pessoa).
function SetorProp({ setor }) {
  switch (chaveSetor(setor)) {
    case 'OBRAS':
      return <Prancheta />
    case 'FISCAL':
    case 'DOCUMENTACAO':
      return <Papeis />
    case 'COMERCIAL':
      return <Celular />
    case 'SUPRIMENTOS':
      return <Caixas />
    default:
      return null
  }
}

export default memo(SetorProp)
