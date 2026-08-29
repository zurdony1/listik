import fs from "node:fs";
import path from "node:path";

import csv from "csv-parser";

import type {
  ProfecoRow,
  NormalizedProfecoProduct,
} from "./profecoTypes";

import {
  normalizeProfecoRow,
} from "./profecoNormalizer";

interface DryRunOptions {
  filePath: string;

  /*
   * Máximo de filas válidas
   * que queremos analizar.
   */
  maxRows?: number;

  /*
   * Máximo de productos únicos
   * que queremos conservar
   * para la primera prueba.
   */
  maxProducts?: number;
}

interface DryRunResult {
  rowsRead: number;

  validRows: number;

  invalidRows: number;

  uniqueProducts: number;

  uniquePresentations: number;

  uniqueStores: number;

  categories: number;

  brands: number;

  sample:
    NormalizedProfecoProduct[];
}

/*
 * ==========================================
 * CLAVE ÚNICA DE PRODUCTO
 * ==========================================
 */

function productKey(
  item: NormalizedProfecoProduct,
) {
  return [
    item.name,
    item.brand ?? "",
  ]
    .join("::")
    .toLowerCase();
}

/*
 * ==========================================
 * CLAVE ÚNICA DE PRESENTACIÓN
 * ==========================================
 */

function presentationKey(
  item: NormalizedProfecoProduct,
) {
  return [
    productKey(item),
    item.presentationName,
  ]
    .join("::")
    .toLowerCase();
}

/*
 * ==========================================
 * DRY RUN
 * ==========================================
 */

export async function runProfecoDryRun({
  filePath,
  maxRows = 100_000,
  maxProducts = 200,
}: DryRunOptions): Promise<DryRunResult> {
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
    "================================",
  );

  console.log(
    "📦 PROFECO DRY RUN",
  );

  console.log(
    "Archivo:",
    absolutePath,
  );

  console.log(
    "Máximo filas:",
    maxRows,
  );

  console.log(
    "Máximo productos:",
    maxProducts,
  );

  console.log(
    "================================",
  );

  let rowsRead =
    0;

  let validRows =
    0;

  let invalidRows =
    0;

  const products =
    new Map<
      string,
      NormalizedProfecoProduct
    >();

  const presentations =
    new Set<string>();

  const stores =
    new Set<string>();

  const categories =
    new Set<string>();

  const brands =
    new Set<string>();

  const sample:
    NormalizedProfecoProduct[] =
    [];

  return new Promise(
    (
      resolve,
      reject,
    ) => {
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

      stream.on(
        "data",
        (
          raw:
            ProfecoRow,
        ) => {
          /*
           * Ya alcanzamos el límite.
           */
          if (
            rowsRead >=
            maxRows
          ) {
            stream.destroy();

            return;
          }

          rowsRead++;

          const normalized =
            normalizeProfecoRow(
              raw,
            );

          if (!normalized) {
            invalidRows++;

            return;
          }

          validRows++;

          const key =
            productKey(
              normalized,
            );

          /*
           * Guardar hasta N
           * productos únicos.
           */
          if (
            !products.has(
              key,
            ) &&
            products.size <
              maxProducts
          ) {
            products.set(
              key,
              normalized,
            );
          }

          presentations.add(
            presentationKey(
              normalized,
            ),
          );

          stores.add(
            normalized.storeName
              .trim()
              .toLowerCase(),
          );

          if (
            normalized.category
          ) {
            categories.add(
              normalized.category
                .trim()
                .toLowerCase(),
            );
          }

          if (
            normalized.brand
          ) {
            brands.add(
              normalized.brand
                .trim()
                .toLowerCase(),
            );
          }

          /*
           * Muestra visual.
           */
          if (
            sample.length <
            10
          ) {
            sample.push(
              normalized,
            );
          }
        },
      );

      stream.on(
        "error",
        (
          error,
        ) => {
          reject(error);
        },
      );

      stream.on(
        "close",
        () => {
          const result:
            DryRunResult = {
              rowsRead,

              validRows,

              invalidRows,

              uniqueProducts:
                products.size,

              uniquePresentations:
                presentations.size,

              uniqueStores:
                stores.size,

              categories:
                categories.size,

              brands:
                brands.size,

              sample,
            };

          console.log("");
          console.log(
            "================================",
          );

          console.log(
            "✅ PROFECO DRY RUN TERMINADO",
          );

          console.log(
            "================================",
          );

          console.log(
            "Filas leídas:",
            result.rowsRead,
          );

          console.log(
            "Filas válidas:",
            result.validRows,
          );

          console.log(
            "Filas inválidas:",
            result.invalidRows,
          );

          console.log(
            "Productos únicos:",
            result.uniqueProducts,
          );

          console.log(
            "Presentaciones:",
            result.uniquePresentations,
          );

          console.log(
            "Tiendas:",
            result.uniqueStores,
          );

          console.log(
            "Categorías:",
            result.categories,
          );

          console.log(
            "Marcas:",
            result.brands,
          );

          console.log("");
          console.log(
            "🧪 MUESTRA:",
          );

          result.sample.forEach(
            (
              item,
              index,
            ) => {
              console.log(
                `${index + 1}.`,
                {
                  producto:
                    item.name,

                  marca:
                    item.brand,

                  presentacion:
                    item.presentationName,

                  precio:
                    item.price,

                  tienda:
                    item.storeName,

                  sucursal:
                    item.storeBranch,

                  fecha:
                    item.observedAt,
                },
              );
            },
          );

          console.log("");
          console.log(
            "🛡️ SUPABASE MODIFICADO: NO",
          );

          resolve(
            result,
          );
        },
      );
    },
  );
}