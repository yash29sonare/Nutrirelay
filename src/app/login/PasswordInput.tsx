"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={isVisible ? "text" : "password"}
        autoComplete="current-password"
        required
        placeholder="Password"
        className="w-full rounded-lg border border-white/10 bg-[#eef4ff] px-3 py-2 pr-12 text-sm text-[#0b0d12] placeholder:text-[#667085] transition-all duration-150 focus:border-[#9bdcff] focus:outline-none focus:ring-1 focus:ring-[#9bdcff]"
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#334155] transition-colors hover:bg-[#dce6f4] hover:text-[#0b0d12] focus:outline-none focus:ring-2 focus:ring-[#9bdcff]"
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
