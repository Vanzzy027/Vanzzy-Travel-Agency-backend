import { Hono } from 'hono';
import { 
    getEligibleBookings, createReview, getUserReviews, 
    getAllReviews, updateReviewStatus 
} from '../Reviews & Rating/ReviewController';

const reviewRoute = new Hono();

// User Routes
reviewRoute.get('/eligible/:userId', getEligibleBookings);
reviewRoute.get('/user/:userId', getUserReviews);
reviewRoute.post('/', createReview);

reviewRoute.post('/', createReview); 

// Admin Routes
reviewRoute.get('/admin/all', getAllReviews);
reviewRoute.put('/admin/:id', updateReviewStatus);

export default reviewRoute;