import {
  supabase,
} from "../lib/supabase";

import type {
  Product,
} from "../types/Product";

/*
 * ==========================================
 * TIPOS PÚBLICOS
 * ==========================================
 */

export interface QuickListMatch {
  originalText: string;

  normalizedText: string;

  /*
   * Lo que finalmente entendió Listik.
   *
   * Ejemplo:
   *
   * pan de perro
   * ↓
   * pan hot dog
   */
  interpretedText?: string;

  /*
   * Ejemplo:
   *
   * 1 l
   * 600 ml
   * 500 g
   */
  presentationHint?: string | null;

  products: Product[];

  totalCount: number;

  status:
    | "matched"
    | "multiple"
    | "not_found";
}

/*
 * ==========================================
 * TIPOS INTERNOS
 * ==========================================
 */

interface PresentationHint {
  value: number;

  unit:
    | "ml"
    | "l"
    | "g"
    | "kg"
    | "unit";
}

interface ParsedQuickListItem {
  originalText: string;

  normalizedText: string;

  searchText: string;

  presentationHint:
    | PresentationHint
    | null;
}

interface BatchRpcRow {
  item_index:
    | number
    | string;

  original_text:
    | string
    | null;

  search_text:
    | string
    | null;

  product_id:
    | string
    | null;

  product_name:
    | string
    | null;

  brand:
    | string
    | null;

  category:
    | string
    | null;

  relevance:
    | number
    | string
    | null;

  total_count:
    | number
    | string
    | null;
}

interface PresentationRpcRow {
  id: string;

  product_id:
    | string
    | null;

  presentation_name:
    | string
    | null;

  size_value:
    | number
    | string
    | null;

  size_unit:
    | string
    | null;

  units_per_package:
    | number
    | string
    | null;

  package_type:
    | string
    | null;
}

interface SearchVariantMap {
  originalItemIndex: number;

  searchText: string;

  searchLevel: number;
}

interface Candidate {
  product: Product;

  score: number;

  searchText: string;

  searchLevel: number;

  totalCount: number;
}

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

/*
 * Máximo de productos visibles
 * por renglón.
 */
const DISPLAY_LIMIT =
  6;

/*
 * Máximo de variantes de búsqueda
 * por producto.
 *
 * IMPORTANTE:
 *
 * Todas estas variantes viajan
 * dentro de UNA sola llamada RPC.
 */
const MAX_SEARCH_VARIANTS =
  4;

/*
 * ==========================================
 * NORMALIZAR TEXTO
 * ==========================================
 */

export function normalizeQuickListText(
  value: string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[.,;:]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

/*
 * ==========================================
 * SINÓNIMOS
 * ==========================================
 */

const PHRASE_ALIASES: Array<{
  patterns: RegExp[];

  replacement: string;
}> = [
  /*
   * PAN HOT DOG
   */
  {
    patterns: [
      /\bpan\s+de\s+perro\b/g,
      /\bpan\s+para\s+perro\b/g,
      /\bpan\s+de\s+hot\s*dog\b/g,
      /\bpan\s+para\s+hot\s*dog\b/g,
      /\bpan\s+hotdog\b/g,
    ],

    replacement:
      "pan hot dog",
  },

  /*
   * PAN HAMBURGUESA
   */
  {
    patterns: [
      /\bpan\s+de\s+hamburguesa\b/g,
      /\bpan\s+para\s+hamburguesa\b/g,
      /\bpan\s+hamburguesa\b/g,
    ],

    replacement:
      "pan hamburguesa",
  },

  /*
   * PAN SANDWICH
   */
  {
    patterns: [
      /\bpan\s+para\s+sandwich\b/g,
      /\bpan\s+de\s+sandwich\b/g,
      /\bpan\s+sandwich\b/g,
    ],

    replacement:
      "pan sandwich",
  },

  /*
   * JABÓN DE TRASTES
   */
  {
    patterns: [
      /\bjabon\s+de\s+trastes\b/g,
      /\bjabon\s+para\s+trastes\b/g,
      /\bjabon\s+para\s+platos\b/g,
      /\bjabon\s+de\s+platos\b/g,
    ],

    replacement:
      "lavatrastes",
  },

  /*
   * JABÓN DE MANOS
   */
  {
    patterns: [
      /\bjabon\s+de\s+manos\b/g,
      /\bjabon\s+para\s+manos\b/g,
    ],

    replacement:
      "jabon manos",
  },

  /*
   * PAPEL DE BAÑO
   */
  {
    patterns: [
      /\bpapel\s+de\s+bano\b/g,
      /\bpapel\s+para\s+bano\b/g,
    ],

    replacement:
      "papel higienico",
  },

  /*
   * COCA
   *
   * coca
   * → coca cola
   *
   * coca cola
   * → coca cola
   */
  {
    patterns: [
      /\bcoca\b(?!\s+cola\b)/g,
    ],

    replacement:
      "coca cola",
  },
];

/*
 * ==========================================
 * APLICAR SINÓNIMOS
 * ==========================================
 */

function applyAliases(
  value: string,
) {
  let result =
    value;

  for (
    const alias
    of PHRASE_ALIASES
  ) {
    for (
      const pattern
      of alias.patterns
    ) {
      result =
        result.replace(
          pattern,
          alias.replacement,
        );
    }
  }

  return result
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/*
 * ==========================================
 * NORMALIZAR UNIDAD
 * ==========================================
 */

function normalizeUnit(
  rawUnit: string,
):
  | PresentationHint["unit"]
  | null {
  const unit =
    normalizeQuickListText(
      rawUnit,
    );

  /*
   * Litros.
   *
   * También aceptamos "t"
   * como error común de "lt".
   */
  if (
    [
      "l",
      "lt",
      "lts",
      "litro",
      "litros",
      "t",
    ].includes(
      unit,
    )
  ) {
    return "l";
  }

  /*
   * Mililitros
   */
  if (
    [
      "ml",
      "mililitro",
      "mililitros",
    ].includes(
      unit,
    )
  ) {
    return "ml";
  }

  /*
   * Kilogramos.
   *
   * También aceptamos:
   *
   * 1k
   */
  if (
    [
      "kg",
      "k",
      "kilo",
      "kilos",
      "kilogramo",
      "kilogramos",
    ].includes(
      unit,
    )
  ) {
    return "kg";
  }

  /*
   * Gramos
   */
  if (
    [
      "g",
      "gr",
      "grs",
      "gramo",
      "gramos",
    ].includes(
      unit,
    )
  ) {
    return "g";
  }

  /*
   * Piezas
   */
  if (
    [
      "pz",
      "pza",
      "pzas",
      "pieza",
      "piezas",
      "unidad",
      "unidades",
    ].includes(
      unit,
    )
  ) {
    return "unit";
  }

  return null;
}

/*
 * ==========================================
 * EXTRAER PRESENTACIÓN
 * ==========================================
 *
 * Reconoce:
 *
 * 1l
 * 1lt
 * 1t
 * 1 litro
 *
 * 600ml
 *
 * 1kg
 * 1k
 *
 * 500g
 * 500gr
 */

function extractPresentationHint(
  value: string,
) {
  const pattern =
    /\b(\d+(?:[.,]\d+)?)\s*(ml|mililitros?|l|lt|lts|litros?|t|kg|k|kilos?|kilogramos?|g|gr|grs|gramos?|pz|pza|pzas|piezas?|unidades?)\b/i;

  const match =
    value.match(
      pattern,
    );

  if (
    !match
  ) {
    return {
      text:
        value,

      hint:
        null,
    };
  }

  const numericValue =
    Number(
      (
        match[1] ??
        ""
      ).replace(
        ",",
        ".",
      ),
    );

  const unit =
    normalizeUnit(
      match[2] ??
        "",
    );

  if (
    !Number.isFinite(
      numericValue,
    ) ||
    !unit
  ) {
    return {
      text:
        value,

      hint:
        null,
    };
  }

  /*
   * coca cola de 1lt
   *
   * ↓
   *
   * coca cola de
   */

  let text =
    value.replace(
      match[0],
      " ",
    );

  /*
   * Quitamos:
   *
   * "de"
   *
   * si quedó al final.
   */

  text =
    text.replace(
      /\bde\s*$/i,
      "",
    );

  text =
    text
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  return {
    text,

    hint: {
      value:
        numericValue,

      unit,
    } satisfies PresentationHint,
  };
}

/*
 * ==========================================
 * INTERPRETAR PRODUCTO
 * ==========================================
 */

function interpretQuickListItem(
  originalText: string,
): ParsedQuickListItem {
  const normalizedText =
    normalizeQuickListText(
      originalText,
    );

  /*
   * Primero aplicamos expresiones
   * cotidianas.
   */
  const aliasedText =
    applyAliases(
      normalizedText,
    );

  /*
   * Después detectamos presentación.
   */
  const {
    text,
    hint,
  } =
    extractPresentationHint(
      aliasedText,
    );

  const searchText =
    text
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  return {
    originalText,

    normalizedText,

    searchText:
      searchText ||
      aliasedText ||
      normalizedText,

    presentationHint:
      hint,
  };
}

/*
 * ==========================================
 * PRESENTACIÓN → TEXTO
 * ==========================================
 */

function getPresentationHintLabel(
  hint:
    | PresentationHint
    | null,
) {
  if (
    !hint
  ) {
    return null;
  }

  if (
    hint.unit ===
    "unit"
  ) {
    return `${hint.value} ${
      hint.value ===
      1
        ? "pieza"
        : "piezas"
    }`;
  }

  return `${hint.value} ${hint.unit}`;
}

/*
 * ==========================================
 * VARIANTES / FALLBACKS
 * ==========================================
 *
 * IMPORTANTE:
 *
 * Ya NO ejecutamos una consulta
 * por variante.
 *
 * Todas estas variantes se envían
 * juntas dentro del RPC batch.
 */

function getSearchVariants(
  parsed:
    ParsedQuickListItem,
) {
  const primary =
    normalizeQuickListText(
      parsed.searchText,
    );

  const variants:
    string[] =
    [
      primary,
    ];

  /*
   * ========================================
   * CASOS CONOCIDOS
   * ========================================
   */

  if (
    primary ===
    "lavatrastes"
  ) {
    variants.push(
      "detergente",
      "lavavajillas",
      "jabon",
    );
  }

  if (
    primary ===
    "jabon manos"
  ) {
    variants.push(
      "jabon",
      "jabon liquido",
      "manos",
    );
  }

 if (
  primary ===
  "pan hot dog"
) {
  variants.push(
    "pan hot dog",
    "pan para hot dog",
    "pan hotdog",
    "pan perro caliente",
      "medias noches",
      "media noche",
  );
}

  if (
    primary ===
    "pan sandwich"
  ) {
    variants.push(
      "pan blanco",
      "pan",
    );
  }

  if (
    primary ===
    "pan hamburguesa"
  ) {
    variants.push(
      "hamburguesa",
      "pan",
    );
  }

  if (
    primary ===
    "jamon"
  ) {
    variants.push(
      "carnes frias",
      "embutido",
    );
  }

  if (
    primary ===
      "salchichas" ||
    primary ===
      "salchicha"
  ) {
    variants.push(
      "salchicha",
      "embutido",
    );
  }

  if (
    primary ===
    "coca cola"
  ) {
    variants.push(
      "coca",
      "refresco",
    );
  }

  if (
    primary ===
    "leche"
  ) {
    variants.push(
      "leche entera",
      "lacteo",
    );
  }

  /*
   * ========================================
   * FALLBACK GENÉRICO
   * ========================================
   *
   * queso oaxaca
   *
   * ↓
   *
   * queso oaxaca
   * queso
   * oaxaca
   */

  const words =
    primary
      .split(
        " ",
      )
      .map(
        (
          word,
        ) =>
          word.trim(),
      )
      .filter(
        (
          word,
        ) =>
          word.length >=
          3,
      );

  if (
    words.length >
    1
  ) {
    variants.push(
      words[0],
    );

    for (
      const word
      of words.slice(
        1,
      )
    ) {
      variants.push(
        word,
      );
    }
  }

  /*
   * También podemos intentar el texto
   * original si fue modificado por
   * alguna regla.
   */

  if (
    parsed.normalizedText !==
    primary
  ) {
    variants.push(
      parsed.normalizedText,
    );
  }

  /*
   * ========================================
   * QUITAR DUPLICADOS
   * ========================================
   */

  return Array.from(
    new Set(
      variants
        .map(
          normalizeQuickListText,
        )
        .filter(
          Boolean,
        ),
    ),
  ).slice(
    0,
    MAX_SEARCH_VARIANTS,
  );
}

/*
 * ==========================================
 * NORMALIZAR MEDIDA
 * ==========================================
 */

function normalizeMeasurement(
  value: number,
  unit:
    | string
    | null,
) {
  const normalizedUnit =
    normalizeUnit(
      unit ??
        "",
    );

  if (
    !normalizedUnit
  ) {
    return null;
  }

  /*
   * Volumen → ml
   */

  if (
    normalizedUnit ===
    "l"
  ) {
    return {
      value:
        value *
        1000,

      family:
        "volume",
    };
  }

  if (
    normalizedUnit ===
    "ml"
  ) {
    return {
      value,

      family:
        "volume",
    };
  }

  /*
   * Peso → gramos
   */

  if (
    normalizedUnit ===
    "kg"
  ) {
    return {
      value:
        value *
        1000,

      family:
        "weight",
    };
  }

  if (
    normalizedUnit ===
    "g"
  ) {
    return {
      value,

      family:
        "weight",
    };
  }

  /*
   * Piezas
   */

  if (
    normalizedUnit ===
    "unit"
  ) {
    return {
      value,

      family:
        "unit",
    };
  }

  return null;
}

/*
 * ==========================================
 * PRESENTACIÓN COINCIDE
 * ==========================================
 */

function presentationMatchesHint(
  product: Product,
  hint:
    | PresentationHint
    | null,
) {
  if (
    !hint
  ) {
    return false;
  }

  const expected =
    normalizeMeasurement(
      hint.value,
      hint.unit,
    );

  if (
    !expected
  ) {
    return false;
  }

  const expectedValue =
    expected.value;

  const expectedFamily =
    expected.family;

  return (
    product.presentations ??
    []
  ).some(
    (
      presentation,
    ) => {
      if (
        presentation.sizeValue !==
          null &&
        presentation.sizeUnit
      ) {
        const actual =
          normalizeMeasurement(
            presentation.sizeValue,
            presentation.sizeUnit,
          );

        if (
          actual &&
          actual.family ===
            expectedFamily
        ) {
          const difference =
            Math.abs(
              actual.value -
                expectedValue,
            );

          if (
            difference <=
            Math.max(
              1,
              expectedValue *
                0.01,
            )
          ) {
            return true;
          }
        }
      }

      /*
       * Fallback por nombre de
       * presentación.
       */

      const presentationText =
        normalizeQuickListText(
          presentation.presentationName ??
            "",
        );

      const hintLabel =
        getPresentationHintLabel(
          hint,
        );

      if (
        hintLabel &&
        presentationText.includes(
          normalizeQuickListText(
            hintLabel,
          ),
        )
      ) {
        return true;
      }

      return false;
    },
  );
}

/*
 * ==========================================
 * PUNTUAR PRESENTACIÓN
 * ==========================================
 */

function getPresentationScore(
  presentation:
    Product["presentations"][number],
  hint:
    PresentationHint,
) {
  const expected =
    normalizeMeasurement(
      hint.value,
      hint.unit,
    );

  if (
    !expected
  ) {
    return 0;
  }

  if (
    presentation.sizeValue !==
      null &&
    presentation.sizeUnit
  ) {
    const actual =
      normalizeMeasurement(
        presentation.sizeValue,
        presentation.sizeUnit,
      );

    if (
      actual &&
      actual.family ===
        expected.family
    ) {
      const difference =
        Math.abs(
          actual.value -
            expected.value,
        );

      /*
       * Exacta
       */
      if (
        difference <=
        Math.max(
          1,
          expected.value *
            0.01,
        )
      ) {
        return 1000;
      }

      /*
       * Cercana
       */
      const relativeDifference =
        difference /
        Math.max(
          expected.value,
          1,
        );

      return Math.max(
        0,
        500 -
          relativeDifference *
            100,
      );
    }
  }

  /*
   * Revisamos también texto.
   */

  const hintLabel =
    getPresentationHintLabel(
      hint,
    );

  if (
    hintLabel &&
    normalizeQuickListText(
      presentation.presentationName ??
        "",
    ).includes(
      normalizeQuickListText(
        hintLabel,
      ),
    )
  ) {
    return 1000;
  }

  return 0;
}

/*
 * ==========================================
 * REORDENAR PRESENTACIONES
 * ==========================================
 */

function prioritizePresentations(
  product: Product,
  hint:
    | PresentationHint
    | null,
): Product {
  if (
    !hint ||
    !product.presentations
      ?.length
  ) {
    return product;
  }

  const presentations =
    [
      ...product.presentations,
    ].sort(
      (
        a,
        b,
      ) =>
        getPresentationScore(
          b,
          hint,
        ) -
        getPresentationScore(
          a,
          hint,
        ),
    );

  return {
    ...product,

    presentations,
  };
}

/*
 * ==========================================
 * CARGAR PRESENTACIONES
 * ==========================================
 *
 * El RPC batch no trae precios.
 *
 * En ReviewList solamente necesitamos:
 *
 * producto
 * marca
 * categoría
 * presentación
 *
 * Por eso hacemos UNA consulta ligera
 * con todos los IDs candidatos.
 */

async function getPresentationsForProducts(
  productIds: string[],
) {
  const uniqueIds =
    Array.from(
      new Set(
        productIds,
      ),
    );

  const map =
    new Map<
      string,
      Product["presentations"]
    >();

  if (
    uniqueIds.length ===
    0
  ) {
    return map;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "product_presentations",
      )
      .select(`
        id,
        product_id,
        presentation_name,
        size_value,
        size_unit,
        units_per_package,
        package_type
      `)
      .in(
        "product_id",
        uniqueIds,
      );

  if (
    error
  ) {
    console.error(
      "❌ ERROR CARGANDO PRESENTACIONES BATCH:",
      error,
    );

    /*
     * No cancelamos todo.
     *
     * Podemos mostrar productos aunque
     * temporalmente no tengamos
     * presentaciones.
     */

    return map;
  }

  for (
    const row
    of (
      data ??
      []
    ) as PresentationRpcRow[]
  ) {
    if (
      !row.product_id
    ) {
      continue;
    }

    const productId =
      String(
        row.product_id,
      );

    const current =
      map.get(
        productId,
      ) ??
      [];

    current.push({
      id:
        String(
          row.id,
        ),

      productId,

      presentationName:
        String(
          row.presentation_name ??
            "",
        ),

      sizeValue:
        row.size_value ===
        null
          ? null
          : Number(
              row.size_value,
            ),

      sizeUnit:
        row.size_unit ??
        null,

      unitsPerPackage:
        row.units_per_package ===
        null
          ? 1
          : Number(
              row.units_per_package,
            ),

      packageType:
        row.package_type ??
        null,
    });

    map.set(
      productId,
      current,
    );
  }

  return map;
}

/*
 * ==========================================
 * CREAR PRODUCTO DESDE RPC
 * ==========================================
 */

function createProductFromRow(
  row: BatchRpcRow,
  presentations:
    Product["presentations"],
): Product {
  return {
    id:
      String(
        row.product_id,
      ),

    name:
      String(
        row.product_name ??
          "",
      ),

    brand:
      row.brand ??
      null,

    category:
      row.category ??
      null,

    barcode:
      null,

    image_url:
      null,

    /*
     * IMPORTANTE:
     *
     * No cargamos precios durante
     * ReviewList.
     *
     * Los precios se pedirán después
     * de que el usuario confirme.
     */
    prices:
      [],

    presentations,
  };
}

/*
 * ==========================================
 * BUSCAR LISTA COMPLETA
 * ==========================================
 */

export async function searchQuickList(
  items: string[],
  state: string,
  municipality: string,
): Promise<
  QuickListMatch[]
> {
  /*
   * ========================================
   * 1. LIMPIAR LISTA
   * ========================================
   */

  const cleanItems =
    items
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(
        Boolean,
      );

  if (
    cleanItems.length ===
    0
  ) {
    return [];
  }

  /*
   * ========================================
   * 2. INTERPRETAR TODOS LOS RENGLONES
   * ========================================
   */

  const parsedItems =
    cleanItems.map(
      interpretQuickListItem,
    );

  /*
   * ========================================
   * 3. CONSTRUIR VARIANTES BATCH
   * ========================================
   *
   * Cada variante necesita un índice
   * único para que Supabase la trate
   * como una búsqueda independiente.
   *
   * Ejemplo:
   *
   * Producto 0:
   *   coca cola
   *   coca
   *   refresco
   *
   * Producto 1:
   *   pan hot dog
   *   hot dog
   *   pan
   *
   * Todo viaja en UNA llamada RPC.
   */

  const batchItems: Array<{
    index: number;

    originalText: string;

    searchText: string;
  }> =
    [];

  const variantMap =
    new Map<
      number,
      SearchVariantMap
    >();

  let variantIndex =
    0;

  parsedItems.forEach(
    (
      parsed,
      originalItemIndex,
    ) => {
      const variants =
        getSearchVariants(
          parsed,
        );

      variants.forEach(
        (
          searchText,
          searchLevel,
        ) => {
          const currentVariantIndex =
            variantIndex++;

          batchItems.push({
            index:
              currentVariantIndex,

            originalText:
              parsed.originalText,

            searchText,
          });

          variantMap.set(
            currentVariantIndex,
            {
              originalItemIndex,

              searchText,

              searchLevel,
            },
          );
        },
      );
    },
  );

  console.log(
    "⚡ LISTA RÁPIDA BATCH:",
    {
      products:
        cleanItems.length,

      searchVariants:
        batchItems.length,

      location:
        `${municipality}, ${state}`,

      batchItems,
    },
  );

  /*
   * ========================================
   * 4. UNA SOLA LLAMADA A SUPABASE
   * ========================================
   */

  const startTime =
    performance.now();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "search_quick_list_batch",
      {
        p_state:
          state,

        p_municipality:
          municipality,

        p_items:
          batchItems,

        p_limit:
          DISPLAY_LIMIT,
      },
    );

  if (
    error
  ) {
    console.error(
      "❌ ERROR SEARCH QUICK LIST BATCH:",
      error,
    );

    throw error;
  }

  const rows =
    (
      data ??
      []
    ) as BatchRpcRow[];

  /*
   * ========================================
   * 5. CARGAR PRESENTACIONES
   * ========================================
   */

  const productIds =
    rows
      .map(
        (
          row,
        ) =>
          row.product_id
            ? String(
                row.product_id,
              )
            : "",
      )
      .filter(
        Boolean,
      );

  const presentationsMap =
    await getPresentationsForProducts(
      productIds,
    );

  /*
   * ========================================
   * 6. PREPARAR RESULTADOS POR RENGLÓN
   * ========================================
   */

  const candidateMaps =
    parsedItems.map(
      () =>
        new Map<
          string,
          Candidate
        >(),
    );

  /*
   * Para conocer qué fallback fue el
   * primero que realmente encontró algo.
   */
  const successfulLevels =
    parsedItems.map(
      () =>
        new Map<
          number,
          {
            searchText: string;

            totalCount: number;
          }
        >(),
    );

  /*
   * ========================================
   * 7. PROCESAR FILAS DEL RPC
   * ========================================
   */

  for (
    const row
    of rows
  ) {
    if (
      !row.product_id
    ) {
      continue;
    }

    const queryIndex =
      Number(
        row.item_index,
      );

    const variant =
      variantMap.get(
        queryIndex,
      );

    if (
      !variant
    ) {
      continue;
    }

    const parsed =
      parsedItems[
        variant.originalItemIndex
      ];

    if (
      !parsed
    ) {
      continue;
    }

    const productId =
      String(
        row.product_id,
      );

    const presentations =
      presentationsMap.get(
        productId,
      ) ??
      [];

    let product =
      createProductFromRow(
        row,
        presentations,
      );

    /*
     * Si pidió 1 L, ponemos primero
     * la presentación de 1 L.
     */
    product =
      prioritizePresentations(
        product,
        parsed.presentationHint,
      );

    /*
     * ======================================
     * SCORE
     * ======================================
     */

    let score =
      Number(
        row.relevance ??
          0,
      );

    /*
     * La búsqueda principal tiene prioridad.
     *
     * Los fallbacks reciben penalización.
     */
    score -=
      variant.searchLevel *
      150;

    /*
     * Si la presentación coincide con
     * lo pedido, damos una bonificación
     * muy fuerte.
     */
    if (
      presentationMatchesHint(
        product,
        parsed.presentationHint,
      )
    ) {
      score +=
        600;
    }

    const existing =
      candidateMaps[
        variant.originalItemIndex
      ]?.get(
        productId,
      );

    if (
      !existing ||
      score >
        existing.score
    ) {
      candidateMaps[
        variant.originalItemIndex
      ]?.set(
        productId,
        {
          product,

          score,

          searchText:
            variant.searchText,

          searchLevel:
            variant.searchLevel,

          totalCount:
            Number(
              row.total_count ??
                0,
            ),
        },
      );
    }

    /*
     * Registramos este nivel como
     * búsqueda exitosa.
     */
    successfulLevels[
      variant.originalItemIndex
    ]?.set(
      variant.searchLevel,
      {
        searchText:
          variant.searchText,

        totalCount:
          Number(
            row.total_count ??
              0,
          ),
      },
    );
  }

  /*
   * ========================================
   * 8. CONSTRUIR QuickListMatch[]
   * ========================================
   */

  const matches:
    QuickListMatch[] =
    parsedItems.map(
      (
        parsed,
        itemIndex,
      ) => {
        const candidates =
          Array.from(
            candidateMaps[
              itemIndex
            ]?.values() ??
              [],
          )
            .sort(
              (
                a,
                b,
              ) =>
                b.score -
                a.score,
            )
            .slice(
              0,
              DISPLAY_LIMIT,
            );

        const products =
          candidates.map(
            (
              candidate,
            ) =>
              candidate.product,
          );

        /*
         * ==================================
         * PRIMERA BÚSQUEDA EXITOSA
         * ==================================
         */

        const levels =
          Array.from(
            successfulLevels[
              itemIndex
            ]?.entries() ??
              [],
          ).sort(
            (
              a,
              b,
            ) =>
              a[0] -
              b[0],
          );

        const firstSuccessful =
          levels[0]?.[1];

        const interpretedText =
          firstSuccessful
            ?.searchText ??
          parsed.searchText;

        const totalCount =
          firstSuccessful
            ?.totalCount ??
          0;

        /*
         * ==================================
         * ESTADO
         * ==================================
         */

        let status:
          QuickListMatch["status"];

        if (
          products.length ===
          0
        ) {
          status =
            "not_found";
        } else if (
          products.length ===
          1
        ) {
          status =
            "matched";
        } else {
          status =
            "multiple";
        }

        return {
          originalText:
            parsed.originalText,

          normalizedText:
            parsed.normalizedText,

          interpretedText,

          presentationHint:
            getPresentationHintLabel(
              parsed.presentationHint,
            ),

          products,

          totalCount,

          status,
        };
      },
    );

  /*
   * ========================================
   * 9. MÉTRICA DE VELOCIDAD
   * ========================================
   */

  const elapsed =
    performance.now() -
    startTime;

  console.log(
    "⚡ LISTA BATCH TERMINADA:",
    {
      products:
        matches.length,

      rpcRows:
        rows.length,

      candidates:
        matches.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.products.length,
          0,
        ),

      milliseconds:
        Math.round(
          elapsed,
        ),

      seconds:
        Number(
          (
            elapsed /
            1000
          ).toFixed(
            2,
          ),
        ),
    },
  );

  return matches;
}

/*
 * ==========================================
 * BUSCAR UN SOLO PRODUCTO
 * ==========================================
 *
 * La dejamos disponible por si en el futuro
 * queremos reutilizar este servicio para
 * corregir UN renglón desde ReviewList.
 *
 * Incluso en este caso utiliza el mismo
 * motor batch.
 */

export async function searchQuickListItem(
  text: string,
  state: string,
  municipality: string,
): Promise<QuickListMatch> {
  const results =
    await searchQuickList(
      [
        text,
      ],
      state,
      municipality,
    );

  return (
    results[0] ?? {
      originalText:
        text,

      normalizedText:
        normalizeQuickListText(
          text,
        ),

      interpretedText:
        normalizeQuickListText(
          text,
        ),

      presentationHint:
        null,

      products:
        [],

      totalCount:
        0,

      status:
        "not_found",
    }
  );
}