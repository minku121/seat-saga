"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirstName, getUserInitials } from "@/lib/auth";
import { EventItem, listEvents } from "@/lib/inventoryApi";
import LiveEventsView from "./LiveEventsView";

type Tab = "events" | "mine";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [backendEvents, setBackendEvents] = useState<EventItem[]>([]);
  const [tickets, setTickets] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    listEvents()
      .then((evs) => setBackendEvents(evs || []))
      .catch(() => {});
  }, []);

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
            Browse live shows, pick your seating tier, and reserve tickets.
          </p>
        </div>

        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "events"}
            onClick={() => setActiveTab("events")}
            style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
          >
            <span>🎟️</span>
            <span>Live Shows</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
            style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
          >
            <span>🎫</span>
            <span>My Bookings ({tickets.length})</span>
          </button>
        </div>

        {activeTab === "events" && <LiveEventsView bookedTicketIds={tickets} />}

        {activeTab === "mine" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
                Your Reserved Tickets
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: "0.2rem 0 0 0" }}>
                Shows booked during your sessions.
              </p>
            </div>

            {tickets.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  textAlign: "center",
                  color: "var(--dim)",
                }}
              >
                You haven&apos;t booked any tickets yet. Switch to Live Shows to browse available events.
              </div>
            ) : (
              <ul className="grid">
                {tickets.map((ticketId) => {
                  const ev = backendEvents.find((e) => e.id === ticketId);
                  const title = ev ? ev.name : `Live Event #${ticketId}`;
                  const venue = ev ? ev.venue : "Main Venue";
                  const dateStr = ev?.eventDate
                    ? new Date(ev.eventDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Confirmed Show";

                  return (
                    <li key={ticketId}>
                      <div className="meta">
                        <time>{dateStr}</time>
                        <span>Confirmed</span>
                      </div>
                      <h3>{title}</h3>
                      <p className="where">📍 {venue}</p>
                      <div className="foot">
                        <strong>Live Entry Confirmed</strong>
                        <button
                          className="btn"
                          onClick={() => toggleTicket(ticketId)}
                          style={{ borderColor: "#f87171", color: "#f87171" }}
                        >
                          Cancel Booking
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