import { supabase } from "../lib/supabase";

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  normalized_name: string | null;
}

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as Product[];
}

export async function createProduct(
  product: Omit<Product, "id">,
) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateProduct(
  id: string,
  product: Partial<Product>,
) {
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}