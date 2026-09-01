import {
  useEffect,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";

import {
  getFrequentlyPurchasedProducts,
  type FrequentlyPurchasedProduct,
} from "../services/purchaseProductInsightsService";

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
    },
  ).format(
    value,
  );
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

export default function PurchaseProductInsights() {
  const [
    products,
    setProducts,
  ] =
    useState<
      FrequentlyPurchasedProduct[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
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

  useEffect(
    () => {
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
            await getFrequentlyPurchasedProducts(
              5,
            );

          if (
            !cancelled
          ) {
            setProducts(
              result,
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Error cargando productos frecuentes:",
            loadError,
          );

          if (
            !cancelled
          ) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "No pudimos analizar tus productos frecuentes.",
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
    [],
  );

  if (
    loading
  ) {
    return (
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-slate-500">
          Analizando tus productos más comprados...
        </p>
      </section>
    );
  }

  if (
    error
  ) {
    return (
      <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="font-black text-red-700">
          No pudimos cargar tus productos frecuentes.
        </p>

        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <PackageSearch
          className="mt-1 shrink-0 text-green-600"
        />

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
            Hábitos de compra
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            Productos que más compras
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Basado en tus compras terminadas y productos marcados como comprados.
          </p>
        </div>
      </div>

      {products.length ===
      0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <ShoppingBag
            className="mx-auto text-slate-400"
            size={30}
          />

          <p className="mt-3 font-black text-slate-700">
            Aún no hay suficientes compras
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Conforme completes compras, Listik empezará a detectar tus productos frecuentes.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {products.map(
            (
              product,
              index,
            ) => {
              const change =
                product.marketChangePercentage;

              const hasChange =
                change !==
                null;

              const wentUp =
                (
                  change ??
                  0
                ) >
                0;

              const wentDown =
                (
                  change ??
                  0
                ) <
                0;

              return (
                <article
                  key={`${product.productId}-${product.presentationId ?? "none"}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-700">
                          #{index + 1}
                        </span>

                        {product.category && (
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                            {product.category}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-lg font-black text-slate-950">
                        {product.productName}
                      </p>

                      {(product.brand ||
                        product.presentationName) && (
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {[
                            product.brand,
                            product.presentationName,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " · ",
                            )}
                        </p>
                      )}

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Última compra:{" "}
                        {formatDate(
                          product.lastPurchaseAt,
                        )}
                      </p>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 text-center">
                        <p className="text-xs font-black uppercase text-slate-400">
                          Unidades
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-950">
                          {product.totalUnits}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3 text-center">
                        <p className="text-xs font-black uppercase text-slate-400">
                          Compras
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-950">
                          {product.purchaseCount}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl bg-white p-3 text-center sm:col-span-1">
                        <p className="text-xs font-black uppercase text-slate-400">
                          Precio actual
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-950">
                          {product.marketLatestPrice !==
                          null
                            ? money(
                                product.marketLatestPrice,
                              )
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.averageActualPrice !==
                      null && (
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                        Precio promedio pagado:{" "}
                        {money(
                          product.averageActualPrice,
                        )}
                      </span>
                    )}

                    {hasChange && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${
                          wentUp
                            ? "bg-red-50 text-red-700"
                            : wentDown
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {wentUp ? (
                          <ArrowUpRight
                            size={14}
                          />
                        ) : wentDown ? (
                          <ArrowDownRight
                            size={14}
                          />
                        ) : null}

                        {wentUp
                          ? "Subió"
                          : wentDown
                          ? "Bajó"
                          : "Sin cambio"}{" "}
                        {Math.abs(
                          change ??
                            0,
                        ).toFixed(
                          1,
                        )}
                        % en precios observados
                      </span>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      <p className="mt-4 text-xs font-bold leading-5 text-slate-400">
        La variación de precio usa observaciones recientes de la base de datos de Listik y no necesariamente representa únicamente el precio pagado por ti.
      </p>
    </section>
  );
}
