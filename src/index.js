import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // Geänderter Import
import { showServiceWorkerUpdateToast } from './components/common/ServiceWorkerUpdateToast'; // Import für den Toast

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
 
// Service Worker für PWA registrieren mit Konfiguration
// Damit der Service Worker bei Änderungen (neuer Build) ein Update anzeigt:
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // Zeige den Update-Toast und übergebe das registration-Objekt
    // Dieses Objekt enthält .waiting, was der neue Service Worker ist.
    showServiceWorkerUpdateToast(registration);
    console.log('Service Worker: Update gefunden, Toast wird angezeigt.', registration);
  },
  onSuccess: registration => { // Optional: Für die erste erfolgreiche Installation
    console.log('Service Worker: Erfolgreich registriert und Inhalte gecacht.', registration);
  }
});
