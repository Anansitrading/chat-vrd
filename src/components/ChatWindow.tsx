import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatInput } from './ChatInput';
import EnhancedChatMessage from './EnhancedChatMessage';
import { UIMessage, Attachment } from '../types';
import { startKijkoChat, sendMessageToKijkoStream } from '../services/geminiService';
import { perplexityService } from '../services/perplexityService';
import { supabaseService } from '../services/supabaseService';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { MCQOption, stripMarkdownForTTS } from '../utils/messageClassifier';
import { KIJKO_SYSTEM_PROMPT } from '../constants';
import { useChat } from '../contexts/ChatContext';

interface ChatWindowProps {
  isTtsEnabled: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopTts: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  isTtsEnabled, 
  isSpeaking, 
  speak, 
  stopTts 
}) => {
  const { currentChatId, setCurrentChatId, createNewChat, loadChatSessions } = useChat();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const { isListening, transcript, startListening, stopListening, setTranscript, isSttSupported } = useSpeechToText();

  // Initialize chat and session
  useEffect(() => {
    const initializeChat = async () => {
      const newChat = startKijkoChat();
      setChat(newChat);

      // If no current chat ID, create a new session
      if (!currentChatId && supabaseService.isAvailable()) {
        try {
          const user = await supabaseService.getCurrentUser();
          if (!user) {
            // No authenticated user; show welcome message locally without persisting
            const welcomeMessage: UIMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
              attachments: [],
              isStreaming: false,
              showOptions: false,
            };
            setMessages([welcomeMessage]);
            return;
          }

          const newSessionId = await createNewChat();
          if (newSessionId) {
            setCurrentChatId(newSessionId);
            
            // Create welcome message and save it immediately
            const welcomeMessage: UIMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
              attachments: [],
              isStreaming: false,
              showOptions: false, // Don't show MCQ buttons on welcome message
            };
            
            setMessages([welcomeMessage]);
            // Save using the new session ID directly (fixes race condition)
            await supabaseService.addMessage(newSessionId, welcomeMessage.text, 'assistant');
            await loadChatSessions(); // Refresh the sidebar
          }
        } catch (error) {
          console.error('Error initializing chat session:', error);
          // Fallback to showing welcome message without saving
          const welcomeMessage: UIMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
            attachments: [],
            isStreaming: false,
            showOptions: false, // Don't show MCQ buttons on welcome message
          };
          setMessages([welcomeMessage]);
        }
      }
    };

    initializeChat();
  }, []);

  // Load messages when currentChatId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChatId || !supabaseService.isAvailable()) {
        // If no session ID, show welcome message
        if (!currentChatId) {
          const welcomeMessage: UIMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
            attachments: [],
            isStreaming: false,
            showOptions: false, // Don't show MCQ buttons on welcome message
          };
          setMessages([welcomeMessage]);
        }
        return;
      }

      setLoadingMessages(true);
      try {
        const supabaseMessages = await supabaseService.getMessages(currentChatId);
        const uiMessages: UIMessage[] = supabaseMessages.map(msg => ({
          id: msg.id,
          role: msg.role === 'user' ? 'user' : 'model',
          text: msg.content,
          attachments: [],
          isStreaming: false,
          showOptions: msg.role === 'assistant' ? true : undefined, // Enable MCQ for assistant messages only
        }));
        
        setMessages(uiMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        // Fallback to welcome message
        const welcomeMessage: UIMessage = {
          id: Date.now().toString(),
          role: 'model',
          text: "Hello! I'm Kijko, your video brief assistant.",
          attachments: [],
          isStreaming: false,
          showOptions: false, // Don't show MCQ buttons on welcome message
        };
        setMessages([welcomeMessage]);
      } finally {
        setLoadingMessages(false);
      }
    };

    if (currentChatId) {
      loadMessages();
    }
  }, [currentChatId]);

  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[]) => {
    if (!text.trim() && attachments.length === 0) return;
    if (!chat) return;

    stopTts();
    if (isListening) {
      stopListening();
    }
    
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      attachments,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setTranscript('');

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: UIMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      attachments: [],
      isStreaming: true,
      showOptions: true, // Enable MCQ options for regular assistant messages
    };
    setMessages(prev => [...prev, modelMessage]);

    try {
      const stream = await sendMessageToKijkoStream(chat, text, attachments);
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
      ));

      if (isTtsEnabled) {
        speak(fullResponse);
      }
      
      // Save messages to Supabase if available
      if (currentChatId && supabaseService.isAvailable()) {
        await supabaseService.addMessage(currentChatId, text, 'user');
        await supabaseService.addMessage(currentChatId, fullResponse, 'assistant');
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = 'Sorry, I encountered an error. Could you please try again?';
      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: errorMessage, isStreaming: false } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [chat, isTtsEnabled, speak, stopTts, isListening, stopListening, setTranscript, currentChatId]);

  // Handle MCQ option selection
  const handleOptionSelect = useCallback(async (option: MCQOption) => {
    if (!chat) return;
    
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: `${option.label}. ${option.text}`,
      attachments: [],
    };
    setMessages(prev => [...prev, userMessage]);
    
    await handleSendMessage(`I choose: ${option.text}`, []);
  }, [chat, handleSendMessage]);

  // Handle thumbs down feedback with Perplexity improvement
  const handleThumbsDown = useCallback(async (messageId: string) => {
    console.log('[DEBUG] handleThumbsDown called with messageId:', messageId);
    console.log('[DEBUG] perplexityService.isAvailable():', perplexityService.isAvailable());
    
    if (!perplexityService.isAvailable()) {
      console.warn('Perplexity service not available for feedback improvement');
      return;
    }

    const messageToImprove = messages.find(msg => msg.id === messageId);
    if (!messageToImprove) return;

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    
    if (!userMessage || userMessage.role !== 'user') {
      console.error('Could not find user message for improvement');
      return;
    }

    try {
      setIsLoading(true);
      
      const improvedResponse = await perplexityService.getImprovedResponse({
        systemPrompt: KIJKO_SYSTEM_PROMPT,
        userQuestion: userMessage.text,
        originalResponse: messageToImprove.text
      });

      const improvedText = `${improvedResponse}\n\n*[This response was improved using Perplexity AI]*`;
      console.log('[DEBUG] Setting improved text:', improvedText);
      console.log('[DEBUG] Text includes asterisks:', improvedText.includes('*'));
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: improvedText }
          : msg
      ));

      if (isTtsEnabled) {
        speak(stripMarkdownForTTS(improvedResponse));
      }

    } catch (error) {
      console.error('Error improving response:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: `${msg.text}\n\n*[Sorry, could not improve this response. Please try asking the question differently.]*` }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isTtsEnabled, speak]);

  // Handle copy message to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, []);

  // Handle speak message with TTS
  const handleSpeak = useCallback((text: string) => {
    const cleanText = stripMarkdownForTTS(text);
    speak(cleanText);
  }, [speak]);

  // Handle retry message generation
  const handleRetry = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    
    if (!userMessage || userMessage.role !== 'user') {
      console.error('Could not find user message for retry');
      return;
    }

    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    await handleSendMessage(userMessage.text, []);
  }, [messages, handleSendMessage]);

  if (loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots mb-4">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <p className="text-gray-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            console.log('[DEBUG] Rendering message with onThumbsDown:', handleThumbsDown);
            return (
              <EnhancedChatMessage
                key={message.id}
                message={message}
                onOptionSelect={handleOptionSelect}
                onThumbsDown={handleThumbsDown}
                onCopy={handleCopy}
                onSpeak={handleSpeak}
                onRetry={handleRetry}
                showActions={!isLoading}
              />
            );
          })}
          
          {/* Loading indicator when processing */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-800 rounded-tr-xl rounded-tl-xl rounded-br-xl px-4 py-3 animate-glow-pulse">
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        isListening={isListening}
        startListening={startListening}
        stopListening={stopListening}
        transcript={transcript}
        isSttSupported={isSttSupported}
      />
    </>
  );
};