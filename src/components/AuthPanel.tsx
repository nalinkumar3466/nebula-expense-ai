"use client";

import { useState } from "react";

type Mode = "login" | "register";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

    return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full border border-zinc-300 bg-zinc-100 p-1 text-xs dark:border-zinc-700 dark:bg-zinc-800/70">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium ${
            mode === "login"
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium ${
            mode === "register"
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Sign up
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="space-y-3">
        {mode === "register" && (
          <div className="space-y-1 text-sm">
            <label className="block text-zinc-700 dark:text-zinc-300" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Optional"
            />
          </div>
        )}
        <div className="space-y-1 text-sm">
          <label className="block text-zinc-700 dark:text-zinc-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div className="space-y-1 text-sm">
          <label className="block text-zinc-700 dark:text-zinc-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            minLength={6}
            required
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
          Passwords are stored hashed locally for this demo. Do not use a real password.
        </p>
      </form>
    </div>
  );
}

