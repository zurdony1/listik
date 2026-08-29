import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Car,
  CheckCircle2,
  Footprints,
  Fuel,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  ShoppingBasket,
  Store,
  Trophy,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useProducts,
} from "../hooks/useProducts";

import {
  getBasicBasket,
} from "../services/api/basicBasketApi";

import type {
  BasicBasketResponse,
  SmartPurchasePlan,
  TransportMode,
} from "../types/BasicBasket";

function money(
  value: number,
) {
  return value.toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function kilometers(
  value: number,
) {
  return `${value.toLocaleString(
    "es-MX",
    {
      maximumFractionDigits: 1,
    },
  )} km`;
}

function PlanCard({
  title,
  description,
  plan,
  featured = false,
}: {
  title: string;
  description: string;
  plan: SmartPurchasePlan | null;
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "rounded-3xl border border-green-300 bg-green-50 p-5 shadow-sm"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <p
        className={
          featured
            ? "text-xs font-black uppercase tracking-widest text-green-700"
            : "text-xs font-black uppercase tracking-widest text-slate-500"
        }
      >
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

      {plan ? (
        <>
          <p
            className={
              featured
                ? "mt-4 text-3xl font-black text-green-700"
                : "mt-4 text-3xl font-black text-slate-900"
            }
          >
            {money(
              plan.estimatedTotal,
            )}
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Productos
              </span>

              <strong className="text-slate-900">
                {money(
                  plan.productsTotal,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Traslado estimado
              </span>

              <strong className="text-slate-900">
                {money(
                  plan.travelCost,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Recorrido aprox.
              </span>

              <strong className="text-slate-900">
                {kilometers(
                  plan.travelDistanceKm,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Tiendas
              </span>

              <strong className="text-slate-900">
                {plan.storesCount}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Cobertura
              </span>

              <strong className="text-slate-900">
                {plan.coveredItems}/
                {plan.totalItems}
              </strong>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-500">
          Sin resultado para esta configuración.
        </p>
      )}
    </article>
  );
}

export default function BasicBasket() {
  const {
    location,
  } =
    useProducts();

  const [
    data,
    setData,
  ] =
    useState<
      BasicBasketResponse | null
    >(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    smartLoading,
    setSmartLoading,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    userPosition,
    setUserPosition,
  ] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(
      null,
    );

  const [
    locationError,
    setLocationError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    mode,
    setMode,
  ] =
    useState<
      TransportMode
    >(
      "car",
    );

  const [
    maxStores,
    setMaxStores,
  ] =
    useState<
      1 | 2 | 3
    >(
      2,
    );

  const [
    maxDistanceKm,
    setMaxDistanceKm,
  ] =
    useState(
      10,
    );

  const [
    gasPrice,
    setGasPrice,
  ] =
    useState(
      24.5,
    );

  const [
    carKmPerLiter,
    setCarKmPerLiter,
  ] =
    useState(
      12,
    );

  const [
    motoKmPerLiter,
    setMotoKmPerLiter,
  ] =
    useState(
      30,
    );

  useEffect(
    () => {
      if (
        !location.state ||
        !location.municipality
      ) {
        setLoading(
          false,
        );

        return;
      }

      let cancelled =
        false;

      async function load() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const result =
            await getBasicBasket(
              location.state as string,
              location.municipality as string,
            );

          if (
            !cancelled
          ) {
            setData(
              result,
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Error cargando canasta básica:",
            loadError,
          );

          if (
            !cancelled
          ) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "No se pudo calcular la canasta básica.",
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      location.state,
      location.municipality,
    ],
  );

  const coverage =
    useMemo(
      () => {
        if (
          !data ||
          data.totalItems ===
            0
        ) {
          return 0;
        }

        return Math.round(
          (
            data.matchedItems /
            data.totalItems
          ) *
            100,
        );
      },
      [data],
    );

  async function recalculateSmartPurchase(
    position:
      {
        latitude: number;
        longitude: number;
      } | null =
      userPosition,
  ) {
    if (
      !position ||
      !location.state ||
      !location.municipality
    ) {
      return;
    }

    try {
      setSmartLoading(
        true,
      );

      setLocationError(
        null,
      );

      const result =
        await getBasicBasket(
          location.state as string,
          location.municipality as string,
          {
            userLat:
              position.latitude,

            userLng:
              position.longitude,

            mode,

            maxStores,

            maxDistanceKm,

            gasPrice,

            carKmPerLiter,

            motoKmPerLiter,
          },
        );

      setData(
        result,
      );
    } catch (
      smartError
    ) {
      console.error(
        "Error calculando compra inteligente:",
        smartError,
      );

      setLocationError(
        smartError instanceof Error
          ? smartError.message
          : "No se pudo calcular la compra inteligente.",
      );
    } finally {
      setSmartLoading(
        false,
      );
    }
  }

  function requestLocation() {
    setLocationError(
      null,
    );

    if (
      !navigator.geolocation
    ) {
      setLocationError(
        "Tu navegador no permite obtener la ubicación.",
      );

      return;
    }

    setSmartLoading(
      true,
    );

    navigator.geolocation.getCurrentPosition(
      (
        position,
      ) => {
        const nextPosition = {
          latitude:
            position.coords
              .latitude,

          longitude:
            position.coords
              .longitude,
        };

        setUserPosition(
          nextPosition,
        );

        void recalculateSmartPurchase(
          nextPosition,
        );
      },
      (
        geoError,
      ) => {
        console.error(
          "Error de ubicación:",
          geoError,
        );

        setSmartLoading(
          false,
        );

        setLocationError(
          "No pudimos usar tu ubicación. Puedes permitirla en el navegador y volver a intentar.",
        );
      },
      {
        enableHighAccuracy:
          false,

        timeout:
          10000,

        maximumAge:
          300000,
      },
    );
  }

  const smart =
    data?.smartPurchase ??
    null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-green-600"
      >
        <ArrowLeft
          size={18}
        />
        Volver al comparador
      </Link>

      <section className="overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-white shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                Canasta básica
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
                24 productos de primera necesidad
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Calculamos los mejores precios disponibles para las cantidades de referencia de una canasta semanal de un hogar de 4 personas.
              </p>

              {location.state &&
                location.municipality && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-black text-green-700">
                    <MapPin
                      size={17}
                    />
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

            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-600 text-white shadow-md">
              <ShoppingBasket
                size={32}
              />
            </div>
          </div>
        </div>
      </section>

      {!location.state ||
      !location.municipality ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <MapPin
              size={22}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h2 className="font-black">
                Necesitamos tu ubicación
              </h2>

              <p className="mt-1 text-sm">
                Regresa al inicio y configura tu estado y municipio para calcular la canasta de tu zona.
              </p>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

          <p className="mt-4 font-black text-slate-700">
            Calculando tu canasta...
          </p>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={22}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h2 className="font-black">
                No pudimos calcular la canasta
              </h2>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-green-700">
                Precio mínimo
              </p>

              <p className="mt-2 text-3xl font-black text-green-700">
                {money(
                  data.bestCombinationTotal,
                )}
              </p>

              <p className="mt-2 text-sm text-green-800">
                Solo productos. Todavía no considera traslados.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Productos encontrados
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {data.matchedItems}/
                {data.totalItems}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Cobertura actual:{" "}
                {coverage}%
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Mejor tienda por cobertura
              </p>

              {data.stores[0] ? (
                <>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {
                      data.stores[0]
                        .storeName
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      data.stores[0]
                        .branchName
                    }
                  </p>

                  <p className="mt-3 text-lg font-black text-green-600">
                    {money(
                      data.stores[0]
                        .basketTotal,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      data.stores[0]
                        .coveredItems
                    }
                    /
                    {
                      data.stores[0]
                        .totalItems
                    }{" "}
                    productos disponibles
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Aún no hay una tienda con suficientes productos.
                </p>
              )}
            </article>
          </section>

          {/* ==================================
              COMPRA INTELIGENTE
          ================================== */}

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                    Compra inteligente Listik
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Precio + distancia + número de tiendas
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Listik busca una compra práctica, no solo el precio más bajo. Tu ubicación se usa para este cálculo y no se guarda desde esta pantalla.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    requestLocation
                  }
                  disabled={
                    smartLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LocateFixed
                    size={18}
                  />
                  {smartLoading
                    ? "Calculando..."
                    : userPosition
                    ? "Actualizar ubicación"
                    : "Usar mi ubicación"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50 p-6 md:grid-cols-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Transporte
                </label>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(
                    [
                      [
                        "car",
                        "Auto",
                        Car,
                      ],
                      [
                        "moto",
                        "Moto",
                        Navigation,
                      ],
                      [
                        "bike",
                        "Bici",
                        Bike,
                      ],
                      [
                        "walk",
                        "A pie",
                        Footprints,
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      label,
                      Icon,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setMode(
                            value,
                          )
                        }
                        className={
                          mode ===
                          value
                            ? "flex flex-col items-center gap-1 rounded-2xl border border-green-300 bg-green-50 px-2 py-3 text-xs font-black text-green-700"
                            : "flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-xs font-black text-slate-600"
                        }
                      >
                        <Icon
                          size={18}
                        />
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Máximo de tiendas
                </label>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      1,
                      2,
                      3,
                    ] as const
                  ).map(
                    (
                      value,
                    ) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setMaxStores(
                            value,
                          )
                        }
                        className={
                          maxStores ===
                          value
                            ? "rounded-2xl border border-green-300 bg-green-50 py-3 text-sm font-black text-green-700"
                            : "rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-600"
                        }
                      >
                        {value}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="distance"
                  className="text-xs font-black uppercase tracking-widest text-slate-500"
                >
                  Radio máximo
                </label>

                <select
                  id="distance"
                  value={
                    maxDistanceKm
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setMaxDistanceKm(
                        Number(
                          event.target.value,
                        ),
                      )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-green-400"
                >
                  <option value={3}>
                    3 km
                  </option>
                  <option value={5}>
                    5 km
                  </option>
                  <option value={10}>
                    10 km
                  </option>
                  <option value={15}>
                    15 km
                  </option>
                  <option value={25}>
                    25 km
                  </option>
                </select>
              </div>
            </div>

            {(mode ===
              "car" ||
              mode ===
                "moto") && (
              <div className="grid gap-4 border-b border-slate-100 p-6 md:grid-cols-2">
                <label className="block">
                  <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Fuel
                      size={15}
                    />
                    Gasolina $/L
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={
                      gasPrice
                    }
                    onChange={
                      (
                        event,
                      ) =>
                        setGasPrice(
                          Number(
                            event.target.value,
                          ),
                        )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-green-400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Rendimiento estimado
                  </span>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={
                        mode ===
                        "car"
                          ? carKmPerLiter
                          : motoKmPerLiter
                      }
                      onChange={
                        (
                          event,
                        ) => {
                          const value =
                            Number(
                              event.target.value,
                            );

                          if (
                            mode ===
                            "car"
                          ) {
                            setCarKmPerLiter(
                              value,
                            );
                          } else {
                            setMotoKmPerLiter(
                              value,
                            );
                          }
                        }
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-green-400"
                    />

                    <span className="whitespace-nowrap text-sm font-bold text-slate-500">
                      km/L
                    </span>
                  </div>
                </label>
              </div>
            )}

            <div className="p-6">
              {locationError && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  {locationError}
                </div>
              )}

              {userPosition && (
                <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <MapPin
                      size={17}
                      className="text-green-600"
                    />
                    Ubicación lista para calcular distancias.
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void recalculateSmartPurchase()
                    }
                    disabled={
                      smartLoading
                    }
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    Recalcular
                  </button>
                </div>
              )}

              {!userPosition ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Route
                    size={32}
                    className="mx-auto text-green-600"
                  />

                  <h3 className="mt-3 text-lg font-black text-slate-900">
                    Calcula tu compra real
                  </h3>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Compararemos el ahorro en productos contra el costo aproximado del traslado para evitar mandarte a tiendas demasiado lejanas.
                  </p>
                </div>
              ) : smartLoading ? (
                <div className="rounded-3xl bg-slate-50 p-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

                  <p className="mt-4 font-black text-slate-700">
                    Optimizando tu compra...
                  </p>
                </div>
              ) : smart?.available ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <PlanCard
                      featured
                      title="🏆 Recomendado"
                      description={`Hasta ${smart.maxStores} tiendas dentro de ${smart.maxDistanceKm} km.`}
                      plan={
                        smart.recommended
                      }
                    />

                    <PlanCard
                      title="🏪 Una sola tienda"
                      description="Menos vueltas, aunque algunos productos cuesten más."
                      plan={
                        smart.singleStore
                      }
                    />

                    <PlanCard
                      title="💰 Precio mínimo"
                      description="Busca los productos más baratos, aunque implique más tiendas."
                      plan={
                        smart.minimumPrice
                      }
                    />
                  </div>

                  {smart.savingsVsSingle !==
                    null &&
                    smart.savingsVsSingle >
                      0 && (
                      <div className="mt-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">
                        Listik estima un ahorro de{" "}
                        <strong>
                          {money(
                            smart.savingsVsSingle,
                          )}
                        </strong>{" "}
                        frente a la mejor opción de una sola tienda con la misma cobertura.
                      </div>
                    )}

                  {smart.recommended && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2">
                        <Navigation
                          size={19}
                          className="text-green-600"
                        />

                        <h3 className="text-lg font-black text-slate-900">
                          Tiendas recomendadas
                        </h3>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {smart.recommended.stores.map(
                          (
                            store,
                            index,
                          ) => (
                            <article
                              key={
                                store.branchId
                              }
                              className="rounded-2xl border border-slate-200 p-4"
                            >
                              <p className="text-xs font-black uppercase text-green-600">
                                Parada{" "}
                                {index +
                                  1}
                              </p>

                              <p className="mt-1 font-black text-slate-900">
                                {
                                  store.storeName
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  store.branchName
                                }
                              </p>

                              <p className="mt-2 text-xs font-bold text-slate-600">
                                Aprox.{" "}
                                {kilometers(
                                  store.distanceFromUserKm,
                                )}{" "}
                                desde tu ubicación
                              </p>
                            </article>
                          ),
                        )}
                      </div>

                      <p className="mt-4 text-xs leading-5 text-slate-400">
                        {smart.distanceNote}
                      </p>
                    </div>
                  )}
                </>
              ) : smart ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
                  {smart.reason ??
                    "No encontramos una combinación práctica dentro del radio elegido."}
                </div>
              ) : null}
            </div>
          </section>

          {/* ==================================
              PRODUCTOS
          ================================== */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                  Tu canasta
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Productos y mejores precios
                </h2>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                {data.totalItems} productos
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.items.map(
                (
                  item,
                ) => (
                  <article
                    key={
                      item.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-slate-900">
                          {
                            item.displayName
                          }
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            item.referencePresentation
                          }
                        </p>
                      </div>

                      {item.matched ? (
                        <CheckCircle2
                          size={21}
                          className="shrink-0 text-green-600"
                        />
                      ) : (
                        <AlertCircle
                          size={21}
                          className="shrink-0 text-amber-500"
                        />
                      )}
                    </div>

                    {item.bestPrice ? (
                      <div className="mt-4 rounded-2xl bg-green-50 p-4">
                        <p className="text-xs font-black uppercase text-green-700">
                          Mejor opción encontrada
                        </p>

                        <p className="mt-1 text-2xl font-black text-green-700">
                          {money(
                            item.bestPrice
                              .lineTotal,
                          )}
                        </p>

                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {
                            item.bestPrice
                              .storeName
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            item.bestPrice
                              .branchName
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {
                            item.bestPrice
                              .productName
                          }
                          {item.bestPrice
                            .presentationName
                            ? ` · ${item.bestPrice.presentationName}`
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                        No encontramos una presentación compatible en esta zona.
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>

          {data.stores.length >
            0 && (
            <section className="mt-8">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                  Comparación por tienda
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  ¿Dónde conviene comprar?
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Aquí ordenamos primero por cobertura y después por precio. Para considerar distancias usa Compra inteligente Listik.
                </p>
              </div>

              <div className="space-y-3">
                {data.stores
                  .slice(
                    0,
                    8,
                  )
                  .map(
                    (
                      store,
                      index,
                    ) => (
                      <article
                        key={
                          store.branchId
                        }
                        className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 font-black text-slate-700">
                            {index ===
                            0 ? (
                              <Trophy
                                size={21}
                                className="text-green-600"
                              />
                            ) : (
                              index +
                              1
                            )}
                          </div>

                          <div>
                            <p className="font-black text-slate-900">
                              {
                                store.storeName
                              }
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Store
                                size={13}
                              />
                              {
                                store.branchName
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-lg font-black text-slate-900">
                            {money(
                              store.basketTotal,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              store.coveredItems
                            }
                            /
                            {
                              store.totalItems
                            }{" "}
                            productos ·{" "}
                            {
                              store.coveragePercentage
                            }
                            %
                          </p>
                        </div>
                      </article>
                    ),
                  )}
              </div>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
