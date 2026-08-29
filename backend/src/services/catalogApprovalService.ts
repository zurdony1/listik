import { productIndex } from "../brain/ProductIndex";
import { supabase } from "../lib/supabase";

import { saveBrainMemory } from "./brainMemoryService";
import { updateCatalogLearningStatus } from "./catalogLearningService";

export interface ApproveLearningInput {
  learningId: string;

  rawName: string;

  rawCode?: string | null;

  storeName?: string | null;

  product: {
    name: string;
    brand?: string | null;
    category?: string | null;
  };

  presentation: {
    presentationName: string;
    sizeValue?: number | null;
    sizeUnit?: string | null;
    packageType?: string | null;
  };
}

export async function approveCatalogLearning(
  input: ApproveLearningInput,
) {
  /*
   * 1. Crear producto
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .insert({
      name: input.product.name.trim(),

      brand:
        input.product.brand?.trim() ||
        null,

      category:
        input.product.category?.trim() ||
        null,

      barcode:
        input.rawCode?.trim() ||
        null,
    })
    .select(
      `
      id,
      name,
      brand,
      category,
      barcode
    `,
    )
    .single();

  if (productError) {
    throw new Error(
      `No se pudo crear el producto: ${productError.message}`,
    );
  }

  /*
   * 2. Crear presentación
   */
  const {
    data: presentation,
    error: presentationError,
  } = await supabase
    .from("product_presentations")
    .insert({
      product_id: product.id,

      presentation_name:
        input.presentation.presentationName.trim(),

      size_value:
        input.presentation.sizeValue ??
        null,

      size_unit:
        input.presentation.sizeUnit?.trim() ||
        null,

      package_type:
        input.presentation.packageType?.trim() ||
        null,
    })
    .select(
      `
      id,
      product_id,
      presentation_name,
      size_value,
      size_unit,
      package_type
    `,
    )
    .single();

  if (presentationError) {
    throw new Error(
      `Producto creado, pero no se pudo crear la presentación: ${presentationError.message}`,
    );
  }

  /*
   * 3. Guardar código del supermercado
   */
  if (
    input.rawCode?.trim() &&
    input.storeName?.trim()
  ) {
    const {
      error: codeError,
    } = await supabase
      .from("product_codes")
      .insert({
        code:
          input.rawCode.trim(),

        store_name:
          input.storeName.trim(),

        product_id:
          product.id,

        presentation_id:
          presentation.id,
      });

    if (codeError) {
      console.error(
        "⚠️ Error guardando product_code:",
        codeError,
      );
    }
  }

  /*
   * 4. Guardar memoria del Brain
   */
  await saveBrainMemory({
    rawName:
      input.rawName,

    rawCode:
      input.rawCode ?? null,

    storeName:
      input.storeName ?? null,

    productId:
      String(product.id),

    presentationId:
      String(presentation.id),

    confidence: 100,

    source: "manual",

    accepted: true,
  });

  /*
   * 5. Marcar aprendizaje como aprobado
   */
  await updateCatalogLearningStatus(
    input.learningId,
    "approved",
  );

  /*
   * 6. Agregar inmediatamente
   * al índice del Brain
   */
  productIndex.addProduct({
    id:
      String(product.id),

    name:
      String(product.name),

    brand:
      product.brand ?? null,

    category:
      product.category ?? null,

    barcode:
      product.barcode ?? null,
  });

  console.log(
    `🧠 Producto aprendido: ${product.name}`,
  );

  console.log(
    `📦 ProductIndex actualizado (${productIndex.size()} productos)`,
  );

  return {
    product,
    presentation,
  };
}