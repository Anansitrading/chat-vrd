export type GeminiModel = 
  // Live Real-Time Models (Experimental)
  | 'gemini-live-2.5-flash-preview-native-audio-09-2025'
  // Latest 2.5 Series (Most Powerful)
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash-image'
  // 2.0 Series (Current Generation)
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.0-flash-experimental'
  // Legacy 1.5 Series
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-flash-8b';

export interface ModelOption {
  value: GeminiModel;
  label: string;
  description: string;
  category: 'live' | 'pro' | 'flash' | 'flash-lite' | 'experimental' | 'image';
  generation: '1.5' | '2.0' | '2.5';
  contextLength?: string;
  performance: 'fastest' | 'fast' | 'medium' | 'high';
  quality: 'medium' | 'high' | 'very-high' | 'highest';
}

export const GEMINI_MODELS: ModelOption[] = [
  // Live Real-Time Models - Experimental
  {
    value: 'gemini-live-2.5-flash-preview-native-audio-09-2025',
    label: 'Gemini Live 2.5 Flash Native Audio',
    description: 'Real-time native audio conversational AI with ultra-low latency',
    category: 'live',
    generation: '2.5',
    contextLength: '1M+ tokens',
    performance: 'fastest',
    quality: 'high'
  },
  // Latest 2.5 Series - Most Powerful
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Most powerful model with premium reasoning and extended context',
    category: 'pro',
    generation: '2.5',
    contextLength: '2M+ tokens',
    performance: 'medium',
    quality: 'highest'
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Latest fast model with improved cost and performance',
    category: 'flash',
    generation: '2.5',
    contextLength: '1M+ tokens',
    performance: 'fast',
    quality: 'high'
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: 'Ultra-light model for maximum speed and economy',
    category: 'flash-lite',
    generation: '2.5',
    contextLength: '~1M tokens',
    performance: 'fastest',
    quality: 'medium'
  },
  {
    value: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    description: 'Specialized for high-speed image understanding tasks',
    category: 'image',
    generation: '2.5',
    performance: 'fast',
    quality: 'high'
  },
  
  // 2.0 Series - Current Generation
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Fully multimodal with enhanced spatial and video understanding',
    category: 'flash',
    generation: '2.0',
    contextLength: '1-2M+ tokens',
    performance: 'fast',
    quality: 'high'
  },
  {
    value: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    description: 'Optimized for maximum speed with some quality trade-offs',
    category: 'flash-lite',
    generation: '2.0',
    contextLength: '~512K tokens',
    performance: 'fastest',
    quality: 'medium'
  },
  {
    value: 'gemini-2.0-flash-experimental',
    label: 'Gemini 2.0 Flash (Experimental)',
    description: 'Cutting-edge features with live multimodal API and agentic functions',
    category: 'experimental',
    generation: '2.0',
    contextLength: '1M+ tokens',
    performance: 'fast',
    quality: 'high'
  },
  
  // Legacy 1.5 Series - Still Supported
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    description: 'Large-scale context with strong reasoning (legacy)',
    category: 'pro',
    generation: '1.5',
    contextLength: 'Up to 1M tokens',
    performance: 'medium',
    quality: 'very-high'
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Fast multimodal processing (legacy)',
    category: 'flash',
    generation: '1.5',
    contextLength: 'Up to 1M tokens',
    performance: 'fast',
    quality: 'high'
  },
  {
    value: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    description: 'Smaller, high-speed model for basic tasks (legacy)',
    category: 'flash-lite',
    generation: '1.5',
    contextLength: 'Up to 1M tokens',
    performance: 'fastest',
    quality: 'medium'
  }
];

export interface AppSettings {
  systemPrompt: string;
  selectedModel: GeminiModel;
  // Future settings will be added here
  sttModel?: string;
  ttsModel?: string;
}

export interface SettingsFormData {
  systemPrompt: string;
  selectedModel: GeminiModel;
}

export type SettingsAction =
  | { type: 'SET_SYSTEM_PROMPT'; payload: string }
  | { type: 'SET_MODEL'; payload: GeminiModel }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings }
  | { type: 'RESET_TO_DEFAULTS' };

export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: '', // Will be set from KIJKO_SYSTEM_PROMPT constant
  selectedModel: 'gemini-2.5-pro' // Use the most powerful model by default
};
