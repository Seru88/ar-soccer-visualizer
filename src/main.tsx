import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

declare global {
  interface Window {
    XR8: any
    XRExtras: any
    BABYLON: any
    TWEEN: any
  }
  let XR8: any
  let XRExtras: any
  let BABYLON: any
  let TWEEN: any
}

// const onxrloaded = () => {
//   XR8.addCameraPipelineModules([
//     // Add camera pipeline modules.
//     XRExtras.AlmostThere.pipelineModule(), // Detects unsupported browsers and gives hints.
//     XRExtras.FullWindowCanvas.pipelineModule(), // Modifies the canvas to fill the window.
//     XRExtras.Loading.pipelineModule(), // Manages the loading screen on startup.
//     XRExtras.RuntimeError.pipelineModule() // Shows an error image on runtime error.
//   ])
// }

// // Show loading screen before the full XR library has been loaded.
// const load = () => {
//   XRExtras.Loading.showLoading({ onxrloaded })
// }
// window.onload = () => {
//   if (window.XRExtras) {
//     load()
//   } else {
//     window.addEventListener('xrextrasloaded', load)
//   }
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
