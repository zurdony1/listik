import {
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import AppNav from "../components/AppNav";

import ShoppingList from "../components/shopping/ShoppingList";
import StoreRanking from "../components/shopping/StoreRanking";

import {
  useShoppingList,
} from "../hooks/useShoppingList";

import {
  calculateStoreTotals,
} from "../utils/shoppingCalculator";

import type {
  StoreTotal,
} from "../utils/shoppingCalculator";

export default function ShoppingListPage() {
  const navigate =
    useNavigate();

  const {
    items,

    clearList,

    increaseQuantity,

    decreaseQuantity,

    removeProduct,

    loadingPersistentList,

    persistenceError,
  } =
    useShoppingList();

  /*
   * ========================================
   * RANKING DE SUPERMERCADOS
   * ========================================
   */

  const storeTotals =
    useMemo(
      () =>
        calculateStoreTotals(
          items,
        ),
      [
        items,
      ],
    );

  /*
   * ========================================
   * COMPRAR EN ESTA SUCURSAL
   * ========================================
   */

  function handleSelectStore(
    store: StoreTotal,
  ) {
    

    if (
      !store.storeBranchId
    ) {
      console.error(
        "La sucursal seleccionada no tiene storeBranchId.",
        store,
      );

      return;
    }

    /*
     * Guardamos también en sessionStorage
     * para que la selección sobreviva a
     * una recarga accidental al entrar
     * en Modo compra.
     */

    sessionStorage.setItem(
      "listik_selected_store",
      JSON.stringify({
        storeId:
          store.storeId,

        storeBranchId:
          store.storeBranchId,

        storeName:
          store.storeName,

        branch:
          store.branch,

        expectedTotal:
          store.total,
      }),
    );

    /*
     * Además mandamos los datos por state.
     *
     * En el siguiente paso ShoppingTripPage
     * leerá esta selección y usará solamente
     * los precios de ESTA sucursal.
     */

    navigate(
      "/compra",
      {
        state: {
          selectedStore: {
            storeId:
              store.storeId,

            storeBranchId:
              store.storeBranchId,

            storeName:
              store.storeName,

            branch:
              store.branch,

            expectedTotal:
              store.total,
          },
        },
      },
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ======================================
          NAVEGACIÓN GLOBAL
      ====================================== */}

      <AppNav />

      {/* ======================================
          CONTENIDO
      ====================================== */}

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        {/* ====================================
            ENCABEZADO
        ==================================== */}

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-green-600">
            Tu compra
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
            Mi lista
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Revisa tus productos y compara cuánto costaría surtir la lista en cada supermercado de tu zona.
          </p>
        </div>

        {/* ====================================
            CARGANDO LISTA
        ==================================== */}

        {loadingPersistentList ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-green-600" />

            <p className="mt-4 font-bold text-slate-600">
              Cargando tu lista...
            </p>
          </div>
        ) : (
          <>
            {/* =================================
                ERROR DE SINCRONIZACIÓN
            ================================= */}

            {persistenceError && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-800">
                  ⚠️ No pudimos sincronizar completamente tu lista.
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  {
                    persistenceError
                  }
                </p>
              </div>
            )}

            {/* =================================
                LISTA DE COMPRAS
            ================================= */}

            <ShoppingList
              items={
                items
              }
              clearList={
                clearList
              }
              increaseQuantity={
                increaseQuantity
              }
              decreaseQuantity={
                decreaseQuantity
              }
              removeProduct={
                removeProduct
              }

              /*
               * Ocultamos el inicio genérico
               * porque ahora la compra debe
               * comenzar desde una tienda
               * concreta del ranking.
               */
              showStartShopping={
                false
              }
            />

            {/* =================================
                RANKING
            ================================= */}

            {items.length >
              0 && (
              <div className="mt-8">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Comparador
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    ¿Dónde te conviene comprar?
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Listik compara únicamente los precios disponibles para los productos y presentaciones de tu lista.
                  </p>
                </div>

                {storeTotals.length >
                0 ? (
                  <StoreRanking
                    totals={
                      storeTotals
                    }
                    onSelectStore={
                      handleSelectStore
                    }
                  />
                ) : (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                    <p className="font-black text-amber-800">
                      Todavía no tenemos suficientes precios para comparar esta lista.
                    </p>

                    <p className="mt-2 text-sm text-amber-700">
                      Puedes seguir agregando productos o actualizar precios mediante tickets para mejorar la cobertura.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}