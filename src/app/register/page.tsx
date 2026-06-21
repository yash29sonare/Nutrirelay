"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Dumbbell } from "lucide-react";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Some Supabase projects require email confirmation before session is active.
      // Show a success message; redirect immediately if session exists.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500">
              <Dumbbell size={22} className="text-white" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Check your email
          </h2>
          <p className="text-sm text-[var(--muted)]">
            We sent a confirmation link to{" "}
            <span className="text-[var(--foreground)] font-medium">{email}</span>.
            Click it to activate your account, then{" "}
            <Link
              href="/login"
              className="text-brand-500 hover:text-brand-600 underline underline-offset-2"
            >
              sign in
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500">
            <Dumbbell size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Create your account
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Start managing your clients with Fortress
            </p>
          </div>
        </div>

        {/* Register card */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Display name */}
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Your name
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Arjun Sharma"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="trainer@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Min. 8 characters"
              />
            </div>

            {/* Error block */}
            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !displayName || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-500 hover:text-brand-600 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
