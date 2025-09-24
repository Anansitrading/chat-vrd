# Multilingual Auto-Detect STT Solutions Guide

## Executive Summary

Based on comprehensive research, **OpenAI Whisper is the ONLY solution that provides true automatic language detection** for Dutch/English with the ability to handle code-switching (switching languages mid-stream). All other major providers require pre-selecting the language.

## Comparison Table: Auto Language Detection Support

| Service | Auto-Detect Dutch/English | Mid-Stream Switching | Mobile Support | Accuracy | Implementation Complexity |
|---------|--------------------------|---------------------|----------------|----------|--------------------------|
| **OpenAI Whisper** | ✅ Full | ✅ Yes | ✅ Via API | Excellent | Medium |
| **Azure Speech** | ⚠️ Partial (shortlist) | ❌ No | ✅ Yes | Good | Low |
| **Google Cloud** | ❌ No | ❌ No | ✅ Yes | Good (EN), Fair (NL) | Low |
| **AWS Transcribe** | ❌ No | ❌ No | ✅ Yes | Good | Low |
| **Deepgram** | ⚠️ Partial | ❌ Limited | ✅ Yes | Good | Low |
| **AssemblyAI** | ❌ No | ❌ No | ✅ Yes | Good | Low |
| **Web Speech API** | ❌ No | ❌ No | ⚠️ Android only | Variable | Very Low |

## Solution 1: OpenAI Whisper (RECOMMENDED for Auto-Detect)

### Why Whisper is Best for Auto-Detect:
- **True automatic language detection** - no need to specify language
- **Handles code-switching** - can detect Dutch and English in same audio
- **High accuracy** for both Dutch and English
- **Works on all platforms** including iOS

### Implementation Options:

#### Option A: Whisper API Service (Easiest for Production)

```typescript
// services/whisperSTT.ts
export class WhisperSTT {
  private apiEndpoint: string;

  constructor() {
    // Use a hosted Whisper API service
    this.apiEndpoint = process.env.REACT_APP_WHISPER_API_URL || '';
  }

  async transcribeAudio(audioBlob: Blob): Promise<{ 
    text: string; 
    language: string;
    segments?: Array<{text: string; language: string}>
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    // No language parameter needed - Whisper auto-detects!
    formData.append('task', 'transcribe');
    formData.append('response_format', 'verbose_json');

    const response = await fetch(`${this.apiEndpoint}/transcribe`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    return {
      text: result.text,
      language: result.language, // Auto-detected language!
      segments: result.segments // Each segment has its own language
    };
  }
}
```

#### Option B: Using Insanely Fast Whisper API (Open Source)

```bash
# Deploy your own Whisper API using Docker
docker run -d -p 8000:8000 \
  --gpus all \
  -v whisper-models:/root/.cache/huggingface \
  jigsawstack/insanely-fast-whisper-api:latest
```

```typescript
// services/whisperService.ts
export class WhisperService {
  private apiUrl = 'http://localhost:8000'; // Or your deployed URL

  async transcribeWithAutoDetect(audioFile: File): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    // No language parameter - let Whisper detect it!
    const response = await fetch(`${this.apiUrl}/v1/transcribe`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    // Whisper returns detected language
    console.log('Detected language:', result.language);
    
    return {
      text: result.text,
      language: result.language,
      confidence: result.language_probability,
      segments: result.segments // Each can have different language
    };
  }
}
```

#### Option C: Client-Side Whisper (Using WASM)

```typescript
// Using whisper.cpp compiled to WASM for browser
import { WhisperWorker } from '@xenova/transformers';

export class ClientWhisperSTT {
  private worker: WhisperWorker;

  async initialize() {
    // Load Whisper Tiny model (39M params) for browser
    this.worker = new WhisperWorker({
      model: 'openai/whisper-tiny',
      multilingual: true,
      language: null // Auto-detect mode
    });
  }

  async transcribe(audioBlob: Blob): Promise<{text: string; language: string}> {
    const audioData = await this.blobToFloat32Array(audioBlob);
    
    const result = await this.worker.transcribe(audioData, {
      language: null, // Auto-detect
      task: 'transcribe',
      return_timestamps: true
    });

    // Result includes detected language
    return {
      text: result.text,
      language: result.language // 'nl' or 'en' detected automatically
    };
  }

  private async blobToFloat32Array(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
  }
}
```

### Complete Mobile Implementation with Whisper

```typescript
// components/WhisperVoiceInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { WhisperSTT } from '../services/whisperSTT';

export const WhisperVoiceInput: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const whisperService = useRef(new WhisperSTT());

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' 
        });
        
        try {
          // Whisper automatically detects the language!
          const result = await whisperService.current.transcribeAudio(audioBlob);
          
          setTranscript(result.text);
          setDetectedLanguage(result.language);
          
          // Show which language was detected
          console.log(`Whisper detected: ${result.language === 'nl' ? 'Dutch' : 'English'}`);
          
          // Handle mixed-language segments if available
          if (result.segments) {
            result.segments.forEach(segment => {
              console.log(`[${segment.language}]: ${segment.text}`);
            });
          }
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setIsProcessing(false);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      'en': '🇬🇧',
      'nl': '🇳🇱',
      'en-US': '🇺🇸',
      'nl-NL': '🇳🇱'
    };
    return flags[lang] || '🌐';
  };

  return (
    <div className="whisper-voice-input">
      {/* Push-to-talk button for mobile */}
      <button
        className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <span>Processing...</span>
        ) : isRecording ? (
          <span>🔴 Recording</span>
        ) : (
          <span>🎤 Hold to Talk</span>
        )}
      </button>

      {/* Show detected language */}
      {detectedLanguage && (
        <div className="detected-language">
          Detected: {getLanguageFlag(detectedLanguage)} {detectedLanguage}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="transcript">
          <p>{transcript}</p>
        </div>
      )}

      {/* Status for mobile */}
      <div className="status-text">
        {isRecording && "Listening... Speak in any language!"}
        {isProcessing && "Detecting language and transcribing..."}
        {!isRecording && !isProcessing && transcript && 
          `Transcribed from ${detectedLanguage === 'nl' ? 'Dutch' : 'English'}`
        }
      </div>
    </div>
  );
};
```

## Solution 2: Azure Speech Services (Partial Auto-Detect)

Azure requires you to provide a shortlist of possible languages (max 4), but then can auto-detect between them:

```typescript
// services/azureSTT.ts
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSTT {
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.REACT_APP_AZURE_SPEECH_KEY!,
      process.env.REACT_APP_AZURE_REGION!
    );
  }

  async transcribeWithLanguageDetection(audioBlob: Blob): Promise<{
    text: string;
    detectedLanguage: string;
  }> {
    // Create auto-detect config with Dutch and English
    const autoDetectConfig = sdk.AutoDetectSourceLanguageConfig.fromLanguages([
      "en-US",
      "en-GB", 
      "nl-NL",
      "nl-BE"
    ]);

    const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBlob);
    
    const recognizer = new sdk.SpeechRecognizer(
      this.speechConfig,
      autoDetectConfig,
      audioConfig
    );

    return new Promise((resolve, reject) => {
      let fullText = '';
      let detectedLang = '';

      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          fullText += e.result.text + ' ';
          
          // Get detected language from result
          const languageDetectionResult = e.result.properties.getProperty(
            sdk.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguageResult
          );
          
          detectedLang = JSON.parse(languageDetectionResult).Language;
        }
      };

      recognizer.sessionStopped = () => {
        recognizer.close();
        resolve({
          text: fullText.trim(),
          detectedLanguage: detectedLang
        });
      };

      recognizer.canceled = (s, e) => {
        recognizer.close();
        reject(new Error(e.errorDetails));
      };

      recognizer.startContinuousRecognitionAsync();
    });
  }
}
```

## Solution 3: Fallback Web Implementation with Manual Language Toggle

For maximum compatibility without cloud services:

```typescript
// components/SmartVoiceInput.tsx
import React, { useState, useEffect } from 'react';
import { WhisperSTT } from '../services/whisperSTT';
import { useSpeechToText } from '../hooks/useSpeechToText';

export const SmartVoiceInput: React.FC = () => {
  const [useWhisper, setUseWhisper] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const whisperService = new WhisperSTT();
  const webSpeech = useSpeechToText();

  // Detect iOS and automatically use Whisper
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setUseWhisper(true); // Force Whisper on iOS
    }
  }, []);

  const handleVoiceInput = async () => {
    if (useWhisper || selectedLanguage === 'auto') {
      // Use Whisper for auto-detect or iOS
      await handleWhisperInput();
    } else {
      // Use Web Speech API with manual language
      handleWebSpeechInput();
    }
  };

  const handleWhisperInput = async () => {
    // Record audio and send to Whisper
    // Whisper will auto-detect language
  };

  const handleWebSpeechInput = () => {
    // Use Web Speech API with selected language
    const langCode = selectedLanguage === 'nl' ? 'nl-NL' : 'en-US';
    webSpeech.startListening(langCode);
  };

  return (
    <div className="smart-voice-input">
      {/* Language selector */}
      <select 
        value={selectedLanguage} 
        onChange={(e) => setSelectedLanguage(e.target.value)}
      >
        <option value="auto">🌐 Auto-Detect (Whisper)</option>
        <option value="en">🇬🇧 English (Fast)</option>
        <option value="nl">🇳🇱 Nederlands (Fast)</option>
      </select>

      {/* Voice button */}
      <button onClick={handleVoiceInput}>
        {selectedLanguage === 'auto' ? '🎤 Speak Any Language' : '🎤 Speak'}
      </button>

      {/* Status indicator */}
      {selectedLanguage === 'auto' && (
        <p className="text-xs text-gray-500">
          Using Whisper AI for automatic language detection
        </p>
      )}
    </div>
  );
};
```

## Deployment Options for Whisper

### 1. **Replicate API** (Easiest, Pay-per-use)
```typescript
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${REPLICATE_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    version: 'openai/whisper',
    input: {
      audio: audioBase64,
      model: 'large-v3',
      language: 'auto' // Auto-detect!
    }
  })
});
```

### 2. **Hugging Face Inference API** (Free tier available)
```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'audio/wav'
    },
    body: audioBlob
  }
);
```

### 3. **Self-Hosted** (Most control, requires server)
```bash
# Using faster-whisper for better performance
pip install faster-whisper
```

```python
from faster_whisper import WhisperModel

model = WhisperModel("large-v3", device="cuda")
segments, info = model.transcribe(
    "audio.mp3",
    language=None,  # Auto-detect
    task="transcribe"
)

print(f"Detected language: {info.language}")
print(f"Language probability: {info.language_probability}")

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

## Summary & Recommendations

### For Your Use Case (Dutch/English Auto-Detect on Mobile):

1. **Best Solution**: **OpenAI Whisper**
   - Only solution with true auto-detect
   - Handles code-switching (mixed Dutch/English)
   - Works on all platforms including iOS
   - High accuracy for both languages

2. **Implementation Strategy**:
   - Use Whisper API for mobile (all platforms)
   - Fall back to Web Speech API for desktop when language is pre-selected
   - Provide manual language toggle as backup option

3. **Quick Start**:
   - Deploy Whisper using Replicate or Hugging Face (easiest)
   - Or use Insanely Fast Whisper API Docker container
   - Implement push-to-talk for mobile with auto-detect

4. **Cost Considerations**:
   - Whisper via Replicate: ~$0.0005 per second of audio
   - Hugging Face: Free tier available
   - Self-hosted: Only infrastructure costs

The key advantage of Whisper is that users can speak naturally in either Dutch or English (or even mix them), and the system will correctly transcribe without any manual language selection needed.