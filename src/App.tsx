
import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import { UIMessage, Attachment } from './types';
import { startKijkoChat, sendMessageToKijkoStream } from './services/geminiService';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useSpeechToText } from './hooks/useSpeechToText';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isSpeaking, isTtsEnabled, setIsTtsEnabled, speak, stop: stopTts } = useTextToSpeech();
  const { isListening, transcript, startListening, stopListening, setTranscript, isSttSupported } = useSpeechToText();

  useEffect(() => {
    const initializeChat = () => {
      const newChat = startKijkoChat();
      setChat(newChat);
      const welcomeMessage: UIMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Hello! I'm Kijko, your video brief assistant. I'll help you create a comprehensive production plan for your video project. To get started, could you tell me about your video idea? Feel free to share as much or as little as you have in mind, and we'll build from there.",
        attachments: [],
        isStreaming: false,
      };
      setMessages([welcomeMessage]);
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

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = 'Sorry, I encountered an error. Could you please try again?';
      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: errorMessage, isStreaming: false } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [chat, isTtsEnabled, speak, stopTts, isListening, stopListening, setTranscript]);
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled} isSpeaking={isSpeaking} stopSpeech={stopTts} />
      <ChatHistory messages={messages} />
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
