import fs from "node:fs";
import path from "node:path";

import csv from "csv-parser";

import type {
  ProfecoRow,
} from "./profecoTypes";

import {
  normalizeProfecoRow,
} from "./profecoNormalizer";

import {
  matchProfecoCatalog,
} from "./profecoCatalogMatcher";

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

const MAX_ITEMS = 25;

/*
 * ==========================================
 * MAIN
 * ==========================================
 */

async function main() {
  const filePath =
    process.argv[2];

  if (!filePath) {
    throw new Error(
      "Debes indicar la ruta del CSV de PROFECO.",
    );
  }

  const absolutePath =
    path.resolve(filePath);

  if (
    !fs.existsSync(
      absolutePath,
    )
  ) {
    throw new Error(
      `No existe el archivo: ${absolutePath}`,
    );
  }

  console.log("");
  console.log(
    "========================================",
  );

  console.log(
    "🧠 PROFECO → LISTIK MATCH DRY RUN",
  );

  console.log(
    "========================================",
  );

  console.log(
    "Archivo:",
    absolutePath,
  );

  console.log(
    "Productos a probar:",
    MAX_ITEMS,
  );

  console.log("");

  /*
   * Contadores
   */

  let processed =
    0;

  let invalidRows =
    0;

  let exactMatches =
    0;

  let nameMatches =
    0;

  let notFound =
    0;

  /*
   * Evitar probar varias veces
   * exactamente el mismo
   * producto/presentación.
   */
  const tested =
    new Set<string>();

  /*
   * Crear stream del CSV.
   */

  const stream =
    fs
      .createReadStream(
        absolutePath,
      )
      .pipe(
        csv({
          mapHeaders: ({
            header,
          }) =>
            header
              .trim()
              .toLowerCase(),
        }),
      );

  /*
   * ==========================================
   * LEER FILA POR FILA
   * ==========================================
   */

  for await (
    const rawRow
    of stream
  ) {
    const row =
      rawRow as ProfecoRow;

    const normalized =
      normalizeProfecoRow(
        row,
      );

    if (!normalized) {
      invalidRows++;

      continue;
    }

    /*
     * Clave para evitar repetidos.
     */

    const uniqueKey =
      [
        normalized.name,
        normalized.brand ??
          "",
        normalized.presentationName,
      ]
        .join("::")
        .toLowerCase();

    if (
      tested.has(
        uniqueKey,
      )
    ) {
      continue;
    }

    tested.add(
      uniqueKey,
    );

    /*
     * Consultar catálogo Listik.
     */

    const match =
      await matchProfecoCatalog(
        normalized,
      );

    processed++;

    /*
     * Contadores.
     */

    if (
      match.type ===
      "exact"
    ) {
      exactMatches++;
    }

    if (
      match.type ===
      "name"
    ) {
      nameMatches++;
    }

    if (
      match.type ===
      "not-found"
    ) {
      notFound++;
    }

    /*
     * ======================================
     * MOSTRAR RESULTADO
     * ======================================
     */

    console.log(
      `#${processed}`,
    );

    console.log({
      profeco: {
        producto:
          normalized.name,

        marca:
          normalized.brand,

        presentacion:
          normalized.presentationName,

        precio:
          normalized.price,

        tienda:
          normalized.storeName,
      },

      listik: {
        tipo:
          match.type,

        confianza:
          match.confidence,

        producto:
          match.product
            ?.name ??
          null,

        presentacion:
          match.presentation
            ?.presentation_name ??
          null,
      },
    });

    console.log(
      "----------------------------------------",
    );

    /*
     * Terminamos después
     * de N productos.
     */

    if (
      processed >=
      MAX_ITEMS
    ) {
      break;
    }
  }

  /*
   * ==========================================
   * RESUMEN
   * ==========================================
   */

  console.log("");
  console.log(
    "========================================",
  );

  console.log(
    "📊 RESULTADO DEL MATCHER",
  );

  console.log(
    "========================================",
  );

  console.log(
    "Productos probados:",
    processed,
  );

  console.log(
    "✅ Coincidencia exacta:",
    exactMatches,
  );

  console.log(
    "🟡 Coincidencia por nombre:",
    nameMatches,
  );

  console.log(
    "🆕 No existen en Listik:",
    notFound,
  );

  console.log(
    "Filas inválidas ignoradas:",
    invalidRows,
  );

  console.log("");

  console.log(
    "🛡️ SUPABASE MODIFICADO: NO",
  );

  console.log(
    "Solo se realizaron consultas.",
  );

  console.log("");
}

/*
 * ==========================================
 * EJECUTAR
 * ==========================================
 */

main().catch(
  (error) => {
    console.error("");
    console.error(
      "❌ PROFECO MATCH ERROR",
    );

    console.error(
      error,
    );

    process.exit(1);
  },
);