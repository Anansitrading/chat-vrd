
import { useState, useCallback, useEffect } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);

  const synth = window.speechSynthesis;

  const speak = useCallback((text: string) => {
    if (!synth || !isTtsEnabled) return;
    
    synth.cancel(); // Cancel any previous utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synth.speak(utterance);
  }, [synth, isTtsEnabled]);

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);
  
  useEffect(() => {
      return () => {
          if(synth) synth.cancel();
      }
  }, [synth]);

  return { isSpeaking, isTtsEnabled, setIsTtsEnabled, speak, stop };
};