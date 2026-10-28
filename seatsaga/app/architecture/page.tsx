"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
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
  X,
  Clock,
  Sparkles,
  Info,
  ExternalLink,
} from "lucide-react";

interface FlowStep {
  step: number;
  title: string;
  source: string;
  target: string;
  medium: "HTTP API" | "Kafka Topic" | "Redis Command" | "Webhook";
  plainEnglish: string;
  technicalDetails: string;
  activeNodes: string[];
  payloadPreview: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    step: 1,
    title: "1. Seat Selection & Availability Check",
    source: "Frontend (Next.js)",
    target: "Inventory Service",
    medium: "HTTP API",
    plainEnglish:
      "When you tap a seat on the venue map, your browser immediately asks the Inventory Service if that seat is still available in real-time.",
    technicalDetails:
      "Frontend sends GET /api/inventory/events/{id}/seats to Inventory Service. Inventory queries Inventory DB (Postgres) and active Redis TTL hold keys to filter out currently held seats.",
    activeNodes: ["frontend", "inventory", "inventory-db"],
    payloadPreview: "GET /api/inventory/events/ev_8821/seats\nResponse: 200 OK [{ id: 'A-12', status: 'AVAILABLE', price: 1800 }]",
  },
  {
    step: 2,
    title: "2. Atomic Seat Hold with 10-Minute Redis TTL",
    source: "Booking Service",
    target: "Inventory Service & Redis",
    medium: "Redis Command",
    plainEnglish:
      "Seat Saga locks your chosen seat for exactly 10 minutes. If someone else tries to pick it right now, it shows as locked. If you close your tab or walk away, it automatically releases back to the crowd.",
    technicalDetails:
      "Inventory Service sets an atomic Redis key: SET hold:seat:A-12 'booking_user_992' EX 600 NX. The database flags seat status to 'HELD' with an expires_at timestamp.",
    activeNodes: ["inventory", "redis", "inventory-db"],
    payloadPreview: "SET hold:seat:A-12 \"usr_491\" EX 600 NX\nStatus: HELD (Expires in 600 seconds)",
  },
  {
    step: 3,
    title: "3. Saga Booking Creation (PAYMENT_PENDING)",
    source: "Frontend (Next.js)",
    target: "Booking Service",
    medium: "HTTP API",
    plainEnglish:
      "A booking record is created in a 'Pending' state. The system locks down your order specifications while waiting for payment authorization.",
    technicalDetails:
      "Frontend calls POST /api/bookings with eventId, seatIds, and user token. Booking Service creates a Booking entity in Booking DB with status 'PAYMENT_PENDING'.",
    activeNodes: ["frontend", "booking", "booking-db"],
    payloadPreview: "POST /api/bookings\n{\n  \"eventId\": \"ev_8821\",\n  \"seats\": [\"A-12\"],\n  \"status\": \"PAYMENT_PENDING\"\n}",
  },
  {
    step: 4,
    title: "4. Asynchronous Event Dispatch (payment-requested)",
    source: "Booking Service",
    target: "Kafka Event Bus -> Payment Service",
    medium: "Kafka Topic",
    plainEnglish:
      "Instead of slowing down your browser, the Booking Service drops an asynchronous ticket into Kafka. The Payment Service instantly catches this event to prepare your checkout.",
    technicalDetails:
      "Booking Service publishes a SeatHeldEvent message to Kafka topic 'payment-requested'. Kafka partitions guarantee order per bookingId. Payment Service consumer reads the event.",
    activeNodes: ["booking", "kafka", "payment"],
    payloadPreview: "TOPIC: payment-requested\n{\n  \"bookingId\": \"bk_9103\",\n  \"amount\": 1800,\n  \"currency\": \"INR\",\n  \"userEmail\": \"fan@seatsaga.com\"\n}",
  },
  {
    step: 5,
    title: "5. Razorpay Gateway Order Initialization",
    source: "Payment Service",
    target: "Razorpay (External Gateway)",
    medium: "HTTP API",
    plainEnglish:
      "Payment Service talks to Razorpay to generate a secure payment order ID. Your screen displays the official payment popup with UPI, Cards, and Netbanking.",
    technicalDetails:
      "Payment Service invokes Razorpay Orders API: orders.create({ amount: 180000, currency: 'INR', receipt: 'bk_9103' }). Client initializes Razorpay checkout modal with order_id.",
    activeNodes: ["payment", "payment-db", "razorpay", "frontend"],
    payloadPreview: "POST https://api.razorpay.com/v1/orders\nResponse: { id: 'order_Nx8Y39', status: 'created', amount: 180000 }",
  },
  {
    step: 6,
    title: "6. Payment Webhook & Cryptographic Verification",
    source: "Razorpay (External Gateway)",
    target: "Payment Service",
    medium: "Webhook",
    plainEnglish:
      "Once you approve the payment on your UPI app or bank, Razorpay cryptographically notifies our backend that the funds were captured safely.",
    technicalDetails:
      "Razorpay triggers POST /api/payments/webhook with payload and x-razorpay-signature header. Payment Service verifies HMAC-SHA256 signature, records payment in Payment DB, and flags status 'CAPTURED'.",
    activeNodes: ["razorpay", "payment", "payment-db"],
    payloadPreview: "POST /api/payments/webhook\nHeader: x-razorpay-signature: e3b0c44298fc1c149...\nEvent: payment.captured (₹1,800.00)",
  },
  {
    step: 7,
    title: "7. Kafka Broadcast (payment-status) & Ticket Issuance",
    source: "Payment Service",
    target: "Kafka -> Booking Service -> Frontend",
    medium: "Kafka Topic",
    plainEnglish:
      "Payment Service broadcasts a 'SUCCESS' event to Kafka. Booking Service consumes it, marks your ticket as CONFIRMED, and your browser instantly displays your ticket stub with zero delay!",
    technicalDetails:
      "Payment Service publishes PaymentStatusEvent to topic 'payment-status'. Booking Service updates Booking status to 'CONFIRMED'. Frontend polling (or SSE) detects the confirmation and renders the celebration ticket.",
    activeNodes: ["payment", "kafka", "booking", "booking-db", "frontend"],
    payloadPreview: "TOPIC: payment-status\n{\n  \"bookingId\": \"bk_9103\",\n  \"paymentId\": \"pay_891\",\n  \"status\": \"SUCCESS\"\n}\n=> BOOKING CONFIRMED",
  },
];

const MERMAID_DIAGRAM_CODE = `flowchart TD
  classDef client fill:#18181b,stroke:#a1a1aa,stroke-width:1.5px,color:#fff;
  classDef service fill:#121826,stroke:#38bdf8,stroke-width:2px,color:#fff;
  classDef database fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#fff;
  classDef cache fill:#290d15,stroke:#f43f5e,stroke-width:2px,color:#fff;
  classDef queue fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#fff;
  classDef external fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff;

  User([User / Browser]):::client
  Frontend[Next.js App Client]:::client

  subgraph Microservices [Spring Boot Microservices]
    Auth[Auth Service\\nSpring Boot]:::service
    Inventory[Inventory Service\\nSpring Boot]:::service
    Booking[Booking Service\\nSpring Boot]:::service
    Payment[Payment Service\\nSpring Boot]:::service
  end

  subgraph DataStores [Database Per Service]
    AuthDB[(Auth DB\\nPostgres)]:::database
    InventoryDB[(Inventory DB\\nPostgres)]:::database
    Redis[(Redis Cache\\nHold Expiry TTL)]:::cache
    BookingDB[(Booking DB\\nPostgres)]:::database
    PaymentDB[(Payment DB\\nPostgres)]:::database
  end

  subgraph MessageBroker [Kafka Event Bus]
    TopicRequested[[Topic: payment-requested]]:::queue
    TopicStatus[[Topic: payment-status]]:::queue
    TopicSeat[[Topic: seat-status (opt)]]:::queue
  end

  Gateway([External Razorpay Gateway]):::external

  %% Client Flow
  User -->|Login / JWT| Auth
  User -->|Browse & Pick Seats| Frontend
  Frontend -->|Event & Seat Details| Inventory
  Frontend -->|Create Booking| Booking
  Frontend -->|Checkout Popup| Payment

  %% Microservices to DB
  Auth <--> AuthDB
  Inventory <--> InventoryDB
  Inventory <--> Redis
  Booking <--> BookingDB
  Payment <--> PaymentDB

  %% Inter-service
  Booking -->|Hold Seat API| Inventory
  Booking -->|Publish payment-requested| TopicRequested
  TopicRequested -->|Consume| Payment
  Payment -->|Publish payment-status| TopicStatus
  TopicStatus -->|Consume| Booking

  %% Payment Gateway
  Payment <-->|Create Order / Webhook| Gateway
`;

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "excalidraw" | "tech" | "mermaid">("simulator");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  const currentStep = FLOW_STEPS[currentStepIndex];

  // Auto-play interval for simulator
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
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(MERMAID_DIAGRAM_CODE);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const isNodeActive = (nodeKey: string) => {
    return currentStep.activeNodes.includes(nodeKey);
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
          <div className="badge-pill">
            <Sparkles size={14} className="text-amber-400" />
            <span>Under The Hood &bull; System Design</span>
          </div>
          <h1 className="arch-title">Seat Saga Architecture</h1>
          <p className="arch-subtitle">
            How Seat Saga guarantees zero-overselling, handles high-concurrency ticket drops, and completes transactions
            using Spring Boot microservices, Redis atomic TTL holds, and Kafka event-driven Saga choreography.
          </p>

          {/* Navigation Tabs */}
          <div className="arch-tabs">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`arch-tab-btn ${activeTab === "simulator" ? "active" : ""}`}
            >
              <Zap size={16} />
              <span>Live Flow Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab("excalidraw")}
              className={`arch-tab-btn ${activeTab === "excalidraw" ? "active" : ""}`}
            >
              <Layers size={16} />
              <span>Excalidraw Blueprint</span>
            </button>
            <button
              onClick={() => setActiveTab("tech")}
              className={`arch-tab-btn ${activeTab === "tech" ? "active" : ""}`}
            >
              <Server size={16} />
              <span>Microservices Spec</span>
            </button>
            <button
              onClick={() => setActiveTab("mermaid")}
              className={`arch-tab-btn ${activeTab === "mermaid" ? "active" : ""}`}
            >
              <Code2 size={16} />
              <span>Mermaid Diagram</span>
            </button>
          </div>
        </section>

        {/* TAB 1: LIVE INTERACTIVE FLOW SIMULATOR */}
        {activeTab === "simulator" && (
          <section className="simulator-section">
            {/* Simulator Controls & Progress Header */}
            <div className="sim-control-bar">
              <div className="sim-step-indicator">
                <span className="step-count">
                  Step {currentStep.step} of {FLOW_STEPS.length}
                </span>
                <span className="step-name">{currentStep.title}</span>
              </div>

              <div className="sim-actions">
                <button
                  className="sim-btn"
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  title="Previous Step"
                >
                  <ChevronLeft size={18} />
                  <span>Prev</span>
                </button>

                <button
                  className={`sim-btn primary-sim-btn ${isPlaying ? "playing" : ""}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  <span>{isPlaying ? "Pause Flow" : "Play Flow"}</span>
                </button>

                <button
                  className="sim-btn"
                  onClick={() => setCurrentStepIndex((prev) => Math.min(FLOW_STEPS.length - 1, prev + 1))}
                  disabled={currentStepIndex === FLOW_STEPS.length - 1}
                  title="Next Step"
                >
                  <span>Next</span>
                  <ChevronRight size={18} />
                </button>

                <button
                  className="sim-btn reset-btn"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(0);
                  }}
                  title="Reset to Step 1"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Stepper Dots Bar */}
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

            {/* Visual Interactive Architecture Diagram Canvas */}
            <div className="visual-canvas">
              <div className="canvas-header">
                <div className="canvas-legend">
                  <span className="legend-tag active-legend">
                    <span className="indicator-pulse" /> Active Node in Current Step
                  </span>
                  <span className="legend-tag">
                    <span className="indicator-idle" /> Idle Node
                  </span>
                </div>
                <div className="medium-pill">
                  <span>Protocol:</span> <strong>{currentStep.medium}</strong>
                </div>
              </div>

              {/* Grid of Microservices & Components */}
              <div className="nodes-network">
                {/* 1. Client / Frontend */}
                <div className={`arch-node node-frontend ${isNodeActive("frontend") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge">Client</span>
                    <h4>Next.js Frontend</h4>
                  </div>
                  <p className="node-desc">Browse, pick seats, hold timer & checkout modal</p>
                  <div className="node-footer">Port 3000 &bull; React 19</div>
                </div>

                {/* 2. Auth Service */}
                <div className={`arch-node node-auth ${isNodeActive("auth") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge auth-badge">Security</span>
                    <h4>Auth Service</h4>
                  </div>
                  <p className="node-desc">JWT validation, user registration & session tokens</p>
                  <div className="node-db-link">
                    <Database size={12} />
                    <span>Auth DB (Postgres)</span>
                  </div>
                </div>

                {/* 3. Inventory Service */}
                <div className={`arch-node node-inventory ${isNodeActive("inventory") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge inv-badge">Catalog</span>
                    <h4>Inventory Service</h4>
                  </div>
                  <p className="node-desc">Seat layout, tier prices, real-time availability</p>
                  <div className="node-storages">
                    <div className="storage-chip db-chip">
                      <Database size={12} />
                      <span>Inventory DB</span>
                    </div>
                    <div className={`storage-chip redis-chip ${isNodeActive("redis") ? "glow-redis" : ""}`}>
                      <Clock size={12} />
                      <span>Redis 10m TTL</span>
                    </div>
                  </div>
                </div>

                {/* 4. Booking Service */}
                <div className={`arch-node node-booking ${isNodeActive("booking") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge book-badge">Saga Coordinator</span>
                    <h4>Booking Service</h4>
                  </div>
                  <p className="node-desc">State machine: PENDING &rarr; CONFIRMED / CANCELLED</p>
                  <div className="node-db-link">
                    <Database size={12} />
                    <span>Booking DB (Postgres)</span>
                  </div>
                </div>

                {/* 5. Kafka Message Broker */}
                <div className={`arch-node node-kafka ${isNodeActive("kafka") ? "is-active glow-kafka" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge kafka-badge">Message Broker</span>
                    <h4>Apache Kafka</h4>
                  </div>
                  <div className="kafka-topics">
                    <div className="topic-line">
                      <span>Topic:</span> <code>payment-requested</code>
                    </div>
                    <div className="topic-line">
                      <span>Topic:</span> <code>payment-status</code>
                    </div>
                  </div>
                </div>

                {/* 6. Payment Service */}
                <div className={`arch-node node-payment ${isNodeActive("payment") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge pay-badge">Payments</span>
                    <h4>Payment Service</h4>
                  </div>
                  <p className="node-desc">Razorpay order generation & webhook signatures</p>
                  <div className="node-db-link">
                    <Database size={12} />
                    <span>Payment DB (Postgres)</span>
                  </div>
                </div>

                {/* 7. External Razorpay */}
                <div className={`arch-node node-razorpay ${isNodeActive("razorpay") ? "is-active" : ""}`}>
                  <div className="node-head">
                    <span className="node-badge external-badge">Gateway</span>
                    <h4>Razorpay Gateway</h4>
                  </div>
                  <p className="node-desc">UPI, credit cards, bank approval & signature</p>
                  <div className="node-footer">External Partner API</div>
                </div>
              </div>

              {/* Step Explanatory Card (Dual Tone: Plain English + Technical) */}
              <div className="step-card">
                <div className="step-card-col">
                  <div className="col-header">
                    <Info size={16} className="text-amber-400" />
                    <h5>Simple English (For Curious Users)</h5>
                  </div>
                  <p className="plain-text">{currentStep.plainEnglish}</p>
                </div>

                <div className="step-card-col divider-left">
                  <div className="col-header">
                    <Code2 size={16} className="text-emerald-400" />
                    <h5>Engineering Details (For Developers)</h5>
                  </div>
                  <p className="tech-text">{currentStep.technicalDetails}</p>

                  <div className="payload-box">
                    <div className="payload-title">Live Message / Payload:</div>
                    <pre><code>{currentStep.payloadPreview}</code></pre>
                  </div>
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
                <h3 className="section-title">Original Excalidraw Architectural Sketch</h3>
                <p className="section-sub">
                  The verified system design diagram showing microservices, databases, Redis hold TTL, Kafka event topics,
                  and external Razorpay webhooks.
                </p>
              </div>
              <button onClick={() => setIsLightboxOpen(true)} className="btn primary flex-center" style={{ gap: "0.5rem" }}>
                <Maximize2 size={16} />
                <span>Expand Fullscreen</span>
              </button>
            </div>

            {/* Embedded Diagram Image */}
            <div className="diagram-frame" onClick={() => setIsLightboxOpen(true)}>
              <Image
                src="/seat-saga-excli-1.png"
                alt="Seat Saga Excalidraw Architecture Diagram"
                width={1400}
                height={700}
                style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: "12px" }}
                priority
              />
              <div className="frame-overlay">
                <span>Click anywhere to inspect in high definition</span>
              </div>
            </div>

            {/* 5 Architecture Pillars Breakdown */}
            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon auth-icon">
                  <ShieldCheck size={20} />
                </div>
                <h4>1. Auth Service</h4>
                <p>
                  Spring Boot microservice dedicated to secure user registration, password hashing, and stateless JWT token issuance.
                  Maintains its own isolated PostgreSQL database.
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
                <h4>2. Inventory & Redis Lock</h4>
                <p>
                  Manages venues, events, seat tiers, and availability. Uses Redis with an atomic TTL (Time To Live) to lock seats for 10 minutes,
                  completely preventing race conditions and double bookings.
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
                <h4>3. Booking Service (Saga)</h4>
                <p>
                  Orchestrates the Saga lifecycle. Coordinates seat reservation with Inventory, creates orders in PENDING status, and waits for
                  Kafka payment confirmation before issuing confirmed tickets.
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
                <h4>4. Kafka Event Bus</h4>
                <p>
                  Decouples synchronous service calls into resilient event streams. Topics <code>payment-requested</code> and <code>payment-status</code> ensure
                  fault tolerance: if a service experiences temporary downtime, events are safely queued.
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
                <h4>5. Payment & Webhooks</h4>
                <p>
                  Integrates with Razorpay. Creates transaction records in Payment DB, receives asynchronous webhook notifications from the bank,
                  verifies HMAC signatures, and broadcasts confirmation back to Kafka.
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
            <h3 className="section-title">Technical Specifications & Engineering Decisions</h3>
            <p className="section-sub">
              Detailed breakdown of concurrency guarantees, database architecture, failure modes, and distributed transaction handling.
            </p>

            <div className="tech-grid">
              {/* Card 1: Race Condition & Double Booking Prevention */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <ShieldCheck size={20} className="text-amber-400" />
                  <h4>How Race Conditions Are Prevented</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    When a hot concert goes on sale, 5,000 fans may click on the exact same VIP front-row seat at the exact same millisecond.
                    Seat Saga solves this using a two-tier lock:
                  </p>
                  <ul>
                    <li>
                      <strong>Fast Redis Atomic Hold:</strong> Using <code>SET hold:seat:{`{seatId}`} {`{userId}`} EX 600 NX</code>. The <code>NX</code> flag ensures that only the very first atomic operation succeeds. All other 4,999 requests receive an immediate <code>409 Conflict</code> without touching the primary database.
                    </li>
                    <li>
                      <strong>Auto-Eviction:</strong> If the user closes their laptop or their card fails, the 600-second (10-minute) Redis key naturally expires. No manual cron or sticky cleanup job required.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 2: Saga Pattern vs 2-Phase Commit */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Zap size={20} className="text-purple-400" />
                  <h4>Why Choreographed Saga Over 2PC?</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Traditional Two-Phase Commit (2PC) locks database tables across multiple servers until all participants agree, creating massive latency bottlenecks and single points of failure.
                  </p>
                  <ul>
                    <li>
                      <strong>Asynchronous Kafka Messaging:</strong> Booking Service and Payment Service communicate purely through event logs.
                    </li>
                    <li>
                      <strong>Compensating Transactions:</strong> If Payment fails or times out, the Booking Service receives a failure event and triggers a compensating action: it invokes Inventory Service to release the seat immediately so the next fan can buy it.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 3: Database-Per-Service Pattern */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Database size={20} className="text-emerald-400" />
                  <h4>Database-Per-Service Isolation</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Each microservice operates on its own dedicated PostgreSQL database instance:
                  </p>
                  <ul>
                    <li><code>auth_db</code>: User credentials, password salts, roles.</li>
                    <li><code>inventory_db</code>: Venues, shows, seat rows, seat status enum.</li>
                    <li><code>booking_db</code>: Booking entities, user ownership, Saga status.</li>
                    <li><code>payment_db</code>: Razorpay transaction IDs, currency, captured timestamps.</li>
                  </ul>
                  <p className="dim-note">
                    Zero cross-database foreign keys. Services only communicate via clear REST contracts or Kafka event streams, allowing independent schema migrations and scaling.
                  </p>
                </div>
              </div>

              {/* Card 4: Idempotency & Network Retries */}
              <div className="tech-card">
                <div className="tech-card-header">
                  <Clock size={20} className="text-blue-400" />
                  <h4>Idempotent Payment Webhooks</h4>
                </div>
                <div className="tech-card-body">
                  <p>
                    Payment gateways frequently retry webhooks if network latency exceeds 2 seconds. Seat Saga ensures fans are never double-billed:
                  </p>
                  <ul>
                    <li>
                      Every incoming Razorpay webhook payload is validated using HMAC SHA-256 against the secret key.
                    </li>
                    <li>
                      Payment records check for existing <code>razorpay_payment_id</code> before committing. If already processed, the service returns <code>200 OK</code> immediately without re-triggering Kafka events.
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

        {/* TAB 4: MERMAID DIAGRAM */}
        {activeTab === "mermaid" && (
          <section className="mermaid-section">
            <div className="mermaid-header">
              <div>
                <h3 className="section-title">Mermaid Architectural Blueprint</h3>
                <p className="section-sub">
                  Standard flowchart syntax representing all entities, services, databases, topics, and protocols.
                </p>
              </div>
              <button onClick={handleCopyMermaid} className="btn primary flex-center" style={{ gap: "0.5rem" }}>
                {copiedMermaid ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedMermaid ? "Copied Code!" : "Copy Mermaid Code"}</span>
              </button>
            </div>

            {/* Code Block Viewer */}
            <div className="code-viewer">
              <div className="code-bar">
                <span>Mermaid / Flowchart TD</span>
                <span className="code-lang">Text / Diagram Spec</span>
              </div>
              <pre className="mermaid-pre">
                <code>{MERMAID_DIAGRAM_CODE}</code>
              </pre>
            </div>

            <div className="mermaid-tip">
              <Info size={16} className="text-amber-400" />
              <span>
                Tip: You can paste this code directly into <a href="https://mermaid.live" target="_blank" rel="noreferrer" style={{ color: "var(--glow)", textDecoration: "underline" }}>mermaid.live</a> or GitHub markdown files to render interactive SVG diagrams automatically.
              </span>
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
                width={1920}
                height={1080}
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
                priority
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

      {/* STYLES */}
      <style jsx>{`
        .arch-root {
          min-height: 100vh;
          background: #050505;
          color: #ecebe6;
          font-family: var(--font-body, system-ui, sans-serif);
        }

        .arch-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 1.5rem 6rem;
        }

        .arch-hero {
          text-align: center;
          margin-bottom: 3.5rem;
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

        .arch-title {
          font-family: var(--font-display, serif);
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 500;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
          line-height: 1.1;
        }

        .arch-subtitle {
          max-width: 720px;
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

        /* SIMULATOR STYLES */
        .simulator-section {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .sim-control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sim-step-indicator {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .step-count {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #ffc46b;
        }

        .step-name {
          font-size: 1.2rem;
          font-weight: 600;
          color: #fff;
        }

        .sim-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .sim-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.9rem;
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
          padding: 0.5rem;
        }

        /* DOTS */
        .sim-dots-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.5rem;
          margin: 1.25rem 0 2rem;
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

        /* CANVAS & NODES */
        .visual-canvas {
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .canvas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .canvas-legend {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .legend-tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #777;
        }

        .active-legend {
          color: #ffc46b;
        }

        .indicator-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffc46b;
          box-shadow: 0 0 10px #ffc46b;
          animation: pulse 1.5s infinite;
        }

        .indicator-idle {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #333;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        .medium-pill {
          font-size: 0.8rem;
          background: #141414;
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #aaa;
        }

        .medium-pill strong {
          color: #ffc46b;
        }

        /* NODES GRID */
        .nodes-network {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .arch-node {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 1.1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .arch-node.is-active {
          border-color: #ffc46b;
          background: #191612;
          box-shadow: 0 0 24px rgba(255, 196, 107, 0.12), inset 0 0 12px rgba(255, 196, 107, 0.04);
          transform: translateY(-2px);
        }

        .node-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
        }

        .node-head h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .node-badge {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: #222;
          color: #aaa;
        }

        .auth-badge { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .inv-badge { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .book-badge { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .kafka-badge { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
        .pay-badge { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .external-badge { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .node-desc {
          font-size: 0.8rem;
          color: #888;
          line-height: 1.45;
          margin-bottom: 0.8rem;
        }

        .node-footer, .node-db-link {
          font-size: 0.72rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .node-storages {
          display: flex;
          gap: 0.5rem;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .storage-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: #181818;
          color: #888;
        }

        .redis-chip {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .glow-redis {
          border-color: #f43f5e !important;
          box-shadow: 0 0 10px rgba(244, 63, 94, 0.35);
        }

        .kafka-topics {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .topic-line {
          font-size: 0.7rem;
          color: #777;
        }

        .topic-line code {
          color: #c084fc;
          background: rgba(168, 85, 247, 0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
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
          padding: 1rem;
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

        /* MERMAID SECTION */
        .mermaid-section {
          background: #0d0d0d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .mermaid-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
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
          font-size: 0.85rem;
          line-height: 1.5;
          color: #a3e635;
        }

        .mermaid-tip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #888;
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

        /* LIGHTBOX */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
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

        .lightbox-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
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

