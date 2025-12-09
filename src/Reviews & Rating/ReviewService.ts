import mssql from 'mssql';
import { getRequest } from '../db/dbconfig';
///import { CreateReviewDTO } from '../models/Review';




export interface Review {
    review_id: number;
    booking_id: number;
    user_id: string;
    vehicle_id: number;
    rating: number;
    comment: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    is_featured: boolean;
    created_at: string;
    // Joined fields
    user_name?: string;
    vehicle_name?: string;
    vehicle_image?: string;
}

export interface CreateReviewDTO {
    user_id: string;
    booking_id: number;
    vehicle_id: number;
    rating: number;
    comment: string;
}
export class ReviewService {

    // 1. Get Bookings Eligible for Review (Completed AND Not yet reviewed)
    async getEligibleBookings(userId: string) {
        const request = getRequest();
        
        // 🟢 FIX: JOIN VehicleSpecifications (alias 'vs') to get details
        const result = await request
            .input('user_id', mssql.UniqueIdentifier, userId)
            .query(`
                SELECT 
                    b.booking_id, 
                    b.vehicle_id, 
                    b.return_date,
                    vs.manufacturer, 
                    vs.model, 
                    vs.year, 
                    vs.images
                FROM Bookings b
                JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
                JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
                WHERE b.user_id = @user_id 
                AND b.booking_status = 'Completed'
                AND NOT EXISTS (
                    SELECT 1 FROM Reviews r WHERE r.booking_id = b.booking_id
                )
                ORDER BY b.return_date DESC
            `);
            
        return result.recordset;
    }

    // 2. Create Review
    async createReview(data: CreateReviewDTO) {
        const request = getRequest();
        await request
            .input('user_id', mssql.UniqueIdentifier, data.user_id)
            .input('booking_id', mssql.Int, data.booking_id)
            .input('vehicle_id', mssql.Int, data.vehicle_id)
            .input('rating', mssql.Int, data.rating)
            .input('comment', mssql.NVarChar, data.comment)
            .query(`
                INSERT INTO Reviews (user_id, booking_id, vehicle_id, rating, comment, status)
                VALUES (@user_id, @booking_id, @vehicle_id, @rating, @comment, 'Pending')
            `);
        return { message: "Review submitted for approval" };
    }

    // 3. Get User's Past Reviews
    async getUserReviews(userId: string) {
        const request = getRequest();
        
        // 🟢 FIX: JOIN VehicleSpecifications here too
        const result = await request
            .input('user_id', mssql.UniqueIdentifier, userId)
            .query(`
                SELECT 
                    r.*, 
                    vs.manufacturer, 
                    vs.model, 
                    vs.images
                FROM Reviews r
                JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
                JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
                WHERE r.user_id = @user_id
                ORDER BY r.created_at DESC
            `);
        return result.recordset;
    }

    // 4. ADMIN: Get All Reviews (for moderation)
    async getAllReviews() {
        const request = getRequest();
        
        // 🟢 FIX: JOIN VehicleSpecifications here too
        const result = await request.query(`
            SELECT 
                r.*, 
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                vs.manufacturer, 
                vs.model
            FROM Reviews r
            JOIN Users u ON r.user_id = u.user_id
            JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
            JOIN VehicleSpecifications vs ON v.vehicleSpec_id = vs.vehicleSpec_id
            ORDER BY 
                CASE WHEN r.status = 'Pending' THEN 1 ELSE 2 END,
                r.created_at DESC
        `);
        return result.recordset;
    }

    // 5. ADMIN: Update Status (Approve/Reject/Feature)
    async updateReviewStatus(reviewId: number, status: string, isFeatured: boolean) {
        const request = getRequest();
        await request
            .input('id', mssql.Int, reviewId)
            .input('status', mssql.NVarChar, status)
            .input('is_featured', mssql.Bit, isFeatured ? 1 : 0)
            .query(`
                UPDATE Reviews 
                SET status = @status, is_featured = @is_featured, updated_at = GETDATE()
                WHERE review_id = @id
            `);
        return { message: "Review updated" };
    }
}



// import mssql from 'mssql';
// import { getRequest } from '../db/dbconfig';
// //import { CreateReviewDTO


// export interface Review {
//     review_id: number;
//     booking_id: number;
//     user_id: string;
//     vehicle_id: number;
//     rating: number;
//     comment: string;
//     status: 'Pending' | 'Approved' | 'Rejected';
//     is_featured: boolean;
//     created_at: string;
//     // Joined fields
//     user_name?: string;
//     vehicle_name?: string;
//     vehicle_image?: string;
// }

// export interface CreateReviewDTO {
//     user_id: string;
//     booking_id: number;
//     vehicle_id: number;
//     rating: number;
//     comment: string;
// }
// export class ReviewService {

//     // 1. Get Bookings Eligible for Review (Completed AND Not yet reviewed)
//     async getEligibleBookings(userId: string) {
//         const request = getRequest();
        
//         // This query finds bookings that are COMPLETED
//         // AND checks the Reviews table to ensure this booking_id doesn't exist there yet
//         const result = await request
//             .input('user_id', mssql.UniqueIdentifier, userId)
//             .query(`
//                 SELECT 
//                     b.booking_id, 
//                     b.vehicle_id, 
//                     b.return_date,
//                     v.manufacturer, 
//                     v.model, 
//                     v.year, 
//                     v.images
//                 FROM Bookings b
//                 JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
//                 WHERE b.user_id = @user_id 
//                 AND b.booking_status = 'Completed'
//                 AND NOT EXISTS (
//                     SELECT 1 FROM Reviews r WHERE r.booking_id = b.booking_id
//                 )
//                 ORDER BY b.return_date DESC
//             `);
            
//         return result.recordset;
//     }

//     // 2. Create Review
//     async createReview(data: CreateReviewDTO) {
//         const request = getRequest();
//         await request
//             .input('user_id', mssql.UniqueIdentifier, data.user_id)
//             .input('booking_id', mssql.Int, data.booking_id)
//             .input('vehicle_id', mssql.Int, data.vehicle_id)
//             .input('rating', mssql.Int, data.rating)
//             .input('comment', mssql.NVarChar, data.comment)
//             .query(`
//                 INSERT INTO Reviews (user_id, booking_id, vehicle_id, rating, comment, status)
//                 VALUES (@user_id, @booking_id, @vehicle_id, @rating, @comment, 'Pending')
//             `);
//         return { message: "Review submitted for approval" };
//     }

//     // 3. Get User's Past Reviews
//     async getUserReviews(userId: string) {
//         const request = getRequest();
//         const result = await request
//             .input('user_id', mssql.UniqueIdentifier, userId)
//             .query(`
//                 SELECT r.*, v.manufacturer, v.model, v.images
//                 FROM Reviews r
//                 JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
//                 WHERE r.user_id = @user_id
//                 ORDER BY r.created_at DESC
//             `);
//         return result.recordset;
//     }

//     // 4. ADMIN: Get All Reviews (for moderation)
//     async getAllReviews() {
//         const request = getRequest();
//         const result = await request.query(`
//             SELECT 
//                 r.*, 
//                 CONCAT(u.first_name, ' ', u.last_name) as full_name,
//                 v.manufacturer, 
//                 v.model
//             FROM Reviews r
//             JOIN Users u ON r.user_id = u.user_id
//             JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
//             ORDER BY 
//                 CASE WHEN r.status = 'Pending' THEN 1 ELSE 2 END,
//                 r.created_at DESC
//         `);
//         return result.recordset;
//     }

//     // 5. ADMIN: Update Status (Approve/Reject/Feature)
//     async updateReviewStatus(reviewId: number, status: string, isFeatured: boolean) {
//         const request = getRequest();
//         await request
//             .input('id', mssql.Int, reviewId)
//             .input('status', mssql.NVarChar, status)
//             .input('is_featured', mssql.Bit, isFeatured ? 1 : 0)
//             .query(`
//                 UPDATE Reviews 
//                 SET status = @status, is_featured = @is_featured, updated_at = GETDATE()
//                 WHERE review_id = @id
//             `);
//         return { message: "Review updated" };
//     }
// }