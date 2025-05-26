import React, { useState, useEffect } from 'react'; // useEffect importiert
import { useNavigate, useLocation } from 'react-router-dom'; // useLocation importiert
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../hooks/useCalendar'; // Korrigierter Importpfad
import { 
  Loader2, 
  LogOutIcon, 
  SettingsIcon, 
  SheetIcon, 
  Table2Icon 
} from 'lucide-react'; // Ladeindikator-Icon

function Header() {
  const { logout } = useAuth();
  const { setAnsichtModus, handleMonatWechsel, isLoadingData } = useCalendar(); // isLoadingData hier holen
  const navigate = useNavigate();
  const location = useLocation(); // useLocation Hook für den aktuellen Pfad
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [badgeText, setBadgeText] = useState('BETA');

  useEffect(() => {
    const hostname = window.location.hostname;
    const href = window.location.href;

    // Regulärer Ausdruck, um zu prüfen, ob der Hostname eine IP-Adresse ist
    // Dies deckt IPv4 und gängige private Bereiche ab.
    // Für eine sehr robuste IP-Prüfung könnte man eine Bibliothek verwenden,
    // aber für die gängigsten lokalen IPs sollte dies ausreichen.
    const ipAddressRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const isLocalNetworkIP = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);


    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      isLocalNetworkIP ||
      ipAddressRegex.test(hostname) // Prüft, ob es eine beliebige IP ist (für den Fall, dass es nicht die typischen privaten sind)
    ) {
      setBadgeText('LOCALHOST');
    } else if (href.includes('alpha')) {
      setBadgeText('ALPHA');
    } else {
      setBadgeText('BETA');
    }
  }, [location]); // Abhängigkeit von location, falls sich die URL ändert (z.B. durch Navigation)

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
          <h1 className="text-2xl font-bold flex items-center">
            <button
              onClick={() => {
                setAnsichtModus('jahresuebersicht');
                navigate('/yearly-overview');
              }}
            >
              Urlaubsplaner
            </button>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-accent text-primary rounded uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>
              {badgeText}
            </span>
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
            }} className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            <Table2Icon className="w-4 h-4" /> Aktueller Monat
          </button>
          <button
            onClick={() => {
              setAnsichtModus('jahresuebersicht');
              navigate('/yearly-overview');
            }}
            className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            <SheetIcon className="w-4 h-4" /> Jahresübersicht
          </button>
          <button
            onClick={() => {
              // setAnsichtModus might not be relevant for settings, or define a new mode
              navigate('/settings');
            }} className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            <SettingsIcon className="w-4 h-4" /> Einstellungen
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            <LogOutIcon className="w-4 h-4" /> Abmelden
          </button>
        </div>

        {/* Mobile Drawer */}
        <div
          className={`fixed inset-y-0 right-0 bg-white shadow-lg transform transition-transform ease-in-out duration-300 z-[1000] ${
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
              className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              <Table2Icon className="w-4 h-4" /> Aktueller Monat
            </button>
            <button
              onClick={() => handleNavClick('jahresuebersicht')}
              className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              <SheetIcon className="w-4 h-4" />Jahresübersicht
            </button>
            <button
              onClick={() => handleNavClick('einstellungen')} // Assuming 'einstellungen' could be a mode or just navigate
              className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
            >
              <SettingsIcon className="w-4 h-4" /> Einstellungen
            </button>
            <button
            onClick={logout}
            className="flex items-center gap-1 px-4 py-2 text-primary bg-white rounded-md hover:bg-gray-100"
          >
            <LogOutIcon className="w-4 h-4" /> Abmelden
          </button>
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-[990] lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        ></div>
      )}
    </header>
  );
}

export default Header;