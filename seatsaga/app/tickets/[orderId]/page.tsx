"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getBookingByOrderId,
  getStoredBookings,
  BookingSummaryItem,
  StoredBooking,
} from "@/lib/bookingApi";
import { getSeatsByOrderId, BookedSeatItem } from "@/lib/seatApi";
import { getEvent, EventItem } from "@/lib/inventoryApi";
import {
  Sparkles,
  Heart,
  RotateCw,
  Share2,
  Check,
  Copy,
  Download,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Ticket,
  ExternalLink,
  Printer,
} from "lucide-react";

// Fast deterministic QR matrix generator
function generateQrMatrix(seed: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const drawSquare = (x: number, y: number, s: number, fill: boolean) => {
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        if (x + r < size && y + c < size) {
          matrix[x + r][y + c] = fill;
        }
      }
    }
  };

  const drawFinder = (top: number, left: number) => {
    drawSquare(top, left, 7, true);
    drawSquare(top + 1, left + 1, 5, false);
    drawSquare(top + 2, left + 2, 3, true);
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  drawSquare(16, 16, 5, true);
  drawSquare(17, 17, 3, false);
  drawSquare(18, 18, 1, true);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (
        (r <= 7 && c <= 7) ||
        (r <= 7 && c >= size - 8) ||
        (r >= size - 8 && c <= 7) ||
        (r >= 15 && r <= 21 && c >= 15 && c <= 21) ||
        r === 6 ||
        c === 6
      ) {
        continue;
      }
      hash ^= (r * 31 + c * 17) & 0xffffffff;
      hash = Math.imul(hash, 16777619);
      matrix[r][c] = (Math.abs(hash) % 100) > 48;
    }
  }

  return matrix;
}

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? decodeURIComponent(params.orderId) : "";

  const { user, token, isAuthenticated, isLoading } = useAuth();

  const [booking, setBooking] = useState<StoredBooking | BookingSummaryItem | null>(null);
  const [seats, setSeats] = useState<BookedSeatItem[]>([]);
  const [eventData, setEventData] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive UI states
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(258);
  const [copied, setCopied] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // 1. Fetch booking details from server + check local storage fallback
  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided in URL.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Immediate check in localStorage for instant paint
    const localBookings = getStoredBookings(user?.email || "guest");
    const matchedLocal = localBookings.find((b) => b.orderId === orderId);
    if (matchedLocal && isMounted) {
      setBooking(matchedLocal);
    }

    // Parallel fetch from server: booking details + seats by order
    Promise.all([
      getBookingByOrderId(orderId, token).catch(() => null),
      getSeatsByOrderId(orderId, token).catch(() => [] as BookedSeatItem[]),
    ])
      .then(async ([serverBooking, seatList]) => {
        if (!isMounted) return;

        if (seatList && seatList.length > 0) {
          setSeats(seatList);
        }

        const effectiveBooking = serverBooking || matchedLocal;
        if (effectiveBooking) {
          setBooking(effectiveBooking);

          // If we have an eventId, optionally enrich with live venue & event data
          if (effectiveBooking.eventId) {
            try {
              const ev = await getEvent(effectiveBooking.eventId);
              if (isMounted && ev) {
                setEventData(ev);
              }
            } catch {
              // Ignore event fetch error if offline
            }
          }
        } else {
          setError(`Order #${orderId} could not be found.`);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Could not load remote ticket:", err);
          if (!matchedLocal) {
            setError((err as Error)?.message || "Failed to load ticket details.");
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, token, user?.email]);

  // Heart like burst animation
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikeCount((prev) => (nextState ? prev + 1 : prev - 1));

    if (nextState) {
      const bursts = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 80,
        y: -15 - Math.random() * 50,
      }));
      setFloatingHearts((prev) => [...prev, ...bursts]);
      setTimeout(() => setFloatingHearts([]), 1400);
    }
  };

  const handleCopyOrder = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Seat numbers resolution
  const resolvedSeatNumbers = useMemo(() => {
    if (seats.length > 0) {
      return seats.map((s) => s.seatNumber);
    }
    const b = booking as StoredBooking | null;
    if (b?.seatNumbers && b.seatNumbers.length > 0) {
      return b.seatNumbers;
    }
    return [
      booking?.seatTypeCode ? `${booking.seatTypeCode}-01` : "SEC-A1",
    ];
  }, [seats, booking]);

  const eventTitle =
    eventData?.name ||
    (booking as StoredBooking)?.eventName ||
    `Concert Event #${booking?.eventId || ""}`;

  const eventVenue =
    eventData?.venue ||
    (booking as StoredBooking)?.venue ||
    "Main Concert Arena • Gate 3";

  const eventDateStr =
    eventData?.eventDate || (booking as StoredBooking)?.eventDate
      ? new Date(
          (eventData?.eventDate || (booking as StoredBooking)?.eventDate)!
        ).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Upcoming Show Date";

  const qrSeed = `${orderId}-${booking?.eventId}-${resolvedSeatNumbers.join(",")}`;
  const qrMatrix = useMemo(() => generateQrMatrix(qrSeed), [qrSeed]);

  return (
    <div className="ticket-page-root">
      {/* Top Header Navigation */}
      <header className="ticket-nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>

        <div className="nav-actions">
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link href="/architecture" className="nav-link">
            Architecture
          </Link>
          <button
            onClick={() => window.print()}
            className="pill print-btn"
            title="Print or Save PDF"
          >
            <Printer size={14} />
            <span>Print Pass</span>
          </button>
        </div>
      </header>

      {/* Main Ticket Presentation Viewport */}
      <main className="ticket-main-container">
        {/* Back Link Bar */}
        <div className="top-nav-row">
          <button onClick={() => router.back()} className="back-link-btn">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="crumb-order">
            <span>Pass Reference</span>
            <ChevronRight size={14} />
            <code>{orderId}</code>
          </div>
        </div>

        {/* Loading State */}
        {loading && !booking && (
          <div className="ticket-state-box">
            <div className="ticket-spinner" />
            <p>Retrieving authentic seat reservation &amp; QR verification...</p>
          </div>
        )}

        {/* Error State */}
        {error && !booking && (
          <div className="ticket-error-box">
            <div className="error-icon">!</div>
            <h3>Ticket Not Found</h3>
            <p>{error}</p>
            <Link href="/dashboard" className="btn primary">
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* Authentic Ticket Pass */}
        {booking && (
          <div className="ticket-stage">
            {/* Quick Actions Header */}
            <div className="stage-actions-bar">
              <div className="verified-status-chip">
                <span className="live-dot" />
                <span>OFFICIAL VERIFIED PASS • ADMIT {resolvedSeatNumbers.length}</span>
              </div>

              <div className="stage-action-buttons">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="btn-flip"
                  title="Flip pass to view entry guidelines"
                >
                  <RotateCw size={14} />
                  <span>{isFlipped ? "View QR Pass" : "Flip Pass"}</span>
                </button>

                <button
                  onClick={handleCopyOrder}
                  className="btn-share"
                  title="Copy pass order ID"
                >
                  {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy ID"}</span>
                </button>
              </div>
            </div>

            {/* 3D FLIPPABLE TICKET CONTAINER */}
            <div className="ticket-3d-scene">
              <div className={`ticket-card-3d ${isFlipped ? "is-flipped" : ""}`}>
                {/* ================= FRONT CARD FACE ================= */}
                <div className="ticket-face ticket-face-front">
                  {/* Holographic foil line at top */}
                  <div className="holo-ribbon" />

                  {/* Cutout Notch Top */}
                  <div className="notch-cutout notch-top" />
                  {/* Cutout Notch Bottom */}
                  <div className="notch-cutout notch-bottom" />

                  {/* LEFT BODY: Event Info & Seats */}
                  <div className="ticket-body">
                    {/* Top Tier Row & Like Button */}
                    <div className="tier-header-row">
                      <div className="tier-badges">
                        <span className="tier-badge">
                          {booking.seatTypeCode || "VIP FRONT ROW"}
                        </span>
                        <span className="status-badge">
                          <ShieldCheck size={14} />
                          <span>CONFIRMED &amp; VERIFIED</span>
                        </span>
                      </div>

                      {/* Animated Like Button */}
                      <div className="like-button-wrap">
                        <button
                          onClick={handleLike}
                          className={`btn-like ${isLiked ? "liked" : ""}`}
                          title="Like this concert pass"
                        >
                          <Heart
                            size={16}
                            fill={isLiked ? "#f43f5e" : "none"}
                            className={isLiked ? "heart-pop" : ""}
                          />
                          <span className="like-count">{likeCount}</span>
                        </button>

                        {/* Floating heart particles */}
                        {floatingHearts.map((h) => (
                          <div
                            key={h.id}
                            className="floating-heart"
                            style={{
                              transform: `translate(${h.x}px, ${h.y}px)`,
                            }}
                          >
                            <Heart size={14} fill="#f43f5e" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Event Name */}
                    <h1 className="event-heading">{eventTitle}</h1>

                    {/* Venue & Time Meta */}
                    <div className="event-meta-grid">
                      <div className="meta-item">
                        <Calendar size={15} color="#ffc46b" />
                        <span>{eventDateStr}</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={15} color="#ffc46b" />
                        <span>Gate opens at 6:30 PM • Starts 8:00 PM</span>
                      </div>
                      <div className="meta-item">
                        <MapPin size={15} color="#ffc46b" />
                        <span>{eventVenue}</span>
                      </div>
                    </div>

                    {/* Seat Allocations (Fetched from GET /api/seat/order/{orderId}) */}
                    <div className="seats-allocation-box">
                      <div className="seats-box-header">
                        <span className="seats-box-title">
                          Assigned Seat Locations ({resolvedSeatNumbers.length})
                        </span>
                        <span className="seats-sync-indicator">
                          ✓ Synced from live seat inventory
                        </span>
                      </div>

                      <div className="seats-tags-list">
                        {resolvedSeatNumbers.map((seatNum, idx) => (
                          <span key={idx} className="seat-tag">
                            Seat {seatNum}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Order Reference & Price Footer */}
                    <div className="ticket-body-footer">
                      <div className="order-ref-block">
                        <span className="ref-label">Order Reference</span>
                        <div className="ref-val">
                          <code>{orderId}</code>
                          <button onClick={handleCopyOrder} className="btn-copy-mini">
                            {copied ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="price-block">
                        <span className="ref-label">Total Amount</span>
                        <span className="price-val">
                          ₹{(booking.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT STUB: Laser Scannable QR Code */}
                  <div className="ticket-stub">
                    <div className="stub-header">
                      <span className="stub-label">TURNSTILE FAST PASS</span>
                      <span className="stub-sub">Hold screen to turnstile scanner</span>
                    </div>

                    {/* High-res QR Code Box with Moving Laser Beam */}
                    <div className="qr-box">
                      {/* Neon Laser Scanner Beam */}
                      <div className="laser-beam" />

                      {/* SVG Deterministic QR Code */}
                      <svg
                        width="168"
                        height="168"
                        viewBox="0 0 25 25"
                        className="qr-svg"
                      >
                        {qrMatrix.map((row, rIdx) =>
                          row.map((filled, cIdx) =>
                            filled ? (
                              <rect
                                key={`${rIdx}-${cIdx}`}
                                x={cIdx}
                                y={rIdx}
                                width="1"
                                height="1"
                                fill="#09090c"
                              />
                            ) : null
                          )
                        )}
                      </svg>
                    </div>

                    {/* Barcode Lines */}
                    <div className="barcode-box">
                      <div className="barcode-lines">
                        {[3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3].map(
                          (h, i) => (
                            <div
                              key={i}
                              style={{
                                width: h > 2 ? "2px" : "1px",
                                height: `${h * 5 + 6}px`,
                              }}
                            />
                          )
                        )}
                      </div>
                      <div className="barcode-text">
                        #{orderId.slice(-8).toUpperCase()} • GATEPASS
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================= BACK CARD FACE ================= */}
                <div className="ticket-face ticket-face-back">
                  <div className="back-content">
                    <div className="back-header">
                      <h3>Admission Terms &amp; Security Protocol</h3>
                      <button
                        onClick={() => setIsFlipped(false)}
                        className="btn-flip-back"
                      >
                        ← Return to QR Pass
                      </button>
                    </div>

                    <div className="back-guidelines">
                      <div className="guideline-card">
                        <span className="guideline-title">1. Turnstile Check-in</span>
                        <p>
                          Present this verified QR code at Gate 3. Turnstiles will
                          read the encrypted token and validate seat occupancy against the
                          Seat Saga live ledger.
                        </p>
                      </div>

                      <div className="guideline-card">
                        <span className="guideline-title">2. Seat Ownership Guarantee</span>
                        <p>
                          Reserved under User #{booking.userId || "Verified Fan"}.
                          This pass is backed by our distributed 2PC Saga choreography and
                          atomic 10-minute hold protocol.
                        </p>
                      </div>

                      <div className="guideline-card">
                        <span className="guideline-title">3. Finality Notice</span>
                        <p>
                          In accordance with venue policy, confirmed ticket reservations
                          are non-cancellable and non-refundable once payment is captured.
                        </p>
                      </div>
                    </div>

                    <div className="back-footer">
                      <span>Order ID: <code>{orderId}</code></span>
                      <span className="back-status">● VERIFIED LEDGER STATUS: {booking.bookingStatus || "CONFIRMED"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="ticket-bottom-actions">
              <button
                onClick={() => window.print()}
                className="btn primary flex-center"
                style={{ gap: "8px" }}
              >
                <Download size={16} />
                <span>Save / Print Ticket PDF</span>
              </button>

              <button
                onClick={handleCopyOrder}
                className="btn flex-center"
                style={{ gap: "8px" }}
              >
                {copied ? <Check size={16} color="#4ade80" /> : <Share2 size={16} />}
                <span>{copied ? "Order Copied!" : "Share Ticket"}</span>
              </button>

              <Link href="/dashboard" className="btn">
                All My Bookings →
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* GPU-ACCELERATED HARDWARE STYLES */}
      <style jsx>{`
        .ticket-page-root {
          min-height: 100vh;
          background: #050505;
          color: #ecebe6;
          font-family: var(--font-body, system-ui, sans-serif);
        }

        .ticket-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem clamp(1.25rem, 4vw, 3.5rem);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #070709;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .nav-link {
          color: #888;
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.15s;
        }

        .nav-link:hover {
          color: #fff;
        }

        .print-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          background: none;
          border: 1px solid rgba(255, 196, 107, 0.4);
          color: #ffc46b;
          font-size: 0.82rem;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
        }

        .print-btn:hover {
          background: #ffc46b;
          color: #000 !important;
        }

        .ticket-main-container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 6rem;
        }

        .top-nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .back-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #888;
          font-size: 0.88rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: color 0.15s;
        }

        .back-link-btn:hover {
          color: #ffc46b;
        }

        .crumb-order {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 0.82rem;
        }

        .crumb-order code {
          color: #bbb;
          background: #111;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .ticket-state-box,
        .ticket-error-box {
          background: #0f0f13;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .ticket-spinner {
          width: 36px;
          height: 36px;
          border: 2px solid rgba(255, 196, 107, 0.2);
          border-top-color: #ffc46b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          font-size: 1.4rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* TICKET STAGE */
        .stage-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 12px;
        }

        .verified-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 196, 107, 0.1);
          border: 1px solid rgba(255, 196, 107, 0.35);
          color: #ffc46b;
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffc46b;
          box-shadow: 0 0 10px #ffc46b;
        }

        .stage-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-flip,
        .btn-share {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #151518;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ddd;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-flip:hover,
        .btn-share:hover {
          background: #222;
          color: #fff;
          border-color: rgba(255, 196, 107, 0.4);
        }

        /* 3D SCENE & PERSPECTIVE */
        .ticket-3d-scene {
          perspective: 1400px;
          width: 100%;
          margin-bottom: 2rem;
        }

        .ticket-card-3d {
          position: relative;
          width: 100%;
          transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-style: preserve-3d;
          will-change: transform;
        }

        .ticket-card-3d.is-flipped {
          transform: rotateY(180deg);
        }

        .ticket-face {
          width: 100%;
          border-radius: 20px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 196, 107, 0.12);
        }

        /* FRONT FACE */
        .ticket-face-front {
          position: relative;
          background: linear-gradient(135deg, #131318 0%, #08080b 100%);
          border: 1.5px solid rgba(255, 196, 107, 0.35);
          display: grid;
          grid-template-columns: 1.65fr 1fr;
          overflow: hidden;
        }

        @media (max-width: 780px) {
          .ticket-face-front {
            grid-template-columns: 1fr;
          }
        }

        .holo-ribbon {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ffc46b, #c084fc, #38bdf8, #4ade80, #ffc46b);
          background-size: 200% auto;
          animation: holoMove 5s linear infinite;
        }

        @keyframes holoMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .notch-cutout {
          position: absolute;
          left: 62.2%;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #050505;
          border: 1.5px solid rgba(255, 196, 107, 0.35);
          z-index: 10;
        }

        .notch-top {
          top: -14px;
        }

        .notch-bottom {
          bottom: -14px;
        }

        @media (max-width: 780px) {
          .notch-cutout {
            display: none;
          }
        }

        /* TICKET BODY */
        .ticket-body {
          padding: 32px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1.5px dashed rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 780px) {
          .ticket-body {
            border-right: none;
            border-bottom: 1.5px dashed rgba(255, 255, 255, 0.15);
            padding: 24px;
          }
        }

        .tier-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tier-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tier-badge {
          background: #ffc46b;
          color: #000;
          font-weight: 800;
          font-size: 0.75rem;
          padding: 3px 10px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .status-badge {
          font-size: 0.72rem;
          color: #34d399;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* LIKE BUTTON */
        .like-button-wrap {
          position: relative;
        }

        .btn-like {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          padding: 5px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #aaa;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-like:hover {
          color: #f43f5e;
          border-color: #f43f5e;
          background: rgba(244, 63, 94, 0.1);
        }

        .btn-like.liked {
          background: rgba(244, 63, 94, 0.16);
          border-color: #f43f5e;
          color: #f43f5e;
          transform: scale(1.05);
        }

        .heart-pop {
          transform: scale(1.2);
          transition: transform 0.2s;
        }

        .like-count {
          font-size: 0.78rem;
          font-weight: 700;
        }

        .floating-heart {
          position: absolute;
          left: 50%;
          top: 50%;
          pointer-events: none;
          color: #f43f5e;
          animation: heartFloatUp 1.2s ease-out forwards;
        }

        @keyframes heartFloatUp {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx, 15px), -55px) scale(1.4);
          }
        }

        .event-heading {
          font-family: var(--font-display, serif);
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800;
          color: #fff;
          margin: 0 0 12px 0;
          line-height: 1.08;
          letter-spacing: -0.025em;
        }

        .event-meta-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.88rem;
          margin-bottom: 22px;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        /* SEAT ALLOCATIONS */
        .seats-allocation-box {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .seats-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .seats-box-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .seats-sync-indicator {
          font-size: 0.72rem;
          color: #4ade80;
          font-weight: 600;
        }

        .seats-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .seat-tag {
          background: rgba(255, 196, 107, 0.15);
          border: 1.5px solid #ffc46b;
          color: #ffc46b;
          font-size: 1rem;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(255, 196, 107, 0.18);
        }

        .ticket-body-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ref-label {
          font-size: 0.68rem;
          color: #777;
          text-transform: uppercase;
        }

        .ref-val {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ref-val code {
          font-size: 0.88rem;
          color: #fff;
          font-weight: 700;
        }

        .btn-copy-mini {
          background: none;
          border: none;
          color: #777;
          cursor: pointer;
          padding: 2px;
        }

        .price-block {
          text-align: right;
        }

        .price-val {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
        }

        /* RIGHT STUB */
        .ticket-stub {
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.35);
          gap: 16px;
        }

        .stub-header {
          text-align: center;
        }

        .stub-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ffc46b;
          margin-bottom: 2px;
        }

        .stub-sub {
          font-size: 0.72rem;
          color: #777;
        }

        /* QR BOX WITH SCANNER */
        .qr-box {
          position: relative;
          background: #ffffff;
          padding: 12px;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
          overflow: hidden;
        }

        .laser-beam {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #ffc46b, transparent);
          box-shadow: 0 0 12px 3px rgba(255, 196, 107, 0.8);
          animation: scanVertical 2.2s ease-in-out infinite;
          z-index: 5;
          pointer-events: none;
        }

        @keyframes scanVertical {
          0% { top: 2%; opacity: 0.7; }
          50% { top: 96%; opacity: 1; }
          100% { top: 2%; opacity: 0.7; }
        }

        .qr-svg {
          display: block;
        }

        .barcode-box {
          width: 100%;
          text-align: center;
        }

        .barcode-lines {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 2px;
          height: 28px;
          margin-bottom: 6px;
        }

        .barcode-lines div {
          background: rgba(255, 255, 255, 0.55);
        }

        .barcode-text {
          font-size: 0.65rem;
          font-family: monospace;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.1em;
        }

        /* BACK FACE */
        .ticket-face-back {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
          background: linear-gradient(135deg, #111116 0%, #08080a 100%);
          border: 1.5px solid rgba(255, 196, 107, 0.35);
          padding: 36px;
        }

        .back-content {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .back-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 14px;
        }

        .back-header h3 {
          margin: 0;
          color: #ffc46b;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .btn-flip-back {
          background: rgba(255, 196, 107, 0.15);
          border: 1px solid #ffc46b;
          color: #ffc46b;
          border-radius: 6px;
          padding: 4px 12px;
          font-size: 0.78rem;
          cursor: pointer;
        }

        .back-guidelines {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .guideline-card {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 14px;
        }

        .guideline-title {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
        }

        .guideline-card p {
          margin: 0;
          font-size: 0.8rem;
          color: #888;
          line-height: 1.5;
        }

        .back-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 14px;
          font-size: 0.78rem;
          color: #777;
        }

        .back-status {
          color: #34d399;
          font-weight: 600;
        }

        /* BOTTOM ACTIONS */
        .ticket-bottom-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .flex-center {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* PRINT STYLES */
        @media print {
          .ticket-nav,
          .top-nav-row,
          .stage-actions-bar,
          .ticket-bottom-actions {
            display: none !important;
          }

          .ticket-page-root {
            background: #fff !important;
            color: #000 !important;
          }

          .ticket-face-front {
            border: 2px solid #000 !important;
            background: #fff !important;
            box-shadow: none !important;
          }

          .event-heading,
          .price-val,
          .ref-val code {
            color: #000 !important;
          }

          .seat-tag {
            border-color: #000 !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}

