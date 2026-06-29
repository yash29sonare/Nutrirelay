<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FORTRESS FITNESS — DEVELOPMENT EXECUTION POLICY

This policy applies to ALL Fortress Fitness implementation work.

## SKILL USAGE

Automatically use installed OpenCode skills (`.opencode/skills/`) whenever relevant. Select only the skills required for the current task. Do NOT force every skill into every implementation. Prefer architecture consistency over unnecessary creativity.

### SKILL RESPONSIBILITIES

- **Frontend UI** (`frontend-design`, `web-design-guidelines`, `tailwind-design-system`, `shadcn-ui`, `composition-patterns`) — layouts, pages, dashboards, forms, components, responsive design, typography, spacing, visual hierarchy.
- **React** (`react-best-practices`, `composition-patterns`) — hooks, component architecture, state management, rendering, composition.
- **Next.js** (`next-best-practices`) — App Router, Server Components, Client Components, routing, caching, performance, data fetching.
- **Backend** (`backend-development`) — API routes, Supabase, Mastra, operations, services, database interaction.
- **Quality** (`code-review`) — Run its guidance before completing significant implementations.
- **Custom Skills** — When a Fortress Fitness project skill exists, prioritize it over generic public skills on conflict.

## DESIGN REQUIREMENTS

Never generate generic AI-looking interfaces. Avoid: excessive gradients, glassmorphism, oversized rounded corners, random color palettes, inconsistent spacing, template-style dashboards.
Prefer: clean SaaS interfaces, professional fitness software, reusable components, strong typography, restrained color palette, consistent spacing, accessibility, responsive layouts.

## IMPLEMENTATION REQUIREMENTS

For every task:
1. Identify which installed skills are relevant.
2. Apply only those skills.
3. Preserve Fortress Fitness architecture, multi-tenancy, and business logic.
4. Avoid duplicate implementations.
5. Follow TypeScript strict mode.
6. Maintain production-quality code.

## OUTPUT FORMAT

At the beginning of every implementation briefly state:

```
Skills Applied:
- skill-name (reason)
- skill-name (reason)
```

Then proceed with implementation.
