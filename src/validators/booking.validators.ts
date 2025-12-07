import { z } from 'zod';

export const BookingSchema = z.object({
  vehicle_id: z.number().min(1, "Vehicle ID is required"),
  booking_date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: "Invalid booking date"
  }),
  return_date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: "Invalid return date"
  }),
  total_amount: z.number().min(0),
  booking_status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Late']).default('Pending')
}).refine(data => data.return_date > data.booking_date, {
  message: "Return date must be after booking date",
  path: ["return_date"]
});

export const BookingUpdateSchema = z.object({
  vehicle_id: z.number().min(1, "Vehicle ID is required").optional(),
  booking_date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: "Invalid booking date"
  }).optional(),
  return_date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: "Invalid return date"
  }).optional(),
  actual_return_date: z.string().transform(str => new Date(str)).refine(date => !isNaN(date.getTime()), {
    message: "Invalid actual return date"
  }).optional(),
  start_mileage: z.number().min(0, "Start mileage cannot be negative").optional(),
  end_mileage: z.number().min(0, "End mileage cannot be negative").optional(),
  total_amount: z.number().min(0, "Total amount cannot be negative").optional(),
  booking_status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Late']).optional()
});