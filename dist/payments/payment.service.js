import { getDbPool } from "../db/dbconfig.js";
export class PaymentService {
    paymentRepo;
    constructor(paymentRepo) {
        this.paymentRepo = paymentRepo;
    }
    async initializePayment(paymentData) {
        try {
            // Calculate amounts
            const grossAmount = paymentData.amount;
            const commissionFee = grossAmount * 0.02; // 2% commission
            const netAmount = grossAmount - commissionFee;
            const completePaymentData = {
                ...paymentData,
                gross_amount: grossAmount,
                commission_fee: commissionFee,
                net_amount: netAmount,
                payment_status: paymentData.payment_status || 'Completed',
            };
            console.log('💾 Saving payment to database:', completePaymentData);
            // Start transaction for both operations
            const pool = getDbPool();
            const transaction = pool.transaction();
            await transaction.begin();
            try {
                // 1. Create payment record
                const paymentQuery = `
        INSERT INTO Payments (
          booking_id, user_id, amount, gross_amount, 
          commission_fee, net_amount, payment_method, 
          payment_status, transaction_id, transaction_reference, 
          phone, created_at, updated_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @booking_id, @user_id, @amount, @gross_amount,
          @commission_fee, @net_amount, @payment_method,
          @payment_status, @transaction_id, @transaction_reference,
          @phone, GETDATE(), GETDATE()
        )
      `;
                const paymentRequest = transaction.request();
                paymentRequest.input('booking_id', completePaymentData.booking_id);
                paymentRequest.input('user_id', completePaymentData.user_id);
                paymentRequest.input('amount', completePaymentData.amount);
                paymentRequest.input('gross_amount', completePaymentData.gross_amount);
                paymentRequest.input('commission_fee', completePaymentData.commission_fee);
                paymentRequest.input('net_amount', completePaymentData.net_amount);
                paymentRequest.input('payment_method', completePaymentData.payment_method);
                paymentRequest.input('payment_status', completePaymentData.payment_status);
                paymentRequest.input('transaction_id', completePaymentData.transaction_id || '');
                paymentRequest.input('transaction_reference', completePaymentData.transaction_reference || '');
                paymentRequest.input('phone', completePaymentData.phone || '');
                const paymentResult = await paymentRequest.query(paymentQuery);
                // 2. Update booking status to 'Confirmed'
                const bookingQuery = `
        UPDATE Bookings 
        SET booking_status = 'Confirmed', 
            updated_at = GETDATE()
        WHERE booking_id = @booking_id
      `;
                const bookingRequest = transaction.request();
                bookingRequest.input('booking_id', completePaymentData.booking_id);
                await bookingRequest.query(bookingQuery);
                // 3. Get the updated booking data
                const getBookingQuery = `
        SELECT booking_id, booking_status, total_amount, booking_date, return_date
        FROM Bookings 
        WHERE booking_id = @booking_id
      `;
                const getBookingRequest = transaction.request();
                getBookingRequest.input('booking_id', completePaymentData.booking_id);
                const bookingDataResult = await getBookingRequest.query(getBookingQuery);
                await transaction.commit();
                console.log(`✅ Payment saved and booking ${completePaymentData.booking_id} status updated to 'Confirmed'`);
                return {
                    success: true,
                    message: "Payment initialized and booking confirmed successfully",
                    data: {
                        payment: paymentResult.recordset[0],
                        booking: bookingDataResult.recordset[0] // Include updated booking
                    },
                };
            }
            catch (error) {
                await transaction.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error("Payment Service Error:", error);
            throw error;
        }
    }
    // async initializePayment(paymentData: PaymentData) {
    //   try {
    //     // Calculate amounts
    //     const grossAmount = paymentData.amount;
    //     const commissionFee = grossAmount * 0.02; // 2% commission
    //     const netAmount = grossAmount - commissionFee;
    //     const completePaymentData = {
    //       ...paymentData,
    //       gross_amount: grossAmount,
    //       commission_fee: commissionFee,
    //       net_amount: netAmount,
    //       payment_status: paymentData.payment_status || 'Completed',
    //     };
    //     console.log('💾 Saving payment to database:', completePaymentData);
    //     const result = await this.paymentRepo.createPayment(completePaymentData);
    //     await this.updateBookingStatus(paymentData.booking_id);
    //     return {
    //       success: true,
    //       message: "Payment initialized successfully",
    //       data: result,
    //     };
    //   } catch (error: any) {
    //     console.error("Payment Service Error:", error);
    //     throw error;
    //   }
    // }
    // 🔴 ADD THIS METHOD to update booking status
    async updateBookingStatus(bookingId) {
        try {
            const query = `
        UPDATE Bookings 
        SET booking_status = 'Confirmed', 
            updated_at = GETDATE()
        WHERE booking_id = @booking_id
      `;
            const request = getDbPool().request();
            request.input('booking_id', bookingId);
            const result = await request.query(query);
            console.log(`✅ Updated booking ${bookingId} status to 'Confirmed'`);
            return result;
        }
        catch (error) {
            console.error(`❌ Failed to update booking ${bookingId} status:`, error);
            throw error;
        }
    }
    async getPaymentById(paymentId) {
        try {
            return await this.paymentRepo.getPaymentById(paymentId);
        }
        catch (error) {
            console.error("Get Payment By ID Error:", error);
            throw error;
        }
    }
    async getLatestPaymentByBooking(bookingId) {
        try {
            const payments = await this.paymentRepo.getPaymentByBooking(bookingId);
            return payments.length > 0 ? payments[0] : null;
        }
        catch (error) {
            console.error("Get Latest Payment Error:", error);
            throw error;
        }
    }
    async getReceiptData(paymentId, bookingId) {
        try {
            let payment;
            if (paymentId) {
                payment = await this.getPaymentById(paymentId);
            }
            else if (bookingId) {
                payment = await this.getLatestPaymentByBooking(bookingId);
            }
            if (!payment) {
                throw new Error("Payment not found");
            }
            // Format the data for receipt
            const receiptData = {
                payment: {
                    payment_id: payment.payment_id,
                    payment_date: payment.payment_date,
                    payment_method: payment.payment_method,
                    transaction_id: payment.transaction_id,
                    net_amount: payment.net_amount,
                    commission_fee: payment.commission_fee,
                    gross_amount: payment.gross_amount,
                    phone: payment.phone,
                },
                booking: {
                    booking_id: payment.booking_id,
                    total_amount: payment.booking_total_amount,
                    booking_date: payment.booking_date,
                    return_date: payment.return_date,
                    vehicle_manufacturer: payment.vehicle_make,
                    vehicle_model: payment.vehicle_model,
                    vehicle_year: payment.vehicle_year,
                    license_plate: payment.license_plate,
                    vin_number: payment.vin_number,
                },
                user: {
                    first_name: payment.first_name,
                    last_name: payment.last_name,
                    email: payment.email,
                    contact_phone: payment.user_phone,
                    address: payment.address,
                }
            };
            return receiptData;
        }
        catch (error) {
            console.error("Get Receipt Data Error:", error);
            throw error;
        }
    }
    async getAllPayments() {
        try {
            return await this.paymentRepo.getAllPayments();
        }
        catch (error) {
            console.error("Get All Payments Error:", error);
            throw error;
        }
    }
    async getUserReceipts(userId) {
        try {
            const query = `
        SELECT 
          p.*,
          b.booking_date,
          b.return_date,
          b.total_amount as booking_total_amount,
          b.booking_status,
          u.first_name,
          u.last_name,
          u.email,
          u.contact_phone as user_phone,
          u.address,
          v.vehicle_id,
          vs.manufacturer as vehicle_make,
          vs.model as vehicle_model,
          vs.year as vehicle_year,
          v.license_plate,
          v.vin_number
        FROM Payments p
        INNER JOIN Bookings b ON p.booking_id = b.booking_id
        INNER JOIN Users u ON p.user_id = u.user_id
        INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
        INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
        WHERE p.user_id = @user_id
        ORDER BY p.created_at DESC
      `;
            const request = getDbPool().request();
            request.input('user_id', userId);
            const result = await request.query(query);
            return result.recordset;
        }
        catch (error) {
            console.error("Get User Receipts Error:", error);
            throw error;
        }
    }
    async getAllReceipts() {
        try {
            const query = `
        SELECT 
          p.*,
          b.booking_date,
          b.return_date,
          b.total_amount as booking_total_amount,
          b.booking_status,
          u.first_name,
          u.last_name,
          u.email,
          u.contact_phone as user_phone,
          u.address,
          v.vehicle_id,
          vs.manufacturer as vehicle_make,
          vs.model as vehicle_model,
          vs.year as vehicle_year,
          v.license_plate,
          v.vin_number
        FROM Payments p
        INNER JOIN Bookings b ON p.booking_id = b.booking_id
        INNER JOIN Users u ON p.user_id = u.user_id
        INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
        INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
        ORDER BY p.created_at DESC
      `;
            const result = await getDbPool().query(query);
            return result.recordset;
        }
        catch (error) {
            console.error("Get All Receipts Error:", error);
            throw error;
        }
    }
}
// // src/payments/payment.service.ts
// import { get } from "http";
// import { PaymentRepository } from "./payment.repository";
// import { getDbPool } from "../db/dbconfig.ts";
// //import { updateBooking } from "../bookings-module/bookings.controller.ts";
// export interface PaymentData {
//   booking_id: number;
//   user_id: string;
//   amount: number;
//   payment_method: string;
//   payment_status?: string;
//   transaction_id?: string;
//   transaction_reference?: string;
//   phone?: string;
// }
// export interface ReceiptData {
//   payment: {
//     payment_id: number;
//     payment_date: string;
//     payment_method: string;
//     transaction_id: string;
//     net_amount: number;
//     commission_fee: number;
//     gross_amount: number;
//     phone?: string;
//   };
//   booking: {
//     booking_id: number;
//     total_amount: number;
//     booking_date: string;
//     return_date: string;
//     vehicle_manufacturer: string;
//     vehicle_model: string;
//     vehicle_year: number;
//     license_plate?: string;
//     vin_number?: string;
//   };
//   user: {
//     first_name: string;
//     last_name: string;
//     email: string;
//     contact_phone: string;
//     address?: string;
//   };
// }
// export class PaymentService {
//   constructor(private paymentRepo: PaymentRepository) {}
//   async initializePayment(paymentData: PaymentData) {
//     try {
//       // Calculate amounts
//       const grossAmount = paymentData.amount;
//       const commissionFee = grossAmount * 0.02; // 2% commission
//       const netAmount = grossAmount - commissionFee;
//       const completePaymentData = {
//         ...paymentData,
//         gross_amount: grossAmount,
//         commission_fee: commissionFee,
//         net_amount: netAmount,
//         payment_status: paymentData.payment_status || 'Completed',
//       };
//       console.log('💾 Saving payment to database:', completePaymentData);
//       const result = await this.paymentRepo.createPayment(completePaymentData);
//       return {
//         success: true,
//         message: "Payment initialized successfully",
//         data: result,
//       };
//     } catch (error: any) {
//       console.error("Payment Service Error:", error);
//       throw error;
//     }
//   }
//     // 🔴 ADD THIS METHOD to update booking status
//   private async updateBookingStatus(bookingId: number) {
//     try {
//       const query = `
//         UPDATE Bookings 
//         SET booking_status = 'Confirmed', 
//             updated_at = GETDATE()
//         WHERE booking_id = @booking_id
//       `;
//       const request = getDbPool().request();
//       request.input('booking_id', bookingId);
//       const result = await request.query(query);
//       console.log(`✅ Updated booking ${bookingId} status to 'Confirmed'`);
//       return result;
//     } catch (error) {
//       console.error(`❌ Failed to update booking ${bookingId} status:`, error);
//       throw error;
//     }
//   }
//   async getPaymentById(paymentId: number) {
//     try {
//       return await this.paymentRepo.getPaymentById(paymentId);
//     } catch (error) {
//       console.error("Get Payment By ID Error:", error);
//       throw error;
//     }
//   }
//   async getLatestPaymentByBooking(bookingId: number) {
//     try {
//       const payments = await this.paymentRepo.getPaymentByBooking(bookingId);
//       return payments.length > 0 ? payments[0] : null;
//     } catch (error) {
//       console.error("Get Latest Payment Error:", error);
//       throw error;
//     }
//   }
//   async getReceiptData(paymentId?: number, bookingId?: number): Promise<ReceiptData> {
//     try {
//       let payment;
//       if (paymentId) {
//         payment = await this.getPaymentById(paymentId);
//       } else if (bookingId) {
//         payment = await this.getLatestPaymentByBooking(bookingId);
//       }
//       if (!payment) {
//         throw new Error("Payment not found");
//       }
//       // Format the data for receipt
//       const receiptData: ReceiptData = {
//         payment: {
//           payment_id: payment.payment_id,
//           payment_date: payment.payment_date,
//           payment_method: payment.payment_method,
//           transaction_id: payment.transaction_id,
//           net_amount: payment.net_amount,
//           commission_fee: payment.commission_fee,
//           gross_amount: payment.gross_amount,
//           phone: payment.phone,
//         },
//         booking: {
//           booking_id: payment.booking_id,
//           total_amount: payment.booking_total_amount,
//           booking_date: payment.booking_date,
//           return_date: payment.return_date,
//           vehicle_manufacturer: payment.vehicle_make,
//           vehicle_model: payment.vehicle_model,
//           vehicle_year: payment.vehicle_year,
//           license_plate: payment.license_plate,
//           vin_number: payment.vin_number,
//         },
//         user: {
//           first_name: payment.first_name,
//           last_name: payment.last_name,
//           email: payment.email,
//           contact_phone: payment.user_phone,
//           address: payment.address,
//         }
//       };
//       return receiptData;
//     } catch (error) {
//       console.error("Get Receipt Data Error:", error);
//       throw error;
//     }
//   }
//   async getAllPayments() {
//     try {
//       return await this.paymentRepo.getAllPayments();
//     } catch (error) {
//       console.error("Get All Payments Error:", error);
//       throw error;
//     }
//   }
//   async getUserReceipts(userId: string) {
//     try {
//       const query = `
//         SELECT 
//           p.*,
//           b.booking_date,
//           b.return_date,
//           b.total_amount as booking_total_amount,
//           b.booking_status,
//           u.first_name,
//           u.last_name,
//           u.email,
//           u.contact_phone as user_phone,
//           u.address,
//           v.vehicle_id,
//           vs.manufacturer as vehicle_make,
//           vs.model as vehicle_model,
//           vs.year as vehicle_year,
//           v.license_plate,
//           v.vin_number
//         FROM Payments p
//         INNER JOIN Bookings b ON p.booking_id = b.booking_id
//         INNER JOIN Users u ON p.user_id = u.user_id
//         INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//         INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//         WHERE p.user_id = @user_id
//         ORDER BY p.created_at DESC
//       `;
//       const request = getDbPool().request();
//       request.input('user_id', userId);
//       const result = await request.query(query);
//       return result.recordset;
//     } catch (error) {
//       console.error("Get User Receipts Error:", error);
//       throw error;
//     }
//   }
//   async getAllReceipts() {
//     try {
//       const query = `
//         SELECT 
//           p.*,
//           b.booking_date,
//           b.return_date,
//           b.total_amount as booking_total_amount,
//           b.booking_status,
//           u.first_name,
//           u.last_name,
//           u.email,
//           u.contact_phone as user_phone,
//           u.address,
//           v.vehicle_id,
//           vs.manufacturer as vehicle_make,
//           vs.model as vehicle_model,
//           vs.year as vehicle_year,
//           v.license_plate,
//           v.vin_number
//         FROM Payments p
//         INNER JOIN Bookings b ON p.booking_id = b.booking_id
//         INNER JOIN Users u ON p.user_id = u.user_id
//         INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//         INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
//         ORDER BY p.created_at DESC
//       `;
//       const result = await getDbPool().query(query);
//       return result.recordset;
//     } catch (error) {
//       console.error("Get All Receipts Error:", error);
//       throw error;
//     }
//   }
// }
