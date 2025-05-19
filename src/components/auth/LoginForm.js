import React from 'react';
import { useAuth } from '../../context/AuthContext';

function LoginForm() {
  const { 
    email,         // Changed from username
    setEmail,      // Changed from setUsername
    password, 
    setPassword, 
    login, 
    loginError 
  } = useAuth();

  // Submit mit Enter-Taste
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      login();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center text-primary">Urlaubsplaner Login</h1>
        
        {loginError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {loginError}
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <button
            onClick={login}
            className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Anmelden
          </button>
          
          <div className="mt-4 text-sm text-center text-gray-600">
            <p>Demo Zugangsdaten:</p>
            <p>E-Mail: demo@example.com</p>
            <p>Passwort: Demo!337#</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;