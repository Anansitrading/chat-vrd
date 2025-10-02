# Perplexity Solution: Connect Language Detection to STT

**Source**: https://www.perplexity.ai/search/i-have-a-react-typescript-app-95cmQKZQSlKO3eZFeDV7pQ

---

## Recommended Pattern

**Lift state up** to ChatWindow and use a **callback prop** to update the detected language from ChatInput.

This:
- Keeps all STT config logic centralized
- Enables flow control for `useGeminiLive`
- Avoids prop-drilling
- Doesn't break working language detection

---

## Step-by-Step Solution

### 1. In ChatWindow: Store Detected Language

Add state in ChatWindow for the detected language code:

```typescript
const [detectedLang, setDetectedLang] = useState<string>('nl-NL'); // default
```

### 2. Pass Callback to ChatInput

Provide a function prop to ChatInput:

```typescript
<ChatInput 
  onLanguageDetected={setDetectedLang}
  // ... other props
/>
```

In ChatInput, call this whenever detectLanguage finishes:

```typescript
props.onLanguageDetected(geminiLanguageCode);
```

### 3. Pass dynamicLanguageCode to useGeminiLive

Update your useGeminiLive hook usage:

```typescript
const geminiLive = useGeminiLive({
  dynamicLanguageCode: detectedLang,
  inputLang: 'nl-NL', // fallback/default
  audioOutput: liveAudioEnabled,
  systemPrompt: settings.systemPrompt,
});
```

This ensures the hook uses the detected language when available.

### 4. Handle Timing

- Only call `startListening` or `startGeminiLive` after language is detected
- You may use useEffect in ChatWindow to trigger STT initialization when `detectedLang` changes:

```typescript
useEffect(() => {
  if (detectedLang) {
    startGeminiLive(detectedLang);
  }
}, [detectedLang]);
```

### 5. Ensuring Detection Still Works

No change to your existing detection approach in ChatInput—just report upwards instead of starting GeminiLive directly.

---

## Example Minimal Flow

**ChatWindow.tsx**:
```typescript
const [detectedLang, setDetectedLang] = useState<string>('nl-NL');

const { startListening: startGeminiLive, ...rest } = useGeminiLive({
  dynamicLanguageCode: detectedLang,
  inputLang: 'nl-NL',
  audioOutput: liveAudioEnabled,
  systemPrompt: settings.systemPrompt,
});

return (
  <>
    <ChatInput 
      onLanguageDetected={setDetectedLang}
      startGeminiLive={startGeminiLive}
      // ... other props
    />
  </>
);
```

**ChatInput.tsx**:
```typescript
interface ChatInputProps {
  onLanguageDetected?: (languageCode: string) => void;
  // ... other props
}

function ChatInput({ onLanguageDetected, ...props }) {
  const handleMicClick = async () => {
    if (isGeminiLiveMode) {
      if (!isGeminiLiveListening) {
        try {
          setShowLanguageDetection(true);
          const languageResult = await detectLanguage();
          
          // Report detected language to parent
          onLanguageDetected?.(languageResult.geminiLanguageCode);
          
          // Then start listening
          startGeminiLive?.();
          
          setTimeout(() => {
            setShowLanguageDetection(false);
          }, 2000);
        } catch (error) {
          console.error('Language detection failed:', error);
          startGeminiLive?.(); // Fallback
          setShowLanguageDetection(false);
        }
      } else {
        stopGeminiLive?.();
        setShowLanguageDetection(false);
        resetDetection();
      }
    }
  };
  // ... rest of your code
}
```

---

## Why This Pattern Works

1. **Lifting state** keeps the source-of-truth in the parent where live STT starts
2. **Callback prop** ensures detection isn't tightly coupled to rendering or logic in the child
3. **No tight coupling** between detection and STT logic
4. **Explicit control flow** for when STT starts (after detection, with up-to-date code)

---

## Implementation Changes Required

### File: `src/components/ChatWindow.tsx`

**Line ~40** (where useGeminiLive is called):
```typescript
// ADD STATE
const [detectedLang, setDetectedLang] = useState<string>('nl-NL');

// UPDATE HOOK CALL
const { ... } = useGeminiLive({
  audioOutput: liveAudioEnabled,
  dynamicLanguageCode: detectedLang,  // ← ADD THIS
  inputLang: 'nl-NL',  // Keep as fallback
  systemPrompt: settings.systemPrompt,
});
```

**Line ~490** (where ChatInput is rendered):
```typescript
<ChatInput 
  onSendMessage={handleSendMessage} 
  isLoading={isLoading}
  onLanguageDetected={setDetectedLang}  // ← ADD THIS
  // ... rest of props
/>
```

### File: `src/components/ChatInput.tsx`

**Line ~10** (interface definition):
```typescript
interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  onLanguageDetected?: (languageCode: string) => void;  // ← ADD THIS
  // ... rest of props
}
```

**Line ~37** (destructure props):
```typescript
export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading,
    onLanguageDetected,  // ← ADD THIS
    // ... rest of props
}) => {
```

**Line ~140** (after detectLanguage succeeds):
```typescript
const languageResult = await detectLanguage();

console.log('Detected language:', languageResult);

// Report detected language to parent
onLanguageDetected?.(languageResult.geminiLanguageCode);  // ← ADD THIS

// Step 2: Start Gemini Live
startGeminiLive?.();  // ← NO PARAM - hook already has the language
```

---

## Summary of Changes

1. ✅ Add `detectedLang` state in ChatWindow
2. ✅ Pass `onLanguageDetected` callback to ChatInput
3. ✅ Call `onLanguageDetected` after language detection succeeds
4. ✅ Pass `detectedLang` as `dynamicLanguageCode` to useGeminiLive
5. ✅ Remove parameter from `startGeminiLive()` call (hook already knows the language)

**Total files modified**: 2 (ChatWindow.tsx, ChatInput.tsx)  
**Total lines changed**: ~5-7 lines added

**Risk Level**: LOW - We're only adding new state and a callback, not changing existing logic
