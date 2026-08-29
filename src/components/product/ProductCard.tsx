import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "../ui/Button";
import Card from "../ui/Card";

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

import {
  ShoppingCart,
  Trophy,
  MapPin,
  Wallet,
} from "../ui/Icons";

/*
 * ==========================================
 * PROPS
 * ==========================================
 */

interface Props {
  product: Product;

  onCompare: (
    product: Product,
    presentationId:
      | string
      | null,
  ) => void;

  onAddToList: (
    product: Product,
    presentationId:
      | string
      | null,
    prices: ProductPrice[],
  ) => void;
}

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

export default function ProductCard({
  product,
  onCompare,
  onAddToList,
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
   * PRESENTACIONES
   * ========================================
   */

  const presentations =
    product.presentations ??
    [];

  const [
    selectedPresentationId,
    setSelectedPresentationId,
  ] =
    useState(
      presentations[0]?.id ??
        "",
    );

  /*
   * Si cambia el producto,
   * seleccionamos su primera presentación.
   */

  useEffect(
    () => {
      setSelectedPresentationId(
        presentations[0]?.id ??
          "",
      );
    },
    [
      product.id,
    ],
  );

  /*
   * ========================================
   * PRESENTACIÓN SELECCIONADA
   * ========================================
   */

  const selectedPresentation =
    useMemo(
      () =>
        presentations.find(
          (
            presentation,
          ) =>
            presentation.id ===
            selectedPresentationId,
        ) ??
        presentations[0] ??
        null,
      [
        presentations,
        selectedPresentationId,
      ],
    );

  /*
   * ========================================
   * PRECIOS REALES
   * ========================================
   */

  const [
    ticketPrices,
    setTicketPrices,
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
      true,
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
   * CONSULTAR PRECIOS DE LA PRESENTACIÓN
   * ========================================
   *
   * IMPORTANTE:
   *
   * Ahora enviamos:
   *
   * productId
   * presentationId
   * state
   * municipality
   *
   * Así el backend únicamente devuelve
   * precios de la ubicación del usuario.
   */

  useEffect(
    () => {
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

          setTicketPrices(
            [],
          );

          /*
           * ==================================
           * SIN UBICACIÓN
           * ==================================
           */

          if (
            !state ||
            !municipality
          ) {
            if (
              !cancelled
            ) {
              setPriceError(
                "Configura tu ubicación para consultar precios locales.",
              );

              setTicketPrices(
                [],
              );
            }

            return;
          }

          /*
           * ==================================
           * CONSULTAR BACKEND
           * ==================================
           */

          const response =
            await getProductPrices(
              product.id,
              {
                presentationId:
                  selectedPresentation
                    ?.id ??
                  null,

                state,

                municipality,
              },
            );

          if (
            cancelled
          ) {
            return;
          }

          setTicketPrices(
            response.data.prices ??
              [],
          );

          /*
           * ==================================
           * DEBUG
           * ==================================
           */

          console.log(
            "💳 PRECIOS LOCALES DE TARJETA:",
            {
              product:
                product.name,

              presentation:
                selectedPresentation
                  ?.presentationName ??
                null,

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
            `Error cargando precios de ${product.name}:`,
            error,
          );

          if (
            !cancelled
          ) {
            setTicketPrices(
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
      product.id,
      product.name,
      selectedPresentation?.id,
      selectedPresentation?.presentationName,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * ORDENAR PRECIOS
   * ========================================
   */

  const sortedTicketPrices =
    useMemo(
      () =>
        [
          ...ticketPrices,
        ].sort(
          (
            a,
            b,
          ) =>
            a.price -
            b.price,
        ),
      [
        ticketPrices,
      ],
    );

  const bestTicketPrice =
    sortedTicketPrices[0];

  const mostExpensiveTicketPrice =
    sortedTicketPrices[
      sortedTicketPrices.length -
        1
    ];

  const ticketSaving =
    bestTicketPrice &&
    mostExpensiveTicketPrice
      ? mostExpensiveTicketPrice.price -
        bestTicketPrice.price
      : 0;

  /*
   * ========================================
   * PRECIOS LEGACY
   * ========================================
   */

  const sortedLegacyPrices =
    useMemo(
      () =>
        [
          ...product.prices,
        ].sort(
          (
            a,
            b,
          ) =>
            a.price -
            b.price,
        ),
      [
        product.prices,
      ],
    );

  const bestLegacyPrice =
    sortedLegacyPrices[0];

  const bestLegacyStore =
    bestLegacyPrice?.stores;

  const mostExpensiveLegacy =
    sortedLegacyPrices[
      sortedLegacyPrices.length -
        1
    ];

  const legacySaving =
    bestLegacyPrice &&
    mostExpensiveLegacy
      ? mostExpensiveLegacy.price -
        bestLegacyPrice.price
      : 0;

  /*
   * Solo usamos precios legacy
   * si el producto todavía no
   * tiene presentaciones.
   */

  const canUseLegacyPrices =
    presentations.length ===
    0;

  const hasTicketPrices =
    sortedTicketPrices.length >
    0;

  const hasLegacyPrices =
    canUseLegacyPrices &&
    sortedLegacyPrices.length >
      0;

  const hasAnyPrice =
    hasTicketPrices ||
    hasLegacyPrices;

  /*
   * ========================================
   * FECHA SIN DESFASE HORARIO
   * ========================================
   */

  function formatObservedDate(
    value:
      | string
      | null,
  ) {
    if (
      !value
    ) {
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

  const observedDate =
    bestTicketPrice
      ? formatObservedDate(
          bestTicketPrice.observedAt,
        )
      : null;

  /*
   * ========================================
   * UI
   * ========================================
   */

  return (
    <Card>
      {/* ==================================
          ENCABEZADO
      ================================== */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
          <ShoppingCart
            size={
              22
            }
            className="text-green-600"
          />
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {product.category ||
            "Sin categoría"}
        </span>
      </div>

      {/* ==================================
          PRODUCTO
      ================================== */}

      <h2 className="mt-5 text-xl font-black text-slate-900">
        {
          product.name
        }
      </h2>

      <p className="mt-1 text-slate-500">
        {product.brand ||
          "Marca no especificada"}
      </p>

      {/* ==================================
          PRESENTACIÓN
      ================================== */}

      {presentations.length >
        0 && (
        <div className="mt-5">
          <label
            htmlFor={`presentation-${product.id}`}
            className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500"
          >
            Presentación
          </label>

          <select
            id={`presentation-${product.id}`}
            value={
              selectedPresentation
                ?.id ??
              ""
            }
            onChange={(
              event,
            ) =>
              setSelectedPresentationId(
                event.target
                  .value,
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            {presentations.map(
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

          {selectedPresentation && (
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
          )}
        </div>
      )}

      {/* ==================================
          CARGANDO
      ================================== */}

      {loadingPrices && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />

          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200" />

          <p className="mt-3 text-xs font-semibold text-slate-400">
            Consultando precios...
          </p>
        </div>
      )}

      {/* ==================================
          MEJOR PRECIO REAL
      ================================== */}

      {!loadingPrices &&
        bestTicketPrice && (
          <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-green-700">
              <Trophy
                size={
                  17
                }
              />

              Mejor precio
            </div>

            <p className="mt-2 text-3xl font-black text-green-700">
              $
              {bestTicketPrice.price.toLocaleString(
                "es-MX",
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2,
                },
              )}
            </p>

            {/* TIENDA */}

            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <MapPin
                size={
                  16
                }
              />

              <span>
                {
                  bestTicketPrice.storeName
                }
              </span>
            </div>

            {/* SUCURSAL */}

            {bestTicketPrice.branch && (
              <p className="mt-1 pl-6 text-xs font-semibold text-slate-500">
                {
                  bestTicketPrice.branch
                }
              </p>
            )}

            {/* FUENTE + FECHA */}

            <div className="mt-4 flex flex-wrap gap-2">
              {bestTicketPrice.source ===
                "ticket" && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-green-700">
                  🧾 Ticket
                </span>
              )}

              {bestTicketPrice.source ===
                "profeco" && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
                  🏛️ PROFECO
                </span>
              )}

              {bestTicketPrice.source ===
                "manual" && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">
                  ✏️ Manual
                </span>
              )}

              {!bestTicketPrice.source && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                  Fuente no especificada
                </span>
              )}

              {observedDate && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                  Actualizado{" "}
                  {
                    observedDate
                  }
                </span>
              )}
            </div>

            {/* AHORRO */}

            {ticketSaving >
              0 && (
              <div className="mt-4 flex items-center gap-2 border-t border-green-100 pt-4 text-sm font-bold text-green-700">
                <Wallet
                  size={
                    17
                  }
                />

                Ahorras hasta $
                {ticketSaving.toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits:
                      2,

                    maximumFractionDigits:
                      2,
                  },
                )}
              </div>
            )}
          </div>
        )}

      {/* ==================================
          PRECIOS LEGACY
      ================================== */}

      {!loadingPrices &&
        !hasTicketPrices &&
        bestLegacyPrice &&
        canUseLegacyPrices && (
          <div className="mt-5 rounded-2xl bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-green-700">
              <Trophy
                size={
                  17
                }
              />

              Mejor precio
            </div>

            <p className="mt-2 text-3xl font-black text-green-700">
              $
              {bestLegacyPrice.price.toLocaleString(
                "es-MX",
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2,
                },
              )}
            </p>

            {bestLegacyStore && (
              <>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <MapPin
                    size={
                      16
                    }
                  />

                  <span className="font-bold">
                    {
                      bestLegacyStore.name
                    }
                  </span>
                </div>

                {bestLegacyStore.city && (
                  <p className="mt-1 pl-6 text-xs text-slate-500">
                    {
                      bestLegacyStore.city
                    }

                    {bestLegacyStore.state
                      ? `, ${bestLegacyStore.state}`
                      : ""}
                  </p>
                )}
              </>
            )}

            {legacySaving >
              0 && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-green-700">
                <Wallet
                  size={
                    17
                  }
                />

                Ahorras hasta $
                {legacySaving.toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits:
                      2,

                    maximumFractionDigits:
                      2,
                  },
                )}
              </div>
            )}
          </div>
        )}

      {/* ==================================
          SIN PRECIO
      ================================== */}

      {!loadingPrices &&
        !hasAnyPrice && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
            <p className="font-black text-slate-600">
              Sin precios registrados
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {selectedPresentation
                ? `Todavía no tenemos precios para ${selectedPresentation.presentationName}.`
                : "Todavía no tenemos observaciones para este producto."}
            </p>
          </div>
        )}

      {/* ==================================
          ERROR
      ================================== */}

      {!loadingPrices &&
        priceError && (
          <p className="mt-3 text-xs text-slate-400">
            No se pudieron actualizar
            los precios en este momento.
          </p>
        )}

      {/* ==================================
          COMPARACIÓN
      ================================== */}

      <Button
        type="button"
        className="mt-5 w-full"
        onClick={() =>
          onCompare(
            product,

            selectedPresentation
              ?.id ??
              null,
          )
        }
        disabled={
          !hasAnyPrice
        }
      >
        Ver comparación
      </Button>

      {/* ==================================
          AGREGAR A LISTA
      ================================== */}

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        onClick={() =>
          onAddToList(
            product,

            selectedPresentation
              ?.id ??
              null,

            /*
             * Enviamos únicamente
             * los precios locales de
             * ESTA presentación.
             */

            sortedTicketPrices,
          )
        }
        disabled={
          presentations.length >
            0 &&
          !selectedPresentation
        }
      >
        ＋ Agregar a mi lista
      </Button>
    </Card>
  );
}