"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface TicketData {
  artist: string;
  venue: string;
  seat: string;
  price: string;
  tier: string;
  color: string;
  accent: string;
}

const TICKETS_META: TicketData[] = [
  {
    artist: "COLDPLAY",
    venue: "Wembley Stadium",
    seat: "VIP A-12",
    price: "₹4,500",
    tier: "VIP DIAMOND",
    color: "#0f172a",
    accent: "#ffc46b",
  },
  {
    artist: "ARIJIT SINGH",
    venue: "DY Patil Stadium",
    seat: "PLAT P-04",
    price: "₹2,800",
    tier: "PLATINUM",
    color: "#1e1328",
    accent: "#c084fc",
  },
  {
    artist: "DILJIT DOSANJH",
    venue: "JLN Stadium, Delhi",
    seat: "FANPIT F-01",
    price: "₹6,000",
    tier: "FAN PIT",
    color: "#1a1208",
    accent: "#fb923c",
  },
  {
    artist: "TAYLOR SWIFT",
    venue: "Sofi Arena",
    seat: "FRONT A-01",
    price: "₹8,500",
    tier: "FRONT ROW",
    color: "#0a191f",
    accent: "#38bdf8",
  },
  {
    artist: "SEAT SAGA PASS",
    venue: "Live Worldwide",
    seat: "ROW 1 SEAT 7",
    price: "CONFIRMED",
    tier: "ATOMIC HOLD",
    color: "#141414",
    accent: "#4ade80",
  },
];

function createTicketTexture(meta: TicketData): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, meta.color);
  grad.addColorStop(1, "#050505");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Outer border with subtle glow
  ctx.strokeStyle = meta.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  // Perforation cut line (stub divider)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(370, 0);
  ctx.lineTo(370, 256);
  ctx.stroke();
  ctx.setLineDash([]);

  // Notches at the divider
  ctx.fillStyle = "#050505";
  ctx.beginPath();
  ctx.arc(370, 0, 14, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(370, 256, 14, Math.PI, 0);
  ctx.fill();

  // Left header
  ctx.fillStyle = meta.accent;
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("✦ SEAT SAGA VERIFIED TICKET", 24, 34);

  // Tier pill
  ctx.fillStyle = meta.accent;
  ctx.fillRect(24, 48, 110, 22);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(meta.tier, 32, 63);

  // Artist Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(meta.artist, 24, 108);

  // Venue
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "14px sans-serif";
  ctx.fillText(meta.venue, 24, 134);

  // Seat Badge
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(24, 156, 150, 48);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.strokeRect(24, 156, 150, 48);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "10px sans-serif";
  ctx.fillText("SEAT ASSIGNMENT", 34, 172);
  ctx.fillStyle = meta.accent;
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(meta.seat, 34, 194);

  // Price box
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(184, 156, 150, 48);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.strokeRect(184, 156, 150, 48);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "10px sans-serif";
  ctx.fillText("PRICE / STATUS", 194, 172);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(meta.price, 194, 194);

  // Live Hold indicator
  ctx.fillStyle = meta.accent;
  ctx.beginPath();
  ctx.arc(32, 226, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "11px sans-serif";
  ctx.fillText("Atomic Redis Lock 10m TTL • Verified Saga Protocol", 46, 230);

  // STUB SECTION (Right)
  ctx.fillStyle = meta.accent;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("PASS", 390, 36);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(meta.seat, 390, 68);

  // Simulated Barcode
  ctx.fillStyle = "#ffffff";
  const startX = 390;
  const barHeights = [4, 2, 6, 2, 8, 3, 5, 2, 7, 3, 2, 6, 4, 3, 8, 2, 5, 3];
  for (let i = 0; i < 30; i++) {
    const x = startX + i * 3.4;
    const w = (i % 3 === 0) ? 2 : 1;
    ctx.fillRect(x, 90, w, 60);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "9px monospace";
  ctx.fillText("#9103-SAGA", 390, 168);

  // Holographic water mark
  ctx.fillStyle = "rgba(255, 196, 107, 0.18)";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("SAGA", 400, 224);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export default function FlowingTickets3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 18;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffc46b, 2.5);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x73b7ff, 1.8);
    dirLight2.position.set(-10, -10, 8);
    scene.add(dirLight2);

    // Ticket Geometry (Curved or flat box)
    const ticketGeom = new THREE.BoxGeometry(4.2, 2.1, 0.04);

    // Create ticket meshes
    interface TicketMeshMeta {
      mesh: THREE.Mesh;
      initialPos: THREE.Vector3;
      speed: number;
      offset: number;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      wobbleRadius: number;
    }

    const ticketMeshes: TicketMeshMeta[] = [];

    const positions = [
      new THREE.Vector3(5.2, 2.2, 1),
      new THREE.Vector3(7.4, -2.8, -2),
      new THREE.Vector3(-6.2, 3.4, -3),
      new THREE.Vector3(-5.5, -3.2, 0),
      new THREE.Vector3(1.2, -4.5, -1.5),
    ];

    TICKETS_META.forEach((meta, idx) => {
      const texture = createTicketTexture(meta);
      const matFront = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.25,
        metalness: 0.35,
      });

      const matBack = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.5,
        metalness: 0.2,
      });

      const matEdge = new THREE.MeshStandardMaterial({
        color: 0xffc46b,
        metalness: 0.8,
        roughness: 0.2,
      });

      const materials = [
        matEdge,
        matEdge,
        matEdge,
        matEdge,
        matFront,
        matBack,
      ];

      const mesh = new THREE.Mesh(ticketGeom, materials);
      const pos = positions[idx] || new THREE.Vector3(0, 0, 0);
      mesh.position.copy(pos);
      mesh.rotation.x = 0.2 + idx * 0.15;
      mesh.rotation.y = -0.3 + idx * 0.2;
      mesh.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.15;

      scene.add(mesh);

      ticketMeshes.push({
        mesh,
        initialPos: pos.clone(),
        speed: 0.6 + idx * 0.18,
        offset: idx * 1.4,
        rotSpeedX: (Math.random() - 0.5) * 0.4,
        rotSpeedY: (Math.random() - 0.5) * 0.4,
        rotSpeedZ: (Math.random() - 0.5) * 0.2,
        wobbleRadius: 0.35 + idx * 0.12,
      });
    });

    // Ambient floating glow dust particles
    const particleCount = 75;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color("#ffc46b");
    const cyanColor = new THREE.Color("#73b7ff");

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 30;
      particlePositions[i + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i + 2] = (Math.random() - 0.5) * 15;

      const c = Math.random() > 0.4 ? goldColor : cyanColor;
      particleColors[i] = c.r;
      particleColors[i + 1] = c.g;
      particleColors[i + 2] = c.b;
    }

    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeom.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Mouse movement
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 1.5;
      mouseRef.current.targetY = y * 1.2;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse damping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      camera.position.x = mouseRef.current.x * 1.2;
      camera.position.y = mouseRef.current.y * 0.8;
      camera.lookAt(0, 0, 0);

      // Animate each ticket along a gentle harmonic wave
      ticketMeshes.forEach((item, i) => {
        const t = elapsedTime * item.speed + item.offset;

        // Floating motion
        item.mesh.position.y = item.initialPos.y + Math.sin(t) * item.wobbleRadius;
        item.mesh.position.x = item.initialPos.x + Math.cos(t * 0.8) * (item.wobbleRadius * 0.7);
        item.mesh.position.z = item.initialPos.z + Math.sin(t * 0.5) * 0.4;

        // Gentle 3D rotation
        item.mesh.rotation.y += Math.sin(t * 0.4) * 0.003;
        item.mesh.rotation.x += Math.cos(t * 0.3) * 0.002;
        item.mesh.rotation.z = Math.sin(t * 0.6) * 0.08 + (i % 2 === 0 ? 0.05 : -0.05);
      });

      // Rotate particle dust
      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = elapsedTime * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      ticketGeom.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
      aria-hidden="true"
    />
  );
}

