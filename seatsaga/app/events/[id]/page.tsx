"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { EventItem, SeatTypeItem, getEvent, listSeatTypes } from "@/lib/inventoryApi";
import { getFirstName, getUserInitials, getNumericUserId } from "@/lib/auth";
import {
  bookAndHoldSeats,
  BookingResponse,
  saveStoredBooking,
  updateStoredBookingStatus,
} from "@/lib/bookingApi";
import {
  pollPaymentStatus,
  openRazorpayCheckout,
  PaymentStatusResponse,
  RazorpaySuccessResponse,
} from "@/lib/paymentApi";

type ModalState =
  | "IDLE"
  | "HOLDING"
  | "PREPARING"
  | "CHECKOUT_OPEN"
  | "PAUSED"
  | "CONFIRMED"
  | "ERROR";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);

  const { user, token, isAuthenticated, logout } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatTypes, setSeatTypes] = useState<SeatTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTierCode, setSelectedTierCode] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [heldBooking, setHeldBooking] = useState<BookingResponse | null>(null);

  // Smooth minimalist screen-lock modal
  const [modalState, setModalState] = useState<ModalState>("IDLE");
  const [modalError, setModalError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusResponse | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Prevent background scrolling while modal is active
  useEffect(() => {
    if (modalState !== "IDLE") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalState]);

  useEffect(() => {
    if (!eventId || isNaN(eventId)) {
      setError("Event not found.");
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
        setError((err as Error)?.message || "Failed to load show.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  const currentTier = useMemo(() => {
    return seatTypes.find((st) => st.code === selectedTierCode) || seatTypes[0] || null;
  }, [seatTypes, selectedTierCode]);

  const totalAvailableTickets = useMemo(() => {
    return seatTypes.reduce((acc, st) => acc + (st.available || 0), 0);
  }, [seatTypes]);

  const triggerRazorpayCheckout = useCallback(
    async (pInfo: PaymentStatusResponse, bInfo: BookingResponse) => {
      setModalState("CHECKOUT_OPEN");
      try {
        await openRazorpayCheckout({
          paymentInfo: pInfo,
          eventName: event?.name || "Concert Tickets",
          userName: user?.name,
          userEmail: user?.email,
          onSuccess: (res: RazorpaySuccessResponse) => {
            setPaymentSuccess(true);
            setModalState("CONFIRMED");

            const userEmail = user?.email || "guest";
            updateStoredBookingStatus(userEmail, bInfo.orderId, {
              paymentStatus: "PAID",
              status: "CONFIRMED",
              razorpayPaymentId: res.razorpay_payment_id,
              razorpayOrderId: res.razorpay_order_id,
            });
          },
          onError: () => {
            setModalError("Payment was cancelled. You can try again.");
            setModalState("PAUSED");
          },
          onDismiss: () => {
            setModalState("PAUSED");
          },
        });
      } catch (err: unknown) {
        setModalError(
          err instanceof Error ? err.message : "Could not open checkout."
        );
        setModalState("PAUSED");
      }
    },
    [event?.name, user?.name, user?.email]
  );

  const handleReserveTickets = async () => {
    if (!event || !currentTier || currentTier.available < ticketQuantity) return;

    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/events/${eventId}`);
      return;
    }

    setModalState("HOLDING");
    setModalError(null);

    try {
      const numericUserId = getNumericUserId(user, token);
      const booking = await bookAndHoldSeats(
        {
          eventId: event.id,
          seatTypeCode: currentTier.code,
          quantity: ticketQuantity,
          userId: numericUserId,
        },
        token
      );

      setHeldBooking(booking);

      // Decrement available count locally
      setSeatTypes((prev) =>
        prev.map((st) =>
          st.code === currentTier.code
            ? {
              ...st,
              available: Math.max(0, st.available - booking.quantity),
              held: (st.held || 0) + booking.quantity,
            }
            : st
        )
      );

      // Save locally
      const userEmail = user?.email || "guest";
      saveStoredBooking(userEmail, {
        ...booking,
        eventName: event.name,
        venue: event.venue,
        eventDate: event.eventDate,
        createdAt: new Date().toISOString(),
        paymentStatus: "PENDING",
      });

      setModalState("PREPARING");

      const pInfo = await pollPaymentStatus(booking.orderId);
      setPaymentInfo(pInfo);

      await triggerRazorpayCheckout(pInfo, booking);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "These seats were just taken. Please pick another section.";
      setModalError(msg);
      setModalState("ERROR");
    }
  };

  const totalPrice = (currentTier?.price || 0) * ticketQuantity;
  const firstName = user ? getFirstName(user.name || user.email) : "";
  const initials = user ? getUserInitials(user.name || user.email) : "";

  return (
    <div className="page">
      {/* Top Navigation */}
      <header className="nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>

        <nav className="nav-right">
          <Link href="/dashboard" className="pill">
            Shows
          </Link>

          {isAuthenticated && user ? (
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <span className="username">{firstName}</span>
              <button onClick={logout} className="logout-btn">
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

      {/* Main Container */}
      <main className="container">
        {/* Breadcrumb Navigation Bar */}
        <div className="top-nav-bar">
          <button onClick={() => router.back()} className="back-btn">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>All shows</span>
          </button>

          <span className="crumb-text">{event?.name || `Event #${eventId}`}</span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="state-box">
            <div className="spinner" />
            <p>Loading show details...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="alert-box">
            <strong>Show unavailable</strong>
            <p>{error}</p>
            <Link href="/dashboard" className="btn btn-sm">
              Back to shows
            </Link>
          </div>
        )}

        {event && !loading && (
          <div className="content-stack">
            {/* Section 1: Hero Banner */}
            <section className="section-hero">
              <div className="hero-status-row">
                <span className="status-pill">
                  ● {totalAvailableTickets > 0 ? "Tickets on sale" : "Sold out"}
                </span>
                <span className="event-id-tag">Event #{event.id}</span>
              </div>

              <h1 className="hero-heading">{event.name}</h1>

              <div className="hero-meta-row">
                <span className="meta-item">
                  📅{" "}
                  {event.eventDate
                    ? new Date(event.eventDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                    : "Date TBA"}
                </span>
                <span className="meta-divider">•</span>
                <span className="meta-item">📍 {event.venue || "Main Arena"}</span>
                <span className="meta-divider">•</span>
                <span className="meta-item">👥 {(event.maxCapacity || 0).toLocaleString()} capacity</span>
              </div>

              {event.description && (
                <p className="hero-description">{event.description}</p>
              )}
            </section>

            {/* Section 2: Venue Stage Map */}
            {seatTypes.length > 0 && (
              <section className="section-map">
                <div className="map-header">
                  <span className="eyebrow">Venue Layout</span>
                  <h2 className="section-title">Interactive Seat Map</h2>
                  <p className="section-subtitle">Tap a section to choose your tier</p>
                </div>

                <div className="map-visualizer">
                  <div className="stage-podium">STAGE</div>

                  <div className="sections-grid">
                    {seatTypes.map((st) => {
                      const isSelected = selectedTierCode === st.code;
                      const isAvailable = st.available > 0;

                      return (
                        <button
                          key={`map-${st.code}`}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedTierCode(st.code)}
                          className={`section-btn ${isSelected ? "selected" : ""} ${!isAvailable ? "soldout" : ""
                            }`}
                        >
                          <span className="sec-code">{st.code}</span>
                          <strong className="sec-name">{st.name || st.code}</strong>
                          <span className="sec-price">₹{st.price.toLocaleString("en-IN")}</span>
                          <span className="sec-status">
                            {isAvailable ? `${st.available} left` : "Sold out"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Seating Tiers */}
            <section className="section-tiers">
              <div className="tiers-header">
                <div>
                  <h2 className="section-title">Ticket Tiers</h2>
                  <p className="section-subtitle">All service fees and taxes included</p>
                </div>
                <span className="tiers-count">
                  {seatTypes.length} tier{seatTypes.length === 1 ? "" : "s"}
                </span>
              </div>

              {seatTypes.length === 0 ? (
                <div className="empty-tiers-box">
                  <p>No tickets released yet for this show.</p>
                  <Link href="/dashboard" className="btn btn-sm">
                    Browse other shows
                  </Link>
                </div>
              ) : (
                <div className="tiers-list">
                  {seatTypes.map((st) => {
                    const isSelected = selectedTierCode === st.code;
                    const isAvailable = st.available > 0;
                    const isLowInventory = isAvailable && st.available < 50;

                    return (
                      <div
                        key={st.code}
                        onClick={() => {
                          if (isAvailable) setSelectedTierCode(st.code);
                        }}
                        className={`tier-card ${isSelected && isAvailable ? "selected" : ""} ${!isAvailable ? "disabled" : ""
                          }`}
                      >
                        <div className="tier-info">
                          <div className="tier-header-row">
                            <span className="code-pill">{st.code}</span>
                            <h3 className="tier-title">{st.name || st.code}</h3>
                            {isAvailable ? (
                              isLowInventory ? (
                                <span className="pill-urgent">🔥 Only {st.available} left</span>
                              ) : (
                                <span className="pill-available">● Available</span>
                              )
                            ) : (
                              <span className="pill-soldout">✕ Sold out</span>
                            )}
                          </div>

                          {st.description && (
                            <p className="tier-desc">{st.description}</p>
                          )}

                          <span className="tier-availability-caption">
                            {isAvailable
                              ? `${st.available.toLocaleString()} of ${st.totalQuantity.toLocaleString()} seats left`
                              : "No seats left in this section"}
                          </span>
                        </div>

                        <div className="tier-actions">
                          <div className="price-display">
                            <span className="price-num">
                              ₹{st.price.toLocaleString("en-IN")}
                            </span>
                            <span className="price-caption">per seat</span>
                          </div>

                          {isAvailable ? (
                            <div className="stepper-group">
                              <div className="stepper">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTierCode(st.code);
                                    setTicketQuantity((q) => Math.max(1, q - 1));
                                  }}
                                  className="step-btn"
                                  aria-label="Decrease tickets"
                                >
                                  −
                                </button>
                                <span className="step-count">
                                  {isSelected ? ticketQuantity : 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTierCode(st.code);
                                    setTicketQuantity((q) =>
                                      Math.min(st.available, q + 1)
                                    );
                                  }}
                                  className="step-btn"
                                  aria-label="Increase tickets"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTierCode(st.code);
                                }}
                                className={`tier-select-btn ${isSelected ? "picked" : ""}`}
                              >
                                {isSelected ? "✓ Picked" : "Select"}
                              </button>
                            </div>
                          ) : (
                            <span className="soldout-tag">Sold out</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 4: Confirmed Pass Stub (When Paid) */}
            {heldBooking && paymentSuccess && (
              <section className="section-confirmed-pass">
                <div className="confirmed-header">
                  <div className="confirmed-title-wrap">
                    <span className="check-badge">✓</span>
                    <h3>Tickets Confirmed &amp; Issued</h3>
                  </div>
                  <span className="paid-tag">Paid &amp; verified</span>
                </div>

                <div className="confirmed-grid">
                  <div className="confirmed-col">
                    <span className="col-lbl">Show</span>
                    <strong className="col-val">{event.name}</strong>
                  </div>
                  <div className="confirmed-col">
                    <span className="col-lbl">Reserved Seats</span>
                    <strong className="col-val col-seats">
                      {heldBooking.seatNumbers && heldBooking.seatNumbers.length > 0
                        ? heldBooking.seatNumbers.join(", ")
                        : heldBooking.seatTypeCode}
                    </strong>
                  </div>
                  <div className="confirmed-col">
                    <span className="col-lbl">Order Code</span>
                    <code className="col-code">{heldBooking.orderId}</code>
                  </div>
                  <div className="confirmed-col">
                    <span className="col-lbl">Total Paid</span>
                    <strong className="col-val col-total">
                      ₹{heldBooking.totalAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                <div className="confirmed-footer">
                  <span className="policy-text">
                    Non-refundable • Saved to your account
                  </span>
                  <Link href="/dashboard" className="btn primary">
                    View in My Bookings →
                  </Link>
                </div>
              </section>
            )}

            {/* Floating Sticky Bottom Bar */}
            {seatTypes.length > 0 && currentTier && currentTier.available > 0 && (
              <aside className="sticky-checkout-bar">
                <div className="bar-details">
                  <span className="bar-tier">
                    {currentTier.name || currentTier.code} • {ticketQuantity} seat
                    {ticketQuantity > 1 ? "s" : ""}
                  </span>
                  <div className="bar-price-wrap">
                    <span className="bar-amount">
                      ₹{totalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="bar-note">all fees included</span>
                  </div>
                </div>

                <div className="bar-btn-wrap">
                  {paymentSuccess ? (
                    <Link href="/dashboard" className="btn primary bar-cta">
                      View tickets →
                    </Link>
                  ) : (
                    <button
                      disabled={modalState === "HOLDING" || currentTier.available < ticketQuantity}
                      onClick={handleReserveTickets}
                      className="btn primary bar-cta"
                    >
                      {modalState === "HOLDING"
                        ? "Holding seats..."
                        : `Reserve ${ticketQuantity} seat${ticketQuantity > 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* SMOOTH, LIGHTWEIGHT, ZERO-LAG SCREEN-LOCK POPUP                           */}
      {/* ========================================================================= */}
      {modalState !== "IDLE" && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            {/* Status Icon */}
            <div className="dialog-icon-wrap">
              {modalState === "CONFIRMED" ? (
                <div className="dialog-icon icon-success">✓</div>
              ) : modalState === "ERROR" ? (
                <div className="dialog-icon icon-error">!</div>
              ) : modalState === "PAUSED" ? (
                <div className="dialog-icon icon-paused">⏳</div>
              ) : (
                <div className="dialog-spinner" />
              )}
            </div>

            {/* Simple English Headline & Text */}
            <div className="dialog-text-wrap">
              <h2 className="dialog-title">
                {modalState === "HOLDING" && "Holding your seats..."}
                {modalState === "PREPARING" && "Opening checkout..."}
                {modalState === "CHECKOUT_OPEN" && "Finish payment"}
                {modalState === "PAUSED" && "Seats on hold"}
                {modalState === "CONFIRMED" && "You're booked!"}
                {modalState === "ERROR" && "Could not hold seats"}
              </h2>

              <p className="dialog-desc">
                {modalState === "HOLDING" &&
                  "Please don't close or refresh this page. We're reserving your seats."}
                {modalState === "PREPARING" &&
                  "Seats are reserved! Loading the payment window..."}
                {modalState === "CHECKOUT_OPEN" &&
                  "Complete your payment in the checkout window."}
                {modalState === "PAUSED" &&
                  "Your seats are saved for a few minutes. Tap below to complete payment."}
                {modalState === "CONFIRMED" &&
                  `Done! Seats ${heldBooking?.seatNumbers?.join(", ") || ""} are confirmed and saved in your account.`}
                {modalState === "ERROR" &&
                  (modalError ||
                    "These seats couldn't be reserved. Please try again or pick another section.")}
              </p>
            </div>

            {/* Ticket Summary Card */}
            <div className="dialog-summary">
              <div className="summary-row">
                <span className="sum-label">Show</span>
                <strong className="sum-value">{event?.name || "Show"}</strong>
              </div>
              <div className="summary-row">
                <span className="sum-label">Seats</span>
                <span className="sum-value">
                  {currentTier?.name || currentTier?.code} (
                  {heldBooking?.seatNumbers && heldBooking.seatNumbers.length > 0
                    ? heldBooking.seatNumbers.join(", ")
                    : `${ticketQuantity} seat${ticketQuantity > 1 ? "s" : ""}`}
                  )
                </span>
              </div>
              <div className="summary-row summary-total">
                <span className="sum-label">Total</span>
                <strong className="sum-price">
                  ₹{(heldBooking?.totalAmount || totalPrice).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            {/* Security Indicator */}
            {(modalState === "HOLDING" ||
              modalState === "PREPARING" ||
              modalState === "CHECKOUT_OPEN") && (
                <span className="dialog-trust-note">🔒 Secure checkout • Official tickets</span>
              )}

            {/* Action Buttons */}
            <div className="dialog-buttons">
              {modalState === "CONFIRMED" && (
                <>
                  <Link href="/dashboard" className="btn primary btn-full">
                    View tickets →
                  </Link>
                  <button
                    onClick={() => setModalState("IDLE")}
                    className="btn btn-ghost"
                  >
                    Done
                  </button>
                </>
              )}

              {modalState === "PAUSED" && (
                <>
                  {paymentInfo && heldBooking && (
                    <button
                      onClick={() => triggerRazorpayCheckout(paymentInfo, heldBooking)}
                      className="btn primary btn-full"
                    >
                      Pay now with Razorpay →
                    </button>
                  )}
                  <button
                    onClick={() => setModalState("IDLE")}
                    className="btn btn-ghost"
                  >
                    Back to seats
                  </button>
                </>
              )}

              {modalState === "ERROR" && (
                <>
                  <button onClick={handleReserveTickets} className="btn primary btn-full">
                    Try again
                  </button>
                  <button
                    onClick={() => setModalState("IDLE")}
                    className="btn btn-ghost"
                  >
                    Pick another section
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS with Balanced Spacing & Smooth 60fps Hardware-Accelerated Animations */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: #ecebe6;
        }

        .container {
          max-width: 960px;
          margin: 0 auto;
          padding: 1.75rem 1.25rem 7.5rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 0.25rem 0.65rem 0.25rem 0.3rem;
          font-size: 0.82rem;
        }

        .avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--glow);
          color: #000;
          font-weight: 700;
          font-size: 0.68rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .username {
          font-weight: 600;
        }

        .logout-btn {
          background: none;
          border: none;
          color: var(--dim);
          cursor: pointer;
          font-size: 0.75rem;
          margin-left: 0.25rem;
        }

        .logout-btn:hover {
          color: var(--fg);
        }

        /* Top Breadcrumb Nav Bar */
        .top-nav-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          color: var(--dim);
          cursor: pointer;
          font: inherit;
          padding: 0;
          transition: color 0.15s ease;
        }

        .back-btn:hover {
          color: var(--fg);
        }

        .crumb-text {
          color: var(--fg);
          font-weight: 500;
        }

        /* Content Stack: Proper Rhythmic Spacing */
        .content-stack {
          display: flex;
          flex-direction: column;
          gap: 2.25rem;
        }

        /* Section 1: Hero Banner */
        .section-hero {
          background: #0d0d11;
          border: 1px solid rgba(236, 235, 230, 0.1);
          border-radius: 16px;
          padding: 2rem clamp(1.25rem, 4vw, 2.5rem);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .hero-status-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-pill {
          font-size: 0.75rem;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
        }

        .event-id-tag {
          font-size: 0.72rem;
          font-family: monospace;
          color: var(--dim);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
        }

        .hero-heading {
          font-family: var(--font-display);
          font-size: clamp(2.1rem, 5vw, 3.4rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.05;
          margin: 0;
        }

        .hero-meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--dim);
          font-size: 0.88rem;
          flex-wrap: wrap;
        }

        .meta-item {
          color: var(--fg);
        }

        .meta-divider {
          color: rgba(236, 235, 230, 0.2);
        }

        .hero-description {
          color: var(--dim);
          font-size: 0.92rem;
          line-height: 1.55;
          margin: 0.35rem 0 0 0;
          max-width: 62ch;
        }

        /* Section 2: Venue Stage Map */
        .section-map {
          background: #09090c;
          border: 1px solid rgba(236, 235, 230, 0.08);
          border-radius: 16px;
          padding: 1.75rem clamp(1.25rem, 4vw, 2rem);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .map-header {
          text-align: center;
        }

        .eyebrow {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--glow);
          font-weight: 700;
          display: block;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0.2rem 0;
        }

        .section-subtitle {
          font-size: 0.82rem;
          color: var(--dim);
          margin: 0;
        }

        .map-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .stage-podium {
          width: 70%;
          max-width: 380px;
          height: 34px;
          background: rgba(255, 196, 107, 0.12);
          border: 1px solid rgba(255, 196, 107, 0.35);
          border-radius: 40px 40px 6px 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--glow);
        }

        .sections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.85rem;
          width: 100%;
        }

        .section-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          cursor: pointer;
          color: inherit;
          font-family: inherit;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }

        .section-btn:hover {
          border-color: rgba(255, 196, 107, 0.4);
        }

        .section-btn.selected {
          border-color: var(--glow);
          background: rgba(255, 196, 107, 0.06);
        }

        .section-btn.soldout {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .sec-code {
          font-size: 0.65rem;
          color: var(--dim);
          font-family: monospace;
        }

        .sec-name {
          font-size: 0.9rem;
        }

        .sec-price {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--glow);
        }

        .sec-status {
          font-size: 0.72rem;
          color: var(--dim);
        }

        /* Section 3: Seating Tiers */
        .section-tiers {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tiers-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .tiers-count {
          font-size: 0.8rem;
          color: var(--dim);
        }

        .tiers-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .tier-card {
          background: #0d0d11;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease;
          flex-wrap: wrap;
        }

        .tier-card:hover {
          border-color: rgba(255, 196, 107, 0.35);
        }

        .tier-card.selected {
          border-color: var(--glow);
          background: rgba(255, 196, 107, 0.03);
        }

        .tier-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tier-info {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          flex: 1 1 280px;
        }

        .tier-header-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .code-pill {
          font-family: monospace;
          font-size: 0.68rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          color: var(--dim);
        }

        .tier-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .pill-available {
          font-size: 0.72rem;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }

        .pill-urgent {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--glow);
          background: rgba(255, 196, 107, 0.12);
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }

        .pill-soldout {
          font-size: 0.72rem;
          font-weight: 600;
          color: #f87171;
          background: rgba(239, 68, 68, 0.12);
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }

        .tier-desc {
          font-size: 0.84rem;
          color: var(--dim);
          margin: 0;
        }

        .tier-availability-caption {
          font-size: 0.75rem;
          color: var(--dim);
        }

        .tier-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .price-display {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .price-num {
          font-family: var(--font-display);
          font-size: 1.55rem;
          font-weight: 800;
          color: var(--glow);
          line-height: 1.1;
        }

        .price-caption {
          font-size: 0.7rem;
          color: var(--dim);
        }

        .stepper-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stepper {
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          border-radius: 8px;
        }

        .step-btn {
          background: none;
          border: none;
          color: var(--fg);
          font-size: 1rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .step-btn:hover {
          opacity: 0.8;
        }

        .step-count {
          font-size: 0.88rem;
          font-weight: 700;
          min-width: 26px;
          text-align: center;
        }

        .tier-select-btn {
          padding: 0.5rem 1.15rem;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.03);
          color: var(--fg);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .tier-select-btn.picked {
          background: var(--glow);
          color: #000;
          border-color: var(--glow);
          font-weight: 700;
        }

        .soldout-tag {
          font-size: 0.82rem;
          color: #f87171;
          font-weight: 600;
        }

        /* Section 4: Confirmed Pass Card */
        .section-confirmed-pass {
          background: #0d0d11;
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 14px;
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .confirmed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .confirmed-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .check-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #34d399;
          color: #000;
          font-size: 0.75rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .confirmed-title-wrap h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: #34d399;
        }

        .paid-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
        }

        .confirmed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 0.85rem;
          background: rgba(0, 0, 0, 0.35);
          padding: 0.85rem 1.15rem;
          border-radius: 10px;
          font-size: 0.82rem;
        }

        .confirmed-col {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .col-lbl {
          font-size: 0.68rem;
          color: var(--dim);
        }

        .col-val {
          font-size: 0.95rem;
        }

        .col-seats {
          color: #34d399;
        }

        .col-code {
          font-family: monospace;
          font-size: 0.78rem;
        }

        .col-total {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--glow);
        }

        .confirmed-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .policy-text {
          font-size: 0.78rem;
          color: var(--dim);
        }

        /* Sticky Bottom Checkout Dock */
        .sticky-checkout-bar {
          position: sticky;
          bottom: 1.25rem;
          z-index: 20;
          background: #0e0e12;
          border: 1px solid rgba(255, 196, 107, 0.3);
          border-radius: 14px;
          padding: 0.95rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
        }

        .bar-details {
          display: flex;
          flex-direction: column;
        }

        .bar-tier {
          font-size: 0.8rem;
          color: var(--dim);
        }

        .bar-price-wrap {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }

        .bar-amount {
          font-family: var(--font-display);
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--glow);
          line-height: 1.1;
        }

        .bar-note {
          font-size: 0.72rem;
          color: var(--dim);
        }

        .bar-cta {
          padding: 0.65rem 1.85rem;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* ========================================================================= */
        /* SMOOTH, LIGHTWEIGHT, ZERO-LAG SCREEN-LOCK POPUP                           */
        /* ========================================================================= */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: smoothFade 0.16s ease-out forwards;
        }

        .modal-dialog {
          width: 100%;
          max-width: 410px;
          background: #111116;
          border: 1px solid rgba(255, 196, 107, 0.28);
          border-radius: 16px;
          padding: 1.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.15rem;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
          animation: smoothPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        .dialog-icon-wrap {
          display: flex;
          justify-content: center;
        }

        .dialog-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
        }

        .dialog-icon.icon-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .dialog-icon.icon-error {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .dialog-icon.icon-paused {
          background: rgba(255, 196, 107, 0.15);
          color: var(--glow);
          border: 1px solid rgba(255, 196, 107, 0.3);
        }

        .dialog-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255, 196, 107, 0.15);
          border-top-color: var(--glow);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .dialog-text-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .dialog-title {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--fg);
        }

        .dialog-desc {
          font-size: 0.85rem;
          color: var(--dim);
          line-height: 1.45;
          margin: 0;
        }

        .dialog-summary {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(236, 235, 230, 0.08);
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          text-align: left;
          font-size: 0.82rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-row.summary-total {
          border-top: 1px solid rgba(236, 235, 230, 0.08);
          padding-top: 0.35rem;
          margin-top: 0.15rem;
        }

        .sum-label {
          color: var(--dim);
        }

        .sum-value {
          font-weight: 600;
        }

        .sum-price {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--glow);
        }

        .dialog-trust-note {
          font-size: 0.72rem;
          color: var(--dim);
        }

        .dialog-buttons {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .btn-full {
          width: 100%;
          padding: 0.65rem 1.25rem;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--dim);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.82rem;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .btn-ghost:hover {
          color: var(--fg);
          border-color: var(--fg);
        }

        @keyframes smoothFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes smoothPop {
          from {
            opacity: 0;
            transform: translate3d(0, 8px, 0) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        /* Generic State Boxes */
        .state-box {
          padding: 4rem 1rem;
          text-align: center;
          color: var(--dim);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .spinner {
          width: 26px;
          height: 26px;
          border: 2px solid rgba(236, 235, 230, 0.15);
          border-top-color: var(--glow);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .alert-box {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          color: #fca5a5;
        }

        .empty-tiers-box {
          padding: 3rem 1.5rem;
          border: 1px dashed var(--line);
          border-radius: 14px;
          text-align: center;
          color: var(--dim);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
