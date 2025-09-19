import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Voice {
  id: string;
  name: string;
  description: string;
}

// Available browser speech synthesis voices (will be populated dynamically)
const getAvailableVoices = (): Voice[] => {
  if ('speechSynthesis' in window) {
    const voices = speechSynthesis.getVoices();
    return voices.map(voice => ({
      id: voice.name,
      name: voice.name,
      description: `${voice.lang} - ${voice.localService ? 'Local' : 'Remote'}`
    }));
  }
  return [
    { id: 'default', name: 'Default', description: 'System Default' }
  ];
};

const GeminiVoiceChat: React.FC = () => {
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [responseText, setResponseText] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = getAvailableVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0].id);
      }
    };

    // Load voices immediately
    loadVoices();

    // Also load when voices change (some browsers load them asynchronously)
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Speech recognition failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle voice selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  // Start speech recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Stop speech recognition
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Convert base64 to audio blob
  const base64ToBlob = (base64Data, mimeType = 'audio/wav') => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Generate audio response using Gemini Live API
  const generateAudioResponse = async (text: string) => {
    try {
      setLoading(true);
      setError(null);
      setAudioUrl(null);
      setResponseText('');

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash'
      });

      // First generate text response
      const result = await model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: text }] 
        }]
      });

      const textResponse = result.response.text();
      setResponseText(textResponse);
      
      // Then convert to speech using Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textResponse);
        
        // Set voice based on selection
        const voices = speechSynthesis.getVoices();
        const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice) || voices[0];
        if (selectedVoiceObj) {
          utterance.voice = selectedVoiceObj;
        }
        
        // Configure speech settings
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Speak the response
        speechSynthesis.speak(utterance);
        
        // Mark as playing
        setAudioUrl('speech-synthesis-playing');
        
        // Clear the playing status when done
        utterance.onend = () => {
          setAudioUrl(null);
        };
      } else {
        throw new Error('Speech synthesis not supported in this browser');
      }
    } catch (err: any) {
      console.error('Gemini API error:', err);
      setError(`Failed to generate audio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Please enter some text or use voice input');
      return;
    }
    await generateAudioResponse(inputText.trim());
  };

  // Cleanup audio URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Gemini Voice Chat
      </h2>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Voice:
        </label>
        <select 
          value={selectedVoice}
          onChange={handleVoiceChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableVoices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} ({voice.description})
            </option>
          ))}
        </select>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message:
          </label>
          <div className="flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
              className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col gap-2">
              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-3 rounded-md text-white font-medium transition-colors ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isListening ? '🛑' : '🎤'}
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || isListening}
          className={`w-full p-3 rounded-md text-white font-medium transition-colors ${
            loading || isListening
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Generating Audio...' : 'Generate Voice Response'}
        </button>
      </form>

      {/* Status Messages */}
      {isListening && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md text-blue-800">
          🎤 Listening... Speak now!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* Response Display */}
      {responseText && (
        <div className="mb-4">
          <div className="p-4 bg-green-50 border border-green-300 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-green-800">
                ✅ Response generated with voice: <strong>{availableVoices.find(v => v.id === selectedVoice)?.name || selectedVoice}</strong>
              </p>
              {audioUrl === 'speech-synthesis-playing' && (
                <span className="text-blue-600 text-sm flex items-center">
                  🔊 Speaking...
                </span>
              )}
            </div>
            <div className="bg-white p-3 rounded border text-gray-800">
              <strong>Response:</strong> {responseText}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Using browser speech synthesis
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Select your preferred voice from the dropdown</li>
          <li>Type your message or use the microphone button for voice input</li>
          <li>Click "Generate Voice Response" to hear Gemini's reply</li>
          <li>The audio will auto-play when ready</li>
        </ul>
      </div>
    </div>
  );
};

export default GeminiVoiceChat;
