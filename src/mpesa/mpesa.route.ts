// import { Hono } from "hono";
// import { stkPushController, mpesaCallbackHandler } from "./mpesa.controller";
// import { mpesaCallbackGuard } from "./mpesa.middleware";

// const mpesaRouter = new Hono();

// mpesaRouter.post("/stkpush", stkPushController);
// mpesaRouter.post("/callback", /* mpesaCallbackGuard, */ mpesaCallbackHandler);

// export default mpesaRouter;



// // const express = require('express');
// // const router = express.Router();
// // const mpesaController = require('../controllers/mpesaController');

// // // Route for your front-end to call to start a payment
// // router.post('/initiate-payment', mpesaController.handleSTKPushInitiation);

// // // Route where 