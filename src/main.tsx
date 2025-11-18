import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@worldcoin/mini-apps-ui-kit-react/styles.css'
import './index.css'
import './i18n'
import App from './App.tsx'
import { initEruda } from './utils/eruda'

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_ERUDA === 'true') {
  initEruda()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
