export type Concert = { id: number; artist: string; genre: string; date: string; venue: string; city: string; price: number };

export const concerts: Concert[] = [
  { id: 1, artist: "Nightbloom", genre: "Indie", date: "2026-10-17", venue: "Jio Garden Arena", city: "Mumbai", price: 2400 },
  { id: 2, artist: "Aster Vale", genre: "Pop", date: "2026-10-24", venue: "Talkatora Hall", city: "Delhi", price: 1800 },
  { id: 3, artist: "The Hollow Arc", genre: "Rock", date: "2026-11-02", venue: "Palace Grounds", city: "Bengaluru", price: 3200 },
  { id: 4, artist: "Mira Okonkwo", genre: "Jazz", date: "2026-11-14", venue: "Netaji Indoor", city: "Kolkata", price: 1500 },
  { id: 5, artist: "Static Orchard", genre: "Electronic", date: "2026-11-28", venue: "Hitex Arena", city: "Hyderabad", price: 2100 },
  { id: 6, artist: "Kavi & The Tides", genre: "Indie", date: "2026-12-05", venue: "Phoenix Stage", city: "Pune", price: 1700 },
  { id: 7, artist: "Low Monsoon", genre: "Hip-hop", date: "2026-12-12", venue: "Jio Garden Arena", city: "Mumbai", price: 2800 },
  { id: 8, artist: "Velvet Circuit", genre: "Electronic", date: "2026-12-19", venue: "Palace Grounds", city: "Bengaluru", price: 3500 },
  { id: 9, artist: "Ira Sen Quartet", genre: "Jazz", date: "2027-01-09", venue: "Talkatora Hall", city: "Delhi", price: 1400 },
  { id: 10, artist: "Paper Lanterns", genre: "Pop", date: "2027-01-23", venue: "Netaji Indoor", city: "Kolkata", price: 1900 },
];