import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AccessProvider } from './auth/access'
import { App } from './components/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessProvider>
      <App />
    </AccessProvider>
  </StrictMode>,
)
