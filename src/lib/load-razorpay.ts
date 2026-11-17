const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<boolean> | null = null;

/** Lazily injects Razorpay's Checkout.js — only fetched right before a payment is initiated. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => {
        loadPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return loadPromise;
}
