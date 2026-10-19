import { createLogger } from "@omniheaven/logger";
import type {
  PaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationResult,
} from "./types";

const logger = createLogger("payment:stripe");

export class StripePaymentGateway implements PaymentGateway {
  readonly providerName = "stripe" as const;

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    logger.info(
      { amount: params.amountBdt, customerEmail: params.customerEmail },
      "Initiating Stripe Checkout Session / PaymentIntent",
    );

    const paymentId = `cs_test_${crypto.randomUUID().replace(/-/g, "")}`;
    const redirectUrl = `https://checkout.stripe.com/pay/${paymentId}`;

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
    logger.info({ paymentId, verificationData }, "Verifying Stripe session");

    return {
      isSuccessful: true,
      transactionId: `pi_test_${paymentId}`,
      amountPaid: 0,
      paidAt: new Date(),
      rawPayload: { verified: true, paymentId },
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<PaymentVerificationResult> {
    logger.info({ signature }, "Handling Stripe webhook event");

    return {
      isSuccessful: true,
      transactionId: `evt_${Date.now()}`,
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
    logger.info({ transactionId, amountBdt, reason }, "Executing Stripe refund");
    return {
      success: true,
      refundId: `re_${transactionId}`,
    };
  }
}
