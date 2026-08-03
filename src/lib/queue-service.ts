import { SQS } from '@aws-sdk/client-sqs';
import { updateQueueDepth } from '@/lib/metrics';

const sqs = new SQS({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_SQS_ENDPOINT || 'http://localstack:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

// Queue URLs
const QUEUES = {
  ORDERS: process.env.ORDER_QUEUE_URL || 'http://localstack:4566/000000000000/order-queue',
  PRODUCTS: process.env.PRODUCT_QUEUE_URL || 'http://localstack:4566/000000000000/product-queue',
  PAYMENTS: process.env.PAYMENT_QUEUE_URL || 'http://localstack:4566/000000000000/payment-queue',
  NOTIFICATIONS: process.env.NOTIFICATION_QUEUE_URL || 'http://localstack:4566/000000000000/notification-queue',
};

// Message types
export interface OrderMessage {
  type: 'order.created' | 'order.updated' | 'order.shipped' | 'order.delivered';
  orderId: string;
  vendorId: string;
  customerId: string;
  totalAmount: number;
  timestamp: string;
}

export interface ProductMessage {
  type: 'product.created' | 'product.updated' | 'product.deleted';
  productId: string;
  vendorId: string;
  status: string;
  timestamp: string;
}

export interface PaymentMessage {
  type: 'payment.initiated' | 'payment.completed' | 'payment.failed';
  paymentId: string;
  orderId: string;
  amount: number;
  method: 'stripe' | 'paypal';
  status: string;
  timestamp: string;
}

export interface NotificationMessage {
  type: 'email' | 'sms' | 'push';
  recipientId: string;
  subject: string;
  content: string;
  timestamp: string;
}

// Producer functions
export async function enqueueOrder(message: OrderMessage): Promise<string> {
  return enqueue(QUEUES.ORDERS, message, 'order-message');
}

export async function enqueueProduct(message: ProductMessage): Promise<string> {
  return enqueue(QUEUES.PRODUCTS, message, 'product-message');
}

export async function enqueuePayment(message: PaymentMessage): Promise<string> {
  return enqueue(QUEUES.PAYMENTS, message, 'payment-message');
}

export async function enqueueNotification(message: NotificationMessage): Promise<string> {
  return enqueue(QUEUES.NOTIFICATIONS, message, 'notification-message');
}

async function enqueue(queueUrl: string, message: unknown, deduplicationId: string): Promise<string> {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
    MessageGroupId: deduplicationId, // For FIFO queues
    MessageDeduplicationId: `${deduplicationId}-${Date.now()}`,
  };

  const result = await sqs.sendMessage(params);
  return result.MessageId || '';
}

// Consumer functions
export async function consumeOrders(
  handler: (message: OrderMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.ORDERS, handler, maxMessages, 'order-queue');
}

export async function consumeProducts(
  handler: (message: ProductMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.PRODUCTS, handler, maxMessages, 'product-queue');
}

export async function consumePayments(
  handler: (message: PaymentMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.PAYMENTS, handler, maxMessages, 'payment-queue');
}

export async function consumeNotifications(
  handler: (message: NotificationMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.NOTIFICATIONS, handler, maxMessages, 'notification-queue');
}

async function consume(
  queueUrl: string,
  handler: (message: any) => Promise<void>,
  maxMessages: number,
  queueName: string
): Promise<void> {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS limit is 10
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: 300, // 5 minute timeout
  };

  const result = await sqs.receiveMessage(params);

  if (!result.Messages || result.Messages.length === 0) {
    updateQueueDepth(queueName, 0);
    return;
  }

  // Update queue depth metric
  updateQueueDepth(queueName, result.Messages.length);

  // Process messages in parallel with concurrency limit
  const concurrency = 5;
  for (let i = 0; i < result.Messages.length; i += concurrency) {
    const batch = result.Messages.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (message) => {
        if (!message.Body || !message.ReceiptHandle) return;

        try {
          const parsedMessage = JSON.parse(message.Body);
          await handler(parsedMessage);

          // Delete message after successful processing
          await sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
        } catch (error) {
          console.error('Error processing message:', error, 'Message:', message.Body);
          // Message will be re-delivered after VisibilityTimeout
        }
      })
    );
  }
}

// Queue management
export async function purgeQueue(queueUrl: string): Promise<void> {
  await sqs.purgeQueue({ QueueUrl: queueUrl });
}

export async function getQueueAttributes(
  queueUrl: string
): Promise<Record<string, string> | undefined> {
  const result = await sqs.getQueueAttributes({
    QueueUrl: queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesDelayed'],
  });
  return result.Attributes;
}

// Worker processes - meant to run in separate services
export async function startOrderWorker() {
  console.log('Starting order worker...');
  const processOrder = async (message: OrderMessage) => {
    console.log(`Processing order: ${message.orderId}`);
    // Business logic here
    // - Send confirmation email
    // - Update order status
    // - Notify vendor
    // - Process payment
  };

  // Run indefinitely
  while (true) {
    try {
      await consumeOrders(processOrder);
    } catch (error) {
      console.error('Error in order worker:', error);
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export async function startProductWorker() {
  console.log('Starting product worker...');
  const processProduct = async (message: ProductMessage) => {
    console.log(`Processing product: ${message.productId}`);
    // Business logic here
    // - Update search index
    // - Generate thumbnails
    // - Update analytics
  };

  while (true) {
    try {
      await consumeProducts(processProduct);
    } catch (error) {
      console.error('Error in product worker:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export async function startPaymentWorker() {
  console.log('Starting payment worker...');
  const processPayment = async (message: PaymentMessage) => {
    console.log(`Processing payment: ${message.paymentId}`);
    // Business logic here
    // - Update payment status
    // - Release funds to vendor
    // - Send receipt
  };

  while (true) {
    try {
      await consumePayments(processPayment);
    } catch (error) {
      console.error('Error in payment worker:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export async function startNotificationWorker() {
  console.log('Starting notification worker...');
  const processNotification = async (message: NotificationMessage) => {
    console.log(`Processing notification: ${message.type}`);
    // Business logic here
    // - Send email/SMS/push
    // - Track delivery
  };

  while (true) {
    try {
      await consumeNotifications(processNotification);
    } catch (error) {
      console.error('Error in notification worker:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
