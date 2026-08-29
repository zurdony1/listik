import { supabase } from "../lib/supabase";

export async function getBrainAnalytics() {
  const [

    products,

    presentations,

    codes,

    memories,

  ] = await Promise.all([

    supabase
      .from("products")
      .select("*", {
        head: true,
        count: "exact",
      }),

    supabase
      .from("product_presentations")
      .select("*", {
        head: true,
        count: "exact",
      }),

    supabase
      .from("product_codes")
      .select("*", {
        head: true,
        count: "exact",
      }),

    supabase
      .from("brain_memory")
      .select("*", {
        head: true,
        count: "exact",
      }),
  ]);

  return {

    products:
      products.count ?? 0,

    presentations:
      presentations.count ?? 0,

    codes:
      codes.count ?? 0,

    memories:
      memories.count ?? 0,

  };
}