"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ErrorBanner } from "@/components/ui/StatusBanner";

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
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                placeholder="Arjun Sharma"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="trainer@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Min. 8 characters"
              />
            </div>

            {/* Error block */}
            {error && (
              <ErrorBanner>{error}</ErrorBanner>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="brand"
              size="lg"
              disabled={loading || !displayName || !email || !password}
              loading={loading}
              className="w-full"
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
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
