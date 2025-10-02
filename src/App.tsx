
import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import EnhancedChatMessage from './components/EnhancedChatMessage';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { UIMessage, Attachment } from './types';
import { startKijkoChat, sendMessageToKijkoStream } from './services/geminiService';
import { perplexityService } from './services/perplexityService';
import { supabaseService } from './services/supabaseService';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useSpeechToText } from './hooks/useSpeechToText';
import { MCQOption, stripMarkdownForTTS } from './utils/messageClassifier';
import { KIJKO_SYSTEM_PROMPT } from './constants';
import { VersionChecker } from './utils/versionChecker';

const AppContent: React.FC = () => {
  const { isSpeaking, isTtsEnabled, setIsTtsEnabled, speak, stop: stopTts } = useTextToSpeech();

  // Initialize version checking for automatic cache invalidation
  useEffect(() => {
    const versionChecker = new VersionChecker();
    versionChecker.startMonitoring();
    
    // Cleanup on unmount
    return () => {
      versionChecker.stopMonitoring();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-main)' }}>
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled} isSpeaking={isSpeaking} stopSpeech={stopTts} />
      {/* Chat Sidebar */}
      <ChatSidebar />
      {/* Chat Window */}
      <ChatWindow 
        isTtsEnabled={isTtsEnabled}
        isSpeaking={isSpeaking}
        speak={speak}
        stopTts={stopTts}
      />
    </div>
  );
};

// Main App component with providers
const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </SettingsProvider>
  );
};

export default App;
