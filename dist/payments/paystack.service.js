import axios from "axios";
export class PaystackService {
    config;
    constructor() {
        this.config = {
            secretKey: process.env.PAYSTACK_SECRET_KEY,
            publicKey: process.env.PAYSTACK_PUBLIC_KEY,
            baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
        };
        if (!this.config.secretKey || !this.config.publicKey) {
            throw new Error("Paystack credentials not configured");
        }
    }
    async initializeTransaction(data) {
        try {
            const response = await axios.post(`${this.config.baseUrl}/transaction/initialize`, {
                email: data.email,
                amount: data.amount,
                currency: data.currency,
                channels: data.channels,
                metadata: data.metadata,
                ...(data.phone && { phone: data.phone }),
                reference: data.reference || `BOOKING_${Date.now()}`,
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.data.status) {
                throw new Error(`Paystack initialization failed: ${response.data.message}`);
            }
            return {
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference: response.data.data.reference,
            };
        }
        catch (error) {
            console.error("Paystack initialization error:", error.response?.data || error.message);
            throw new Error(`Failed to initialize transaction: ${error.message}`);
        }
    }
    async verifyTransaction(reference) {
        try {
            const response = await axios.get(`${this.config.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.config.secretKey}`,
                },
            });
            if (!response.data.status) {
                throw new Error(`Paystack verification failed: ${response.data.message}`);
            }
            return response.data.data;
        }
        catch (error) {
            console.error("Paystack verification error:", error.response?.data || error.message);
            throw new Error(`Failed to verify transaction: ${error.message}`);
        }
    }
    async createTransferRecipient(accountNumber, bankCode, accountName) {
        try {
            const response = await axios.post(`${this.config.baseUrl}/transferrecipient`, {
                type: 'nuban',
                name: accountName,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: 'KES',
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.secretKey}`,
                },
            });
            return response.data;
        }
        catch (error) {
            console.error("Create transfer recipient error:", error.response?.data || error.message);
            throw error;
        }
    }
    async initiateTransfer(recipientCode, amount, reason) {
        try {
            const response = await axios.post(`${this.config.baseUrl}/transfer`, {
                source: 'balance',
                amount: amount * 100, // Convert to kobo
                recipient: recipientCode,
                reason,
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.secretKey}`,
                },
            });
            return response.data;
        }
        catch (error) {
            console.error("Initiate transfer error:", error.response?.data || error.message);
            throw error;
        }
    }
}
