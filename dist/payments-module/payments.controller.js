// import { Context } from "hono";
// import {
//   createPaymentService,
//   getAllPaymentsService,
//   getPaymentByIdService,
//   updatePaymentService,
//   getPaymentsByBookingService,
//   getUserPaymentsService,
//   processPaymentService,
//   refundPaymentService
// } from "./payments.service";
// import { PaymentSchema, PaymentUpdateSchema, ProcessPaymentSchema } from "../validators/payment.validators";
export {};
// // Create new payment
// export const createPayment = async (c: Context) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }
//     const body = await c.req.json();
//     // Validate input
//     const validation = PaymentSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }
//     const payment = await createPaymentService(validation.data);
//     return c.json({
//       message: "Payment created successfully 🎉",
//       data: payment
//     }, 201);
//   } catch (error: any) {
//     console.error("Error creating payment:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Process payment 
// export const processPayment = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid payment ID" }, 400);
//     }
//     const body = await c.req.json();
//     // Validate input
//     const validation = ProcessPaymentSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }
//     const processedPayment = await processPaymentService(id, validation.data);
//     if (!processedPayment) {
//       return c.json({ error: "Payment not found or cannot be processed" }, 404);
//     }
//     return c.json({
//       message: "Payment processed successfully ✅",
//       data: processedPayment
//     }, 200);
//   } catch (error: any) {
//     console.error("Error processing payment:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Refund payment
// export const refundPayment = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid payment ID" }, 400);
//     }
//     const body = await c.req.json();
//     const { refund_amount, refund_reason } = body;
//     const refundedPayment = await refundPaymentService(id, {
//       refund_amount,
//       refund_reason
//     });
//     if (!refundedPayment) {
//       return c.json({ error: "Payment not found or cannot be refunded" }, 404);
//     }
//     return c.json({
//       message: "Payment refunded successfully 💸",
//       data: refundedPayment
//     }, 200);
//   } catch (error: any) {
//     console.error("Error refunding payment:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Get all payments 
// export const getAllPayments = async (c: Context) => {
//   try {
//     const { status, booking_id, user_id, page = '1', limit = '10' } = c.req.query();
//     const payments = await getAllPaymentsService({
//       status: status as string,
//       booking_id: booking_id ? parseInt(booking_id) : undefined,
//       user_id: user_id as string,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });
//     if (!payments || payments.length === 0) {
//       return c.json({ message: "No payments found" }, 404);
//     }
//     return c.json({
//       message: "Payments retrieved successfully",
//       data: payments,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit)
//       }
//     }, 200);
//   } catch (error: any) {
//     console.error("Error retrieving payments:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Get payment by ID
// export const getPaymentById = async (c: Context) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }
//     const id = parseInt(c.req.param('id'));
//     const user_id = c.user.user_id;
//     const user_role = c.user.role;
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid payment ID" }, 400);
//     }
//     const payment = await getPaymentByIdService(id);
//     if (!payment) {
//       return c.json({ error: "Payment not found" }, 404);
//     }
//     // Users can only see their own payments, admins can see all
//     if (user_role !== 'admin' && user_role !== 'superAdmin' && payment.user_id !== user_id) {
//       return c.json({ error: "Access denied" }, 403);
//     }
//     return c.json({
//       message: "Payment retrieved successfully",
//       data: payment
//     }, 200);
//   } catch (error: any) {
//     console.error("Error retrieving payment:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Get user's payments
// export const getUserPayments = async (c: Context) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }
//     const user_id = c.user.user_id;
//     const { status, page = '1', limit = '10' } = c.req.query();
//     const payments = await getUserPaymentsService(user_id, {
//       status: status as string,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });
//     if (!payments || payments.length === 0) {
//       return c.json({ message: "No payments found" }, 404);
//     }
//     return c.json({
//       message: "User payments retrieved successfully",
//       data: payments,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit)
//       }
//     }, 200);
//   } catch (error: any) {
//     console.error("Error retrieving user payments:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Get payments by booking ID
// export const getPaymentsByBooking = async (c: Context) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }
//     const booking_id = parseInt(c.req.param('bookingId'));
//     const user_id = c.user.user_id;
//     const user_role = c.user.role;
//     if (isNaN(booking_id) || booking_id <= 0) {
//       return c.json({ error: "Invalid booking ID" }, 400);
//     }
//     const payments = await getPaymentsByBookingService(booking_id);
//     if (!payments || payments.length === 0) {
//       return c.json({ message: "No payments found for this booking" }, 404);
//     }
//     // Users can only see their own payments, admins can see all
//     if (user_role !== 'admin' && user_role !== 'superAdmin' && payments[0].user_id !== user_id) {
//       return c.json({ error: "Access denied" }, 403);
//     }
//     return c.json({
//       message: "Booking payments retrieved successfully",
//       data: payments
//     }, 200);
//   } catch (error: any) {
//     console.error("Error retrieving booking payments:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Update payment (Admin only)
// export const updatePayment = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid payment ID" }, 400);
//     }
//     const body = await c.req.json();
//     // Validate input
//     const validation = PaymentUpdateSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }
//     const updatedPayment = await updatePaymentService(id, validation.data);
//     if (!updatedPayment) {
//       return c.json({ error: "Payment not found or no changes made" }, 404);
//     }
//     return c.json({
//       message: "Payment updated successfully 🎉",
//       data: updatedPayment
//     }, 200);
//   } catch (error: any) {
//     console.error("Error updating payment:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
