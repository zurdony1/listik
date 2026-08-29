import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import dotenv from "dotenv";
import {
  createClient,
} from "@supabase/supabase-js";

dotenv.config();

/*
 * ==========================================
 * SUPABASE
 * ==========================================
 */

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !supabaseUrl ||
  !supabaseSecretKey
) {
  throw new Error(
    [
      "Faltan variables de entorno.",
      "Necesitamos:",
      "SUPABASE_URL",
      "SUPABASE_KEY",
    ].join("\n"),
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

const DATA_DIRECTORY =
  path.resolve(
    process.cwd(),
    "data",
    "profeco",
  );

const BATCH_SIZE =
  100;

const MAX_RETRIES =
  5;

const RETRY_BASE_DELAY_MS =
  2_000;

/*
 * Por ahora prueba solo Q2 de mayo.
 *
 * Después podemos volver a Q1 + Q2
 * o soltar todos los CSV.
 */

const TEST_MODE =
  true;

const TEST_FILES = [
  "05-2026_Q2.csv",
];

/*
 * ==========================================
 * TIPOS
 * ==========================================
 */

interface QQPRow {
  producto: string;
  presentacion: string;
  marca: string;
  categoria: string;
  catalogo: string;
  precio: string;
  fecha_registro: string;
  cadena_comercial: string;
  giro: string;
  nombre_comercial: string;
  direccion: string;
  estado: string;
  municipio: string;
  latitud: string;
  longitud: string;
}

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
}

interface StoreBranchRecord {
  id: string;
  store_id: string;
  name: string;
  address: string | null;
  state: string | null;
  municipality: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface PriceInsertRow {
  product_id: string;

  presentation_id:
    | string
    | null;

  store_id: string;

  store_branch_id:
    | string
    | null;

  price: number;

  store_branch:
    | string
    | null;

  source:
    "profeco";

  observed_at: string;

  updated_at: string;
}

/*
 * ==========================================
 * CACHE
 * ==========================================
 */

const productCache =
  new Map<
    string,
    ProductRecord
  >();

const presentationCache =
  new Map<
    string,
    PresentationRecord
  >();

const storeCache =
  new Map<
    string,
    StoreRecord
  >();

const branchCache =
  new Map<
    string,
    StoreBranchRecord
  >();

const runPriceKeys =
  new Set<string>();

/*
 * ==========================================
 * ESTADÍSTICAS
 * ==========================================
 */

let totalRows = 0;
let validRows = 0;
let invalidRows = 0;

let createdProducts = 0;
let reusedProducts = 0;

let createdPresentations = 0;
let reusedPresentations = 0;

let createdStores = 0;
let reusedStores = 0;

let createdBranches = 0;
let reusedBranches = 0;

let preparedPrices = 0;
let insertedPrices = 0;
let duplicatedInRun = 0;
let skippedPrices = 0;

/*
 * ==========================================
 * HELPERS
 * ==========================================
 */

function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ??
    ""
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function normalizeKey(
  value:
    | string
    | null
    | undefined,
) {
  return normalizeText(
    value,
  ).toLowerCase();
}

function parseNullableNumber(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(
      normalized,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

/*
 * ==========================================
 * CSV
 * ==========================================
 */

function parseCsvLine(
  line: string,
): string[] {
  const values:
    string[] = [];

  let current =
    "";

  let insideQuotes =
    false;

  for (
    let index = 0;
    index < line.length;
    index++
  ) {
    const character =
      line[index];

    if (
      character ===
      '"'
    ) {
      const nextCharacter =
        line[
          index + 1
        ];

      if (
        insideQuotes &&
        nextCharacter ===
          '"'
      ) {
        current +=
          '"';

        index++;

        continue;
      }

      insideQuotes =
        !insideQuotes;

      continue;
    }

    if (
      character ===
        "," &&
      !insideQuotes
    ) {
      values.push(
        current,
      );

      current =
        "";

      continue;
    }

    current +=
      character;
  }

  values.push(
    current,
  );

  return values;
}

function createQQPRow(
  headers: string[],
  values: string[],
): QQPRow | null {
  if (
    values.length !==
    headers.length
  ) {
    return null;
  }

  const data:
    Record<
      string,
      string
    > = {};

  headers.forEach(
    (
      header,
      index,
    ) => {
      data[
        header
      ] =
        values[
          index
        ] ??
        "";
    },
  );

  return {
    producto:
      data.producto ??
      "",

    presentacion:
      data.presentacion ??
      "",

    marca:
      data.marca ??
      "",

    categoria:
      data.categoria ??
      "",

    catalogo:
      data.catalogo ??
      "",

    precio:
      data.precio ??
      "",

    fecha_registro:
      data.fecha_registro ??
      "",

    cadena_comercial:
      data.cadena_comercial ??
      "",

    giro:
      data.giro ??
      "",

    nombre_comercial:
      data.nombre_comercial ??
      "",

    direccion:
      data.direccion ??
      "",

    estado:
      data.estado ??
      "",

    municipio:
      data.municipio ??
      "",

    latitud:
      data.latitud ??
      "",

    longitud:
      data.longitud ??
      "",
  };
}

function isValidRow(
  row: QQPRow,
) {
  const price =
    Number(
      row.precio,
    );

  return (
    Boolean(
      normalizeText(
        row.producto,
      ),
    ) &&
    Boolean(
      normalizeText(
        row.cadena_comercial,
      ),
    ) &&
    Number.isFinite(
      price,
    ) &&
    price >
      0
  );
}

/*
 * ==========================================
 * FECHA
 * ==========================================
 */

function parseObservedAt(
  value: string,
) {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    return new Date()
      .toISOString();
  }

  const slashMatch =
    normalized.match(
      /^(\d{4})\/(\d{2})\/(\d{2})$/,
    );

  if (
    slashMatch
  ) {
    const [
      ,
      year,
      month,
      day,
    ] =
      slashMatch;

    return new Date(
      `${year}-${month}-${day}T12:00:00`,
    ).toISOString();
  }

  const dashMatch =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (
    dashMatch
  ) {
    const [
      ,
      year,
      month,
      day,
    ] =
      dashMatch;

    return new Date(
      `${year}-${month}-${day}T12:00:00`,
    ).toISOString();
  }

  const parsed =
    new Date(
      normalized,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return new Date()
      .toISOString();
  }

  return parsed
    .toISOString();
}

/*
 * ==========================================
 * PRODUCTO
 * ==========================================
 */

async function getOrCreateProduct(
  row: QQPRow,
) {
  const name =
    normalizeText(
      row.producto,
    );

  const brand =
    normalizeText(
      row.marca,
    ) ||
    null;

  const category =
    normalizeText(
      row.categoria,
    ) ||
    null;

  const key =
    [
      normalizeKey(
        name,
      ),
      normalizeKey(
        brand,
      ),
      normalizeKey(
        category,
      ),
    ].join(
      "::",
    );

  const cached =
    productCache.get(
      key,
    );

  if (
    cached
  ) {
    reusedProducts++;

    return cached;
  }

  let query =
    supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand,
        category
      `)
      .ilike(
        "name",
        name,
      );

  if (
    brand
  ) {
    query =
      query.ilike(
        "brand",
        brand,
      );
  }

  const {
    data: existing,
    error: searchError,
  } =
    await query
      .limit(
        1,
      )
      .maybeSingle();

  if (
    searchError
  ) {
    throw new Error(
      `No se pudo buscar producto "${name}": ${searchError.message}`,
    );
  }

  if (
    existing
  ) {
    const product:
      ProductRecord = {
      id:
        String(
          existing.id,
        ),

      name:
        String(
          existing.name,
        ),

      brand:
        existing.brand ??
        null,

      category:
        existing.category ??
        null,
    };

    productCache.set(
      key,
      product,
    );

    reusedProducts++;

    return product;
  }

  const {
    data: created,
    error: createError,
  } =
    await supabase
      .from(
        "products",
      )
      .insert({
        name,
        brand,
        category,
        barcode: null,
        image_url: null,
      })
      .select(`
        id,
        name,
        brand,
        category
      `)
      .single();

  if (
    createError
  ) {
    throw new Error(
      `No se pudo crear producto "${name}": ${createError.message}`,
    );
  }

  const product:
    ProductRecord = {
    id:
      String(
        created.id,
      ),

    name:
      String(
        created.name,
      ),

    brand:
      created.brand ??
      null,

    category:
      created.category ??
      null,
  };

  productCache.set(
    key,
    product,
  );

  createdProducts++;

  return product;
}

/*
 * ==========================================
 * PRESENTACIÓN
 * ==========================================
 */

async function getOrCreatePresentation(
  productId: string,
  presentationName: string,
) {
  const normalizedPresentation =
    normalizeText(
      presentationName,
    );

  if (
    !normalizedPresentation
  ) {
    return null;
  }

  const key =
    [
      productId,
      normalizeKey(
        normalizedPresentation,
      ),
    ].join(
      "::",
    );

  const cached =
    presentationCache.get(
      key,
    );

  if (
    cached
  ) {
    reusedPresentations++;

    return cached;
  }

  const {
    data: existing,
    error: searchError,
  } =
    await supabase
      .from(
        "product_presentations",
      )
      .select(`
        id,
        product_id,
        presentation_name
      `)
      .eq(
        "product_id",
        productId,
      )
      .ilike(
        "presentation_name",
        normalizedPresentation,
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    searchError
  ) {
    throw new Error(
      `No se pudo buscar presentación "${normalizedPresentation}": ${searchError.message}`,
    );
  }

  if (
    existing
  ) {
    const presentation:
      PresentationRecord = {
      id:
        String(
          existing.id,
        ),

      product_id:
        String(
          existing.product_id,
        ),

      presentation_name:
        String(
          existing.presentation_name,
        ),
    };

    presentationCache.set(
      key,
      presentation,
    );

    reusedPresentations++;

    return presentation;
  }

  const {
    data: created,
    error: createError,
  } =
    await supabase
      .from(
        "product_presentations",
      )
      .insert({
        product_id:
          productId,

        presentation_name:
          normalizedPresentation,

        size_value:
          null,

        size_unit:
          null,

        units_per_package:
          1,

        package_type:
          null,
      })
      .select(`
        id,
        product_id,
        presentation_name
      `)
      .single();

  if (
    createError
  ) {
    throw new Error(
      `No se pudo crear presentación "${normalizedPresentation}": ${createError.message}`,
    );
  }

  const presentation:
    PresentationRecord = {
    id:
      String(
        created.id,
      ),

    product_id:
      String(
        created.product_id,
      ),

    presentation_name:
      String(
        created.presentation_name,
      ),
  };

  presentationCache.set(
    key,
    presentation,
  );

  createdPresentations++;

  return presentation;
}

/*
 * ==========================================
 * TIENDA / CADENA
 * ==========================================
 */

async function getOrCreateStore(
  row: QQPRow,
) {
  const storeName =
    normalizeText(
      row.cadena_comercial,
    );

  const key =
    normalizeKey(
      storeName,
    );

  const cached =
    storeCache.get(
      key,
    );

  if (
    cached
  ) {
    reusedStores++;

    return cached;
  }

  const {
    data: existing,
    error: searchError,
  } =
    await supabase
      .from(
        "stores",
      )
      .select(`
        id,
        name
      `)
      .ilike(
        "name",
        storeName,
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    searchError
  ) {
    throw new Error(
      `No se pudo buscar tienda "${storeName}": ${searchError.message}`,
    );
  }

  if (
    existing
  ) {
    const store:
      StoreRecord = {
      id:
        String(
          existing.id,
        ),

      name:
        String(
          existing.name,
        ),
    };

    storeCache.set(
      key,
      store,
    );

    reusedStores++;

    return store;
  }

  const {
    data: created,
    error: createError,
  } =
    await supabase
      .from(
        "stores",
      )
      .insert({
        name:
          storeName,
      })
      .select(`
        id,
        name
      `)
      .single();

  if (
    createError
  ) {
    throw new Error(
      `No se pudo crear tienda "${storeName}": ${createError.message}`,
    );
  }

  const store:
    StoreRecord = {
    id:
      String(
        created.id,
      ),

    name:
      String(
        created.name,
      ),
  };

  storeCache.set(
    key,
    store,
  );

  createdStores++;

  return store;
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

async function getOrCreateStoreBranch(
  storeId: string,
  row: QQPRow,
) {
  const name =
    normalizeText(
      row.nombre_comercial,
    ) ||
    normalizeText(
      row.cadena_comercial,
    );

  const address =
    normalizeText(
      row.direccion,
    ) ||
    null;

  const state =
    normalizeText(
      row.estado,
    ) ||
    null;

  const municipality =
    normalizeText(
      row.municipio,
    ) ||
    null;

  const latitude =
    parseNullableNumber(
      row.latitud,
    );

  const longitude =
    parseNullableNumber(
      row.longitud,
    );

  const key =
    [
      storeId,
      normalizeKey(
        name,
      ),
      normalizeKey(
        state,
      ),
      normalizeKey(
        municipality,
      ),
    ].join(
      "::",
    );

  const cached =
    branchCache.get(
      key,
    );

  if (
    cached
  ) {
    reusedBranches++;

    return cached;
  }

  const {
    data: existing,
    error: searchError,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .select(`
        id,
        store_id,
        name,
        address,
        state,
        municipality,
        latitude,
        longitude
      `)
      .eq(
        "store_id",
        storeId,
      )
      .ilike(
        "name",
        name,
      )
      .eq(
        "state",
        state,
      )
      .eq(
        "municipality",
        municipality,
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    searchError
  ) {
    throw new Error(
      `No se pudo buscar sucursal "${name}": ${searchError.message}`,
    );
  }

  if (
    existing
  ) {
    const branch:
      StoreBranchRecord = {
      id:
        String(
          existing.id,
        ),

      store_id:
        String(
          existing.store_id,
        ),

      name:
        String(
          existing.name,
        ),

      address:
        existing.address ??
        null,

      state:
        existing.state ??
        null,

      municipality:
        existing.municipality ??
        null,

      latitude:
        existing.latitude ??
        null,

      longitude:
        existing.longitude ??
        null,
    };

    branchCache.set(
      key,
      branch,
    );

    reusedBranches++;

    return branch;
  }

  const {
    data: created,
    error: createError,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .insert({
        store_id:
          storeId,

        name,

        address,

        state,

        municipality,

        latitude,

        longitude,
      })
      .select(`
        id,
        store_id,
        name,
        address,
        state,
        municipality,
        latitude,
        longitude
      `)
      .single();

  if (
    createError
  ) {
    throw new Error(
      `No se pudo crear sucursal "${name}": ${createError.message}`,
    );
  }

  const branch:
    StoreBranchRecord = {
    id:
      String(
        created.id,
      ),

    store_id:
      String(
        created.store_id,
      ),

    name:
      String(
        created.name,
      ),

    address:
      created.address ??
      null,

    state:
      created.state ??
      null,

    municipality:
      created.municipality ??
      null,

    latitude:
      created.latitude ??
      null,

    longitude:
      created.longitude ??
      null,
  };

  branchCache.set(
    key,
    branch,
  );

  createdBranches++;

  return branch;
}

/*
 * ==========================================
 * LLAVE PRECIO
 * ==========================================
 */

function createPriceKey(
  row: PriceInsertRow,
) {
  return [
    row.product_id,

    row.presentation_id ??
      "__NULL_PRESENTATION__",

    row.store_id,

    row.store_branch_id ??
      "__NULL_BRANCH_ID__",

    row.price.toFixed(
      4,
    ),

    row.observed_at,

    row.source,
  ].join(
    "::",
  );
}

/*
 * ==========================================
 * GUARDAR LOTE CON REINTENTOS
 * ==========================================
 */

async function savePriceBatch(
  rows:
    PriceInsertRow[],
) {
  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "prices",
          )
          .upsert(
            rows,
            {
              /*
               * Por ahora seguimos usando
               * la restricción anterior.
               *
               * store_branch también sigue
               * guardándose para compatibilidad.
               */
              onConflict:
                "product_id,presentation_id,store_id,store_branch,price,observed_at,source",

              ignoreDuplicates:
                true,
            },
          )
          .select(
            "id",
          );

      if (
        error
      ) {
        throw error;
      }

      return (
        data?.length ??
        0
      );
    } catch (
      error
    ) {
      if (
        attempt >=
        MAX_RETRIES
      ) {
        throw error;
      }

      const delay =
        RETRY_BASE_DELAY_MS *
        2 **
          (
            attempt -
            1
          );

      console.warn(
        `⚠️ Error guardando lote. Reintento ${attempt}/${MAX_RETRIES} en ${delay / 1000}s...`,
      );

      await sleep(
        delay,
      );
    }
  }

  return 0;
}

/*
 * ==========================================
 * PROCESAR LOTE
 * ==========================================
 */

async function processBatch(
  rows:
    QQPRow[],
) {
  const candidateRows:
    PriceInsertRow[] = [];

  for (
    const row
    of rows
  ) {
    try {
      const product =
        await getOrCreateProduct(
          row,
        );

      const presentation =
        await getOrCreatePresentation(
          product.id,
          row.presentacion,
        );

      const store =
        await getOrCreateStore(
          row,
        );

      const branch =
        await getOrCreateStoreBranch(
          store.id,
          row,
        );

      const price =
        Number(
          row.precio,
        );

      if (
        !Number.isFinite(
          price,
        ) ||
        price <=
          0
      ) {
        skippedPrices++;

        continue;
      }

      const priceRow:
        PriceInsertRow = {
        product_id:
          product.id,

        presentation_id:
          presentation
            ?.id ??
          null,

        store_id:
          store.id,

        store_branch_id:
          branch.id,

        price,

        store_branch:
          branch.name,

        source:
          "profeco",

        observed_at:
          parseObservedAt(
            row.fecha_registro,
          ),

        updated_at:
          new Date()
            .toISOString(),
      };

      const key =
        createPriceKey(
          priceRow,
        );

      if (
        runPriceKeys.has(
          key,
        )
      ) {
        duplicatedInRun++;

        continue;
      }

      runPriceKeys.add(
        key,
      );

      candidateRows.push(
        priceRow,
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Error procesando fila:",
        {
          product:
            row.producto,

          branch:
            row.nombre_comercial,

          municipality:
            row.municipio,

          state:
            row.estado,

          error,
        },
      );

      skippedPrices++;
    }
  }

  if (
    candidateRows.length ===
    0
  ) {
    return;
  }

  preparedPrices +=
    candidateRows.length;

  const insertedNow =
    await savePriceBatch(
      candidateRows,
    );

  insertedPrices +=
    insertedNow;

  console.log(
    [
      `💲 Nuevos acumulados: ${insertedPrices.toLocaleString(
        "es-MX",
      )}`,

      `🏪 Sucursales cache: ${branchCache.size.toLocaleString(
        "es-MX",
      )}`,
    ].join(
      " | ",
    ),
  );
}

/*
 * ==========================================
 * IMPORTAR CSV
 * ==========================================
 */

async function importCsvFile(
  filePath: string,
) {
  const fileName =
    path.basename(
      filePath,
    );

  console.log("");
  console.log(
    "========================================",
  );

  console.log(
    `📄 Importando ${fileName}`,
  );

  console.log(
    "========================================",
  );

  const stream =
    fs.createReadStream(
      filePath,
      {
        encoding:
          "utf8",
      },
    );

  const rl =
    readline.createInterface({
      input:
        stream,

      crlfDelay:
        Infinity,
    });

  let headers:
    string[] = [];

  let batch:
    QQPRow[] = [];

  let lineNumber =
    0;

  for await (
    const line
    of rl
  ) {
    lineNumber++;

    if (
      lineNumber ===
      1
    ) {
      headers =
        parseCsvLine(
          line.replace(
            /^\uFEFF/,
            "",
          ),
        ).map(
          (
            header,
          ) =>
            normalizeText(
              header,
            ),
        );

      console.log(
        "📋 Columnas detectadas:",
      );

      console.log(
        headers.join(
          " | ",
        ),
      );

      continue;
    }

    if (
      !line.trim()
    ) {
      continue;
    }

    totalRows++;

    const values =
      parseCsvLine(
        line,
      );

    const row =
      createQQPRow(
        headers,
        values,
      );

    if (
      !row ||
      !isValidRow(
        row,
      )
    ) {
      invalidRows++;

      continue;
    }

    validRows++;

    batch.push(
      row,
    );

    if (
      batch.length >=
      BATCH_SIZE
    ) {
      await processBatch(
        batch,
      );

      batch =
        [];
    }

    if (
      totalRows %
        10_000 ===
      0
    ) {
      console.log(
        `📊 ${totalRows.toLocaleString(
          "es-MX",
        )} filas leídas`,
      );
    }
  }

  if (
    batch.length >
    0
  ) {
    await processBatch(
      batch,
    );
  }

  console.log(
    `✅ Terminado ${fileName}`,
  );
}

/*
 * ==========================================
 * ARCHIVOS
 * ==========================================
 */

function getFilesToImport() {
  if (
    TEST_MODE
  ) {
    for (
      const file
      of TEST_FILES
    ) {
      const filePath =
        path.join(
          DATA_DIRECTORY,
          file,
        );

      if (
        !fs.existsSync(
          filePath,
        )
      ) {
        throw new Error(
          `No encontramos: ${filePath}`,
        );
      }
    }

    return TEST_FILES;
  }

  return fs
    .readdirSync(
      DATA_DIRECTORY,
    )
    .filter(
      (
        file,
      ) =>
        file
          .toLowerCase()
          .endsWith(
            ".csv",
          ),
    )
    .sort();
}

/*
 * ==========================================
 * RESUMEN
 * ==========================================
 */

function printSummary() {
  console.log("");
  console.log(
    "========================================",
  );

  console.log(
    "📊 RESUMEN IMPORTACIÓN",
  );

  console.log(
    "========================================",
  );

  console.log(
    `Filas leídas: ${totalRows.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `Filas válidas: ${validRows.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `Filas inválidas: ${invalidRows.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log("");

  console.log(
    `📦 Productos creados: ${createdProducts.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `♻️ Productos reutilizados: ${reusedProducts.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log("");

  console.log(
    `📐 Presentaciones creadas: ${createdPresentations.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `♻️ Presentaciones reutilizadas: ${reusedPresentations.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log("");

  console.log(
    `🏬 Cadenas creadas: ${createdStores.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `♻️ Cadenas reutilizadas: ${reusedStores.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log("");

  console.log(
    `🏪 Sucursales creadas: ${createdBranches.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `♻️ Sucursales reutilizadas: ${reusedBranches.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log("");

  console.log(
    `🧾 Observaciones preparadas: ${preparedPrices.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `💲 Precios nuevos: ${insertedPrices.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `♻️ Duplicados en ejecución: ${duplicatedInRun.toLocaleString(
      "es-MX",
    )}`,
  );

  console.log(
    `⏭️ Omitidos por error: ${skippedPrices.toLocaleString(
      "es-MX",
    )}`,
  );
}

/*
 * ==========================================
 * MAIN
 * ==========================================
 */

async function main() {
  console.log("");
  console.log(
    "🚀 LISTIK - IMPORTADOR QQP + SUCURSALES",
  );

  console.log(
    `📁 ${DATA_DIRECTORY}`,
  );

  const files =
    getFilesToImport();

  console.log("");
  console.log(
    "📄 Archivos:",
  );

  for (
    const file
    of files
  ) {
    console.log(
      `   • ${file}`,
    );
  }

  for (
    const file
    of files
  ) {
    await importCsvFile(
      path.join(
        DATA_DIRECTORY,
        file,
      ),
    );
  }

  printSummary();

  console.log("");
  console.log(
    "✅ IMPORTACIÓN TERMINADA.",
  );
}

main()
  .then(
    () => {
      process.exit(
        0,
      );
    },
  )
  .catch(
    (
      error,
    ) => {
      console.error("");
      console.error(
        "❌ IMPORTACIÓN CANCELADA",
      );

      console.error(
        error,
      );

      process.exit(
        1,
      );
    },
  );