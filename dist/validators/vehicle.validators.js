import { z } from 'zod';
//enum for consstraints
const VehicleTypes = [
    'Sedan', 'SUV', 'Truck', 'Van', 'Hatchback', 'Coupe', 'Convertible', 'Minivan', 'Sports Car'
];
export const VehicleSpecSchema = z.object({
    manufacturer: z.string().min(1, "Manufacturer is required").max(50),
    model: z.string().min(1, "Model is required").max(50),
    year: z.number().int().min(1900, "Year must be after 1900").max(new Date().getFullYear() + 1),
    fuel_type: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG']),
    engine_capacity: z.string().min(1, "Engine capacity is required").max(20),
    transmission: z.string().min(1, "Transmission is required").max(20),
    seating_capacity: z.number().int().min(1, "Seating capacity must be at least 1").max(100),
    color: z.string().min(1, "Color is required").max(30),
    features: z.string().optional().default("[]"),
    images: z.string().optional().default("[]"),
    on_promo: z.boolean().optional().default(false),
    review_count: z.number().int().optional().default(0),
    vehicle_type: z.enum(VehicleTypes).default('Sedan'),
});
export const VehicleSchema = z.object({
    vehicleSpec_id: z.number().min(1, "Vehicle specification ID is required"),
    vin_number: z.string().min(1, "VIN number is required").max(50),
    license_plate: z.string().min(1, "License plate is required").max(20),
    current_mileage: z.number().min(0, "Current mileage cannot be negative"),
    rental_rate: z.number().min(0, "Rental rate cannot be negative"),
    status: z.enum(['Available', 'Rented', 'Maintenance', 'Unavailable', 'Banned']).default('Available')
});
export const VehicleStatusSchema = z.object({
    status: z.enum(['Available', 'Rented', 'Maintenance', 'Unavailable', 'Banned'])
});
export const VehicleUpdateSchema = VehicleSchema.partial();
export const VehicleSpecUpdateSchema = VehicleSpecSchema.partial();
