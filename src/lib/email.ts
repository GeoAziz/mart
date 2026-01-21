import type { Order } from '@/lib/types';

// Nodemailer optional - only loaded if available
let nodemailer: any = null;
let transporter: any = null;

try {
  nodemailer = require('nodemailer');
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
} catch (error) {
  console.warn('⚠️  Nodemailer not installed. Email notifications disabled.');
  console.warn('   Run: npm install nodemailer to enable email.');
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  // If email is not configured, skip email sending (don't fail the order)
  if (!transporter) {
    console.log('ℹ️  Email notification skipped - nodemailer not configured');
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .order-summary { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-size: 1.2em; font-weight: bold; color: #667eea; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Confirmed!</h1>
          <p>Thank you for shopping with ZilaCart</p>
        </div>
        
        <div class="content">
          <h2>Order #${order.id?.substring(0, 8).toUpperCase()}</h2>
          <p>Hi ${order.userFullName},</p>
          <p>We've received your order and will process it shortly. You'll receive another email when your order ships.</p>
          
          <div class="order-summary">
            <h3>Order Summary</h3>
            ${order.items.map(item => `
              <div class="item">
                <strong>${item.name}</strong><br>
                Quantity: ${item.quantity} × KSh ${item.price.toLocaleString()}<br>
                Subtotal: KSh ${(item.quantity * item.price).toLocaleString()}
              </div>
            `).join('')}
            
            <div style="margin-top: 20px;">
              <p>Subtotal: KSh ${order.subtotal.toLocaleString()}</p>
              ${order.discountAmount ? `<p style="color: green;">Discount: -KSh ${order.discountAmount.toLocaleString()}</p>` : ''}
              <p>Shipping: KSh ${order.shippingCost.toLocaleString()}</p>
              <p>Tax (VAT 16%): KSh ${order.taxAmount.toLocaleString()}</p>
              <p class="total">Total: KSh ${order.totalAmount.toLocaleString()}</p>
            </div>
          </div>
          
          <div class="order-summary">
            <h3>Shipping Address</h3>
            <p>
              ${order.shippingAddress.fullName}<br>
              ${order.shippingAddress.address}<br>
              ${order.shippingAddress.city}${order.shippingAddress.postalCode ? ', ' + order.shippingAddress.postalCode : ''}<br>
              Phone: ${order.shippingAddress.phone}
            </p>
          </div>
          
          <div class="order-summary">
            <h3>Payment Method</h3>
            <p>${order.paymentMethod}</p>
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/account/orders/${order.id}" class="button">
              View Order Details
            </a>
          </center>
          
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            If you have any questions, please contact our support team at support@zilacart.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: '"ZilaCart" <orders@zilacart.com>',
      to: order.userEmail,
      subject: `Order Confirmation #${order.id?.substring(0, 8).toUpperCase()} - ZilaCart`,
      html: emailHtml,
    });
    console.log('✅ Order confirmation email sent to:', order.userEmail);
  } catch (error) {
    console.error('⚠️  Failed to send order confirmation email:', error);
    // Don't throw - email failure shouldn't block order creation
  }
}

// Verify transporter configuration on startup
export async function verifyEmailConfig(): Promise<boolean> {
  if (!transporter) {
    console.log('ℹ️  Email notifications not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Email server is ready');
    return true;
  } catch (error) {
    console.error('❌ Email server configuration error:', error);
    return false;
  }
}
