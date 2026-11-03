"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import gsap from "gsap";
import { X, Sparkles, Move, Scissors } from "lucide-react";

interface HangingTicketItem {
  id: string;
  x: number;
  y: number;
  artist: string;
  venue: string;
  seat: string;
  price: string;
  tier: string;
  colorScheme: {
    bg: string;
    border: string;
    accent: string;
    glow: string;
  };
}

const CONCERT_PRESETS = [
  {
    artist: "COLDPLAY",
    venue: "Music of the Spheres • Stadium",
    seat: "ROW A • SEAT 12",
    price: "₹4,500",
    tier: "VIP FRONT ROW",
    colorScheme: {
      bg: "linear-gradient(135deg, #0e1726 0%, #050505 100%)",
      border: "rgba(255, 196, 107, 0.6)",
      accent: "#ffc46b",
      glow: "rgba(255, 196, 107, 0.35)",
    },
  },
  {
    artist: "ARIJIT SINGH",
    venue: "Soulful Symphony World Tour",
    seat: "ROW P • SEAT 04",
    price: "₹2,800",
    tier: "PLATINUM LOUNGE",
    colorScheme: {
      bg: "linear-gradient(135deg, #1f102c 0%, #08050d 100%)",
      border: "rgba(192, 132, 252, 0.6)",
      accent: "#c084fc",
      glow: "rgba(192, 132, 252, 0.35)",
    },
  },
  {
    artist: "DILJIT DOSANJH",
    venue: "Dil-Luminati Arena Live",
    seat: "PIT • SEAT 01",
    price: "₹6,000",
    tier: "EXCLUSIVE FAN PIT",
    colorScheme: {
      bg: "linear-gradient(135deg, #241407 0%, #0a0602 100%)",
      border: "rgba(251, 146, 60, 0.6)",
      accent: "#fb923c",
      glow: "rgba(251, 146, 60, 0.35)",
    },
  },
  {
    artist: "TAYLOR SWIFT",
    venue: "The Eras Tour Showcase",
    seat: "DIAMOND • SEAT 08",
    price: "₹8,500",
    tier: "DIAMOND CIRCLE",
    colorScheme: {
      bg: "linear-gradient(135deg, #081e28 0%, #04090d 100%)",
      border: "rgba(56, 189, 248, 0.6)",
      accent: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.35)",
    },
  },
  {
    artist: "SEAT SAGA PASS",
    venue: "Instant Redis Atomic Lock",
    seat: "GATE 3 • ROW 1",
    price: "CONFIRMED",
    tier: "SAGA PROTOCOL",
    colorScheme: {
      bg: "linear-gradient(135deg, #0a1f13 0%, #030805 100%)",
      border: "rgba(74, 222, 128, 0.6)",
      accent: "#4ade80",
      glow: "rgba(74, 222, 128, 0.35)",
    },
  },
];

interface TicketCardProps {
  ticket: HangingTicketItem;
  onDismiss: (id: string) => void;
}

function TicketCard({ ticket, onDismiss }: TicketCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stringRef = useRef<SVGLineElement>(null);

  // GSAP Hanging Drop and Pendulum Swing Animation
  useEffect(() => {
    if (!containerRef.current || !cardRef.current) return;

    const ctx = gsap.context(() => {
      // Drop from top with elastic bounce
      gsap.fromTo(
        cardRef.current,
        {
          y: -400,
          rotation: -28,
          scale: 0.8,
          opacity: 0,
        },
        {
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 1.5,
          ease: "elastic.out(1, 0.35)",
        }
      );

      // Hanging sway physics (pendulum damping)
      gsap.to(cardRef.current, {
        rotation: 4,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1.5,
      });

      // String drop animation
      if (stringRef.current) {
        gsap.fromTo(
          stringRef.current,
          { strokeDashoffset: 600 },
          { strokeDashoffset: 0, duration: 1.2, ease: "power3.out" }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 3D Parallax on Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -16;
    const rotY = ((x - centerX) / centerX) * 16;

    gsap.to(cardRef.current, {
      rotateX: rotX,
      rotateY: rotY,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 1000,
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: "elastic.out(1, 0.4)",
    });
  };

  // Tear-off dismissal animation with GSAP
  const handleTearOff = () => {
    if (!cardRef.current) {
      onDismiss(ticket.id);
      return;
    }

    gsap.to(cardRef.current, {
      y: 800,
      rotation: 45,
      opacity: 0,
      duration: 0.75,
      ease: "power2.in",
      onComplete: () => {
        onDismiss(ticket.id);
      },
    });
  };

  // Clamp positioning so ticket stays inside viewport
  const leftPos = Math.max(20, Math.min(ticket.x - 140, window.innerWidth - 300));
  const topPos = Math.max(100, Math.min(ticket.y - 40, window.innerHeight - 260));

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: leftPos,
        top: 0,
        height: topPos + 220,
        width: 280,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* Hanging Cord / Golden Thread SVG */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: topPos + 20,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id={`cordGrad-${ticket.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="70%" stopColor={ticket.colorScheme.accent} />
            <stop offset="100%" stopColor="#ffc46b" />
          </linearGradient>
        </defs>
        <line
          ref={stringRef}
          x1={140}
          y1={0}
          x2={140}
          y2={topPos + 10}
          stroke={`url(#cordGrad-${ticket.id})`}
          strokeWidth={2}
          strokeDasharray="4 2"
        />
        {/* Golden Clip / Pin */}
        <circle cx={140} cy={topPos + 10} r={6} fill="#ffc46b" />
        <circle cx={140} cy={topPos + 10} r={3} fill="#050505" />
      </svg>

      {/* 3D Ticket Body */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          top: topPos + 12,
          left: 0,
          width: 280,
          background: ticket.colorScheme.bg,
          border: `1.5px solid ${ticket.colorScheme.border}`,
          borderRadius: 14,
          padding: "16px 18px",
          color: "#fff",
          boxShadow: `0 24px 48px -12px rgba(0, 0, 0, 0.85), 0 0 30px ${ticket.colorScheme.glow}`,
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "grab",
          userSelect: "none",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Holographic gloss overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 80%)",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: ticket.colorScheme.accent,
                boxShadow: `0 0 10px ${ticket.colorScheme.accent}`,
              }}
            />
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: ticket.colorScheme.accent,
                textTransform: "uppercase",
              }}
            >
              {ticket.tier}
            </span>
          </div>

          <button
            onClick={handleTearOff}
            title="Tear ticket off"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#aaa",
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "#aaa";
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Artist Name */}
        <h4
          style={{
            margin: "0 0 4px 0",
            fontSize: "1.25rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display, sans-serif)",
            color: "#ffffff",
          }}
        >
          {ticket.artist}
        </h4>

        {/* Venue */}
        <p style={{ margin: "0 0 14px 0", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)" }}>
          {ticket.venue}
        </p>

        {/* Seat & Price Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 8,
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>
              Seat
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: ticket.colorScheme.accent }}>
              {ticket.seat}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>
              Price
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
              {ticket.price}
            </div>
          </div>
        </div>

        {/* Perforation Line */}
        <div
          style={{
            position: "relative",
            margin: "12px -18px",
            borderTop: "1px dashed rgba(255, 255, 255, 0.2)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -8,
              top: -8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#050505",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -8,
              top: -8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#050505",
            }}
          />
        </div>

        {/* Barcode & Tear Off Action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
          {/* Simulated Barcode */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 24 }}>
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2].map((h, i) => (
              <div
                key={i}
                style={{
                  width: h > 2 ? 2 : 1,
                  height: h * 5 + 6,
                  background: "rgba(255, 255, 255, 0.75)",
                }}
              />
            ))}
          </div>

          <button
            onClick={handleTearOff}
            style={{
              background: "transparent",
              border: `1px solid ${ticket.colorScheme.accent}`,
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: ticket.colorScheme.accent,
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ticket.colorScheme.accent;
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = ticket.colorScheme.accent;
            }}
          >
            <Scissors size={10} />
            <span>Tear Off</span>
          </button>
        </div>

        {/* Micro hint */}
        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 8 }}>
          Swinging on GSAP spring • Tilt with mouse
        </div>
      </div>
    </div>
  );
}

export default function HangingTicketOverlay() {
  const [hangingTickets, setHangingTickets] = useState<HangingTicketItem[]>([]);
  const presetIndexRef = useRef(0);

  const spawnTicket = useCallback((clientX: number, clientY: number) => {
    const preset = CONCERT_PRESETS[presetIndexRef.current % CONCERT_PRESETS.length];
    presetIndexRef.current += 1;

    const newTicket: HangingTicketItem = {
      id: "ticket-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      x: clientX,
      y: clientY,
      ...preset,
    };

    setHangingTickets((prev) => {
      // Keep at most 4 hanging tickets simultaneously for clean aesthetic
      const slice = prev.length >= 4 ? prev.slice(1) : prev;
      return [...slice, newTicket];
    });
  }, []);

  // Global Click Listener: Spawns ticket when clicking anywhere except interactive elements
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks on buttons, links, inputs, dialogs, or ticket controls
      const interactiveSelector = "a, button, input, select, textarea, [role='button'], .react-flow, .rf-control";
      if (target.closest(interactiveSelector)) {
        return;
      }

      spawnTicket(e.clientX, e.clientY);
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [spawnTicket]);

  const dismissTicket = (id: string) => {
    setHangingTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllTickets = () => {
    setHangingTickets([]);
  };

  return (
    <>
      {/* Active Hanging Tickets */}
      {hangingTickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} onDismiss={dismissTicket} />
      ))}

      {/* Floating Interactive Badge & Quick Summon Button */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 900,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 196, 107, 0.3)",
          borderRadius: 999,
          padding: "6px 14px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            spawnTicket(window.innerWidth / 2, 280);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#ffc46b",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
          title="Click to drop a hanging 3D ticket"
        >
          <Sparkles size={14} />
          <span>Click anywhere to hang 3D ticket</span>
        </button>

        {hangingTickets.length > 0 && (
          <>
            <span
              style={{
                background: "#ffc46b",
                color: "#000",
                fontSize: "0.7rem",
                fontWeight: 700,
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hangingTickets.length}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllTickets();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "#ccc",
                fontSize: "0.72rem",
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 12,
              }}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </>
  );
}

