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
  
  // Pattern for detecting MCQ options (A., B., 1., 2., A), B), etc.)
  const mcqPatterns = [
    /^\s*([A-D]|[1-4])\.\s+(.+)$/gm,     // A. Option text
    /^\s*([A-D]|[1-4])\)\s+(.+)$/gm,     // A) Option text  
    /^\s*([A-D]|[1-4]):\s+(.+)$/gm,      // A: Option text
    /^\s*•\s+(.+)$/gm,                   // • Option text (bullet points)
    /^\s*-\s+(.+)$/gm,                   // - Option text (dashes)
  ];
  
  // Try to find MCQ options using different patterns
  let options: MCQOption[] = [];
  let matchedPattern: RegExp | null = null;
  
  for (const pattern of mcqPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length >= 2) { // Need at least 2 options for MCQ
      matchedPattern = pattern;
      
      if (pattern.source.includes('([A-D]|[1-4])')) {
        // Patterns with explicit labels
        options = matches.map(match => ({
          label: match[1].toUpperCase(),
          text: match[2].trim(),
          fullText: match[0].trim()
        }));
      } else {
        // Bullet/dash patterns - generate labels
        options = matches.map((match, index) => ({
          label: String.fromCharCode(65 + index), // A, B, C, D
          text: match[1].trim(),
          fullText: match[0].trim()
        }));
      }
      break;
    }
  }
  
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
  
  // Determine if this is an MCQ
  const isMCQ = hasQuestionMark && options.length >= 2 && (hasKeywords || matchedPattern || hasScalePattern);
  
  if (isMCQ && options.length > 0) {
    // Extract the stem (question part before options)
    const firstOptionIndex = text.indexOf(options[0].fullText);
    const stem = text.substring(0, firstOptionIndex).trim();
    
    return {
      type: 'mcq',
      stem: stem || text, // Fallback to full text if can't extract stem
      options,
      originalText: text
    };
  }
  
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