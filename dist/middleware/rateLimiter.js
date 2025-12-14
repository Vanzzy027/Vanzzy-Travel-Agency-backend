import { rateLimiter } from "hono-rate-limiter";
export const limiter = rateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes
    limit: 100,
    standardHeaders: "draft-6",
    keyGenerator: () => "<unique_key>",
});
