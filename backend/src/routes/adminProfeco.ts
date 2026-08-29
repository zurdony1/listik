import {
  createHash,
} from "node:crypto";

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import multer from "multer";

import {
  createClient,
} from "@supabase/supabase-js";

const router =
  express.Router();

/*
 * ==========================================
 * MULTER
 * ==========================================
 */

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        25 *
        1024 *
        1024,
    },
  });

/*
 * ==========================================
 * SUPABASE
 * ==========================================
 */

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_KEY;

if (
  !supabaseUrl ||
  !supabaseKey
) {
  throw new Error(
    "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env",
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    },
  );

/*
 * ==========================================
 * TIPOS
 * ==========================================
 */

interface AdminRequest
  extends Request {
  adminUserId?:
    string;
}

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

interface ParsedRow {
  rowNumber: number;

  row: QQPRow;
}

interface Counters {
  totalRows: number;

  validRows: number;

  invalidRows: number;

  createdProducts: number;

  reusedProducts: number;

  createdPresentations: number;

  reusedPresentations: number;

  createdStores: number;

  reusedStores: number;

  createdBranches: number;

  reusedBranches: number;

  insertedPrices: number;

  skippedPrices: number;
}

/*
 * ==========================================
 * TEXTO
 * ==========================================
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
    .replace(
      /^\uFEFF/,
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

/*
 * ==========================================
 * ENCODING
 * ==========================================
 */

function decodeCsvBuffer(
  buffer: Buffer,
) {
  const utf8 =
    buffer.toString(
      "utf8",
    );

  const badCharacters =
    (
      utf8.match(
        /\uFFFD/g,
      ) ??
      []
    ).length;

  if (
    badCharacters >
    3
  ) {
    return buffer.toString(
      "latin1",
    );
  }

  return utf8;
}

/*
 * ==========================================
 * CSV
 * ==========================================
 */

function detectDelimiter(
  firstLine: string,
) {
  const candidates =
    [
      ",",
      ";",
      "\t",
      "|",
    ];

  let best =
    ",";

  let bestCount =
    -1;

  for (
    const delimiter
    of candidates
  ) {
    const count =
      firstLine.split(
        delimiter,
      ).length;

    if (
      count >
      bestCount
    ) {
      best =
        delimiter;

      bestCount =
        count;
    }
  }

  return best;
}

function parseCsvLine(
  line: string,
  delimiter: string,
) {
  const values:
    string[] =
    [];

  let current =
    "";

  let insideQuotes =
    false;

  for (
    let index =
      0;
    index <
    line.length;
    index++
  ) {
    const character =
      line[index];

    if (
      character ===
      '"'
    ) {
      if (
        insideQuotes &&
        line[
          index +
            1
        ] ===
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
        delimiter &&
      !insideQuotes
    ) {
      values.push(
        cleanText(
          current,
        ),
      );

      current =
        "";

      continue;
    }

    current +=
      character;
  }

  values.push(
    cleanText(
      current,
    ),
  );

  return values;
}

function canonicalHeader(
  value: string,
) {
  return normalizeKey(
    value,
  ).replace(
    /\s+/g,
    "_",
  );
}

function parseCsv(
  text: string,
): ParsedRow[] {
  const lines =
    text
      .replace(
        /\r\n/g,
        "\n",
      )
      .replace(
        /\r/g,
        "\n",
      )
      .split(
        "\n",
      )
      .filter(
        (
          line,
        ) =>
          line.trim()
            .length >
          0,
      );

  if (
    lines.length <
    2
  ) {
    throw new Error(
      "El CSV está vacío o no contiene datos.",
    );
  }

  const delimiter =
    detectDelimiter(
      lines[0],
    );

  const headers =
    parseCsvLine(
      lines[0],
      delimiter,
    ).map(
      canonicalHeader,
    );

  const required =
    [
      "producto",
      "presentacion",
      "marca",
      "categoria",
      "precio",
      "fecha_registro",
      "cadena_comercial",
      "nombre_comercial",
      "direccion",
      "estado",
      "municipio",
    ];

  const missing =
    required.filter(
      (
        column,
      ) =>
        !headers.includes(
          column,
        ),
    );

  if (
    missing.length >
    0
  ) {
    throw new Error(
      `Faltan columnas requeridas: ${missing.join(", ")}`,
    );
  }

  return lines
    .slice(
      1,
    )
    .map(
      (
        line,
        index,
      ) => {
        const values =
          parseCsvLine(
            line,
            delimiter,
          );

        const record:
          Record<
            string,
            string
          > =
          {};

        headers.forEach(
          (
            header,
            columnIndex,
          ) => {
            record[
              header
            ] =
              values[
                columnIndex
              ] ??
              "";
          },
        );

        return {
          rowNumber:
            index +
            2,

          row: {
            producto:
              record.producto ??
              "",

            presentacion:
              record.presentacion ??
              "",

            marca:
              record.marca ??
              "",

            categoria:
              record.categoria ??
              "",

            catalogo:
              record.catalogo ??
              "",

            precio:
              record.precio ??
              "",

            fecha_registro:
              record.fecha_registro ??
              "",

            cadena_comercial:
              record.cadena_comercial ??
              "",

            giro:
              record.giro ??
              "",

            nombre_comercial:
              record.nombre_comercial ??
              "",

            direccion:
              record.direccion ??
              "",

            estado:
              record.estado ??
              "",

            municipio:
              record.municipio ??
              "",

            latitud:
              record.latitud ??
              "",

            longitud:
              record.longitud ??
              "",
          },
        };
      },
    );
}

/*
 * ==========================================
 * NÚMEROS
 * ==========================================
 */

function parseNumber(
  value: string,
) {
  const result =
    Number(
      cleanText(
        value,
      )
        .replace(
          /\$/g,
          "",
        )
        .replace(
          /\s/g,
          "",
        )
        .replace(
          /,/g,
          "",
        ),
    );

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

/*
 * ==========================================
 * FECHA
 * ==========================================
 */

function parseObservedAt(
  value: string,
) {
  const text =
    cleanText(
      value,
    );

  /*
   * YYYY/MM/DD
   */

  const yearFirst =
    text.match(
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    );

  if (
    yearFirst
  ) {
    return new Date(
      Date.UTC(
        Number(
          yearFirst[1],
        ),
        Number(
          yearFirst[2],
        ) -
          1,
        Number(
          yearFirst[3],
        ),
        12,
      ),
    ).toISOString();
  }

  /*
   * DD/MM/YYYY
   */

  const dayFirst =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (
    dayFirst
  ) {
    return new Date(
      Date.UTC(
        Number(
          dayFirst[3],
        ),
        Number(
          dayFirst[2],
        ) -
          1,
        Number(
          dayFirst[1],
        ),
        12,
      ),
    ).toISOString();
  }

  const parsed =
    new Date(
      text,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return new Date()
      .toISOString();
  }

  return parsed.toISOString();
}

/*
 * ==========================================
 * VALIDAR FILA
 * ==========================================
 */

function validateRow(
  row: QQPRow,
) {
  const errors:
    string[] =
    [];

  if (
    !cleanText(
      row.producto,
    )
  ) {
    errors.push(
      "Producto vacío",
    );
  }

  const price =
    parseNumber(
      row.precio,
    );

  if (
    price ===
      null ||
    price <=
      0
  ) {
    errors.push(
      "Precio inválido",
    );
  }

  if (
    !cleanText(
      row.cadena_comercial,
    )
  ) {
    errors.push(
      "Cadena comercial vacía",
    );
  }

  if (
    !cleanText(
      row.estado,
    )
  ) {
    errors.push(
      "Estado vacío",
    );
  }

  if (
    !cleanText(
      row.municipio,
    )
  ) {
    errors.push(
      "Municipio vacío",
    );
  }

  return errors;
}

/*
 * ==========================================
 * EXTRAER MENSAJE REAL DE ERROR
 * ==========================================
 */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const err = error as Record<string, unknown>;

    const parts = [
      err.message
        ? `message: ${String(err.message)}`
        : null,

      err.details
        ? `details: ${String(err.details)}`
        : null,

      err.hint
        ? `hint: ${String(err.hint)}`
        : null,

      err.code
        ? `code: ${String(err.code)}`
        : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(
    error ?? "Error desconocido procesando fila."
  );
}

/*
 * ==========================================
 * ADMIN
 * ==========================================
 */

async function requireAdmin(
  req:
    AdminRequest,

  res:
    Response,

  next:
    NextFunction,
) {
  try {
    const authorization =
      req.headers
        .authorization ??
      "";

    const token =
      authorization.startsWith(
        "Bearer ",
      )
        ? authorization.slice(
            7,
          )
        : "";

    if (
      !token
    ) {
      res.status(
        401,
      ).json({
        ok:
          false,

        message:
          "Sesión requerida.",
      });

      return;
    }

    const {
      data:
        userData,

      error:
        userError,
    } =
      await supabase.auth.getUser(
        token,
      );

    if (
      userError ||
      !userData.user
    ) {
      res.status(
        401,
      ).json({
        ok:
          false,

        message:
          "Sesión inválida.",
      });

      return;
    }

    const {
      data:
        profile,

      error:
        profileError,
    } =
      await supabase
        .from(
          "profiles",
        )
        .select(
          "id, role",
        )
        .eq(
          "id",
          userData.user.id,
        )
        .maybeSingle();

    if (
      profileError
    ) {
      throw profileError;
    }

    if (
      profile?.role !==
      "admin"
    ) {
      res.status(
        403,
      ).json({
        ok:
          false,

        message:
          "Esta acción requiere permisos de administrador.",
      });

      return;
    }

    req.adminUserId =
      userData.user.id;

    next();
  } catch (
    error
  ) {
    console.error(
      "Error validando admin:",
      error,
    );

    res.status(
      500,
    ).json({
      ok:
        false,

      message:
        "No se pudo validar el acceso administrativo.",
    });
  }
}

/*
 * ==========================================
 * PRODUCTO
 * ==========================================
 */

async function getOrCreateProduct(
  row: QQPRow,
  counters: Counters,
) {
  const name =
    cleanText(
      row.producto,
    );

  const brand =
    cleanText(
      row.marca,
    ) ||
    null;

  const category =
    cleanText(
      row.categoria,
    ) ||
    null;

  const normalizedName =
    normalizeKey(
      name,
    );

  let query =
    supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand,
        category,
        normalized_name
      `)
      .eq(
        "normalized_name",
        normalizedName,
      );

  query =
    brand
      ? query.eq(
          "brand",
          brand,
        )
      : query.is(
          "brand",
          null,
        );

  const {
    data:
      products,

    error:
      searchError,
  } =
    await query.limit(
      1,
    );

  if (
    searchError
  ) {
    throw searchError;
  }

  const existing =
    products?.[0] ??
    null;

  if (
    existing
  ) {
    counters.reusedProducts++;

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .insert({
        name,

        brand,

        category,

        normalized_name:
          normalizedName,
      })
      .select(`
        id,
        name,
        brand,
        category,
        normalized_name
      `)
      .single();

  if (
    error
  ) {
    throw error;
  }

  counters.createdProducts++;

  return data;
}

/*
 * ==========================================
 * PRESENTACIÓN
 * ==========================================
 */

async function getOrCreatePresentation(
  productId: string,
  row: QQPRow,
  counters: Counters,
) {
  const name =
    cleanText(
      row.presentacion,
    );

  if (
    !name
  ) {
    return null;
  }

  const {
    data:
      presentations,

    error:
      searchError,
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
      .limit(
        100,
      );

  if (
    searchError
  ) {
    throw searchError;
  }

  const existing =
    (
      presentations ??
      []
    ).find(
      (
        item,
      ) =>
        normalizeKey(
          item.presentation_name,
        ) ===
        normalizeKey(
          name,
        ),
    );

  if (
    existing
  ) {
    counters.reusedPresentations++;

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "product_presentations",
      )
      .insert({
        product_id:
          productId,

        presentation_name:
          name,

        units_per_package:
          1,
      })
      .select(`
        id,
        product_id,
        presentation_name
      `)
      .single();

  if (
    error
  ) {
    throw error;
  }

  counters.createdPresentations++;

  return data;
}

/*
 * ==========================================
 * TIENDA
 * ==========================================
 */

async function getOrCreateStore(
  row: QQPRow,
  counters: Counters,
) {
  const name =
    cleanText(
      row.cadena_comercial,
    );

  const {
    data:
      stores,

    error:
      storesError,
  } =
    await supabase
      .from(
        "stores",
      )
      .select(
        "id, name",
      )
      .limit(
        10000,
      );

  if (
    storesError
  ) {
    throw storesError;
  }

  const existing =
    (
      stores ??
      []
    ).find(
      (
        store,
      ) =>
        normalizeKey(
          store.name,
        ) ===
        normalizeKey(
          name,
        ),
    );

  if (
    existing
  ) {
    counters.reusedStores++;

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "stores",
      )
      .insert({
        name,

        city:
          cleanText(
            row.municipio,
          ) ||
          null,

        state:
          cleanText(
            row.estado,
          ) ||
          null,

        latitude:
          parseNumber(
            row.latitud,
          ),

        longitude:
          parseNumber(
            row.longitud,
          ),
      })
      .select(
        "id, name",
      )
      .single();

  if (
    error
  ) {
    throw error;
  }

  counters.createdStores++;

  return data;
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

async function getOrCreateBranch(
  storeId: string,
  storeName: string,
  row: QQPRow,
  counters: Counters,
) {
  const branchName =
    cleanText(
      row.nombre_comercial,
    ) ||
    storeName;

  const address =
    cleanText(
      row.direccion,
    );

  const {
    data:
      branches,

    error:
      searchError,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .select(`
        id,
        store_id,
        name,
        address
      `)
      .eq(
        "store_id",
        storeId,
      )
      .limit(
        500,
      );

  if (
    searchError
  ) {
    throw searchError;
  }

  const existing =
    (
      branches ??
      []
    ).find(
      (
        branch,
      ) =>
        normalizeKey(
          branch.name,
        ) ===
          normalizeKey(
            branchName,
          ) &&
        (
          !address ||
          normalizeKey(
            branch.address,
          ) ===
            normalizeKey(
              address,
            )
        ),
    );

  if (
    existing
  ) {
    counters.reusedBranches++;

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .insert({
        store_id:
          storeId,

        name:
          branchName,

        address:
          address ||
          null,

        state:
          cleanText(
            row.estado,
          ) ||
          null,

        municipality:
          cleanText(
            row.municipio,
          ) ||
          null,

        latitude:
          parseNumber(
            row.latitud,
          ),

        longitude:
          parseNumber(
            row.longitud,
          ),

        /*
         * Tus columnas son NOT NULL.
         * Las mandamos explícitamente.
         */

        created_at:
          new Date()
            .toISOString(),

        updated_at:
          new Date()
            .toISOString(),
      })
      .select(`
        id,
        store_id,
        name
      `)
      .single();

  if (
    error
  ) {
    throw error;
  }

  counters.createdBranches++;

  return data;
}

/*
 * ==========================================
 * SOURCE KEY
 * ==========================================
 */

function priceSourceKey(
  productId: string,
  presentationId:
    | string
    | null,
  storeId: string,
  branchId: string,
  observedAt: string,
  price: number,
) {
  return createHash(
    "sha256",
  )
    .update(
      [
        "profeco",

        productId,

        presentationId ??
          "",

        storeId,

        branchId,

        observedAt.slice(
          0,
          10,
        ),

        price.toFixed(
          4,
        ),
      ].join(
        "|",
      ),
    )
    .digest(
      "hex",
    );
}

/*
 * ==========================================
 * PREVIEW
 * ==========================================
 */

router.post(
  "/preview",

  requireAdmin,

  upload.single(
    "file",
  ),

  async (
    req:
      AdminRequest,

    res:
      Response,
  ) => {
    try {
      if (
        !req.file
      ) {
        res.status(
          400,
        ).json({
          ok:
            false,

          message:
            "Selecciona un archivo CSV.",
        });

        return;
      }

      const fileHash =
        createHash(
          "sha256",
        )
          .update(
            req.file.buffer,
          )
          .digest(
            "hex",
          );

      const {
        data:
          previousImport,
      } =
        await supabase
          .from(
            "profeco_imports",
          )
          .select(`
            id,
            file_name,
            status,
            created_at,
            completed_at
          `)
          .eq(
            "file_hash",
            fileHash,
          )
          .maybeSingle();

      const rows =
        parseCsv(
          decodeCsvBuffer(
            req.file.buffer,
          ),
        );

      let validRows =
        0;

      let invalidRows =
        0;

      for (
        const item
        of rows
      ) {
        const errors =
          validateRow(
            item.row,
          );

        if (
          errors.length ===
          0
        ) {
          validRows++;
        } else {
          invalidRows++;
        }
      }

      const preview =
        rows
          .slice(
            0,
            25,
          )
          .map(
            (
              item,
            ) => {
              const errors =
                validateRow(
                  item.row,
                );

              return {
                rowNumber:
                  item.rowNumber,

                valid:
                  errors.length ===
                  0,

                errors,

                producto:
                  item.row.producto,

                presentacion:
                  item.row.presentacion,

                marca:
                  item.row.marca,

                precio:
                  item.row.precio,

                cadena:
                  item.row.cadena_comercial,

                sucursal:
                  item.row.nombre_comercial,

                estado:
                  item.row.estado,

                municipio:
                  item.row.municipio,
              };
            },
          );

      res.json({
        ok:
          true,

        data: {
          fileName:
            req.file.originalname,

          fileHash,

          duplicate:
            previousImport?.status ===
            "completed",

          previousImport:
            previousImport ??
            null,

          totalRows:
            rows.length,

          validRows,

          invalidRows,

          preview,
        },
      });
    } catch (
      error
    ) {
      console.error(
        "PROFECO preview:",
        error,
      );

      res.status(
        400,
      ).json({
        ok:
          false,

        message:
          getErrorMessage(
            error,
          ),
      });
    }
  },
);

/*
 * ==========================================
 * IMPORTAR
 * ==========================================
 */

router.post(
  "/import",

  requireAdmin,

  upload.single(
    "file",
  ),

  async (
    req:
      AdminRequest,

    res:
      Response,
  ) => {
    let importId:
      string | null =
      null;

    try {
      if (
        !req.file
      ) {
        res.status(
          400,
        ).json({
          ok:
            false,

          message:
            "Selecciona un archivo CSV.",
        });

        return;
      }

      const fileHash =
        createHash(
          "sha256",
        )
          .update(
            req.file.buffer,
          )
          .digest(
            "hex",
          );

      const {
        data:
          previousImport,
      } =
        await supabase
          .from(
            "profeco_imports",
          )
          .select(`
            id,
            status,
            file_name,
            completed_at
          `)
          .eq(
            "file_hash",
            fileHash,
          )
          .maybeSingle();

      /*
       * Permitimos reintentar si la
       * importación anterior terminó
       * completed pero con 0 precios.
       */

      if (
        previousImport?.status ===
        "completed"
      ) {
        const {
          data:
            previousStats,
        } =
          await supabase
            .from(
              "profeco_imports",
            )
            .select(
              "inserted_prices",
            )
            .eq(
              "id",
              previousImport.id,
            )
            .maybeSingle();

        if (
          (
            previousStats
              ?.inserted_prices ??
            0
          ) >
          0
        ) {
          res.status(
            409,
          ).json({
            ok:
              false,

            duplicate:
              true,

            message:
              "Este archivo ya fue importado anteriormente.",
          });

          return;
        }

        /*
         * Borramos la importación fallida
         * para permitir el reintento.
         */

        await supabase
          .from(
            "profeco_imports",
          )
          .delete()
          .eq(
            "id",
            previousImport.id,
          );
      }

      const rows =
        parseCsv(
          decodeCsvBuffer(
            req.file.buffer,
          ),
        );

      const {
        data:
          importRow,

        error:
          createError,
      } =
        await supabase
          .from(
            "profeco_imports",
          )
          .insert({
            file_name:
              req.file.originalname,

            file_hash:
              fileHash,

            uploaded_by:
              req.adminUserId ??
              null,

            status:
              "processing",

            total_rows:
              rows.length,
          })
          .select(
            "id",
          )
          .single();

      if (
        createError
      ) {
        throw createError;
      }

      importId =
        String(
          importRow.id,
        );

      const counters:
        Counters = {
        totalRows:
          rows.length,

        validRows:
          0,

        invalidRows:
          0,

        createdProducts:
          0,

        reusedProducts:
          0,

        createdPresentations:
          0,

        reusedPresentations:
          0,

        createdStores:
          0,

        reusedStores:
          0,

        createdBranches:
          0,

        reusedBranches:
          0,

        insertedPrices:
          0,

        skippedPrices:
          0,
      };

      for (
        const item
        of rows
      ) {
        const validationErrors =
          validateRow(
            item.row,
          );

        if (
          validationErrors.length >
          0
        ) {
          counters.invalidRows++;

          await supabase
            .from(
              "profeco_import_errors",
            )
            .insert({
              import_id:
                importId,

              row_number:
                item.rowNumber,

              reason:
                validationErrors.join(
                  "; ",
                ),

              raw_row:
                item.row,
            });

          continue;
        }

        let stage = "inicio";

        try {
          stage = "producto";

          const product =
            await getOrCreateProduct(
              item.row,
              counters,
            );

          stage = "presentacion";

          const presentation =
            await getOrCreatePresentation(
              String(
                product.id,
              ),
              item.row,
              counters,
            );

          stage = "tienda";

          const store =
            await getOrCreateStore(
              item.row,
              counters,
            );

          stage = "sucursal";

          const branch =
            await getOrCreateBranch(
              String(
                store.id,
              ),

              String(
                store.name,
              ),

              item.row,

              counters,
            );

          stage = "precio";

          const price =
            parseNumber(
              item.row.precio,
            );

          if (
            price ===
            null
          ) {
            throw new Error(
              "Precio inválido.",
            );
          }

          const observedAt =
            parseObservedAt(
              item.row.fecha_registro,
            );

          const sourceKey =
            priceSourceKey(
              String(
                product.id,
              ),

              presentation?.id
                ? String(
                    presentation.id,
                  )
                : null,

              String(
                store.id,
              ),

              String(
                branch.id,
              ),

              observedAt,

              price,
            );

          const {
            data:
              inserted,

            error:
              priceError,
          } =
            await supabase
              .from(
                "prices",
              )
              .upsert(
                {
                  product_id:
                    product.id,

                  presentation_id:
                    presentation?.id ??
                    null,

                  store_id:
                    store.id,

                  store_branch:
                    branch.name,

                  store_branch_id:
                    branch.id,

                  price,

                  source:
                    "profeco",

                  observed_at:
                    observedAt,

                  updated_at:
                    new Date()
                      .toISOString(),

                  source_key:
                    sourceKey,
                },
                {
                  onConflict:
                    "source_key",

                  ignoreDuplicates:
                    true,
                },
              )
              .select(
                "id",
              );

          if (
            priceError
          ) {
            throw priceError;
          }

          if (
            (
              inserted
                ?.length ??
              0
            ) >
            0
          ) {
            counters.insertedPrices++;
          } else {
            counters.skippedPrices++;
          }

          counters.validRows++;
        } catch (
          rowError
        ) {
          const reason =
            `[${stage}] ${getErrorMessage(rowError)}`;

          console.error(
            `❌ PROFECO fila ${item.rowNumber}:`,
            rowError,
          );

          counters.invalidRows++;

          await supabase
            .from(
              "profeco_import_errors",
            )
            .insert({
              import_id:
                importId,

              row_number:
                item.rowNumber,

              reason,

              raw_row:
                item.row,
            });
        }
      }

      const {
        error:
          finishError,
      } =
        await supabase
          .from(
            "profeco_imports",
          )
          .update({
            status:
              "completed",

            total_rows:
              counters.totalRows,

            valid_rows:
              counters.validRows,

            invalid_rows:
              counters.invalidRows,

            created_products:
              counters.createdProducts,

            reused_products:
              counters.reusedProducts,

            created_presentations:
              counters.createdPresentations,

            reused_presentations:
              counters.reusedPresentations,

            created_stores:
              counters.createdStores,

            reused_stores:
              counters.reusedStores,

            created_branches:
              counters.createdBranches,

            reused_branches:
              counters.reusedBranches,

            inserted_prices:
              counters.insertedPrices,

            skipped_prices:
              counters.skippedPrices,

            completed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            importId,
          );

      if (
        finishError
      ) {
        throw finishError;
      }

      res.json({
        ok:
          true,

        data: {
          importId,

          fileName:
            req.file.originalname,

          ...counters,
        },
      });
    } catch (
      error
    ) {
      console.error(
        "PROFECO import:",
        error,
      );

      if (
        importId
      ) {
        await supabase
          .from(
            "profeco_imports",
          )
          .update({
            status:
              "failed",

            error_message:
              getErrorMessage(
                error,
              ),

            completed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            importId,
          );
      }

      res.status(
        500,
      ).json({
        ok:
          false,

        message:
          getErrorMessage(
            error,
          ),
      });
    }
  },
);

/*
 * ==========================================
 * HISTORIAL
 * ==========================================
 */

router.get(
  "/imports",

  requireAdmin,

  async (
    _req:
      AdminRequest,

    res:
      Response,
  ) => {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "profeco_imports",
          )
          .select(`
            id,
            file_name,
            status,
            total_rows,
            valid_rows,
            invalid_rows,
            created_products,
            created_presentations,
            created_stores,
            created_branches,
            inserted_prices,
            skipped_prices,
            error_message,
            created_at,
            completed_at
          `)
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            30,
          );

      if (
        error
      ) {
        throw error;
      }

      res.json({
        ok:
          true,

        data:
          data ??
          [],
      });
    } catch (
      error
    ) {
      console.error(
        "PROFECO history:",
        error,
      );

      res.status(
        500,
      ).json({
        ok:
          false,

        message:
          getErrorMessage(
            error,
          ),
      });
    }
  },
);

export default router;