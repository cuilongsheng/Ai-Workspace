import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import App from './App'
import { AppErrorBoundary } from './app/AppErrorBoundary'

const root = document.getElementById('root')

if (!root) throw new Error('Application root element was not found')

createRoot(root).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
)
