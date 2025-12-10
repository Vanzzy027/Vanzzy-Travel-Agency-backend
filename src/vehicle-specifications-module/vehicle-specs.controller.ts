import type{ Context } from "hono";
import {
  createVehicleSpecService,
  getAllVehicleSpecsService,
  getVehicleSpecByIdService,
  updateVehicleSpecService,
  deleteVehicleSpecService,
  getVehicleSpecsByTypeService
} from "./vehicle-specs.service.js";
import { VehicleSpecSchema } from "../validators/vehicle.validators.js";

// Create new vehicle specification
export const createVehicleSpec = async (c: Context) => {
  try {
    const body = await c.req.json();

    // Validate input
    const validation = VehicleSpecSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const vehicleSpec = await createVehicleSpecService(validation.data);
    
    return c.json({
      message: "Vehicle specification created successfully 🎉",
      data: vehicleSpec
    }, 201);

  } catch (error: any) {
    console.error("Error creating vehicle spec:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get all vehicle specifications
export const getAllVehicleSpecs = async (c: Context) => {
  try {
    const { type, fuel_type, transmission, search } = c.req.query();
    
    let vehicleSpecs;
    if (type) {
      vehicleSpecs = await getVehicleSpecsByTypeService(type);
    } else {
      vehicleSpecs = await getAllVehicleSpecsService({
        fuel_type: fuel_type as string,
        transmission: transmission as string,
        search: search as string
      });
    }

    if (!vehicleSpecs || vehicleSpecs.length === 0) {
      return c.json({ message: "No vehicle specifications found" }, 404);
    }

    return c.json({
      message: "Vehicle specifications retrieved successfully",
      data: vehicleSpecs,
      count: vehicleSpecs.length
    }, 200);

  } catch (error: any) {
    console.error("Error retrieving vehicle specs:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};


// Get vehicle specification by ID
export const getVehicleSpecById = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle specification ID" }, 400);
    }

    const vehicleSpec = await getVehicleSpecByIdService(id);
    
    if (!vehicleSpec) {
      return c.json({ error: "Vehicle specification not found" }, 404);
    }

    return c.json({
      message: "Vehicle specification retrieved successfully",
      data: vehicleSpec
    }, 200);

  } catch (error: any) {
    console.error("Error retrieving vehicle spec:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Update vehicle specification
export const updateVehicleSpec = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle specification ID" }, 400);
    }

    const body = await c.req.json();

    // Validate input
    const validation = VehicleSpecSchema.partial().safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const updatedSpec = await updateVehicleSpecService(id, validation.data);
    
    if (!updatedSpec) {
      return c.json({ error: "Vehicle specification not found or no changes made" }, 404);
    }

    return c.json({
      message: "Vehicle specification updated successfully 🎉",
      data: updatedSpec
    }, 200);

  } catch (error: any) {
    console.error("Error updating vehicle spec:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Delete vehicle specification
export const deleteVehicleSpec = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle specification ID" }, 400);
    }

    const deleted = await deleteVehicleSpecService(id);
    
    if (!deleted) {
      return c.json({ error: "Vehicle specification not found" }, 404);
    }

    return c.json({
      message: "Vehicle specification deleted successfully"
    }, 200);

  } catch (error: any) {
    console.error("Error deleting vehicle spec:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};