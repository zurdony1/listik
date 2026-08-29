import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  X,
  PackageSearch,
  PackagePlus,
  CheckCircle2,
} from "lucide-react";

import {
  getCatalogProducts,
  type CatalogProduct,
  type CatalogPresentation,
} from "../../services/api/catalogApi";

interface SelectedCatalogItem {
  product: CatalogProduct;
  presentation:
    | CatalogPresentation
    | null;
}

interface Props {
  open: boolean;

  rawName: string;

  onClose: () => void;

  onSelect: (
    selection: SelectedCatalogItem,
  ) => void;

  onCreateNew: () => void;
}
export default function ProductSearchModal({
  open,
  rawName,
  onClose,
  onSelect,
  onCreateNew,
}: Props) {
  const [
    products,
    setProducts,
  ] =
    useState<
      CatalogProduct[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<
      CatalogProduct | null
    >(null);

  const [
    selectedPresentationId,
    setSelectedPresentationId,
  ] =
    useState<string>("");

  /*
   * ==========================================
   * CARGAR CATÁLOGO
   * ==========================================
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled =
      false;

    async function loadCatalog() {
      try {
        setLoading(true);

        setError("");

        const response =
          await getCatalogProducts();

        if (cancelled) {
          return;
        }

        setProducts(
          response.products ??
            [],
        );

        /*
         * Empezamos buscando
         * automáticamente por el
         * texto que leyó OCR.
         */
        setSearch(
          rawName,
        );
      } catch (error) {
        console.error(
          "Error cargando catálogo:",
          error,
        );

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled =
        true;
    };
  }, [
    open,
    rawName,
  ]);

  /*
   * ==========================================
   * RESETEAR SELECCIÓN
   * ==========================================
   */

  useEffect(() => {
    if (!open) {
      setSelectedProduct(
        null,
      );

      setSelectedPresentationId(
        "",
      );
    }
  }, [open]);

  /*
   * ==========================================
   * FILTRAR
   * ==========================================
   */

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (
        !normalizedSearch
      ) {
        return products;
      }

      return products.filter(
        (product) => {
          const presentationText =
            (
              product.presentations ??
              []
            )
              .map(
                (
                  presentation,
                ) =>
                  presentation.presentationName,
              )
              .join(
                " ",
              );

          const searchable =
            [
              product.name,
              product.brand,
              product.category,
              product.barcode,
              presentationText,
            ]
              .filter(
                Boolean,
              )
              .join(
                " ",
              )
              .toLowerCase();

          return searchable.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      products,
      search,
    ]);

  /*
   * ==========================================
   * SELECCIONAR PRODUCTO
   * ==========================================
   */

  function selectProduct(
    product: CatalogProduct,
  ) {
    setSelectedProduct(
      product,
    );

    const firstPresentation =
      product.presentations?.[0];

    setSelectedPresentationId(
      firstPresentation?.id ??
        "",
    );
  }

  /*
   * ==========================================
   * PRESENTACIÓN SELECCIONADA
   * ==========================================
   */

  const selectedPresentation =
    useMemo(() => {
      if (
        !selectedProduct
      ) {
        return null;
      }

      return (
        selectedProduct.presentations?.find(
          (
            presentation,
          ) =>
            presentation.id ===
            selectedPresentationId,
        ) ??
        null
      );
    }, [
      selectedProduct,
      selectedPresentationId,
    ]);

  /*
   * ==========================================
   * CONFIRMAR
   * ==========================================
   */

  function handleConfirm() {
    if (
      !selectedProduct
    ) {
      return;
    }

    onSelect({
      product:
        selectedProduct,

      presentation:
        selectedPresentation,
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={
        onClose
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-search-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Listik Catalog
            </p>

            <h2
              id="catalog-search-title"
              className="mt-1 text-2xl font-black text-slate-900"
            >
              Buscar producto existente
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Texto detectado:
            </p>

            <p className="mt-1 font-black text-slate-800">
              “{rawName}”
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Cerrar búsqueda"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X
              size={20}
            />
          </button>
        </div>

        {/* CONTENIDO */}

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {/* BUSCADOR */}

          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Busca por nombre, marca o presentación..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* LOADING */}

          {loading && (
            <div className="py-12 text-center">
              <p className="font-bold text-slate-500">
                Cargando catálogo...
              </p>
            </div>
          )}

          {/* ERROR */}

          {!loading &&
            error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-700">
                  {error}
                </p>
              </div>
            )}

          {/* SIN RESULTADOS */}

          {/* SIN RESULTADOS */}

{!loading &&
  !error &&
  filteredProducts.length === 0 && (
    <div className="py-12 text-center">
      <PackageSearch
        size={38}
        className="mx-auto text-slate-300"
      />

      <p className="mt-4 font-black text-slate-700">
        No encontramos coincidencias
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Prueba escribiendo parte del nombre o marca.
      </p>

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="font-black text-green-900">
          ¿Este producto todavía no existe en Listik?
        </p>

        <p className="mt-1 text-sm text-green-700">
          Puedes crearlo y enseñarle a Listik a reconocerlo en futuros tickets.
        </p>

        <button
          type="button"
          onClick={onCreateNew}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
        >
          <PackagePlus size={18} />

          Crear producto nuevo
        </button>
      </div>
    </div>
  )}

          {/* RESULTADOS */}

          {!loading &&
            !error &&
            filteredProducts.length >
              0 && (
              <div className="mt-5 space-y-3">
                {filteredProducts.map(
                  (
                    product,
                  ) => {
                    const selected =
                      selectedProduct?.id ===
                      product.id;

                    return (
                      <button
                        key={
                          product.id
                        }
                        type="button"
                        onClick={() =>
                          selectProduct(
                            product,
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-green-400 bg-green-50 ring-2 ring-green-100"
                            : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-black text-slate-900">
                              {
                                product.name
                              }
                            </p>

                            {product.brand && (
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {
                                  product.brand
                                }
                              </p>
                            )}

                            {product.category && (
                              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                {
                                  product.category
                                }
                              </span>
                            )}
                          </div>

                          {selected && (
                            <CheckCircle2
                              size={22}
                              className="shrink-0 text-green-600"
                            />
                          )}
                        </div>

                        {product.presentations &&
                          product.presentations.length >
                            0 && (
                            <p className="mt-3 text-xs font-semibold text-slate-400">
                              {
                                product.presentations.length
                              }{" "}
                              presentación
                              {product.presentations.length ===
                              1
                                ? ""
                                : "es"}
                            </p>
                          )}
                      </button>
                    );
                  },
                )}
              </div>
            )}

          {/* PRESENTACIÓN */}

          {selectedProduct && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-green-700">
                Producto seleccionado
              </p>

              <p className="mt-2 text-lg font-black text-slate-900">
                {
                  selectedProduct.name
                }
              </p>

              {selectedProduct.presentations &&
              selectedProduct.presentations.length >
                0 ? (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Presentación
                  </label>

                  <select
                    value={
                      selectedPresentationId
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedPresentationId(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-green-500"
                  >
                    {selectedProduct.presentations.map(
                      (
                        presentation,
                      ) => (
                        <option
                          key={
                            presentation.id
                          }
                          value={
                            presentation.id
                          }
                        >
                          {
                            presentation.presentationName
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  Este producto todavía no tiene presentaciones registradas.
                </p>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={
              !selectedProduct
            }
            onClick={
              handleConfirm
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2
              size={18}
            />

            Usar este producto
          </button>
        </div>
      </div>
    </div>
  );
}