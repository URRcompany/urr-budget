import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/typography.css'
import './index.css'
import App from './App.tsx'

if (window.electronAPI?.isDesktop) {
  document.documentElement.classList.add('is-electron')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
