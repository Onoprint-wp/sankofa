import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function verifyUserNotSuspended(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_suspended")
      .eq("id", userId)
      .single();
    if (error || !data) {
      return false;
    }
    return !data.is_suspended;
  } catch (err) {
    console.error("Error in verifyUserNotSuspended:", err);
    return false;
  }
}
