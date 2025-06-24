'use server';

/**
 * @fileOverview AI flow for generating product descriptions.
 * 
 * - generateProductDescriptionFlow - A function that generates a product description based on name and category.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe("The name of the product."),
  category: z.string().describe("The category the product belongs to."),
});

export async function generateProductDescription(input: z.infer<typeof GenerateProductDescriptionInputSchema>): Promise<string> {
  const result = await generateProductDescriptionFlow(input);
  return result.description;
}


const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: z.object({ description: z.string() }),
  },
  async (input) => {
    const prompt = `You are a creative copywriter for ZilaCart, a futuristic digital marketplace.
    Generate a compelling and engaging product description (around 3-4 sentences) for the following product.
    Highlight its key features in a way that fits a futuristic theme.

    Product Name: ${input.productName}
    Category: ${input.category}
    
    Write only the product description, without any introductory text like "Here is the description:".`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: {
        schema: z.object({ description: z.string() }),
      },
    });

    return output || { description: "Could not generate a description at this time." };
  }
);
