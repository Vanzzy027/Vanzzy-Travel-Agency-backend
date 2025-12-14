import { Hono } from 'hono';
import * as userControllers from './user.controller.js';
import { bothRolesAuth, adminRoleAuth, superAdminRoleAuth } from '../middleware/bearAuth.js';
const userRoutes = new Hono();
// user prof
userRoutes.use('/profile/*', bothRolesAuth);
// Read own profile
userRoutes.get('/profile', userControllers.getProfile);
// Update own profile
userRoutes.put('/profile/update', bothRolesAuth, userControllers.updateProfile);
// admin
// Get all users
userRoutes.get('/all', adminRoleAuth, userControllers.getAllUsers);
// Get user by ID
userRoutes.get('/:id', userControllers.getUserById);
// Update a user by ID 
userRoutes.put('/:id', adminRoleAuth, userControllers.updateUserById);
// Delete a user by ID 
userRoutes.delete('/:id', adminRoleAuth, userControllers.deleteUser);
//superadmin
// Change user role
userRoutes.patch('/:id/role', superAdminRoleAuth, userControllers.changeUserRole);
export default userRoutes;
