"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  RotateCcw,
  Zap,
  ShieldCheck,
  Server,
  Layers,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

// Custom Flow Node
interface SagaNodeData extends Record<string, unknown> {
  step: number;
  label: string;
  sublabel: string;
  badge: string;
  active: boolean;
  completed: boolean;
  iconName: "user" | "redis" | "saga" | "kafka" | "payment" | "ticket";
}

function SagaCustomNode({ data }: NodeProps<Node<SagaNodeData>>) {
  const getIcon = () => {
    switch (data.iconName) {
      case "user":
        return <Layers size={18} color="#ffc46b" />;
      case "redis":
        return <ShieldCheck size={18} color="#f59e0b" />;
      case "saga":
        return <Server size={18} color="#60a5fa" />;
      case "kafka":
        return <Zap size={18} color="#c084fc" />;
      case "payment":
        return <ExternalLink size={18} color="#34d399" />;
      case "ticket":
        return <CheckCircle2 size={18} color="#4ade80" />;
      default:
        return <Sparkles size={18} color="#ffc46b" />;
    }
  };

  const isCurrent = data.active;
  const isDone = data.completed;

  return (
    <div
      style={{
        width: 210,
        background: isCurrent ? "rgba(255, 196, 107, 0.12)" : "#111113",
        border: `1.5px solid ${
          isCurrent
            ? "#ffc46b"
            : isDone
            ? "rgba(74, 222, 128, 0.5)"
            : "rgba(255, 255, 255, 0.12)"
        }`,
        borderRadius: 12,
        padding: "12px 14px",
        color: "#fff",
        boxShadow: isCurrent
          ? "0 0 25px rgba(255, 196, 107, 0.4), 0 10px 25px rgba(0,0,0,0.8)"
          : "0 6px 16px rgba(0, 0, 0, 0.6)",
        transition: "all 0.3s ease",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: isCurrent ? "#ffc46b" : "#444",
          width: 8,
          height: 8,
          border: "none",
        }}
      />

      {/* Top Tag & Step Number */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: isCurrent ? "#ffc46b" : "#888",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          STEP 0{data.step}
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: isDone ? "#4ade80" : isCurrent ? "#ffc46b" : "#666",
            fontWeight: 600,
          }}
        >
          {isDone ? "✓ DONE" : data.badge}
        </span>
      </div>

      {/* Title & Icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {getIcon()}
        </div>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, lineHeight: 1.2 }}>
            {data.label}
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.6)", marginTop: 4 }}>
        {data.sublabel}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: isCurrent ? "#ffc46b" : "#444",
          width: 8,
          height: 8,
          border: "none",
        }}
      />
    </div>
  );
}

const INITIAL_NODES: Node<SagaNodeData>[] = [
  {
    id: "n1",
    type: "sagaNode",
    position: { x: 40, y: 140 },
    data: {
      step: 1,
      label: "Select Seat A-12",
      sublabel: "Browser tap on live seat map",
      badge: "FRONTEND",
      active: true,
      completed: false,
      iconName: "user",
    },
  },
  {
    id: "n2",
    type: "sagaNode",
    position: { x: 310, y: 60 },
    data: {
      step: 2,
      label: "Atomic Redis Hold",
      sublabel: "SETNX key with 10-min TTL",
      badge: "LOCK 600s",
      active: false,
      completed: false,
      iconName: "redis",
    },
  },
  {
    id: "n3",
    type: "sagaNode",
    position: { x: 310, y: 240 },
    data: {
      step: 3,
      label: "Booking Saga Service",
      sublabel: "Creates PAYMENT_PENDING order",
      badge: "SPRING BOOT",
      active: false,
      completed: false,
      iconName: "saga",
    },
  },
  {
    id: "n4",
    type: "sagaNode",
    position: { x: 590, y: 140 },
    data: {
      step: 4,
      label: "Kafka Event Stream",
      sublabel: "Topic: payment-requested",
      badge: "MESSAGING",
      active: false,
      completed: false,
      iconName: "kafka",
    },
  },
  {
    id: "n5",
    type: "sagaNode",
    position: { x: 860, y: 60 },
    data: {
      step: 5,
      label: "Razorpay Gateway",
      sublabel: "UPI / Card verified webhook",
      badge: "WEBHOOK",
      active: false,
      completed: false,
      iconName: "payment",
    },
  },
  {
    id: "n6",
    type: "sagaNode",
    position: { x: 860, y: 240 },
    data: {
      step: 6,
      label: "Kafka Status Outcome",
      sublabel: "Topic: payment-status SUCCESS",
      badge: "EVENT BUS",
      active: false,
      completed: false,
      iconName: "kafka",
    },
  },
  {
    id: "n7",
    type: "sagaNode",
    position: { x: 1140, y: 140 },
    data: {
      step: 7,
      label: "Ticket Confirmed",
      sublabel: "Instant QR entry issued",
      badge: "COMPLETE",
      active: false,
      completed: false,
      iconName: "ticket",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    animated: true,
    style: { stroke: "#ffc46b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ffc46b" },
  },
  {
    id: "e1-3",
    source: "n1",
    target: "n3",
    animated: true,
    style: { stroke: "#ffc46b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ffc46b" },
  },
  {
    id: "e2-4",
    source: "n2",
    target: "n4",
    animated: true,
    style: { stroke: "#f59e0b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
  },
  {
    id: "e3-4",
    source: "n3",
    target: "n4",
    animated: true,
    style: { stroke: "#60a5fa", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" },
  },
  {
    id: "e4-5",
    source: "n4",
    target: "n5",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#c084fc" },
  },
  {
    id: "e5-6",
    source: "n5",
    target: "n6",
    animated: true,
    style: { stroke: "#34d399", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#34d399" },
  },
  {
    id: "e6-7",
    source: "n6",
    target: "n7",
    animated: true,
    style: { stroke: "#4ade80", strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#4ade80" },
  },
];

export default function HomeReactFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SagaNodeData>>(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [simStep, setSimStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const nodeTypes = useMemo(() => ({ sagaNode: SagaCustomNode }), []);

  // Update active and completed flags on simulation step
  const updateNodesForStep = useCallback((step: number) => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          active: node.data.step === step,
          completed: node.data.step < step,
        },
      }))
    );
  }, [setNodes]);

  useEffect(() => {
    updateNodesForStep(simStep);
  }, [simStep, updateNodesForStep]);

  // Automated Flow Simulation playback
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimStep((prev) => {
          if (prev < 7) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return 1;
          }
        });
      }, 1600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const stepDescriptions = [
    "Fan discovers VIP Seat A-12 on venue seating chart and triggers reservation request.",
    "Inventory Service establishes atomic Redis key with 10-minute TTL to prevent double booking.",
    "Booking Service provisions draft Saga record in status PAYMENT_PENDING.",
    "Booking Service produces event to Kafka topic 'payment-requested' without browser lag.",
    "Payment Service initializes Razorpay session; webhook verifies cryptographic signature.",
    "Payment Service emits 'payment-status: SUCCESS' event back to Kafka bus.",
    "Booking marked CONFIRMED! Live ticket stub with QR pass generated for the fan.",
  ];

  return (
    <div
      style={{
        background: "#08080a",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Top Header / Control Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "#0f0f12",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ffc46b",
                boxShadow: "0 0 10px #ffc46b",
              }}
            />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
              Live Saga Booking Pipeline
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(255, 196, 107, 0.15)",
                color: "#ffc46b",
                border: "1px solid rgba(255, 196, 107, 0.3)",
                fontWeight: 600,
              }}
            >
              React Flow Interactive
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#888" }}>
            Watch atomic seat holds and Kafka choreography unfold in real-time.
          </p>
        </div>

        {/* Playback Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: isPlaying ? "#ffc46b" : "rgba(255, 196, 107, 0.15)",
              color: isPlaying ? "#000" : "#ffc46b",
              border: "1px solid #ffc46b",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Play size={14} fill={isPlaying ? "#000" : "none"} />
            <span>{isPlaying ? "Pause Flow" : "Simulate Live Saga"}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStep(1);
            }}
            title="Reset Flow"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ccc",
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Step Pill */}
          <div
            style={{
              background: "#16161a",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "0.78rem",
              color: "#ffc46b",
              fontWeight: 600,
            }}
          >
            Step {simStep} / 7
          </div>
        </div>
      </div>

      {/* Live Step Explanation Bar */}
      <div
        style={{
          background: "rgba(255, 196, 107, 0.05)",
          borderBottom: "1px solid rgba(255, 196, 107, 0.15)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: "0.85rem",
          color: "#eee",
        }}
      >
        <span
          style={{
            background: "#ffc46b",
            color: "#000",
            fontSize: "0.72rem",
            fontWeight: 800,
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          ACTIVE STEP
        </span>
        <span>{stepDescriptions[simStep - 1]}</span>
      </div>

      {/* React Flow Canvas */}
      <div style={{ height: 440, width: "100%", background: "#060608" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="rgba(255, 255, 255, 0.07)" gap={24} size={1} />
          <Controls
            style={{
              background: "#121214",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
            }}
          />
          <MiniMap
            nodeColor={() => "#ffc46b"}
            maskColor="rgba(0, 0, 0, 0.7)"
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>

      {/* Stepper Dots at Bottom */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "14px 20px",
          background: "#0c0c0e",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <button
            key={num}
            onClick={() => {
              setIsPlaying(false);
              setSimStep(num);
            }}
            style={{
              background:
                simStep === num
                  ? "#ffc46b"
                  : num < simStep
                  ? "#4ade80"
                  : "rgba(255, 255, 255, 0.1)",
              color: simStep === num || num < simStep ? "#000" : "#888",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

