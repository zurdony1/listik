import {
  Router,
} from "express";

import {
  supabase,
} from "../lib/supabase";

const router =
  Router();

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

interface BasketItem {
  id: string;
  canonical_name: string;
  display_name: string;
  product_id:
    | string
    | null;
  required_packages: number;
  reference_amount:
    | number
    | string
    | null;
  reference_unit:
    | string
    | null;
  reference_presentation: string;
  search_terms: string[];
  sort_order: number;
}

interface ProductRow {
  id: string;
  name: string;
  normalized_name:
    | string
    | null;
}

interface PresentationRow {
  id: string;
  product_id: string;
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
}

interface BranchRow {
  id: string;
  store_id:
    | string
    | null;
  name: string;
  latitude:
    | number
    | string
    | null;
  longitude:
    | number
    | string
    | null;
}

interface StoreRow {
  id: string;
  name: string;
}

interface PriceRow {
  id: string;
  product_id: string;
  presentation_id:
    | string
    | null;
  store_id:
    | string
    | null;
  store_branch_id:
    | string
    | null;
  price:
    | number
    | string;
  source:
    | string
    | null;
  observed_at:
    | string
    | null;
}


type TransportMode =
  | "car"
  | "moto"
  | "bike"
  | "walk";

interface OptimizationOption {
  basketItemId: string;
  displayName: string;
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  lineTotal: number;
}

interface SmartPurchasePlan {
  type:
    | "recommended"
    | "single_store"
    | "minimum_price";
  label: string;
  coveredItems: number;
  totalItems: number;
  coveragePercentage: number;
  productsTotal: number;
  travelDistanceKm: number;
  travelCost: number;
  estimatedTotal: number;
  storesCount: number;
  stores: Array<{
    branchId: string;
    storeId: string;
    storeName: string;
    branchName: string;
    latitude: number;
    longitude: number;
    distanceFromUserKm: number;
  }>;
  itemAssignments: Array<{
    basketItemId: string;
    displayName: string;
    branchId: string;
    storeName: string;
    branchName: string;
    lineTotal: number;
  }>;
}

interface StoreAccumulator {
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  items: Map<
    string,
    number
  >;
}

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function cleanText(
  value?:
    | string
    | null,
) {
  return String(
    value ??
      "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    )
    .normalize(
      "NFC",
    );
}

function normalizeKey(
  value?:
    | string
    | null,
) {
  return cleanText(
    value,
  )
    .toLocaleLowerCase(
      "es-MX",
    )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function chunkArray<T>(
  values: T[],
  size: number,
) {
  const chunks:
    T[][] =
    [];

  for (
    let index = 0;
    index <
    values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index +
          size,
      ),
    );
  }

  return chunks;
}

function timestamp(
  value:
    | string
    | null,
) {
  if (
    !value
  ) {
    return 0;
  }

  const parsed =
    new Date(
      value,
    ).getTime();

  return Number.isNaN(
    parsed,
  )
    ? 0
    : parsed;
}

function sourcePriority(
  source:
    | string
    | null,
) {
  if (
    source ===
    "ticket"
  ) {
    return 3;
  }

  if (
    source ===
    "manual"
  ) {
    return 2;
  }

  if (
    source ===
    "profeco"
  ) {
    return 1;
  }

  return 0;
}

/*
 * ============================================================
 * UNIDADES
 * ============================================================
 */

function normalizeUnit(
  value?:
    | string
    | null,
) {
  const unit =
    normalizeKey(
      value,
    );

  if (
    [
      "kg",
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

  if (
    [
      "g",
      "gr",
      "gramo",
      "gramos",
    ].includes(
      unit,
    )
  ) {
    return "g";
  }

  if (
    [
      "l",
      "lt",
      "litro",
      "litros",
    ].includes(
      unit,
    )
  ) {
    return "l";
  }

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

  if (
    [
      "pieza",
      "piezas",
      "pza",
      "pzas",
      "unidad",
      "unidades",
      "rollo",
      "rollos",
      "barra",
      "barras",
      "pastilla",
      "pastillas",
      "carton",
      "cartones",
      "charola",
      "charolas",
    ].includes(
      unit,
    )
  ) {
    return "pieza";
  }

  return unit;
}

function convertAmount(
  amount: number,
  unit: string,
) {
  const normalizedUnit =
    normalizeUnit(
      unit,
    );

  if (
    normalizedUnit ===
    "kg"
  ) {
    return {
      value:
        amount *
        1000,
      unit:
        "g",
    };
  }

  if (
    normalizedUnit ===
    "l"
  ) {
    return {
      value:
        amount *
        1000,
      unit:
        "ml",
    };
  }

  return {
    value:
      amount,
    unit:
      normalizedUnit,
  };
}

function parsePresentationAmount(
  presentation:
    PresentationRow,
) {
  const explicitValue =
    Number(
      presentation.size_value,
    );

  const explicitUnit =
    normalizeUnit(
      presentation.size_unit,
    );

  if (
    Number.isFinite(
      explicitValue,
    ) &&
    explicitValue >
      0 &&
    explicitUnit
  ) {
    return convertAmount(
      explicitValue,
      explicitUnit,
    );
  }

  const text =
    cleanText(
      presentation.presentation_name,
    );

  const matches =
    [
      ...text.matchAll(
        /(\d+(?:[.,]\d+)?)\s*(kg|kilogramos?|kilos?|g|gr|gramos?|l|lt|litros?|ml|mililitros?|piezas?|pzas?|unidades?|rollos?|barras?|pastillas?|cartones?|charolas?)/gi,
      ),
    ];

  if (
    matches.length ===
    0
  ) {
    return null;
  }

  const match =
    matches[0];

  const value =
    Number(
      match[1].replace(
        ",",
        ".",
      ),
    );

  if (
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return null;
  }

  return convertAmount(
    value,
    match[2],
  );
}

/*
 * La cantidad de referencia total es:
 *
 * required_packages × reference_amount
 *
 * Ejemplos:
 * - leche: 5 × 1 L = 5 L
 * - atún: 2 × 140 g = 280 g
 * - tortilla: 4 × 1 kg = 4 kg
 */
function getRequiredTotal(
  basket:
    BasketItem,
) {
  const amount =
    Number(
      basket.reference_amount,
    );

  const unit =
    normalizeUnit(
      basket.reference_unit,
    );

  const packages =
    Math.max(
      1,
      Number(
        basket.required_packages ??
          1,
      ),
    );

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <=
      0 ||
    !unit
  ) {
    return null;
  }

  return convertAmount(
    amount *
      packages,
    unit,
  );
}


function parseEggCount(
  presentation:
    PresentationRow | null,
) {
  if (
    !presentation
  ) {
    return null;
  }

  const text =
    normalizeKey(
      presentation.presentation_name,
    );

  if (
    !text
  ) {
    return null;
  }

  const explicit =
    text.match(
      /\b(\d+)\s*(?:piezas?|pzas?|huevos?|unidades?)\b/,
    );

  if (
    explicit
  ) {
    const value =
      Number(
        explicit[1],
      );

    if (
      Number.isFinite(
        value,
      ) &&
      value >
        0
    ) {
      return value;
    }
  }

  /*
   * También cubre:
   * "Caja con 18", "Paquete 18", "Charola con 30".
   */
  const packaged =
    text.match(
      /\b(?:caja|paquete|carton|charola)\s*(?:con\s*)?(\d+)\b/,
    );

  if (
    packaged
  ) {
    const value =
      Number(
        packaged[1],
      );

    if (
      Number.isFinite(
        value,
      ) &&
      value >
        0
    ) {
      return value;
    }
  }

  if (
    /\bmedia\s+docena\b/.test(
      text,
    )
  ) {
    return 6;
  }

  if (
    /\bdocena\b/.test(
      text,
    )
  ) {
    return 12;
  }

  return null;
}

function isSoapPiecePresentation(
  presentation:
    PresentationRow | null,
) {
  if (
    !presentation
  ) {
    return false;
  }

  const text =
    normalizeKey(
      presentation.presentation_name,
    );

  /*
   * La referencia de la canasta es 1 pieza.
   * PROFECO puede expresar el jabón por:
   * barra, pastilla, pieza o solo gramaje.
   */
  return (
    /\b(barra|pastilla|pieza|pza)\b/.test(
      text,
    ) ||
    /\b\d+(?:[.,]\d+)?\s*(g|gr|gramo|gramos)\b/.test(
      text,
    )
  );
}

function getQuantityForPresentation(
  basket:
    BasketItem,
  presentation:
    PresentationRow | null,
) {
  const canonical =
    String(
      basket.canonical_name ??
        "",
    ).trim();

  /*
   * Huevo de gallina:
   * referencia = 18 piezas.
   */
  if (
    canonical ===
    "huevo"
  ) {
    const eggCount =
      parseEggCount(
        presentation,
      );

    if (
      eggCount &&
      eggCount >
        0
    ) {
      return {
        compatible:
          true,

        quantity:
          Math.max(
            1,
            Math.ceil(
              18 /
                eggCount,
            ),
          ),
      };
    }
  }

  /*
   * Jabón de tocador:
   * referencia = 1 pieza.
   */
  if (
    canonical ===
      "jabon_tocador" &&
    isSoapPiecePresentation(
      presentation,
    )
  ) {
    return {
      compatible:
        true,

      quantity:
        1,
    };
  }

  const fallback =
    Math.max(
      1,
      Number(
        basket.required_packages ??
          1,
      ),
    );

  const required =
    getRequiredTotal(
      basket,
    );

  if (
    !required
  ) {
    return {
      compatible:
        true,
      quantity:
        fallback,
    };
  }

  if (
    !presentation
  ) {
    return {
      compatible:
        true,
      quantity:
        fallback,
    };
  }

  const offered =
    parsePresentationAmount(
      presentation,
    );

  if (
    !offered
  ) {
    /*
     * No inventamos conversiones cuando
     * no se puede interpretar la presentación.
     */
    return {
      compatible:
        false,
      quantity:
        0,
    };
  }

  if (
    offered.unit !==
    required.unit
  ) {
    return {
      compatible:
        false,
      quantity:
        0,
    };
  }

  const quantity =
    Math.max(
      1,
      Math.ceil(
        required.value /
          offered.value,
      ),
    );

  /*
   * Protección ante presentaciones absurdas.
   */
  if (
    quantity >
    24
  ) {
    return {
      compatible:
        false,
      quantity:
        0,
    };
  }

  return {
    compatible:
      true,
    quantity,
  };
}

/*
 * ============================================================
 * MATCHING ESTRICTO DE PRODUCTOS
 * ============================================================
 */

const STOP_WORDS =
  new Set([
    "de",
    "del",
    "la",
    "las",
    "el",
    "los",
    "en",
    "con",
    "para",
    "y",
    "estandar",
    "comestible",
  ]);

/*
 * Alias controlados.
 *
 * Importante:
 * si existe una entrada aquí, NO usamos
 * los search_terms genéricos del SQL.
 * Así evitamos falsos positivos como:
 *
 * papa -> papaya
 * pan de caja -> bolillo
 * res -> exprimidores
 */
const BASKET_ALIASES:
  Record<
    string,
    string[]
  > = {
  aceite_vegetal: ["aceite vegetal", "aceite comestible", "aceite vegetal comestible"],
  arroz: ["arroz", "arroz en grano"],
  atun: ["atun", "atun en hojuela", "atun en hojuelas"],
  azucar: ["azucar", "azucar estandar"],
  carne_res: ["carne de res", "carne res"],
  cebolla_blanca: ["cebolla blanca", "cebolla"],
  chile_jalapeno: ["chile jalapeno", "jalapeno", "chile cuaresmeno", "cuaresmeno"],
  carne_cerdo: ["carne de cerdo", "carne cerdo"],
  frijol_negro: ["frijol negro", "frijol"],
  huevo: ["huevo de gallina", "huevo"],
  jabon_tocador: ["jabon de tocador", "jabon tocador", "jabon"],
  jitomate: ["jitomate saladet", "jitomate", "tomate saladette", "tomate saladet", "tomate"],
  leche: ["leche de vaca", "leche"],
  limon: ["limon"],
  manzana: ["manzana"],
  platano: ["platano"],
  pan_blanco: ["pan blanco de caja", "pan de caja", "pan blanco"],
  papa_blanca: ["papa blanca", "papa"],
  papel_higienico: ["papel higienico"],
  pasta_sopa: ["pasta para sopa", "pasta sopa", "pasta"],
  carne_pollo: ["carne de pollo", "carne pollo", "pollo"],
  sardina: ["sardina en tomate", "sardina"],
  tortilla: ["tortilla de maiz", "tortilla maiz", "tortilla"],
  zanahoria: ["zanahoria"],
};

const FORBIDDEN_TOKENS:
  Record<string, string[]> = {
  carne_res: [
    "extractor",
    "extractores",
    "jugo",
    "jugos",
    "exprimidor",
    "exprimidores",
    "electrico",
  ],

  papa_blanca: [
    "papaya",
  ],

  pan_blanco: [
    "bolillo",
    "telera",
    "hamburguesa",
    "hot dog",
  ],

  jabon_tocador: [
    "ropa",
    "lavanderia",
    "trastes",
    "lavavajillas",
    "detergente",
  ],

  chile_jalapeno: [
    "chipotle",
    "habanero",
    "serrano",
    "poblano",
    "guajillo",
    "ancho",
    "pasilla",
  ],
};

const REQUIRED_ANYWHERE:
  Record<string, string[]> = {
  chile_jalapeno: [
    "jalapeno",
    "cuaresmeno",
  ],

  jabon_tocador: [
    "tocador",
    "barra",
    "pastilla",
  ],

  pan_blanco: [
    "caja",
    "rebanado",
    "paquete",
  ],
};

function tokens(
  value:
    string,
) {
  return normalizeKey(
    value,
  )
    .split(
      " ",
    )
    .filter(
      (
        token,
      ) =>
        token.length >=
          2 &&
        !STOP_WORDS.has(
          token,
        ),
    );
}

function phraseMatches(
  phrase:
    string,
  productName:
    string,
) {
  const phraseTokens =
    tokens(
      phrase,
    );

  const productTokens =
    new Set(
      tokens(
        productName,
      ),
    );

  if (
    phraseTokens.length ===
    0
  ) {
    return false;
  }

  /*
   * Todas las palabras importantes del alias
   * deben existir como palabra completa en el
   * producto.
   */
  return phraseTokens.every(
    (
      token,
    ) =>
      productTokens.has(
        token,
      ),
  );
}

function getBasketAliases(
  basket:
    BasketItem,
) {
  const canonical =
    String(
      basket.canonical_name ??
        "",
    ).trim();

  const aliases =
    BASKET_ALIASES[
      canonical
    ];

  if (
    aliases &&
    aliases.length >
      0
  ) {
    return aliases;
  }

  return [
    basket.display_name,
    ...(
      basket.search_terms ??
      []
    ),
  ];
}

function hasForbiddenToken(
  basket: BasketItem,
  value: string,
) {
  const canonical =
    String(
      basket.canonical_name ?? "",
    ).trim();

  const forbidden =
    FORBIDDEN_TOKENS[canonical] ?? [];

  const normalized =
    normalizeKey(value);

  return forbidden.some(
    (word) =>
      normalized.includes(
        normalizeKey(word),
      ),
  );
}

function passesRequiredAnywhere(
  basket: BasketItem,
  value: string,
) {
  const canonical =
    String(
      basket.canonical_name ?? "",
    ).trim();

  const required =
    REQUIRED_ANYWHERE[canonical];

  if (
    !required ||
    required.length === 0
  ) {
    return true;
  }

  const normalized =
    normalizeKey(value);

  return required.some(
    (word) =>
      normalized.includes(
        normalizeKey(word),
      ),
  );
}

function productMatchesBasket(
  basket: BasketItem,
  product: ProductRow,
) {
  if (
    basket.product_id &&
    basket.product_id === product.id
  ) {
    return true;
  }

  const productName =
    normalizeKey(
      product.normalized_name ??
        product.name,
    );

  if (!productName) {
    return false;
  }

  if (
    hasForbiddenToken(
      basket,
      productName,
    )
  ) {
    return false;
  }

  const aliases =
    getBasketAliases(basket);

  return aliases.some(
    (alias) =>
      phraseMatches(
        alias,
        productName,
      ),
  );
}

function candidateMatchesBasket(
  basket: BasketItem,
  product: ProductRow,
  presentation: PresentationRow | null,
) {
  const combined =
    [
      product.normalized_name ?? product.name,
      product.name,
      presentation?.presentation_name ?? "",
    ].join(" ");

  if (!normalizeKey(combined)) {
    return false;
  }

  if (
    hasForbiddenToken(
      basket,
      combined,
    )
  ) {
    return false;
  }

  const aliases =
    getBasketAliases(
      basket,
    );

  const aliasMatched =
    basket.product_id === product.id ||
    aliases.some(
      (alias) =>
        phraseMatches(
          alias,
          combined,
        ),
    );

  if (!aliasMatched) {
    return false;
  }

  return passesRequiredAnywhere(
    basket,
    combined,
  );
}

/*
 * ============================================================
 * PRECIO VIGENTE
 * ============================================================
 */

function latestPrices(
  rows:
    PriceRow[],
) {
  const map =
    new Map<
      string,
      PriceRow
    >();

  for (
    const row
    of rows
  ) {
    if (
      !row.store_branch_id
    ) {
      continue;
    }

    const key =
      [
        row.product_id,
        row.presentation_id ??
          "",
        row.store_branch_id,
      ].join(
        "|",
      );

    const current =
      map.get(
        key,
      );

    if (
      !current
    ) {
      map.set(
        key,
        row,
      );

      continue;
    }

    const currentTime =
      timestamp(
        current.observed_at,
      );

    const rowTime =
      timestamp(
        row.observed_at,
      );

    if (
      rowTime >
      currentTime
    ) {
      map.set(
        key,
        row,
      );

      continue;
    }

    if (
      rowTime ===
        currentTime &&
      sourcePriority(
        row.source,
      ) >
        sourcePriority(
          current.source,
        )
    ) {
      map.set(
        key,
        row,
      );
    }
  }

  return [
    ...map.values(),
  ];
}

/*
 * ============================================================
 * CARGAS PAGINADAS
 * ============================================================
 */

async function loadAllLocalPrices(
  branchIds:
    string[],
) {
  const pageSize =
    1000;

  const result:
    PriceRow[] =
    [];

  for (
    let from = 0;
    ;
    from +=
      pageSize
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "prices",
        )
        .select(`
          id,
          product_id,
          presentation_id,
          store_id,
          store_branch_id,
          price,
          source,
          observed_at
        `)
        .in(
          "store_branch_id",
          branchIds,
        )
        .order(
          "observed_at",
          {
            ascending:
              false,
          },
        )
        .range(
          from,
          from +
            pageSize -
            1,
        );

    if (
      error
    ) {
      throw new Error(
        `No se pudieron consultar precios locales: ${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as PriceRow[];

    result.push(
      ...rows,
    );

    if (
      rows.length <
      pageSize
    ) {
      break;
    }
  }

  return result;
}

async function loadProductsByIds(
  ids:
    string[],
) {
  const result:
    ProductRow[] =
    [];

  for (
    const chunk
    of chunkArray(
      ids,
      150,
    )
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "products",
        )
        .select(`
          id,
          name,
          normalized_name
        `)
        .in(
          "id",
          chunk,
        );

    if (
      error
    ) {
      throw new Error(
        `No se pudieron cargar productos locales: ${error.message}`,
      );
    }

    result.push(
      ...(
        (
          data ??
          []
        ) as ProductRow[]
      ),
    );
  }

  return result;
}

async function loadPresentationsByProductIds(
  ids:
    string[],
) {
  const result:
    PresentationRow[] =
    [];

  for (
    const chunk
    of chunkArray(
      ids,
      150,
    )
  ) {
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
          size_unit
        `)
        .in(
          "product_id",
          chunk,
        );

    if (
      error
    ) {
      throw new Error(
        `No se pudieron cargar presentaciones: ${error.message}`,
      );
    }

    result.push(
      ...(
        (
          data ??
          []
        ) as PresentationRow[]
      ),
    );
  }

  return result;
}


/*
 * ============================================================
 * COMPRA INTELIGENTE: DISTANCIA + PRECIO
 * ============================================================
 */

function clampNumber(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

function parseOptionalNumber(
  value: unknown,
) {
  if (
    typeof value !==
      "string" &&
    typeof value !==
      "number"
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function toCoordinate(
  value:
    | number
    | string
    | null,
) {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm =
    6371;

  const toRadians =
    (
      degrees:
        number,
    ) =>
      (
        degrees *
        Math.PI
      ) /
      180;

  const deltaLat =
    toRadians(
      lat2 -
        lat1,
    );

  const deltaLng =
    toRadians(
      lng2 -
        lng1,
    );

  const a =
    Math.sin(
      deltaLat /
        2,
    ) **
      2 +
    Math.cos(
      toRadians(
        lat1,
      ),
    ) *
      Math.cos(
        toRadians(
          lat2,
        ),
      ) *
      Math.sin(
        deltaLng /
          2,
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a,
      ),
      Math.sqrt(
        1 -
          a,
      ),
    );

  return (
    earthRadiusKm *
    c
  );
}

function estimateCostPerKm(
  mode:
    TransportMode,
  gasPrice:
    number,
  carKmPerLiter:
    number,
  motoKmPerLiter:
    number,
) {
  if (
    mode ===
    "car"
  ) {
    return (
      gasPrice /
      Math.max(
        1,
        carKmPerLiter,
      )
    );
  }

  if (
    mode ===
    "moto"
  ) {
    return (
      gasPrice /
      Math.max(
        1,
        motoKmPerLiter,
      )
    );
  }

  return 0;
}

function routeDistanceGreedy(
  userLat:
    number,
  userLng:
    number,
  stores:
    Array<{
      branchId: string;
      latitude: number;
      longitude: number;
    }>,
) {
  if (
    stores.length ===
    0
  ) {
    return 0;
  }

  const remaining =
    [
      ...stores,
    ];

  let currentLat =
    userLat;

  let currentLng =
    userLng;

  let total =
    0;

  while (
    remaining.length >
    0
  ) {
    let nearestIndex =
      0;

    let nearestDistance =
      Number.POSITIVE_INFINITY;

    for (
      let index = 0;
      index <
      remaining.length;
      index++
    ) {
      const candidate =
        remaining[index];

      const distance =
        haversineKm(
          currentLat,
          currentLng,
          candidate.latitude,
          candidate.longitude,
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestDistance =
          distance;

        nearestIndex =
          index;
      }
    }

    const [
      nearest,
    ] =
      remaining.splice(
        nearestIndex,
        1,
      );

    total +=
      nearestDistance;

    currentLat =
      nearest.latitude;

    currentLng =
      nearest.longitude;
  }

  /*
   * Regreso aproximado a la ubicación
   * inicial del usuario.
   */
  total +=
    haversineKm(
      currentLat,
      currentLng,
      userLat,
      userLng,
    );

  return total;
}

function combinations<T>(
  items:
    T[],
  maxSize:
    number,
) {
  const output:
    T[][] =
    [];

  function visit(
    start:
      number,
    current:
      T[],
  ) {
    if (
      current.length >
      0
    ) {
      output.push(
        [
          ...current,
        ],
      );
    }

    if (
      current.length >=
      maxSize
    ) {
      return;
    }

    for (
      let index =
        start;
      index <
      items.length;
      index++
    ) {
      current.push(
        items[index],
      );

      visit(
        index +
          1,
        current,
      );

      current.pop();
    }
  }

  visit(
    0,
    [],
  );

  return output;
}

function buildPlan(
  type:
    SmartPurchasePlan["type"],
  label:
    string,
  branchIds:
    string[],
  optimizationItems:
    Array<{
      basketItemId: string;
      displayName: string;
      options: OptimizationOption[];
    }>,
  branchMap:
    Map<
      string,
      BranchRow
    >,
  storeMap:
    Map<
      string,
      StoreRow
    >,
  userLat:
    number,
  userLng:
    number,
  costPerKm:
    number,
  totalItems:
    number,
): SmartPurchasePlan | null {
  const selected =
    new Set(
      branchIds,
    );

  const assignments:
    SmartPurchasePlan["itemAssignments"] =
    [];

  let productsTotal =
    0;

  for (
    const item
    of optimizationItems
  ) {
    const best =
      item.options
        .filter(
          (
            option,
          ) =>
            selected.has(
              option.branchId,
            ),
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.lineTotal -
            b.lineTotal,
        )[0];

    if (
      !best
    ) {
      continue;
    }

    productsTotal +=
      best.lineTotal;

    assignments.push({
      basketItemId:
        item.basketItemId,

      displayName:
        item.displayName,

      branchId:
        best.branchId,

      storeName:
        best.storeName,

      branchName:
        best.branchName,

      lineTotal:
        Number(
          best.lineTotal.toFixed(
            2,
          ),
        ),
    });
  }

  if (
    assignments.length ===
    0
  ) {
    return null;
  }

  const stores =
    branchIds
      .map(
        (
          branchId,
        ) => {
          const branch =
            branchMap.get(
              branchId,
            );

          if (
            !branch
          ) {
            return null;
          }

          const latitude =
            toCoordinate(
              branch.latitude,
            );

          const longitude =
            toCoordinate(
              branch.longitude,
            );

          if (
            latitude ===
              null ||
            longitude ===
              null
          ) {
            return null;
          }

          const storeId =
            String(
              branch.store_id ??
                "",
            );

          const store =
            storeMap.get(
              storeId,
            );

          return {
            branchId:
              branch.id,

            storeId,

            storeName:
              store?.name ??
              "Tienda",

            branchName:
              branch.name,

            latitude,

            longitude,

            distanceFromUserKm:
              haversineKm(
                userLat,
                userLng,
                latitude,
                longitude,
              ),
          };
        },
      )
      .filter(
        (
          store,
        ): store is NonNullable<
          typeof store
        > =>
          Boolean(
            store,
          ),
      );

  if (
    stores.length ===
    0
  ) {
    return null;
  }

  const travelDistanceKm =
    routeDistanceGreedy(
      userLat,
      userLng,
      stores,
    );

  const travelCost =
    travelDistanceKm *
    costPerKm;

  const coveredItems =
    assignments.length;

  return {
    type,

    label,

    coveredItems,

    totalItems,

    coveragePercentage:
      totalItems >
      0
        ? Math.round(
            (
              coveredItems /
              totalItems
            ) *
              100,
          )
        : 0,

    productsTotal:
      Number(
        productsTotal.toFixed(
          2,
        ),
      ),

    travelDistanceKm:
      Number(
        travelDistanceKm.toFixed(
          2,
        ),
      ),

    travelCost:
      Number(
        travelCost.toFixed(
          2,
        ),
      ),

    estimatedTotal:
      Number(
        (
          productsTotal +
          travelCost
        ).toFixed(
          2,
        ),
      ),

    storesCount:
      stores.length,

    stores:
      stores
        .sort(
          (
            a,
            b,
          ) =>
            a.distanceFromUserKm -
            b.distanceFromUserKm,
        )
        .map(
          (
            store,
          ) => ({
            ...store,

            distanceFromUserKm:
              Number(
                store.distanceFromUserKm.toFixed(
                  2,
                ),
              ),
          }),
        ),

    itemAssignments:
      assignments,
  };
}

function buildSmartPurchase(
  userLat:
    number,
  userLng:
    number,
  maxStores:
    number,
  maxDistanceKm:
    number,
  mode:
    TransportMode,
  gasPrice:
    number,
  carKmPerLiter:
    number,
  motoKmPerLiter:
    number,
  basketItems:
    BasketItem[],
  optimizationItems:
    Array<{
      basketItemId: string;
      displayName: string;
      options: OptimizationOption[];
    }>,
  branchMap:
    Map<
      string,
      BranchRow
    >,
  storeMap:
    Map<
      string,
      StoreRow
    >,
) {
  const costPerKm =
    estimateCostPerKm(
      mode,
      gasPrice,
      carKmPerLiter,
      motoKmPerLiter,
    );

  const branchIdsWithCoordinates =
    [
      ...branchMap.values(),
    ]
      .map(
        (
          branch,
        ) => {
          const latitude =
            toCoordinate(
              branch.latitude,
            );

          const longitude =
            toCoordinate(
              branch.longitude,
            );

          if (
            latitude ===
              null ||
            longitude ===
              null
          ) {
            return null;
          }

          const distance =
            haversineKm(
              userLat,
              userLng,
              latitude,
              longitude,
            );

          if (
            distance >
            maxDistanceKm
          ) {
            return null;
          }

          return {
            branchId:
              branch.id,

            distance,
          };
        },
      )
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > =>
          Boolean(
            item,
          ),
      );

  const allowed =
    new Set(
      branchIdsWithCoordinates.map(
        (
          item,
        ) =>
          item.branchId,
      ),
    );

  /*
   * Para no probar cientos de sucursales,
   * puntuamos las que realmente cubren
   * más artículos de la canasta.
   */
  const branchStats =
    new Map<
      string,
      {
        covered:
          Set<string>;
        total:
          number;
      }
    >();

  for (
    const item
    of optimizationItems
  ) {
    for (
      const option
      of item.options
  ) {
    if (
      !allowed.has(
        option.branchId,
      )
    ) {
      continue;
    }

    const current =
      branchStats.get(
        option.branchId,
      ) ?? {
        covered:
          new Set<
            string
          >(),

        total:
          0,
      };

    current.covered.add(
      item.basketItemId,
    );

    current.total +=
      option.lineTotal;

    branchStats.set(
      option.branchId,
      current,
    );
  }

  }

  const candidateBranches =
    [
      ...branchStats.entries(),
    ]
      .sort(
        (
          a,
          b,
        ) => {
          const coverageDifference =
            b[1].covered.size -
            a[1].covered.size;

          if (
            coverageDifference !==
            0
          ) {
            return coverageDifference;
          }

          return (
            a[1].total -
            b[1].total
          );
        },
      )
      .slice(
        0,
        12,
      )
      .map(
        (
          [
            branchId,
          ],
        ) =>
          branchId,
      );

  if (
    candidateBranches.length ===
    0
  ) {
    return {
      available:
        false,

      reason:
        "No hay sucursales con coordenadas dentro del radio seleccionado.",

      method:
        "haversine",

      mode,

      maxStores,

      maxDistanceKm,

      recommended:
        null,

      singleStore:
        null,

      minimumPrice:
        null,

      savingsVsSingle:
        null,
    };
  }

  const possibleSets =
    combinations(
      candidateBranches,
      maxStores,
    );

  const plans =
    possibleSets
      .map(
        (
          ids,
        ) =>
          buildPlan(
            "recommended",
            "Mejor compra real",
            ids,
            optimizationItems,
            branchMap,
            storeMap,
            userLat,
            userLng,
            costPerKm,
            basketItems.length,
          ),
      )
      .filter(
        (
          plan,
        ): plan is SmartPurchasePlan =>
          Boolean(
            plan,
          ),
      );

  plans.sort(
    (
      a,
      b,
    ) => {
      /*
       * Primero maximizamos cobertura.
       * Entre planes con la misma cobertura,
       * minimizamos productos + traslado.
       */
      if (
        b.coveredItems !==
        a.coveredItems
      ) {
        return (
          b.coveredItems -
          a.coveredItems
        );
      }

      if (
        a.estimatedTotal !==
        b.estimatedTotal
      ) {
        return (
          a.estimatedTotal -
          b.estimatedTotal
        );
      }

      return (
        a.storesCount -
        b.storesCount
      );
    },
  );

  const recommended =
    plans[0] ??
    null;

  const singlePlans =
    candidateBranches
      .map(
        (
          branchId,
        ) =>
          buildPlan(
            "single_store",
            "Una sola tienda",
            [
              branchId,
            ],
            optimizationItems,
            branchMap,
            storeMap,
            userLat,
            userLng,
            costPerKm,
            basketItems.length,
          ),
      )
      .filter(
        (
          plan,
        ): plan is SmartPurchasePlan =>
          Boolean(
            plan,
          ),
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b.coveredItems !==
            a.coveredItems
          ) {
            return (
              b.coveredItems -
              a.coveredItems
            );
          }

          return (
            a.estimatedTotal -
            b.estimatedTotal
          );
        },
      );

  const singleStore =
    singlePlans[0] ??
    null;

  /*
   * Precio mínimo absoluto dentro del radio:
   * selecciona para cada artículo la sucursal
   * más barata, aunque use muchas tiendas.
   */
  const minimumBranchIds =
    new Set<
      string
    >();

  for (
    const item
    of optimizationItems
  ) {
    const best =
      item.options
        .filter(
          (
            option,
          ) =>
            allowed.has(
              option.branchId,
            ),
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.lineTotal -
            b.lineTotal,
        )[0];

    if (
      best
    ) {
      minimumBranchIds.add(
        best.branchId,
      );
    }
  }

  const minimumPrice =
    minimumBranchIds.size >
    0
      ? buildPlan(
          "minimum_price",
          "Precio mínimo",
          [
            ...minimumBranchIds,
          ],
          optimizationItems,
          branchMap,
          storeMap,
          userLat,
          userLng,
          costPerKm,
          basketItems.length,
        )
      : null;

  const savingsVsSingle =
    recommended &&
    singleStore &&
    recommended.coveredItems ===
      singleStore.coveredItems
      ? Number(
          (
            singleStore.estimatedTotal -
            recommended.estimatedTotal
          ).toFixed(
            2,
          ),
        )
      : null;

  return {
    available:
      Boolean(
        recommended,
      ),

    reason:
      recommended
        ? null
        : "No fue posible construir una ruta con las sucursales disponibles.",

    method:
      "haversine",

    /*
     * La distancia es aproximada en línea
     * recta. Después podremos cambiarla por
     * rutas reales con un proveedor de mapas.
     */
    distanceNote:
      "Distancia aproximada; no representa aún la ruta real por calles.",

    mode,

    maxStores,

    maxDistanceKm,

    gasPrice,

    carKmPerLiter,

    motoKmPerLiter,

    costPerKm:
      Number(
        costPerKm.toFixed(
          3,
        ),
      ),

    recommended,

    singleStore,

    minimumPrice,

    savingsVsSingle,
  };
}

/*
 * ============================================================
 * RUTA
 * ============================================================
 */

router.get(
  "/",
  async (
    request,
    response,
  ) => {
    try {
      const state =
        typeof request.query
          .state ===
        "string"
          ? request.query
              .state
              .trim()
          : "";

      const municipality =
        typeof request.query
          .municipality ===
        "string"
          ? request.query
              .municipality
              .trim()
          : "";

      const userLat =
        parseOptionalNumber(
          request.query.userLat,
        );

      const userLng =
        parseOptionalNumber(
          request.query.userLng,
        );

      const requestedMode =
        typeof request.query.mode ===
        "string"
          ? request.query.mode
          : "car";

      const mode:
        TransportMode =
        [
          "car",
          "moto",
          "bike",
          "walk",
        ].includes(
          requestedMode,
        )
          ? requestedMode as TransportMode
          : "car";

      const maxStores =
        clampNumber(
          Math.round(
            parseOptionalNumber(
              request.query.maxStores,
            ) ??
            2,
          ),
          1,
          3,
        );

      const maxDistanceKm =
        clampNumber(
          parseOptionalNumber(
            request.query.maxDistanceKm,
          ) ??
          10,
          1,
          50,
        );

      const gasPrice =
        clampNumber(
          parseOptionalNumber(
            request.query.gasPrice,
          ) ??
          24.5,
          1,
          100,
        );

      const carKmPerLiter =
        clampNumber(
          parseOptionalNumber(
            request.query.carKmPerLiter,
          ) ??
          12,
          3,
          40,
        );

      const motoKmPerLiter =
        clampNumber(
          parseOptionalNumber(
            request.query.motoKmPerLiter,
          ) ??
          30,
          8,
          80,
        );

      if (
        !state ||
        !municipality
      ) {
        response
          .status(
            400,
          )
          .json({
            ok:
              false,
            message:
              "Faltan state y municipality.",
          });

        return;
      }

      console.time(
        "basic-basket",
      );

      console.log(
        "🧺 BASIC BASKET INICIO",
        {
          state,
          municipality,
        },
      );

      /*
       * 1. Canasta oficial.
       */
      const {
        data:
          basketData,
        error:
          basketError,
      } =
        await supabase
          .from(
            "basic_basket_items",
          )
          .select(`
            id,
            canonical_name,
            display_name,
            product_id,
            required_packages,
            reference_amount,
            reference_unit,
            reference_presentation,
            search_terms,
            sort_order
          `)
          .eq(
            "active",
            true,
          )
          .order(
            "sort_order",
          );

      if (
        basketError
      ) {
        throw new Error(
          `Canasta: ${basketError.message}`,
        );
      }

      const basketItems =
        (
          basketData ??
          []
        ) as BasketItem[];

      console.log(
        "✅ 1/7 CANASTA",
        basketItems.length,
      );

      /*
       * 2. IDs de sucursales locales.
       */
      const {
        data:
          branchIdsData,
        error:
          branchIdsError,
      } =
        await supabase.rpc(
          "get_branch_ids_by_location",
          {
            p_state:
              state,
            p_municipality:
              municipality,
          },
        );

      if (
        branchIdsError
      ) {
        throw new Error(
          `Sucursales: ${branchIdsError.message}`,
        );
      }

      const branchIds =
        (
          branchIdsData ??
          []
        )
          .map(
            (
              row: {
                id:
                  string;
              },
            ) =>
              row.id
                ? String(
                    row.id,
                  )
                : "",
          )
          .filter(
            Boolean,
          );

      console.log(
        "✅ 2/7 SUCURSALES",
        branchIds.length,
      );

      if (
        branchIds.length ===
        0
      ) {
        response.json({
          ok:
            true,
          data: {
            location: {
              state,
              municipality,
            },
            totalItems:
              basketItems.length,
            matchedItems:
              0,
            missingItems:
              basketItems.length,
            bestCombinationTotal:
              0,
            items:
              basketItems.map(
                (
                  basket,
                ) => ({
                  id:
                    basket.id,
                  canonicalName:
                    basket.canonical_name,
                  displayName:
                    basket.display_name,
                  referencePresentation:
                    basket.reference_presentation,
                  requiredPackages:
                    basket.required_packages,
                  referenceAmount:
                    basket.reference_amount ===
                      null
                      ? null
                      : Number(
                          basket.reference_amount,
                        ),
                  referenceUnit:
                    basket.reference_unit,
                  matched:
                    false,
                  bestPrice:
                    null,
                }),
              ),
            stores:
              [],
          },
        });

        return;
      }

      /*
       * 3. Cargamos TODOS los precios locales,
       * paginados.
       */
      const rawPrices =
        await loadAllLocalPrices(
          branchIds,
        );

      console.log(
        "✅ 3/7 PRECIOS LOCALES",
        rawPrices.length,
      );

      const prices =
        latestPrices(
          rawPrices,
        );

      /*
       * 4. De esos precios derivamos productos
       * reales disponibles en la zona.
       */
      const localProductIds =
        [
          ...new Set(
            prices
              .map(
                (
                  price,
                ) =>
                  price.product_id,
              )
              .filter(
                Boolean,
              ),
          ),
        ];

      const [
        products,
        presentations,
      ] =
        await Promise.all(
          [
            loadProductsByIds(
              localProductIds,
            ),

            loadPresentationsByProductIds(
              localProductIds,
            ),
          ],
        );

      console.log(
        "✅ 4/7 CATÁLOGO LOCAL",
        {
          products:
            products.length,
          presentations:
            presentations.length,
        },
      );

      /*
       * 5. Sucursales y tiendas.
       */
      const [
        branchesResult,
        storesResult,
      ] =
        await Promise.all(
          [
            supabase
              .from(
                "store_branches",
              )
              .select(`
                id,
                store_id,
                name,
                latitude,
                longitude
              `)
              .in(
                "id",
                branchIds,
              ),

            supabase
              .from(
                "stores",
              )
              .select(`
                id,
                name
              `),
          ],
        );

      if (
        branchesResult.error
      ) {
        throw new Error(
          `Datos de sucursal: ${branchesResult.error.message}`,
        );
      }

      if (
        storesResult.error
      ) {
        throw new Error(
          `Tiendas: ${storesResult.error.message}`,
        );
      }

      const branches =
        (
          branchesResult.data ??
          []
        ) as BranchRow[];

      const stores =
        (
          storesResult.data ??
          []
        ) as StoreRow[];

      console.log(
        "✅ 5/7 TIENDAS",
        {
          branches:
            branches.length,
          stores:
            stores.length,
        },
      );

      /*
       * Mapas.
       */
      const productMap =
        new Map<
          string,
          ProductRow
        >(
          products.map(
            (
              product,
            ) => [
              product.id,
              product,
            ],
          ),
        );

      const presentationMap =
        new Map<
          string,
          PresentationRow
        >(
          presentations.map(
            (
              presentation,
            ) => [
              presentation.id,
              presentation,
            ],
          ),
        );

      const branchMap =
        new Map<
          string,
          BranchRow
        >(
          branches.map(
            (
              branch,
            ) => [
              branch.id,
              branch,
            ],
          ),
        );

      const storeMap =
        new Map<
          string,
          StoreRow
        >(
          stores.map(
            (
              store,
            ) => [
              store.id,
              store,
            ],
          ),
        );

      /*
       * 6. Calcular la canasta.
       */
      let matchedItems =
        0;

      let bestCombinationTotal =
        0;

      const itemResults:
        any[] =
        [];

      const storeAccumulator =
        new Map<
          string,
          StoreAccumulator
        >();

      const optimizationItems:
        Array<{
          basketItemId: string;
          displayName: string;
          options: OptimizationOption[];
        }> =
        [];

      for (
        const basket
        of basketItems
      ) {
        type Candidate = {
          price:
            PriceRow;
          unitPrice:
            number;
          quantity:
            number;
          lineTotal:
            number;
        };

        const candidates:
          Candidate[] =
          [];

        for (
          const price
          of prices
        ) {
          const presentation =
            price.presentation_id
              ? presentationMap.get(
                  price.presentation_id,
                ) ??
                null
              : null;

          const product =
            productMap.get(
              price.product_id,
            );

          if (
            !product ||
            !candidateMatchesBasket(
              basket,
              product,
              presentation,
            )
          ) {
            continue;
          }

          const quantityResult =
            getQuantityForPresentation(
              basket,
              presentation,
            );

          if (
            !quantityResult.compatible
          ) {
            continue;
          }

          const unitPrice =
            Number(
              price.price,
            );

          if (
            !Number.isFinite(
              unitPrice,
            ) ||
            unitPrice <=
              0
          ) {
            continue;
          }

          candidates.push({
            price,
            unitPrice,
            quantity:
              quantityResult.quantity,
            lineTotal:
              unitPrice *
              quantityResult.quantity,
          });
        }

        candidates.sort(
          (
            a,
            b,
          ) =>
            a.lineTotal -
            b.lineTotal,
        );

        const best =
          candidates[0] ??
          null;

        if (
          best
        ) {
          matchedItems++;

          bestCombinationTotal +=
            best.lineTotal;
        }

        /*
         * Mejor precio de ese artículo
         * por sucursal.
         */
        const bestByBranch =
          new Map<
            string,
            Candidate
          >();

        for (
          const candidate
          of candidates
        ) {
          const branchId =
            candidate.price
              .store_branch_id;

          if (
            !branchId
          ) {
            continue;
          }

          const current =
            bestByBranch.get(
              branchId,
            );

          if (
            !current ||
            candidate.lineTotal <
              current.lineTotal
          ) {
            bestByBranch.set(
              branchId,
              candidate,
            );
          }
        }

        const optimizationOptions:
          OptimizationOption[] =
          [];

        for (
          const [
            branchId,
            candidate,
          ]
          of bestByBranch
        ) {
          const branch =
            branchMap.get(
              branchId,
            );

          if (
            !branch
          ) {
            continue;
          }

          const storeId =
            String(
              candidate.price
                .store_id ??
                branch.store_id ??
                "",
            );

          const store =
            storeMap.get(
              storeId,
            );

          optimizationOptions.push({
            basketItemId:
              basket.id,

            displayName:
              basket.display_name,

            branchId,

            storeId,

            storeName:
              store?.name ??
              "Tienda desconocida",

            branchName:
              branch.name,

            lineTotal:
              candidate.lineTotal,
          });

          const current =
            storeAccumulator.get(
              branchId,
            ) ?? {
              branchId,
              storeId,
              storeName:
                store?.name ??
                "Tienda desconocida",
              branchName:
                branch.name,
              items:
                new Map<
                  string,
                  number
                >(),
            };

          current.items.set(
            basket.id,
            candidate.lineTotal,
          );

          storeAccumulator.set(
            branchId,
            current,
          );
        }

        optimizationItems.push({
          basketItemId:
            basket.id,

          displayName:
            basket.display_name,

          options:
            optimizationOptions,
        });

        if (
          !best
        ) {
          console.log(
            "⚠️ CANASTA SIN MATCH:",
            {
              canonical:
                basket.canonical_name,

              displayName:
                basket.display_name,

              posiblesProductos:
                prices
                  .map(
                    (
                      price,
                    ) => {
                      const product =
                        productMap.get(
                          price.product_id,
                        );

                      const presentation =
                        price.presentation_id
                          ? presentationMap.get(
                              price.presentation_id,
                            ) ??
                            null
                          : null;

                      if (
                        !product ||
                        !candidateMatchesBasket(
                          basket,
                          product,
                          presentation,
                        )
                      ) {
                        return null;
                      }

                      return {
                        product:
                          product.name,

                        presentation:
                          presentation?.presentation_name ??
                          null,

                        price:
                          Number(
                            price.price,
                          ),
                      };
                    },
                  )
                  .filter(
                    Boolean,
                  )
                  .slice(
                    0,
                    10,
                  ),
            },
          );

          itemResults.push({
            id:
              basket.id,
            canonicalName:
              basket.canonical_name,
            displayName:
              basket.display_name,
            referencePresentation:
              basket.reference_presentation,
            requiredPackages:
              basket.required_packages,
            referenceAmount:
              basket.reference_amount ===
                null
                ? null
                : Number(
                    basket.reference_amount,
                  ),
            referenceUnit:
              basket.reference_unit,
            matched:
              false,
            bestPrice:
              null,
          });

          continue;
        }

        const product =
          productMap.get(
            best.price
              .product_id,
          );

        const presentation =
          best.price
            .presentation_id
            ? presentationMap.get(
                best.price
                  .presentation_id,
              )
            : null;

        const branch =
          best.price
            .store_branch_id
            ? branchMap.get(
                best.price
                  .store_branch_id,
              )
            : null;

        const storeId =
          String(
            best.price
              .store_id ??
              branch?.store_id ??
              "",
          );

        const store =
          storeMap.get(
            storeId,
          );

        itemResults.push({
          id:
            basket.id,
          canonicalName:
            basket.canonical_name,
          displayName:
            basket.display_name,
          referencePresentation:
            basket.reference_presentation,
          requiredPackages:
            basket.required_packages,
          referenceAmount:
            basket.reference_amount ===
              null
              ? null
              : Number(
                  basket.reference_amount,
                ),
          referenceUnit:
            basket.reference_unit,
          matched:
            true,
          bestPrice: {
            priceId:
              best.price.id,
            unitPrice:
              Number(
                best.unitPrice.toFixed(
                  2,
                ),
              ),
            requiredPackages:
              best.quantity,
            lineTotal:
              Number(
                best.lineTotal.toFixed(
                  2,
                ),
              ),
            observedAt:
              best.price
                .observed_at,
            source:
              best.price
                .source,
            productId:
              best.price
                .product_id,
            productName:
              product?.name ??
              "Producto",
            presentationId:
              best.price
                .presentation_id,
            presentationName:
              presentation
                ?.presentation_name ??
              null,
            storeId,
            storeName:
              store?.name ??
              "Tienda desconocida",
            branchId:
              branch?.id ??
              null,
            branchName:
              branch?.name ??
              null,
          },
        });
      }

      console.log(
        "✅ 6/7 CANASTA CALCULADA",
        {
          matchedItems,
          missingItems:
            basketItems.length -
            matchedItems,
        },
      );

      /*
       * 7. Ranking por sucursal.
       */
      const storesSummary =
        [
          ...storeAccumulator.values(),
        ]
          .map(
            (
              entry,
            ) => {
              const basketTotal =
                [
                  ...entry.items.values(),
                ].reduce(
                  (
                    total,
                    value,
                  ) =>
                    total +
                    value,
                  0,
                );

              const coveredItems =
                entry.items.size;

              const totalItems =
                basketItems.length;

              return {
                branchId:
                  entry.branchId,
                storeId:
                  entry.storeId,
                storeName:
                  entry.storeName,
                branchName:
                  entry.branchName,
                coveredItems,
                totalItems,
                coveragePercentage:
                  totalItems >
                  0
                    ? Math.round(
                        (
                          coveredItems /
                          totalItems
                        ) *
                          100,
                      )
                    : 0,
                basketTotal:
                  Number(
                    basketTotal.toFixed(
                      2,
                    ),
                  ),
              };
            },
          )
          .sort(
            (
              a,
              b,
            ) => {
              if (
                b.coveredItems !==
                a.coveredItems
              ) {
                return (
                  b.coveredItems -
                  a.coveredItems
                );
              }

              return (
                a.basketTotal -
                b.basketTotal
              );
            },
          );

      console.log(
        "✅ 7/7 TERMINADO",
        {
          bestCombinationTotal:
            Number(
              bestCombinationTotal.toFixed(
                2,
              ),
            ),
          stores:
            storesSummary.length,
        },
      );

      const hasUserCoordinates =
        userLat !==
          null &&
        userLng !==
          null;

      const smartPurchase =
        hasUserCoordinates
          ? buildSmartPurchase(
              userLat,
              userLng,
              maxStores,
              maxDistanceKm,
              mode,
              gasPrice,
              carKmPerLiter,
              motoKmPerLiter,
              basketItems,
              optimizationItems,
              branchMap,
              storeMap,
            )
          : null;

      console.timeEnd(
        "basic-basket",
      );

      response.json({
        ok:
          true,
        data: {
          location: {
            state,
            municipality,
          },
          totalItems:
            basketItems.length,
          matchedItems,
          missingItems:
            basketItems.length -
            matchedItems,
          bestCombinationTotal:
            Number(
              bestCombinationTotal.toFixed(
                2,
              ),
            ),
          items:
            itemResults,
          stores:
            storesSummary,

          smartPurchase,
        },
      });
    } catch (
      error
    ) {
      console.error(
        "❌ BASIC BASKET:",
        error,
      );

      console.timeEnd(
        "basic-basket",
      );

      response
        .status(
          500,
        )
        .json({
          ok:
            false,
          message:
            error instanceof Error
              ? error.message
              : "No se pudo calcular la canasta básica.",
        });
    }
  },
);

export default router;