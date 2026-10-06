import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AccessProvider } from './auth/access'
import { App } from './components/App'
import { installSelectAllOnFocus } from './components/selectAllOnFocus'
import './index.css'

installSelectAllOnFocus()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessProvider>
      <App />
    </AccessProvider>
  </StrictMode>,
)
