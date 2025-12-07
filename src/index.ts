import * as dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prometheus } from '@hono/prometheus';
import { limiter } from './middleware/rateLimiter.ts';
import { adminRoleAuth } from './middleware/bearAuth.ts';
import initDatabaseConnection from './db/dbconfig.ts';
import authRouter from './auth/auth.route.ts';
import userRoutes from './users/user.route.ts';
import { cors } from 'hono/cors';
import vehicleSpecsRouter from './vehicle-specifications-module/vehicle-specs.routes.ts';
import vehiclesRouter from './vehicles/vehicles.routes.ts';
import bookingsRouter from './bookings-module/bookings.routes.ts';
import { getAllUsers } from './users/user.controller.ts';
import paymentRouter from './payments/payment.route';//receits and paystak
import chatRouter from './Gemini/chatRoutes';
import uploadRoutes from '../src/users/imageupload.routes.ts';

// ... other code ...


dotenv.config();

const app = new Hono();

// Prometheus metrics
const { registerMetrics, printMetrics } = prometheus();
app.use('*', registerMetrics);
app.get('/metrics', printMetrics);

// Logger
app.use('*', logger());

// Rate limit
app.use('/api/*', limiter);

// CORS
app.use('*', cors());

// Root route
app.get('/', (c) => c.text('4BIQ Travel Agency API is running!'));

// Public API routes
app.route('/api/auth', authRouter);
app.route('/api/users', userRoutes);
app.route('/api/vehicle-specs', vehicleSpecsRouter);
app.route('/api/vehicles', vehiclesRouter);
app.route('/api/bookings', bookingsRouter);
app.route('/api/payments', paymentRouter);//receipts $payments from paystak
//app.route('/api/payments', paymentsRouter);
app.route('/api/upload', uploadRoutes);
app.route('/api/chat', chatRouter); //openai

// Admin API
const adminApi = new Hono();
adminApi.use('*', adminRoleAuth);
//adminApi.get('/users', (c) => getAllUsers(c));
app.route('/api/admin', adminApi);

export default app;

// Startup
console.log("Attempting to connect to database...");
const PORT = parseInt(process.env.PORT || '4000', 10);

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











//before mpesa

// import { serve } from '@hono/node-server';
// import { type Context, Hono } from 'hono';
// import { logger } from 'hono/logger';
// import * as dotenv from 'dotenv';
// import { prometheus } from '@hono/prometheus';
// import { limiter } from './middleware/rateLimiter.ts'; 
// import { adminRoleAuth } from './middleware/bearAuth.ts'; 
// import initDatabaseConnection from './db/dbconfig.ts'; 
// import authRouter from './auth/auth.route.ts';
// import userRoutes from './users/user.route.ts'; 
// import { getAllUsers } from './users/user.controller.ts'; 
// import { cors } from 'hono/cors';
// import vehicleSpecsRouter from './vehicle-specifications-module/vehicle-specs.routes.ts';
// import vehiclesRouter from './vehicles/vehicles.routes.ts';
// import bookingsRouter from './bookings-module/bookings.routes.ts';
// import paymentsRouter from './payments-module/payments.routes.ts';

// //mpesa
// import express from "express";
// import mpesaRoutes from "./mpesa/mpesa.route.ts";



// dotenv.config();

// const app = new Hono();

// // Promthus
// const { registerMetrics, printMetrics } = prometheus();
// app.use('*', registerMetrics);
// app.get('/metrics', printMetrics);


// // Logger 
// app.use('*', logger());

// // Rate Limiting
// app.use('/api/*', limiter);

// // CORS to enable backE & FrontE to listen to each other
// app.use('*', cors());

// //root route
// app.get('/', (c) => {
//   return c.text('Online Shopping API is running. Welcome to Hono!');
// });

// // API Routes
// app.route('/api', authRouter);
// app.route('/api/users', userRoutes);
// app.route('/api/vehicle-specs', vehicleSpecsRouter);
// app.route('/api/vehicles', vehiclesRouter);
// app.route('/api/bookings', bookingsRouter);
// app.route('/api/payments', paymentsRouter);

// // admin API
// const adminApi = new Hono();

// // admin-only authorization middleware to all routes
// adminApi.use('*', adminRoleAuth);

// // endpoint to get all users
// adminApi.get('/users', getAllUsers);

// // admin API setup
// app.route('/api/admin', adminApi);



// app.route("/api/auth", authRouter); 

// export default app;

// //startup

// console.log("Attempting to connect to database");
// const PORT = parseInt(process.env.PORT || '4000', 10);

// initDatabaseConnection()
//   .then(() => {
//     // This runs after the database connects successfully
//     serve({ fetch: app.fetch, port: PORT }, (info) => {
//       console.log(`\n******************************************************`);
//       console.log(`🚀 4BIQ API Server is running on http://localhost:${info.port}`);
//       console.log(`Routes available at: http://localhost:${info.port}/api`);
//       // console.log(`admin routes at: http://localhost:${info.port}/api/admin`);
//       // console.log(`Metrics available at: http://localhost:${info.port}/metrics`);
//       console.log(`******************************************************`);
//     });
//   })
//   .catch((error) => {
//     // This runs if the database connection fails
//     console.error('❌ Fatal Error: Failed to start application.', error);
//     process.exit(1); // Exit the process if startup fails
//   });