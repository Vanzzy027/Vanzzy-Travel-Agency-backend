import axios from "axios";

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
}

interface InitializeTransactionData {
  email: string;
  amount: number;
  currency: string;
  channels?: string[];
  metadata?: Record<string, any>;
  phone?: string;
  reference?: string;
}

interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    status: string;
    paid_at: string | null;
    created_at: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    };
    gateway_response: string;
  };
}

export class PaystackService {
  private config: PaystackConfig;

  constructor() {
    this.config = {
      secretKey: process.env.PAYSTACK_SECRET_KEY!,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY!,
      baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
    };

    if (!this.config.secretKey || !this.config.publicKey) {
      throw new Error("Paystack credentials not configured");
    }
  }

  async initializeTransaction(data: InitializeTransactionData): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    try {
      const response = await axios.post<PaystackTransactionResponse>(
        `${this.config.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount,
          currency: data.currency,
          channels: data.channels,
          metadata: data.metadata,
          ...(data.phone && { phone: data.phone }),
          reference: data.reference || `BOOKING_${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack initialization failed: ${response.data.message}`);
      }

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      console.error("Paystack initialization error:", error.response?.data || error.message);
      throw new Error(`Failed to initialize transaction: ${error.message}`);
    }
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResponse['data']> {
    try {
      const response = await axios.get<VerifyTransactionResponse>(
        `${this.config.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.secretKey}`,
          },
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack verification failed: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Paystack verification error:", error.response?.data || error.message);
      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  async createTransferRecipient(
    accountNumber: string,
    bankCode: string,
    accountName: string
  ) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'KES',
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Create transfer recipient error:", error.response?.data || error.message);
      throw error;
    }
  }

  async initiateTransfer(
    recipientCode: string,
    amount: number,
    reason: string
  ) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: amount * 100, // Convert to kobo
          recipient: recipientCode,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Initiate transfer error:", error.response?.data || error.message);
      throw error;
    }
  }
}