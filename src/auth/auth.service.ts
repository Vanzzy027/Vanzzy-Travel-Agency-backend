import { getDbPool } from "../db/dbconfig";
import sql from 'mssql';

export const createUserService = async (
  first_name: string,
  last_name: string,
  email: string,
  contact_phone: string,
  password: string,
  address: string,
  nationat_id: Number
): Promise<string> => {
  try {
    const db = await getDbPool(); 

   
    const query = `
      INSERT INTO Users (first_name, last_name, email, contact_phone, password, address, role, national_id)
      VALUES (@first_name, @last_name, @email, @contact_phone, @password, @address, 'user', @national_id)
    `;

    const result = await db
      .request()
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("email", sql.NVarChar, email)
      .input("contact_phone", sql.NVarChar, contact_phone)
      .input("password", sql.NVarChar, password)
      .input("address", sql.NVarChar, address)
      .input("national_id", sql.Int, nationat_id)
      .query(query);

    if (result.rowsAffected[0] > 0) {
      return "User Registered successfully 🎊";
    } else {
      return "Failed to register user";
    }

  } catch (error: any) {
    console.error("Error inserting user:", error);
    
    // Handle specific SQL errors
    if (error.number === 2627) {
      return "Email already exists";
    }
    
    return error.message || "Database insertion failed";
  }
};

// import { getDbPool } from "../db/dbconfig";
// import sql from 'mssql';

// export const createUserService = async (
//   first_name: string,
//   last_name: string,
//   email: string,
//   contact_phone: string,
//   password: string,
//   address: string, 

// ): Promise<string> => {
//   try {
//     const db = await getDbPool(); 

//     const query = `
//       INSERT INTO Users (first_name, last_name, email, contact_phone, password, address, role)
//       VALUES (@first_name, @last_name, @email, @contact_phone, @password, @address, 'user')
//     `;

//     const result = await db
//       .request()
//       .input("first_name", sql.NVarChar, first_name)
//       .input("last_name", sql.NVarChar, last_name)
//       .input("email", sql.NVarChar, email)
//       .input("contact_phone", sql.NVarChar, contact_phone)
//       .input("password", sql.NVarChar, password)
//       .input("address", sql.NVarChar, address)
//       .query(query);

//     if (result.rowsAffected[0] > 0) {
//       return "User Registered successfully 🎊";
//     } else {
//       return "Failed to register user";
//     }

//   } catch (error: any) {
//     console.error("Error inserting user:", error);
    
//     // Handle specific SQL errors
//     if (error.number === 2627) { // Unique constraint violation
//       return "Email already exists";
//     }
    
//     return error.message || "Database insertion failed";
//   }
// };






