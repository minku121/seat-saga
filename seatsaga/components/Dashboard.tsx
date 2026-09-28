"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { concerts } from "./concerts";
import { useAuth } from "@/context/AuthContext";
import { getFirstName, getUserInitials } from "@/lib/auth";

const genres = ["All", ...Array.from(new Set(concerts.map((c) => c.genre)))];
const cities = ["All cities", ...Array.from(new Set(concerts.map((c) => c.city)))];

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [tickets, setTickets] = useState<number[]>([]);
  const [view, setView] = useState<"all" | "mine">("all");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [city, setCity] = useState("All cities");

  // Route security check on client mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Load persistent user tickets once user is authenticated
  useEffect(() => {
    if (user?.email) {
      const storageKey = `tickets_${user.email}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setTickets(JSON.parse(saved));
        } catch {
          setTickets([]);
        }
      } else {
        // Initial sample tickets for new users
        setTickets([1, 4]);
      }
    }
  }, [user?.email]);

  const toggle = (id: number) => {
    setTickets((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (user?.email) {
        localStorage.setItem(`tickets_${user.email}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return concerts.filter(
      (c) =>
        (view === "all" || tickets.includes(c.id)) &&
        (genre === "All" || c.genre === genre) &&
        (city === "All cities" || c.city === city) &&
        (!q || `${c.artist} ${c.venue} ${c.city}`.toLowerCase().includes(q))
    );
  }, [query, genre, city, view, tickets]);

  // Loading state while verifying token & session
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: "var(--bg)",
          color: "var(--fg)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(236, 235, 230, 0.15)",
            borderTopColor: "var(--glow)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "var(--dim)", fontSize: "0.95rem" }}>
          Verifying session & loading dashboard...
        </p>
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
        <nav style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "0.35rem 0.85rem 0.35rem 0.45rem",
              borderRadius: "999px",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--glow)",
                color: "#000",
                fontWeight: 700,
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "-0.02em",
              }}
              title={user.email}
            >
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
              <span style={{ color: "var(--fg)", fontWeight: 500, fontSize: "0.9rem" }}>
                {user.name || firstName}
              </span>
              <span style={{ color: "var(--dim)", fontSize: "0.75rem" }}>
                {user.email}
              </span>
            </div>
          </div>
          <button
            className="pill"
            onClick={logout}
            style={{ cursor: "pointer" }}
            title="Log out of Seat Saga"
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="dash">
        <h1>Hi {firstName}, find your next show</h1>

        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={view === "all"}
            onClick={() => setView("all")}
          >
            All concerts
          </button>
          <button
            role="tab"
            aria-selected={view === "mine"}
            onClick={() => setView("mine")}
          >
            My tickets ({tickets.length})
          </button>
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder="Search artist, venue or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search concerts"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="City"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="chips">
          {genres.map((g) => (
            <button
              key={g}
              aria-pressed={genre === g}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="empty">
            {view === "mine"
              ? "You haven't booked any seats yet. Open All concerts to pick a show."
              : "No concerts match these filters. Clear the search or choose another city."}
          </p>
        ) : (
          <ul className="grid">
            {list.map((c) => {
              const booked = tickets.includes(c.id);
              return (
                <li key={c.id}>
                  <div className="meta">
                    <time>
                      {new Date(c.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                    <span>{c.genre}</span>
                  </div>
                  <h3>{c.artist}</h3>
                  <p className="where">
                    {c.venue}, {c.city}
                  </p>
                  <div className="foot">
                    <strong>From ₹{c.price.toLocaleString("en-IN")}</strong>
                    <button
                      className={booked ? "btn" : "btn primary"}
                      onClick={() => toggle(c.id)}
                    >
                      {booked ? "Booked. Remove" : "Book seats"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}