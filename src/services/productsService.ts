import {
  supabase,
} from "./supabase";

/*
 * ==========================================
 * UBICACIÓN
 * ==========================================
 */

export interface GetProductsOptions {
  state?: string | null;

  municipality?: string | null;
}

/*
 * ==========================================
 * BÚSQUEDA PAGINADA
 * ==========================================
 */

export interface SearchProductsOptions {
  state: string | null;

  municipality: string | null;

  search?: string | null;

  category?: string | null;

  limit?: number;

  offset?: number;
}

export interface SearchProductsResult {
  products: any[];

  totalCount: number;

  hasMore: boolean;

  nextOffset: number;
}

/*
 * ==========================================
 * CATEGORÍAS
 * ==========================================
 */

export interface LocalCategory {
  category: string;

  productCount: number;
}

interface LocalCategoryRpcRow {
  category: string | null;

  product_count:
    | number
    | string;
}

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

const PRODUCT_LIMIT =
  120;

const DEFAULT_PAGE_SIZE =
  24;

const PRICE_HISTORY_DAYS =
  150;

/*
 * ==========================================
 * TIPOS INTERNOS
 * ==========================================
 */

interface RawPresentation {
  id: string;

  product_id: string;

  presentation_name:
    | string
    | null;

  size_value:
    | number
    | null;

  size_unit:
    | string
    | null;

  units_per_package:
    | number
    | null;

  package_type:
    | string
    | null;
}

interface RawProduct {
  id: string;

  name: string;

  brand:
    | string
    | null;

  category:
    | string
    | null;

  barcode:
    | string
    | null;

  image_url:
    | string
    | null;

  product_presentations:
    RawPresentation[];
}

/*
 * ==========================================
 * CADENA COMERCIAL
 * ==========================================
 */

interface RawStore {
  id: string;

  name: string;

  city:
    | string
    | null;

  state:
    | string
    | null;
}

/*
 * ==========================================
 * SUCURSAL LOCAL
 * ==========================================
 */

interface LocalBranch {
  id: string;

  name: string;

  municipality:
    | string
    | null;

  state:
    | string
    | null;
}

interface BranchIdRpcRow {
  id: string;
}

interface RawBranchRow {
  id: string;

  name:
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
 * PRECIO
 * ==========================================
 */

interface RawPrice {
  id: string;

  product_id: string;

  price:
    | number
    | string;

  presentation_id:
    | string
    | null;

  store_branch_id:
    | string
    | null;

  observed_at:
    | string
    | null;

  updated_at:
    | string
    | null;

  source:
    | string
    | null;

  /*
   * Este campo viene del dato histórico.
   *
   * NO será nuestra fuente de verdad.
   */
  store_branch:
    | string
    | null;

  stores:
    | RawStore
    | RawStore[]
    | null;
}

/*
 * ==========================================
 * RESULTADO DE BÚSQUEDA RPC
 * ==========================================
 */

interface SearchRpcRow {
  product_id: string;

  product_name?:
    | string
    | null;

  brand?:
    | string
    | null;

  category?:
    | string
    | null;

  relevance?:
    | number
    | string
    | null;

  total_count:
    | number
    | string;
}

/*
 * ==========================================
 * FECHA DE CORTE
 * ==========================================
 */

function getPriceCutoffDate() {
  const date =
    new Date();

  date.setDate(
    date.getDate() -
      PRICE_HISTORY_DAYS,
  );

  return date.toISOString();
}

/*
 * ==========================================
 * NORMALIZAR TIENDA
 * ==========================================
 */

function normalizeStore(
  stores:
    | RawStore
    | RawStore[]
    | null,
) {
  if (
    Array.isArray(
      stores,
    )
  ) {
    return (
      stores[0] ??
      null
    );
  }

  return (
    stores ??
    null
  );
}

/*
 * ==========================================
 * DIVIDIR ARRAYS
 * ==========================================
 */

function chunkArray<T>(
  items: T[],
  size: number,
) {
  const chunks:
    T[][] =
    [];

  for (
    let index =
      0;
    index <
      items.length;
    index +=
      size
  ) {
    chunks.push(
      items.slice(
        index,
        index +
          size,
      ),
    );
  }

  return chunks;
}

/*
 * ==========================================
 * CLAVE DE PRECIO VIGENTE
 * ==========================================
 */

function createLatestPriceKey(
  row: RawPrice,
) {
  const store =
    normalizeStore(
      row.stores,
    );

  return [
    row.product_id,

    row.presentation_id ??
      "no-presentation",

    row.store_branch_id ??
      "no-branch",

    store?.id ??
      "no-store",
  ].join(
    "::",
  );
}

/*
 * ==========================================
 * PRECIO MÁS RECIENTE
 * ==========================================
 */

function getLatestPrices(
  prices: RawPrice[],
) {
  const latest =
    new Map<
      string,
      RawPrice
    >();

  /*
   * Los precios vienen ordenados
   * de más reciente a más antiguo.
   */

  for (
    const price
    of prices
  ) {
    const numericPrice =
      Number(
        price.price,
      );

    if (
      !Number.isFinite(
        numericPrice,
      ) ||
      numericPrice <=
        0
    ) {
      continue;
    }

    const key =
      createLatestPriceKey(
        price,
      );

    if (
      latest.has(
        key,
      )
    ) {
      continue;
    }

    latest.set(
      key,
      price,
    );
  }

  return Array.from(
    latest.values(),
  );
}

/*
 * ==========================================
 * SUCURSALES DE LA UBICACIÓN
 * ==========================================
 *
 * 1. Obtenemos los IDs mediante
 *    get_branch_ids_by_location.
 *
 * 2. Cargamos nombre/municipio/estado
 *    directamente desde store_branches.
 */

async function getBranchesByLocation(
  state: string,
  municipality: string,
): Promise<LocalBranch[]> {
  /*
   * ========================================
   * IDs EXACTOS
   * ========================================
   */

  const {
    data:
      idData,

    error:
      idError,
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
    idError
  ) {
    console.error(
      "❌ ERROR CARGANDO IDs DE SUCURSALES:",
      {
        state,
        municipality,
        error:
          idError,
      },
    );

    throw idError;
  }

  const idRows =
    (
      idData ??
      []
    ) as BranchIdRpcRow[];

  const ids =
    idRows
      .map(
        (
          row,
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
    ids.length ===
    0
  ) {
    console.warn(
      "⚠️ NO HAY SUCURSALES PARA ESTA UBICACIÓN:",
      {
        state,
        municipality,
      },
    );

    return [];
  }

  /*
   * ========================================
   * DATOS DE LAS SUCURSALES
   * ========================================
   */

  const idChunks =
    chunkArray(
      ids,
      100,
    );

  const branches:
    LocalBranch[] =
    [];

  for (
    const idChunk
    of idChunks
  ) {
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
          municipality,
          state
        `)
        .in(
          "id",
          idChunk,
        );

    if (
      error
    ) {
      console.error(
        "❌ ERROR CARGANDO DATOS DE SUCURSALES:",
        {
          state,
          municipality,
          error,
        },
      );

      throw error;
    }

    const rows =
      (
        data ??
        []
      ) as RawBranchRow[];

    for (
      const row
      of rows
    ) {
      branches.push({
        id:
          String(
            row.id,
          ),

        name:
          String(
            row.name ??
              "",
          ),

        municipality:
          row.municipality ??
          null,

        state:
          row.state ??
          null,
      });
    }
  }

  console.log(
    "📍 SUCURSALES LOCALES VERIFICADAS:",
    {
      state,
      municipality,

      total:
        branches.length,

      examples:
        branches
          .slice(
            0,
            10,
          )
          .map(
            (
              branch,
            ) => ({
              id:
                branch.id,

              name:
                branch.name,

              municipality:
                branch.municipality,

              state:
                branch.state,
            }),
          ),
    },
  );

  return branches;
}

/*
 * ==========================================
 * PRODUCTOS POR IDs
 * ==========================================
 */

async function getProductsByIds(
  productIds:
    string[],
) {
  if (
    productIds.length ===
    0
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand,
        category,
        barcode,
        image_url,

        product_presentations(
          id,
          product_id,
          presentation_name,
          size_value,
          size_unit,
          units_per_package,
          package_type
        )
      `)
      .in(
        "id",
        productIds,
      )
      .order(
        "name",
        {
          ascending:
            true,
        },
      );

  if (
    error
  ) {
    console.error(
      "❌ ERROR CARGANDO PRODUCTOS:",
      error,
    );

    throw error;
  }

  return (
    data ??
    []
  ) as RawProduct[];
}

/*
 * ==========================================
 * PRECIOS PARA PRODUCTOS
 * ==========================================
 *
 * Esta función tiene DOS barreras
 * geográficas:
 *
 * 1. Supabase filtra:
 *
 *    store_branch_id IN IDs locales
 *
 * 2. TypeScript verifica:
 *
 *    store_branch_id existe en branchById
 *
 * Después sustituimos el texto viejo
 * por el nombre real de store_branches.
 */

async function getPricesForProducts(
  state: string,
  municipality: string,
  productIds: string[],
): Promise<RawPrice[]> {
  /*
   * ========================================
   * VALIDACIÓN
   * ========================================
   */

  if (
    !state.trim() ||
    !municipality.trim() ||
    productIds.length ===
      0
  ) {
    return [];
  }

  /*
   * ========================================
   * SUCURSALES LOCALES
   * ========================================
   */

  const branches =
    await getBranchesByLocation(
      state,
      municipality,
    );

  if (
    branches.length ===
    0
  ) {
    return [];
  }

  /*
   * IDs permitidos.
   */

  const branchIds =
    branches.map(
      (
        branch,
      ) =>
        branch.id,
    );

  /*
   * Mapa:
   *
   * UUID sucursal
   * ↓
   * sucursal real
   */

  const branchById =
    new Map<
      string,
      LocalBranch
    >();

  for (
    const branch
    of branches
  ) {
    branchById.set(
      branch.id,
      branch,
    );
  }

  /*
   * ========================================
   * FECHA DE CORTE
   * ========================================
   */

  const cutoffDate =
    getPriceCutoffDate();

  /*
   * ========================================
   * DIVIDIR CONSULTAS
   * ========================================
   */

  const branchChunks =
    chunkArray(
      branchIds,
      100,
    );

  const productChunks =
    chunkArray(
      productIds,
      40,
    );

  const allPrices:
    RawPrice[] =
    [];

  /*
   * ========================================
   * BUSCAR PRECIOS
   * ========================================
   */

  for (
    const productChunk
    of productChunks
  ) {
    for (
      const branchChunk
      of branchChunks
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "prices",
          )
          .select(`
            id,
            product_id,
            price,
            presentation_id,
            store_branch_id,
            observed_at,
            updated_at,
            source,
            store_branch,

            stores(
              id,
              name,
              city,
              state
            )
          `)
          .in(
            "product_id",
            productChunk,
          )
          .in(
            "store_branch_id",
            branchChunk,
          )
          .gte(
            "observed_at",
            cutoffDate,
          )
          .order(
            "observed_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            10000,
          );

      if (
        error
      ) {
        console.error(
          "❌ ERROR CARGANDO PRECIOS LOCALES:",
          {
            state,
            municipality,

            products:
              productChunk.length,

            branches:
              branchChunk.length,

            error,
          },
        );

        throw error;
      }

      const rawRows =
        (
          data ??
          []
        ) as RawPrice[];

      /*
       * ======================================
       * CORREGIR Y VALIDAR SUCURSALES
       * ======================================
       *
       * No usamos map + null + filter
       * para evitar el error de TypeScript
       * que te apareció.
       */

      const correctedRows:
        RawPrice[] =
        [];

      for (
        const price
        of rawRows
      ) {
        /*
         * Sin ID de sucursal
         * descartamos el precio.
         */

        if (
          !price.store_branch_id
        ) {
          continue;
        }

        /*
         * Recuperamos la sucursal real.
         */

        const branch =
          branchById.get(
            String(
              price.store_branch_id,
            ),
          );

        /*
         * Segunda barrera.
         *
         * Si no existe en nuestro mapa
         * local, se descarta.
         */

        if (
          !branch
        ) {
          console.warn(
            "⚠️ PRECIO DESCARTADO POR SUCURSAL NO LOCAL:",
            {
              priceId:
                price.id,

              storeBranchId:
                price.store_branch_id,

              importedBranch:
                price.store_branch,
            },
          );

          continue;
        }

        /*
         * ====================================
         * CAMBIO CRÍTICO
         * ====================================
         *
         * Ignoramos el texto viejo:
         *
         * price.store_branch
         *
         * y lo sustituimos por:
         *
         * store_branch_id
         * ↓
         * store_branches.name
         */

        correctedRows.push({
          ...price,

          store_branch:
            branch.name,
        });
      }

      allPrices.push(
        ...correctedRows,
      );
    }
  }

  /*
   * ========================================
   * DEBUG
   * ========================================
   */

  console.log(
    "💰 PRECIOS LOCALES ENCONTRADOS:",
    {
      state,
      municipality,

      products:
        productIds.length,

      localBranches:
        branchIds.length,

      prices:
        allPrices.length,
    },
  );

  console.log(
    "🏪 PRECIOS YA CORREGIDOS POR SUCURSAL:",
    allPrices
      .slice(
        0,
        30,
      )
      .map(
        (
          price,
        ) => {
          const branch =
            price.store_branch_id
              ? branchById.get(
                  String(
                    price.store_branch_id,
                  ),
                )
              : null;

          return {
            price:
              Number(
                price.price,
              ),

            storeBranchId:
              price.store_branch_id,

            storeBranch:
              price.store_branch,

            municipality:
              branch?.municipality ??
              null,

            state:
              branch?.state ??
              null,
          };
        },
      ),
  );

  return allPrices;
}

/*
 * ==========================================
 * CONSTRUIR PRODUCTOS
 * ==========================================
 */

function buildProductsResult(
  products:
    RawProduct[],

  rawPrices:
    RawPrice[],
) {
  /*
   * ========================================
   * PRECIOS MÁS RECIENTES
   * ========================================
   */

  const latestPrices =
    getLatestPrices(
      rawPrices,
    );

  /*
   * ========================================
   * AGRUPAR PRECIOS
   * ========================================
   */

  const pricesByProduct =
    new Map<
      string,
      RawPrice[]
    >();

  for (
    const price
    of latestPrices
  ) {
    const productId =
      String(
        price.product_id,
      );

    const current =
      pricesByProduct.get(
        productId,
      ) ??
      [];

    current.push(
      price,
    );

    pricesByProduct.set(
      productId,
      current,
    );
  }

  /*
   * ========================================
   * RESULTADO
   * ========================================
   */

  return products.map(
    (
      product,
    ) => {
      const productPrices =
        pricesByProduct.get(
          String(
            product.id,
          ),
        ) ??
        [];

      return {
        id:
          product.id,

        name:
          product.name,

        brand:
          product.brand,

        category:
          product.category,

        barcode:
          product.barcode,

        image_url:
          product.image_url,

        product_presentations:
          product.product_presentations ??
          [],

        prices:
          productPrices.map(
            (
              price,
            ) => {
              const store =
                normalizeStore(
                  price.stores,
                );

              return {
                id:
                  price.id,

                price:
                  Number(
                    price.price,
                  ),

                presentation_id:
                  price.presentation_id,

                store_branch_id:
                  price.store_branch_id,

                observed_at:
                  price.observed_at,

                updated_at:
                  price.updated_at,

                source:
                  price.source,

                /*
                 * Ya viene corregido.
                 */

                store_branch:
                  price.store_branch,

                stores:
                  store
                    ? {
                        id:
                          store.id,

                        name:
                          store.name,

                        city:
                          store.city,

                        state:
                          store.state,
                      }
                    : null,
              };
            },
          ),
      };
    },
  );
}

/*
 * ==========================================
 * BÚSQUEDA LOCAL
 * ==========================================
 */

export async function searchLocalProducts(
  options:
    SearchProductsOptions,
): Promise<SearchProductsResult> {
  /*
   * ========================================
   * OPCIONES
   * ========================================
   */

  const state =
    options.state
      ?.trim() ??
    "";

  const municipality =
    options.municipality
      ?.trim() ??
    "";

  const search =
    options.search
      ?.trim() ??
    "";

  const category =
    options.category
      ?.trim() ||
    null;

  const limit =
    Math.max(
      1,
      options.limit ??
        DEFAULT_PAGE_SIZE,
    );

  const offset =
    Math.max(
      0,
      options.offset ??
        0,
    );

  /*
   * ========================================
   * SIN UBICACIÓN
   * ========================================
   */

  if (
    !state ||
    !municipality
  ) {
    return {
      products:
        [],

      totalCount:
        0,

      hasMore:
        false,

      nextOffset:
        0,
    };
  }

  /*
   * ========================================
   * MOTOR
   * ========================================
   */

  const useSmartSearch =
    search.length >
    0;

  let searchRows:
    SearchRpcRow[] =
    [];

  /*
   * ========================================
   * SMART SEARCH
   * ========================================
   */

  if (
    useSmartSearch
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "search_products_smart",
        {
          p_state:
            state,

          p_municipality:
            municipality,

          p_search:
            search,

          p_limit:
            limit,

          p_offset:
            offset,
        },
      );

    if (
      error
    ) {
      console.error(
        "❌ ERROR BÚSQUEDA INTELIGENTE:",
        error,
      );

      throw error;
    }

    searchRows =
      (
        data ??
        []
      ) as SearchRpcRow[];
  }

  /*
   * ========================================
   * CATÁLOGO NORMAL
   * ========================================
   */

  else {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "search_local_products",
        {
          p_state:
            state,

          p_municipality:
            municipality,

          p_search:
            "",

          p_category:
            category,

          p_limit:
            limit,

          p_offset:
            offset,
        },
      );

    if (
      error
    ) {
      console.error(
        "❌ ERROR BUSCANDO PRODUCTOS LOCALES:",
        error,
      );

      throw error;
    }

    searchRows =
      (
        data ??
        []
      ) as SearchRpcRow[];
  }

  /*
   * ========================================
   * TOTAL
   * ========================================
   */

  const totalCount =
    searchRows.length >
    0
      ? Number(
          searchRows[0]
            .total_count ??
            0,
        )
      : 0;

  /*
   * ========================================
   * PRODUCT IDS
   * ========================================
   */

  const productIds =
    searchRows
      .map(
        (
          row,
        ) =>
          String(
            row.product_id,
          ),
      )
      .filter(
        Boolean,
      );

  /*
   * ========================================
   * SIN RESULTADOS
   * ========================================
   */

  if (
    productIds.length ===
    0
  ) {
    return {
      products:
        [],

      totalCount,

      hasMore:
        false,

      nextOffset:
        offset,
    };
  }

  /*
   * ========================================
   * PRODUCTOS
   * ========================================
   */

  const products =
    await getProductsByIds(
      productIds,
    );

  /*
   * ========================================
   * PRECIOS LOCALES
   * ========================================
   */

  const rawPrices =
    await getPricesForProducts(
      state,
      municipality,
      productIds,
    );

  /*
   * ========================================
   * NORMALIZAR
   * ========================================
   */

  const normalizedProducts =
    buildProductsResult(
      products,
      rawPrices,
    );

  /*
   * ========================================
   * CONSERVAR ORDEN DE RELEVANCIA
   * ========================================
   */

  const positionById =
    new Map<
      string,
      number
    >();

  productIds.forEach(
    (
      id,
      index,
    ) => {
      positionById.set(
        id,
        index,
      );
    },
  );

  const result =
    [
      ...normalizedProducts,
    ].sort(
      (
        a,
        b,
      ) => {
        const positionA =
          positionById.get(
            String(
              a.id,
            ),
          ) ??
          Number.MAX_SAFE_INTEGER;

        const positionB =
          positionById.get(
            String(
              b.id,
            ),
          ) ??
          Number.MAX_SAFE_INTEGER;

        return (
          positionA -
          positionB
        );
      },
    );

  /*
   * ========================================
   * PAGINACIÓN
   * ========================================
   */

  const nextOffset =
    offset +
    productIds.length;

  const hasMore =
    nextOffset <
    totalCount;

  /*
   * ========================================
   * DEBUG
   * ========================================
   */

  console.log(
    useSmartSearch
      ? "🧠 BÚSQUEDA INTELIGENTE:"
      : "🔎 CATÁLOGO LOCAL:",
    {
      zone:
        `${municipality}, ${state}`,

      search,

      category,

      engine:
        useSmartSearch
          ? "search_products_smart"
          : "search_local_products",

      offset,

      returned:
        result.length,

      totalCount,

      hasMore,

      prices:
        rawPrices.length,

      topResults:
        searchRows
          .slice(
            0,
            5,
          )
          .map(
            (
              row,
            ) => ({
              id:
                row.product_id,

              name:
                row.product_name,

              brand:
                row.brand,

              relevance:
                row.relevance,
            }),
          ),
    },
  );

  return {
    products:
      result,

    totalCount,

    hasMore,

    nextOffset,
  };
}

/*
 * ==========================================
 * CATEGORÍAS LOCALES
 * ==========================================
 */

export async function getLocalCategories(
  state: string,
  municipality: string,
): Promise<LocalCategory[]> {
  const normalizedState =
    state.trim();

  const normalizedMunicipality =
    municipality.trim();

  if (
    !normalizedState ||
    !normalizedMunicipality
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_local_categories",
      {
        p_state:
          normalizedState,

        p_municipality:
          normalizedMunicipality,
      },
    );

  if (
    error
  ) {
    console.error(
      "❌ ERROR CARGANDO CATEGORÍAS LOCALES:",
      error,
    );

    throw error;
  }

  const rows =
    (
      data ??
      []
    ) as LocalCategoryRpcRow[];

  const categories:
    LocalCategory[] =
    rows
      .map(
        (
          row,
        ) => ({
          category:
            String(
              row.category ??
                "Sin categoría",
            ),

          productCount:
            Number(
              row.product_count ??
                0,
            ),
        }),
      )
      .filter(
        (
          item,
        ) =>
          item.productCount >
          0,
      );

  console.log(
    "📚 CATEGORÍAS LOCALES:",
    {
      zone:
        `${normalizedMunicipality}, ${normalizedState}`,

      categories:
        categories.length,

      products:
        categories.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.productCount,
          0,
        ),
    },
  );

  return categories;
}

/*
 * ==========================================
 * GET PRODUCTS
 * ==========================================
 *
 * Compatibilidad con componentes
 * que todavía utilizan getProducts().
 */

export async function getProducts(
  options:
    GetProductsOptions = {},
) {
  const state =
    options.state
      ?.trim() ??
    "";

  const municipality =
    options.municipality
      ?.trim() ??
    "";

  if (
    !state ||
    !municipality
  ) {
    return [];
  }

  const result =
    await searchLocalProducts({
      state,

      municipality,

      search:
        "",

      category:
        null,

      limit:
        PRODUCT_LIMIT,

      offset:
        0,
    });

  return result.products;
}

/*
 * ==========================================
 * ACTUALIZAR PRODUCTO
 * ==========================================
 */

export async function updateProduct(
  id: string,

  product: {
    name: string;

    brand:
      | string
      | null;

    category:
      | string
      | null;

    barcode:
      | string
      | null;

    image_url:
      | string
      | null;
  },
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .update(
        product,
      )
      .eq(
        "id",
        id,
      )
      .select()
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data;
}

/*
 * ==========================================
 * ELIMINAR PRODUCTO
 * ==========================================
 */

export async function deleteProduct(
  id: string,
) {
  const {
    error,
  } =
    await supabase
      .from(
        "products",
      )
      .delete()
      .eq(
        "id",
        id,
      );

  if (
    error
  ) {
    throw error;
  }
}