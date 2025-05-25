import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-100 text-center py-4">
      <div className="text-xs text-gray-500">
        {/* <Link to="/" className="hover:text-primary px-2">
          Startseite
        </Link>
        <span className="select-none">|</span> */}
        {/* <Link to="/impressum" className="hover:text-primary px-2">
          Impressum
        </Link>
        <span className="select-none">|</span> */}
        <Link to="/datenschutz" className="hover:text-primary px-2">
          Datenschutzerklärung
        </Link>
      </div>
    </footer>
  );
};

export default Footer;