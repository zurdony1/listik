import { supabase } from "../supabase";

export async function getDashboardStats() {
  const [products, stores, prices] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("stores")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("prices")
      .select("*", { count: "exact", head: true }),
  ]);

  if (products.error) throw products.error;
  if (stores.error) throw stores.error;
  if (prices.error) throw prices.error;

  return {
    totalProducts: products.count ?? 0,
    totalStores: stores.count ?? 0,
    totalPrices: prices.count ?? 0,
  };
}