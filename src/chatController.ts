// // src/Gemini/chatController.ts
// import type { Context } from "hono";
// import OpenAI from "openai";
// import type { ChatCompletionMessageToolCall } from "openai/resources/index.js";
// import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// const client = new OpenAI({
//   apiKey: process.env.LLAMA_API_KEY,
//   baseURL: process.env.LLAMA_BASE_URL,
// });

// const getSystemPrompt = (userName: string, date: string) => `
// You are VansKE AI, a car rental assistant for VansKE Car Rentals in Kenya.
// Current User: ${userName}
// Today's Date: ${date}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE 1 — GROUNDING (MOST IMPORTANT):
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// You have ZERO knowledge of what vehicles exist, their prices, colors,
// features, or availability. This information does NOT exist in your training
// data. You MUST call check_availability to get it from the database.

// FORBIDDEN: Mentioning any vehicle, price, or feature that did not come
// from a check_availability tool result in this conversation.

// If you mention a vehicle that was not in a tool result, you are HALLUCINATING.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE 2 — TOOL USE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// - ALWAYS use native tool calls. NEVER print "<function=...>" or raw JSON.
// - Call check_availability BEFORE presenting any vehicle options.
// - Call check_availability AGAIN if the user wants different options.
// - Never re-use stale search results for a new search request.
// - Search queries must be SHORT keywords only (e.g. "SUV", "Toyota", "7 seater").
//   NEVER include dates in searchQuery — availability is real-time from the DB.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE 3 — BOOKING:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// - Only book vehicles whose id appeared in a check_availability result THIS session.
// - Before booking, confirm: vehicle name, pickup date, return date, duration.
// - Use the vehicle's 'id' from the tool result — NEVER guess or invent an ID.
// - Dates must be YYYY-MM-DD. Infer from today (${date}) if user says "next Friday".
// - NEVER ask the user for a vehicle ID.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE 4 — USER-FACING DISPLAY:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// - NEVER show vehicle_id, booking_id, or any numeric database IDs to the user.
// - Show per vehicle: name (make + model + year), KES price/day, color,
//   transmission, seats, fuel type, features.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE 5 — HONESTY:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// - If no vehicles match a search, say so honestly. Suggest a broader term.
// - Never invent alternatives. Never say "we have X" without tool confirmation.
// `;

// export const handleChat = async (c: Context) => {
//   try {
//     const body = await c.req.json();
//     const message: string = body.message;
//     const history: any[] = body.history || [];

//     const user = (c as any).user;
//     const authHeader = c.req.header("Authorization") || "";

//     if (!user) {
//       return c.json({ error: "Authentication required." }, 401);
//     }

//     const todayDate = new Date().toISOString().split("T")[0];
//     const systemPrompt = getSystemPrompt(
//       user.first_name || "Customer",
//       todayDate,
//     );

//     // ─── Build message history ────────────────────────────────────────────────
//     const messages: any[] = [
//       { role: "system", content: systemPrompt },
//       ...normalizeHistory(history),
//       { role: "user", content: message },
//     ];

//     // ─── First LLM call ───────────────────────────────────────────────────────
//     const response = await client.chat.completions.create({
//       model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
//       messages,
//       tools: toolsSchema.map((s) => ({ type: "function", function: s })),
//       tool_choice: "auto",
//       temperature: 0.1, // As deterministic as possible — reduces hallucination
//     });

//     const responseMessage = response.choices[0].message;

//     // ─── Detect and execute tool call ─────────────────────────────────────────
//     const toolCall = extractToolCall(responseMessage);

//     if (toolCall) {
//       const { functionName, functionArgs, isFormal, activeToolCall } = toolCall;
//       console.log(`[Agent] Tool: ${functionName}`, functionArgs);

//       let rawResult: any;
//       try {
//         if (functionName === "check_availability") {
//           rawResult = await toolsFunctions.check_availability(functionArgs);
//         } else if (functionName === "create_booking") {
//           rawResult = await toolsFunctions.create_booking(
//             functionArgs,
//             user.user_id,
//             authHeader,
//           );
//         } else {
//           rawResult = { success: false, error: `Unknown tool: ${functionName}` };
//         }
//       } catch (err: any) {
//         rawResult = { success: false, error: err.message };
//       }

//       const parsedResult =
//         typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

//       // ─── Build second-call messages ───────────────────────────────────────
//       const secondMessages = [...messages];

//       if (isFormal && activeToolCall) {
//         secondMessages.push({
//           role: "assistant",
//           content: responseMessage.content ?? "",
//           tool_calls: [activeToolCall],
//         });
//         secondMessages.push({
//           role: "tool",
//           tool_call_id: activeToolCall.id,
//           content: JSON.stringify(parsedResult),
//         });
//       } else {
//         // Leaked text fallback — no fake tool_call_ids (Groq rejects them)
//         secondMessages.push({
//           role: "system",
//           content: `[TOOL RESULT for ${functionName}]: ${JSON.stringify(parsedResult)}\n\nPresent this data naturally. Do NOT expose vehicle IDs or booking IDs.`,
//         });
//       }

//       // Hard grounding reminder right before the summarization call
//       secondMessages.push({
//         role: "system",
//         content:
//           "CRITICAL: Only describe vehicles that appear in the tool result above. Do not add, invent, or recall any other vehicles. Never show numeric IDs to the user.",
//       });

//       const finalResponse = await client.chat.completions.create({
//         model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
//         messages: secondMessages,
//         temperature: 0.1,
//       });

//       return c.json({
//         reply: sanitizeReply(finalResponse.choices[0].message.content ?? ""),
//         actionPerformed: functionName,
//         functionResult: parsedResult,
//       });
//     }

//     // ─── No tool triggered — plain reply ─────────────────────────────────────
//     return c.json({ reply: sanitizeReply(responseMessage.content ?? "") });
//   } catch (error: any) {
//     console.error("[Agent FATAL]:", error.message || error);
//     return c.json(
//       { reply: "VansKE AI is experiencing high demand. Please try again." },
//       500,
//     );
//   }
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// /**
//  * Normalizes stored chat history into valid OpenAI message format.
//  */
// function normalizeHistory(history: any[]): any[] {
//   return history.map((msg: any) => ({
//     role: msg.role === "model" ? "assistant" : msg.role ?? "user",
//     content: msg.parts?.[0]?.text ?? msg.content ?? "",
//   }));
// }

// /**
//  * Extracts a tool call from the model response.
//  * Handles both native tool calls and leaked text fallback.
//  */
// function extractToolCall(responseMessage: any): {
//   functionName: string;
//   functionArgs: any;
//   isFormal: boolean;
//   activeToolCall?: ChatCompletionMessageToolCall;
// } | null {
//   // A. Native tool call (correct path)
//   if (responseMessage.tool_calls?.length > 0) {
//     const tc = responseMessage.tool_calls[0] as ChatCompletionMessageToolCall;
//     if (tc.type === "function") {
//       try {
//         return {
//           functionName: tc.function.name,
//           functionArgs: JSON.parse(tc.function.arguments),
//           isFormal: true,
//           activeToolCall: tc,
//         };
//       } catch {
//         console.error("[Agent] Failed to parse native tool args:", tc.function.arguments);
//         return null;
//       }
//     }
//   }

//   // B. Leaked text fallback — intercept and recover
//   if (responseMessage.content?.includes("<function=")) {
//     console.warn("[Agent] Intercepted leaked tool call in text.");
//     const match = responseMessage.content.match(
//       /<function=(\w+)>([\s\S]*?)<\/function>/,
//     );
//     if (match) {
//       try {
//         return {
//           functionName: match[1],
//           functionArgs: JSON.parse(match[2].trim()),
//           isFormal: false,
//         };
//       } catch {
//         if (match[1] === "check_availability") {
//           return {
//             functionName: match[1],
//             functionArgs: { searchQuery: "available vehicles" },
//             isFormal: false,
//           };
//         }
//         return null;
//       }
//     }
//   }

//   return null;
// }

// /**
//  * Last-resort reply sanitizer — strips any leaked numeric IDs.
//  */
// function sanitizeReply(text: string): string {
//   return text
//     .replace(/\b(vehicle[_\s]?id|booking[_\s]?id)\s*[:#]?\s*\d+/gi, "")
//     .replace(/\bid\s*[:#]\s*\d+/gi, "")
//     .replace(/#\d{4,}/g, "")
//     .replace(/\(\s*id\s*:\s*\d+\s*\)/gi, "")
//     .replace(/\s{2,}/g, " ")
//     .trim();
// }
