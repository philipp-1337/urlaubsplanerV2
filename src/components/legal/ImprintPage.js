import React from 'react';

const ImprintPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-700">
      <h1 className="text-2xl font-bold mb-4">Impressum</h1>
      <p className="mb-2">Angaben gemäß § 5 TMG:</p>
      <p className="mb-2">[Max Mustermann]</p>
      <p className="mb-2">[Musterstraße 1]</p>
      <p className="mb-2">[12345 Musterstadt]</p>
      <h2 className="text-xl font-semibold mt-4 mb-2">Kontakt:</h2>
      <p className="mb-2">Telefon: [Ihre Telefonnummer]</p>
      <p className="mb-2">E-Mail: [Ihre E-Mail-Adresse]</p>
      {/* Weitere Angaben je nach Bedarf (USt-IdNr., etc.) */}
      <p className="mt-6 text-sm text-gray-500">
        Bitte füllen Sie diese Informationen entsprechend Ihren Anforderungen aus.
      </p>
    </div>
  );
};

export default ImprintPage;