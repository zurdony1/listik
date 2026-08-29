import { supabase } from "../services/supabase";

export interface BrainDashboardStats {
  products: number;
  presentations: number;
  codes: number;
  pendingLearning: number;
}

export async function getBrainStats(): Promise<BrainDashboardStats> {
  const [
    products,
    presentations,
    codes,
    learning,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("product_presentations")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("product_codes")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("brain_memory")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  return {
    products: products.count ?? 0,
    presentations: presentations.count ?? 0,
    codes: codes.count ?? 0,
    pendingLearning: learning.count ?? 0,
  };
}