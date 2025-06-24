
'use server';

/**
 * @fileOverview AI flow for generating related product recommendations.
 * 
 * - getRelatedProducts - A function that generates a list of related product recommendations.
 * - RelatedProductInput - The input type for the getRelatedProducts function.
 * - RelatedProductOutput - The return type for the getRelatedProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RelatedProductInputSchema = z.object({
  name: z.string().describe("The name of the product."),
  description: z.string().optional().describe("The description of the product."),
  category: z.string().describe("The category of the product."),
});
export type RelatedProductInput = z.infer<typeof RelatedProductInputSchema>;

const RelatedProductOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z.string().describe("The name of the recommended product."),
      reason: z.string().describe("A short, compelling reason why this product is a good recommendation."),
    })
  ).describe("A list of 3-4 related product recommendations."),
});
export type RelatedProductOutput = z.infer<typeof RelatedProductOutputSchema>;


export async function getRelatedProducts(input: RelatedProductInput): Promise<RelatedProductOutput> {
    return getRelatedProductsFlow(input);
}


const getRelatedProductsFlow = ai.defineFlow(
  {
    name: 'getRelatedProductsFlow',
    inputSchema: RelatedProductInputSchema,
    outputSchema: RelatedProductOutputSchema,
  },
  async (input) => {
    const prompt = `You are a recommendation engine for a futuristic e-commerce store called ZilaCart.
    
    Given the following product, recommend 3 other products a user might like. The recommendations should sound plausible and fit the futuristic theme.
    For each recommendation, provide a product name and a short, one-sentence reason for the recommendation.

    Current Product Name: "${input.name}"
    Current Product Category: "${input.category}"
    Current Product Description: "${input.description || 'No description available.'}"
    
    Generate your response in the specified output format.`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: {
        schema: RelatedProductOutputSchema,
      },
    });

    return output || { recommendations: [] };
  }
);
