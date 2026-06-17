import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

// Di main.tsx, SEBELUM ReactDOM.createRoot
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const swUrl = `/service-worker.js`; // Sesuaikan nama file SW Anda
    const registration = await navigator.serviceWorker.getRegistration();
    
    // Force check update setiap kali load
    if (registration) {
      await registration.update();
    }
  });
}