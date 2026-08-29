import type {
  NormalizedProfecoProduct,
  ProfecoRow,
} from "./profecoTypes";

/*
 * ==========================================
 * TEXTO
 * ==========================================
 */

function cleanText(
  value: string | null | undefined,
) {
  return String(
    value ?? "",
  )
    .replace(/\s+/g, " ")
    .trim();
}

function nullableText(
  value: string | null | undefined,
): string | null {
  const cleaned =
    cleanText(value);

  return cleaned
    ? cleaned
    : null;
}

/*
 * ==========================================
 * PRECIO
 * ==========================================
 */

function parsePrice(
  value: string,
): number | null {
  const cleaned =
    cleanText(value)
      .replace(/\$/g, "")
      .replace(/,/g, "");

  const price =
    Number(cleaned);

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  /*
   * Protección básica contra
   * valores absurdos del dataset.
   */
  if (price > 1_000_000) {
    return null;
  }

  return Number(
    price.toFixed(2),
  );
}

/*
 * ==========================================
 * FECHA
 * ==========================================
 */

function normalizeDate(
  value: string,
): string | null {
  const cleaned =
    cleanText(value);

  if (!cleaned) {
    return null;
  }

  /*
   * PROFECO normalmente usa:
   *
   * 2026/01/02
   */
  const yyyyMmDd =
    cleaned.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
    );

  if (yyyyMmDd) {
    const year =
      yyyyMmDd[1];

    const month =
      yyyyMmDd[2];

    const day =
      yyyyMmDd[3];

    if (
      year &&
      month &&
      day
    ) {
      return `${year}-${month.padStart(
        2,
        "0",
      )}-${day.padStart(
        2,
        "0",
      )}T00:00:00.000Z`;
    }
  }

  /*
   * Por seguridad intentamos
   * interpretar otras fechas.
   */
  const date =
    new Date(cleaned);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

/*
 * ==========================================
 * COORDENADAS
 * ==========================================
 */

function parseCoordinate(
  value: string,
  type:
    | "latitude"
    | "longitude",
): number | null {
  const cleaned =
    cleanText(value)
      .replace(",", ".");

  if (!cleaned) {
    return null;
  }

  const coordinate =
    Number(cleaned);

  if (
    !Number.isFinite(
      coordinate,
    )
  ) {
    return null;
  }

  if (
    type === "latitude" &&
    (
      coordinate < -90 ||
      coordinate > 90
    )
  ) {
    return null;
  }

  if (
    type === "longitude" &&
    (
      coordinate < -180 ||
      coordinate > 180
    )
  ) {
    return null;
  }

  return coordinate;
}

/*
 * ==========================================
 * NOMBRE DE TIENDA
 * ==========================================
 */

function normalizeStoreName(
  row: ProfecoRow,
) {
  const chain =
    cleanText(
      row.cadena_comercial,
    );

  const commercialName =
    cleanText(
      row.nombre_comercial,
    );

  /*
   * Para store usamos primero
   * la cadena comercial.
   *
   * Ej:
   * Walmart
   * Chedraui
   * Soriana
   */
  if (chain) {
    return chain;
  }

  if (commercialName) {
    return commercialName;
  }

  return "Tienda desconocida";
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

function normalizeStoreBranch(
  row: ProfecoRow,
) {
  const commercialName =
    cleanText(
      row.nombre_comercial,
    );

  if (!commercialName) {
    return null;
  }

  const storeName =
    normalizeStoreName(row);

  /*
   * Si ambos son idénticos
   * no necesitamos duplicarlo.
   */
  if (
    commercialName.toLowerCase() ===
    storeName.toLowerCase()
  ) {
    return null;
  }

  return commercialName;
}

/*
 * ==========================================
 * PRODUCTO
 * ==========================================
 */

function normalizeProductName(
  value: string,
) {
  const name =
    cleanText(value);

  /*
   * No transformamos agresivamente
   * los nombres.
   *
   * Profeco ya tiene un catálogo
   * relativamente estructurado.
   */
  return name;
}

/*
 * ==========================================
 * PRESENTACIÓN
 * ==========================================
 */

function normalizePresentation(
  value: string,
) {
  return cleanText(value);
}

/*
 * ==========================================
 * VALIDACIÓN DE FILA
 * ==========================================
 */

export function isUsefulProfecoRow(
  row: ProfecoRow,
) {
  const product =
    cleanText(
      row.producto,
    );

  const presentation =
    cleanText(
      row.presentacion,
    );

  const store =
    normalizeStoreName(row);

  const price =
    parsePrice(
      row.precio,
    );

  const observedAt =
    normalizeDate(
      row.fecha_registro,
    );

  if (!product) {
    return false;
  }

  if (!presentation) {
    return false;
  }

  if (
    !store ||
    store ===
      "Tienda desconocida"
  ) {
    return false;
  }

  if (price === null) {
    return false;
  }

  if (!observedAt) {
    return false;
  }

  return true;
}

/*
 * ==========================================
 * NORMALIZADOR PRINCIPAL
 * ==========================================
 */

export function normalizeProfecoRow(
  row: ProfecoRow,
): NormalizedProfecoProduct | null {
  if (
    !isUsefulProfecoRow(row)
  ) {
    return null;
  }

  const price =
    parsePrice(
      row.precio,
    );

  const observedAt =
    normalizeDate(
      row.fecha_registro,
    );

  /*
   * Ya fueron validados arriba,
   * pero TypeScript necesita
   * esta protección.
   */
  if (
    price === null ||
    !observedAt
  ) {
    return null;
  }

  return {
    name:
      normalizeProductName(
        row.producto,
      ),

    brand:
      nullableText(
        row.marca,
      ),

    category:
      nullableText(
        row.categoria,
      ),

    presentationName:
      normalizePresentation(
        row.presentacion,
      ),

    price,

    observedAt,

    storeName:
      normalizeStoreName(
        row,
      ),

    storeBranch:
      normalizeStoreBranch(
        row,
      ),

    state:
      nullableText(
        row.estado,
      ),

    municipality:
      nullableText(
        row.municipio,
      ),

    latitude:
      parseCoordinate(
        row.latitud,
        "latitude",
      ),

    longitude:
      parseCoordinate(
        row.longitud,
        "longitude",
      ),

    source:
      "profeco",
  };
}