
import React, { useRef, useEffect } from 'react';
import { UIMessage } from '../types';
import { ChatMessage } from './ChatMessage';

interface ChatHistoryProps {
  messages: UIMessage[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
