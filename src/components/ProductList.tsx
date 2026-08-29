import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useProducts,
} from "../hooks/useProducts";

import {
  useShoppingList,
} from "../hooks/useShoppingList";

import type {
  Product,
} from "../types/Product";

import {
  getProductPrices,
} from "../services/api/productPriceApi";


import ProductCard from "./product/ProductCard";
import ProductModal from "./product/ProductModal";

/*
 * ==========================================
 * PRODUCTO SELECCIONADO
 * ==========================================
 */

interface SelectedComparison {
  product: Product;

  presentationId:
    | string
    | null;
}

const ALL_CATEGORIES =
  "Todas";

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

interface ProductListProps {
  children?: ReactNode;
}

export default function ProductList({
  children,
}: ProductListProps) {
  /*
   * ========================================
   * PRODUCTOS + BÚSQUEDA REMOTA
   * ========================================
   */
  const [showAllProducts, setShowAllProducts] =
  useState(false);

  const {
    products,

    search,
    setSearch,

    category,
    setCategory,

    /*
     * Categorías reales de toda la zona
     */

    categories,
    categoriesLoading,
    categoriesError,
    catalogTotal,

    /*
     * Resultados actuales
     */

    totalCount,

    /*
     * Paginación
     */

    hasMore,
    loadMore,
    loadingMore,

    /*
     * Estados
     */

    loading,
    error,

    /*
     * Ubicación
     */

    location,
  } =
    useProducts();

  /*
   * ========================================
   * LISTA DE COMPRAS
   * ========================================
   *
   * Home ya NO muestra la lista completa.
   *
   * Solamente necesitamos:
   *
   * items
   * addProduct
   *
   * /lista se encarga de administrar
   * cantidades y productos.
   */

  const {
    items,
    addProduct,
  } =
    useShoppingList();

  /*
   * ========================================
   * TOTAL DE PRODUCTOS EN MI LISTA
   * ========================================
   */

  const totalListUnits =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  /*
   * ========================================
   * LISTA RÁPIDA
   * ========================================
   *
   * Evita que React StrictMode procese
   * dos veces los productos confirmados.
   */

  const quickListProcessedRef =
    useRef(
      false,
    );

  const [
    importingQuickList,
    setImportingQuickList,
  ] =
    useState(
      false,
    );

  const [
    quickListMessage,
    setQuickListMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * IMPORTAR PRODUCTOS DE LISTA RÁPIDA
   * ========================================
   *
   * ReviewList guarda:
   *
   * listik_confirmed_products
   *
   * con los Product completos.
   *
   * Aquí:
   *
   * 1. Leemos los productos.
   * 2. Elegimos su presentación.
   * 3. Consultamos precios locales.
   * 4. Los agregamos a useShoppingList.
   * 5. Eliminamos sessionStorage.
   */

  useEffect(
    () => {
      if (
        quickListProcessedRef.current
      ) {
        return;
      }

      /*
       * Esperamos a tener ubicación.
       */

      if (
        !location.state ||
        !location.municipality
      ) {
        return;
      }

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const mode =
        params.get(
          "modo",
        );

      if (
        mode !==
        "lista-confirmada"
      ) {
        return;
      }

      const raw =
        sessionStorage.getItem(
          "listik_confirmed_products",
        );

      if (
        !raw
      ) {
        return;
      }

      /*
       * Marcamos inmediatamente para evitar
       * procesamiento duplicado.
       */

      quickListProcessedRef.current =
        true;

      async function importQuickList() {
        try {
          setImportingQuickList(
            true,
          );

          setQuickListMessage(
            null,
          );

          /*
           * ==================================
           * PARSEAR PRODUCTOS
           * ==================================
           */

          let confirmedProducts:
            Product[] =
            [];

          try {
            const parsed =
              JSON.parse(
                raw as string,
              );

            if (
              Array.isArray(
                parsed,
              )
            ) {
              confirmedProducts =
                parsed as Product[];
            }
          } catch (
            parseError
          ) {
            console.error(
              "Error leyendo productos confirmados:",
              parseError,
            );

            setQuickListMessage(
              "No pudimos leer los productos confirmados.",
            );

            return;
          }

          if (
            confirmedProducts.length ===
            0
          ) {
            setQuickListMessage(
              "No encontramos productos para agregar.",
            );

            return;
          }

          console.log(
            "🛒 IMPORTANDO LISTA RÁPIDA:",
            {
              products:
                confirmedProducts.length,

              state:
                location.state,

              municipality:
                location.municipality,
            },
          );

          /*
           * ==================================
           * IMPORTAR UNO POR UNO
           * ==================================
           */

          let addedCount =
            0;

          for (
            const product
            of confirmedProducts
          ) {
            try {
              /*
               * ==================================
               * PRESENTACIÓN
               * ==================================
               */

              const presentation =
                product.presentations?.[
                  0
                ] ??
                null;

              const presentationId =
                presentation?.id ??
                null;

              /*
               * ==================================
               * PRECIOS LOCALES
               * ==================================
               */

              const response =
                await getProductPrices(
                  product.id,
                  {
                    presentationId,

                    state:
                      location.state,

                    municipality:
                      location.municipality,
                  },
                );

              const prices =
                response.data
                  .prices ??
                [];

              /*
               * ==================================
               * AGREGAR A LA LISTA
               * ==================================
               */

              addProduct(
                product,
                presentationId,
                prices,
              );

              addedCount +=
                1;

              console.log(
                "✅ PRODUCTO IMPORTADO:",
                {
                  product:
                    product.name,

                  presentation:
                    presentation
                      ?.presentationName ??
                    null,

                  prices:
                    prices.length,
                },
              );
            } catch (
              productError
            ) {
              /*
               * Si falla la consulta de precio,
               * no perdemos el producto.
               */

              console.error(
                `Error importando ${product.name}:`,
                productError,
              );

              const presentation =
                product.presentations?.[
                  0
                ] ??
                null;

              addProduct(
                product,
                presentation?.id ??
                  null,
                [],
              );

              addedCount +=
                1;
            }
          }

          /*
           * ==================================
           * LIMPIAR SESSION STORAGE
           * ==================================
           */

          sessionStorage.removeItem(
            "listik_confirmed_products",
          );

          sessionStorage.removeItem(
            "listik_pending_list",
          );

          /*
           * ==================================
           * LIMPIAR URL
           * ==================================
           */

          const cleanUrl =
            `${window.location.pathname}${window.location.hash}`;

          window.history.replaceState(
            {},
            "",
            cleanUrl,
          );

          /*
           * ==================================
           * MENSAJE
           * ==================================
           */

          setQuickListMessage(
            addedCount ===
            1
              ? "1 producto agregado a tu lista."
              : `${addedCount} productos agregados a tu lista.`,
          );

          console.log(
            "🎉 LISTA RÁPIDA IMPORTADA:",
            {
              addedCount,
            },
          );
        } catch (
          importError
        ) {
          console.error(
            "Error importando Lista Rápida:",
            importError,
          );

          setQuickListMessage(
            "No pudimos agregar todos los productos de tu Lista Rápida.",
          );
        } finally {
          setImportingQuickList(
            false,
          );
        }
      }

      void importQuickList();
    },
    [
      location.state,
      location.municipality,
      addProduct,
    ],
  );

  /*
   * ========================================
   * PRODUCTO SELECCIONADO
   * ========================================
   */

  const [
    selectedComparison,
    setSelectedComparison,
  ] =
    useState<
      SelectedComparison | null
    >(
      null,
    );

  /*
   * ========================================
   * COMPARAR
   * ========================================
   */

  function handleCompare(
    product: Product,

    presentationId:
      | string
      | null,
  ) {
    setSelectedComparison({
      product,
      presentationId,
    });
  }

  function closeModal() {
    setSelectedComparison(
      null,
    );
  }

  /*
   * ========================================
   * CAMBIAR CATEGORÍA
   * ========================================
   */

  function handleCategoryChange(
    value: string,
  ) {
    if (
      value ===
      ALL_CATEGORIES
    ) {
      setCategory(
        null,
      );

      return;
    }

    setCategory(
      value,
    );
  }

  /*
   * ========================================
   * LIMPIAR FILTROS
   * ========================================
   */

  function clearFilters() {
    setSearch(
      "",
    );

    setCategory(
      null,
    );
  }

  /*
   * ========================================
   * HOME DESTACADO / CATÁLOGO
   * ========================================
   */

  const hasActiveSearch =
    search.trim().length > 0;

  const hasActiveCategory =
    Boolean(category);

  const shouldShowCatalog =
    showAllProducts ||
    hasActiveSearch ||
    hasActiveCategory;


  /*
   * ========================================
   * CARGANDO INICIAL
   * ========================================
   */

  if (
    loading &&
    products.length ===
      0
  ) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-4xl">
          🛒
        </div>

        <p className="mt-4 font-medium text-slate-600">
          Cargando productos de tu zona...
        </p>

        {location.municipality &&
          location.state && (
            <p className="mt-2 text-sm font-semibold text-green-600">
              📍{" "}
              {
                location.municipality
              }
              ,{" "}
              {
                location.state
              }
            </p>
          )}
      </div>
    );
  }

  /*
   * ========================================
   * ERROR INICIAL
   * ========================================
   */

  if (
    error &&
    products.length ===
      0
  ) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  /*
   * ========================================
   * INTERFAZ
   * ========================================
   */

  const categoryEmoji = (
    categoryName: string,
  ) => {
    const normalized =
      categoryName
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        );

    if (
      normalized.includes("fruta") ||
      normalized.includes("verdura") ||
      normalized.includes("hortaliza")
    ) {
      return "🍏";
    }

    if (
      normalized.includes("lact") ||
      normalized.includes("huevo")
    ) {
      return "🥛";
    }

    if (
      normalized.includes("carne") ||
      normalized.includes("pescado")
    ) {
      return "🥩";
    }

    if (
      normalized.includes("bebida") ||
      normalized.includes("refresco")
    ) {
      return "🥤";
    }

    if (
      normalized.includes("limpieza") ||
      normalized.includes("hogar")
    ) {
      return "🧴";
    }

    if (
      normalized.includes("higiene") ||
      normalized.includes("cuidado personal")
    ) {
      return "🧼";
    }

    if (
      normalized.includes("pan") ||
      normalized.includes("despensa") ||
      normalized.includes("abarrote")
    ) {
      return "🥫";
    }

    if (
      normalized.includes("botana") ||
      normalized.includes("dulce")
    ) {
      return "🍿";
    }

    if (
      normalized.includes("medic")
    ) {
      return "💊";
    }

    return "🛒";
  };

  return (
    <>
      <div className="space-y-7">
        {importingQuickList && (
          <div className="rounded-[26px] border border-green-100 bg-green-50 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />

              <div>
                <p className="font-black text-green-800">
                  Preparando tu lista...
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Estamos consultando los precios disponibles en{" "}
                  {location.municipality},{" "}
                  {location.state}.
                </p>
              </div>
            </div>
          </div>
        )}

        {!importingQuickList &&
          quickListMessage && (
            <div className="rounded-[26px] border border-green-100 bg-green-50 px-5 py-4 shadow-sm">
              <p className="font-black text-green-800">
                ✓ {quickListMessage}
              </p>
            </div>
          )}

        <section className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Comparador
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Encuentra tus productos
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Busca por nombre, marca o categoría y compara precios.
              </p>
            </div>

            {location.municipality &&
              location.state && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-black text-green-700">
                  <span>📍</span>

                  <span>
                    {location.municipality},{" "}
                    {location.state}
                  </span>
                </div>
              )}
          </div>

          <div className="relative mt-5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              🔍
            </span>

            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Ejemplo: leche, Bimbo, Coca Cola 600 ml"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />

            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-green-600" />
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-400">
              {totalCount.toLocaleString(
                "es-MX",
              )}{" "}
              producto
              {totalCount === 1
                ? ""
                : "s"}{" "}
              encontrado
              {totalCount === 1
                ? ""
                : "s"}
            </p>

            {(search ||
              category) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-black text-green-600 transition hover:text-green-700"
                >
                  Limpiar filtros
                </button>
              )}
          </div>
        </section>

        {items.length > 0 ? (
          <Link
            to="/lista"
            className="group block overflow-hidden rounded-[28px] border border-green-200 bg-gradient-to-r from-green-50 via-emerald-50/70 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-100 bg-white text-2xl shadow-sm">
                  🛒
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                    Tu lista
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-950">
                    Mi lista de compras
                  </p>

                  <p className="mt-1 text-sm font-bold text-green-700">
                    {items.length}{" "}
                    producto
                    {items.length === 1
                      ? ""
                      : "s"}{" "}
                    diferente
                    {items.length === 1
                      ? ""
                      : "s"}
                    {" · "}
                    {totalListUnits}{" "}
                    unidad
                    {totalListUnits === 1
                      ? ""
                      : "es"}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 font-black text-green-700">
                Ver mi lista
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            to="/crear-lista"
            className="group block rounded-[28px] border border-dashed border-green-300 bg-green-50/70 p-6 transition hover:border-green-400 hover:bg-green-50"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                  Tu lista
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Empieza tu próxima compra
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Agrega productos para comparar dónde te conviene comprar.
                </p>
              </div>

              <span className="font-black text-green-700">
                Crear mi lista →
              </span>
            </div>
          </Link>
        )}

        {children}

        <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Explora
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Explora por categorías
              </h2>

              {catalogTotal > 0 && (
                <p className="mt-1 text-sm text-slate-500">
                  {catalogTotal.toLocaleString(
                    "es-MX",
                  )}{" "}
                  productos disponibles en tu zona.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                handleCategoryChange(
                  ALL_CATEGORIES,
                );

                setShowAllProducts(
                  true,
                );
              }}
              className="w-fit text-sm font-black text-green-700 transition hover:text-green-800"
            >
              Ver todos →
            </button>
          </div>

          {categoriesLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                ),
              )}
            </div>
          ) : categoriesError ? (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {categoriesError}
            </div>
          ) : (
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() =>
                  handleCategoryChange(
                    ALL_CATEGORIES,
                  )
                }
                className={`group w-32 shrink-0 rounded-2xl border p-4 text-center transition ${
                  !category
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/50"
                }`}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-2xl">
                  🛒
                </div>

                <p className="mt-3 text-xs font-black text-slate-800">
                  Todas
                </p>

                <p className="mt-1 text-[10px] font-bold text-slate-400">
                  {catalogTotal.toLocaleString(
                    "es-MX",
                  )}
                </p>
              </button>

              {categories.map(
                (item) => {
                  const isActive =
                    category ===
                    item.category;

                  return (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() =>
                        handleCategoryChange(
                          item.category,
                        )
                      }
                      className={`group w-32 shrink-0 rounded-2xl border p-4 text-center transition ${
                        isActive
                          ? "border-green-500 bg-green-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/50"
                      }`}
                    >
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition group-hover:bg-green-50">
                        {categoryEmoji(
                          item.category,
                        )}
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs font-black text-slate-800">
                        {item.category}
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        {item.productCount.toLocaleString(
                          "es-MX",
                        )}
                      </p>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </section>

        {category && (
          <div className="flex flex-col gap-3 rounded-[24px] border border-green-100 bg-green-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Mostrando categoría
              </p>

              <h3 className="mt-1 text-lg font-black text-slate-900">
                {category}
              </h3>
            </div>

            <div className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-green-700">
              {totalCount.toLocaleString(
                "es-MX",
              )}{" "}
              producto
              {totalCount === 1
                ? ""
                : "s"}
            </div>
          </div>
        )}

        {!hasActiveSearch &&
          !hasActiveCategory &&
          !showAllProducts && (
            <button
              type="button"
              onClick={() =>
                setShowAllProducts(
                  true,
                )
              }
              className="group flex w-full items-center justify-between rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-left shadow-sm transition hover:border-green-200 hover:shadow-md"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                  Catálogo Listik
                </p>

                <p className="mt-1 text-lg font-black text-slate-950">
                  Explora todos los productos
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Tenemos{" "}
                  {(catalogTotal ||
                    totalCount).toLocaleString(
                    "es-MX",
                  )}{" "}
                  productos disponibles para comparar.
                </p>
              </div>

              <span className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white transition group-hover:bg-green-700">
                Ver catálogo ↓
              </span>
            </button>
          )}

        {shouldShowCatalog && (
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                  {hasActiveSearch
                    ? "Resultados de búsqueda"
                    : hasActiveCategory
                      ? "Categoría"
                      : "Catálogo"}
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {hasActiveSearch
                    ? `Resultados para "${search}"`
                    : hasActiveCategory
                      ? category
                      : "Todos los productos"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {totalCount.toLocaleString(
                    "es-MX",
                  )}{" "}
                  producto
                  {totalCount === 1
                    ? ""
                    : "s"}{" "}
                  encontrado
                  {totalCount === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              {!hasActiveSearch &&
                !hasActiveCategory &&
                showAllProducts && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllProducts(
                        false,
                      )
                    }
                    className="text-sm font-black text-green-600 hover:text-green-700"
                  >
                    Ocultar catálogo
                  </button>
                )}
            </div>

            {error &&
              products.length > 0 && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

            {!loading &&
            products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <div className="text-4xl">
                  🔎
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-800">
                  No encontramos productos
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Prueba con otro nombre, marca, categoría o presentación.
                </p>

                {(search ||
                  category) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-5 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-green-700"
                    >
                      Limpiar filtros
                    </button>
                  )}
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map(
                    (product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onCompare={handleCompare}
                        onAddToList={addProduct}
                      />
                    ),
                  )}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        void loadMore();
                      }}
                      disabled={loadingMore}
                      className="group rounded-2xl border border-slate-200 bg-white px-8 py-4 font-black text-slate-800 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingMore
                        ? "Cargando..."
                        : "Cargar 24 productos más"}

                      {!loadingMore && (
                        <span className="ml-2 inline-block transition-transform group-hover:translate-y-1">
                          ↓
                        </span>
                      )}
                    </button>
                  </div>
                )}

                <p className="mt-4 text-center text-xs font-semibold text-slate-400">
                  Mostrando{" "}
                  {products.length} de{" "}
                  {totalCount.toLocaleString(
                    "es-MX",
                  )}{" "}
                  productos
                </p>
              </>
            )}
          </section>
        )}
      </div>

      <ProductModal
        product={
          selectedComparison?.product ??
          null
        }
        presentationId={
          selectedComparison?.presentationId ??
          null
        }
        onClose={closeModal}
      />
    </>
  );
}
