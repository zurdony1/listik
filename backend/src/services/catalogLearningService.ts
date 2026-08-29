import { supabase } from "../lib/supabase";
import { normalizeText } from "../brain/normalize";

export type CatalogLearningStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface CreateCatalogLearningInput {
  rawName: string;

  rawCode?: string | null;

  storeName?: string | null;

  suggestedProductId?: string | null;

  suggestedPresentationId?: string | null;

  confidence?: number;
}

export async function createCatalogLearning(
  input: CreateCatalogLearningInput,
) {
  const normalizedRawName =
    normalizeText(input.rawName);

  /*
   * Evitar pendientes duplicados.
   */
  let existingQuery = supabase
    .from("catalog_learning")
    .select(`
      id,
      raw_name,
      raw_code,
      store_name,
      confidence,
      status,
      created_at
    `)
    .eq(
      "normalized_raw_name",
      normalizedRawName,
    )
    .eq(
      "status",
      "pending",
    );

  if (input.storeName?.trim()) {
    existingQuery =
      existingQuery.eq(
        "store_name",
        input.storeName.trim(),
      );
  }

  if (input.rawCode?.trim()) {
    existingQuery =
      existingQuery.eq(
        "raw_code",
        input.rawCode.trim(),
      );
  }

  const {
    data: existing,
    error: existingError,
  } = await existingQuery
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `No se pudo revisar la cola: ${existingError.message}`,
    );
  }

  /*
   * Ya está esperando revisión.
   */
  if (existing) {
    return existing;
  }

  /*
   * Crear nuevo pendiente.
   */
  const {
    data,
    error,
  } = await supabase
    .from("catalog_learning")
    .insert({
      raw_name:
        input.rawName.trim(),

      normalized_raw_name:
        normalizedRawName,

      raw_code:
        input.rawCode?.trim() ||
        null,

      store_name:
        input.storeName?.trim() ||
        null,

      suggested_product_id:
        input.suggestedProductId ??
        null,

      suggested_presentation_id:
        input.suggestedPresentationId ??
        null,

      confidence:
        Math.max(
          0,
          Math.min(
            100,
            input.confidence ?? 0,
          ),
        ),

      status:
        "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear el aprendizaje de catálogo: ${error.message}`,
    );
  }

  return data;
}

export async function getPendingCatalogLearning() {
  const {
    data,
    error,
  } = await supabase
    .from("catalog_learning")
    .select(`
      id,
      raw_name,
      normalized_raw_name,
      raw_code,
      store_name,
      suggested_product_id,
      suggested_presentation_id,
      confidence,
      status,
      created_at
    `)
    .eq(
      "status",
      "pending",
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo cargar la cola de aprendizaje: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function updateCatalogLearningStatus(
  id: string,
  status: CatalogLearningStatus,
) {
  const {
    data,
    error,
  } = await supabase
    .from("catalog_learning")
    .update({
      status,

      reviewed_at:
        status === "pending"
          ? null
          : new Date().toISOString(),
    })
    .eq(
      "id",
      id,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar el aprendizaje: ${error.message}`,
    );
  }

  return data;
}