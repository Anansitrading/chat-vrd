# Enhanced Deepgram STT Specification for Language Detection with Gemini Live Integration

Based on the codebase analysis and research, here's the comprehensive specification with implementation details for integrating Deepgram language detection with Gemini Live API language configuration.

## Critical Implementation Gap Identified

The original specification missed a **crucial integration point**: Deepgram language detection must dynamically set the `languageCode` in Gemini Live's `speechConfig` to ensure proper bidirectional speech recognition.[1][2][3][4]

## Enhanced Architecture Overview

The implementation requires a two-stage approach:
1. **Stage 1**: Deepgram detects language from initial audio sample (1-2 seconds)
2. **Stage 2**: Pass detected language to Gemini Live session configuration for proper STT

## Project Context

**App:** Kijko Video Brief Assistant  
**Current State:** Uses browser Web Speech API for speech-to-text  
**Goal:** Implement Deepgram for automatic language detection and reliable STT across all browsers  
**Priority:** High - Web Speech API is unreliable on mobile browsers

---

## 1. Requirements

### 1.1 Functional Requirements

**FR-1: Automatic Language Detection**
- When user clicks microphone button, capture 1-2 seconds of audio
- Send audio sample to Deepgram for language detection
- Detect spoken language (Dutch, English, etc.) with confidence scores
- Display detected language to user

**FR-2: Speech-to-Text Transcription**
- After language detection, continue streaming audio to Deepgram
- Use detected language for accurate transcription
- Display transcript in real-time as user speaks
- Support continuous speech recognition

**FR-3: Fallback Mechanism**
- If Deepgram API fails, fall back to Web Speech API
- Show clear error messages if both fail
- Allow user to retry or type manually

**FR-4: Browser Compatibility**
- Must work on desktop Chrome, Firefox, Safari
- Must work on mobile Chrome (Android)
- Must work on mobile Safari (iOS) - currently unsupported by Web Speech API

### 1.2 Non-Functional Requirements

**NFR-1: Performance**
- Language detection latency < 500ms
- Real-time transcription with minimal lag
- Efficient audio streaming (low bandwidth)

**NFR-2: Security**
- API keys stored securely in Vercel environment variables
- Audio data encrypted in transit
- No audio stored on server after transcription

**NFR-3: Cost Efficiency**
- Minimize Deepgram API usage
- Only detect language once per session
- Cache language preference for user

---

## 2. Current Architecture

### 2.1 Existing Components

**File:** `src/hooks/useSpeechToText.ts`
- Uses browser's `SpeechRecognition` API
- Supports continuous listening
- Language set to `nl-NL` (Dutch) by default
- Returns: `{ isListening, transcript, startListening, stopListening, isSttSupported }`

**File:** `src/components/ChatInput.tsx`
- Renders microphone button (line 168-192)
- `handleMicClick()` toggles listening on/off (line 112-128)
- Displays transcript in textarea
- Two modes: Web Speech API mode and Gemini Live mode

**File:** `api/generate-token.ts`
- Vercel serverless function
- Creates ephemeral tokens for Gemini Live
- Already has environment variable pattern: `GEMINI_API_KEY`

### 2.2 Environment Variables (Already Set)

- `DEEPGRAM_API_KEY` ✅ Already configured in Vercel
- `GEMINI_API_KEY` ✅ Already configured in Vercel
- `VITE_SUPABASE_URL` ✅ Already configured
- `VITE_SUPABASE_ANON_KEY` ✅ Already configured

---

## 3. Implementation Design

### 3.1 New Files to Create

**1. `api/deepgram-language-detect.ts`**
```typescript
// Vercel serverless function
// Accepts: base64 PCM audio sample (1-2 seconds)
// Returns: { language: 'nl', confidence: 0.95 }
```

**2. `api/deepgram-transcribe.ts`**
```typescript
// Vercel serverless function
// Accepts: streaming audio chunks
// Returns: real-time transcription stream
```

**3. `src/hooks/useDeepgramSTT.ts`**
```typescript
// React hook for Deepgram integration
// Handles: language detection, audio capture, streaming, transcription
// Returns: same interface as useSpeechToText for easy replacement
```

**4. `src/utils/audioCapture.ts`**
```typescript
// Utility functions for:
// - Capturing microphone audio
// - Converting to PCM Int16 format
// - Base64 encoding
// - Streaming audio chunks
```

### 3.2 Modified Files

**1. `src/components/ChatInput.tsx`**
```typescript
// Add toggle: Web Speech API vs Deepgram
// Add language detection UI (show detected language)
// Update handleMicClick() to use Deepgram when enabled
```

**2. `src/contexts/SettingsContext.tsx`** (if exists, else create)
```typescript
// Add setting: preferDeepgram (boolean)
// Store detected language preference
// Allow user to choose STT provider
```

---

## 4. Implementation Flow

### 4.1 User Clicks Microphone Button

```
1. User clicks mic button in ChatInput
2. Request microphone permission
3. Capture 1-2 seconds of audio sample
4. Convert audio to PCM Int16, 16kHz, mono
5. Base64 encode audio
6. Send to /api/deepgram-language-detect
7. Display detected language (e.g., "🇳🇱 Dutch detected")
8. Start continuous streaming to /api/deepgram-transcribe
9. Display real-time transcript
10. On stop, finalize transcript and populate textarea
```

### 4.2 API Flow

**Deepgram Language Detection:**
```
POST /api/deepgram-language-detect
Body: { audioBase64: "..." }

→ Deepgram Prerecorded API
→ Language detection model

Response: {
  language: "nl",
  confidence: 0.95,
  alternatives: [
    { language: "en", confidence: 0.03 },
    { language: "de", confidence: 0.02 }
  ]
}
```

**Deepgram Streaming Transcription:**
```
WebSocket /api/deepgram-transcribe
Body: { language: "nl", audioChunks: [...] }

→ Deepgram Live Streaming API
→ Real-time transcription

Response (streaming): {
  transcript: "Hallo, ik ben...",
  isFinal: false
}
```

---

## 5. Deepgram API Integration

### 5.1 Language Detection Endpoint

**Deepgram API:** Prerecorded Audio API  
**Endpoint:** `https://api.deepgram.com/v1/listen`  
**Parameters:**
- `model=nova-2`
- `detect_language=true`
- `punctuate=true`
- `smart_format=true`

**Audio Format:**
- PCM Int16, 16kHz, mono
- 1-2 seconds duration
- ~32KB per second

### 5.2 Streaming Transcription Endpoint

**Deepgram API:** Live Streaming API  
**Endpoint:** `wss://api.deepgram.com/v1/listen`  
**Parameters:**
- `model=nova-2`
- `language=nl` (use detected language)
- `punctuate=true`
- `interim_results=true`
- `endpointing=500` (ms of silence before finalizing)

---

## 6. UI/UX Considerations

### 6.1 Language Detection Display

```
[Mic Button] 🎤 Listening...
└─ 🇳🇱 Dutch detected (95% confidence)
```

### 6.2 Settings Toggle

```
⚙️ Speech-to-Text Settings
┌─────────────────────────────┐
│ ☐ Use Deepgram (recommended)│
│ ☑ Use Browser Speech API    │
│                              │
│ Last detected: Dutch (nl-NL) │
└─────────────────────────────┘
```

### 6.3 Error States

- "Microphone access denied"
- "Deepgram API unavailable (using fallback)"
- "Language detection failed (defaulting to Dutch)"
- "Transcription service unavailable"

---

## 7. Testing Requirements

### 7.1 Unit Tests

- Audio capture and format conversion
- Base64 encoding/decoding
- API endpoint error handling
- Fallback mechanism

### 7.2 Integration Tests

- Language detection with Dutch audio sample
- Language detection with English audio sample
- Streaming transcription accuracy
- Fallback to Web Speech API when Deepgram fails

### 7.3 Browser Compatibility Tests

| Browser | Platform | STT Support | Expected Result |
|---------|----------|-------------|-----------------|
| Chrome | Desktop | ✅ | Deepgram + Web Speech fallback |
| Firefox | Desktop | ✅ | Deepgram + Web Speech fallback |
| Safari | Desktop | ✅ | Deepgram + Web Speech fallback |
| Chrome | Android | ⚠️ Partial | Deepgram (primary), Web Speech (unreliable) |
| Safari | iOS | ❌ None | Deepgram only (Web Speech unsupported) |

---

## 8. Cost Estimation

### 8.1 Deepgram Pricing

**Pay-as-you-go:**
- $0.0043 per minute of audio (Nova-2 model)
- Language detection: ~$0.0001 per request (1-2 seconds)
- Free tier: $200 credit

**Monthly Estimate (100 users, 10 mins/user/month):**
- 100 users × 10 minutes × $0.0043 = **$4.30/month**
- Language detection: 100 users × 10 sessions × $0.0001 = **$0.10/month**
- **Total: ~$4.40/month**

### 8.2 Cost Optimization

- Cache detected language per user session
- Only detect language once per conversation
- Use interim results to reduce final transcription calls
- Consider batch processing for non-real-time use cases

---

## 9. Implementation Phases

### Phase 1: Backend API (Week 1)
- [ ] Create `/api/deepgram-language-detect.ts`
- [ ] Create `/api/deepgram-transcribe.ts`
- [ ] Test with Postman/curl
- [ ] Add error handling and logging

### Phase 2: Frontend Hook (Week 1)
- [ ] Create `src/hooks/useDeepgramSTT.ts`
- [ ] Create `src/utils/audioCapture.ts`
- [ ] Match interface with `useSpeechToText`
- [ ] Add language detection state

### Phase 3: UI Integration (Week 2)
- [ ] Update `ChatInput.tsx` with Deepgram option
- [ ] Add language detection display
- [ ] Add settings toggle
- [ ] Add error states and fallback

### Phase 4: Testing & Refinement (Week 2)
- [ ] Test on all browsers
- [ ] Test mobile devices (real devices, not emulator!)
- [ ] Optimize audio streaming
- [ ] Add telemetry/monitoring

---

## 10. Success Criteria

✅ **Must Have:**
1. Language detection works with <500ms latency
2. Transcription accuracy ≥90% for Dutch and English
3. Works on iOS Safari (currently unsupported)
4. Graceful fallback to Web Speech API
5. No increase in perceived latency vs current implementation

✅ **Nice to Have:**
1. Support for additional languages (German, French, Spanish)
2. Confidence scores displayed to user
3. User can override detected language
4. Audio quality indicator (volume meter)
5. Offline mode with service worker caching

---

## 11. Dependencies

**NPM Packages:**
- `@deepgram/sdk` (official Deepgram Node SDK)
- Already installed: `@vercel/node`, `@google/genai`

**APIs:**
- Deepgram API v1
- Browser MediaStream API
- Web Audio API

**Infrastructure:**
- Vercel Serverless Functions
- Environment variables already configured

---

## 12. Rollout Strategy

### 12.1 Feature Flag

```typescript
// src/config/features.ts
export const FEATURES = {
  DEEPGRAM_STT: process.env.VITE_ENABLE_DEEPGRAM === 'true',
  WEB_SPEECH_FALLBACK: true,
};
```

### 12.2 Gradual Rollout

1. **Week 1:** Deploy to staging only
2. **Week 2:** Enable for 10% of users (A/B test)
3. **Week 3:** Enable for 50% of users
4. **Week 4:** Enable for 100% of users
5. Monitor error rates, transcription accuracy, costs

---

## 13. Monitoring & Observability

### 13.1 Metrics to Track

- Language detection success rate
- Language detection latency (P50, P95, P99)
- Transcription accuracy (via user feedback)
- Fallback rate (Deepgram → Web Speech)
- API error rate
- Monthly Deepgram costs

### 13.2 Logging

- Log all language detection requests
- Log transcription failures
- Log fallback triggers
- Log user feedback on accuracy

---

## 14. Documentation

- [ ] User guide: How to use voice input
- [ ] Developer guide: Deepgram integration architecture
- [ ] API documentation: Endpoint specs
- [ ] Troubleshooting guide: Common issues
- [ ] FAQ: Language support, accuracy, costs

---

## 15. Open Questions

1. Should we cache detected language in localStorage?
2. Should we allow user to manually select language?
3. What happens if user switches languages mid-conversation?
4. Should we support offline mode with Web Speech API fallback?
5. How do we handle multi-lingual input (code-switching)?

---

**Next Steps:**
1. Review this specification with stakeholders
2. Get approval on architecture and approach
3. Set up Deepgram account and test API
4. Create development branch
5. Implement Phase 1 (Backend APIs)

---

**Created:** January 30, 2025  
**Author:** AI Assistant  
**Status:** Draft - Pending Review