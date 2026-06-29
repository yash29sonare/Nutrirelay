#!/usr/bin/env node

/**
 * AI Gateway Enforcement Script
 *
 * CI-integratable enforcement check that:
 * 1. Scans codebase for AI SDK bypass violations
 * 2. Blocks on CRITICAL + MAJOR violations
 * 3. Exits with code 1 on failure
 *
 * Usage:   node scripts/ai-enforce.cjs
 * Script:  npm run ai:enforce
 */

const { readFileSync, readdirSync, statSync } = require("fs");
const path = require("path");

const SEVERITY = {
  CRITICAL: "critical",
  MAJOR: "major",
  MINOR: "minor",
};

const BYPASS_PATTERNS = [
  { pattern: /generateText\s*\(/g, severity: SEVERITY.CRITICAL },
  { pattern: /streamText\s*\(/g, severity: SEVERITY.CRITICAL },
  { pattern: /generateObject\s*\(/g, severity: SEVERITY.CRITICAL },
  { pattern: /streamObject\s*\(/g, severity: SEVERITY.CRITICAL },
  { pattern: /new\s+Agent\s*\(/g, severity: SEVERITY.MAJOR },
];

const IMPORT_PATTERNS = [
  { pattern: /from\s+['"]ai['"]/g, severity: SEVERITY.CRITICAL, label: "import from 'ai'" },
  { pattern: /from\s+['"]@ai-sdk\/[^'"]+['"]/g, severity: SEVERITY.CRITICAL, label: "import from '@ai-sdk/*'" },
  {
    pattern: /require\s*\(\s*['"]ai['"]\s*\)/g,
    severity: SEVERITY.CRITICAL,
    label: "require('ai')",
  },
];

const ALLOWED_FILES = [
  "src/ai/aiGateway.ts",
  "src/mastra/config.ts",
  // enforcement.ts contains regex patterns for detection, not real AI calls
  "src/ai/enforcement.ts",
  // Mastra Agent definitions use framework-internal LLM calls, not direct AI SDK
  "src/mastra/agents/coach.ts",
  "src/mastra/agents/fitnessAgent.ts",
  "src/mastra/agents/orchestrator.ts",
];

function isIndexFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.endsWith("/index.ts") || normalized.endsWith("/index.d.ts");
}

function isAllowedFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("node_modules")) return true;
  if (normalized.includes(".next")) return true;
  if (normalized.endsWith(".d.ts")) return true;
  return ALLOWED_FILES.some((a) => normalized.endsWith(a));
}

function collectTsFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (!entry.startsWith(".") && entry !== "node_modules") {
          files.push(...collectTsFiles(full));
        }
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

function findFunctionName(lines, lineIndex) {
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 10); i--) {
    const m = lines[i].match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/
    );
    if (m) return m[1];
    const a = lines[i].match(
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/
    );
    if (a) return a[1];
  }
  return "(anonymous)";
}

let exitCode = 0;
const violations = [];
const srcRoot = path.resolve(process.cwd(), "src");

for (const fullPath of collectTsFiles(srcRoot)) {
  if (isAllowedFile(fullPath)) continue;

  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    continue;
  }
  if (!content || content.length < 10) continue;

  const lines = content.split("\n");

  for (const { pattern, severity, label } of IMPORT_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      if (!match.index) continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      const fnName = findFunctionName(lines, lineNum - 1);
      violations.push({
        filePath: fullPath,
        line: lineNum,
        severity,
        description: `Direct ${label} outside aiGateway.ts`,
        functionName: fnName,
      });
    }
  }

  for (const { pattern, severity } of BYPASS_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      if (!match.index) continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      const fnName = findFunctionName(lines, lineNum - 1);
      violations.push({
        filePath: fullPath,
        line: lineNum,
        severity,
        description: `Direct AI call "${match[0].trim()}" outside aiGateway.ts`,
        functionName: fnName,
      });
    }
  }
}

// ── Output ──────────────────────────────────────────────────────────────

const critical = violations.filter((v) => v.severity === SEVERITY.CRITICAL);
const major = violations.filter((v) => v.severity === SEVERITY.MAJOR);
const minor = violations.filter((v) => v.severity === SEVERITY.MINOR);

console.log("\n" + "═".repeat(47));
console.log("  AI GATEWAY ENFORCEMENT REPORT");
console.log("═".repeat(47) + "\n");
console.log(
  `Total violations: ${violations.length}  |  ` +
    `CRITICAL: ${critical.length}  |  ` +
    `MAJOR: ${major.length}  |  ` +
    `MINOR: ${minor.length}\n`
);

if (violations.length === 0) {
  console.log("  ✓ PASSED — No AI gateway bypass violations found.\n");
} else {
  for (const v of violations) {
    const label =
      v.severity === SEVERITY.CRITICAL
        ? "CRITICAL"
        : v.severity === SEVERITY.MAJOR
          ? "  MAJOR"
          : "  MINOR";
    console.log(`[${label}] ${v.filePath}:${v.line}`);
    console.log(`  ${v.description}`);
    console.log(`  Function: ${v.functionName}\n`);
  }
}

// ── CI Exit Code ─────────────────────────────────────────────────────────
if (critical.length > 0 || major.length > 0) {
  console.log("  ✗ FAILED — CRITICAL or MAJOR violations detected. Blocking CI.\n");
  exitCode = 1;
} else if (violations.length === 0) {
  console.log("  ✓ All AI calls are properly routed through aiGateway.\n");
}

process.exit(exitCode);
