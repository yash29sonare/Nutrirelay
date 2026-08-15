"use client";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BarChart3, Clock, MessageSquare, ShieldCheck } from "lucide-react";

interface StepWelcomeProps {
  onContinue: () => void;
}

export function StepWelcome({ onContinue }: StepWelcomeProps) {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:grid-cols-[1.02fr_0.98fr]">
      <div className="relative min-h-[360px] border-b border-[var(--surface-border)] bg-[#07110c] p-6 lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(18,184,87,0.22),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(155,220,255,0.16),transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11 rounded-2xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">NutriRelay</p>
              <p className="text-sm text-white/70">Trainer workspace</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">
              <ShieldCheck size={14} />
              WhatsApp-first coaching operations
            </div>
            <div className="grid gap-3">
              {[
                ["Client replies", "Inbox, photos, voice notes, and food logs stay trainer-scoped."],
                ["Automation prep", "Reminder and report workflows use your timezone."],
                ["Next step", "Connect your WhatsApp coaching number after setup."],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/62">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Trainer onboarding</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Set up your coaching workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Add the name clients will recognize, choose your reminder timezone, then connect your WhatsApp coaching number.
        </p>

        <div className="mt-7 grid gap-3">
          {[
            { icon: MessageSquare, title: "WhatsApp-ready clients", detail: "Clients stay on WhatsApp. They do not need NutriRelay accounts." },
            { icon: Clock, title: "Reminder timing", detail: "Timezone powers reminders, reports, and daily coaching windows." },
            { icon: BarChart3, title: "Readable operations", detail: "Dashboard, reports, and review queues use the profile you set here." },
          ].map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="brand" size="lg" onClick={onContinue} className="mt-8 w-full sm:w-auto">
          Get started
        </Button>
      </div>
    </div>
  );
}
