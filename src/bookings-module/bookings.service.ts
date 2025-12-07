import { getDbPool } from "../db/dbconfig";
import sql from 'mssql';
import { getRequest } from "../db/dbconfig";


export interface Booking {
  booking_id?: number;
  user_id: string;
  vehicle_id: number;
  booking_date: Date;
  return_date: Date;
  actual_return_date?: Date | null;
  start_mileage?: number | null;
  end_mileage?: number | null;
  total_amount: number;
  booking_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Late';
  created_at?: Date;
  updated_at?: Date | null;
}

export interface BookingWithDetails extends Booking {
  // Joined fields from Users and Vehicles
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  user_contact_phone?: string;
  vehicle_vin_number?: string;
  vehicle_license_plate?: string;
  vehicle_rental_rate?: number;
  vehicle_manufacturer?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
}

export interface BookingUpdateData {
  vehicle_id?: number;
  booking_date?: Date;
  return_date?: Date;
  actual_return_date?: Date;
  start_mileage?: number;
  end_mileage?: number;
  total_amount?: number;
  booking_status?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Late';
}

export interface BookingFilters {
  status?: string;
  user_id?: string;
  vehicle_id?: number;
  page?: number;
  limit?: number;
}

// Check vehicle availability for dates
export const checkVehicleAvailability = async (vehicle_id: number, booking_date: Date, return_date: Date): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      SELECT COUNT(*) as overlapping_bookings
      FROM Bookings 
      WHERE vehicle_id = @vehicle_id 
        AND booking_status IN ('Pending', 'Confirmed')
        AND (
          (booking_date BETWEEN @booking_date AND @return_date) OR
          (return_date BETWEEN @booking_date AND @return_date) OR
          (booking_date <= @booking_date AND return_date >= @return_date)
        )
    `;

    const result = await pool.request()
      .input('vehicle_id', sql.Int, vehicle_id)
      .input('booking_date', sql.DateTime, booking_date)
      .input('return_date', sql.DateTime, return_date)
      .query(query);

    return result.recordset[0].overlapping_bookings === 0;

  } catch (error: any) {
    console.error("Error checking vehicle availability:", error);
    throw new Error("Failed to check vehicle availability");
  }
};

// Calculate total amount based on rental rate and days
export const calculateTotalAmount = async (vehicle_id: number, booking_date: Date, return_date: Date): Promise<number> => {
  try {
    const pool = await getDbPool();
    
    // Get vehicle rental rate
    const vehicleQuery = `SELECT rental_rate FROM Vehicles WHERE vehicle_id = @vehicle_id`;
    const vehicleResult = await pool.request()
      .input('vehicle_id', sql.Int, vehicle_id)
      .query(vehicleQuery);

    if (vehicleResult.recordset.length === 0) {
      throw new Error("Vehicle not found");
    }

    const rental_rate = vehicleResult.recordset[0].rental_rate;
    
    // Calculate number of days
    const timeDiff = return_date.getTime() - booking_date.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Ensure at least 1 day
    const totalDays = days < 1 ? 1 : days;
    
    return rental_rate * totalDays;

  } catch (error: any) {
    console.error("Error calculating total amount:", error);
    throw new Error("Failed to calculate total amount");
  }
};

// Create new booking
// export const createBookingService = async (data: Omit<Booking, 'booking_id'>): Promise<Booking> => {
//   try {
//     const pool = await getDbPool();
    
//     // Check vehicle availability
//     const isAvailable = await checkVehicleAvailability(data.vehicle_id, data.booking_date, data.return_date);
//     if (!isAvailable) {
//       throw new Error("Vehicle is not available for the selected dates");
//     }

//     // Calculate total amount
//     const total_amount = await calculateTotalAmount(data.vehicle_id, data.booking_date, data.return_date);

//     const query = `
//       INSERT INTO Bookings (
//         user_id, vehicle_id, booking_date, return_date, total_amount, booking_status
//       )
//       OUTPUT INSERTED.*
//       VALUES (
//         @user_id, @vehicle_id, @booking_date, @return_date, @total_amount, @booking_status
//       )
//     `;

//     const result = await pool.request()
//       .input('user_id', sql.UniqueIdentifier, data.user_id)
//       .input('vehicle_id', sql.Int, data.vehicle_id)
//       .input('booking_date', sql.DateTime, data.booking_date)
//       .input('return_date', sql.DateTime, data.return_date)
//       .input('total_amount', sql.Decimal(10, 2), total_amount)
//       .input('booking_status', sql.NVarChar, data.booking_status || 'Pending')
//       .query(query);

//     // Update vehicle status to "Rented" if booking is confirmed
//     if (data.booking_status === 'Confirmed') {
//       await updateVehicleStatus(data.vehicle_id, 'Rented');
//     }

//     return result.recordset[0] as Booking;

//   } catch (error: any) {
//     console.error("Error creating booking:", error);
    
//     if (error.number === 547) { // Foreign key constraint
//       if (error.message.includes('user_id')) {
//         throw new Error("Invalid user ID");
//       } else if (error.message.includes('vehicle_id')) {
//         throw new Error("Invalid vehicle ID");
//       }
//     }
    
//     throw new Error(error.message || "Failed to create booking");
//   }
// };



//createBookingService
// src/bookings/booking.service.ts

// export class createBookingService {
//   async getBookingById(bookingId: number): Promise<Booking | null> {
//     try {
//       const request = getRequest();
//       const query = `
//         SELECT * FROM Bookings WHERE booking_id = @bookingId
//       `;
      
//       request.input("bookingId", bookingId);
//       const result = await request.query(query);
      
//       return result.recordset[0] || null;
//     } catch (error) {
//       console.error("Error getting booking by ID:", error);
//       throw error;
//     }
//   }

//   async updateBookingStatus(bookingId: number, status: string): Promise<Booking | null> {
//     try {
//       const request = getRequest();
//       const query = `
//         UPDATE Bookings 
//         SET booking_status = @status, updated_at = GETDATE()
//         WHERE booking_id = @bookingId;
        
//         SELECT * FROM Bookings WHERE booking_id = @bookingId;
//       `;
      
//       request.input("bookingId", bookingId);
//       request.input("status", status);
//       const result = await request.query(query);
      
//       // Update vehicle status if booking is confirmed
//       if (status === 'Confirmed') {
//         await this.updateVehicleStatusByBooking(bookingId, 'Rented');
//       } else if (status === 'Cancelled') {
//         await this.updateVehicleStatusByBooking(bookingId, 'Available');
//       }
      
//       return result.recordset[0] || null;
//     } catch (error) {
//       console.error("Error updating booking status:", error);
//       throw error;
//     }
//   }

//   private async updateVehicleStatusByBooking(bookingId: number, status: string): Promise<void> {
//     try {
//       const request = getRequest();
//       const query = `
//         UPDATE Vehicles 
//         SET vehicle_status = @status
//         WHERE vehicle_id = (
//           SELECT vehicle_id FROM Bookings WHERE booking_id = @bookingId
//         )
//       `;
      
//       request.input("bookingId", bookingId);
//       request.input("status", status);
//       await request.query(query);
//     } catch (error) {
//       console.error("Error updating vehicle status:", error);
//       // Don't throw - this is a secondary operation
//     }
//   }

//   async checkVehicleAvailability(vehicleId: number, startDate: Date, endDate: Date): Promise<boolean> {
//     try {
//       const request = getRequest();
//       const query = `
//         SELECT COUNT(*) as overlap_count
//         FROM Bookings 
//         WHERE vehicle_id = @vehicleId
//           AND booking_status IN ('Pending', 'Confirmed', 'Paid', 'Active')
//           AND (
//             (@startDate BETWEEN booking_date AND return_date)
//             OR (@endDate BETWEEN booking_date AND return_date)
//             OR (booking_date BETWEEN @startDate AND @endDate)
//           )
//       `;
      
//       request.input("vehicleId", vehicleId);
//       request.input("startDate", startDate);
//       request.input("endDate", endDate);
      
//       const result = await request.query(query);
//       return result.recordset[0].overlap_count === 0;
//     } catch (error) {
//       console.error("Error checking vehicle availability:", error);
//       throw error;
//     }
//   }
// }

export class createBookingService {
  // ✅ Create a new booking
  async createBooking(data: {
    user_id: string;
    vehicle_id: number;
    booking_date: Date;
    return_date: Date;
    total_amount: number;
    booking_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Late';
  }): Promise<Booking> {
    try {
      const request = getRequest();
      const query = `
        INSERT INTO Bookings (user_id, vehicle_id, booking_date, return_date, total_amount, booking_status)
        OUTPUT INSERTED.*
        VALUES (@user_id, @vehicle_id, @booking_date, @return_date, @total_amount, @booking_status)
      `;

      request.input("user_id", data.user_id);
      request.input("vehicle_id", data.vehicle_id);
      request.input("booking_date", data.booking_date);
      request.input("return_date", data.return_date);
      request.input("total_amount", data.total_amount);
      request.input("booking_status", data.booking_status);

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  // ✅ Get booking by ID
  async getBookingById(bookingId: number): Promise<Booking | null> {
    try {
      const request = getRequest();
      const query = `
        SELECT * FROM Bookings WHERE booking_id = @bookingId
      `;
      request.input("bookingId", bookingId);
      const result = await request.query(query);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Error getting booking by ID:", error);
      throw error;
    }
  }

  // ✅ Update booking status
  async updateBookingStatus(bookingId: number, status: string): Promise<Booking | null> {
    try {
      const request = getRequest();
      const query = `
        UPDATE Bookings 
        SET booking_status = @status, updated_at = GETDATE()
        WHERE booking_id = @bookingId;

        SELECT * FROM Bookings WHERE booking_id = @bookingId;
      `;
      request.input("bookingId", bookingId);
      request.input("status", status);
      const result = await request.query(query);

      // Update vehicle status automatically
      if (status === 'Confirmed') {
        await this.updateVehicleStatusByBooking(bookingId, 'Rented');
      } else if (status === 'Cancelled') {
        await this.updateVehicleStatusByBooking(bookingId, 'Available');
      }

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  }

  // ✅ Check if vehicle is available
  async checkVehicleAvailability(vehicleId: number, startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const request = getRequest();
      const query = `
        SELECT COUNT(*) AS overlap_count
        FROM Bookings 
        WHERE vehicle_id = @vehicleId
          AND booking_status IN ('Pending', 'Confirmed', 'Paid', 'Active')
          AND (
            (@startDate BETWEEN booking_date AND return_date)
            OR (@endDate BETWEEN booking_date AND return_date)
            OR (booking_date BETWEEN @startDate AND @endDate)
          )
      `;
      request.input("vehicleId", vehicleId);
      request.input("startDate", startDate);
      request.input("endDate", endDate);

      const result = await request.query(query);
      return result.recordset[0].overlap_count === 0;
    } catch (error) {
      console.error("Error checking vehicle availability:", error);
      throw error;
    }
  }

  // ✅ Update vehicle status by booking
  private async updateVehicleStatusByBooking(bookingId: number, status: 'Available' | 'Rented' | 'Maintenance' | 'Unavailable' | 'Banned') {
    try {
      const request = getRequest();
      const query = `
        UPDATE Vehicles
        SET status = @status
        WHERE vehicle_id = (
          SELECT vehicle_id FROM Bookings WHERE booking_id = @bookingId
        )
      `;
      request.input("bookingId", bookingId);
      request.input("status", status);
      await request.query(query);
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      // Don't throw - secondary operation
    }
  }
}


















// Get all bookings with optional filtering
export const getAllBookingsService = async (filters?: BookingFilters): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    
    let query = `
      SELECT 
        b.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number,
        v.license_plate as vehicle_license_plate,
        v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer,
        vs.model as vehicle_model,
        vs.year as vehicle_year,
        vs.color as vehicle_color,
        vs.images as vehicle_images,
        vs.vehicle_type
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE 1=1
    `;
    
    const request = pool.request();

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters?.user_id) {
      query += ` AND b.user_id = @user_id`;
      request.input('user_id', sql.UniqueIdentifier, filters.user_id);
    }

    if (filters?.vehicle_id) {
      query += ` AND b.vehicle_id = @vehicle_id`;
      request.input('vehicle_id', sql.Int, filters.vehicle_id);
    }

    // Add pagination
    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC 
               OFFSET @offset ROWS 
               FETCH NEXT @limit ROWS ONLY`;
    
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];

  } catch (error: any) {
    console.error("Error retrieving bookings:", error);
    throw new Error("Failed to retrieve bookings");
  }
};

// Get booking by ID with details
export const getBookingByIdService = async (id: number): Promise<BookingWithDetails | null> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      SELECT 
        b.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number,
        v.license_plate as vehicle_license_plate,
        v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer,
        vs.model as vehicle_model,
        vs.year as vehicle_year,
        vs.color as vehicle_color
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE b.booking_id = @id
    `;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as BookingWithDetails;

  } catch (error: any) {
    console.error("Error retrieving booking:", error);
    throw new Error("Failed to retrieve booking");
  }
};

// Get user's bookings
export const getUserBookingsService = async (user_id: string, filters?: { status?: string; page?: number; limit?: number }): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    
    let query = `
      SELECT 
        b.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number,
        v.license_plate as vehicle_license_plate,
        v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer,
        vs.model as vehicle_model,
        vs.year as vehicle_year,
        vs.color as vehicle_color
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE b.user_id = @user_id
    `;
    
    const request = pool.request()
      .input('user_id', sql.UniqueIdentifier, user_id);

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input('status', sql.NVarChar, filters.status);
    }

    // Add pagination
    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC 
               OFFSET @offset ROWS 
               FETCH NEXT @limit ROWS ONLY`;
    
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];

  } catch (error: any) {
    console.error("Error retrieving user bookings:", error);
    throw new Error("Failed to retrieve user bookings");
  }
};

// Get vehicle bookings
export const getVehicleBookingsService = async (vehicle_id: number, filters?: { status?: string; page?: number; limit?: number }): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    
    let query = `
      SELECT 
        b.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number,
        v.license_plate as vehicle_license_plate,
        v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer,
        vs.model as vehicle_model,
        vs.year as vehicle_year,
        vs.color as vehicle_color
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE b.vehicle_id = @vehicle_id
    `;
    
    const request = pool.request()
      .input('vehicle_id', sql.Int, vehicle_id);

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input('status', sql.NVarChar, filters.status);
    }

    // Add pagination
    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC 
               OFFSET @offset ROWS 
               FETCH NEXT @limit ROWS ONLY`;
    
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];

  } catch (error: any) {
    console.error("Error retrieving vehicle bookings:", error);
    throw new Error("Failed to retrieve vehicle bookings");
  }
};

// Update booking
export const updateBookingService = async (id: number, data: BookingUpdateData): Promise<Booking | null> => {
  try {
    const pool = await getDbPool();
    
    const fields: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (value instanceof Date) {
          request.input(key, sql.DateTime, value);
        } else if (typeof value === 'string') {
          request.input(key, sql.NVarChar, value);
        } else if (typeof value === 'number') {
          if (key === 'total_amount') {
            request.input(key, sql.Decimal(10, 2), value);
          } else {
            request.input(key, sql.Int, value);
          }
        }
      }
    });

    if (fields.length === 0) {
      throw new Error("No update data provided");
    }

    fields.push('updated_at = GETDATE()');

    const query = `
      UPDATE Bookings 
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE booking_id = @id
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    // Update vehicle status if booking status changed
    if (data.booking_status) {
      const booking = result.recordset[0] as Booking;
      if (data.booking_status === 'Confirmed') {
        await updateVehicleStatus(booking.vehicle_id, 'Rented');
      } else if (data.booking_status === 'Completed' || data.booking_status === 'Cancelled') {
        await updateVehicleStatus(booking.vehicle_id, 'Available');
      }
    }

    return result.recordset[0] as Booking;

  } catch (error: any) {
    console.error("Error updating booking:", error);
    
    if (error.number === 547) { // Foreign key constraint
      if (error.message.includes('vehicle_id')) {
        throw new Error("Invalid vehicle ID");
      }
    }
    
    throw new Error("Failed to update booking");
  }
};

// Cancel booking
export const cancelBookingService = async (id: number, user_id?: string): Promise<Booking | null> => {
  try {
    const pool = await getDbPool();
    
    let query = `UPDATE Bookings SET booking_status = 'Cancelled', updated_at = GETDATE() OUTPUT INSERTED.* WHERE booking_id = @id`;
    const request = pool.request().input('id', sql.Int, id);

    // If user_id is provided, ensure the booking belongs to the user
    if (user_id) {
      query += ` AND user_id = @user_id`;
      request.input('user_id', sql.UniqueIdentifier, user_id);
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    // Update vehicle status back to Available
    const booking = result.recordset[0] as Booking;
    await updateVehicleStatus(booking.vehicle_id, 'Available');

    return booking;

  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    throw new Error("Failed to cancel booking");
  }
};

// Complete booking (when vehicle is returned)
export const completeBookingService = async (id: number, data: { actual_return_date: Date; end_mileage?: number }): Promise<Booking | null> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      UPDATE Bookings 
      SET booking_status = 'Completed', 
          actual_return_date = @actual_return_date,
          end_mileage = @end_mileage,
          updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE booking_id = @id AND booking_status = 'Confirmed'
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('actual_return_date', sql.DateTime, data.actual_return_date)
      .input('end_mileage', sql.Int, data.end_mileage || null)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    // Update vehicle status back to Available and update mileage
    const booking = result.recordset[0] as Booking;
    await updateVehicleStatusAndMileage(booking.vehicle_id, 'Available', data.end_mileage);

    return booking;

  } catch (error: any) {
    console.error("Error completing booking:", error);
    throw new Error("Failed to complete booking");
  }
};

// Helper function to update vehicle status
const updateVehicleStatus = async (vehicle_id: number, status: string): Promise<void> => {
  try {
    const pool = await getDbPool();
    
    const query = `UPDATE Vehicles SET status = @status, updated_at = GETDATE() WHERE vehicle_id = @vehicle_id`;
    
    await pool.request()
      .input('vehicle_id', sql.Int, vehicle_id)
      .input('status', sql.NVarChar, status)
      .query(query);

  } catch (error: any) {
    console.error("Error updating vehicle status:", error);
    throw new Error("Failed to update vehicle status");
  }
};

// Helper function to update vehicle status and mileage
const updateVehicleStatusAndMileage = async (vehicle_id: number, status: string, mileage?: number): Promise<void> => {
  try {
    const pool = await getDbPool();
    
    let query = `UPDATE Vehicles SET status = @status, updated_at = GETDATE()`;
    const request = pool.request()
      .input('vehicle_id', sql.Int, vehicle_id)
      .input('status', sql.NVarChar, status);

    if (mileage) {
      query += `, current_mileage = @mileage`;
      request.input('mileage', sql.Int, mileage);
    }

    query += ` WHERE vehicle_id = @vehicle_id`;
    
    await request.query(query);

  } catch (error: any) {
    console.error("Error updating vehicle status and mileage:", error);
    throw new Error("Failed to update vehicle status and mileage");
  }
};