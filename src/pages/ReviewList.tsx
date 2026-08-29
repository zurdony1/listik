import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  searchQuickList,
  type QuickListMatch,
} from "../services/quickListService";

import type {
  Product,
} from "../types/Product";

/*
 * ==========================================
 * SELECCIONES
 * ==========================================
 */

interface SelectionState {
  [originalText: string]:
    | string
    | null;
}

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

export default function ReviewList() {
  const navigate =
    useNavigate();

  const {
  profile,

  loading:
    authLoading,

  profileLoading,

  completeOnboarding,
} =
  useAuth();

  /*
   * ========================================
   * ESTADOS
   * ========================================
   */

  const [
    matches,
    setMatches,
  ] =
    useState<
      QuickListMatch[]
    >(
      [],
    );

  const [
    selections,
    setSelections,
  ] =
    useState<SelectionState>(
      {},
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
    useState("");

    const [
  completing,
  setCompleting,
] =
  useState(false);

  /*
   * ========================================
   * UBICACIÓN
   * ========================================
   */

  const state =
    profile?.state
      ?.trim() ??
    "";

  const municipality =
    profile?.municipality
      ?.trim() ??
    "";

  /*
   * ========================================
   * LISTA PENDIENTE
   * ========================================
   */

  const pendingItems =
    useMemo(
      () => {
        const raw =
          sessionStorage.getItem(
            "listik_pending_list",
          );

        if (!raw) {
          return [];
        }

        try {
          const parsed =
            JSON.parse(
              raw,
            );

          if (
            !Array.isArray(
              parsed,
            )
          ) {
            return [];
          }

          return parsed
            .map(
              (
                item,
              ) =>
                String(
                  item,
                ).trim(),
            )
            .filter(
              Boolean,
            );
        } catch {
          return [];
        }
      },
      [],
    );

  /*
   * ========================================
   * BUSCAR COINCIDENCIAS
   * ========================================
   */

  useEffect(
    () => {
      if (
        authLoading ||
        profileLoading
      ) {
        return;
      }

      if (
        pendingItems.length ===
        0
      ) {
        setError(
          "No encontramos una lista pendiente para revisar.",
        );

        setLoading(
          false,
        );

        return;
      }

      if (
        !state ||
        !municipality
      ) {
        setError(
          "Necesitamos tu ubicación para buscar productos disponibles en tu zona.",
        );

        setLoading(
          false,
        );

        return;
      }

      let cancelled =
        false;

      async function loadMatches() {
        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          const result =
            await searchQuickList(
              pendingItems,
              state,
              municipality,
            );

          if (
            cancelled
          ) {
            return;
          }

          setMatches(
            result,
          );

          /*
           * Si solamente encontramos
           * un producto, lo dejamos
           * preseleccionado.
           */

          const initialSelections:
            SelectionState =
            {};

          for (
            const match
            of result
          ) {
            if (
              match.products.length ===
              1
            ) {
              initialSelections[
                match.originalText
              ] =
                match.products[0]
                  .id;
            } else {
              initialSelections[
                match.originalText
              ] =
                null;
            }
          }

          setSelections(
            initialSelections,
          );

          console.log(
            "🧠 LISTA INTERPRETADA:",
            result,
          );
        } catch (
          err
        ) {
          console.error(
            "Error procesando lista rápida:",
            err,
          );

          if (
            !cancelled
          ) {
            setError(
              "No pudimos buscar las coincidencias de tu lista.",
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

      void loadMatches();

      return () => {
        cancelled =
          true;
      };
    },
    [
      authLoading,
      profileLoading,
      pendingItems,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * PRODUCTOS CONFIRMADOS
   * ========================================
   */

  const selectedProducts =
    useMemo(
      () => {
        const result:
          Product[] =
          [];

        for (
          const match
          of matches
        ) {
          const selectedId =
            selections[
              match.originalText
            ];

          if (
            !selectedId
          ) {
            continue;
          }

          const product =
            match.products.find(
              (
                item,
              ) =>
                item.id ===
                selectedId,
            );

          if (
            product
          ) {
            result.push(
              product,
            );
          }
        }

        return result;
      },
      [
        matches,
        selections,
      ],
    );

  /*
   * ========================================
   * PENDIENTES
   * ========================================
   */

  const unresolvedCount =
    matches.filter(
      (
        match,
      ) =>
        !selections[
          match.originalText
        ],
    ).length;

  /*
   * ========================================
   * SELECCIONAR PRODUCTO
   * ========================================
   */

  function selectProduct(
    originalText: string,
    productId: string,
  ) {
    setSelections(
      (
        current,
      ) => ({
        ...current,

        [originalText]:
          productId,
      }),
    );
  }

  /*
   * ========================================
   * CONTINUAR
   * ========================================
   */

  async function handleContinue() {
  if (
    selectedProducts.length ===
      0 ||
    completing
  ) {
    return;
  }

  try {
    setCompleting(
      true,
    );

    setError(
      "",
    );

    /*
     * ========================================
     * GUARDAR PRODUCTOS CONFIRMADOS
     * ========================================
     */

    sessionStorage.setItem(
      "listik_confirmed_products",
      JSON.stringify(
        selectedProducts,
      ),
    );

    /*
     * ========================================
     * LIMPIAR LISTA TEMPORAL
     * ========================================
     */

    sessionStorage.removeItem(
      "listik_pending_list",
    );

    /*
     * ========================================
     * COMPLETAR ONBOARDING
     * ========================================
     *
     * Si este usuario acaba de registrarse,
     * aquí queda marcado definitivamente
     * como usuario configurado.
     *
     * Si ya era usuario existente,
     * simplemente vuelve a quedar true.
     */

    await completeOnboarding();

    /*
     * ========================================
     * ENTRAR A LISTIK
     * ========================================
     */

    navigate(
  "/app?modo=lista-confirmada",
  {
    replace: true,
  },
);
  } catch (
    err
  ) {
    console.error(
      "Error finalizando primera lista:",
      err,
    );

    setError(
      "No pudimos terminar de configurar tu cuenta. Intenta nuevamente.",
    );
  } finally {
    setCompleting(
      false,
    );
  }
}

  /*
   * ========================================
   * CARGANDO
   * ========================================
   */

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              🧠
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              Entendiendo tu lista
            </h1>

            <p className="mt-2 text-slate-500">
              Listik está buscando las mejores coincidencias en{" "}
              {municipality &&
                state
                ? `${municipality}, ${state}`
                : "tu zona"}
              .
            </p>

            <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * ========================================
   * ERROR
   * ========================================
   */

  if (
    error
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              ⚠️
            </div>

            <h1 className="mt-4 text-2xl font-black text-slate-900">
              No pudimos revisar tu lista
            </h1>

            <p className="mt-2 text-slate-500">
              {
                error
              }
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/crear-lista",
                )
              }
              className="mt-6 rounded-2xl bg-green-600 px-6 py-3 font-black text-white hover:bg-green-700"
            >
              Volver a mi lista
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ========================================
   * INTERFAZ
   * ========================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ==================================
          HEADER
      ================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/crear-lista",
              )
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-xl">
              🛒
            </div>

            <div className="text-left">
              <p className="text-xl font-black text-slate-900">
                Listik
              </p>

              <p className="text-xs font-semibold text-green-600">
                Revisar lista
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/crear-lista",
              )
            }
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Editar lista
          </button>
        </div>
      </header>

      {/* ==================================
          CONTENIDO
      ================================== */}

      <section className="mx-auto max-w-4xl px-6 pb-44 pt-10">
        {/* INTRO */}

        <div>
          <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            ✨ Coincidencias encontradas
          </span>

          <h1 className="mt-5 text-3xl font-black text-slate-900">
            Revisa tu lista
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Listik interpretó cada renglón y buscó productos disponibles en tu zona. Confirma cuál querías.
          </p>

          {municipality &&
            state && (
              <p className="mt-3 text-sm font-black text-green-700">
                📍{" "}
                {
                  municipality
                }
                ,{" "}
                {
                  state
                }
              </p>
            )}
        </div>

        {/* ==================================
            RESUMEN
        ================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-black text-slate-900">
              {
                matches.length
              }
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
              Productos escritos
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-2xl font-black text-green-700">
              {
                selectedProducts.length
              }
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-green-600">
              Confirmados
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-2xl font-black text-amber-700">
              {
                unresolvedCount
              }
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-600">
              Por revisar
            </p>
          </div>
        </div>

        {/* ==================================
            PRODUCTOS
        ================================== */}

        <div className="mt-8 space-y-5">
          {matches.map(
            (
              match,
              matchIndex,
            ) => {
              const selectedId =
                selections[
                  match.originalText
                ];

              /*
               * Detectamos si Listik cambió
               * la frase original.
               */

              const normalizedOriginal =
                match.normalizedText
                  ?.trim();

              const interpreted =
                match.interpretedText
                  ?.trim();

              const interpretationChanged =
                Boolean(
                  interpreted &&
                    normalizedOriginal &&
                    interpreted !==
                      normalizedOriginal,
                );

              return (
                <article
                  key={`${match.originalText}-${matchIndex}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* ==========================
                      TEXTO ORIGINAL
                  ========================== */}

                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                          Tú escribiste
                        </p>

                        <h2 className="mt-1 text-lg font-black text-slate-900">
                          “
                          {
                            match.originalText
                          }
                          ”
                        </h2>
                      </div>

                      {match.totalCount >
                        0 ? (
                        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                          {
                            match.totalCount
                          }{" "}
                          coincidencia
                          {match.totalCount ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      ) : (
                        <span className="w-fit rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">
                          Sin coincidencias
                        </span>
                      )}
                    </div>

                    {/* ==========================
                        LISTIK ENTENDIÓ
                    ========================== */}

                    {(interpretationChanged ||
                      match.presentationHint) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {interpretationChanged && (
                          <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                            ✨ Listik entendió:{" "}
                            {
                              match.interpretedText
                            }
                          </span>
                        )}

                        {match.presentationHint && (
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                            📦 Presentación detectada:{" "}
                            {
                              match.presentationHint
                            }
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ==========================
                      SIN RESULTADOS
                  ========================== */}

                  {match.products.length ===
                  0 ? (
                    <div className="p-6">
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <div className="text-3xl">
                          🤔
                        </div>

                        <p className="mt-3 font-black text-slate-700">
                          No encontramos una coincidencia clara
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Intenta escribir el producto con un poco más de detalle.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              "/crear-lista",
                            )
                          }
                          className="mt-4 text-sm font-black text-green-600"
                        >
                          Editar mi lista
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                        Elige una opción
                      </p>

                      {/* ========================
                          CANDIDATOS
                      ======================== */}

                      <div className="grid gap-3">
                        {match.products.map(
                          (
                            product,
                          ) => {
                            const isSelected =
                              selectedId ===
                              product.id;

                            const firstPresentation =
                              product.presentations?.[
                                0
                              ];

                            return (
                              <button
                                key={
                                  product.id
                                }
                                type="button"
                                onClick={() =>
                                  selectProduct(
                                    match.originalText,
                                    product.id,
                                  )
                                }
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  isSelected
                                    ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                                    : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    {/* PRODUCTO */}

                                    <p className="font-black text-slate-900">
                                      {
                                        product.name
                                      }
                                    </p>

                                    {/* MARCA */}

                                    <p className="mt-1 text-sm text-slate-500">
                                      {product.brand ||
                                        "Marca no especificada"}
                                    </p>

                                    {/* PRESENTACIÓN */}

                                    {firstPresentation && (
                                      <div className="mt-2">
                                        <p className="text-xs font-bold text-slate-600">
                                          {
                                            firstPresentation.presentationName
                                          }
                                        </p>

                                        {match.presentationHint && (
                                          <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                                            📦 Buscabas{" "}
                                            {
                                              match.presentationHint
                                            }
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* CATEGORÍA */}

                                    {product.category && (
                                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                        {
                                          product.category
                                        }
                                      </span>
                                    )}
                                  </div>

                                  {/* CHECK */}

                                  <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                                      isSelected
                                        ? "border-green-600 bg-green-600 text-white"
                                        : "border-slate-300 bg-white text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </div>
                                </div>
                              </button>
                            );
                          },
                        )}
                      </div>

                      {/* MÁS RESULTADOS */}

                      {match.totalCount >
                        match.products.length && (
                        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs text-slate-500">
                            Mostrando las{" "}
                            <span className="font-black text-slate-700">
                              {
                                match.products.length
                              }
                            </span>{" "}
                            opciones más relevantes de{" "}
                            <span className="font-black text-slate-700">
                              {
                                match.totalCount
                              }
                            </span>{" "}
                            coincidencias.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>

        {/* ESPACIO EXTRA PARA LA BARRA */}

        <div className="h-8" />
      </section>

      {/* ==================================
          BARRA INFERIOR
      ================================== */}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-900">
              {
                selectedProducts.length
              }{" "}
              de{" "}
              {
                matches.length
              }{" "}
              productos confirmados
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {unresolvedCount >
              0
                ? `Te faltan ${unresolvedCount} por revisar.`
                : "Tu lista está lista para continuar."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              selectedProducts.length ===
              0
            }
            className="shrink-0 rounded-2xl bg-green-600 px-7 py-3 font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            Agregar a mi lista →
          </button>
        </div>
      </div>
    </main>
  );
}