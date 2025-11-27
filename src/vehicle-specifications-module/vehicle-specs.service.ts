import { getDbPool } from "../db/dbconfig";
import sql from 'mssql';

export interface VehicleSpec {
  vehicleSpec_id?: number;
  manufacturer: string;
  model: string;
  year: number;
  fuel_type: string;
  engine_capacity: string;
  transmission: string;
  seating_capacity: number;
  color: string;
  features: string; 
  images: string; 
  on_promo?: boolean;
  review_count?: number;
  created_at?: Date;
  updated_at?: Date;
  vehicle_type: string;
}

export interface VehicleSpecUpdateData {
  manufacturer?: string;
  model?: string;
  year?: number;
  fuel_type?: string;
  engine_capacity?: string;
  transmission?: string;
  seating_capacity?: number;
  color?: string;
  features?: string;
  images?: string;
  on_promo?: boolean;
  review_count?: number;
  //vehicle_type: string;
}

// Create new vehicle specification
export const createVehicleSpecService = async (data: Omit<VehicleSpec, 'vehicleSpec_id'>): Promise<VehicleSpec> => {
  try {
    const pool = await getDbPool();
    
const query = `
  INSERT INTO VehicleSpecifications (
    manufacturer, model, year, fuel_type, engine_capacity, transmission,
    seating_capacity, color, features, images, on_promo, review_count,
    vehicle_type  -- <-- ADDED HERE
  )
  OUTPUT INSERTED.*
  VALUES (
    @manufacturer, @model, @year, @fuel_type, @engine_capacity, @transmission,
    @seating_capacity, @color, @features, @images, @on_promo, @review_count,
    @vehicle_type  -- <-- ADDED HERE
  )
`;

    const result = await pool.request()
      .input('manufacturer', sql.NVarChar, data.manufacturer)
      .input('model', sql.NVarChar, data.model)
      .input('year', sql.Int, data.year)
      .input('fuel_type', sql.NVarChar, data.fuel_type)
      .input('engine_capacity', sql.NVarChar, data.engine_capacity)
      .input('transmission', sql.NVarChar, data.transmission)
      .input('seating_capacity', sql.Int, data.seating_capacity)
      .input('color', sql.NVarChar, data.color)
      .input('features', sql.NVarChar, data.features || '[]')
      .input('images', sql.NVarChar, data.images || '[]')
      .input('on_promo', sql.Bit, data.on_promo || false)
      .input('review_count', sql.Int, data.review_count || 0)
      .input('vehicle_type', sql.NVarChar, data.vehicle_type || 'Sedan')
      .query(query);

    return result.recordset[0] as VehicleSpec;

  } catch (error: any) {
    console.error("Error creating vehicle specification:", error);
    throw new Error(error.message || "Failed to create vehicle specification");
  }
};

// Get all vehicle specifications with optional filtering
export const getAllVehicleSpecsService = async (filters?: {
  fuel_type?: string;
  transmission?: string;
  search?: string;
}): Promise<VehicleSpec[]> => {
  try {
    const pool = await getDbPool();
    
    let query = `
      SELECT * FROM VehicleSpecifications 
      WHERE 1=1
    `;
    
    const request = pool.request();

    if (filters?.fuel_type) {
      query += ` AND fuel_type = @fuel_type`;
      request.input('fuel_type', sql.NVarChar, filters.fuel_type);
    }

    if (filters?.transmission) {
      query += ` AND transmission = @transmission`;
      request.input('transmission', sql.NVarChar, filters.transmission);
    }

    if (filters?.search) {
      query += ` AND (manufacturer LIKE @search OR model LIKE @search)`;
      request.input('search', sql.NVarChar, `%${filters.search}%`);
    }

    query += ` ORDER BY manufacturer, model`;

    const result = await request.query(query);
    return result.recordset as VehicleSpec[];

  } catch (error: any) {
    console.error("Error retrieving vehicle specifications:", error);
    throw new Error("Failed to retrieve vehicle specifications");
  }
};

// Get vehicle specification by ID
export const getVehicleSpecByIdService = async (id: number): Promise<VehicleSpec | null> => {
  try {
    const pool = await getDbPool();
    
    const query = `SELECT * FROM VehicleSpecifications WHERE vehicleSpec_id = @id`;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as VehicleSpec;

  } catch (error: any) {
    console.error("Error retrieving vehicle specification:", error);
    throw new Error("Failed to retrieve vehicle specification");
  }
};

// Update vehicle specification
export const updateVehicleSpecService = async (id: number, data: VehicleSpecUpdateData): Promise<VehicleSpec | null> => {
  try {
    const pool = await getDbPool();
    
    const fields: string[] = [];
    const request = pool.request().input('id', sql.Int, id);

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (typeof value === 'string') {
          request.input(key, sql.NVarChar, value);
        } else if (typeof value === 'number') {
          request.input(key, sql.Int, value);
        } else if (typeof value === 'boolean') {
          request.input(key, sql.Bit, value);
        }
      }
    });

    if (fields.length === 0) {
      throw new Error("No update data provided");
    }

    fields.push('updated_at = GETDATE()');

    const query = `
      UPDATE VehicleSpecifications 
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE vehicleSpec_id = @id
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as VehicleSpec;

  } catch (error: any) {
    console.error("Error updating vehicle specification:", error);
    throw new Error("Failed to update vehicle specification");
  }
};

// Delete vehicle specification
export const deleteVehicleSpecService = async (id: number): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    
    const query = `DELETE FROM VehicleSpecifications WHERE vehicleSpec_id = @id`;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    return result.rowsAffected[0] > 0;

  } catch (error: any) {
    console.error("Error deleting vehicle specification:", error);
    throw new Error("Failed to delete vehicle specification");
  }
};

// Get vehicle specifications by type (if we add vehicle_type column)
export const getVehicleSpecsByTypeService = async (vehicleType: string): Promise<VehicleSpec[]> => {
  try {
    const pool = await getDbPool();
    
    const query = `SELECT * FROM VehicleSpecifications WHERE vehicle_type = @vehicleType ORDER BY manufacturer, model`;
    
    const result = await pool.request()
      .input('vehicleType', sql.NVarChar, vehicleType)
      .query(query);

    return result.recordset as VehicleSpec[];

  } catch (error: any) {
    console.error("Error retrieving vehicle specs by type:", error);
    throw new Error("Failed to retrieve vehicle specifications by type");
  }
};