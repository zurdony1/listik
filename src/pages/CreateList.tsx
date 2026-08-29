import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

/*
 * ==========================================
 * NORMALIZAR UNA LÍNEA
 * ==========================================
 */

function normalizeLine(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

/*
 * ==========================================
 * CREATE LIST
 * ==========================================
 */

export default function CreateList() {
  const navigate =
    useNavigate();

  const [
    listText,
    setListText,
  ] =
    useState("");

  /*
   * Convertimos:
   *
   * coca cola
   * leche
   * pan
   *
   * en:
   *
   * [
   *   "coca cola",
   *   "leche",
   *   "pan"
   * ]
   */

  const items =
    useMemo(
      () =>
        listText
          .split("\n")
          .map(
            normalizeLine,
          )
          .filter(
            Boolean,
          ),
      [
        listText,
      ],
    );

  const itemCount =
    items.length;

  /*
   * ========================================
   * CONTINUAR
   * ========================================
   */

  function handleContinue() {
    if (
      items.length ===
      0
    ) {
      return;
    }

    /*
     * Temporalmente guardamos la lista
     * en sessionStorage.
     *
     * En el siguiente paso construiremos
     * el matching contra nuestro catálogo.
     */

    sessionStorage.setItem(
      "listik_pending_list",
      JSON.stringify(
        items,
      ),
    );

    navigate(
      "/crear-lista/revisar",
    );
  }

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
              navigate("/")
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
                Compra inteligente
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </header>

      {/* ==================================
          CONTENIDO
      ================================== */}

      <section className="mx-auto max-w-3xl px-6 py-12">
        {/* INTRO */}

        <div className="text-center">
          <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            📝 Lista rápida
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            ¿Qué necesitas comprar?
          </h1>

          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
            Escribe tu lista como lo haces normalmente.
            Pon un producto por renglón y Listik buscará
            las mejores coincidencias.
          </p>
        </div>

        {/* ==================================
            TARJETA
        ================================== */}

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-black text-slate-900">
                  Mi lista
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Un producto por línea
                </p>
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
                {itemCount}{" "}
                {itemCount === 1
                  ? "producto"
                  : "productos"}
              </span>
            </div>

            {/* TEXTAREA */}

            <textarea
              value={
                listText
              }
              onChange={(
                event,
              ) =>
                setListText(
                  event.target
                    .value,
                )
              }
              placeholder={`Ejemplo:

Coca Cola de 1 lt
Jabón de manos
Jabón de trastes
Jamón
Queso
Cereal
Leche de 1 lt
Pan para sandwich
Pan para hot dog
Salchichas`}
              rows={
                12
              }
              autoFocus
              className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* ==================================
              VISTA PREVIA
          ================================== */}

          {items.length >
            0 && (
            <div className="border-b border-slate-100 bg-slate-50/70 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Listik detectó
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {items.map(
                  (
                    item,
                    index,
                  ) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      🛒{" "}
                      {
                        item
                      }
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {/* ==================================
              BOTÓN
          ================================== */}

          <div className="p-6">
            <button
              type="button"
              disabled={
                items.length ===
                0
              }
              onClick={
                handleContinue
              }
              className="w-full rounded-2xl bg-green-600 px-6 py-4 text-base font-black text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {items.length ===
              0
                ? "Escribe tu lista para continuar"
                : `Buscar ${itemCount} ${
                    itemCount ===
                    1
                      ? "producto"
                      : "productos"
                  } →`}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
              Podrás revisar y corregir las coincidencias antes de agregarlas.
            </p>
          </div>
        </div>

        {/* ==================================
            OTRA OPCIÓN
        ================================== */}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            ¿Prefieres buscar manualmente?
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/?modo=lista",
              )
            }
            className="mt-2 text-sm font-black text-green-600 hover:text-green-700"
          >
            🔎 Buscar productos uno por uno
          </button>
        </div>
      </section>
    </main>
  );
}