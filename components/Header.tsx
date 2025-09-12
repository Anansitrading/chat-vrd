
import React from 'react';
import { SpeakerOnIcon, SpeakerOffIcon } from './icons/SpeakerIcons';

interface HeaderProps {
    isTtsEnabled: boolean;
    setIsTtsEnabled: (enabled: boolean) => void;
    isSpeaking: boolean;
    stopSpeech: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isTtsEnabled, setIsTtsEnabled, isSpeaking, stopSpeech }) => {
    const handleToggle = () => {
        if (isSpeaking) {
            stopSpeech();
        }
        setIsTtsEnabled(!isTtsEnabled);
    };

    const handleCloseApp = () => {
        if (confirm('Are you sure you want to close Kijko? This will stop the app and free all ports.')) {
            // Create a shutdown signal file that the launcher script will detect
            const shutdownSignal = new Blob(['shutdown-requested'], { type: 'text/plain' });
            const url = URL.createObjectURL(shutdownSignal);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kijko-shutdown-signal.txt';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);
            
            // Show shutdown message and close
            setTimeout(() => {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:white;flex-direction:column;text-align:center;"><h1 style="color:#ef4444;margin-bottom:20px;">🔴 Kijko Shutting Down</h1><p style="margin-bottom:10px;">The app is being closed and all processes will be terminated.</p><p style="margin-bottom:20px;">The server should stop automatically within a few seconds.</p><p style="font-size:14px;color:#888;">You can safely close this browser tab now.</p></div>';
            }, 500);
        }
    };

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-md flex-shrink-0">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
        <h1 className="text-2xl font-bold text-white tracking-wider">Kijko</h1>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={handleToggle}
          className={`p-2 rounded-full transition-colors duration-200 ${isTtsEnabled ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-600 hover:bg-gray-500'}`}
          aria-label={isTtsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
        >
          {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6 text-white" /> : <SpeakerOffIcon className="w-6 h-6 text-white" />}
        </button>
        <button 
          onClick={handleCloseApp}
          className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors duration-200"
          aria-label="Close App"
          title="Close Kijko App"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
};
