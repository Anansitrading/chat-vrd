import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseService, ChatSession } from '../services/supabaseService';

interface ChatSessionSummary extends ChatSession {
  summary?: string;
}

interface ChatContextType {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Session management
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  sessions: ChatSessionSummary[];
  setSessions: (sessions: ChatSessionSummary[]) => void;
  
  // Loading states
  loadingSessions: boolean;
  setLoadingSessions: (loading: boolean) => void;
  
  // Actions
  loadChatSessions: () => Promise<void>;
  createNewChat: () => Promise<string | null>;
  switchToSession: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load chat sessions from Supabase
  const loadChatSessions = async () => {
    if (!supabaseService.isAvailable()) return;
    
    setLoadingSessions(true);
    try {
      const chatSessions = await supabaseService.getChatSessions();
      
      // Add summaries to sessions (truncate title or use first message)
      const sessionsWithSummaries: ChatSessionSummary[] = chatSessions.map(session => ({
        ...session,
        summary: session.title || `Chat from ${new Date(session.created_at).toLocaleDateString()}`
      }));
      
      setSessions(sessionsWithSummaries);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Create a new chat session
  const createNewChat = async (): Promise<string | null> => {
    if (!supabaseService.isAvailable()) return null;
    
    try {
      const session = await supabaseService.createChatSession('Kijko Chat Session');
      if (session) {
        // Add to sessions list
        const newSessionWithSummary: ChatSessionSummary = {
          ...session,
          summary: session.title || `New Chat ${new Date().toLocaleDateString()}`
        };
        setSessions(prev => [newSessionWithSummary, ...prev]);
        return session.id;
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
    return null;
  };

  // Switch to a specific session
  const switchToSession = (sessionId: string) => {
    setCurrentChatId(sessionId);
    setSidebarOpen(false); // Close sidebar after selection
  };

  // Initialize Supabase and load sessions on mount
  useEffect(() => {
    const initializeAndLoad = async () => {
      // Initialize Supabase auth first (anonymous sign-in if needed)
      await supabaseService.initialize();
      // Then load conversations
      await loadChatSessions();
    };
    initializeAndLoad();
  }, []);

  const value: ChatContextType = {
    sidebarOpen,
    setSidebarOpen,
    currentChatId,
    setCurrentChatId,
    sessions,
    setSessions,
    loadingSessions,
    setLoadingSessions,
    loadChatSessions,
    createNewChat,
    switchToSession,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};