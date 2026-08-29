import { supabase } from "../lib/supabase";

export interface ProductPresentation {
  id: string;
  presentation_name: string;
  size_value: number | null;
  size_unit: string | null;
  package_type: string | null;
  units_per_package: number | null;
}

export async function getPresentations(
  productId: string,
): Promise<ProductPresentation[]> {
  const { data, error } = await supabase
    .from("product_presentations")
    .select(`
      id,
      presentation_name,
      size_value,
      size_unit,
      package_type,
      units_per_package
    `)
    .eq("product_id", productId)
    .order("presentation_name");

  if (error) {
    throw error;
  }

  return data ?? [];
}