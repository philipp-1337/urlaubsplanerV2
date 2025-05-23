// serviceWorkerRegistration.js
// Registriert den Service Worker für die PWA-Funktionalität

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register() {
  if ('serviceWorker' in navigator && !isLocalhost) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then(
        registration => {
          // Erfolgreich registriert
          // console.log('ServiceWorker registration successful:', registration);
        },
        err => {
          // Fehler bei der Registrierung
          // console.error('ServiceWorker registration failed:', err);
        }
      );
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    });
  }
}
