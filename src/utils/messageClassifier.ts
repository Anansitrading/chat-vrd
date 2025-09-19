export interface MCQOption {
  label: string;
  text: string;
  fullText: string;
}

export interface ClassifiedMessage {
  type: 'text' | 'mcq';
  stem?: string;
  options?: MCQOption[];
  originalText: string;
}

/**
 * Classifies a message to determine if it's a multiple choice question
 * Returns message type with parsed content for MCQ rendering
 */
export function classifyMessage(messageText: string): ClassifiedMessage {
  const text = messageText.trim();
  
  // Quick checks for MCQ indicators
  const hasQuestionMark = text.includes('?');
  
  // Additional heuristics for MCQ detection
  const mcqKeywords = [
    'choose the', 'select the', 'which of the following',
    'what is the best', 'which option', 'pick the',
    'the correct answer', 'which statement',
    'rate your', 'scale of', 'on a scale', 'how would you rate', 'please rate', 'could you rate'
  ];
  
  const hasKeywords = mcqKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Additional pattern detection for scale/rating questions
  const hasScalePattern = /scale of \d+(-\d+)?|rate.*\d+-\d+/i.test(text);
  
  // Only try to parse options if we have MCQ indicators
  if (!hasQuestionMark || (!hasKeywords && !hasScalePattern)) {
    return {
      type: 'text',
      originalText: text
    };
  }
  
  // Pattern for detecting MCQ options - prioritize numbered bullets
  const numberedBulletPattern = /^\s*•\s+(\d+)\s*=\s*(.+)$/gm;
  const letterBulletPattern = /^\s*•\s+([A-Z])\s*=\s*(.+)$/gm;
  const simpleBulletPattern = /^\s*•\s+(.+)$/gm;
  const numberedPattern = /^\s*([1-9]|10)\.\s+(.+)$/gm;
  const lettersPattern = /^\s*([A-D])\.\s+(.+)$/gm;
  
  let options: MCQOption[] = [];
  
  // Try numbered bullets first (like your screenshot: • 1 = 'text')
  let matches = Array.from(text.matchAll(numberedBulletPattern));
  if (matches.length >= 2) {
    options = matches.map(match => ({
      label: match[1], // Use the number as label
      text: match[2].trim().replace(/^['"]|['"]$/g, ''), // Remove surrounding quotes
      fullText: match[0].trim()
    }));
  }
  
  // Try letter bullets (• A = 'text')
  if (options.length === 0) {
    matches = Array.from(text.matchAll(letterBulletPattern));
    if (matches.length >= 2) {
      options = matches.map(match => ({
        label: match[1], 
        text: match[2].trim().replace(/^['"]|['"]$/g, ''),
        fullText: match[0].trim()
      }));
    }
  }
  
  // Try simple numbered list (1. text)
  if (options.length === 0) {
    matches = Array.from(text.matchAll(numberedPattern));
    if (matches.length >= 2) {
      options = matches.map(match => ({
        label: match[1],
        text: match[2].trim(),
        fullText: match[0].trim()
      }));
    }
  }
  
  // Try letter list (A. text)
  if (options.length === 0) {
    matches = Array.from(text.matchAll(lettersPattern));
    if (matches.length >= 2) {
      options = matches.map(match => ({
        label: match[1],
        text: match[2].trim(),
        fullText: match[0].trim()
      }));
    }
  }
  
  // Try simple bullets (• text) as fallback
  if (options.length === 0) {
    matches = Array.from(text.matchAll(simpleBulletPattern));
    if (matches.length >= 2) {
      options = matches.map((match, index) => ({
        label: String.fromCharCode(65 + index), // A, B, C, D
        text: match[1].trim(),
        fullText: match[0].trim()
      }));
    }
  }
  
  // If we found enough options, return MCQ
  if (options.length >= 2) {
    // Extract the stem (question part before options)
    const firstOptionIndex = text.indexOf(options[0].fullText);
    const stem = firstOptionIndex > 0 ? text.substring(0, firstOptionIndex).trim() : text;
    
    return {
      type: 'mcq',
      stem,
      options,
      originalText: text
    };
  }
  
  // Default to text if no MCQ structure found
  return {
    type: 'text',
    originalText: text
  };
}

/**
 * Utility to strip markdown formatting for TTS
 */
export function stripMarkdownForTTS(text: string): string {
  return text
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    
    // Remove headers
    .replace(/#{1,6}\s+(.+)/g, '$1')
    
    // Remove lists markers but keep content
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1 image')
    
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format option text for display (with proper spacing and capitalization)
 */
export function formatOptionText(text: string): string {
  return text
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .replace(/\.$/, ''); // Remove trailing period if present
}