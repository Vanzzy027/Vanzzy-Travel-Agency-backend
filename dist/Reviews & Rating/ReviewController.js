import { ReviewService } from '../Reviews & Rating/ReviewService.js';
const reviewService = new ReviewService();
export const getEligibleBookings = async (c) => {
    try {
        const userId = c.req.param('userId');
        const bookings = await reviewService.getEligibleBookings(userId);
        return c.json(bookings, 200);
    }
    catch (e) {
        // 🔴 ADD THIS to see the error in your VS Code Terminal
        console.error("❌ Error in getEligibleBookings:", e);
        return c.json({ error: "Failed to fetch eligible bookings", details: e.message }, 500);
    }
};
export const createReview = async (c) => {
    try {
        const body = await c.req.json();
        await reviewService.createReview(body);
        return c.json({ message: "Success" }, 201);
    }
    catch (e) {
        return c.json({ error: "Failed to submit review" }, 500);
    }
};
export const getUserReviews = async (c) => {
    try {
        const userId = c.req.param('userId');
        const reviews = await reviewService.getUserReviews(userId);
        return c.json(reviews, 200);
    }
    catch (e) {
        // 🔴 ADD THIS
        console.error("❌ Error in getUserReviews:", e);
        return c.json({ error: "Failed to fetch reviews", details: e.message }, 500);
    }
};
export const getAllReviews = async (c) => {
    try {
        const reviews = await reviewService.getAllReviews();
        return c.json(reviews, 200);
    }
    catch (e) {
        return c.json({ error: "Error" }, 500);
    }
};
export const updateReviewStatus = async (c) => {
    try {
        const id = parseInt(c.req.param('id'));
        const { status, is_featured } = await c.req.json();
        await reviewService.updateReviewStatus(id, status, is_featured);
        return c.json({ message: "Updated" }, 200);
    }
    catch (e) {
        return c.json({ error: "Error" }, 500);
    }
};
// import { Context } from 'hono';
// import { ReviewService } from '../Reviews & Rating/ReviewService';
// const reviewService = new ReviewService();
// export const getEligibleBookings = async (c: Context) => {
//     try {
//         const userId = c.req.param('userId');
//         const bookings = await reviewService.getEligibleBookings(userId);
//         return c.json(bookings, 200);
//     } catch (e) { return c.json({ error: "Failed to fetch eligible bookings" }, 500); }
// };
// export const createReview = async (c: Context) => {
//     try {
//         const body = await c.req.json();
//         await reviewService.createReview(body);
//         return c.json({ message: "Success" }, 201);
//     } catch (e) { return c.json({ error: "Failed to submit review" }, 500); }
// };
// export const getUserReviews = async (c: Context) => {
//     try {
//         const userId = c.req.param('userId');
//         const reviews = await reviewService.getUserReviews(userId);
//         return c.json(reviews, 200);
//     } catch (e) { return c.json({ error: "Failed to fetch reviews" }, 500); }
// };
// export const getAllReviews = async (c: Context) => { // Admin
//     try {
//         const reviews = await reviewService.getAllReviews();
//         return c.json(reviews, 200);
//     } catch (e) { return c.json({ error: "Error" }, 500); }
// };
// export const updateReviewStatus = async (c: Context) => { // Admin
//     try {
//         const id = parseInt(c.req.param('id'));
//         const { status, is_featured } = await c.req.json();
//         await reviewService.updateReviewStatus(id, status, is_featured);
//         return c.json({ message: "Updated" }, 200);
//     } catch (e) { return c.json({ error: "Error" }, 500); }
// };
