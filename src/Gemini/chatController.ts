// src/Gemini/chatController.ts
import type { Context } from "hono";
import OpenAI from "openai";
import type { ChatCompletionMessageToolCall } from "openai/resources/index.js";
import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.LLAMA_API_KEY,
  baseURL: process.env.LLAMA_BASE_URL,
});

/**
 * ADVANCED SYSTEM PROMPT
 * This leaves no room for the LLM to hallucinate or act lazy.
 */
const getSystemPrompt = (userName: string, date: string) => `
You are VansKE AI, the elite car rental assistant. 
Current User: ${userName}
Current Date: ${date}

CRITICAL RULES:
1. SILENT EXECUTION: NEVER print '<function=...>' or raw JSON to the user. ALWAYS use the native tool-calling feature.
2. CONTEXT RETENTION: You MUST memorize 'vehicle_id' values from search results. If a user says "I'll take the Subaru", you must automatically infer the vehicle_id from the previous search. Do NOT ask the user for an ID if you already showed it to them.
3. DATE INFERENCE: If a user says "next Friday", calculate the exact YYYY-MM-DD based on today's date (${date}).
4. NO GUESSWORK: If you lack the vehicle_id, days, or start_date for a booking, ASK the user clearly. Do not make up IDs.
5. PROFESSIONAL TONE: Be concise, highly helpful, and conversational. No robotic responses.
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

    // 1. Construct strict message array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.map((msg: any) => ({
        role: msg.role === "model" ? "assistant" : "user",
        // Fallback to empty string to satisfy Groq/Llama strict content rules
        content: msg.parts?.[0]?.text || "",
      })),
      { role: "user", content: message },
    ];

    // 2. Initial AI Inference
    const response = await client.chat.completions.create({
      model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
      messages,
      tools: toolsSchema.map((s) => ({ type: "function", function: s })),
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // --- TOOL EXECUTION LOGIC ---
    let functionName = "";
    let functionArgs: any = null;
    let isFormalToolCall = false;
    let activeToolCall: ChatCompletionMessageToolCall | undefined;

    // A. Check for formal, native tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Clean type assertion to bypass TypeScript union errors safely
      activeToolCall = responseMessage
        .tool_calls[0] as ChatCompletionMessageToolCall;

      if (activeToolCall.type === "function") {
        isFormalToolCall = true;
        functionName = activeToolCall.function.name;
        try {
          functionArgs = JSON.parse(activeToolCall.function.arguments);
        } catch (e) {
          console.error(
            "[Agent] Failed to parse native tool args:",
            activeToolCall.function.arguments,
          );
          return c.json({
            reply:
              "I encountered an internal error processing your request. Could you rephrase?",
          });
        }
      }
    }
    // B. Fallback: Catch text-leaked function tags
    else if (
      responseMessage.content &&
      responseMessage.content.includes("<function=")
    ) {
      console.warn("[Agent] Intercepted text-leaked function call.");
      const match = responseMessage.content.match(
        /<function=(\w+)>(.*?)<\/function>/s,
      );
      if (match) {
        functionName = match[1];
        try {
          functionArgs = JSON.parse(match[2].trim());
        } catch (e) {
          // If the model leaked garbage JSON, isolate the failure.
          console.error("[Agent] Failed to parse leaked tool args:", match[2]);
          functionArgs = { searchQuery: message }; // Last resort semantic fallback
        }
      }
    }

    // 3. Process the Tool Call if one was identified
    if (functionName && functionArgs) {
      console.log(
        `[Agent] Executing: ${functionName} with args:`,
        functionArgs,
      );

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
            error: `Unknown function: ${functionName}`,
          };
        }
      } catch (error: any) {
        rawResult = { success: false, error: error.message };
      }

      const parsedResult =
        typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

      // 4. Second Call: Feed result back to AI
      const secondCallMessages = [...messages];

      if (isFormalToolCall && activeToolCall) {
        // Standard OpenAI specification for tool responses
        secondCallMessages.push({
          role: "assistant",
          content: responseMessage.content || "",
          tool_calls: [activeToolCall],
        });
        secondCallMessages.push({
          role: "tool",
          tool_call_id: activeToolCall.id,
          content: JSON.stringify(parsedResult),
        });
      } else {
        // Fallback specification: Groq throws 400 errors if you send fake tool_call_ids.
        // If we caught a regex leak, we feed the data back as a system observation.
        secondCallMessages.push({
          role: "system",
          content: `Observation from internal system: The requested tool '${functionName}' returned the following data: ${JSON.stringify(parsedResult)}. Summarize this naturally to the user.`,
        });
      }

      const finalResponse = await client.chat.completions.create({
        model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
        messages: secondCallMessages,
      });

      return c.json({
        reply: finalResponse.choices[0].message.content,
        actionPerformed: functionName,
        functionResult: parsedResult,
      });
    }

    // 5. Standard Reply (No tools triggered)
    return c.json({ reply: responseMessage.content });
  } catch (error: any) {
    console.error("[Agent FATAL Error]:", error.message || error);
    if (error.response) console.error("Provider details:", error.response.data);

    return c.json(
      {
        error:
          "VansKE AI systems are currently heavily loaded. Please try again in a moment.",
      },
      500,
    );
  }
};

// // src/Gemini/chatController.ts (Now Llama Controller)
// import type { Context } from "hono";
// import OpenAI from "openai";
// import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// // Initialize OpenAI client for Llama (Groq/Together/Self-hosted)
// const client = new OpenAI({
//   apiKey: process.env.LLAMA_API_KEY,
//   baseURL: process.env.LLAMA_BASE_URL, // e.g., https://api.groq.com/openai/v1
// });

// const systemPrompt = `
// You are the VansKE AI Agent. Your goal is to make renting a car effortless.
// RULES:
// 1. MEMORY: Always remember the 'vehicle_id' of vehicles you find in search results.
// 2. PROACTIVE: If a user says "I'll take the Subaru" and you just showed them a Subaru with ID 105, do NOT ask for the ID. Use 105 automatically.
// 3. DATE MATH: Today is ${new Date().toISOString().split("T")[0]}. If a user says "next Monday," calculate the YYYY-MM-DD string yourself.
// 4. TOOL USAGE: Never show <function> tags to the user. Use tools silently.
// 5. NO HALLUCINATION: If you haven't searched yet, run 'check_availability' first.
// `;

// export const handleChat = async (c: Context) => {
//   try {
//     const { message, history } = await c.req.json();
//     const user = (c as any).user;
//     const authHeader = c.req.header("Authorization") || "";

//     // SYSTEM PROMPT: The "Rules of Engagement"
//     const systemPrompt = `You are the VansKE AI Agent.
//     - Today is ${new Date().toDateString()}.
//     - User: ${user.first_name || "Customer"}.
//     - If you find vehicles, REMEMBER their IDs. If a user picks one later, use that ID automatically.
//     - IMPORTANT: When using a tool, do NOT print <function> tags. Use the tool-calling system.`;

//     const messages: any[] = [
//       { role: "system", content: systemPrompt },
//       ...history.map((msg: any) => ({
//         role: msg.role === "model" ? "assistant" : "user",
//         content: msg.parts?.[0]?.text || "",
//       })),
//       { role: "user", content: message },
//     ];

//     const response = await client.chat.completions.create({
//       model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
//       messages,
//       tools: toolsSchema.map(s => ({ type: "function", function: s })),
//       tool_choice: "auto",
//     });

//     let assistantMsg = response.choices[0].message;
//     let toolCall = assistantMsg.tool_calls?.[0];

//     // --- THE "GOOD BRAIN" INTERCEPTOR ---
//     // If Llama leaks text like "<function=check_availability>...", we catch it here.
//     if (!toolCall && assistantMsg.content?.includes("<function=")) {
//       const match = assistantMsg.content.match(/<function=(\w+)>(.*?)<\/function>/s);
//       if (match) {
//         toolCall = {
//           id: `manual_${Date.now()}`,
//           type: "function",
//           function: { name: match[1], arguments: match[2].trim() }
//         } as any;
//       }
//     }

//     if (toolCall) {
//       const functionName = toolCall.function.name;
//       const args = JSON.parse(toolCall.function.arguments);

//       console.log(`[Agent] Calling: ${functionName} with args:`, args);

//       let toolResult: any;
//       if (functionName === "check_availability") {
//         toolResult = await toolsFunctions.check_availability(args);
//       } else if (functionName === "create_booking") {
//         toolResult = await toolsFunctions.create_booking(args, user.user_id, authHeader);
//       }

//       const parsedResult = typeof toolResult === "string" ? JSON.parse(toolResult) : toolResult;

//       // --- THE AGENT LOOP: SECOND CALL ---
//       // We send the data back to the AI so it can give a clean "human" answer.
//       const secondResponse = await client.chat.completions.create({
//         model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
//         messages: [
//           ...messages,
//           {
//             role: "assistant",
//             content: assistantMsg.content || "", // Include the text it leaked
//             tool_calls: assistantMsg.tool_calls || [toolCall], // Ensure tool_calls is populated
//           },
//           {
//             role: "tool",
//             tool_call_id: toolCall.id,
//             content: JSON.stringify(parsedResult),
//           },
//         ],
//       });

//       return c.json({
//         reply: secondResponse.choices[0].message.content,
//         actionPerformed: functionName,
//         functionResult: parsedResult,
//       });
//     }

//     // No tool needed, just reply
//     return c.json({ reply: assistantMsg.content });

//   } catch (error: any) {
//     console.error("Agent Error:", error);
//     return c.json({ error: "Service unavailable." }, 500);
//   }
// };

// //     return c.json({ reply: responseMessage.content });
// //   } catch (error: any) {
// //     console.error("Llama Error:", error.message || error);
// //     // Log the full error to see exactly what the provider is complaining about
// //     if (error.response)
// //       console.error("Provider Response:", error.response.data);

// //     return c.json({ error: "Assistant busy. Try again." }, 500);
// //   }
// // };
