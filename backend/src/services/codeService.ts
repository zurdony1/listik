import { supabase } from "../lib/supabase";

export interface ProductCode {
  id: string;
  code: string;
  store_name: string;
  presentation_id: string | null;
}

export interface CreateProductCodeInput {
  presentationId: string;
  productId: string;
  storeName: string;
  code: string;
}

export async function getCodesByPresentation(
  presentationId: string,
): Promise<ProductCode[]> {
  const { data, error } = await supabase
    .from("product_codes")
    .select(`
      id,
      code,
      store_name,
      presentation_id
    `)
    .eq("presentation_id", presentationId)
    .order("store_name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createProductCode(
  input: CreateProductCodeInput,
) {
  const { data, error } = await supabase
    .from("product_codes")
    .insert({
      presentation_id: input.presentationId,
      product_id: input.productId,
      store_name: input.storeName.trim(),
      code: input.code.trim(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}