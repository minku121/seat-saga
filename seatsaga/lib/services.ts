const normalizeUrl = (url?: string) => (url ? url.trim().replace(/\/+$/, "") : "");

export const SERVICES = {
  auth: normalizeUrl(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL) || "https://seat-saga-1xwb.onrender.com",
  inventory: normalizeUrl(process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL) || "https://seat-saga-inventory-stt9.onrender.com",
  booking: normalizeUrl(process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL) || "https://seat-saga-booking.onrender.com",
  payment: normalizeUrl(process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL) || "https://seat-saga-payment.onrender.com",
};

export const AUTH_SERVICE_URL = SERVICES.auth;
export const INVENTORY_SERVICE_URL = SERVICES.inventory;
export const BOOKING_SERVICE_URL = SERVICES.booking;
export const PAYMENT_SERVICE_URL = SERVICES.payment;

export default SERVICES;
