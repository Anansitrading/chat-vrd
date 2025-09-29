# Gemini Live Native Audio Implementation Test Plan

## What Was Implemented

### 1. Secure Backend Token Generation (`api/generate-token.ts`)
- ✅ Created Vercel API endpoint that generates ephemeral tokens
- ✅ Server-side GEMINI_API_KEY usage (no client exposure)
- ✅ Dutch language system instruction configured
- ✅ Native audio output enabled by default

### 2. Updated useGeminiLive Hook (`src/hooks/useGeminiLive.ts`)
- ✅ Replaced direct WebSocket with @google/genai SDK
- ✅ Uses ephemeral tokens from backend
- ✅ Dutch input transcription (nl-NL) configured
- ✅ Proper PCM audio streaming at 16kHz
- ✅ Audio output playback implementation
- ✅ Toggle between AUDIO and TEXT modalities

### 3. Audio Downsampling Worklet (`public/audio-processor-worklet.js`)
- ✅ Proper 48kHz → 16kHz downsampling implemented
- ✅ Outputs int16 PCM format
- ✅ Posts chunks to main thread as Uint8Array

### 4. Dutch Language Support (`src/hooks/useSpeechToText.ts`)
- ✅ Dynamic language setting (defaults to nl-NL)
- ✅ Falls back to navigator.language or Dutch

### 5. ChatWindow Integration (`src/components/ChatWindow.tsx`)
- ✅ Removed client-side API key usage
- ✅ Added audio streaming toggle state
- ✅ Connects to Live when model is selected
- ✅ Uses ephemeral tokens through the updated hook

## Testing Steps

### Local Testing
1. Set environment variable in `.env.local`:
   ```
   GEMINI_API_KEY=your-actual-api-key
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Test the implementation:
   - Select "Gemini Live 2.5 Flash Native Audio" model
   - Click microphone icon to start listening
   - Speak in Dutch (e.g., "Hallo, hoe gaat het met je?")
   - Verify Dutch transcription appears
   - Verify natural Dutch audio response plays

### Vercel Deployment Testing
1. Set environment variable in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add `GEMINI_API_KEY` with your API key

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Test production deployment:
   - Access your Vercel URL
   - Follow same testing steps as local

## Key Features to Verify

### ✅ Security
- API key never exposed in browser console
- Token endpoint returns ephemeral tokens
- Network tab shows `/api/generate-token` calls

### ✅ Dutch Language
- Speech input recognized as Dutch
- Model responds in Dutch
- Transcriptions show Dutch text

### ✅ Audio Quality
- Natural voice (not robotic)
- Clear audio playback
- Proper sample rate (no distortion)

### ✅ Streaming
- Real-time audio streaming
- Interim transcripts update live
- Audio output toggle works

## Troubleshooting

### If Dutch isn't working:
1. Check browser language settings
2. Verify `inputLang: 'nl-NL'` in hook config
3. Check system instruction in token generation

### If audio is distorted:
1. Check browser console for errors
2. Verify AudioWorklet loads correctly
3. Check sample rate in playback function

### If connection fails:
1. Verify GEMINI_API_KEY is set correctly
2. Check network tab for 404/500 errors
3. Verify api/generate-token.ts is deployed

## Success Criteria
- ✅ No API keys in client code
- ✅ Dutch input properly transcribed
- ✅ Natural Dutch voice output
- ✅ Smooth audio streaming
- ✅ Toggle between audio/text modes works