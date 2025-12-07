// import { Context, Next } from "hono";

// export const mpesaCallbackGuard = async (c: Context, next: Next) => {
//   const allowed = ["196.201.214.200"]; // Safaricom IP
//   const ip = c.req.header("x-forwarded-for") || "0.0.0.0";

//   if (!allowed.includes(ip)) {
//     return c.json({ error: "Unauthorized callback source" }, 403);
//   }

//   await next();
// };
