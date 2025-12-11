export interface Vehicle {
  vehicle_id: number;
  manufacturer?: string;
  model?: string;
  year?: number;
  vehicle_type?: string;
  rental_rate: number;
  color?: string;
  fuel_type?: string;
  transmission?: string;
  seating_capacity?: number;
  features?: string;
  status?: string;
  on_promo?: boolean;
}

export interface VehicleApiResponse {
  data?: {
    vehicle_id: number;
    manufacturer?: string;
    model?: string;
    rental_rate: number;
    [key: string]: any;
  };
  rental_rate?: number;
  manufacturer?: string;
  model?: string;
  [key: string]: any;
}

export interface BookingApiResponse {
  data?: {
    booking_id: number;
    [key: string]: any;
  };
  booking_id?: number;
  [key: string]: any;
}

export interface CreateBookingParams {
  vehicle_id: number;
  days: number;
  start_date: string;
}

export interface CheckAvailabilityParams {
  searchQuery: string;
}