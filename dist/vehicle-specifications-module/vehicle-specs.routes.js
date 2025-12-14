import { Hono } from 'hono';
import { createVehicleSpec, getAllVehicleSpecs, getVehicleSpecById, updateVehicleSpec, deleteVehicleSpec } from './vehicle-specs.controller.js';
import { adminRoleAuth } from '../middleware/bearAuth.js';
const vehicleSpecsRouter = new Hono();
// Public routes
vehicleSpecsRouter.get('/', getAllVehicleSpecs);
vehicleSpecsRouter.get('/:id', getVehicleSpecById);
// Admin only routes
vehicleSpecsRouter.post('/', adminRoleAuth, createVehicleSpec);
vehicleSpecsRouter.put('/:id', adminRoleAuth, updateVehicleSpec);
vehicleSpecsRouter.delete('/:id', adminRoleAuth, deleteVehicleSpec);
export default vehicleSpecsRouter;
