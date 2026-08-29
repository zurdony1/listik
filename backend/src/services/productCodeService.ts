import { supabase } from "../lib/supabase";

export async function findProductByCode(
  store: string,
  code: string,
) {
  const { data, error } = await supabase
    .from("product_codes")
    .select(
      `
        product_id,
        products (
          id,
          name,
          brand,
          category,
          barcode
        )
      `,
    )
    .eq("store_name", store)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}