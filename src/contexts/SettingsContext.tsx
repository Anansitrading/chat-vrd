import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppSettings, SettingsAction, GeminiModel } from '../types/settings';
import { loadSettings, saveSettings, resetSettings } from '../utils/settingsStorage';

// Settings reducer
const settingsReducer = (state: AppSettings, action: SettingsAction): AppSettings => {
  switch (action.type) {
    case 'SET_SYSTEM_PROMPT':
      return {
        ...state,
        systemPrompt: action.payload
      };
    
    case 'SET_MODEL':
      return {
        ...state,
        selectedModel: action.payload
      };
    
    case 'LOAD_SETTINGS':
      return action.payload;
    
    case 'RESET_TO_DEFAULTS':
      return resetSettings();
    
    default:
      return state;
  }
};

// Context interface
interface SettingsContextType {
  settings: AppSettings;
  updateSystemPrompt: (prompt: string) => Promise<boolean>;
  updateModel: (model: GeminiModel) => Promise<boolean>;
  updateSettings: (newSettings: AppSettings) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  isLoading: boolean;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider props
interface SettingsProviderProps {
  children: ReactNode;
}

// Provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, dispatch] = useReducer(settingsReducer, loadSettings());
  const [isLoading, setIsLoading] = React.useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadInitialSettings = async () => {
      setIsLoading(true);
      try {
        const loadedSettings = loadSettings();
        dispatch({ type: 'LOAD_SETTINGS', payload: loadedSettings });
      } catch (error) {
        console.error('Failed to load initial settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSettings();
  }, []);

  // Note: Auto-save removed - settings are only saved when user explicitly clicks Save

  // Context value methods
  const updateSystemPrompt = async (prompt: string): Promise<boolean> => {
    try {
      const newSettings = { ...settings, systemPrompt: prompt };
      const saved = saveSettings(newSettings);
      
      if (saved) {
        dispatch({ type: 'SET_SYSTEM_PROMPT', payload: prompt });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update system prompt:', error);
      return false;
    }
  };

  const updateModel = async (model: GeminiModel): Promise<boolean> => {
    try {
      const newSettings = { ...settings, selectedModel: model };
      const saved = saveSettings(newSettings);
      
      if (saved) {
        dispatch({ type: 'SET_MODEL', payload: model });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update model:', error);
      return false;
    }
  };

  const updateSettings = async (newSettings: AppSettings): Promise<boolean> => {
    try {
      const saved = saveSettings(newSettings);
      
      if (saved) {
        dispatch({ type: 'LOAD_SETTINGS', payload: newSettings });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      const defaultSettings = resetSettings();
      dispatch({ type: 'RESET_TO_DEFAULTS' });
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSystemPrompt,
    updateModel,
    updateSettings,
    resetToDefaults,
    isLoading
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook to use settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
};