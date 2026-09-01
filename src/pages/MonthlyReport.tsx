import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ArrowLeft,
  Bug,
  CalendarRange,
  PiggyBank,
  Save,
  ShoppingCart,
  Store,
  Target,
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
  getMonthPurchases,
  type ExpensePurchase,
} from "../services/expenseHistoryService";

import {
  getSmallExpenses,
  type SmallExpense,
} from "../services/smallExpenseService";

import {
  getMonthlyBudget,
  saveMonthlyBudget,
} from "../services/monthlyBudgetService";

import PurchaseProductInsights from "../components/PurchaseProductInsights";

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

function monthName(
  year: number,
  month: number,
) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      month,
      1,
    ),
  );
}

function monthRange(
  year: number,
  month: number,
) {
  const start =
    new Date(
      year,
      month,
      1,
    );

  const end =
    new Date(
      year,
      month + 1,
      1,
    );

  return {
    start:
      start.toISOString(),

    end:
      end.toISOString(),
  };
}

function previousMonthDate(
  year: number,
  month: number,
) {
  return new Date(
    year,
    month - 1,
    1,
  );
}

function isSameMonth(
  value: string,
  year: number,
  month: number,
) {
  const date =
    new Date(
      value,
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month
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
    smallExpenses,
    setSmallExpenses,
  ] =
    useState<
      SmallExpense[]
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


  const [
    budget,
    setBudget,
  ] =
    useState(
      0,
    );

  const [
    budgetInput,
    setBudgetInput,
  ] =
    useState(
      "",
    );

  const [
    savingBudget,
    setSavingBudget,
  ] =
    useState(
      false,
    );

  /*
   * ==========================================
   * CARGAR HISTORIAL COMPLETO
   * ==========================================
   *
   * Las compras vienen de shopping_trips.
   * Los gastos hormiga vienen de small_expenses.
   *
   * Para el reporte cargamos:
   * - todas las compras del usuario;
   * - gastos hormiga del mes seleccionado;
   * - gastos hormiga del mes anterior.
   */

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

        setSmallExpenses(
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

          const chartStart =
            new Date(
              selectedYear,
              selectedMonth - 5,
              1,
            );

          const chartRange =
            monthRange(
              chartStart.getFullYear(),
              chartStart.getMonth(),
            );

          const currentRange =
            monthRange(
              selectedYear,
              selectedMonth,
            );

          const [
            purchaseResult,
            smallExpenseResult,
            budgetResult,
          ] =
            await Promise.all([
              getExpenseHistory(
                userId,
              ),

              getSmallExpenses(
                chartRange.start,
                currentRange.end,
              ),

              getMonthlyBudget(
                selectedYear,
                selectedMonth,
              ),
            ]);

          if (
            cancelled
          ) {
            return;
          }

          setItems(
            purchaseResult,
          );

          setSmallExpenses(
            smallExpenseResult,
          );


          const loadedBudget =
            Number(
              budgetResult?.amount ??
                0,
            );

          setBudget(
            loadedBudget,
          );

          setBudgetInput(
            loadedBudget >
            0
              ? String(
                  loadedBudget,
                )
              : "",
          );
        } catch (
          reportError
        ) {
          console.error(
            "Error generando reporte mensual:",
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
      selectedYear,
      selectedMonth,
    ],
  );

  /*
   * ==========================================
   * REPORTE DE SUPERMERCADO
   * ==========================================
   */

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

  const previousDate =
    previousMonthDate(
      selectedYear,
      selectedMonth,
    );

  const previousReport =
    useMemo(
      () =>
        buildMonthlyExpenseReport(
          items,
          previousDate.getFullYear(),
          previousDate.getMonth(),
        ),
      [
        items,
        previousDate,
      ],
    );

  const currentMonthItems =
    useMemo(
      () =>
        getMonthPurchases(
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

  /*
   * ==========================================
   * GASTOS HORMIGA
   * ==========================================
   */

  const currentSmallExpenses =
    useMemo(
      () =>
        smallExpenses.filter(
          (
            expense,
          ) =>
            isSameMonth(
              expense.spent_at,
              selectedYear,
              selectedMonth,
            ),
        ),
      [
        smallExpenses,
        selectedYear,
        selectedMonth,
      ],
    );

  const previousSmallExpenses =
    useMemo(
      () =>
        smallExpenses.filter(
          (
            expense,
          ) =>
            isSameMonth(
              expense.spent_at,
              previousDate.getFullYear(),
              previousDate.getMonth(),
            ),
        ),
      [
        smallExpenses,
        previousDate,
      ],
    );

  const smallExpenseTotal =
    useMemo(
      () =>
        currentSmallExpenses.reduce(
          (
            sum,
            expense,
          ) =>
            sum +
            Number(
              expense.amount,
            ),
          0,
        ),
      [
        currentSmallExpenses,
      ],
    );

  const previousSmallExpenseTotal =
    useMemo(
      () =>
        previousSmallExpenses.reduce(
          (
            sum,
            expense,
          ) =>
            sum +
            Number(
              expense.amount,
            ),
          0,
        ),
      [
        previousSmallExpenses,
      ],
    );

  /*
   * ==========================================
   * TOTALES GENERALES
   * ==========================================
   */

  const supermarketTotal =
    Number(
      report.totalSpent ??
        0,
    );

  const monthlyTotal =
    supermarketTotal +
    smallExpenseTotal;

  const previousMonthlyTotal =
    Number(
      previousReport.totalSpent ??
        0,
    ) +
    previousSmallExpenseTotal;

  const changeAmount =
    monthlyTotal -
    previousMonthlyTotal;

  const changePercentage =
    previousMonthlyTotal >
    0
      ? (
          changeAmount /
          previousMonthlyTotal
        ) *
        100
      : null;


  const budgetRemaining =
    budget -
    monthlyTotal;

  const budgetUsedPercentage =
    budget >
    0
      ? (
          monthlyTotal /
          budget
        ) *
        100
      : 0;

  const budgetExceeded =
    budget >
      0 &&
    monthlyTotal >
      budget;

  async function handleSaveBudget() {
    const numericBudget =
      Number(
        budgetInput,
      );

    if (
      !Number.isFinite(
        numericBudget,
      ) ||
      numericBudget <=
        0
    ) {
      setError(
        "Escribe un presupuesto mensual válido.",
      );

      return;
    }

    try {
      setSavingBudget(
        true,
      );

      setError(
        null,
      );

      const saved =
        await saveMonthlyBudget({
          year:
            selectedYear,

          month:
            selectedMonth,

          amount:
            numericBudget,
        });

      setBudget(
        saved.amount,
      );

      setBudgetInput(
        String(
          saved.amount,
        ),
      );
    } catch (
      budgetError
    ) {
      setError(
        budgetError instanceof Error
          ? budgetError.message
          : "No se pudo guardar el presupuesto.",
      );
    } finally {
      setSavingBudget(
        false,
      );
    }
  }

  /*
   * ==========================================
   * AHORRO LISTIK
   * ==========================================
   *
   * ExpensePurchase puede venir normalizado
   * como savingsAmount o conservar el nombre
   * savings_amount de Supabase.
   */

  const savingsTotal =
    useMemo(
      () =>
        currentMonthItems.reduce(
          (
            sum,
            item,
          ) => {
            const row =
              item as ExpensePurchase & {
                savingsAmount?:
                  | number
                  | null;

                savings_amount?:
                  | number
                  | null;
              };

            return (
              sum +
              Number(
                row.savingsAmount ??
                  row.savings_amount ??
                  0,
              )
            );
          },
          0,
        ),
      [
        currentMonthItems,
      ],
    );

  /*
   * ==========================================
   * CATEGORÍAS DE GASTO HORMIGA
   * ==========================================
   */

  const categoryTotals =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            number
          >();

        currentSmallExpenses.forEach(
          (
            expense,
          ) => {
            const category =
              expense.category ||
              "Otros";

            map.set(
              category,
              (
                map.get(
                  category,
                ) ??
                0
              ) +
                Number(
                  expense.amount,
                ),
            );
          },
        );

        return [
          ...map.entries(),
        ].sort(
          (
            a,
            b,
          ) =>
            b[1] -
            a[1],
        );
      },
      [
        currentSmallExpenses,
      ],
    );

  const topSmallExpenseCategory =
    categoryTotals[0] ??
    null;


  /*
   * ==========================================
   * EVOLUCIÓN DE GASTOS
   * ==========================================
   */

  const chartData =
    useMemo(
      () =>
        Array.from(
          { length: 6 },
          (_, index) => {
            const date =
              new Date(
                selectedYear,
                selectedMonth -
                  (5 - index),
                1,
              );

            const year =
              date.getFullYear();

            const month =
              date.getMonth();

            const monthReport =
              buildMonthlyExpenseReport(
                items,
                year,
                month,
              );

            const monthSmallExpenses =
              smallExpenses
                .filter(
                  (expense) =>
                    isSameMonth(
                      expense.spent_at,
                      year,
                      month,
                    ),
                )
                .reduce(
                  (
                    sum,
                    expense,
                  ) =>
                    sum +
                    Number(
                      expense.amount,
                    ),
                  0,
                );

            const supermarket =
              Number(
                monthReport.totalSpent ??
                  0,
              );

            return {
              month:
                new Intl.DateTimeFormat(
                  "es-MX",
                  {
                    month: "short",
                  },
                )
                  .format(date)
                  .replace(
                    ".",
                    "",
                  ),

              supermarket,

              smallExpenses:
                monthSmallExpenses,

              total:
                supermarket +
                monthSmallExpenses,
            };
          },
        ),
      [
        items,
        smallExpenses,
        selectedYear,
        selectedMonth,
      ],
    );

  const monthsWithSpending =
    chartData.filter(
      (month) =>
        month.total >
        0,
    );

  const averageMonthlySpending =
    monthsWithSpending.length >
    0
      ? monthsWithSpending.reduce(
          (
            sum,
            month,
          ) =>
            sum +
            month.total,
          0,
        ) /
        monthsWithSpending.length
      : 0;

  const highestSpendingMonth =
    monthsWithSpending.length >
    0
      ? monthsWithSpending.reduce(
          (
            highest,
            month,
          ) =>
            month.total >
            highest.total
              ? month
              : highest,
        )
      : null;

  const lowestSpendingMonth =
    monthsWithSpending.length >
    0
      ? monthsWithSpending.reduce(
          (
            lowest,
            month,
          ) =>
            month.total <
            lowest.total
              ? month
              : lowest,
        )
      : null;


  /*
   * ==========================================
   * INSIGHTS LISTIK
   * ==========================================
   */

  const smallExpenseShare =
    monthlyTotal >
    0
      ? (
          smallExpenseTotal /
          monthlyTotal
        ) *
        100
      : 0;

  const supermarketShare =
    monthlyTotal >
    0
      ? (
          supermarketTotal /
          monthlyTotal
        ) *
        100
      : 0;

  const budgetInsight =
    budget >
    0
      ? budgetExceeded
        ? `Superaste tu presupuesto por ${money(
            Math.abs(
              budgetRemaining,
            ),
          )}.`
        : `Has utilizado ${budgetUsedPercentage.toFixed(
            1,
          )}% de tu presupuesto mensual.`
      : "Todavía no has definido un presupuesto mensual.";

  const spendingInsight =
    monthsWithSpending.length >= 2 &&
    averageMonthlySpending >
      0
      ? monthlyTotal <
        averageMonthlySpending
        ? `Este mes llevas ${money(
            averageMonthlySpending -
              monthlyTotal,
          )} menos que tu promedio mensual.`
        : monthlyTotal >
          averageMonthlySpending
        ? `Este mes llevas ${money(
            monthlyTotal -
              averageMonthlySpending,
          )} más que tu promedio mensual.`
        : "Este mes estás exactamente en tu promedio mensual."
      : "Cuando tengas al menos 2 meses con movimientos, Listik podrá comparar tu gasto con tu promedio.";

  const smallExpenseInsight =
    monthlyTotal >
    0
      ? `Los gastos hormiga representan ${smallExpenseShare.toFixed(
          0,
        )}% de tu gasto mensual.`
      : "Todavía no hay gastos suficientes para analizar tus gastos hormiga.";

  const supermarketInsight =
    monthlyTotal >
    0
      ? `El supermercado representa ${supermarketShare.toFixed(
          0,
        )}% de tu gasto mensual.`
      : "Todavía no hay compras de supermercado para analizar.";

  /*
   * ==========================================
   * NAVEGACIÓN DE MESES
   * ==========================================
   */

  function previousMonth() {
    const date =
      new Date(
        selectedYear,
        selectedMonth - 1,
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
        selectedMonth + 1,
        1,
      );

    const currentMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

    if (
      date >
      currentMonth
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

  const isCurrentMonth =
    selectedYear ===
      now.getFullYear() &&
    selectedMonth ===
      now.getMonth();

  /*
   * ==========================================
   * CARGANDO
   * ==========================================
   */

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

            <p className="mt-4 font-black text-slate-700">
              Preparando tu reporte...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          to="/historial"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-green-700"
        >
          <ArrowLeft
            size={17}
          />

          Volver a mis compras
        </Link>

        {/* ======================================
            HERO
        ====================================== */}

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
                Supermercado, gastos hormiga y ahorro en una sola vista.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  previousMonth
                }
                className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700 transition hover:bg-green-50"
              >
                ← Mes anterior
              </button>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                disabled={
                  isCurrentMonth
                }
                className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mes siguiente →
              </button>
            </div>
          </div>
        </section>

        {/* ======================================
            ERROR
        ====================================== */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        )}

        {/* ======================================
            KPIs PRINCIPALES
        ====================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <WalletCards className="text-slate-500" />

            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Gasto total
            </p>

            <p className="mt-1 text-3xl font-black text-slate-950">
              {money(
                monthlyTotal,
              )}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-400">
              Súper + gastos hormiga
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <ShoppingCart className="text-slate-500" />

            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Supermercado
            </p>

            <p className="mt-1 text-3xl font-black text-slate-950">
              {money(
                supermarketTotal,
              )}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-400">
              {report.purchases} compra
              {report.purchases ===
              1
                ? ""
                : "s"}
            </p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <Bug className="text-amber-600" />

            <p className="mt-3 text-xs font-black uppercase tracking-wide text-amber-600">
              Gasto hormiga
            </p>

            <p className="mt-1 text-3xl font-black text-amber-950">
              {money(
                smallExpenseTotal,
              )}
            </p>

            <p className="mt-2 text-xs font-bold text-amber-700">
              {currentSmallExpenses.length} movimiento
              {currentSmallExpenses.length ===
              1
                ? ""
                : "s"}
            </p>
          </article>

          <article className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <PiggyBank className="text-green-700" />

            <p className="mt-3 text-xs font-black uppercase tracking-wide text-green-600">
              Ahorro con Listik
            </p>

            <p className="mt-1 text-3xl font-black text-green-950">
              {money(
                savingsTotal,
              )}
            </p>

            <p className="mt-2 text-xs font-bold text-green-700">
              Ahorro registrado en compras
            </p>
          </article>
        </section>


        {/* ======================================
            PRESUPUESTO MENSUAL
        ====================================== */}

        <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Target className="mt-1 shrink-0 text-violet-600" />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                  Presupuesto mensual
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {budget > 0
                    ? `Tu meta es ${money(budget)}`
                    : "Define cuánto quieres gastar este mes"}
                </h2>

                {budget > 0 && (
                  <p
                    className={`mt-2 text-sm font-bold ${
                      budgetExceeded
                        ? "text-red-600"
                        : "text-slate-600"
                    }`}
                  >
                    {budgetExceeded
                      ? `Has superado tu presupuesto por ${money(
                          Math.abs(
                            budgetRemaining,
                          ),
                        )}.`
                      : `Te quedan ${money(
                          Math.max(
                            0,
                            budgetRemaining,
                          ),
                        )} disponibles.`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full gap-2 lg:w-auto">
              <input
                type="number"
                min="1"
                step="1"
                value={budgetInput}
                onChange={(event) =>
                  setBudgetInput(
                    event.target.value,
                  )
                }
                placeholder="Ej. 7000"
                className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-4 py-3 font-bold outline-none focus:border-violet-400 lg:w-44"
              />

              <button
                type="button"
                onClick={() =>
                  void handleSaveBudget()
                }
                disabled={savingBudget}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                <Save size={17} />

                {savingBudget
                  ? "Guardando..."
                  : "Guardar"}
              </button>
            </div>
          </div>

          {budget > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-700">
                  Usado
                </p>

                <p
                  className={`text-sm font-black ${
                    budgetExceeded
                      ? "text-red-600"
                      : "text-violet-700"
                  }`}
                >
                  {budgetUsedPercentage.toFixed(
                    1,
                  )}
                  %
                </p>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-violet-100">
                <div
                  className={
                    budgetExceeded
                      ? "h-full rounded-full bg-red-500"
                      : "h-full rounded-full bg-violet-600"
                  }
                  style={{
                    width: `${Math.min(
                      100,
                      budgetUsedPercentage,
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-bold text-slate-500">
                <span>
                  Gastado:{" "}
                  {money(
                    monthlyTotal,
                  )}
                </span>

                <span>
                  Presupuesto:{" "}
                  {money(
                    budget,
                  )}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ======================================
            COMPARACIÓN MENSUAL
        ====================================== */}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {changeAmount <=
            0 ? (
              <TrendingDown className="mt-1 shrink-0 text-green-600" />
            ) : (
              <TrendingUp className="mt-1 shrink-0 text-amber-600" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Comparación mensual
              </p>

              {previousMonthlyTotal >
              0 ? (
                <>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    Gastaste{" "}
                    {money(
                      Math.abs(
                        changeAmount,
                      ),
                    )}{" "}
                    {changeAmount <=
                    0
                      ? "menos"
                      : "más"}{" "}
                    que el mes anterior
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {changePercentage !==
                    null
                      ? `${Math.abs(
                          changePercentage,
                        ).toFixed(
                          1,
                        )}% de diferencia.`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-lg font-black text-slate-950">
                  Aún no hay un mes anterior para comparar
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs font-black uppercase text-slate-400">
                Mes anterior
              </p>

              <p className="mt-1 text-xl font-black text-slate-950">
                {money(
                  previousMonthlyTotal,
                )}
              </p>
            </div>
          </div>
        </section>


        {/* ======================================
            EVOLUCIÓN DE GASTOS
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Evolución de gastos
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Últimos 6 meses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Supermercado, gasto hormiga y gasto total.
            </p>
          </div>

          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(
                    value,
                  ) =>
                    `$${Number(
                      value,
                    ).toLocaleString(
                      "es-MX",
                      {
                        maximumFractionDigits:
                          0,
                      },
                    )}`
                  }
                />

                <Tooltip
                  formatter={(
                    value,
                    name,
                  ) => [
                    money(
                      Number(
                        value ??
                          0,
                      ),
                    ),
                    String(
                      name,
                    ),
                  ]}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="supermarket"
                  name="Supermercado"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="smallExpenses"
                  name="Gasto hormiga"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={{
                    r: 4,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {monthsWithSpending.length < 2 ? (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Historial disponible
              </p>

              <p className="mt-1 text-xl font-black text-slate-950">
                {monthsWithSpending.length} mes
                {monthsWithSpending.length === 1
                  ? ""
                  : "es"} con movimientos
              </p>

              <p className="mt-2 text-sm font-bold text-slate-500">
                Necesitamos al menos 2 meses con movimientos para mostrar
                tendencias, menor gasto y mayor gasto con sentido.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-green-600">
                  Menor gasto
                </p>

                <p className="mt-1 text-lg font-black capitalize text-slate-950">
                  {lowestSpendingMonth
                    ? lowestSpendingMonth.month
                    : "—"}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {money(
                    lowestSpendingMonth?.total ??
                      0,
                  )}
                </p>
              </article>

              <article className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-violet-600">
                  Promedio mensual
                </p>

                <p className="mt-1 text-lg font-black text-slate-950">
                  {money(
                    averageMonthlySpending,
                  )}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Meses con movimientos
                </p>
              </article>

              <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                  Mayor gasto
                </p>

                <p className="mt-1 text-lg font-black capitalize text-slate-950">
                  {highestSpendingMonth
                    ? highestSpendingMonth.month
                    : "—"}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {money(
                    highestSpendingMonth?.total ??
                      0,
                  )}
                </p>
              </article>
            </div>
          )}
        </section>


        {/* ======================================
            INSIGHTS LISTIK
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
              Insights Listik
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Lo más importante de tu mes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Listik interpreta tus gastos para ayudarte a entenderlos mejor.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-violet-600">
                Presupuesto
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                {budgetInsight}
              </p>
            </article>

            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-green-600">
                Tendencia
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                {spendingInsight}
              </p>
            </article>

            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                Gasto hormiga
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                {smallExpenseInsight}
              </p>
            </article>

            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                Supermercado
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                {supermarketInsight}
              </p>
            </article>
          </div>
        </section>

        {/* ======================================
            DISTRIBUCIÓN PRINCIPAL
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            ¿En qué se fue tu dinero?
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Distribución entre supermercado y pequeños gastos.
          </p>

          {monthlyTotal >
          0 ? (
            <div className="mt-6 space-y-5">
              {[
                {
                  label:
                    "Supermercado",

                  amount:
                    supermarketTotal,
                },

                {
                  label:
                    "Gasto hormiga",

                  amount:
                    smallExpenseTotal,
                },
              ].map(
                (
                  row,
                ) => {
                  const percentage =
                    monthlyTotal >
                    0
                      ? (
                          row.amount /
                          monthlyTotal
                        ) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        row.label
                      }
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-black text-slate-800">
                          {row.label}
                        </p>

                        <div className="text-right">
                          <p className="font-black text-slate-950">
                            {money(
                              row.amount,
                            )}
                          </p>

                          <p className="text-xs font-bold text-slate-400">
                            {percentage.toFixed(
                              0,
                            )}
                            %
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={
                            row.label ===
                            "Gasto hormiga"
                              ? "h-full rounded-full bg-amber-500"
                              : "h-full rounded-full bg-green-600"
                          }
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
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              Todavía no hay gastos registrados para este mes.
            </p>
          )}
        </section>

        {/* ======================================
            GASTO HORMIGA POR CATEGORÍA
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Bug className="text-amber-600" />

            <h2 className="text-xl font-black text-slate-950">
              Gasto hormiga por categoría
            </h2>
          </div>

          {categoryTotals.length ===
          0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No hay gastos hormiga registrados para este mes.
            </p>
          ) : (
            <>
              {topSmallExpenseCategory && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                    Categoría con mayor gasto
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-950">
                    {topSmallExpenseCategory[0]} ·{" "}
                    {money(
                      topSmallExpenseCategory[1],
                    )}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {categoryTotals.map(
                  (
                    [
                      category,
                      total,
                    ],
                  ) => {
                    const percentage =
                      smallExpenseTotal >
                      0
                        ? (
                            total /
                            smallExpenseTotal
                          ) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          category
                        }
                        className="rounded-2xl border border-amber-100 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-black text-slate-950">
                            {category}
                          </p>

                          <div className="text-right">
                            <p className="font-black text-slate-950">
                              {money(
                                total,
                              )}
                            </p>

                            <p className="text-xs font-bold text-slate-400">
                              {percentage.toFixed(
                                0,
                              )}
                              %
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
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
            </>
          )}
        </section>

        {/* ======================================
            GASTO POR TIENDA
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Store className="text-green-600" />

            <h2 className="text-xl font-black text-slate-950">
              Gasto por supermercado
            </h2>
          </div>

          {report.stores.length ===
          0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No hay compras de supermercado guardadas para este mes.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {report.stores.map(
                (
                  store,
                ) => {
                  const percentage =
                    supermarketTotal >
                    0
                      ? (
                          store.total /
                          supermarketTotal
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
                            )}
                            %
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

        <PurchaseProductInsights />

        {/* ======================================
            RESUMEN DE ACTIVIDAD
        ====================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <CalendarRange className="text-green-600" />

            <p className="mt-3 text-xs font-black uppercase text-slate-400">
              Compras de súper
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {report.purchases}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Bug className="text-amber-600" />

            <p className="mt-3 text-xs font-black uppercase text-slate-400">
              Gastos hormiga
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {currentSmallExpenses.length}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <WalletCards className="text-slate-500" />

            <p className="mt-3 text-xs font-black uppercase text-slate-400">
              Movimientos totales
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {report.purchases +
                currentSmallExpenses.length}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
