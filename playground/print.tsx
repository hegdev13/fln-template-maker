import { createRoot } from 'react-dom/client'
import { PrintApp, withCustomComponents } from '../src'
import '../src/styles/document.css'
import { config } from './config'

const payload = (window as any).__PTB__
createRoot(document.getElementById('root')!).render(
  <PrintApp config={withCustomComponents(config, payload.customComponents ?? [])} payload={payload} />,
)
