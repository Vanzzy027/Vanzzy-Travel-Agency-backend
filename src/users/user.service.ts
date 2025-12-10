import { getDbPool } from '../db/dbconfig.js';
import sql from 'mssql';


export interface UserDBRecord {
    user_id: string; 
    first_name: string;
    last_name: string;
    email: string;
    contact_phone: string;
    password: string; 
    address: string | null;
    photo: string | null;
    role: string;
    status: 'active' | 'inactive' | 'banned';
    verified: boolean;
    otp_code: string | null;
    otp_expires_at: Date | null;
    created_at: Date;
    updated_at: Date | null;
    national_id: number;
}

export interface UserUpdateData {
    first_name?: string;
    last_name?: string;
    email?: string;
    contact_phone?: string;
    address?: string;
    photo?: string;
    role?: 'user' | 'admin' | 'superAdmin';
    status?: 'active' | 'inactive' | 'banned';
    verified?: boolean;
    password: string;
}

// Get All Users Service

export const getAllUsersService = async (): Promise<any[]> => {
    const db = getDbPool();

    const query = `
        SELECT 
            user_id,
            first_name,
            last_name,
            email,
            contact_phone,
            address,
            photo,
            role,
            status,
            verified,
            national_id,
            created_at,
            updated_at
        FROM Users ORDER BY created_at DESC
    `;

    try {
        const result = await db.request().query(query);

        // Convert BIT → boolean for verified
        return result.recordset.map((user: any) => ({
            ...user,
            verified: Boolean(user.verified)
        }));
        
    } catch (error) {
        console.error("Database error in getAllUsersService:", error);
        throw new Error('Failed to retrieve all users.');
    }
};






//update by id 
export const updateUserByIdService = async (
  user_id: string,
  updateData: Record<string, any>
): Promise<boolean> => {
    const db = getDbPool();

    const allowedFields: Record<string, any> = {
        first_name: sql.NVarChar(50),
        last_name: sql.NVarChar(50),
        email: sql.NVarChar(255),
        contact_phone: sql.NVarChar(20),
        address: sql.NVarChar(255),
        photo: sql.NVarChar(255),
        role: sql.NVarChar(20),
        status: sql.NVarChar(20),
        national_id: sql.VarChar(20),
        verified: sql.Bit
    };

    const fields: string[] = [];
    const request = db.request().input("user_id", sql.UniqueIdentifier, user_id);

    // Build dynamic SQL for only valid + provided fields
    for (const key in updateData) {
        if (updateData[key] !== undefined && allowedFields[key]) {
            fields.push(`${key} = @${key}`);
            request.input(key, allowedFields[key], updateData[key]);
        }
    }

    if (fields.length === 0) {
        return false; // Nothing to update
    }

    fields.push("updated_at = GETDATE()");

    const query = `
        UPDATE Users
        SET ${fields.join(", ")}
        WHERE user_id = @user_id
    `;

    try {
        const result = await request.query(query);
        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user.");
    }
};



//  Update User By ID Service 
// export const updateUserByIdService = async (user_id: string, updateData: UserUpdateData): Promise<boolean> => {
//     const db = getDbPool();

//     const fields: string[] = [];
//     const request = db.request().input('user_id', sql.Int, user_id);

//     // Build the dynamic SET clause
//     for (const key in updateData) {
//         const value = updateData[key as keyof UserUpdateData];
//         if (value !== undefined) {
//             fields.push(`${key} = @${key}`);

//             if (typeof value === 'string') {
//                 request.input(key, sql.NVarChar(255), value);
//             }
//         }
//     }

//     if (fields.length === 0) {
//         return false; 
//     }
//     fields.push('updated_at = GETDATE()');

//     const query = `
//         UPDATE Users 
//         SET ${fields.join(', ')}
//         WHERE user_id = @user_id
//     `;

//     try {
//         const result = await request.query(query);
//         // Returns true if one or more rows were affected
//         return result.rowsAffected[0] > 0;
//     } catch (error) {
//         console.error(`Database error in updateUserByIdService for ID ${user_id}:`, error);
//         throw new Error('Failed to update user data.');
//     }
// };






// Get User By Email Service 
export const getUserByEmailService = async (email: string): Promise<UserDBRecord | null> => {
  try {
    const pool = await getDbPool();
    const query = `
      SELECT 
        user_id,
        first_name,
        last_name,
        email,
        contact_phone,
        password,
        address,
        photo,
        role,
        status,
        verified,
        otp_code,
        otp_expires_at,
        created_at,
        updated_at
      FROM Users
      WHERE email = @email;
    `;
    
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query(query);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    const user = result.recordset[0] as UserDBRecord;
    // Convert BIT to boolean for verified field
    user.verified = Boolean(user.verified);
    
    return user;
  } catch (error) {
    console.error('Database error in getUserByEmailService:', error);
    throw new Error('Failed to retrieve user by email.');
  }
};

// Store OTP Service 
export const storeOTPService = async (email: string, otp: string): Promise<boolean> => {
  try {
    const pool = await getDbPool();

    const query = `
      UPDATE Users 
      SET otp_code = @otp, otp_expires_at = DATEADD(MINUTE, 15, GETDATE())
      WHERE email = @email
    `;
    
    const result = await pool.request()
      .input('otp', sql.NVarChar(10), otp)
      .input('email', sql.NVarChar(255), email)
      .query(query);
      
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP');
  }
};

// Verify OTP Service 
export const verifyOTPService = async (email: string, otp: string): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    const query = `
      SELECT user_id 
      FROM Users 
      WHERE email = @email AND otp_code = @otp AND otp_expires_at > GETDATE()
    `;
    
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('otp', sql.NVarChar(10), otp)
      .query(query);
      
    return result.recordset.length > 0;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

// Update Password Service 
export const updatePasswordService = async (email: string, hashedPassword: string): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    const query = `
      UPDATE Users 
      SET password = @password, otp_code = NULL, otp_expires_at = NULL
      WHERE email = @email
    `;
    
    const result = await pool.request()
      .input('password', sql.NVarChar(255), hashedPassword)
      .input('email', sql.NVarChar(255), email)
      .query(query);
      
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error('Error updating password:', error);
    throw new Error('Failed to update password');
  }
};



// Change User Role (Super Admin only)
export const changeUserRoleService = async (user_id: string, role: string): Promise<boolean> => {
  try {
    const pool = await getDbPool();
    
    const query = `
      UPDATE Users 
      SET role = @role, updated_at = GETDATE()
      WHERE user_id = @user_id
    `;
    
    const result = await pool.request()
      .input('role', sql.NVarChar(20), role)
      .input('user_id', sql.UniqueIdentifier, user_id)
      .query(query);
      
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error(`Error changing user role for ID ${user_id}:`, error);
    throw new Error('Failed to change user role');
  }
};



//Retrieve a user record by their user_id.

// export const getUserByIdService = async (user_id: string): Promise<Omit<UserDBRecord, 'password'> | null> => {
//     try {
//         const pool = getDbPool();
//         const query = `
//             SELECT 
//                 user_id, 
//                 first_name, 
//                 last_name, 
//                 email, 
//                 contact_phone, 
//                 role, 
//                 created_at, 
//                 updated_at
//             FROM 
//                 Users 
//             WHERE 
//                 user_id = @user_id;
//         `;
        
//         const result = await pool.request()
//             .input('user_id', sql.Int, user_id)
//             .query(query);

//         if (result.recordset.length === 0) {
//             return null;
//         }

//         return result.recordset[0] as Omit<UserDBRecord, 'password'>;

//     } catch (error) {
//         console.error('Database error in getUserByIdService:', error);
//         throw new Error('Failed to retrieve user profile.');
//     }
// };

// In user.service.ts - fix the getUserByIdService function
export const getUserByIdService = async (user_id: string): Promise<Omit<UserDBRecord, 'password'> | null> => {
    try {
        const pool = getDbPool();
        const query = `
            SELECT 
                user_id, 
                first_name, 
                last_name, 
                email, 
                contact_phone,
                address,
                photo,
                role,
                status,
                verified,
                national_id,
                created_at, 
                updated_at
            FROM 
                Users 
            WHERE 
                user_id = @user_id;
        `;
        
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id) // Changed from sql.Int to sql.UniqueIdentifier
            .query(query);

        if (result.recordset.length === 0) {
            return null;
        }

        // Convert BIT → boolean for verified
        const user = result.recordset[0];
        return {
            ...user,
            verified: Boolean(user.verified)
        };

    } catch (error) {
        console.error('Database error in getUserByIdService:', error);
        throw new Error('Failed to retrieve user profile.');
    }
};




export const deleteUserService = async (user_id: string): Promise<boolean> => {
    const db = getDbPool();
    const query = `
        DELETE FROM Users 
        WHERE user_id = @user_id
    `;

    try {
        const result = await db.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .query(query);

        return result.rowsAffected[0] === 1; 
    } catch (error) {
        console.error(`Database error in deleteUserService for ID ${user_id}:`, error);

        throw new Error('Failed to delete user.');
    }
};



// //Update user profile information based on provided data.
// export const updateUserService = async (
//     user_id: string, 
//     data: { first_name?: string, last_name?: string, contact_phone?: string }
// ): Promise<Omit<UserDBRecord, 'password'> | null> => {
    
//     const pool = getDbPool();
//     let query = 'UPDATE Users SET updated_at = GETDATE()';
//     const request = pool.request().input('user_id', sql.UniqueIdentifier, user_id);

//     if (data.first_name) {
//         query += ', first_name = @first_name';
//         request.input('first_name', sql.NVarChar(50), data.first_name);
//     }
//     if (data.last_name) {
//         query += ', last_name = @last_name';
//         request.input('last_name', sql.NVarChar(50), data.last_name);
//     }
//     if (data.contact_phone) {
//         query += ', contact_phone = @contact_phone';
//         request.input('contact_phone', sql.NVarChar(15), data.contact_phone);
//     }

//     query += ' OUTPUT INSERTED.user_id, INSERTED.first_name, INSERTED.last_name, INSERTED.email, INSERTED.contact_phone, INSERTED.user_type, INSERTED.created_at, INSERTED.updated_at WHERE user_id = @user_id;';
    
//     // Check if only user_id is set,,,, no fields were provided for update
//     if (Object.keys(request.parameters).length <= 1) {
//         throw new Error("No update data provided.");
//     }
    
//     try {
//         const result = await request.query(query);

//         if (result.recordset.length === 0) {
//             return null; // User not found
//         }
        
//         return result.recordset[0] as Omit<UserDBRecord, 'password'>;
//     } catch (error) {
//         console.error('Database error in updateUserService:', error);
//         throw new Error('Failed to update user profile.');
//     }
// };

// Update user profile information based on provided data.
export const updateUserService = async (
    user_id: string, 
    data: { 
        first_name?: string, 
        last_name?: string, 
        contact_phone?: string,
        photo?: string,
        address?: string,
        // Add other fields that exist in your Users table
    }
): Promise<Omit<UserDBRecord, 'password'> | null> => {
    
    const pool = getDbPool();
    let query = 'UPDATE Users SET updated_at = GETDATE()';
    const request = pool.request().input('user_id', sql.UniqueIdentifier, user_id);

    if (data.first_name) {
        query += ', first_name = @first_name';
        request.input('first_name', sql.NVarChar(50), data.first_name);
    }
    if (data.last_name) {
        query += ', last_name = @last_name';
        request.input('last_name', sql.NVarChar(50), data.last_name);
    }
    if (data.contact_phone) {
        query += ', contact_phone = @contact_phone';
        request.input('contact_phone', sql.NVarChar(15), data.contact_phone);
    }
    if (data.photo) {
        query += ', photo = @photo';
        request.input('photo', sql.NVarChar(sql.MAX), data.photo);
    }
    if (data.address) {
        query += ', address = @address';
        request.input('address', sql.NVarChar(200), data.address);
    }

    // Updated OUTPUT clause based on your actual table structure
    query += ` OUTPUT 
        INSERTED.user_id, 
        INSERTED.first_name, 
        INSERTED.last_name, 
        INSERTED.email, 
        INSERTED.contact_phone, 
        INSERTED.photo, 
        INSERTED.address, 
        INSERTED.role,           -- Changed from user_type to role
        INSERTED.national_id,    -- Added based on your data
        INSERTED.status,         -- Added based on your data
        INSERTED.verified,       -- Added based on your data
        INSERTED.created_at, 
        INSERTED.updated_at 
    WHERE user_id = @user_id;`;
    
    // Check if any update fields were provided
    const hasUpdateFields = Object.keys(request.parameters).length > 1;
    
    if (!hasUpdateFields) {
        throw new Error("No update data provided.");
    }
    
    try {
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return null; // User not found
        }
        
        return result.recordset[0] as Omit<UserDBRecord, 'password'>;
    } catch (error) {
        console.error('Database error in updateUserService:', error);
        throw new Error('Failed to update user profile.');
    }
};