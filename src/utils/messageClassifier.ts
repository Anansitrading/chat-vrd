export interface MCQOption {
  label: string;
  text: string;
  fullText: string;
  followupQuestionId?: string; // ID of next question if this option is selected
}

export interface QuestionStep {
  id: string;
  prompt: string;
  options: MCQOption[];
  isConditional?: boolean; // Whether this question depends on a previous answer
  parentOptionId?: string; // Which option from parent question triggers this
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
  const lines = text.split('\n');
  
  // Step 1: Extract from bullet points and numbered lists
  for (const line of lines) {
    // Match unordered bullet points (-, *, •)
    let match = line.match(/^\s*[-*•]\s+(.*\S.*)$/);
    if (match) {
      let option = match[1].trim();
      // Clean up question format "Are they general cat lovers?" -> "General cat lovers"
      option = option.replace(/^(?:are they|do they have?|what)\s+/i, '').replace(/\?$/, '');
      if (option.length > 0) {
        choices.push(option);
      }
    }
    
    // Match numbered lists (1., 2., etc.)
    if (!match) {
      match = line.match(/^\s*\d+[\.\)]\s+(.*\S.*)$/);
      if (match) {
        let option = match[1].trim();
        option = option.replace(/^(?:are they|do they have?|what)\s+/i, '').replace(/\?$/, '');
        if (option.length > 0) {
          choices.push(option);
        }
      }
    }
    
    // Match alphabetic lists (a., A), etc.)
    if (!match) {
      match = line.match(/^\s*[a-zA-Z][\.\)]\s+(.*\S.*)$/);
      if (match) {
        let option = match[1].trim();
        option = option.replace(/^(?:are they|do they have?|what)\s+/i, '').replace(/\?$/, '');
        if (option.length > 0) {
          choices.push(option);
        }
      }
    }
  }
  
  // Step 2: Extract from inline choices with "or" and commas
  if (choices.length === 0) {
    // Pattern: "like cute kittens, funny cat antics, or educational content"
    const inlinePattern = /(?:like|such as|including)\s+([^?]+?)(?:\?|$)/i;
    const inlineMatch = text.match(inlinePattern);
    if (inlineMatch) {
      const choicesText = inlineMatch[1];
      const parts = choicesText.split(/,\s*(?:or\s+)?|\s+or\s+/);
      for (const part of parts) {
        const cleaned = part.trim().replace(/[,.]$/, '');
        if (cleaned && cleaned.length > 2) {
          choices.push(cleaned);
        }
      }
    }
  }
  
  // Step 3: Extract from parenthetical examples (e.g., children, teens, adults)
  if (choices.length === 0) {
    const parentheticalPattern = /\(\s*e\.g\.,\s*([^)]+?)\)/i;
    const parentheticalMatch = text.match(parentheticalPattern);
    if (parentheticalMatch) {
      const exampleText = parentheticalMatch[1];
      const parts = exampleText.split(/,\s*/);
      for (const part of parts) {
        const cleaned = part.trim();
        if (cleaned && cleaned.length > 0) {
          choices.push(cleaned);
        }
      }
    }
  }
  
  // Step 4: Final attempt at simple enumeration patterns
  if (choices.length === 0) {
    const simplePattern = /(?:are you looking to|do you want to|choose from|options include)\s+([^?]+?)(?:\?|$)/i;
    const simpleMatch = text.match(simplePattern);
    if (simpleMatch) {
      const choicesText = simpleMatch[1];
      const parts = choicesText.split(/,\s*(?:or\s+)?|\s+or\s+/);
      for (const part of parts) {
        const cleaned = part.trim().replace(/^(to\s+)?/, '').replace(/[,.]$/, '');
        if (cleaned && cleaned.length > 0) {
          choices.push(cleaned);
        }
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

/**
 * Decompose complex multi-part questions into sequential steps
 */
function decomposeMultiPartQuestion(text: string): QuestionStep[] {
  const steps: QuestionStep[] = [];
  const lowerText = text.toLowerCase();
  
  // Detect audience questions with multiple parts
  if (lowerText.includes('audience') && lowerText.includes('ideal')) {
    const lines = text.split('\n').filter(line => line.trim().startsWith('-'));
    
    if (lines.length >= 2) {
      // Step 1: General vs Specific audience
      const hasGeneralQuestion = lines.some(line => line.toLowerCase().includes('general'));
      const hasSpecificQuestion = lines.some(line => line.toLowerCase().includes('specific'));
      const hasAgeQuestion = lines.some(line => line.toLowerCase().includes('age') || line.toLowerCase().includes('children') || line.toLowerCase().includes('teen'));
      
      if (hasGeneralQuestion && hasSpecificQuestion) {
        // Create first question: audience type
        steps.push({
          id: 'audience_type',
          prompt: 'What type of audience are you targeting?',
          options: [
            { 
              label: 'A', 
              text: 'General cat lovers', 
              fullText: 'A. General cat lovers' 
            },
            { 
              label: 'B', 
              text: 'People with specific interests', 
              fullText: 'B. People with specific interests',
              followupQuestionId: 'specific_interests'
            }
          ]
        });
        
        // Create conditional follow-up for specific interests
        const interestOptions: MCQOption[] = [];
        const interestLine = lines.find(line => line.toLowerCase().includes('specific'));
        if (interestLine) {
          const interests = extractExplicitChoices(interestLine);
          if (interests.length > 0) {
            interests.forEach((interest, index) => {
              interestOptions.push({
                label: String.fromCharCode(65 + index),
                text: interest.charAt(0).toUpperCase() + interest.slice(1),
                fullText: `${String.fromCharCode(65 + index)}. ${interest.charAt(0).toUpperCase() + interest.slice(1)}`
              });
            });
          }
        }
        
        if (interestOptions.length > 0) {
          steps.push({
            id: 'specific_interests',
            prompt: 'Which specific interests?',
            options: interestOptions,
            isConditional: true,
            parentOptionId: 'B'
          });
        }
      }
      
      // Step 2: Age demographics (always ask)
      if (hasAgeQuestion) {
        const ageOptions: MCQOption[] = [];
        const ageLine = lines.find(line => line.toLowerCase().includes('age') || line.toLowerCase().includes('children'));
        if (ageLine) {
          const ageGroups = extractExplicitChoices(ageLine);
          if (ageGroups.length > 0) {
            ageGroups.forEach((group, index) => {
              ageOptions.push({
                label: String.fromCharCode(65 + index),
                text: group.charAt(0).toUpperCase() + group.slice(1),
                fullText: `${String.fromCharCode(65 + index)}. ${group.charAt(0).toUpperCase() + group.slice(1)}`
              });
            });
          } else {
            // Default age options
            ['Children', 'Teens', 'Adults', 'Families', 'Mixed audience'].forEach((group, index) => {
              ageOptions.push({
                label: String.fromCharCode(65 + index),
                text: group,
                fullText: `${String.fromCharCode(65 + index)}. ${group}`
              });
            });
          }
        }
        
        if (ageOptions.length > 0) {
          steps.push({
            id: 'age_group',
            prompt: 'What age group are you targeting?',
            options: ageOptions
          });
        }
      }
    }
  }
  
  return steps;
}

export function generateDefaultMCQOptions(messageText: string): MCQOption[] {
  const lowerText = messageText.toLowerCase();
  
  // NEVER show buttons for open-ended questions
  const openEndedIndicators = [
    'what is the main reason',
    'what do you hope',
    'why do you',
    'why did you',
    'describe',
    'explain',
    'tell me about',
    'tell me more',
    'what are your thoughts',
    'how would you describe',
    'what made you',
    'what brings you',
    'share your',
    'elaborate on'
  ];
  
  if (openEndedIndicators.some(indicator => lowerText.includes(indicator))) {
    return []; // No buttons for open-ended questions
  }
  
  // First try to extract explicit numbered options (1='text' format)
  const extractedOptions = extractMCQOptions(messageText);
  if (extractedOptions.length > 0) {
    return extractedOptions;
  }
  
  // Check if this is a complex multi-part question that should be decomposed
  const questionSteps = decomposeMultiPartQuestion(messageText);
  if (questionSteps.length > 1) {
    // Return options for the first step only
    // The UI will need to handle the sequential flow
    const firstStep = questionSteps[0];
    return firstStep.options.map(option => ({
      ...option,
      // Add metadata to indicate this is part of a multi-step flow
      fullText: `${option.fullText} ${questionSteps.length > 1 ? '(1 of ' + questionSteps.length + ')' : ''}`
    }));
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
  
  // No fallback options - if we can't determine appropriate options, show none
  return [];
}

/**
 * Export question decomposition for UI components that need to handle multi-step flows
 */
export function getQuestionSteps(messageText: string): QuestionStep[] {
  return decomposeMultiPartQuestion(messageText);
}
