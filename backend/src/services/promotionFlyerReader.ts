import sharp from "sharp";

import {
  createWorker,
} from "tesseract.js";

export interface DetectedPromotionCandidate {
  rawText: string;

  productName: string;

  regularPrice:
    | number
    | null;

  promotionalPrice: number;

  promoType: string;

  promoText:
    | string
    | null;

  unit:
    | string
    | null;

  confidence: number;

  segmentIndex: number;
}

export interface PromotionFlyerAnalysis {
  rawText: string;

  candidates:
    DetectedPromotionCandidate[];

  summary: {
    detected: number;

    segments: number;
  };
}

interface MoneyCandidate {
  value: number;

  raw: string;

  lineIndex: number;

  position: number;

  hasCurrencySymbol: boolean;

  source:
    | "currency"
    | "super-cents"
    | "decimal";
}

/*
 * ==========================================
 * TEXTOS QUE NO SON NOMBRES DE PRODUCTO
 * ==========================================
 */

const EXACT_UI_PHRASES =
  [
    "agregar",
    "ver más",
    "ver mas",
    "envío",
    "envio",
    "pickup",
    "rebaja",
    "oferta",
    "precio en línea",
    "precio en linea",
    "aplica cupón",
    "aplica cupon",
    "combo",
    "garantía extendida",
    "garantia extendida",
    "favorito",
    "favoritos",
    "puntos dobles",
    "gratis con",
  ];

/*
 * Estas frases pueden venir pegadas al nombre:
 *
 * "Hasta 12 meses sin intereses Auriculares..."
 *
 * En lugar de tirar toda la línea,
 * quitamos únicamente el prefijo.
 */
const STRIPPABLE_PROMO_PATTERNS =
  [
    /^hasta\s+\d+\s+mes(?:es)?\s+sin\s+intereses?\s*/i,
    /^hasta\s+\d+\s+msi\s*/i,
    /^precio\s+en\s+l[ií]nea\s*/i,
    /^rebaja\s*/i,
    /^oferta\s*/i,
    /^combo\s*/i,
    /^aplica\s+cup[oó]n\s*/i,
  ];

const TECH_WORDS =
  new Set([
    "gb",
    "tb",
    "ssd",
    "ram",
    "uhd",
    "fhd",
    "4k",
    "8k",
    "hz",
    "w11",
    "windows",
    "intel",
    "core",
    "ryzen",
    "pulgadas",
    "inch",
    "tops",
  ]);

/*
 * ==========================================
 * NORMALIZACIÓN
 * ==========================================
 */

function normalizeSpaces(
  value: string,
) {
  return value
    .replace(
      /\u00a0/g,
      " ",
    )
    .replace(
      /[ \t]+/g,
      " ",
    )
    .trim();
}

function normalizeLine(
  value: string,
) {
  return normalizeSpaces(
    value.replace(
      /[|]/g,
      " ",
    ),
  );
}

function normalizeForCompare(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize(
      "NFD",
    )
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
 * ==========================================
 * PROMOCIONES / UI
 * ==========================================
 */

function stripPromotionPrefix(
  value: string,
) {
  let cleaned =
    normalizeSpaces(
      value,
    );

  let changed =
    true;

  while (
    changed
  ) {
    changed =
      false;

    for (
      const pattern
      of STRIPPABLE_PROMO_PATTERNS
    ) {
      const next =
        cleaned.replace(
          pattern,
          "",
        );

      if (
        next !==
        cleaned
      ) {
        cleaned =
          normalizeSpaces(
            next,
          );

        changed =
          true;
      }
    }
  }

  return cleaned;
}

function isExactUiLine(
  value: string,
) {
  const normalized =
    normalizeForCompare(
      value,
    );

  if (!normalized) {
    return true;
  }

  return EXACT_UI_PHRASES.some(
    (
      phrase,
    ) =>
      normalized ===
      normalizeForCompare(
        phrase,
      ),
  );
}

function isSavingsLine(
  value: string,
) {
  const normalized =
    normalizeForCompare(
      value,
    );

  return (
    normalized.startsWith(
      "ahorra ",
    ) ||
    normalized.startsWith(
      "ahorras ",
    ) ||
    normalized ===
      "ahorra" ||
    normalized ===
      "ahorras"
  );
}

/*
 * ==========================================
 * VALIDAR NOMBRE
 * ==========================================
 */

function looksLikeProductName(
  value: string,
) {
  const cleaned =
    stripPromotionPrefix(
      normalizeLine(
        value,
      ),
    );

  if (
    cleaned.length <
    4
  ) {
    return false;
  }

  if (
    !/[a-záéíóúñ]/i.test(
      cleaned,
    )
  ) {
    return false;
  }

  if (
    isExactUiLine(
      cleaned,
    ) ||
    isSavingsLine(
      cleaned,
    )
  ) {
    return false;
  }

  if (
    /^\+?\s*agregar\b/i.test(
      cleaned,
    )
  ) {
    return false;
  }

  const tokens =
    normalizeForCompare(
      cleaned,
    )
      .split(
        " ",
      )
      .filter(
        Boolean,
      );

  const technicalCount =
    tokens.filter(
      (
        token,
      ) =>
        TECH_WORDS.has(
          token,
        ),
    ).length;

  /*
   * Una descripción de laptop puede contener
   * RAM/SSD/GB, pero no descartamos todo el nombre.
   * Solo rechazamos líneas casi puramente técnicas.
   */
  if (
    tokens.length >
      0 &&
    technicalCount /
      tokens.length >=
      0.75
  ) {
    return false;
  }

  return true;
}

/*
 * ==========================================
 * DINERO
 * ==========================================
 */

function parseLocalizedMoney(
  raw: string,
) {
  let cleaned =
    raw
      .replace(
        /\s/g,
        "",
      )
      .replace(
        /\$/g,
        "",
      );

  if (
    !cleaned
  ) {
    return null;
  }

  /*
   * 14,491.00
   */
  if (
    cleaned.includes(
      ",",
    ) &&
    cleaned.includes(
      ".",
    )
  ) {
    if (
      cleaned.lastIndexOf(
        ".",
      ) >
      cleaned.lastIndexOf(
        ",",
      )
    ) {
      cleaned =
        cleaned.replace(
          /,/g,
          "",
        );
    } else {
      /*
       * 14.491,00
       */
      cleaned =
        cleaned
          .replace(
            /\./g,
            "",
          )
          .replace(
            ",",
            ".",
          );
    }
  } else if (
    cleaned.includes(
      ",",
    )
  ) {
    const pieces =
      cleaned.split(
        ",",
      );

    const last =
      pieces[
        pieces.length -
        1
      ];

    /*
     * 51,00 -> 51.00
     */
    if (
      last.length <=
      2
    ) {
      cleaned =
        `${pieces
          .slice(
            0,
            -1,
          )
          .join(
            "",
          )}.${last}`;
    } else {
      /*
       * 14,491 -> 14491
       */
      cleaned =
        pieces.join(
          "",
        );
    }
  }

  const value =
    Number(
      cleaned,
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

  return value;
}

/*
 * Walmart y otros sitios muestran centavos pequeños.
 * OCR puede producir:
 *
 * $14,49100
 * $23,03760
 * $75900
 *
 * Si hay símbolo $, interpretamos los últimos
 * dos dígitos como centavos únicamente cuando
 * el patrón es consistente.
 */
function parseCurrencyOcr(
  raw: string,
) {
  const compact =
    raw
      .replace(
        /\s/g,
        "",
      )
      .replace(
        /\$/g,
        "",
      );

  /*
   * Ej:
   * 14,49100 -> 14491.00
   * 23,03760 -> 23037.60
   */
  if (
    /^\d{1,3}(?:,\d{3})\d{2}$/.test(
      compact,
    )
  ) {
    const digits =
      compact.replace(
        /,/g,
        "",
      );

    return Number(
      `${digits.slice(
        0,
        -2,
      )}.${digits.slice(
        -2,
      )}`,
    );
  }

  /*
   * Ej:
   * 75900 -> 759.00
   *
   * Solo lo usamos cuando venía con símbolo $
   * y hay al menos 4 dígitos.
   */
  if (
    /^\d{4,7}$/.test(
      compact,
    )
  ) {
    return Number(
      `${compact.slice(
        0,
        -2,
      )}.${compact.slice(
        -2,
      )}`,
    );
  }

  return parseLocalizedMoney(
    raw,
  );
}

function extractMoneyCandidates(
  line: string,
  lineIndex: number,
) {
  const result:
    MoneyCandidate[] =
    [];

  /*
   * 1. Valores con símbolo $.
   *
   * Incluye:
   * $14,491.00
   * $14,49100
   * $75900
   * $167.90
   */
  const currencyRegex =
    /\$\s*\d[\d.,]*/g;

  let currencyMatch:
    RegExpExecArray |
    null;

  while (
    (
      currencyMatch =
        currencyRegex.exec(
          line,
        )
    ) !==
    null
  ) {
    const raw =
      currencyMatch[0];

    const value =
      parseCurrencyOcr(
        raw,
      );

    if (
      value !==
        null &&
      Number.isFinite(
        value,
      ) &&
      value >
        0
    ) {
      result.push({
        value,

        raw,

        lineIndex,

        position:
          currencyMatch.index,

        hasCurrencySymbol:
          true,

        source:
          "currency",
      });
    }
  }

  /*
   * 2. Precio decimal sin $.
   *
   * Útil en frutas/verduras:
   * 38.50/kg
   *
   * NO aceptamos enteros sueltos porque pueden ser:
   * 16GB, 512GB, 75", modelo, meses, etc.
   */
  const decimalRegex =
    /(?<![A-Za-z0-9])\d{1,6}[.,]\d{2}(?![A-Za-z0-9])/g;

  let decimalMatch:
    RegExpExecArray |
    null;

  while (
    (
      decimalMatch =
        decimalRegex.exec(
          line,
        )
    ) !==
    null
  ) {
    const raw =
      decimalMatch[0];

    const value =
      parseLocalizedMoney(
        raw,
      );

    if (
      value !==
        null &&
      !result.some(
        (
          item,
        ) =>
          Math.abs(
            item.value -
              value,
          ) <
          0.001,
      )
    ) {
      result.push({
        value,

        raw,

        lineIndex,

        position:
          decimalMatch.index,

        hasCurrencySymbol:
          false,

        source:
          "decimal",
      });
    }
  }

  return result;
}

/*
 * ==========================================
 * TIPO DE PROMOCIÓN
 * ==========================================
 */

function detectPromoType(
  text: string,
  regularPrice:
    | number
    | null,
) {
  const normalized =
    normalizeForCompare(
      text,
    );

  /*
   * Si hay precio anterior y precio actual,
   * la promoción principal ES PRECIO/REBAJA.
   *
   * MSI puede coexistir, pero no debe reemplazarla.
   */
  if (
    regularPrice !==
    null
  ) {
    return "price";
  }

  if (
    /\b2\s*x\s*1\b/.test(
      normalized,
    )
  ) {
    return "2x1";
  }

  if (
    /\b3\s*x\s*2\b/.test(
      normalized,
    )
  ) {
    return "3x2";
  }

  if (
    normalized.includes(
      "cupon",
    )
  ) {
    return "coupon";
  }

  if (
    normalized.includes(
      "combo",
    )
  ) {
    return "bundle";
  }

  if (
    normalized.includes(
      "puntos",
    )
  ) {
    return "points";
  }

  if (
    normalized.includes(
      "meses sin intereses",
    ) ||
    /\bmsi\b/.test(
      normalized,
    )
  ) {
    return "msi";
  }

  return "price";
}

/*
 * ==========================================
 * UNIDAD
 * ==========================================
 */

function detectUnit(
  text: string,
) {
  const normalized =
    normalizeForCompare(
      text,
    );

  if (
    /\/\s*kg/i.test(
      text,
    ) ||
    /(?:^|\s)(?:kg|kilo|kilogramo|kilogramos)(?:\s|$)/.test(
      normalized,
    )
  ) {
    return "kg";
  }

  if (
    /(?:^|\s)(?:ml|mililitro|mililitros)(?:\s|$)/.test(
      normalized,
    )
  ) {
    return "ml";
  }

  if (
    /(?:^|\s)(?:l|lt|litro|litros)(?:\s|$)/.test(
      normalized,
    )
  ) {
    return "L";
  }

  if (
    /(?:^|\s)(?:g|gr|gramo|gramos)(?:\s|$)/.test(
      normalized,
    )
  ) {
    return "g";
  }

  if (
    normalized.includes(
      "rollo",
    )
  ) {
    return "rollo";
  }

  if (
    normalized.includes(
      "pieza",
    ) ||
    normalized.includes(
      "pza",
    )
  ) {
    return "pieza";
  }

  if (
    normalized.includes(
      "paquete",
    )
  ) {
    return "paquete";
  }

  return null;
}

/*
 * ==========================================
 * NOMBRE DEL PRODUCTO
 * ==========================================
 */

function removeMoneyText(
  value: string,
) {
  return normalizeSpaces(
    value
      .replace(
        /\$\s*\d[\d.,]*/g,
        " ",
      )
      .replace(
        /(?<![A-Za-z0-9])\d{1,6}[.,]\d{2}(?![A-Za-z0-9])/g,
        " ",
      ),
  );
}

function cleanNameLine(
  value: string,
) {
  let cleaned =
    removeMoneyText(
      value,
    );

  cleaned =
    stripPromotionPrefix(
      cleaned,
    );

  cleaned =
    cleaned.replace(
      /\bahorra(?:s)?\b.*$/i,
      "",
    );

  cleaned =
    cleaned.replace(
      /^\+?\s*agregar\b/gi,
      "",
    );

  cleaned =
    normalizeSpaces(
      cleaned,
    );

  const tokens =
    cleaned
      .split(
        " ",
      )
      .filter(
        Boolean,
      );

  const protectedShortWords =
    new Set([
      "hp",
      "lg",
      "tv",
      "pc",
      "xl",
      "xxl",
      "3m",
    ]);

  while (
    tokens.length >
      2
  ) {
    const first =
      tokens[0];

    const normalizedFirst =
      normalizeForCompare(
        first,
      );

    const isSingleDigit =
      /^\d$/.test(
        first,
      );

    const isTinyNoise =
      /^[a-záéíóúñ]{1,2}$/i.test(
        first,
      ) &&
      !protectedShortWords.has(
        normalizedFirst,
      );

    const looksLikeBrokenSuffix =
      /^[a-záéíóúñ]{2,4}$/i.test(
        first,
      ) &&
      [
        "inal",
        "nal",
        "ina",
      ].includes(
        normalizedFirst,
      );

    if (
      isSingleDigit ||
      isTinyNoise ||
      looksLikeBrokenSuffix
    ) {
      tokens.shift();

      continue;
    }

    break;
  }

  cleaned =
    tokens.join(
      " ",
    );

  cleaned =
    cleaned
      .replace(
        /\s{2,}/g,
        " ",
      )
      .replace(
        /^[\s\-–—:;,./]+/,
        "",
      )
      .replace(
        /[\s\-–—:;,./]+$/,
        "",
      )
      .trim();

  return cleaned;
}

function chooseProductName(
  lines:
    string[],
  firstPriceLine:
    number,
) {
  const options =
    lines
      .map(
        (
          line,
          index,
        ) => ({
          index,

          line:
            cleanNameLine(
              line,
            ),
        }),
      )
      .filter(
        (
          item,
        ) =>
          looksLikeProductName(
            item.line,
          ),
      )
      .map(
        (
          item,
        ) => {
          let score =
            0;

          const words =
            normalizeForCompare(
              item.line,
            )
              .split(
                " ",
              )
              .filter(
                Boolean,
              );

          /*
           * Ecommerce suele poner:
           * precio -> MSI -> nombre del producto
           */
          if (
            firstPriceLine >=
              0 &&
            item.index >
              firstPriceLine
          ) {
            score +=
              40;
          }

          score +=
            Math.min(
              words.length *
                5,
              35,
            );

          if (
            item.line.length >
            12
          ) {
            score +=
              10;
          }

          if (
            isExactUiLine(
              item.line,
            )
          ) {
            score -=
              100;
          }

          return {
            ...item,

            score,
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.score -
          a.score,
      );

  if (
    options.length ===
    0
  ) {
    return null;
  }

  const first =
    options[0];

  let name =
    first.line;

  /*
   * Si la siguiente línea también parece descripción,
   * concatenamos una sola continuación.
   */
  const nextLine =
    lines[
      first.index +
      1
    ];

  if (
    nextLine
  ) {
    const cleanedNext =
      cleanNameLine(
        nextLine,
      );

    if (
      looksLikeProductName(
        cleanedNext,
      ) &&
      !extractMoneyCandidates(
        nextLine,
        first.index +
          1,
      ).length &&
      name.length <
        80
    ) {
      name =
        normalizeSpaces(
          `${name} ${cleanedNext}`,
        );
    }
  }

  name =
    cleanNameLine(
      name,
    );

  name =
    normalizeSpaces(
      name,
    );

  return name;
}

/*
 * ==========================================
 * CANDIDATO DESDE UNA TARJETA
 * ==========================================
 */

function buildCandidateFromSegment(
  text: string,
  segmentIndex: number,
): DetectedPromotionCandidate | null {
  const lines =
    text
      .split(
        /\r?\n/,
      )
      .map(
        normalizeLine,
      )
      .filter(
        Boolean,
      );

  if (
    lines.length ===
    0
  ) {
    return null;
  }

  /*
   * MUY IMPORTANTE:
   * excluimos precios de líneas "Ahorra..."
   * porque ese monto NO es ni precio actual ni anterior.
   */
  const money =
    lines.flatMap(
      (
        line,
        lineIndex,
      ) => {
        if (
          isSavingsLine(
            line,
          )
        ) {
          return [];
        }

        return extractMoneyCandidates(
          line,
          lineIndex,
        );
      },
    );

  /*
   * Orden visual/lectura, no por valor.
   */
  money.sort(
    (
      a,
      b,
    ) => {
      if (
        a.lineIndex !==
        b.lineIndex
      ) {
        return (
          a.lineIndex -
          b.lineIndex
        );
      }

      return (
        a.position -
        b.position
      );
    },
  );

  /*
   * Quitamos duplicados OCR cercanos.
   */
  const orderedMoney =
    money.filter(
      (
        candidate,
        index,
        array,
      ) =>
        array.findIndex(
          (
            other,
          ) =>
            Math.abs(
              other.value -
                candidate.value,
            ) <
              0.001
        ) ===
        index,
    );

  if (
    orderedMoney.length ===
    0
  ) {
    return null;
  }

  /*
   * REGLA V3:
   *
   * En las capturas observadas:
   *
   * $14,491   $25,999
   * $759      $3,795
   * $569      $3,095
   *
   * El PRIMER precio visible es el precio actual.
   * El SEGUNDO es el precio anterior.
   *
   * No usamos Math.min(), porque "Ahorra $11,508"
   * o números técnicos pueden romper el resultado.
   */
  const promotionalPrice =
    orderedMoney[0]
      .value;

  let regularPrice:
    | number
    | null =
    null;

  for (
    let index = 1;
    index <
    orderedMoney.length;
    index++
  ) {
    const possibleRegular =
      orderedMoney[
        index
      ].value;

    /*
     * Precio anterior debe ser realmente mayor.
     */
    if (
      possibleRegular >
      promotionalPrice *
        1.03
    ) {
      regularPrice =
        possibleRegular;

      break;
    }
  }

  /*
   * Protección extrema:
   * si el precio "regular" es absurdo frente al actual,
   * preferimos dejarlo vacío.
   */
  if (
    regularPrice !==
      null &&
    regularPrice >
      promotionalPrice *
        20
  ) {
    regularPrice =
      null;
  }

  const firstPriceLine =
    orderedMoney[0]
      .lineIndex;

  const productName =
    chooseProductName(
      lines,
      firstPriceLine,
    );

  if (
    !productName ||
    !looksLikeProductName(
      productName,
    )
  ) {
    return null;
  }

  const promoType =
    detectPromoType(
      text,
      regularPrice,
    );

  const unit =
    detectUnit(
      text,
    );

  /*
   * Confianza conservadora.
   */
  let confidence =
    60;

  if (
    orderedMoney[0]
      .hasCurrencySymbol
  ) {
    confidence +=
      12;
  }

  if (
    regularPrice !==
      null
  ) {
    confidence +=
      10;
  }

  if (
    productName.length >=
      10
  ) {
    confidence +=
      8;
  }

  if (
    unit
  ) {
    confidence +=
      5;
  }

  /*
   * Si OCR solo encontró números sin $
   * bajamos confianza.
   */
  if (
    !orderedMoney.some(
      (
        item,
      ) =>
        item.hasCurrencySymbol,
    )
  ) {
    confidence -=
      12;
  }

  confidence =
    Math.max(
      40,
      Math.min(
        confidence,
        95,
      ),
    );

  return {
    rawText:
      text,

    productName,

    regularPrice,

    promotionalPrice,

    promoType,

    promoText:
      null,

    unit,

    confidence,

    segmentIndex,
  };
}

/*
 * ==========================================
 * DIVIDIR CAPTURA EN TARJETAS
 * ==========================================
 */

async function makeSegments(
  input: Buffer,
) {
  const metadata =
    await sharp(
      input,
    )
      .metadata();

  const width =
    metadata.width ??
    0;

  const height =
    metadata.height ??
    0;

  if (
    width <=
      0 ||
    height <=
      0
  ) {
    throw new Error(
      "No se pudieron obtener las dimensiones de la imagen.",
    );
  }

  /*
   * Capturas horizontales tipo ecommerce.
   *
   * Estimamos cantidad de cards con la relación
   * ancho/alto, máximo 8.
   */
  let count =
    Math.round(
      width /
        Math.max(
          240,
          height *
            0.47,
        ),
    );

  count =
    Math.max(
      1,
      Math.min(
        count,
        8,
      ),
    );

  if (
    width /
      height >
      2.5
  ) {
    count =
      Math.max(
        count,
        4,
      );
  }

  const overlap =
    14;

  const baseWidth =
    Math.ceil(
      width /
        count,
    );

  const segments:
    Buffer[] =
    [];

  for (
    let index = 0;
    index <
    count;
    index++
  ) {
    const left =
      Math.max(
        0,
        index *
          baseWidth -
          (
            index >
            0
              ? overlap
              : 0
          ),
      );

    const right =
      Math.min(
        width,
        (
          index +
          1
        ) *
          baseWidth +
          (
            index <
            count -
            1
              ? overlap
              : 0
          ),
      );

    const segment =
      await sharp(
        input,
      )
        .extract({
          left,

          top:
            0,

          width:
            right -
            left,

          height,
        })
        /*
         * Agrandamos para mejorar texto pequeño.
         */
        .resize({
          width:
            1100,

          withoutEnlargement:
            false,
        })
        .grayscale()
        .normalize()
        .sharpen({
          sigma:
            1.1,
        })
        .png()
        .toBuffer();

    segments.push(
      segment,
    );
  }

  return {
    segments,

    count,
  };
}

/*
 * ==========================================
 * DEDUPE
 * ==========================================
 */

function dedupeCandidates(
  candidates:
    DetectedPromotionCandidate[],
) {
  const result:
    DetectedPromotionCandidate[] =
    [];

  for (
    const candidate
    of candidates
  ) {
    const normalizedName =
      normalizeForCompare(
        candidate.productName,
      );

    const duplicate =
      result.find(
        (
          current,
        ) => {
          const currentName =
            normalizeForCompare(
              current.productName,
            );

          const samePrice =
            Math.abs(
              current.promotionalPrice -
                candidate.promotionalPrice,
            ) <
              0.01;

          const similarName =
            currentName ===
              normalizedName ||
            (
              currentName.length >
                8 &&
              normalizedName.length >
                8 &&
              (
                currentName.includes(
                  normalizedName,
                ) ||
                normalizedName.includes(
                  currentName,
                )
              )
            );

          return (
            samePrice &&
            similarName
          );
        },
      );

    if (
      !duplicate
    ) {
      result.push(
        candidate,
      );

      continue;
    }

    if (
      candidate.confidence >
      duplicate.confidence
    ) {
      const duplicateIndex =
        result.indexOf(
          duplicate,
        );

      result[
        duplicateIndex
      ] =
        candidate;
    }
  }

  return result;
}

/*
 * ==========================================
 * ANALIZAR
 * ==========================================
 */

export async function analyzePromotionFlyer(
  buffer: Buffer,
): Promise<
  PromotionFlyerAnalysis
> {
  const rotated =
    await sharp(
      buffer,
    )
      .rotate()
      .png()
      .toBuffer();

  const {
    segments,
    count,
  } =
    await makeSegments(
      rotated,
    );

  const worker =
    await createWorker(
      "spa",
    );

  const texts:
    string[] =
    [];

  const candidates:
    DetectedPromotionCandidate[] =
    [];

  try {
    for (
      let index = 0;
      index <
      segments.length;
      index++
    ) {
      const {
        data,
      } =
        await worker.recognize(
          segments[
            index
          ],
        );

      const text =
        data.text ??
        "";

      texts.push(
        text,
      );

      const candidate =
        buildCandidateFromSegment(
          text,
          index,
        );

      if (
        candidate
      ) {
        candidates.push(
          candidate,
        );
      }
    }
  } finally {
    await worker.terminate();
  }

  const cleaned =
    dedupeCandidates(
      candidates,
    )
      /*
       * V3 es conservadora:
       * preferimos omitir una oferta dudosa
       * antes que inventar un precio.
       */
      .filter(
        (
          candidate,
        ) =>
          candidate.confidence >=
          55 &&
          candidate.promotionalPrice >
          0,
      );

  return {
    rawText:
      texts.join(
        "\n\n--- SEGMENT ---\n\n",
      ),

    candidates:
      cleaned,

    summary: {
      detected:
        cleaned.length,

      segments:
        count,
    },
  };
}
