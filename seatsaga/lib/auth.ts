export interface User {
  id?: number | string;
  name: string;
  email: string;
}

export interface JWTPayload {
  sub?: string;
  name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";
export const AUTH_COOKIE_NAME = "token";

/**
 * Safely decodes a JWT token payload across all environments (Browser, Edge, Node).
 */
export function decodeToken(token: string | null | undefined): JWTPayload | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    let jsonString: string;
    if (typeof atob === "function") {
      const binaryStr = atob(padded);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      jsonString = new TextDecoder().decode(bytes);
    } else if (typeof Buffer !== "undefined") {
      jsonString = Buffer.from(padded, "base64").toString("utf-8");
    } else {
      return null;
    }

    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired (with an optional 10-second grace buffer).
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const payload = decodeToken(token);
  if (!payload) return true;

  if (typeof payload.exp === "number") {
    const currentTimeSec = Math.floor(Date.now() / 1000);
    // If expired or expiring within 5 seconds, treat as expired
    return currentTimeSec >= payload.exp - 5;
  }

  // If token has no exp field, consider it valid if it was decoded
  return false;
}

/**
 * Validates whether a token exists, is well-formed, and is not expired.
 */
export function isTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Sets the auth cookie in the browser.
 */
export function setAuthCookie(token: string, days = 7): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Removes the auth cookie in the browser.
 */
export function removeAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Reads the auth cookie value from document.cookie in browser.
 */
export function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Stores authentication session (both localStorage and Cookie).
 */
export function setAuth(token: string, user: Partial<User>): void {
  if (typeof window === "undefined") return;

  const payload = decodeToken(token);
  const resolvedUser: User = {
    name: (user.name || payload?.name || user.email?.split("@")[0] || payload?.sub?.split("@")[0] || "User").trim(),
    email: (user.email || payload?.sub || "").trim(),
    ...(user.id ? { id: user.id } : {}),
  };

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resolvedUser));
  setAuthCookie(token);
}

/**
 * Clears authentication session from localStorage and Cookie.
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  removeAuthCookie();
}

/**
 * Gets the current valid token from localStorage or cookie.
 * If expired or invalid, clears storage and returns null.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(AUTH_TOKEN_KEY) || getAuthCookie();
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAuth();
    return null;
  }

  // Ensure cookie is in sync with localStorage
  if (!getAuthCookie()) {
    setAuthCookie(token);
  }

  return token;
}

/**
 * Gets the real authenticated user from localStorage or decodes from valid token.
 * If token is invalid or expired, clears session and returns null.
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;

  const token = getStoredToken();
  if (!token) return null;

  const userJson = localStorage.getItem(AUTH_USER_KEY);
  if (userJson) {
    try {
      const user = JSON.parse(userJson) as User;
      if (user && user.email) {
        return {
          name: user.name || user.email.split("@")[0] || "User",
          email: user.email,
          id: user.id,
        };
      }
    } catch {
      // JSON parse error, fall back to decoding token
    }
  }

  // Fallback: extract real user information from JWT token payload
  const payload = decodeToken(token);
  if (payload && payload.sub) {
    const user: User = {
      name: payload.name || payload.sub.split("@")[0] || "User",
      email: payload.sub,
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return user;
  }

  return null;
}

/**
 * Formats a user display name or first name.
 */
export function getFirstName(nameOrEmail?: string): string {
  if (!nameOrEmail) return "there";
  const clean = nameOrEmail.trim();
  if (clean.includes("@")) {
    const beforeAt = clean.split("@")[0];
    return beforeAt.charAt(0).toUpperCase() + beforeAt.slice(1);
  }
  return clean.split(" ")[0] || clean;
}

/**
 * Generates 1-2 character initials for user avatar.
 */
export function getUserInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return "U";
  const clean = nameOrEmail.trim();
  if (clean.includes("@")) {
    return clean.slice(0, 2).toUpperCase();
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
