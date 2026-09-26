import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Sem StrictMode: ele monta tudo duas vezes em modo de desenvolvimento,
// o que faz as plaquinhas <Html> do drei encherem o console de avisos.
createRoot(document.getElementById('root')).render(<App />)
