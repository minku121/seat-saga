
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = "https://seat-saga.onrender.com/api/auth";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const endpoint = isSignup
        ? `${API_URL}/register`
        : `${API_URL}/login`;

      const body = isSignup
        ? {
            name,
            email,
            password,
          }
        : {
            email,
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
            "Authentication failed"
        );
      }

      // -------------------------
      // SIGNUP
      // -------------------------
      if (isSignup) {
        router.push("/auth/login");
        return;
      }

      // -------------------------
      // LOGIN
      // -------------------------

      if (!data?.token) {
        throw new Error(
          "Login succeeded but no token was returned."
        );
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          name: data.name,
          email: data.email,
        })
      );

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
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
        {isSignup
          ? "Create your account"
          : "Log in"}
      </h1>

      <form onSubmit={onSubmit}>
        {isSignup && (
          <label>
            Full name

            <input
              name="name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
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
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />
        </label>

        <label>
          Password

          <input
            name="password"
            type="password"
            required
            minLength={5}
            autoComplete={
              isSignup
                ? "new-password"
                : "current-password"
            }
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />
        </label>

        {isSignup && (
          <small>
            At least 8 characters.
          </small>
        )}

        {error && (
          <p
            role="alert"
            className="auth-error"
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

