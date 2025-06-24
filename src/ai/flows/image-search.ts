'use server';

/**
 * @fileOverview Image search flow for finding products by uploading a picture.
 *
 * - imageSearch - A function that handles the image search process.
 * - ImageSearchInput - The input type for the imageSearch function.
 * - ImageSearchOutput - The return type for the imageSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImageSearchInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ImageSearchInput = z.infer<typeof ImageSearchInputSchema>;

const ImageSearchOutputSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().describe('The name of the product.'),
        description: z.string().describe('A short description of the product.'),
        imageUrl: z.string().describe('URL of the product image.'),
        similarityScore: z
          .number()
          .describe('A score indicating how similar the product is to the image.'),
      })
    )
    .describe('A list of products found that are similar to the image.'),
});
export type ImageSearchOutput = z.infer<typeof ImageSearchOutputSchema>;

export async function imageSearch(input: ImageSearchInput): Promise<ImageSearchOutput> {
  return imageSearchFlow(input);
}

const imageSearchPrompt = ai.definePrompt({
  name: 'imageSearchPrompt',
  input: {schema: ImageSearchInputSchema},
  output: {schema: ImageSearchOutputSchema},
  prompt: `You are an AI assistant that helps users find products based on images.

  Given the following image, identify the products in the image and generate a list of similar products with their names, descriptions, image URLs, and a similarity score.

  Image: {{media url=photoDataUri}}
  `,
});

const imageSearchFlow = ai.defineFlow(
  {
    name: 'imageSearchFlow',
    inputSchema: ImageSearchInputSchema,
    outputSchema: ImageSearchOutputSchema,
  },
  async input => {
    const {output} = await imageSearchPrompt(input);
    return output!;
  }
);
