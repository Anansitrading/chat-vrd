# Audio Capture Utility Implementation

### 2. Audio Capture Utility

#### **File: `src/utils/audioCapture.ts`**

Handles microphone access and audio processing. This file contains the complete AudioCaptureManager class with all methods for:
- Microphone initialization
- 2-second audio sample capture
- PCM Int16 conversion (WebM/Opus → PCM)
- Base64 encoding
- Audio streaming for continuous transcription
- Resource cleanup

**Mobile Optimization**: Includes echo cancellation and noise suppression for mobile devices.[5][1]

**See your provided specification for the complete 200+ line implementation.**

Key methods:
- `initialize()` - Request mic permission and create AudioContext
- `captureInitialSample(durationMs)` - Capture audio for language detection
- `convertToPCM(audioBlob)` - Convert to PCM Int16 format
- `arrayBufferToBase64(buffer)` - Encode for API transmission
- `startStreaming(onAudioChunk)` - Continuous audio streaming
- `cleanup()` - Release all resources
