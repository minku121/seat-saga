import { BOOKING_SERVICE_URL } from "./services";
import { getStoredToken } from "./auth";

export interface BookingRequest {
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  userId?: number;
}

export interface BookingResponse {
  orderId: string;
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  totalAmount: number;
  userId: number;
  seatIds?: number[];
  seatNumbers?: string[];
  status?: "SEATS_HELD" | string;
}

/**
 * Represents the booking entity returned by GET /api/bookings
 */
export interface BookingSummaryItem {
  id: string;
  orderId: string;
  userId: number;
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  totalAmount: number;
  bookingStatus: "CONFIRMED" | "PENDING" | "CANCELLED" | string;
  paymentStatus: "SUCCESS" | "PENDING" | "FAILED" | string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StoredBooking {
  id?: string;
  orderId: string;
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  totalAmount: number;
  userId?: number;
  seatIds?: number[];
  seatNumbers?: string[];
  status?: string;
  bookingStatus?: string;
  paymentStatus?: "PENDING" | "INITIATED" | "PAID" | "SUCCESS" | "FAILED" | string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  eventName?: string;
  venue?: string;
  eventDate?: string;
  createdAt: string;
  updatedAt?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}

export function getBookingBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use Next.js internal proxy route to prevent CORS issues
    return "/api/bookings";
  }
  // Server-side: use direct backend hosted Render URL
  return `${BOOKING_SERVICE_URL}/api/bookings`;
}

/**
 * Calls the Booking Service endpoint: POST /api/bookings
 * Automatically sends Authorization: Bearer <token> in the request headers.
 */
export async function bookAndHoldSeats(
  request: BookingRequest,
  token?: string | null
): Promise<BookingResponse> {
  if (!request.quantity || request.quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const endpoint = getBookingBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const resolvedToken = token || getStoredToken();
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  const payload: {
    eventId: number;
    seatTypeCode: string;
    quantity: number;
    userId?: number;
  } = {
    eventId: Number(request.eventId),
    seatTypeCode: String(request.seatTypeCode).trim().toUpperCase(),
    quantity: Number(request.quantity),
  };

  if (request.userId != null && !isNaN(Number(request.userId))) {
    payload.userId = Number(request.userId);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : `Booking failed with status ${response.status}`);
    throw new Error(errorMsg);
  }

  return data as BookingResponse;
}

/**
 * Calls GET /api/bookings
 * Sends Authorization: Bearer <token> in the header.
 * Automatically returns the bookings belonging to the user identified in the token.
 */
export async function getMyBookings(
  token?: string | null
): Promise<BookingSummaryItem[]> {
  const resolvedToken = token || getStoredToken();
  if (!resolvedToken) {
    return [];
  }

  const endpoint = getBookingBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`,
  };

  const response = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.warn("Unauthorized /api/bookings request");
      return [];
    }
    const data = await response.json().catch(() => null);
    const errorMsg =
      data?.message ||
      data?.error ||
      `Failed to load bookings with status ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? (data as BookingSummaryItem[]) : [];
}

/**
 * Calls GET /api/bookings/order/{orderId}
 * Sends Authorization: Bearer <token> in the header.
 */
export async function getBookingByOrderId(
  orderId: string,
  token?: string | null
): Promise<BookingSummaryItem | null> {
  const resolvedToken = token || getStoredToken();
  const endpoint = `${getBookingBaseUrl()}/order/${encodeURIComponent(orderId)}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  return data as BookingSummaryItem;
}

const HELD_BOOKINGS_PREFIX = "seatsaga_held_bookings_";

export function getStoredBookings(userEmail?: string): StoredBooking[] {
  if (typeof window === "undefined") return [];
  const key = `${HELD_BOOKINGS_PREFIX}${userEmail || "guest"}`;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as StoredBooking[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredBooking(userEmail: string, booking: StoredBooking): void {
  if (typeof window === "undefined") return;
  const key = `${HELD_BOOKINGS_PREFIX}${userEmail || "guest"}`;
  try {
    const list = getStoredBookings(userEmail);
    // Add new booking to top, deduplicating by orderId
    const updated = [booking, ...list.filter((b) => b.orderId !== booking.orderId)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to store booking locally:", err);
  }
}

export function updateStoredBookingStatus(
  userEmail: string,
  orderId: string,
  updates: Partial<StoredBooking>
): void {
  if (typeof window === "undefined") return;
  const key = `${HELD_BOOKINGS_PREFIX}${userEmail || "guest"}`;
  try {
    const list = getStoredBookings(userEmail);
    const updated = list.map((b) => (b.orderId === orderId ? { ...b, ...updates } : b));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to update booking status locally:", err);
  }
}

export function removeStoredBooking(userEmail: string, orderId: string): void {
  if (typeof window === "undefined") return;
  const key = `${HELD_BOOKINGS_PREFIX}${userEmail || "guest"}`;
  try {
    const list = getStoredBookings(userEmail);
    const updated = list.filter((b) => b.orderId !== orderId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to remove booking locally:", err);
  }
}
