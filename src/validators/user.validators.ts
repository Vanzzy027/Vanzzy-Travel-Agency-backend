import { z } from 'zod';

// schema defination
export const UserRegistrationSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters long."),
    last_name: z.string().min(2, "Last name must be at least 2 characters long."),
    email: z.string().email("Invalid email format."),
    phone_number: z.string().regex(/^\+?254\d{9}$/, "Invalid Kenyan phone number format (e.g., +254XXXXXXXX)."),
    password: z.string().min(6, "Password must be at least 8 characters long."),
    password_confirm: z.string().min(6, "Password confirmation is required."), // 💡 FIX: Added missing comma
    status: z.enum(["active", "inactive", "banned"]).optional()

}).refine(data => data.password === data.password_confirm, {
    message: "Passwords do not match.",
    path: ["password_confirm"], 
});


export const UserUpdateSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters long.").optional(),
    last_name: z.string().min(2, "Last name must be at least 2 characters long.").optional(),
    email: z.string().email("Invalid email format.").optional(), 
    status: z.enum(["active", "inactive", "banned"]).optional(),
    phone_number: z.string().regex(/^\+?254\d{9}$/, "Invalid Kenyan phone number format (e.g., +254XXXXXXXXX).").optional(),

    role: z.enum(['superAdmin', 'admin', 'user']).optional(),
    
}).strict(); 


export type UserRegistrationType = z.infer<typeof UserRegistrationSchema>;
export type UserUpdateType = z.infer<typeof UserUpdateSchema>;




// changing a user's role (Super Admin action)
export const ChangeRoleSchema = z.object({
    role: z.enum(['superAdmin', 'admin', 'user'], {
        error: "Role is required and must be a valid type.",
    }),
}).strict(); 

export type ChangeRoleType = z.infer<typeof ChangeRoleSchema>;


interface UserPayload {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string; 
    address: string;
}