/**
 * Application Configuration
 * Centralized configuration for business logic values
 * Move hardcoded values here to enable easy changes without code edits
 */

export const PaymentConfig = {
  // Tax configuration
  TAX_RATE: 0.16, // 16% VAT (Kenya)

  // Shipping configuration
  SHIPPING_FREE_THRESHOLD: 5000, // Free shipping for orders >= 5000 KSH
  SHIPPING_COST: 500, // Standard shipping cost in KSH

  // Platform commission
  PLATFORM_COMMISSION: 0.10, // 10% commission on vendor sales

  // Payment processing
  STRIPE: {
    MIN_AMOUNT: 100, // Minimum amount in cents ($1.00)
    MAX_AMOUNT: 99999900, // Maximum amount in cents ($999,999.00)
    STATEMENT_DESCRIPTOR: 'ZilaCart',
  },

  PAYPAL: {
    MIN_AMOUNT: 1.00, // Minimum amount in USD
    MAX_AMOUNT: 999999.00, // Maximum amount in USD
  },
};

export const PromotionConfig = {
  CODE_MAX_LENGTH: 20,
  CODE_MIN_LENGTH: 3,
  MAX_DISCOUNT_PERCENTAGE: 100, // No discount > 100%
  MIN_DISCOUNT_PERCENTAGE: 0,
};

export const InventoryConfig = {
  LOW_STOCK_THRESHOLD: 10,
  MIN_STOCK: 0,
  MAX_STOCK: 1000000,
};

export const PaginationConfig = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  MAX_OFFSET: 10000, // Prevent excessive offset queries
};

export const CartConfig = {
  MAX_ITEMS: 100,
  MIN_QUANTITY: 1,
  MAX_QUANTITY_PER_ITEM: 999,
};

export const ApiConfig = {
  // Rate limiting (if implemented)
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute in ms
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Request timeout
  REQUEST_TIMEOUT: 30 * 1000, // 30 seconds

  // Webhook verification
  WEBHOOK_TIMESTAMP_TOLERANCE: 5 * 60, // 5 minutes in seconds
};

export const OrderConfig = {
  // Order status transition rules (defined in order-state-machine.ts)
  // Order processing timeout
  REFUND_WINDOW: 30 * 24 * 60 * 60 * 1000, // 30 days in ms

  // Maximum items in single order
  MAX_ORDER_ITEMS: 100,
};
