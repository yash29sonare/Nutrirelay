import { SKILL_REGISTRY, type SkillDefinition, type SkillDomain } from "./registry";

export interface ResolverContext {
  route?: string;
  feature: string;
  workflowType?: string;
  userRole?: string;
}

const DOMAIN_BY_FEATURE: Record<string, SkillDomain[]> = {
  "meal-logging": ["ai", "backend", "database", "workflow"],
  "voice-note": ["ai", "backend", "database", "workflow"],
  "photo-analysis": ["ai", "backend", "database", "workflow"],
  "weekly-report": ["ai", "backend", "database"],
  "dashboard-ui": ["frontend", "design"],
  "client-list": ["frontend", "design", "api"],
  "client-detail": ["frontend", "design", "api"],
  onboarding: ["frontend", "design"],
  auth: ["backend", "auth", "database"],
  billing: ["backend", "database", "api"],
  automations: ["backend", "database", "api", "workflow"],
};

const DOMAIN_BY_WORKFLOW: Record<string, SkillDomain[]> = {
  whatsappPipeline: ["ai", "workflow", "backend", "database"],
  voiceNoteRecoveryWorkflow: ["ai", "workflow", "backend", "database"],
  postMealPollWorkflow: ["ai", "workflow", "backend", "database"],
};

const FALLBACK_SKILL_NAMES = [
  "backend-development",
  "code-review",
];

export function resolveSkills(context: ResolverContext): SkillDefinition[] {
  const targetDomains = new Set<SkillDomain>();

  if (context.workflowType && DOMAIN_BY_WORKFLOW[context.workflowType]) {
    for (const d of DOMAIN_BY_WORKFLOW[context.workflowType]) {
      targetDomains.add(d);
    }
  }

  if (context.feature && DOMAIN_BY_FEATURE[context.feature]) {
    for (const d of DOMAIN_BY_FEATURE[context.feature]) {
      targetDomains.add(d);
    }
  }

  if (targetDomains.size === 0) {
    targetDomains.add("backend");
  }

  const candidates = SKILL_REGISTRY.filter((s) => {
    if (!s.enabled) return false;
    const matchesDomain = s.allowedDomains.some((d) => targetDomains.has(d));
    const blockedByForbidden = s.forbiddenDomains.some((d) => targetDomains.has(d));
    return matchesDomain && !blockedByForbidden;
  });

  if (candidates.length === 0) {
    return SKILL_REGISTRY.filter((s) =>
      FALLBACK_SKILL_NAMES.includes(s.name)
    );
  }

  return [...candidates].sort((a, b) => b.priority - a.priority);
}
