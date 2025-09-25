import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { KIJKO_SYSTEM_PROMPT } from '../constants';

const SETTINGS_KEY = 'kijko_app_settings';

// Initialize default settings with actual system prompt
const getDefaultSettings = (): AppSettings => ({
  ...DEFAULT_SETTINGS,
  systemPrompt: KIJKO_SYSTEM_PROMPT
});

/**
 * Load settings from localStorage with type safety and error handling
 */
export const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    
    if (!stored) {
      return getDefaultSettings();
    }

    const parsed = JSON.parse(stored) as AppSettings;
    
    // Validate that all required properties exist
    if (
      typeof parsed.systemPrompt !== 'string' ||
      typeof parsed.selectedModel !== 'string' ||
      !parsed.systemPrompt.trim()
    ) {
      console.warn('Invalid settings found in localStorage, using defaults');
      return getDefaultSettings();
    }

    return {
      ...getDefaultSettings(),
      ...parsed
    };
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return getDefaultSettings();
  }
};

/**
 * Save settings to localStorage with error handling
 */
export const saveSettings = (settings: AppSettings): boolean => {
  try {
    const serialized = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, serialized);
    console.log('Settings saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    return false;
  }
};

/**
 * Reset settings to default values
 */
export const resetSettings = (): AppSettings => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    console.log('Settings reset to defaults');
    return getDefaultSettings();
  } catch (error) {
    console.error('Failed to reset settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Check if settings exist in localStorage
 */
export const hasStoredSettings = (): boolean => {
  try {
    return localStorage.getItem(SETTINGS_KEY) !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Validate settings object structure
 */
export const validateSettings = (settings: unknown): settings is AppSettings => {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const s = settings as Record<string, unknown>;
  
  return (
    typeof s.systemPrompt === 'string' &&
    typeof s.selectedModel === 'string' &&
    s.systemPrompt.trim().length > 0
  );
};