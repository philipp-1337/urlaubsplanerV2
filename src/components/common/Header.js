import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../context/CalendarContext';

function Header() {
  const { logout } = useAuth();
  const { setAnsichtModus, handleMonatWechsel } = useCalendar();

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container flex items-center justify-between px-4 py-4 mx-auto">
        <h1 className="text-2xl font-bold">Urlaubsplaner</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setAnsichtModus('liste');
              handleMonatWechsel('aktuell');
            }}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Aktueller Monat
          </button>
          <button
            onClick={() => {
              setAnsichtModus('jahresuebersicht');
            }}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Jahresübersicht
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;