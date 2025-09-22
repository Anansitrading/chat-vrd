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
  
  // Normalize text to handle different bullet types and quotes
  const safeText = text
    // Replace curly/smart quotes with standard quotes
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Normalize bullets to consistent bullet point
    .replace(/[•‣◦⁃∙]/g, "•");
  
  // Robust pattern for MCQ options that handles flexible whitespace, quotes, and bullets
  const mcqBulletPattern = /^[\s\t]*[•\-*●‣][\s\t]*(\d+)[\s\t]*=[\s\t]*['"‘’“”]?(.+?)['"‘’“”]?\s*$/gmi;
  
  let options: MCQOption[] = [];
  let match: RegExpExecArray | null;
  
  // Extract all MCQ options using the robust pattern
  while ((match = mcqBulletPattern.exec(safeText)) !== null) {
    options.push({
      label: match[1], // The number (1, 5, 10, etc.)
      text: match[2].trim(), // The option text
      fullText: match[0].trim() // The full match
    });
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

/**
 * Extract MCQ options that are already present in the message
 * Handles various formats like "1 = 'text'", "A) text", "1. text", etc.
 */
export function extractMCQOptions(messageText: string): MCQOption[] {
  // Normalize line endings first
  let normalizedText = messageText.replace(/\r\n|\r/g, '\n');

  // Helper to sanitize each line for robust matching across browsers
  const sanitize = (line: string) => {
    return line
      // convert various unicode spaces to regular space
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      // normalize smart quotes to straight quotes
      .replace(/[‘’‚‛❛❟⸂⸃＇]/g, "'")
      .replace(/[“”„‟❝❞〝〞＂]/g, '"')
      // remove leading bullets/dashes
      .replace(/^[•–—\-▪●*]+\s*/, '')
      // collapse spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const options: MCQOption[] = [];
  const lines = normalizedText.split('\n');

  // 1) Try explicit numbered options: 1 = 'text' | 1. text | 1: text
  const eqPattern = /^(\d+)\s*=\s*["']([^"']+)["']\s*$/;
  const dotPattern = /^(\d+)[\.:]\s+(.+)$/;

  for (const raw of lines) {
    const line = sanitize(raw);
    let m = eqPattern.exec(line);
    if (m) {
      options.push({ label: m[1], text: m[2].trim(), fullText: line });
      continue;
    }
    m = dotPattern.exec(line);
    if (m) {
      options.push({ label: m[1], text: m[2].trim(), fullText: line });
    }
  }

  // 2) If still nothing, detect scale prompts (rate/scale X-Y) and generate range
  if (options.length < 2) {
    const scaleMatch = normalizedText
      .replace(/[–—]/g, '-') // normalize dashes
      .match(/(?:rate|scale)[^\d]*(\d+)\s*[-to]{1,3}\s*(\d+)/i);
    if (scaleMatch) {
      const start = parseInt(scaleMatch[1], 10);
      const end = parseInt(scaleMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let i = start; i <= end; i++) {
          options.push({ label: String(i), text: String(i), fullText: String(i) });
        }
      }
    }
  }

  return options.length >= 2 ? options : [];
}

/**
 * Generate default MCQ options based on message content
 * This ensures ALL assistant messages have interactive options
 */
export function generateDefaultMCQOptions(messageText: string): MCQOption[] {
  // First try to extract options from the message itself
  const extractedOptions = extractMCQOptions(messageText);
  if (extractedOptions.length > 0) {
    return extractedOptions;
  }
  
  // If no options found in message, generate contextual fallback options
  const defaultOptions: MCQOption[] = [];
  
  // Check for clarification/follow-up patterns
  if (messageText.toLowerCase().includes('would you like') || 
      messageText.toLowerCase().includes('shall i') ||
      messageText.toLowerCase().includes('should we') ||
      messageText.toLowerCase().includes('do you want')) {
    defaultOptions.push(
      { label: 'A', text: 'Yes, let\'s do that', fullText: 'A. Yes, let\'s do that' },
      { label: 'B', text: 'No, let\'s try something else', fullText: 'B. No, let\'s try something else' },
      { label: 'C', text: 'I need more information first', fullText: 'C. I need more information first' }
    );
  }
  // Check for next steps patterns  
  else if (messageText.toLowerCase().includes('next') ||
           messageText.toLowerCase().includes('now') ||
           messageText.toLowerCase().includes('let\'s')) {
    defaultOptions.push(
      { label: 'A', text: 'Continue with this approach', fullText: 'A. Continue with this approach' },
      { label: 'B', text: 'Explore alternatives', fullText: 'B. Explore alternatives' },
      { label: 'C', text: 'Tell me more about this', fullText: 'C. Tell me more about this' },
      { label: 'D', text: 'Go back to previous topic', fullText: 'D. Go back to previous topic' }
    );
  }
  // Default options for any response
  else {
    defaultOptions.push(
      { label: 'A', text: 'Tell me more', fullText: 'A. Tell me more' },
      { label: 'B', text: 'Let\'s move on', fullText: 'B. Let\'s move on' },
      { label: 'C', text: 'Can you clarify that?', fullText: 'C. Can you clarify that?' },
      { label: 'D', text: 'I have a different question', fullText: 'D. I have a different question' }
    );
  }
  
  return defaultOptions;
}
