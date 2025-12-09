import { Context } from "hono";
import {
  createVehicleService,
  getAllVehiclesService,
  getVehicleByIdService,
  updateVehicleService,
  deleteVehicleService,
  getAvailableVehiclesService,
  updateVehicleStatusService
} from "./vehicles.service";
import { VehicleSchema, VehicleStatusSchema } from "../validators/vehicle.validators";

// Create new vehicle
export const createVehicle = async (c: Context) => {
  try {
    const body = await c.req.json();

    // Validate input
    const validation = VehicleSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const vehicle = await createVehicleService(validation.data);
    
    return c.json({
      message: "Vehicle created successfully 🎉",
      data: vehicle
    }, 201);

  } catch (error: any) {
    console.error("Error creating vehicle:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get all vehicles
export const getAllVehicles = async (c: Context) => {
  try {
    const { status, vehicleSpec_id, available } = c.req.query();
    
    const vehicles = await getAllVehiclesService({
      status: status as string,
      vehicleSpec_id: vehicleSpec_id ? parseInt(vehicleSpec_id) : undefined,
      available: available === 'true'
    });

    if (!vehicles || vehicles.length === 0) {
      return c.json({ message: "No vehicles found" }, 404);
    }

    return c.json({
      message: "Vehicles retrieved successfully",
      data: vehicles,
      count: vehicles.length
    }, 200);

  } catch (error: any) {
    console.error("Error retrieving vehicles:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get available vehicles -in order for renting
export const getAvailableVehicles = async (c: Context) => {
  try {
    const vehicles = await getAvailableVehiclesService();
    
    if (!vehicles || vehicles.length === 0) {
      return c.json({ message: "No available vehicles found" }, 404);
    }

    return c.json({
      message: "Available vehicles retrieved successfully",
      data: vehicles,
      count: vehicles.length
    }, 200);

  } catch (error: any) {
    console.error("Error retrieving available vehicles:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Get vehicle by ID
export const getVehicleById = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle ID" }, 400);
    }

    const vehicle = await getVehicleByIdService(id);
    
    if (!vehicle) {
      return c.json({ error: "Vehicle not found" }, 404);
    }

    return c.json({
      message: "Vehicle retrieved successfully",
      data: vehicle
    }, 200);

  } catch (error: any) {
    console.error("Error retrieving vehicle:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Update vehicle
export const updateVehicle = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle ID" }, 400);
    }

    const body = await c.req.json();

    // Validate input to be exact as our zod 
    const validation = VehicleSchema.partial().safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const updatedVehicle = await updateVehicleService(id, validation.data);
    
    if (!updatedVehicle) {
      return c.json({ error: "Vehicle not found or no changes made" }, 404);
    }

    return c.json({
      message: "Vehicle updated successfully 🎉",
      data: updatedVehicle
    }, 200);

  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};

// Update vehicle status
export const updateVehicleStatus = async (c: Context) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle ID" }, 400);
    }

    const body = await c.req.json();

    // Validate status update
    const validation = VehicleStatusSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return c.json({ error: "Validation failed", details: errorMessages }, 400);
    }

    const updatedVehicle = await updateVehicleStatusService(id, validation.data.status);
    
    if (!updatedVehicle) {
      return c.json({ error: "Vehicle not found" }, 404);
    }

    return c.json({
      message: `Vehicle status updated to ${validation.data.status} successfully`,
      data: updatedVehicle
    }, 200);

  } catch (error: any) {
    console.error("Error updating vehicle status:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};



















// // Delete vehicle
// export const deleteVehicle = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid vehicle ID" }, 400);
//     }

//     const deleted = await deleteVehicleService(id);
    
//     if (!deleted) {
//       return c.json({ error: "Vehicle not found" }, 404);
//     }

//     return c.json({
//       message: "Vehicle deleted successfully"
//     }, 200);

//   } catch (error: any) {
//     console.error("Error deleting vehicle:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// Delete vehicle controller function
export const deleteVehicle = async (c: Context) => {
  try {
    // Hono params are strings, we parse them
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid vehicle ID provided" }, 400);
    }

    const deleted = await deleteVehicleService(id);
    
    if (!deleted) {
      // If service returns false, the record wasn't found in the DB
      return c.json({ error: "Vehicle not found" }, 404);
    }

    return c.json({
      message: `Vehicle ${id} deleted successfully`
    }, 200);

  } catch (error) {
    console.error("Error deleting vehicle in controller:", error);
    // Return a generic internal error message to the client for safety
    return c.json({ error: "Internal server error during deletion process" }, 500);
  }
};




// import { Context } from "hono";
// import {
//   createVehicleService,
//   getAllVehiclesService,
//   getVehicleByIdService,
//   updateVehicleService,
//   deleteVehicleService,
//   getAvailableVehiclesService,
//   updateVehicleStatusService
// } from "./vehicles.service";
// import { VehicleSchema, VehicleStatusSchema } from "../validators/vehicle.validators";

// // Create new vehicle
// export const createVehicle = async (c: Context) => {
//   try {
//     const body = await c.req.json();

//     // Validate input
//     const validation = VehicleSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }

//     const vehicle = await createVehicleService(validation.data);
    
//     return c.json({
//       message: "Vehicle created successfully 🎉",
//       data: vehicle
//     }, 201);

//   } catch (error: any) {
//     console.error("Error creating vehicle:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get all vehicles
// export const getAllVehicles = async (c: Context) => {
//   try {
//     const { status, vehicleSpec_id, available } = c.req.query();
    
//     const vehicles = await getAllVehiclesService({
//       status: status as string,
//       vehicleSpec_id: vehicleSpec_id ? parseInt(vehicleSpec_id) : undefined,
//       available: available === 'true'
//     });

//     if (!vehicles || vehicles.length === 0) {
//       return c.json({ message: "No vehicles found" }, 404);
//     }

//     return c.json({
//       message: "Vehicles retrieved successfully",
//       data: vehicles,
//       count: vehicles.length
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving vehicles:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get available vehicles -in order for renting
// export const getAvailableVehicles = async (c: Context) => {
//   try {
//     const vehicles = await getAvailableVehiclesService();
    
//     if (!vehicles || vehicles.length === 0) {
//       return c.json({ message: "No available vehicles found" }, 404);
//     }

//     return c.json({
//       message: "Available vehicles retrieved successfully",
//       data: vehicles,
//       count: vehicles.length
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving available vehicles:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Get vehicle by ID
// export const getVehicleById = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid vehicle ID" }, 400);
//     }

//     const vehicle = await getVehicleByIdService(id);
    
//     if (!vehicle) {
//       return c.json({ error: "Vehicle not found" }, 404);
//     }

//     return c.json({
//       message: "Vehicle retrieved successfully",
//       data: vehicle
//     }, 200);

//   } catch (error: any) {
//     console.error("Error retrieving vehicle:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Update vehicle
// export const updateVehicle = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid vehicle ID" }, 400);
//     }

//     const body = await c.req.json();

//     // Validate input to be exact as our zod 
//     const validation = VehicleSchema.partial().safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }

//     const updatedVehicle = await updateVehicleService(id, validation.data);
    
//     if (!updatedVehicle) {
//       return c.json({ error: "Vehicle not found or no changes made" }, 404);
//     }

//     return c.json({
//       message: "Vehicle updated successfully 🎉",
//       data: updatedVehicle
//     }, 200);

//   } catch (error: any) {
//     console.error("Error updating vehicle:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // Update vehicle status
// export const updateVehicleStatus = async (c: Context) => {
//   try {
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid vehicle ID" }, 400);
//     }

//     const body = await c.req.json();

//     // Validate status update
//     const validation = VehicleStatusSchema.safeParse(body);
//     if (!validation.success) {
//       const errorMessages = validation.error.issues.map(issue => ({
//         field: issue.path.join('.'),
//         message: issue.message
//       }));
//       return c.json({ error: "Validation failed", details: errorMessages }, 400);
//     }

//     const updatedVehicle = await updateVehicleStatusService(id, validation.data.status);
    
//     if (!updatedVehicle) {
//       return c.json({ error: "Vehicle not found" }, 404);
//     }

//     return c.json({
//       message: `Vehicle status updated to ${validation.data.status} successfully`,
//       data: updatedVehicle
//     }, 200);

//   } catch (error: any) {
//     console.error("Error updating vehicle status:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };

// // // Delete vehicle
// // export const deleteVehicle = async (c: Context) => {
// //   try {
// //     const id = parseInt(c.req.param('id'));
    
// //     if (isNaN(id) || id <= 0) {
// //       return c.json({ error: "Invalid vehicle ID" }, 400);
// //     }

// //     const deleted = await deleteVehicleService(id);
    
// //     if (!deleted) {
// //       return c.json({ error: "Vehicle not found" }, 404);
// //     }

// //     return c.json({
// //       message: "Vehicle deleted successfully"
// //     }, 200);

// //   } catch (error: any) {
// //     console.error("Error deleting vehicle:", error);
// //     return c.json({ error: error.message || "Internal server error" }, 500);
// //   }
// // };
// // Delete vehicle controller function
// export const deleteVehicle = async (c: Context) => {
//   try {
//     // Hono params are strings, we parse them
//     const id = parseInt(c.req.param('id'));
    
//     if (isNaN(id) || id <= 0) {
//       return c.json({ error: "Invalid vehicle ID provided" }, 400);
//     }

//     const deleted = await deleteVehicleService(id);
    
//     if (!deleted) {
//       // If service returns false, the record wasn't found in the DB
//       return c.json({ error: "Vehicle not found" }, 404);
//     }

//     return c.json({
//       message: `Vehicle ${id} deleted successfully`
//     }, 200);

//   } catch (error) {
//     console.error("Error deleting vehicle in controller:", error);
//     // Return a generic internal error message to the client for safety
//     return c.json({ error: "Internal server error during deletion process" }, 500);
//   }
// };