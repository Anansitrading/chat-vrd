// public/audio-processor-worklet.js
// Downsample microphone Float32 (typically 48kHz) to 16kHz int16 PCM.
// Posts Uint8Array chunks to the main thread: { type: 'pcm16', data: Uint8Array }

class DownsamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate; // AudioContext sample rate (e.g., 48000)
    this.targetRate = 16000;
    this.decimation = this.inputSampleRate / this.targetRate; // e.g., 3.0
    this._residual = new Float32Array(0);
  }

  // Simple downsampler by averaging frames (okay for speech; for production use a FIR)
  _downsample(buffer) {
    const outLength = Math.floor((buffer.length + this._residual.length) / this.decimation);
    const out = new Int16Array(outLength);

    // concat residual + new chunk
    const input = new Float32Array(this._residual.length + buffer.length);
    input.set(this._residual, 0);
    input.set(buffer, this._residual.length);

    let i = 0;
    let o = 0;
    let acc = 0;
    let accCount = 0;
    let nextSampleAt = this.decimation;

    while (i < input.length && o < out.length) {
      acc += input[i++];
      accCount++;
      nextSampleAt -= 1;
      if (nextSampleAt <= 0) {
        const avg = acc / accCount;
        const s = Math.max(-1, Math.min(1, avg));
        out[o++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        acc = 0;
        accCount = 0;
        nextSampleAt += this.decimation;
      }
    }

    // keep the tail for next call
    const consumed = Math.floor((o * this.decimation));
    const remain = input.length - consumed;
    this._residual = remain > 0 ? input.slice(consumed) : new Float32Array(0);

    return out;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0]; // mono only
    if (!ch0 || ch0.length === 0) return true;

    const pcm16 = this._downsample(ch0);
    if (pcm16.length > 0) {
      const view = new Uint8Array(pcm16.buffer);
      this.port.postMessage({ type: 'pcm16', data: view });
    }
    return true;
  }
}

registerProcessor('pcm16k-downsampler', DownsamplerProcessor);

// Keep the old processor for backward compatibility if needed
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      
      for (let i = 0; i < samples.length; i++) {
        this.buffer[this.bufferIndex++] = samples[i];
        
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32 to Int16 PCM
          const pcmData = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = Math.max(-1, Math.min(1, this.buffer[j]));
            pcmData[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Send PCM data to main thread
          this.port.postMessage({ 
            type: 'audio', 
            data: pcmData 
          });
          
          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
