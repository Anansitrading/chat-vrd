export interface AudioCaptureResult {
  base64Audio: string;
  mimeType: string;
  duration: number;
}

export class AudioCaptureManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  /**
   * Request microphone permission and initialize audio context
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone with optimal settings for speech
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for Deepgram
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context for processing
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

    } catch (error) {
      console.error('Microphone access denied:', error);
      throw new Error('Microphone permission required');
    }
  }

  /**
   * Capture initial audio sample for language detection
   * @param durationMs Duration in milliseconds (default: 2000ms)
   */
  async captureInitialSample(durationMs: number = 2000): Promise<AudioCaptureResult> {
    if (!this.mediaStream) {
      throw new Error('Audio capture not initialized');
    }

    return new Promise((resolve, reject) => {
      this.audioChunks = [];

      // Use MediaRecorder for browser compatibility
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus', // Wide browser support
      };

      this.mediaRecorder = new MediaRecorder(this.mediaStream!, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Convert to PCM Int16 for Deepgram
          const pcmData = await this.convertToPCM(audioBlob);
          const base64Audio = this.arrayBufferToBase64(pcmData);

          resolve({
            base64Audio,
            mimeType: 'audio/pcm;rate=16000',
            duration: durationMs,
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.start();

      // Stop after specified duration
      setTimeout(() => {
        this.mediaRecorder?.stop();
      }, durationMs);
    });
  }

  /**
   * Convert WebM/Opus audio to PCM Int16 format for Deepgram
   */
  private async convertToPCM(audioBlob: Blob): Promise<ArrayBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Get audio data (mono channel)
    const channelData = audioBuffer.getChannelData(0);

    // Convert Float32 to Int16 PCM
    const pcmData = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit integer
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    return pcmData.buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Start streaming audio for continuous transcription
   */
  startStreaming(onAudioChunk: (chunk: ArrayBuffer) => void): void {
    if (!this.mediaStream || !this.audioContext) {
      throw new Error('Audio capture not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      
      for (let i = 0; i < inputData.length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      onAudioChunk(pcmData.buffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Detect if running on mobile Safari
 */
export function isMobileSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}