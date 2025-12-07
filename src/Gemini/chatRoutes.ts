// src/routes/chatRouter.ts
import { Hono } from "hono"; 
import { handleChat } from "../Gemini/chatController";
import { userRoleAuth } from "../middleware/bearAuth"; // Import your middleware

// Create a Hono app/router
const chatRouter = new Hono();

// Apply authentication middleware to the chat route
chatRouter.post("/", userRoleAuth, handleChat);

export default chatRouter; // Export the Hono instance/router
