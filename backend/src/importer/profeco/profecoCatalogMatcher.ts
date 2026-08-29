import { supabase } from "../../lib/supabase";

import type {
  NormalizedProfecoProduct,
} from "./profecoTypes";

/*
 * ==========================================
 * TIPOS
 * ==========================================
 */

export type ProfecoMatchType =
  | "exact"
  | "name"
  | "not-found";

export interface ProfecoCatalogMatch {
  type: ProfecoMatchType;

  confidence: number;

  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    barcode: string | null;
  } | null;

  presentation: {
    id: string;
    product_id: string;
    presentation_name: string;
    size_value: number | null;
    size_unit: string | null;
    package_type: string | null;
  } | null;
}

/*
 * ==========================================
 * NORMALIZACIÓN PARA COMPARAR
 * ==========================================
 */

function normalizeForMatch(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/*
 * ==========================================
 * MARCAS EQUIVALENTES
 * ==========================================
 */

function brandsMatch(
  first: string | null,
  second: string | null,
) {
  const a =
    normalizeForMatch(first);

  const b =
    normalizeForMatch(second);

  /*
   * PROFECO utiliza valores como
   * S/M para productos sin marca.
   */
  const withoutBrand =
    new Set([
      "",
      "s m",
      "sin marca",
      "no aplica",
      "n a",
    ]);

  if (
    withoutBrand.has(a) &&
    withoutBrand.has(b)
  ) {
    return true;
  }

  return a === b;
}

/*
 * ==========================================
 * BUSCAR PRODUCTOS POR NOMBRE
 * ==========================================
 */

async function findProductsByName(
  item: NormalizedProfecoProduct,
) {
  /*
   * Usamos ilike para reducir primero
   * los candidatos desde Supabase.
   */
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      category,
      barcode
    `)
    .ilike(
      "name",
      item.name,
    )
    .limit(20);

  if (error) {
    throw new Error(
      `No se pudo buscar el producto: ${error.message}`,
    );
  }

  return data ?? [];
}

/*
 * ==========================================
 * BUSCAR PRESENTACIONES
 * ==========================================
 */

async function findPresentations(
  productId: string,
) {
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
      "product_id",
      productId,
    );

  if (error) {
    throw new Error(
      `No se pudieron buscar presentaciones: ${error.message}`,
    );
  }

  return data ?? [];
}

/*
 * ==========================================
 * MATCH PRINCIPAL
 * ==========================================
 */

export async function matchProfecoCatalog(
  item: NormalizedProfecoProduct,
): Promise<ProfecoCatalogMatch> {
  const candidates =
    await findProductsByName(
      item,
    );

  /*
   * ------------------------------------------
   * 1. Producto inexistente
   * ------------------------------------------
   */

  if (
    candidates.length === 0
  ) {
    return {
      type:
        "not-found",

      confidence:
        0,

      product:
        null,

      presentation:
        null,
    };
  }

  const normalizedName =
    normalizeForMatch(
      item.name,
    );

  /*
   * ------------------------------------------
   * 2. Buscar nombre + marca exactos
   * ------------------------------------------
   */

  const exactProduct =
    candidates.find(
      (candidate) => {
        const sameName =
          normalizeForMatch(
            candidate.name,
          ) ===
          normalizedName;

        const sameBrand =
          brandsMatch(
            candidate.brand,
            item.brand,
          );

        return (
          sameName &&
          sameBrand
        );
      },
    );

  /*
   * ------------------------------------------
   * 3. Si no coincide marca,
   *    aceptar solamente nombre
   *    como candidato débil.
   * ------------------------------------------
   */

  const product =
    exactProduct ??
    candidates.find(
      (candidate) =>
        normalizeForMatch(
          candidate.name,
        ) ===
        normalizedName,
    );

  if (!product) {
    return {
      type:
        "not-found",

      confidence:
        0,

      product:
        null,

      presentation:
        null,
    };
  }

  /*
   * ------------------------------------------
   * 4. Buscar presentación
   * ------------------------------------------
   */

  const presentations =
    await findPresentations(
      String(product.id),
    );

  const normalizedPresentation =
    normalizeForMatch(
      item.presentationName,
    );

  const presentation =
    presentations.find(
      (candidate) =>
        normalizeForMatch(
          candidate.presentation_name,
        ) ===
        normalizedPresentation,
    ) ?? null;

  /*
   * ------------------------------------------
   * 5. Producto + presentación
   *    coinciden exactamente
   * ------------------------------------------
   */

  if (
    exactProduct &&
    presentation
  ) {
    return {
      type:
        "exact",

      confidence:
        100,

      product: {
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
      },

      presentation: {
        id:
          String(
            presentation.id,
          ),

        product_id:
          String(
            presentation.product_id,
          ),

        presentation_name:
          String(
            presentation.presentation_name,
          ),

        size_value:
          presentation.size_value ??
          null,

        size_unit:
          presentation.size_unit ??
          null,

        package_type:
          presentation.package_type ??
          null,
      },
    };
  }

  /*
   * ------------------------------------------
   * 6. Encontramos producto pero
   *    no presentación exacta
   * ------------------------------------------
   */

  return {
    type:
      "name",

    confidence:
      exactProduct
        ? 80
        : 60,

    product: {
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
    },

    presentation:
      null,
  };
}