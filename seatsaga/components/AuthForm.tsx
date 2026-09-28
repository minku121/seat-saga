"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { decodeToken } from "@/lib/auth";

const API_URL = "https://seat-saga.onrender.com/api/auth";

function AuthFormInner({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const justRegistered = searchParams.get("registered") === "true";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, isLoading, redirectTarget, router]);

  useEffect(() => {
    if (justRegistered && !isSignup) {
      setSuccessMsg("Account created successfully! Please log in with your credentials.");
    }
  }, [justRegistered, isSignup]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const endpoint = isSignup
        ? `${API_URL}/register`
        : `${API_URL}/login`;

      const body = isSignup
        ? {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isSignup ? "Failed to create account" : "Invalid email or password")
        );
      }

      // -------------------------
      // SIGNUP SUCCESS
      // -------------------------
      if (isSignup) {
        router.push("/auth/login?registered=true");
        return;
      }

      // -------------------------
      // LOGIN SUCCESS
      // -------------------------
      const token = data?.token || (typeof data === "string" ? data : null);

      if (!token) {
        throw new Error(
          "Login succeeded but no access token was returned by the server."
        );
      }

      const decoded = decodeToken(token);
      const userName = data?.name || data?.user?.name || decoded?.name || name || email.split("@")[0];
      const userEmail = data?.email || data?.user?.email || decoded?.sub || email;

      // Update auth context + localStorage + cookies
      login(token, {
        name: userName,
        email: userEmail,
        id: data?.id || data?.user?.id,
      });

      router.push(redirectTarget);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <Link href="/" className="logo">
        Seat Saga
      </Link>

      <h1>
        {isSignup ? "Create your account" : "Log in"}
      </h1>

      {successMsg && (
        <div
          role="status"
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            background: "rgba(74, 222, 128, 0.12)",
            border: "1px solid rgba(74, 222, 128, 0.35)",
            color: "#86efac",
            fontSize: "0.92rem",
            lineHeight: "1.4",
          }}
        >
          {successMsg}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {isSignup && (
          <label>
            Full name
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </label>
        )}

        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </label>

        {isSignup && (
          <small>
            At least 6 characters.
          </small>
        )}

        {error && (
          <p
            role="alert"
            className="error"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "rgba(255, 138, 128, 0.12)",
              border: "1px solid rgba(255, 138, 128, 0.35)",
              color: "#ff8a80",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn primary"
          disabled={loading}
        >
          {loading
            ? isSignup
              ? "Creating account..."
              : "Logging in..."
            : isSignup
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="switch">
        {isSignup
          ? "Already have an account? "
          : "New to Seat Saga? "}

        <Link
          href={
            isSignup
              ? "/auth/login"
              : "/signup"
          }
        >
          {isSignup
            ? "Log in"
            : "Create an account"}
        </Link>
      </p>

      {error && (
        <small>
          Please check your details and try again.
        </small>
      )}
    </main>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense fallback={<main className="auth"><div style={{ color: "var(--dim)" }}>Loading...</div></main>}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}

