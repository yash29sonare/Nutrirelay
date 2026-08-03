import { BrandMark } from "@/components/brand/BrandMark";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ErrorBanner } from "@/components/ui/StatusBanner";
import { signInWithPassword } from "./actions";
import { PasswordInput } from "./PasswordInput";
import { Aurora, ShinyText } from "@/components/react-bits";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error ?? null;

  return (
    <div className="login-auth-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080807] px-4 text-white [--primary:#9bdcff]">
      <Aurora className="opacity-70" opacity={0.24} />
      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <BrandMark className="h-12 w-12 rounded-2xl" />
          <div className="text-center">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9bdcff]">
              <ShinyText base="#9bdcff" highlight="#ffffff">Trainer access</ShinyText>
            </p>
            <h1 className="text-xl font-semibold text-white">NutriRelay</h1>
            <p className="mt-1 text-sm text-[#9aa3ad]">
              Sign in to your nutrition operations dashboard
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#171a22]/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <form action={signInWithPassword} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="trainer@example.com"
                className="border-white/10 bg-[#eef4ff] text-[#0b0d12] placeholder:text-[#667085] focus:border-[#9bdcff] focus:ring-[#9bdcff]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput />
            </div>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full border-white bg-white text-[#080807] hover:bg-[#dfe7ee] hover:text-[#080807]"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9aa3ad]">
          Nutrition coaching platform · Trainer access only
        </p>
      </div>
    </div>
  );
}
