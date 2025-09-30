# Enhanced Deepgram STT Specification for Language Detection with Gemini Live Integration

Based on the codebase analysis and research, here's the comprehensive specification with implementation details for integrating Deepgram language detection with Gemini Live API language configuration.

## Critical Implementation Gap Identified

The original specification missed a **crucial integration point**: Deepgram language detection must dynamically set the `languageCode` in Gemini Live's `speechConfig` to ensure proper bidirectional speech recognition.[1][2][3][4]

## Enhanced Architecture Overview

The implementation requires a two-stage approach:
1. **Stage 1**: Deepgram detects language from initial audio sample (1-2 seconds)
2. **Stage 2**: Pass detected language to Gemini Live session configuration for proper STT

## Document Structure

This specification is split into multiple focused documents:

- **00-OVERVIEW.md** (this file) - Architecture and implementation gap
- **01-BACKEND-API.md** - Vercel serverless function for language detection
- **02-AUDIO-CAPTURE.md** - Browser audio capture and PCM conversion
- **03-REACT-HOOKS.md** - Language detection React hook
- **04-GEMINI-INTEGRATION.md** - Gemini Live dynamic language configuration
- **05-CHATINPUT-INTEGRATION.md** - UI integration and user flow
- **06-MOBILE-CONSIDERATIONS.md** - iOS/Android specific optimizations
- **07-TESTING-DEPLOYMENT.md** - Testing strategy and deployment guide

## Key Improvements Over Original Spec

1. **Language Mapping**: Added Deepgram→Gemini BCP-47 code mapping[4]
2. **Mobile Audio Processing**: PCM conversion works on iOS/Android[5]
3. **Dynamic Language Injection**: Gemini Live config accepts detected language[4]
4. **Error Handling**: Graceful fallback to default language
5. **UI Feedback**: Real-time language detection display
6. **VAD Configuration**: Optimized for natural conversation flow[4]
7. **Input Audio Transcription**: Enabled in Gemini Live for accurate STT[4]

## Cost Optimization

- Language detection: ~$0.0001 per 2-second sample[1]
- Cache detected language in session storage
- Only detect once per conversation session
- Estimated: **$0.10/month for 100 users**[1]

This implementation ensures Deepgram detects the language, then Gemini Live uses that language code for accurate bidirectional speech-to-text on mobile devices.[3][2][1][4]

## References

[1] DEEPGRAM_STT_SPECIFICATION.md
[2] repomix-output.xml
[3] https://deepgram.com/learn/introducing-automatic-language-detection-capabilities
[4] https://ai.google.dev/gemini-api/docs/live-guide
[5] https://deepgram.com/learn/live-transcription-mic-browser