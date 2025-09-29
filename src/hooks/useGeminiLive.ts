// src/hooks/useGeminiLive.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

type LiveState = {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  llmResponse: string;
  error: string | null;
};

type LiveConfig = {
  // Toggle native audio output on/off (AUDIO vs TEXT)
  audioOutput?: boolean; // default true
  // Force Dutch input transcription
  inputLang?: string; // default 'nl-NL'
  // Optional: custom system prompt
  systemPrompt?: string;
};

export const useGeminiLive = (config: LiveConfig = {}) => {
  const [state, setState] = useState<LiveState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    interimTranscript: '',
    finalTranscript: '',
    llmResponse: '',
    error: null,
  });

  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const audioOutput = config.audioOutput !== false; // default true
  const inputLang = config.inputLang || 'nl-NL';
  const MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

  const initAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    }
  }, []);

  const playPcm = useCallback(async (pcmBase64: string, sampleRate = 24000) => {
    try {
      await initAudioContext();
      if (!audioCtxRef.current) return;

      const bytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
      const samples = bytes.length / 2;
      const audioBuffer = audioCtxRef.current.createBuffer(1, samples, sampleRate);
      const ch = audioBuffer.getChannelData(0);

      for (let i = 0; i < samples; i++) {
        const lo = bytes[i * 2];
        const hi = bytes[i * 2 + 1];
        const val = (hi << 8) | lo;
        const s = val >= 0x8000 ? val - 0x10000 : val; // int16
        ch[i] = s / 32768;
      }

      const src = audioCtxRef.current.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(audioCtxRef.current.destination);
      src.start();

      setState(s => ({ ...s, isSpeaking: true }));
      src.onended = () => setState(s => ({ ...s, isSpeaking: false }));
    } catch (e) {
      console.error('Audio playback error', e);
    }
  }, [initAudioContext]);

  const connect = useCallback(async () => {
    try {
      setState(s => ({ ...s, error: null }));
      // 1) Get ephemeral token from our Vercel function
      const r = await fetch('/api/generate-token', { method: 'POST' });
      if (!r.ok) throw new Error('Failed to fetch ephemeral token');
      const { ephemeralToken } = await r.json();

      // 2) Create SDK with ephemeral token
      aiRef.current = new GoogleGenAI({ apiKey: ephemeralToken });

      // 3) Connect to Live session
      sessionRef.current = await aiRef.current.live.connect({
        model: MODEL,
        config: {
          responseModalities: [audioOutput ? Modality.AUDIO : Modality.TEXT],
          inputAudioTranscription: { language: inputLang },    // Dutch STT
          outputAudioTranscription: {},                        // Show agent transcript text
          ...(config.systemPrompt
            ? { systemInstruction: config.systemPrompt }
            : {}),
        },
        callbacks: {
          onopen: () => setState(s => ({ ...s, isConnected: true })),
          onmessage: (msg: any) => {
            // Streamed audio chunks
            if (audioOutput && msg.audio?.data) {
              const sr = msg.audio.sampleRateHz || 24000;
              playPcm(msg.audio.data, sr);
            }
            // Transcripts
            if (msg.serverContent?.inputTranscription?.text) {
              setState(s => ({ ...s, interimTranscript: msg.serverContent.inputTranscription.text }));
            }
            if (msg.serverContent?.outputTranscription?.text) {
              // Accumulate model's text transcript too (useful when audioOutput is on)
              setState(s => ({ ...s, llmResponse: msg.serverContent.outputTranscription.text }));
            }
            // Final-turn text (when responseModalities = TEXT)
            if (msg.serverContent?.modelTurn?.parts) {
              const text = msg.serverContent.modelTurn.parts.map((p: any) => p.text || '').join('');
              if (text) setState(s => ({ ...s, llmResponse: text }));
            }
          },
          onerror: (e: any) => setState(s => ({ ...s, error: e?.message || 'Live error' })),
          onclose: () => setState(s => ({ ...s, isConnected: false, isListening: false })),
        },
      });
    } catch (e: any) {
      console.error('Live connect error', e);
      setState(s => ({ ...s, error: e?.message || 'Connect failed' }));
    }
  }, [audioOutput, inputLang, config.systemPrompt, playPcm]);

  const startListening = useCallback(async () => {
    await initAudioContext();
    if (!sessionRef.current) await connect();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      // Prefer AudioWorklet (with proper downsampling handled inside the worklet file)
      try {
        await audioCtxRef.current!.audioWorklet.addModule('/audio-processor-worklet.js');
        const node = new AudioWorkletNode(audioCtxRef.current!, 'pcm16k-downsampler');
        node.port.onmessage = (ev) => {
          if (ev.data?.type === 'pcm16') {
            const bytes: Uint8Array = ev.data.data;
            const base64 = btoa(String.fromCharCode(...bytes));
            sessionRef.current?.sendRealtimeInput({
              audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        };
        const src = audioCtxRef.current!.createMediaStreamSource(stream);
        src.connect(node);
        workletRef.current = node;
      } catch {
        // Fallback: ScriptProcessor (also downsample in the worklet file—see below)
        const bufSize = 2048;
        const proc = audioCtxRef.current!.createScriptProcessor(bufSize, 1, 1);
        const src = audioCtxRef.current!.createMediaStreamSource(stream);
        src.connect(proc);
        proc.onaudioprocess = (e) => {
          // For fallback path, we'll still post raw 16k int16 frames from the worklet file,
          // but if you keep this, ensure downsampling here too.
        };
        proc.connect(audioCtxRef.current!.destination);
        workletRef.current = proc;
      }

      setState(s => ({ ...s, isListening: true }));
    } catch (e: any) {
      console.error('Mic error', e);
      setState(s => ({ ...s, error: 'Microphone access denied' }));
    }
  }, [connect, initAudioContext]);

  const stopListening = useCallback(() => {
    if (workletRef.current) {
      try { (workletRef.current as any).disconnect(); } catch {}
      workletRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setState(s => ({ ...s, isListening: false }));
  }, []);

  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }, []);

  const disconnect = useCallback(async () => {
    stopListening();
    try { await sessionRef.current?.close?.(); } catch {}
    sessionRef.current = null;
    setState({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      interimTranscript: '',
      finalTranscript: '',
      llmResponse: '',
      error: null,
    });
  }, [stopListening]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
    isSupported: !!window.AudioContext && !!navigator.mediaDevices?.getUserMedia,
  };
};