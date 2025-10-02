# STT Language Detection Connection Issue - Context for Research

## Current Situation

**What Works:**
- ✅ Deepgram language detection (2-second sample → language code)
- ✅ Gemini Live STT (real-time transcription)
- ✅ Language detection returns correct BCP-47 code (e.g., 'nl-NL', 'en-US')
- ✅ UI shows detected language with confidence

**What Doesn't Work:**
- ❌ Detected language is NOT being used for STT
- ❌ STT always uses hardcoded 'nl-NL' regardless of detected language

---

## Problem Analysis

### File: `src/components/ChatInput.tsx` (Lines 123-162)

```typescript
const handleMicClick = async () => {
    if (isGeminiLiveMode) {
        if (isGeminiLiveListening) {
            stopGeminiLive?.();
            setShowLanguageDetection(false);
            resetDetection();
        } else {
            try {
                // Step 1: Detect language first ✅ WORKS
                setShowLanguageDetection(true);
                const languageResult = await detectLanguage();
                
                console.log('Detected language:', languageResult);
                // languageResult = { geminiLanguageCode: 'nl-NL' or 'en-US' etc. }
                
                // Step 2: Start Gemini Live with detected language
                startGeminiLive?.(languageResult.geminiLanguageCode); // ❌ THIS DOESN'T WORK
                
                setTimeout(() => {
                    setShowLanguageDetection(false);
                }, 2000);
                
            } catch (error) {
                console.error('Language detection failed:', error);
                startGeminiLive?.(); // Fallback
                setShowLanguageDetection(false);
            }
        }
    }
}
```

**Issue**: `startGeminiLive()` is called with the language parameter, but this doesn't actually change the STT language.

---

### File: `src/components/ChatWindow.tsx` (Lines 46-62)

```typescript
const {
    isConnected: isLiveConnected,
    isListening: isLiveListening,
    llmResponse: liveLlmResponse,
    interimTranscript: liveInterimTranscript,
    finalTranscript: liveFinalTranscript,
    startListening: startGeminiLive,
    stopListening: stopGeminiLive,
    sendText: sendGeminiLiveText,
    connect: connectLive,
    disconnect: disconnectLive,
    isSupported: isGeminiLiveSupported,
} = useGeminiLive({
    audioOutput: liveAudioEnabled,
    inputLang: 'nl-NL',  // ❌ HARDCODED - Always Dutch!
    systemPrompt: settings.systemPrompt,
});
```

**Issue**: `useGeminiLive` is initialized once with hardcoded `inputLang: 'nl-NL'`. The detected language is never passed here.

---

### File: `src/hooks/useGeminiLive.ts` (Lines 15-46)

```typescript
type LiveConfig = {
    audioOutput?: boolean;
    inputLang?: string; // default 'nl-NL'
    systemPrompt?: string;
    dynamicLanguageCode?: string; // ✅ BCP-47 code from language detection
};

export const useGeminiLive = (config: LiveConfig = {}) => {
    // ...
    const audioOutput = config.audioOutput !== false;
    // Use dynamicLanguageCode if provided, otherwise fall back to inputLang
    const inputLang = config.dynamicLanguageCode || config.inputLang || 'nl-NL'; // ✅ READY
    const MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
    
    // ...
    
    const connect = useCallback(async () => {
        // ...
        sessionRef.current = await aiRef.current.live.connect({
            model: MODEL,
            config: {
                responseModalities: [audioOutput ? Modality.AUDIO : Modality.TEXT],
                inputAudioTranscription: { language: inputLang }, // ✅ Uses inputLang
                outputAudioTranscription: {},
                // ...
            },
        });
    }, [audioOutput, inputLang, config.systemPrompt, playPcm]);
```

**Good News**: The hook ALREADY supports `dynamicLanguageCode`! Line 45 shows it's ready to use.

---

## The Missing Link

**The problem**: 
1. `ChatInput` detects language and gets `geminiLanguageCode`
2. `ChatInput` calls `startGeminiLive(geminiLanguageCode)` 
3. But `startGeminiLive` is from `useGeminiLive` hook which doesn't accept parameters
4. `useGeminiLive` is initialized in `ChatWindow` with hardcoded `inputLang: 'nl-NL'`
5. The `dynamicLanguageCode` config option exists but is NEVER PASSED

**What needs to happen**:
1. `ChatWindow` needs to store detected language in state
2. Pass that state as `dynamicLanguageCode` to `useGeminiLive` config
3. When language changes, the hook should re-initialize or update

---

## Question for Research

**How do we modify ChatWindow.tsx to:**
1. Accept the detected language from ChatInput (needs callback/state)
2. Pass it as `dynamicLanguageCode` to `useGeminiLive` config
3. Ensure the hook updates when language changes
4. Without breaking the current working language detection

**Constraints**:
- Must NOT modify the working `useDeepgramLanguageDetection` hook
- Must NOT modify the working `api/deepgram-language-detect.ts` API
- Must preserve the language detection UI flow
- Should handle the case where detection fails (fallback to 'nl-NL')

---

## Code Structure

```
ChatInput.tsx
    └─> Uses: useDeepgramLanguageDetection() ✅ WORKS
    └─> Calls: startGeminiLive(languageCode) ❌ DOESN'T PASS LANGUAGE
    └─> Defined in: ChatWindow.tsx

ChatWindow.tsx  
    └─> Calls: useGeminiLive({ inputLang: 'nl-NL' }) ❌ HARDCODED
    └─> Passes: startGeminiLive to ChatInput
    └─> Needs: state for detected language

useGeminiLive.ts
    └─> Accepts: dynamicLanguageCode in config ✅ READY
    └─> Uses: dynamicLanguageCode || inputLang || 'nl-NL' ✅ CORRECT
```

---

## Desired Flow

1. User clicks mic button in ChatInput
2. Language detection runs (2 seconds) ✅ WORKING
3. ChatInput gets `geminiLanguageCode` (e.g., 'en-US') ✅ WORKING
4. ChatInput passes language to ChatWindow somehow ❌ MISSING
5. ChatWindow updates state with detected language ❌ MISSING  
6. useGeminiLive receives `dynamicLanguageCode: 'en-US'` ❌ MISSING
7. Gemini Live STT starts with English ❌ NOT HAPPENING
8. User speaks English, gets English transcription ❌ NOT HAPPENING

---

## Specific Question

**Given this React component structure, what's the cleanest way to:**
1. Pass the detected language from ChatInput back up to ChatWindow?
2. Store it in ChatWindow state and pass to useGeminiLive?
3. Handle the timing (language detection happens BEFORE startListening)?

**Options considered:**
- A) Callback prop from ChatWindow to ChatInput to set language state?
- B) Lift startGeminiLive logic up to ChatWindow?
- C) Make useGeminiLive accept language in startListening call?
- D) Something else?

**What's the React best practice here that won't break the working flow?**
