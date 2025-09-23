interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface FeedbackImprovementRequest {
  systemPrompt: string;
  userQuestion: string;
  originalResponse?: string;
}

export class PerplexityService {
  constructor() {
    // API key is now handled server-side, not exposed to browser
  }

  /**
   * Gets an improved response from Perplexity API based on user feedback
   * Now uses serverless API endpoint to keep API key secure
   */
  async getImprovedResponse(request: FeedbackImprovementRequest): Promise<string> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: `${request.systemPrompt}\n\nADDITIONAL INSTRUCTION: The user was unsatisfied with a previous response. Please provide a more comprehensive, accurate, and helpful answer to their question. Focus on being more detailed and addressing potential gaps in the original response.`
      },
      {
        role: 'user',
        content: request.userQuestion
      }
    ];

    // If original response is provided, include it for context
    if (request.originalResponse) {
      messages.push({
        role: 'assistant',
        content: request.originalResponse
      });
      messages.push({
        role: 'user',
        content: 'This response wasn\'t quite what I was looking for. Could you provide a better, more detailed answer?'
      });
    }

    try {
      // Call our serverless API endpoint instead of Perplexity directly
      const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'pplx-7b-online', // Use sonar-pro if available for higher quality
          stream: false,
          max_tokens: 1024,
          temperature: 0.2, // Slightly higher than 0 for more natural responses
          messages: messages
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Serverless API error:', errorText);
        throw new Error(`Serverless API request failed: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response received from Perplexity API');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling Perplexity API via serverless function:', error);
      throw new Error('Failed to get improved response from Perplexity API');
    }
  }

  /**
   * Check if the Perplexity service is available
   * Always true since API key is handled server-side
   */
  isAvailable(): boolean {
    return true;
  }
}

// Export a singleton instance
export const perplexityService = new PerplexityService();