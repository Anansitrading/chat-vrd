import React from 'react';
import { XMarkIcon, PlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useChat } from '../contexts/ChatContext';

interface SessionItemProps {
  session: {
    id: string;
    title?: string;
    summary?: string;
    created_at: string;
    updated_at?: string;
  };
  isActive: boolean;
  onClick: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isActive, onClick }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg transition-all duration-200
        hover:bg-gray-700/50 group
        ${isActive 
          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400/30' 
          : 'bg-gray-800/30 hover:bg-gray-700/50'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <ChatBubbleLeftIcon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
            {session.summary || session.title || 'Untitled Chat'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(session.updated_at || session.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/30">
          <div className="w-4 h-4 bg-gray-600 rounded mt-0.5"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ChatSidebar: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentChatId,
    sessions,
    loadingSessions,
    createNewChat,
    switchToSession,
  } = useChat();

  const handleNewChat = async () => {
    const newChatId = await createNewChat();
    if (newChatId) {
      switchToSession(newChatId);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    switchToSession(sessionId);
  };

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-80 bg-gray-900/95 backdrop-blur-xl border-r border-gray-700/50 z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
                <ChatBubbleLeftIcon className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">Chat History</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-700/30">
            <button
              onClick={handleNewChat}
              className="
                w-full flex items-center justify-center space-x-2 
                p-3 rounded-xl font-medium text-white
                bg-gradient-to-r from-purple-600 to-blue-600 
                hover:from-purple-700 hover:to-blue-700 
                active:scale-[0.98] transition-all duration-150
                shadow-lg hover:shadow-xl
              "
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingSessions ? (
              <LoadingSkeleton />
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ChatBubbleLeftIcon className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-gray-400 text-sm">No previous conversations</p>
                <p className="text-gray-500 text-xs mt-1">Start a new chat to begin!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Recent Chats
                </h3>
                {sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentChatId}
                    onClick={() => handleSessionClick(session.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500 text-center">
              Chat history is automatically saved
            </p>
          </div>
        </div>
      </div>
    </>
  );
};