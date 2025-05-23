// src/hooks/useServiceWorkerUpdate.js
// React-Hook, der Service Worker Updates erkennt und Callback ausführt
import { useEffect } from 'react';

export default function useServiceWorkerUpdate(onUpdate) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Es gibt ein Update!
                onUpdate && onUpdate();
              }
            });
          }
        });
      });
    }
  }, [onUpdate]);
}
