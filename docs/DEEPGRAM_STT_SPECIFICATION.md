# Enhanced Deepgram STT Specification for Language Detection with Gemini Live Integration

Based on the codebase analysis and research, here's the comprehensive specification with implementation details for integrating Deepgram language detection with Gemini Live API language configuration.

## Critical Implementation Gap Identified

The original specification missed a **crucial integration point**: Deepgram language detection must dynamically set the `languageCode` in Gemini Live's `speechConfig` to ensure proper bidirectional speech recognition.[1][2][3][4]

## Enhanced Architecture Overview

The implementation requires a two-stage approach:
1. **Stage 1**: Deepgram detects language from initial audio sample (1-2 seconds)
2. **Stage 2**: Pass detected language to Gemini Live session configuration for proper STT

---

This specification has been created based on your provided context. The complete implementation details include:

- Backend API with language mapping (Deepgram → Gemini BCP-47)
- Audio capture utilities with mobile optimization
- React hook integration for language detection
- Gemini Live dynamic language configuration
- ChatInput component integration with UI feedback
- Mobile-specific considerations for iOS/Android
- Cost optimization strategies

**Key Improvements:**
1. Language Mapping: Deepgram→Gemini BCP-47 code mapping
2. Mobile Audio Processing: PCM conversion works on iOS/Android
3. Dynamic Language Injection: Gemini Live config accepts detected language
4. Error Handling: Graceful fallback to default language
5. UI Feedback: Real-time language detection display
6. VAD Configuration: Optimized for natural conversation flow
7. Input Audio Transcription: Enabled in Gemini Live for accurate STT

**Cost Optimization:**
- Language detection: ~$0.0001 per 2-second sample
- Cache detected language in session storage
- Only detect once per conversation session
- Estimated: **$0.10/month for 100 users**

**Next Steps:**
1. Install @deepgram/sdk package
2. Implement Phase 1: Backend API (`api/deepgram-language-detect.ts`)
3. Implement Phase 2: Audio capture utility (`src/utils/audioCapture.ts`)
4. Implement Phase 3: React hook (`src/hooks/useDeepgramLanguageDetection.ts`)
5. Implement Phase 4: Modify existing hooks and components
6. Test on real mobile devices (not emulators!)

This implementation ensures Deepgram detects the language, then Gemini Live uses that language code for accurate bidirectional speech-to-text on mobile devices.[3][2][1][4]

---

**Status:** Ready for Implementation  
**Created:** January 30, 2025  
**Version:** 2.0 - Enhanced with Gemini Live Integration