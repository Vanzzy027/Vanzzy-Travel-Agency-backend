import type { Context } from "hono";
import type { AuthContext } from "../middleware/bearAuth.js";
import {
  createBookingService,
  getAllBookingsService,
  getBookingByIdService,
  updateBookingService,
  updateBookingStatusService, // ✅ IMPORT THE NEW SERVICE
  cancelBookingService,
  getUserBookingsService,
  getVehicleBookingsService,
  completeBookingService,
} from "./bookings.service.js";
import {
  BookingSchema,
  BookingUpdateSchema,
} from "../validators/booking.validators.js";

type CustomContext = Context & {
  user?: {
    user_id: number;
    email?: string;
    total_amount: number;
  };
};

// Create new booking
export const createBooking = async (c: CustomContext) => {
  try {
    if (!c.user) return c.json({ error: "Authentication required." }, 401);

    const body = await c.req.json();
    const user_id = c.user.user_id;

    const validation = BookingSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json(
        { error: "Validation failed", details: errorMessages },
        400,
      );
    }

    const bookingData = {
      user_id: user_id.toString(),
      vehicle_id: validation.data.vehicle_id,
      booking_date: new Date(validation.data.booking_date),
      return_date: new Date(validation.data.return_date),
      total_amount: validation.data.total_amount,
      booking_status: "Pending" as const,
    };

    const bookingService = new createBookingService();
    const isAvailable = await bookingService.checkVehicleAvailability(
      bookingData.vehicle_id,
      bookingData.booking_date,
      bookingData.return_date,
    );

    if (!isAvailable)
      return c.json(
        { error: "Vehicle is not available for the selected dates" },
        400,
      );

    const booking = await bookingService.createBooking(bookingData);
    return c.json(
      { message: "Booking created successfully 🎉", data: booking },
      201,
    );
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return c.json(
      { error: "Failed to create booking. Please try again later." },
      500,
    );
  }
};

// ✅ UPDATE STATUS (Fixed Controller)
export const updateBookingStatusController = async (c: Context) => {
  try {
    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    const body = await c.req.json();
    const { booking_status } = body;

    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    if (!booking_status) return c.json({ error: "Status is required" }, 400);

    // Call the STRICT status update service, not the generic one
    const result = await updateBookingStatusService(id, booking_status);

    return c.json(
      {
        message: "Status updated successfully",
        data: result,
      },
      200,
    );
  } catch (error: any) {
    console.error("Error updating booking status:", error);
    return c.json({ error: "Failed to update booking status." }, 400); // Kept as 400 since that's what you had
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (c: Context) => {
  try {
    const {
      status,
      user_id,
      vehicle_id,
      page = "1",
      limit = "10",
    } = c.req.query();

    const bookings = await getAllBookingsService({
      status: status || undefined,
      user_id: user_id as string,
      vehicle_id: vehicle_id ? parseInt(vehicle_id) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    if (!bookings || bookings.length === 0)
      return c.json({ message: "No bookings found" }, 404);

    return c.json(
      {
        message: "Bookings retrieved successfully",
        data: bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit) },
      },
      200,
    );
  } catch (error: any) {
    console.error("Error fetching all bookings:", error);
    return c.json({ error: "Failed to retrieve bookings." }, 500);
  }
};

// Get booking by ID
export const getBookingById = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: "Authentication required." }, 401);

    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    const user_id = c.user.user_id;
    const user_role = c.user.role;

    if (isNaN(id) || id <= 0)
      return c.json({ error: "Invalid booking ID" }, 400);

    const booking = await getBookingByIdService(id);
    if (!booking) return c.json({ error: "Booking not found" }, 404);

    if (
      user_role !== "admin" &&
      user_role !== "superAdmin" &&
      booking.user_id !== user_id
    ) {
      return c.json({ error: "Access denied" }, 403);
    }

    return c.json(
      { message: "Booking retrieved successfully", data: booking },
      200,
    );
  } catch (error: any) {
    console.error("Error fetching booking by ID:", error);
    return c.json({ error: "Failed to retrieve booking details." }, 500);
  }
};

// Get user's bookings
export const getUserBookings = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: "Authentication required." }, 401);

    const user_id = c.user.user_id;
    const { status, page = "1", limit = "10" } = c.req.query();

    const bookings = await getUserBookingsService(user_id, {
      status: status || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    if (!bookings || bookings.length === 0)
      return c.json({ message: "No bookings found" }, 404);

    return c.json(
      {
        message: "User bookings retrieved successfully",
        data: bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit) },
      },
      200,
    );
  } catch (error: any) {
    console.error("Error fetching user bookings:", error);
    return c.json({ error: "Failed to retrieve your bookings." }, 500);
  }
};

// Get vehicle bookings
export const getVehicleBookings = async (c: Context) => {
  try {
    const vehicleIdParam = c.req.param("vehicleId");
    if (!vehicleIdParam)
      return c.json({ error: "Vehicle ID is required" }, 400);
    const vehicle_id = parseInt(vehicleIdParam);
    const { status, page = "1", limit = "10" } = c.req.query();

    if (isNaN(vehicle_id) || vehicle_id <= 0)
      return c.json({ error: "Invalid vehicle ID" }, 400);

    const bookings = await getVehicleBookingsService(vehicle_id, {
      status: status || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    if (!bookings || bookings.length === 0)
      return c.json({ message: "No bookings found for this vehicle" }, 404);

    return c.json(
      {
        message: "Vehicle bookings retrieved successfully",
        data: bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit) },
      },
      200,
    );
  } catch (error: any) {
    console.error("Error fetching vehicle bookings:", error);
    return c.json(
      { error: "Failed to retrieve bookings for this vehicle." },
      500,
    );
  }
};

// Update booking (Generic)
export const updateBooking = async (c: Context) => {
  try {
    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    if (isNaN(id) || id <= 0)
      return c.json({ error: "Invalid booking ID" }, 400);

    const body = await c.req.json();
    const validation = BookingUpdateSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json(
        { error: "Validation failed", details: errorMessages },
        400,
      );
    }

    const updatedBooking = await updateBookingService(id, validation.data);
    if (!updatedBooking)
      return c.json({ error: "Booking not found or no changes made" }, 404);

    return c.json(
      { message: "Booking updated successfully 🎉", data: updatedBooking },
      200,
    );
  } catch (error: any) {
    console.error("Error updating booking:", error);
    return c.json({ error: "Failed to update booking details." }, 500);
  }
};

// Cancel booking
export const cancelBooking = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: "Authentication required." }, 401);

    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    const user_id = c.user.user_id;
    const user_role = c.user.role;

    if (isNaN(id) || id <= 0)
      return c.json({ error: "Invalid booking ID" }, 400);

    let cancelledBooking;
    if (user_role === "admin" || user_role === "superAdmin") {
      cancelledBooking = await cancelBookingService(id);
    } else {
      cancelledBooking = await cancelBookingService(id, user_id);
    }

    if (!cancelledBooking)
      return c.json({ error: "Booking not found or cannot be cancelled" }, 404);

    return c.json(
      { message: "Booking cancelled successfully", data: cancelledBooking },
      200,
    );
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return c.json(
      { error: "Failed to cancel booking. Please try again." },
      500,
    );
  }
};

// Complete booking
export const completeBooking = async (c: Context) => {
  try {
    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    if (isNaN(id) || id <= 0)
      return c.json({ error: "Invalid booking ID" }, 400);

    const body = await c.req.json();
    const { actual_return_date, end_mileage } = body;

    const completedBooking = await completeBookingService(id, {
      actual_return_date: actual_return_date
        ? new Date(actual_return_date)
        : new Date(),
      end_mileage,
    });

    if (!completedBooking)
      return c.json({ error: "Booking not found or cannot be completed" }, 404);

    return c.json(
      { message: "Booking completed successfully", data: completedBooking },
      200,
    );
  } catch (error: any) {
    console.error("Error completing booking:", error);
    return c.json({ error: "Failed to complete booking." }, 500);
  }
};
