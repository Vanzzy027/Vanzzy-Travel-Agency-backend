import { z } from 'zod';

export const InitializePaymentSchema = z.object({
  booking_id: z.number(),
  total_amount: z.number().positive(),
  email: z.string().email(),
  phone: z.string().optional(),
  method: z.enum(['mpesa', 'card']),
  user_id: z.string(),
  vehicle: z.string(),
});

export const ProcessPaymentSchema = z.object({
  booking_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.enum(['mpesa', 'card']),
  transaction_code: z.string(),
  phone_number: z.string().optional(),
});

export type InitializePaymentInput = z.infer<typeof InitializePaymentSchema>;
export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;