import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Globe } from 'lucide-react';
import { useWhisperSTT } from '../hooks/useWhisperSTT';

interface WhisperVoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  placeholder?: string;
  autoSubmit?: boolean;
}

export const WhisperVoiceInput: React.FC<WhisperVoiceInputProps> = ({
  onTranscript,
  className = '',
  placeholder = 'Hold to speak in any language...',
  autoSubmit = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const touchHoldRef = useRef<boolean>(false);

  const {
    isTranscribing,
    transcript,
    detectedLanguage,
    error,
    transcribeAudio,
    reset,
    getLanguageName,
    getLanguageFlag,
  } = useWhisperSTT({
    onTranscriptionComplete: (result) => {
      if (result.text) {
        onTranscript(result.text);
        setShowTranscript(true);
        
        // Auto-hide transcript after 5 seconds
        setTimeout(() => {
          setShowTranscript(false);
        }, 5000);
        
        // Auto-submit if enabled
        if (autoSubmit && result.text.trim()) {
          // Trigger form submission or send message
          const event = new CustomEvent('whisper-submit', { detail: result.text });
          window.dispatchEvent(event);
        }
      }
    },
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      reset(); // Clear previous transcript
      chunksRef.current = [];
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for Whisper
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      // Determine the best audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordingTime(0);

        // Transcribe if we have audio
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);

      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 100);

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please allow access to use voice input.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Touch handlers for mobile push-to-talk
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchHoldRef.current = true;
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchHoldRef.current && isRecording) {
      touchHoldRef.current = false;
      stopRecording();
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = () => {
    if (!isMobile) {
      startRecording();
    }
  };

  const handleMouseUp = () => {
    if (!isMobile && isRecording) {
      stopRecording();
    }
  };

  // Click handler for toggle mode
  const handleClick = () => {
    if (!isMobile) {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`whisper-voice-input ${className}`}>
      <div className="flex items-center gap-3">
        {/* Main voice button */}
        <button
          className={`
            relative flex items-center justify-center
            w-12 h-12 rounded-full transition-all duration-200
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
              : isTranscribing
              ? 'bg-gray-400 cursor-wait'
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
            }
            text-white shadow-lg
            ${isMobile ? 'touch-none' : ''}
          `}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          onTouchCancel={isMobile ? handleTouchEnd : undefined}
          onMouseDown={!isMobile ? handleMouseDown : undefined}
          onMouseUp={!isMobile ? handleMouseUp : undefined}
          onClick={!isMobile ? handleClick : undefined}
          disabled={isTranscribing}
          aria-label={
            isRecording 
              ? "Recording... Release to stop" 
              : isTranscribing
              ? "Processing..."
              : isMobile 
              ? "Hold to speak" 
              : "Click to record"
          }
        >
          {isTranscribing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        {/* Status indicators */}
        <div className="flex flex-col">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {/* Processing indicator */}
          {isTranscribing && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Detecting language...
            </span>
          )}

          {/* Language detection result */}
          {!isRecording && !isTranscribing && detectedLanguage && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getLanguageFlag(detectedLanguage)} {getLanguageName(detectedLanguage)}
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <span className="text-sm text-red-500">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!isRecording && !isTranscribing && !transcript && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {isMobile ? (
            <>
              <span className="font-semibold">Hold</span> the microphone to speak.
              <br />
              Automatic language detection (Dutch/English)
            </>
          ) : (
            <>
              <span className="font-semibold">Click</span> or <span className="font-semibold">hold</span> to record.
              <br />
              Speaks Dutch or English - automatically detected!
            </>
          )}
        </p>
      )}

      {/* Transcript display */}
      {showTranscript && transcript && (
        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {transcript}
          </p>
          {detectedLanguage && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Detected: {getLanguageFlag(detectedLanguage)} {getLanguageName(detectedLanguage)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};