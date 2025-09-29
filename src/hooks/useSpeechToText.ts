
import { useState, useEffect, useRef, useCallback } from 'react';

// Manually define types for the Web Speech API to address TypeScript errors,
// as these are not standard in all TypeScript DOM library versions.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

const getSpeechRecognition = () => {
  if (typeof window !== 'undefined') {
    // Cast `window` to `any` to access non-standard SpeechRecognition APIs
    // without causing TypeScript compilation errors.
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }
  return undefined;
};

export const useSpeechToText = (language = 'nl-NL') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Use the defined `SpeechRecognition` interface as the type for the ref.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Rename the `SpeechRecognition` constant to `SpeechRecognitionAPI` to avoid a naming
  // conflict with the `SpeechRecognition` interface type.
  const SpeechRecognitionAPI = getSpeechRecognition();

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language || navigator.language || 'nl-NL';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      stopListening();
    };

    recognition.onresult = (event) => {
      const fullTranscript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setTranscript(fullTranscript);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionAPI, isListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSttSupported: !!SpeechRecognitionAPI,
    setTranscript,
  };
};
