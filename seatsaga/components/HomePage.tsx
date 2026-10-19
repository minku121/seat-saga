"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirstName } from "@/lib/auth";
import { EventItem, listEvents } from "@/lib/inventoryApi";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const targetLink = isAuthenticated ? "/dashboard" : "/auth/login";
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    listEvents().then((data) => setEvents(data || [])).catch(() => {});
  }, []);

  return (
    <>
      <header className="nav">
        <Link href="#top" className="logo">
          Seat Saga
        </Link>
        <nav>
          <a href="#shows">Shows</a>
          <a href="#seats">Seat map</a>
          {isAuthenticated && user ? (
            <Link href="/dashboard" className="pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Dashboard ({getFirstName(user.name || user.email)})</span>
            </Link>
          ) : (
            <Link href="/auth/login" className="pill">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <h1>Pick the seat. Own the night.</h1>
          <p className="lede">
            Concert tickets with a live seat map. Choose your exact row, check the view, and pay in under a minute.
          </p>
          <div className="actions">
            <Link href={targetLink} className="btn primary">
              Browse shows
            </Link>
            <a href="#seats" className="btn">
              How seat picking works
            </a>
          </div>
        </section>

        <section id="shows" className="section">
          <h2>On sale now</h2>
          <ul className="shows">
            {events.length === 0 ? (
              <li style={{ padding: "2rem 0", color: "var(--dim)" }}>
                Loading live shows from inventory service...
              </li>
            ) : (
              events.map((s) => {
                const dateStr = s.eventDate
                  ? new Date(s.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "Live";

                return (
                  <li key={s.id}>
                    <Link href={`/events/${s.id}`}>
                      <time>{dateStr}</time>
                      <strong>{s.name}</strong>
                      <span className="where">
                        {s.venue}
                      </span>
                      <span className="price">Cap: {s.maxCapacity.toLocaleString()}</span>
                      <span className="book">Book seats</span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section id="seats" className="section">
          <h2>Every seat, priced honestly</h2>
          <div className="facts">
            <div>
              <h3>Live seat map</h3>
              <p>Tap a seat to see its row, view and price. Seats stay held for 8 minutes while you check out.</p>
            </div>
            <div>
              <h3>Final price up front</h3>
              <p>Fees are included in the seat price you see. Nothing gets added at payment.</p>
            </div>
            <div>
              <h3>Tickets on your phone</h3>
              <p>Your entry QR arrives instantly, and you can transfer it to a friend in one tap.</p>
            </div>
          </div>
        </section>

        <section id="book" className="section cta">
          <h2>Front row is one click away.</h2>
          <Link href={targetLink} className="btn primary">
            Find a show
          </Link>
          <footer>© 2026 Seat Saga</footer>
        </section>
      </main>
    </>
  );
}