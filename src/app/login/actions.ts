"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function loginErrorRedirect(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    loginErrorRedirect("Enter your email and password to sign in.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginErrorRedirect("Invalid email or password.");
  }

  redirect("/dashboard");
}
