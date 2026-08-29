import {
  useState,
} from "react";

import Card from "../ui/Card";

import type {
  StoreTotal,
} from "../../utils/shoppingCalculator";

interface Props {
  totals: StoreTotal[];

  onSelectStore: (
    store: StoreTotal,
  ) => void;
}

export default function StoreRanking({
  totals,
  onSelectStore,
}: Props) {
  const [
    showAllStores,
    setShowAllStores,
  ] =
    useState(
      false,
    );

  const INITIAL_VISIBLE_STORES =
    3;

  if (
    totals.length ===
    0
  ) {
    return null;
  }

  const completeTotals =
    totals.filter(
      (
        store,
      ) =>
        store.complete,
    );

  const rankingSource =
    completeTotals.length >
    0
      ? completeTotals
      : totals;

  const bestStore =
    rankingSource[0] ??
    null;

  /*
   * La mejor opción ya se muestra arriba
   * en su tarjeta destacada.
   *
   * Por eso la quitamos del listado inferior
   * para no repetir la misma sucursal.
   */

  const remainingStores =
    bestStore
      ? totals.filter(
          (
            store,
          ) =>
            store.storeKey !==
            bestStore.storeKey,
        )
      : totals;

  const visibleStores =
    showAllStores
      ? remainingStores
      : remainingStores.slice(
          0,
          INITIAL_VISIBLE_STORES,
        );

  const hiddenStores =
    Math.max(
      0,
      remainingStores.length -
        INITIAL_VISIBLE_STORES,
    );

  const mostExpensiveCompleteStore =
    completeTotals.length >
    0
      ? completeTotals[
          completeTotals.length -
            1
        ]
      : null;

  const savings =
    bestStore?.complete &&
    mostExpensiveCompleteStore
      ? Math.max(
          0,
          mostExpensiveCompleteStore.total -
            bestStore.total,
        )
      : 0;

  function getMedal(
    index: number,
  ) {
    if (
      index ===
      0
    ) {
      return "🥇";
    }

    if (
      index ===
      1
    ) {
      return "🥈";
    }

    if (
      index ===
      2
    ) {
      return "🥉";
    }

    return "🏪";
  }

  function formatMoney(
    value: number,
  ) {
    return value.toLocaleString(
      "es-MX",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      },
    );
  }

  function handleSelect(
    store: StoreTotal,
  ) {
    if (
      !store.storeBranchId
    ) {
      return;
    }

    onSelectStore(
      store,
    );
  }

  return (
    <Card>
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
              Comparador Listik
            </p>

            <h2 className="mt-2 text-2xl font-black">
              ¿Dónde te conviene comprar?
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Comparamos cobertura y costo por sucursal usando los productos exactos de tu lista.
            </p>
          </div>

          <div className="w-fit rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-300">
              Opciones
            </p>

            <p className="mt-1 text-xl font-black">
              {totals.length}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          MEJOR OPCIÓN
      ====================================== */}

      {bestStore && (
        <div className="mx-5 mt-5 rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                  {bestStore.complete
                    ? "🏆 Mejor opción"
                    : "📍 Mayor cobertura"}
                </span>

                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-green-700 shadow-sm">
                  {bestStore.availableItems}/
                  {bestStore.requestedItems} productos
                </span>

                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-green-700 shadow-sm">
                  {bestStore.coverage}%
                </span>
              </div>

              <h3 className="mt-4 truncate text-2xl font-black text-slate-950">
                {bestStore.storeName}
              </h3>

              {bestStore.branch && (
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                  {bestStore.branch}
                </p>
              )}

              {!bestStore.complete && (
                <p className="mt-3 text-sm font-bold text-amber-700">
                  Faltan {bestStore.missingItems} producto
                  {bestStore.missingItems ===
                  1
                    ? ""
                    : "s"} en esta sucursal.
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <div className="text-left lg:text-right">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                  {bestStore.complete
                    ? "Total estimado"
                    : "Subtotal disponible"}
                </p>

                <p className="mt-1 text-3xl font-black text-green-700">
                  $
                  {formatMoney(
                    bestStore.total,
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  !bestStore.storeBranchId
                }
                onClick={() =>
                  handleSelect(
                    bestStore,
                  )
                }
                className="rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bestStore.storeBranchId
                  ? "🛒 Comprar aquí"
                  : "Sucursal no disponible"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          LISTA DE TIENDAS
      ====================================== */}

      <div className="space-y-3 p-5">
        {visibleStores.map(
          (
            store,
            index,
          ) => {
            const isBest =
              bestStore
                ?.storeKey ===
              store.storeKey;

            const difference =
              store.complete &&
              bestStore
                ?.complete
                ? Math.max(
                    0,
                    store.total -
                      bestStore.total,
                  )
                : null;

            return (
              <div
                key={
                  store.storeKey
                }
                className={`rounded-2xl border p-4 transition ${
                  isBest
                    ? "border-green-200 bg-green-50/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* IZQUIERDA */}

                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                      {getMedal(
                        index +
                          1,
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-900">
                          {store.storeName}
                        </p>

                        {isBest && (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                            Recomendado
                          </span>
                        )}
                      </div>

                      {store.branch && (
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                          {store.branch}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            store.complete
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {store.availableItems}/
                          {store.requestedItems}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            store.complete
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {store.coverage}%
                        </span>

                        {!store.complete && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                            Faltan {store.missingItems}
                          </span>
                        )}
                      </div>

                      {difference !==
                        null &&
                        difference >
                          0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            +$
                            {formatMoney(
                              difference,
                            )}{" "}
                            vs. mejor opción
                          </p>
                        )}
                    </div>
                  </div>

                  {/* DERECHA */}

                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-black text-slate-900">
                        $
                        {formatMoney(
                          store.total,
                        )}
                      </p>

                      <p
                        className={`mt-1 text-[11px] font-bold ${
                          store.complete
                            ? "text-slate-400"
                            : "text-amber-600"
                        }`}
                      >
                        {store.complete
                          ? "Total"
                          : "Subtotal"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !store.storeBranchId
                      }
                      onClick={() =>
                        handleSelect(
                          store,
                        )
                      }
                      className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        store.complete
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {store.storeBranchId
                        ? "Comprar aquí"
                        : "No disponible"}
                    </button>
                  </div>
                </div>

                {/* COBERTURA */}

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        store.complete
                          ? "bg-green-500"
                          : "bg-amber-400"
                      }`}
                      style={{
                        width:
                          `${store.coverage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          },
        )}

        {/* ==================================
            VER MÁS
        ================================== */}

        {remainingStores.length >
          INITIAL_VISIBLE_STORES && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() =>
                setShowAllStores(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              {showAllStores
                ? "↑ Mostrar menos tiendas"
                : `Ver ${hiddenStores} tienda${
                    hiddenStores ===
                    1
                      ? ""
                      : "s"
                  } más ↓`}
            </button>
          </div>
        )}

        {/* ==================================
            MENSAJE FINAL
        ================================== */}

        {completeTotals.length >
          1 &&
          bestStore?.complete &&
          mostExpensiveCompleteStore &&
          savings >
            0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Ahorro potencial
              </p>

              <p className="mt-2 font-bold text-green-800">
                💰 Hasta{" "}
                <span className="text-xl font-black">
                  $
                  {formatMoney(
                    savings,
                  )}
                </span>
              </p>

              <p className="mt-1 text-xs leading-relaxed text-green-700">
                Comparando únicamente sucursales que pueden surtir toda tu lista.
              </p>
            </div>
          )}

        {completeTotals.length ===
          1 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-800">
              🛒 Solo una sucursal tiene actualmente toda tu lista.
            </p>

            <p className="mt-1 text-xs text-blue-700">
              Las demás opciones siguen disponibles si prefieres comprar ahí.
            </p>
          </div>
        )}

        {completeTotals.length ===
          0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-800">
              Ninguna sucursal tiene toda tu lista todavía.
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              Puedes elegir cualquier opción y continuar. Listik marcará como faltantes los productos sin precio disponible en esa sucursal.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}