---
name: shadcn-ui
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, or any project with a components.json file.
metadata:
  author: shadcn
  version: "1.0.0"
---

# shadcn/ui

A framework for building ui, components and design systems. Components are added as source code to the user's project via the CLI.

Run all CLI commands using the project's package runner: `npx shadcn@latest`, `pnpm dlx shadcn@latest`, or `bunx --bun shadcn@latest`.

## Current Project Context

```json
!`npx shadcn@latest info --json`
```

## Principles

1. **Use existing components first.** Use `npx shadcn@latest search` to check registries before writing custom UI.
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls. Dashboard = Sidebar + Card + Chart + Table.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.

## Critical Rules

### Styling & Tailwind
- `className` for layout, not styling. Never override component colors or typography.
- No `space-x-*` or `space-y-*`. Use `flex` with `gap-*`.
- Use `size-*` when width and height are equal.
- Use semantic tokens (`bg-background`, `text-muted-foreground`), no manual `dark:` overrides.
- Use `cn()` for conditional classes.

### Forms & Inputs
- Forms use `FieldGroup` + `Field`. Never raw `div` with `space-y-*`.
- Field validation uses `data-invalid` + `aria-invalid`.
- Option sets (2–7 choices) use `ToggleGroup`.

### Component Structure
- Items always inside their Group. `SelectItem` → `SelectGroup`.
- Dialog, Sheet, and Drawer always need a Title.
- Use full Card composition: `CardHeader`/`CardTitle`/`CardContent`/`CardFooter`.
- `TabsTrigger` must be inside `TabsList`.
- `Avatar` always needs `AvatarFallback`.

## Component Selection

| Need | Use |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Button/action | `Button` with appropriate variant |
| Form inputs | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `Textarea`, `Slider` |
| Data display | `Table`, `Card`, `Badge`, `Avatar` |
| Navigation | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs` |
| Overlays | `Dialog`, `Sheet`, `Drawer`, `AlertDialog` |
| Feedback | `sonner` (toast), `Alert`, `Progress`, `Skeleton` |
| Charts | `Chart` (wraps Recharts) |

## Workflow

1. Get project context via `npx shadcn@latest info`
2. Check installed components before adding
3. Find components: `npx shadcn@latest search`
4. Get docs: `npx shadcn@latest docs <component>`
5. Install: `npx shadcn@latest add <component>`
6. Always verify added files are correct
