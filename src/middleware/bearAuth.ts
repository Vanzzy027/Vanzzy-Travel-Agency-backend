import "dotenv/config";
import { type Next, Context } from "hono";
import jwt from "jsonwebtoken";

//Token payload
interface DecodedToken {
    user_id: string; 
    first_name: string; 
    last_name: string; 
    email: string; 
    role: 'admin' | 'user' | 'superAdmin'; 
    iat: number; 
    exp: number; 
}


type UserRole = 'admin' | 'user' | 'both'|'superAdmin';


declare module "hono" {
    // Hono's Context is a generic interface — augment it including generics so TS recognizes the property
    interface AuthContext<State = any, Custom = any, Bindings = {}> {
        user?: DecodedToken; 
    }
}

// Also export a helper type for controllers to use when they need a typed context
export type AuthContext = import('hono').Context & { user?: DecodedToken };

export const verifyToken = async (token: string, secret: string): Promise<DecodedToken | null> => {
    try {
        // Verify JWT token using secret
        const decoded = jwt.verify(token, secret) as DecodedToken;
        return decoded;
    } catch (error: any) {
        // Return null for any verification errors (expired, invalid signature, etc.)
        console.error('Token verification failed:', error.message);
        return null;
    }
}


export const authMiddleware = async (c: Context, next: Next, requiredRole: UserRole) => {
    // Extract the Authorization header from the request
    const authHeader = c.req.header("Authorization");

    // Check if Authorization header is present
    if (!authHeader) {
        return c.json({ error: "Authorization header is required" }, 401);
    }

    // Validate that the header follows the Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Bearer token is required" }, 401);
    }

    // Extract the actual token by removing "Bearer " prefix (7 characters)
    const token = authHeader.substring(7);

    // Verify the token 
    const decoded = await verifyToken(token, process.env.JWT_SECRET as string);

    //return unauthorized error
    if (!decoded) {
        return c.json({ error: "Invalid or expired token" }, 401);
    }

    // Check if user has the required role for this route
    if (requiredRole === "both") {
        // Updated logic to include 'superAdmin' for "both" roles check
        if (decoded.role === "admin" || decoded.role === "user" || decoded.role === "superAdmin") {
            (c as AuthContext).user = decoded; 
            return next(); 
        }
    } else if (decoded.role === requiredRole) {
        // User has the exact required role
        (c as AuthContext).user = decoded; 
        return next(); 
    }

    // User doesn't have sufficient permissions
    return c.json({ error: "Insufficient permissions" }, 403);
}


export const adminRoleAuth = async (c: Context, next: Next) => await authMiddleware(c, next, "admin");

export const userRoleAuth = async (c: Context, next: Next) => await authMiddleware(c, next, "user");

export const bothRolesAuth = async (c: Context, next: Next) => await authMiddleware(c, next, "both");

export const superAdminRoleAuth = async (c: Context, next: Next) => await authMiddleware(c, next, "superAdmin");


