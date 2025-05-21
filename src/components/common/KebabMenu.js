import React, { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from 'lucide-react';

/**
 * KebabMenu
 * Einheitliches Drei-Punkte-Menü für die Dashboard-Container.
 * Props:
 *   items: Array<{ label: string, icon?: ReactNode, onClick?: () => void, disabled?: boolean }>
 *   buttonAriaLabel?: string
 *   align?: 'right' | 'left' (default: 'right')
 */
const KebabMenu = ({ items, buttonAriaLabel = 'Weitere Aktionen', align = 'right', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Outside click & ESC
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={buttonAriaLabel}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={disabled}
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
      {open && !disabled && (
        <div
          ref={menuRef}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-10 mt-1 w-40 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-lg origin-top-right transition-all`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setOpen(false);
                if (item.onClick) item.onClick();
              }}
              className={`min-h-[41px] flex justify-between items-center items-center w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-100 transition-colors ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="menuitem"
              disabled={item.disabled}
            >
              {item.label}
              {item.icon && <span className="flex items-center ml-4 text-primary">{item.icon}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default KebabMenu;
