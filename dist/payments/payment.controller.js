export class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    // ADD THIS NEW METHOD
    async getReceipt(c) {
        try {
            const { paymentId } = c.req.param();
            const { bookingId } = c.req.query();
            if (!paymentId && !bookingId) {
                return c.json({
                    success: false,
                    message: 'Please provide either paymentId as URL parameter or bookingId as query parameter'
                }, 400);
            }
            const receiptData = await this.paymentService.getReceiptData(paymentId ? parseInt(paymentId) : undefined, bookingId ? parseInt(bookingId) : undefined);
            return c.json({
                success: true,
                data: receiptData,
                message: "Receipt retrieved successfully"
            });
        }
        catch (error) {
            console.error('Get Receipt Error:', error);
            // Handle specific errors
            if (error.message === 'Payment not found') {
                return c.json({
                    success: false,
                    message: error.message
                }, 404);
            }
            return c.json({
                success: false,
                message: error.message || 'Failed to get receipt'
            }, 500);
        }
    }
    // Rest of your existing methods remain the same
    async initializePayment(c) {
        try {
            const body = await c.req.json();
            // Validate required fields
            const requiredFields = ['booking_id', 'user_id', 'amount', 'payment_method'];
            const missingFields = requiredFields.filter(field => !body[field]);
            if (missingFields.length > 0) {
                return c.json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                }, 400);
            }
            const paymentData = {
                booking_id: body.booking_id,
                user_id: body.user_id,
                amount: body.amount,
                payment_method: body.payment_method,
                payment_status: body.payment_status || 'Completed',
                transaction_id: body.transaction_id,
                transaction_reference: body.transaction_reference,
                phone: body.phone,
            };
            const result = await this.paymentService.initializePayment(paymentData);
            return c.json({
                success: true,
                message: "Payment initialized successfully",
                data: result.data
            });
        }
        catch (error) {
            console.error("Initialize Payment Error:", error);
            return c.json({
                success: false,
                message: error.message || "Failed to initialize payment"
            }, 500);
        }
    }
    // Helper method to extract user ID from JWT token
    extractUserIdFromToken(authHeader) {
        try {
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return null;
            }
            const token = authHeader.split(' ')[1];
            // Decode JWT token (without verification for now, since we're using same token for all)
            // In production, you should verify the token with your JWT secret
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            // Extract user ID - looking for user_id in the payload
            // Based on your token structure, it might be in different fields
            return payload.user_id || payload.userId || payload.sub || null;
        }
        catch (error) {
            console.error('Error extracting user ID from token:', error);
            return null;
        }
    }
    async getUserReceipts(c) {
        try {
            // Get authorization header
            const authHeader = c.req.header('Authorization');
            if (!authHeader) {
                return c.json({
                    success: false,
                    message: 'Authorization header is required'
                }, 401);
            }
            // Extract user ID from token
            const userId = this.extractUserIdFromToken(authHeader);
            if (!userId) {
                return c.json({
                    success: false,
                    message: 'Invalid or expired token'
                }, 401);
            }
            console.log(`📋 Fetching receipts for user: ${userId}`);
            const receipts = await this.paymentService.getUserReceipts(userId);
            return c.json({
                success: true,
                count: receipts.length,
                data: receipts,
                message: "User receipts retrieved successfully"
            });
        }
        catch (error) {
            console.error('Get User Receipts Error:', error);
            return c.json({
                success: false,
                message: error.message || 'Failed to get user receipts'
            }, 500);
        }
    }
    async getAllReceipts(c) {
        try {
            const receipts = await this.paymentService.getAllReceipts();
            return c.json({
                success: true,
                count: receipts.length,
                data: receipts
            });
        }
        catch (error) {
            console.error('Get All Receipts Error:', error);
            return c.json({ success: false, message: error.message || 'Failed to get receipts' }, 500);
        }
    }
    async getPaymentByBooking(c) {
        try {
            const { bookingId } = c.req.param();
            if (!bookingId) {
                return c.json({ success: false, message: 'Booking ID is required' }, 400);
            }
            const payment = await this.paymentService.getLatestPaymentByBooking(parseInt(bookingId));
            if (!payment) {
                return c.json({ success: false, message: 'No payment found for this booking' }, 404);
            }
            return c.json({
                success: true,
                data: payment
            });
        }
        catch (error) {
            console.error('Get Payment By Booking Error:', error);
            return c.json({ success: false, message: error.message || 'Failed to get payment' }, 500);
        }
    }
    async getAllPayments(c) {
        try {
            const payments = await this.paymentService.getAllPayments();
            return c.json({
                success: true,
                count: payments.length,
                data: payments
            });
        }
        catch (error) {
            console.error('Get All Payments Error:', error);
            return c.json({ success: false, message: error.message || 'Failed to get payments' }, 500);
        }
    }
    async downloadReceipt(c) {
        try {
            const { paymentId } = c.req.param();
            const receiptData = await this.paymentService.getReceiptData(parseInt(paymentId));
            // Set headers for file download
            c.header('Content-Type', 'application/json');
            c.header('Content-Disposition', `attachment; filename="receipt-${paymentId}.json"`);
            return c.json({
                success: true,
                data: receiptData
            });
        }
        catch (error) {
            console.error('Download Receipt Error:', error);
            return c.json({ success: false, message: error.message || 'Failed to download receipt' }, 500);
        }
    }
}
// // src/payments/payment.controller.ts
// import {type Context } from "hono";
// import { PaymentService } from "./payment.service.js";
// import jwt from 'jsonwebtoken';
// export class PaymentController {
//   constructor(private paymentService: PaymentService) {}
//   async initializePayment(c: Context) {
//     try {
//       const body = await c.req.json();
//       // Validate required fields
//       const requiredFields = ['booking_id', 'user_id', 'amount', 'payment_method'];
//       const missingFields = requiredFields.filter(field => !body[field]);
//       if (missingFields.length > 0) {
//         return c.json(
//           { 
//             success: false, 
//             message: `Missing required fields: ${missingFields.join(', ')}` 
//           }, 
//           400
//         );
//       }
//       const paymentData = {
//         booking_id: body.booking_id,
//         user_id: body.user_id,
//         amount: body.amount,
//         payment_method: body.payment_method,
//         payment_status: body.payment_status || 'Completed',
//         transaction_id: body.transaction_id,
//         transaction_reference: body.transaction_reference,
//         phone: body.phone,
//       };
//       const result = await this.paymentService.initializePayment(paymentData);
//       return c.json({
//         success: true,
//         message: "Payment initialized successfully",
//         data: result.data
//       });
//     } catch (error: any) {
//       console.error("Initialize Payment Error:", error);
//       return c.json(
//         { 
//           success: false, 
//           message: error.message || "Failed to initialize payment" 
//         }, 
//         500
//       );
//     }
//   }
//   // Helper method to extract user ID from JWT token
//   private extractUserIdFromToken(authHeader: string): string | null {
//     try {
//       if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return null;
//       }
//       const token = authHeader.split(' ')[1];
//       // Decode JWT token (without verification for now, since we're using same token for all)
//       // In production, you should verify the token with your JWT secret
//       const parts = token.split('.');
//       if (parts.length !== 3) {
//         return null;
//       }
//       const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
//       // Extract user ID - looking for user_id in the payload
//       // Based on your token structure, it might be in different fields
//       return payload.user_id || payload.userId || payload.sub || null;
//     } catch (error) {
//       console.error('Error extracting user ID from token:', error);
//       return null;
//     }
//   }
//   async getUserReceipts(c: Context) {
//     try {
//       // Get authorization header
//       const authHeader = c.req.header('Authorization');
//       if (!authHeader) {
//         return c.json(
//           { 
//             success: false, 
//             message: 'Authorization header is required' 
//           }, 
//           401
//         );
//       }
//       // Extract user ID from token
//       const userId = this.extractUserIdFromToken(authHeader);
//       if (!userId) {
//         return c.json(
//           { 
//             success: false, 
//             message: 'Invalid or expired token' 
//           }, 
//           401
//         );
//       }
//       console.log(`📋 Fetching receipts for user: ${userId}`);
//       const receipts = await this.paymentService.getUserReceipts(userId);
//       return c.json({
//         success: true,
//         count: receipts.length,
//         data: receipts,
//         message: "User receipts retrieved successfully"
//       });
//     } catch (error: any) {
//       console.error('Get User Receipts Error:', error);
//       return c.json(
//         { 
//           success: false, 
//           message: error.message || 'Failed to get user receipts' 
//         }, 
//         500
//       );
//     }
//   }
//   async getAllReceipts(c: Context) {
//     try {
//       const receipts = await this.paymentService.getAllReceipts();
//       return c.json({
//         success: true,
//         count: receipts.length,
//         data: receipts
//       });
//     } catch (error: any) {
//       console.error('Get All Receipts Error:', error);
//       return c.json(
//         { success: false, message: error.message || 'Failed to get receipts' },
//         500
//       );
//     }
//   }
//   async getPaymentByBooking(c: Context) {
//     try {
//       const { bookingId } = c.req.param();
//       if (!bookingId) {
//         return c.json(
//           { success: false, message: 'Booking ID is required' },
//           400
//         );
//       }
//       const payment = await this.paymentService.getLatestPaymentByBooking(parseInt(bookingId));
//       if (!payment) {
//         return c.json(
//           { success: false, message: 'No payment found for this booking' },
//           404
//         );
//       }
//       return c.json({
//         success: true,
//         data: payment
//       });
//     } catch (error: any) {
//       console.error('Get Payment By Booking Error:', error);
//       return c.json(
//         { success: false, message: error.message || 'Failed to get payment' },
//         500
//       );
//     }
//   }
//   async getAllPayments(c: Context) {
//     try {
//       const payments = await this.paymentService.getAllPayments();
//       return c.json({
//         success: true,
//         count: payments.length,
//         data: payments
//       });
//     } catch (error: any) {
//       console.error('Get All Payments Error:', error);
//       return c.json(
//         { success: false, message: error.message || 'Failed to get payments' },
//         500
//       );
//     }
//   }
//   // In your payment.controller.ts - add download endpoint
// async downloadReceipt(c: Context) {
//   try {
//     const { paymentId } = c.req.param();
//     const receiptData = await this.paymentService.getReceiptData(parseInt(paymentId));
//     // Set headers for file download
//     c.header('Content-Type', 'application/json');
//     c.header('Content-Disposition', `attachment; filename="receipt-${paymentId}.json"`);
//     return c.json({
//       success: true,
//       data: receiptData
//     });
//   } catch (error: any) {
//     console.error('Download Receipt Error:', error);
//     return c.json(
//       { success: false, message: error.message || 'Failed to download receipt' },
//       500
//     );
//   }
// }}
