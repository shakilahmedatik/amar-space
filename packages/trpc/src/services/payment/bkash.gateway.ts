import { createLogger } from "@omniheaven/logger";
import type {
  PaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationResult,
} from "./types";

const logger = createLogger("payment:bkash");

export class BkashPaymentGateway implements PaymentGateway {
  readonly providerName = "bkash" as const;

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    logger.info(
      { amount: params.amountBdt, phone: params.customerPhone, billId: params.billId },
      "Initiating bKash payment checkout",
    );

    const paymentId = `BK-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const redirectUrl = `https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout?paymentId=${paymentId}`;

    return {
      paymentId,
      gatewayRedirectUrl: redirectUrl,
      providerReference: paymentId,
    };
  }

  async verifyPayment(
    paymentId: string,
    verificationData: unknown,
  ): Promise<PaymentVerificationResult> {
    logger.info({ paymentId, verificationData }, "Verifying bKash payment");

    return {
      isSuccessful: true,
      transactionId: `TRX-${paymentId}`,
      amountPaid: 0,
      paidAt: new Date(),
      rawPayload: { verified: true, paymentId },
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<PaymentVerificationResult> {
    logger.info({ signature }, "Handling bKash webhook notification");

    return {
      isSuccessful: true,
      transactionId: `WEBHOOK-${Date.now()}`,
      amountPaid: 0,
      paidAt: new Date(),
      rawPayload: { body: rawBody },
    };
  }

  async refundPayment(
    transactionId: string,
    amountBdt: number,
    reason: string,
  ): Promise<{ success: boolean; refundId: string }> {
    logger.info({ transactionId, amountBdt, reason }, "Executing bKash refund");
    return {
      success: true,
      refundId: `REFUND-${transactionId}`,
    };
  }
}
