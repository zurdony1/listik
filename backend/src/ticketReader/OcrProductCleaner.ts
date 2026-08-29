/*
 * ==========================================
 * LISTIK OCR PRODUCT CLEANER
 * ==========================================
 *
 * Esta capa NO intenta identificar
 * el producto real.
 *
 * Su única responsabilidad es:
 *
 * OCR crudo
 * ↓
 * texto más limpio
 * ↓
 * Listik Brain
 *
 * Ejemplos:
 *
 * "LIPTON T MI AAECA SI"
 * ↓
 * "LIPTON T MI"
 *
 * "MMMGALLETACHO E E"
 * ↓
 * "MMMGALLETACHO"
 *
 * "600ML PEPSI"
 * ↓
 * "600ML PEPSI"
 *
 * IMPORTANTE:
 *
 * No queremos corregir demasiado.
 * Brain + memoria + revisión humana
 * decidirán qué producto es realmente.
 */

export interface CleanOcrProductInput {
  rawName: string;

  rawCode?: string;
}

export interface CleanOcrProductResult {
  /*
   * Texto original leído
   * por Tesseract.
   */
  originalName: string;

  /*
   * Nombre limpio que
   * enviaremos al Brain.
   */
  cleanedName: string;

  /*
   * Código limpio.
   */
  cleanedCode?: string;

  /*
   * true si modificamos
   * el nombre.
   */
  changed: boolean;
}

/*
 * ==========================================
 * NORMALIZACIÓN BÁSICA
 * ==========================================
 */

function normalizeSpaces(
  value: string,
) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductText(
  value: string,
) {
  return normalizeSpaces(
    value
      .toUpperCase()

      /*
       * Caracteres extraños
       * producidos por OCR.
       */
      .replace(
        /[\\<>_=—]+/g,
        " ",
      )

      /*
       * Conservamos:
       *
       * letras
       * números
       * /
       * .
       * -
       * %
       *
       * porque pueden ser parte
       * de presentaciones.
       */
      .replace(
        /[^A-ZÁÉÍÓÚÑ0-9/.%+\-\s]/g,
        " ",
      ),
  );
}

/*
 * ==========================================
 * CÓDIGO
 * ==========================================
 */

function cleanProductCode(
  value?: string,
) {
  if (!value) {
    return undefined;
  }

  const digits =
    value.replace(
      /\D/g,
      "",
    );

  /*
   * Los códigos internos de tienda
   * pueden tener diferentes largos.
   *
   * Evitamos guardar basura muy corta.
   */
  if (
    digits.length <
    5
  ) {
    return undefined;
  }

  return digits;
}

/*
 * ==========================================
 * RUIDO AL PRINCIPIO
 * ==========================================
 */

function removeBeginningNoise(
  value: string,
) {
  let text =
    value;

  /*
   * Tesseract suele agregar:
   *
   * E
   * ER
   * BE
   * EA
   * PA
   * AE
   *
   * antes del nombre.
   *
   * SOLO los quitamos cuando
   * aparecen completamente solos.
   */
  text =
    text.replace(
      /^(?:E|ER|BE|EA|PA|AE|PEE)\s+/,
      "",
    );

  return text;
}

/*
 * ==========================================
 * RUIDO AL FINAL
 * ==========================================
 */

function removeEndingNoise(
  value: string,
) {
  let text =
    value;

  /*
   * Casos reales que vimos:
   *
   * LIPTON T MI AAECA SI
   * MMMGALLETACHO E E
   *
   * Son artefactos visuales del
   * lado derecho del ticket.
   */

  const noisePatterns = [
    /\s+AAECA\s+SI$/,

    /\s+AAECA$/,

    /\s+E\s+E$/,

    /\s+E$/,

    /\s+ER$/,

    /\s+BE$/,

    /\s+EA$/,

    /\s+TT$/,

    /\s+SI$/,

    /\s+AO$/,
  ];

  /*
   * Podemos necesitar eliminar
   * ruido más de una vez.
   */
  let changed =
    true;

  while (changed) {
    changed = false;

    for (
      const pattern
      of noisePatterns
    ) {
      const newText =
        text.replace(
          pattern,
          "",
        );

      if (
        newText !==
        text
      ) {
        text =
          newText;

        changed =
          true;
      }
    }
  }

  return normalizeSpaces(
    text,
  );
}

/*
 * ==========================================
 * PRECIOS QUE SE COLARON
 * ==========================================
 */

function removePriceFragments(
  value: string,
) {
  let text =
    value;

  /*
   * Si por alguna razón
   * rawName contiene:
   *
   * PRODUCTO 107.41
   *
   * no queremos mandarle
   * ese precio al Brain.
   *
   * OJO:
   *
   * No eliminamos números
   * arbitrariamente porque:
   *
   * "600ML PEPSI"
   * "24/400ML"
   * "10 P"
   *
   * sí contienen números útiles.
   */

  text =
    text.replace(
      /\s+\d+\.\d{2,3}$/,
      "",
    );

  return normalizeSpaces(
    text,
  );
}

/*
 * ==========================================
 * PREFIJOS NUMÉRICOS DUPLICADOS
 * ==========================================
 */

function removeDuplicatedCode(
  value: string,
  code?: string,
) {
  if (!code) {
    return value;
  }

  const escapedCode =
    code.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  return value.replace(
    new RegExp(
      `^${escapedCode}\\s+`,
    ),
    "",
  );
}

/*
 * ==========================================
 * CORRECCIONES OCR MUY SEGURAS
 * ==========================================
 *
 * IMPORTANTE:
 *
 * Solo hacemos correcciones
 * de errores visuales muy claros.
 *
 * No intentamos adivinar marcas
 * o nombres comerciales.
 */

function applySafeCorrections(
  value: string,
) {
  let text =
    value;

  /*
   * Espacios incorrectos
   * alrededor de unidades.
   */

  text =
    text.replace(
      /(\d)\s+ML\b/g,
      "$1ML",
    );

  text =
    text.replace(
      /(\d)\s+LT\b/g,
      "$1LT",
    );

  text =
    text.replace(
      /(\d)\s+KG\b/g,
      "$1KG",
    );

  text =
    text.replace(
      /(\d)\s+GR\b/g,
      "$1GR",
    );

  /*
   * OCR puede separar:
   *
   * 24 / 400ML
   *
   * Queremos:
   *
   * 24/400ML
   */
  text =
    text.replace(
      /(\d)\s*\/\s*(\d)/g,
      "$1/$2",
    );

  /*
   * Varias diagonales o puntos
   * accidentales.
   */
  text =
    text.replace(
      /\/{2,}/g,
      "/",
    );

  return normalizeSpaces(
    text,
  );
}

/*
 * ==========================================
 * BASURA COMPLETA
 * ==========================================
 */

function isProbablyGarbage(
  value: string,
) {
  if (
    value.length <
    2
  ) {
    return true;
  }

  /*
   * Necesitamos al menos
   * una letra.
   */
  if (
    !/[A-ZÁÉÍÓÚÑ]/.test(
      value,
    )
  ) {
    return true;
  }

  /*
   * Fragmentos conocidos
   * que no deberían convertirse
   * en producto.
   */
  const blocked = [
    "RFC",
    "SOCIO",
    "CUPONERA",
    "DESCUENTO",
    "AJUSTE",
    "BANCOMER",
    "TOTAL",
    "CAMBIO",
    "AUTORIZACION",
    "AFILIACION",
    "TARJETA",
    "CUENTA",
  ];

  return blocked.some(
    (word) =>
      value.includes(
        word,
      ),
  );
}

/*
 * ==========================================
 * FUNCIÓN PRINCIPAL
 * ==========================================
 */

export function cleanOcrProduct(
  input: CleanOcrProductInput,
): CleanOcrProductResult {
  const originalName =
    input.rawName;

  const cleanedCode =
    cleanProductCode(
      input.rawCode,
    );

  let cleanedName =
    normalizeProductText(
      originalName,
    );

  cleanedName =
    removeBeginningNoise(
      cleanedName,
    );

  cleanedName =
    removeDuplicatedCode(
      cleanedName,
      cleanedCode,
    );

  cleanedName =
    removePriceFragments(
      cleanedName,
    );

  cleanedName =
    removeEndingNoise(
      cleanedName,
    );

  cleanedName =
    applySafeCorrections(
      cleanedName,
    );

  /*
   * Última limpieza.
   */
  cleanedName =
    normalizeSpaces(
      cleanedName,
    );

  /*
   * Si quedó basura,
   * preferimos conservar el original
   * limpio en lugar de devolver vacío.
   *
   * Así no perdemos un producto real.
   */
  if (
    isProbablyGarbage(
      cleanedName,
    )
  ) {
    cleanedName =
      normalizeProductText(
        originalName,
      );
  }

  return {
    originalName,

    cleanedName,

    cleanedCode,

    changed:
      normalizeProductText(
        originalName,
      ) !==
      cleanedName ||
      input.rawCode !==
        cleanedCode,
  };
}

/*
 * ==========================================
 * LIMPIAR MUCHOS PRODUCTOS
 * ==========================================
 */

export function cleanOcrProducts<
  T extends {
    rawName: string;
    rawCode?: string;
  },
>(
  items: T[],
): (
  T & {
    rawName: string;
    rawCode?: string;
  }
)[] {
  return items.map(
    (item) => {
      const cleaned =
        cleanOcrProduct({
          rawName:
            item.rawName,

          rawCode:
            item.rawCode,
        });

      return {
        ...item,

        rawName:
          cleaned.cleanedName,

        rawCode:
          cleaned.cleanedCode,
      };
    },
  );
}