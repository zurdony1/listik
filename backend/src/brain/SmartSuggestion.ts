import {
  brandRules,
} from "./dictionaries/brands";

import {
  findMemorySuggestion,
} from "../services/brainMemoryService";

import {
  findCatalogSuggestion,
} from "../services/catalogSuggestionService";

export interface SmartSuggestion {
  productName: string;

  brand: string | null;

  category: string | null;

  presentationName: string;

  sizeValue: number | null;

  sizeUnit: string | null;

  packageType: string | null;

  source:
    | "memory"
    | "catalog"
    | "rules";

  confidence: number;
}

function findBrandAndCategory(
  text: string,
) {
  for (const rule of brandRules) {
    const found =
      rule.keywords.some(
        (
          keyword: string,
        ) =>
          text.includes(
            keyword,
          ),
      );

    if (found) {
      return {
        brand:
          rule.brand,

        category:
          rule.category,
      };
    }
  }

  return {
    brand: null,
    category: null,
  };
}

export async function buildSmartSuggestion(
  rawName: string,
): Promise<SmartSuggestion> {
  const text =
    rawName
      .trim()
      .toUpperCase();

  console.log(
    "🧠 SMART SUGGESTION INPUT:",
    {
      rawName,
      text,
    },
  );

  let sizeValue:
    | number
    | null = null;

  let sizeUnit:
    | string
    | null = null;

  /*
   * ML
   */
  const ml =
    text.match(
      /(\d+(?:\.\d+)?)\s*ML\b/,
    );

  if (ml) {
    sizeValue =
      Number(
        ml[1],
      );

    sizeUnit =
      "ml";
  }

  /*
   * KG
   */
  const kg =
    text.match(
      /(\d+(?:\.\d+)?)\s*KG\b/,
    );

  if (
    !sizeUnit &&
    kg
  ) {
    sizeValue =
      Number(
        kg[1],
      );

    sizeUnit =
      "kg";
  }

  /*
   * GRAMOS
   */
  const grams =
    text.match(
      /(\d+(?:\.\d+)?)\s*(GR|G)\b/,
    );

  if (
    !sizeUnit &&
    grams
  ) {
    sizeValue =
      Number(
        grams[1],
      );

    sizeUnit =
      "g";
  }

  /*
   * LITROS
   */
  const liters =
    text.match(
      /(\d+(?:\.\d+)?)\s*(LT|LTS|L)\b/,
    );

  if (
    !sizeUnit &&
    liters
  ) {
    sizeValue =
      Number(
        liters[1],
      );

    sizeUnit =
      "L";
  }

  /*
   * PIEZAS
   */
  const pieces =
    text.match(
      /(\d+)\s*(PZA|PZAS|PZS|PZ|P)\b/,
    );

  if (
    !sizeUnit &&
    pieces
  ) {
    sizeValue =
      Number(
        pieces[1],
      );

    sizeUnit =
      "pieza";
  }

  /*
   * TIPO DE EMPAQUE
   */
  let packageType:
    | string
    | null = null;

  if (
    text.includes(
      "BOTELLA",
    )
  ) {
    packageType =
      "Botella";
  } else if (
    text.includes(
      "LATA",
    )
  ) {
    packageType =
      "Lata";
  } else if (
    text.includes(
      "BOLSA",
    )
  ) {
    packageType =
      "Bolsa";
  } else if (
    text.includes(
      "CAJA",
    )
  ) {
    packageType =
      "Caja";
  } else if (
    text.includes(
      "PAQUETE",
    ) ||
    text.includes(
      "PAQ",
    )
  ) {
    packageType =
      "Paquete";
  } else if (
    sizeUnit ===
      "pieza" &&
    sizeValue !== null &&
    sizeValue > 1
  ) {
    packageType =
      "Paquete";
  } else {
    packageType =
      "Unidad";
  }

  /*
   * MARCA Y CATEGORÍA
   * POR REGLAS.
   */
  const {
    brand,
    category,
  } =
    findBrandAndCategory(
      text,
    );

  /*
   * PRESENTACIÓN POR REGLAS.
   */
  let presentationName =
    rawName.trim();

  if (
    sizeValue !== null &&
    sizeUnit
  ) {
    if (
      sizeUnit ===
      "pieza"
    ) {
      presentationName =
        `${packageType} ${sizeValue} piezas`;
    } else {
      presentationName =
        `${packageType} ${sizeValue} ${sizeUnit}`;
    }
  }

  /*
   * 1. BRAIN MEMORY
   *
   * Tiene máxima prioridad porque
   * ya fue aprobado por una persona.
   */
  const memorySuggestion =
    await findMemorySuggestion(
      rawName,
    );

  if (
    memorySuggestion.found &&
    memorySuggestion.product
  ) {
    console.log(
      "🧠 SMART SUGGESTION POR MEMORIA:",
      {
        rawName,

        product:
          memorySuggestion
            .product.name,

        confidence: 100,
      },
    );

    return {
      productName:
        memorySuggestion
          .product.name,

      brand:
        memorySuggestion
          .product.brand,

      category:
        memorySuggestion
          .product.category,

      presentationName:
        memorySuggestion
          .presentation
          ?.presentationName ||
        presentationName,

      sizeValue:
        memorySuggestion
          .presentation
          ?.sizeValue ??
        sizeValue,

      sizeUnit:
        memorySuggestion
          .presentation
          ?.sizeUnit ??
        sizeUnit,

      packageType:
        memorySuggestion
          .presentation
          ?.packageType ??
        packageType,

      source:
        "memory",

      confidence: 100,
    };
  }

  /*
   * 2. CATÁLOGO
   */
  const catalogSuggestion =
    await findCatalogSuggestion(
      rawName,
    );

  console.log(
    "📦 CATALOG SUGGESTION:",
    {
      rawName,

      found:
        catalogSuggestion.found,

      confidence:
        catalogSuggestion.confidence,

      product:
        catalogSuggestion
          .product?.name ??
        null,
    },
  );

  if (
    catalogSuggestion.found &&
    catalogSuggestion.product
  ) {
    return {
      productName:
        catalogSuggestion
          .product.name,

      brand:
        catalogSuggestion
          .product.brand ??
        brand,

      category:
        catalogSuggestion
          .product.category ??
        category,

      presentationName:
        catalogSuggestion
          .presentation
          ?.presentationName ||
        presentationName,

      sizeValue:
        catalogSuggestion
          .presentation
          ?.sizeValue ??
        sizeValue,

      sizeUnit:
        catalogSuggestion
          .presentation
          ?.sizeUnit ??
        sizeUnit,

      packageType:
        catalogSuggestion
          .presentation
          ?.packageType ??
        packageType,

      source:
        "catalog",

      confidence:
        catalogSuggestion
          .confidence,
    };
  }

  /*
   * 3. REGLAS
   */
  return {
    productName:
      brand ??
      rawName.trim(),

    brand,

    category,

    presentationName,

    sizeValue,

    sizeUnit,

    packageType,

    source:
      "rules",

    confidence:
      brand
        ? 70
        : 35,
  };
}