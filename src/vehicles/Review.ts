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