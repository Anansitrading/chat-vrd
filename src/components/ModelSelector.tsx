import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { GeminiModel, GEMINI_MODELS, ModelOption } from '../types/settings';

interface ModelSelectorProps {
  value: GeminiModel;
  onChange: (model: GeminiModel) => void;
  disabled?: boolean;
  error?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get selected model info
  const selectedModel = GEMINI_MODELS.find(model => model.value === value);

  // Group models by category
  const flashModels = GEMINI_MODELS.filter(model => model.category === 'flash');
  const proModels = GEMINI_MODELS.filter(model => model.category === 'pro');

  const handleSelect = (model: GeminiModel) => {
    onChange(model);
    setIsOpen(false);
  };

  const getCategoryIcon = (category: 'flash' | 'pro') => {
    return category === 'flash' ? (
      <SparklesIcon className="w-4 h-4 text-yellow-400" />
    ) : (
      <CpuChipIcon className="w-4 h-4 text-blue-400" />
    );
  };

  const CategorySection: React.FC<{ models: ModelOption[]; title: string; category: 'flash' | 'pro' }> = ({
    models,
    title,
    category
  }) => (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-700">
        {getCategoryIcon(category)}
        {title}
      </div>
      {models.map((model) => (
        <button
          key={model.value}
          onClick={() => handleSelect(model.value)}
          className={`
            w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors
            ${value === model.value ? 'bg-purple-600/20 text-purple-300' : 'text-gray-200'}
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.label}</span>
                {value === model.value && (
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {model.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">AI Model</h3>
        <p className="text-sm text-gray-400">
          Choose the Gemini model for conversation processing
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Model Selector */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between gap-3 p-4
            bg-gray-800 border border-gray-700 rounded-lg
            hover:border-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isOpen ? 'border-purple-500/50 ring-1 ring-purple-500/20' : ''}
          `}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedModel && getCategoryIcon(selectedModel.category)}
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-white truncate">
                {selectedModel?.label || 'Select Model'}
              </p>
              {selectedModel && (
                <p className="text-sm text-gray-400 truncate">
                  {selectedModel.description}
                </p>
              )}
            </div>
          </div>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="
              absolute top-full left-0 right-0 mt-2 z-50
              bg-gray-800 border border-gray-700 rounded-lg
              shadow-xl shadow-black/20
              max-h-96 overflow-y-auto
            "
          >
            <CategorySection 
              models={flashModels} 
              title="Flash Models" 
              category="flash"
            />
            <CategorySection 
              models={proModels} 
              title="Pro Models" 
              category="pro"
            />
          </div>
        )}
      </div>

      {/* Model Information */}
      {selectedModel && (
        <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {getCategoryIcon(selectedModel.category)}
            <span className="text-sm font-medium text-white">
              {selectedModel.category === 'flash' ? 'Fast & Efficient' : 'Advanced Reasoning'}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {selectedModel.category === 'flash' 
              ? 'Optimized for speed and everyday tasks with lower latency'
              : 'Designed for complex reasoning, analysis, and demanding tasks'
            }
          </p>
        </div>
      )}
    </div>
  );
};