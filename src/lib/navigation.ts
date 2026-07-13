import {
  LayoutDashboard,
  Users,
  Zap,
  MessageSquare,
  Mic,
  MessageCircle,
  Bot,
  BarChart3,
  FileText,
  CreditCard,
  Activity,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Command center and daily client overview." },
      { label: "Engagement", href: "/dashboard/engagement", icon: Zap, description: "Review follow-up actions and client adherence signals." },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, description: "See nutrition, compliance, and communication performance trends." },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "Clients", href: "/dashboard/clients", icon: Users, description: "Manage client nutrition progress and program details." },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Communications", href: "/dashboard/communications", icon: MessageSquare, description: "Track queued, sent, and failed outreach." },
      { label: "Conversations", href: "/dashboard/conversations", icon: MessageCircle, description: "Review planned client conversations and follow-ups." },
      { label: "Voice Notes", href: "/dashboard/voice-notes", icon: Mic, description: "Recover failed voice-note transcriptions." },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Automations", href: "/dashboard/automations", icon: Bot, description: "Control meal nudges, ghosting checks, reports, and photo verification." },
      { label: "Reports", href: "/dashboard/reports", icon: FileText, description: "Open trainer-facing nutrition and operations reports." },
      { label: "Queue", href: "/dashboard/queue", icon: CreditCard, description: "Owner-only payment approval queue." },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Events", href: "/dashboard/events", icon: Activity, description: "Audit operational events and background activity." },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, description: "Account, support, and platform settings." },
    ],
  },
];

export function getNavSections(isAdmin: boolean): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isAdmin || item.href !== "/dashboard/queue"),
  })).filter((section) => section.items.length > 0);
}

export function getFlatNavItems(): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  // Find matching nav items for each segment
  let accumulated = "";
  for (const segment of segments) {
    accumulated += `/${segment}`;
    const all = getFlatNavItems();
    const match = all.find((n) => n.href === accumulated);
    if (match) {
      crumbs.push({ label: match.label, href: accumulated });
    } else {
      crumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
        href: accumulated,
      });
    }
  }
  return crumbs;
}
