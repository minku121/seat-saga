import { PAYMENT_SERVICE_URL } from "./services";

export interface PaymentStatusResponse {
  orderId: string;
  status: "PENDING" | "INITIATED" | "SUCCESS" | "FAILED" | string;
  isReady: boolean;
  gatewayOrderId?: string | null;
  gatewayId?: string | null;
  razorpayOrderId?: string | null;
  totalAmount?: number | null;
  razorpayKeyId?: string | null;
  currency?: string | null;
  eventId?: number | null;
  userId?: number | null;
  message?: string | null;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Loads the official Razorpay Checkout SDK script dynamically.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Fetches the current payment status for an order from Payment Service.
 * Tries direct http://localhost:8084 (or PAYMENT_SERVICE_URL) first,
 * falling back to Next.js API proxy /api/payments if needed.
 */
export async function getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
  const encodedOrderId = encodeURIComponent(orderId);
  const directUrl = `${PAYMENT_SERVICE_URL}/api/payments/${encodedOrderId}/status`;

  try {
    const res = await fetch(directUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      return (await res.json()) as PaymentStatusResponse;
    }
  } catch {
    // If direct fails (e.g. mixed content or network), try Next.js proxy
  }

  const proxyUrl = `/api/payments/${encodedOrderId}/status`;
  const res = await fetch(proxyUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch payment status (${res.status}): ${errorText || "Service error"}`
    );
  }

  return (await res.json()) as PaymentStatusResponse;
}

/**
 * Polls http://localhost:8084/api/payments/{orderId}/status until response has isReady: true
 * and status: "INITIATED" with gatewayOrderId / razorpayKeyId.
 */
export async function pollPaymentStatus(
  orderId: string,
  onProgress?: (status: PaymentStatusResponse, attempt: number) => void,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<PaymentStatusResponse> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const data = await getPaymentStatus(orderId);
      if (onProgress) {
        onProgress(data, attempt);
      }

      // Check if payment intent is ready and has gateway order details
      const isReady =
        data.isReady === true &&
        Boolean(data.gatewayOrderId || data.razorpayOrderId) &&
        Boolean(data.razorpayKeyId);

      if (isReady) {
        return data;
      }

      if (data.status === "FAILED") {
        throw new Error(data.message || "Payment intent creation failed on server.");
      }
    } catch (err: unknown) {
      // If server is warming up or event is in-flight, keep polling until maxAttempts
      if (attempt >= maxAttempts) {
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    "Timeout: Payment intent took too long to be created by the payment service. Please try again."
  );
}

export interface RazorpayCheckoutConfig {
  paymentInfo: PaymentStatusResponse;
  eventName: string;
  userName?: string;
  userEmail?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onError?: (error: unknown) => void;
  onDismiss?: () => void;
}

/**
 * Initializes and displays the Razorpay checkout popup modal.
 */
export async function openRazorpayCheckout({
  paymentInfo,
  eventName,
  userName,
  userEmail,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutConfig): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
  }

  const razorpayOrderId = paymentInfo.gatewayOrderId || paymentInfo.razorpayOrderId;
  const razorpayKey = paymentInfo.razorpayKeyId;
  const totalAmountPaise = Math.round((paymentInfo.totalAmount || 0) * 100);

  if (!razorpayKey || !razorpayOrderId) {
    throw new Error("Missing Razorpay Key or Order ID from payment service.");
  }

  const options = {
    key: razorpayKey,
    amount: totalAmountPaise,
    currency: paymentInfo.currency || "INR",
    name: "SeatSaga",
    description: `Seat Reservation - ${eventName} (Order ${paymentInfo.orderId})`,
    order_id: razorpayOrderId,
    prefill: {
      name: userName || "SeatSaga Guest",
      email: userEmail || "",
    },
    theme: {
      color: "#ffbf6bff",
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
    handler: function (response: RazorpaySuccessResponse) {
      try {
        onSuccess(response);
      } catch (err) {
        if (onError) onError(err);
      }
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", function (response: any) {
    if (onError) {
      onError(response.error || new Error("Payment transaction was rejected or failed."));
    }
  });

  rzp.open();
}

/**
 * Convenient all-in-one helper that polls until gatewayOrderId is ready
 * and immediately opens Razorpay checkout modal.
 */
export async function pollAndLaunchPayment(
  orderId: string,
  options?: {
    eventName?: string;
    userName?: string;
    userEmail?: string;
    onSuccess?: (res: RazorpaySuccessResponse) => void;
    onError?: (err: unknown) => void;
  }
): Promise<PaymentStatusResponse> {
  const paymentData = await pollPaymentStatus(orderId);
  if (paymentData.isReady && paymentData.gatewayOrderId) {
    await openRazorpayCheckout({
      paymentInfo: paymentData,
      eventName: options?.eventName || `Order ${orderId}`,
      userName: options?.userName,
      userEmail: options?.userEmail,
      onSuccess: options?.onSuccess || (() => { }),
      onError: options?.onError,
    });
  }
  return paymentData;
}

