// src/Gemini/chatController.ts (Now Llama Controller)
import type { Context } from "hono";
import OpenAI from "openai";
import { toolsSchema, toolsFunctions } from "../utils/aiTools.js";

// Initialize OpenAI client for Llama (Groq/Together/Self-hosted)
const client = new OpenAI({
  apiKey: process.env.LLAMA_API_KEY,
  baseURL: process.env.LLAMA_BASE_URL, // e.g., https://api.groq.com/openai/v1
});

const systemPrompt = `
You are the VansKE AI Agent. Your goal is to make renting a car effortless.
RULES:
1. MEMORY: Always remember the 'vehicle_id' of vehicles you find in search results. 
2. PROACTIVE: If a user says "I'll take the Subaru" and you just showed them a Subaru with ID 105, do NOT ask for the ID. Use 105 automatically.
3. DATE MATH: Today is ${new Date().toISOString().split("T")[0]}. If a user says "next Monday," calculate the YYYY-MM-DD string yourself.
4. TOOL USAGE: Never show <function> tags to the user. Use tools silently.
5. NO HALLUCINATION: If you haven't searched yet, run 'check_availability' first.
`;

export const handleChat = async (c: Context) => {
  try {
    const { message, history } = await c.req.json();
    const user = (c as any).user;
    const authHeader = c.req.header("Authorization") || "";

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.map((msg: any) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.parts?.[0]?.text || "",
      })),
      { role: "user", content: message },
    ];

    const response = await client.chat.completions.create({
      model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
      messages,
      tools: toolsSchema.map((s) => ({ type: "function", function: s })),
      tool_choice: "auto",
    });

    let responseMessage = response.choices[0].message;
    let toolCall = responseMessage.tool_calls?.[0];

    // --- ROBUST FALLBACK FOR TEXT-LEAKAGE ---
    if (!toolCall && responseMessage.content?.includes("<function")) {
      const match = responseMessage.content.match(
        /<function=(\w+)>(.*?)<\/function>/s,
      );
      if (match) {
        toolCall = {
          id: `manual_${Date.now()}`,
          type: "function",
          function: { name: match[1], arguments: match[2].trim() },
        } as any;
      }
    }

    if (toolCall && toolCall.type === "function") {
      const functionName = toolCall.function.name;
      // Ensure arguments are parsed safely
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        // If Llama sends "searchQuery: 'SUV'" instead of JSON
        args = { searchQuery: toolCall.function.arguments };
      }

      console.log(`[Agent] Calling: ${functionName}`);

      let result: any;
      if (functionName === "check_availability") {
        result = await toolsFunctions.check_availability(args);
      } else if (functionName === "create_booking") {
        // Validation: If Llama forgot the ID but has it in history,
        // the System Prompt usually fixes this, but we run it here.
        result = await toolsFunctions.create_booking(
          args,
          user.user_id,
          authHeader,
        );
      }

      const parsedResult =
        typeof result === "string" ? JSON.parse(result) : result;

      // --- SECOND CALL: Summarize for User ---
      const secondResponse = await client.chat.completions.create({
        model: process.env.LLAMA_MODEL || "llama-3.1-8b-instant",
        messages: [
          ...messages,
          {
            role: "assistant",
            content: responseMessage.content || "",
            tool_calls: responseMessage.tool_calls || [toolCall],
          },
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(parsedResult),
          },
        ],
      });

      return c.json({
        reply: secondResponse.choices[0].message.content,
        actionPerformed: functionName,
        functionResult: parsedResult,
      });
    }

    return c.json({ reply: responseMessage.content });
  } catch (error: any) {
    console.error("Agent Error:", error.message);
    return c.json(
      { error: "I'm having trouble processing that right now." },
      500,
    );
  }
};

//     return c.json({ reply: responseMessage.content });
//   } catch (error: any) {
//     console.error("Llama Error:", error.message || error);
//     // Log the full error to see exactly what the provider is complaining about
//     if (error.response)
//       console.error("Provider Response:", error.response.data);

//     return c.json({ error: "Assistant busy. Try again." }, 500);
//   }
// };
