// Entitlement layer. The app gates everything behind a single isPremium check.
// A MockProvider ships by default so the flow is fully exercisable in Expo Go;
// swap in a StoreKit 2 provider (Transaction.currentEntitlements) in an EAS
// build via setPurchaseProvider — the UI never changes.

export const PRODUCT_ID = "lume.premium.monthly";
export const PRICE_LABEL = "$6.99/mo";
export const TRIAL_LABEL = "7-day free trial";

export interface PurchaseResult {
  ok: boolean;
  isPremium: boolean;
  message?: string;
}

export interface PurchaseProvider {
  name: string;
  // Resolve current entitlement (e.g. StoreKit currentEntitlements).
  refresh: () => Promise<boolean>;
  purchase: (productId: string) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
}

// Default: in-memory sandbox. Simulates the StoreKit happy path so the paywall,
// trial copy, gating and restore can all be driven end-to-end without a build.
class MockProvider implements PurchaseProvider {
  name = "mock";
  private premium = false;
  async refresh() {
    return this.premium;
  }
  async purchase(): Promise<PurchaseResult> {
    await delay(900); // emulate the StoreKit sheet round-trip
    this.premium = true;
    return { ok: true, isPremium: true, message: "Trial started" };
  }
  async restore(): Promise<PurchaseResult> {
    await delay(600);
    return this.premium
      ? { ok: true, isPremium: true, message: "Purchases restored" }
      : { ok: false, isPremium: false, message: "Nothing to restore" };
  }
}

let provider: PurchaseProvider = new MockProvider();

export function setPurchaseProvider(p: PurchaseProvider) {
  provider = p;
}
export function getPurchaseProvider(): PurchaseProvider {
  return provider;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
