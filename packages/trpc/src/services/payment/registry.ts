import { BkashPaymentGateway } from "./bkash.gateway";
import { NagadPaymentGateway } from "./nagad.gateway";
import { StripePaymentGateway } from "./stripe.gateway";
import type { PaymentGateway } from "./types";

export * from "./bkash.gateway";
export * from "./nagad.gateway";
export * from "./stripe.gateway";
export * from "./types";

const gateways: Record<PaymentGateway["providerName"], PaymentGateway> = {
  bkash: new BkashPaymentGateway(),
  nagad: new NagadPaymentGateway(),
  stripe: new StripePaymentGateway(),
  paystation: new BkashPaymentGateway(), // Paystation acts as multi-channel aggregator
};

/**
 * Returns the configured payment gateway instance for a specified provider.
 */
export function getPaymentGateway(provider: PaymentGateway["providerName"]): PaymentGateway {
  const gateway = gateways[provider];
  if (!gateway) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
  return gateway;
}
