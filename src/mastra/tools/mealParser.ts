import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// ── Keyword macro database (per standard serving) ────────────────────────────
// Values are approximate kcal / protein_g / carbs_g / fat_g per serving.
export const FOOD_DB: Record<string, { cal: number; p: number; c: number; f: number }> = {
  // Proteins
  chicken:   { cal: 165, p: 31, c: 0,  f: 3.6 },
  anda:      { cal: 78,  p: 6,  c: 0.6,f: 5   },
  ande:      { cal: 78,  p: 6,  c: 0.6,f: 5   },
  egg:       { cal: 78,  p: 6,  c: 0.6,f: 5   },
  eggs:      { cal: 78,  p: 6,  c: 0.6,f: 5   },
  अंडा:      { cal: 78,  p: 6,  c: 0.6,f: 5   },
  अंडे:      { cal: 78,  p: 6,  c: 0.6,f: 5   },
  paneer:    { cal: 100, p: 7,  c: 1.2,f: 7.5 },
  पनीर:      { cal: 100, p: 7,  c: 1.2,f: 7.5 },
  fish:      { cal: 136, p: 27, c: 0,  f: 3   },
  mutton:    { cal: 200, p: 25, c: 0,  f: 10  },
  tofu:      { cal: 76,  p: 8,  c: 2,  f: 4   },
  // Carbs
  rice:      { cal: 206, p: 4,  c: 45, f: 0.4 },
  chawal:    { cal: 206, p: 4,  c: 45, f: 0.4 },
  चावल:      { cal: 206, p: 4,  c: 45, f: 0.4 },
  roti:      { cal: 120, p: 3,  c: 22, f: 2.5 },
  rotiyan:   { cal: 120, p: 3,  c: 22, f: 2.5 },
  रोटी:      { cal: 120, p: 3,  c: 22, f: 2.5 },
  chapati:   { cal: 120, p: 3,  c: 22, f: 2.5 },
  bread:     { cal: 79,  p: 3,  c: 15, f: 1   },
  pasta:     { cal: 220, p: 8,  c: 43, f: 1.3 },
  noodle:    { cal: 220, p: 7,  c: 40, f: 2   },
  oats:      { cal: 150, p: 5,  c: 27, f: 3   },
  ओट्स:      { cal: 150, p: 5,  c: 27, f: 3   },
  poha:      { cal: 180, p: 3,  c: 35, f: 3   },
  idli:      { cal: 80,  p: 2,  c: 15, f: 0.5 },
  dosa:      { cal: 120, p: 3,  c: 20, f: 3   },
  paratha:   { cal: 200, p: 4,  c: 30, f: 7   },
  // Lentils / legumes
  dal:       { cal: 120, p: 8,  c: 20, f: 0.8 },
  दाल:       { cal: 120, p: 8,  c: 20, f: 0.8 },
  lentil:    { cal: 120, p: 8,  c: 20, f: 0.8 },
  rajma:     { cal: 140, p: 9,  c: 24, f: 0.5 },
  chole:     { cal: 150, p: 9,  c: 25, f: 2.5 },
  // Dairy
  milk:      { cal: 61,  p: 3,  c: 5,  f: 3.3 },
  doodh:     { cal: 61,  p: 3,  c: 5,  f: 3.3 },
  दूध:       { cal: 61,  p: 3,  c: 5,  f: 3.3 },
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
  kela:      { cal: 105, p: 1.3,c: 27, f: 0.4 },
  केला:      { cal: 105, p: 1.3,c: 27, f: 0.4 },
  mango:     { cal: 100, p: 0.8,c: 25, f: 0.4 },
  orange:    { cal: 62,  p: 1.2,c: 15, f: 0.2 },
  // Snacks / mixed
  samosa:    { cal: 250, p: 4,  c: 30, f: 12  },
  biryani:   { cal: 350, p: 15, c: 45, f: 10  },
  salad:     { cal: 60,  p: 2,  c: 10, f: 2   },
  सलाद:      { cal: 60,  p: 2,  c: 10, f: 2   },
  shake:     { cal: 250, p: 20, c: 30, f: 5   },
  smoothie:  { cal: 200, p: 5,  c: 38, f: 2   },
}

// ── Generic fallback — 300 kcal balanced macro split ─────────────────────────
const FALLBACK = { cal: 300, p: 15, c: 40, f: 8 }

function normalizeMealText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getMatchedMealKeywords(text: string): string[] {
  const input = normalizeMealText(text)
  if (!input) return []

  return Object.keys(FOOD_DB).filter((keyword) => {
    const pattern = new RegExp(`(^|\\s)${keyword}(?=\\s|$)`, "u")
    return pattern.test(input)
  })
}

export function looksMealRelatedText(text: string): boolean {
  return getMatchedMealKeywords(text).length > 0
}

export function estimateMealFromText(text: string): {
  food_name: string
  estimated_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size: string
} | null {
  const input = normalizeMealText(text)
  if (!input) return null

  const matchedKeywords = getMatchedMealKeywords(input)
  if (matchedKeywords.length === 0) {
    return null
  }

  const quantityWords: Record<string, number> = {
    a: 1,
    an: 1,
    one: 1,
    ek: 1,
    एक: 1,
    two: 2,
    do: 2,
    दो: 2,
    three: 3,
    teen: 3,
    तीन: 3,
    four: 4,
    char: 4,
    चार: 4,
  }

  let totalCal = 0
  let totalP = 0
  let totalC = 0
  let totalF = 0

  for (const keyword of matchedKeywords) {
    const macros = FOOD_DB[keyword]
    const quantityPattern = new RegExp(`(?:^|\\s)(\\d+|${Object.keys(quantityWords).join("|")})\\s+${keyword}(?=\\s|$)`, "u")
    const quantityMatch = input.match(quantityPattern)
    const quantityToken = quantityMatch?.[1] ?? "1"
    const quantity = Number.parseInt(quantityToken, 10) || quantityWords[quantityToken] || 1

    totalCal += macros.cal * quantity
    totalP += macros.p * quantity
    totalC += macros.c * quantity
    totalF += macros.f * quantity
  }

  return {
    food_name: matchedKeywords.join(', '),
    estimated_calories: Math.round(totalCal),
    protein_g: Math.round(totalP * 10) / 10,
    carbs_g: Math.round(totalC * 10) / 10,
    fat_g: Math.round(totalF * 10) / 10,
    serving_size: matchedKeywords.length > 1 ? 'mixed meal' : '1 serving',
  }
}

export const parseMeal = createTool({
  id:          'meal-parser',
  description: 'Breaks down unstructured nutritional intake strings into structured macro estimates (calories, protein, carbs, fat) using a zero-cost local keyword heuristic — no external LLM calls.',
  inputSchema: z.object({
    text: z.string().describe('Raw text description of the meal consumed'),
    clientContext: z.string().optional().describe('Optional JSON string of client context (goal_type, allergies, dietary_preferences) for context-aware estimation'),
  }),
  outputSchema: z.object({
    calories: z.number(),
    protein:  z.number(),
    carbs:    z.number(),
    fat:      z.number(),
  }),
  execute: async ({ context }: any) => {
    const { text, clientContext } = context as { text: string; clientContext?: string }
    let goalType = '', allergies: string[] = [], dietaryPrefs: string[] = []
    if (clientContext) {
      try {
        const parsed = JSON.parse(clientContext)
        goalType = parsed.goal_type ?? ''
        allergies = parsed.allergies ?? []
        dietaryPrefs = parsed.dietary_preferences ?? []
      } catch {}
    }
    const input = normalizeMealText(text ?? '')

    if (!input) {
      return { calories: FALLBACK.cal, protein: FALLBACK.p, carbs: FALLBACK.c, fat: FALLBACK.f }
    }

    const estimated = estimateMealFromText(input)
    if (!estimated) {
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
      calories: estimated.estimated_calories,
      protein: estimated.protein_g,
      carbs: estimated.carbs_g,
      fat: estimated.fat_g,
    }
  },
})
