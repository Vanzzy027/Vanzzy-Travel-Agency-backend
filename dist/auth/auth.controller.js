import bcrypt from "bcryptjs";
import { getUserByEmailService } from "../users/user.service.js";
import * as authServices from "./auth.service.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendOtpEmail, sendNotificationEmail } from "../mailer/mailer.js";
import { storeOTPService, verifyOTPService, updatePasswordService } from "../users/user.service.js";
dotenv.config();
export const createUser = async (c) => {
    const body = await c.req.json();
    // Basic validation
    if (!body.email || !body.password || !body.first_name || !body.last_name || !body.contact_phone || !body.address) {
        return c.json({ error: "All fields are required: email, password, first_name, last_name, contact_phone, address" }, 400);
    }
    try {
        // Check if email exists
        const emailCheck = await getUserByEmailService(body.email);
        if (emailCheck) {
            return c.json({ error: "Email already exists" }, 400);
        }
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(body.password, saltRounds);
        // Insert user
        const result = await authServices.createUserService(body.first_name, body.last_name, body.email, body.contact_phone, hashedPassword, body.address, body.national_id);
        if (result === "User Registered successfully 🎊") {
            // Send welcome email
            try {
                await sendNotificationEmail(body.email, `${body.first_name} ${body.last_name}`, "Welcome to VansTravelAgency! 🎉", "Thank you for registering with VansTravelAgency! We're thrilled to have you on board and can't wait to help you plan your next amazing adventure. Your account has been successfully created and you're now part of our travel community!");
                console.log("Welcome email sent successfully to:", body.email);
            }
            catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
            }
            return c.json({
                message: result,
                note: "Welcome email sent to your email address"
            }, 201);
        }
        return c.json({ error: result }, 500);
    }
    catch (error) {
        console.error("⚠️ Error creating user:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
    }
};
export const loginUser = async (c) => {
    const body = await c.req.json();
    // Basic validation
    if (!body.email || !body.password) {
        return c.json({ error: "Email and password are required" }, 400);
    }
    try {
        const existingUser = await getUserByEmailService(body.email);
        if (!existingUser) {
            return c.json({ error: "Invalid email or password ⚠️" }, 400);
        }
        // Check if user is banned
        if (existingUser.status === 'banned') {
            return c.json({
                error: "Your account has been banned. Please contact our support team for assistance."
            }, 403);
        }
        // Check if user is inactive
        if (existingUser.status === 'inactive') {
            return c.json({
                error: "Your account is currently inactive. Please contact support to reactivate."
            }, 403);
        }
        const isPasswordValid = await bcrypt.compare(body.password, existingUser.password);
        if (!isPasswordValid) {
            return c.json({ error: "Invalid email or password ⚠️" }, 400);
        }
        const payload = {
            user_id: existingUser.user_id, // Now string UUID
            first_name: existingUser.first_name,
            last_name: existingUser.last_name,
            email: existingUser.email,
            role: existingUser.role,
            address: existingUser.address,
            status: existingUser.status,
            national_id: existingUser.national_id
        };
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) {
            console.error("JWT_SECRET is not defined");
            return c.json({ error: "Server configuration error" }, 500);
        }
        const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
        return c.json({
            message: "Login successful 🎉",
            token: token,
            user: payload,
        }, 200);
    }
    catch (error) {
        console.error("Login error:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
    }
};
export const forgotPassword = async (c) => {
    const body = await c.req.json();
    if (!body.email) {
        return c.json({ error: "Email is required" }, 400);
    }
    try {
        console.log('🔐 Forgot password request for:', body.email);
        // Check if user exists
        const user = await getUserByEmailService(body.email);
        console.log('👤 User lookup result:', user ? 'User found' : 'User not found');
        if (!user) {
            return c.json({
                message: "If the email exists, a password reset OTP has been sent"
            }, 200);
        }
        // Check if user is banned
        if (user.status === 'banned') {
            return c.json({
                error: "Cannot reset password for banned account. Please contact support."
            }, 403);
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('🎯 Generated OTP:', otp);
        // Store OTP in database
        const stored = await storeOTPService(body.email, otp);
        console.log('💾 OTP storage result:', stored);
        if (!stored) {
            console.log('❌ OTP storage failed for email:', body.email);
            return c.json({ error: "Failed to generate OTP" }, 500);
        }
        // Send OTP via email
        console.log('📧 Attempting to send OTP email...');
        const emailSent = await sendOtpEmail(body.email, `${user.first_name} ${user.last_name}`, otp);
        console.log('📨 Email send result:', emailSent);
        if (emailSent) {
            return c.json({
                message: "Password reset OTP sent to your email",
                note: "OTP expires in 15 minutes"
            }, 200);
        }
        else {
            return c.json({ error: "Failed to send OTP email" }, 500);
        }
    }
    catch (error) {
        console.error("❌ Forgot password error:", error);
        return c.json({ error: error.message }, 500);
    }
};
export const resetPassword = async (c) => {
    const body = await c.req.json();
    if (!body.email || !body.otp || !body.new_password) {
        return c.json({ error: "Email, OTP, and new password are required" }, 400);
    }
    if (body.new_password.length < 6) {
        return c.json({ error: "Password must be at least 6 characters" }, 400);
    }
    try {
        // Verify OTP
        const isOtpValid = await verifyOTPService(body.email, body.otp);
        if (!isOtpValid) {
            return c.json({
                error: "Invalid or expired OTP. Please request a new one."
            }, 400);
        }
        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(body.new_password, saltRounds);
        // Update password and clear OTP
        const updated = await updatePasswordService(body.email, hashedPassword);
        if (!updated) {
            return c.json({ error: "Failed to update password" }, 500);
        }
        // Send confirmation email
        const user = await getUserByEmailService(body.email);
        if (user) {
            await sendNotificationEmail(body.email, `${user.first_name} ${user.last_name}`, "Password Updated Successfully 🔒", "Your VansTravelAgency account password has been successfully reset. If you didn't make this change, please contact our support team immediately.");
        }
        return c.json({
            message: "Password reset successfully! You can now login with your new password."
        }, 200);
    }
    catch (error) {
        console.error("Reset password error:", error);
        return c.json({ error: error.message }, 500);
    }
};
// import bcrypt from "bcryptjs";
// import { Context } from "hono";
// import { getUserByEmailService } from "../users/user.service"; 
// import * as authServices from "./auth.service";
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";
// import { sendOtpEmail, sendNotificationEmail } from "../mailer/mailer";
// import { storeOTPService, verifyOTPService, updatePasswordService } from "../users/user.service";
// dotenv.config();
// interface UserPayload {
//   user_id: number;
//   first_name: string;
//   last_name: string;
//   email: string;
//   role: string; 
//   address: string;
// }
// export const createUser = async (c: Context) => {
//   const body = await c.req.json();
//   // Basic validation
//   if (!body.email || !body.password || !body.first_name || !body.last_name || !body.contact_phone ||!body.address) {
//     return c.json({ error: "All fields are required: email, password, first_name, last_name, contact_phone, address" }, 400);
//   }
//   try {
//     // Check if email exists
//     const emailCheck = await getUserByEmailService(body.email);
//     if (emailCheck) {
//       return c.json({ error: "Email already exists" }, 400); 
//     }
//     // Hash password
//     const saltRounds = 10;
//     const hashedPassword = await bcrypt.hash(body.password, saltRounds);
//     // Insert user
//     const result = await authServices.createUserService(
//       body.first_name,
//       body.last_name,
//       body.email,
//       body.contact_phone, 
//       hashedPassword,
//       body.address
//     );
//     if (result === "User Registered successfully 🎊") {
//       // ✅ SEND WELCOME EMAIL - This was missing!
//       try {
//         await sendNotificationEmail(
//           body.email,
//           `${body.first_name} ${body.last_name}`,
//           "Welcome to VansTravelAgency! 🎉",
//           "Thank you for registering with VansTravelAgency! We're thrilled to have you on board and can't wait to help you plan your next amazing adventure. Your account has been successfully created and you're now part of our travel community!"
//         );
//         console.log("Welcome email sent successfully to:", body.email);
//       } catch (emailError) {
//         console.error("Failed to send welcome email:", emailError);
//         // Don't fail the registration if email fails, just log it
//       }
//       return c.json({ 
//         message: result,
//         note: "Welcome email sent to your email address"
//       }, 201);
//     }
//     return c.json({ error: result }, 500);
//   } catch (error: any) {
//     console.error("⚠️ Error creating user:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// // Logging in
// export const loginUser = async (c: Context) => {
//   const body = await c.req.json();
//   // Basic validation
//   if (!body.email || !body.password) {
//     return c.json({ error: "Email and password are required" }, 400);
//   }
//   try {
//     const existingUser = await getUserByEmailService(body.email);
//     if (!existingUser) {
//       return c.json({ error: "Invalid email or password ⚠️" }, 400); 
//     }
//     const isPasswordValid = await bcrypt.compare(body.password, existingUser.password);
//     if (!isPasswordValid) {
//       return c.json({ error: "Invalid email or password ⚠️" }, 400); 
//     }
//     const payload: UserPayload = {
//       user_id: existingUser.user_id,
//       first_name: existingUser.first_name,
//       last_name: existingUser.last_name,
//       email: existingUser.email,
//       role: existingUser.role,
//       address: existingUser.address,
//     };
//     const secretKey = process.env.JWT_SECRET;
//     if (!secretKey) {
//       console.error("JWT_SECRET is not defined");
//       return c.json({ error: "Server configuration error" }, 500);
//     }
//     const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
//     return c.json({
//       message: "Login successful 🎉", 
//       token: token,
//       user: payload,
//     }, 200);
//   } catch (error: any) {
//     console.error("Login error:", error);
//     return c.json({ error: error.message || "Internal server error" }, 500);
//   }
// };
// export const forgotPassword = async (c: Context) => {
//   const body = await c.req.json();
//   if (!body.email) {
//     return c.json({ error: "Email is required" }, 400);
//   }
//   try {
//     console.log('🔐 Forgot password request for:', body.email);
//     // Check if user exists
//     const user = await getUserByEmailService(body.email);
//     console.log('👤 User lookup result:', user ? 'User found' : 'User not found');
//     if (!user) {
//       return c.json({ 
//         message: "If the email exists, a password reset OTP has been sent" 
//       }, 200);
//     }
//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     console.log('🎯 Generated OTP:', otp);
//     // Store OTP in database (expiry will be handled by database)
//     const stored = await storeOTPService(body.email, otp);
//     console.log('💾 OTP storage result:', stored);
//     if (!stored) {
//       console.log('❌ OTP storage failed for email:', body.email);
//       return c.json({ error: "Failed to generate OTP" }, 500);
//     }
//     // Send OTP via email
//     console.log('📧 Attempting to send OTP email...');
//     const emailSent = await sendOtpEmail(body.email, `${user.first_name} ${user.last_name}`, otp);
//     console.log('📨 Email send result:', emailSent);
//     if (emailSent) {
//       return c.json({ 
//         message: "Password reset OTP sent to your email",
//         note: "OTP expires in 15 minutes"
//       }, 200);
//     } else {
//       return c.json({ error: "Failed to send OTP email" }, 500);
//     }
//   } catch (error: any) {
//     console.error("❌ Forgot password error:", error);
//     return c.json({ error: error.message }, 500);
//   }
// };
// // Reset Password, Verify OTP and Update Password
// export const resetPassword = async (c: Context) => {
//   const body = await c.req.json();
//   if (!body.email || !body.otp || !body.new_password) {
//     return c.json({ error: "Email, OTP, and new password are required" }, 400);
//   }
//   if (body.new_password.length < 6) {
//     return c.json({ error: "Password must be at least 6 characters" }, 400);
//   }
//   try {
//     // Verify OTP
//     const isOtpValid = await verifyOTPService(body.email, body.otp);
//     if (!isOtpValid) {
//       return c.json({ 
//         error: "Invalid or expired OTP. Please request a new one." 
//       }, 400);
//     }
//     // Hash new password
//     const saltRounds = 10;
//     const hashedPassword = await bcrypt.hash(body.new_password, saltRounds);
//     // Update password and clear OTP
//     const updated = await updatePasswordService(body.email, hashedPassword);
//     if (!updated) {
//       return c.json({ error: "Failed to update password" }, 500);
//     }
//     // Send confirmation email
//     const user = await getUserByEmailService(body.email);
//     if (user) {
//       await sendNotificationEmail(
//         body.email,
//         `${user.first_name} ${user.last_name}`,
//         "Password Updated Successfully 🔒",
//         "Your VansTravelAgency account password has been successfully reset. If you didn't make this change, please contact our support team immediately."
//       );
//     }
//     return c.json({ 
//       message: "Password reset successfully! You can now login with your new password." 
//     }, 200);
//   } catch (error: any) {
//     console.error("Reset password error:", error);
//     return c.json({ error: error.message }, 500);
//   }
// };
