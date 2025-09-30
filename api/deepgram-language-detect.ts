import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@deepgram/sdk';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Defensive check for API key
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    console.error('DEEPGRAM_API_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error: Missing API key' });
  }

  try {
    const { audioBase64 } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data required' });
    }

    // Initialize Deepgram client
    const deepgram = createClient(deepgramApiKey);

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Audio buffer is empty after decoding' });
    }

    // Call Deepgram Prerecorded API with language detection
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        detect_language: true,
        punctuate: true,
        smart_format: true,
      }
    );

    if (error) {
      console.error('Deepgram API error:', error);
      return res.status(500).json({ error: 'Language detection failed', details: error });
    }

    // Validate response structure
    if (!result?.results?.channels?.[0]) {
      console.error('Invalid Deepgram response structure:', result);
      return res.status(500).json({ error: 'Invalid response from Deepgram' });
    }

    // Extract detected language from response
    const channel = result.results.channels[0] as any; // Type assertion for language detection fields
    const detectedLanguage = channel.detected_language;
    const confidence = channel.alternatives?.[0]?.confidence || 0;
    const alternatives = channel.language_alternatives || [];

    // Map Deepgram language codes to Gemini Live BCP-47 codes
    const languageMapping: Record<string, string> = {
      'nl': 'nl-NL',
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'hi': 'hi-IN',
      'ar': 'ar-XA',
      'tr': 'tr-TR',
      'vi': 'vi-VN',
      'id': 'id-ID',
      'pl': 'pl-PL',
      'ru': 'ru-RU',
      'th': 'th-TH',
    };

    const geminiLanguageCode = languageMapping[detectedLanguage] || 'en-US';

    return res.status(200).json({
      language: detectedLanguage,
      geminiLanguageCode,
      confidence,
      alternatives: alternatives.map((alt: any) => ({
        language: alt.language,
        confidence: alt.confidence,
        geminiLanguageCode: languageMapping[alt.language] || 'en-US',
      })),
      transcript: result.results.channels[0].alternatives[0].transcript,
    });

  } catch (error: any) {
    // Comprehensive debug logging
    console.error('========== DEEPGRAM API ERROR ===========');
    console.error('Error Message:', error?.message || error);
    console.error('Stack Trace:', error?.stack || 'No stack available');
    console.error('Request Body:', req.body);
    console.error('Deepgram Response:', error?.response || 'No response');
    console.error('Environment Keys:', Object.keys(process.env));
    console.error('DEEPGRAM_API_KEY exists:', !!process.env.DEEPGRAM_API_KEY);
    console.error('==========================================');

    // Return detailed debug info in response (REMOVE IN PRODUCTION)
    return res.status(500).json({
      error: 'Internal server error',
      debug: {
        message: error?.message || String(error),
        stack: error?.stack || 'No stack trace',
        deepgramError: error?.response || error?.error || null,
        requestPayload: {
          hasAudioBase64: !!req.body?.audioBase64,
          audioBase64Length: req.body?.audioBase64?.length || 0,
        },
        environment: {
          hasDeepgramKey: !!process.env.DEEPGRAM_API_KEY,
          envKeys: Object.keys(process.env).filter(k => k.includes('DEEPGRAM')),
        },
      },
    });
  }
}