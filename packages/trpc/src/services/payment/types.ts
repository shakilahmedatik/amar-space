export interface PaymentInitiationParams {
  organizationId: string;
  billId?: string;
  bookingId?: string;
  amountBdt: number;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  callbackUrl: string;
}

export interface PaymentInitiationResult {
  paymentId: string;
  gatewayRedirectUrl: string;
  providerReference: string;
}

export interface PaymentVerificationResult {
  isSuccessful: boolean;
  transactionId: string;
  amountPaid: number;
  paidAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly providerName: "paystation" | "bkash" | "nagad" | "stripe";
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
  verifyPayment(paymentId: string, verificationData: unknown): Promise<PaymentVerificationResult>;
  handleWebhook(rawBody: string, signature: string): Promise<PaymentVerificationResult>;
  refundPayment(
    transactionId: string,
    amountBdt: number,
    reason: string,
  ): Promise<{ success: boolean; refundId: string }>;
}
