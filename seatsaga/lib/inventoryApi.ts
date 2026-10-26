import { SERVICES } from "./services";

export interface EventItem {
  id: number;
  name: string;
  description?: string;
  venue: string;
  maxCapacity: number;
  eventDate: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | string;
}

export interface SeatTypeItem {
  id: number;
  eventId: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  totalQuantity: number;
  available: number;
  held: number;
  booked: number;
  active: boolean;
  createdAt?: string;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  venue: string;
  maxCapacity: number;
  eventDate: string;
}

export interface UpdateEventInput {
  name: string;
  description?: string;
  venue: string;
  maxCapacity: number;
  eventDate: string;
}

export interface CreateSeatTypeInput {
  code: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface AddSeatsInput {
  quantity: number;
}

export interface PatchSeatTypeInput {
  name?: string;
  description?: string;
  price?: number;
  active?: boolean;
}

export interface AdminTokenResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  message: string;
}

export interface ApiCallLog {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

const ADMIN_TOKEN_STORAGE_KEY = "seatsaga_admin_jwt";
const ADMIN_TOKEN_EXP_KEY = "seatsaga_admin_jwt_exp";
const DEFAULT_ADMIN_SECRET = "admin-key";


export function getInventoryBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/inventory";
  }
  return `${SERVICES.inventory}/api`;
}

export function setCachedAdminToken(token: string, expiresInSec = 86400): void {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + (expiresInSec - 60) * 1000;
  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(ADMIN_TOKEN_EXP_KEY, String(expiresAt));
}

export function getCachedAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  const exp = localStorage.getItem(ADMIN_TOKEN_EXP_KEY);
  if (!token || !exp) return null;

  if (Date.now() > Number(exp)) {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
    return null;
  }
  return token;
}

export function clearCachedAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_TOKEN_EXP_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ data: T; status: number; durationMs: number }> {
  const directUrl = `${SERVICES.inventory}/api${path}`;
  const proxyUrl = `/api/inventory${path}`;

  const candidateUrls: string[] =
    typeof window !== "undefined"
      ? [proxyUrl, directUrl]
      : [directUrl];

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    const start = Date.now();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });
      const durationMs = Date.now() - start;

      if (res.status === 204) {
        return { data: null as unknown as T, status: 204, durationMs };
      }

      const contentType = res.headers.get("content-type");
      let json: unknown = null;
      if (contentType && contentType.includes("application/json")) {
        json = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => "");
        json = text ? { message: text } : null;
      }

      if (!res.ok) {
        if (candidateUrls.length > 1 && url === proxyUrl && (res.status === 502 || res.status === 404)) {
          continue;
        }

        const errObj = json as Record<string, unknown> | null;
        const errorMsg =
          (errObj?.message as string) ||
          (errObj?.error as string) ||
          `Request to ${path} failed with status ${res.status}`;
        const err = new Error(errorMsg);
        (err as unknown as { status: number; body: unknown }).status = res.status;
        (err as unknown as { status: number; body: unknown }).body = json;
        throw err;
      }

      return { data: json as T, status: res.status, durationMs };
    } catch (err: unknown) {
      lastError = err as Error;
      continue;
    }
  }

  const msg = lastError?.message || "";
  if (msg.includes("Failed to fetch") || msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
    throw new Error(
      `Could not connect to Inventory Service (${SERVICES.inventory}). Service may be waking up, please retry.`
    );
  }
  throw lastError || new Error(`Request to ${path} failed`);
}

export async function getAdminToken(secret = DEFAULT_ADMIN_SECRET): Promise<AdminTokenResponse> {
  const res = await request<AdminTokenResponse>("/admin/token", {
    method: "POST",
    body: JSON.stringify({ secret }),
  });

  if (res.data?.token) {
    setCachedAdminToken(res.data.token, res.data.expiresIn || 86400);
  }

  return res.data;
}

export async function resolveAdminToken(explicitToken?: string): Promise<string> {
  if (explicitToken) return explicitToken;
  const cached = getCachedAdminToken();
  if (cached) return cached;

  const resp = await getAdminToken();
  return resp.token;
}

export async function listEvents(): Promise<EventItem[]> {
  const res = await request<EventItem[]>("/events", { method: "GET" });
  return res.data || [];
}

export async function getEvent(eventId: number): Promise<EventItem> {
  const res = await request<EventItem>(`/events/${eventId}`, { method: "GET" });
  return res.data;
}

export async function listSeatTypes(eventId: number): Promise<SeatTypeItem[]> {
  const res = await request<SeatTypeItem[]>(`/events/${eventId}/seat-types`, { method: "GET" });
  return res.data || [];
}

export async function createEvent(input: CreateEventInput, token?: string): Promise<EventItem> {
  const jwt = await resolveAdminToken(token);
  const res = await request<EventItem>(
    "/admin/events",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    jwt
  );
  return res.data;
}

export async function updateEvent(
  eventId: number,
  input: UpdateEventInput,
  token?: string
): Promise<EventItem> {
  const jwt = await resolveAdminToken(token);
  const res = await request<EventItem>(
    `/admin/events/${eventId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    jwt
  );
  return res.data;
}

export async function deleteEvent(eventId: number, token?: string): Promise<void> {
  const jwt = await resolveAdminToken(token);
  await request<void>(
    `/admin/events/${eventId}`,
    {
      method: "DELETE",
    },
    jwt
  );
}

export async function createSeatType(
  eventId: number,
  input: CreateSeatTypeInput,
  token?: string
): Promise<SeatTypeItem> {
  const jwt = await resolveAdminToken(token);
  const res = await request<SeatTypeItem>(
    `/admin/events/${eventId}/seat-types`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    jwt
  );
  return res.data;
}

export async function addSeatsToSeatType(
  eventId: number,
  code: string,
  input: AddSeatsInput,
  token?: string
): Promise<SeatTypeItem> {
  const jwt = await resolveAdminToken(token);
  const res = await request<SeatTypeItem>(
    `/admin/events/${eventId}/seat-types/${encodeURIComponent(code)}/seats`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    jwt
  );
  return res.data;
}

export async function patchSeatType(
  eventId: number,
  code: string,
  input: PatchSeatTypeInput,
  token?: string
): Promise<SeatTypeItem> {
  const jwt = await resolveAdminToken(token);
  const res = await request<SeatTypeItem>(
    `/admin/events/${eventId}/seat-types/${encodeURIComponent(code)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    jwt
  );
  return res.data;
}
