import 'normalize.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

declare global {
  interface Window {
    XR8: any
    XRExtras: any
    BABYLON: any
    TWEEN: any
    LandingPage: any
  }
  let XR8: any
  let XRExtras: any
  // @ts-expect-error ignore
  let BABYLON: any
  let TWEEN: any
  let LandingPage: any
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
