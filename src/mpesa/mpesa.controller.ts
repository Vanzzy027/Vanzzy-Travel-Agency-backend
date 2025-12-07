
// import { Context } from "hono";
// import sql from "mssql"; // Import mssql directly
// import { globalPool } from "../db/dbconfig"; // Import your pool
// import { initiateStkPush } from "./mpesa.service";



// export const stkPushController = async (c: Context) => {
//   try {
//     const { phone, amount } = await c.req.json();

//     if (!phone || !amount) {
//       return c.json({ error: "phone and amount are required" }, 400);
//     }

//     const finalPhone = phone.startsWith("254")
//       ? phone
//       : "254" + phone.slice(-9);

//     const resp = await initiateStkPush(
//       finalPhone,
//       amount,
//       "Vans Payment",
//       "Payment for service"
//     );

//     return c.json({ message: "STK push sent", data: resp });
//   } catch (e: any) {
//     console.log("STK ERROR:", e.response?.data || e);
//     return c.json(
//       { error: "Failed to initiate STK push", details: e.response?.data },
//       500
//     );
//   }
// };




// export const mpesaCallbackHandler = async (c: Context) => {
//   try {
//     // Add this check at the beginning
//     if (!globalPool || !globalPool.connected) {
//       throw new Error('Database not connected');
//     }

//     const body = await c.req.json();
//     console.log("📥 CALLBACK:", JSON.stringify(body, null, 2));

//     const result = body.Body.stkCallback;

//     const query = `
//       INSERT INTO MpesaPayments (MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, Amount, MpesaReceiptNumber, PhoneNumber)
//       VALUES (@MerchantRequestID, @CheckoutRequestID, @ResultCode, @ResultDesc, @Amount, @MpesaReceiptNumber, @PhoneNumber)
//     `;

//     // Use non-null assertion (!) if you're sure it's initialized
//     const request = new sql.Request(globalPool!);
//     request.input("MerchantRequestID", result.MerchantRequestID);
//     request.input("CheckoutRequestID", result.CheckoutRequestID);
//     request.input("ResultCode", result.ResultCode);
//     request.input("ResultDesc", result.ResultDesc);

//     if (result.CallbackMetadata) {
//       const meta = result.CallbackMetadata.Item;
//       request.input("Amount", meta.find((i: any) => i.Name === "Amount")?.Value || 0);
//       request.input("MpesaReceiptNumber", meta.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || null);
//       request.input("PhoneNumber", meta.find((i: any) => i.Name === "PhoneNumber")?.Value || null);
//     } else {
//       request.input("Amount", 0);
//       request.input("MpesaReceiptNumber", null);
//       request.input("PhoneNumber", null);
//     }

//     await request.query(query);

//     return c.json({ message: "Callback saved" }, 200);
//   } catch (e: any) {
//     console.log("CALLBACK ERROR:", e);
//     return c.json({ error: "Callback processing error" }, 500);
//   }
// };















// // export const mpesaCallbackHandler = async (c: Context) => {
// //   try {
// //     const body = await c.req.json();
// //     console.log("📥 CALLBACK:", JSON.stringify(body, null, 2));

// //     const result = body.Body.stkCallback;

// //     const query = `
// //       INSERT INTO MpesaPayments (MerchantRequestID,CheckoutRequestID,ResultCode,ResultDesc,Amount,MpesaReceiptNumber,PhoneNumber
// //       ) VALUES (@MerchantRequestID, @CheckoutRequestID, @ResultCode, @ResultDesc, @Amount, @MpesaReceiptNumber, @PhoneNumber)
// //     `;

// //     const request = sql.request();
// //     request.input("MerchantRequestID", result.MerchantRequestID);
// //     request.input("CheckoutRequestID", result.CheckoutRequestID);
// //     request.input("ResultCode", result.ResultCode);
// //     request.input("ResultDesc", result.ResultDesc);

// //     if (result.CallbackMetadata) {
// //       const meta = result.CallbackMetadata.Item;
// //       request.input("Amount", meta.find((i: any) => i.Name === "Amount")?.Value || 0);
// //       request.input("MpesaReceiptNumber", meta.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || null);
// //       request.input("PhoneNumber", meta.find((i: any) => i.Name === "PhoneNumber")?.Value || null);
// //     } else {
// //       request.input("Amount", 0);
// //       request.input("MpesaReceiptNumber", null);
// //       request.input("PhoneNumber", null);
// //     }

// //     await request.query(query);

// //     return c.json({ message: "Callback saved" }, 200);
// //   } catch (e: any) {
// //     console.log("CALLBACK ERROR:", e);
// //     return c.json({ error: "Callback processing error" }, 500);
// //   }
// // };
// // In mpesa.controller.ts

