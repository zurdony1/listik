import {
  supabase,
} from "../lib/supabase";

/*
 * ==========================================
 * RESULTADO
 * ==========================================
 */

export interface ProductPriceResult {
  productId: string;

  productName: string;

  brand:
    | string
    | null;

  category:
    | string
    | null;

  presentationId:
    | string
    | null;

  presentationName:
    | string
    | null;

  prices: {
    id: string;

    storeId: string;

    storeName: string;

    storeBranchId:
      | string
      | null;

    branch:
      | string
      | null;

    price: number;

    source:
      | string
      | null;

    observedAt:
      | string
      | null;
  }[];
}

/*
 * ==========================================
 * OPCIONES
 * ==========================================
 */

interface GetProductPricesOptions {
  presentationId?:
    | string
    | null;

  state: string;

  municipality: string;
}

/*
 * ==========================================
 * SUCURSAL LOCAL
 * ==========================================
 */

interface LocalBranch {
  id: string;

  name: string;

  store_id:
    | string
    | null;

  municipality:
    | string
    | null;

  state:
    | string
    | null;
}

/*
 * ==========================================
 * PRECIO CRUDO
 * ==========================================
 */

interface RawPriceRow {
  id: string;

  product_id:
    | string
    | null;

  presentation_id:
    | string
    | null;

  store_id:
    | string
    | null;

  store_branch_id:
    | string
    | null;

  price:
    | number
    | string;

  source:
    | string
    | null;

  observed_at:
    | string
    | null;

  stores:
    | {
        id: string;

        name: string;
      }
    | {
        id: string;

        name: string;
      }[]
    | null;
}

/*
 * ==========================================
 * FECHA A TIMESTAMP
 * ==========================================
 */

function getTimestamp(
  value:
    | string
    | null,
) {
  if (
    !value
  ) {
    return 0;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isNaN(
    timestamp,
  )
    ? 0
    : timestamp;
}

/*
 * ==========================================
 * PRIORIDAD DE FUENTE
 * ==========================================
 */

function getSourcePriority(
  source:
    | string
    | null,
) {
  if (
    source ===
    "ticket"
  ) {
    return 3;
  }

  if (
    source ===
    "manual"
  ) {
    return 2;
  }

  if (
    source ===
    "profeco"
  ) {
    return 1;
  }

  return 0;
}

/*
 * ==========================================
 * PRECIO MÁS RECIENTE POR SUCURSAL
 * ==========================================
 *
 * Ahora agrupamos por store_branch_id,
 * no por texto de sucursal.
 */

function getLatestPricePerBranch(
  rows:
    RawPriceRow[],
) {
  const latestByBranch =
    new Map<
      string,
      RawPriceRow
    >();

  for (
    const row
    of rows
  ) {
    if (
      !row.store_branch_id
    ) {
      continue;
    }

    const key =
      String(
        row.store_branch_id,
      );

    const current =
      latestByBranch.get(
        key,
      );

    if (
      !current
    ) {
      latestByBranch.set(
        key,
        row,
      );

      continue;
    }

    const currentTime =
      getTimestamp(
        current.observed_at,
      );

    const rowTime =
      getTimestamp(
        row.observed_at,
      );

    if (
      rowTime >
      currentTime
    ) {
      latestByBranch.set(
        key,
        row,
      );

      continue;
    }

    if (
      rowTime ===
      currentTime
    ) {
      const currentPriority =
        getSourcePriority(
          current.source,
        );

      const rowPriority =
        getSourcePriority(
          row.source,
        );

      if (
        rowPriority >
        currentPriority
      ) {
        latestByBranch.set(
          key,
          row,
        );
      }
    }
  }

  return Array.from(
    latestByBranch.values(),
  );
}

/*
 * ==========================================
 * SUCURSALES LOCALES
 * ==========================================
 */

async function getLocalBranches(
  state: string,
  municipality: string,
): Promise<
  LocalBranch[]
> {
  /*
   * Primero obtenemos únicamente los IDs
   * correctos con el RPC que ya probamos.
   */

  const {
    data:
      branchIdsData,

    error:
      branchIdsError,
  } =
    await supabase.rpc(
      "get_branch_ids_by_location",
      {
        p_state:
          state,

        p_municipality:
          municipality,
      },
    );

  if (
    branchIdsError
  ) {
    throw new Error(
      `No se pudieron consultar las sucursales locales: ${branchIdsError.message}`,
    );
  }

  const branchIds =
    (
      branchIdsData ??
      []
    )
      .map(
        (
          row: {
            id:
              string;
          },
        ) =>
          row.id
            ? String(
                row.id,
              )
            : "",
      )
      .filter(
        Boolean,
      );

  if (
    branchIds.length ===
    0
  ) {
    return [];
  }

  /*
   * Ahora cargamos los datos reales
   * de esas sucursales.
   */

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .select(`
        id,
        name,
        store_id,
        municipality,
        state
      `)
      .in(
        "id",
        branchIds,
      );

  if (
    error
  ) {
    throw new Error(
      `No se pudieron cargar los datos de las sucursales: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ) as LocalBranch[];
}

/*
 * ==========================================
 * OBTENER PRECIOS DE PRODUCTO
 * ==========================================
 */

export async function getProductPrices(
  productId: string,
  options:
    GetProductPricesOptions,
): Promise<
  ProductPriceResult | null
> {
  const {
    presentationId =
      null,

    state,

    municipality,
  } =
    options;

  /*
   * ========================================
   * PRODUCTO
   * ========================================
   */

  const {
    data:
      product,

    error:
      productError,
  } =
    await supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand,
        category
      `)
      .eq(
        "id",
        productId,
      )
      .maybeSingle();

  if (
    productError
  ) {
    throw new Error(
      `No se pudo consultar el producto: ${productError.message}`,
    );
  }

  if (
    !product
  ) {
    return null;
  }

  /*
   * ========================================
   * PRESENTACIÓN
   * ========================================
   */

  let presentation:
    | {
        id: string;

        presentation_name:
          | string
          | null;
      }
    | null =
    null;

  if (
    presentationId
  ) {
    const {
      data,

      error,
    } =
      await supabase
        .from(
          "product_presentations",
        )
        .select(`
          id,
          presentation_name
        `)
        .eq(
          "id",
          presentationId,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw new Error(
        `No se pudo consultar la presentación: ${error.message}`,
      );
    }

    presentation =
      data;
  }

  /*
   * ========================================
   * SUCURSALES LOCALES
   * ========================================
   */

  const localBranches =
    await getLocalBranches(
      state,
      municipality,
    );

  if (
    localBranches.length ===
    0
  ) {
    return {
      productId:
        String(
          product.id,
        ),

      productName:
        String(
          product.name,
        ),

      brand:
        product.brand ??
        null,

      category:
        product.category ??
        null,

      presentationId:
        presentation
          ? String(
              presentation.id,
            )
          : null,

      presentationName:
        presentation
          ?.presentation_name ??
        null,

      prices:
        [],
    };
  }

  /*
   * IDs permitidos.
   */

  const branchIds =
    localBranches.map(
      (
        branch,
      ) =>
        String(
          branch.id,
        ),
    );

  /*
   * Mapa ID → sucursal real.
   */

  const branchById =
    new Map<
      string,
      LocalBranch
    >();

  for (
    const branch
    of localBranches
  ) {
    branchById.set(
      String(
        branch.id,
      ),
      branch,
    );
  }

  /*
   * ========================================
   * PRECIOS
   * ========================================
   */

  let pricesQuery =
    supabase
      .from(
        "prices",
      )
      .select(`
        id,
        product_id,
        presentation_id,
        store_id,
        store_branch_id,
        price,
        source,
        observed_at,

        stores (
          id,
          name
        )
      `)
      .eq(
        "product_id",
        productId,
      )

      /*
       * ESTE ES EL FILTRO CLAVE.
       */

      .in(
        "store_branch_id",
        branchIds,
      )

      .order(
        "observed_at",
        {
          ascending:
            false,
        },
      );

  /*
   * Presentación concreta.
   */

  if (
    presentationId
  ) {
    pricesQuery =
      pricesQuery.eq(
        "presentation_id",
        presentationId,
      );
  }

  const {
    data:
      prices,

    error:
      pricesError,
  } =
    await pricesQuery;

  if (
    pricesError
  ) {
    throw new Error(
      `No se pudieron consultar los precios: ${pricesError.message}`,
    );
  }

  const rawPrices =
    (
      prices ??
      []
    ) as RawPriceRow[];

  /*
   * ========================================
   * VALIDACIÓN EXTRA
   * ========================================
   *
   * Aunque Supabase ya filtró los IDs,
   * comprobamos otra vez en TypeScript.
   */

  const localPrices:
    RawPriceRow[] =
    [];

  for (
    const row
    of rawPrices
  ) {
    if (
      !row.store_branch_id
    ) {
      continue;
    }

    const branch =
      branchById.get(
        String(
          row.store_branch_id,
        ),
      );

    if (
      !branch
    ) {
      continue;
    }

    localPrices.push(
      row,
    );
  }

  /*
   * ========================================
   * PRECIO VIGENTE
   * ========================================
   */

  const latestPrices =
    getLatestPricePerBranch(
      localPrices,
    );

  /*
   * ========================================
   * ORDENAR POR PRECIO
   * ========================================
   */

  latestPrices.sort(
    (
      a,
      b,
    ) =>
      Number(
        a.price,
      ) -
      Number(
        b.price,
      ),
  );

  /*
   * ========================================
   * DEBUG
   * ========================================
   */

  console.log(
    "💵 PRODUCT PRICE API LOCAL:",
    {
      productId,

      presentationId,

      state,

      municipality,

      localBranches:
        localBranches.length,

      rawPrices:
        rawPrices.length,

      latestPrices:
        latestPrices.length,
    },
  );

  /*
   * ========================================
   * RESPUESTA
   * ========================================
   */

  return {
    productId:
      String(
        product.id,
      ),

    productName:
      String(
        product.name,
      ),

    brand:
      product.brand ??
      null,

    category:
      product.category ??
      null,

    presentationId:
      presentation
        ? String(
            presentation.id,
          )
        : null,

    presentationName:
      presentation
        ?.presentation_name ??
      null,

    prices:
      latestPrices.map(
        (
          row,
        ) => {
          const store =
            Array.isArray(
              row.stores,
            )
              ? row.stores[0]
              : row.stores;

          const branch =
            row.store_branch_id
              ? branchById.get(
                  String(
                    row.store_branch_id,
                  ),
                )
              : null;

          return {
            id:
              String(
                row.id,
              ),

            storeId:
              String(
                row.store_id ??
                  store?.id ??
                  "",
              ),

            storeName:
              store?.name ??
              "Tienda desconocida",

            storeBranchId:
              row.store_branch_id
                ? String(
                    row.store_branch_id,
                  )
                : null,

            /*
             * IMPORTANTE:
             *
             * Ya NO usamos prices.store_branch.
             *
             * El nombre sale de:
             *
             * store_branch_id
             * ↓
             * store_branches.name
             */

            branch:
              branch?.name ??
              null,

            price:
              Number(
                row.price,
              ),

            source:
              row.source ??
              null,

            observedAt:
              row.observed_at ??
              null,
          };
        },
      ),
  };
}