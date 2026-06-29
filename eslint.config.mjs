import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mastra build output — not source code
    ".mastra/**",
    // Scripts — standalone tooling with CJS require()
    "scripts/**",
  ]),

  // ── AI Gateway Architectural Boundary ─────────────────────────────
  // All AI calls MUST route through src/ai/aiGateway.ts
  // Direct AI SDK usage is a violation outside the gateway file.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "ai",
              message:
                "Use aiGateway.runAI() instead. Direct imports from 'ai' are forbidden outside src/ai/aiGateway.ts",
            },
            {
              name: "@ai-sdk/google",
              message:
                "Use aiGateway.runAI() instead. Direct imports from '@ai-sdk/google' are forbidden outside src/ai/aiGateway.ts",
            },
          ],
          patterns: [
            {
              group: ["@ai-sdk/*"],
              message:
                "Use aiGateway.runAI() instead. Direct @ai-sdk imports are forbidden outside src/ai/aiGateway.ts",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'CallExpression[callee.name="generateText"]',
          message:
            "Use aiGateway.runAI() instead. Direct generateText() calls are forbidden.",
        },
        {
          selector:
            'CallExpression[callee.name="streamText"]',
          message:
            "Use aiGateway.runAI() instead. Direct streamText() calls are forbidden.",
        },
        {
          selector:
            'CallExpression[callee.name="generateObject"]',
          message:
            "Use aiGateway.runAI() instead. Direct generateObject() calls are forbidden.",
        },
        {
          selector:
            'CallExpression[callee.name="streamObject"]',
          message:
            "Use aiGateway.runAI() instead. Direct streamObject() calls are forbidden.",
        },
        {
          selector:
            'NewExpression[callee.name="Agent"]',
          message:
            "Use aiGateway.runAI() instead. Direct Agent() instantiation is forbidden.",
        },
      ],
    },
  },

  // ── Gateway file exemption ─────────────────────────────────────────
  // Only src/ai/aiGateway.ts may import and use AI SDK directly.
  {
    files: ["src/ai/aiGateway.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },

  // ── Mastra config exemption — defines model instances, not AI calls ──
  {
    files: ["src/mastra/config.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },

  // ── Mastra Agent definitions — framework wrappers, not direct AI calls ──
  {
    files: ["src/mastra/agents/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  // ── Enforcement modules — contain detection patterns, not real AI calls ──
  {
    files: ["src/ai/enforcement.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // ── Test file exemption ────────────────────────────────────────────
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
