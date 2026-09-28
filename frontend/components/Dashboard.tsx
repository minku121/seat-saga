"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { concerts } from "./concerts";
import { mockTickets , mockUser } from "./Mock";

const genres = ["All", ...Array.from(new Set(concerts.map((c) => c.genre)))];
const cities = ["All cities", ...Array.from(new Set(concerts.map((c) => c.city)))];

export default function Dashboard() {
  const router = useRouter();
  const user = mockUser;
  const [tickets, setTickets] = useState<number[]>(mockTickets);
  const toggle = (id: number) => setTickets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const [view, setView] = useState<"all" | "mine">("all");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [city, setCity] = useState("All cities");

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

  return (
    <>
      <header className="nav">
        <Link href="/" className="logo">Seat Saga</Link>
        <nav>
          <span>{user.name}</span>
          <button className="pill" onClick={() => router.push("/")}>Log out</button>
        </nav>
      </header>

      <main className="dash">
        <h1>Hi {user.name.split(" ")[0]}, find your next show</h1>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={view === "all"} onClick={() => setView("all")}>All concerts</button>
          <button role="tab" aria-selected={view === "mine"} onClick={() => setView("mine")}>My tickets ({tickets.length})</button>
        </div>

        <div className="filters">
          <input type="search" placeholder="Search artist, venue or city" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search concerts" />
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="chips">
          {genres.map((g) => (
            <button key={g} aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="empty">
            {view === "mine" ? "You haven't booked any seats yet. Open All concerts to pick a show." : "No concerts match these filters. Clear the search or choose another city."}
          </p>
        ) : (
          <ul className="grid">
            {list.map((c) => {
              const booked = tickets.includes(c.id);
              return (
                <li key={c.id}>
                  <div className="meta">
                    <time>{new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time>
                    <span>{c.genre}</span>
                  </div>
                  <h3>{c.artist}</h3>
                  <p className="where">{c.venue}, {c.city}</p>
                  <div className="foot">
                    <strong>From ₹{c.price.toLocaleString("en-IN")}</strong>
                    <button className={booked ? "btn" : "btn primary"} onClick={() => toggle(c.id)}>
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