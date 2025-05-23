// src/components/common/ServiceWorkerUpdateToast.js
import React from 'react';
import { toast } from 'sonner';

export function showServiceWorkerUpdateToast() {
  toast(
    (t) => (
      <div className="flex flex-col items-start">
        <span className="mb-2 font-semibold">Update verfügbar</span>
        <span className="mb-3 text-sm text-gray-700">Eine neue Version der App ist verfügbar. Jetzt neu laden?</span>
        <button
          className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-accent hover:text-primary mt-1"
          onClick={() => {
            toast.dismiss(t);
            window.location.reload();
          }}
        >
          Neu laden
        </button>
      </div>
    ),
    { duration: Infinity, position: 'bottom-right' }
  );
}
