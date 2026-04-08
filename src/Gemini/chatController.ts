// src/Gemini/chatController.ts
import type { Context } from "hono";
import OpenAI from "openai";
import type { ChatCompletionMessageToolCall } from "openai/resources/index.js";
// @ts-ignore
import { toolsSchema, toolsFunctions } from "../utils/aiTools";

const client = new OpenAI({
  apiKey: process.env.LLAMA_API_KEY,
  baseURL: process.env.LLAMA_BASE_URL,
});

const getSystemPrompt = (userName: string, date: string) => `
You are VansKE AI, a car rental assistant for VansKE Car Rentals in Kenya.
Current User: ${userName}
Today's Date: ${date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1 — GROUNDING (MOST IMPORTANT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have ZERO knowledge of what vehicles exist, their prices, colors,
features, or availability. This information does NOT exist in your training
data. You MUST call check_availability to get it from the database.

FORBIDDEN: Mentioning any vehicle, price, or feature that did not come
from a check_availability tool result in this conversation.

If you mention a vehicle that was not in a tool result, you are HALLUCINATING.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2 — TOOL USE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALWAYS use native tool calls. NEVER print "<function=...>" or raw JSON.
- Call check_availability BEFORE presenting any vehicle options.
- Call check_availability AGAIN if the user wants different options.
- Never re-use stale search results for a new search request.
- Search queries must be SHORT keywords only (e.g. "SUV", "Toyota", "7 seater").
  NEVER include dates in searchQuery — availability is real-time from the DB.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 3 — BOOKING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Only book vehicles whose id appeared in a check_availability result THIS session.
- Before booking, confirm: vehicle name, pickup date, return date, duration.
- Use the vehicle's 'id' from the tool result — NEVER guess or invent an ID.
- Dates must be YYYY-MM-DD. Infer from today (${date}) if user says "next Friday".
- NEVER ask the user for a vehicle ID.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 4 — USER-FACING DISPLAY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- NEVER show vehicle_id, booking_id, or any numeric database IDs to the user.
- Show per vehicle: name (make + model + year), KES price/day, color,
  transmission, seats, fuel type, features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 5 — HONESTY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- If no vehicles match a search, say so honestly. Suggest a broader term.
- Never invent alternatives. Never say "we have X" without tool confirmation.
`;

export const handleChat = async (c: Context) => {
  try {
    const body = await c.req.json();
    const message: string = body.message;
    const history: any[] = body.history || [];

    const user = (c as any).user;
    const authHeader = c.req.header("Authorization") || "";

    if (!user) {
      return c.json({ error: "Authentication required." }, 401);
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const systemPrompt = getSystemPrompt(
      user.first_name || "Customer",
      todayDate,
    );

    // ─── Build message history ────────────────────────────────────────────────
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...normalizeHistory(history),
      { role: "user", content: message },
    ];

    // ─── First LLM call ───────────────────────────────────────────────────────
    const response = await client.chat.completions.create({
      model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
      messages,
      tools: toolsSchema.map((s: any) => ({ type: "function", function: s })),
      tool_choice: "auto",
      temperature: 0.1, // As deterministic as possible — reduces hallucination
    });

    const responseMessage = response.choices[0].message;

    // ─── Detect and execute tool call ─────────────────────────────────────────
    const toolCall = extractToolCall(responseMessage);

    if (toolCall) {
      const { functionName, functionArgs, isFormal, activeToolCall } = toolCall;
      console.log(`[Agent] Tool: ${functionName}`, functionArgs);

      let rawResult: any;
      try {
        if (functionName === "check_availability") {
          rawResult = await toolsFunctions.check_availability(functionArgs);
        } else if (functionName === "create_booking") {
          rawResult = await toolsFunctions.create_booking(
            functionArgs,
            user.user_id,
            authHeader,
          );
        } else {
          rawResult = {
            success: false,
            error: `Unknown tool: ${functionName}`,
          };
        }
      } catch (err: any) {
        rawResult = { success: false, error: err.message };
      }

      const parsedResult =
        typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

      // ─── Build second-call messages ───────────────────────────────────────
      const secondMessages = [...messages];

      if (isFormal && activeToolCall) {
        secondMessages.push({
          role: "assistant",
          content: responseMessage.content ?? "",
          tool_calls: [activeToolCall],
        });
        secondMessages.push({
          role: "tool",
          tool_call_id: activeToolCall.id,
          content: JSON.stringify(parsedResult),
        });
      } else {
        // Leaked text fallback — no fake tool_call_ids (Groq rejects them)
        secondMessages.push({
          role: "system",
          content: `[TOOL RESULT for ${functionName}]: ${JSON.stringify(parsedResult)}\n\nPresent this data naturally. Do NOT expose vehicle IDs or booking IDs.`,
        });
      }

      // Hard grounding reminder right before the summarization call
      secondMessages.push({
        role: "system",
        content:
          "CRITICAL: Only describe vehicles that appear in the tool result above. Do not add, invent, or recall any other vehicles. Never show numeric IDs to the user.",
      });

      const finalResponse = await client.chat.completions.create({
        model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
        messages: secondMessages,
        temperature: 0.1,
      });

      return c.json({
        reply: sanitizeReply(finalResponse.choices[0].message.content ?? ""),
        actionPerformed: functionName,
        functionResult: parsedResult,
      });
    }

    // ─── No tool triggered — plain reply ─────────────────────────────────────
    return c.json({ reply: sanitizeReply(responseMessage.content ?? "") });
  } catch (error: any) {
    console.error("[Agent FATAL]:", error.message || error);
    return c.json(
      { reply: "VansKE AI is experiencing high demand. Please try again." },
      500,
    );
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes stored chat history into valid OpenAI message format.
 */
function normalizeHistory(history: any[]): any[] {
  return history.map((msg: any) => ({
    role: msg.role === "model" ? "assistant" : (msg.role ?? "user"),
    content: msg.parts?.[0]?.text ?? msg.content ?? "",
  }));
}

/**
 * Extracts a tool call from the model response.
 * Handles both native tool calls and leaked text fallback.
 */
function extractToolCall(responseMessage: any): {
  functionName: string;
  functionArgs: any;
  isFormal: boolean;
  activeToolCall?: ChatCompletionMessageToolCall;
} | null {
  // A. Native tool call (correct path)
  if (responseMessage.tool_calls?.length > 0) {
    const tc = responseMessage.tool_calls[0] as ChatCompletionMessageToolCall;
    if (tc.type === "function") {
      try {
        return {
          functionName: tc.function.name,
          functionArgs: JSON.parse(tc.function.arguments),
          isFormal: true,
          activeToolCall: tc,
        };
      } catch {
        console.error(
          "[Agent] Failed to parse native tool args:",
          tc.function.arguments,
        );
        return null;
      }
    }
  }

  // B. Leaked text fallback — intercept and recover
  if (responseMessage.content?.includes("<function=")) {
    console.warn("[Agent] Intercepted leaked tool call in text.");
    const match = responseMessage.content.match(
      /<function=(\w+)>([\s\S]*?)<\/function>/,
    );
    if (match) {
      try {
        return {
          functionName: match[1],
          functionArgs: JSON.parse(match[2].trim()),
          isFormal: false,
        };
      } catch {
        if (match[1] === "check_availability") {
          return {
            functionName: match[1],
            functionArgs: { searchQuery: "available vehicles" },
            isFormal: false,
          };
        }
        return null;
      }
    }
  }

  return null;
}

/**
 * Last-resort reply sanitizer — strips any leaked numeric IDs.
 */
function sanitizeReply(text: string): string {
  return text
    .replace(/\b(vehicle[_\s]?id|booking[_\s]?id)\s*[:#]?\s*\d+/gi, "")
    .replace(/\bid\s*[:#]\s*\d+/gi, "")
    .replace(/#\d{4,}/g, "")
    .replace(/\(\s*id\s*:\s*\d+\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// // src/Gemini/chatController.ts
// import type { Context } from "hono";
// import OpenAI from "openai";
// import type { ChatCompletionMessageToolCall } from "openai/resources/index.js";
// import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// // Initialize OpenAI-compatible client (Groq)
// const client = new OpenAI({
//   apiKey: process.env.LLAMA_API_KEY,
//   baseURL: process.env.LLAMA_BASE_URL,
// });

// /**
//  * SYSTEM PROMPT
//  * Strict instructions to prevent hallucination, ID leaking, and lazy tool use.
//  */
// const getSystemPrompt = (userName: string, date: string) => `
// You are VansKE AI, an elite car rental assistant for VansKE Car Rentals.
// Current User: ${userName}
// Current Date: ${date}

// ═══════════════════════════════════════
// ABSOLUTE RULES — NEVER VIOLATE THESE:
// ═══════════════════════════════════════

// 1. TOOL USE IS MANDATORY:
//    - ALWAYS use the native tool-calling mechanism. NEVER print "<function=...>",
//      raw JSON, or any tool syntax in your reply text. If you do not use the tool
//      system, you are broken.

// 2. VEHICLE IDs ARE INTERNAL — NEVER SHOW THEM TO THE USER:
//    - IDs (e.g. vehicle_id: 42) are for backend use only.
//    - When presenting vehicles, use ONLY: name, year, price per day, color,
//      transmission, seating capacity, fuel type.
//    - When a user picks a car by name (e.g. "I'll take the Subaru"), you MUST
//      silently look up its ID from your most recent search result. NEVER ask the
//      user for an ID. NEVER show an ID in any message.

// 3. NO HALLUCINATION:
//    - ONLY book vehicles that appeared in your most recent check_availability
//      result. If you did not run a search yet, run one first.
//    - NEVER invent vehicle details, prices, IDs, or availability.

// 4. DATE INFERENCE:
//    - If a user says "next Friday" or "10th April", calculate the exact YYYY-MM-DD
//      using today's date (${date}). Confirm the dates back to the user in plain
//      language before booking.

// 5. BOOKING CONFIRMATION FLOW:
//    - Before calling create_booking, always confirm: vehicle name, start date,
//      end date, and number of days with the user.
//    - Only call create_booking after the user says "yes", "confirm", "go ahead",
//      or similar affirmation.

// 6. MISSING INFO:
//    - If you lack enough information to call a tool, ask the user ONE clear
//      question at a time. Never make assumptions.

// 7. TONE:
//    - Be concise, warm, and professional. No robotic lists unless showing
//      multiple vehicle options.
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

//     // ─── 1. Build Message Array ───────────────────────────────────────────────
//     const messages: any[] = [
//       { role: "system", content: systemPrompt },
//       ...history.map((msg: any) => ({
//         role: msg.role === "model" ? "assistant" : "user",
//         content: msg.parts?.[0]?.text ?? "",
//       })),
//       { role: "user", content: message },
//     ];

//     // ─── 2. First LLM Call ────────────────────────────────────────────────────
//     const response = await client.chat.completions.create({
//       model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
//       messages,
//       tools: toolsSchema.map((s) => ({ type: "function", function: s })),
//       tool_choice: "auto",
//       temperature: 0.3, // Lower = more deterministic, fewer hallucinations
//     });

//     const responseMessage = response.choices[0].message;

//     // ─── 3. Detect Tool Call ──────────────────────────────────────────────────
//     let functionName = "";
//     let functionArgs: any = null;
//     let isFormalToolCall = false;
//     let activeToolCall: ChatCompletionMessageToolCall | undefined;

//     // A. Native tool call (the correct path)
//     if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
//       activeToolCall = responseMessage
//         .tool_calls[0] as ChatCompletionMessageToolCall;

//       if (activeToolCall.type === "function") {
//         isFormalToolCall = true;
//         functionName = activeToolCall.function.name;
//         try {
//           functionArgs = JSON.parse(activeToolCall.function.arguments);
//         } catch {
//           console.error(
//             "[Agent] Failed to parse native tool args:",
//             activeToolCall.function.arguments,
//           );
//           return c.json({
//             reply:
//               "I ran into an internal error. Could you rephrase your request?",
//           });
//         }
//       }
//     }
//     // B. Leaked text fallback — intercept and re-run properly
//     else if (
//       responseMessage.content &&
//       responseMessage.content.includes("<function=")
//     ) {
//       console.warn(
//         "[Agent] WARNING: Model leaked a tool call as text. Intercepting.",
//       );

//       const match = responseMessage.content.match(
//         /<function=(\w+)>([\s\S]*?)<\/function>/,
//       );
//       if (match) {
//         functionName = match[1];
//         try {
//           functionArgs = JSON.parse(match[2].trim());
//         } catch {
//           // Partial parse failed — recover gracefully using the user's message
//           console.error("[Agent] Failed to parse leaked tool args:", match[2]);
//           functionArgs =
//             functionName === "check_availability"
//               ? { searchQuery: message }
//               : null;
//         }
//       }

//       // If we couldn't recover args, return a safe failure
//       if (!functionArgs) {
//         return c.json({
//           reply:
//             "I had trouble processing that. Could you describe what you're looking for?",
//         });
//       }
//     }

//     // ─── 4. Execute Tool ──────────────────────────────────────────────────────
//     if (functionName && functionArgs) {
//       console.log(`[Agent] Executing: ${functionName}`, functionArgs);

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
//           rawResult = {
//             success: false,
//             error: `Unknown function: ${functionName}`,
//           };
//         }
//       } catch (error: any) {
//         rawResult = { success: false, error: error.message };
//       }

//       const parsedResult =
//         typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

//       // ─── 5. Second LLM Call (Summarise Tool Result) ───────────────────────
//       const secondCallMessages = [...messages];

//       if (isFormalToolCall && activeToolCall) {
//         // Standard spec: assistant message with tool_calls + tool result
//         secondCallMessages.push({
//           role: "assistant",
//           content: responseMessage.content ?? "",
//           tool_calls: [activeToolCall],
//         });
//         secondCallMessages.push({
//           role: "tool",
//           tool_call_id: activeToolCall.id,
//           content: JSON.stringify(parsedResult),
//         });
//       } else {
//         // Fallback spec: inject as a system observation to avoid bad tool_call_id
//         secondCallMessages.push({
//           role: "system",
//           content: `[SYSTEM OBSERVATION] The tool '${functionName}' returned: ${JSON.stringify(parsedResult)}. Present this information naturally to the user. Do NOT expose any vehicle IDs, database IDs, or internal numbers.`,
//         });
//       }

//       // Add a hard reminder to the second call
//       secondCallMessages.push({
//         role: "system",
//         content:
//           "REMINDER: Do NOT include vehicle_id, booking_id numbers, or any internal IDs in your reply. Refer to vehicles by their make, model, and year only.",
//       });

//       const finalResponse = await client.chat.completions.create({
//         model: process.env.LLAMA_MODEL || "llama-3.3-70b-versatile",
//         messages: secondCallMessages,
//         temperature: 0.3,
//       });

//       const finalReply = finalResponse.choices[0].message.content ?? "";

//       // ─── 6. Strip any leaked IDs as a last-resort filter ─────────────────
//       const sanitizedReply = sanitizeReply(finalReply);

//       return c.json({
//         reply: sanitizedReply,
//         actionPerformed: functionName,
//         // Only return structured result for the frontend — not echoed in chat
//         functionResult: parsedResult,
//       });
//     }

//     // ─── 7. Standard Reply (No tool triggered) ────────────────────────────────
//     return c.json({ reply: responseMessage.content ?? "" });
//   } catch (error: any) {
//     console.error("[Agent FATAL Error]:", error.message || error);
//     if (error.response) console.error("Provider details:", error.response.data);

//     return c.json(
//       {
//         reply:
//           "VansKE AI is experiencing high demand right now. Please try again in a moment.",
//       },
//       500,
//     );
//   }
// };

// /**
//  * sanitizeReply
//  * Last-resort text filter to strip any numeric IDs the model may have leaked.
//  * Removes patterns like:
//  *   "Vehicle ID: 12345"  |  "ID: 42"  |  "id: 99"  |  "#12345"
//  */
// function sanitizeReply(text: string): string {
//   return text
//     .replace(/\b(vehicle[_\s]?id|booking[_\s]?id|id)\s*[:#]?\s*\d+/gi, "")
//     .replace(/#\d{3,}/g, "") // strip "#12345"-style refs
//     .replace(/\(\s*id\s*:\s*\d+\s*\)/gi, "") // strip "(id: 42)"
//     .replace(/\s{2,}/g, " ") // clean up double spaces left behind
//     .trim();
// }

// // // src/Gemini/chatController.ts
// // import type { Context } from "hono";
// // import OpenAI from "openai";
// // import type { ChatCompletionMessageToolCall } from "openai/resources/index.js";
// // import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// // // Initialize OpenAI client
// // const client = new OpenAI({
// //   apiKey: process.env.LLAMA_API_KEY,
// //   baseURL: process.env.LLAMA_BASE_URL,
// // });

// // /**
// //  * ADVANCED SYSTEM PROMPT
// //  * This leaves no room for the LLM to hallucinate or act lazy.
// //  */
// // const getSystemPrompt = (userName: string, date: string) => `
// // You are VansKE AI, the elite car rental assistant.
// // Current User: ${userName}
// // Current Date: ${date}

// // CRITICAL RULES:
// // 1. SILENT EXECUTION: NEVER print '<function=...>' or raw JSON to the user. ALWAYS use the native tool-calling feature.
// // 2. CONTEXT RETENTION: You MUST memorize 'vehicle_id' values from search results. If a user says "I'll take the Subaru", you must automatically infer the vehicle_id from the previous search. Do NOT ask the user for an ID if you already showed it to them.
// // 3. DATE INFERENCE: If a user says "next Friday", calculate the exact YYYY-MM-DD based on today's date (${date}).
// // 4. NO GUESSWORK: If you lack the vehicle_id, days, or start_date for a booking, ASK the user clearly. Do not make up IDs.
// // 5. PROFESSIONAL TONE: Be concise, highly helpful, and conversational. No robotic responses.
// // `;

// // export const handleChat = async (c: Context) => {
// //   try {
// //     const body = await c.req.json();
// //     const message: string = body.message;
// //     const history: any[] = body.history || [];

// //     const user = (c as any).user;
// //     const authHeader = c.req.header("Authorization") || "";

// //     if (!user) {
// //       return c.json({ error: "Authentication required." }, 401);
// //     }

// //     const todayDate = new Date().toISOString().split("T")[0];
// //     const systemPrompt = getSystemPrompt(
// //       user.first_name || "Customer",
// //       todayDate,
// //     );

// //     // 1. Construct strict message array
// //     const messages: any[] = [
// //       { role: "system", content: systemPrompt },
// //       ...history.map((msg: any) => ({
// //         role: msg.role === "model" ? "assistant" : "user",
// //         // Fallback to empty string to satisfy Groq/Llama strict content rules
// //         content: msg.parts?.[0]?.text || "",
// //       })),
// //       { role: "user", content: message },
// //     ];

// //     // 2. Initial AI Inference
// //     const response = await client.chat.completions.create({
// //       model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
// //       messages,
// //       tools: toolsSchema.map((s) => ({ type: "function", function: s })),
// //       tool_choice: "auto",
// //     });

// //     const responseMessage = response.choices[0].message;

// //     // --- TOOL EXECUTION LOGIC ---
// //     let functionName = "";
// //     let functionArgs: any = null;
// //     let isFormalToolCall = false;
// //     let activeToolCall: ChatCompletionMessageToolCall | undefined;

// //     // A. Check for formal, native tool calls
// //     if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
// //       // Clean type assertion to bypass TypeScript union errors safely
// //       activeToolCall = responseMessage
// //         .tool_calls[0] as ChatCompletionMessageToolCall;

// //       if (activeToolCall.type === "function") {
// //         isFormalToolCall = true;
// //         functionName = activeToolCall.function.name;
// //         try {
// //           functionArgs = JSON.parse(activeToolCall.function.arguments);
// //         } catch (e) {
// //           console.error(
// //             "[Agent] Failed to parse native tool args:",
// //             activeToolCall.function.arguments,
// //           );
// //           return c.json({
// //             reply:
// //               "I encountered an internal error processing your request. Could you rephrase?",
// //           });
// //         }
// //       }
// //     }
// //     // B. Fallback: Catch text-leaked function tags
// //     else if (
// //       responseMessage.content &&
// //       responseMessage.content.includes("<function=")
// //     ) {
// //       console.warn("[Agent] Intercepted text-leaked function call.");
// //       const match = responseMessage.content.match(
// //         /<function=(\w+)>(.*?)<\/function>/s,
// //       );
// //       if (match) {
// //         functionName = match[1];
// //         try {
// //           functionArgs = JSON.parse(match[2].trim());
// //         } catch (e) {
// //           // If the model leaked garbage JSON, isolate the failure.
// //           console.error("[Agent] Failed to parse leaked tool args:", match[2]);
// //           functionArgs = { searchQuery: message }; // Last resort semantic fallback
// //         }
// //       }
// //     }

// //     // 3. Process the Tool Call if one was identified
// //     if (functionName && functionArgs) {
// //       console.log(
// //         `[Agent] Executing: ${functionName} with args:`,
// //         functionArgs,
// //       );

// //       let rawResult: any;
// //       try {
// //         if (functionName === "check_availability") {
// //           rawResult = await toolsFunctions.check_availability(functionArgs);
// //         } else if (functionName === "create_booking") {
// //           rawResult = await toolsFunctions.create_booking(
// //             functionArgs,
// //             user.user_id,
// //             authHeader,
// //           );
// //         } else {
// //           rawResult = {
// //             success: false,
// //             error: `Unknown function: ${functionName}`,
// //           };
// //         }
// //       } catch (error: any) {
// //         rawResult = { success: false, error: error.message };
// //       }

// //       const parsedResult =
// //         typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

// //       // 4. Second Call: Feed result back to AI
// //       const secondCallMessages = [...messages];

// //       if (isFormalToolCall && activeToolCall) {
// //         // Standard OpenAI specification for tool responses
// //         secondCallMessages.push({
// //           role: "assistant",
// //           content: responseMessage.content || "",
// //           tool_calls: [activeToolCall],
// //         });
// //         secondCallMessages.push({
// //           role: "tool",
// //           tool_call_id: activeToolCall.id,
// //           content: JSON.stringify(parsedResult),
// //         });
// //       } else {
// //         // Fallback specification: Groq throws 400 errors if you send fake tool_call_ids.
// //         // If we caught a regex leak, we feed the data back as a system observation.
// //         secondCallMessages.push({
// //           role: "system",
// //           content: `Observation from internal system: The requested tool '${functionName}' returned the following data: ${JSON.stringify(parsedResult)}. Summarize this naturally to the user.`,
// //         });
// //       }

// //       const finalResponse = await client.chat.completions.create({
// //         model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
// //         messages: secondCallMessages,
// //       });

// //       return c.json({
// //         reply: finalResponse.choices[0].message.content,
// //         actionPerformed: functionName,
// //         functionResult: parsedResult,
// //       });
// //     }

// //     // 5. Standard Reply (No tools triggered)
// //     return c.json({ reply: responseMessage.content });
// //   } catch (error: any) {
// //     console.error("[Agent FATAL Error]:", error.message || error);
// //     if (error.response) console.error("Provider details:", error.response.data);

// //     return c.json(
// //       {
// //         error:
// //           "VansKE AI systems are currently heavily loaded. Please try again in a moment.",
// //       },
// //       500,
// //     );
// //   }
// // };
