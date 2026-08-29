import { supabase } from "../lib/supabase";
import { getCatalogProducts } from "./productCatalogService";
import { parseProductName } from "../utils/productParser";

interface MigrationStats {
  productsProcessed: number;
  brandsCreated: number;
  categoriesCreated: number;
  presentationsCreated: number;
  productsUpdated: number;
  errors: number;
}

function normalizeCatalogName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getOrCreateBrand(
  brandName: string | null,
): Promise<{
  id: string | null;
  created: boolean;
}> {
  if (!brandName?.trim()) {
    return {
      id: null,
      created: false,
    };
  }

  const cleanName = brandName.trim();

  const { data: existingBrand, error: searchError } =
    await supabase
      .from("brands")
      .select("id")
      .ilike("name", cleanName)
      .maybeSingle();

  if (searchError) {
    throw new Error(
      `Error buscando marca "${cleanName}": ${searchError.message}`,
    );
  }

  if (existingBrand) {
    return {
      id: String(existingBrand.id),
      created: false,
    };
  }

  const { data: newBrand, error: insertError } =
    await supabase
      .from("brands")
      .insert({
        name: cleanName,
      })
      .select("id")
      .single();

  if (insertError) {
    throw new Error(
      `Error creando marca "${cleanName}": ${insertError.message}`,
    );
  }

  return {
    id: String(newBrand.id),
    created: true,
  };
}

async function getOrCreateCategory(
  categoryName: string | null,
): Promise<{
  id: string | null;
  created: boolean;
}> {
  if (!categoryName?.trim()) {
    return {
      id: null,
      created: false,
    };
  }

  const cleanName = categoryName.trim();

  const {
    data: existingCategory,
    error: searchError,
  } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", cleanName)
    .maybeSingle();

  if (searchError) {
    throw new Error(
      `Error buscando categoría "${cleanName}": ${searchError.message}`,
    );
  }

  if (existingCategory) {
    return {
      id: String(existingCategory.id),
      created: false,
    };
  }

  const {
    data: newCategory,
    error: insertError,
  } = await supabase
    .from("categories")
    .insert({
      name: cleanName,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(
      `Error creando categoría "${cleanName}": ${insertError.message}`,
    );
  }

  return {
    id: String(newCategory.id),
    created: true,
  };
}

async function createPresentationIfNeeded(
  productId: string,
  productName: string,
  barcode: string | null,
): Promise<boolean> {
  const parsed = parseProductName(productName);

  const {
    data: existingPresentation,
    error: searchError,
  } = await supabase
    .from("product_presentations")
    .select("id")
    .eq("product_id", productId)
    .eq("presentation_name", productName)
    .maybeSingle();

  if (searchError) {
    throw new Error(
      `Error buscando presentación de "${productName}": ${searchError.message}`,
    );
  }

  if (existingPresentation) {
    return false;
  }

  const {
    error: insertError,
  } = await supabase
    .from("product_presentations")
    .insert({
      product_id: productId,
      presentation_name: productName,
      size_value: parsed.sizeValue,
      size_unit: parsed.sizeUnit,
      package_type: null,
      units_per_package: 1,
      barcode,
    });

  if (insertError) {
    throw new Error(
      `Error creando presentación de "${productName}": ${insertError.message}`,
    );
  }

  return true;
}

export async function migrateCatalog(): Promise<MigrationStats> {
  console.log("");
  console.log("🚀 Iniciando migración del catálogo Listik...");
  console.log("");

  const products = await getCatalogProducts();

  const stats: MigrationStats = {
    productsProcessed: 0,
    brandsCreated: 0,
    categoriesCreated: 0,
    presentationsCreated: 0,
    productsUpdated: 0,
    errors: 0,
  };

  for (const product of products) {
    console.log("----------------------------------------");
    console.log(`📦 ${product.name}`);

    try {
      stats.productsProcessed++;

      const parsed = parseProductName(product.name);

      console.log(
        `   Presentación detectada: ${
          parsed.sizeValue && parsed.sizeUnit
            ? `${parsed.sizeValue} ${parsed.sizeUnit}`
            : "Sin medida detectada"
        }`,
      );

      /*
       * 1. MARCA
       */

      const brand = await getOrCreateBrand(
        product.brand,
      );

      if (brand.created) {
        stats.brandsCreated++;

        console.log(
          `   ✅ Marca creada: ${product.brand}`,
        );
      } else if (brand.id) {
        console.log(
          `   ↪ Marca existente: ${product.brand}`,
        );
      }

      /*
       * 2. CATEGORÍA
       */

      const category =
        await getOrCreateCategory(
          product.category,
        );

      if (category.created) {
        stats.categoriesCreated++;

        console.log(
          `   ✅ Categoría creada: ${product.category}`,
        );
      } else if (category.id) {
        console.log(
          `   ↪ Categoría existente: ${product.category}`,
        );
      }

      /*
       * 3. ACTUALIZAR PRODUCTO
       */

      const normalizedName =
        normalizeCatalogName(product.name);

      const {
        error: updateError,
      } = await supabase
        .from("products")
        .update({
          normalized_name: normalizedName,
          brand_id: brand.id,
          category_id: category.id,
        })
        .eq("id", product.id);

      if (updateError) {
        throw new Error(
          `Error actualizando producto: ${updateError.message}`,
        );
      }

      stats.productsUpdated++;

      console.log(
        `   ✅ Producto actualizado`,
      );

      /*
       * 4. PRESENTACIÓN
       */

      const presentationCreated =
        await createPresentationIfNeeded(
          product.id,
          product.name,
          product.barcode,
        );

      if (presentationCreated) {
        stats.presentationsCreated++;

        console.log(
          `   ✅ Presentación creada`,
        );
      } else {
        console.log(
          `   ↪ Presentación ya existente`,
        );
      }
    } catch (error) {
      stats.errors++;

      console.error(
        `   ❌ Error procesando "${product.name}"`,
      );

      console.error(
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("✅ MIGRACIÓN TERMINADA");
  console.log("========================================");
  console.log(
    `📦 Productos procesados: ${stats.productsProcessed}`,
  );
  console.log(
    `🏷️ Marcas creadas: ${stats.brandsCreated}`,
  );
  console.log(
    `📂 Categorías creadas: ${stats.categoriesCreated}`,
  );
  console.log(
    `📏 Presentaciones creadas: ${stats.presentationsCreated}`,
  );
  console.log(
    `🔄 Productos actualizados: ${stats.productsUpdated}`,
  );
  console.log(
    `❌ Errores: ${stats.errors}`,
  );
  console.log("");

  return stats;
}