import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Car,
  Footprints,
  Fuel,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShoppingCart,
  Trophy,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  useMemo,
  useState,
} from "react";

import {
  useShoppingList,
} from "../hooks/useShoppingList";

import {
  optimizeShoppingList,
} from "../services/smartPurchaseService";

import type {
  SmartPurchasePlan,
  SmartPurchaseResult,
  SmartTransportMode,
} from "../types/SmartPurchase";

function money(
  value:
    number,
) {
  return value.toLocaleString(
    "es-MX",
    {
      style:
        "currency",

      currency:
        "MXN",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );
}

function kilometers(
  value:
    number,
) {
  return `${value.toLocaleString(
    "es-MX",
    {
      maximumFractionDigits:
        1,
    },
  )} km`;
}

function PlanCard({
  title,
  description,
  plan,
  featured = false,
  missingCount = 0,
}: {
  title: string;
  description: string;
  plan: SmartPurchasePlan | null;
  featured?: boolean;
  missingCount?: number;
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

      {plan && (
        <div className="mt-3">
          {plan.coveredItems ===
          plan.totalItems ? (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
              ✅ Lista completa
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
              ⚠️ Falta {missingCount} producto
              {missingCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {plan ? (
        <>
          <p
            className={
              featured
                ? "mt-4 text-3xl font-black text-green-700"
                : "mt-4 text-3xl font-black text-slate-950"
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

              <strong>
                {money(
                  plan.productsTotal,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Traslado
              </span>

              <strong>
                {money(
                  plan.travelCost,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Recorrido aprox.
              </span>

              <strong>
                {kilometers(
                  plan.travelDistanceKm,
                )}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Tiendas
              </span>

              <strong>
                {plan.storesCount}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">
                Cobertura
              </span>

              <strong>
                {plan.coveredItems}/
                {plan.totalItems}
              </strong>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-500">
          Sin una opción compatible.
        </p>
      )}
    </article>
  );
}


function saveSmartPurchasePlan(
  plan: SmartPurchasePlan,
) {
  sessionStorage.removeItem(
    "listik_selected_store",
  );

  sessionStorage.setItem(
    "listik_smart_purchase_plan",
    JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      productsTotal: plan.productsTotal,
      travelCost: plan.travelCost,
      travelDistanceKm: plan.travelDistanceKm,
      estimatedTotal: plan.estimatedTotal,
      stores: plan.stores,
      assignments: plan.itemAssignments,
    }),
  );
}

export default function SmartPurchase() {
  const {
    items,
    loadingPersistentList,
    persistenceError,
  } =
    useShoppingList();

  const [
    mode,
    setMode,
  ] =
    useState<
      SmartTransportMode
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
    result,
    setResult,
  ] =
    useState<
      SmartPurchaseResult | null
    >(
      null,
    );

  const [
    calculating,
    setCalculating,
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

  const totalUnits =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [
        items,
      ],
    );

  async function calculate(
    position:
      {
        latitude:
          number;

        longitude:
          number;
      } | null =
      userPosition,
  ) {
    if (
      !position
    ) {
      setError(
        "Primero necesitamos tu ubicación para calcular distancias.",
      );

      return;
    }

    try {
      setCalculating(
        true,
      );

      setError(
        null,
      );

      const optimized =
        await optimizeShoppingList(
          items,
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

      setResult(
        optimized,
      );
    } catch (
      calculateError
    ) {
      console.error(
        "Error optimizando Mi lista:",
        calculateError,
      );

      setError(
        calculateError instanceof Error
          ? calculateError.message
          : "No se pudo optimizar tu lista.",
      );
    } finally {
      setCalculating(
        false,
      );
    }
  }

  function requestLocation() {
    setError(
      null,
    );

    if (
      !navigator.geolocation
    ) {
      setError(
        "Tu navegador no permite obtener la ubicación.",
      );

      return;
    }

    setCalculating(
      true,
    );

    navigator.geolocation.getCurrentPosition(
      (
        position,
      ) => {
        const next = {
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,
        };

        setUserPosition(
          next,
        );

        void calculate(
          next,
        );
      },
      (
        locationError,
      ) => {
        console.error(
          "Error obteniendo ubicación:",
          locationError,
        );

        setCalculating(
          false,
        );

        setError(
          "No pudimos obtener tu ubicación. Revisa el permiso de ubicación del navegador e intenta nuevamente.",
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

  const recommendedByStore =
    useMemo(
      () => {
        const plan =
          result?.recommended;

        if (
          !plan
        ) {
          return [];
        }

        return plan.stores.map(
          (
            store,
          ) => ({
            ...store,

            items:
              plan.itemAssignments.filter(
                (
                  assignment,
                ) =>
                  assignment.branchId ===
                  store.branchId,
              ),

            subtotal:
              plan.itemAssignments
                .filter(
                  (
                    assignment,
                  ) =>
                    assignment.branchId ===
                    store.branchId,
                )
                .reduce(
                  (
                    total,
                    assignment,
                  ) =>
                    total +
                    assignment.lineTotal,
                  0,
                ),
          }),
        );
      },
      [
        result,
      ],
    );


  const singleStoreMissingItems =
    useMemo(
      () => {
        const plan =
          result?.singleStore;

        if (
          !plan
        ) {
          return [];
        }

        const coveredKeys =
          new Set(
            plan.itemAssignments.map(
              (
                assignment,
              ) =>
                assignment.itemKey,
            ),
          );

        return items.filter(
          (
            item,
          ) => {
            const key =
              `${item.product.id}::${item.presentationId ?? "no-presentation"}`;

            return !coveredKeys.has(
              key,
            );
          },
        );
      },
      [
        items,
        result,
      ],
    );

  const recommendedMissingItems =
    useMemo(
      () => {
        const plan =
          result?.recommended;

        if (
          !plan
        ) {
          return [];
        }

        const coveredKeys =
          new Set(
            plan.itemAssignments.map(
              (
                assignment,
              ) =>
                assignment.itemKey,
            ),
          );

        return items.filter(
          (
            item,
          ) => {
            const key =
              `${item.product.id}::${item.presentationId ?? "no-presentation"}`;

            return !coveredKeys.has(
              key,
            );
          },
        );
      },
      [
        items,
        result,
      ],
    );

  if (
    loadingPersistentList
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

          <p className="mt-4 font-black text-slate-600">
            Preparando tu lista...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        <Link
          to="/lista"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-green-600"
        >
          <ArrowLeft
            size={18}
          />

          Volver a Mi lista
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-green-200 bg-gradient-to-br from-green-50 via-white to-white shadow-sm">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                  Compra inteligente Listik
                </p>

                <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
                  ¿Dónde te conviene comprar?
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Listik combina los precios de tu lista con distancia, traslado y número de tiendas.
                </p>

                <p className="mt-4 text-sm font-black text-green-700">
                  🛒 {items.length} productos · {totalUnits} unidades
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-600 text-white shadow-md">
                <Navigation
                  size={31}
                />
              </div>
            </div>
          </div>
        </section>

        {persistenceError && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {persistenceError}
          </div>
        )}

        {items.length ===
        0 ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <ShoppingCart
              size={34}
              className="mx-auto text-green-600"
            />

            <h2 className="mt-4 text-xl font-black text-slate-900">
              Tu lista está vacía
            </h2>

            <Link
              to="/"
              className="mt-5 inline-flex rounded-xl bg-green-600 px-5 py-3 font-black text-white"
            >
              Buscar productos
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-black text-slate-950">
                  Configura tu compra
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Puedes probar diferentes escenarios antes de salir.
                </p>
              </div>

              <div className="grid gap-5 bg-slate-50 p-6 md:grid-cols-3">

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Transporte
                  </p>

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
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Máximo de tiendas
                  </p>

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

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Radio máximo
                  </span>

                  <select
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
                </label>
              </div>

              {(mode ===
                "car" ||
                mode ===
                  "moto") && (
                <div className="grid gap-4 border-t border-slate-100 p-6 md:grid-cols-2">

                  <label>
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

                  <label>
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

              <div className="border-t border-slate-100 p-6">
                <button
                  type="button"
                  onClick={
                    userPosition
                      ? () =>
                          void calculate()
                      : requestLocation
                  }
                  disabled={
                    calculating
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LocateFixed
                    size={20}
                  />

                  {calculating
                    ? "Calculando mejor compra..."
                    : userPosition
                    ? "Recalcular compra inteligente"
                    : "Usar mi ubicación y calcular"}
                </button>
              </div>
            </section>

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <AlertCircle
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                {error}
              </div>
            )}

            {result?.available && (
              <>
                {result.unavailableItems.length > 0 && (
                  <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={22}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                          Producto{result.unavailableItems.length === 1 ? "" : "s"} sin precio disponible
                        </p>

                        <p className="mt-2 text-sm leading-6 text-amber-900">
                          No encontramos precios para la presentación seleccionada de {result.unavailableItems.length === 1 ? "este producto" : "estos productos"} en tu zona. Listik seguirá calculando la mejor compra con el resto de tu lista.
                        </p>

                        <div className="mt-4 space-y-3">
                          {result.unavailableItems.map(
                            (item) => (
                              <div
                                key={item.itemKey}
                                className="rounded-2xl border border-amber-200 bg-white p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-black text-slate-950">
                                      {item.productName}
                                    </p>

                                    {item.presentationName && (
                                      <p className="mt-1 text-sm font-semibold text-slate-600">
                                        {item.presentationName}
                                      </p>
                                    )}

                                    <p className="mt-2 text-xs font-bold text-amber-700">
                                      Sin precios disponibles para esta presentación.
                                    </p>
                                  </div>

                                  <Link
                                   to="/app"
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-200"
                                          >
                                      Buscar alternativa
                                          </Link>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="mt-7 grid gap-4 lg:grid-cols-3">
                  <PlanCard
                    featured
                    title="🏆 Mejor opción para completar tu lista"
                    description={`Equilibra cobertura, precio y traslado con hasta ${result.maxStores} tiendas dentro de ${result.maxDistanceKm} km.`}
                    plan={
                      result.recommended
                    }
                    missingCount={
                      recommendedMissingItems.length
                    }
                  />

                  <PlanCard
                    title="🏪 Una sola tienda"
                    description="Menos vueltas y una compra más simple."
                    plan={
                      result.singleStore
                    }
                    missingCount={
                      singleStoreMissingItems.length
                    }
                  />

                  <PlanCard
                    title="💰 Precio mínimo"
                    description="Busca el precio más bajo aunque implique más tiendas."
                    plan={
                      result.minimumPrice
                    }
                    missingCount={
                      result.minimumPrice
                        ? result.minimumPrice.totalItems -
                          result.minimumPrice.coveredItems
                        : 0
                    }
                  />
                </section>

                {result.savingsVsSingle !==
                  null &&
                  result.savingsVsSingle >
                    0 && (
                    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm font-bold text-green-800">
                      <Trophy
                        size={19}
                        className="mr-2 inline"
                      />
                      Con la opción recomendada Listik estima un ahorro de{" "}
                      <strong>
                        {money(
                          result.savingsVsSingle,
                        )}
                      </strong>{" "}
                      frente a comprar en una sola tienda con la misma cobertura.
                    </div>
                  )}

                <section className="mt-6 grid gap-4 lg:grid-cols-2">
                  <article className="rounded-3xl border border-green-200 bg-green-50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-green-700">
                      ¿Por qué recomienda Listik esta opción?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-green-900">
                      Listik prioriza primero completar la mayor cantidad posible de productos.
                      Después compara el costo de los productos más el traslado estimado.
                    </p>

                    {result.recommended &&
                    result.recommended.coveredItems ===
                      result.recommended.totalItems ? (
                      <p className="mt-3 text-sm font-black text-green-800">
                        ✅ Esta opción completa toda tu lista.
                      </p>
                    ) : (
                      <p className="mt-3 text-sm font-black text-amber-700">
                        ⚠️ Esta opción todavía deja productos pendientes
                        {result.unavailableItems.length > 0
                          ? " porque hay presentaciones sin precios disponibles en tu zona."
                          : "."}
                      </p>
                    )}
                  </article>

                  <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                      Una sola tienda
                    </p>

                    {singleStoreMissingItems.length >
                    0 ? (
                      <>
                        <p className="mt-2 text-sm font-bold text-amber-900">
                          Esta opción cuesta menos, pero no completa tu lista.
                        </p>

                        <div className="mt-3 rounded-2xl bg-white/80 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                            Producto
                            {singleStoreMissingItems.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            faltante
                            {singleStoreMissingItems.length ===
                            1
                              ? ""
                              : "s"}
                          </p>

                          <div className="mt-2 space-y-2">
                            {singleStoreMissingItems.map(
                              (
                                item,
                              ) => (
                                <div
                                  key={`${item.product.id}::${item.presentationId ?? "no-presentation"}`}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <span className="font-black text-slate-900">
                                    {item.product.name}
                                  </span>

                                  <span className="shrink-0 text-xs font-bold text-slate-500">
                                    x{item.quantity}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-black text-green-800">
                        ✅ Esta tienda sí cubre toda tu lista.
                      </p>
                    )}
                  </article>
                </section>

                {result.recommended && (
                  <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-3">
                      <RouteIcon
                        size={22}
                        className="text-green-600"
                      />

                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-green-600">
                          Plan de compra
                        </p>

                        <h2 className="text-2xl font-black text-slate-950">
                          Qué comprar en cada parada
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 space-y-5">
                      {recommendedByStore.map(
                        (
                          store,
                          index,
                        ) => (
                          <article
                            key={
                              store.branchId
                            }
                            className="overflow-hidden rounded-3xl border border-slate-200"
                          >
                            <div className="flex flex-col gap-3 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                                  Parada {index + 1}
                                </p>

                                <p className="mt-1 text-lg font-black text-slate-950">
                                  {store.storeName}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {store.branchName}
                                </p>

                                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-500">
                                  <MapPin
                                    size={14}
                                  />
                                  Aprox.{" "}
                                  {kilometers(
                                    store.distanceFromUserKm,
                                  )}{" "}
                                  desde tu ubicación
                                </p>
                              </div>

                              <div className="sm:text-right">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                  Subtotal
                                </p>

                                <p className="mt-1 text-xl font-black text-green-700">
                                  {money(
                                    store.subtotal,
                                  )}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {store.items.length} producto
                                  {store.items.length === 1
                                    ? ""
                                    : "s"}
                                </p>
                              </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                              {store.items.map(
                                (
                                  assignment,
                                ) => (
                                  <div
                                    key={
                                      assignment.itemKey
                                    }
                                    className="flex items-center justify-between gap-4 p-4"
                                  >
                                    <div>
                                      <p className="font-black text-slate-900">
                                        {assignment.productName}
                                      </p>

                                      {assignment.presentationName && (
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                          {assignment.presentationName}
                                        </p>
                                      )}

                                      <p className="mt-1 text-xs text-slate-500">
                                        {assignment.quantity} ×{" "}
                                        {money(
                                          assignment.unitPrice,
                                        )}
                                      </p>
                                    </div>

                                    <p className="font-black text-slate-900">
                                      {money(
                                        assignment.lineTotal,
                                      )}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          </article>
                        ),
                      )}
                    </div>

                    <p className="mt-5 text-xs leading-5 text-slate-400">
                      {result.distanceNote}
                    </p>

                    <Link
                      to="/compra"
                      onClick={() => {
                        if (
                          result.recommended
                        ) {
                          saveSmartPurchasePlan(
                            result.recommended,
                          );
                        }
                      }}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-950 px-6 py-4 font-black text-white transition hover:bg-green-900"
                    >
                      <ShoppingCart
                        size={19}
                      />
                      Iniciar compra con este plan
                    </Link>
                  </section>
                )}
              </>
            )}

            {result &&
              !result.available && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
                  {result.reason}
                </div>
              )}

            {!result && (
              <section className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <RouteIcon
                  size={34}
                  className="mx-auto text-green-600"
                />

                <h2 className="mt-3 text-xl font-black text-slate-900">
                  Encuentra tu mejor ruta de compra
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Listik comparará el ahorro de cada supermercado contra el traslado necesario para llegar.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}