
import React from 'react';
import { Bars3Icon, SpeakerWaveIcon, SpeakerXMarkIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    <header className="flex items-center justify-between px-6 py-4 glass border-b border-white/10 flex-shrink-0">
      <div className="flex items-center space-x-3">
        {/* Menu Button */}
        <button 
          className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors focus-ring"
          aria-label="Menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        
        {/* App Icon with Gradient */}
        <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-gradient">Kijko</h1>
          <p className="text-sm text-gray-400">Video Brief Assistant</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Text-to-Speech Toggle */}
        <button 
          onClick={handleToggle}
          className={`
            p-3 rounded-xl transition-all duration-200 btn-interactive focus-ring
            ${isTtsEnabled 
              ? 'gradient-accent text-white shadow-lg' 
              : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600/50'
            }
            ${isSpeaking ? 'animate-glow-pulse' : ''}
          `}
          aria-label={isTtsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
          title={isTtsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
        >
          <div className={isSpeaking ? 'animate-bounce-dots' : ''}>
            {isTtsEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
          </div>
        </button>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 btn-interactive focus-ring"
          aria-label="Close Kijko App"
          title="Close Kijko App"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
