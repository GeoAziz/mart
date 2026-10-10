import { SQS, ReceiveMessageCommand, ReceiveMessageCommandOutput, QueueAttributeName } from '@aws-sdk/client-sqs';
import { updateQueueDepth, trackExternalApiCall } from '@/lib/metrics';
import { sendEmail } from '@/lib/email';
import { firestoreAdmin } from '@/lib/firebase-admin';
import {
  indexProduct,
  deleteProductFromIndex,
  isAlgoliaEnabled,
} from '@/lib/algolia-search-service';
import { publishWSEvent } from '@/lib/ws-events';

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
  ORDERS: process.env.ORDER_QUEUE_URL || 'http://localstack:4566/000000000000/order-queue.fifo',
  PRODUCTS: process.env.PRODUCT_QUEUE_URL || 'http://localstack:4566/000000000000/product-queue.fifo',
  PAYMENTS: process.env.PAYMENT_QUEUE_URL || 'http://localstack:4566/000000000000/payment-queue.fifo',
  NOTIFICATIONS: process.env.NOTIFICATION_QUEUE_URL || 'http://localstack:4566/000000000000/notification-queue.fifo',
};

// Dead-letter queues (set in production; optional locally)
const DLQ_URLS = {
  ORDERS: process.env.ORDER_DLQ_URL,
  PRODUCTS: process.env.PRODUCT_DLQ_URL,
  PAYMENTS: process.env.PAYMENT_DLQ_URL,
  NOTIFICATIONS: process.env.NOTIFICATION_DLQ_URL,
};

// Message types
export interface OrderMessage {
  type: 'order.created' | 'order.updated' | 'order.shipped' | 'order.delivered';
  orderId: string;
  vendorId: string;
  vendorIds?: string[];
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
  type: 'payment.initiated' | 'payment.completed' | 'payment.failed' | 'payment.refunded';
  paymentId: string;
  orderId: string;
  amount: number;
  method: 'stripe' | 'paypal' | 'mpesa';
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
  return consume(QUEUES.ORDERS, handler, maxMessages, 'order-queue', DLQ_URLS.ORDERS);
}

export async function consumeProducts(
  handler: (message: ProductMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.PRODUCTS, handler, maxMessages, 'product-queue', DLQ_URLS.PRODUCTS);
}

export async function consumePayments(
  handler: (message: PaymentMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.PAYMENTS, handler, maxMessages, 'payment-queue', DLQ_URLS.PAYMENTS);
}

export async function consumeNotifications(
  handler: (message: NotificationMessage) => Promise<void>,
  maxMessages: number = 10
): Promise<void> {
  return consume(QUEUES.NOTIFICATIONS, handler, maxMessages, 'notification-queue', DLQ_URLS.NOTIFICATIONS);
}

/**
 * Long-poll a queue, process messages with bounded concurrency, and apply
 * at-least-once semantics with:
 *  - exponential visibility-timeout backoff on transient failures
 *  - dead-lettering once a message exceeds MAX_ATTEMPTS
 */
const MAX_ATTEMPTS = 5;
const VISIBILITY_TIMEOUT = 300; // seconds

async function consume(
  queueUrl: string,
  handler: (message: any) => Promise<void>,
  maxMessages: number,
  queueName: string,
  dlqUrl?: string
): Promise<void> {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS limit is 10
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: VISIBILITY_TIMEOUT,
    AttributeNames: ['ApproximateReceiveCount'] as unknown as QueueAttributeName[],
  };

  const result: ReceiveMessageCommandOutput = await sqs.receiveMessage(params);

  if (!result.Messages || result.Messages.length === 0) {
    await updateQueueDepthMetric(queueUrl, queueName);
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

        const attempts = Number(
          message.Attributes?.['ApproximateReceiveCount'] || 1
        );

        try {
          const parsedMessage = JSON.parse(message.Body);
          await handler(parsedMessage);

          // Delete message after successful processing
          await sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
        } catch (error) {
          console.error(`[Queue:${queueName}] Error processing message:`, error, 'Message:', message.Body);

          if (attempts >= MAX_ATTEMPTS) {
            // Give up: dead-letter the message so it can be replayed/audited.
            await deadLetter(queueName, queueUrl, dlqUrl, message.Body, message.ReceiptHandle, error);
            return;
          }

          // Transient failure: delay redelivery with exponential backoff.
          const backoff = Math.min(Math.pow(2, attempts) * 30, 900);
          console.warn(
            `[Queue:${queueName}] Attempt ${attempts}/${MAX_ATTEMPTS} failed; retrying in ${backoff}s`,
          );
          try {
            await sqs.changeMessageVisibility({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
              VisibilityTimeout: backoff,
            });
          } catch (visibilityError) {
            console.error(`[Queue:${queueName}] Failed to change visibility timeout:`, visibilityError);
          }
        }
      })
    );
  }
}

async function deadLetter(
  queueName: string,
  queueUrl: string,
  dlqUrl: string | undefined,
  body: string,
  receiptHandle: string,
  error: unknown
): Promise<void> {
  if (dlqUrl) {
    try {
      await sqs.sendMessage({
        QueueUrl: dlqUrl,
        MessageBody: body,
      });
      console.error(`[Queue:${queueName}] Dead-lettered message after ${MAX_ATTEMPTS} attempts`);
    } catch (dlqError) {
      console.error(`[Queue:${queueName}] Failed to dead-letter message:`, dlqError);
    }
  } else {
    console.error(
      `[Queue:${queueName}] Message exceeded ${MAX_ATTEMPTS} attempts and no DLQ configured; dropping after visibility timeout`,
    );
  }
  // Always delete from the source queue to avoid infinite retry loops.
  try {
    await sqs.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle });
  } catch (deleteError) {
    console.error(`[Queue:${queueName}] Failed to delete dead-lettered message:`, deleteError);
  }
}

/**
 * Report the real queue depth (ApproximateNumberOfMessages) to Prometheus.
 */
async function updateQueueDepthMetric(queueUrl: string, queueName: string): Promise<void> {
  try {
    const attributes = await sqs.getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesDelayed'] as QueueAttributeName[],
    });
    const depth =
      Number(attributes?.Attributes?.['ApproximateNumberOfMessages'] || 0) +
      Number(attributes?.Attributes?.['ApproximateNumberOfMessagesDelayed'] || 0);
    updateQueueDepth(queueName, depth);
  } catch (error) {
    console.error(`[Queue:${queueName}] Failed to read queue attributes:`, error);
  }
}

// ── Worker processes (run in the `worker` service) ───────────────────────────

export async function startOrderWorker() {
  console.log('Starting order worker...');
  const processOrder = async (message: OrderMessage) => {
    console.log(`[OrderWorker] Processing order: ${message.orderId}`);

    if (message.type === 'order.created') {
      // Load the full order so we can send the confirmation email and notify vendors.
      const orderDoc = await firestoreAdmin.collection('orders').doc(message.orderId).get();
      if (!orderDoc.exists) {
        throw new Error(`[OrderWorker] Order ${message.orderId} not found`);
      }
      const orderData = orderDoc.data()!;

      if (orderData.userEmail) {
        const { sendOrderConfirmation } = await import('@/lib/email');
        await sendOrderConfirmation({
          id: orderDoc.id,
          ...orderData,
        } as any);
      }

      // Vendor-side realtime notification (in addition to the inline WS publish).
      if (message.vendorIds && message.vendorIds.length > 0) {
        await publishWSEvent({
          type: 'notification',
          payload: {
            id: `order-${orderDoc.id}-${Date.now()}`,
            type: 'order',
            message: `New order #${orderDoc.id.slice(0, 8).toUpperCase()}`,
            severity: 'success',
            timestamp: new Date().toISOString(),
            orderId: orderDoc.id,
          },
          vendorIds: message.vendorIds,
        });
      }
    } else {
      // order.updated / order.shipped / order.delivered: notify the customer.
      const orderDoc = await firestoreAdmin.collection('orders').doc(message.orderId).get();
      if (!orderDoc.exists) {
        throw new Error(`[OrderWorker] Order ${message.orderId} not found`);
      }
      const orderData = orderDoc.data()!;

      if (orderData.userEmail) {
        const { sendEmail } = await import('@/lib/email');
        const humanStatus = message.type.replace('order.', '').replace('_', ' ');
        await sendEmail({
          to: orderData.userEmail,
          subject: `Your ZilaCart order is ${humanStatus}`,
          html: `<p>Your order <strong>#${orderDoc.id.slice(0, 8).toUpperCase()}</strong> is now <strong>${humanStatus}</strong>.</p>`,
        });
      }

      await publishWSEvent({
        type: 'notification',
        payload: {
          id: `order-status-${orderDoc.id}-${Date.now()}`,
          type: 'order',
          message: `Order #${orderDoc.id.slice(0, 8).toUpperCase()} is now ${message.type.replace('order.', '').replace('_', ' ')}`,
          severity: 'info',
          timestamp: new Date().toISOString(),
          orderId: orderDoc.id,
        },
        userIds: [orderData.userId],
      });
    }

    console.log(`[OrderWorker] Finished order: ${message.orderId}`);
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
    console.log(`[ProductWorker] Processing product: ${message.productId} (${message.type})`);

    if (!isAlgoliaEnabled()) {
      console.log('[ProductWorker] Algolia not configured; skipping search indexing');
      return;
    }

    if (message.type === 'product.deleted') {
      await deleteProductFromIndex(message.productId);
      trackExternalApiCall('algolia', 'deleteObject', 'success');
      return;
    }

    const productDoc = await firestoreAdmin.collection('products').doc(message.productId).get();
    if (!productDoc.exists) {
      throw new Error(`[ProductWorker] Product ${message.productId} not found`);
    }

    await indexProduct({ id: productDoc.id, ...productDoc.data() } as any);
    trackExternalApiCall('algolia', 'saveObject', 'success');
    console.log(`[ProductWorker] Indexed product ${message.productId}`);
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
    console.log(`[PaymentWorker] Processing payment: ${message.paymentId} (${message.type})`);

    // Notify the customer about their payment result in realtime.
    const orderDoc = await firestoreAdmin.collection('orders').doc(message.orderId).get();
    if (!orderDoc.exists) {
      throw new Error(`[PaymentWorker] Order ${message.orderId} not found`);
    }
    const orderData = orderDoc.data()!;
    const succeeded = message.type === 'payment.completed';

    await publishWSEvent({
      type: 'notification',
      payload: {
        id: `payment-${message.paymentId}`,
        type: 'payment',
        message: succeeded
          ? `Payment confirmed (${message.method}) — KSh ${message.amount.toLocaleString()}`
          : `Payment failed (${message.method})`,
        severity: succeeded ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        orderId: message.orderId,
      },
      userIds: [orderData.userId],
    });
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
    console.log(`[NotificationWorker] Processing ${message.type} notification for ${message.recipientId}`);

    if (message.type === 'email') {
      const userDoc = await firestoreAdmin.collection('users').doc(message.recipientId).get();
      const email = userDoc.exists ? userDoc.data()?.email : null;
      if (!email) {
        console.warn(`[NotificationWorker] No email for user ${message.recipientId}`);
        return;
      }
      await sendEmail({
        to: email,
        subject: message.subject,
        html: `<p>${message.content}</p>`,
        text: message.content,
      });
      return;
    }

    // SMS and push require providers (Twilio/FCM) that are not configured yet.
    // They are acknowledged so the message does not retry forever.
    console.log(`[NotificationWorker] ${message.type} delivery not configured; ack:`, message.subject);
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

// Queue management
export async function purgeQueue(queueUrl: string): Promise<void> {
  await sqs.purgeQueue({ QueueUrl: queueUrl });
}

export async function getQueueAttributes(
  queueUrl: string
): Promise<Record<string, string> | undefined> {
  const result = await sqs.getQueueAttributes({
    QueueUrl: queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesDelayed'] as QueueAttributeName[],
  });
  return result.Attributes;
}
