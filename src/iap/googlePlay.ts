import { Platform } from "react-native";
import {
  PRODUCT_ID,
  PurchaseProvider,
  PurchaseResult,
  setPurchaseProvider,
} from "./purchases";

// Google Play Billing provider backed by expo-iap (OpenIAP). Wired in at
// startup on Android via initGooglePlay(); on iOS / Expo Go (no native module)
// initConnection throws and we stay on the MockProvider. expo-iap is loaded
// dynamically so merely running in Expo Go can't crash on a missing module.

let initialized = false;

export async function initGooglePlay(): Promise<void> {
  if (Platform.OS !== "android" || initialized) return;
  initialized = true;

  let IAP: typeof import("expo-iap");
  try {
    IAP = await import("expo-iap");
  } catch {
    return; // no native module available — keep the mock
  }

  let connected = false;
  let premium = false;
  // requestPurchase is fire-and-forget; the outcome arrives on the listeners,
  // so we bridge it back to the purchase() promise via this resolver.
  let pending: ((r: PurchaseResult) => void) | null = null;

  const settle = (r: PurchaseResult) => {
    pending?.(r);
    pending = null;
  };

  const ensureConnected = async () => {
    if (!connected) connected = await IAP.initConnection();
    return connected;
  };

  try {
    if (!(await IAP.initConnection())) return;
    connected = true;
  } catch {
    return; // billing unavailable (e.g. no Play Services) — keep the mock
  }

  IAP.purchaseUpdatedListener(async (purchase: any) => {
    // Acknowledge/finish so Play doesn't auto-refund after 3 days. Subscriptions
    // are non-consumable.
    try {
      await IAP.finishTransaction({ purchase, isConsumable: false });
    } catch {
      // already acknowledged or transient — entitlement check still governs
    }
    const ids: string[] = purchase?.ids ?? [];
    if (purchase?.productId === PRODUCT_ID || ids.includes(PRODUCT_ID)) {
      premium = true;
    }
    settle({ ok: true, isPremium: true, message: "Trial started" });
  });

  IAP.purchaseErrorListener((err: any) => {
    const blob = `${err?.code ?? ""} ${err?.message ?? ""}`;
    const cancelled = /cancel/i.test(blob);
    settle({
      ok: false,
      isPremium: premium,
      message: cancelled ? "Purchase cancelled" : err?.message ?? "Purchase failed",
    });
  });

  // Prefer the offer that includes a free (price 0) phase — that's the 7-day
  // trial configured in Play Console. Fall back to the first offer (base plan).
  const pickOffer = (product: any): { sku: string; offerToken: string } | null => {
    const offers = product?.subscriptionOfferDetailsAndroid ?? [];
    if (!offers.length) return null;
    const withTrial = offers.find((o: any) =>
      (o?.pricingPhases?.pricingPhaseList ?? []).some(
        (p: any) => p?.priceAmountMicros === "0" || p?.priceAmountMicros === 0
      )
    );
    const chosen = withTrial ?? offers[0];
    return { sku: product.id, offerToken: chosen.offerToken };
  };

  const isActive = async (): Promise<boolean> => {
    try {
      const subs = await IAP.getActiveSubscriptions([PRODUCT_ID]);
      return (subs ?? []).some(
        (s: any) => s?.isActive && (s?.productId === PRODUCT_ID || !s?.productId)
      );
    } catch {
      return premium;
    }
  };

  const provider: PurchaseProvider = {
    name: "google-play",
    async refresh() {
      await ensureConnected();
      premium = await isActive();
      return premium;
    },
    async purchase(productId: string) {
      try {
        await ensureConnected();
        const products: any[] =
          (await IAP.fetchProducts({ skus: [productId], type: "subs" })) ?? [];
        const product = products.find((p) => p?.id === productId);
        if (!product) {
          return {
            ok: false,
            isPremium: premium,
            message: "Subscription not available yet",
          };
        }
        const offer = pickOffer(product);
        const result = new Promise<PurchaseResult>((resolve) => {
          pending = resolve;
        });
        await IAP.requestPurchase({
          type: "subs",
          request: {
            google: {
              skus: [productId],
              subscriptionOffers: offer ? [offer] : [],
            },
          },
        });
        return await result;
      } catch (e: any) {
        pending = null;
        return {
          ok: false,
          isPremium: premium,
          message: e?.message ?? "Purchase failed",
        };
      }
    },
    async restore() {
      try {
        await ensureConnected();
        try {
          await IAP.restorePurchases();
        } catch {
          // restore is best-effort; the entitlement query is the source of truth
        }
        premium = await isActive();
        return premium
          ? { ok: true, isPremium: true, message: "Purchases restored" }
          : { ok: false, isPremium: false, message: "Nothing to restore" };
      } catch (e: any) {
        return {
          ok: false,
          isPremium: premium,
          message: e?.message ?? "Restore failed",
        };
      }
    },
  };

  premium = await isActive();
  setPurchaseProvider(provider);
}
