import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HandThumbUpIcon, 
  HandThumbDownIcon, 
  DocumentDuplicateIcon,
  SpeakerWaveIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { UIMessage } from '../types';
import { classifyMessage, stripMarkdownForTTS, MCQOption, generateDefaultMCQOptions, extractMCQOptions } from '../utils/messageClassifier';
import OptionGroup from './OptionGroup';

interface EnhancedChatMessageProps {
  message: UIMessage;
  onOptionSelect?: (option: MCQOption) => void;
  onThumbsDown?: (messageId: string) => void;
  onCopy?: (text: string) => void;
  onSpeak?: (text: string) => void;
  onRetry?: (messageId: string) => void;
  showActions?: boolean;
}

interface MessageActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const MessageActionButton: React.FC<MessageActionButtonProps> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default' 
}) => {
  return (
    <button
      onClick={() => {
        console.log('[DEBUG] MessageActionButton clicked, label:', label);
        onClick();
      }}
      className={`
        p-2 rounded-lg transition-all duration-150
        ${variant === 'danger' 
          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }
        focus-ring btn-interactive
      `}
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

const EnhancedChatMessage: React.FC<EnhancedChatMessageProps> = ({
  message,
  onOptionSelect,
  onThumbsDown,
  onCopy,
  onSpeak,
  onRetry,
  showActions = true
}) => {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Classify the message to determine rendering approach
  const classifiedMessage = useMemo(() => {
    return !isUser ? classifyMessage(message.text) : { type: 'text' as const, originalText: message.text };
  }, [message.text, isUser]);

  // Prepare text for TTS
  const ttsText = useMemo(() => {
    return stripMarkdownForTTS(message.text);
  }, [message.text]);

  const handleOptionSelect = useCallback((option: MCQOption) => {
    if (onOptionSelect) {
      onOptionSelect(option);
    }
  }, [onOptionSelect]);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.text);
    }
  }, [onCopy, message.text]);

  const handleSpeak = useCallback(() => {
    if (onSpeak) {
      onSpeak(ttsText);
    }
  }, [onSpeak, ttsText]);

  const handleThumbsDown = useCallback(() => {
    console.log('[DEBUG] EnhancedChatMessage handleThumbsDown called');
    console.log('[DEBUG] onThumbsDown prop:', onThumbsDown);
    console.log('[DEBUG] message.id:', message.id);
    if (onThumbsDown) {
      onThumbsDown(message.id);
    } else {
      console.warn('[DEBUG] onThumbsDown prop is undefined');
    }
  }, [onThumbsDown, message.id]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry(message.id);
    }
  }, [onRetry, message.id]);

  // Custom markdown renderers for better TTS compatibility
  const markdownComponents = {
    // Render code blocks as simple text for TTS
    code({ children }: { children: React.ReactNode }) {
      return <code className="bg-gray-800 px-1 rounded text-sm">{children}</code>;
    },
    
    // Handle images with alt text
    img({ alt, src }: { alt?: string; src?: string }) {
      return (
        <span className="inline-block text-gray-400 text-sm">
          [Image: {alt || 'No description'}]
        </span>
      );
    },
    
    // Style headers
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-base font-bold mb-1 text-white">{children}</h3>
    ),
    
    // Style lists
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>
    ),
    
    // Style links
    a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
      <a 
        href={href} 
        className="text-blue-400 hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // Style strong/bold text
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    
    // Style emphasis/italic text
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="italic text-white/90">{children}</em>
    ),
    
    // Style paragraphs
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    )
  };

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-up`}
      role="article"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
    >
      <div className={`
        max-w-[85%] sm:max-w-[75%] 
        ${isUser 
          ? 'gradient-user rounded-tl-xl rounded-tr-xl rounded-bl-xl text-white' 
          : 'bg-gray-800 rounded-tr-xl rounded-tl-xl rounded-br-xl text-white/90'
        }
        px-4 py-3 shadow-lg
        ${isStreaming ? 'animate-glow-pulse' : ''}
      `}>
        {/* Message Content */}
        <div className="space-y-2">
          {isUser ? (
            // User messages: simple text rendering
            <div className="whitespace-pre-wrap break-words">
              {message.text}
            </div>
          ) : (
            // All assistant messages get MCQ options by default
            <div>
              <div className="mb-2">
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  aria-live={isStreaming ? 'polite' : undefined}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
              </div>
              
              {!isStreaming && (
                <OptionGroup
                  options={generateDefaultMCQOptions(message.text)}
                  onSelect={handleOptionSelect}
                  disabled={!onOptionSelect}
                />
              )}
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center space-x-2 pt-2">
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <span className="text-xs text-white/60">Generating...</span>
            </div>
          )}
        </div>

        {/* Message Actions (only for assistant messages) */}
        {!isUser && !isStreaming && showActions && (
          <div className="flex items-center justify-end space-x-1 mt-3 pt-2 border-t border-gray-700/50">
            {onCopy && (
              <MessageActionButton
                icon={DocumentDuplicateIcon}
                label="Copy message"
                onClick={handleCopy}
              />
            )}
            
            {onSpeak && (
              <MessageActionButton
                icon={SpeakerWaveIcon}
                label="Read aloud"
                onClick={handleSpeak}
              />
            )}
            
            {onRetry && (
              <MessageActionButton
                icon={ArrowPathIcon}
                label="Regenerate response"
                onClick={handleRetry}
              />
            )}
            
            <MessageActionButton
              icon={HandThumbUpIcon}
              label="Good response"
              onClick={() => {}} // TODO: Implement thumbs up
            />
            
            {onThumbsDown && (
              <MessageActionButton
                icon={HandThumbDownIcon}
                label="Improve response"
                onClick={handleThumbsDown}
                variant="danger"
              />
            )}
          </div>
        )}

        {/* Attachments (if any) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-700/50">
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="text-xs bg-gray-700/50 px-2 py-1 rounded"
                  title={attachment.name}
                >
                  📎 {attachment.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChatMessage;