import { z } from "zod";

const timezoneOptions = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

const countryOptions = [
  "US",
  "CA",
  "UK",
  "DE",
  "FR",
  "AU",
  "IN",
  "AE",
  "SG",
  "NZ",
  "Other",
] as const;

const coachingStyleOptions = [
  "1-on-1 Personal Training",
  "Small Group Coaching",
  "Online Coaching",
  "Hybrid (Online + In-Person)",
  "Corporate Wellness",
] as const;

const experienceOptions = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
] as const;

const specialtyOptions = [
  "Weight Loss",
  "Muscle Building",
  "Strength Training",
  "Endurance & Conditioning",
  "Flexibility & Mobility",
  "Nutrition Coaching",
  "Rehabilitation",
  "Sports Performance",
  "Senior Fitness",
  "Pre/Postnatal Fitness",
] as const;

const languageOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Hindi",
  "Mandarin",
  "Arabic",
  "Other",
] as const;

const clientCountOptions = [
  "Just getting started (0–5)",
  "Growing (5–15)",
  "Established (15–30)",
  "Scaling (30–50)",
  "Large studio (50+)",
] as const;

export const step1Schema = z.object({});

export const step2Schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  businessName: z.string().min(1, "Business name is required"),
  timezone: z.enum(timezoneOptions, { message: "Select a timezone" }),
  country: z.enum(countryOptions, { message: "Select a country" }),
});

export const step3Schema = z.object({
  coachingStyle: z.enum(coachingStyleOptions, {
    message: "Select a coaching style",
  }),
  experienceLevel: z.enum(experienceOptions, {
    message: "Select your experience level",
  }),
  specialties: z.array(z.enum(specialtyOptions)).min(1, "Select at least one specialty"),
  languages: z.array(z.enum(languageOptions)).min(1, "Select at least one language"),
  defaultAvailability: z.string().min(1, "Select your availability"),
});

export const step4Schema = z.object({
  whatsappConnected: z.boolean(),
  expectedClientCount: z.enum(clientCountOptions, {
    message: "Select expected client count",
  }),
  coachingGoals: z.string().min(10, "Share at least 10 characters about your goals"),
});

export const step5Schema = z.object({});

export const onboardingSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,
  ...step5Schema.shape,
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

export const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
] as const;

export const STEP_LABELS = [
  "Welcome",
  "Your Profile",
  "Coaching Details",
  "Business Setup",
  "Done",
] as const;

export { timezoneOptions, countryOptions, coachingStyleOptions, experienceOptions, specialtyOptions, languageOptions, clientCountOptions };
