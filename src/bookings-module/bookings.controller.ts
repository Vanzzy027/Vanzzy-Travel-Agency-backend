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
  completeBookingService
} from "./bookings.service.js";
import { BookingSchema, BookingUpdateSchema } from "../validators/booking.validators.js";

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
    if (!c.user) return c.json({ error: 'Authentication required.' }, 401);

    const body = await c.req.json();
    const user_id = c.user.user_id;

    const validation = BookingSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const bookingData = {
      user_id: user_id.toString(),
      vehicle_id: validation.data.vehicle_id,
      booking_date: new Date(validation.data.booking_date),
      return_date: new Date(validation.data.return_date),
      total_amount: validation.data.total_amount,
      booking_status: 'Pending' as const
    };

    const bookingService = new createBookingService();
    const isAvailable = await bookingService.checkVehicleAvailability(
      bookingData.vehicle_id,
      bookingData.booking_date,
      bookingData.return_date
    );

    if (!isAvailable) return c.json({ error: "Vehicle is not available for the selected dates" }, 400);

    const booking = await bookingService.createBooking(bookingData);
    return c.json({ message: "Booking created successfully 🎉", data: booking }, 201);

  } catch (error: any) {
    console.error("❌ Error creating booking:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// ✅ UPDATE STATUS (Fixed Controller)
export const updateBookingStatusController = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { booking_status } = body;

    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    if (!booking_status) return c.json({ error: "Status is required" }, 400);

    // Call the STRICT status update service, not the generic one
    const result = await updateBookingStatusService(id, booking_status);

    return c.json({
      message: "Status updated successfully",
      data: result
    }, 200);

  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (c: Context) => {
  try {
    const { status, user_id, vehicle_id, page = '1', limit = '10' } = c.req.query();
    
    const bookings = await getAllBookingsService({
      status: status as string,
      user_id: user_id as string,
      vehicle_id: vehicle_id ? parseInt(vehicle_id) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!bookings || bookings.length === 0) return c.json({ message: "No bookings found" }, 404);

    return c.json({
      message: "Bookings retrieved successfully",
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get booking by ID
export const getBookingById = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: 'Authentication required.' }, 401);

    const id = parseInt(c.req.param('id'));
    const user_id = c.user.user_id;
    const user_role = c.user.role;
    
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid booking ID" }, 400);

    const booking = await getBookingByIdService(id);
    if (!booking) return c.json({ error: "Booking not found" }, 404);

    if (user_role !== 'admin' && user_role !== 'superAdmin' && booking.user_id !== user_id) {
      return c.json({ error: "Access denied" }, 403);
    }

    return c.json({ message: "Booking retrieved successfully", data: booking }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get user's bookings
export const getUserBookings = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: 'Authentication required.' }, 401);

    const user_id = c.user.user_id;
    const { status, page = '1', limit = '10' } = c.req.query();

    const bookings = await getUserBookingsService(user_id, {
      status: status as string,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!bookings || bookings.length === 0) return c.json({ message: "No bookings found" }, 404);

    return c.json({
      message: "User bookings retrieved successfully",
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get vehicle bookings
export const getVehicleBookings = async (c: Context) => {
  try {
    const vehicle_id = parseInt(c.req.param('vehicleId'));
    const { status, page = '1', limit = '10' } = c.req.query();
    
    if (isNaN(vehicle_id) || vehicle_id <= 0) return c.json({ error: "Invalid vehicle ID" }, 400);

    const bookings = await getVehicleBookingsService(vehicle_id, {
      status: status as string,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!bookings || bookings.length === 0) return c.json({ message: "No bookings found for this vehicle" }, 404);

    return c.json({
      message: "Vehicle bookings retrieved successfully",
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Update booking (Generic)
export const updateBooking = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid booking ID" }, 400);

    const body = await c.req.json();
    const validation = BookingUpdateSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const updatedBooking = await updateBookingService(id, validation.data);
    if (!updatedBooking) return c.json({ error: "Booking not found or no changes made" }, 404);

    return c.json({ message: "Booking updated successfully 🎉", data: updatedBooking }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Cancel booking
export const cancelBooking = async (c: AuthContext) => {
  try {
    if (!c.user) return c.json({ error: 'Authentication required.' }, 401);

    const id = parseInt(c.req.param('id'));
    const user_id = c.user.user_id;
    const user_role = c.user.role;
    
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid booking ID" }, 400);

    let cancelledBooking;
    if (user_role === 'admin' || user_role === 'superAdmin') {
      cancelledBooking = await cancelBookingService(id);
    } else {
      cancelledBooking = await cancelBookingService(id, user_id);
    }
    
    if (!cancelledBooking) return c.json({ error: "Booking not found or cannot be cancelled" }, 404);

    return c.json({ message: "Booking cancelled successfully", data: cancelledBooking }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Complete booking
export const completeBooking = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid booking ID" }, 400);

    const body = await c.req.json();
    const { actual_return_date, end_mileage } = body;

    const completedBooking = await completeBookingService(id, {
      actual_return_date: actual_return_date ? new Date(actual_return_date) : new Date(),
      end_mileage
    });
    
    if (!completedBooking) return c.json({ error: "Booking not found or cannot be completed" }, 404);

    return c.json({ message: "Booking completed successfully", data: completedBooking }, 200);

  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// import { Context } from "hono";
// import type { AuthContext } from "../middleware/bearAuth";
// import {
//   createBookingService,
//   getAllBookingsService,
//   getBookingByIdService,
//   updateBookingService,
//   cancelBookingService,
//   getUserBookingsService,
//   getVehicleBookingsService,
//   completeBookingService
// } from "./bookings.service";
// import { BookingSchema, BookingUpdateSchema } from "../validators/booking.validators";

// // Create new booking



// //const bookingService = new createBookingService(); 



// // Define a custom context type with user
// type CustomContext = Context & {
//   user?: {
//     user_id: number;
//     email?: string;
//     total_amount: number;
//     // Add other user properties as needed
//   };
// };

// // Create new booking
// export const createBooking = async (c: CustomContext) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }

//     const body = await c.req.json();
//     const user_id = c.user.user_id;

//     console.log("📥 Received booking request:", body);

//     // Validate input
//     const validation = BookingSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }

//     // Prepare booking data - convert dates from string to Date objects
//     const bookingData = {
//       user_id: user_id.toString(), // Convert to string as expected by service
//       vehicle_id: validation.data.vehicle_id,
//       booking_date: new Date(validation.data.booking_date),
//       return_date: new Date(validation.data.return_date),
//       total_amount: validation.data.total_amount,
//       booking_status: 'Pending' as const // Set default status
//     };

//     console.log("📦 Booking data to save:", bookingData);

//     // Create instance of service and call the correct method
//     const bookingService = new createBookingService();
    
//     // Check vehicle availability first
//     const isAvailable = await bookingService.checkVehicleAvailability(
//       bookingData.vehicle_id,
//       bookingData.booking_date,
//       bookingData.return_date
//     );

//     if (!isAvailable) {
//       return c.json({ 
//         error: "Vehicle is not available for the selected dates" 
//       }, 400);
//     }

//     // Create the booking
//     const booking = await bookingService.createBooking(bookingData);
    
//     return c.json({
//       message: "Booking created successfully 🎉",
//       data: booking
//     }, 201);

//   } catch (error: any) {
//     console.error("❌ Error creating booking:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Updating

// export const updateBookingStatusController = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
//     const body = await c.req.json();
//     const { booking_status } = body;

//     if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
//     if (!booking_status) return c.json({ error: "Status is required" }, 400);

//     const result = await updateBookingService(id, booking_status);

//     return c.json({
//       message: "Status updated successfully",
//       data: result
//     }, 200);

//   } catch (error: any) {
//     return c.json({ error: error.message }, 400);
//   }
// };


// // // Create new booking
// // export const createBooking = async (c: AuthContext) => {
// //   try {
// //     if (!c.user) {
// //       return c.json({ error: 'Authentication required.' }, 401);
// //     }

// //     const body = await c.req.json();
// //     const user_id = c.user.user_id;

// //     // Validate input
// //     const validation = BookingSchema.safeParse(body);
// //     if (!validation.success) {
// //       const errorMessages = validation.error.issues.map(issue => ({
// //         field: issue.path.join('.'),
// //         message: issue.message
// //       }));
// //       return c.json({ error: "Validation failed", details: errorMessages }, 400);
// //     }

// //     const bookingData = {
// //       ...validation.data,
// //       user_id,
// //       total_amount: 0,
// //     };

// //     // ⚡ Instantiate the service
// //     const bookingService = new createBookingService();

// //     // ⚡ Use the service instance to create booking
// //     // (you might need to add a method in the class to actually insert a booking if missing)
// //     const booking = await bookingService.createBooking(bookingData); 

// //     return c.json({
// //       message: "Booking created successfully 🎉",
// //       data: booking
// //     }, 201);

// //   } catch (error: any) {
// //     console.error("Error creating booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };


// // Get all bookings (Admin only)
// export const getAllBookings = async (c: Context) => {
//   try {
//     const { status, user_id, vehicle_id, page = '1', limit = '10' } = c.req.query();
    
//     const bookings = await getAllBookingsService({
//       status: status as string,
//       user_id: user_id as string,
//       vehicle_id: vehicle_id ? parseInt(vehicle_id) : undefined,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });

//     if (!bookings || bookings.length === 0) {
//       return c.json({ message: "No bookings found" }, 404);
//     }

//     return c.json({
//       message: "Bookings retrieved successfully",
//       data: bookings,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit)
//       }
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving bookings:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get booking by ID
// export const getBookingById = async (c: AuthContext) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }

//     const id = parseInt(c.req.param('id'));
//     const user_id = c.user.user_id;
//     const user_role = c.user.role;
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid booking ID" }, 400);
//     }

//     const booking = await getBookingByIdService(id);
    
//     if (!booking) {
//       return c.json({ error: "Booking not found" }, 404);
//     }

//     // Users can only see their own bookings, admins can see all
//     if (user_role !== 'admin' && user_role !== 'superAdmin' && booking.user_id !== user_id) {
//       return c.json({ error: "Access denied" }, 403);
//     }

//     return c.json({
//       message: "Booking retrieved successfully",
//       data: booking
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving booking:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get user's bookings (for authenticated user)
// export const getUserBookings = async (c: AuthContext) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }

//     const user_id = c.user.user_id;
//     const { status, page = '1', limit = '10' } = c.req.query();

//     const bookings = await getUserBookingsService(user_id, {
//       status: status as string,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });

//     if (!bookings || bookings.length === 0) {
//       return c.json({ message: "No bookings found" }, 404);
//     }

//     return c.json({
//       message: "User bookings retrieved successfully",
//       data: bookings,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit)
//       }
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving user bookings:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get vehicle bookings (Admin only)
// export const getVehicleBookings = async (c: Context) => {
//   try {
//     const vehicle_id = parseInt(c.req.param('vehicleId'));
//     const { status, page = '1', limit = '10' } = c.req.query();
    
//     if (isNaN(vehicle_id) || vehicle_id <= 0) {
//       return c.json({ error: "Invalid vehicle ID" }, 400);
//     }

//     const bookings = await getVehicleBookingsService(vehicle_id, {
//       status: status as string,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });

//     if (!bookings || bookings.length === 0) {
//       return c.json({ message: "No bookings found for this vehicle" }, 404);
//     }

//     return c.json({
//       message: "Vehicle bookings retrieved successfully",
//       data: bookings,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit)
//       }
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving vehicle bookings:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Update booking (Admin only)
// export const updateBooking = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid booking ID" }, 400);
//     }

//     const body = await c.req.json();

//     // Validate input
//     const validation = BookingUpdateSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }

//     const updatedBooking = await updateBookingService(id, validation.data);
    
//     if (!updatedBooking) {
//       return c.json({ error: "Booking not found or no changes made" }, 404);
//     }

//     return c.json({
//       message: "Booking updated successfully 🎉",
//       data: updatedBooking
//     }, 200);

//   } catch (error: any) {
//     console.error("Error updating booking:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Cancel booking
// export const cancelBooking = async (c: AuthContext) => {
//   try {
//     if (!c.user) {
//       return c.json({ error: 'Authentication required.' }, 401);
//     }

//     const id = parseInt(c.req.param('id'));
//     const user_id = c.user.user_id;
//     const user_role = c.user.role;
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid booking ID" }, 400);
//     }

//     // Users can only cancel their own bookings, admins can cancel any
//     let cancelledBooking;
//     if (user_role === 'admin' || user_role === 'superAdmin') {
//       cancelledBooking = await cancelBookingService(id);
//     } else {
//       cancelledBooking = await cancelBookingService(id, user_id);
//     }
    
//     if (!cancelledBooking) {
//       return c.json({ error: "Booking not found or cannot be cancelled" }, 404);
//     }

//     return c.json({
//       message: "Booking cancelled successfully",
//       data: cancelledBooking
//     }, 200);

//   } catch (error: any) {
//     console.error("Error cancelling booking:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Complete booking (Admin only - when vehicle is returned)
// export const completeBooking = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid booking ID" }, 400);
//     }

//     const body = await c.req.json();
//     const { actual_return_date, end_mileage } = body;

//     const completedBooking = await completeBookingService(id, {
//       actual_return_date: actual_return_date ? new Date(actual_return_date) : new Date(),
//       end_mileage
//     });
    
//     if (!completedBooking) {
//       return c.json({ error: "Booking not found or cannot be completed" }, 404);
//     }

//     return c.json({
//       message: "Booking completed successfully",
//       data: completedBooking
//     }, 200);

//   } catch (error: any) {
//     console.error("Error completing booking:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };












// // import { Context } from "hono";
// // import type { AuthContext } from "../middleware/bearAuth";
// // import {
// //   createBookingService,
// //   getAllBookingsService,
// //   getBookingByIdService,
// //   updateBookingService,
// //   cancelBookingService,
// //   getUserBookingsService,
// //   getVehicleBookingsService,
// //   completeBookingService
// // } from "./bookings.service";
// // import { BookingSchema, BookingUpdateSchema } from "../validators/booking.validators";

// // // Create new booking



// // //const bookingService = new createBookingService(); 



// // // Define a custom context type with user
// // type CustomContext = Context & {
// //   user?: {
// //     user_id: number;
// //     email?: string;
// //     total_amount: number;
// //     // Add other user properties as needed
// //   };
// // };

// // // Create new booking
// // export const createBooking = async (c: CustomContext) => {
// //   try {
// //     if (!c.user) {
// //       return c.json({ error: 'Authentication required.' }, 401);
// //     }

// //     const body = await c.req.json();
// //     const user_id = c.user.user_id;

// //     console.log("📥 Received booking request:", body);

// //     // Validate input
// //     const validation = BookingSchema.safeParse(body);
// //     if (!validation.success) {
// //       const errorMessages = validation.error.issues.map(issue => ({
// //         field: issue.path.join('.'),
// //         message: issue.message
// //       }));
// //       return c.json({ error: "Validation failed", details: errorMessages }, 400);
// //     }

// //     // Prepare booking data - convert dates from string to Date objects
// //     const bookingData = {
// //       user_id: user_id.toString(), // Convert to string as expected by service
// //       vehicle_id: validation.data.vehicle_id,
// //       booking_date: new Date(validation.data.booking_date),
// //       return_date: new Date(validation.data.return_date),
// //       total_amount: validation.data.total_amount,
// //       booking_status: 'Pending' as const // Set default status
// //     };

// //     console.log("📦 Booking data to save:", bookingData);

// //     // Create instance of service and call the correct method
// //     const bookingService = new createBookingService();
    
// //     // Check vehicle availability first
// //     const isAvailable = await bookingService.checkVehicleAvailability(
// //       bookingData.vehicle_id,
// //       bookingData.booking_date,
// //       bookingData.return_date
// //     );

// //     if (!isAvailable) {
// //       return c.json({ 
// //         error: "Vehicle is not available for the selected dates" 
// //       }, 400);
// //     }

// //     // Create the booking
// //     const booking = await bookingService.createBooking(bookingData);
    
// //     return c.json({
// //       message: "Booking created successfully 🎉",
// //       data: booking
// //     }, 201);

// //   } catch (error: any) {
// //     console.error("❌ Error creating booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // // Create new booking
// // // export const createBooking = async (c: AuthContext) => {
// // //   try {
// // //     if (!c.user) {
// // //       return c.json({ error: 'Authentication required.' }, 401);
// // //     }

// // //     const body = await c.req.json();
// // //     const user_id = c.user.user_id;

// // //     // Validate input
// // //     const validation = BookingSchema.safeParse(body);
// // //     if (!validation.success) {
// // //       const errorMessages = validation.error.issues.map(issue => ({
// // //         field: issue.path.join('.'),
// // //         message: issue.message
// // //       }));
// // //       return c.json({ error: "Validation failed", details: errorMessages }, 400);
// // //     }

// // //     const bookingData = {
// // //       ...validation.data,
// // //       user_id,
// // //       total_amount: 0,
// // //     };

// // //     // ⚡ Instantiate the service
// // //     const bookingService = new createBookingService();

// // //     // ⚡ Use the service instance to create booking
// // //     // (you might need to add a method in the class to actually insert a booking if missing)
// // //     const booking = await bookingService.createBooking(bookingData); 

// // //     return c.json({
// // //       message: "Booking created successfully 🎉",
// // //       data: booking
// // //     }, 201);

// // //   } catch (error: any) {
// // //     console.error("Error creating booking:", error);
// // //     return c.json({ error: error.message || "Internal server error" }, 500);
// // //   }
// // // };


// // // Get all bookings (Admin only)
// // export const getAllBookings = async (c: Context) => {
// //   try {
// //     const { status, user_id, vehicle_id, page = '1', limit = '10' } = c.req.query();
    
// //     const bookings = await getAllBookingsService({
// //       status: status as string,
// //       user_id: user_id as string,
// //       vehicle_id: vehicle_id ? parseInt(vehicle_id) : undefined,
// //       page: parseInt(page),
// //       limit: parseInt(limit)
// //     });

// //     if (!bookings || bookings.length === 0) {
// //       return c.json({ message: "No bookings found" }, 404);
// //     }

// //     return c.json({
// //       message: "Bookings retrieved successfully",
// //       data: bookings,
// //       pagination: {
// //         page: parseInt(page),
// //         limit: parseInt(limit)
// //       }
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error retrieving bookings:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Get booking by ID
// // export const getBookingById = async (c: AuthContext) => {
// //   try {
// //     if (!c.user) {
// //       return c.json({ error: 'Authentication required.' }, 401);
// //     }

// //     const id = parseInt(c.req.param('id'));
// //     const user_id = c.user.user_id;
// //     const user_role = c.user.role;
    
// //     if (isNaN(id) || id <= 0) {
// //       return c.json({ error: "Invalid booking ID" }, 400);
// //     }

// //     const booking = await getBookingByIdService(id);
    
// //     if (!booking) {
// //       return c.json({ error: "Booking not found" }, 404);
// //     }

// //     // Users can only see their own bookings, admins can see all
// //     if (user_role !== 'admin' && user_role !== 'superAdmin' && booking.user_id !== user_id) {
// //       return c.json({ error: "Access denied" }, 403);
// //     }

// //     return c.json({
// //       message: "Booking retrieved successfully",
// //       data: booking
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error retrieving booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Get user's bookings (for authenticated user)
// // export const getUserBookings = async (c: AuthContext) => {
// //   try {
// //     if (!c.user) {
// //       return c.json({ error: 'Authentication required.' }, 401);
// //     }

// //     const user_id = c.user.user_id;
// //     const { status, page = '1', limit = '10' } = c.req.query();

// //     const bookings = await getUserBookingsService(user_id, {
// //       status: status as string,
// //       page: parseInt(page),
// //       limit: parseInt(limit)
// //     });

// //     if (!bookings || bookings.length === 0) {
// //       return c.json({ message: "No bookings found" }, 404);
// //     }

// //     return c.json({
// //       message: "User bookings retrieved successfully",
// //       data: bookings,
// //       pagination: {
// //         page: parseInt(page),
// //         limit: parseInt(limit)
// //       }
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error retrieving user bookings:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Get vehicle bookings (Admin only)
// // export const getVehicleBookings = async (c: Context) => {
// //   try {
// //     const vehicle_id = parseInt(c.req.param('vehicleId'));
// //     const { status, page = '1', limit = '10' } = c.req.query();
    
// //     if (isNaN(vehicle_id) || vehicle_id <= 0) {
// //       return c.json({ error: "Invalid vehicle ID" }, 400);
// //     }

// //     const bookings = await getVehicleBookingsService(vehicle_id, {
// //       status: status as string,
// //       page: parseInt(page),
// //       limit: parseInt(limit)
// //     });

// //     if (!bookings || bookings.length === 0) {
// //       return c.json({ message: "No bookings found for this vehicle" }, 404);
// //     }

// //     return c.json({
// //       message: "Vehicle bookings retrieved successfully",
// //       data: bookings,
// //       pagination: {
// //         page: parseInt(page),
// //         limit: parseInt(limit)
// //       }
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error retrieving vehicle bookings:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Update booking (Admin only)
// // export const updateBooking = async (c: Context) => {
// //   try {
// //     const id = parseInt(c.req.param('id'));
    
// //     if (isNaN(id) || id <= 0) {
// //       return c.json({ error: "Invalid booking ID" }, 400);
// //     }

// //     const body = await c.req.json();

// //     // Validate input
// //     const validation = BookingUpdateSchema.safeParse(body);
// //     if (!validation.success) {
// //       const errorMessages = validation.error.issues.map(issue => ({
// //         field: issue.path.join('.'),
// //         message: issue.message
// //       }));
// //       return c.json({ error: "Validation failed", details: errorMessages }, 400);
// //     }

// //     const updatedBooking = await updateBookingService(id, validation.data);
    
// //     if (!updatedBooking) {
// //       return c.json({ error: "Booking not found or no changes made" }, 404);
// //     }

// //     return c.json({
// //       message: "Booking updated successfully 🎉",
// //       data: updatedBooking
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error updating booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Cancel booking
// // export const cancelBooking = async (c: AuthContext) => {
// //   try {
// //     if (!c.user) {
// //       return c.json({ error: 'Authentication required.' }, 401);
// //     }

// //     const id = parseInt(c.req.param('id'));
// //     const user_id = c.user.user_id;
// //     const user_role = c.user.role;
    
// //     if (isNaN(id) || id <= 0) {
// //       return c.json({ error: "Invalid booking ID" }, 400);
// //     }

// //     // Users can only cancel their own bookings, admins can cancel any
// //     let cancelledBooking;
// //     if (user_role === 'admin' || user_role === 'superAdmin') {
// //       cancelledBooking = await cancelBookingService(id);
// //     } else {
// //       cancelledBooking = await cancelBookingService(id, user_id);
// //     }
    
// //     if (!cancelledBooking) {
// //       return c.json({ error: "Booking not found or cannot be cancelled" }, 404);
// //     }

// //     return c.json({
// //       message: "Booking cancelled successfully",
// //       data: cancelledBooking
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error cancelling booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };

// // // Complete booking (Admin only - when vehicle is returned)
// // export const completeBooking = async (c: Context) => {
// //   try {
// //     const id = parseInt(c.req.param('id'));
    
// //     if (isNaN(id) || id <= 0) {
// //       return c.json({ error: "Invalid booking ID" }, 400);
// //     }

// //     const body = await c.req.json();
// //     const { actual_return_date, end_mileage } = body;

// //     const completedBooking = await completeBookingService(id, {
// //       actual_return_date: actual_return_date ? new Date(actual_return_date) : new Date(),
// //       end_mileage
// //     });
    
// //     if (!completedBooking) {
// //       return c.json({ error: "Booking not found or cannot be completed" }, 404);
// //     }

// //     return c.json({
// //       message: "Booking completed successfully",
// //       data: completedBooking
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error completing booking:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };