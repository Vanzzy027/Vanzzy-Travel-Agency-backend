import { getDbPool } from "../db/dbconfig.js";
import sql from "mssql";
import { getRequest } from "../db/dbconfig.js";

// --- INTERFACES (Kept exactly as is) ---
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
  booking_status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Late";
  created_at?: Date;
  updated_at?: Date | null;
}

export interface BookingWithDetails extends Booking {
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
  booking_status?: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Late";
}

export interface BookingFilters {
  status?: string;
  user_id?: string;
  vehicle_id?: number;
  page?: number;
  limit?: number;
}

// --- HELPER FUNCTIONS ---

export const checkVehicleAvailability = async (
  vehicle_id: number,
  booking_date: Date,
  return_date: Date,
): Promise<boolean> => {
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
    const result = await pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("booking_date", sql.DateTime, booking_date)
      .input("return_date", sql.DateTime, return_date)
      .query(query);

    return result.recordset[0].overlapping_bookings === 0;
  } catch (error: any) {
    console.error("Error checking vehicle availability:", error);
    throw new Error("Failed to check vehicle availability");
  }
};

export const calculateTotalAmount = async (
  vehicle_id: number,
  booking_date: Date,
  return_date: Date,
): Promise<number> => {
  try {
    const pool = await getDbPool();
    const vehicleQuery = `SELECT rental_rate FROM Vehicles WHERE vehicle_id = @vehicle_id`;
    const vehicleResult = await pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .query(vehicleQuery);

    if (vehicleResult.recordset.length === 0)
      throw new Error("Vehicle not found");

    const rental_rate = vehicleResult.recordset[0].rental_rate;
    const timeDiff = return_date.getTime() - booking_date.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const totalDays = days < 1 ? 1 : days;

    return rental_rate * totalDays;
  } catch (error: any) {
    console.error("Error calculating total amount:", error);
    throw new Error("Failed to calculate total amount");
  }
};

// --- CLASS SERVICE (Kept as you had it) ---
export class createBookingService {
  async createBooking(data: {
    user_id: string;
    vehicle_id: number;
    booking_date: Date;
    return_date: Date;
    total_amount: number;
    booking_status:
      | "Pending"
      | "Confirmed"
      | "Completed"
      | "Cancelled"
      | "Late";
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

  async getBookingById(bookingId: number): Promise<Booking | null> {
    try {
      const request = getRequest();
      const query = `SELECT * FROM Bookings WHERE booking_id = @bookingId`;
      request.input("bookingId", bookingId);
      const result = await request.query(query);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Error getting booking by ID:", error);
      throw error;
    }
  }

  // NOTE: This method is inside the class, but your controller was using the standalone generic one incorrectly.
  // The standalone fix is provided below as 'updateBookingStatusService'.
  async updateBookingStatus(
    bookingId: number,
    newStatus: string,
  ): Promise<any> {
    // (Logic is preserved in the standalone function below to fix the error)
    return updateBookingStatusService(bookingId, newStatus);
  }

  async checkVehicleAvailability(
    vehicleId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    return checkVehicleAvailability(vehicleId, startDate, endDate);
  }
}

// --- STANDALONE SERVICES (Used by Controllers) ---

export const getAllBookingsService = async (
  filters?: BookingFilters,
): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    let query = `
      SELECT b.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number, v.license_plate as vehicle_license_plate, v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer, vs.model as vehicle_model, vs.year as vehicle_year, vs.color as vehicle_color, vs.images as vehicle_images, vs.vehicle_type
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE 1=1
    `;
    const request = pool.request();

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input("status", sql.NVarChar, filters.status);
    }
    if (filters?.user_id) {
      query += ` AND b.user_id = @user_id`;
      request.input("user_id", sql.UniqueIdentifier, filters.user_id);
    }
    if (filters?.vehicle_id) {
      query += ` AND b.vehicle_id = @vehicle_id`;
      request.input("vehicle_id", sql.Int, filters.vehicle_id);
    }

    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];
  } catch (error: any) {
    console.error("Error retrieving bookings:", error);
    throw new Error("Failed to retrieve bookings");
  }
};

export const getBookingByIdService = async (
  id: number,
): Promise<BookingWithDetails | null> => {
  try {
    const pool = await getDbPool();
    const query = `
      SELECT b.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number, v.license_plate as vehicle_license_plate, v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer, vs.model as vehicle_model, vs.year as vehicle_year, vs.color as vehicle_color
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE b.booking_id = @id
    `;
    const result = await pool.request().input("id", sql.Int, id).query(query);
    return result.recordset.length
      ? (result.recordset[0] as BookingWithDetails)
      : null;
  } catch (error: any) {
    console.error("Error retrieving booking:", error);
    throw new Error("Failed to retrieve booking");
  }
};

export const getUserBookingsService = async (
  user_id: string,
  filters?: { status?: string; page?: number; limit?: number },
): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    let query = `
  SELECT b.*, 
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
    vs.images as vehicle_images,  -- add this line
    vs.vehicle_type
  FROM Bookings b
  INNER JOIN Users u ON b.user_id = u.user_id
  INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
  INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
  WHERE b.user_id = @user_id
`;
    const request = pool
      .request()
      .input("user_id", sql.UniqueIdentifier, user_id);

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input("status", sql.NVarChar, filters.status);
    }

    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];
  } catch (error: any) {
    console.error("Error retrieving user bookings:", error);
    throw new Error("Failed to retrieve user bookings");
  }
};

export const getVehicleBookingsService = async (
  vehicle_id: number,
  filters?: { status?: string; page?: number; limit?: number },
): Promise<BookingWithDetails[]> => {
  try {
    const pool = await getDbPool();
    let query = `
      SELECT b.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, u.contact_phone as user_contact_phone,
        v.vin_number as vehicle_vin_number, v.license_plate as vehicle_license_plate, v.rental_rate as vehicle_rental_rate,
        vs.manufacturer as vehicle_manufacturer, vs.model as vehicle_model, vs.year as vehicle_year, vs.color as vehicle_color
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE b.vehicle_id = @vehicle_id
    `;
    const request = pool.request().input("vehicle_id", sql.Int, vehicle_id);

    if (filters?.status) {
      query += ` AND b.booking_status = @status`;
      request.input("status", sql.NVarChar, filters.status);
    }

    const offset = ((filters?.page || 1) - 1) * (filters?.limit || 10);
    query += ` ORDER BY b.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, filters?.limit || 10);

    const result = await request.query(query);
    return result.recordset as BookingWithDetails[];
  } catch (error: any) {
    console.error("Error retrieving vehicle bookings:", error);
    throw new Error("Failed to retrieve vehicle bookings");
  }
};

// 🔴 GENERIC UPDATE (Generic fields - NOT for status state machine)
export const updateBookingService = async (
  id: number,
  data: BookingUpdateData,
): Promise<Booking | null> => {
  try {
    // FIX: Guard against string data coming in (which caused your syntax error)
    if (typeof data !== "object") {
      throw new Error("Update data must be an object");
    }

    const pool = await getDbPool();
    const fields: string[] = [];
    const request = pool.request().input("id", sql.Int, id);

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = @${key}`);
        if (value instanceof Date) request.input(key, sql.DateTime, value);
        else if (typeof value === "string")
          request.input(key, sql.NVarChar, value);
        else if (typeof value === "number") {
          if (key === "total_amount")
            request.input(key, sql.Decimal(10, 2), value);
          else request.input(key, sql.Int, value);
        }
      }
    });

    if (fields.length === 0) throw new Error("No update data provided");

    fields.push("updated_at = GETDATE()");
    const query = `UPDATE Bookings SET ${fields.join(", ")} OUTPUT INSERTED.* WHERE booking_id = @id`;

    const result = await request.query(query);
    return result.recordset.length ? (result.recordset[0] as Booking) : null;
  } catch (error: any) {
    console.error("Error updating booking:", error);
    throw new Error(error.message || "Failed to update booking");
  }
};

// ✅ STRICT STATUS UPDATE (Use THIS for Status Changes)
// This implements your state machine logic and fixes the SQL error
export const updateBookingStatusService = async (
  bookingId: number,
  newStatus: string,
): Promise<any> => {
  const pool = await getDbPool();

  // 1. Fetch current status
  const currentBooking = await pool
    .request()
    .input("id", sql.Int, bookingId)
    .query(
      "SELECT booking_status, vehicle_id FROM Bookings WHERE booking_id = @id",
    );

  if (!currentBooking.recordset.length) throw new Error("Booking not found");

  const currentStatus = currentBooking.recordset[0].booking_status;
  const vehicleId = currentBooking.recordset[0].vehicle_id;

  // 2. Validate State Transitions
  if (newStatus === "Confirmed" && currentStatus !== "Pending") {
    throw new Error("Only Pending bookings can be Confirmed.");
  }
  if (newStatus === "Active" && currentStatus !== "Confirmed") {
    throw new Error("Booking must be Confirmed before it becomes Active.");
  }
  if (newStatus === "Completed" && currentStatus !== "Active") {
    throw new Error("Booking must be Active before it can be Completed.");
  }
  if (
    newStatus === "Cancelled" &&
    (currentStatus === "Completed" || currentStatus === "Active")
  ) {
    throw new Error("Cannot cancel an Active or Completed booking.");
  }

  // 3. Update Status
  await pool
    .request()
    .input("id", sql.Int, bookingId)
    .input("status", sql.NVarChar, newStatus)
    .query(
      "UPDATE Bookings SET booking_status = @status, updated_at = GETDATE() WHERE booking_id = @id",
    );

  // 4. Update Vehicle Availability
  if (newStatus === "Active") {
    await updateVehicleStatus(vehicleId, "Rented");
  } else if (newStatus === "Cancelled") {
    await updateVehicleStatus(vehicleId, "Available");
  } else if (newStatus === "Confirmed") {
    // Optional: reserve it, but usually Rented happens at Active
  }

  return { message: `Booking status updated to ${newStatus}` };
};

export const cancelBookingService = async (
  id: number,
  user_id?: string,
): Promise<Booking | null> => {
  try {
    const pool = await getDbPool();
    let query = `UPDATE Bookings SET booking_status = 'Cancelled', updated_at = GETDATE() OUTPUT INSERTED.* WHERE booking_id = @id`;
    const request = pool.request().input("id", sql.Int, id);

    if (user_id) {
      query += ` AND user_id = @user_id`;
      request.input("user_id", sql.UniqueIdentifier, user_id);
    }

    const result = await request.query(query);
    if (result.recordset.length === 0) return null;

    const booking = result.recordset[0] as Booking;
    await updateVehicleStatus(booking.vehicle_id, "Available");

    return booking;
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    throw new Error("Failed to cancel booking");
  }
};

// ✅ COMPLETE BOOKING (Calculates Late Fees)
export const completeBookingService = async (
  id: number,
  data: { actual_return_date: Date; end_mileage?: number },
): Promise<Booking | any> => {
  try {
    const pool = await getDbPool();

    // Get details for fee calculation
    const bookingQuery = `
      SELECT b.*, v.rental_rate 
      FROM Bookings b
      JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE b.booking_id = @id
    `;
    const bResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(bookingQuery);
    if (!bResult.recordset.length) throw new Error("Booking not found");
    const booking = bResult.recordset[0];

    // Calculate Late Fee (5% of rate * overdue days)
    let lateFee = 0;
    const expectedReturn = new Date(booking.return_date);
    const actualReturn = new Date(data.actual_return_date);

    const diffTime = actualReturn.getTime() - expectedReturn.getTime();
    const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (overdueDays > 0) {
      lateFee = booking.rental_rate * 0.05 * overdueDays;
    }

    const newTotal = Number(booking.total_amount) + lateFee;

    // Update DB
    const query = `
      UPDATE Bookings 
      SET booking_status = 'Completed', 
          actual_return_date = @actual_return_date,
          end_mileage = @end_mileage,
          late_return_fee = @lateFee,
          total_amount = @newTotal,
          updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE booking_id = @id
    `;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("actual_return_date", sql.DateTime, data.actual_return_date)
      .input("end_mileage", sql.Int, data.end_mileage || null)
      .input("lateFee", sql.Decimal(10, 2), lateFee)
      .input("newTotal", sql.Decimal(10, 2), newTotal)
      .query(query);

    if (result.recordset.length === 0) return null;

    const completedBooking = result.recordset[0] as Booking;
    await updateVehicleStatusAndMileage(
      completedBooking.vehicle_id,
      "Available",
      data.end_mileage,
    );

    return { ...completedBooking, late_fee_applied: lateFee };
  } catch (error: any) {
    console.error("Error completing booking:", error);
    throw new Error("Failed to complete booking");
  }
};

// --- PRIVATE HELPERS ---
const updateVehicleStatus = async (
  vehicle_id: number,
  status: string,
): Promise<void> => {
  try {
    const pool = await getDbPool();
    await pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("status", sql.NVarChar, status)
      .query(
        `UPDATE Vehicles SET status = @status, updated_at = GETDATE() WHERE vehicle_id = @vehicle_id`,
      );
  } catch (error) {
    console.error("Vehicle status update failed", error);
  }
};

const updateVehicleStatusAndMileage = async (
  vehicle_id: number,
  status: string,
  mileage?: number,
): Promise<void> => {
  try {
    const pool = await getDbPool();
    let query = `UPDATE Vehicles SET status = @status, updated_at = GETDATE()`;
    const request = pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("status", sql.NVarChar, status);

    if (mileage) {
      query += `, current_mileage = @mileage`;
      request.input("mileage", sql.Int, mileage);
    }
    query += ` WHERE vehicle_id = @vehicle_id`;
    await request.query(query);
  } catch (error) {
    console.error("Vehicle mileage update failed", error);
  }
};
