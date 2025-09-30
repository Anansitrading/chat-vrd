
import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';
import { SendIcon } from './icons/SendIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { XCircleIcon } from './icons/FileIcons';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { useDeepgramLanguageDetection } from '../hooks/useDeepgramLanguageDetection';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  isSttSupported: boolean;
  // Gemini Live props
  isGeminiLiveMode?: boolean;
  startGeminiLive?: (detectedLanguage?: string) => void; // Updated to accept language
  stopGeminiLive?: () => void;
  isGeminiLiveListening?: boolean;
  isGeminiLiveSupported?: boolean;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading, 
    isListening, 
    startListening, 
    stopListening,
    transcript,
    isSttSupported,
    // Gemini Live props
    isGeminiLiveMode = false,
    startGeminiLive,
    stopGeminiLive,
    isGeminiLiveListening = false,
    isGeminiLiveSupported = false,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showLanguageDetection, setShowLanguageDetection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Language detection hook
  const {
    detectLanguage,
    isDetecting,
    detectedLanguage,
    error: detectionError,
    reset: resetDetection,
  } = useDeepgramLanguageDetection();

  useEffect(() => {
    setText(transcript);
  }, [transcript]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [text]);


  const handleSendMessage = () => {
    if (isLoading || (!text.trim() && attachments.length === 0)) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (attachments.length + files.length > MAX_FILES) {
        alert(`You can only upload a maximum of ${MAX_FILES} files.`);
        return;
    }

    const newAttachments: Attachment[] = [];
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            continue;
        }
        try {
            const data = await fileToBase64(file);
            newAttachments.push({ name: file.name, type: file.type, size: file.size, data });
        } catch (error) {
            console.error("Error converting file to base64", error);
        }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleMicClick = async () => {
      if (isGeminiLiveMode) {
          // Gemini Live mode with language detection
          if (isGeminiLiveListening) {
              // Stop listening
              stopGeminiLive?.();
              setShowLanguageDetection(false);
              resetDetection();
          } else {
              try {
                  // Step 1: Detect language first
                  setShowLanguageDetection(true);
                  const languageResult = await detectLanguage();
                  
                  console.log('Detected language:', languageResult);
                  
                  // Step 2: Start Gemini Live with detected language
                  startGeminiLive?.(languageResult.geminiLanguageCode);
                  
                  // Show language detection UI for 2 seconds
                  setTimeout(() => {
                      setShowLanguageDetection(false);
                  }, 2000);
                  
              } catch (error) {
                  console.error('Language detection failed:', error);
                  // Fallback to default language
                  startGeminiLive?.();
                  setShowLanguageDetection(false);
              }
          }
      } else {
          // Traditional Web Speech API mode (unchanged)
          if (isListening) {
              stopListening();
          } else {
              startListening();
          }
      }
  }

  return (
    <div className="p-6 border-t border-white/10 flex-shrink-0" style={{ background: 'var(--bg-input)' }}>
      <div className="relative">
        {/* Composer Container */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="p-4 border-b border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="bg-gray-700/50 p-3 rounded-xl flex items-center justify-between text-sm backdrop-blur">
                    <span className="truncate text-white/90" title={file.name}>{file.name}</span>
                    <button 
                      onClick={() => removeAttachment(index)} 
                      className="ml-2 text-gray-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
                      aria-label={`Remove ${file.name}`}
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Input Row */}
          <div className="flex items-end p-2">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-white/5 focus-ring"
              aria-label="Attach files"
              title="Attach files"
            >
              <AttachmentIcon className="w-5 h-5" />
            </button>
            
            {/* Microphone Button */}
            <button
              onClick={handleMicClick}
              disabled={isGeminiLiveMode ? !isGeminiLiveSupported : !isSttSupported}
              className={`
                p-3 transition-all duration-200 rounded-lg focus-ring
                disabled:opacity-50 disabled:cursor-not-allowed
                ${(isGeminiLiveMode ? isGeminiLiveListening : isListening)
                  ? 'text-red-400 bg-red-500/10 animate-glow-pulse' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
                ${isGeminiLiveMode ? 'ring-2 ring-blue-500/30' : ''}
              `}
              aria-label={(isGeminiLiveMode ? isGeminiLiveListening : isListening) ? 'Stop listening' : 'Start listening'}
              title={
                isGeminiLiveMode 
                  ? (isGeminiLiveSupported 
                      ? (isGeminiLiveListening ? 'Stop Gemini Live conversation' : 'Start Gemini Live conversation')
                      : 'Gemini Live is not supported in your browser')
                  : (isSttSupported 
                      ? (isListening ? 'Stop listening' : 'Start listening') 
                      : 'Speech-to-text is not supported in your browser')
              }
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            
            {/* Hidden File Input */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            
            {/* Text Input */}
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGeminiLiveMode 
                  ? (isGeminiLiveListening ? "🎤 Live conversation..." : "Send message or start live conversation...")
                  : (isListening ? "🎤 Listening..." : "Send message...")
              }
              className={`
                flex-1 bg-transparent p-3 resize-none outline-none max-h-40
                text-white placeholder:text-gray-500
                ${(isGeminiLiveMode ? isGeminiLiveListening : isListening) ? 'placeholder:animate-pulse' : ''}
              `}
              rows={1}
              disabled={isLoading}
            />
            
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!text.trim() && attachments.length === 0)}
              className={`
                p-3 rounded-xl transition-all duration-200 focus-ring
                ${isLoading || (!text.trim() && attachments.length === 0)
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  : 'gradient-send text-white shadow-lg btn-interactive hover:shadow-xl'
                }
              `}
              aria-label="Send message"
              title="Send message"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Language Detection Display */}
        {showLanguageDetection && detectedLanguage && (
          <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg p-3 shadow-lg border border-green-500/30 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {detectedLanguage.language === 'nl' ? '🇳🇱' : 
                 detectedLanguage.language === 'en' ? '🇬🇧' :
                 detectedLanguage.language === 'de' ? '🇩🇪' :
                 detectedLanguage.language === 'fr' ? '🇫🇷' : 
                 detectedLanguage.language === 'es' ? '🇪🇸' :
                 detectedLanguage.language === 'it' ? '🇮🇹' : '🌐'}
              </span>
              <div>
                <p className="text-white font-medium">
                  {detectedLanguage.language.toUpperCase()} detected
                </p>
                <p className="text-gray-400 text-sm">
                  {Math.round(detectedLanguage.confidence * 100)}% confidence
                </p>
              </div>
            </div>
          </div>
        )}

        {isDetecting && (
          <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg p-3 shadow-lg">
            <p className="text-white text-sm">🎤 Detecting language...</p>
          </div>
        )}
      </div>
    </div>
  );
};
