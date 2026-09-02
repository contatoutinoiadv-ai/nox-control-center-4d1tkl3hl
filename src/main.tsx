/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Bootstrap redirect: intercept public direct access to /intake or /intake/
// and redirect to the hash router route /#/intake/ when hash is empty.
;(() => {
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '')
  const hash = window.location.hash
  if (pathname === '/intake' && (!hash || hash === '#' || hash === '#/')) {
    window.location.replace('/#/intake/')
  }
})()

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
