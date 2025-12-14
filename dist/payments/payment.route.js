// src/payments/payment.route.ts
import { Hono } from "hono";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { PaymentRepository } from "./payment.repository.js";
const paymentRouter = new Hono();
// Initialize dependencies
const paymentRepo = new PaymentRepository();
const paymentService = new PaymentService(paymentRepo);
const paymentController = new PaymentController(paymentService);
// Public routes (no auth needed)
paymentRouter.get("/health", (c) => {
    return c.json({
        status: "OK",
        service: "payments",
        timestamp: new Date().toISOString()
    });
});
// Get receipt by payment ID or booking ID (public for sharing)
paymentRouter.get("/:paymentId/receipt", async (c) => {
    return paymentController.getReceipt(c);
});
paymentRouter.get("/receipt", async (c) => {
    return paymentController.getReceipt(c);
});
// Protected routes - require authentication
// Add these after you implement authentication middleware
paymentRouter.post("/initialize", async (c) => {
    return paymentController.initializePayment(c);
});
// Get user's receipts - requires userId parameter
paymentRouter.get("/my-receipts", async (c) => {
    return paymentController.getUserReceipts(c);
});
// Get payment by booking ID
paymentRouter.get("/booking/:bookingId", async (c) => {
    return paymentController.getPaymentByBooking(c);
});
// Admin routes - get all receipts
paymentRouter.get("/all-receipts", async (c) => {
    return paymentController.getAllReceipts(c);
});
// Get all payments (alternative endpoint)
paymentRouter.get("/", async (c) => {
    return paymentController.getAllPayments(c);
});
// Downloading receipt file
paymentRouter.get("/:paymentId/download", async (c) => {
    return paymentController.downloadReceipt(c);
});
export default paymentRouter;
