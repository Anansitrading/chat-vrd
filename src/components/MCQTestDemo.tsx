import React, { useState } from 'react';
import OptionGroup from './OptionGroup';
import { MCQOption } from '../utils/messageClassifier';

const MCQTestDemo: React.FC = () => {
  const [selectedResults, setSelectedResults] = useState<string[]>([]);

  // Example 1: Single select question
  const singleSelectOptions: MCQOption[] = [
    { label: 'A', text: 'A professional and formal approach', fullText: 'A professional and formal approach' },
    { label: 'B', text: 'A **casual and friendly** style', fullText: 'A casual and friendly style' },
    { label: 'C', text: 'A *mysterious* and intriguing tone', fullText: 'A mysterious and intriguing tone' },
    { label: 'D', text: 'An **energetic** and *enthusiastic* vibe', fullText: 'An energetic and enthusiastic vibe' }
  ];

  // Example 2: Multi-select question (automatically detected based on content)
  const multiSelectOptions: MCQOption[] = [
    { label: 'A', text: '**Energetic** and upbeat', fullText: 'Energetic and upbeat' },
    { label: 'B', text: '*Mysterious* and suspenseful', fullText: 'Mysterious and suspenseful' },
    { label: 'C', text: 'Professional **style**', fullText: 'Professional style' },
    { label: 'D', text: 'Warm and friendly **tone**', fullText: 'Warm and friendly tone' },
    { label: 'E', text: 'Dramatic and *cinematic*', fullText: 'Dramatic and cinematic' }
  ];

  // Example 3: Explicit multi-select
  const explicitMultiSelect: MCQOption[] = [
    { label: 'A', text: 'Include **background music**', fullText: 'Include background music' },
    { label: 'B', text: 'Add *voice narration*', fullText: 'Add voice narration' },
    { label: 'C', text: 'Use **text overlays**', fullText: 'Use text overlays' },
    { label: 'D', text: 'Include *sound effects*', fullText: 'Include sound effects' }
  ];

  const handleSingleSelect = (option: MCQOption) => {
    setSelectedResults(prev => [...prev, `Single Select: ${option.text}`]);
  };

  const handleMultiSelect = (options: MCQOption[]) => {
    const result = `Multi Select: ${options.map(opt => opt.text).join(', ')}`;
    setSelectedResults(prev => [...prev, result]);
  };

  const handleExplicitMultiSelect = (options: MCQOption[]) => {
    const result = `Explicit Multi Select: ${options.map(opt => opt.text).join(', ')}`;
    setSelectedResults(prev => [...prev, result]);
  };

  const clearResults = () => setSelectedResults([]);

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2">Enhanced MCQ Test Demo</h1>
          <p className="text-gray-400">
            Testing single-select, auto-detected multi-select, and explicit multi-select options
          </p>
        </header>

        {/* Example 1: Single Select */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">1. Single Select Question</h2>
          <p className="text-gray-300 mb-4">
            What tone would you prefer for your video? (Auto-detects as single select)
          </p>
          <OptionGroup
            options={singleSelectOptions}
            onSelect={handleSingleSelect}
          />
        </section>

        {/* Example 2: Auto Multi-Select */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">2. Auto-Detected Multi-Select</h2>
          <p className="text-gray-300 mb-4">
            Which styles and tones appeal to you? (Auto-detects as multi-select based on keywords)
          </p>
          <OptionGroup
            options={multiSelectOptions}
            onSelect={handleSingleSelect}
            onSubmit={handleMultiSelect}
          />
        </section>

        {/* Example 3: Explicit Multi-Select */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">3. Explicit Multi-Select</h2>
          <p className="text-gray-300 mb-4">
            What elements would you like to include? (Explicitly set as multi-select)
          </p>
          <OptionGroup
            options={explicitMultiSelect}
            onSelect={handleSingleSelect}
            onSubmit={handleExplicitMultiSelect}
            allowMultiple={true}
          />
        </section>

        {/* Results Display */}
        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Selection Results</h2>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              Clear Results
            </button>
          </div>
          
          {selectedResults.length === 0 ? (
            <p className="text-gray-400 italic">No selections made yet...</p>
          ) : (
            <div className="space-y-2">
              {selectedResults.map((result, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded p-3 border-l-4 border-blue-500"
                >
                  <span className="text-sm text-gray-300">
                    Selection #{index + 1}:
                  </span>
                  <p className="text-white mt-1">{result}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Features Summary */}
        <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">✨ Enhanced Features</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-300 mb-2">🎨 Visual Enhancements</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• **Bold** and *italic* markdown rendering</li>
                <li>• Checkbox indicators for multi-select</li>
                <li>• Responsive layouts (short vs long)</li>
                <li>• Smooth animations and transitions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-300 mb-2">⚡ Interaction Features</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Auto-detection of multi-select scenarios</li>
                <li>• Contextual hint text and tooltips</li>
                <li>• Submit button for multi-select confirmation</li>
                <li>• Accessible ARIA roles and labels</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MCQTestDemo;