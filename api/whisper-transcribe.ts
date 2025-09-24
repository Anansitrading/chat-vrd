import { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Parse the incoming form data
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB max file size (Whisper limit)
    });

    const [fields, files] = await form.parse(req);
    
    // Get the audio file
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read the file
    const fileStream = fs.createReadStream(audioFile.filepath);
    
    // Create form data for OpenAI API
    const formData = new FormData();
    formData.append('file', fileStream, {
      filename: audioFile.originalFilename || 'audio.webm',
      contentType: audioFile.mimetype || 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    // No language parameter - let Whisper auto-detect!
    formData.append('response_format', 'verbose_json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Transcription failed', 
        details: errorData 
      });
    }

    const data = await response.json();

    // Clean up temp file
    fs.unlinkSync(audioFile.filepath);

    // Return transcript with detected language
    return res.status(200).json({
      success: true,
      text: data.text,
      language: data.language, // Auto-detected language
      duration: data.duration,
      // Include word-level timestamps if available
      words: data.words,
      segments: data.segments,
    });

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}