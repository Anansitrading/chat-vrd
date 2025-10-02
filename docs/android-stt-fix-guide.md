# Android Chrome STT Transcription Fix Guide

## Problem Summary

STT works on desktop browsers and iOS mobile devices, but **FAILS on Android mobile devices (Chrome)** - language detection works but no transcribed text appears.

---

## Root Causes

The primary technical reason Android Chrome fails for STT transcription is due to inconsistencies in how Chrome for Android handles audio capture, encoding, and low-level processing via MediaRecorder and AudioWorklet APIs. While the platform successfully records and processes enough audio metadata for Deepgram's language detection (which can be robust with partial/low-quality input), the transcription APIs are far stricter on stream quality and format, leading to silent or corrupt inputs on Android Chrome.

### Why Android Chrome STT Fails

1. **MediaRecorder Audio Format Issues**: Android Chrome's implementation of MediaRecorder often produces WebM/Opus audio in a slightly different container structure compared to desktop browsers. Sometimes, resulting chunks have header mismatches, incorrect Opus frames, or timing gaps that prevent proper decoding downstream for STT (especially Gemini Live).

2. **AudioWorklet/PCM Pipeline Limitations**: AudioWorklet and ScriptProcessor may not reliably stream or transform audio chunks in real-time on mobile Chrome. Android's variant sometimes fails to downsample/correctly buffer, yielding either corrupted PCM or non-standard Int16 arrays.

3. **Sample Rate and Channel Bugs**: The requested sampleRate (16kHz) and channelCount (1) are not consistently enforced on Android Chrome, so audio streams may default to 44.1kHz, stereo, or variable, breaking STT input assumptions.

4. **Opus/WebM Incompatibilities**: Some STT APIs (Gemini Live in particular) expect specific Opus profiles for mobile input. If Android Chrome's MediaRecorder emits unsupported Opus tags, the transcription server ignores or discards the input but still processes enough data for language detection.

5. **Real-Time Streaming Buffer Underflow**: On Android, time-sensitive streaming (especially with low-latency constraints for STT) may see chunks arrive sparsely or with gaps, causing the transcription to "timeout" or stay empty.

---

## Detailed Step-By-Step Solution

### 1. Verify Audio Constraints & Fallbacks

- Explicitly check supported mimeTypes and codecs. If `audio/webm; codecs=opus` fails, fallback to `audio/webm` or raw PCM.
- For Android Chrome, use `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` to validate before setting options.

### 2. Standardize Audio Processing in AudioWorklet

- Double-check your AudioWorklet downsampler. Use `audioContext.sampleRate` to dynamically resample input to 16kHz if Android gives you 44.1kHz or 48kHz streams.
- Safeguard against non-monophonic channels: sum them or select only the first channel for STT pipelines.

### 3. Debug and Patch MediaRecorder Output

- After recording, inspect the captured chunks—decode WebM in JS, play them back (locally), and confirm Opus structure.
- If Android Chrome-generated blobs fail basic audio decode APIs, switch to capturing raw PCM or WAV using the AudioWorklet output, bypassing MediaRecorder on Android.

### 4. Apply Device/Platform Detection

- In code, use `navigator.userAgent` or feature detection to switch to AudioWorklet/WAV fallback pipelines for Android Chrome.
- Example: If (isAndroidChrome && MediaRecorder unreliable) then setup direct PCM streaming with AudioWorklet.

### 5. Test Direct Streaming to Deepgram/Gemini

- Deepgram's SDK can accept raw linear PCM. For Android Chrome, send AudioWorklet PCM directly rather than converting to WebM/Opus, if supported.
- For Gemini Live API, ask if WAV or PCM (16kHz, mono) is directly supported—use fetch streaming if so, to avoid OPUS encoding bugs.

### 6. Patch Real-Time Buffering Bugs

- Use larger buffer sizes for streaming on mobile to avoid underflows (e.g., 4096 or 8192 instead of default 1024).
- Implement chunk timestamp sanity checks: discard audio packets with unexpected latency gaps before sending to STT APIs.

### 7. Review Permissions and Echo Cancellation

- On Android Chrome, test getUserMedia with and without `echoCancellation`—in some versions, this alters channel configuration unexpectedly and corrupts the stream.
- Try toggling echoCancellation and sampleRate in getUserMedia to ensure consistent output.

---

## Summary Table: Android Chrome STT Issues & Solutions

| Problem | Reason | Solution |
|---------|--------|----------|
| No transcription (empty text) | Audio format, Opus incompat, buffer gap | Fallback to PCM/WAV, verify AudioWorklet |
| Language detected only | Partial metadata processed | Patch chunk sanity, fix mono/PCM pipeline |
| Chunks fail to decode | Mobile MediaRecorder bug | Local decode test, bypass Opus |
| Sample rate/channel mismatch | getUserMedia ignores constraints | Manual resample, strict mono enforce |
| Buffer underflow/delay | Real-time engine gap | Bigger buffer, timestamp filtering |
| echoCancellation impairs input | Chrome bug on mobile audio graph | Test with/without echoCancellation |

---

## Code Fix Sketch (Core Logic)

```typescript
// Pseudo-code for Android Chrome STT pipeline detection and fallback
if (isAndroidChrome()) {
  if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    // fallback: use AudioWorklet + PCM/WAV
    setupAudioWorkletCapture();
    streamPCMtoSTT();
  } else {
    // Use standard pipeline for other platforms
    setupMediaRecorderWebM();
  }
}
```

### Key Implementation Points:

- Always ensure AudioWorklet outputs clean Int16 PCM, resampled if needed, mono only.
- Inspect and locally decode recorded chunks before streaming.
- Never assume Android Chrome audio will match desktop—always test on live devices.

---

## Conclusion

Solving these issues will let Android Chrome's STT flow work reliably with Gemini Live and Deepgram, matching the success of desktop and iOS environments.

---

**Source**: Perplexity AI Research - October 2, 2025
**URL**: https://www.perplexity.ai/search/debugging-context-project-reac-nLG9Ws8dT6y5HdI3Y0KeNg
