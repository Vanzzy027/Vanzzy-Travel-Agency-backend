// Generic validation middleware
export const validateData = (schema) => {
    return async (c, next) => {
        try {
            const body = await c.req.json();
            const validation = schema.safeParse(body);
            if (!validation.success) {
                // Extract clean error messages
                const errorMessages = validation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                return c.json({
                    success: false,
                    error: "Validation failed",
                    details: errorMessages
                }, 400);
            }
            // Store validated data in context
            c.set('validatedData', validation.data);
            await next();
        }
        catch (error) {
            return c.json({
                success: false,
                error: "Invalid JSON format"
            }, 400);
        }
    };
};
// Query param validation middleware
export const validateQuery = (schema) => {
    return async (c, next) => {
        const query = c.req.query();
        const validation = schema.safeParse(query);
        if (!validation.success) {
            const errorMessages = validation.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            return c.json({
                success: false,
                error: "Query validation failed",
                details: errorMessages
            }, 400);
        }
        c.set('validatedQuery', validation.data);
        await next();
    };
};
// Path param validation middleware
export const validateParams = (schema) => {
    return async (c, next) => {
        const params = c.req.param();
        const validation = schema.safeParse(params);
        if (!validation.success) {
            const errorMessages = validation.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            return c.json({
                success: false,
                error: "Parameter validation failed",
                details: errorMessages
            }, 400);
        }
        c.set('validatedParams', validation.data);
        await next();
    };
};
