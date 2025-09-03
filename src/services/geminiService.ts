
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { KIJKO_SYSTEM_PROMPT } from '../constants';
import { Attachment, MessagePart } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export function startKijkoChat(): Chat {
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: KIJKO_SYSTEM_PROMPT,
    },
  });
  return chat;
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
  attachments: Attachment[]
): Promise<AsyncGenerator<GenerateContentResponse>> {

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
}