import { FakePaymentProvider } from './fakeProvider.js';
import type { PaymentProvider } from './provider.js';

let provider: PaymentProvider = new FakePaymentProvider();

export function getPaymentProvider(): PaymentProvider {
  return provider;
}

export function setPaymentProvider(next: PaymentProvider): void {
  provider = next;
}
