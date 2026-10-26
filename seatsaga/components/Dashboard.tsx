"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirstName, getUserInitials } from "@/lib/auth";
import { EventItem, listEvents } from "@/lib/inventoryApi";

type Tab = "events" | "mine";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  const [tickets, setTickets] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
      const saved = localStorage.getItem(`tickets_${user.email}`);
      if (saved) {
        try {
          setTickets(JSON.parse(saved));
        } catch {
          setTickets([]);
        }
      } else {
        setTickets([]);
      }
    }
  }, [user?.email]);

  const toggleTicket = (id: number) => {
    setTickets((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (user?.email) {
        localStorage.setItem(`tickets_${user.email}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

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

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "var(--bg)",
          color: "var(--fg)",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid rgba(236, 235, 230, 0.15)",
            borderTopColor: "var(--glow)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "var(--dim)", fontSize: "0.9rem" }}>Loading dashboard...</p>
        <style jsx>{`
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
    <>
      <header className="nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "0.3rem 0.75rem 0.3rem 0.4rem",
              borderRadius: "999px",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "var(--glow)",
                color: "#000",
                fontWeight: 700,
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={user.email}
            >
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
              <span style={{ color: "var(--fg)", fontWeight: 500, fontSize: "0.88rem" }}>
                {user.name || firstName}
              </span>
              <span style={{ color: "var(--dim)", fontSize: "0.7rem" }}>
                {user.email}
              </span>
            </div>
          </div>

          <button className="pill" onClick={logout} style={{ cursor: "pointer" }}>
            Log out
          </button>
        </nav>
      </header>

      <main className="dash">
        <div style={{ marginBottom: "1.5rem" }}>
          <h1>Hi {firstName}, welcome to SeatSaga</h1>
          <p style={{ color: "var(--dim)", fontSize: "0.95rem", marginTop: "-1.25rem" }}>
            Live events powered by your inventory service. Pick seats and reserve tickets.
          </p>
        </div>

        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "events"}
            onClick={() => setActiveTab("events")}
          >
            Live Shows ({events.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
          >
            My Bookings ({tickets.length})
          </button>
        </div>

        {activeTab === "events" && (
          <div>
            <div className="filters" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <input
                type="search"
                placeholder="Search events, venues or artists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn"
                onClick={loadEvents}
                disabled={loadingEvents}
                style={{ whiteSpace: "nowrap" }}
              >
                {loadingEvents ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div className="chips">
              {["ALL", "PUBLISHED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "ALL" ? "All Events" : st}
                </button>
              ))}
            </div>

            {loadingEvents && events.length === 0 && (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  color: "var(--dim)",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "3px solid rgba(236, 235, 230, 0.15)",
                    borderTopColor: "var(--glow)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 1rem",
                  }}
                />
                Connecting to inventory service...
              </div>
            )}

            {errorEvents && (
              <div
                style={{
                  padding: "1.2rem 1.4rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ color: "#f87171", display: "block", marginBottom: "0.2rem" }}>
                    Service Notice
                  </strong>
                  <span style={{ fontSize: "0.88rem", color: "var(--fg)" }}>{errorEvents}</span>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={loadEvents}
                  style={{ borderColor: "#f87171", color: "#f87171" }}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {!loadingEvents && filteredEvents.length === 0 && !errorEvents && (
              <p className="empty">
                {events.length === 0
                  ? "No events found in your inventory service yet."
                  : "No events matching your search filter."}
              </p>
            )}

            <ul className="grid">
              {filteredEvents.map((ev) => {
                const isBooked = tickets.includes(ev.id);
                const dateStr = ev.eventDate
                  ? new Date(ev.eventDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Date TBA";

                return (
                  <li key={ev.id}>
                    <div className="meta">
                      <time>{dateStr}</time>
                      <span
                        style={{
                          textTransform: "uppercase",
                          fontSize: "0.75rem",
                          letterSpacing: "0.05em",
                          color: ev.status === "PUBLISHED" ? "var(--glow)" : "var(--dim)",
                        }}
                      >
                        {ev.status || "LIVE"}
                      </span>
                    </div>

                    <h3>{ev.name}</h3>

                    {ev.description && (
                      <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: "0.2rem 0" }}>
                        {ev.description}
                      </p>
                    )}

                    <p className="where">📍 {ev.venue || "Main Arena"}</p>

                    <div style={{ fontSize: "0.82rem", color: "var(--dim)" }}>
                      Max Capacity: <strong>{(ev.maxCapacity || 0).toLocaleString()}</strong>
                    </div>

                    <div className="foot">
                      <Link href={`/events/${ev.id}`} className="btn">
                        Select seats
                      </Link>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => toggleTicket(ev.id)}
                        style={
                          isBooked
                            ? { borderColor: "#f87171", color: "#f87171" }
                            : { borderColor: "var(--glow)", color: "var(--glow)" }
                        }
                      >
                        {isBooked ? "Cancel booking" : "Quick book"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {activeTab === "mine" && (
          <div>
            {tickets.length === 0 ? (
              <p className="empty">
                You haven&apos;t booked any tickets yet. Switch to &ldquo;Live Shows&rdquo; to browse events.
              </p>
            ) : (
              <ul className="grid">
                {tickets.map((ticketId) => {
                  const ev = events.find((item) => item.id === ticketId);
                  const title = ev ? ev.name : `Event #${ticketId}`;
                  const where = ev ? ev.venue : "Main Venue";
                  const date = ev?.eventDate
                    ? new Date(ev.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Confirmed Show";

                  return (
                    <li key={ticketId}>
                      <div className="meta">
                        <time>{date}</time>
                        <span style={{ color: "var(--glow)" }}>Confirmed</span>
                      </div>
                      <h3>{title}</h3>
                      <p className="where">📍 {where}</p>
                      <div className="foot">
                        <Link href={`/events/${ticketId}`} className="btn">
                          View event
                        </Link>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => toggleTicket(ticketId)}
                          style={{ borderColor: "#f87171", color: "#f87171" }}
                        >
                          Cancel booking
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}