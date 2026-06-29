import type { SkillDefinition } from "@/skills/registry";

export interface BuildPromptInput {
  systemPrompt: string;
  activeSkills: SkillDefinition[];
  feature: string;
}

const DESIGN_SYSTEM_CONSTRAINTS = `\
## Fortress Fitness Design System Constraints

### Phase 8.0 — Design Token Rules
- Use CSS custom properties (var(--background), var(--foreground), var(--muted), var(--surface-raised), var(--surface-overlay), var(--surface-border))
- Semantic colors only: var(--primary), var(--destructive), var(--success), var(--warning), var(--info)
- Brand palette: brand-50 through brand-950 (primary green: brand-500 #22c55e)
- Spacing: 4px base unit (p-2 = 8px, p-4 = 16px, p-6 = 24px)
- Border radius: --radius-sm (6px), --radius-md (8px), --radius-lg (12px), --radius-xl (16px)
- Shadows: --shadow-xs through --shadow-xl
- Typography: Geist Sans (ui-sans-serif fallback), Geist Mono for code

### Phase 8.1 — Layout & Interaction Rules
- PageContainer: max-w-6xl, px-6 py-6
- PageHeader: flex items-start justify-between, h1 title + optional description + actions
- DashboardGrid: grid with responsive columns
- DashboardSection: section with title + description + children
- FilterBar: flex flex-col sm:flex-row gap-3
- use gap-* for spacing, NOT space-x-* or space-y-*
- use size-* when width and height are equal

### Component Primitive Rules
- Card: rounded-xl, bg-[var(--surface-raised)], border border-[var(--surface-border)]
- CardHeader: px-5 py-4, border-b border-[var(--surface-border)]
- CardContent: px-5 py-4
- Badge variants: default, brand, success, warning, danger, info, outline
- Button variants: brand, secondary, ghost, outline, danger
- Avatar: always needs AvatarFallback (initials)
- Dialog needs a Title
- TabsTrigger must be inside TabsList
- cn() utility for conditional class merging

### Forbidden Patterns
- NO glassmorphism (backdrop-blur, bg-opacity on surfaces)
- NO excessive gradients (avoid bg-gradient-* unless minimal accent)
- NO oversized rounded corners (max radius-xl)
- NO random color palettes (use design tokens only)
- NO generic font families (Inter, Roboto, Arial, system-ui as primary)
- NO space-x-* or space-y-* (use gap-* instead)
- NO forwardRef (React 19 — remove forwardRef usage)
- NO barrel imports (import directly from source files)
- NO inline styles for layout`;

const ARCHITECTURE_CONTEXT = `\
## Fortress Fitness Architecture

### Stack
- Next.js 16.2.7 (App Router, Turbopack)
- React 19.2.4
- Tailwind CSS v4 (no tailwind.config.ts — @theme in globals.css)
- Supabase (Postgres, Auth, SSR with @supabase/ssr)
- Mastra AI (agents, workflows, tools)
- Trigger.dev (background jobs)
- TypeScript strict mode

### AI Layer
- Models: Google Gemini via @ai-sdk/google
- Primary: gemini-3.1-flash-lite
- Fallback stack: gemini-3-flash-preview, gemini-2.5-flash
- AI SDK: vercel/ai (generateText, streamText)
- All AI calls MUST go through src/ai/aiGateway.ts`;

function buildSkillSection(skills: SkillDefinition[]): string {
  if (skills.length === 0) return "";
  const lines = skills.map(
    (s) => `- ${s.name} (priority ${s.priority}): ${s.description}`
  );
  return `## Active Skills\n${lines.join("\n")}`;
}

export function buildPrompt(input: BuildPromptInput): string {
  const sections: string[] = [];

  sections.push(ARCHITECTURE_CONTEXT);
  sections.push(DESIGN_SYSTEM_CONSTRAINTS);

  const skillSection = buildSkillSection(input.activeSkills);
  if (skillSection) sections.push(skillSection);

  if (input.systemPrompt) {
    sections.push(`## Task Instructions\n${input.systemPrompt}`);
  }

  return sections.join("\n\n");
}

export function enforcePromptSchema(prompt: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const required = [
    "Fortress Fitness Architecture",
    "Stack",
    "Design System Constraints",
    "Phase 8.0",
    "Forbidden Patterns",
  ];

  for (const section of required) {
    if (!prompt.includes(section)) {
      errors.push(`Missing required section: "${section}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
