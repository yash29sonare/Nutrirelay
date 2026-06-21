import type { Database } from './supabase'

export type { Database }

// Table row types
export type Profile       = Database['public']['Tables']['profiles']['Row']
export type TrainerClient = Database['public']['Tables']['trainer_clients']['Row']
export type MealPlan      = Database['public']['Tables']['meal_plans']['Row']
export type MealSlot      = Database['public']['Tables']['meal_slots']['Row']
export type FoodLog       = Database['public']['Tables']['food_logs']['Row']
export type VoiceNote     = Database['public']['Tables']['voice_notes']['Row']
export type StrikeLog     = Database['public']['Tables']['strike_log']['Row']
export type WeeklyReport  = Database['public']['Tables']['weekly_reports']['Row']
export type Subscription  = Database['public']['Tables']['subscriptions']['Row']
export type UpiPayment    = Database['public']['Tables']['upi_payments']['Row']

// Insert types
export type InsertProfile       = Database['public']['Tables']['profiles']['Insert']
export type InsertMealPlan      = Database['public']['Tables']['meal_plans']['Insert']
export type InsertMealSlot      = Database['public']['Tables']['meal_slots']['Insert']
export type InsertFoodLog       = Database['public']['Tables']['food_logs']['Insert']
export type InsertVoiceNote     = Database['public']['Tables']['voice_notes']['Insert']
export type InsertStrikeLog     = Database['public']['Tables']['strike_log']['Insert']
export type InsertWeeklyReport  = Database['public']['Tables']['weekly_reports']['Insert']
export type InsertSubscription  = Database['public']['Tables']['subscriptions']['Insert']
export type InsertUpiPayment    = Database['public']['Tables']['upi_payments']['Insert']

// Update types
export type UpdateProfile      = Database['public']['Tables']['profiles']['Update']
export type UpdateMealPlan     = Database['public']['Tables']['meal_plans']['Update']
export type UpdateMealSlot     = Database['public']['Tables']['meal_slots']['Update']
export type UpdateFoodLog      = Database['public']['Tables']['food_logs']['Update']
export type UpdateVoiceNote    = Database['public']['Tables']['voice_notes']['Update']
export type UpdateStrikeLog    = Database['public']['Tables']['strike_log']['Update']
export type UpdateWeeklyReport = Database['public']['Tables']['weekly_reports']['Update']
export type UpdateSubscription = Database['public']['Tables']['subscriptions']['Update']
export type UpdateUpiPayment   = Database['public']['Tables']['upi_payments']['Update']

// Enum types
export type PaymentStatusType    = Database['public']['Enums']['payment_status_type']
export type ProcessingStatusType = Database['public']['Enums']['processing_status_type']
export type RoleType             = Database['public']['Enums']['role_type']
