import { getAllUsersService, getUserByIdService, updateUserService, updateUserByIdService, deleteUserService, changeUserRoleService } from "./user.service.js";
import { UserUpdateSchema, ChangeRoleSchema } from '../validators/user.validators.js';
// Validate ID as string
const validateStringId = (id) => {
    if (!id || typeof id !== "string" || id.trim() === "") {
        return false;
    }
    return true;
};
// GET Own Profile
export const getProfile = async (c) => {
    try {
        const user_id = c.user?.user_id;
        if (!user_id) {
            return c.json({ error: 'User not authenticated' }, 401);
        }
        const user = await getUserByIdService(user_id);
        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }
        // Remove sensitive data
        const { otp_code, otp_expires_at, ...userWithoutSensitiveData } = user;
        return c.json({
            success: true,
            data: userWithoutSensitiveData
        }, 200);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        return c.json({
            error: 'Failed to retrieve profile',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
};
// Update Own Profile
export const updateProfile = async (c) => {
    const user_id = c.user?.user_id;
    if (!user_id) {
        return c.json({ error: 'Authentication required.' }, 401);
    }
    const body = await c.req.json();
    try {
        const validation = UserUpdateSchema.safeParse(body);
        if (!validation.success) {
            return c.json({
                error: "Validation failed",
                details: validation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            }, 400);
        }
        const { role, ...updateData } = validation.data;
        const updatedUser = await updateUserService(user_id, updateData);
        if (!updatedUser) {
            return c.json({ error: "User not found or no changes made." }, 404);
        }
        return c.json({
            message: "Profile updated successfully 🎉",
            user: updatedUser
        });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        return c.json({ error: error.message }, 500);
    }
};
// GET User by ID 
export const getUserById = async (c) => {
    const user_id = c.req.param("id");
    if (!validateStringId(user_id)) {
        return c.json({ error: "Invalid user ID format." }, 400);
    }
    try {
        const user = await getUserByIdService(user_id);
        if (!user) {
            return c.json({ error: `User with ID ${user_id} not found.` }, 404);
        }
        // Remove sensitive data
        const { otp_code, otp_expires_at, ...userWithoutSensitiveData } = user;
        return c.json({
            message: "User retrieved successfully",
            user: userWithoutSensitiveData
        });
    }
    catch (error) {
        console.error("Error fetching user:", error);
        return c.json({ error: error.message }, 500);
    }
};
// Update User by ID 
export const updateUserById = async (c) => {
    const user_id = c.req.param("id");
    const body = await c.req.json();
    if (!validateStringId(user_id)) {
        return c.json({ error: "Invalid user ID format." }, 400);
    }
    // Check if user is authenticated
    const currentUser = c.user;
    if (!currentUser) {
        return c.json({ error: 'Authentication required.' }, 401);
    }
    // Check if user has admin privileges
    if (currentUser.role !== 'admin' && currentUser.role !== 'superAdmin') {
        return c.json({ error: 'Unauthorized access.' }, 403);
    }
    try {
        const validation = UserUpdateSchema.safeParse(body);
        if (!validation.success) {
            return c.json({
                error: "Validation failed",
                details: validation.error.issues.map(issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            }, 400);
        }
        const exists = await getUserByIdService(user_id);
        if (!exists) {
            return c.json({ error: `User with ID ${user_id} not found.` }, 404);
        }
        const success = await updateUserByIdService(user_id, validation.data);
        if (!success) {
            return c.json({ message: "No changes applied." });
        }
        const updatedUser = await getUserByIdService(user_id);
        return c.json({
            message: `User ${user_id} updated successfully`,
            user: updatedUser
        });
    }
    catch (error) {
        console.error("Error updating user:", error);
        return c.json({ error: error.message }, 500);
    }
};
// Change role
export const changeUserRole = async (c) => {
    const user_id = c.req.param("id");
    const body = await c.req.json();
    if (!validateStringId(user_id)) {
        return c.json({ error: "Invalid user ID format." }, 400);
    }
    // Check if user is authenticated and is superAdmin
    const currentUser = c.user;
    if (!currentUser) {
        return c.json({ error: 'Authentication required.' }, 401);
    }
    if (currentUser.role !== 'superAdmin') {
        return c.json({ error: 'Only super admin can change roles.' }, 403);
    }
    try {
        const validation = ChangeRoleSchema.safeParse(body);
        if (!validation.success) {
            return c.json({
                error: "Validation failed",
                details: validation.error.issues.map(issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            }, 400);
        }
        // Prevent changing own role
        if (currentUser.user_id === user_id) {
            return c.json({ error: "You cannot change your own role." }, 400);
        }
        const exists = await getUserByIdService(user_id);
        if (!exists) {
            return c.json({ error: `User with ID ${user_id} not found.` }, 404);
        }
        const success = await changeUserRoleService(user_id, validation.data.role);
        if (!success) {
            return c.json({ error: "Failed to change user role." }, 500);
        }
        const updatedUser = await getUserByIdService(user_id);
        return c.json({
            message: "User role updated successfully",
            user: updatedUser
        });
    }
    catch (error) {
        console.error("Error changing role:", error);
        return c.json({ error: error.message }, 500);
    }
};
// GET All Users 
export const getAllUsers = async (c) => {
    // Check if user is authenticated and has admin privileges
    const currentUser = c.user;
    if (!currentUser) {
        return c.json({ error: 'Authentication required.' }, 401);
    }
    if (currentUser.role !== 'admin' && currentUser.role !== 'superAdmin') {
        return c.json({ error: 'Unauthorized access.' }, 403);
    }
    try {
        const users = await getAllUsersService();
        if (!users || users.length === 0) {
            return c.json({ message: "No users found" }, 404);
        }
        return c.json({
            message: "Users retrieved successfully",
            users: users,
            count: users.length
        }, 200);
    }
    catch (error) {
        console.error("Error retrieving all users:", error);
        return c.json({ error: error.message || 'Failed to retrieve users' }, 500);
    }
};
// Delete User
export const deleteUser = async (c) => {
    const user_id = c.req.param("id");
    if (!validateStringId(user_id)) {
        return c.json({ error: "Invalid user ID format." }, 400);
    }
    // Check if user is authenticated and has admin privileges
    const currentUser = c.user;
    if (!currentUser) {
        return c.json({ error: 'Authentication required.' }, 401);
    }
    if (currentUser.role !== 'admin' && currentUser.role !== 'superAdmin') {
        return c.json({ error: 'Unauthorized access.' }, 403);
    }
    try {
        // Prevent self-deletion
        if (currentUser.user_id === user_id) {
            return c.json({ error: "You cannot delete your own account." }, 400);
        }
        const deleted = await deleteUserService(user_id);
        if (!deleted) {
            return c.json({ error: `User with ID ${user_id} not found.` }, 404);
        }
        return c.json({
            message: `User ${user_id} deleted successfully.`
        });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        return c.json({ error: error.message }, 500);
    }
};
// import { z, type ZodIssue } from 'zod';
// import { 
//     getAllUsersService, 
//     getUserByIdService, 
//     updateUserService, 
//     updateUserByIdService, 
//     deleteUserService,
//     changeUserRoleService 
// } from "./user.service";
// import { Context } from "hono";
// import { UserUpdateSchema, ChangeRoleSchema } from '../validators/user.validators';
// // Validate ID as string
// const validateStringId = (id: string) => {
//     if (!id || typeof id !== "string" || id.trim() === "") {
//         return false;
//     }
//     return true;
// };
// // GET Own Profile
// // export const getProfile = async (c: Context) => {
// //     if (!c.user) {
// //         return c.json({ error: 'Authentication required.' }, 401);
// //     }
// //     const user_id = String(c.user.user_id);
// //     try {
// //         const user = await getUserByIdService(user_id);
// //         if (!user) {
// //             return c.json({ error: 'User profile not found.' }, 404);
// //         }
// //         return c.json({ 
// //             message: "Profile retrieved successfully",
// //             user 
// //         }, 200);
// //     } catch (error: any) {
// //         console.error('Error fetching profile:', error);
// //         return c.json({ error: error.message }, 500);
// //     }
// // };
// // In user.controller.ts - getProfile function
// export const getProfile = async (c: Context) => {
//     try {
//         const user_id = c.get('user')?.user_id; // This should be a UUID string
//         if (!user_id) {
//             return c.json({ error: 'User not authenticated' }, 401);
//         }
//         const user = await getUserByIdService(user_id);
//         if (!user) {
//             return c.json({ error: 'User not found' }, 404);
//         }
//         // Remove sensitive data if needed
//         const { password, otp_code, otp_expires_at, ...userWithoutSensitiveData } = user;
//         return c.json({
//             success: true,
//             data: userWithoutSensitiveData
//         }, 200);
//     } catch (error) {
//         console.error('Error fetching profile:', error);
//         return c.json({ 
//             error: 'Failed to retrieve profile',
//             message: error instanceof Error ? error.message : 'Unknown error'
//         }, 500);
//     }
// };
// // Update Own Profile
// export const updateProfile = async (c: Context) => {
//     if (!c.user) {
//         return c.json({ error: 'Authentication required.' }, 401);
//     }
//     const user_id = String(c.user.user_id);
//     const body = await c.req.json();
//     try {
//         const validation = UserUpdateSchema.safeParse(body);
//         if (!validation.success) {
//             return c.json({
//                 error: "Validation failed",
//                 details: validation.error.issues.map(issue => ({
//                     field: issue.path.join('.'),
//                     message: issue.message
//                 }))
//             }, 400);
//         }
//         const { role, ...updateData } = validation.data;
//         const updatedUser = await updateUserService(user_id, updateData);
//         if (!updatedUser) {
//             return c.json({ error: "User not found or no changes made." }, 404);
//         }
//         return c.json({
//             message: "Profile updated successfully 🎉",
//             user: updatedUser
//         });
//     } catch (error: any) {
//         console.error("Error updating profile:", error);
//         return c.json({ error: error.message }, 500);
//     }
// };
// // GET User by ID 
// export const getUserById = async (c: Context) => {
//     const user_id = c.req.param("id");
//     if (!validateStringId(user_id)) {
//         return c.json({ error: "Invalid user ID format." }, 400);
//     }
//     try {
//         const user = await getUserByIdService(user_id);
//         if (!user) {
//             return c.json({ error: `User with ID ${user_id} not found.` }, 404);
//         }
//         return c.json({
//             message: "User retrieved successfully",
//             user
//         });
//     } catch (error: any) {
//         console.error("Error fetching user:", error);
//         return c.json({ error: error.message }, 500);
//     }
// };
// // Update User by ID 
// export const updateUserById = async (c: Context) => {
//     const user_id = c.req.param("id");
//     const body = await c.req.json();
//     if (!validateStringId(user_id)) {
//         return c.json({ error: "Invalid user ID format." }, 400);
//     }
//     try {
//         const validation = UserUpdateSchema.safeParse(body);
//         if (!validation.success) {
//             return c.json({
//                 error: "Validation failed",
//                 details: validation.error.issues.map(issue => ({
//                     field: issue.path.join("."),
//                     message: issue.message
//                 }))
//             }, 400);
//         }
//         const exists = await getUserByIdService(user_id);
//         if (!exists) {
//             return c.json({ error: `User with ID ${user_id} not found.` }, 404);
//         }
//         const success = await updateUserByIdService(user_id, validation.data);
//         if (!success) {
//             return c.json({ message: "No changes applied." });
//         }
//         const updatedUser = await getUserByIdService(user_id);
//         return c.json({
//             message: `User ${user_id} updated successfully`,
//             user: updatedUser
//         });
//     } catch (error: any) {
//         console.error("Error updating user:", error);
//         return c.json({ error: error.message }, 500);
//     }
// };
// // Change role
// export const changeUserRole = async (c: Context) => {
//     const user_id = c.req.param("id");
//     const body = await c.req.json();
//     if (!validateStringId(user_id)) {
//         return c.json({ error: "Invalid user ID format." }, 400);
//     }
//     try {
//         const validation = ChangeRoleSchema.safeParse(body);
//         if (!validation.success) {
//             return c.json({
//                 error: "Validation failed",
//                 details: validation.error.issues.map(issue => ({
//                     field: issue.path.join("."),
//                     message: issue.message
//                 }))
//             }, 400);
//         }
//         if (c.user && String(c.user.user_id) === user_id) {
//             return c.json({ error: "You cannot change your own role." }, 400);
//         }
//         const exists = await getUserByIdService(user_id);
//         if (!exists) {
//             return c.json({ error: `User with ID ${user_id} not found.` }, 404);
//         }
//         const success = await changeUserRoleService(user_id, validation.data.role);
//         if (!success) {
//             return c.json({ error: "Failed to change user role." }, 500);
//         }
//         const updatedUser = await getUserByIdService(user_id);
//         return c.json({
//             message: "User role updated successfully",
//             user: updatedUser
//         });
//     } catch (error: any) {
//         console.error("Error changing role:", error);
//         return c.json({ error: error.message }, 500);
//     }
// };
// // GET All Users 
// export const getAllUsers = async (c: Context) => {
//     try {
//         const users = await getAllUsersService();
//         if (!users || users.length === 0) {
//             return c.json({ message: "No users found" }, 404);
//         }
//         return c.json({ 
//             message: "Users retrieved successfully", 
//             users: users,
//             count: users.length
//         }, 200);
//     } catch (error: any) {
//         console.error("Error retrieving all users:", error);
//         return c.json({ error: error.message || 'Failed to retrieve users' }, 500);
//     }
// };
// // Delete User
// export const deleteUser = async (c: Context) => {
//     const user_id = c.req.param("id");
//     if (!validateStringId(user_id)) {
//         return c.json({ error: "Invalid user ID format." }, 400);
//     }
//     try {
//         if (c.user && String(c.user.user_id) === user_id) {
//             return c.json({ error: "You cannot delete your own account." }, 400);
//         }
//         const deleted = await deleteUserService(user_id);
//         if (!deleted) {
//             return c.json({ error: `User with ID ${user_id} not found.` }, 404);
//         }
//         return c.json({
//             message: `User ${user_id} deleted successfully.`
//         });
//     } catch (error: any) {
//         console.error("Error deleting user:", error);
//         return c.json({ error: error.message }, 500);
//     }
// };
// // DELETE User (Admin only)
// export const deleteUser = async (c: Context) => {
//     const user_id = Number(c.req.param('id'));
//     if (isNaN(user_id) || user_id <= 0) {
//         return c.json({ error: 'Invalid user ID format.' }, 400);
//     }
//     try {
//         // Prevent users from deleting themselves
//         if (c.user && c.user.user_id === user_id) {
//             return c.json({ error: 'You cannot delete your own account.' }, 400);
//         }
//         const deleted = await deleteUserService(user_id);
//         if (deleted) {
//             return c.json({ 
//                 message: `User with ID ${user_id} deleted successfully.` 
//             }, 200);
//         } else {
//             return c.json({ 
//                 error: `User with ID ${user_id} not found.` 
//             }, 404);
//         }
//     } catch (error: any) {
//         console.error('Error deleting user:', error);
//         return c.json({ error: error.message || 'Failed to delete user' }, 500);
//     }
// };
