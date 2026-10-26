import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { useGameStore } from './store/gameStore'
import { useUIStore } from './store/uiStore'

if (typeof window !== 'undefined') {
  (window as any).useGameStore = useGameStore;
  (window as any).useUIStore = useUIStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
