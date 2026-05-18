import type { Context } from "hono";
import { ReviewService } from "../Reviews & Rating/ReviewService.js";

const reviewService = new ReviewService();

export const getEligibleBookings = async (c: Context) => {
  try {
    const userId = c.req.param("userId") || "";
    const bookings = await reviewService.getEligibleBookings(userId);
    return c.json(bookings, 200);
  } catch (e: any) {
    console.error("Error in getEligibleBookings:", e);
    return c.json(
      { error: "Failed to fetch eligible bookings. Please try again later." },
      500,
    );
  }
};

export const createReview = async (c: Context) => {
  try {
    const body = await c.req.json();
    await reviewService.createReview(body);
    return c.json({ message: "Success" }, 201);
  } catch (e: any) {
    console.error("Error creating review:", e);
    return c.json({ error: "Failed to submit review. Please try again." }, 500);
  }
};

export const getUserReviews = async (c: Context) => {
  try {
    const userId = c.req.param("userId") || "";
    const reviews = await reviewService.getUserReviews(userId);
    return c.json(reviews, 200);
  } catch (e: any) {
    console.error("Error in getUserReviews:", e);
    return c.json(
      { error: "Failed to fetch reviews. Please try again later." },
      500,
    );
  }
};

export const getAllReviews = async (c: Context) => {
  // Admin
  try {
    const reviews = (await reviewService.getAllReviews()) || [];
    return c.json(reviews, 200);
  } catch (e: any) {
    console.error("Error in getAllReviews:", e);
    return c.json({ error: "Failed to retrieve all reviews." }, 500);
  }
};

export const updateReviewStatus = async (c: Context) => {
  // Admin
  try {
    const idParam = c.req.param("id");
    if (!idParam) return c.json({ error: "ID is required" }, 400);
    const id = parseInt(idParam);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const { status, is_featured } = await c.req.json();
    await reviewService.updateReviewStatus(id, status, is_featured);
    return c.json({ message: "Updated" }, 200);
  } catch (e: any) {
    console.error("Error updating review status:", e);
    return c.json({ error: "Failed to update review status." }, 500);
  }
};
