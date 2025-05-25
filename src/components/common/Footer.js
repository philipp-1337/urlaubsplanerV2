import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Importiere useAuth


const Footer = () => {
  const { isLoggedIn } = useAuth(); // Hole den Login-Status
  const location = useLocation(); // Hole die aktuelle Location

  return (
    <footer className="bg-gray-100 text-center py-4 safe-area">
      <div className="text-xs text-gray-500">
        {/* Zeige Login-Link nur, wenn nicht eingeloggt und nicht auf der Login-Seite */}
        {!isLoggedIn && location.pathname !== '/login' && (
          <>
            <Link to="/login" className="hover:text-primary px-2">
              Login
            </Link>
            <span className="select-none">|</span>
          </>
        )}
        <Link to="/datenschutz" className="hover:text-primary px-2">
          Datenschutzerklärung
        </Link>
        {/* <span className="select-none">|</span>
        <Link to="/impressum" className="hover:text-primary px-2">
          Impressum
        </Link> */}
      </div>
    </footer>
  );
};

export default Footer;