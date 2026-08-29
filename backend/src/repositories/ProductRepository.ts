import { supabase } from "../lib/supabase";

export class ProductRepository {
  static async findPresentationByCode(
    storeName: string,
    code: string,
  ) {
    const cleanStoreName = storeName.trim();
    const cleanCode = code.trim();

    console.log("");
    console.log("🔎 CODE MATCHER");
    console.log("Tienda:", JSON.stringify(cleanStoreName));
    console.log("Código:", JSON.stringify(cleanCode));

    /*
     * 1. Buscar el código interno de la tienda
     */
    const {
      data: codeRow,
      error: codeError,
    } = await supabase
      .from("product_codes")
      .select(`
        presentation_id,
        product_id,
        store_name,
        code
      `)
      .ilike("store_name", cleanStoreName)
      .eq("code", cleanCode)
      .maybeSingle();

    if (codeError) {
      console.error(
        "❌ Error buscando código:",
        codeError,
      );

      throw codeError;
    }

    console.log(
      "Resultado product_codes:",
      codeRow,
    );

    if (!codeRow) {
      console.log(
        "⚠️ Código no encontrado. Se usará NameMatcher.",
      );

      return null;
    }

    /*
     * 2. Buscar presentación
     */
    if (codeRow.presentation_id) {
      const {
        data: presentation,
        error: presentationError,
      } = await supabase
        .from("product_presentations")
        .select(`
          id,
          presentation_name,
          size_value,
          size_unit,
          units_per_package,
          package_type,
          product_id
        `)
        .eq(
          "id",
          codeRow.presentation_id,
        )
        .maybeSingle();

      if (presentationError) {
        console.error(
          "❌ Error buscando presentación:",
          presentationError,
        );

        throw presentationError;
      }

      if (!presentation) {
        console.log(
          "⚠️ El código existe, pero la presentación no.",
        );

        return null;
      }

      /*
       * 3. Buscar producto relacionado
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
          category
        `)
        .eq(
          "id",
          presentation.product_id,
        )
        .maybeSingle();

      if (productError) {
        console.error(
          "❌ Error buscando producto:",
          productError,
        );

        throw productError;
      }

      console.log(
        "✅ Coincidencia por código:",
        {
          code: codeRow.code,
          product: product?.name,
          presentation:
            presentation.presentation_name,
        },
      );

      return {
        code: String(codeRow.code),

        source: "presentation",

        presentation: {
          id: String(presentation.id),

          presentationName: String(
            presentation.presentation_name ??
              "",
          ),

          sizeValue:
            presentation.size_value === null
              ? null
              : Number(
                  presentation.size_value,
                ),

          sizeUnit:
            presentation.size_unit ?? null,

          unitsPerPackage:
            presentation.units_per_package ===
            null
              ? 1
              : Number(
                  presentation.units_per_package,
                ),

          packageType:
            presentation.package_type ??
            null,

          product: product
            ? {
                id: String(product.id),

                name: String(product.name),

                brand:
                  product.brand ?? null,

                category:
                  product.category ?? null,
              }
            : null,
        },
      };
    }

    /*
     * Compatibilidad temporal con registros
     * antiguos que solo tengan product_id.
     */
    if (codeRow.product_id) {
      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .select(`
          id,
          name,
          brand,
          category
        `)
        .eq(
          "id",
          codeRow.product_id,
        )
        .maybeSingle();

      if (productError) {
        throw productError;
      }

      if (!product) {
        return null;
      }

      return {
        code: String(codeRow.code),

        source: "legacy-product",

        presentation: {
          id: "",

          presentationName: "",

          sizeValue: null,

          sizeUnit: null,

          unitsPerPackage: 1,

          packageType: null,

          product: {
            id: String(product.id),

            name: String(product.name),

            brand:
              product.brand ?? null,

            category:
              product.category ?? null,
          },
        },
      };
    }

    return null;
  }

  static async saveLearning(
    rawName: string,
    presentationId: string,
    confidence: number,
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("brain_learning")
      .insert({
        raw_name: rawName,
        presentation_id:
          presentationId,
        confidence,
      })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }
}