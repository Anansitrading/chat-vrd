// api/generate-token.ts
// npm i @google/genai
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality } from '@google/genai';

const LIVE_NATIVE_AUDIO_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Accept language and systemPrompt from request body
    const { language, systemPrompt } = req.body || {};
    const inputLang = language || 'nl-NL'; // Default to Dutch
    
    const ai = new GoogleGenAI({}); // Server reads GEMINI_API_KEY from env
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: LIVE_NATIVE_AUDIO_MODEL,
          config: {
            // Use provided system prompt or default
            ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
            // Ask the Live session to output audio by default
            responseModalities: [Modality.AUDIO],
            // Optional: resume if network blips
            sessionResumption: {},
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return res.status(200).json({ ephemeralToken: token.name });
  } catch (err: any) {
    console.error('Error creating ephemeral token:', err?.message || err);
    return res.status(500).json({ error: 'Failed to create ephemeral token' });
  }
}