"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EventItem, listEvents } from "@/lib/inventoryApi";

interface Props {
  bookedTicketIds?: number[];
}

interface DisplayEvent {
  id: number;
  name: string;
  venue: string;
  city: string;
  date: string;
  maxCapacity: number;
  status: string;
  description?: string;
  gradient: string;
  accentColor: string;
}

const THEMES = [
  { gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)", accent: "#818cf8" },
  { gradient: "linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)", accent: "#c084fc" },
  { gradient: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #b91c1c 100%)", accent: "#f87171" },
  { gradient: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)", accent: "#34d399" },
  { gradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 50%, #1d4ed8 100%)", accent: "#60a5fa" },
  { gradient: "linear-gradient(135deg, #422006 0%, #713f12 50%, #a16207 100%)", accent: "#fbbf24" },
];

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

  const displayEvents: DisplayEvent[] = useMemo(() => {
    return events.map((item, idx) => {
      const theme = THEMES[idx % THEMES.length];
      const venueParts = (item.venue || "").split(",");
      const city = venueParts.length > 1 ? venueParts[venueParts.length - 1].trim() : "Main Venue";

      return {
        id: item.id,
        name: item.name,
        venue: item.venue || "Main Arena",
        city,
        date: item.eventDate ? item.eventDate.split("T")[0] : "2026-12-25",
        maxCapacity: item.maxCapacity || 5000,
        status: item.status || "PUBLISHED",
        description: item.description,
        gradient: theme.gradient,
        accentColor: theme.accent,
      };
    });
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayEvents.filter((ev) => {
      const matchesSearch =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.city.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filter === "THIS_MONTH") {
        return ev.date.startsWith("2026-10") || ev.date.startsWith("2026-11");
      }
      if (filter === "ARENA") {
        const v = ev.venue.toLowerCase();
        return v.includes("stadium") || v.includes("arena") || v.includes("hall") || v.includes("ground");
      }
      return true;
    });
  }, [displayEvents, search, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
          <button
            onClick={() => setFilter("ALL")}
            style={{
              background: filter === "ALL" ? "var(--fg)" : "rgba(255,255,255,0.03)",
              color: filter === "ALL" ? "#000" : "var(--dim)",
              border: `1px solid ${filter === "ALL" ? "var(--fg)" : "var(--line)"}`,
              borderRadius: "999px",
              padding: "0.45rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            All Shows
          </button>
          <button
            onClick={() => setFilter("THIS_MONTH")}
            style={{
              background: filter === "THIS_MONTH" ? "var(--fg)" : "rgba(255,255,255,0.03)",
              color: filter === "THIS_MONTH" ? "#000" : "var(--dim)",
              border: `1px solid ${filter === "THIS_MONTH" ? "var(--fg)" : "var(--line)"}`,
              borderRadius: "999px",
              padding: "0.45rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setFilter("ARENA")}
            style={{
              background: filter === "ARENA" ? "var(--fg)" : "rgba(255,255,255,0.03)",
              color: filter === "ARENA" ? "#000" : "var(--dim)",
              border: `1px solid ${filter === "ARENA" ? "var(--fg)" : "var(--line)"}`,
              borderRadius: "999px",
              padding: "0.45rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Arenas &amp; Stadiums
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 280px", maxWidth: "380px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <span
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--dim)",
                fontSize: "0.85rem",
              }}
            >
              🔍
            </span>
            <input
              type="search"
              placeholder="Search by event or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "2.3rem",
                paddingRight: "1rem",
                fontSize: "0.85rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "999px",
              }}
            />
          </div>

          <button
            onClick={loadEvents}
            disabled={loading}
            title="Refresh"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
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
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            color: "#fca5a5",
            fontSize: "0.88rem",
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
              fontSize: "0.85rem",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && displayEvents.length === 0 ? (
        <div style={{ padding: "4rem 0", textAlign: "center", color: "var(--dim)", fontSize: "0.95rem" }}>
          Loading live events...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "4rem 2rem",
            border: "1px dashed var(--line)",
            borderRadius: "18px",
            textAlign: "center",
            color: "var(--dim)",
          }}
        >
          <p style={{ fontSize: "1.05rem", color: "var(--fg)", marginBottom: "0.4rem" }}>No events found</p>
          <p style={{ fontSize: "0.85rem" }}>Try a different search term or filter.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filtered.map((ev) => {
            const isBooked = bookedTicketIds.includes(ev.id);
            const dateObj = new Date(ev.date);
            const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
            const dayStr = dateObj.toLocaleDateString("en-US", { day: "numeric" });
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });

            return (
              <div
                key={ev.id}
                onClick={() => router.push(`/events/${ev.id}`)}
                className="event-card"
                style={{
                  background: "rgba(18, 18, 22, 0.75)",
                  border: "1px solid var(--line)",
                  borderRadius: "18px",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                }}
              >
                <div
                  style={{
                    height: "160px",
                    background: ev.gradient,
                    padding: "1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)",
                      pointerEvents: "none",
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.55)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        padding: "0.3rem 0.6rem",
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: ev.accentColor }}>
                        {monthStr}
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                        {dayStr}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {isBooked && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            background: "rgba(16, 185, 129, 0.9)",
                            color: "#000",
                          }}
                        >
                          ✓ Booked
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "999px",
                          background: "rgba(0, 0, 0, 0.5)",
                          backdropFilter: "blur(6px)",
                          color: "#f3f4f6",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                      >
                        {ev.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ position: "relative", zIndex: 2 }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.75)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {dayName} • Event #{ev.id}
                    </span>
                  </div>
                </div>

                <div style={{ padding: "1.15rem", display: "flex", flexDirection: "column", flex: 1, gap: "0.65rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fg)", lineHeight: 1.25, margin: 0 }}>
                      {ev.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--dim)", fontSize: "0.82rem", marginTop: "0.35rem" }}>
                      <span>📍</span>
                      <span>{ev.venue}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--dim)", textTransform: "uppercase" }}>Capacity</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--glow)" }}>
                        {ev.maxCapacity.toLocaleString()} seats
                      </div>
                    </div>

                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/events/${ev.id}`);
                      }}
                      style={{
                        padding: "0.4rem 0.95rem",
                        fontSize: "0.8rem",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.05)",
                        cursor: "pointer",
                      }}
                    >
                      View Tickets →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .event-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 196, 107, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
