"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { EventItem, SeatTypeItem, getEvent, listSeatTypes } from "@/lib/inventoryApi";
import { getFirstName, getUserInitials } from "@/lib/auth";

const THEMES = [
  { gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)", accent: "#818cf8" },
  { gradient: "linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)", accent: "#c084fc" },
  { gradient: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #b91c1c 100%)", accent: "#f87171" },
  { gradient: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)", accent: "#34d399" },
  { gradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 50%, #1d4ed8 100%)", accent: "#60a5fa" },
  { gradient: "linear-gradient(135deg, #422006 0%, #713f12 50%, #a16207 100%)", accent: "#fbbf24" },
];

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);

  const { user, isAuthenticated, logout } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatTypes, setSeatTypes] = useState<SeatTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTierCode, setSelectedTierCode] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (!eventId || isNaN(eventId)) {
      setError("Invalid event ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getEvent(eventId),
      listSeatTypes(eventId).catch(() => [] as SeatTypeItem[]),
    ])
      .then(([evData, tiersData]) => {
        if (!evData) {
          setError(`Event #${eventId} not found.`);
          return;
        }
        setEvent(evData);

        if (tiersData && tiersData.length > 0) {
          setSeatTypes(tiersData);
          const firstAvailable = tiersData.find((t) => t.available > 0) || tiersData[0];
          setSelectedTierCode(firstAvailable.code);
        } else {
          setSeatTypes([]);
          setSelectedTierCode("");
        }
      })
      .catch((err: unknown) => {
        setError((err as Error)?.message || "Failed to load event details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  const theme = useMemo(() => {
    const idx = Math.abs(eventId || 0) % THEMES.length;
    return THEMES[idx];
  }, [eventId]);

  const currentTier = useMemo(() => {
    return seatTypes.find((st) => st.code === selectedTierCode) || seatTypes[0] || null;
  }, [seatTypes, selectedTierCode]);

  const totalAvailableTickets = useMemo(() => {
    return seatTypes.reduce((acc, st) => acc + (st.available || 0), 0);
  }, [seatTypes]);

  const totalCapacity = useMemo(() => {
    return seatTypes.reduce((acc, st) => acc + (st.totalQuantity || 0), 0);
  }, [seatTypes]);

  const totalOverTickets = useMemo(() => {
    return seatTypes.reduce((acc, st) => acc + Math.max(0, (st.totalQuantity || 0) - (st.available || 0)), 0);
  }, [seatTypes]);

  const handleReserveTickets = () => {
    if (!event || !currentTier || currentTier.available < ticketQuantity) return;
    setIsReserving(true);

    setTimeout(() => {
      setIsReserving(false);
      setBookingSuccess(true);

      setSeatTypes((prev) =>
        prev.map((st) =>
          st.code === currentTier.code
            ? {
                ...st,
                available: Math.max(0, st.available - ticketQuantity),
                booked: (st.booked || 0) + ticketQuantity,
              }
            : st
        )
      );

      const userKey = user?.email ? `tickets_${user.email}` : "tickets_guest";
      const existing = localStorage.getItem(userKey);
      let ticketsList: number[] = [];
      try {
        ticketsList = existing ? JSON.parse(existing) : [];
      } catch {
        ticketsList = [];
      }
      if (!ticketsList.includes(event.id)) {
        ticketsList.push(event.id);
        localStorage.setItem(userKey, JSON.stringify(ticketsList));
      }
    }, 600);
  };

  const totalPrice = (currentTier?.price || 0) * ticketQuantity;
  const firstName = user ? getFirstName(user.name || user.email) : "";
  const initials = user ? getUserInitials(user.name || user.email) : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      <header className="nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" className="pill" style={{ fontSize: "0.85rem" }}>
            Shows
          </Link>

          {isAuthenticated && user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
                >
                  {initials}
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{firstName}</span>
              </div>
              <button
                className="pill"
                onClick={logout}
                style={{ cursor: "pointer", fontSize: "0.82rem" }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link href="/auth/login" className="pill">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "2rem 1.5rem 6rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <button
            onClick={() => router.back()}
            className="btn"
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.88rem",
            }}
          >
            <span>←</span>
            <span>Back</span>
          </button>

          <div style={{ fontSize: "0.85rem", color: "var(--dim)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link href="/" style={{ color: "var(--dim)" }}>Home</Link>
            <span>/</span>
            <Link href="/dashboard" style={{ color: "var(--dim)" }}>Shows</Link>
            <span>/</span>
            <span style={{ color: "var(--fg)" }}>{event?.name || `Event #${eventId}`}</span>
          </div>
        </div>

        {loading && (
          <div
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              borderRadius: "18px",
              border: "1px dashed var(--line)",
              color: "var(--dim)",
            }}
          >
            Loading show details and tickets...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#fca5a5",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <strong>Could not load event</strong>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
            <Link href="/dashboard" className="btn" style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
              Return to Shows
            </Link>
          </div>
        )}

        {event && !loading && (
          <>
            <div
              style={{
                background: theme.gradient,
                borderRadius: "22px",
                padding: "clamp(1.75rem, 5vw, 3rem)",
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.16) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      background: "rgba(0, 0, 0, 0.55)",
                      color: theme.accent,
                    }}
                  >
                    Event #{event.id}
                  </span>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      background: "rgba(16, 185, 129, 0.2)",
                      color: "#6ee7b7",
                    }}
                  >
                    ● {event.status || "PUBLISHED"}
                  </span>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      background: totalAvailableTickets > 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: totalAvailableTickets > 0 ? "#34d399" : "#f87171",
                    }}
                  >
                    {totalAvailableTickets > 0
                      ? `${totalAvailableTickets.toLocaleString()} Available`
                      : "Sold Out"}
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: "clamp(2rem, 5vw, 3.2rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {event.name}
                </h1>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1.5rem",
                    fontSize: "0.95rem",
                    color: "rgba(255, 255, 255, 0.9)",
                    alignItems: "center",
                  }}
                >
                  <span>📍 {event.venue}</span>
                  <span>
                    📅{" "}
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Upcoming"}
                  </span>
                  <span>👥 Capacity: {event.maxCapacity?.toLocaleString()} seats</span>
                </div>

                {event.description && (
                  <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem", lineHeight: 1.5, maxWidth: "60ch", margin: 0 }}>
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.04)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "16px",
                  padding: "1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }}>
                  Available to Book
                </span>
                <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399" }}>
                  {totalAvailableTickets.toLocaleString()}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                  Ready for instant booking
                </span>
              </div>

              <div
                style={{
                  background: "rgba(239, 68, 68, 0.04)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "16px",
                  padding: "1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "#f87171", fontWeight: 700, textTransform: "uppercase" }}>
                  Over / Sold Out
                </span>
                <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f87171" }}>
                  {totalOverTickets.toLocaleString()}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                  Booked seats
                </span>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>
                  Seating Tiers
                </span>
                <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--glow)" }}>
                  {seatTypes.length}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                  {totalCapacity > 0 ? `${totalCapacity.toLocaleString()} total capacity` : "None configured"}
                </span>
              </div>
            </div>

            <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                    Seating Tiers &amp; Ticket Status
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: "0.2rem 0 0 0" }}>
                    Select a tier to book tickets directly.
                  </p>
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--dim)" }}>
                  {seatTypes.length} tier{seatTypes.length === 1 ? "" : "s"}
                </span>
              </div>

              {seatTypes.length === 0 ? (
                <div
                  style={{
                    padding: "3.5rem 1.5rem",
                    borderRadius: "18px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1.5px dashed rgba(255, 196, 107, 0.25)",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span style={{ fontSize: "1.75rem" }}>🎟️</span>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                      No tickets configured yet by admin
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: "var(--dim)", maxWidth: "48ch", margin: "0.35rem auto 0 auto", lineHeight: 1.4 }}>
                      The organizer has not released ticket tiers for this event yet. Please check back later.
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="btn"
                    style={{ padding: "0.5rem 1.25rem", borderRadius: "999px", fontSize: "0.88rem" }}
                  >
                    ← Browse Other Shows
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {seatTypes.map((st) => {
                    const isSelected = selectedTierCode === st.code;
                    const isAvailable = st.available > 0;
                    const percentLeft = st.totalQuantity > 0 ? Math.round((st.available / st.totalQuantity) * 100) : 0;
                    const overCount = Math.max(0, st.totalQuantity - st.available);

                    return (
                      <div
                        key={st.code}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedTierCode(st.code);
                            setBookingSuccess(false);
                          }
                        }}
                        style={{
                          background: isSelected && isAvailable
                            ? "rgba(99, 102, 241, 0.08)"
                            : !isAvailable
                            ? "rgba(255, 255, 255, 0.015)"
                            : "rgba(255, 255, 255, 0.025)",
                          border: isSelected && isAvailable
                            ? "1.5px solid var(--glow)"
                            : !isAvailable
                            ? "1px solid rgba(239, 68, 68, 0.2)"
                            : "1px solid var(--line)",
                          borderRadius: "18px",
                          padding: "1.25rem 1.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                          cursor: isAvailable ? "pointer" : "not-allowed",
                          opacity: isAvailable ? 1 : 0.7,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: "var(--dim)",
                                  fontFamily: "monospace",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "6px",
                                }}
                              >
                                {st.code}
                              </span>
                              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                                {st.name || st.code}
                              </h3>
                            </div>
                            {st.description && (
                              <p style={{ fontSize: "0.85rem", color: "var(--dim)", margin: "0.25rem 0 0 0" }}>
                                {st.description}
                              </p>
                            )}
                          </div>

                          <div>
                            {isAvailable ? (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: "999px",
                                  background: "rgba(16, 185, 129, 0.18)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16, 185, 129, 0.35)",
                                }}
                              >
                                ● Available to Book
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: "999px",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                }}
                              >
                                ✕ Over / Sold Out
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "0.75rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            borderRadius: "12px",
                            padding: "0.85rem 1rem",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "0.72rem", color: "var(--dim)", textTransform: "uppercase" }}>Price</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--glow)" }}>
                              ₹{st.price.toLocaleString("en-IN")}
                              <span style={{ fontSize: "0.75rem", color: "var(--dim)", fontWeight: 400, marginLeft: "0.25rem" }}>/seat</span>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.72rem", color: "#34d399", textTransform: "uppercase", fontWeight: 600 }}>Available</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#34d399" }}>
                              {st.available.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.72rem", color: "#f87171", textTransform: "uppercase", fontWeight: 600 }}>Over / Booked</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f87171" }}>
                              {overCount.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.72rem", color: "var(--dim)", textTransform: "uppercase" }}>Total</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--fg)" }}>
                              {st.totalQuantity.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--dim)", marginBottom: "0.3rem" }}>
                            <span>{isAvailable ? `${percentLeft}% left` : "Sold out"}</span>
                            <span>{st.available} / {st.totalQuantity} remaining</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "999px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${percentLeft}%`,
                                height: "100%",
                                background: isAvailable ? "#10b981" : "#ef4444",
                                borderRadius: "999px",
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                          {isAvailable ? (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.82rem", color: "var(--dim)" }}>Qty:</span>
                                <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTierCode(st.code);
                                      setTicketQuantity((q) => Math.max(1, q - 1));
                                    }}
                                    style={{
                                      padding: "0.3rem 0.65rem",
                                      background: "none",
                                      border: "none",
                                      color: "var(--fg)",
                                      cursor: "pointer",
                                      fontSize: "0.95rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    −
                                  </button>
                                  <span style={{ padding: "0.3rem 0.65rem", fontWeight: 700, fontSize: "0.9rem", minWidth: "28px", textAlign: "center" }}>
                                    {isSelected ? ticketQuantity : 1}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTierCode(st.code);
                                      setTicketQuantity((q) => Math.min(st.available, q + 1));
                                    }}
                                    style={{
                                      padding: "0.3rem 0.65rem",
                                      background: "none",
                                      border: "none",
                                      color: "var(--fg)",
                                      cursor: "pointer",
                                      fontSize: "0.95rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTierCode(st.code);
                                }}
                                style={{
                                  padding: "0.55rem 1.2rem",
                                  borderRadius: "8px",
                                  border: isSelected ? "1px solid var(--glow)" : "1px solid var(--line)",
                                  background: isSelected ? "var(--glow)" : "rgba(255, 255, 255, 0.04)",
                                  color: isSelected ? "#000" : "var(--fg)",
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                }}
                              >
                                {isSelected ? "✓ Selected" : "Select Tier"}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: "0.82rem", color: "#f87171" }}>
                              Tickets unavailable for this tier.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {seatTypes.length > 0 && currentTier && currentTier.available > 0 && (
              <div
                style={{
                  background: "rgba(18, 18, 22, 0.95)",
                  border: "1px solid rgba(255, 196, 107, 0.35)",
                  borderRadius: "20px",
                  padding: "1.5rem clamp(1rem, 4vw, 2rem)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1.25rem",
                  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.7)",
                  position: "sticky",
                  bottom: "1.5rem",
                  zIndex: 20,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--dim)" }}>
                    Selected: <strong style={{ color: "var(--fg)" }}>{currentTier.name || currentTier.code}</strong> • {ticketQuantity} Ticket{ticketQuantity > 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--glow)", letterSpacing: "-0.03em", marginTop: "0.15rem" }}>
                    ₹{totalPrice.toLocaleString("en-IN")}
                    <span style={{ fontSize: "0.8rem", color: "var(--dim)", fontWeight: 400, marginLeft: "0.4rem" }}>
                      total
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  {bookingSuccess ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ color: "#34d399", fontWeight: 600, fontSize: "0.92rem" }}>
                        🎉 {ticketQuantity} Ticket{ticketQuantity > 1 ? "s" : ""} Booked!
                      </span>
                      <Link
                        href="/dashboard"
                        className="btn primary"
                        style={{ padding: "0.65rem 1.3rem", fontSize: "0.9rem" }}
                      >
                        View Bookings →
                      </Link>
                    </div>
                  ) : (
                    <button
                      className="btn primary"
                      disabled={isReserving || currentTier.available < ticketQuantity}
                      onClick={handleReserveTickets}
                      style={{
                        padding: "0.75rem 2rem",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        cursor: isReserving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isReserving ? "Booking..." : `Confirm & Book ${ticketQuantity} Ticket${ticketQuantity > 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
