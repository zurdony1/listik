import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  CalendarDays,
  ChevronRight,
  History,
  Home,
  ReceiptText,
  ShoppingCart,
  Store,
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

export default function PurchaseHistory() {
  const navigate =
    useNavigate();

  const {
    user,
    loading:
      authLoading,
  } =
    useAuth();

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
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  /*
   * ==========================================
   * CARGAR HISTORIAL
   * ==========================================
   */

  useEffect(
    () => {
      /*
       * Esperamos a que AuthContext
       * termine de comprobar la sesión.
       */

      if (
        authLoading
      ) {
        return;
      }

      /*
       * Si no hay usuario,
       * limpiamos historial.
       */

      if (
        !user
      ) {
        setItems([]);

        setLoading(false);

        return;
      }

      /*
       * Guardamos el ID en una constante.
       *
       * Así TypeScript sabe que userId
       * definitivamente es string incluso
       * dentro de la función async.
       */

      const userId =
        user.id;

      let cancelled =
        false;

      async function loadHistory() {
        try {
          setLoading(true);

          setError(null);

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
          historyError
        ) {
          console.error(
            "Error cargando historial de compras:",
            historyError,
          );

          if (
            !cancelled
          ) {
            setError(
              historyError instanceof Error
                ? historyError.message
                : "No pudimos cargar tu historial.",
            );

            setItems([]);
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(false);
          }
        }
      }

      void loadHistory();

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

  /*
   * ==========================================
   * MES ACTUAL
   * ==========================================
   */

  const now =
    new Date();

  /*
   * ==========================================
   * RESUMEN DEL MES
   * ==========================================
   */

  const report =
    useMemo(
      () =>
        buildMonthlyExpenseReport(
          items,
          now.getFullYear(),
          now.getMonth(),
        ),
      [
        items,
      ],
    );

  /*
   * ==========================================
   * COMPRAS DEL MES
   * ==========================================
   */

  const currentMonthItems =
    useMemo(
      () =>
        getMonthPurchases(
          items,
          now.getFullYear(),
          now.getMonth(),
        ),
      [
        items,
      ],
    );

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
              Cargando tus compras...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * SIN SESIÓN
   * ==========================================
   */

  if (
    !user
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <History
              className="mx-auto text-green-600"
              size={34}
            />

            <h1 className="mt-4 text-3xl font-black text-slate-950">
              Tu historial vive en tu cuenta
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Inicia sesión para consultar tus compras y reportes de gasto.
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex rounded-xl bg-green-600 px-6 py-3 font-black text-white transition hover:bg-green-700"
            >
              Iniciar sesión
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* ======================================
            NAVEGACIÓN
        ====================================== */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
          >
            <Home
              size={17}
            />

            Inicio
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/reporte-mensual",
              )
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-black text-green-700 transition hover:bg-green-100"
          >
            Ver reporte mensual

            <ChevronRight
              size={17}
            />
          </button>
        </div>

        {/* ======================================
            HERO
        ====================================== */}

        <section className="rounded-[2rem] border border-green-200 bg-green-50/60 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
            Historial Listik
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Mis compras
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Cada ticket guardado se convierte en parte de tu historial de gastos.
          </p>
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
            KPIs
        ====================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* GASTADO */}

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <WalletCards
                size={18}
              />

              <p className="text-xs font-black uppercase tracking-wide">
                Gastado este mes
              </p>
            </div>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {money(
                report.totalSpent,
              )}
            </p>
          </article>

          {/* COMPRAS */}

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart
                size={18}
              />

              <p className="text-xs font-black uppercase tracking-wide">
                Compras
              </p>
            </div>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {report.purchases}
            </p>
          </article>

          {/* PROMEDIO */}

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ReceiptText
                size={18}
              />

              <p className="text-xs font-black uppercase tracking-wide">
                Ticket promedio
              </p>
            </div>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {money(
                report.averageTicket,
              )}
            </p>
          </article>

          {/* TIENDA */}

          <article className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-green-700">
              <Store
                size={18}
              />

              <p className="text-xs font-black uppercase tracking-wide">
                Donde más gastaste
              </p>
            </div>

            <p className="mt-3 text-xl font-black text-green-900">
              {report.topStore
                ?.storeName ??
                "—"}
            </p>

            {report.topStore && (
              <p className="mt-1 text-lg font-black text-green-700">
                {money(
                  report.topStore.total,
                )}
              </p>
            )}
          </article>
        </section>

        {/* ======================================
            REPORTE MENSUAL
        ====================================== */}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Reporte mensual
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                Entiende en qué se fue tu dinero
              </h2>
            </div>

            <Link
              to="/reporte-mensual"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
            >
              Ver reporte

              <ChevronRight
                size={17}
              />
            </Link>
          </div>
        </section>

        {/* ======================================
            ENCABEZADO COMPRAS
        ====================================== */}

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Actividad
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Compras de este mes
            </h2>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {currentMonthItems.length}
          </span>
        </div>

        {/* ======================================
            SIN COMPRAS
        ====================================== */}

        {currentMonthItems.length ===
        0 ? (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <CalendarDays
              className="mx-auto text-green-600"
              size={32}
            />

            <h3 className="mt-4 text-xl font-black text-slate-950">
              Todavía no tienes compras este mes
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              Completa una compra y guarda su ticket para empezar tu historial.
            </p>

            <Link
              to="/lista"
              className="mt-5 inline-flex rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              Ir a mi lista
            </Link>
          </section>
        ) : (

          /* ====================================
             LISTA DE COMPRAS
          ==================================== */

          <section className="mt-5 space-y-4">
            {currentMonthItems.map(
              (
                item,
              ) => (
                <article
                  key={
                    item.id
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    {/* INFORMACIÓN */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                          ✓ Compra guardada
                        </span>

                        {item.ticketScannedAt && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            🧾 Ticket escaneado
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xl font-black text-slate-950">
                        {item.storeName ??
                          "Compra Listik"}
                      </p>

                      {item.branchName && (
                        <p className="mt-1 text-sm font-bold text-green-700">
                          {item.branchName}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(
                          item.completedAt ??
                            item.ticketScannedAt ??
                            item.startedAt,
                        )}
                      </p>
                    </div>

                    {/* TOTAL */}

                    <div className="flex shrink-0 items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <p className="text-xs font-black uppercase text-slate-400">
                          Total
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-950">
                          {money(
                            item.total,
                          )}
                        </p>
                      </div>

                      <Link
                        to={`/compra/resumen?tripId=${encodeURIComponent(
                          item.id,
                        )}`}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                      >
                        Ver

                        <ChevronRight
                          size={17}
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>
        )}

        {/* ======================================
            BOTÓN FINAL
        ====================================== */}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-6 py-3 font-black text-green-700 shadow-sm transition hover:bg-green-50"
          >
            <Home
              size={18}
            />

            Volver al inicio
          </button>
        </div>
      </div>
    </main>
  );
}