import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// ── Keyword macro database (per standard serving) ────────────────────────────
// Values are approximate kcal / protein_g / carbs_g / fat_g per serving.
const FOOD_DB: Record<string, { cal: number; p: number; c: number; f: number }> = {
  // Proteins
  chicken:   { cal: 165, p: 31, c: 0,  f: 3.6 },
  egg:       { cal: 78,  p: 6,  c: 0.6,f: 5   },
  paneer:    { cal: 100, p: 7,  c: 1.2,f: 7.5 },
  fish:      { cal: 136, p: 27, c: 0,  f: 3   },
  mutton:    { cal: 200, p: 25, c: 0,  f: 10  },
  tofu:      { cal: 76,  p: 8,  c: 2,  f: 4   },
  // Carbs
  rice:      { cal: 206, p: 4,  c: 45, f: 0.4 },
  roti:      { cal: 120, p: 3,  c: 22, f: 2.5 },
  chapati:   { cal: 120, p: 3,  c: 22, f: 2.5 },
  bread:     { cal: 79,  p: 3,  c: 15, f: 1   },
  pasta:     { cal: 220, p: 8,  c: 43, f: 1.3 },
  noodle:    { cal: 220, p: 7,  c: 40, f: 2   },
  oats:      { cal: 150, p: 5,  c: 27, f: 3   },
  poha:      { cal: 180, p: 3,  c: 35, f: 3   },
  idli:      { cal: 80,  p: 2,  c: 15, f: 0.5 },
  dosa:      { cal: 120, p: 3,  c: 20, f: 3   },
  paratha:   { cal: 200, p: 4,  c: 30, f: 7   },
  // Lentils / legumes
  dal:       { cal: 120, p: 8,  c: 20, f: 0.8 },
  lentil:    { cal: 120, p: 8,  c: 20, f: 0.8 },
  rajma:     { cal: 140, p: 9,  c: 24, f: 0.5 },
  chole:     { cal: 150, p: 9,  c: 25, f: 2.5 },
  // Dairy
  milk:      { cal: 61,  p: 3,  c: 5,  f: 3.3 },
  curd:      { cal: 60,  p: 3,  c: 5,  f: 3   },
  yogurt:    { cal: 60,  p: 3,  c: 5,  f: 3   },
  butter:    { cal: 102, p: 0.1,c: 0,  f: 11.5},
  ghee:      { cal: 112, p: 0,  c: 0,  f: 12.5},
  cheese:    { cal: 113, p: 7,  c: 0.4,f: 9   },
  // Vegetables
  sabzi:     { cal: 80,  p: 2,  c: 12, f: 3   },
  vegetable: { cal: 70,  p: 2,  c: 12, f: 2   },
  spinach:   { cal: 30,  p: 3,  c: 4,  f: 0.5 },
  broccoli:  { cal: 55,  p: 4,  c: 11, f: 0.6 },
  potato:    { cal: 130, p: 3,  c: 30, f: 0.2 },
  aloo:      { cal: 130, p: 3,  c: 30, f: 0.2 },
  // Fruits
  apple:     { cal: 95,  p: 0.5,c: 25, f: 0.3 },
  banana:    { cal: 105, p: 1.3,c: 27, f: 0.4 },
  mango:     { cal: 100, p: 0.8,c: 25, f: 0.4 },
  orange:    { cal: 62,  p: 1.2,c: 15, f: 0.2 },
  // Snacks / mixed
  samosa:    { cal: 250, p: 4,  c: 30, f: 12  },
  biryani:   { cal: 350, p: 15, c: 45, f: 10  },
  salad:     { cal: 60,  p: 2,  c: 10, f: 2   },
  shake:     { cal: 250, p: 20, c: 30, f: 5   },
  smoothie:  { cal: 200, p: 5,  c: 38, f: 2   },
}

// ── Generic fallback — 300 kcal balanced macro split ─────────────────────────
const FALLBACK = { cal: 300, p: 15, c: 40, f: 8 }

export const parseMeal = createTool({
  id:          'meal-parser',
  description: 'Breaks down unstructured nutritional intake strings into structured macro estimates (calories, protein, carbs, fat) using a zero-cost local keyword heuristic — no external LLM calls.',
  inputSchema: z.object({
    text: z.string().describe('Raw text description of the meal consumed'),
  }),
  outputSchema: z.object({
    calories: z.number(),
    protein:  z.number(),
    carbs:    z.number(),
    fat:      z.number(),
  }),
  execute: async ({ context }: any) => {
    const { text } = context as { text: string }
    const input = (text ?? '').toLowerCase().trim()

    if (!input) {
      return { calories: FALLBACK.cal, protein: FALLBACK.p, carbs: FALLBACK.c, fat: FALLBACK.f }
    }

    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0
    let matched = 0

    for (const [keyword, macros] of Object.entries(FOOD_DB)) {
      if (input.includes(keyword)) {
        totalCal += macros.cal
        totalP   += macros.p
        totalC   += macros.c
        totalF   += macros.f
        matched++
      }
    }

    if (matched === 0) {
      // Fallback: estimate from string length — longer descriptions imply larger meals
      const lengthFactor = Math.min(Math.max(input.length / 20, 0.5), 3)
      return {
        calories: Math.round(FALLBACK.cal * lengthFactor),
        protein:  Math.round(FALLBACK.p   * lengthFactor * 10) / 10,
        carbs:    Math.round(FALLBACK.c   * lengthFactor * 10) / 10,
        fat:      Math.round(FALLBACK.f   * lengthFactor * 10) / 10,
      }
    }

    return {
      calories: Math.round(totalCal),
      protein:  Math.round(totalP  * 10) / 10,
      carbs:    Math.round(totalC  * 10) / 10,
      fat:      Math.round(totalF  * 10) / 10,
    }
  },
})
