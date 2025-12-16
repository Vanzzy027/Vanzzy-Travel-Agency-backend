import * as dotenv from 'dotenv';
import { 
  getAvailableVehiclesService 
} from "../vehicles/vehicles.service.js";
import { 
  Vehicle, 
  VehicleApiResponse, 
  BookingApiResponse, 
  CheckAvailabilityParams 
} from "./ai-tools.types.js";

dotenv.config();

/**
 * GLOBAL CONFIGURATION
 * These pull from your backend .env file.
 * Local: BACKEND_URL=http://localhost:3000
 * Production: BACKEND_URL=https://vanske-car-rental.azurewebsites.net
 */
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Helper function to search vehicles
const searchAvailableVehicles = async (searchQuery: string): Promise<Vehicle[]> => {
  try {
    const allAvailable = await getAvailableVehiclesService();
    
    if (!searchQuery) return allAvailable as Vehicle[];
    
    const queryLower = searchQuery.toLowerCase();
    
    return (allAvailable as Vehicle[]).filter(vehicle => 
      vehicle.manufacturer?.toLowerCase().includes(queryLower) ||
      vehicle.model?.toLowerCase().includes(queryLower) ||
      vehicle.vehicle_type?.toLowerCase().includes(queryLower) ||
      vehicle.features?.toLowerCase().includes(queryLower) ||
      vehicle.color?.toLowerCase().includes(queryLower) ||
      vehicle.fuel_type?.toLowerCase().includes(queryLower)
    );
  } catch (error) {
    console.error("Error searching vehicles:", error);
    throw error;
  }
};

export const toolsSchema = [
  {
    name: "check_availability",
    description: "Search for available vehicles based on type, make, model, color, features, or seating capacity.",
    parameters: {
      type: "OBJECT",
      properties: {
        searchQuery: { type: "STRING", description: "Search keyword" },
      },
      required: ["searchQuery"],
    },
  },
  {
    name: "create_booking",
    description: "Creates a booking for the authenticated user.",
    parameters: {
      type: "OBJECT",
      properties: {
        vehicle_id: { type: "NUMBER", description: "Vehicle ID" },
        days: { type: "NUMBER", description: "Number of days" },
        start_date: { type: "STRING", description: "Start date (YYYY-MM-DD)" },
      },
      required: ["vehicle_id", "days", "start_date"],
    },
  },
];

export const toolsFunctions = {
  check_availability: async ({ searchQuery }: CheckAvailabilityParams) => {
    try {
      console.log(`[AI] Searching vehicles for: '${searchQuery}'`);
      const vehicles = await searchAvailableVehicles(searchQuery);

      if (!vehicles || vehicles.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No available vehicles found matching "${searchQuery}".`
        });
      }

      const formatted = vehicles.map((v: Vehicle) => ({
        id: v.vehicle_id,
        name: `${v.manufacturer} ${v.model} (${v.year})`,
        price: v.rental_rate,
        details: `${v.color}, ${v.transmission}, ${v.seating_capacity} seats`
      }));

      return JSON.stringify({
        success: true,
        count: formatted.length,
        vehicles: formatted,
        summary: `Found ${formatted.length} vehicles. Provide ID and dates to book.`
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },

  create_booking: async (
    { vehicle_id, days, start_date }: { vehicle_id: number; days: number; start_date: string },
    userId: string,
    authHeader: string
  ) => {
    try {
      console.log(`[AI] Booking request: User ${userId}, Vehicle ${vehicle_id}`);
      
      // Date Parsing
      let startDate: Date = start_date.includes('/') 
        ? new Date(start_date.split('/').reverse().join('-')) 
        : new Date(start_date);
      
      if (isNaN(startDate.getTime())) {
        return JSON.stringify({ status: "error", message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const returnDate = new Date(startDate);
      returnDate.setDate(startDate.getDate() + days);
      
      // 1. Verify Vehicle via Internal API call (using Centralized BACKEND_URL)
      let vehiclePrice = 0;
      let vehicleName = "Vehicle";
      
      const vehicleResponse = await fetch(`${BACKEND_URL}/api/vehicles/${vehicle_id}`, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
      });
      
      if (vehicleResponse.ok) {
        const vehicleData = await vehicleResponse.json() as VehicleApiResponse;
        vehiclePrice = vehicleData.data?.rental_rate || vehicleData.rental_rate || 0;
        vehicleName = `${vehicleData.data?.manufacturer || ''} ${vehicleData.data?.model || ''}`.trim();
      } else {
        return JSON.stringify({ status: "error", message: "Vehicle not found." });
      }

      // 2. Create Booking via Internal API call
      const total_amount = vehiclePrice * days;
      const bookingPayload = {
        vehicle_id,
        booking_date: startDate.toISOString().split('T')[0],
        return_date: returnDate.toISOString().split('T')[0],
        total_amount,
      };

      const bookingResponse = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(bookingPayload),
      });
      
      const bookingData = await bookingResponse.json() as BookingApiResponse;

      if (!bookingResponse.ok) {
        return JSON.stringify({ status: "error", message: "Booking failed on server." });
      }

      // 3. Success Response with Centralized FRONTEND_URL
      const bId = bookingData.data?.booking_id || bookingData.booking_id;
      return JSON.stringify({
        status: "success",
        message: `✅ Booking #${bId} created for ${vehicleName}!`,
        total_amount,
        dashboard_link: `${FRONTEND_URL}/UserDashboard/my-bookings`
      });

    } catch (error: any) {
      console.error("❌ AI Booking Error:", error);
      return JSON.stringify({ status: "error", message: error.message });
    }
  }
};