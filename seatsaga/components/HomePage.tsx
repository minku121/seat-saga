"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getFirstName } from "@/lib/auth";

const shows = [
  { date: "Oct 17", artist: "Nightbloom", venue: "Jio Garden Arena", city: "Mumbai", price: 2400 },
  { date: "Oct 24", artist: "Aster Vale", venue: "Talkatora Hall", city: "Delhi", price: 1800 },
  { date: "Nov 02", artist: "The Hollow Arc", venue: "Palace Grounds", city: "Bengaluru", price: 3200 },
  { date: "Nov 14", artist: "Mira Okonkwo", venue: "Netaji Indoor", city: "Kolkata", price: 1500 },
  { date: "Nov 28", artist: "Static Orchard", venue: "Hitex Arena", city: "Hyderabad", price: 2100 },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const targetLink = isAuthenticated ? "/dashboard" : "/auth/login";

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
            {shows.map((s) => (
              <li key={s.artist}>
                <Link href={targetLink}>
                  <time>{s.date}</time>
                  <strong>{s.artist}</strong>
                  <span className="where">
                    {s.venue}, {s.city}
                  </span>
                  <span className="price">From ₹{s.price.toLocaleString("en-IN")}</span>
                  <span className="book">Book seats</span>
                </Link>
              </li>
            ))}
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