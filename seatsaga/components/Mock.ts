// Everything here is mocked data. No backend, no storage.
export type User = { name: string; email: string };

export const mockUser: User = { name: "Aarav Sharma", email: "aarav@example.com" };

// Concert ids already "booked" when the dashboard opens
export const mockTickets: number[] = [3, 5];