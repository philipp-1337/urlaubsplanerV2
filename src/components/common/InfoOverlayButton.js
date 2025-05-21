import React, { useState, useEffect, useRef } from 'react';
import { InfoIcon, XIcon } from 'lucide-react';

/**
 * InfoOverlayButton
 * Button mit "i"-Icon, das beim Klicken ein Overlay mit dem übergebenen Text anzeigt.
 * Props:
 *   text: string (Text, der im Overlay angezeigt wird)
 *   title?: string (optionaler Titel für das Overlay)
 *   className?: string (optionale zusätzliche Klassen)
 */
const InfoOverlayButton = ({ text, title = 'Info', className = '' }) => {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef(null);

  // ESC schließen
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Klick außerhalb schließt Overlay
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Info anzeigen"
        className={`flex items-center justify-center p-2 rounded-full text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-xs font-bold ${className}`}
        onClick={() => setOpen(true)}
        tabIndex={0}
      >
        <InfoIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div ref={overlayRef} className="bg-white rounded-lg shadow-lg p-0 max-w-sm w-full relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <span className="text-base font-semibold text-gray-900">{title}</span>
              <button
                className="text-gray-500 hover:text-primary text-lg font-bold ml-4"
                onClick={() => setOpen(false)}
                aria-label="Overlay schließen"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 text-gray-800 text-sm whitespace-pre-line">{text}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoOverlayButton;
