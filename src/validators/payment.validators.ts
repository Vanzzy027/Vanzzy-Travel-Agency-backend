import { z } from 'zod';

export const PaymentSchema = z.object({
  booking_id: z.number().min(1, "Booking ID is required"),
  amount: z.number().min(0, "Amount must be positive"),
  payment_status: z.enum(['Pending', 'Completed', 'Failed', 'Refunded']).default('Pending'),
  payment_method: z.string().min(1, "Payment method is required").max(50),
  transaction_id: z.string().optional(),
  gross_amount: z.number().min(0, "Gross amount must be positive")
  
});

export const ProcessPaymentSchema = z.object({
  transaction_id: z.string().min(1, "Transaction ID is required").max(100),
  payment_method: z.string().min(1, "Payment method is required").max(50)
});

export const PaymentUpdateSchema = PaymentSchema.partial();