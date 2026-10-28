"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventItem, listEvents } from "@/lib/inventoryApi";

interface Props {
  bookedTicketIds?: number[];
}

export default function LiveEventsView({ bookedTicketIds = [] }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "THIS_MONTH" | "ARENA">("ALL");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEvents();
      setEvents(data || []);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load events from inventory service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      const matchesSearch =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        (ev.venue && ev.venue.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filter === "THIS_MONTH") {
        return (ev.eventDate || "").startsWith("2026-10") || (ev.eventDate || "").startsWith("2026-11");
      }
      if (filter === "ARENA") {
        const v = (ev.venue || "").toLowerCase();
        return v.includes("stadium") || v.includes("arena") || v.includes("hall") || v.includes("ground");
      }
      return true;
    });
  }, [events, search, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Filter & Search Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(["ALL", "THIS_MONTH", "ARENA"] as const).map((key) => {
            const labels = {
              ALL: "All Shows",
              THIS_MONTH: "This Month",
              ARENA: "Arenas & Stadiums",
            };
            const isSelected = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  background: isSelected ? "var(--fg)" : "rgba(255, 255, 255, 0.02)",
                  color: isSelected ? "#000" : "var(--dim)",
                  border: `1px solid ${isSelected ? "var(--fg)" : "var(--line)"}`,
                  borderRadius: "999px",
                  padding: "0.4rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 260px", maxWidth: "380px" }}>
          <input
            type="search"
            placeholder="Search shows or venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 1.1rem",
              fontSize: "0.85rem",
              background: "rgba(255, 255, 255, 0.025)",
              border: "1px solid var(--line)",
              borderRadius: "999px",
              color: "var(--fg)",
            }}
          />

          <button
            onClick={loadEvents}
            disabled={loading}
            title="Refresh"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--line)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg)",
              cursor: loading ? "wait" : "pointer",
              flexShrink: 0,
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "0.85rem 1.1rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "12px",
            color: "#fca5a5",
            fontSize: "0.86rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadEvents}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.82rem",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div style={{ padding: "4rem 0", textAlign: "center", color: "var(--dim)", fontSize: "0.92rem" }}>
          Retrieving live inventory...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "3.5rem 1.5rem",
            border: "1px dashed var(--line)",
            borderRadius: "16px",
            textAlign: "center",
            color: "var(--dim)",
          }}
        >
          <p style={{ fontSize: "1.1rem", color: "var(--fg)", marginBottom: "0.3rem" }}>No shows found</p>
          <p style={{ fontSize: "0.85rem" }}>Try a different search term or category filter.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filtered.map((ev) => {
            const isBooked = bookedTicketIds.includes(ev.id);
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

            return (
              <article
                key={ev.id}
                onClick={() => router.push(`/events/${ev.id}`)}
                className="live-event-card"
                style={{
                  background: "#0d0d11",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "1.35rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  cursor: "pointer",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(255, 255, 255, 0.035)",
                      border: "1px solid rgba(236, 235, 230, 0.1)",
                      borderRadius: "10px",
                      padding: "0.35rem 0.65rem",
                      minWidth: "52px",
                      lineHeight: "1.1",
                    }}
                  >
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--glow)" }}>
                      {monthStr}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 800, color: "var(--fg)" }}>
                      {dayStr}
                    </span>
                    {dayName && (
                      <span style={{ fontSize: "0.65rem", color: "var(--dim)", textTransform: "uppercase" }}>
                        {dayName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {isBooked && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "999px",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        ✓ Booked
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "var(--fg)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      ● {ev.status || "PUBLISHED"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--dim)", fontFamily: "monospace" }}>
                    Event #{ev.id}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.2,
                      margin: 0,
                      color: "var(--fg)",
                    }}
                  >
                    {ev.name}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--dim)", fontSize: "0.85rem", marginTop: "0.15rem" }}>
                    <span>{ev.venue || "Main Arena"}</span>
                  </div>

                  {ev.description && (
                    <p
                      style={{
                        fontSize: "0.84rem",
                        color: "var(--dim)",
                        lineHeight: 1.45,
                        marginTop: "0.3rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ev.description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "1rem",
                    borderTop: "1px solid rgba(236, 235, 230, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--dim)", textTransform: "uppercase" }}>Capacity</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fg)" }}>
                      {(ev.maxCapacity || 0).toLocaleString()} seats
                    </span>
                  </div>

                  <Link
                    href={`/events/${ev.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.5rem 1.15rem",
                      borderRadius: "999px",
                      border: "1px solid var(--line)",
                      background: "rgba(255, 255, 255, 0.03)",
                      color: "var(--fg)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Select seats →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .live-event-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 196, 107, 0.4) !important;
          box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}
