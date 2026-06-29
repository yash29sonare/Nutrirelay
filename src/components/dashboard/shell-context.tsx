"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ShellContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((prev) => !prev),
    []
  );
  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <ShellContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        mobileNavOpen,
        setMobileNavOpen,
        openMobileNav,
        closeMobileNav,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellProvider");
  return ctx;
}
