import "dotenv/config";
import jwt from "jsonwebtoken";
export const verifyToken = async (token, secret) => {
    try {
        // Verify JWT token using secret
        const decoded = jwt.verify(token, secret);
        return decoded;
    }
    catch (error) {
        // Return null for any verification errors (expired, invalid signature, etc.)
        console.error('Token verification failed:', error.message);
        return null;
    }
};
export const authMiddleware = async (c, next, requiredRole) => {
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
    const decoded = await verifyToken(token, process.env.JWT_SECRET);
    //return unauthorized error
    if (!decoded) {
        return c.json({ error: "Invalid or expired token" }, 401);
    }
    // Check if user has the required role for this route
    if (requiredRole === "both") {
        // Updated logic to include 'superAdmin' for "both" roles check
        if (decoded.role === "admin" || decoded.role === "user" || decoded.role === "superAdmin") {
            c.user = decoded;
            return next();
        }
    }
    else if (decoded.role === requiredRole) {
        // User has the exact required role
        c.user = decoded;
        return next();
    }
    // User doesn't have sufficient permissions
    return c.json({ error: "Insufficient permissions" }, 403);
};
export const adminRoleAuth = async (c, next) => await authMiddleware(c, next, "admin");
export const userRoleAuth = async (c, next) => await authMiddleware(c, next, "user");
export const bothRolesAuth = async (c, next) => await authMiddleware(c, next, "both");
export const superAdminRoleAuth = async (c, next) => await authMiddleware(c, next, "superAdmin");
