
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { KIJKO_SYSTEM_PROMPT } from '../constants';
import { Attachment, MessagePart } from '../types';
import { GeminiModel } from '../types/settings';

// Get API keys with fallback support
const getApiKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY || process.env.API_KEY,
    process.env.GEMINI_API_KEY_BACKUP_1,
    process.env.GEMINI_API_KEY_BACKUP_2
  ].filter(Boolean);
  
  if (keys.length === 0) {
    throw new Error("No valid API keys found. Please set GEMINI_API_KEY environment variable");
  }
  
  return keys;
};

const apiKeys = getApiKeys();
let currentKeyIndex = 0;

// Create AI instance with current key
let ai = new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });

// Function to switch to next API key if current one fails
const switchToNextKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  ai = new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
  console.log(`Switched to backup API key ${currentKeyIndex + 1}`);
};

export function startKijkoChat(model?: GeminiModel, systemPrompt?: string): Chat {
  try {
    const selectedModel = model || 'gemini-2.5-flash';
    const selectedPrompt = systemPrompt || KIJKO_SYSTEM_PROMPT;
    
    const chat = ai.chats.create({
      model: selectedModel,
      config: {
        systemInstruction: selectedPrompt,
      },
    });
    return chat;
  } catch (error) {
    console.error('Failed to create chat with current API key:', error);
    if (apiKeys.length > 1) {
      switchToNextKey();
      return startKijkoChat(model, systemPrompt);
    }
    throw error;
  }
}

const fileToGenerativePart = (file: Attachment): MessagePart => {
  return {
    inlineData: {
      data: file.data,
      mimeType: file.type,
    },
  };
};

export async function sendMessageToKijkoStream(
  chat: Chat, 
  text: string, 
  attachments: Attachment[],
  retryCount = 0,
  model?: GeminiModel,
  systemPrompt?: string
): Promise<AsyncGenerator<GenerateContentResponse>> {
  try {
    const parts: MessagePart[] = attachments.map(fileToGenerativePart);
    
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([\w-]{11})/;
    const ytMatch = text.match(youtubeRegex);

    let promptText = text;
    if (ytMatch) {
      promptText += `\n\n[User has provided a YouTube link for context: ${ytMatch[0]}. Please analyze the content of this video as part of your response.]`;
    }

    if (promptText.trim()) {
      parts.push({ text: promptText });
    }
    
    const result = await chat.sendMessageStream({ message: parts });
    return result;
  } catch (error) {
    console.error('Failed to send message with current API key:', error);
    
    // If we have backup keys and haven't exceeded retry attempts
    if (apiKeys.length > 1 && retryCount < apiKeys.length - 1) {
      switchToNextKey();
      // Create new chat with the new API key and same settings
      const newChat = startKijkoChat(model, systemPrompt);
      return sendMessageToKijkoStream(newChat, text, attachments, retryCount + 1, model, systemPrompt);
    }
    
    throw error;
  }
}
