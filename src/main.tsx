import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@fontsource-variable/inter/wght.css"
import "@fontsource-variable/outfit/wght.css"

import "./styles/tokens.css"
import "./styles/base.css"
import "./styles/components.css"
import "./styles/layout.css"
import "./styles/sections.css"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)