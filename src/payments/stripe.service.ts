// src/payments/stripe.service.ts
import Stripe from "stripe";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia", // Use latest stable version
    });
  }

  /**
   * Create a PaymentIntent and return the client secret
   * so the frontend can confirm the card payment.
   */
  async createPaymentIntent(data: {
    amount: number; // in KES (whole units)
    currency: string; // 'kes'
    metadata: {
      booking_id: number;
      user_id: string;
      vehicle_id: number;
      email: string;
      phone?: string;
    };
  }) {
    try {
      // Stripe expects amounts in the smallest currency unit (cents)
      const amountInCents = Math.round(data.amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: data.currency.toLowerCase(),
        metadata: data.metadata,
        // Optionally add automatic payment method handling
        payment_method_types: ["card"],
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error("Stripe create PaymentIntent error:", error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }
}
