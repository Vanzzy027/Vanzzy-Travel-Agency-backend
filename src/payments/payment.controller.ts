// src/payments/payment.controller.ts
import { Context } from "hono";
import { PaymentService } from "./payment.service";

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  async initializePayment(c: Context) {
    try {
      const body = await c.req.json();

      // Validate required fields
      const requiredFields = ['booking_id', 'user_id', 'amount', 'payment_method'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        return c.json(
          { 
            success: false, 
            message: `Missing required fields: ${missingFields.join(', ')}` 
          }, 
          400
        );
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
      
    } catch (error: any) {
      console.error("Initialize Payment Error:", error);
      return c.json(
        { 
          success: false, 
          message: error.message || "Failed to initialize payment" 
        }, 
        500
      );
    }
  }

  async getReceipt(c: Context) {
    try {
      const { paymentId } = c.req.param();
      const { bookingId } = c.req.query();
      
      if (!paymentId && !bookingId) {
        return c.json(
          { success: false, message: 'Payment ID or Booking ID is required' },
          400
        );
      }

      const paymentIdNum = paymentId ? parseInt(paymentId) : undefined;
      const bookingIdNum = bookingId ? parseInt(bookingId) : undefined;

      const receiptData = await this.paymentService.getReceiptData(paymentIdNum, bookingIdNum);
      
      return c.json({
        success: true,
        data: receiptData
      });
      
    } catch (error: any) {
      console.error('Get Receipt Error:', error);
      
      if (error.message === 'Payment not found') {
        return c.json(
          { success: false, message: 'Payment not found' },
          404
        );
      }
      
      return c.json(
        { success: false, message: error.message || 'Failed to get receipt' },
        500
      );
    }
  }

  async getUserReceipts(c: Context) {
    try {
      // Extract user ID from query parameter or JWT token
      const { userId } = c.req.query();
      
      if (!userId) {
        return c.json(
          { success: false, message: 'User ID is required' },
          400
        );
      }

      const receipts = await this.paymentService.getUserReceipts(userId);
      
      return c.json({
        success: true,
        count: receipts.length,
        data: receipts
      });
      
    } catch (error: any) {
      console.error('Get User Receipts Error:', error);
      return c.json(
        { success: false, message: error.message || 'Failed to get user receipts' },
        500
      );
    }
  }

  async getAllReceipts(c: Context) {
    try {
      const receipts = await this.paymentService.getAllReceipts();
      
      return c.json({
        success: true,
        count: receipts.length,
        data: receipts
      });
      
    } catch (error: any) {
      console.error('Get All Receipts Error:', error);
      return c.json(
        { success: false, message: error.message || 'Failed to get receipts' },
        500
      );
    }
  }

  async getPaymentByBooking(c: Context) {
    try {
      const { bookingId } = c.req.param();
      
      if (!bookingId) {
        return c.json(
          { success: false, message: 'Booking ID is required' },
          400
        );
      }

      const payment = await this.paymentService.getLatestPaymentByBooking(parseInt(bookingId));
      
      if (!payment) {
        return c.json(
          { success: false, message: 'No payment found for this booking' },
          404
        );
      }

      return c.json({
        success: true,
        data: payment
      });
      
    } catch (error: any) {
      console.error('Get Payment By Booking Error:', error);
      return c.json(
        { success: false, message: error.message || 'Failed to get payment' },
        500
      );
    }
  }

  async getAllPayments(c: Context) {
    try {
      const payments = await this.paymentService.getAllPayments();
      
      return c.json({
        success: true,
        count: payments.length,
        data: payments
      });
      
    } catch (error: any) {
      console.error('Get All Payments Error:', error);
      return c.json(
        { success: false, message: error.message || 'Failed to get payments' },
        500
      );
    }
  }

  // In your payment.controller.ts - add download endpoint
async downloadReceipt(c: Context) {
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
  } catch (error: any) {
    console.error('Download Receipt Error:', error);
    return c.json(
      { success: false, message: error.message || 'Failed to download receipt' },
      500
    );
  }
}
}


// // src/payments/payment.controller.ts - Add authentication middleware
// import { Context } from "hono";
// import { PaymentService } from "./payment.service";
// import { jwt } from "hono/jwt";

// // Middleware to verify JWT token
// const authMiddleware = jwt({
//   secret: process.env.JWT_SECRET || 'your-secret-key',
// });

// export class PaymentController {
//   constructor(private paymentService: PaymentService) {}

//   // Add middleware to routes that need authentication
//   async initializePayment(c: Context) {
//     try {
//       // Get user from JWT token
//       const user = c.get('jwtPayload');
//       const body = await c.req.json();
      
//       console.log('📥 Received payment data:', body);
//       console.log('👤 User:', user);

//       // Use user_id from token if not provided
//       const userId = body.user_id || user?.userId || user?.sub;
//       if (!userId) {
//         return c.json(
//           { success: false, message: 'User authentication required' },
//           401
//         );
//       }

//       // Validate required fields
//       const requiredFields = ['booking_id', 'amount', 'payment_method'];
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
//         user_id: userId, // Use authenticated user ID
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

//   async getUserReceipts(c: Context) {
//     try {
//       // Get user from JWT token
//       const user = c.get('jwtPayload');
//       const userId = user?.userId || user?.sub;
      
//       if (!userId) {
//         return c.json(
//           { success: false, message: 'User authentication required' },
//           401
//         );
//       }

//       // Get user's receipts
//       const receipts = await this.paymentService.getUserReceipts(userId);
      
//       return c.json({
//         success: true,
//         count: receipts.length,
//         data: receipts
//       });
      
//     } catch (error: any) {
//       console.error('Get User Receipts Error:', error);
//       return c.json(
//         { success: false, message: error.message || 'Failed to get receipts' },
//         500
//       );
//     }
//   }

//   async getAllReceipts(c: Context) {
//     try {
//       // Check if user is admin
//       const user = c.get('jwtPayload');
//       const userRole = user?.role;
      
//       if (userRole !== 'admin' && userRole !== 'superAdmin') {
//         return c.json(
//           { success: false, message: 'Admin access required' },
//           403
//         );
//       }

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



//   async getReceipt(c: Context) {
//     try {
//       const { paymentId } = c.req.param();
//       const { bookingId } = c.req.query();
      
//       if (!paymentId && !bookingId) {
//         return c.json(
//           { success: false, message: 'Payment ID or Booking ID is required' },
//           400
//         );
//       }

//       const paymentIdNum = paymentId ? parseInt(paymentId) : undefined;
//       const bookingIdNum = bookingId ? parseInt(bookingId) : undefined;

//       const receiptData = await this.paymentService.getReceiptData(paymentIdNum, bookingIdNum);
      
//       return c.json({
//         success: true,
//         data: receiptData
//       });
      
//     } catch (error: any) {
//       console.error('Get Receipt Error:', error);
      
//       if (error.message === 'Payment not found') {
//         return c.json(
//           { success: false, message: 'Payment not found' },
//           404
//         );
//       }
      
//       return c.json(
//         { success: false, message: error.message || 'Failed to get receipt' },
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
// }