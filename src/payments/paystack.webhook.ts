// src/payments/paystack.webhook.ts
import { Hono } from 'hono';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const paystackWebhook = new Hono();

// Webhook to verify Paystack payments
paystackWebhook.post('/webhook/paystack', async (c) => {
  try {
    const signature = c.req.header('x-paystack-signature');
    const body = await c.req.text();
    
    // Verify signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex');
    
    if (hash !== signature) {
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(body);
    
    // Handle different Paystack events
    switch (event.event) {
      case 'charge.success':
        console.log('💰 Paystack charge successful:', event.data);
        
        // Extract payment details
        const paymentData = {
          amount: event.data.amount / 100, // Convert from kobo to naira
          reference: event.data.reference,
          transaction_id: event.data.id,
          status: event.data.status,
          channel: event.data.channel,
          phone: event.data.customer?.phone || 
                 event.data.authorization?.mobile_money_number,
          email: event.data.customer?.email,
          paid_at: event.data.paid_at,
          metadata: event.data.metadata
        };
        
        console.log('📱 Payment details:', paymentData);
        
        // Here you would update your database with the payment
        // You can save this to a queue or process immediately
        
        return c.json({ received: true });
        
      case 'charge.failed':
        console.log('❌ Paystack charge failed:', event.data);
        return c.json({ received: true });
        
      default:
        console.log('ℹ️ Unhandled Paystack event:', event.event);
        return c.json({ received: true });
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default paystackWebhook;