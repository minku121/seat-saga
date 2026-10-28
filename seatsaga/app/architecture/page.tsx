"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Server,
  Database,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Clock,
  Sparkles,
  Info,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Move,
} from "lucide-react";

interface FlowStep {
  step: number;
  title: string;
  source: string;
  target: string;
  medium: "HTTP API" | "Kafka Topic" | "Redis Command" | "Webhook";
  plainEnglish: string;
  technicalDetails: string;
  mermaidNodeKeys: string[];
  payloadPreview: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    step: 1,
    title: "1. Seat Discovery & Availability Check",
    source: "Frontend (Next.js)",
    target: "Inventory Service (Spring Boot)",
    medium: "HTTP API",
    plainEnglish:
      "When you tap a seat on the venue map, your browser asks the Inventory Service for real-time seat availability.",
    technicalDetails:
      "GET /api/inventory/events/{id}/seats queries Inventory DB and filters out active Redis TTL holds.",
    mermaidNodeKeys: ["U", "FE", "IA", "IDB"],
    payloadPreview: "GET /api/inventory/events/ev_8821/seats\nResponse: 200 OK [{ id: 'A-12', status: 'AVAILABLE', price: 1800 }]",
  },
  {
    step: 2,
    title: "2. Atomic Seat Hold with 10-Minute Redis TTL",
    source: "Booking Service",
    target: "Inventory Service & Redis",
    medium: "Redis Command",
    plainEnglish:
      "Seat Saga locks your seat for 10 minutes. If someone else clicks it, it shows as locked. If you abandon, Redis automatically releases it.",
    technicalDetails:
      "Inventory Service sets atomic Redis lock: SET hold:seat:A-12 'usr_491' EX 600 NX. Seat status flags to HELD.",
    mermaidNodeKeys: ["BA", "IA", "RD", "IDB"],
    payloadPreview: "SET hold:seat:A-12 \"usr_491\" EX 600 NX\nStatus: HELD (Expires in 600 seconds)",
  },
  {
    step: 3,
    title: "3. Saga Booking Creation (PAYMENT_PENDING)",
    source: "Frontend (Next.js)",
    target: "Booking Service",
    medium: "HTTP API",
    plainEnglish:
      "A booking draft is created in a 'Pending' state, securing your order parameters while waiting for payment.",
    technicalDetails:
      "POST /api/bookings persists a Booking record in Booking DB with status 'PAYMENT_PENDING'.",
    mermaidNodeKeys: ["FE", "BA", "BDB"],
    payloadPreview: "POST /api/bookings\n{\n  \"eventId\": \"ev_8821\",\n  \"seats\": [\"A-12\"],\n  \"status\": \"PAYMENT_PENDING\"\n}",
  },
  {
    step: 4,
    title: "4. Asynchronous Event Dispatch (payment-requested)",
    source: "Booking Service",
    target: "Kafka -> Payment Service",
    medium: "Kafka Topic",
    plainEnglish:
      "Booking drops an asynchronous ticket into Kafka. Payment Service catches it instantly without freezing your browser.",
    technicalDetails:
      "Booking Service produces SeatHeldEvent to topic 'payment-requested'. Payment Service consumer reads message.",
    mermaidNodeKeys: ["BA", "K1", "PA"],
    payloadPreview: "TOPIC: payment-requested\n{\n  \"bookingId\": \"bk_9103\",\n  \"amount\": 1800,\n  \"currency\": \"INR\",\n  \"userEmail\": \"fan@seatsaga.com\"\n}",
  },
  {
    step: 5,
    title: "5. Razorpay Checkout & User Payment",
    source: "Payment Service",
    target: "Razorpay (External Gateway) & User",
    medium: "HTTP API",
    plainEnglish:
      "Payment Service provisions an order on Razorpay. The browser opens the secure checkout popup for UPI/Card approval.",
    technicalDetails:
      "Payment Service calls Razorpay Orders API: orders.create({ amount: 180000, receipt: 'bk_9103' }). Client opens modal.",
    mermaidNodeKeys: ["PA", "PG", "FE", "U"],
    payloadPreview: "POST https://api.razorpay.com/v1/orders\nResponse: { id: 'order_Nx8Y39', status: 'created', amount: 180000 }",
  },
  {
    step: 6,
    title: "6. Verified Payment Webhook",
    source: "Razorpay (External Gateway)",
    target: "Payment Service",
    medium: "Webhook",
    plainEnglish:
      "When payment succeeds, Razorpay cryptographically notifies our backend that the money is safely captured.",
    technicalDetails:
      "POST /api/payments/webhook with HMAC-SHA256 signature. Payment Service validates hash and records CAPTURED in Payment DB.",
    mermaidNodeKeys: ["PG", "PA", "PDB"],
    payloadPreview: "POST /api/payments/webhook\nHeader: x-razorpay-signature: e3b0c44298...\nEvent: payment.captured (₹1,800.00)",
  },
  {
    step: 7,
    title: "7. Kafka Broadcast (payment-status) & Ticket Issuance",
    source: "Payment Service",
    target: "Kafka -> Booking Service -> Frontend",
    medium: "Kafka Topic",
    plainEnglish:
      "Payment Service broadcasts SUCCESS to Kafka. Booking Service confirms the order, and your screen displays the celebration ticket stub!",
    technicalDetails:
      "Payment Service emits PaymentStatusEvent on 'payment-status'. Booking Service marks CONFIRMED. Client displays ticket.",
    mermaidNodeKeys: ["PA", "K2", "BA", "BDB", "FE"],
    payloadPreview: "TOPIC: payment-status\n{\n  \"bookingId\": \"bk_9103\",\n  \"paymentId\": \"pay_891\",\n  \"status\": \"SUCCESS\"\n}\n=> BOOKING CONFIRMED",
  },
];

const MERMAID_DIAGRAM_CODE = `flowchart TB
    %% TOP: ENTITIES
    U{"User"}
    E{"Event"}
    S{"Seat"}
    ST{"Seat Type"}
    BK{"Booking"}
    PG{"Payment Gateway<br/>(External)"}

    %% KAFKA
    subgraph KAFKA["Kafka Event Backbone"]
        direction LR
        K1["payment-requested"]
        K2["payment-status"]
        K3["seat-status (optional)"]
    end

    %% AUTH SERVICE
    subgraph AUTH["Auth Service — Spring Boot"]
        direction TB
        AU["Registration<br/>Login<br/>JWT Authentication"]
        AUDB[("Auth DB<br/>PostgreSQL")]
        AU <--> AUDB
    end

    %% INVENTORY SERVICE
    subgraph INV["Inventory Service — Spring Boot"]
        direction TB
        IA["Admin API / Public API<br/>Events and Seat Types<br/>Seat Availability<br/>Atomic Seat Hold / Release"]
        IDB[("Inventory DB<br/>PostgreSQL")]
        RD[("Redis<br/>Hold Expiry TTL")]
        IA <--> IDB
        IA <--> RD
    end

    %% BOOKING SERVICE
    subgraph BOOK["Booking Service — Spring Boot"]
        direction TB
        BA["Create Booking<br/>Coordinate Seat Holds<br/>Track Payment Status<br/>Confirm / Cancel Booking"]
        BDB[("Booking DB<br/>PostgreSQL")]
        BA <--> BDB
    end

    %% PAYMENT SERVICE
    subgraph PAY["Payment Service — Spring Boot"]
        direction TB
        PA["Create Payment<br/>Verify Webhook<br/>Update Payment Status<br/>Publish Payment Events"]
        PDB[("Payment DB<br/>PostgreSQL")]
        PA <--> PDB
    end

    %% FRONTEND
    subgraph FRONTEND["Frontend — Next.js App"]
        FE["Browse Events<br/>Select Seats<br/>Create Booking<br/>Payment Popup / Redirect<br/>Poll Payment Status"]
    end

    %% ENTITY ASSOCIATIONS
    U --- AU
    E --- IA
    S --- IA
    ST --- IA
    BK --- BA
    PG --- PA

    %% AUTHENTICATION
    FE -->|"Login / Register"| AU
    AU -->|"JWT Token"| FE

    %% FRONTEND API CALLS
    FE -->|"Event and Seat Details API"| IA
    FE -->|"Create Booking Request API"| BA
    FE -->|"Poll Booking Status API"| BA
    FE -->|"Start Payment / Checkout API"| PA

    %% SEAT HOLD REST FLOW
    BA -->|"Hold Seat Request — REST"| IA
    IA -->|"Hold Result — Held Seats"| BA
    BA -->|"Confirm / Release Seats"| IA

    %% KAFKA PAYMENT REQUEST FLOW
    BA -->|"Publish payment request"| K1
    K1 -->|"Consume payment request"| PA

    %% KAFKA PAYMENT RESULT FLOW
    PA -->|"Publish payment outcome"| K2
    K2 -->|"Consume payment outcome"| BA

    %% OPTIONAL SEAT EVENT
    IA -.->|"Optional seat state event"| K3

    %% PAYMENT GATEWAY
    PA -->|"Create checkout session"| PG
    PG -->|"Verified webhook / callback"| PA

    %% COLORS
    classDef frontend fill:#111820,stroke:#73b7ff,color:#ffffff,stroke-width:2px
    classDef auth fill:#191316,stroke:#ff8c9b,color:#ffffff,stroke-width:2px
    classDef inventory fill:#17121c,stroke:#c995ff,color:#ffffff,stroke-width:2px
    classDef booking fill:#111a14,stroke:#83e6a7,color:#ffffff,stroke-width:2px
    classDef payment fill:#1b1710,stroke:#ffcb65,color:#ffffff,stroke-width:2px
    classDef kafka fill:#171421,stroke:#b9a8ff,color:#ffffff,stroke-width:2px
    classDef entity fill:#111111,stroke:#d6d6d6,color:#ffffff
    classDef database fill:#15121c,stroke:#b9a8ff,color:#ffffff

    class FE frontend
    class AU auth
    class IA inventory
    class BA booking
    class PA payment
    class K1,K2,K3 kafka
    class U,E,S,ST,BK,PG entity
    class AUDB,IDB,RD,BDB,PDB database

    %% DARK CANVAS
    style KAFKA fill:#111111,stroke:#b9a8ff,color:#ffffff
    style AUTH fill:#111111,stroke:#ff8c9b,color:#ffffff
    style INV fill:#111111,stroke:#c995ff,color:#ffffff
    style BOOK fill:#111111,stroke:#83e6a7,color:#ffffff
    style PAY fill:#111111,stroke:#ffcb65,color:#ffffff
    style FRONTEND fill:#111111,stroke:#73b7ff,color:#ffffff`;

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState<"mermaid" | "excalidraw" | "tech">("mermaid");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  // Mermaid Render States - Default zoom set to 0.5 (50%) as requested
  const [mermaidSvg, setMermaidSvg] = useState<string>("");
  const [mermaidLoading, setMermaidLoading] = useState<boolean>(true);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [mermaidZoom, setMermaidZoom] = useState<number>(0.65);
  const [mermaidViewMode, setMermaidViewMode] = useState<"render" | "code">("render");
  const [isMermaidFullscreen, setIsMermaidFullscreen] = useState<boolean>(false);

  // Pan / Drag State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const currentStep = FLOW_STEPS[currentStepIndex];

  // Auto-play interval for live simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < FLOW_STEPS.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return 0;
          }
        });
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Client-side Mermaid Dynamic Renderer
  useEffect(() => {
    let isMounted = true;
    setMermaidLoading(true);
    setMermaidError(null);

    const renderChart = () => {
      if (typeof window === "undefined" || !(window as unknown as { mermaid?: { initialize: (cfg: object) => void; render: (id: string, text: string) => Promise<{ svg: string }> } }).mermaid) return;
      try {
        const mermaid = (window as unknown as { mermaid: { initialize: (cfg: object) => void; render: (id: string, text: string) => Promise<{ svg: string }> } }).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          flowchart: {
            curve: "basis",
            htmlLabels: true,
            useMaxWidth: false,
            padding: 24,
            nodeSpacing: 52,
            rankSpacing: 72,
          },
          fontSize: 16,
        });
        const uniqueId = "mermaid-" + Math.random().toString(36).substring(2, 9);
        mermaid
          .render(uniqueId, MERMAID_DIAGRAM_CODE)
          .then((result: { svg: string }) => {
            if (isMounted) {
              setMermaidSvg(result.svg);
              setMermaidLoading(false);
            }
          })
          .catch((err: unknown) => {
            console.error("Mermaid render error:", err);
            if (isMounted) {
              setMermaidError((err as Error)?.message || "Failed to render Mermaid diagram");
              setMermaidLoading(false);
            }
          });
      } catch (e: unknown) {
        if (isMounted) {
          setMermaidError((e as Error)?.message || "Error initializing Mermaid engine");
          setMermaidLoading(false);
        }
      }
    };

    if (typeof window !== "undefined") {
      if ((window as unknown as { mermaid?: unknown }).mermaid) {
        renderChart();
      } else {
        const existingScript = document.getElementById("mermaid-cdn-script");
        if (existingScript) {
          existingScript.addEventListener("load", renderChart);
        } else {
          const script = document.createElement("script");
          script.id = "mermaid-cdn-script";
          script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js";
          script.async = true;
          script.onload = () => renderChart();
          script.onerror = () => {
            if (isMounted) {
              setMermaidError("Could not load Mermaid library from CDN.");
              setMermaidLoading(false);
            }
          };
          document.head.appendChild(script);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Update SVG DOM nodes with active pulsing highlight when currentStep changes
  const updateSvgActiveNodes = useCallback(() => {
    if (!svgWrapperRef.current) return;
    const targetNodes = currentStep.mermaidNodeKeys;

    // Query all node groups in the rendered Mermaid SVG
    const nodes = svgWrapperRef.current.querySelectorAll(".node, .cluster");
    nodes.forEach((el) => {
      const id = el.id || "";
      // Match node identifiers like flowchart-FE- or end with -FE
      const isMatch = targetNodes.some((key) => {
        const pattern1 = `-${key}-`;
        const pattern2 = `-${key}`;
        return id.includes(pattern1) || id.endsWith(pattern2) || id === key;
      });

      if (isMatch) {
        el.classList.add("mermaid-flow-active");
      } else {
        el.classList.remove("mermaid-flow-active");
      }
    });
  }, [currentStep.mermaidNodeKeys]);

  useEffect(() => {
    if (mermaidSvg && !mermaidLoading) {
      // Small timeout to allow DOM injection
      const t = setTimeout(() => {
        updateSvgActiveNodes();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [mermaidSvg, mermaidLoading, currentStepIndex, updateSvgActiveNodes]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setMermaidZoom(0.65); // Reset to default zoom
    setPan({ x: 0, y: 0 });
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(MERMAID_DIAGRAM_CODE);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div className="arch-root">
      {/* Top Navigation */}
      <header className="nav">
        <Link href="/" className="logo">
          Seat Saga
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ color: "var(--dim)", textDecoration: "none", fontSize: "0.9rem" }}>
            Dashboard
          </Link>
          <span className="pill" style={{ background: "rgba(255,196,107,0.1)", borderColor: "var(--glow)", color: "var(--glow)" }}>
            Architecture
          </span>
        </nav>
      </header>

      {/* Main Container */}
      <main className="arch-main">
        {/* Header Hero */}
        <section className="arch-hero">

          <h1 className="arch-title">
            Seat Saga Architecture
          </h1>
          <p className="arch-subtitle">
            Four independent services. One seamless booking experience.
          </p>

          {/* Navigation Tabs */}
          <div className="arch-tabs">
            <button
              onClick={() => setActiveTab("mermaid")}
              className={`arch-tab-btn ${activeTab === "mermaid" ? "active" : ""}`}
            >
              <Code2 size={16} />
              <span>Flow Diagram</span>
            </button>
            <button
              onClick={() => setActiveTab("excalidraw")}
              className={`arch-tab-btn ${activeTab === "excalidraw" ? "active" : ""}`}
            >
              <Layers size={16} />
              <span>Blueprint</span>
            </button>
            <button
              onClick={() => setActiveTab("tech")}
              className={`arch-tab-btn ${activeTab === "tech" ? "active" : ""}`}
            >
              <Server size={16} />
              <span>Services</span>
            </button>
          </div>
        </section>

        {/* TAB 1: INTERACTIVE PLAYABLE MERMAID ARCHITECTURE */}
        {activeTab === "mermaid" && (
          <section className="mermaid-section">
            {/* Top Toolbar: Playback controls + Zoom + Mode Switcher */}
            <div className="diagram-toolbar">
              {/* Playable Flow Stepper Bar */}
              <div className="playback-group">
                <button
                  className={`sim-btn primary-sim-btn ${isPlaying ? "playing" : ""}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? "Pause Automated Flow" : "Play Flow across Services"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? "Pause Flow" : "Play Flow"}</span>
                </button>

                <div className="step-nav-group">
                  <button
                    className="sim-btn"
                    onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentStepIndex === 0}
                    title="Previous Step"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="step-pill">
                    <span className="step-number">Step {currentStep.step}/7</span>
                    <span className="step-dot" />
                    <span className="step-label">{currentStep.title}</span>
                  </div>

                  <button
                    className="sim-btn"
                    onClick={() => setCurrentStepIndex((prev) => Math.min(FLOW_STEPS.length - 1, prev + 1))}
                    disabled={currentStepIndex === FLOW_STEPS.length - 1}
                    title="Next Step"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    className="sim-btn reset-btn"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex(0);
                    }}
                    title="Reset to Step 1"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>

              {/* View & Canvas Controls */}
              <div className="canvas-controls">
                <div className="sub-toggle-group">
                  <button
                    onClick={() => setMermaidViewMode("render")}
                    className={`sub-toggle-btn ${mermaidViewMode === "render" ? "active" : ""}`}
                  >
                    Diagram
                  </button>
                  <button
                    onClick={() => setMermaidViewMode("code")}
                    className={`sub-toggle-btn ${mermaidViewMode === "code" ? "active" : ""}`}
                  >
                    Code
                  </button>
                </div>

                {mermaidViewMode === "render" && (
                  <div className="zoom-group">
                    <button
                      className="zoom-btn"
                      onClick={() => setMermaidZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="zoom-label">{Math.round(mermaidZoom * 100)}%</span>
                    <button
                      className="zoom-btn"
                      onClick={() => setMermaidZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={handleResetView}
                      title="Reset View (50% Zoom)"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={() => setIsMermaidFullscreen(true)}
                      title="Fullscreen Diagram"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                )}

                <button onClick={handleCopyMermaid} className="sim-btn copy-btn" title="Copy Mermaid Syntax">
                  {copiedMermaid ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedMermaid ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* LIVE ACTIVE STEP BANNER */}
            <div className="live-step-banner">
              <div className="banner-left">

                <div className="banner-text">
                  <div className="banner-title">
                    <strong>Active Flow:</strong> {currentStep.source} &rarr; {currentStep.target}
                    <span className="protocol-badge">{currentStep.medium}</span>
                  </div>
                  <div className="banner-plain">{currentStep.plainEnglish}</div>
                </div>
              </div>
              <div className="banner-right">
                <div className="mini-payload">
                  <code>{currentStep.payloadPreview.split("\n")[0]}</code>
                </div>
              </div>
            </div>

            {/* RENDER VIEW WITH DRAG & PAN & 50% ZOOM */}
            {mermaidViewMode === "render" && (
              <div
                className={`mermaid-interactive-viewport ${isDragging ? "is-dragging" : ""}`}
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div className="viewport-overlay-hint">
                  <Move size={14} />
                  <span>Drag to pan · zoom above</span>
                </div>

                {mermaidLoading ? (
                  <div className="mermaid-loader">
                    <div className="arch-spinner" />
                    <span>Loading…</span>
                  </div>
                ) : mermaidError ? (
                  <div className="mermaid-error-box">
                    <Info size={20} className="text-amber-400" />
                    <div>
                      <strong>Unable to render diagram:</strong>
                      <p>{mermaidError}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="mermaid-stage"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px)`,
                      transition: isDragging ? "none" : "transform 0.1s ease-out",
                    }}
                  >
                    <div
                      ref={svgWrapperRef}
                      className="mermaid-svg-container"
                      style={{
                        transform: `scale(${mermaidZoom})`,
                        transformOrigin: "center top",
                        transition: "transform 0.15s ease-out",
                      }}
                      dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CODE VIEW */}
            {mermaidViewMode === "code" && (
              <div className="code-viewer">
                <div className="code-bar">
                  <span>Mermaid · flowchart TB</span>
                  <span className="code-lang">Syntax</span>
                </div>
                <pre className="mermaid-pre">
                  <code>{MERMAID_DIAGRAM_CODE}</code>
                </pre>
              </div>
            )}

            {/* Quick Navigation Stepper Dots */}
            <div className="sim-dots-container">
              {FLOW_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(idx);
                  }}
                  className={`sim-dot ${idx === currentStepIndex ? "active" : idx < currentStepIndex ? "completed" : ""}`}
                  title={s.title}
                >
                  <span className="dot-number">{idx + 1}</span>
                  <span className="dot-label">{s.source} &rarr; {s.target}</span>
                </button>
              ))}
            </div>

            {/* Step Explanatory Card (Dual Tone: Plain English + Technical) */}
            <div className="step-card">
              <div className="step-card-col">
                <div className="col-header">
                  <Info size={16} className="text-amber-400" />
                  <h5>What&apos;s happening</h5>
                </div>
                <p className="plain-text">{currentStep.plainEnglish}</p>
              </div>

              <div className="step-card-col divider-left">
                <div className="col-header">
                  <Code2 size={16} className="text-emerald-400" />
                  <h5>Under the hood</h5>
                </div>
                <p className="tech-text">{currentStep.technicalDetails}</p>

                <div className="payload-box">
                  <div className="payload-title">Live Message / Payload:</div>
                  <pre><code>{currentStep.payloadPreview}</code></pre>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: EXCALIDRAW BLUEPRINT */}
        {activeTab === "excalidraw" && (
          <section className="excalidraw-section">
            <div className="excali-header">
              <div>
                <h3 className="section-title">System Design</h3>
                <p className="section-sub">Original Excalidraw sketch — full topology at a glance.</p>
              </div>
              <button onClick={() => setIsLightboxOpen(true)} className="btn primary flex-center" style={{ gap: "0.5rem" }}>
                <Maximize2 size={16} />
                <span>Fullscreen</span>
              </button>
            </div>

            {/* Embedded Diagram Image */}
            <div className="diagram-frame" onClick={() => setIsLightboxOpen(true)}>
              <Image
                src="/architecture-diagram.png"
                alt="Seat Saga Excalidraw Architecture Diagram"
                width={2800}
                height={1400}
                style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: "12px" }}
                priority
                unoptimized
              />
              <div className="frame-overlay">
                <span>Click to view full resolution</span>
              </div>
            </div>

            {/* 5 Architecture Pillars Breakdown */}
            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon auth-icon">
                  <ShieldCheck size={20} />
                </div>
                <h4>Auth</h4>
                <p>
                  Handles sign-up and login. When you enter your email and password, this service checks your credentials and hands back a token — like a wristband — that lets you into the rest of the app.
                </p>
                <div className="pillar-tags">
                  <span>Spring Security</span>
                  <span>JWT</span>
                  <span>PostgreSQL</span>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon inv-icon">
                  <Layers size={20} />
                </div>
                <h4>Inventory</h4>
                <p>
                  Knows every seat in every venue. When you click a seat, it instantly locks it for you for 10 minutes — so nobody else can grab it while you&apos;re paying. The lock disappears automatically if you walk away.
                </p>
                <div className="pillar-tags">
                  <span>Redis TTL</span>
                  <span>Atomic Locks</span>
                  <span>Concurrency</span>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon book-icon">
                  <Server size={20} />
                </div>
                <h4>Booking</h4>
                <p>
                  The coordinator. It creates your order, tells Inventory to hold the seat, kicks off payment, and watches for the result. If payment fails, it automatically releases the seat for the next person.
                </p>
                <div className="pillar-tags">
                  <span>Saga Pattern</span>
                  <span>Choreography</span>
                  <span>Idempotency</span>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon kafka-icon">
                  <Zap size={20} />
                </div>
                <h4>Kafka Bus</h4>
                <p>
                  A message queue between services. Instead of services talking directly, they drop messages here. If one service is briefly down, messages wait safely in the queue — nothing is lost.
                </p>
                <div className="pillar-tags">
                  <span>Apache Kafka</span>
                  <span>Event-Driven</span>
                  <span>Zero Data Loss</span>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon pay-icon">
                  <Clock size={20} />
                </div>
                <h4>Payment</h4>
                <p>
                  Talks to Razorpay. Opens the payment popup, waits for your bank to approve, and listens for a signed confirmation from Razorpay. Only then does it tell Booking to mark your ticket as confirmed.
                </p>
                <div className="pillar-tags">
                  <span>Razorpay</span>
                  <span>HMAC-SHA256</span>
                  <span>Webhooks</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: TECHNICAL DEEP-DIVE (FOR DEVELOPERS) */}
        {activeTab === "tech" && (
          <section className="tech-section">
            <h3 className="section-title">How it works — simply</h3>
            <p className="section-sub">
              The problems every ticket platform faces, and how Seat Saga solves each one.
            </p>

            <div className="tech-grid">
              {/* Card 1 */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <ShieldCheck size={20} className="text-amber-400" />
                  <h4>Two people, one seat — who wins?</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Imagine a Taylor Swift presale: thousands of fans hit the same VIP seat at the exact same second. Without protection, two people would both "win" and get charged for one seat — a mess.
                  </p>
                  <ul>
                    <li>
                      <strong>First click wins, instantly:</strong> When you click a seat, Redis atomically locks it with a single command. The 4,999 other fans get a &ldquo;taken&rdquo; response in milliseconds — before the database is even touched.
                    </li>
                    <li>
                      <strong>Abandoned? Auto-released:</strong> Closed your tab? Card declined? The lock expires after 10 minutes on its own — no cleanup job needed, and the seat goes back on sale automatically.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 2 */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Zap size={20} className="text-purple-400" />
                  <h4>Why don&apos;t services just talk directly?</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    If Booking called Payment directly and Payment was down for 2 seconds, your booking would fail. Kafka acts like a reliable post box — services drop messages in, and recipients pick them up when ready.
                  </p>
                  <ul>
                    <li>
                      <strong>No waiting:</strong> Booking drops a &ldquo;payment-requested&rdquo; message and moves on. Payment reads it when it&apos;s ready. Your browser never hangs.
                    </li>
                    <li>
                      <strong>Safe rollback:</strong> If payment fails, Booking gets a &ldquo;payment-failed&rdquo; message and immediately releases the seat — so the next fan can buy it.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 3 */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Database size={20} className="text-emerald-400" />
                  <h4>Why does each service have its own database?</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Sharing one big database means one service going slow drags everything down. Each service owns only its data:
                  </p>
                  <ul>
                    <li><code>auth_db</code> — your email, password hash, role.</li>
                    <li><code>inventory_db</code> — venues, events, seats, current status.</li>
                    <li><code>booking_db</code> — your order history and current state.</li>
                    <li><code>payment_db</code> — Razorpay IDs, amount, captured timestamp.</li>
                  </ul>
                  <p className="dim-note">
                    Services never reach into each other&apos;s databases. They only communicate through clean API calls or Kafka messages — so each can be updated or scaled independently.
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Clock size={20} className="text-blue-400" />
                  <h4>What if Razorpay pings us twice?</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Payment gateways retry their notifications if they don&apos;t hear back fast enough. Without protection, you could get charged twice for one booking.
                  </p>
                  <ul>
                    <li>
                      Every webhook is cryptographically signed. We verify the signature before trusting anything Razorpay sends.
                    </li>
                    <li>
                      Before confirming a payment, we check: &ldquo;have we already seen this payment ID?&rdquo; If yes, we silently ignore the duplicate and reply OK — no double charge, no duplicate ticket.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick API & Topic Reference */}
            <div className="reference-box">
              <h4>Kafka Topics & Event Contracts</h4>
              <div className="table-responsive">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Producer</th>
                      <th>Consumer</th>
                      <th>Key Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>payment-requested</code></td>
                      <td>Booking Service</td>
                      <td>Payment Service</td>
                      <td>Signals that a seat hold is established and payment gateway order should be provisioned.</td>
                    </tr>
                    <tr>
                      <td><code>payment-status</code></td>
                      <td>Payment Service</td>
                      <td>Booking Service</td>
                      <td>Carries payment outcome (SUCCESS / FAILED) to finalize booking state machine.</td>
                    </tr>
                    <tr>
                      <td><code>seat-status</code></td>
                      <td>Inventory Service</td>
                      <td>Event Stream / Analytics</td>
                      <td>(Optional) Broadcasts live seat occupancy changes for venue heatmaps.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA / Return to Shows */}
        <section className="arch-bottom-cta">
          <div>
            <h3>Ready to see the live system in action?</h3>
            <p>Experience real-time seat reservation, atomic hold countdowns, and instant checkout.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/dashboard" className="btn primary flex-center" style={{ gap: "0.5rem" }}>
              <span>Open Dashboard</span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/" className="btn">
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      {/* FULLSCREEN LIGHTBOX FOR EXCALIDRAW DIAGRAM */}
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-bar">
              <div className="lightbox-title">
                <Layers size={18} className="text-amber-400" />
                <span>Seat Saga System Design &bull; Excalidraw Architecture Blueprint</span>
              </div>
              <button className="close-btn" onClick={() => setIsLightboxOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="lightbox-content">
              <Image
                src="/architecture-diagram.png"
                alt="Architecture Blueprint Fullscreen"
                width={3840}
                height={2160}
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
                priority
                unoptimized
              />
            </div>
            <div className="lightbox-footer">
              <span>Press ESC or click anywhere outside to close</span>
              <a href="/architecture-diagram.png" download="seatsaga-architecture.png" className="btn-download">
                Download High-Res Image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN MODAL FOR MERMAID DIAGRAM */}
      {isMermaidFullscreen && (
        <div className="lightbox-overlay" onClick={() => setIsMermaidFullscreen(false)}>
          <div className="lightbox-modal full-chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-bar">
              <div className="lightbox-title">
                <Code2 size={18} className="text-amber-400" />
                <span>Seat Saga Topology &bull; Fullscreen Mermaid Blueprint</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  className="zoom-btn"
                  onClick={() => setMermaidZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
                >
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-label">{Math.round(mermaidZoom * 100)}%</span>
                <button
                  className="zoom-btn"
                  onClick={() => setMermaidZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                >
                  <ZoomIn size={16} />
                </button>
                <button className="close-btn" onClick={() => setIsMermaidFullscreen(false)}>
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>
            <div className="lightbox-content chart-fullscreen-content">
              <div
                className="mermaid-svg-container"
                style={{
                  transform: `scale(${mermaidZoom})`,
                  transformOrigin: "top center",
                }}
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .arch-root {
          min-height: 100vh;
          background: #050505;
          color: #ecebe6;
          font-family: var(--font-body, system-ui, sans-serif);
        }

        .arch-main {
          max-width: 1320px;
          margin: 0 auto;
          padding: 3rem 1.5rem 6rem;
        }

        .arch-hero {
          text-align: center;
          margin-bottom: 2.5rem;
          padding: 3.5rem 1rem 2rem;
        }

        .arch-title {
          font-family: var(--font-display, serif);
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 500;
          letter-spacing: -0.02em;
          margin: 0 auto 1rem;
          line-height: 1.1;
          max-width: none;
          width: 100%;
          text-align: center;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          background: rgba(255, 196, 107, 0.08);
          border: 1px solid rgba(255, 196, 107, 0.25);
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #ffc46b;
          margin-bottom: 1.25rem;
          letter-spacing: 0.03em;
        }

        .arch-subtitle {
          max-width: 780px;
          margin: 0 auto 2.5rem;
          color: #999;
          font-size: 1.05rem;
          line-height: 1.6;
        }

        .arch-tabs {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #111;
          padding: 0.35rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
          justify-content: center;
        }

        .arch-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #aaa;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .arch-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }

        .arch-tab-btn.active {
          background: #202020;
          color: #ffc46b;
          border: 1px solid rgba(255, 196, 107, 0.25);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        /* MERMAID SECTION */
        .mermaid-section {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        /* TOOLBAR */
        .diagram-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .playback-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .step-nav-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .step-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #161616;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
        }

        .step-number {
          color: #ffc46b;
          font-weight: 600;
          white-space: nowrap;
        }

        .step-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #666;
        }

        .step-label {
          color: #ccc;
          font-weight: 500;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 640px) {
          .step-label {
            display: none;
          }
        }

        .canvas-controls {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .sub-toggle-group {
          display: flex;
          background: #181818;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.2rem;
        }

        .sub-toggle-btn {
          background: transparent;
          border: none;
          color: #888;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sub-toggle-btn.active {
          background: #282828;
          color: #ffc46b;
        }

        .zoom-group {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: #181818;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.2rem 0.4rem;
        }

        .zoom-btn {
          background: transparent;
          border: none;
          color: #aaa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .zoom-btn:hover {
          color: #fff;
          background: #252525;
        }

        .zoom-label {
          font-size: 0.78rem;
          color: #ffc46b;
          min-width: 44px;
          text-align: center;
          font-weight: 600;
        }

        .sim-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          background: #181818;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ddd;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sim-btn:hover:not(:disabled) {
          background: #252525;
          color: #fff;
        }

        .sim-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .primary-sim-btn {
          background: #ffc46b;
          color: #000;
          border-color: #ffc46b;
          font-weight: 600;
        }

        .primary-sim-btn:hover:not(:disabled) {
          background: #ffd699;
          color: #000;
        }

        .primary-sim-btn.playing {
          background: #e0a347;
        }

        .reset-btn {
          padding: 0.45rem;
        }

        .copy-btn {
          font-size: 0.8rem;
          padding: 0.4rem 0.7rem;
        }

        /* LIVE STEP BANNER */
        .live-step-banner {
          background: #121214;
          border: 1px solid rgba(255, 196, 107, 0.25);
          border-radius: 10px;
          padding: 0.85rem 1.25rem;
          margin: 1rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .live-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffc46b;
          box-shadow: 0 0 12px #ffc46b;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        .banner-title {
          font-size: 0.88rem;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .protocol-badge {
          font-size: 0.7rem;
          background: rgba(255, 196, 107, 0.12);
          border: 1px solid rgba(255, 196, 107, 0.3);
          color: #ffc46b;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .banner-plain {
          font-size: 0.82rem;
          color: #aaa;
          margin-top: 0.2rem;
        }

        .mini-payload code {
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #86efac;
          font-family: monospace;
          white-space: nowrap;
        }

        /* INTERACTIVE MERMAID VIEWPORT */
        .mermaid-interactive-viewport {
          background: #08080a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          height: 720px;
          position: relative;
          overflow: hidden;
          cursor: grab;
          user-select: none;
        }

        .mermaid-interactive-viewport.is-dragging {
          cursor: grabbing;
        }

        .viewport-overlay-hint {
          position: absolute;
          bottom: 12px;
          right: 14px;
          background: rgba(18, 18, 18, 0.85);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.72rem;
          color: #777;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          z-index: 10;
          pointer-events: none;
        }

        .mermaid-stage {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 2rem;
        }

        .mermaid-svg-container {
          display: inline-block;
          max-width: none;
          image-rendering: crisp-edges;
          -webkit-font-smoothing: antialiased;
        }

        .mermaid-svg-container :global(svg) {
          max-width: none !important;
          height: auto !important;
          shape-rendering: geometricPrecision;
          text-rendering: optimizeLegibility;
        }

        /* SVG ACTIVE NODE HIGHLIGHT */
        .mermaid-svg-container :global(.mermaid-flow-active) {
          filter: drop-shadow(0 0 16px rgba(255, 196, 107, 0.85)) !important;
        }

        .mermaid-svg-container :global(.mermaid-flow-active rect),
        .mermaid-svg-container :global(.mermaid-flow-active polygon),
        .mermaid-svg-container :global(.mermaid-flow-active path) {
          stroke: #ffc46b !important;
          stroke-width: 3.5px !important;
          stroke-dasharray: 6 3;
          animation: march-ants 1.2s linear infinite !important;
        }

        @keyframes march-ants {
          to {
            stroke-dashoffset: -18;
          }
        }

        .mermaid-loader {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #888;
          font-size: 0.9rem;
        }

        .arch-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255, 196, 107, 0.15);
          border-top-color: #ffc46b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .mermaid-error-box {
          padding: 2rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          color: #ffb3ba;
          font-size: 0.9rem;
        }

        .code-viewer {
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }

        .code-bar {
          background: #181818;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #888;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mermaid-pre {
          padding: 1.25rem;
          margin: 0;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.82rem;
          line-height: 1.5;
          color: #86efac;
          max-height: 520px;
        }

        /* DOTS */
        .sim-dots-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.5rem;
          margin: 1.5rem 0 1.25rem;
        }

        .sim-dot {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .sim-dot:hover {
          background: #1c1c1c;
        }

        .sim-dot.active {
          background: rgba(255, 196, 107, 0.08);
          border-color: #ffc46b;
        }

        .sim-dot.completed .dot-number {
          background: #10b981;
          color: #000;
        }

        .dot-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #262626;
          color: #aaa;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .sim-dot.active .dot-number {
          background: #ffc46b;
          color: #000;
        }

        .dot-label {
          font-size: 0.72rem;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .sim-dot.active .dot-label {
          color: #ddd;
          font-weight: 500;
        }

        /* STEP EXPLANATORY CARD */
        .step-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          background: #121212;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
        }

        @media (max-width: 768px) {
          .step-card {
            grid-template-columns: 1fr;
          }
          .divider-left {
            border-left: none !important;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 1.5rem;
            padding-left: 0 !important;
          }
        }

        .divider-left {
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          padding-left: 1.5rem;
        }

        .col-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .col-header h5 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .plain-text {
          font-size: 0.92rem;
          color: #ccc;
          line-height: 1.6;
        }

        .tech-text {
          font-size: 0.88rem;
          color: #aaa;
          line-height: 1.55;
          margin-bottom: 1rem;
        }

        .payload-box {
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 0.75rem;
        }

        .payload-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: #666;
          font-weight: 600;
          letter-spacing: 0.04em;
          margin-bottom: 0.35rem;
        }

        .payload-box pre {
          margin: 0;
          font-family: monospace;
          font-size: 0.78rem;
          color: #ffc46b;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        /* EXCALIDRAW SECTION */
        .excalidraw-section {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .excali-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-family: var(--font-display, serif);
          font-size: 1.6rem;
          color: #fff;
          margin: 0 0 0.4rem;
        }

        .section-sub {
          color: #888;
          font-size: 0.95rem;
          max-width: 700px;
          margin: 0;
          line-height: 1.5;
        }

        .diagram-frame {
          position: relative;
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          margin-bottom: 2.5rem;
          transition: border-color 0.2s ease;
        }

        .diagram-frame:hover {
          border-color: #ffc46b;
        }

        .frame-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
          font-size: 0.9rem;
          font-weight: 500;
          color: #fff;
          backdrop-filter: blur(2px);
        }

        .diagram-frame:hover .frame-overlay {
          opacity: 1;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1rem;
        }

        .pillar-card {
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 1.25rem;
          transition: transform 0.2s ease;
        }

        .pillar-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .pillar-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.9rem;
        }

        .auth-icon { background: rgba(99, 102, 241, 0.12); color: #818cf8; }
        .inv-icon { background: rgba(16, 185, 129, 0.12); color: #34d399; }
        .book-icon { background: rgba(59, 130, 246, 0.12); color: #60a5fa; }
        .kafka-icon { background: rgba(168, 85, 247, 0.12); color: #c084fc; }
        .pay-icon { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }

        .pillar-card h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin: 0 0 0.5rem;
        }

        .pillar-card p {
          font-size: 0.8rem;
          color: #888;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .pillar-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .pillar-tags span {
          font-size: 0.68rem;
          background: #1f1f1f;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          color: #aaa;
        }

        /* TECH SECTION */
        .tech-section {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.25rem;
          margin: 2rem 0;
        }

        .tech-card {
          background: #121212;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .tech-card-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .tech-card-header h4 {
          font-size: 1.05rem;
          color: #fff;
          margin: 0;
          font-weight: 600;
        }

        .tech-card-body p {
          font-size: 0.88rem;
          color: #999;
          line-height: 1.6;
          margin-bottom: 0.8rem;
        }

        .tech-card-body ul {
          margin: 0;
          padding-left: 1.2rem;
          font-size: 0.85rem;
          color: #bbb;
          line-height: 1.6;
        }

        .tech-card-body li {
          margin-bottom: 0.5rem;
        }

        .tech-card-body code {
          font-size: 0.78rem;
          background: #1a1a1a;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          color: #ffc46b;
        }

        .dim-note {
          font-size: 0.8rem !important;
          color: #777 !important;
          margin-top: 0.8rem;
        }

        .reference-box {
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .reference-box h4 {
          font-size: 1.05rem;
          color: #fff;
          margin: 0 0 1rem;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .ref-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .ref-table th {
          text-align: left;
          padding: 0.6rem 0.8rem;
          background: #1a1a1a;
          color: #aaa;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ref-table td {
          padding: 0.75rem 0.8rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: #ccc;
        }

        .ref-table code {
          background: rgba(168, 85, 247, 0.1);
          color: #c084fc;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.78rem;
        }

        /* BOTTOM CTA */
        .arch-bottom-cta {
          margin-top: 4rem;
          background: linear-gradient(180deg, #121212 0%, #090909 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .arch-bottom-cta h3 {
          font-family: var(--font-display, serif);
          font-size: 1.5rem;
          color: #fff;
          margin: 0 0 0.35rem;
        }

        .arch-bottom-cta p {
          color: #888;
          font-size: 0.95rem;
          margin: 0;
        }

        /* LIGHTBOX & FULLSCREEN MODALS */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .lightbox-modal {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          width: 100%;
          max-width: 1300px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        }

        .full-chart-modal {
          max-width: 95vw;
          height: 94vh;
        }

        .chart-fullscreen-content {
          flex: 1;
          overflow: auto !important;
          padding: 2rem !important;
          background: #08080a !important;
          display: block !important;
          text-align: center;
        }

        .lightbox-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #161616;
        }

        .lightbox-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.3rem;
          border-radius: 6px;
        }

        .close-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .lightbox-content {
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .lightbox-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: #161616;
          font-size: 0.8rem;
          color: #777;
        }

        .btn-download {
          color: #ffc46b;
          text-decoration: none;
          font-weight: 500;
        }

        .btn-download:hover {
          text-decoration: underline;
        }

        .flex-center {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
