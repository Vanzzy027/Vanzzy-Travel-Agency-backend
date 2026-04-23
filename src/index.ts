import * as dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prometheus } from "@hono/prometheus";
import { limiter } from "./middleware/rateLimiter.js";
import { adminRoleAuth } from "./middleware/bearAuth.js";
import initDatabaseConnection from "./db/dbconfig.js";
import authRouter from "./auth/auth.route.js";
import userRoutes from "./users/user.route.js";
import { cors } from "hono/cors";
import vehicleSpecsRouter from "./vehicle-specifications-module/vehicle-specs.routes.js";
import vehiclesRouter from "./vehicles/vehicles.routes.js";
import bookingsRouter from "./bookings-module/bookings.routes.js";
import { getAllUsers } from "./users/user.controller.js";
import paymentRouter from "./payments/payment.route.js"; //receits and paystak
import chatRouter from "./Gemini/chatRoutes.js";
//import uploadRoutes from '../src/users/imageupload.routes.js';
import uploadRoutes from "./users/imageupload.routes.js";
import ticketRoute from "./customer-support-module/TicketRoutes.js";
import reviewRoute from "./Reviews & Rating/ReviewRoutes.js";

dotenv.config();

const app = new Hono();

// 1. MUST BE FIRST: Handle CORS before anything else
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow specific origins or development environments
      const allowedOrigins = [
        "http://localhost:5173",
        "https://vanskecarrental.netlify.app",
      ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true, // Crucial if you use cookies/sessions
  }),
);

// 2. Metrics and Logger come AFTER CORS
const { registerMetrics, printMetrics } = prometheus();
app.use("*", registerMetrics);
app.get("/metrics", printMetrics);
app.use("*", logger());

// 3. Sensitive middleware like rate limiting comes last
app.use("/api/*", limiter);

// Root route
app.get("/", (c) => c.text("4BIQ Travel Agency API is running!"));

// Public API routes
app.route("/api/auth", authRouter);
app.route("/api/users", userRoutes);
app.route("/api/vehicle-specs", vehicleSpecsRouter);
app.route("/api/vehicles", vehiclesRouter);
app.route("/api/bookings", bookingsRouter);
app.route("/api/payments", paymentRouter); //receipts $payments from paystak
//app.route('/api/payments', paymentsRouter);
app.route("/api/upload", uploadRoutes);
app.route("/api/chat", chatRouter); //openai
app.route("/api/tickets", ticketRoute);
// Admin API
const adminApi = new Hono();
adminApi.use("*", adminRoleAuth);
//adminApi.get('/users', (c) => getAllUsers(c));
app.route("/api/admin", adminApi);
app.route("/api/reviews", reviewRoute);

export default app;

// Startup
console.log("Attempting to connect to database...");
const PORT = parseInt(process.env.PORT || "4000", 10);

initDatabaseConnection()
  .then(() => {
    serve({ fetch: app.fetch, port: PORT }, (info) => {
      console.log(`🚀 4BIQ API Live → http://localhost:${info.port}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Startup Error:", err);
    process.exit(1);
  });
