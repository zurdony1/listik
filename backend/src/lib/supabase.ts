import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta SUPABASE_URL en el archivo backend/.env",
  );
}

if (!supabaseKey) {
  throw new Error(
    "Falta SUPABASE_KEY en el archivo backend/.env",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);