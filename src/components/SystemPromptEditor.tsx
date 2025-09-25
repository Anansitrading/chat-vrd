import React, { useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-dark.css';
import { ArrowUturnLeftIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  isLoading?: boolean;
  error?: string;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  value,
  onChange,
  onReset,
  isLoading = false,
  error
}) => {
  const highlightCode = useCallback((code: string) => {
    return highlight(code, languages.markdown, 'markdown');
  }, []);

  const handleEditorChange = useCallback((code: string) => {
    onChange(code);
  }, [onChange]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">System Prompt</h3>
          <p className="text-sm text-gray-400">
            Configure how Kijko responds and behaves in conversations
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={isLoading}
          className="
            flex items-center gap-2 px-3 py-2 text-sm
            text-gray-400 hover:text-white
            bg-gray-800 hover:bg-gray-700
            border border-gray-600 hover:border-gray-500
            rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          title="Reset to default system prompt"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Editor Container */}
      <div className="relative">
        <div className="
          bg-gray-900 border border-gray-700 rounded-lg overflow-hidden
          focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20
          transition-colors
        ">
          <div className="p-4">
            <Editor
              value={value}
              onValueChange={handleEditorChange}
              highlight={highlightCode}
              padding={0}
              disabled={isLoading}
              className="
                min-h-[300px] max-h-[500px] overflow-y-auto
                text-sm font-mono text-gray-200
                focus:outline-none
                disabled:opacity-50
              "
              style={{
                fontFamily: '"Fira Code", "Monaco", "Cascadia Code", "Ubuntu Mono", monospace',
                fontSize: 14,
                lineHeight: 1.5,
                tabSize: 2,
              }}
              textareaClassName="
                focus:outline-none resize-none
                placeholder:text-gray-500
              "
              placeholder="Enter your system prompt here..."
            />
          </div>

          {/* Character Count */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-t border-gray-700">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{value.length.toLocaleString()} characters</span>
              <span>{value.split('\n').length} lines</span>
            </div>
            
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            )}
          </div>
        </div>

        {/* Syntax Highlighting Info */}
        <div className="mt-2 text-xs text-gray-500">
          Markdown syntax highlighting enabled • Use Ctrl+A to select all • Tab for indentation
        </div>
      </div>

      {/* Tips */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <CheckIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-200 space-y-1">
            <p><strong>Tips for effective system prompts:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Be specific about the assistant's role and capabilities</li>
              <li>Include examples of desired behavior when possible</li>
              <li>Define the expected response format and tone</li>
              <li>Set clear boundaries and limitations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};