import { z } from 'zod';

// Kenya phone number validation (07xx, +2547xx, or 2547xx formats)
export const kenyaPhoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      return (
        cleaned.length === 10 || // 07xxxxxxxx
        cleaned.length === 12 || // 2547xxxxxxxx
        /^(07|254\s?7|2547)\d{8}$/.test(val.replace(/\s/g, ''))
      );
    },
    'Invalid Kenya phone number. Use 07xx, +2547xx, or 2547xx format'
  );

// Address validation
export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  address: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(250, 'Address must not exceed 250 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters'),
  postalCode: z
    .string()
    .trim()
    .min(3, 'Postal code must be at least 3 characters')
    .max(20, 'Postal code must not exceed 20 characters')
    .optional(),
  phone: kenyaPhoneSchema,
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

// Cart item validation
export const cartItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0')
    .max(999, 'Quantity cannot exceed 999'),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

// Order creation validation
export const createOrderSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, 'At least one item is required'),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z
    .enum(['stripe', 'paypal', 'cash_on_delivery'])
    .default('stripe'),
  promotionCode: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || (val.length > 0 && val.length <= 50),
      'Promotion code must be between 1 and 50 characters'
    ),
  clientSubtotal: z.number().nonnegative('Subtotal cannot be negative').optional(),
  clientShippingCost: z.number().nonnegative('Shipping cost cannot be negative').optional(),
  clientTaxAmount: z.number().nonnegative('Tax amount cannot be negative').optional(),
  clientTotalAmount: z.number().nonnegative('Total amount cannot be negative').optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Payment intent validation
export const createPaymentIntentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(999999999, 'Amount exceeds maximum allowed'),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .toUpperCase()
    .default('KES'),
  orderId: z
    .string()
    .trim()
    .optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

// PayPal order validation
export const createPaypalOrderSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(999999999, 'Amount exceeds maximum allowed'),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .toUpperCase()
    .default('KES'),
  orderId: z
    .string()
    .trim()
    .optional(),
  returnUrl: z
    .string()
    .url('Invalid return URL')
    .optional(),
  cancelUrl: z
    .string()
    .url('Invalid cancel URL')
    .optional(),
});

export type CreatePaypalOrderInput = z.infer<typeof createPaypalOrderSchema>;

// Refund request validation
export const createRefundSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, 'Order ID is required'),
  reason: z
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  items: z
    .array(
      z.object({
        itemId: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'At least one item is required for refund')
    .optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

// Product inventory bounds validation
export const inventoryBoundsSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .nonnegative('Quantity cannot be negative')
    .max(999999, 'Quantity exceeds maximum allowed'),
  reserved: z
    .number()
    .int('Reserved quantity must be an integer')
    .nonnegative('Reserved quantity cannot be negative')
    .optional(),
});

export type InventoryBoundsInput = z.infer<typeof inventoryBoundsSchema>;

// Price validation
export const priceSchema = z
  .number()
  .nonnegative('Price cannot be negative')
  .max(99999999, 'Price exceeds maximum allowed');
