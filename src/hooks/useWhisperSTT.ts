import { useState, useCallback } from 'react';

export interface WhisperTranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segments?: Array<{
    id: number;
    text: string;
    start: number;
    end: number;
    language?: string;
  }>;
}

export interface UseWhisperSTTOptions {
  onTranscriptionComplete?: (result: WhisperTranscriptionResult) => void;
  onError?: (error: Error) => void;
  apiEndpoint?: string;
}

export const useWhisperSTT = (options: UseWhisperSTTOptions = {}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const {
    onTranscriptionComplete,
    onError,
    apiEndpoint = '/api/whisper-transcribe',
  } = options;

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    setTranscript('');
    setDetectedLanguage('');

    try {
      // Create form data with the audio file
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: audioBlob.type || 'audio/webm',
      });
      formData.append('audio', audioFile);

      // Send to API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data: WhisperTranscriptionResult = await response.json();

      // Update state
      setTranscript(data.text);
      setDetectedLanguage(data.language || '');

      // Log detected language for debugging
      if (data.language) {
        console.log(`Whisper detected language: ${getLanguageName(data.language)}`);
      }

      // Handle segments if available (for mixed-language detection)
      if (data.segments && data.segments.length > 0) {
        console.log('Language segments detected:', data.segments);
      }

      // Callback with full result
      onTranscriptionComplete?.(data);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error('Whisper transcription error:', error);
      setError(error.message);
      onError?.(error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [apiEndpoint, onTranscriptionComplete, onError]);

  const reset = useCallback(() => {
    setTranscript('');
    setDetectedLanguage('');
    setError(null);
    setIsTranscribing(false);
  }, []);

  const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
      'en': 'English',
      'nl': 'Dutch',
      'de': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'ru': 'Russian',
    };
    return languages[code] || code;
  };

  const getLanguageFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'en': '🇬🇧',
      'nl': '🇳🇱',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'es': '🇪🇸',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      'ru': '🇷🇺',
    };
    return flags[code] || '🌐';
  };

  return {
    // State
    isTranscribing,
    transcript,
    detectedLanguage,
    error,
    
    // Actions
    transcribeAudio,
    reset,
    
    // Helpers
    getLanguageName,
    getLanguageFlag,
  };
};