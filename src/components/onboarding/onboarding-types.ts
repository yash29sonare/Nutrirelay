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

export const step1Schema = z.object({});

export const step2Schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  businessName: z.string().min(1, "Business name is required"),
  timezone: z.enum(timezoneOptions, { message: "Select a timezone" }),
  country: z.enum(countryOptions, { message: "Select a country" }),
});

export const step3Schema = z.object({});

export const onboardingSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

export const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
] as const;

export const STEP_LABELS = [
  "Welcome",
  "Your Profile",
  "Done",
] as const;

export { timezoneOptions, countryOptions };
