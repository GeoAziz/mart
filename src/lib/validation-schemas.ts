/**
 * Zod Validation Schemas
 * Type-safe validation for all API request bodies
 */

import { z } from 'zod';
import { PaymentConfig, CartConfig, PromotionConfig, InventoryConfig } from '@/lib/config';

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int()
    .min(CartConfig.MIN_QUANTITY, `Minimum quantity is ${CartConfig.MIN_QUANTITY}`)
    .max(CartConfig.MAX_QUANTITY_PER_ITEM, `Maximum quantity is ${CartConfig.MAX_QUANTITY_PER_ITEM}`),
});

/**
 * Payment & Checkout Validation
 */
export const StripePaymentIntentSchema = z.object({
  amount: z
    .number()
    .min(PaymentConfig.STRIPE.MIN_AMOUNT, `Minimum amount is $${PaymentConfig.STRIPE.MIN_AMOUNT / 100}`)
    .max(PaymentConfig.STRIPE.MAX_AMOUNT, `Maximum amount is $${PaymentConfig.STRIPE.MAX_AMOUNT / 100}`),
  currency: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(z.enum(['usd', 'kes', 'eur', 'gbp']))
    .default('usd'),
  orderId: z.string().optional(),
  metadata: z
    .record(z.string())
    .optional(),
});

export const PayPalOrderSchema = z.object({
  amount: z
    .number()
    .min(PaymentConfig.PAYPAL.MIN_AMOUNT, `Minimum amount is $${PaymentConfig.PAYPAL.MIN_AMOUNT}`)
    .max(PaymentConfig.PAYPAL.MAX_AMOUNT, `Maximum amount is $${PaymentConfig.PAYPAL.MAX_AMOUNT}`),
  currency: z
    .enum(['USD', 'KES', 'EUR', 'GBP'])
    .default('USD'),
  orderId: z.string().min(1, 'Order ID is required'),
  returnUrl: z.string().url('Invalid return URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

export const CreatePaymentIntentSchema = StripePaymentIntentSchema;
export const createPaymentIntentSchema = StripePaymentIntentSchema;
export const createPaypalOrderSchema = PayPalOrderSchema;

/**
 * Cart Operations
 */
export const AddToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int()
    .min(CartConfig.MIN_QUANTITY, `Minimum quantity is ${CartConfig.MIN_QUANTITY}`)
    .max(CartConfig.MAX_QUANTITY_PER_ITEM, `Maximum quantity is ${CartConfig.MAX_QUANTITY_PER_ITEM}`),
});

export const UpdateCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int()
    .min(CartConfig.MIN_QUANTITY, `Minimum quantity is ${CartConfig.MIN_QUANTITY}`)
    .max(CartConfig.MAX_QUANTITY_PER_ITEM, `Maximum quantity is ${CartConfig.MAX_QUANTITY_PER_ITEM}`),
});

/**
 * Phone Number Validation (Kenyan)
 */
export const PhoneNumberSchema = z
  .string()
  .regex(
    /^(\+254|0)(7|1)\d{8}$/,
    'Invalid Kenyan phone number. Format: +254712345678 or 0712345678'
  );

/**
 * Address Validation
 */
export const AddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  postalCode: z.string().max(20).optional(),
  phone: PhoneNumberSchema,
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: AddressSchema,
  paymentMethod: z.string().min(1, 'Payment method is required'),
  promotionCode: z.string().optional(),
});

export const createOrderSchema = CreateOrderSchema;

/**
 * Refund Request Validation
 */
export const CreateRefundRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  itemIds: z.array(z.string().min(1)).min(1, 'At least one item is required'),
  reason: z.string().min(10, 'Please provide a detailed reason (minimum 10 characters)').max(1000),
});

/**
 * Payout Request Validation
 */
export const RequestPayoutSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  mpesaNumber: PhoneNumberSchema,
});

export type StripePaymentIntentInput = z.infer<typeof StripePaymentIntentSchema>;
export type PayPalOrderInput = z.infer<typeof PayPalOrderSchema>;
export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateRefundRequestInput = z.infer<typeof CreateRefundRequestSchema>;
export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>;
