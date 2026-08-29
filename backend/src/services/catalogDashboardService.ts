import { supabase } from "../lib/supabase";

export interface CatalogStats {
  products: number;
  presentations: number;
  codes: number;
  stores: number;
}

export async function getCatalogStats(): Promise<CatalogStats> {
  const [
    products,
    presentations,
    codes,
    stores,
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
      .from("stores")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  return {
    products: products.count ?? 0,
    presentations:
      presentations.count ?? 0,
    codes: codes.count ?? 0,
    stores: stores.count ?? 0,
  };
}