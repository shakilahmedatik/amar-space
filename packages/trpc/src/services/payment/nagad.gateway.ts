import { createLogger } from "@omniheaven/logger";
import type {
  PaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationResult,
} from "./types";

const logger = createLogger("payment:nagad");

export class NagadPaymentGateway implements PaymentGateway {
  readonly providerName = "nagad" as const;

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    logger.info(
      { amount: params.amountBdt, phone: params.customerPhone, billId: params.billId },
      "Initiating Nagad payment checkout",
    );

    const paymentId = `NG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const redirectUrl = `http://sandbox.mynagad.com:10080/check-out/${paymentId}`;

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
    logger.info({ paymentId, verificationData }, "Verifying Nagad payment");

    return {
      isSuccessful: true,
      transactionId: `TRX-${paymentId}`,
      amountPaid: 0,
      paidAt: new Date(),
      rawPayload: { verified: true, paymentId },
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<PaymentVerificationResult> {
    logger.info({ signature }, "Handling Nagad webhook notification");

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
    logger.info({ transactionId, amountBdt, reason }, "Executing Nagad refund");
    return {
      success: true,
      refundId: `REFUND-${transactionId}`,
    };
  }
}
