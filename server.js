const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST endpoint for prompt enhancement
app.post('/api/enhance', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Please provide a "prompt" string in the request body.',
      });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ANTHROPIC_API_KEY environment variable is not configured.',
      });
    }

    // Call Anthropic API to enhance the prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert prompt engineer. Your task is to enhance and improve the following prompt to make it more effective, clear, and actionable. 
          
Original prompt: "${prompt}"

Please provide an enhanced version of this prompt that:
1. Is more specific and detailed
2. Includes clear instructions and context
3. Specifies the desired output format if applicable
4. Removes ambiguity

Return ONLY the enhanced prompt, without any explanation or preamble.`,
        },
      ],
    });

    // Extract the enhanced prompt from the response
    const enhancedPrompt =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Return enhanced prompt as JSON
    return res.status(200).json({
      success: true,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt,
      model: message.model,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Error enhancing prompt:', error);

    // Handle specific Anthropic API errors
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Invalid ANTHROPIC_API_KEY.',
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limited. Please try again later.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while enhancing the prompt. Please try again.',
      details: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Prompt Enhancer API',
    version: '1.0.0',
    endpoints: {
      enhance: 'POST /api/enhance',
      health: 'GET /health',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Prompt Enhancer API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
