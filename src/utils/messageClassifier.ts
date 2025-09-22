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
/**
 * Extract explicit options from agent questions
 * Handles patterns like "A, B, C, or D" or "Are you looking to X, Y, Z?"
 */
function extractExplicitChoices(text: string): string[] {
  const choices: string[] = [];
  
  // Pattern 1: "A, B, C, or D" style
  const orPattern = /(?:are you looking to|do you want to|choose from|options include|such as)\s+([^?]+?)(?:\?|$)/i;
  const orMatch = text.match(orPattern);
  
  if (orMatch) {
    const choicesText = orMatch[1];
    // Split on commas and "or"
    const parts = choicesText.split(/,\s*(?:or\s+)?|\s+or\s+/);
    
    for (const part of parts) {
      const cleaned = part.trim().replace(/^(to\s+)?/, '').replace(/[,.]$/, '');
      if (cleaned && cleaned.length > 0) {
        choices.push(cleaned);
      }
    }
  }
  
  // Pattern 2: Simple enumeration "X, Y, Z, or something else"
  if (choices.length === 0) {
    const enumPattern = /([^.]+?)(?:,\s*(?:or\s+)?([^,]+?))*,?\s*or\s+([^?]+?)(?:\?|$)/;
    const enumMatch = text.match(enumPattern);
    if (enumMatch) {
      const allParts = text.match(/\b(?:entertain|educate|promote|raise awareness|something else|other)\b/gi);
      if (allParts) {
        choices.push(...allParts.map(p => p.toLowerCase()));
      }
    }
  }
  
  return choices.filter((c, i, arr) => arr.indexOf(c) === i); // dedupe
}

/**
 * Detect question intent and generate appropriate options
 */
function getContextualOptions(text: string): MCQOption[] {
  const lowerText = text.toLowerCase();
  
  // Video purpose questions
  if (lowerText.includes('purpose') || lowerText.includes('achieve') || 
      lowerText.includes('goal') || lowerText.includes('hope to')) {
    return [
      { label: 'A', text: 'Entertain', fullText: 'A. Entertain' },
      { label: 'B', text: 'Educate', fullText: 'B. Educate' },
      { label: 'C', text: 'Promote a product', fullText: 'C. Promote a product' },
      { label: 'D', text: 'Raise awareness', fullText: 'D. Raise awareness' },
      { label: 'E', text: 'Something else', fullText: 'E. Something else' }
    ];
  }
  
  // Yes/No questions
  if (lowerText.includes('do you') && (lowerText.includes('want') || lowerText.includes('need') || lowerText.includes('have'))) {
    return [
      { label: 'A', text: 'Yes', fullText: 'A. Yes' },
      { label: 'B', text: 'No', fullText: 'B. No' },
      { label: 'C', text: 'I\'m not sure', fullText: 'C. I\'m not sure' }
    ];
  }
  
  // Preference questions
  if (lowerText.includes('prefer') || lowerText.includes('like') || lowerText.includes('choose')) {
    return [
      { label: 'A', text: 'Option A', fullText: 'A. Option A' },
      { label: 'B', text: 'Option B', fullText: 'B. Option B' },
      { label: 'C', text: 'Neither', fullText: 'C. Neither' },
      { label: 'D', text: 'I need more information', fullText: 'D. I need more information' }
    ];
  }
  
  // Style/approach questions
  if (lowerText.includes('style') || lowerText.includes('approach') || lowerText.includes('tone')) {
    return [
      { label: 'A', text: 'Professional', fullText: 'A. Professional' },
      { label: 'B', text: 'Casual', fullText: 'B. Casual' },
      { label: 'C', text: 'Creative', fullText: 'C. Creative' },
      { label: 'D', text: 'Let\'s discuss options', fullText: 'D. Let\'s discuss options' }
    ];
  }
  
  // Audience questions
  if (lowerText.includes('audience') || lowerText.includes('target') || lowerText.includes('viewers')) {
    return [
      { label: 'A', text: 'General public', fullText: 'A. General public' },
      { label: 'B', text: 'Specific demographic', fullText: 'B. Specific demographic' },
      { label: 'C', text: 'Professionals', fullText: 'C. Professionals' },
      { label: 'D', text: 'I\'m not sure yet', fullText: 'D. I\'m not sure yet' }
    ];
  }
  
  return [];
}

export function generateDefaultMCQOptions(messageText: string): MCQOption[] {
  // First try to extract explicit numbered options (1='text' format)
  const extractedOptions = extractMCQOptions(messageText);
  if (extractedOptions.length > 0) {
    return extractedOptions;
  }
  
  // Try to extract explicit choices from the question text
  const explicitChoices = extractExplicitChoices(messageText);
  if (explicitChoices.length >= 2) {
    return explicitChoices.map((choice, index) => ({
      label: String.fromCharCode(65 + index), // A, B, C, D...
      text: choice.charAt(0).toUpperCase() + choice.slice(1),
      fullText: `${String.fromCharCode(65 + index)}. ${choice.charAt(0).toUpperCase() + choice.slice(1)}`
    }));
  }
  
  // Generate contextual options based on question intent
  const contextualOptions = getContextualOptions(messageText);
  if (contextualOptions.length > 0) {
    return contextualOptions;
  }
  
  // Final fallback to generic options
  return [
    { label: 'A', text: 'Tell me more', fullText: 'A. Tell me more' },
    { label: 'B', text: 'Let\'s move on', fullText: 'B. Let\'s move on' },
    { label: 'C', text: 'Can you clarify that?', fullText: 'C. Can you clarify that?' },
    { label: 'D', text: 'I have a different question', fullText: 'D. I have a different question' }
  ];
}
