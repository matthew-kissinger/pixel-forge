import { GoogleGenAI } from '@google/genai';

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genai = new GoogleGenAI({ apiKey });
  }
  return genai;
}

export interface GenerateImageResult {
  image: string; // base64 data URL
}

export async function generateImage(prompt: string): Promise<GenerateImageResult> {
  const client = getClient();
  // Use nano-banana-pro-preview as specified in CLAUDE.md
  const response = await client.models.generateContent({
    model: 'nano-banana-pro-preview',
    contents: prompt,
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error('No response from Gemini');
  }

  for (const part of parts) {
    if (part.inlineData) {
      const { mimeType, data } = part.inlineData;
      return {
        image: `data:${mimeType};base64,${data}`,
      };
    }
  }

  throw new Error('No image in Gemini response');
}
