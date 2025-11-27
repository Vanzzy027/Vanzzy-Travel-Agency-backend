import { Hono } from 'hono';
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  getPaymentsByBooking,
  getUserPayments,
  processPayment,
  refundPayment
} from './payments.controller';
import { adminRoleAuth, bothRolesAuth } from '../middleware/bearAuth';

const paymentsRouter = new Hono();

//authentication to all payment routes
paymentsRouter.use('*', bothRolesAuth);

// User routes
paymentsRouter.post('/', createPayment);
paymentsRouter.get('/my-payments', getUserPayments);
paymentsRouter.get('/booking/:bookingId', getPaymentsByBooking);
paymentsRouter.get('/:id', getPaymentById);

// Admin only routes
paymentsRouter.get('/', adminRoleAuth, getAllPayments);
paymentsRouter.put('/:id', adminRoleAuth, updatePayment);
paymentsRouter.patch('/:id/process', adminRoleAuth, processPayment);
paymentsRouter.patch('/:id/refund', adminRoleAuth, refundPayment);

export default paymentsRouter;