import { getDbPool } from "../db/dbconfig";
import sql from 'mssql';

export interface Vehicle {
  vehicle_id?: number;
  vehicleSpec_id: number;
  vin_number: string;
  license_plate: string;
  current_mileage: number;
  rental_rate: number;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Unavailable' | 'Banned';
  created_at?: Date;
  updated_at?: Date;
}

export interface VehicleWithSpecs extends Vehicle {
  // Joined fields from VehicleSpecifications
  manufacturer?: string;
  model?: string;
  year?: number;
  fuel_type?: string;
  transmission?: string;
  seating_capacity?: number;
  color?: string;
  features?: string;
  images?: string;
  vehicle_type?: String;
}

export interface VehicleUpdateData {
  vehicleSpec_id?: number;
  vin_number?: string;
  license_plate?: string;
  current_mileage?: number;
  rental_rate?: number;
  status?: 'Available' | 'Rented' | 'Maintenance' | 'Unavailable' | 'Banned';
}

// Create new vehicle
export const createVehicleService = async (data: Omit<Vehicle, 'vehicle_id'>): Promise<Vehicle> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      INSERT INTO Vehicles (
        vehicleSpec_id, vin_number, license_plate, current_mileage, rental_rate, status
      )
      OUTPUT INSERTED.*
      VALUES (
        @vehicleSpec_id, @vin_number, @license_plate, @current_mileage, @rental_rate, @status
      )
    `;

    const result = await pool.request()
      .input('vehicleSpec_id', sql.Int, data.vehicleSpec_id)
      .input('vin_number', sql.NVarChar, data.vin_number)
      .input('license_plate', sql.NVarChar, data.license_plate)
      .input('current_mileage', sql.Int, data.current_mileage)
      .input('rental_rate', sql.Decimal(10, 2), data.rental_rate)
      .input('status', sql.NVarChar, data.status || 'Available')
      .query(query);

    return result.recordset[0] as Vehicle;

  } catch (error: any) {
    console.error("Error creating vehicle:", error);
    
    // Handle specific SQL errors
    if (error.number === 2627) { // Unique constraint violation
      if (error.message.includes('vin_number')) {
        throw new Error("VIN number already exists");
      } else if (error.message.includes('license_plate')) {
        throw new Error("License plate already exists");
      }
    }
    
    if (error.number === 547) { // Foreign key constraint
      throw new Error("Invalid vehicle specification ID");
    }
    
    throw new Error(error.message || "Failed to create vehicle");
  }
};

// Get all vehicles with optional filtering and join with specifications
export const getAllVehiclesService = async (filters?: {
  status?: string;
  vehicleSpec_id?: number;
  available?: boolean;
}): Promise<VehicleWithSpecs[]> => {
  try {
    const pool = await getDbPool();
    
    let query = `
      SELECT 
        v.*,
        vs.manufacturer,
        vs.model,
        vs.year,
        vs.fuel_type,
        vs.transmission,
        vs.seating_capacity,
        vs.color,
        vs.features,
        vs.images,
        vs.on_promo
      FROM Vehicles v
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE 1=1
    `;
    
    const request = pool.request();

    if (filters?.status) {
      query += ` AND v.status = @status`;
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters?.vehicleSpec_id) {
      query += ` AND v.vehicleSpec_id = @vehicleSpec_id`;
      request.input('vehicleSpec_id', sql.Int, filters.vehicleSpec_id);
    }

    if (filters?.available) {
      query += ` AND v.status = 'Available'`;
    }

    query += ` ORDER BY v.created_at DESC`;

    const result = await request.query(query);
    return result.recordset as VehicleWithSpecs[];

  } catch (error: any) {
    console.error("Error retrieving vehicles:", error);
    throw new Error("Failed to retrieve vehicles");
  }
};

// Get available vehicles
export const getAvailableVehiclesService = async (): Promise<VehicleWithSpecs[]> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      SELECT 
        v.*,
        vs.manufacturer,
        vs.model,
        vs.year,
        vs.fuel_type,
        vs.transmission,
        vs.seating_capacity,
        vs.color,
        vs.features,
        vs.images,
        vs.on_promo
      FROM Vehicles v
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE v.status = 'Available'
      ORDER BY vs.manufacturer, vs.model
    `;
    
    const result = await pool.request().query(query);
    return result.recordset as VehicleWithSpecs[];

  } catch (error: any) {
    console.error("Error retrieving available vehicles:", error);
    throw new Error("Failed to retrieve available vehicles");
  }
};

// Get vehicle by ID with specifications
export const getVehicleByIdService = async (id: number): Promise<VehicleWithSpecs | null> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      SELECT 
        v.*,
        vs.manufacturer,
        vs.model,
        vs.year,
        vs.fuel_type,
        vs.transmission,
        vs.seating_capacity,
        vs.color,
        vs.features,
        vs.images,
        vs.on_promo
      FROM Vehicles v
      INNER JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
      WHERE v.vehicle_id = @id
    `;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as VehicleWithSpecs;

  } catch (error: any) {
    console.error("Error retrieving vehicle:", error);
    throw new Error("Failed to retrieve vehicle");
  }
};

// Update vehicle
export const updateVehicleService = async (id: number, data: VehicleUpdateData): Promise<Vehicle | null> => {
  try {
    const pool = await getDbPool();
    
    const fields: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    // dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (typeof value === 'string') {
          request.input(key, sql.NVarChar, value);
        } else if (typeof value === 'number') {
          if (key === 'rental_rate') {
            request.input(key, sql.Decimal(10, 2), value);
          } else {
            request.input(key, sql.Int, value);
          }
        }
      }
    });

    if (fields.length === 0) {
      throw new Error("No update data provided");
    }

    fields.push('updated_at = GETDATE()');

    const query = `
      UPDATE Vehicles 
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE vehicle_id = @id
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as Vehicle;

  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    
    // Handle specific SQL errors
    if (error.number === 2627) { // Unique constraint violation
      if (error.message.includes('vin_number')) {
        throw new Error("VIN number already exists");
      } else if (error.message.includes('license_plate')) {
        throw new Error("License plate already exists");
      }
    }
    
    if (error.number === 547) { // Foreign key constraint
      throw new Error("Invalid vehicle specification ID");
    }
    
    throw new Error("Failed to update vehicle");
  }
};

// Update vehicle status only
export const updateVehicleStatusService = async (id: number, status: string): Promise<Vehicle | null> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      UPDATE Vehicles 
      SET status = @status, updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE vehicle_id = @id
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as Vehicle;

  } catch (error: any) {
    console.error("Error updating vehicle status:", error);
    throw new Error("Failed to update vehicle status");
  }
};

// Delete vehicle service function
export const deleteVehicleService = async (id: number): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    
    const query = `DELETE FROM Vehicles WHERE vehicle_id = @id`;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    // returns true if one or more rows were affected
    return result.rowsAffected[0] > 0;

  } catch (error) { // Type is unknown by default in modern TS
    console.error("Error deleting vehicle in service layer:", error);
    // Rethrow a more specific error if desired, or a generic one
    throw new Error("Failed to delete vehicle due to database error");
  }
};