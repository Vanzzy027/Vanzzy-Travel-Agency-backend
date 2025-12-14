// import { getDbPool } from "../db/dbconfig";
// import sql from 'mssql';
export {};
// export interface Payment {
//   payment_id?: number;
//   booking_id: number;
//   amount: number;
//   payment_status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
//   payment_date?: Date;
//   payment_method: string;
//   transaction_id?: string;
//   gross_amount: number;
//   commission_fee: number;
//   net_amount: number;
//   created_at?: Date;
//   updated_at?: Date | null;
// }
// export interface PaymentWithDetails extends Payment {
//   user_id?: string;
//   user_first_name?: string;
//   user_last_name?: string;
//   user_email?: string;
//   vehicle_id?: number;
//   vehicle_manufacturer?: string;
//   vehicle_model?: string;
//   booking_date?: Date;
//   return_date?: Date;
//   total_amount?: number;
// }
// export interface PaymentUpdateData {
//   amount?: number;
//   payment_status?: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
//   payment_method?: string;
//   transaction_id?: string;
//   gross_amount?: number;
//   commission_fee?: number;
//   net_amount?: number;
// }
// export interface PaymentFilters {
//   status?: string;
//   booking_id?: number;
//   user_id?: string;
//   page?: number;
//   limit?: number;
// }
// export type PaymentServiceInput = {
//     booking_id: number;
//     amount: number;
//     payment_status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
//     payment_method: string;
//     gross_amount: number;
//     transaction_id?: string;
// };
// //type PaymentServiceInput = Omit<Payment, 'payment_id' | 'commission_fee' | 'net_amount' | 'payment_date'>;
// // Calculate commission (10% commission rate)
// const calculateCommission = (grossAmount: number): { commissionFee: number, netAmount: number } => {
//   const commissionFee = grossAmount * 0.10; // 10% commission
//   const netAmount = grossAmount - commissionFee;
//   return { commissionFee, netAmount };
// };
// // Create new payment
// export const createPaymentService = async (data: PaymentServiceInput): Promise<Payment> => {
//   try {
//     const pool = await getDbPool();
//     // Calculate commission and net amount
//     const { commissionFee, netAmount } = calculateCommission(data.gross_amount);
//     const query = `
//       INSERT INTO Payments (
//         booking_id, amount, payment_status, payment_method, transaction_id,
//         gross_amount, commission_fee, net_amount
//       )
//       OUTPUT INSERTED.*
//       VALUES (
//         @booking_id, @amount, @payment_status, @payment_method, @transaction_id,
//         @gross_amount, @commission_fee, @net_amount
//       )
//     `;
//     const result = await pool.request()
//       .input('booking_id', sql.Int, data.booking_id)
//       .input('amount', sql.Decimal(10, 2), data.amount)
//       .input('payment_status', sql.NVarChar, data.payment_status)
//       .input('payment_method', sql.NVarChar, data.payment_method)
//       .input('transaction_id', sql.NVarChar, data.transaction_id || null)
//       .input('gross_amount', sql.Decimal(10, 2), data.gross_amount)
//       .input('commission_fee', sql.Decimal(10, 2), commissionFee)
//       .input('net_amount', sql.Decimal(10, 2), netAmount)
//       .query(query);
//     return result.recordset[0] as Payment;
//   } catch (error: any) {
//     console.error("Error creating payment:", error);
//     if (error.number === 547) { // Foreign key constraint
//       if (error.message.includes('booking_id')) {
//         throw new Error("Invalid booking ID");
//       }
//     }
//     throw new Error(error.message || "Failed to create payment");
//   }
// };
// // Process payment (mark as completed)
// export const processPaymentService = async (id: number, data: { transaction_id: string; payment_method: string }): Promise<Payment | null> => {
//   try {
//     const pool = await getDbPool();
//     const query = `
//       UPDATE Payments 
//       SET payment_status = 'Completed',
//           payment_date = GETDATE(),
//           transaction_id = @transaction_id,
//           payment_method = @payment_method,
//           updated_at = GETDATE()
//       OUTPUT INSERTED.*
//       WHERE payment_id = @id AND payment_status = 'Pending'
//     `;
//     const result = await pool.request()
//       .input('id', sql.Int, id)
//       .input('transaction_id', sql.NVarChar, data.transaction_id)
//       .input('payment_method', sql.NVarChar, data.payment_method)
//       .query(query);
//     if (result.recordset.length === 0) {
//       return null;
//     }
//     // Update booking status to Confirmed when payment is completed
//     const payment = result.recordset[0] as Payment;
//     await updateBookingStatus(payment.booking_id, 'Confirmed');
//     return payment;
//   } catch (error: any) {
//     console.error("Error processing payment:", error);
//     throw new Error("Failed to process payment");
//   }
// };
// // Refund payment
// export const refundPaymentService = async (id: number, data: { refund_amount: number; refund_reason?: string }): Promise<Payment | null> => {
//   try {
//     const pool = await getDbPool();
//     const query = `
//       UPDATE Payments 
//       SET payment_status = 'Refunded',
//           amount = @refund_amount,
//           updated_at = GETDATE()
//       OUTPUT INSERTED.*
//       WHERE payment_id = @id AND payment_status = 'Completed'
//     `;
//     const result = await pool.request()
//       .input('id', sql.Int, id)
//       .input('refund_amount', sql.Decimal(10, 2), data.refund_amount)
//       .query(query);
//     if (result.recordset.length === 0) {
//       return null;
//     }
//     return result.recordset[0] as Payment;
//   } catch (error: any) {
//     console.error("Error refunding payment:", error);
//     throw new Error("Failed to refund payment");
//   }
// };
// // Get all payments with optional filtering
// export const getAllPaymentsService = async (filters?: PaymentFilters): Promise<PaymentWithDetails[]> => {
//   try {
//     const pool = await getDbPool();
//     let query = `
//       SELECT 
//         p.*,
//         b.user_id,
//         u.first_name as user_first_name,
//         u.last_name as user_last_name,
//         u.email as user_email,
//         b.vehicle_id,
//         vs.manufacturer as vehicle_manufacturer,
//         vs.model as vehicle_model,
//         b.booking_date,
//         b.return_date,
//         b.total_amount
//       FROM Payments p
//       INNER JOIN Bookings b ON p.booking_id = b.booking_id
//       INNER JOIN Users u ON b.user_id = u.user_id
//       INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//       INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//       WHERE 1=1
//     `;
//     const request = pool.request();
//     if (filters?.status) {
//       query += ` AND p.payment_status = @status`;
//       request.input('status', sql.NVarChar, filters.status);
//     }
//     if (filters?.booking_id) {
//       query += ` AND p.booking_id = @booking_id`;
//       request.input('booking_id', sql.Int, filters.booking_id);
//     }
//     if (filters?.user_id) {
//       query += ` AND b.user_id = @user_id`;
//       request.input('user_id', sql.UniqueIdentifier, filters.user_id);
//     }
//     // Add pagination
//     const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
//     query += ` ORDER BY p.created_at DESC 
//                OFFSET @offset ROWS 
//                FETCH NEXT @limit ROWS ONLY`;
//     request.input('offset', sql.Int, offset);
//     request.input('limit', sql.Int, filters?.limit || 10);
//     const result = await request.query(query);
//     return result.recordset as PaymentWithDetails[];
//   } catch (error: any) {
//     console.error("Error retrieving payments:", error);
//     throw new Error("Failed to retrieve payments");
//   }
// };
// // Get payment by ID with details
// export const getPaymentByIdService = async (id: number): Promise<PaymentWithDetails | null> => {
//   try {
//     const pool = await getDbPool();
//     const query = `
//       SELECT 
//         p.*,
//         b.user_id,
//         u.first_name as user_first_name,
//         u.last_name as user_last_name,
//         u.email as user_email,
//         b.vehicle_id,
//         vs.manufacturer as vehicle_manufacturer,
//         vs.model as vehicle_model,
//         b.booking_date,
//         b.return_date,
//         b.total_amount
//       FROM Payments p
//       INNER JOIN Bookings b ON p.booking_id = b.booking_id
//       INNER JOIN Users u ON b.user_id = u.user_id
//       INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//       INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//       WHERE p.payment_id = @id
//     `;
//     const result = await pool.request()
//       .input('id', sql.Int, id)
//       .query(query);
//     if (result.recordset.length === 0) {
//       return null;
//     }
//     return result.recordset[0] as PaymentWithDetails;
//   } catch (error: any) {
//     console.error("Error retrieving payment:", error);
//     throw new Error("Failed to retrieve payment");
//   }
// };
// // Get user's payments
// export const getUserPaymentsService = async (user_id: string, filters?: { status?: string; page?: number; limit?: number }): Promise<PaymentWithDetails[]> => {
//   try {
//     const pool = await getDbPool();
//     let query = `
//       SELECT 
//         p.*,
//         b.user_id,
//         u.first_name as user_first_name,
//         u.last_name as user_last_name,
//         u.email as user_email,
//         b.vehicle_id,
//         vs.manufacturer as vehicle_manufacturer,
//         vs.model as vehicle_model,
//         b.booking_date,
//         b.return_date,
//         b.total_amount
//       FROM Payments p
//       INNER JOIN Bookings b ON p.booking_id = b.booking_id
//       INNER JOIN Users u ON b.user_id = u.user_id
//       INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//       INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//       WHERE b.user_id = @user_id
//     `;
//     const request = pool.request()
//       .input('user_id', sql.UniqueIdentifier, user_id);
//     if (filters?.status) {
//       query += ` AND p.payment_status = @status`;
//       request.input('status', sql.NVarChar, filters.status);
//     }
//     // Add pagination
//     const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
//     query += ` ORDER BY p.created_at DESC 
//                OFFSET @offset ROWS 
//                FETCH NEXT @limit ROWS ONLY`;
//     request.input('offset', sql.Int, offset);
//     request.input('limit', sql.Int, filters?.limit || 10);
//     const result = await request.query(query);
//     return result.recordset as PaymentWithDetails[];
//   } catch (error: any) {
//     console.error("Error retrieving user payments:", error);
//     throw new Error("Failed to retrieve user payments");
//   }
// };
// // Get payments by booking ID
// export const getPaymentsByBookingService = async (booking_id: number): Promise<PaymentWithDetails[]> => {
//   try {
//     const pool = await getDbPool();
//     const query = `
//       SELECT 
//         p.*,
//         b.user_id,
//         u.first_name as user_first_name,
//         u.last_name as user_last_name,
//         u.email as user_email,
//         b.vehicle_id,
//         vs.manufacturer as vehicle_manufacturer,
//         vs.model as vehicle_model,
//         b.booking_date,
//         b.return_date,
//         b.total_amount
//       FROM Payments p
//       INNER JOIN Bookings b ON p.booking_id = b.booking_id
//       INNER JOIN Users u ON b.user_id = u.user_id
//       INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//       INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//       WHERE p.booking_id = @booking_id
//       ORDER BY p.created_at DESC
//     `;
//     const result = await pool.request()
//       .input('booking_id', sql.Int, booking_id)
//       .query(query);
//     return result.recordset as PaymentWithDetails[];
//   } catch (error: any) {
//     console.error("Error retrieving payments by booking:", error);
//     throw new Error("Failed to retrieve payments by booking");
//   }
// };
// // Update payment
// export const updatePaymentService = async (id: number, data: PaymentUpdateData): Promise<Payment | null> => {
//   try {
//     const pool = await getDbPool();
//     const fields: string[] = [];
//     const request = pool.request().input('id', sql.Int, id);
//     // Build dynamic update query
//     Object.entries(data).forEach(([key, value]) => {
//       if (value !== undefined) {
//         fields.push(`${key} = @${key}`);
//         if (typeof value === 'string') {
//           request.input(key, sql.NVarChar, value);
//         } else if (typeof value === 'number') {
//           request.input(key, sql.Decimal(10, 2), value);
//         }
//       }
//     });
//     if (fields.length === 0) {
//       throw new Error("No update data provided");
//     }
//     fields.push('updated_at = GETDATE()');
//     const query = `
//       UPDATE Payments 
//       SET ${fields.join(', ')}
//       OUTPUT INSERTED.*
//       WHERE payment_id = @id
//     `;
//     const result = await request.query(query);
//     if (result.recordset.length === 0) {
//       return null;
//     }
//     return result.recordset[0] as Payment;
//   } catch (error: any) {
//     console.error("Error updating payment:", error);
//     throw new Error("Failed to update payment");
//   }
// };
// // Helper function to update booking status
// const updateBookingStatus = async (booking_id: number, status: string): Promise<void> => {
//   try {
//     const pool = await getDbPool();
//     const query = `UPDATE Bookings SET booking_status = @status, updated_at = GETDATE() WHERE booking_id = @booking_id`;
//     await pool.request()
//       .input('booking_id', sql.Int, booking_id)
//       .input('status', sql.NVarChar, status)
//       .query(query);
//   } catch (error: any) {
//     console.error("Error updating booking status:", error);
//     throw new Error("Failed to update booking status");
//   }
// };
