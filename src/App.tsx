
import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import EnhancedChatMessage from './components/EnhancedChatMessage';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatWindow } from './components/ChatWindow';
import { AuthGate } from './components/AuthGate';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { UIMessage, Attachment } from './types';
import { startKijkoChat, sendMessageToKijkoStream } from './services/geminiService';
import { perplexityService } from './services/perplexityService';
import { supabaseService } from './services/supabaseService';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useSpeechToText } from './hooks/useSpeechToText';
import { MCQOption, stripMarkdownForTTS } from './utils/messageClassifier';
import { KIJKO_SYSTEM_PROMPT } from './constants';

const AppContent: React.FC = () => {
  const { isSpeaking, isTtsEnabled, setIsTtsEnabled, speak, stop: stopTts } = useTextToSpeech();


  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-main)' }}>
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled} isSpeaking={isSpeaking} stopSpeech={stopTts} />
      <AuthGate>
        {/* Chat Sidebar */}
        <ChatSidebar />
        {/* Chat Window */}
        <ChatWindow 
          isTtsEnabled={isTtsEnabled}
          isSpeaking={isSpeaking}
          speak={speak}
          stopTts={stopTts}
        />
      </AuthGate>
    </div>
  );
};

// Main App component with ChatProvider
const App: React.FC = () => {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
};

export default App;
