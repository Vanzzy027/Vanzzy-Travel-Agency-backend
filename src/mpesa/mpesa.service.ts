// import axios from "axios";
// import moment from "moment";

// export const getMpesaAccessToken = async (): Promise<string> => {
//   try {
//     const key = process.env.MPESA_CONSUMER_KEY;
//     const secret = process.env.MPESA_CONSUMER_SECRET;

//     console.log("=== Getting M-Pesa Access Token ===");
//     console.log("Consumer Key exists:", !!key);
//     console.log("Consumer Secret exists:", !!secret);
//     console.log("All M-Pesa env vars:", Object.keys(process.env).filter(k => k.includes('MPESA')));

//     if (!key || !secret) {
//       throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set in environment variables");
//     }

//     const auth = Buffer.from(`${key}:${secret}`).toString("base64");
//     console.log("Auth string generated");
    
//     const res = await axios.get(
//       "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
//       {
//         headers: { 
//           Authorization: `Basic ${auth}`,
//           'Content-Type': 'application/json'
//         },
//         timeout: 10000
//       }
//     );

//     console.log("Token received successfully");
//     return res.data.access_token;
//   } catch (error: any) {
//     console.error("❌ Error getting M-Pesa token:");
//     console.error("Status:", error.response?.status);
//     console.error("Status Text:", error.response?.statusText);
//     console.error("Response Data:", error.response?.data);
//     console.error("Error Message:", error.message);
//     throw error;
//   }
// };

// export const initiateStkPush = async (
//   phone: string,
//   amount: number,
//   accountRef: string,
//   description: string
// ) => {
//   try {
//     console.log("\n=== Initiating STK Push ===");
//     console.log("Phone:", phone);
//     console.log("Amount:", amount);
//     console.log("Account Reference:", accountRef);
//     console.log("Description:", description);

//     // Validate phone number format
//     if (!phone.startsWith('254')) {
//       throw new Error("Phone number must start with 254");
//     }

//     const token = await getMpesaAccessToken();
//     console.log("Access token obtained");
    
//     const timestamp = moment().format("YYYYMMDDHHmmss");
//     console.log("Timestamp:", timestamp);

//     const shortcode = process.env.MPESA_SHORTCODE;
//     const passkey = process.env.MPESA_PASSKEY;
//     const callbackUrl = process.env.MPESA_CALLBACK_URL;

//     console.log("Shortcode:", shortcode);
//     console.log("Passkey exists:", !!passkey);
//     console.log("Callback URL:", callbackUrl);

//     if (!shortcode || !passkey || !callbackUrl) {
//       throw new Error("Missing M-Pesa configuration: check MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL");
//     }

//     const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
//     console.log("Password generated");

//     const payload = {
//       BusinessShortCode: Number(shortcode),
//       Password: password,
//       Timestamp: timestamp,
//       TransactionType: "CustomerPayBillOnline",
//       Amount: amount,
//       PartyA: phone,
//       PartyB: Number(shortcode),
//       PhoneNumber: phone,
//       CallBackURL: callbackUrl,
//       AccountReference: accountRef,
//       TransactionDesc: description,
//     };

//     console.log("\nSending STK Push request with payload:");
//     console.log(JSON.stringify(payload, null, 2));

//     const res = await axios.post(
//       "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
//       payload,
//       {
//         headers: { 
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         },
//         timeout: 15000
//       }
//     );

//     console.log("\n✅ STK Push successful!");
//     console.log("Response:", JSON.stringify(res.data, null, 2));
    
//     return res.data;
//   } catch (error: any) {
//     console.error("\n❌ STK Push failed!");
//     console.error("Error:", error.message);
//     console.error("Response Data:", error.response?.data);
//     console.error("Status Code:", error.response?.status);
    
//     if (error.response?.data) {
//       console.error("M-Pesa Error Details:", JSON.stringify(error.response.data, null, 2));
//     }
    
//     throw error;
//   }
// };

// // import axios from "axios";
// // import moment from "moment";
// // import { env } from "../config/env.ts"; // Import from config

// // export const getMpesaAccessToken = async (): Promise<string> => {
// //   try {
// //     const key = process.env.MPESA_CONSUMER_KEY;
// //     const secret = process.env.MPESA_CONSUMER_SECRET;

// //     console.log("Getting MPESA token with:");
// //     console.log("Consumer Key length:", key?.length || "NOT SET");
// //     console.log("Consumer Secret length:", secret?.length || "NOT SET");

// //     if (!key || !secret) {
// //       throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set");
// //     }

// //     const auth = Buffer.from(`${key}:${secret}`).toString("base64");
// //     console.log("Generated Auth:", auth);

// //     const res = await axios.get(
// //       "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
// //       {
// //         headers: { Authorization: `Basic ${auth}` },
// //       }
// //     );

// //     console.log("Token response status:", res.status);
// //     console.log("Token received:", res.data.access_token ? "YES" : "NO");

// //     return res.data.access_token;
// //   } catch (error: any) {
// //     console.error("Error getting M-Pesa token:", error.response?.data || error.message);
// //     console.error("Error details:", {
// //       status: error.response?.status,
// //       statusText: error.response?.statusText,
// //       headers: error.response?.headers,
// //     });
// //     throw error;
// //   }
// // };

// // export const initiateStkPush = async (
// //   phone: string,
// //   amount: number,
// //   accountRef: string,
// //   description: string
// // ) => {
// //   try {
// //     console.log("=== Initiating STK Push ===");
// //     console.log("Phone:", phone);
// //     console.log("Amount:", amount);

// //     const token = await getMpesaAccessToken();
// //     console.log("Token obtained successfully");

// //     const timestamp = moment().format("YYYYMMDDHHmmss");
// //     console.log("Timestamp:", timestamp);

// //     const shortcode = process.env.MPESA_SHORTCODE;
// //     const passkey = process.env.MPESA_PASSKEY;
    
// //     console.log("Shortcode:", shortcode);
// //     console.log("Passkey length:", passkey?.length || "NOT SET");

// //     if (!shortcode || !passkey) {
// //       throw new Error("MPESA_SHORTCODE or MPESA_PASSKEY is not set");
// //     }

// //     const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
// //     console.log("Generated Password (first 50 chars):", password.substring(0, 50) + "...");

// //     const callbackUrl = process.env.MPESA_CALLBACK_URL;
// //     console.log("Callback URL:", callbackUrl);

// //     const payload = {
// //       BusinessShortCode: Number(shortcode),
// //       Password: password,
// //       Timestamp: timestamp,
// //       TransactionType: "CustomerPayBillOnline",
// //       Amount: amount,
// //       PartyA: phone,
// //       PartyB: Number(shortcode),
// //       PhoneNumber: phone,
// //       CallBackURL: callbackUrl,
// //       AccountReference: accountRef,
// //       TransactionDesc: description,
// //     };

// //     console.log("STK Push Payload:", JSON.stringify(payload, null, 2));

// //     const res = await axios.post(
// //       "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
// //       payload,
// //       {
// //         headers: { 
// //           Authorization: `Bearer ${token}`,
// //           'Content-Type': 'application/json'
// //         },
// //       }
// //     );

// //     console.log("STK Push Response:", JSON.stringify(res.data, null, 2));
// //     return res.data;
// //   } catch (error: any) {
// //     console.error("Error in STK push:", error.response?.data || error.message);
// //     console.error("Full error:", JSON.stringify(error.response?.data || {}, null, 2));
// //     throw error;
// //   }
// // };





