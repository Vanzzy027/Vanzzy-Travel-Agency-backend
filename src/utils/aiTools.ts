import { createBookingService } from "../bookings-module/bookings.service.js";
import { 
  getVehicleByIdService, 
  getAvailableVehiclesService,
  getAllVehiclesService 
} from "../vehicles/vehicles.service.js";

import { Vehicle, VehicleApiResponse, BookingApiResponse, CheckAvailabilityParams } from "./ai-tools.types.js";

// Helper function to search vehicles with search query
const searchAvailableVehicles = async (searchQuery: string): Promise<Vehicle[]> => {
  try {
    // First get all available vehicles
    const allAvailable = await getAvailableVehiclesService();
    
    // Filter by search query if provided
    if (!searchQuery) {
      return allAvailable as Vehicle[];
    }
    
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

// In aiTools.ts - update toolsSchema
export const toolsSchema = [
  {
    name: "check_availability",
    description: "Search for available vehicles based on type, make, model, color, features, or seating capacity. Returns vehicle IDs, names, prices, and details.",
    parameters: {
      type: "OBJECT",
      properties: {
        searchQuery: {
          type: "STRING",
          description: "Search keyword (e.g., Toyota, SUV, black, automatic, 4-seater, luxury, sports car)",
        },
      },
      required: ["searchQuery"],
    },
  },
  {
    name: "create_booking",
    description: "Creates a booking for the authenticated user. Requires vehicle ID from search results, number of days, and start date.",
    parameters: {
      type: "OBJECT",
      properties: {
        vehicle_id: {
          type: "NUMBER",
          description: "ID of the vehicle to rent (get this from check_availability results)",
        },
        days: {
          type: "NUMBER",
          description: "Number of rental days (e.g., 3 for 3 days)",
        },
        start_date: {
          type: "STRING",
          description: "Start date in YYYY-MM-DD format or DD/MM/YYYY format (e.g., 2025-12-12 or 12/12/2025)",
        },
      },
      required: ["vehicle_id", "days", "start_date"],
    },
  },
];

// TOOL FUNCTION IMPLEMENTATION
export const toolsFunctions = {
  // In aiTools.ts - update the check_availability function
  check_availability: async ({ searchQuery }: CheckAvailabilityParams) => {
    try {
      console.log(`[AI] Searching available vehicles for: '${searchQuery}'`);

      const vehicles = await searchAvailableVehicles(searchQuery);

      if (!vehicles || vehicles.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No available vehicles found matching "${searchQuery}".`,
          suggestions: ["Try searching for Toyota, SUV, Sedan, or specific features."]
        });
      }

      const formatted = vehicles.map((v: Vehicle) => ({
        id: v.vehicle_id,
        name: `${v.manufacturer} ${v.model} (${v.year})`,
        type: v.vehicle_type || 'Not specified',
        price: v.rental_rate,
        color: v.color,
        fuel_type: v.fuel_type,
        transmission: v.transmission,
        seating_capacity: v.seating_capacity,
        features: v.features,
        status: v.status,
        on_promo: v.on_promo,
        available: v.status === 'available'
      }));

      // Format response with clear IDs for AI
      const vehicleListText = formatted.map(v => 
        `ID: ${v.id} - ${v.name} (${v.type}, ${v.color}, ${v.seating_capacity} seats) - $${v.price}/day`
      ).join('\n');

      return JSON.stringify({
        success: true,
        count: formatted.length,
        vehicles: formatted,
        summary: `Found ${formatted.length} available vehicles:\n${vehicleListText}`,
        instruction: "To book a vehicle, provide: vehicle ID, start date (YYYY-MM-DD), and number of days."
      });

    } catch (error: any) {
      console.error("❌ Error in check_availability:", error);
      return JSON.stringify({
        success: false,
        error: `Sorry, there was an error searching for vehicles: ${error.message}`
      });
    }
  },

  // In aiTools.ts - update create_booking to handle different date formats
  create_booking: async (
    { vehicle_id, days, start_date }: { vehicle_id: number; days: number; start_date: string },
    userId: string,
    authHeader: string
  ) => {
    try {
      console.log(`[AI] Creating booking for user ${userId} on vehicle ${vehicle_id}`);
      console.log(`[AI] Start date: ${start_date}, Days: ${days}`);
      
      // Parse date - handle different formats
      let startDate: Date;
      
      // Try different date formats
      if (start_date.includes('/')) {
        // Format: "12/12/2025" or "12/12/2025 to 14/12/2025"
        const datePart = start_date.split(' to ')[0].trim();
        const [day, month, year] = datePart.split('/').map(Number);
        startDate = new Date(year, month - 1, day);
      } else if (start_date.includes('-')) {
        // Format: "2025-12-12"
        startDate = new Date(start_date);
      } else {
        // Try parsing as is
        startDate = new Date(start_date);
      }
      
      if (isNaN(startDate.getTime())) {
        return JSON.stringify({
          status: "error",
          message: "Invalid date format. Please use YYYY-MM-DD (e.g., 2025-12-12) or DD/MM/YYYY"
        });
      }
      
      // Calculate return date
      const returnDate = new Date(startDate);
      returnDate.setDate(startDate.getDate() + days);
      
      console.log(`[AI] Parsed start: ${startDate.toISOString().split('T')[0]}, Return: ${returnDate.toISOString().split('T')[0]}`);
      
      // First, verify vehicle exists
      let vehiclePrice = 0;
      let vehicleName = "Unknown Vehicle";
      let vehicleExists = false;
      
      try {
        const vehicleResponse = await fetch(`http://localhost:3000/api/vehicles/${vehicle_id}`, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        if (vehicleResponse.ok) {
          // FIXED: Add type assertion here
          const vehicleData = await vehicleResponse.json() as VehicleApiResponse;
          vehiclePrice = vehicleData.data?.rental_rate || vehicleData.rental_rate || 0;
          vehicleName = `${vehicleData.data?.manufacturer || ''} ${vehicleData.data?.model || ''}`.trim();
          vehicleExists = true;
          console.log(`[AI] Vehicle found: ${vehicleName}, Price: $${vehiclePrice}/day`);
        } else {
          console.warn(`[AI] Vehicle ${vehicle_id} not found or access denied`);
        }
      } catch (error) {
        console.error("[AI] Error fetching vehicle:", error);
      }
      
      if (!vehicleExists) {
        return JSON.stringify({
          status: "error",
          message: `Vehicle with ID ${vehicle_id} not found. Please check the vehicle ID and try again.`
        });
      }
      
      // Calculate total amount
      const total_amount = vehiclePrice * days;
      
      const bookingPayload = {
        vehicle_id,
        booking_date: startDate.toISOString().split('T')[0],
        return_date: returnDate.toISOString().split('T')[0],
        total_amount: total_amount,
      };
      
      console.log("[AI] Booking payload:", bookingPayload);
      
      // Call booking endpoint
      const bookingResponse = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(bookingPayload),
      });
      
      if (!bookingResponse.ok) {
        const errorText = await bookingResponse.text();
        console.error("[AI] Booking failed:", errorText);
        
        let errorMessage = "Unknown error";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        // Handle specific foreign key error
        if (errorMessage.includes('FOREIGN KEY constraint') || errorMessage.includes('vehicle_id')) {
          errorMessage = `Vehicle with ID ${vehicle_id} not found in the system. Please check the vehicle ID.`;
        }
        
        return JSON.stringify({
          status: "error",
          message: `Booking failed: ${errorMessage}`,
          code: bookingResponse.status
        });
      }
      
      // FIXED: Add type assertion here
      const bookingData = await bookingResponse.json() as BookingApiResponse;
      console.log("[AI] Booking created successfully:", bookingData);
      
      return JSON.stringify({
        status: "success",
        message: `✅ Booking #${bookingData.data?.booking_id || bookingData.booking_id} created successfully for ${vehicleName}!`,
        booking_id: bookingData.data?.booking_id || bookingData.booking_id,
        vehicle_id: vehicle_id,
        vehicle_name: vehicleName,
        dates: `${startDate.toISOString().split('T')[0]} to ${returnDate.toISOString().split('T')[0]}`,
        duration: `${days} days`,
        total_amount: total_amount,
        daily_rate: vehiclePrice,
        next_step: "Please proceed to payment to confirm your booking.",
        dashboard_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/bookings/${bookingData.data?.booking_id || bookingData.booking_id}`
      });

    } catch (error: any) {
      console.error("❌ Error in create_booking:", error);
      return JSON.stringify({
        status: "error",
        message: `Booking failed: ${error.message}`
      });
    }
  }
};


// import { createBookingService } from "../bookings-module/bookings.service.js";
// import { 
//   getVehicleByIdService, 
//   getAvailableVehiclesService,
//   getAllVehiclesService 
// } from "../vehicles/vehicles.service.js";

// import { Vehicle } from "./ai-tools.types.js";
// import { VehicleApiResponse } from "./ai-tools.types.js";
// import { BookingApiResponse } from "./ai-tools.types.js";
// import { CheckAvailabilityParams } from "./ai-tools.types.js";




// // Helper function to search vehicles with search query
// const searchAvailableVehicles = async (searchQuery: string) => {
//   try {
//     // First get all available vehicles
//     const allAvailable = await getAvailableVehiclesService();
    
//     // Filter by search query if provided
//     if (!searchQuery) {
//       return allAvailable;
//     }
    
//     const queryLower = searchQuery.toLowerCase();
    
//     return allAvailable.filter(vehicle => 
//       vehicle.manufacturer?.toLowerCase().includes(queryLower) ||
//       vehicle.model?.toLowerCase().includes(queryLower) ||
//       vehicle.vehicle_type?.toLowerCase().includes(queryLower) ||
//       vehicle.features?.toLowerCase().includes(queryLower) ||
//       vehicle.color?.toLowerCase().includes(queryLower) ||
//       vehicle.fuel_type?.toLowerCase().includes(queryLower)
//     );
    
//   } catch (error) {
//     console.error("Error searching vehicles:", error);
//     throw error;
//   }
// };



// // In aiTools.ts - update toolsSchema
// export const toolsSchema = [
//   {
//     name: "check_availability",
//     description: "Search for available vehicles based on type, make, model, color, features, or seating capacity. Returns vehicle IDs, names, prices, and details.",
//     parameters: {
//       type: "OBJECT",
//       properties: {
//         searchQuery: {
//           type: "STRING",
//           description: "Search keyword (e.g., Toyota, SUV, black, automatic, 4-seater, luxury, sports car)",
//         },
//       },
//       required: ["searchQuery"],
//     },
//   },
//   {
//     name: "create_booking",
//     description: "Creates a booking for the authenticated user. Requires vehicle ID from search results, number of days, and start date.",
//     parameters: {
//       type: "OBJECT",
//       properties: {
//         vehicle_id: {
//           type: "NUMBER",
//           description: "ID of the vehicle to rent (get this from check_availability results)",
//         },
//         days: {
//           type: "NUMBER",
//           description: "Number of rental days (e.g., 3 for 3 days)",
//         },
//         start_date: {
//           type: "STRING",
//           description: "Start date in YYYY-MM-DD format or DD/MM/YYYY format (e.g., 2025-12-12 or 12/12/2025)",
//         },
//       },
//       required: ["vehicle_id", "days", "start_date"],
//     },
//   },
// ];

// // TOOL FUNCTION IMPLEMENTATION
// export const toolsFunctions = {



// // In aiTools.ts - update the check_availability function
// check_availability: async ({ searchQuery }: { searchQuery: string }) => {
//   try {
//     console.log(`[AI] Searching available vehicles for: '${searchQuery}'`);

//     const vehicles = await searchAvailableVehicles(searchQuery);

//     if (!vehicles || vehicles.length === 0) {
//       return JSON.stringify({
//         success: false,
//         message: `No available vehicles found matching "${searchQuery}".`,
//         suggestions: ["Try searching for Toyota, SUV, Sedan, or specific features."]
//       });
//     }

//     const formatted = vehicles.map((v: any) => ({
//       id: v.vehicle_id,
//       name: `${v.manufacturer} ${v.model} (${v.year})`,
//       type: v.vehicle_type || 'Not specified',
//       price: v.rental_rate,
//       color: v.color,
//       fuel_type: v.fuel_type,
//       transmission: v.transmission,
//       seating_capacity: v.seating_capacity,
//       features: v.features,
//       status: v.status,
//       on_promo: v.on_promo,
//       available: v.status === 'available'
//     }));

//     // Format response with clear IDs for AI
//     const vehicleListText = formatted.map(v => 
//       `ID: ${v.id} - ${v.name} (${v.type}, ${v.color}, ${v.seating_capacity} seats) - $${v.price}/day`
//     ).join('\n');

//     return JSON.stringify({
//       success: true,
//       count: formatted.length,
//       vehicles: formatted,
//       summary: `Found ${formatted.length} available vehicles:\n${vehicleListText}`,
//       instruction: "To book a vehicle, provide: vehicle ID, start date (YYYY-MM-DD), and number of days."
//     });

//   } catch (error: any) {
//     console.error("❌ Error in check_availability:", error);
//     return JSON.stringify({
//       success: false,
//       error: `Sorry, there was an error searching for vehicles: ${error.message}`
//     });
//   }
// },



//   // In aiTools.ts - update create_booking to handle different date formats
// create_booking: async (
//   { vehicle_id, days, start_date }: { vehicle_id: number; days: number; start_date: string },
//   userId: string,
//   authHeader: string
// ) => {
//   try {
//     console.log(`[AI] Creating booking for user ${userId} on vehicle ${vehicle_id}`);
//     console.log(`[AI] Start date: ${start_date}, Days: ${days}`);
    
//     // Parse date - handle different formats
//     let startDate: Date;
    
//     // Try different date formats
//     if (start_date.includes('/')) {
//       // Format: "12/12/2025" or "12/12/2025 to 14/12/2025"
//       const datePart = start_date.split(' to ')[0].trim(); // Take first part if range
//       const [day, month, year] = datePart.split('/').map(Number);
//       startDate = new Date(year, month - 1, day);
//     } else if (start_date.includes('-')) {
//       // Format: "2025-12-12"
//       startDate = new Date(start_date);
//     } else {
//       // Try parsing as is
//       startDate = new Date(start_date);
//     }
    
//     if (isNaN(startDate.getTime())) {
//       return JSON.stringify({
//         status: "error",
//         message: "Invalid date format. Please use YYYY-MM-DD (e.g., 2025-12-12) or DD/MM/YYYY"
//       });
//     }
    
//     // Calculate return date
//     const returnDate = new Date(startDate);
//     returnDate.setDate(startDate.getDate() + days);
    
//     console.log(`[AI] Parsed start: ${startDate.toISOString().split('T')[0]}, Return: ${returnDate.toISOString().split('T')[0]}`);
    
//     // First, verify vehicle exists
//     let vehiclePrice = 0;
//     let vehicleName = "Unknown Vehicle";
//     let vehicleExists = false;
    
//     try {
//       const vehicleResponse = await fetch(`http://localhost:3000/api/vehicles/${vehicle_id}`, {
//         headers: {
//           'Authorization': authHeader,
//           'Content-Type': 'application/json'
//         }
//       });
      
//     //   if (vehicleResponse.ok) {
//     //     const vehicleData = await vehicleResponse.json();
//     //     vehiclePrice = vehicleData.data?.rental_rate || vehicleData.rental_rate || 0;
//     //     vehicleName = `${vehicleData.data?.manufacturer || ''} ${vehicleData.data?.model || ''}`.trim();
//     //     vehicleExists = true;
//     //     console.log(`[AI] Vehicle found: ${vehicleName}, Price: $${vehiclePrice}/day`);
//     //   } else {
//     //     console.warn(`[AI] Vehicle ${vehicle_id} not found or access denied`);
//     //   }
//     // } catch (error) {
//     //   console.error("[AI] Error fetching vehicle:", error);
//     // }
//     if (vehicleResponse.ok) {
//   const vehicleData = await vehicleResponse.json() as VehicleApiResponse; // ADD THIS TYPE
//   vehiclePrice = vehicleData.data?.rental_rate || vehicleData.rental_rate || 0;
//   vehicleName = `${vehicleData.data?.manufacturer || ''} ${vehicleData.data?.model || ''}`.trim();
//   vehicleExists = true;
//   console.log(`[AI] Vehicle found: ${vehicleName}, Price: $${vehiclePrice}/day`);
// } else {
//   console.warn(`[AI] Vehicle ${vehicle_id} not found or access denied`);
// }
    
//     if (!vehicleExists) {
//       return JSON.stringify({
//         status: "error",
//         message: `Vehicle with ID ${vehicle_id} not found. Please check the vehicle ID and try again.`
//       });
//     }
    
//     // Calculate total amount
//     const total_amount = vehiclePrice * days;
    
//     const bookingPayload = {
//       vehicle_id,
//       booking_date: startDate.toISOString().split('T')[0],
//       return_date: returnDate.toISOString().split('T')[0],
//       total_amount: total_amount,
//     };
    
//     console.log("[AI] Booking payload:", bookingPayload);
    
//     // Call booking endpoint
//     const bookingResponse = await fetch('http://localhost:3000/api/bookings', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': authHeader,
//       },
//       body: JSON.stringify(bookingPayload),
//     });
    
//     if (!bookingResponse.ok) {
//       const errorText = await bookingResponse.text();
//       console.error("[AI] Booking failed:", errorText);
      
//       let errorMessage = "Unknown error";
//       try {
//         const errorData = JSON.parse(errorText);
//         errorMessage = errorData.error || errorData.message || errorText;
//       } catch {
//         errorMessage = errorText;
//       }
      
//       // Handle specific foreign key error
//       if (errorMessage.includes('FOREIGN KEY constraint') || errorMessage.includes('vehicle_id')) {
//         errorMessage = `Vehicle with ID ${vehicle_id} not found in the system. Please check the vehicle ID.`;
//       }
      
//       return JSON.stringify({
//         status: "error",
//         message: `Booking failed: ${errorMessage}`,
//         code: bookingResponse.status
//       });
//     }
    
//     // const bookingData = await bookingResponse.json();
//     const bookingData = await bookingResponse.json() as BookingApiResponse; // ADD THIS TYPE
//     console.log("[AI] Booking created successfully:", bookingData);
    
//     // return JSON.stringify({
//     //   status: "success",
//     //   message: `✅ Booking #${bookingData.data?.booking_id || bookingData.booking_id} created successfully for ${vehicleName}!`,
//     //   booking_id: bookingData.data?.booking_id || bookingData.booking_id,
//     //   vehicle_id: vehicle_id,
//     //   vehicle_name: vehicleName,
//     //   dates: `${startDate.toISOString().split('T')[0]} to ${returnDate.toISOString().split('T')[0]}`,
//     //   duration: `${days} days`,
//     //   total_amount: total_amount,
//     //   daily_rate: vehiclePrice,
//     //   next_step: "Please proceed to payment to confirm your booking.",
//     //   dashboard_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/bookings/${bookingData.data?.booking_id || bookingData.booking_id}`
//     // });

//     return JSON.stringify({
//   status: "success",
//   message: `✅ Booking #${bookingData.data?.booking_id || bookingData.booking_id} created successfully for ${vehicleName}!`,
//   booking_id: bookingData.data?.booking_id || bookingData.booking_id,
//   vehicle_id: vehicle_id,
//   vehicle_name: vehicleName,
//   dates: `${startDate.toISOString().split('T')[0]} to ${returnDate.toISOString().split('T')[0]}`,
//   duration: `${days} days`,
//   total_amount: total_amount,
//   daily_rate: vehiclePrice,
//   next_step: "Please proceed to payment to confirm your booking.",
//   dashboard_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/bookings/${bookingData.data?.booking_id || bookingData.booking_id}`
// });

//   // } catch (error: any) {
//   //   console.error("❌ Error in create_booking:", error);
//   //   return JSON.stringify({
//   //     status: "error",
//   //     message: `Booking failed: ${error.message}`
//   //   }
//   // );
