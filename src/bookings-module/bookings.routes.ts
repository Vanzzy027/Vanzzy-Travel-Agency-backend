import { Hono } from 'hono';
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  getUserBookings,
  getVehicleBookings,
  completeBooking,
  updateBookingStatusController // 👈 Import the new controller
} from './bookings.controller';
import { adminRoleAuth, bothRolesAuth } from '../middleware/bearAuth';

const bookingsRouter = new Hono();

bookingsRouter.use('*', bothRolesAuth);

// User routes
bookingsRouter.post('/', createBooking);
bookingsRouter.get('/my-bookings', getUserBookings);
bookingsRouter.get('/:id', getBookingById);
//bookingsRouter.patch('/:id/cancel', cancelBooking); // ✅ Matches Frontend PATCH

// Admin only routes
bookingsRouter.get('/', getAllBookings);
bookingsRouter.get('/vehicle/:vehicleId', adminRoleAuth, getVehicleBookings);

// ✅ ADD THIS ROUTE for status changes
bookingsRouter.patch('/:id/status', adminRoleAuth, updateBookingStatusController); 

// General Edit
bookingsRouter.put('/:id', adminRoleAuth, updateBooking);

// Complete
bookingsRouter.patch('/:id/complete', adminRoleAuth, completeBooking);

// ✅ Cancel Route
bookingsRouter.patch('/:id/cancel', bothRolesAuth, cancelBooking);

export default bookingsRouter;

// import { Hono } from 'hono';
// import {
//   createBooking,
//   getAllBookings,
//   getBookingById,
//   updateBooking,
//   cancelBooking,
//   getUserBookings,
//   getVehicleBookings,
//   completeBooking
// } from './bookings.controller';
// import { adminRoleAuth, bothRolesAuth } from '../middleware/bearAuth';

// const bookingsRouter = new Hono();

// // Apply authentication to all booking routes
// bookingsRouter.use('*', bothRolesAuth);

// // User routes
// bookingsRouter.post('/', createBooking);
// bookingsRouter.get('/my-bookings', getUserBookings);
// bookingsRouter.get('/:id', getBookingById);
// bookingsRouter.patch('/:id/cancel', cancelBooking);

// // Admin only routes
// bookingsRouter.get('/', getAllBookings);
// bookingsRouter.get('/vehicle/:vehicleId', adminRoleAuth, getVehicleBookings);
// bookingsRouter.put('/:id', adminRoleAuth, updateBooking);
// bookingsRouter.patch('/:id/complete', adminRoleAuth, completeBooking);

// export default bookingsRouter;