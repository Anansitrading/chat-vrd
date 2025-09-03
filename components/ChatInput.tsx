
import React, { useState, useRef, useCallback } from 'react';
import { Attachment } from '../types';
import { SendIcon } from './icons/SendIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { XCircleIcon } from './icons/FileIcons';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (isLoading || (!text.trim() && attachments.length === 0)) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (attachments.length + files.length > MAX_FILES) {
        alert(`You can only upload a maximum of ${MAX_FILES} files.`);
        return;
    }

    const newAttachments: Attachment[] = [];
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            continue;
        }
        try {
            const data = await fileToBase64(file);
            newAttachments.push({ name: file.name, type: file.type, size: file.size, data });
        } catch (error) {
            console.error("Error converting file to base64", error);
        }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 md:p-6 bg-gray-900 border-t border-gray-700 flex-shrink-0">
      <div className="bg-gray-800 rounded-2xl p-2 flex flex-col">
        {attachments.length > 0 && (
            <div className="p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {attachments.map((file, index) => (
                    <div key={index} className="bg-gray-700 p-2 rounded-lg flex items-center justify-between text-sm">
                        <span className="truncate" title={file.name}>{file.name}</span>
                        <button onClick={() => removeAttachment(index)} className="ml-2 text-gray-400 hover:text-white">
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        <div className="flex items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Attach files"
          >
            <AttachmentIcon className="w-6 h-6" />
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your video idea..."
            className="flex-1 bg-transparent p-3 resize-none outline-none placeholder-gray-500 max-h-40"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!text.trim() && attachments.length === 0)}
            className="p-3 rounded-full bg-indigo-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors duration-200"
            aria-label="Send message"
          >
            {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <SendIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};