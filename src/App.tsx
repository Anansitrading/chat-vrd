
import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import EnhancedChatMessage from './components/EnhancedChatMessage';
import { UIMessage, Attachment } from './types';
import { startKijkoChat, sendMessageToKijkoStream } from './services/geminiService';
import { perplexityService } from './services/perplexityService';
import { supabaseService } from './services/supabaseService';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useSpeechToText } from './hooks/useSpeechToText';
import { MCQOption, stripMarkdownForTTS } from './utils/messageClassifier';
import { KIJKO_SYSTEM_PROMPT } from './constants';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { isSpeaking, isTtsEnabled, setIsTtsEnabled, speak, stop: stopTts } = useTextToSpeech();
  const { isListening, transcript, startListening, stopListening, setTranscript, isSttSupported } = useSpeechToText();

  useEffect(() => {
    const initializeChat = async () => {
      const newChat = startKijkoChat();
      setChat(newChat);
      
      // Initialize Supabase session if available
      if (supabaseService.isAvailable()) {
        try {
          let user = await supabaseService.getCurrentUser();
          if (!user) {
            user = await supabaseService.signInAnonymously();
          }
          // Create a new chat session
          const session = await supabaseService.createChatSession('Kijko Chat Session');
          if (session) {
            setCurrentChatId(session.id);
          }
        } catch (error) {
          console.error('Error initializing Supabase session:', error);
        }
      }
      
      const welcomeMessage: UIMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
        attachments: [],
        isStreaming: false,
      };
      setMessages([welcomeMessage]);
      
      // Save welcome message to Supabase if available
      if (currentChatId && supabaseService.isAvailable()) {
        await supabaseService.addMessage(currentChatId, welcomeMessage.text, 'assistant');
      }
    };
    initializeChat();
  }, []);

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
    setTranscript(''); // Clear transcript after sending

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: UIMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      attachments: [],
      isStreaming: true,
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
    
    // Add user's selection as a message
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: `${option.label}. ${option.text}`,
      attachments: [],
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Continue conversation with the selected option
    await handleSendMessage(`I choose: ${option.text}`, []);
  }, [chat, handleSendMessage]);

  // Handle thumbs down feedback with Perplexity improvement
  const handleThumbsDown = useCallback(async (messageId: string) => {
    if (!perplexityService.isAvailable()) {
      console.warn('Perplexity service not available for feedback improvement');
      return;
    }

    const messageToImprove = messages.find(msg => msg.id === messageId);
    if (!messageToImprove) return;

    // Find the user message that prompted this response
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    
    if (!userMessage || userMessage.role !== 'user') {
      console.error('Could not find user message for improvement');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get improved response from Perplexity
      const improvedResponse = await perplexityService.getImprovedResponse({
        systemPrompt: KIJKO_SYSTEM_PROMPT,
        userQuestion: userMessage.text,
        originalResponse: messageToImprove.text
      });

      // Replace the original message with the improved response
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: `${improvedResponse}\n\n*[This response was improved using Perplexity AI]*` }
          : msg
      ));

      // Speak the improved response if TTS is enabled
      if (isTtsEnabled) {
        speak(stripMarkdownForTTS(improvedResponse));
      }

    } catch (error) {
      console.error('Error improving response:', error);
      // Show error message to user
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
      // Could add a toast notification here
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

    // Remove the failed message and regenerate
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    await handleSendMessage(userMessage.text, []);
  }, [messages, handleSendMessage]);
  
  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-main)' }}>
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled} isSpeaking={isSpeaking} stopSpeech={stopTts} />
      
      {/* Enhanced Chat History */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
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
          ))}
          
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
    </div>
  );
};

export default App;
