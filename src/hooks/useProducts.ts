import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getLocalCategories,
  searchLocalProducts,
} from "../services/productsService";

import type {
  LocalCategory,
} from "../services/productsService";

import {
  useAuth,
} from "../contexts/AuthContext";

import type {
  Product,
} from "../types/Product";

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

const PAGE_SIZE =
  24;

/*
 * Esperamos un poquito mientras
 * el usuario escribe.
 *
 * Así evitamos hacer una consulta
 * a Supabase por cada tecla.
 */
const SEARCH_DELAY =
  350;

/*
 * ==========================================
 * FECHA DE OBSERVACIÓN
 * ==========================================
 */

function getObservationTime(
  item: any,
) {
  const value =
    item.observed_at ??
    item.updated_at ??
    null;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : 0;
}

/*
 * ==========================================
 * TIENDA
 * ==========================================
 */

function getStore(
  item: any,
) {
  if (
    Array.isArray(
      item.stores,
    )
  ) {
    return (
      item.stores[0] ??
      null
    );
  }

  return (
    item.stores ??
    null
  );
}

/*
 * ==========================================
 * CLAVE DE PRECIO
 * ==========================================
 */

function getPriceGroupKey(
  item: any,
) {
  const store =
    getStore(
      item,
    );

  const storeId =
    store?.id
      ? String(
          store.id,
        )
      : "unknown-store";

  const presentationId =
    item.presentation_id
      ? String(
          item.presentation_id,
        )
      : "no-presentation";

  const branch =
    String(
      item.store_branch ??
        "",
    )
      .trim()
      .toLowerCase();

  return [
    storeId,
    presentationId,
    branch,
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
  rawPrices: any[],
) {
  const latest =
    new Map<
      string,
      any
    >();

  for (
    const price
    of rawPrices
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
      getPriceGroupKey(
        price,
      );

    const existing =
      latest.get(
        key,
      );

    if (!existing) {
      latest.set(
        key,
        price,
      );

      continue;
    }

    const currentTime =
      getObservationTime(
        price,
      );

    const existingTime =
      getObservationTime(
        existing,
      );

    if (
      currentTime >
      existingTime
    ) {
      latest.set(
        key,
        price,
      );
    }
  }

  return Array.from(
    latest.values(),
  );
}

/*
 * ==========================================
 * NORMALIZAR PRODUCTO
 * ==========================================
 */

function normalizeProduct(
  product: any,
): Product {
  const rawPrices =
    product.prices ??
    [];

  const latestPrices =
    getLatestPrices(
      rawPrices,
    );

  return {
    /*
     * =======================================
     * PRODUCTO
     * =======================================
     */

    id:
      String(
        product.id,
      ),

    name:
      String(
        product.name,
      ),

    brand:
      product.brand ??
      null,

    category:
      product.category ??
      null,

    barcode:
      product.barcode ??
      null,

    image_url:
      product.image_url ??
      null,

    /*
     * =======================================
     * PRECIOS
     * =======================================
     */

    prices:
      latestPrices.map(
        (
          item: any,
        ) => ({
          price:
            Number(
              item.price,
            ),

          stores:
            getStore(
              item,
            ),

          presentationId:
            item.presentation_id
              ? String(
                  item.presentation_id,
                )
              : null,

          observedAt:
            item.observed_at ??
            item.updated_at ??
            null,

          source:
            item.source ??
            null,

          storeBranch:
            item.store_branch ??
            null,
        }),
      ),

    /*
     * =======================================
     * PRESENTACIONES
     * =======================================
     */

    presentations:
      (
        product
          .product_presentations ??
        product
          .presentations ??
        []
      ).map(
        (
          presentation:
            any,
        ) => ({
          id:
            String(
              presentation.id,
            ),

          productId:
            String(
              presentation
                .product_id ??
                product.id,
            ),

          presentationName:
            String(
              presentation
                .presentation_name ??
                presentation
                  .presentationName ??
                "",
            ),

          sizeValue:
            presentation
              .size_value ==
            null
              ? null
              : Number(
                  presentation
                    .size_value,
                ),

          sizeUnit:
            presentation
              .size_unit ??
            null,

          unitsPerPackage:
            presentation
              .units_per_package ==
            null
              ? 1
              : Number(
                  presentation
                    .units_per_package,
                ),

          packageType:
            presentation
              .package_type ??
            null,
        }),
      ),
  };
}

/*
 * ==========================================
 * HOOK
 * ==========================================
 */

export function useProducts() {
  /*
   * ========================================
   * USUARIO
   * ========================================
   */

  const {
    user,

    profile,

    loading:
      authLoading,

    profileLoading,
  } =
    useAuth();

  /*
   * ========================================
   * UBICACIÓN
   * ========================================
   */

  const state =
    profile?.state
      ?.trim() ??
    "";

  const municipality =
    profile
      ?.municipality
      ?.trim() ??
    "";

  /*
   * ========================================
   * PRODUCTOS
   * ========================================
   */

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      [],
    );

  /*
   * ========================================
   * BÚSQUEDA
   * ========================================
   */

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] =
    useState("");

  /*
   * ========================================
   * CATEGORÍA SELECCIONADA
   * ========================================
   */

  const [
    category,
    setCategory,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * CATEGORÍAS REALES DE LA ZONA
   * ========================================
   */

  const [
    categories,
    setCategories,
  ] =
    useState<
      LocalCategory[]
    >(
      [],
    );

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] =
    useState(
      false,
    );

  const [
    categoriesError,
    setCategoriesError,
  ] =
    useState("");

  /*
   * ========================================
   * PAGINACIÓN
   * ========================================
   */

  const [
    totalCount,
    setTotalCount,
  ] =
    useState(
      0,
    );

  const [
    hasMore,
    setHasMore,
  ] =
    useState(
      false,
    );

  const [
    nextOffset,
    setNextOffset,
  ] =
    useState(
      0,
    );

  /*
   * ========================================
   * ESTADOS DE CARGA
   * ========================================
   */

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * ========================================
   * CONTROL DE PETICIONES
   * ========================================
   *
   * Si el usuario escribe rápido:
   *
   * coca
   * coca c
   * coca co
   *
   * evitamos que una respuesta vieja
   * sustituya a una búsqueda más nueva.
   */

  const requestIdRef =
    useRef(
      0,
    );

  /*
   * ========================================
   * DEBOUNCE DEL BUSCADOR
   * ========================================
   */

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              search.trim(),
            );
          },
          SEARCH_DELAY,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      search,
    ],
  );

  /*
   * ========================================
   * CARGAR CATEGORÍAS DE LA ZONA
   * ========================================
   *
   * IMPORTANTE:
   *
   * Este efecto NO depende de:
   *
   * search
   * debouncedSearch
   * category
   *
   * Por eso las categorías se consultan
   * solamente cuando cambia el usuario
   * o su ubicación.
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadCategories() {
        /*
         * Esperamos Auth.
         */

        if (
          authLoading ||
          profileLoading
        ) {
          return;
        }

        /*
         * Sin usuario o ubicación
         * no podemos calcular categorías.
         */

        if (
          !user ||
          !state ||
          !municipality
        ) {
          setCategories(
            [],
          );

          setCategoriesLoading(
            false,
          );

          setCategoriesError(
            "",
          );

          return;
        }

        try {
          setCategoriesLoading(
            true,
          );

          setCategoriesError(
            "",
          );

          const result =
            await getLocalCategories(
              state,
              municipality,
            );

          if (
            cancelled
          ) {
            return;
          }

          setCategories(
            result,
          );

          console.log(
            "📚 CATEGORÍAS DE LA ZONA:",
            {
              location: {
                municipality,
                state,
              },

              categories:
                result.length,

              products:
                result.reduce(
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
        } catch (
          err
        ) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "Error al cargar categorías:",
            err,
          );

          setCategories(
            [],
          );

          setCategoriesError(
            "No se pudieron cargar las categorías.",
          );
        } finally {
          if (
            !cancelled
          ) {
            setCategoriesLoading(
              false,
            );
          }
        }
      }

      void loadCategories();

      return () => {
        cancelled =
          true;
      };
    },
    [
      user,
      authLoading,
      profileLoading,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * PRIMERA PÁGINA
   * ========================================
   */

  const loadFirstPage =
    useCallback(
      async () => {
        /*
         * Esperamos autenticación.
         */

        if (
          authLoading ||
          profileLoading
        ) {
          return;
        }

        /*
         * Sin usuario.
         */

        if (!user) {
          setProducts(
            [],
          );

          setTotalCount(
            0,
          );

          setHasMore(
            false,
          );

          setNextOffset(
            0,
          );

          setLoading(
            false,
          );

          return;
        }

        /*
         * Sin ubicación.
         */

        if (
          !state ||
          !municipality
        ) {
          setProducts(
            [],
          );

          setTotalCount(
            0,
          );

          setHasMore(
            false,
          );

          setNextOffset(
            0,
          );

          setError(
            "Configura tu ubicación para ver productos disponibles en tu zona.",
          );

          setLoading(
            false,
          );

          return;
        }

        /*
         * Nueva petición.
         */

        const requestId =
          ++requestIdRef.current;

        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          const result =
            await searchLocalProducts({
              state,

              municipality,

              search:
                debouncedSearch,

              category,

              limit:
                PAGE_SIZE,

              offset:
                0,
            });

          /*
           * Ignoramos respuestas viejas.
           */

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          const normalizedProducts =
            result.products.map(
              normalizeProduct,
            );

          setProducts(
            normalizedProducts,
          );

          setTotalCount(
            result.totalCount,
          );

          setHasMore(
            result.hasMore,
          );

          setNextOffset(
            result.nextOffset,
          );

          console.log(
            "🔎 CATÁLOGO LOCAL:",
            {
              search:
                debouncedSearch,

              category,

              loaded:
                normalizedProducts.length,

              total:
                result.totalCount,

              hasMore:
                result.hasMore,

              location: {
                municipality,
                state,
              },
            },
          );
        } catch (
          err
        ) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          console.error(
            "Error al cargar productos:",
            err,
          );

          setProducts(
            [],
          );

          setTotalCount(
            0,
          );

          setHasMore(
            false,
          );

          setNextOffset(
            0,
          );

          setError(
            "No se pudieron cargar los productos.",
          );
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        user,
        authLoading,
        profileLoading,
        state,
        municipality,
        debouncedSearch,
        category,
      ],
    );

  /*
   * ========================================
   * EJECUTAR PRIMERA PÁGINA
   * ========================================
   */

  useEffect(
    () => {
      void loadFirstPage();
    },
    [
      loadFirstPage,
    ],
  );

  /*
   * ========================================
   * CARGAR MÁS
   * ========================================
   */

  const loadMore =
    useCallback(
      async () => {
        if (
          loading ||
          loadingMore ||
          !hasMore ||
          !user ||
          !state ||
          !municipality
        ) {
          return;
        }

        try {
          setLoadingMore(
            true,
          );

          setError(
            "",
          );

          const result =
            await searchLocalProducts({
              state,

              municipality,

              search:
                debouncedSearch,

              category,

              limit:
                PAGE_SIZE,

              offset:
                nextOffset,
            });

          const normalizedProducts =
            result.products.map(
              normalizeProduct,
            );

          /*
           * ==================================
           * EVITAR DUPLICADOS
           * ==================================
           */

          setProducts(
            (
              current,
            ) => {
              const productMap =
                new Map<
                  string,
                  Product
                >();

              for (
                const product
                of current
              ) {
                productMap.set(
                  product.id,
                  product,
                );
              }

              for (
                const product
                of normalizedProducts
              ) {
                productMap.set(
                  product.id,
                  product,
                );
              }

              return Array.from(
                productMap.values(),
              );
            },
          );

          setTotalCount(
            result.totalCount,
          );

          setHasMore(
            result.hasMore,
          );

          setNextOffset(
            result.nextOffset,
          );

          console.log(
            "📦 MÁS PRODUCTOS:",
            {
              loaded:
                normalizedProducts.length,

              nextOffset:
                result.nextOffset,

              total:
                result.totalCount,

              hasMore:
                result.hasMore,
            },
          );
        } catch (
          err
        ) {
          console.error(
            "Error al cargar más productos:",
            err,
          );

          setError(
            "No se pudieron cargar más productos.",
          );
        } finally {
          setLoadingMore(
            false,
          );
        }
      },
      [
        loading,
        loadingMore,
        hasMore,
        user,
        state,
        municipality,
        debouncedSearch,
        category,
        nextOffset,
      ],
    );

  /*
   * ========================================
   * CAMBIAR BÚSQUEDA
   * ========================================
   */

  const changeSearch =
    useCallback(
      (
        value: string,
      ) => {
        setSearch(
          value,
        );
      },
      [],
    );

  /*
   * ========================================
   * CAMBIAR CATEGORÍA
   * ========================================
   */

  const changeCategory =
    useCallback(
      (
        value:
          | string
          | null,
      ) => {
        if (
          value ===
          "Todas"
        ) {
          setCategory(
            null,
          );

          return;
        }

        setCategory(
          value,
        );
      },
      [],
    );

  /*
   * ========================================
   * TOTAL REAL DE PRODUCTOS EN CATEGORÍAS
   * ========================================
   *
   * Normalmente debe coincidir con los
   * 1,565 productos locales.
   */

  const catalogTotal =
    categories.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.productCount,
      0,
    );

  /*
   * ========================================
   * RETORNO
   * ========================================
   */

  return {
    /*
     * Productos cargados
     */
    products,

    /*
     * ======================================
     * BÚSQUEDA
     * ======================================
     */

    search,

    setSearch:
      changeSearch,

    /*
     * ======================================
     * CATEGORÍA SELECCIONADA
     * ======================================
     */

    category,

    setCategory:
      changeCategory,

    /*
     * ======================================
     * CATEGORÍAS REALES
     * ======================================
     */

    categories,

    categoriesLoading,

    categoriesError,

    catalogTotal,

    /*
     * ======================================
     * PAGINACIÓN
     * ======================================
     */

    totalCount,

    hasMore,

    loadMore,

    loadingMore,

    /*
     * ======================================
     * ESTADOS
     * ======================================
     */

    loading:
      loading ||
      authLoading ||
      profileLoading,

    error,

    /*
     * ======================================
     * UBICACIÓN
     * ======================================
     */

    location: {
      state:
        state ||
        null,

      municipality:
        municipality ||
        null,
    },
  };
}