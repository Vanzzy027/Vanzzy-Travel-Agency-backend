import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
const { verify } = jwt;
import * as dotenv from 'dotenv';
dotenv.config();

const secretKey = process.env.JWT_SECRET as string;

interface TokenPayload {
    user_id: number;
    email: string;

}

export const jwtAuthMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Authorization token not provided.' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
  
        const decoded = verify(token, secretKey) as TokenPayload;

        
        c.set('user_id', decoded.user_id);
        
        await next(); 

    } catch (error) {
        console.error('JWT verification error:', error);
        return c.json({ error: 'Invalid or expired token.' }, 401);
    }
};