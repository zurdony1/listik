import { supabase } from "../supabase";

export interface ProductInput {
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  image_url: string | null;
}

export async function getAdminProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createProduct(product: ProductInput) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProduct(
  id: string,
  product: ProductInput,
) {
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}