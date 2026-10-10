'use server';

import { ai } from '../genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

export async function generateProductDescription({ productName, category }: { productName: string, category: string }): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    return `Experience the best of ${category} with our new ${productName}. Crafted with quality and designed for your needs. (AI generation disabled: GOOGLE_API_KEY missing)`;
  }
  
  try {
    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt: `Write a short, engaging, and professional product description for a product named "${productName}" in the category "${category}". Keep it under 3 sentences.`,
    });
    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return `Experience the best of ${category} with our new ${productName}. (Failed to generate description)`;
  }
}

