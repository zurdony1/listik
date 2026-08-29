import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarRange,
  ReceiptText,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  buildMonthlyExpenseReport,
  getExpenseHistory,
  type ExpensePurchase,
} from "../services/expenseHistoryService";

function money(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style:
        "currency",

      currency:
        "MXN",
    },
  ).format(
    value,
  );
}

function monthName(
  year:
    number,
  month:
    number,
) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      month:
        "long",

      year:
        "numeric",
    },
  ).format(
    new Date(
      year,
      month,
      1,
    ),
  );
}

export default function MonthlyReport() {
  const {
    user,
    loading:
      authLoading,
  } =
    useAuth();

  const now =
    new Date();

  const [
    selectedYear,
    setSelectedYear,
  ] =
    useState(
      now.getFullYear(),
    );

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      now.getMonth(),
    );

  const [
    items,
    setItems,
  ] =
    useState<
      ExpensePurchase[]
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
      if (
        authLoading
      ) {
        return;
      }

      if (
        !user
      ) {
        setItems(
          [],
        );

        setLoading(
          false,
        );

        return;
      }

      const userId =
        user.id;

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
            await getExpenseHistory(
              userId,
            );

          if (
            !cancelled
          ) {
            setItems(
              result,
            );
          }
        } catch (
          reportError
        ) {
          console.error(
            reportError,
          );

          if (
            !cancelled
          ) {
            setError(
              reportError instanceof Error
                ? reportError.message
                : "No pudimos generar tu reporte.",
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
      user,
      authLoading,
    ],
  );

  const report =
    useMemo(
      () =>
        buildMonthlyExpenseReport(
          items,
          selectedYear,
          selectedMonth,
        ),
      [
        items,
        selectedYear,
        selectedMonth,
      ],
    );

  function previousMonth() {
    const date =
      new Date(
        selectedYear,
        selectedMonth -
          1,
        1,
      );

    setSelectedYear(
      date.getFullYear(),
    );

    setSelectedMonth(
      date.getMonth(),
    );
  }

  function nextMonth() {
    const date =
      new Date(
        selectedYear,
        selectedMonth +
          1,
        1,
      );

    const future =
      date >
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

    if (
      future
    ) {
      return;
    }

    setSelectedYear(
      date.getFullYear(),
    );

    setSelectedMonth(
      date.getMonth(),
    );
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

          <p className="mt-4 font-black text-slate-700">
            Preparando tu reporte...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/historial"
        className="inline-flex items-center gap-2 text-sm font-black text-slate-600"
      >
        <ArrowLeft
          size={17}
        />
        Volver a mis compras
      </Link>

      <section className="mt-5 rounded-[2rem] border border-green-200 bg-green-50/60 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Reporte mensual Listik
            </p>

            <h1 className="mt-2 text-3xl font-black capitalize text-slate-950 sm:text-4xl">
              {monthName(
                selectedYear,
                selectedMonth,
              )}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Una vista simple de cuánto gastaste y dónde se concentraron tus compras.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                previousMonth
              }
              className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700"
            >
              ← Mes anterior
            </button>

            <button
              type="button"
              onClick={
                nextMonth
              }
              className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700"
            >
              Mes siguiente →
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <WalletCards className="text-slate-500" />

          <p className="mt-3 text-xs font-black uppercase text-slate-400">
            Gasto total
          </p>

          <p className="mt-1 text-3xl font-black text-slate-950">
            {money(
              report.totalSpent,
            )}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShoppingCart className="text-slate-500" />

          <p className="mt-3 text-xs font-black uppercase text-slate-400">
            Compras
          </p>

          <p className="mt-1 text-3xl font-black text-slate-950">
            {report.purchases}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ReceiptText className="text-slate-500" />

          <p className="mt-3 text-xs font-black uppercase text-slate-400">
            Ticket promedio
          </p>

          <p className="mt-1 text-3xl font-black text-slate-950">
            {money(
              report.averageTicket,
            )}
          </p>
        </article>

        <article className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <Store className="text-green-700" />

          <p className="mt-3 text-xs font-black uppercase text-green-600">
            Mayor gasto
          </p>

          <p className="mt-1 text-xl font-black text-green-950">
            {report.topStore
              ?.storeName ??
              "—"}
          </p>

          {report.topStore && (
            <p className="mt-1 font-black text-green-700">
              {money(
                report.topStore.total,
              )}
            </p>
          )}
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          {report.changeAmount <=
          0 ? (
            <TrendingDown className="mt-1 shrink-0 text-green-600" />
          ) : (
            <TrendingUp className="mt-1 shrink-0 text-amber-600" />
          )}

          <div>
            <p className="font-black text-slate-950">
              Comparado con el mes anterior
            </p>

            {report.previousMonthTotal >
            0 ? (
              <p className="mt-1 text-sm text-slate-600">
                Gastaste{" "}
                <span className="font-black">
                  {money(
                    Math.abs(
                      report.changeAmount,
                    ),
                  )}
                </span>{" "}
                {report.changeAmount <=
                0
                  ? "menos"
                  : "más"}{" "}
                que el mes anterior
                {report.changePercentage !==
                null
                  ? ` (${Math.abs(
                      report.changePercentage,
                    ).toFixed(
                      1,
                    )}%).`
                  : "."}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                Todavía no hay suficiente historial del mes anterior para comparar.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarRange className="text-green-600" />

          <h2 className="text-xl font-black text-slate-950">
            Gasto por tienda
          </h2>
        </div>

        {report.stores.length ===
        0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No hay compras guardadas para este mes.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {report.stores.map(
              (
                store,
              ) => {
                const percentage =
                  report.totalSpent >
                    0
                    ? (
                        store.total /
                        report.totalSpent
                      ) *
                      100
                    : 0;

                return (
                  <div
                    key={
                      store.storeName
                    }
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {store.storeName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {store.purchases} compra
                          {store.purchases ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-slate-950">
                          {money(
                            store.total,
                          )}
                        </p>

                        <p className="text-xs font-bold text-slate-400">
                          {percentage.toFixed(
                            0,
                          )}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-green-600"
                        style={{
                          width:
                            `${Math.min(
                              100,
                              percentage,
                            )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    </main>
  );
}
