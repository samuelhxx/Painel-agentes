import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O GitHub Pages publica o site em https://samuelhxx.github.io/Painel-agentes/
// por isso o "base" precisa ter o nome do repositório.
export default defineConfig({
  plugins: [react()],
  base: '/Painel-agentes/',
})
