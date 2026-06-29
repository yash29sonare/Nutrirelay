import {
  LayoutDashboard,
  Users,
  Zap,
  UtensilsCrossed,
  Dumbbell,
  Target,
  MessageSquare,
  Mic,
  MessageCircle,
  Bot,
  BarChart3,
  CreditCard,
  Activity,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Engagement", href: "/dashboard/engagement", icon: Zap },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "Clients", href: "/dashboard/clients", icon: Users },
      { label: "Meal Plans", href: "#", icon: UtensilsCrossed, badge: "Coming soon", disabled: true },
      { label: "Workout Plans", href: "#", icon: Dumbbell, badge: "Coming soon", disabled: true },
      { label: "Goals", href: "#", icon: Target, badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Messages", href: "#", icon: MessageSquare, badge: "Coming soon", disabled: true },
      { label: "Conversations", href: "/dashboard/conversations", icon: MessageCircle },
      { label: "Voice Notes", href: "/dashboard/voice-notes", icon: Mic },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Automations", href: "#", icon: Bot, badge: "Coming soon", disabled: true },
      { label: "Reports", href: "#", icon: BarChart3, badge: "Coming soon", disabled: true },
      { label: "Billing", href: "#", icon: CreditCard, badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Events", href: "/dashboard/events", icon: Activity },
      { label: "Settings", href: "#", icon: Settings, badge: "Coming soon", disabled: true },
      { label: "Support", href: "#", icon: LifeBuoy, badge: "Coming soon", disabled: true },
    ],
  },
];

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
