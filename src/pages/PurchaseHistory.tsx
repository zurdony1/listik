import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Coffee,
  History,
  Home,
  Plus,
  ShoppingCart,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  buildMonthlyExpenseReport,
  getExpenseHistory,
  getMonthPurchases,
  type ExpensePurchase,
} from "../services/expenseHistoryService";
import {
  createSmallExpense,
  deleteSmallExpense,
  getSmallExpenses,
  type SmallExpense,
} from "../services/smallExpenseService";

import {
  getMonthlyBudget,
} from "../services/monthlyBudgetService";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

const categories = [
  "Café",
  "Snacks",
  "Refresco",
  "Comida fuera",
  "Transporte",
  "Tiendita",
  "Otros",
];

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<ExpensePurchase[]>([]);
  const [smallExpenses, setSmallExpenses] = useState<SmallExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("Café");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [budget, setBudget] = useState(0);
  async function reloadBudget() {
  try {
    const currentBudget =
      await getMonthlyBudget(
        new Date().getFullYear(),
        new Date().getMonth(),
      );

    setBudget(
      Number(
        currentBudget?.amount ??
          0,
      ),
    );
  } catch (budgetError) {
    console.error(
      "Error cargando presupuesto:",
      budgetError,
    );

    setBudget(0);
  }
}
useEffect(() => {
  if (
    authLoading ||
    !user
  ) {
    return;
  }

  void reloadBudget();

  function handleFocus() {
    void reloadBudget();
  }

  window.addEventListener(
    "focus",
    handleFocus,
  );

  return () => {
    window.removeEventListener(
      "focus",
      handleFocus,
    );
  };
}, [
  user,
  authLoading,
]);

  const now = new Date();

  async function reloadSmallExpenses() {
    const current = monthRange(now);
    const previous = monthRange(previousMonth(now));
    const result = await getSmallExpenses(previous.start, current.end);
    setSmallExpenses(result);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setSmallExpenses([]);
      setLoading(false);
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const current = monthRange(now);
        const previous = monthRange(previousMonth(now));
        const [history, ants, budgetResult] = await Promise.all([
          getExpenseHistory(userId),
          getSmallExpenses(previous.start, current.end),
          getMonthlyBudget(
            now.getFullYear(),
            now.getMonth(),
          ),
        ]);

        if (!cancelled) {
          setItems(history);
          setSmallExpenses(ants);
          setBudget(
            Number(
              budgetResult?.amount ??
                0,
            ),
          );
        }
      } catch (historyError) {
        console.error("Error cargando historial:", historyError);
        if (!cancelled) {
          setError(
            historyError instanceof Error
              ? historyError.message
              : "No pudimos cargar tu historial.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const report = useMemo(
    () => buildMonthlyExpenseReport(items, now.getFullYear(), now.getMonth()),
    [items],
  );

  const prevDate = previousMonth(now);
  const previousReport = useMemo(
    () =>
      buildMonthlyExpenseReport(
        items,
        prevDate.getFullYear(),
        prevDate.getMonth(),
      ),
    [items],
  );

  const currentMonthItems = useMemo(
    () => getMonthPurchases(items, now.getFullYear(), now.getMonth()),
    [items],
  );

  const currentSmallExpenses = useMemo(
    () =>
      smallExpenses.filter((expense) => {
        const date = new Date(expense.spent_at);
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }),
    [smallExpenses],
  );

  const previousSmallExpenses = useMemo(
    () =>
      smallExpenses.filter((expense) => {
        const date = new Date(expense.spent_at);
        return (
          date.getFullYear() === prevDate.getFullYear() &&
          date.getMonth() === prevDate.getMonth()
        );
      }),
    [smallExpenses],
  );

  const smallExpenseTotal = useMemo(
    () => currentSmallExpenses.reduce((sum, item) => sum + item.amount, 0),
    [currentSmallExpenses],
  );

  const previousSmallExpenseTotal = useMemo(
    () => previousSmallExpenses.reduce((sum, item) => sum + item.amount, 0),
    [previousSmallExpenses],
  );

  const supermarketTotal = report.totalSpent;
  const monthlyTotal = supermarketTotal + smallExpenseTotal;
  const previousMonthlyTotal = previousReport.totalSpent + previousSmallExpenseTotal;
  const monthDifference = monthlyTotal - previousMonthlyTotal;
  const monthPercent =
    previousMonthlyTotal > 0
      ? (monthDifference / previousMonthlyTotal) * 100
      : null;

  const budgetRemaining =
    budget -
    monthlyTotal;

  const budgetUsedPercentage =
    budget > 0
      ? (monthlyTotal / budget) * 100
      : 0;

  const savingsTotal = useMemo(
    () =>
      currentMonthItems.reduce((sum, item) => {
        const row = item as ExpensePurchase & {
          savingsAmount?: number | null;
          savings_amount?: number | null;
        };
        return (
          sum +
          Number(row.savingsAmount ?? row.savings_amount ?? 0)
        );
      }, 0),
    [currentMonthItems],
  );

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    currentSmallExpenses.forEach((expense) => {
      map.set(
        expense.category,
        (map.get(expense.category) ?? 0) + expense.amount,
      );
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [currentSmallExpenses]);

  async function handleAddExpense(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!concept.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Escribe un concepto y un importe válido.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createSmallExpense({
        concept,
        category,
        amount: numericAmount,
        spentAt: new Date(`${spentAt}T12:00:00`).toISOString(),
      });
      await reloadSmallExpenses();
      setConcept("");
      setAmount("");
      setCategory("Café");
      setSpentAt(new Date().toISOString().slice(0, 10));
      setShowForm(false);
    } catch (expenseError) {
      setError(
        expenseError instanceof Error
          ? expenseError.message
          : "No se pudo guardar el gasto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      setError(null);
      await deleteSmallExpense(id);
      setSmallExpenses((current) => current.filter((item) => item.id !== id));
    } catch (expenseError) {
      setError(
        expenseError instanceof Error
          ? expenseError.message
          : "No se pudo eliminar el gasto.",
      );
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />
            <p className="mt-4 font-black text-slate-700">Cargando tus gastos...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <History className="mx-auto text-green-600" size={34} />
            <h1 className="mt-4 text-3xl font-black text-slate-950">Tu historial vive en tu cuenta</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">Inicia sesión para consultar tus compras y gastos.</p>
            <Link to="/login" className="mt-6 inline-flex rounded-xl bg-green-600 px-6 py-3 font-black text-white">Iniciar sesión</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigate("/")} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm">
            <Home size={17} /> Inicio
          </button>
          <button type="button" onClick={() => navigate("/reporte-mensual")} className="inline-flex w-fit items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-black text-green-700">
            Ver reporte mensual <ChevronRight size={17} />
          </button>
        </div>

        <section className="rounded-[2rem] border border-green-200 bg-green-50/60 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">Historial Listik</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Mis gastos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Supermercado + gastos hormiga en un solo lugar.</p>
        </section>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500"><WalletCards size={18} /><p className="text-xs font-black uppercase">Gasto total del mes</p></div>
            <p className="mt-3 text-3xl font-black text-slate-950">{money(monthlyTotal)}</p>
            <p className="mt-2 text-xs font-bold text-slate-400">Súper + gastos hormiga</p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500"><ShoppingCart size={18} /><p className="text-xs font-black uppercase">Supermercado</p></div>
            <p className="mt-3 text-3xl font-black text-slate-950">{money(supermarketTotal)}</p>
            <p className="mt-2 text-xs font-bold text-slate-400">{report.purchases} compras</p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700"><Coffee size={18} /><p className="text-xs font-black uppercase">Gasto hormiga</p></div>
            <p className="mt-3 text-3xl font-black text-amber-950">{money(smallExpenseTotal)}</p>
            <p className="mt-2 text-xs font-bold text-amber-700">{currentSmallExpenses.length} movimientos</p>
          </article>

          <article className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-green-700"><TrendingDown size={18} /><p className="text-xs font-black uppercase">Ahorro con Listik</p></div>
            <p className="mt-3 text-3xl font-black text-green-900">{money(savingsTotal)}</p>
            <p className="mt-2 text-xs font-bold text-green-700">Ahorro registrado en compras</p>
          </article>
        </section>


        <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Target className="mt-1 shrink-0 text-violet-600" size={22} />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                  Presupuesto mensual
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {budget > 0
                    ? `${money(monthlyTotal)} de ${money(budget)}`
                    : "Todavía no has definido tu presupuesto"}
                </h2>

                {budget > 0 && (
                  <p
                    className={`mt-1 text-sm font-bold ${
                      budgetRemaining < 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {budgetRemaining < 0
                      ? `Superaste tu presupuesto por ${money(
                          Math.abs(
                            budgetRemaining,
                          ),
                        )}.`
                      : `Te quedan ${money(
                          budgetRemaining,
                        )}.`}
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/reporte-mensual"
              className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100"
            >
              {budget > 0
                ? `${budgetUsedPercentage.toFixed(1)}% usado`
                : "Definir presupuesto"}
            </Link>
          </div>

          {budget > 0 && (
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-violet-100">
              <div
                className={
                  budgetRemaining < 0
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
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Comparación mensual</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {monthPercent === null ? "Aún no hay un mes anterior para comparar" : monthDifference <= 0 ? "Gastaste menos que el mes pasado" : "Gastaste más que el mes pasado"}
              </h2>
              {monthPercent !== null && (
                <p className={`mt-2 inline-flex items-center gap-1 text-sm font-black ${monthDifference <= 0 ? "text-green-700" : "text-red-600"}`}>
                  {monthDifference <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  {monthDifference > 0 ? "+" : ""}{monthPercent.toFixed(1)}% · {money(Math.abs(monthDifference))} de diferencia
                </p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-black uppercase text-slate-400">Mes anterior</p>
              <p className="mt-1 text-2xl font-black text-slate-800">{money(previousMonthlyTotal)}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">🐜 Gastos hormiga</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Pequeños gastos, total real</h2>
              <p className="mt-1 text-sm text-slate-500">También cuentan dentro de tu gasto mensual.</p>
            </div>
            <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white">
              <Plus size={17} /> Agregar gasto
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddExpense} className="mt-5 grid gap-3 rounded-2xl bg-amber-50 p-4 md:grid-cols-4">
              <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Café" className="rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ Importe" className="rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none" />
              <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} className="rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none" />
              <button disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white md:col-span-4 disabled:opacity-50">{saving ? "Guardando..." : "Guardar gasto"}</button>
            </form>
          )}

          {categoryTotals.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {categoryTotals.map(([name, total]) => (
                <span key={name} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">{name}: {money(total)}</span>
              ))}
            </div>
          )}

          {currentSmallExpenses.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">Todavía no has registrado gastos hormiga este mes.</p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {currentSmallExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-black text-slate-900">{expense.concept}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{expense.category} · {formatDate(expense.spent_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-slate-950">{money(expense.amount)}</p>
                    <button type="button" onClick={() => void handleDeleteExpense(expense.id)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Eliminar gasto"><Trash2 size={17} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">Reporte mensual</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Entiende en qué se fue tu dinero</h2>
            </div>
            <Link to="/reporte-mensual" className="inline-flex items-center justify-center gap-1 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white">Ver reporte <ChevronRight size={17} /></Link>
          </div>
        </section>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">Actividad</p><h2 className="mt-1 text-2xl font-black text-slate-950">Compras de este mes</h2></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{currentMonthItems.length}</span>
        </div>

        {currentMonthItems.length === 0 ? (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <CalendarDays className="mx-auto text-green-600" size={32} />
            <h3 className="mt-4 text-xl font-black text-slate-950">Todavía no tienes compras este mes</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Completa una compra y guarda su ticket para empezar tu historial.</p>
            <Link to="/lista" className="mt-5 inline-flex rounded-xl bg-green-600 px-5 py-3 font-black text-white">Ir a mi lista</Link>
          </section>
        ) : (
          <section className="mt-5 space-y-4">
            {currentMonthItems.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">✓ Compra guardada</span>
                      {item.ticketScannedAt && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">🧾 Ticket escaneado</span>}
                    </div>
                    <p className="mt-3 text-xl font-black text-slate-950">{item.storeName ?? "Compra Listik"}</p>
                    {item.branchName && <p className="mt-1 text-sm font-bold text-green-700">{item.branchName}</p>}
                    <p className="mt-2 text-sm text-slate-500">{formatDate(item.completedAt ?? item.ticketScannedAt ?? item.startedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 sm:gap-6">
                    <div className="text-right"><p className="text-xs font-black uppercase text-slate-400">Total</p><p className="mt-1 text-2xl font-black text-slate-950">{money(item.total)}</p></div>
                    <Link to={`/compra/resumen?tripId=${encodeURIComponent(item.id)}`} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Ver <ChevronRight size={17} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-6 py-3 font-black text-green-700 shadow-sm"><Home size={18} /> Volver al inicio</button>
        </div>
      </div>
    </main>
  );
}