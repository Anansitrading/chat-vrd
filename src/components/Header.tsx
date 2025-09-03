
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

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-md flex-shrink-0">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
        <h1 className="text-2xl font-bold text-white tracking-wider">Kijko</h1>
      </div>
       <button 
        onClick={handleToggle}
        className={`p-2 rounded-full transition-colors duration-200 ${isTtsEnabled ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-600 hover:bg-gray-500'}`}
        aria-label={isTtsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
      >
        <div className={isSpeaking ? 'animate-pulse' : ''}>
          {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6 text-white" /> : <SpeakerOffIcon className="w-6 h-6 text-white" />}
        </div>
      </button>
    </header>
  );
};
