
'use server';

/**
 * @fileOverview An advanced AI chatbot for customer support with tools for order status and recommendations.
 *
 * - aiChatbot - A function that handles the chatbot functionality.
 * - AIChatbotInput - The input type for the aiChatbot function.
 * - AIChatbotOutput - The return type for the aiChatbot function.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {z} from 'genkit';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Order, Product } from '@/lib/types';


const AIChatbotInputSchema = z.object({
  question: z.string().describe('The question from the user.'),
});
export type AIChatbotInput = z.infer<typeof AIChatbotInputSchema>;

const AIChatbotOutputSchema = z.object({
  answer: z.string().describe('The answer to the user question.'),
  hasAnswer: z.boolean().describe('Whether the chatbot has an answer to the question.'),
});
export type AIChatbotOutput = z.infer<typeof AIChatbotOutputSchema>;

export async function aiChatbot(input: AIChatbotInput): Promise<AIChatbotOutput> {
  return aiChatbotFlow(input);
}


// Tool to get order status
const getOrderStatus = ai.defineTool({
  name: 'getOrderStatus',
  description: 'Gets the current status of a customer\'s order using the Order ID.',
  inputSchema: z.object({
    orderId: z.string().describe('The unique identifier for the order, like ORD123456.'),
  }),
  outputSchema: z.object({
    status: z.string(),
    found: z.boolean(),
  }),
}, async (input) => {
  try {
    const orderDoc = await firestoreAdmin.collection('orders').doc(input.orderId).get();
    if (!orderDoc.exists) {
      return { found: false, status: 'Not Found' };
    }
    const orderData = orderDoc.data() as Order;
    return {
      found: true,
      status: orderData.status,
    };
  } catch (e) {
    console.error(`Error in getOrderStatus tool for orderId ${input.orderId}:`, e);
    return { found: false, status: 'Error checking status' };
  }
});


// Tool for product recommendations
const getProductRecommendations = ai.defineTool({
  name: 'getProductRecommendations',
  description: 'Provides product recommendations based on a given category.',
  inputSchema: z.object({
    category: z.string().describe('The product category to get recommendations for, e.g., "Electronics" or "Fashion".'),
  }),
  outputSchema: z.object({
    products: z.array(z.object({ name: z.string(), price: z.number() })),
  }),
}, async (input) => {
  try {
    const productsSnapshot = await firestoreAdmin.collection('products')
      .where('category', '==', input.category)
      .where('status', '==', 'active')
      .limit(3)
      .get();
    
    if (productsSnapshot.empty) {
      return { products: [] };
    }

    const products = productsSnapshot.docs.map(doc => {
        const data = doc.data() as Product;
        return { name: data.name, price: data.price };
    });

    return { products };
  } catch (e) {
    console.error(`Error in getProductRecommendations tool for category ${input.category}:`, e);
    return { products: [] };
  }
});


const aiChatbotPrompt = ai.definePrompt({
  name: 'aiChatbotPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: {schema: AIChatbotInputSchema},
  output: {schema: AIChatbotOutputSchema},
  tools: [getOrderStatus, getProductRecommendations],
  prompt: `You are "Zila", a friendly and highly capable AI assistant for ZilaCart, Kenya's premier digital marketplace. Your goal is to be helpful, concise, and provide accurate information to users.

You have access to several tools to answer specific questions. Analyze the user's query and decide if a tool is appropriate.

User's Question: {{{question}}}

1.  **Order Status:** If the user asks about the status of their order and provides an Order ID (or something that looks like one), use the \`getOrderStatus\` tool.
    - If the tool finds the order, tell the user the status clearly (e.g., "Your order is currently 'Shipped'.").
    - If the tool returns \`found: false\`, inform the user that you couldn't find an order with that ID and ask them to double-check it.

2.  **Product Recommendations:** If the user asks for recommendations or ideas for products in a specific category (e.g., "any cool tech gadgets?" or "recommend some fashion items"), use the \`getProductRecommendations\` tool.
    - If products are found, present them in a friendly, readable list format, including their prices.
    - If no products are found for that category, say something like "I couldn't find any specific recommendations for that category right now, but feel free to browse our 'All Products' section!".

3.  **General Questions:** For any other questions about ZilaCart's products, services, shipping, or returns policy, provide a helpful and informative answer based on your general knowledge of a futuristic e-commerce store.

- If you can answer the question (either with a tool or general knowledge), provide the answer and set \`hasAnswer\` to \`true\`.
- If the question is outside your scope or too vague, and you cannot use a tool, apologize and state that you cannot answer at this time. Set \`hasAnswer\` to \`false\`.`,
});

const aiChatbotFlow = ai.defineFlow(
  {
    name: 'aiChatbotFlow',
    inputSchema: AIChatbotInputSchema,
    outputSchema: AIChatbotOutputSchema,
  },
  async input => {
    const {output} = await aiChatbotPrompt(input);
    return output!;
  }
);
