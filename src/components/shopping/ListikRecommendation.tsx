import Card from "../ui/Card";

import type {
  BalancedPurchaseResult,
  ListikRecommendation,
} from "../../utils/shoppingCalculator";

interface Props {
  recommendation:
    ListikRecommendation;

  balancedPurchase:
    BalancedPurchaseResult;
}

export default function ListikRecommendationCard({
  recommendation,
  balancedPurchase,
}: Props) {
  /*
   * ==========================================
   * FORMATO DINERO
   * ==========================================
   */

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

  const smartPurchase =
    recommendation.smartPurchase;

  const bestSingleStore =
    recommendation.bestSingleStore;

  /*
   * ==========================================
   * ¿COMPRA EQUILIBRADA APORTA ALGO?
   * ==========================================
   */

  const balancedSavesStops =
    balancedPurchase.complete &&
    balancedPurchase.storesSavedVsSmart >
      0;

  /*
   * ==========================================
   * CABECERA
   * ==========================================
   */

  return (
    <Card>
      <div className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-widest text-green-400">
          Listik Assistant
        </p>

        <h2 className="mt-2 text-2xl font-black">
          ✨ Elige cómo quieres comprar
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Comparamos precio, cobertura y
          número de tiendas para mostrarte
          diferentes formas de completar tu
          lista.
        </p>
      </div>

      <div className="p-5">
        {/* ==================================
            MENSAJE PRINCIPAL
        ================================== */}

        {balancedSavesStops ? (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-black text-blue-900">
              🚗 Puedes reducir tus paradas
            </p>

            <p className="mt-1 text-sm leading-relaxed text-blue-700">
              Por $
              {formatMoney(
                balancedPurchase.extraCostVsSmart,
              )}{" "}
              adicionales puedes visitar{" "}
              {
                balancedPurchase.storesSavedVsSmart
              }{" "}
              tienda
              {balancedPurchase.storesSavedVsSmart ===
              1
                ? ""
                : "s"}{" "}
              menos.
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-black text-slate-900">
              💡 Recomendación Listik
            </p>

            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {
                recommendation.message
              }
            </p>
          </div>
        )}

        {/* ==================================
            TRES ESTRATEGIAS
        ================================== */}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* ==================================
              UNA SOLA TIENDA
          ================================== */}

          <div
            className={`rounded-2xl border p-5 ${
              bestSingleStore
                ? "border-green-200 bg-green-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl">
                🏪
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                  bestSingleStore
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                Más fácil
              </span>
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-500">
              Una sola tienda
            </p>

            {bestSingleStore ? (
              <>
                <p className="mt-2 truncate text-lg font-black text-slate-900">
                  {
                    bestSingleStore.storeName
                  }
                </p>

                {bestSingleStore.branch && (
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {
                      bestSingleStore.branch
                    }
                  </p>
                )}

                <p className="mt-4 text-2xl font-black text-green-700">
                  $
                  {formatMoney(
                    bestSingleStore.total,
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-green-700">
                    1 tienda
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-green-700">
                    {
                      bestSingleStore.availableItems
                    }
                    /
                    {
                      bestSingleStore.requestedItems
                    }
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-lg font-black text-slate-700">
                  No disponible
                </p>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Ninguna tienda tiene
                  actualmente todos los
                  productos de tu lista.
                </p>

                <div className="mt-4 rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">
                    Revisa las otras
                    estrategias para completar
                    tu compra.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ==================================
              COMPRA INTELIGENTE
          ================================== */}

          <div className="rounded-2xl border border-violet-300 bg-violet-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl">
                ⚡
              </span>

              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase text-violet-700">
                Más barato
              </span>
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-500">
              Compra inteligente
            </p>

            <p className="mt-2 text-2xl font-black text-violet-700">
              $
              {formatMoney(
                smartPurchase.total,
              )}
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Precio mínimo encontrado
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-700">
                {
                  smartPurchase.storeCount
                }{" "}
                tienda
                {smartPurchase.storeCount ===
                1
                  ? ""
                  : "s"}
              </span>

              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-700">
                {
                  smartPurchase.availableItems
                }
                /
                {
                  smartPurchase.requestedItems
                }
              </span>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-violet-700">
              Ideal si tu prioridad es
              pagar lo menos posible.
            </p>
          </div>

          {/* ==================================
              COMPRA EQUILIBRADA
          ================================== */}

          <div
            className={`rounded-2xl border p-5 ${
              balancedSavesStops
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl">
                🚗
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                  balancedSavesStops
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                Menos paradas
              </span>
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-widest text-blue-600">
              Compra equilibrada
            </p>

            {balancedPurchase.complete ? (
              <>
                <p className="mt-2 text-2xl font-black text-blue-700">
                  $
                  {formatMoney(
                    balancedPurchase.total,
                  )}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {
                    balancedPurchase.storeCount
                  }{" "}
                  tienda
                  {balancedPurchase.storeCount ===
                  1
                    ? ""
                    : "s"}{" "}
                  para completar tu lista
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">
                    -
                    {
                      balancedPurchase
                        .storesSavedVsSmart
                    }{" "}
                    parada
                    {balancedPurchase
                      .storesSavedVsSmart ===
                    1
                      ? ""
                      : "s"}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">
                    +$
                    {formatMoney(
                      balancedPurchase
                        .extraCostVsSmart,
                    )}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-blue-700">
                  {balancedSavesStops
                    ? "Ideal si prefieres ahorrar tiempo y hacer menos traslados."
                    : "La estrategia más barata ya utiliza el mínimo de tiendas posible."}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-lg font-black text-slate-700">
                  No disponible
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Aún faltan precios para
                  calcular esta estrategia.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ==================================
            COMPARACIÓN RÁPIDA
        ================================== */}

        {balancedSavesStops && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-gradient-to-r from-violet-50 to-blue-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">
              Comparación rápida
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-black text-violet-700">
                  ⚡ Ahorrar al máximo
                </p>

                <p className="mt-1 text-xl font-black text-slate-900">
                  $
                  {formatMoney(
                    smartPurchase.total,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    smartPurchase.storeCount
                  }{" "}
                  tiendas
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-blue-700">
                  🚗 Hacer menos paradas
                </p>

                <p className="mt-1 text-xl font-black text-slate-900">
                  $
                  {formatMoney(
                    balancedPurchase.total,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    balancedPurchase.storeCount
                  }{" "}
                  tiendas · +$
                  {formatMoney(
                    balancedPurchase
                      .extraCostVsSmart,
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}