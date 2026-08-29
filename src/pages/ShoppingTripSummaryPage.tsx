import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  CheckCircle2,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import AppNav from "../components/AppNav";

import {
  supabase,
} from "../lib/supabase";

interface SummaryData {
  id: string;

  expectedTotal:
    | number
    | null;

  actualTotal:
    | number
    | null;

  ticketTotal:
    | number
    | null;

  ticketScannedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  storeName:
    | string
    | null;

  branchName:
    | string
    | null;
}

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

export default function ShoppingTripSummaryPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const tripId =
    searchParams.get(
      "tripId",
    );

  const [
    data,
    setData,
  ] =
    useState<
      SummaryData | null
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
        !tripId
      ) {
        setError(
          "No se encontró la compra.",
        );

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

          const {
            data:
              trip,
            error:
              tripError,
          } =
            await supabase
              .from(
                "shopping_trips",
              )
              .select(`
                id,
                expected_total,
                actual_total,
                ticket_total,
                ticket_scanned_at,
                completed_at,
                store_branch_id
              `)
              .eq(
                "id",
                tripId,
              )
              .single();

          if (
            tripError
          ) {
            throw tripError;
          }

          let storeName:
            | string
            | null =
            null;

          let branchName:
            | string
            | null =
            null;

          if (
            trip.store_branch_id
          ) {
            const {
              data:
                branch,
            } =
              await supabase
                .from(
                  "store_branches",
                )
                .select(`
                  id,
                  name,
                  store_id
                `)
                .eq(
                  "id",
                  trip.store_branch_id,
                )
                .maybeSingle();

            if (
              branch
            ) {
              branchName =
                branch.name ??
                null;

              if (
                branch.store_id
              ) {
                const {
                  data:
                    store,
                } =
                  await supabase
                    .from(
                      "stores",
                    )
                    .select(`
                      id,
                      name
                    `)
                    .eq(
                      "id",
                      branch.store_id,
                    )
                    .maybeSingle();

                storeName =
                  store?.name ??
                  null;
              }
            }
          }

          if (
            !cancelled
          ) {
            setData({
              id:
                String(
                  trip.id,
                ),

              expectedTotal:
                trip.expected_total ===
                null
                  ? null
                  : Number(
                      trip.expected_total,
                    ),

              actualTotal:
                trip.actual_total ===
                null
                  ? null
                  : Number(
                      trip.actual_total,
                    ),

              ticketTotal:
                trip.ticket_total ===
                null
                  ? null
                  : Number(
                      trip.ticket_total,
                    ),

              ticketScannedAt:
                trip.ticket_scanned_at ??
                null,

              completedAt:
                trip.completed_at ??
                null,

              storeName,

              branchName,
            });
          }
        } catch (
          loadError
        ) {
          console.error(
            loadError,
          );

          if (
            !cancelled
          ) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "No pudimos cargar la compra.",
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
      tripId,
    ],
  );

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppNav />

        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            Cargando compra...
          </div>
        </div>
      </main>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppNav />

        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">
            {error ??
              "No se encontró la compra."}
          </div>
        </div>
      </main>
    );
  }

  const total =
    data.ticketTotal ??
    data.actualTotal ??
    data.expectedTotal ??
    0;

  const scannerUrl =
    `/tickets?tripId=${encodeURIComponent(
      data.id,
    )}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <section className="rounded-[2rem] border border-green-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2
                size={34}
              />
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Compra completada
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              ¡Compra terminada!
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Guarda el ticket para que Listik lo agregue a tu historial de gastos.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-center">
            <p className="text-xs font-black uppercase text-slate-400">
              Compraste en
            </p>

            <p className="mt-2 text-xl font-black text-slate-950">
              {data.storeName ??
                "Tienda"}
            </p>

            {data.branchName && (
              <p className="mt-1 text-sm font-black text-green-700">
                {data.branchName}
              </p>
            )}
          </div>

          <section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-300">
                  Total de la compra
                </p>

                <p className="mt-2 text-4xl font-black">
                  {money(
                    total,
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {data.ticketScannedAt
                    ? "Total confirmado por ticket."
                    : "Total registrado desde tu compra."}
                </p>
              </div>

              {data.ticketScannedAt ? (
                <div className="rounded-2xl bg-green-500/10 px-5 py-4 text-center">
                  <ReceiptText className="mx-auto text-green-300" />

                  <p className="mt-2 text-sm font-black text-green-200">
                    Ticket guardado
                  </p>
                </div>
              ) : (
                <Link
                  to={
                    scannerUrl
                  }
                  className="rounded-xl bg-green-500 px-5 py-3 text-center font-black text-slate-950"
                >
                  🧾 Escanear ticket
                </Link>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <ShoppingCart className="mt-1 shrink-0 text-green-600" />

              <div>
                <p className="font-black text-slate-950">
                  Tu historial financiero empieza aquí
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Listik irá acumulando tus compras para mostrarte cuánto gastas cada mes y en qué tiendas se concentra tu dinero.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              to="/"
              className="rounded-xl bg-green-600 px-5 py-3 text-center font-black text-white"
            >
              Buscar productos
            </Link>

            <Link
              to="/historial"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center font-black text-slate-700"
            >
              Ver mis compras
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
