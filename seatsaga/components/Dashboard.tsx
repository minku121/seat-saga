"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirstName, getUserInitials } from "@/lib/auth";
import { EventItem, listEvents } from "@/lib/inventoryApi";
import { StoredBooking, getStoredBookings } from "@/lib/bookingApi";

type Tab = "events" | "mine";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  const [heldBookings, setHeldBookings] = useState<StoredBooking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setErrorEvents(null);
    try {
      const data = await listEvents();
      setEvents(data || []);
    } catch (err: unknown) {
      setErrorEvents(
        (err as Error)?.message ||
          "Could not connect to Inventory Service. If the service is waking up, please retry in a moment."
      );
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (user?.email) {
      setHeldBookings(getStoredBookings(user.email));
    } else {
      setHeldBookings([]);
    }
  }, [user?.email]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      const matchesSearch =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        (ev.venue && ev.venue.toLowerCase().includes(q)) ||
        (ev.description && ev.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter !== "ALL") {
        return (ev.status || "PUBLISHED").toUpperCase() === statusFilter;
      }

      return true;
    });
  }, [events, search, statusFilter]);

  const confirmedCount = useMemo(() => {
    return heldBookings.filter(
      (b) => b.paymentStatus === "PAID" || b.status === "CONFIRMED"
    ).length;
  }, [heldBookings]);

  const pendingCount = heldBookings.length - confirmedCount;

  const handleCopyOrder = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="dash-loading-screen">
        <div className="dash-spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .dash-loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            background: var(--bg);
            color: var(--fg);
          }
          .dash-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid rgba(236, 235, 230, 0.15);
            border-top-color: var(--glow);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const firstName = getFirstName(user.name || user.email);
  const initials = getUserInitials(user.name || user.email);

  return (
    <div className="dashboard-root">
      {/* Top Header */}
      <header className="nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/architecture"
            style={{
              color: "var(--dim)",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            Architecture
          </Link>

          <div className="user-profile-chip">
            <div className="user-avatar" title={user.email}>
              {initials}
            </div>
            <div className="user-meta">
              <span className="user-name">{user.name || firstName}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <button className="pill" onClick={logout} style={{ cursor: "pointer" }}>
            Log out
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dash">
        {/* Editorial Greeting & Overview */}
        <div className="dash-hero">
          <div>
            <span className="dash-eyebrow">Concert Pass &amp; Ticketing</span>
            <h1 className="dash-title">Welcome back, {firstName}</h1>
            <p className="dash-subtitle">
              Choose your exact row, check real-time availability, and reserve seats in seconds.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="dash-stats">
            <div className="stat-card">
              <span className="stat-label">Live Shows</span>
              <strong className="stat-value">{events.length}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Confirmed Tickets</span>
              <strong className="stat-value" style={{ color: "#34d399" }}>
                {confirmedCount}
              </strong>
            </div>
            {pendingCount > 0 && (
              <div className="stat-card">
                <span className="stat-label">Active Holds</span>
                <strong className="stat-value" style={{ color: "var(--glow)" }}>
                  {pendingCount}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "events"}
            onClick={() => setActiveTab("events")}
            className="tab-button"
          >
            <span>Live Shows</span>
            <span className="tab-badge">{events.length}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
            className="tab-button"
          >
            <span>My Bookings</span>
            {heldBookings.length > 0 && (
              <span className="tab-badge active">{heldBookings.length}</span>
            )}
          </button>
        </div>

        {/* TAB 1: Live Shows */}
        {activeTab === "events" && (
          <div className="tab-content">
            {/* Search & Filter Toolbar */}
            <div className="toolbar">
              <div className="search-wrap">
                <svg
                  className="search-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  placeholder="Search shows, venues, or cities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="search-clear"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="toolbar-actions">
                <div className="chips-group">
                  {["ALL", "PUBLISHED", "DRAFT"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={statusFilter === st}
                      onClick={() => setStatusFilter(st)}
                      className="filter-chip"
                    >
                      {st === "ALL" ? "All Shows" : st.toLowerCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-refresh"
                  onClick={loadEvents}
                  disabled={loadingEvents}
                  title="Refresh shows from inventory service"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      animation: loadingEvents ? "spin 0.8s linear infinite" : "none",
                    }}
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                  <span>{loadingEvents ? "Updating..." : "Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorEvents && (
              <div className="service-alert">
                <div className="alert-content">
                  <div className="alert-badge">Notice</div>
                  <div>
                    <strong>Inventory Service Connection Notice</strong>
                    <p>{errorEvents}</p>
                  </div>
                </div>
                <button type="button" className="btn btn-sm" onClick={loadEvents}>
                  Retry Connection
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loadingEvents && events.length === 0 && (
              <div className="events-loading">
                <div className="dash-spinner" />
                <p>Retrieving live inventory from backend...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingEvents && filteredEvents.length === 0 && !errorEvents && (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2" />
                    <path d="M13 17v2" />
                    <path d="M13 11v2" />
                  </svg>
                </div>
                <h3>No shows found</h3>
                <p>
                  {events.length === 0
                    ? "No live events are currently scheduled in your inventory service."
                    : "No shows match your search criteria. Try clearing your filter."}
                </p>
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                    className="btn btn-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}

            {/* Curated Event Cards Grid */}
            <div className="event-grid">
              {filteredEvents.map((ev) => {
                const dateObj = ev.eventDate ? new Date(ev.eventDate) : null;
                const monthStr = dateObj
                  ? dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
                  : "LIVE";
                const dayStr = dateObj
                  ? dateObj.toLocaleDateString("en-US", { day: "numeric" })
                  : "•";
                const dayName = dateObj
                  ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
                  : "";

                const isDraft = (ev.status || "").toUpperCase() === "DRAFT";

                return (
                  <article key={ev.id} className="event-card">
                    {/* Card Header with Ticket Stub Date & Status */}
                    <div className="event-card-header">
                      <div className="ticket-date-badge">
                        <span className="ticket-month">{monthStr}</span>
                        <span className="ticket-day">{dayStr}</span>
                        {dayName && <span className="ticket-weekday">{dayName}</span>}
                      </div>

                      <div className="event-card-badges">
                        <span
                          className={`status-pill ${
                            isDraft ? "status-draft" : "status-live"
                          }`}
                        >
                          ● {isDraft ? "Draft" : "On Sale"}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="event-card-body">
                      <div className="event-id-tag">Event #{ev.id}</div>
                      <h3 className="event-title">
                        <Link href={`/events/${ev.id}`}>{ev.name}</Link>
                      </h3>

                      <div className="event-venue">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{ev.venue || "Main Arena"}</span>
                      </div>

                      {ev.description && (
                        <p className="event-desc">{ev.description}</p>
                      )}
                    </div>

                    {/* Card Footer: Metadata & Primary Action */}
                    <div className="event-card-footer">
                      <div className="event-capacity">
                        <span className="capacity-label">Capacity</span>
                        <span className="capacity-number">
                          {(ev.maxCapacity || 0).toLocaleString()} seats
                        </span>
                      </div>

                      <Link href={`/events/${ev.id}`} className="btn-select-seats">
                        <span>Select seats</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: My Bookings */}
        {activeTab === "mine" && (
          <div className="tab-content">
            {/* Policy Notice: Cancellations Unavailable */}
            <div className="policy-banner">
              <div className="policy-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="policy-text">
                <strong>Booking Policy Notice</strong>
                <span>
                  Ticket cancellations and seat releases are currently not available.
                  All held seats and completed reservations are final and cannot be cancelled at this time.
                </span>
              </div>
            </div>

            {heldBookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <h3>No bookings recorded yet</h3>
                <p>
                  You haven&apos;t reserved or held tickets yet. Browse our live shows to
                  select seats and secure your pass.
                </p>
                <button
                  onClick={() => setActiveTab("events")}
                  className="btn primary"
                  style={{ marginTop: "0.5rem" }}
                >
                  Browse Live Shows →
                </button>
              </div>
            ) : (
              <div className="bookings-list">
                <div className="bookings-section-header">
                  <h2>Active Reservations &amp; Passes ({heldBookings.length})</h2>
                  <span className="bookings-section-sub">
                    Stored on your device &amp; verified against Seat Saga servers
                  </span>
                </div>

                <div className="booking-cards-grid">
                  {heldBookings.map((bk) => {
                    const isPaid =
                      bk.paymentStatus === "PAID" || bk.status === "CONFIRMED";
                    const ev = events.find((item) => item.id === bk.eventId);
                    const title = bk.eventName || ev?.name || `Event #${bk.eventId}`;
                    const venue = bk.venue || ev?.venue || "Main Arena";
                    const dateStr = bk.eventDate || ev?.eventDate
                      ? new Date(bk.eventDate || ev?.eventDate || "").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "Upcoming Show";

                    const isCopied = copiedOrderId === bk.orderId;

                    return (
                      <div
                        key={bk.orderId}
                        className={`booking-card ${isPaid ? "booking-paid" : "booking-held"}`}
                      >
                        {/* Booking Header */}
                        <div className="booking-card-top">
                          <div>
                            <span className="booking-date-label">{dateStr}</span>
                            <h3 className="booking-title">{title}</h3>
                            <div className="booking-venue">
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{venue}</span>
                            </div>
                          </div>

                          <div className="booking-status-tag">
                            <span className={`status-pill ${isPaid ? "status-confirmed" : "status-held"}`}>
                              ● {isPaid ? "CONFIRMED & PAID" : bk.status || "SEATS HELD"}
                            </span>
                          </div>
                        </div>

                        {/* Order & Ticket Information */}
                        <div className="booking-voucher-box">
                          <div className="voucher-row">
                            <span className="voucher-label">Order Reference:</span>
                            <div className="voucher-order-id">
                              <code>{bk.orderId}</code>
                              <button
                                type="button"
                                onClick={() => handleCopyOrder(bk.orderId)}
                                className="btn-copy-id"
                                title="Copy full Order ID"
                              >
                                {isCopied ? "✓ Copied" : "Copy"}
                              </button>
                            </div>
                          </div>

                          {bk.razorpayPaymentId && (
                            <div className="voucher-row">
                              <span className="voucher-label">Payment ID:</span>
                              <code className="voucher-payment-id">
                                {bk.razorpayPaymentId}
                              </code>
                            </div>
                          )}

                          <div className="voucher-row">
                            <span className="voucher-label">Seating Tier:</span>
                            <span className="voucher-tier">{bk.seatTypeCode}</span>
                          </div>

                          <div className="voucher-row">
                            <span className="voucher-label">Assigned Seats:</span>
                            <div className="seats-pills-wrap">
                              {bk.seatNumbers && bk.seatNumbers.length > 0 ? (
                                bk.seatNumbers.map((s) => (
                                  <span key={s} className="seat-badge">
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="voucher-val-dim">
                                  {bk.quantity} seats allocated
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="voucher-divider" />

                          <div className="voucher-row voucher-total-row">
                            <span className="voucher-label">Total Amount:</span>
                            <span className="voucher-price">
                              ₹{(bk.totalAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Actions & Non-Cancellable State */}
                        <div className="booking-card-actions">
                          <Link href={`/events/${bk.eventId}`} className="btn btn-sm">
                            View Show Details →
                          </Link>

                          {/* CANCEL BOOKING DISABLED AS REQUESTED */}
                          <div className="cancel-unavailable-group">
                            <button
                              type="button"
                              disabled
                              className="btn-cancel-disabled"
                              title="Cancellations are currently unavailable for this booking"
                            >
                              Cancel Booking
                            </button>
                            <span className="cancel-policy-note">
                              Cancellation unavailable
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Scoped CSS for authentic Theme styling */}
      <style jsx>{`
        .dashboard-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--fg);
        }

        .user-profile-chip {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line);
          padding: 0.3rem 0.85rem 0.3rem 0.35rem;
          border-radius: 999px;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--glow);
          color: #000;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -0.02em;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--fg);
        }

        .user-email {
          font-size: 0.7rem;
          color: var(--dim);
        }

        .dash-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          margin-bottom: 2.25rem;
          flex-wrap: wrap;
        }

        .dash-eyebrow {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--glow);
          font-weight: 600;
          display: block;
          margin-bottom: 0.4rem;
        }

        .dash-title {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.05;
          margin: 0;
        }

        .dash-subtitle {
          color: var(--dim);
          font-size: 0.95rem;
          margin-top: 0.5rem;
          max-width: 50ch;
          line-height: 1.5;
        }

        .dash-stats {
          display: flex;
          gap: 0.75rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 0.65rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .stat-label {
          font-size: 0.72rem;
          color: var(--dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--fg);
        }

        /* Tabs */
        .tab-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: var(--dim);
          font-family: inherit;
          font-size: 1rem;
          font-weight: 500;
          padding: 0.75rem 0;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .tab-button[aria-selected="true"] {
          color: var(--fg);
          border-bottom-color: var(--glow);
        }

        .tab-badge {
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.07);
          color: var(--dim);
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }

        .tab-badge.active {
          background: rgba(255, 196, 107, 0.15);
          color: var(--glow);
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1 1 280px;
          max-width: 440px;
        }

        .search-icon {
          position: absolute;
          left: 0.95rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--dim);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.65rem 2.2rem 0.65rem 2.5rem;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--fg);
          font-size: 0.88rem;
          transition: border-color 0.2s ease;
        }

        .search-input:focus {
          border-color: var(--glow);
          outline: none;
        }

        .search-clear {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--dim);
          cursor: pointer;
          font-size: 0.8rem;
          padding: 0.2rem;
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .chips-group {
          display: flex;
          gap: 0.4rem;
        }

        .filter-chip {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--line);
          color: var(--dim);
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          text-transform: capitalize;
          transition: all 0.15s ease;
        }

        .filter-chip[aria-pressed="true"] {
          background: var(--fg);
          color: #000;
          border-color: var(--fg);
          font-weight: 600;
        }

        .btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.95rem;
          font-size: 0.82rem;
          cursor: pointer;
          border-radius: 999px;
        }

        /* Event Card Grid */
        .event-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }

        .event-card {
          background: #0d0d11;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }

        .event-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 196, 107, 0.4);
          box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.8);
        }

        .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        /* Ticket stub style date pill */
        .ticket-date-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(236, 235, 230, 0.1);
          border-radius: 10px;
          padding: 0.35rem 0.65rem;
          min-width: 52px;
          line-height: 1.1;
        }

        .ticket-month {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--glow);
        }

        .ticket-day {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--fg);
        }

        .ticket-weekday {
          font-size: 0.65rem;
          color: var(--dim);
          text-transform: uppercase;
        }

        .status-pill {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .status-live {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-draft {
          background: rgba(255, 255, 255, 0.05);
          color: var(--dim);
          border: 1px solid var(--line);
        }

        .status-confirmed {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }

        .status-held {
          background: rgba(255, 196, 107, 0.15);
          color: var(--glow);
          border: 1px solid rgba(255, 196, 107, 0.35);
        }

        .event-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .event-id-tag {
          font-size: 0.7rem;
          color: var(--dim);
          font-family: monospace;
          letter-spacing: 0.04em;
        }

        .event-title {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin: 0;
          color: var(--fg);
        }

        .event-title a:hover {
          color: var(--glow);
        }

        .event-venue {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--dim);
          font-size: 0.85rem;
          margin-top: 0.15rem;
        }

        .event-desc {
          font-size: 0.84rem;
          color: var(--dim);
          line-height: 1.45;
          margin-top: 0.35rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .event-card-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid rgba(236, 235, 230, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .event-capacity {
          display: flex;
          flex-direction: column;
        }

        .capacity-label {
          font-size: 0.68rem;
          color: var(--dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .capacity-number {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--fg);
        }

        .btn-select-seats {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1.15rem;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.03);
          color: var(--fg);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-select-seats:hover {
          background: var(--glow);
          color: #000;
          border-color: var(--glow);
        }

        /* Policy Banner */
        .policy-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: rgba(255, 196, 107, 0.05);
          border: 1px solid rgba(255, 196, 107, 0.2);
          margin-bottom: 2rem;
          color: var(--fg);
        }

        .policy-icon {
          color: var(--glow);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .policy-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.86rem;
          line-height: 1.45;
        }

        .policy-text strong {
          color: var(--glow);
        }

        .policy-text span {
          color: var(--dim);
        }

        /* Bookings List */
        .bookings-section-header {
          margin-bottom: 1.25rem;
        }

        .bookings-section-header h2 {
          font-size: 1.4rem;
          margin: 0;
        }

        .bookings-section-sub {
          font-size: 0.85rem;
          color: var(--dim);
        }

        .booking-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1.25rem;
        }

        .booking-card {
          background: #0d0d11;
          border-radius: 16px;
          padding: 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
        }

        .booking-paid {
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .booking-held {
          border: 1px solid rgba(255, 196, 107, 0.3);
        }

        .booking-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .booking-date-label {
          font-size: 0.75rem;
          color: var(--dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .booking-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.2rem 0;
          line-height: 1.2;
        }

        .booking-venue {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--dim);
          font-size: 0.82rem;
        }

        .booking-voucher-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(236, 235, 230, 0.07);
          border-radius: 10px;
          padding: 0.9rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .voucher-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
        }

        .voucher-label {
          color: var(--dim);
        }

        .voucher-order-id {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .voucher-order-id code {
          font-family: monospace;
          font-size: 0.78rem;
          color: var(--fg);
        }

        .btn-copy-id {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--line);
          color: var(--dim);
          font-size: 0.7rem;
          border-radius: 4px;
          padding: 0.1rem 0.4rem;
          cursor: pointer;
        }

        .btn-copy-id:hover {
          color: var(--fg);
          border-color: var(--fg);
        }

        .voucher-payment-id {
          font-family: monospace;
          color: #34d399;
          font-size: 0.78rem;
        }

        .voucher-tier {
          font-weight: 700;
          color: var(--glow);
        }

        .seats-pills-wrap {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
        }

        .seat-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
        }

        .voucher-val-dim {
          color: var(--dim);
        }

        .voucher-divider {
          height: 1px;
          background: rgba(236, 235, 230, 0.08);
          margin: 0.25rem 0;
        }

        .voucher-total-row {
          font-size: 0.88rem;
        }

        .voucher-price {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--glow);
        }

        .booking-card-actions {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .cancel-unavailable-group {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.15rem;
        }

        .btn-cancel-disabled {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(236, 235, 230, 0.15);
          color: rgba(236, 235, 230, 0.35);
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.78rem;
          cursor: not-allowed;
        }

        .cancel-policy-note {
          font-size: 0.68rem;
          color: var(--dim);
          letter-spacing: 0.02em;
        }

        .btn-sm {
          padding: 0.45rem 0.95rem;
          font-size: 0.82rem;
          border-radius: 999px;
          cursor: pointer;
        }

        /* Empty & Alert States */
        .empty-state {
          padding: 3.5rem 1.5rem;
          border: 1px dashed var(--line);
          border-radius: 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: var(--dim);
        }

        .empty-icon {
          color: var(--dim);
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.2rem;
          color: var(--fg);
          margin: 0;
        }

        .empty-state p {
          max-width: 44ch;
          font-size: 0.9rem;
          line-height: 1.45;
          margin: 0;
        }

        .events-loading {
          padding: 4rem 1rem;
          text-align: center;
          color: var(--dim);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .service-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .alert-content {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .alert-badge {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        .alert-content p {
          font-size: 0.85rem;
          color: var(--dim);
          margin: 0.2rem 0 0 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
