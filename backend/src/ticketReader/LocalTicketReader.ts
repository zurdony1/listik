import sharp from "sharp";

import {
  createWorker,
} from "tesseract.js";

import type {
  TicketReader,
  TicketReaderItem,
  TicketReaderResult,
} from "./TicketReader";

import {
  cleanOcrProducts,
} from "./OcrProductCleaner";

/*
 * ==========================================
 * LIMPIEZA GENERAL
 * ==========================================
 */

function cleanLine(
  value: string,
) {
  return value
    .replace(/[\\<>_=—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatching(
  value: string,
) {
  return cleanLine(value)
    .toUpperCase()
    .replace(
      /[^A-ZÁÉÍÓÚÑ0-9.$,/:\-\s!]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ==========================================
 * DINERO
 * ==========================================
 */

function parseMoney(
  value: string,
): number {
  const match =
    value.match(
      /-?\d[\d,.]*/,
    );

  if (!match) {
    return 0;
  }

  const text =
    match[0]
      .replace(/,/g, "")
      .trim();

  const number =
    Number(text);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return number;
}

function normalizeTicketMoney(
  value: string,
) {
  let text =
    value
      .replace(/\s/g, "")
      .replace(
        /[^\d,.:]/g,
        "",
      );

  /*
   * OCR puede leer:
   *
   * 2,044:01
   *
   * en lugar de:
   *
   * 2,044.01
   */
  text =
    text.replace(
      /:/g,
      ".",
    );

  /*
   * Caso correcto:
   *
   * 2,044.01
   */
  if (
    /^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(
      text,
    )
  ) {
    return Number(
      text.replace(
        /,/g,
        "",
      ),
    );
  }

  /*
   * OCR:
   *
   * 2,04401
   *
   * Debe ser:
   *
   * 2044.01
   */
  if (
    /^\d{1,3},\d{5}$/.test(
      text,
    )
  ) {
    const digits =
      text.replace(
        ",",
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
   * 2044.01
   */
  if (
    /^\d+\.\d{2}$/.test(
      text,
    )
  ) {
    return Number(text);
  }

  /*
   * Ejemplo:
   *
   * 204401
   *
   * Si OCR perdió el punto:
   *
   * 2044.01
   */
  if (
    /^\d{5,}$/.test(
      text,
    )
  ) {
    return Number(
      `${text.slice(
        0,
        -2,
      )}.${text.slice(
        -2,
      )}`,
    );
  }

  const number =
    Number(
      text.replace(
        /,/g,
        "",
      ),
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

/*
 * ==========================================
 * LÍNEAS QUE NO SON PRODUCTOS
 * ==========================================
 */

function isIgnoredLine(
  line: string,
) {
  const text =
    normalizeForMatching(
      line,
    );

  const ignored = [
    "RFC",
    "SOCIO",
    "REGIMEN",
    "COMPROBANTE",
    "EFECTOS FISCALES",

    "TDA",
    "OP",
    "TE",
    "TR",

    "CUPONERA",
    "CUPON",

    "AJUSTE",
    "DESCUENTO",

    "SUBTOTAL",
    "TOTAL",

    "BANCOMER",
    "CAMBIO",

    "TARJETA",
    "CUENTA",
    "IMPORTE",
    "AUTORIZACION",
    "AFILIACION",
    "ARQC",
    "NROC",

    "MASTERCARD",
    "VISA",

    "DOS MIL",
    "PESOS",

    "PERSONAS MORALES",
    "FISCAL",
  ];

  return ignored.some(
    (word) =>
      text.includes(
        word,
      ),
  );
}

/*
 * ==========================================
 * DETECTAR TIENDA
 * ==========================================
 */

function detectStore(
  text: string,
) {
  const upper =
    normalizeForMatching(
      text,
    );

  if (
    upper.includes(
      "SAM CLUB",
    ) ||
    upper.includes(
      "SAMS CLUB",
    ) ||
    upper.includes(
      "SAM S CLUB",
    )
  ) {
    return "Sam's Club";
  }

  if (
    upper.includes(
      "WALMART",
    )
  ) {
    return "Walmart";
  }

  if (
    upper.includes(
      "CHEDRAUI",
    )
  ) {
    return "Chedraui";
  }

  if (
    upper.includes(
      "SORIANA",
    )
  ) {
    return "Soriana";
  }

  return "Tienda desconocida";
}

/*
 * ==========================================
 * DETECTAR SUCURSAL
 * ==========================================
 */

function detectBranch(
  lines: string[],
) {
  const joined =
    lines
      .map(
        normalizeForMatching,
      )
      .join(" ");

  /*
   * Casos OCR reales:
   *
   * CAUCEL
   * CAUCE!
   * AUCEL
   * CAUCE AO
   */
  if (
    /\bCAUCE[L1I!]\b/.test(
      joined,
    ) ||
    /\bAUCEL\b/.test(
      joined,
    ) ||
    /\bSAMS?\s+CAUCE/.test(
      joined,
    )
  ) {
    return "Caucel";
  }

  for (
    const originalLine
    of lines
  ) {
    const line =
      normalizeForMatching(
        originalLine,
      );

    const match =
      line.match(
        /[UO]NIDAD\s+SAMS?\s+([A-ZÁÉÍÓÚÑ0-9]+)/,
      );

    if (
      match?.[1]
    ) {
      const detected =
        cleanLine(
          match[1],
        );

      if (
        detected.startsWith(
          "CAUCE",
        ) ||
        detected ===
          "AUCEL"
      ) {
        return "Caucel";
      }

      return detected;
    }
  }

  return undefined;
}

/*
 * ==========================================
 * DETECTAR TOTAL
 * ==========================================
 */

function detectTotal(
  lines: string[],
) {
  /*
   * Primero intentamos TOTAL.
   */
  for (
    let index =
      lines.length - 1;
    index >= 0;
    index--
  ) {
    const line =
      normalizeForMatching(
        lines[index] ??
          "",
      );

    if (
      !/\bTOTAL\b/.test(
        line,
      ) ||
      line.includes(
        "SUBTOTAL",
      )
    ) {
      continue;
    }

    const matches =
      line.match(
        /\d[\d,.:]*/g,
      );

    if (
      !matches?.length
    ) {
      continue;
    }

    const value =
      normalizeTicketMoney(
        matches[
          matches.length - 1
        ] ??
          "",
      );

    if (
      value >
      0
    ) {
      return value;
    }
  }

  /*
   * Fallback:
   *
   * BANCOMER $2,044.01
   *
   * IMPORTE $2,044.01
   */
  for (
    const originalLine
    of lines
  ) {
    const line =
      normalizeForMatching(
        originalLine,
      );

    if (
      !line.includes(
        "BANCOMER",
      ) &&
      !line.includes(
        "IMPORTE",
      )
    ) {
      continue;
    }

    const matches =
      line.match(
        /\d[\d,.:]*/g,
      );

    if (
      !matches?.length
    ) {
      continue;
    }

    const value =
      normalizeTicketMoney(
        matches[
          matches.length - 1
        ] ??
          "",
      );

    if (
      value >
      0
    ) {
      return value;
    }
  }

  return 0;
}

/*
 * ==========================================
 * DETECTAR FECHA
 * ==========================================
 */

function detectDate(
  text: string,
) {
  const normalDate =
    text.match(
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
    );

  if (
    normalDate
  ) {
    const day =
      normalDate[1];

    const month =
      normalDate[2];

    const year =
      normalDate[3];

    if (
      day &&
      month &&
      year
    ) {
      return `${year}-${month.padStart(
        2,
        "0",
      )}-${day.padStart(
        2,
        "0",
      )}`;
    }
  }

  return undefined;
}

/*
 * ==========================================
 * DETECTAR INICIO DE PRODUCTOS
 * ==========================================
 */

function findProductSectionStart(
  lines: string[],
) {
  /*
   * Buscamos:
   *
   * código + nombre + $
   */
  for (
    let index = 0;
    index <
    lines.length;
    index++
  ) {
    const line =
      normalizeForMatching(
        lines[index] ??
          "",
      );

    const hasCode =
      /\b\d{6,12}\b/.test(
        line,
      );

    const hasLetters =
      /[A-ZÁÉÍÓÚÑ]{2,}/.test(
        line,
      );

    const hasMoney =
      /\$/.test(
        line,
      );

    if (
      hasCode &&
      hasLetters &&
      hasMoney &&
      !isIgnoredLine(
        line,
      )
    ) {
      return index;
    }
  }

  /*
   * Fallback:
   *
   * código largo + nombre.
   */
  for (
    let index = 0;
    index <
    lines.length;
    index++
  ) {
    const line =
      normalizeForMatching(
        lines[index] ??
          "",
      );

    if (
      /\b\d{8,12}\b/.test(
        line,
      ) &&
      /[A-Z]{2,}/.test(
        line,
      ) &&
      !isIgnoredLine(
        line,
      )
    ) {
      return index;
    }
  }

  return 0;
}

/*
 * ==========================================
 * DETECTAR FINAL DE PRODUCTOS
 * ==========================================
 */

function findProductSectionEnd(
  lines: string[],
) {
  const paymentWords = [
    "AJUSTE AL CLIENTE",
    "DESCUENTO PAGO",
    "TOTAL",
    "BANCOMER",
    "TARJETA",
  ];

  for (
    let index = 0;
    index <
    lines.length;
    index++
  ) {
    const line =
      normalizeForMatching(
        lines[index] ??
          "",
      );

    if (
      paymentWords.some(
        (word) =>
          line.includes(
            word,
          ),
      )
    ) {
      return index;
    }
  }

  return lines.length;
}

/*
 * ==========================================
 * VALIDAR CÓDIGO
 * ==========================================
 */

function isValidProductCode(
  code: string | undefined,
) {
  if (!code) {
    return false;
  }

  /*
   * Entre 6 y 12 dígitos.
   *
   * Así evitamos cosas como
   * CP 02770.
   */
  return /^\d{6,12}$/.test(
    code,
  );
}

/*
 * ==========================================
 * QUITAR PREFIJOS OCR
 * ==========================================
 */

function removeOcrPrefix(
  value: string,
) {
  return value
    .replace(
      /^(E|ER|BE|EA|PA|AE|PEE|P|A|O)\s+/,
      "",
    )
    .trim();
}

/*
 * ==========================================
 * EXTRAER CÓDIGO + NOMBRE
 * ==========================================
 */

function extractCodeAndName(
  line: string,
) {
  const cleaned =
    normalizeForMatching(
      line,
    );

  const withoutPrefix =
    removeOcrPrefix(
      cleaned,
    );

  /*
   * Código de tienda.
   */
  const codeMatch =
    withoutPrefix.match(
      /\b(\d{6,12})\b/,
    );

  if (
    !codeMatch
  ) {
    return {
      rawCode:
        undefined,

      rawName:
        withoutPrefix,
    };
  }

  const rawCode =
    codeMatch[1];

  const codeIndex =
    withoutPrefix.indexOf(
      rawCode,
    );

  let afterCode =
    withoutPrefix.slice(
      codeIndex +
        rawCode.length,
    );

  /*
   * Quitar importe final.
   */
  afterCode =
    afterCode.replace(
      /\$?\s*-?\d[\d,.]*[A-Z]?\s*$/,
      "",
    );

  /*
   * Quitar símbolos finales.
   */
  afterCode =
    afterCode.replace(
      /[:$]+$/g,
      "",
    );

  /*
   * Ruido OCR común.
   */
  afterCode =
    afterCode.replace(
      /\s+(E|ER|BE|EA|SI|TT)$/i,
      "",
    );

  return {
    rawCode,

    rawName:
      cleanLine(
        afterCode,
      ),
  };
}

/*
 * ==========================================
 * PRECIO FINAL
 * ==========================================
 */

function getLastMoneyValue(
  line: string,
) {
  const normalized =
    normalizeForMatching(
      line,
    );

  /*
   * Exigimos $.
   *
   * Así nunca usamos el código
   * como precio.
   */
  const dollarIndex =
    normalized.lastIndexOf(
      "$",
    );

  if (
    dollarIndex ===
    -1
  ) {
    return 0;
  }

  const afterDollar =
    normalized.slice(
      dollarIndex + 1,
    );

  const match =
    afterDollar.match(
      /-?\d[\d,.]*/,
    );

  if (!match) {
    return 0;
  }

  return parseMoney(
    match[0],
  );
}

/*
 * ==========================================
 * CANTIDAD X PRECIO
 * ==========================================
 */

function parseQuantityLine(
  line: string,
) {
  const normalized =
    normalizeForMatching(
      line,
    );

  /*
   * Ejemplos:
   *
   * 2 X $96.16 $192.32
   *
   * 2 X $152.43 $304.
   */
  const match =
    normalized.match(
      /(\d+(?:\.\d+)?)\s*X\s*\$?\s*([\d,.]+).*?\$?\s*([\d,.]+)/,
    );

  if (!match) {
    return null;
  }

  const quantity =
    Number(
      match[1],
    );

  const unitPrice =
    parseMoney(
      match[2] ??
        "",
    );

  let totalPrice =
    parseMoney(
      match[3] ??
        "",
    );

  const calculatedTotal =
    quantity *
    unitPrice;

  /*
   * Si OCR dañó el subtotal,
   * lo reconstruimos.
   */
  if (
    totalPrice <= 0 ||
    Math.abs(
      totalPrice -
        calculatedTotal,
    ) >
      Math.max(
        1,
        calculatedTotal *
          0.15,
      )
  ) {
    totalPrice =
      calculatedTotal;
  }

  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 0 ||
    unitPrice <= 0
  ) {
    return null;
  }

  return {
    quantity,

    unitPrice,

    totalPrice:
      Number(
        totalPrice.toFixed(
          2,
        ),
      ),
  };
}

/*
 * ==========================================
 * PRODUCTOS POR PESO
 * ==========================================
 */

function parseWeightLine(
  line: string,
) {
  const normalized =
    normalizeForMatching(
      line,
    );

  /*
   * Ejemplos:
   *
   * 0.924 KGS A 94.12/KG $86.96
   *
   * OCR puede leer:
   *
   * KGS
   * K6S
   * KES
   */
  const quantityMatch =
    normalized.match(
      /(\d+[.,]\d{3})\s+(?:KGS|KG|K6S|KES|GS|65)/,
    );

  if (
    !quantityMatch?.[1]
  ) {
    return null;
  }

  const quantity =
    Number(
      quantityMatch[1].replace(
        ",",
        ".",
      ),
    );

  /*
   * Precio por kilo.
   */
  const unitMatch =
    normalized.match(
      /\sA\s+\$?\s*(\d+(?:[.,]\d+)?)/,
    );

  /*
   * Precio total.
   */
  const dollarParts =
    normalized.split(
      "$",
    );

  let totalPrice =
    0;

  if (
    dollarParts.length >
    1
  ) {
    totalPrice =
      parseMoney(
        dollarParts[
          dollarParts.length -
            1
        ] ??
          "",
      );
  }

  let unitPrice =
    unitMatch?.[1]
      ? Number(
          unitMatch[1].replace(
            ",",
            ".",
          ),
        )
      : 0;

  /*
   * Si el precio/kg quedó mal
   * pero tenemos peso y total,
   * lo reconstruimos.
   */
  if (
    (
      unitPrice <= 0 ||
      unitPrice >
        10000
    ) &&
    quantity >
      0 &&
    totalPrice >
      0
  ) {
    unitPrice =
      totalPrice /
      quantity;
  }

  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 0 ||
    !Number.isFinite(
      unitPrice,
    ) ||
    unitPrice <= 0 ||
    totalPrice <= 0
  ) {
    return null;
  }

  return {
    quantity:
      Number(
        quantity.toFixed(
          3,
        ),
      ),

    unitPrice:
      Number(
        unitPrice.toFixed(
          2,
        ),
      ),

    totalPrice:
      Number(
        totalPrice.toFixed(
          2,
        ),
      ),
  };
}

/*
 * ==========================================
 * ¿PARECE PRODUCTO?
 * ==========================================
 */

function looksLikeProductLine(
  line: string,
) {
  const normalized =
    normalizeForMatching(
      line,
    );

  if (
    !normalized ||
    isIgnoredLine(
      normalized,
    )
  ) {
    return false;
  }

  /*
   * Debe tener alguna letra.
   */
  if (
    !/[A-ZÁÉÍÓÚÑ]/.test(
      normalized,
    )
  ) {
    return false;
  }

  /*
   * Encabezados frecuentes.
   */
  const headerWords = [
    "NUEVA WAL",
    "WAL MARI DE MEXICO",
    "MEXICO S DE RL",
    "STA CRUZ",
    "ACAYUCAN",
    "AZCAPOTZALCO",
    "CDMX",
    "COLONIA",
    "MERIDA CELESTUM",
    "YUCATAN",
    "PERSONAS MORALES",
    "UNIDAD SAMS",
    "CAUCEL REGIM",
    "FISCAL 601",
  ];

  if (
    headerWords.some(
      (word) =>
        normalized.includes(
          word,
        ),
    )
  ) {
    return false;
  }

  return true;
}

/*
 * ==========================================
 * LIMPIAR NOMBRE EXTRAÍDO
 * ==========================================
 */

function removePriceFromName(
  value: string,
) {
  let text =
    normalizeForMatching(
      value,
    );

  /*
   * Quitar prefijos OCR.
   */
  text =
    removeOcrPrefix(
      text,
    );

  /*
   * Quitar código inicial.
   */
  text =
    text.replace(
      /^\d{6,12}\s+/,
      "",
    );

  /*
   * Quitar precio.
   */
  text =
    text.replace(
      /\s+\$.*$/,
      "",
    );

  return cleanLine(
    text,
  );
}

/*
 * ==========================================
 * PARSER DE PRODUCTOS
 * ==========================================
 */

function parseProducts(
  lines: string[],
) {
  const items:
    TicketReaderItem[] =
    [];

  const sectionStart =
    findProductSectionStart(
      lines,
    );

  const sectionEnd =
    findProductSectionEnd(
      lines,
    );

  console.log("");
  console.log(
    "🛒 PRODUCT SECTION:",
    {
      start:
        sectionStart,

      end:
        sectionEnd,
    },
  );

  for (
    let index =
      sectionStart;
    index <
    sectionEnd;
    index++
  ) {
    const originalLine =
      lines[index];

    if (
      !originalLine
    ) {
      continue;
    }

    const line =
      cleanLine(
        originalLine,
      );

    if (
      !looksLikeProductLine(
        line,
      )
    ) {
      continue;
    }

    const {
      rawCode,
      rawName:
        extractedName,
    } =
      extractCodeAndName(
        line,
      );

    let rawName =
      extractedName;

    /*
     * Segunda estrategia
     * de limpieza.
     */
    if (
      rawCode
    ) {
      const alternative =
        removePriceFromName(
          line,
        );

      if (
        alternative.length >
          0 &&
        (
          !rawName ||
          alternative.length <
            rawName.length +
              20
        )
      ) {
        rawName =
          alternative;
      }
    }

    if (
      !rawName ||
      rawName.length <
        2
    ) {
      continue;
    }

    const nextLine =
      lines[
        index +
          1
      ];

    /*
     * ==================================
     * CASO A:
     * 2 X $PRECIO $TOTAL
     * ==================================
     */

    if (
      nextLine
    ) {
      const quantityInfo =
        parseQuantityLine(
          nextLine,
        );

      if (
        quantityInfo
      ) {
        items.push({
          rawCode:
            isValidProductCode(
              rawCode,
            )
              ? rawCode
              : undefined,

          rawName,

          quantity:
            quantityInfo.quantity,

          unitPrice:
            quantityInfo.unitPrice,

          totalPrice:
            quantityInfo.totalPrice,
        });

        index++;

        continue;
      }
    }

    /*
     * ==================================
     * CASO B:
     * PRODUCTO POR PESO
     * ==================================
     */

    if (
      nextLine
    ) {
      const weight =
        parseWeightLine(
          nextLine,
        );

      if (
        weight
      ) {
        items.push({
          rawCode:
            isValidProductCode(
              rawCode,
            )
              ? rawCode
              : undefined,

          rawName,

          quantity:
            weight.quantity,

          unitPrice:
            weight.unitPrice,

          totalPrice:
            weight.totalPrice,
        });

        index++;

        continue;
      }
    }

    /*
     * ==================================
     * CASO C:
     * PRODUCTO NORMAL
     * ==================================
     */

    const totalPrice =
      getLastMoneyValue(
        line,
      );

    if (
      isValidProductCode(
        rawCode,
      ) &&
      totalPrice >
        0 &&
      totalPrice <
        100000
    ) {
      items.push({
        rawCode,

        rawName,

        quantity: 1,

        unitPrice:
          totalPrice,

        totalPrice,
      });

      continue;
    }

    /*
     * ==================================
     * CASO D:
     * PRODUCTO CON CÓDIGO
     * PERO PRECIO DAÑADO
     * ==================================
     *
     * No lo eliminamos.
     *
     * Brain Queue podrá revisarlo.
     */

    if (
      isValidProductCode(
        rawCode,
      ) &&
      rawName.length >=
        3
    ) {
      items.push({
        rawCode,

        rawName,

        quantity: 1,

        unitPrice: 0,

        totalPrice: 0,
      });
    }
  }

  /*
   * ==========================================
   * DEDUPLICAR
   * ==========================================
   */

  const unique =
    new Map<
      string,
      TicketReaderItem
    >();

  for (
    const item
    of items
  ) {
    const key =
      `${item.rawCode ?? ""}::${normalizeForMatching(
        item.rawName,
      )}`;

    const existing =
      unique.get(
        key,
      );

    if (
      !existing
    ) {
      unique.set(
        key,
        item,
      );

      continue;
    }

    /*
     * Preferir la versión que tenga
     * precio y subtotal.
     */
    const existingScore =
      (
        existing.totalPrice >
        0
          ? 2
          : 0
      ) +
      (
        existing.unitPrice >
        0
          ? 1
          : 0
      );

    const newScore =
      (
        item.totalPrice >
        0
          ? 2
          : 0
      ) +
      (
        item.unitPrice >
        0
          ? 1
          : 0
      );

    if (
      newScore >
      existingScore
    ) {
      unique.set(
        key,
        item,
      );
    }
  }

  return Array.from(
    unique.values(),
  );
}

/*
 * ==========================================
 * LOCAL TICKET READER
 * ==========================================
 */

export class LocalTicketReader
implements TicketReader {
  async analyze(
    image: Buffer,
    _mimeType: string,
  ): Promise<TicketReaderResult> {
    console.log("");
    console.log(
      "================================",
    );

    console.log(
      "📷 LOCAL TICKET READER",
    );

    console.log(
      "Preparando imagen...",
    );

    /*
     * ==========================================
     * PREPROCESAMIENTO CON SHARP
     * ==========================================
     */

    const metadata =
      await sharp(
        image,
      ).metadata();

    const width =
      metadata.width ??
      1000;

    const targetWidth =
      Math.min(
        Math.max(
          width * 2,
          1800,
        ),
        3000,
      );

    const processedImage =
      await sharp(
        image,
      )
        .rotate()
        .resize({
          width:
            targetWidth,
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();

    /*
     * ==========================================
     * TESSERACT
     * ==========================================
     */

    console.log(
      "🔍 Iniciando OCR local...",
    );

    let lastProgress =
      -1;

    const worker =
      await createWorker(
        "spa",
        1,
        {
          logger:
            (
              message,
            ) => {
              if (
                message.status !==
                "recognizing text"
              ) {
                return;
              }

              const progress =
                Math.round(
                  message.progress *
                    100,
                );

              if (
                progress ===
                lastProgress
              ) {
                return;
              }

              lastProgress =
                progress;

              console.log(
                `🔎 OCR ${progress}%`,
              );
            },
        },
      );

    try {
      /*
       * ==========================================
       * OCR
       * ==========================================
       */

      const result =
        await worker.recognize(
          processedImage,
        );

      const rawText =
        result.data.text ??
        "";

      console.log("");
      console.log(
        "===== OCR RAW TEXT =====",
      );

      console.log(
        rawText,
      );

      console.log(
        "===== END OCR =====",
      );

      /*
       * ==========================================
       * LÍNEAS
       * ==========================================
       */

      const lines =
        rawText
          .split(
            /\r?\n/,
          )
          .map(
            cleanLine,
          )
          .filter(
            Boolean,
          );

      console.log("");
      console.log(
        "===== CLEAN LINES =====",
      );

      lines.forEach(
        (
          line,
          index,
        ) => {
          console.log(
            `${index}: ${line}`,
          );
        },
      );

      console.log(
        "===== END CLEAN LINES =====",
      );

      /*
       * ==========================================
       * INFORMACIÓN GENERAL
       * ==========================================
       */

      const store =
        detectStore(
          rawText,
        );

      const branch =
        detectBranch(
          lines,
        );

      const purchaseDate =
        detectDate(
          rawText,
        );

      const total =
        detectTotal(
          lines,
        );

      /*
       * ==========================================
       * PARSER
       * ==========================================
       */

      const parsedItems =
        parseProducts(
          lines,
        );

      console.log("");
      console.log(
        "📦 PRODUCTOS ANTES DEL OCR CLEANER:",
      );

      parsedItems.forEach(
        (
          item,
          index,
        ) => {
          console.log(
            `${index + 1}.`,
            {
              rawCode:
                item.rawCode,

              rawName:
                item.rawName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              totalPrice:
                item.totalPrice,
            },
          );
        },
      );

      /*
       * ==========================================
       * OCR PRODUCT CLEANER
       * ==========================================
       *
       * Esta capa limpia nombres antes
       * de enviarlos al Brain.
       *
       * Ejemplo:
       *
       * LIPTON T MI AAECA SI
       * ↓
       * LIPTON T MI
       */

      const items =
        cleanOcrProducts(
          parsedItems,
        );

      console.log("");
      console.log(
        "🧹 PRODUCTOS DESPUÉS DEL OCR CLEANER:",
      );

      items.forEach(
        (
          item,
          index,
        ) => {
          console.log(
            `${index + 1}.`,
            {
              rawCode:
                item.rawCode,

              rawName:
                item.rawName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              totalPrice:
                item.totalPrice,
            },
          );
        },
      );

      /*
       * ==========================================
       * RESULTADO
       * ==========================================
       */

      console.log("");
      console.log(
        "🧾 RESULTADO LOCAL:",
      );

      console.log({
        store,

        branch,

        purchaseDate,

        total,

        detectedItems:
          items.length,
      });

      console.log("");
      console.log(
        "📦 PRODUCTOS DETECTADOS:",
      );

      items.forEach(
        (
          item,
          index,
        ) => {
          console.log(
            `${index + 1}.`,
            item,
          );
        },
      );

      /*
       * ==========================================
       * RESPUESTA
       * ==========================================
       */

      return {
        store,

        branch,

        purchaseDate,

        total,

        items,

        rawText,
      };
    } finally {
      /*
       * Siempre cerrar
       * Tesseract Worker.
       */
      await worker.terminate();
    }
  }
}

export const localTicketReader =
  new LocalTicketReader();