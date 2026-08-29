import { supabase } from "../lib/supabase";

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
}

export async function getCatalogProducts(): Promise<
  CatalogProduct[]
> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, brand, category, barcode")
    .order("name");

  if (error) {
    throw new Error(
      `No se pudo cargar el catálogo: ${error.message}`,
    );
  }

  return (data ?? []).map((product) => ({
    id: String(product.id),
    name: String(product.name),
    brand: product.brand ?? null,
    category: product.category ?? null,
    barcode: product.barcode ?? null,
  }));
}