import React from 'react';
import { toast } from 'sonner';

const DeveloperSettingsSection = () => {
    
    const handleReload = () => {
        toast.info("Die Seite wird neu geladen...");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    const toastTypes = [
        { fn: () => toast.info('Dies ist ein Info-Toast.'), label: 'Info' },
        { fn: () => toast.success('Dies ist ein Success-Toast.'), label: 'Success' },
        { fn: () => toast.error('Dies ist ein Error-Toast.'), label: 'Error' },
        { fn: () => toast.warning('Dies ist ein Warning-Toast.'), label: 'Warning' },
        { fn: () => toast('Dies ist ein neutraler Standard-Toast.'), label: 'Neutral' },
        { fn: () => toast.custom((t) => (
            <div className="bg-white p-4 rounded shadow-lg border flex flex-col items-start max-w-md">
                <p className="mb-2 text-sm text-gray-700">Custom Toast mit Button</p>
                <button className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-accent hover:text-primary mt-2" onClick={() => toast.dismiss(t)}>
                    Schließen
                </button>
            </div>
        )), label: 'Custom' },
    ];
    const [toastIndex, setToastIndex] = React.useState(0);

    const handleNextToast = () => {
        toastTypes[toastIndex].fn();
        setToastIndex((prev) => (prev + 1) % toastTypes.length);
    };

    return (
        <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">Developer Settings</h2>
            <p className="text-gray-700 mb-2">Hier können Sie interne Test- und Debug-Tools einbauen.</p>
            {/* Beispiel-Button */}
            <button
                onClick={handleReload}
                className="px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 flex items-center">
                Neu Laden
            </button>
            <button
                onClick={handleNextToast}
                className="px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 flex items-center mt-4">
                Toast System Testen ({toastTypes[toastIndex].label})
            </button>
        </section>
    );
};

export default DeveloperSettingsSection;
