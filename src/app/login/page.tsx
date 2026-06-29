"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
              Fortress Fitness Pro
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Sign in to your trainer dashboard
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
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
              disabled={loading || !email || !password}
              loading={loading}
              className="w-full"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          Fortress Fitness Pro · Trainer access only
        </p>
      </div>
    </div>
  );
}
