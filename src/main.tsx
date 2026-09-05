import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global window error listeners to aid debugging in production/VM
window.addEventListener('error', (event) => {
  console.error('Finante Global Error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Finante Unhandled Promise Rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

