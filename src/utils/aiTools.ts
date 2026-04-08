// src/utils/aiTools.ts
import * as dotenv from "dotenv";
import { getAvailableVehiclesService } from "../vehicles/vehicles.service.js";
import {
  Vehicle,
  VehicleApiResponse,
  BookingApiResponse,
  CheckAvailabilityParams,
} from "./ai-tools.types.js";

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

// ─── Internal vehicle search ──────────────────────────────────────────────────
const searchAvailableVehicles = async (
  searchQuery: string,
): Promise<Vehicle[]> => {
  const allAvailable = (await getAvailableVehiclesService()) as Vehicle[];

  // Empty or wildcard query — return everything
  if (!searchQuery || searchQuery.trim() === "") return allAvailable;

  // Strip any date-like patterns the model may have snuck in
  // e.g. "SUV 9th april 2026" → "SUV"
  const cleanedQuery = searchQuery
    .replace(
      /\b(\d{1,2}(st|nd|rd|th)?[\s\-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-]*\d{0,4})\b/gi,
      "",
    )
    .replace(/\b\d{4}\b/g, "") // strip standalone years
    .replace(/\b(to|from|between)\b/gi, "") // strip prepositions
    .replace(/\s{2,}/g, " ")
    .trim();

  console.log(
    `[AI Tool] Raw query: "${searchQuery}" → Cleaned: "${cleanedQuery}"`,
  );

  if (!cleanedQuery) return allAvailable;

  const queryLower = cleanedQuery.toLowerCase();

  return allAvailable.filter(
    (v) =>
      v.manufacturer?.toLowerCase().includes(queryLower) ||
      v.model?.toLowerCase().includes(queryLower) ||
      v.vehicle_type?.toLowerCase().includes(queryLower) ||
      v.features?.toLowerCase().includes(queryLower) ||
      v.color?.toLowerCase().includes(queryLower) ||
      v.fuel_type?.toLowerCase().includes(queryLower) ||
      // Seating capacity match: "4 seater", "7 seat"
      (queryLower.match(/\d+/) &&
        String(v.seating_capacity) === queryLower.match(/\d+/)?.[0]),
  );
};

// ─── Tool Schemas ─────────────────────────────────────────────────────────────
export const toolsSchema = [
  {
    name: "check_availability",
    description:
      "Search the VansKE database for currently available rental vehicles. MUST be called before presenting any vehicle to the user. searchQuery should be short keywords only — never include dates.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: {
          type: "string",
          description:
            "Short keyword(s) only. Examples: 'SUV', 'Toyota', '7 seater', 'automatic', 'diesel'. Never include dates or date ranges.",
        },
      },
      required: ["searchQuery"],
    },
  },
  {
    name: "create_booking",
    description:
      "Creates a confirmed car rental booking. Only call after: (1) user picked a vehicle from check_availability results, (2) you have start date and days, (3) user confirmed the details.",
    parameters: {
      type: "object",
      properties: {
        vehicle_id: {
          type: "number",
          description:
            "The vehicle's 'id' from the check_availability result. NEVER invent this value.",
        },
        days: {
          type: "number",
          description: "Number of rental days (positive integer)",
        },
        start_date: {
          type: "string",
          description: "Rental start date in YYYY-MM-DD format",
        },
      },
      required: ["vehicle_id", "days", "start_date"],
    },
  },
];

// ─── Tool Implementations ─────────────────────────────────────────────────────
export const toolsFunctions = {
  check_availability: async ({ searchQuery }: CheckAvailabilityParams) => {
    try {
      const vehicles = await searchAvailableVehicles(searchQuery);

      if (!vehicles || vehicles.length === 0) {
        // Be explicit — no results means no results. Do not invent.
        return JSON.stringify({
          success: false,
          resultCount: 0,
          message: `No vehicles found matching "${searchQuery}". The database returned zero results.`,
          instruction:
            "Tell the user honestly that no vehicles match their search. Suggest they try a different keyword like 'sedan', 'SUV', or 'automatic'. Do NOT suggest specific vehicles you are not certain exist.",
        });
      }

      const formatted = vehicles.map((v: Vehicle) => ({
        // Internal: used by the model for booking, MUST NOT be shown to user
        id: v.vehicle_id,
        // User-facing fields
        name: `${v.manufacturer} ${v.model}`,
        year: v.year ?? "N/A",
        pricePerDay: v.rental_rate,
        color: v.color ?? "N/A",
        transmission: v.transmission ?? "N/A",
        seats: v.seating_capacity ?? "N/A",
        fuelType: v.fuel_type ?? "N/A",
        features: v.features ?? "N/A",
        type: v.vehicle_type ?? "N/A",
      }));

      return JSON.stringify({
        success: true,
        resultCount: formatted.length,
        vehicles: formatted,
        instruction:
          "Present ONLY these vehicles to the user. Do not add, invent, or mention any other vehicles. Show: name, year, pricePerDay (as KES X/day), color, transmission, seats, fuelType, features. The 'id' field is internal — never show it.",
      });
    } catch (error: any) {
      console.error("[AI Tool] check_availability error:", error);
      return JSON.stringify({
        success: false,
        error: error.message,
        instruction:
          "Tell the user there was a database error and to try again.",
      });
    }
  },

  create_booking: async (
    {
      vehicle_id,
      days,
      start_date,
    }: { vehicle_id: number; days: number; start_date: string },
    userId: string,
    authHeader: string,
  ) => {
    try {
      console.log(
        `[AI Tool] create_booking: User ${userId}, Vehicle ${vehicle_id}, ${days} days from ${start_date}`,
      );

      // ── Parse and validate date ───────────────────────────────────────────
      const startDate = start_date.includes("/")
        ? new Date(start_date.split("/").reverse().join("-"))
        : new Date(start_date);

      if (isNaN(startDate.getTime())) {
        return JSON.stringify({
          status: "error",
          message:
            "The date format wasn't recognized. Please use a format like 2026-04-10.",
        });
      }

      const returnDate = new Date(startDate);
      returnDate.setDate(startDate.getDate() + days);

      // ── Verify vehicle exists in DB ───────────────────────────────────────
      const vehicleResponse = await fetch(
        `${BACKEND_URL}/api/vehicles/${vehicle_id}`,
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        },
      );

      if (!vehicleResponse.ok) {
        return JSON.stringify({
          status: "error",
          message:
            "The selected vehicle could not be verified. Please search again.",
        });
      }

      const vehicleData = (await vehicleResponse.json()) as VehicleApiResponse;
      const vehiclePrice =
        vehicleData.data?.rental_rate ?? vehicleData.rental_rate ?? 0;
      const make =
        vehicleData.data?.manufacturer ?? vehicleData.manufacturer ?? "";
      const model = vehicleData.data?.model ?? vehicleData.model ?? "";
      const vehicleName = `${make} ${model}`.trim() || "the selected vehicle";

      // ── Create booking ────────────────────────────────────────────────────
      const total_amount = vehiclePrice * days;

      const bookingResponse = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          vehicle_id,
          booking_date: startDate.toISOString().split("T")[0],
          return_date: returnDate.toISOString().split("T")[0],
          total_amount,
        }),
      });

      const bookingData = (await bookingResponse.json()) as BookingApiResponse;

      if (!bookingResponse.ok) {
        return JSON.stringify({
          status: "error",
          message:
            "The booking could not be completed. The vehicle may no longer be available.",
        });
      }

      // ── Human-friendly success response ──────────────────────────────────
      const fmt = (d: Date) =>
        d.toLocaleDateString("en-KE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      return JSON.stringify({
        status: "success",
        summary: {
          vehicle: vehicleName,
          pickupDate: fmt(startDate),
          returnDate: fmt(returnDate),
          duration: `${days} day${days !== 1 ? "s" : ""}`,
          totalCost: `KES ${total_amount.toLocaleString()}`,
        },
        dashboard_link: `${FRONTEND_URL}/UserDashboard/my-bookings`,
        instruction:
          "Tell the user their booking is confirmed. Share: vehicle name, pickup date, return date, duration, and total cost. Mention they can manage it from their dashboard. Do NOT mention any IDs.",
      });
    } catch (error: any) {
      console.error("[AI Tool] create_booking error:", error);
      return JSON.stringify({
        status: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  },
};

// import * as dotenv from "dotenv";
// import { getAvailableVehiclesService } from "../vehicles/vehicles.service.js";
// import {
//   Vehicle,
//   VehicleApiResponse,
//   BookingApiResponse,
//   CheckAvailabilityParams,
// } from "./ai-tools.types.js";

// dotenv.config();

// /**
//  * GLOBAL CONFIGURATION
//  * These pull from your backend .env file.
//  * Local: BACKEND_URL=http://localhost:3000
//  * Production: BACKEND_URL=https://vanske-car-rental.azurewebsites.net
//  */
// const BACKEND_URL = process.env.BACKEND_URL;
// const FRONTEND_URL = process.env.FRONTEND_URL;

// // Helper function to search vehicles
// const searchAvailableVehicles = async (
//   searchQuery: string,
// ): Promise<Vehicle[]> => {
//   try {
//     const allAvailable = await getAvailableVehiclesService();

//     if (!searchQuery) return allAvailable as Vehicle[];

//     const queryLower = searchQuery.toLowerCase();

//     return (allAvailable as Vehicle[]).filter(
//       (vehicle) =>
//         vehicle.manufacturer?.toLowerCase().includes(queryLower) ||
//         vehicle.model?.toLowerCase().includes(queryLower) ||
//         vehicle.vehicle_type?.toLowerCase().includes(queryLower) ||
//         vehicle.features?.toLowerCase().includes(queryLower) ||
//         vehicle.color?.toLowerCase().includes(queryLower) ||
//         vehicle.fuel_type?.toLowerCase().includes(queryLower),
//     );
//   } catch (error) {
//     console.error("Error searching vehicles:", error);
//     throw error;
//   }
// };

// export const toolsSchema = [
//   {
//     name: "check_availability",
//     description:
//       "Search for available vehicles. Use this when users ask for types of cars, specific brands, or general availability.",
//     parameters: {
//       type: "object", // Must be lowercase for Llama
//       properties: {
//         searchQuery: {
//           type: "string",
//           description:
//             "The search keyword (e.g., 'SUV', 'Toyota', '7 seater', 'Red car')",
//         },
//       },
//       required: ["searchQuery"],
//     },
//   },
//   {
//     name: "create_booking",
//     description:
//       "Creates a car rental booking. ONLY call this when the user has provided a Vehicle ID, the number of days, and a start date.",
//     parameters: {
//       type: "object",
//       properties: {
//         vehicle_id: {
//           type: "number",
//           description: "The unique database ID of the vehicle",
//         },
//         days: { type: "number", description: "Duration of the rental in days" },
//         start_date: {
//           type: "string",
//           description: "Start date in YYYY-MM-DD format",
//         },
//       },
//       required: ["vehicle_id", "days", "start_date"],
//     },
//   },
// ];

// export const toolsFunctions = {
//   check_availability: async ({ searchQuery }: CheckAvailabilityParams) => {
//     try {
//       console.log(`[AI] Searching vehicles for: '${searchQuery}'`);
//       const vehicles = await searchAvailableVehicles(searchQuery);

//       if (!vehicles || vehicles.length === 0) {
//         return JSON.stringify({
//           success: false,
//           message: `No available vehicles found matching "${searchQuery}".`,
//         });
//       }

//       // Inside the vehicles.map() in check_availability:
//       const formatted = vehicles.map((v: Vehicle) => ({
//         id: v.vehicle_id,
//         name: `${v.manufacturer} ${v.model}`,
//         year: v.year,
//         pricePerDay: v.rental_rate,
//         color: v.color || "N/A",
//         transmission: v.transmission || "N/A",
//         seats: v.seating_capacity || "N/A",
//         fuelType: v.fuel_type || "N/A",
//         features: v.features || "N/A", // 👈 add this line
//         type: v.vehicle_type || "N/A",
//       }));
//       // const formatted = vehicles.map((v: Vehicle) => ({
//       //   id: v.vehicle_id,
//       //   name: `${v.manufacturer} ${v.model} (${v.year})`,
//       //   price: v.rental_rate,
//       //   details: `${v.color}, ${v.transmission}, ${v.seating_capacity} seats`,
//       // }));

//       return JSON.stringify({
//         success: true,
//         count: formatted.length,
//         vehicles: formatted,
//         summary: `Found ${formatted.length} vehicles. Provide ID and dates to book.`,
//       });
//     } catch (error: any) {
//       return JSON.stringify({ success: false, error: error.message });
//     }
//   },

//   create_booking: async (
//     {
//       vehicle_id,
//       days,
//       start_date,
//     }: { vehicle_id: number; days: number; start_date: string },
//     userId: string,
//     authHeader: string,
//   ) => {
//     try {
//       console.log(
//         `[AI] Booking request: User ${userId}, Vehicle ${vehicle_id}`,
//       );

//       // Date Parsing
//       let startDate: Date = start_date.includes("/")
//         ? new Date(start_date.split("/").reverse().join("-"))
//         : new Date(start_date);

//       if (isNaN(startDate.getTime())) {
//         return JSON.stringify({
//           status: "error",
//           message: "Invalid date format. Use YYYY-MM-DD",
//         });
//       }

//       const returnDate = new Date(startDate);
//       returnDate.setDate(startDate.getDate() + days);

//       // 1. Verify Vehicle via Internal API call (using Centralized BACKEND_URL)
//       let vehiclePrice = 0;
//       let vehicleName = "Vehicle";

//       const vehicleResponse = await fetch(
//         `${BACKEND_URL}/api/vehicles/${vehicle_id}`,
//         {
//           headers: {
//             Authorization: authHeader,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       if (vehicleResponse.ok) {
//         const vehicleData =
//           (await vehicleResponse.json()) as VehicleApiResponse;
//         vehiclePrice =
//           vehicleData.data?.rental_rate || vehicleData.rental_rate || 0;
//         vehicleName =
//           `${vehicleData.data?.manufacturer || ""} ${vehicleData.data?.model || ""}`.trim();
//       } else {
//         return JSON.stringify({
//           status: "error",
//           message: "Vehicle not found.",
//         });
//       }

//       // 2. Create Booking via Internal API call
//       const total_amount = vehiclePrice * days;
//       const bookingPayload = {
//         vehicle_id,
//         booking_date: startDate.toISOString().split("T")[0],
//         return_date: returnDate.toISOString().split("T")[0],
//         total_amount,
//       };

//       const bookingResponse = await fetch(`${BACKEND_URL}/api/bookings`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: authHeader,
//         },
//         body: JSON.stringify(bookingPayload),
//       });

//       const bookingData = (await bookingResponse.json()) as BookingApiResponse;

//       if (!bookingResponse.ok) {
//         return JSON.stringify({
//           status: "error",
//           message: "Booking failed on server.",
//         });
//       }

//       // 3. Success Response with Centralized FRONTEND_URL
//       const bId = bookingData.data?.booking_id || bookingData.booking_id;
//       return JSON.stringify({
//         status: "success",
//         message: `✅ Booking #${bId} created for ${vehicleName}!`,
//         total_amount,
//         dashboard_link: `${FRONTEND_URL}/UserDashboard/my-bookings`,
//       });
//     } catch (error: any) {
//       console.error("❌ AI Booking Error:", error);
//       return JSON.stringify({ status: "error", message: error.message });
//     }
//   },
// };
