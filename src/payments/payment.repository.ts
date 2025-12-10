// src/payments/payment.repository.ts
import { get } from "http";
import { getDbPool } from "../db/dbconfig.js";

export class PaymentRepository {
  // In payment.repository.ts
async createPayment(paymentData: any) {
  try {
    const pool = getDbPool();
    const request = pool.request();
    
    const query = `
      INSERT INTO Payments (
        booking_id, 
        user_id,
        amount, 
        gross_amount,
        commission_fee,
        net_amount,
        payment_status, 
        payment_method, 
        transaction_id,
        transaction_reference,
        phone,
        payment_date
      ) VALUES (
        @booking_id,
        @user_id,
        @amount,
        @gross_amount,
        @commission_fee,
        @net_amount,
        @payment_status,
        @payment_method,
        @transaction_id,
        @transaction_reference,
        @phone,
        GETDATE()
      );
      
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
      WHERE p.payment_id = SCOPE_IDENTITY();
    `;
    
    // Add all parameters
    request.input('booking_id', paymentData.booking_id);
    request.input('user_id', paymentData.user_id);
    request.input('amount', paymentData.amount);
    request.input('gross_amount', paymentData.gross_amount || paymentData.amount);
    request.input('commission_fee', paymentData.commission_fee || (paymentData.amount * 0.02));
    request.input('net_amount', paymentData.net_amount || (paymentData.amount * 0.98));
    request.input('payment_status', paymentData.payment_status || 'Completed');
    request.input('payment_method', paymentData.payment_method);
    request.input('transaction_id', paymentData.transaction_id || null);
    request.input('transaction_reference', paymentData.transaction_reference || null);
    request.input('phone', paymentData.phone || null);
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      throw new Error('Payment creation failed');
    }
    
    return result.recordset[0];
  } catch (error) {
    console.error('Payment Repository Error:', error);
    throw error;
  }
}
  // async createPayment(paymentData: any) {
  //   const query = `
  //     INSERT INTO Payments (
  //       booking_id, 
  //       user_id,
  //       amount, 
  //       gross_amount,
  //       commission_fee,
  //       net_amount,
  //       payment_status, 
  //       payment_method, 
  //       transaction_id,
  //       transaction_reference,
  //       phone
  //     ) VALUES (
  //       @booking_id, 
  //       @user_id,
  //       @amount, 
  //       @gross_amount,
  //       @commission_fee,
  //       @net_amount,
  //       @payment_status, 
  //       @payment_method, 
  //       @transaction_id,
  //       @transaction_reference,
  //       @phone
  //     );
  //     SELECT SCOPE_IDENTITY() AS payment_id;
  //   `;

  //   try {
  //     const request = getDbPool().request();
      
  //     // Required fields
  //     request.input('booking_id', paymentData.booking_id);
  //     request.input('user_id', paymentData.user_id);
  //     request.input('amount', paymentData.amount);
  //     request.input('payment_method', paymentData.payment_method);
  //     request.input('payment_status', paymentData.payment_status || 'Completed');
      
  //     // Optional fields with defaults
  //     request.input('transaction_id', paymentData.transaction_id || '');
  //     request.input('transaction_reference', paymentData.transaction_reference || '');
  //     request.input('phone', paymentData.phone || '');
      
  //     // Commission calculation
  //     const grossAmount = paymentData.gross_amount || paymentData.amount;
  //     const commissionFee = paymentData.commission_fee || (grossAmount * 0.02);
  //     const netAmount = paymentData.net_amount || (grossAmount - commissionFee);
      
  //     request.input('gross_amount', grossAmount);
  //     request.input('commission_fee', commissionFee);
  //     request.input('net_amount', netAmount);

  //     console.log('📝 Creating payment in database...');
  //     const result = await request.query(query);
      
  //     const paymentId = result.recordset[0]?.payment_id;
  //     console.log('✅ Payment created successfully. Payment ID:', paymentId);
      
  //     // Return the created payment
  //     return await this.getPaymentById(paymentId);
      
  //   } catch (error: any) {
  //     console.error("❌ Payment Repository Error:", error.message);
      
  //     if (error.message.includes('foreign key constraint')) {
  //       throw new Error(`Invalid booking_id or user_id. Please check if booking and user exist.`);
  //     }
      
  //     throw error;
  //   }
  // }

  async getPaymentById(paymentId: number) {
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
      WHERE p.payment_id = @payment_id
    `;
    
    try {
      const request = getDbPool().request();
      request.input('payment_id', paymentId);
      
      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error("Get Payment By ID Error:", error);
      throw error;
    }
  }

  async getPaymentByBooking(bookingId: number) {
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
      WHERE p.booking_id = @booking_id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const request = getDbPool().request();
      request.input('booking_id', bookingId);
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get Payment By Booking Error:", error);
      throw error;
    }
  }

  async getAllPayments() {
    const query = `
      SELECT 
        p.*,
        b.booking_date,
        b.return_date,
        b.booking_status,
        u.first_name,
        u.last_name,
        u.email,
        vs.manufacturer as vehicle_make,
        vs.model as vehicle_model
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      INNER JOIN Users u ON p.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const result = await getDbPool().request().query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get All Payments Error:", error);
      throw error;
    }
  }
}