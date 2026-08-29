import { supabase } from "../lib/supabase";
import { normalizeText } from "../brain/normalize";

export interface CatalogSuggestion {
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
 * A partir de este nivel permitimos
 * reutilizar automáticamente los datos
 * del catálogo.
 *
 * Debe ser alto porque estos datos
 * pueden terminar creando productos.
 */
const AUTO_MATCH_THRESHOLD = 85;

export async function findCatalogSuggestion(
  rawName: string,
): Promise<CatalogSuggestion> {
  const normalizedRawName =
    normalizeText(rawName);

  const {
    data: products,
    error,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      category
    `);

  if (error) {
    throw new Error(
      `No se pudo consultar el catálogo: ${error.message}`,
    );
  }

  if (!products?.length) {
    return {
      found: false,
      product: null,
      presentation: null,
      confidence: 0,
    };
  }

  let bestProduct:
    | (typeof products)[number]
    | null = null;

  let bestScore = 0;

  /*
   * Buscar el producto más parecido.
   */
  for (const product of products) {
    const normalizedProductName =
      normalizeText(
        product.name,
      );

    const score =
      calculateSimilarity(
        normalizedRawName,
        normalizedProductName,
      );

    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  const roundedScore =
    Math.round(bestScore);

  /*
   * IMPORTANTE:
   *
   * Aunque encontremos el "mejor"
   * producto, eso no significa que
   * realmente sea parecido.
   *
   * Menos de 85%:
   * NO reutilizamos el catálogo.
   */
  if (
    !bestProduct ||
    roundedScore <
      AUTO_MATCH_THRESHOLD
  ) {
    console.log(
      "🧠 Catalog Suggestion descartada:",
      {
        rawName,
        bestProduct:
          bestProduct?.name ??
          null,
        confidence:
          roundedScore,
      },
    );

    return {
      found: false,
      product: null,
      presentation: null,
      confidence:
        roundedScore,
    };
  }

  /*
   * Recuperar una presentación
   * del producto encontrado.
   */
  const {
    data: presentation,
    error: presentationError,
  } = await supabase
    .from(
      "product_presentations",
    )
    .select(`
      id,
      presentation_name,
      size_value,
      size_unit,
      package_type
    `)
    .eq(
      "product_id",
      bestProduct.id,
    )
    .limit(1)
    .maybeSingle();

  if (presentationError) {
    throw new Error(
      `No se pudo consultar la presentación: ${presentationError.message}`,
    );
  }

  console.log(
    "✅ Catalog Suggestion encontrada:",
    {
      rawName,
      product:
        bestProduct.name,
      confidence:
        roundedScore,
    },
  );

  return {
    found: true,

    product: {
      id:
        String(
          bestProduct.id,
        ),

      name:
        String(
          bestProduct.name,
        ),

      brand:
        bestProduct.brand ??
        null,

      category:
        bestProduct.category ??
        null,
    },

    presentation:
      presentation
        ? {
            id:
              String(
                presentation.id,
              ),

            presentationName:
              presentation.presentation_name ??
              "",

            sizeValue:
              presentation.size_value ??
              null,

            sizeUnit:
              presentation.size_unit ??
              null,

            packageType:
              presentation.package_type ??
              null,
          }
        : null,

    confidence:
      roundedScore,
  };
}

/*
 * Calcular similitud entre dos
 * nombres de producto.
 *
 * Combinamos:
 *
 * 1. Coincidencia exacta.
 * 2. Palabras compartidas.
 * 3. Similitud del texto completo.
 *
 * Esto es mucho más seguro que
 * simplemente revisar si un texto
 * contiene al otro.
 */
function calculateSimilarity(
  a: string,
  b: string,
): number {
  if (!a || !b) {
    return 0;
  }

  /*
   * Coincidencia exacta.
   */
  if (a === b) {
    return 100;
  }

  const cleanA =
    cleanForComparison(a);

  const cleanB =
    cleanForComparison(b);

  if (
    !cleanA ||
    !cleanB
  ) {
    return 0;
  }

  /*
   * Ejemplo:
   *
   * "TOSTITO 10 P"
   * "TOSTITOS 10P"
   *
   * al compactarlos son muy
   * parecidos aunque el OCR
   * haya cambiado espacios.
   */
  const compactA =
    cleanA.replace(
      /\s+/g,
      "",
    );

  const compactB =
    cleanB.replace(
      /\s+/g,
      "",
    );

  if (
    compactA ===
    compactB
  ) {
    return 100;
  }

  /*
   * Similitud de caracteres
   * mediante distancia de edición.
   */
  const characterScore =
    calculateCharacterSimilarity(
      compactA,
      compactB,
    );

  /*
   * Comparación por palabras.
   */
  const wordsA =
    getImportantWords(
      cleanA,
    );

  const wordsB =
    getImportantWords(
      cleanB,
    );

  const wordScore =
    calculateWordSimilarity(
      wordsA,
      wordsB,
    );

  /*
   * Si no comparten ninguna
   * palabra importante y además
   * los textos no son muy
   * parecidos, descartamos.
   *
   * Esto evita cosas como:
   *
   * LIPTON T MI
   * ↓
   * TOSTITOS 10 P
   */
  const sharedWords =
    wordsA.filter(
      (word) =>
        wordsB.includes(word),
    );

  if (
    sharedWords.length === 0 &&
    characterScore < 80
  ) {
    return Math.round(
      characterScore * 0.5,
    );
  }

  /*
   * Peso principal:
   *
   * 60% caracteres
   * 40% palabras
   */
  const finalScore =
    characterScore * 0.6 +
    wordScore * 0.4;

  return Math.min(
    100,
    Math.round(
      finalScore,
    ),
  );
}

/*
 * Limpiar texto para comparación.
 */
function cleanForComparison(
  value: string,
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/*
 * Palabras que realmente aportan
 * información para identificar
 * el producto.
 *
 * Ignoramos tokens demasiado
 * pequeños para reducir falsos
 * positivos.
 */
function getImportantWords(
  text: string,
): string[] {
  return text
    .split(" ")
    .map(
      (word) =>
        word.trim(),
    )
    .filter(
      (word) =>
        word.length >= 3,
    );
}

/*
 * Jaccard sobre palabras.
 */
function calculateWordSimilarity(
  aWords: string[],
  bWords: string[],
): number {
  if (
    aWords.length === 0 ||
    bWords.length === 0
  ) {
    return 0;
  }

  const aSet =
    new Set(aWords);

  const bSet =
    new Set(bWords);

  let intersection = 0;

  for (const word of aSet) {
    if (
      bSet.has(word)
    ) {
      intersection++;
    }
  }

  const union =
    new Set([
      ...aSet,
      ...bSet,
    ]).size;

  if (union === 0) {
    return 0;
  }

  return (
    intersection /
    union
  ) * 100;
}

/*
 * Similitud basada en
 * distancia Levenshtein.
 */
function calculateCharacterSimilarity(
  a: string,
  b: string,
): number {
  if (a === b) {
    return 100;
  }

  const maxLength =
    Math.max(
      a.length,
      b.length,
    );

  if (maxLength === 0) {
    return 100;
  }

  const distance =
    levenshteinDistance(
      a,
      b,
    );

  return Math.max(
    0,
    (
      1 -
      distance /
        maxLength
    ) *
      100,
  );
}

/*
 * Distancia Levenshtein.
 */
function levenshteinDistance(
  a: string,
  b: string,
): number {
  const rows =
    a.length + 1;

  const columns =
    b.length + 1;

  const matrix:
    number[][] =
    Array.from(
      {
        length: rows,
      },
      () =>
        Array(
          columns,
        ).fill(0),
    );

  for (
    let i = 0;
    i < rows;
    i++
  ) {
    matrix[i][0] = i;
  }

  for (
    let j = 0;
    j < columns;
    j++
  ) {
    matrix[0][j] = j;
  }

  for (
    let i = 1;
    i < rows;
    i++
  ) {
    for (
      let j = 1;
      j < columns;
      j++
    ) {
      const cost =
        a[i - 1] ===
        b[j - 1]
          ? 0
          : 1;

      matrix[i][j] =
        Math.min(
          matrix[i - 1][j] +
            1,

          matrix[i][j - 1] +
            1,

          matrix[i - 1][
            j - 1
          ] + cost,
        );
    }
  }

  return matrix[
    rows - 1
  ][
    columns - 1
  ];
}