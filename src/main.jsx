import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { initFrontendSentry, captureException } from './lib/sentry.js'

initFrontendSentry()

window.addEventListener('unhandledrejection', (event) => {
  captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
