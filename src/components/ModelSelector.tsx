import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SparklesIcon, CpuChipIcon, BeakerIcon, PhotoIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
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

  // Group models by generation and category
  const modelsByGeneration = {
    '2.5': GEMINI_MODELS.filter(model => model.generation === '2.5'),
    '2.0': GEMINI_MODELS.filter(model => model.generation === '2.0'),
    '1.5': GEMINI_MODELS.filter(model => model.generation === '1.5')
  };

  const handleSelect = (model: GeminiModel) => {
    onChange(model);
    setIsOpen(false);
  };

  const getCategoryIcon = (category: ModelOption['category']) => {
    switch (category) {
      case 'live':
        return <div className="w-4 h-4 text-red-400 flex items-center justify-center">🎤</div>;
      case 'pro':
        return <CpuChipIcon className="w-4 h-4 text-blue-400" />;
      case 'flash':
        return <SparklesIcon className="w-4 h-4 text-yellow-400" />;
      case 'flash-lite':
        return <RocketLaunchIcon className="w-4 h-4 text-green-400" />;
      case 'experimental':
        return <BeakerIcon className="w-4 h-4 text-purple-400" />;
      case 'image':
        return <PhotoIcon className="w-4 h-4 text-pink-400" />;
      default:
        return <SparklesIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getModelTip = (category: ModelOption['category']) => {
    switch (category) {
      case 'live':
        return 'Real-time conversational AI with integrated speech-to-text, language processing, and text-to-speech streaming. Perfect for natural voice conversations.';
      case 'pro':
        return 'Best for complex reasoning, analysis, and professional tasks requiring highest quality output.';
      case 'flash':
        return 'Perfect balance of speed and quality for most conversational AI applications.';
      case 'flash-lite':
        return 'Optimized for high-throughput scenarios where speed and cost efficiency are priorities.';
      case 'experimental':
        return 'Cutting-edge features but may have stability issues. Great for testing new capabilities.';
      case 'image':
        return 'Specialized for image understanding and analysis tasks with fast processing.';
      default:
        return 'General-purpose model suitable for various AI tasks.';
    }
  };

  const GenerationSection: React.FC<{ models: ModelOption[]; generation: string }> = ({
    models,
    generation
  }) => {
    if (models.length === 0) return null;
    
    const generationLabels = {
      '2.5': '2.5 Series - Latest & Most Powerful',
      '2.0': '2.0 Series - Current Generation', 
      '1.5': '1.5 Series - Legacy Support'
    };
    
    return (
      <div>
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-800/50 border-b border-gray-700">
          <span className="text-purple-400 font-bold">Gemini {generation}</span>
          <span className="text-gray-500">•</span>
          <span>{generationLabels[generation as keyof typeof generationLabels]}</span>
        </div>
        {models.map((model) => (
          <button
            key={model.value}
            onClick={() => handleSelect(model.value)}
            className={`
              w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors border-b border-gray-800/50 last:border-b-0
              ${value === model.value ? 'bg-purple-600/20 text-purple-300' : 'text-gray-200'}
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getCategoryIcon(model.category)}
                  <span className="font-medium">{model.label}</span>
                  {value === model.value && (
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                  {model.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                    Speed: {model.performance}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                    Quality: {model.quality}
                  </span>
                  {model.contextLength && (
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                      Context: {model.contextLength}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

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
            {Object.entries(modelsByGeneration).map(([generation, models]) => (
              <GenerationSection
                key={generation}
                models={models}
                generation={generation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Model Information */}
      {selectedModel && (
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            {getCategoryIcon(selectedModel.category)}
            <div>
              <span className="text-sm font-medium text-white block">
                Gemini {selectedModel.generation} • {selectedModel.category.charAt(0).toUpperCase() + selectedModel.category.slice(1).replace('-', ' ')}
              </span>
              <span className="text-xs text-gray-400">
                Performance: {selectedModel.performance} • Quality: {selectedModel.quality}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-700/30 rounded p-2">
              <span className="text-gray-400 block">Speed</span>
              <span className="text-white font-medium">{selectedModel.performance}</span>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <span className="text-gray-400 block">Quality</span>
              <span className="text-white font-medium">{selectedModel.quality}</span>
            </div>
            {selectedModel.contextLength && (
              <div className="bg-gray-700/30 rounded p-2 col-span-2">
                <span className="text-gray-400 block">Context Length</span>
                <span className="text-white font-medium">{selectedModel.contextLength}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-200">
            <strong>💡 Tip:</strong> {getModelTip(selectedModel.category)}
          </div>
        </div>
      )}
    </div>
  );
};