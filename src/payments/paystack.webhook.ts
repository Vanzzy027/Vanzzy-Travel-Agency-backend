import { Hono } from "hono";
import crypto from "crypto";
import { PaymentService } from "./payment.service.js";
import { PaymentRepository } from "./payment.repository.js";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

const paystackWebhook = new Hono();

paystackWebhook.post("/webhook/paystack", async (c) => {
  try {
    const signature = c.req.header("x-paystack-signature");
    const body = await c.req.text();

    // Verify signature
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid Paystack webhook signature");
      return c.json({ error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(body);

    // Handle different Paystack events
    switch (event.event) {
      case "charge.success":
        console.log("💰 Paystack webhook charge.success:", event.data);

        // Initialize services to record the payment
        const paymentRepo = new PaymentRepository();
        const paymentService = new PaymentService(paymentRepo);

        // Extract relevant payment details from the webhook
        const paymentData = {
          booking_id: event.data.metadata?.booking_id,
          user_id: event.data.metadata?.user_id,
          amount: event.data.amount / 100, // Convert from kobo
          payment_method:
            event.data.channel === "mobile_money" ? "M-Pesa" : "Card",
          payment_status: "completed",
          transaction_id: event.data.id?.toString(),
          transaction_reference: event.data.reference,
          phone:
            event.data.customer?.phone ||
            event.data.authorization?.mobile_money_number,
          email: event.data.customer?.email,
        };

        // Record the payment and update the booking
        await paymentService.initializePayment(paymentData);

        console.log("✅ Payment recorded via webhook:", event.data.reference);
        return c.json({ received: true });

      case "charge.failed":
        console.log("❌ Paystack charge failed:", event.data);
        return c.json({ received: true });

      default:
        console.log("ℹ️ Unhandled Paystack event:", event.event);
        return c.json({ received: true });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 so Paystack doesn't retry
    return c.json({ received: true }, 200);
  }
});

export default paystackWebhook;
