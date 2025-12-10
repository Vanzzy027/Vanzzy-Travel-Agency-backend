// src/Gemini/chatController.ts - FINAL WORKING VERSION
import type { Context } from 'hono'; 
import { GoogleGenerativeAI,type Part } from "@google/generative-ai"; 
import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    tools: [
        { 
            functionDeclarations: toolsSchema 
        } 
    ] as any,
});

export const handleChat = async (c: Context) => {
    try {
        const { message, history } = await c.req.json();
        
        // Get user from context (set by authMiddleware)
        const user = (c as any).user;
        
        if (!user) {
            return c.json({ error: "Authentication required for AI chat" }, 401);
        }

        // Extract the authorization header from the original request
        const authHeader = c.req.header("Authorization");

        // FIX: Always start fresh chat - don't use history
        const chat = model.startChat();

        const result = await chat.sendMessage(message);
        const response = result.response;
        const calls = response.functionCalls();

        if (calls && calls.length > 0) {
            const firstCall = calls[0];
            const functionName = firstCall.name;
            const rawArgs = firstCall.args as any;

            console.log(`[AI] Triggering function: ${functionName} for user ${user.user_id}`);

            let functionResult: string;

            if (functionName === "check_availability") {
                const args = rawArgs as { searchQuery: string };
                
                if (!args.searchQuery) {
                    return c.json({ error: "searchQuery is required" }, 400);
                }

                functionResult = await toolsFunctions.check_availability(args);
            }
            else if (functionName === "create_booking") {
                const args = rawArgs as {
                    vehicle_id: number;
                    days: number;
                    start_date: string;
                };

                if (!args.vehicle_id || !args.days || !args.start_date) {
                    return c.json({ 
                        error: "Missing required fields: vehicle_id, days, and start_date are all required" 
                    }, 400);
                }

                functionResult = await toolsFunctions.create_booking(args, user.user_id, authHeader || '');
            }
            else {
                functionResult = JSON.stringify({
                    error: "Function not found"
                });
            }

            let parsedResult: any;
            try {
                parsedResult = JSON.parse(functionResult);
            } catch (parseError) {
                console.error("Failed to parse function result:", parseError);
                parsedResult = { 
                    error: "Failed to parse function result",
                    rawResult: functionResult 
                };
            }

            const result2 = await chat.sendMessage([
                {
                    functionResponse: {
                        name: functionName,
                        response: parsedResult,
                    },
                } as Part,
            ]);

            return c.json({
                reply: result2.response.text(),
                actionPerformed: functionName,
                functionResult: parsedResult,
            });
        }

        return c.json({ reply: response.text() });

    } catch (error: any) {
        console.error("AI Error:", error);
        return c.json({ 
            error: "AI service error. Please try again." 
        }, 500);
    }
};



// // src/Gemini/chatController.ts - FINAL WORKING VERSION
// import { Context } from 'hono'; 
// import { GoogleGenerativeAI, Part } from "@google/generative-ai"; 
// import { toolsSchema, toolsFunctions } from "../utils/aiTools";

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
// const model = genAI.getGenerativeModel({ 
//     model: "gemini-2.0-flash",
//     tools: [
//         { 
//             functionDeclarations: toolsSchema 
//         } 
//     ] as any,
// });

// export const handleChat = async (c: Context) => {
//     try {
//         const { message, history } = await c.req.json();
        
//         // Get user from context (set by authMiddleware)
//         const user = (c as any).user;
        
//         if (!user) {
//             return c.json({ error: "Authentication required for AI chat" }, 401);
//         }

//         // Extract the authorization header from the original request
//         const authHeader = c.req.header("Authorization");

//         // FIX: Always start fresh chat - don't use history
//         const chat = model.startChat();

//         const result = await chat.sendMessage(message);
//         const response = result.response;
//         const calls = response.functionCalls();

//         if (calls && calls.length > 0) {
//             const firstCall = calls[0];
//             const functionName = firstCall.name;
//             const rawArgs = firstCall.args as any;

//             console.log(`[AI] Triggering function: ${functionName} for user ${user.user_id}`);

//             let functionResult: string;

//             if (functionName === "check_availability") {
//                 const args = rawArgs as { searchQuery: string };
                
//                 if (!args.searchQuery) {
//                     return c.json({ error: "searchQuery is required" }, 400);
//                 }

//                 functionResult = await toolsFunctions.check_availability(args);
//             }
//             else if (functionName === "create_booking") {
//                 const args = rawArgs as {
//                     vehicle_id: number;
//                     days: number;
//                     start_date: string;
//                 };

//                 if (!args.vehicle_id || !args.days || !args.start_date) {
//                     return c.json({ 
//                         error: "Missing required fields: vehicle_id, days, and start_date are all required" 
//                     }, 400);
//                 }

//                 functionResult = await toolsFunctions.create_booking(args, user.user_id, authHeader || '');
//             }
//             else {
//                 functionResult = JSON.stringify({
//                     error: "Function not found"
//                 });
//             }

//             let parsedResult: any;
//             try {
//                 parsedResult = JSON.parse(functionResult);
//             } catch (parseError) {
//                 console.error("Failed to parse function result:", parseError);
//                 parsedResult = { 
//                     error: "Failed to parse function result",
//                     rawResult: functionResult 
//                 };
//             }

//             const result2 = await chat.sendMessage([
//                 {
//                     functionResponse: {
//                         name: functionName,
//                         response: parsedResult,
//                     },
//                 } as Part,
//             ]);

//             return c.json({
//                 reply: result2.response.text(),
//                 actionPerformed: functionName,
//                 functionResult: parsedResult,
//             });
//         }

//         return c.json({ reply: response.text() });

//     } catch (error: any) {
//         console.error("AI Error:", error);
//         return c.json({ 
//             error: "AI service error. Please try again." 
//         }, 500);
//     }
// };
