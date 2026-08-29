import fs from "node:fs";
import path from "node:path";

import csv from "csv-parser";

import { supabase } from "../../lib/supabase";

import type {
  NormalizedProfecoProduct,
  ProfecoRow,
} from "./profecoTypes";

import {
  normalizeProfecoRow,
} from "./profecoNormalizer";

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

export interface ProfecoImportOptions {
  filePath: string;

  /*
   * Máximo de productos nuevos/seleccionados
   * que aceptaremos durante esta importación.
   */
  maxProducts?: number;

  /*
   * Máximo de filas del CSV a revisar.
   */
  maxRows?: number;

  /*
   * Máximo de observaciones de precio
   * que insertaremos.
   */
  maxPrices?: number;
}

export interface ProfecoImportResult {
  rowsRead: number;

  validRows: number;

  invalidRows: number;

  productsCreated: number;

  productsReused: number;

  presentationsCreated: number;

  presentationsReused: number;

  storesCreated: number;

  storesReused: number;

  pricesCreated: number;

  pricesSkipped: number;

  selectedProducts: number;
}

/*
 * ==========================================
 * TIPOS INTERNOS
 * ==========================================
 */

interface ProductRecord {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
}

interface PresentationRecord {
  id: string;
  product_id: string;
  presentation_name: string;
}

interface StoreRecord {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

/*
 * ==========================================
 * NORMALIZACIÓN PARA CLAVES
 * ==========================================
 */

function normalizeKey(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizeBrand(
  value: string | null,
) {
  const normalized =
    normalizeKey(value);

  const withoutBrand =
    new Set([
      "",
      "s m",
      "sin marca",
      "no aplica",
      "n a",
    ]);

  if (
    withoutBrand.has(
      normalized,
    )
  ) {
    return "";
  }

  return normalized;
}

/*
 * ==========================================
 * CLAVES
 * ==========================================
 */

function productKey(
  item: NormalizedProfecoProduct,
) {
  return [
    normalizeKey(
      item.name,
    ),

    normalizeBrand(
      item.brand,
    ),
  ].join("::");
}

function productRecordKey(
  product: ProductRecord,
) {
  return [
    normalizeKey(
      product.name,
    ),

    normalizeBrand(
      product.brand,
    ),
  ].join("::");
}

function presentationKey(
  productId: string,
  presentationName: string,
) {
  return [
    productId,
    normalizeKey(
      presentationName,
    ),
  ].join("::");
}

function storeKey(
  name: string,
  city: string | null,
  state: string | null,
) {
  return [
    normalizeKey(name),
    normalizeKey(city),
    normalizeKey(state),
  ].join("::");
}

function priceKey(input: {
  productId: string;
  presentationId: string;
  storeId: string;
  price: number;
  observedAt: string;
  storeBranch: string | null;
}) {
  return [
    input.productId,
    input.presentationId,
    input.storeId,
    input.price.toFixed(2),
    input.observedAt,
    normalizeKey(
      input.storeBranch,
    ),
    "profeco",
  ].join("::");
}

/*
 * ==========================================
 * CARGAR CATÁLOGO ACTUAL
 * ==========================================
 */

async function loadProducts() {
  const {
    data,
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
      `No se pudieron cargar productos: ${error.message}`,
    );
  }

  const map =
    new Map<
      string,
      ProductRecord
    >();

  for (
    const row
    of data ?? []
  ) {
    const product: ProductRecord = {
      id:
        String(
          row.id,
        ),

      name:
        String(
          row.name,
        ),

      brand:
        row.brand ??
        null,

      category:
        row.category ??
        null,
    };

    map.set(
      productRecordKey(
        product,
      ),
      product,
    );
  }

  return map;
}

async function loadPresentations() {
  const {
    data,
    error,
  } = await supabase
    .from(
      "product_presentations",
    )
    .select(`
      id,
      product_id,
      presentation_name
    `);

  if (error) {
    throw new Error(
      `No se pudieron cargar presentaciones: ${error.message}`,
    );
  }

  const map =
    new Map<
      string,
      PresentationRecord
    >();

  for (
    const row
    of data ?? []
  ) {
    const presentation:
      PresentationRecord = {
        id:
          String(
            row.id,
          ),

        product_id:
          String(
            row.product_id,
          ),

        presentation_name:
          String(
            row.presentation_name,
          ),
      };

    map.set(
      presentationKey(
        presentation.product_id,
        presentation.presentation_name,
      ),
      presentation,
    );
  }

  return map;
}

async function loadStores() {
  const {
    data,
    error,
  } = await supabase
    .from("stores")
    .select(`
      id,
      name,
      city,
      state
    `);

  if (error) {
    throw new Error(
      `No se pudieron cargar tiendas: ${error.message}`,
    );
  }

  const map =
    new Map<
      string,
      StoreRecord
    >();

  for (
    const row
    of data ?? []
  ) {
    const store:
      StoreRecord = {
        id:
          String(
            row.id,
          ),

        name:
          String(
            row.name,
          ),

        city:
          row.city ??
          null,

        state:
          row.state ??
          null,
      };

    map.set(
      storeKey(
        store.name,
        store.city,
        store.state,
      ),
      store,
    );
  }

  return map;
}

/*
 * ==========================================
 * PRODUCTO
 * ==========================================
 */

async function getOrCreateProduct(
  item: NormalizedProfecoProduct,
  products:
    Map<
      string,
      ProductRecord
    >,
) {
  const key =
    productKey(
      item,
    );

  const existing =
    products.get(
      key,
    );

  if (existing) {
    return {
      product:
        existing,

      created:
        false,
    };
  }

  const brand =
    normalizeBrand(
      item.brand,
    )
      ? item.brand
      : null;

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .insert({
      name:
        item.name,

      brand,

      category:
        item.category,

      barcode:
        null,
    })
    .select(`
      id,
      name,
      brand,
      category
    `)
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear "${item.name}": ${error.message}`,
    );
  }

  const product:
    ProductRecord = {
      id:
        String(
          data.id,
        ),

      name:
        String(
          data.name,
        ),

      brand:
        data.brand ??
        null,

      category:
        data.category ??
        null,
    };

  products.set(
    key,
    product,
  );

  return {
    product,
    created:
      true,
  };
}

/*
 * ==========================================
 * PRESENTACIÓN
 * ==========================================
 */

async function getOrCreatePresentation(
  item: NormalizedProfecoProduct,
  productId: string,
  presentations:
    Map<
      string,
      PresentationRecord
    >,
) {
  const key =
    presentationKey(
      productId,
      item.presentationName,
    );

  const existing =
    presentations.get(
      key,
    );

  if (existing) {
    return {
      presentation:
        existing,

      created:
        false,
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "product_presentations",
    )
    .insert({
      product_id:
        productId,

      presentation_name:
        item.presentationName,

      /*
       * Por ahora no intentamos
       * adivinar estos campos a
       * partir del texto de Profeco.
       */
      size_value:
        null,

      size_unit:
        null,

      package_type:
        null,

      units_per_package:
        1,
    })
    .select(`
      id,
      product_id,
      presentation_name
    `)
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear presentación "${item.presentationName}": ${error.message}`,
    );
  }

  const presentation:
    PresentationRecord = {
      id:
        String(
          data.id,
        ),

      product_id:
        String(
          data.product_id,
        ),

      presentation_name:
        String(
          data.presentation_name,
        ),
    };

  presentations.set(
    key,
    presentation,
  );

  return {
    presentation,
    created:
      true,
  };
}

/*
 * ==========================================
 * TIENDA
 * ==========================================
 */

async function getOrCreateStore(
  item: NormalizedProfecoProduct,
  stores:
    Map<
      string,
      StoreRecord
    >,
) {
  const city =
    item.municipality ??
    null;

  const state =
    item.state ??
    null;

  const key =
    storeKey(
      item.storeName,
      city,
      state,
    );

  const existing =
    stores.get(
      key,
    );

  if (existing) {
    return {
      store:
        existing,

      created:
        false,
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("stores")
    .insert({
      name:
        item.storeName,

      city,

      state,
    })
    .select(`
      id,
      name,
      city,
      state
    `)
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear tienda "${item.storeName}": ${error.message}`,
    );
  }

  const store:
    StoreRecord = {
      id:
        String(
          data.id,
        ),

      name:
        String(
          data.name,
        ),

      city:
        data.city ??
        null,

      state:
        data.state ??
        null,
    };

  stores.set(
    key,
    store,
  );

  return {
    store,
    created:
      true,
  };
}

/*
 * ==========================================
 * PRECIO
 * ==========================================
 */

async function priceAlreadyExists(
  input: {
    productId: string;
    presentationId: string;
    storeId: string;
    price: number;
    observedAt: string;
    storeBranch: string | null;
  },
) {
  let query =
    supabase
      .from("prices")
      .select("id")
      .eq(
        "product_id",
        input.productId,
      )
      .eq(
        "presentation_id",
        input.presentationId,
      )
      .eq(
        "store_id",
        input.storeId,
      )
      .eq(
        "price",
        input.price,
      )
      .eq(
        "observed_at",
        input.observedAt,
      )
      .eq(
        "source",
        "profeco",
      );

  if (
    input.storeBranch
  ) {
    query =
      query.eq(
        "store_branch",
        input.storeBranch,
      );
  } else {
    query =
      query.is(
        "store_branch",
        null,
      );
  }

  const {
    data,
    error,
  } = await query
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo comprobar precio duplicado: ${error.message}`,
    );
  }

  return Boolean(data);
}

async function createPrice(
  input: {
    productId: string;
    presentationId: string;
    storeId: string;
    price: number;
    observedAt: string;
    storeBranch: string | null;
  },
) {
  const {
    error,
  } = await supabase
    .from("prices")
    .insert({
      product_id:
        input.productId,

      presentation_id:
        input.presentationId,

      store_id:
        input.storeId,

      price:
        input.price,

      observed_at:
        input.observedAt,

      source:
        "profeco",

      store_branch:
        input.storeBranch,

      updated_at:
        new Date()
          .toISOString(),
    });

  if (error) {
    throw new Error(
      `No se pudo guardar precio: ${error.message}`,
    );
  }
}

/*
 * ==========================================
 * IMPORTADOR PRINCIPAL
 * ==========================================
 */

export async function importProfeco({
  filePath,
  maxProducts = 200,
  maxRows = 100_000,
  maxPrices = 1_500,
}: ProfecoImportOptions): Promise<ProfecoImportResult> {
  const absolutePath =
    path.resolve(
      filePath,
    );

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
    "🚀 PROFECO → LISTIK IMPORT",
  );
  console.log(
    "========================================",
  );

  console.log(
    "Archivo:",
    absolutePath,
  );

  console.log(
    "Máximo productos:",
    maxProducts,
  );

  console.log(
    "Máximo precios:",
    maxPrices,
  );

  console.log("");
  console.log(
    "📦 Cargando catálogo actual...",
  );

  const [
    products,
    presentations,
    stores,
  ] =
    await Promise.all([
      loadProducts(),
      loadPresentations(),
      loadStores(),
    ]);

  console.log(
    `Productos actuales: ${products.size}`,
  );

  console.log(
    `Presentaciones actuales: ${presentations.size}`,
  );

  console.log(
    `Tiendas actuales: ${stores.size}`,
  );

  /*
   * Productos de Profeco que
   * aceptamos durante esta corrida.
   */
  const selectedProductKeys =
    new Set<string>();

  /*
   * Evita comprobar exactamente
   * la misma observación dos veces
   * dentro de esta corrida.
   */
  const localPriceKeys =
    new Set<string>();

  const result:
    ProfecoImportResult = {
      rowsRead:
        0,

      validRows:
        0,

      invalidRows:
        0,

      productsCreated:
        0,

      productsReused:
        0,

      presentationsCreated:
        0,

      presentationsReused:
        0,

      storesCreated:
        0,

      storesReused:
        0,

      pricesCreated:
        0,

      pricesSkipped:
        0,

      selectedProducts:
        0,
    };

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

  for await (
    const rawRow
    of stream
  ) {
    if (
      result.rowsRead >=
      maxRows
    ) {
      break;
    }

    if (
      result.pricesCreated >=
      maxPrices
    ) {
      break;
    }

    result.rowsRead++;

    const row =
      rawRow as ProfecoRow;

    const normalized =
      normalizeProfecoRow(
        row,
      );

    if (!normalized) {
      result.invalidRows++;

      continue;
    }

    result.validRows++;

    const profecoProductKey =
      productKey(
        normalized,
      );

    /*
     * ------------------------------------------
     * CONTROL DE MÁXIMO DE PRODUCTOS
     * ------------------------------------------
     */

    if (
      !selectedProductKeys.has(
        profecoProductKey,
      )
    ) {
      if (
        selectedProductKeys.size >=
        maxProducts
      ) {
        /*
         * Ya tenemos 200 productos.
         *
         * Seguimos aceptando precios
         * solamente de esos mismos
         * productos.
         */
        continue;
      }

      selectedProductKeys.add(
        profecoProductKey,
      );
    }

    /*
     * ------------------------------------------
     * PRODUCTO
     * ------------------------------------------
     */

    const {
      product,
      created:
        productCreated,
    } =
      await getOrCreateProduct(
        normalized,
        products,
      );

    if (productCreated) {
      result.productsCreated++;
    } else {
      result.productsReused++;
    }

    /*
     * ------------------------------------------
     * PRESENTACIÓN
     * ------------------------------------------
     */

    const {
      presentation,
      created:
        presentationCreated,
    } =
      await getOrCreatePresentation(
        normalized,
        product.id,
        presentations,
      );

    if (
      presentationCreated
    ) {
      result.presentationsCreated++;
    } else {
      result.presentationsReused++;
    }

    /*
     * ------------------------------------------
     * TIENDA
     * ------------------------------------------
     */

    const {
      store,
      created:
        storeCreated,
    } =
      await getOrCreateStore(
        normalized,
        stores,
      );

    if (storeCreated) {
      result.storesCreated++;
    } else {
      result.storesReused++;
    }

    /*
     * ------------------------------------------
     * PRECIO
     * ------------------------------------------
     */

    const observation = {
      productId:
        product.id,

      presentationId:
        presentation.id,

      storeId:
        store.id,

      price:
        normalized.price,

      observedAt:
        normalized.observedAt,

      storeBranch:
        normalized.storeBranch,
    };

    const observationKey =
      priceKey(
        observation,
      );

    /*
     * Duplicado dentro del CSV/corrida.
     */
    if (
      localPriceKeys.has(
        observationKey,
      )
    ) {
      result.pricesSkipped++;

      continue;
    }

    localPriceKeys.add(
      observationKey,
    );

    /*
     * Duplicado ya existente
     * en Supabase.
     */
    const exists =
      await priceAlreadyExists(
        observation,
      );

    if (exists) {
      result.pricesSkipped++;

      continue;
    }

    await createPrice(
      observation,
    );

    result.pricesCreated++;

    /*
     * Mostrar progreso.
     */
    if (
      result.pricesCreated %
        50 ===
      0
    ) {
      console.log(
        `💲 ${result.pricesCreated} precios guardados...`,
      );
    }
  }

  result.selectedProducts =
    selectedProductKeys.size;

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
    "✅ IMPORTACIÓN PROFECO TERMINADA",
  );

  console.log(
    "========================================",
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

  console.log("");

  console.log(
    "📦 Productos seleccionados:",
    result.selectedProducts,
  );

  console.log(
    "🆕 Productos creados:",
    result.productsCreated,
  );

  console.log(
    "♻️ Productos reutilizados:",
    result.productsReused,
  );

  console.log("");

  console.log(
    "🆕 Presentaciones creadas:",
    result.presentationsCreated,
  );

  console.log(
    "♻️ Presentaciones reutilizadas:",
    result.presentationsReused,
  );

  console.log("");

  console.log(
    "🏪 Tiendas creadas:",
    result.storesCreated,
  );

  console.log(
    "♻️ Tiendas reutilizadas:",
    result.storesReused,
  );

  console.log("");

  console.log(
    "💲 Precios creados:",
    result.pricesCreated,
  );

  console.log(
    "⏭️ Precios omitidos:",
    result.pricesSkipped,
  );

  console.log("");

  return result;
}