import { INVENTORY_SERVICE_URL } from "./services";
import { getStoredToken } from "./auth";

export interface BookedSeatItem {
  id: number;
  seatNumber: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "CANCELLED" | string;
  eventId: number;
  eventName?: string | null;
  seatTypeCode: string;
  heldByUserId?: number | null;
  bookedBy?: number | null;
  bookedAt?: string | null;
  holdExpiresAt?: string | null;
  orderId?: string | null;
}

export function getSeatBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use Next.js internal proxy
    return "/api/seat";
  }
  return `${INVENTORY_SERVICE_URL}/api/seat`;
}

/**
 * GET /api/seat/order/{orderId} (or /api/seat/booked/{orderId})
 * View seats for an order. Resolves user from JWT (Bearer <token>), X-User-Id header, or userId query param and verifies ownership.
 */
export async function getSeatsByOrderId(
  orderId: string,
  token?: string | null,
  userId?: number | null
): Promise<BookedSeatItem[]> {
  if (!orderId || !orderId.trim()) return [];

  const cleanOrderId = encodeURIComponent(orderId.trim());
  const baseUrl = getSeatBaseUrl();
  const queryParam = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const endpoint = `${baseUrl}/order/${cleanOrderId}${queryParam}`;

  const resolvedToken = token || getStoredToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  if (userId) {
    headers["X-User-Id"] = String(userId);
  }

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      console.warn(`getSeatsByOrderId: status ${res.status} for order ${orderId}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as BookedSeatItem[]) : [];
  } catch (err) {
    console.warn("Failed to fetch seats by orderId:", err);
    return [];
  }
}

/**
 * GET /api/seat/booked
 * View booked seats (by orderId, by user from JWT/headers, or all booked seats).
 */
export async function getBookedSeats(options?: {
  orderId?: string;
  userId?: number;
  eventId?: number;
  token?: string | null;
}): Promise<BookedSeatItem[]> {
  const baseUrl = getSeatBaseUrl();
  const params = new URLSearchParams();

  if (options?.orderId) params.set("orderId", options.orderId.trim());
  if (options?.userId) params.set("userId", String(options.userId));
  if (options?.eventId) params.set("eventId", String(options.eventId));

  const qs = params.toString() ? `?${params.toString()}` : "";
  const endpoint = `${baseUrl}/booked${qs}`;

  const resolvedToken = options?.token || getStoredToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  if (options?.userId) {
    headers["X-User-Id"] = String(options.userId);
  }

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as BookedSeatItem[]) : [];
  } catch (err) {
    console.warn("Failed to fetch booked seats:", err);
    return [];
  }
}

/**
 * GET /api/seat/user/{userId}
 * Explicit lookup for all booked seats by user ID.
 */
export async function getSeatsByUserId(
  userId: number,
  token?: string | null
): Promise<BookedSeatItem[]> {
  if (!userId || userId <= 0) return [];

  const baseUrl = getSeatBaseUrl();
  const endpoint = `${baseUrl}/user/${encodeURIComponent(userId)}`;

  const resolvedToken = token || getStoredToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }
  headers["X-User-Id"] = String(userId);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as BookedSeatItem[]) : [];
  } catch (err) {
    console.warn("Failed to fetch seats by userId:", err);
    return [];
  }
}

