import React, { useState, useCallback } from 'react';
import { MCQOption } from '../utils/messageClassifier';

interface OptionGroupProps {
  options: MCQOption[];
  onSelect: (option: MCQOption) => void;
  disabled?: boolean;
  short?: boolean;
}

interface OptionButtonProps {
  option: MCQOption;
  onSelect: (option: MCQOption) => void;
  disabled?: boolean;
  selected?: boolean;
}

interface OptionRowProps {
  option: MCQOption;
  onSelect: (option: MCQOption) => void;
  disabled?: boolean;
  selected?: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ option, onSelect, disabled = false, selected = false }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(option);
    }
  }, [option, onSelect, disabled]);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={`
        w-full text-left px-4 py-3 rounded-xl font-medium text-white
        transition-all duration-150 ease-out
        btn-interactive focus-ring
        ${selected 
          ? 'gradient-user shadow-lg transform scale-[0.98]' 
          : disabled 
            ? 'bg-gray-600 opacity-50 cursor-not-allowed' 
            : 'bg-gray-700 hover:bg-gray-600 active:scale-[0.97]'
        }
        ${isPressed ? 'animate-glow-pulse' : ''}
      `}
      aria-pressed={selected}
      role="button"
    >
      <span className="text-sm opacity-90">{option.label}.</span>
      <span className="ml-2">{option.text}</span>
    </button>
  );
};

const OptionRow: React.FC<OptionRowProps> = ({ option, onSelect, disabled = false, selected = false }) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(option);
    }
  }, [option, onSelect, disabled]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between p-4 rounded-lg
        transition-all duration-150 ease-out
        btn-interactive focus-ring
        ${selected 
          ? 'bg-purple-900/50 border border-purple-400' 
          : disabled 
            ? 'bg-gray-800/50 opacity-50 cursor-not-allowed' 
            : 'bg-gray-800/30 hover:bg-gray-700/50 active:scale-[0.98]'
        }
      `}
      aria-checked={selected}
      role="radio"
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
          ${selected ? 'gradient-accent text-white' : 'bg-gray-600 text-gray-300'}
        `}>
          {option.label}
        </div>
        <span className="text-left text-white/90 flex-1">{option.text}</span>
      </div>
      
      <div className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center
        transition-all duration-200
        ${selected 
          ? 'border-purple-400 bg-purple-400' 
          : 'border-gray-500'
        }
      `}>
        {selected && (
          <div className="w-2 h-2 bg-white rounded-full animate-scale-press" />
        )}
      </div>
    </button>
  );
};

export const OptionGroup: React.FC<OptionGroupProps> = ({ 
  options, 
  onSelect, 
  disabled = false, 
  short 
}) => {
  const [selectedOption, setSelectedOption] = useState<MCQOption | null>(null);

  // Determine layout based on option length or explicit short prop
  const isShortLayout = short ?? options.every(option => option.text.length <= 30);

  const handleSelect = useCallback((option: MCQOption) => {
    if (!disabled) {
      setSelectedOption(option);
      // Small delay to show selection before calling onSelect
      setTimeout(() => {
        onSelect(option);
      }, 150);
    }
  }, [onSelect, disabled]);

  return (
    <div className="mt-4 space-y-3 animate-slide-up">
      {isShortLayout ? (
        // Short layout: Full-width gradient buttons
        <div className="space-y-2">
          {options.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              onSelect={handleSelect}
              disabled={disabled}
              selected={selectedOption?.label === option.label}
            />
          ))}
        </div>
      ) : (
        // Long layout: Vertical list with radio buttons
        <div className="space-y-3" role="radiogroup" aria-label="Multiple choice options">
          {options.map((option) => (
            <OptionRow
              key={option.label}
              option={option}
              onSelect={handleSelect}
              disabled={disabled}
              selected={selectedOption?.label === option.label}
            />
          ))}
        </div>
      )}
      
      {/* Loading state when option is selected */}
      {selectedOption && (
        <div className="flex items-center justify-center pt-2">
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionGroup;