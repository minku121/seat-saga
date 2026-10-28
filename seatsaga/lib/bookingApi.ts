import { BOOKING_SERVICE_URL } from "./services";

export interface BookingRequest {
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  userId: number;
}

export interface BookingResponse {
  orderId: string;
  eventId: number;
  seatTypeCode: string;
  quantity: number;
  totalAmount: number;
  userId: number;
  seatIds: number[];
  seatNumbers: string[];
  status: "SEATS_HELD" | string;
}

export interface StoredBooking extends BookingResponse {
  eventName?: string;
  venue?: string;
  eventDate?: string;
  createdAt: string;
  paymentStatus?: "PENDING" | "INITIATED" | "PAID" | "FAILED" | string;
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
 * Calls the hosted Booking Service endpoint: POST /api/bookings
 * Hosted on https://seat-saga-booking.onrender.com/api/bookings
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

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const payload = {
    eventId: Number(request.eventId),
    seatTypeCode: String(request.seatTypeCode).trim().toUpperCase(),
    quantity: Number(request.quantity),
    userId: Number(request.userId),
  };

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


