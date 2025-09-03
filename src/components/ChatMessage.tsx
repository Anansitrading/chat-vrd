
import React from 'react';
import { UIMessage } from '../types';
import { FileIcon } from './icons/FileIcons';

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
  </div>
);

export const ChatMessage: React.FC<{ message: UIMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold">
          K
        </div>
      )}
      <div className={`max-w-xl lg:max-w-2xl rounded-2xl p-4 ${isUser ? 'bg-blue-600 rounded-br-none' : 'bg-gray-800 rounded-bl-none'}`}>
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        {message.isStreaming && !message.text && <LoadingIndicator />}
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.attachments.map((att, index) => (
              <div key={index} className="bg-gray-700/50 p-2 rounded-lg flex items-center gap-2 text-sm">
                <FileIcon className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <span className="truncate" title={att.name}>{att.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
       {isUser && (
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
          U
        </div>
      )}
    </div>
  );
};