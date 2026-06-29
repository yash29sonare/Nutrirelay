export type SkillDomain =
  | "frontend"
  | "backend"
  | "ai"
  | "database"
  | "auth"
  | "api"
  | "workflow"
  | "design"
  | "testing"
  | "infrastructure";

export interface SkillDefinition {
  name: string;
  description: string;
  allowedDomains: SkillDomain[];
  forbiddenDomains: SkillDomain[];
  priority: number;
  enabled: boolean;
}

export const SKILL_REGISTRY: SkillDefinition[] = [
  {
    name: "frontend-design",
    description: "Distinctive, production-grade frontend interfaces with high design quality",
    allowedDomains: ["frontend", "design"],
    forbiddenDomains: ["backend", "database", "infrastructure"],
    priority: 80,
    enabled: true,
  },
  {
    name: "web-design-guidelines",
    description: "Vercel Web Interface Guidelines — accessibility, focus, forms, animations, typography",
    allowedDomains: ["frontend", "design"],
    forbiddenDomains: ["backend", "database", "ai", "infrastructure"],
    priority: 90,
    enabled: true,
  },
  {
    name: "tailwind-design-system",
    description: "Design tokens, component variants, responsive patterns, accessibility via Tailwind CSS",
    allowedDomains: ["frontend", "design"],
    forbiddenDomains: ["backend", "database", "ai"],
    priority: 85,
    enabled: true,
  },
  {
    name: "shadcn-ui",
    description: "shadcn/ui component composition, semantic colors, cn() utility, Tailwind CSS v4",
    allowedDomains: ["frontend", "design"],
    forbiddenDomains: ["backend", "database", "ai", "infrastructure"],
    priority: 85,
    enabled: true,
  },
  {
    name: "composition-patterns",
    description: "React composition — compound components, context providers, avoid boolean props",
    allowedDomains: ["frontend"],
    forbiddenDomains: ["backend", "database", "ai", "infrastructure"],
    priority: 70,
    enabled: true,
  },
  {
    name: "react-best-practices",
    description: "Vercel React best practices — performance, bundle size, re-render optimization",
    allowedDomains: ["frontend"],
    forbiddenDomains: ["backend", "database", "infrastructure"],
    priority: 75,
    enabled: true,
  },
  {
    name: "next-best-practices",
    description: "Next.js file conventions, RSC boundaries, async APIs, metadata, route handlers",
    allowedDomains: ["frontend", "api"],
    forbiddenDomains: ["database", "infrastructure"],
    priority: 75,
    enabled: true,
  },
  {
    name: "backend-development",
    description: "Supabase, Mastra AI, Trigger.dev, API routes, services, database interaction",
    allowedDomains: ["backend", "api", "database", "workflow", "ai"],
    forbiddenDomains: ["frontend", "design"],
    priority: 80,
    enabled: true,
  },
  {
    name: "code-review",
    description: "Code quality audits, security, N+1 queries, architecture, naming, test coverage",
    allowedDomains: ["backend", "frontend", "database", "api", "ai"],
    forbiddenDomains: [],
    priority: 60,
    enabled: true,
  },
  {
    name: "supabase",
    description: "Supabase products — Database, Auth, Edge Functions, Realtime, Storage, CLI, SSR",
    allowedDomains: ["backend", "database", "auth", "api"],
    forbiddenDomains: ["frontend", "design", "infrastructure"],
    priority: 90,
    enabled: true,
  },
  {
    name: "supabase-postgres-best-practices",
    description: "Postgres performance optimization, schema design, query optimization from Supabase",
    allowedDomains: ["database", "backend"],
    forbiddenDomains: ["frontend", "design", "ai", "infrastructure"],
    priority: 70,
    enabled: true,
  },
];

export function getSkill(name: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.find((s) => s.name === name);
}

export function getEnabledSkills(): SkillDefinition[] {
  return SKILL_REGISTRY.filter((s) => s.enabled);
}
