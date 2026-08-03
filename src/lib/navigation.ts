import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Settings,
  CreditCard,
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
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "See today’s client activity and attention items." },
      { label: "Clients", href: "/dashboard/clients", icon: Users, description: "Review trainer-owned client progress and profiles." },
      { label: "Inbox", href: "/dashboard/communications", icon: MessageSquare, description: "Review WhatsApp replies, media, voice notes, and follow-ups." },
      { label: "Reports", href: "/dashboard/reports", icon: FileText, description: "Prepare weekly and monthly client progress reports." },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, description: "Review actionable nutrition and communication metrics." },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, description: "Manage account, WhatsApp, and automation preferences." },
    ],
  },
];

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  ...NAV_SECTIONS,
  {
    title: "Admin",
    items: [
      { label: "Payment Queue", href: "/dashboard/queue", icon: CreditCard, description: "Review and verify pending manual UPI payments." },
    ],
  },
];

export function getNavSections(isAdmin: boolean): NavSection[] {
  return isAdmin ? ADMIN_NAV_SECTIONS : NAV_SECTIONS;
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
