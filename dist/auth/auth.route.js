import { Hono } from "hono";
import { createUser, loginUser, forgotPassword, resetPassword } from "./auth.controller.js";
const authRouter = new Hono();
// Define the routes
authRouter.post("/register", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
export default authRouter;
