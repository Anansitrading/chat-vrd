<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Enhanced Deepgram STT Specification for Language Detection with Gemini Live Integration

Based on the codebase analysis and research, here's the comprehensive specification with implementation details for integrating Deepgram language detection with Gemini Live API language configuration.

## Critical Implementation Gap Identified

The original specification missed a **crucial integration point**: Deepgram language detection must dynamically set the `languageCode` in Gemini Live's `speechConfig` to ensure proper bidirectional speech recognition.[^1][^2][^3][^4]

## Enhanced Architecture Overview

The implementation requires a two-stage approach:

1. **Stage 1**: Deepgram detects language from initial audio sample (1-2 seconds)
2. **Stage 2**: Pass detected language to Gemini Live session configuration for proper STT

## Complete Implementation Guide

### 1. Backend API Implementation

#### **File: `api/deepgram-language-detect.ts`**

This Vercel serverless function performs initial language detection:

```typescript
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

  try {
    const { audioBase64 } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data required' });
    }

    // Initialize Deepgram client with Vercel environment variable
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

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
      return res.status(500).json({ error: 'Language detection failed' });
    }

    // Extract detected language from response
    const detectedLanguage = result.results.channels[^0].detected_language;
    const confidence = result.results.channels[^0].alternatives[^0].confidence;
    const alternatives = result.results.channels[^0].language_alternatives || [];

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
      transcript: result.results.channels[^0].alternatives[^0].transcript,
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**Key Enhancement**: Added language mapping from Deepgram codes to Gemini Live BCP-47 codes.[^4][^1]

### 2. Audio Capture Utility

#### **File: `src/utils/audioCapture.ts`**

Handles microphone access and audio processing:

```typescript
export interface AudioCaptureResult {
  base64Audio: string;
  mimeType: string;
  duration: number;
}

export class AudioCaptureManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  /**
   * Request microphone permission and initialize audio context
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone with optimal settings for speech
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for Deepgram
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context for processing
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

    } catch (error) {
      console.error('Microphone access denied:', error);
      throw new Error('Microphone permission required');
    }
  }

  /**
   * Capture initial audio sample for language detection
   * @param durationMs Duration in milliseconds (default: 2000ms)
   */
  async captureInitialSample(durationMs: number = 2000): Promise<AudioCaptureResult> {
    if (!this.mediaStream) {
      throw new Error('Audio capture not initialized');
    }

    return new Promise((resolve, reject) => {
      this.audioChunks = [];

      // Use MediaRecorder for browser compatibility
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus', // Wide browser support
      };

      this.mediaRecorder = new MediaRecorder(this.mediaStream!, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Convert to PCM Int16 for Deepgram
          const pcmData = await this.convertToPCM(audioBlob);
          const base64Audio = this.arrayBufferToBase64(pcmData);

          resolve({
            base64Audio,
            mimeType: 'audio/pcm;rate=16000',
            duration: durationMs,
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.start();

      // Stop after specified duration
      setTimeout(() => {
        this.mediaRecorder?.stop();
      }, durationMs);
    });
  }

  /**
   * Convert WebM/Opus audio to PCM Int16 format for Deepgram
   */
  private async convertToPCM(audioBlob: Blob): Promise<ArrayBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Get audio data (mono channel)
    const channelData = audioBuffer.getChannelData(0);

    // Convert Float32 to Int16 PCM
    const pcmData = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit integer
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    return pcmData.buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Start streaming audio for continuous transcription
   */
  startStreaming(onAudioChunk: (chunk: ArrayBuffer) => void): void {
    if (!this.mediaStream || !this.audioContext) {
      throw new Error('Audio capture not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      
      for (let i = 0; i < inputData.length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      onAudioChunk(pcmData.buffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
```

**Mobile Optimization**: Includes echo cancellation and noise suppression for mobile devices.[^5][^1]

### 3. React Hook Integration

#### **File: `src/hooks/useDeepgramLanguageDetection.ts`**

Custom hook for seamless integration:

```typescript
import { useState, useCallback, useRef } from 'react';
import { AudioCaptureManager } from '../utils/audioCapture';

export interface LanguageDetectionResult {
  language: string;
  geminiLanguageCode: string;
  confidence: number;
  alternatives?: Array<{
    language: string;
    confidence: number;
    geminiLanguageCode: string;
  }>;
}

export interface UseDeepgramLanguageDetectionReturn {
  detectLanguage: () => Promise<LanguageDetectionResult>;
  isDetecting: boolean;
  detectedLanguage: LanguageDetectionResult | null;
  error: string | null;
  reset: () => void;
}

export function useDeepgramLanguageDetection(): UseDeepgramLanguageDetectionReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioCaptureRef = useRef<AudioCaptureManager | null>(null);

  const detectLanguage = useCallback(async (): Promise<LanguageDetectionResult> => {
    setIsDetecting(true);
    setError(null);

    try {
      // Initialize audio capture
      if (!audioCaptureRef.current) {
        audioCaptureRef.current = new AudioCaptureManager();
      }
      await audioCaptureRef.current.initialize();

      // Capture 2-second audio sample
      const audioSample = await audioCaptureRef.current.captureInitialSample(2000);

      // Send to Vercel serverless function
      const response = await fetch('/api/deepgram-language-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: audioSample.base64Audio,
        }),
      });

      if (!response.ok) {
        throw new Error('Language detection API failed');
      }

      const result: LanguageDetectionResult = await response.json();
      setDetectedLanguage(result);
      
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Language detection failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDetecting(false);
      // Cleanup audio resources
      audioCaptureRef.current?.cleanup();
    }
  }, []);

  const reset = useCallback(() => {
    setDetectedLanguage(null);
    setError(null);
    setIsDetecting(false);
    audioCaptureRef.current?.cleanup();
    audioCaptureRef.current = null;
  }, []);

  return {
    detectLanguage,
    isDetecting,
    detectedLanguage,
    error,
    reset,
  };
}
```


### 4. Gemini Live Integration Enhancement

#### **File: `src/hooks/useGeminiLive.ts` (Modified)**

Update the existing hook to accept dynamic language configuration:

```typescript
// Add to the existing useGeminiLive hook interface
export interface UseGeminiLiveOptions {
  audioOutput?: boolean;
  inputLang?: string;  // EXISTING: currently hardcoded to 'nl-NL'
  systemPrompt?: string;
  // NEW: Add dynamic language code support
  dynamicLanguageCode?: string;  // BCP-47 code from Deepgram detection
}

// Modify the config section in useGeminiLive hook:
const config = {
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    // Use dynamicLanguageCode if provided, otherwise fall back to inputLang
    languageCode: options.dynamicLanguageCode || options.inputLang || 'en-US',
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Kore', // Configurable voice
      },
    },
  },
  // Enable input audio transcription for STT
  inputAudioTranscription: {},
  // Enable output audio transcription for debugging
  outputAudioTranscription: {},
  // Configure VAD for natural interruptions
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'START_SENSITIVITY_MEDIUM',
      endOfSpeechSensitivity: 'END_SENSITIVITY_MEDIUM',
      prefixPaddingMs: 100,
      silenceDurationMs: 300,
    },
  },
};
```

**Critical Addition**: The `inputAudioTranscription` config enables Gemini Live's built-in STT with the detected language.[^2][^4]

### 5. ChatInput Component Integration

#### **File: `src/components/ChatInput.tsx` (Modified)**

Integrate language detection into the mic button workflow:

```typescript
import { useDeepgramLanguageDetection } from '../hooks/useDeepgramLanguageDetection';

// Inside ChatInput component:
const {
  detectLanguage,
  isDetecting,
  detectedLanguage,
  error: detectionError,
  reset: resetDetection,
} = useDeepgramLanguageDetection();

// State for detected language display
const [showLanguageDetection, setShowLanguageDetection] = useState(false);

// Modified handleMicClick function:
const handleMicClick = async () => {
  if (isGeminiLiveMode) {
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
        // Pass the detected language to useGeminiLive hook
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
};

// Add language detection UI display:
{showLanguageDetection && detectedLanguage && (
  <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg p-3 shadow-lg border border-green-500/30 animate-fade-in">
    <div className="flex items-center gap-2">
      <span className="text-2xl">
        {detectedLanguage.language === 'nl' ? '🇳🇱' : 
         detectedLanguage.language === 'en' ? '🇬🇧' :
         detectedLanguage.language === 'de' ? '🇩🇪' :
         detectedLanguage.language === 'fr' ? '🇫🇷' : '🌐'}
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
```


### 6. Modified useGeminiLive Hook Signature

Update the hook to accept dynamic language:

```typescript
// Modify startGeminiLive to accept optional language parameter
export function useGeminiLive(options: UseGeminiLiveOptions) {
  const [dynamicLanguage, setDynamicLanguage] = useState<string | null>(null);
  
  const startGeminiLive = useCallback((detectedLanguageCode?: string) => {
    if (detectedLanguageCode) {
      setDynamicLanguage(detectedLanguageCode);
    }
    // Existing start logic with updated config
    startListening();
  }, []);
  
  // Use dynamicLanguage in config
  const config = {
    speechConfig: {
      languageCode: dynamicLanguage || options.inputLang || 'en-US',
      // ... rest of config
    },
  };
  
  return { startGeminiLive, /* other returns */ };
}
```


## Mobile-Specific Considerations

### iOS Safari Compatibility

Mobile Safari requires user interaction to access microphone:

```typescript
// Add to audioCapture.ts
export function isMobileSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

// Request permission explicitly on mobile
if (isMobileSafari()) {
  // Must be triggered by user gesture
  await navigator.mediaDevices.getUserMedia({ audio: true });
}
```


### Android Chrome Optimization

```typescript
// Optimize for Android Chrome
const constraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Android-specific
    googEchoCancellation: true,
    googNoiseSuppression: true,
    googAutoGainControl: true,
  },
};
```


## Environment Variables Setup

Add to Vercel dashboard (already configured according to spec):

```bash
DEEPGRAM_API_KEY=your_deepgram_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Access in Vercel functions via `process.env.DEEPGRAM_API_KEY`.[^1][^2]

## Testing on Mobile

1. **Deploy to Vercel** (localhost won't work for mobile HTTPS requirement)
2. **Test on real devices**, not emulators
3. **Grant microphone permissions** when prompted
4. **Speak for 2 seconds** for initial detection
5. **Verify language display** shows detected language
6. **Continue speaking** to test Gemini Live STT with correct language

## Key Improvements Over Original Spec

1. **Language Mapping**: Added Deepgram→Gemini BCP-47 code mapping[^4]
2. **Mobile Audio Processing**: PCM conversion works on iOS/Android[^5]
3. **Dynamic Language Injection**: Gemini Live config accepts detected language[^4]
4. **Error Handling**: Graceful fallback to default language
5. **UI Feedback**: Real-time language detection display
6. **VAD Configuration**: Optimized for natural conversation flow[^4]
7. **Input Audio Transcription**: Enabled in Gemini Live for accurate STT[^4]

## Cost Optimization

- Language detection: ~\$0.0001 per 2-second sample[^1]
- Cache detected language in session storage
- Only detect once per conversation session
- Estimated: **\$0.10/month for 100 users**[^1]

This implementation ensures Deepgram detects the language, then Gemini Live uses that language code for accurate bidirectional speech-to-text on mobile devices.[^3][^2][^1][^4]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: DEEPGRAM_STT_SPECIFICATION.md

[^2]: repomix-output.xml

[^3]: https://deepgram.com/learn/introducing-automatic-language-detection-capabilities

[^4]: https://ai.google.dev/gemini-api/docs/live-guide

[^5]: https://deepgram.com/learn/live-transcription-mic-browser

[^6]: https://deepgram.com/learn/best-speech-to-text-apis

[^7]: https://deepgram.com/learn/nova-2-best-speech-to-text-api-multiple-languages

[^8]: https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025

[^9]: https://deepgram.com/learn/deepgram-language-detection-conlang-experiment

[^10]: https://stackoverflow.com/questions/79597615/change-the-language-of-voximplants-gemini-live-api-client

[^11]: https://deepgram.com/learn/fetch-hosted-audio-streams-in-the-browser

[^12]: https://developers.deepgram.com/changelog/speech-to-text-changelog/2025/3/31

[^13]: https://github.com/orgs/deepgram/discussions/564

[^14]: https://ai.google.dev/gemini-api/docs/live

[^15]: https://developers.deepgram.com/docs/lower-level-websockets

[^16]: https://deepgram.com/learn/introducing-nova-3-speech-to-text-api

[^17]: https://cloud.google.com/vertex-ai/generative-ai/docs/live-api

[^18]: https://developers.deepgram.com/docs/tts-websocket

[^19]: https://developers.deepgram.com/changelog/speech-to-text-changelog

[^20]: https://support.google.com/gemini/answer/15984485?hl=en\&co=GENIE.Platform%3DAndroid

[^21]: https://developers.deepgram.com/docs/getting-started-with-the-streaming-test-suite

[^22]: https://geneo.app/query-reports/best-speech-recognition-api-developers

