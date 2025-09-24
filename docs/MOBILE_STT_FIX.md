# Mobile Speech-to-Text Fix Implementation Guide

## Problem Summary
Mobile STT is producing duplicate words and unreliable transcription while desktop works perfectly. The issue stems from known Web Speech API bugs on mobile browsers.

## Root Causes
1. **Continuous mode issues on mobile**: Chrome Android has bugs with `continuous: true`
2. **Interim results causing duplicates**: `interimResults: true` amplifies instability
3. **iOS has NO Web Speech API support**: Complete lack of native support
4. **Session auto-stopping**: Recognition stops after single utterance on mobile

## Immediate Fix Implementation

### Step 1: Update useSpeechToText.ts Hook

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

// ... (keep existing interfaces)

export const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const lastProcessedRef = useRef<string>('');
  
  const SpeechRecognitionAPI = getSpeechRecognition();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Deduplication function
  const deduplicateTranscript = (text: string): string => {
    const words = text.split(' ');
    const deduplicated: string[] = [];
    let lastWord = '';
    
    for (const word of words) {
      if (word && word !== lastWord) {
        deduplicated.push(word);
        lastWord = word;
      }
    }
    
    return deduplicated.join(' ');
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback((language: string = 'en-US') => {
    if (!SpeechRecognitionAPI) {
      console.error('Speech recognition not supported');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI();
    
    // Mobile-optimized settings
    if (isMobile) {
      recognition.continuous = false; // CRITICAL: false for mobile
      recognition.interimResults = false; // CRITICAL: false for mobile
      recognition.maxAlternatives = 1;
    } else {
      // Desktop can handle continuous
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    }
    
    // Support multiple languages
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      if (!isMobile) {
        setTranscript('');
        finalTranscriptRef.current = '';
      }
    };

    recognition.onend = () => {
      // Auto-restart for mobile to simulate continuous
      if (isMobile && isListening) {
        // Small delay to prevent rapid restarts
        setTimeout(() => {
          if (isListening) {
            startListening(language);
          }
        }, 100);
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle specific mobile errors
      if (event.error === 'no-speech' && isMobile) {
        // Common on mobile, just restart
        if (isListening) {
          setTimeout(() => startListening(language), 100);
        }
      } else if (event.error === 'not-allowed') {
        // Microphone permission denied
        setIsListening(false);
        recognitionRef.current = null;
      } else if (event.error === 'network') {
        // Network issue, retry
        if (isListening) {
          setTimeout(() => startListening(language), 500);
        }
      } else {
        stopListening();
      }
    };

    recognition.onresult = (event) => {
      if (isMobile) {
        // Mobile: Simple processing without interim results
        const result = event.results[0];
        if (result && result.isFinal) {
          const newText = result[0].transcript;
          
          // Prevent duplicate processing
          if (newText !== lastProcessedRef.current) {
            lastProcessedRef.current = newText;
            const cleanText = deduplicateTranscript(newText);
            
            // Append to existing transcript with space
            setTranscript(prev => {
              const combined = prev ? `${prev} ${cleanText}` : cleanText;
              return deduplicateTranscript(combined);
            });
          }
        }
      } else {
        // Desktop: Full processing with interim results
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Update final transcript reference
        if (finalTranscript) {
          finalTranscriptRef.current += ' ' + finalTranscript;
        }

        // Combine and deduplicate
        const fullTranscript = finalTranscriptRef.current + ' ' + interimTranscript;
        setTranscript(deduplicateTranscript(fullTranscript.trim()));
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionAPI, isMobile, isListening]);

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
    isMobile,
    clearTranscript: () => {
      setTranscript('');
      finalTranscriptRef.current = '';
      lastProcessedRef.current = '';
    }
  };
};
```

### Step 2: Update GeminiVoiceChat.tsx

```typescript
// In GeminiVoiceChat component, update the speech recognition setup:

useEffect(() => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Detect mobile and adjust settings
    const isMobile = /android|webos|iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
    
    recognitionRef.current.continuous = !isMobile; // False for mobile
    recognitionRef.current.interimResults = !isMobile; // False for mobile
    recognitionRef.current.maxAlternatives = 1;
    
    // Support Dutch and English
    recognitionRef.current.lang = 'en-US'; // Can be switched to 'nl-NL'

    recognitionRef.current.onresult = (event) => {
      // Get the last result (most confident)
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult[0]) {
        const transcript = lastResult[0].transcript;
        
        // Simple deduplication for mobile
        if (isMobile) {
          const deduplicated = transcript.split(' ')
            .filter((word, index, arr) => index === 0 || word !== arr[index - 1])
            .join(' ');
          setInputText(deduplicated);
        } else {
          setInputText(transcript);
        }
      }
      setIsListening(false);
    };

    // Mobile-specific error handling
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech' && isMobile) {
        // Common on mobile, restart if needed
        setError('No speech detected. Please try again.');
      } else {
        setError('Speech recognition failed. Please try again.');
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }

  return () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
}, []);
```

### Step 3: Add Language Switcher Component

```typescript
// New component: LanguageSelector.tsx
import React from 'react';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  currentLanguage, 
  onLanguageChange 
}) => {
  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'nl-NL', name: 'Nederlands' },
    { code: 'nl-BE', name: 'Nederlands (België)' }
  ];

  return (
    <select 
      value={currentLanguage} 
      onChange={(e) => onLanguageChange(e.target.value)}
      className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};
```

### Step 4: Update ChatInput.tsx for Mobile

```typescript
// In ChatInput.tsx, add mobile-specific handling:

const ChatInput: React.FC<ChatInputProps> = ({ /* ... */ }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    isSttSupported,
    isMobile,
    clearTranscript 
  } = useSpeechToText();

  // Mobile push-to-talk handler
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript(); // Clear previous transcript on mobile
      startListening(selectedLanguage);
    }
  };

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  return (
    <div className="chat-input-container">
      {/* Language selector */}
      {isSttSupported && (
        <LanguageSelector 
          currentLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
        />
      )}

      {/* Voice input button - Push-to-talk style for mobile */}
      {isSttSupported && (
        <button
          type="button"
          onMouseDown={isMobile ? undefined : () => startListening(selectedLanguage)}
          onMouseUp={isMobile ? undefined : stopListening}
          onTouchStart={isMobile ? () => startListening(selectedLanguage) : undefined}
          onTouchEnd={isMobile ? stopListening : undefined}
          onClick={!isMobile ? handleVoiceInput : undefined}
          className={`voice-button ${isListening ? 'listening' : ''}`}
          aria-label={isMobile ? "Tap and hold to speak" : "Click to toggle voice input"}
        >
          <Mic className={isListening ? 'text-red-500 animate-pulse' : ''} />
        </button>
      )}

      {/* Show listening indicator on mobile */}
      {isMobile && isListening && (
        <div className="text-xs text-red-500 animate-pulse">
          Listening...
        </div>
      )}

      {/* Input field */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        // ... other props
      />
    </div>
  );
};
```

## Alternative: Cloud-Based STT for iOS Support

Since iOS doesn't support Web Speech API at all, consider implementing a cloud-based solution:

### Option 1: Google Cloud Speech-to-Text
```typescript
// services/googleCloudSTT.ts
export class GoogleCloudSTT {
  private apiKey: string;
  
  async transcribeAudio(audioBlob: Blob, language: string = 'en-US'): Promise<string> {
    const base64Audio = await this.blobToBase64(audioBlob);
    
    const response = await fetch('/api/speech-to-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Audio,
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: language,
          enableAutomaticPunctuation: true,
          model: 'latest_long'
        }
      })
    });
    
    const result = await response.json();
    return result.transcript;
  }
  
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  }
}
```

### Option 2: Use react-speech-recognition with Push-to-Talk
Based on the library documentation, implement like this:

```typescript
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const MobileSafeVoiceInput = () => {
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening
  } = useSpeechRecognition({ 
    clearTranscriptOnListen: true // Clear on each new session
  });

  const startListening = () => {
    // Use non-continuous mode for mobile
    SpeechRecognition.startListening({ 
      continuous: false,
      language: 'nl-NL' // or 'en-US'
    });
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Speech recognition not supported</span>;
  }

  return (
    <div>
      <button 
        onTouchStart={startListening}
        onTouchEnd={SpeechRecognition.stopListening}
      >
        Hold to Talk
      </button>
      <p>{transcript}</p>
    </div>
  );
};
```

## Testing Checklist

1. **Mobile Chrome (Android)**
   - [ ] No duplicate words in transcript
   - [ ] Push-to-talk works reliably
   - [ ] Language switching works
   - [ ] Error recovery works

2. **Mobile Safari (iOS)**
   - [ ] Fallback message shown (no native support)
   - [ ] Consider cloud STT implementation

3. **Desktop browsers**
   - [ ] Continuous mode still works
   - [ ] Interim results work correctly
   - [ ] No regression in functionality

## Summary

The fix involves:
1. Detecting mobile devices
2. Disabling `continuous` and `interimResults` on mobile
3. Implementing push-to-talk pattern for mobile
4. Adding transcript deduplication
5. Auto-restarting recognition on mobile to simulate continuous
6. Supporting Dutch and English languages
7. Proper error handling for mobile-specific issues

This approach maintains excellent desktop performance while fixing mobile reliability issues.