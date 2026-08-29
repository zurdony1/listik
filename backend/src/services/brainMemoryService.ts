import { supabase } from "../lib/supabase";
import { normalizeText } from "../brain/normalize";

export interface SaveBrainMemoryInput {
  rawName: string;
  rawCode?: string | null;
  storeName?: string | null;
  productId?: string | null;
  presentationId?: string | null;
  confidence: number;

  source:
    | "code"
    | "name"
    | "manual";

  accepted: boolean;
}

export interface AcceptedMemorySuggestion {
  found: boolean;

  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
  } | null;

  presentation: {
    id: string;
    presentationName: string;
    sizeValue: number | null;
    sizeUnit: string | null;
    packageType: string | null;
  } | null;

  confidence: number;
}

/*
 * Guardar una memoria nueva.
 */
export async function saveBrainMemory(
  input: SaveBrainMemoryInput,
) {
  const normalizedRawName =
    normalizeText(
      input.rawName,
    );

  const {
    data,
    error,
  } = await supabase
    .from("brain_memory")
    .insert({
      raw_name:
        input.rawName,

      normalized_raw_name:
        normalizedRawName,

      raw_code:
        input.rawCode ?? null,

      store_name:
        input.storeName ?? null,

      product_id:
        input.productId ?? null,

      presentation_id:
        input.presentationId ?? null,

      confidence:
        input.confidence,

      source:
        input.source,

      accepted:
        input.accepted,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo guardar la memoria: ${error.message}`,
    );
  }

  return data;
}

/*
 * Contar memorias anteriores
 * aceptadas para el mismo texto.
 */
export async function countPreviousMemories(
  rawName: string,
  storeName?: string | null,
): Promise<number> {
  const normalizedRawName =
    normalizeText(
      rawName,
    );

  let query = supabase
    .from("brain_memory")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "normalized_raw_name",
      normalizedRawName,
    )
    .eq(
      "accepted",
      true,
    );

  if (storeName?.trim()) {
    query =
      query.eq(
        "store_name",
        storeName.trim(),
      );
  }

  const {
    count,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `No se pudieron consultar memorias: ${error.message}`,
    );
  }

  return count ?? 0;
}

/*
 * Buscar una memoria aceptada
 * por coincidencia exacta del
 * texto normalizado.
 */
export async function findAcceptedMemory(
  rawName: string,
  storeName?: string | null,
) {
  const normalizedRawName =
    normalizeText(
      rawName,
    );

  let query = supabase
    .from("brain_memory")
    .select(`
      id,
      raw_name,
      normalized_raw_name,
      raw_code,
      store_name,
      product_id,
      presentation_id,
      confidence,
      source,
      accepted,
      created_at
    `)
    .eq(
      "normalized_raw_name",
      normalizedRawName,
    )
    .eq(
      "accepted",
      true,
    )
    .not(
      "product_id",
      "is",
      null,
    );

  /*
   * Si conocemos la tienda,
   * priorizamos una memoria
   * de esa misma tienda.
   */
  if (storeName?.trim()) {
    query =
      query.eq(
        "store_name",
        storeName.trim(),
      );
  }

  const {
    data: memory,
    error: memoryError,
  } = await query
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (memoryError) {
    throw new Error(
      `No se pudo consultar Brain Memory: ${memoryError.message}`,
    );
  }

  if (!memory) {
    return null;
  }

  /*
   * Recuperar producto.
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      category,
      barcode
    `)
    .eq(
      "id",
      memory.product_id,
    )
    .maybeSingle();

  if (productError) {
    throw new Error(
      `No se pudo recuperar el producto aprendido: ${productError.message}`,
    );
  }

  if (!product) {
    return null;
  }

  /*
   * Recuperar presentación
   * si existe.
   */
  let presentation:
    | {
        id: string;
        product_id: string | null;
        presentation_name: string | null;
        size_value: number | null;
        size_unit: string | null;
        package_type: string | null;
      }
    | null = null;

  if (memory.presentation_id) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "product_presentations",
      )
      .select(`
        id,
        product_id,
        presentation_name,
        size_value,
        size_unit,
        package_type
      `)
      .eq(
        "id",
        memory.presentation_id,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `No se pudo recuperar la presentación aprendida: ${error.message}`,
      );
    }

    presentation = data;
  }

  return {
    memory,

    presentation: {
      id:
        String(
          presentation?.id ??
            memory.presentation_id ??
            product.id,
        ),

      productId:
        String(
          product.id,
        ),

      productName:
        String(
          product.name,
        ),

      name:
        String(
          product.name,
        ),

      brand:
        product.brand ??
        null,

      category:
        product.category ??
        null,

      presentationName:
        presentation
          ?.presentation_name ??
        "",

      sizeValue:
        presentation
          ?.size_value ??
        null,

      sizeUnit:
        presentation
          ?.size_unit ??
        null,

      packageType:
        presentation
          ?.package_type ??
        null,
    },
  };
}

/*
 * Adaptador de Brain Memory
 * para Smart Suggestion.
 */
export async function findMemorySuggestion(
  rawName: string,
  storeName?: string | null,
): Promise<AcceptedMemorySuggestion> {
  const result =
    await findAcceptedMemory(
      rawName,
      storeName,
    );

  if (!result) {
    return {
      found: false,
      product: null,
      presentation: null,
      confidence: 0,
    };
  }

  return {
    found: true,

    product: {
      id:
        result.presentation
          .productId,

      name:
        result.presentation
          .productName,

      brand:
        result.presentation
          .brand,

      category:
        result.presentation
          .category,
    },

    presentation: {
      id:
        result.presentation.id,

      presentationName:
        result.presentation
          .presentationName,

      sizeValue:
        result.presentation
          .sizeValue,

      sizeUnit:
        result.presentation
          .sizeUnit,

      packageType:
        result.presentation
          .packageType,
    },

    /*
     * Es conocimiento que ya
     * aprobó una persona.
     */
    confidence: 100,
  };
}