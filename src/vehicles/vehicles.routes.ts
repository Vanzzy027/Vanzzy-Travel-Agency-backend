import { Hono } from 'hono';
import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getAvailableVehicles,
  updateVehicleStatus
} from './vehicles.controller.js';

import { adminRoleAuth, bothRolesAuth } from '../middleware/bearAuth.js';

const vehiclesRouter = new Hono();

// Public 
vehiclesRouter.get('/', getAllVehicles);
vehiclesRouter.get('/available', getAvailableVehicles);
vehiclesRouter.get('/:id', getVehicleById);

// Admin
vehiclesRouter.post('/', adminRoleAuth, createVehicle);
vehiclesRouter.put('/:id', adminRoleAuth, updateVehicle);
vehiclesRouter.patch('/:id/status', adminRoleAuth, updateVehicleStatus);
vehiclesRouter.delete('/:id', adminRoleAuth, deleteVehicle);



export default vehiclesRouter;