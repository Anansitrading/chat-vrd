import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SystemPromptEditor } from './SystemPromptEditor';
import { ModelSelector } from './ModelSelector';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsFormData, GEMINI_MODELS } from '../types/settings';
import { KIJKO_SYSTEM_PROMPT } from '../constants';

// Validation schema
const settingsSchema = z.object({
  systemPrompt: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(50000, 'System prompt must be less than 50,000 characters'),
  selectedModel: z.enum([
    // Latest 2.5 Series
    'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash-image',
    // 2.0 Series 
    'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-experimental',
    // Legacy 1.5 Series
    'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'
  ])
});

export const SettingsTab: React.FC = () => {
  const { settings, updateSettings, resetToDefaults, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isValid }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      systemPrompt: settings.systemPrompt,
      selectedModel: settings.selectedModel
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Update form when settings change
  useEffect(() => {
    setValue('systemPrompt', settings.systemPrompt);
    setValue('selectedModel', settings.selectedModel);
  }, [settings, setValue]);

  // Clear save message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateSettings({
        ...settings,
        ...data
      });

      if (success) {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: 'An error occurred while saving settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      try {
        await resetToDefaults();
        setSaveMessage({ type: 'success', text: 'Settings reset to default values.' });
      } catch (error) {
        console.error('Error resetting settings:', error);
        setSaveMessage({ type: 'error', text: 'Failed to reset settings.' });
      }
    }
  };

  const handleResetSystemPrompt = () => {
    setValue('systemPrompt', KIJKO_SYSTEM_PROMPT, { shouldDirty: true });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="border-b border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">
            Configure your Kijko assistant's behavior and model preferences.
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`
            p-4 rounded-lg border flex items-center gap-3
            ${saveMessage.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-200' 
              : 'bg-red-500/10 border-red-500/20 text-red-200'
            }
          `}>
            {saveMessage.type === 'success' ? (
              <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <span className="text-sm">{saveMessage.text}</span>
          </div>
        )}

        {/* System Prompt Section */}
        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <SystemPromptEditor
            value={watchedValues.systemPrompt}
            onChange={(value) => setValue('systemPrompt', value, { shouldDirty: true })}
            onReset={handleResetSystemPrompt}
            isLoading={isLoading || isSaving}
            error={errors.systemPrompt?.message}
          />
        </div>

        {/* Model Selection Section */}
        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <ModelSelector
            value={watchedValues.selectedModel}
            onChange={(model) => setValue('selectedModel', model, { shouldDirty: true })}
            disabled={isLoading || isSaving}
            error={errors.selectedModel?.message}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
          {/* Save & Cancel */}
          <div className="flex gap-3 flex-1">
            <button
              type="submit"
              disabled={!isDirty || !isValid || isLoading || isSaving}
              className="
                flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
                bg-gradient-to-r from-purple-600 to-blue-600 text-white
                hover:from-purple-700 hover:to-blue-700
                disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed
                transition-all duration-200
                flex-1 sm:flex-initial
              "
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setValue('systemPrompt', settings.systemPrompt);
                setValue('selectedModel', settings.selectedModel);
              }}
              disabled={!isDirty || isLoading || isSaving}
              className="
                flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
                bg-gray-700 text-gray-200 hover:bg-gray-600
                disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                transition-colors duration-200
                flex-1 sm:flex-initial
              "
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </button>
          </div>

          {/* Reset to Defaults */}
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || isSaving}
            className="
              flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
              bg-red-600/20 text-red-400 border border-red-600/30
              hover:bg-red-600/30 hover:border-red-600/50
              disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700
              disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Status Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Settings are automatically saved to your browser's local storage</p>
          <p>• Changes will apply to new conversations</p>
          <p>• Current conversations will continue using previous settings</p>
        </div>
      </form>
    </div>
  );
};
