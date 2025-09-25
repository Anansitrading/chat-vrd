export type GeminiModel = 
  | 'gemini-2.5-flash'
  | 'gemini-1.5-flash' 
  | 'gemini-1.5-pro'
  | 'gemini-1.0-pro';

export interface ModelOption {
  value: GeminiModel;
  label: string;
  description: string;
  category: 'flash' | 'pro';
}

export const GEMINI_MODELS: ModelOption[] = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Latest fast model with improved capabilities',
    category: 'flash'
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for most tasks',
    category: 'flash'
  },
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    description: 'Advanced model for complex reasoning',
    category: 'pro'
  },
  {
    value: 'gemini-1.0-pro',
    label: 'Gemini 1.0 Pro',
    description: 'Stable pro model for production use',
    category: 'pro'
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
  selectedModel: 'gemini-2.5-flash'
};