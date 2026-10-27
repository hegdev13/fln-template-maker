import { createRoot } from 'react-dom/client'
import { PrintApp } from '../src'
import '../src/styles/document.css'
import { config } from './config'

createRoot(document.getElementById('root')!).render(<PrintApp config={config} payload={(window as any).__PTB__} />)
