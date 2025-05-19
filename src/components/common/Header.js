import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../hooks/useCalendar'; // Korrigierter Importpfad
import { Loader2 } from 'lucide-react'; // Ladeindikator-Icon

function Header() {
  const { logout } = useAuth();
  const { setAnsichtModus, handleMonatWechsel, isLoadingData } = useCalendar(); // isLoadingData hier holen
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };
  
  const handleNavClick = (mode, direction = null) => {
    setAnsichtModus(mode);
    if (direction) {
      handleMonatWechsel(direction);
    }
    if (mode === 'liste') {
      navigate('/');
    } else if (mode === 'jahresuebersicht') {
      navigate('/yearly-overview');
    } else if (mode === 'einstellungen') {
      navigate('/settings');
    }
    closeDrawer(); // Close drawer after navigation
  };
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container flex items-center justify-between px-4 py-4 mx-auto">
        <div className="flex items-center"> {/* Wrapper für Titel und Ladeindikator */}
          <h1 className="text-2xl font-bold">
            <button
              onClick={() => {
                setAnsichtModus('jahresuebersicht');
                navigate('/yearly-overview');
              }}
            >
              Urlaubsplaner
            </button>
          </h1>
          {isLoadingData && <Loader2 size={24} className="ml-3 animate-spin" />}
        </div>

        {/* Hamburger Icon for mobile */}
        <button
          className="block lg:hidden text-white focus:outline-none"
          onClick={toggleDrawer}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        {/* Desktop Navigation Buttons */}
        <div className="hidden lg:flex items-center space-x-4">
          <button
            onClick={() => {
              setAnsichtModus('liste');
              handleMonatWechsel('aktuell');
              navigate('/');
            }} className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            Aktueller Monat
          </button>
          <button
            onClick={() => {
              setAnsichtModus('jahresuebersicht');
              navigate('/yearly-overview');
            }}
            className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            Jahresübersicht
          </button>
          <button
            onClick={() => {
              // setAnsichtModus might not be relevant for settings, or define a new mode
              navigate('/settings');
            }} className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            Einstellungen
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            Abmelden
          </button>
        </div>

        {/* Mobile Drawer */}
        <div
          className={`fixed inset-y-0 right-0 w-64 bg-white shadow-lg transform transition-transform ease-in-out duration-300 z-40 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          } lg:hidden`}
        >
          <div className="flex justify-end p-4">
            <button onClick={closeDrawer} aria-label="Close menu">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <nav className="flex flex-col p-4 space-y-4">
            <button
              onClick={() => handleNavClick('liste', 'aktuell')}
              className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              Aktueller Monat
            </button>
            <button
              onClick={() => handleNavClick('jahresuebersicht')}
              className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              Jahresübersicht
            </button>
            <button
              onClick={() => handleNavClick('einstellungen')} // Assuming 'einstellungen' could be a mode or just navigate
              className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              Einstellungen
            </button>
            <button
            onClick={logout}
            className="px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            Abmelden
          </button>
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        ></div>
      )}
    </header>
  );
}

export default Header;