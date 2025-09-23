/**
 * Vercel serverless function to proxy Perplexity API calls
 * This keeps the API key secure on the server-side and prevents exposure to the browser
 */
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variables (stored securely in Vercel)
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY is not set in Vercel environment variables');
    return res.status(500).json({ error: 'Perplexity API key is not configured' });
  }

  try {
    // Extract request body with safety check
    const { model, messages, stream, max_tokens, temperature } = req.body || {};

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'pplx-7b-online',
        messages,
        stream: stream || false,
        max_tokens: max_tokens || 1024,
        temperature: temperature || 0.2,
      }),
    });

    // Get response data
    const data = await response.json();

    // Return response with same status code
    if (!response.ok) {
      console.error('Perplexity API error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error in Perplexity serverless function:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}