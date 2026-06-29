import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

export interface Violation {
  filePath: string;
  line: number;
  functionName: string;
  severity: "critical" | "major" | "minor";
  description: string;
  violationType: "direct_call" | "direct_import" | "alias_import" | "hidden_reexport";
}

const ALLOWED_FILES = [
  "src/ai/aiGateway.ts",
  "src/mastra/config.ts",
  "src/ai/enforcement.ts",
  "src/mastra/agents/coach.ts",
  "src/mastra/agents/fitnessAgent.ts",
  "src/mastra/agents/orchestrator.ts",
];

const ALLOWED_SUFFIXES = [".d.ts"];

function isAllowedFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("node_modules")) return true;
  if (normalized.includes(".next")) return true;
  for (const s of ALLOWED_SUFFIXES) {
    if (normalized.endsWith(s)) return true;
  }
  return ALLOWED_FILES.some((a) => normalized.endsWith(a));
}

function findFunctionName(lines: string[], lineIndex: number): string {
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

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          if (!entry.startsWith(".") && entry !== "node_modules") {
            files.push(...collectTsFiles(full));
          }
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          files.push(full);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // skip
  }
  return files;
}

/**
 * Scans the entire src/ directory for AI gateway bypass violations.
 *
 * Detects:
 * - Direct `generateText()` / `streamText()` / `generateObject()` / `streamObject()` calls
 * - Direct `new Agent()` instantiation
 * - Direct imports from `ai` or `@ai-sdk/*` packages
 * - Alias imports (e.g. `import { generateText as genText }`)
 * - Hidden re-exports (e.g. `export { generateText } from "ai"`)
 */
export function detectBypassViolations(): Violation[] {
  const violations: Violation[] = [];
  const srcRoot = path.resolve(__dirname, "../../src");

  for (const fullPath of collectTsFiles(srcRoot)) {
    if (isAllowedFile(fullPath)) continue;

    let content: string;
    try {
      content = readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }
    if (!content || content.length < 10) continue;

    const lines = content.split("\n");

    // 1. Direct function calls
    const callPatterns = [
      /generateText\s*\(/g,
      /streamText\s*\(/g,
      /generateObject\s*\(/g,
      /streamObject\s*\(/g,
    ];

    for (const re of callPatterns) {
      for (const match of content.matchAll(re)) {
        if (!match.index) continue;
        const lineNum = content.substring(0, match.index).split("\n").length;
        violations.push({
          filePath: fullPath,
          line: lineNum,
          functionName: findFunctionName(lines, lineNum - 1),
          severity: "critical",
          description: `Direct AI call "${match[0].trim()}()" outside aiGateway.ts`,
          violationType: "direct_call",
        });
      }
    }

    // 2. Direct new Agent() instantiation
    for (const match of content.matchAll(/new\s+Agent\s*\(/g)) {
      if (!match.index) continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      violations.push({
        filePath: fullPath,
        line: lineNum,
        functionName: findFunctionName(lines, lineNum - 1),
        severity: "major",
        description: 'Direct "new Agent()" outside aiGateway.ts',
        violationType: "direct_call",
      });
    }

    // 3. Direct imports from 'ai' or '@ai-sdk/*'
    for (const match of content.matchAll(
      /from\s+['"]ai['"]|from\s+['"]@ai-sdk\/[^'"]+['"]/g
    )) {
      if (!match.index) continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      const isAlias =
        content.substring(0, match.index).includes(" as ") ||
        content.substring(0, match.index).includes(" as ");
      violations.push({
        filePath: fullPath,
        line: lineNum,
        functionName: findFunctionName(lines, lineNum - 1),
        severity: "critical",
        description: isAlias
          ? `Alias import from AI SDK: "${match[0].trim()}"`
          : `Direct import from AI SDK: "${match[0].trim()}"`,
        violationType: isAlias ? "alias_import" : "direct_import",
      });
    }

    // 4. Hidden re-exports of AI functions
    for (const match of content.matchAll(
      /export\s+\{[^}]*\}\s*from\s+['"]ai['"]|export\s+\{[^}]*\}\s*from\s+['"]@ai-sdk/g
    )) {
      if (!match.index) continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      violations.push({
        filePath: fullPath,
        line: lineNum,
        functionName: findFunctionName(lines, lineNum - 1),
        severity: "major",
        description: `Hidden re-export of AI SDK functions: "${match[0].trim()}"`,
        violationType: "hidden_reexport",
      });
    }
  }

  return violations;
}

/**
 * Print formatted violation report to console.
 */
export function printViolationReport(violations: Violation[]): void {
  const critical = violations.filter((v) => v.severity === "critical");
  const major = violations.filter((v) => v.severity === "major");
  const minor = violations.filter((v) => v.severity === "minor");

  console.log("\n" + "═".repeat(47));
  console.log("  AI GATEWAY BYPASS VIOLATION REPORT");
  console.log("═".repeat(47) + "\n");
  console.log(
    `Total: ${violations.length}  |  ` +
      `CRITICAL: ${critical.length}  |  ` +
      `MAJOR: ${major.length}  |  ` +
      `MINOR: ${minor.length}\n`
  );

  if (violations.length === 0) {
    console.log("  ✓ No violations found.\n");
    return;
  }

  for (const v of violations) {
    const label =
      v.severity === "critical"
        ? "CRITICAL"
        : v.severity === "major"
          ? "  MAJOR"
          : "  MINOR";
    console.log(`[${label}] ${v.filePath}:${v.line}`);
    console.log(`  ${v.description}`);
    console.log(`  Type: ${v.violationType}  |  Function: ${v.functionName}\n`);
  }
}
