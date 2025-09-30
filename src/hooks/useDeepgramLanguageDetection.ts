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
        const errorData = await response.json();
        console.error('===== DEEPGRAM API ERROR RESPONSE =====');
        console.error('Status:', response.status);
        console.error('Error Data:', errorData);
        console.error('Debug Info:', errorData.debug);
        console.error('======================================');
        throw new Error(`Language detection API failed: ${JSON.stringify(errorData)}`);
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