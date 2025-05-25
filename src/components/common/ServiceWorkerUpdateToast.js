// src/components/common/ServiceWorkerUpdateToast.js
import React from 'react';
import { toast } from 'sonner';

export function showServiceWorkerUpdateToast(registration) { // registration als Parameter
  const toastId = toast( // toast gibt eine ID zurück, die zum Schließen verwendet werden kann
    (t) => (
      <div className="flex flex-col items-start">
        <span className="mb-2 font-semibold">Update verfügbar</span>
        <span className="mb-3 text-sm text-gray-700">Eine neue Version der App ist verfügbar. Jetzt neu laden?</span>
        <button
          className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-accent hover:text-primary mt-1"
          onClick={() => {
            // registration.waiting ist der neue Service Worker, der auf Aktivierung wartet
            if (registration && registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            toast.dismiss(t); // Schließe diesen spezifischen Toast
            // Das Neuladen der Seite wird durch den 'controllerchange'-Listener in serviceWorkerRegistration.js ausgelöst
            // window.location.reload(); // Nicht mehr hier direkt
          }}
        >
          Neu laden
        </button>
      </div>
    ),
    { duration: Infinity, position: 'bottom-right', id: 'sw-update-toast' } // Eindeutige ID für den Toast
  );
  return toastId; // Gebe die Toast-ID zurück, falls sie extern benötigt wird
}
