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
  // 1. Fetch from DB
  const allAvailableRaw = await getAvailableVehiclesService();

  // 2. Type Cast: Force the DB results to match our AI Vehicle interface
  const allAvailable = allAvailableRaw as unknown as Vehicle[];

  console.log(`[AI Tool] Database returned ${allAvailable.length} vehicles.`);

  // 3. Clean the query (Strip dates/garbage)
  const cleanedQuery = searchQuery
    .replace(
      /\b(\d{1,2}(st|nd|rd|th)?[\s\-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-]*\d{0,4})\b/gi,
      "",
    )
    .replace(/\b\d{4}\b/g, "")
    .replace(/\b(to|from|between|for|a|of)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  console.log(`[AI Tool] Raw: "${searchQuery}" → Cleaned: "${cleanedQuery}"`);

  // 4. Wildcard check: If they just want "any" or "available"
  if (
    !cleanedQuery ||
    cleanedQuery.toLowerCase() === "available" ||
    cleanedQuery.toLowerCase() === "any" ||
    cleanedQuery.toLowerCase() === "all"
  ) {
    return allAvailable;
  }

  const queryLower = cleanedQuery.toLowerCase();

  // 5. Filter logic
  return allAvailable.filter((v: Vehicle) => {
    const make = (v.manufacturer || "").toLowerCase();
    const model = (v.model || "").toLowerCase();
    const type = (v.vehicle_type || "").toLowerCase();
    const features = (v.features || "").toLowerCase();
    const color = (v.color || "").toLowerCase();

    return (
      make.includes(queryLower) ||
      model.includes(queryLower) ||
      type.includes(queryLower) ||
      features.includes(queryLower) ||
      color.includes(queryLower) ||
      // Smart seat matching (e.g., "family of 7" -> matches 7 seats)
      (v.seating_capacity && queryLower.includes(v.seating_capacity.toString()))
    );
  });
};

// ─── Tool Schemas ─────────────────────────────────────────────────────────────
export const toolsSchema = [
  {
    name: "check_availability",
    description:
      "Search the VansKE database for currently available rental vehicles. MUST be called before presenting any vehicle to the user.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: {
          type: "string",
          description: "Short keywords like 'SUV', 'Toyota', '7 seater'.",
        },
      },
      required: ["searchQuery"],
    },
  },
  {
    name: "create_booking",
    description: "Creates a confirmed car rental booking.",
    parameters: {
      type: "object",
      properties: {
        vehicle_id: { type: "number" },
        days: { type: "number" },
        start_date: { type: "string" },
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
        return JSON.stringify({
          success: false,
          message: `No vehicles found matching "${searchQuery}".`,
          suggestion: "Try a broader search like 'SUV' or 'Sedan'.",
        });
      }

      const formatted = vehicles.map((v: Vehicle) => ({
        id: v.vehicle_id,
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
          "Present ONLY these vehicles. Do NOT invent data. Hide the 'id' field.",
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
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
      const startDate = new Date(start_date);
      const returnDate = new Date(startDate);
      returnDate.setDate(startDate.getDate() + days);

      const vehicleResponse = await fetch(
        `${BACKEND_URL}/api/vehicles/${vehicle_id}`,
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        },
      );

      if (!vehicleResponse.ok) throw new Error("Vehicle verification failed.");

      const vehicleData = (await vehicleResponse.json()) as VehicleApiResponse;
      const rate =
        vehicleData.data?.rental_rate ?? vehicleData.rental_rate ?? 0;
      const total_amount = rate * days;

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

      if (!bookingResponse.ok) throw new Error("Booking failed.");

      return JSON.stringify({
        status: "success",
        summary: {
          vehicle: `${vehicleData.data?.manufacturer} ${vehicleData.data?.model}`,
          totalCost: `KES ${total_amount.toLocaleString()}`,
        },
        dashboard_link: `${FRONTEND_URL}/UserDashboard/my-bookings`,
      });
    } catch (error: any) {
      return JSON.stringify({ status: "error", message: error.message });
    }
  },
};
