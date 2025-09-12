
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

    const handleClose = () => {
        // Create shutdown signal file that the launch script monitors
        const shutdownSignal = new Blob(['shutdown'], { type: 'text/plain' });
        const url = URL.createObjectURL(shutdownSignal);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kijko-shutdown-signal.txt';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Try to close the window (may not work in all browsers)
        setTimeout(() => {
            window.close();
        }, 1000);
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
          <div className={isSpeaking ? 'animate-pulse' : ''}>
            {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6 text-white" /> : <SpeakerOffIcon className="w-6 h-6 text-white" />}
          </div>
        </button>
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors duration-200"
          aria-label="Close Kijko App"
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
