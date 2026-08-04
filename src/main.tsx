import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './styles/typography.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AuthGate } from './components/AuthGate'
import { getGoogleClientId } from './lib/auth'

if (window.electronAPI?.isDesktop) {
  document.documentElement.classList.add('is-electron')
}

const clientId = getGoogleClientId()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <AuthGate>
            <App />
          </AuthGate>
        </GoogleOAuthProvider>
      ) : (
        <AuthGate>
          <App />
        </AuthGate>
      )}
    </AuthProvider>
  </StrictMode>,
)
