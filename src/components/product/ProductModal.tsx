import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "../ui/Button";

import type {
  Product,
} from "../../types/Product";

import {
  getProductPrices,
  type ProductPrice,
} from "../../services/api/productPriceApi";

import {
  useAuth,
} from "../../contexts/AuthContext";

/*
 * ==========================================
 * PROPS
 * ==========================================
 */

interface Props {
  product:
    | Product
    | null;

  presentationId:
    | string
    | null;

  onClose: () => void;
}

/*
 * ==========================================
 * LIMPIEZA DE TEXTO
 * ==========================================
 */

function cleanText(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

/*
 * ==========================================
 * NOMBRES GENÉRICOS DE CADENA
 * ==========================================
 */

function isGenericStoreName(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    cleanText(
      value,
    ).toLowerCase();

  return [
    "minisuper",
    "mini super",
    "supermercado",
    "tienda",
    "tienda de autoservicio",
    "autoservicio",
  ].includes(
    normalized,
  );
}

/*
 * ==========================================
 * EXTRAER CADENA DESDE SUCURSAL
 * ==========================================
 *
 * Ejemplo:
 *
 * Circle K Sucursal 1179
 *
 * ↓
 *
 * Circle K
 */

function getStoreNameFromBranch(
  branch:
    | string
    | null
    | undefined,
) {
  const text =
    cleanText(
      branch,
    );

  if (!text) {
    return null;
  }

  const match =
    text.match(
      /^(.+?)\s+sucursal\b/i,
    );

  if (
    match?.[1]
  ) {
    return cleanText(
      match[1],
    );
  }

  return null;
}

/*
 * ==========================================
 * LIMPIAR NOMBRE DE SUCURSAL
 * ==========================================
 */

function cleanBranchName(
  branch:
    | string
    | null
    | undefined,

  displayStoreName:
    | string
    | null
    | undefined,
) {
  let text =
    cleanText(
      branch,
    );

  const storeName =
    cleanText(
      displayStoreName,
    );

  if (!text) {
    return null;
  }

  /*
   * Quitamos la cadena repetida
   * al principio.
   */

  if (
    storeName
  ) {
    const escapedStoreName =
      storeName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    text =
      text.replace(
        new RegExp(
          `^${escapedStoreName}\\s*`,
          "i",
        ),
        "",
      );
  }

  /*
   * Quitamos "Sucursal"
   * si queda al inicio.
   */

  text =
    text.replace(
      /^sucursal\s*/i,
      "",
    );

  text =
    cleanText(
      text,
    );

  if (!text) {
    return null;
  }

  return text;
}

/*
 * ==========================================
 * PRESENTACIÓN LIMPIA DE TIENDA
 * ==========================================
 */

function getStoreDisplay(
  storeName:
    | string
    | null
    | undefined,

  branch:
    | string
    | null
    | undefined,
) {
  const originalStoreName =
    cleanText(
      storeName,
    );

  const originalBranch =
    cleanText(
      branch,
    );

  const branchStoreName =
    getStoreNameFromBranch(
      originalBranch,
    );

  const displayStoreName =
    isGenericStoreName(
      originalStoreName,
    ) &&
    branchStoreName
      ? branchStoreName
      : originalStoreName ||
        branchStoreName ||
        "Tienda";

  const displayBranch =
    cleanBranchName(
      originalBranch,
      displayStoreName,
    );

  return {
    storeName:
      displayStoreName,

    branch:
      displayBranch,
  };
}

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

export default function ProductModal({
  product,
  presentationId,
  onClose,
}: Props) {
  /*
   * ========================================
   * USUARIO / UBICACIÓN
   * ========================================
   */

  const {
    profile,
  } =
    useAuth();

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
   * PRECIOS
   * ========================================
   */

  const [
    prices,
    setPrices,
  ] =
    useState<
      ProductPrice[]
    >(
      [],
    );

  const [
    loadingPrices,
    setLoadingPrices,
  ] =
    useState(
      false,
    );

  const [
    priceError,
    setPriceError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * PRESENTACIÓN SELECCIONADA
   * ========================================
   */

  const selectedPresentation =
    useMemo(
      () => {
        if (
          !product ||
          !presentationId
        ) {
          return null;
        }

        return (
          product.presentations ??
          []
        ).find(
          (
            presentation,
          ) =>
            presentation.id ===
            presentationId,
        ) ??
        null;
      },
      [
        product,
        presentationId,
      ],
    );

  /*
   * ========================================
   * CARGAR PRECIOS
   * ========================================
   */

  useEffect(
    () => {
      if (
        !product
      ) {
        setPrices(
          [],
        );

        setPriceError(
          null,
        );

        setLoadingPrices(
          false,
        );

        return;
      }

      const currentProduct =
        product;

      let cancelled =
        false;

      async function loadPrices() {
        try {
          setLoadingPrices(
            true,
          );

          setPriceError(
            null,
          );

          setPrices(
            [],
          );

          /*
           * ==================================
           * VALIDAR UBICACIÓN
           * ==================================
           */

          if (
            !state ||
            !municipality
          ) {
            throw new Error(
              "No hay una ubicación configurada para comparar precios.",
            );
          }

          /*
           * ==================================
           * CONSULTA LOCAL
           * ==================================
           *
           * Ahora enviamos:
           *
           * productId
           * presentationId
           * state
           * municipality
           */

          const response =
            await getProductPrices(
              currentProduct.id,
              {
                presentationId,

                state,

                municipality,
              },
            );

          if (
            cancelled
          ) {
            return;
          }

          setPrices(
            response.data.prices ??
              [],
          );

          console.log(
            "💵 COMPARACIÓN LOCAL CARGADA:",
            {
              product:
                currentProduct.name,

              presentationId,

              state,

              municipality,

              prices:
                response.data.prices
                  ?.length ??
                0,
            },
          );
        } catch (
          error
        ) {
          console.error(
            `Error cargando comparación de ${currentProduct.name}:`,
            error,
          );

          if (
            !cancelled
          ) {
            setPrices(
              [],
            );

            setPriceError(
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los precios.",
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoadingPrices(
              false,
            );
          }
        }
      }

      void loadPrices();

      return () => {
        cancelled =
          true;
      };
    },
    [
      product,
      presentationId,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * ORDENAR PRECIOS
   * ========================================
   */

  const sortedPrices =
    useMemo(
      () =>
        [
          ...prices,
        ].sort(
          (
            a,
            b,
          ) =>
            a.price -
            b.price,
        ),
      [
        prices,
      ],
    );

  /*
   * ========================================
   * FORMATEAR FECHA
   * ========================================
   */

  function formatObservedDate(
    value:
      | string
      | null,
  ) {
    if (!value) {
      return null;
    }

    const datePart =
      value.slice(
        0,
        10,
      );

    const [
      year,
      month,
      day,
    ] =
      datePart.split(
        "-",
      );

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    return `${day}/${month}/${year}`;
  }

  /*
   * ========================================
   * BADGE DE FUENTE
   * ========================================
   */

  function getSourceBadge(
    source:
      | string
      | null,
  ) {
    if (
      source ===
      "ticket"
    ) {
      return (
        <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-black text-green-700">
          🧾 Ticket
        </span>
      );
    }

    if (
      source ===
      "profeco"
    ) {
      return (
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
          🏛️ PROFECO
        </span>
      );
    }

    if (
      source ===
      "manual"
    ) {
      return (
        <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-700">
          ✏️ Manual
        </span>
      );
    }

    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
        Fuente desconocida
      </span>
    );
  }

  /*
   * ========================================
   * SIN PRODUCTO
   * ========================================
   */

  if (
    !product
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={
        onClose
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {/* ==================================
            HEADER
        ================================== */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Comparación de precios
            </p>

            <h2
              id="comparison-title"
              className="mt-1 text-2xl font-extrabold text-slate-900"
            >
              {
                product.name
              }
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {product.brand ||
                "Marca no especificada"}
            </p>

            {/* PRESENTACIÓN */}

            {selectedPresentation && (
              <div className="mt-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Presentación
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {
                    selectedPresentation.presentationName
                  }
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPresentation.sizeValue !==
                    null &&
                    selectedPresentation.sizeUnit && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {
                          selectedPresentation.sizeValue
                        }{" "}
                        {
                          selectedPresentation.sizeUnit
                        }
                      </span>
                    )}

                  {selectedPresentation.unitsPerPackage >
                    1 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {
                          selectedPresentation.unitsPerPackage
                        }{" "}
                        unidades
                      </span>
                    )}

                  {selectedPresentation.packageType && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {
                        selectedPresentation.packageType
                      }
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Cerrar comparación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        {/* ==================================
            CARGANDO
        ================================== */}

        {loadingPrices && (
          <div className="mt-6 space-y-3">
            {[
              1,
              2,
              3,
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />

                  <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              ),
            )}
          </div>
        )}

        {/* ==================================
            PRECIOS
        ================================== */}

        {!loadingPrices &&
          sortedPrices.length >
            0 && (
            <>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Precios encontrados
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Misma presentación, ordenados de menor a mayor.
                  </p>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                  🛒 Precios disponibles
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {sortedPrices.map(
                  (
                    item,
                    index,
                  ) => {
                    const observedDate =
                      formatObservedDate(
                        item.observedAt,
                      );

                    const storeDisplay =
                      getStoreDisplay(
                        item.storeName,
                        item.branch,
                      );

                    return (
                      <div
                        key={
                          item.id
                        }
                        className={`rounded-2xl border p-4 ${
                          index ===
                          0
                            ? "border-green-300 bg-green-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* TIENDA */}

                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                              {index ===
                              0
                                ? "🥇"
                                : index ===
                                    1
                                  ? "🥈"
                                  : index ===
                                      2
                                    ? "🥉"
                                    : "🏪"}
                            </div>

                            <div>
                              <p className="font-bold text-slate-800">
                                {
                                  storeDisplay.storeName
                                }
                              </p>

                              {storeDisplay.branch && (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {
                                    storeDisplay.branch
                                  }
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {getSourceBadge(
                                  item.source,
                                )}

                                {observedDate && (
                                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                    Actualizado{" "}
                                    {
                                      observedDate
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* PRECIO */}

                          <div className="text-right">
                            <p
                              className={`text-xl font-extrabold ${
                                index ===
                                0
                                  ? "text-green-700"
                                  : "text-slate-800"
                              }`}
                            >
                              $
                              {item.price.toLocaleString(
                                "es-MX",
                                {
                                  minimumFractionDigits:
                                    2,

                                  maximumFractionDigits:
                                    2,
                                },
                              )}
                            </p>

                            {index ===
                              0 && (
                              <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-green-600">
                                Mejor precio
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* ==================================
                  AHORRO
              ================================== */}

              {sortedPrices.length >
                1 && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Ahorro posible
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-800">
                    Hasta $
                    {(
                      sortedPrices[
                        sortedPrices.length -
                          1
                      ].price -
                      sortedPrices[0]
                        .price
                    ).toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits:
                          2,

                        maximumFractionDigits:
                          2,
                      },
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Diferencia entre la opción más barata y la más cara disponible para esta presentación.
                  </p>
                </div>
              )}
            </>
          )}

        {/* ==================================
            SIN PRECIOS
        ================================== */}

        {!loadingPrices &&
          sortedPrices.length ===
            0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-black text-slate-700">
                No hay precios para esta presentación
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Conforme entren datos de PROFECO, tickets y otras fuentes, aparecerán aquí las tiendas que venden exactamente esta presentación.
              </p>
            </div>
          )}

        {/* ==================================
            ERROR
        ================================== */}

        {!loadingPrices &&
          priceError && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-700">
                No pudimos actualizar la comparación.
              </p>

              <p className="mt-1 text-xs text-amber-600">
                {
                  priceError
                }
              </p>
            </div>
          )}

        {/* ==================================
            CERRAR
        ================================== */}

        <Button
          type="button"
          variant="secondary"
          className="mt-6 w-full"
          onClick={
            onClose
          }
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}