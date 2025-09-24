import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { MCQOption } from '../utils/messageClassifier';

interface OptionGroupProps {
  options: MCQOption[];
  onSelect: (option: MCQOption) => void;
  onSubmit?: (selectedOptions: MCQOption[], openText?: string) => void;
  disabled?: boolean;
  short?: boolean;
  allowMultiple?: boolean;
  showOpenText?: boolean; // Add option to show/hide open text field
}

interface OptionButtonProps {
  option: MCQOption;
  onToggle: (option: MCQOption) => void;
  disabled?: boolean;
  selected?: boolean;
  allowMultiple?: boolean;
}

interface OptionRowProps {
  option: MCQOption;
  onToggle: (option: MCQOption) => void;
  disabled?: boolean;
  selected?: boolean;
  allowMultiple?: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ option, onToggle, disabled = false, selected = false, allowMultiple = false }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled) {
      onToggle(option);
    }
  }, [option, onToggle, disabled]);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  // Strip markdown for clean text extraction
  const stripMarkdown = (text: string) => {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  };

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
        btn-interactive focus-ring flex items-center
        ${selected 
          ? 'gradient-user shadow-lg transform scale-[0.98]' 
          : disabled 
            ? 'bg-gray-600 opacity-50 cursor-not-allowed' 
            : 'bg-gray-700 hover:bg-gray-600 active:scale-[0.97]'
        }
        ${isPressed ? 'animate-glow-pulse' : ''}
      `}
      aria-pressed={selected}
      role={allowMultiple ? 'checkbox' : 'button'}
      aria-checked={allowMultiple ? selected : undefined}
    >
      {allowMultiple && (
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0
          transition-all duration-200
          ${selected 
            ? 'border-white bg-white' 
            : 'border-gray-400'
          }
        `}>
          {selected && (
            <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
      <div className="flex-1">
        <span className="text-sm opacity-90">{option.label}.</span>
        <span className="ml-2">
          <ReactMarkdown 
            components={{ 
              p: React.Fragment,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>
            }}
          >
            {option.text}
          </ReactMarkdown>
        </span>
      </div>
    </button>
  );
};

const OptionRow: React.FC<OptionRowProps> = ({ option, onToggle, disabled = false, selected = false, allowMultiple = false }) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onToggle(option);
    }
  }, [option, onToggle, disabled]);

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
      role={allowMultiple ? 'checkbox' : 'radio'}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
          ${selected ? 'gradient-accent text-white' : 'bg-gray-600 text-gray-300'}
        `}>
          {option.label}
        </div>
        <span className="text-left text-white/90 flex-1">
          <ReactMarkdown 
            components={{ 
              p: React.Fragment,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>
            }}
          >
            {option.text}
          </ReactMarkdown>
        </span>
      </div>
      
      {allowMultiple ? (
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center
          transition-all duration-200
          ${selected 
            ? 'border-purple-400 bg-purple-400' 
            : 'border-gray-500'
          }
        `}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      ) : (
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
      )}
    </button>
  );
};

// Intelligent MCQ type detection
function detectShouldAllowMultiple(
  questionText: string | undefined, 
  options: MCQOption[], 
  allowMultipleProp?: boolean
): boolean {
  // If explicitly set, use that
  if (allowMultipleProp !== undefined) return allowMultipleProp;
  
  const optionTexts = options.map(opt => opt.text.toLowerCase());
  
  // Check if all options are numbers (ratings, scales, etc) - ALWAYS single select
  const allNumbers = options.every(opt => /^\d+(\.\d+)?$/.test(opt.text.trim()));
  if (allNumbers) return false; // Numbers like 1-10 ratings are NEVER multi-select
  
  // For all non-scale questions, default to multi-select
  // This ensures users can select multiple options as per requirements
  return true; // Changed to always return true for non-scale questions
}

export const OptionGroup: React.FC<OptionGroupProps> = ({ 
  options, 
  onSelect,
  onSubmit,
  disabled = false, 
  short,
  allowMultiple = false,
  showOpenText = true // Default to showing open text for all questions
}) => {
  const [selectedOptions, setSelectedOptions] = useState<MCQOption[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openTextValue, setOpenTextValue] = useState<string>('');

  // Use intelligent detection
  const shouldAllowMultiple = detectShouldAllowMultiple(undefined, options, allowMultiple);
  
  // Check if this is a rating scale (all numbers)
  const isRatingScale = options.every(opt => /^\d+(\.\d+)?$/.test(opt.text.trim()));

  // Determine layout based on option length or explicit short prop
  const isShortLayout = short ?? options.every(option => option.text.length <= 30);

  const handleToggle = useCallback((option: MCQOption) => {
    if (disabled || isProcessing) return; // Prevent clicks during processing

    if (shouldAllowMultiple) {
      setSelectedOptions(prev => 
        prev.find(opt => opt.label === option.label)
          ? prev.filter(opt => opt.label !== option.label)
          : [...prev, option]
      );
    } else {
      // Single select behavior
      setSelectedOptions(prev => {
        const isAlreadySelected = prev.find(opt => opt.label === option.label);
        if (isAlreadySelected) {
          // Deselect if clicking the same option
          return [];
        } else {
          // Select this option
          if (isRatingScale) {
            // For rating scales, auto-submit immediately with guard
            setIsProcessing(true);
            // Format as "I choose: X" will happen in ChatWindow
            onSelect(option);
            // Keep processing state to prevent double-clicks
            setTimeout(() => {
              setIsProcessing(false);
              setSelectedOptions([]);
            }, 500);
          }
          return [option];
        }
      });
    }
  }, [disabled, shouldAllowMultiple, isRatingScale, onSelect, isProcessing]);

  const handleSubmit = useCallback(() => {
    // Allow submit if options selected OR open text provided
    if (selectedOptions.length > 0 || openTextValue.trim()) {
      setIsProcessing(true);
      
      // Combine selected options with open text
      const combinedText = [
        ...selectedOptions.map(opt => opt.text),
        ...(openTextValue.trim() ? [`Other: ${openTextValue.trim()}`] : [])
      ].join('; ');
      
      if (onSubmit) {
        onSubmit(selectedOptions, openTextValue.trim());
      } else {
        // For single callback, submit combined option with text
        const combinedOption: MCQOption = {
          label: selectedOptions.length > 0 ? selectedOptions.map(opt => opt.label).join(',') : 'custom',
          text: combinedText,
          fullText: combinedText
        };
        onSelect(combinedOption);
      }
      
      // Reset after submission
      setTimeout(() => {
        setIsProcessing(false);
        setSelectedOptions([]);
        setOpenTextValue('');
      }, 150);
    }
  }, [selectedOptions, openTextValue, onSelect, onSubmit]);

  // Check if we should show the submit button
  const canSubmit = selectedOptions.length > 0 || openTextValue.trim().length > 0;
  const showSubmitButton = shouldAllowMultiple || (!isRatingScale && canSubmit);

  return (
    <div className="mt-4 space-y-3 animate-slide-up">
      {shouldAllowMultiple && !isRatingScale && (
        <div className="text-sm text-gray-400 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Select all that apply, or enter your own answer below
        </div>
      )}
      
      {isShortLayout ? (
        // Short layout: Full-width gradient buttons
        <div className="space-y-2">
          {options.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              onToggle={handleToggle}
              disabled={disabled}
              selected={selectedOptions.some(opt => opt.label === option.label)}
              allowMultiple={shouldAllowMultiple}
            />
          ))}
        </div>
      ) : (
        // Long layout: Vertical list with checkboxes/radio buttons
        <div className="space-y-3" role={shouldAllowMultiple ? 'group' : 'radiogroup'} aria-label="Multiple choice options">
          {options.map((option) => (
            <OptionRow
              key={option.label}
              option={option}
              onToggle={handleToggle}
              disabled={disabled}
              selected={selectedOptions.some(opt => opt.label === option.label)}
              allowMultiple={shouldAllowMultiple}
            />
          ))}
        </div>
      )}
      
      {/* Open-ended text input for all non-scale questions */}
      {showOpenText && !isRatingScale && (
        <div className="pt-2">
          <label className="block text-sm text-gray-400 mb-2">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Or provide your own answer (optional):
            </span>
          </label>
          <textarea
            value={openTextValue}
            onChange={(e) => setOpenTextValue(e.target.value)}
            placeholder="Type your answer here..."
            disabled={disabled || isProcessing}
            className="
              w-full px-4 py-3 rounded-xl
              bg-gray-700 text-white placeholder-gray-400
              border border-gray-600 focus:border-blue-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
            "
            rows={3}
            aria-label="Open-ended response"
          />
        </div>
      )}
      
      {/* Submit button for multi-select and when there's input */}
      {showSubmitButton && canSubmit && (
        <div className="pt-3">
          <button
            onClick={handleSubmit}
            disabled={disabled || isProcessing}
            className="
              w-full px-4 py-3 rounded-xl font-medium text-white
              bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
              transition-all duration-150 ease-out
              btn-interactive focus-ring
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg
            "
          >
            {isProcessing ? 'Processing...' : 
             shouldAllowMultiple && selectedOptions.length > 0 ? 
               `Submit ${selectedOptions.length} selection${selectedOptions.length !== 1 ? 's' : ''}${openTextValue.trim() ? ' + comment' : ''}` :
               openTextValue.trim() && selectedOptions.length === 0 ?
                 'Submit your answer' :
                 'Continue'
            }
          </button>
        </div>
      )}
      
      {/* Loading state for single select */}
      {!shouldAllowMultiple && isProcessing && (
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