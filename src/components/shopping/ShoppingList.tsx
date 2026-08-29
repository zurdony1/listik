import {
  Link,
} from "react-router-dom";

import type {
  ShoppingListItem,
} from "../../hooks/useShoppingList";

interface Props {
  items: ShoppingListItem[];

  clearList:
    () => void;

  increaseQuantity: (
    productId: string,
    presentationId: string | null,
  ) => void;

  decreaseQuantity: (
    productId: string,
    presentationId: string | null,
  ) => void;

  removeProduct: (
    productId: string,
    presentationId: string | null,
  ) => void;

  showStartShopping?:
    boolean;

  showSmartPurchase?:
    boolean;
}

export default function ShoppingList({
  items,
  clearList,
  increaseQuantity,
  decreaseQuantity,
  removeProduct,
  showStartShopping = true,
  showSmartPurchase = true,
}: Props) {
  if (
    items.length ===
    0
  ) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl">
          🛒
        </div>

        <h2 className="mt-4 text-xl font-black text-slate-900">
          Tu lista está vacía
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Agrega productos desde el catálogo para empezar a comparar supermercados.
        </p>

        <Link
          to="/"
          className="mt-5 inline-flex rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
        >
          Buscar productos
        </Link>
      </div>
    );
  }

  const differentProducts =
    items.length;

  const totalUnits =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  function getPresentationLabel(
    item:
      ShoppingListItem,
  ) {
    if (
      !item.presentation
    ) {
      return null;
    }

    const parts:
      string[] =
      [];

    if (
      item.presentation
        .presentationName
    ) {
      parts.push(
        item.presentation
          .presentationName,
      );
    }

    if (
      item.presentation
        .sizeValue !==
        null &&
      item.presentation
        .sizeUnit
    ) {
      const size =
        `${item.presentation.sizeValue} ${item.presentation.sizeUnit}`;

      if (
        !parts.some(
          (
            part,
          ) =>
            part
              .toLowerCase()
              .includes(
                size.toLowerCase(),
              ),
        )
      ) {
        parts.push(
          size,
        );
      }
    }

    if (
      item.presentation
        .unitsPerPackage >
      1
    ) {
      parts.push(
        `${item.presentation.unitsPerPackage} unidades`,
      );
    }

    return parts.length >
      0
      ? parts.join(
          " · ",
        )
      : null;
  }

  return (
    <section className="rounded-[2rem] border border-green-200 bg-green-50/70 p-4 shadow-sm sm:p-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
            Lista de compras
          </p>

          <h2 className="mt-1 text-2xl font-black text-green-950">
            Mi lista de compras
          </h2>

          <p className="mt-1 text-sm font-semibold text-green-700">
            {differentProducts} producto
            {differentProducts ===
            1
              ? ""
              : "s"}
            {" · "}
            {totalUnits} unidad
            {totalUnits ===
            1
              ? ""
              : "es"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/"
            className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-black text-green-700 transition hover:bg-green-100"
          >
            + Agregar
          </Link>

          <button
            type="button"
            onClick={
              clearList
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Vaciar lista
          </button>
        </div>
      </div>

      {showSmartPurchase && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-green-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                🧭
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                  Compra inteligente
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  ¿Dónde te conviene comprar?
                </h3>

                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  Compara tu lista considerando precios, distancia y número de tiendas.
                </p>
              </div>
            </div>

            <Link
              to="/mi-lista/optimizar"
              className="shrink-0 rounded-2xl bg-green-600 px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-green-700"
            >
              🧭 Optimizar mi compra
            </Link>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        {items.map(
          (
            item,
          ) => {
            const key =
              `${item.product.id}::${item.presentationId ?? "no-presentation"}`;

            const presentationLabel =
              getPresentationLabel(
                item,
              );

            return (
              <article
                key={
                  key
                }
                className="group rounded-2xl border border-white bg-white p-4 shadow-sm transition hover:border-green-100 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl">
                      🛒
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950 sm:text-lg">
                        {item.product.name}
                      </p>

                      {item.product.brand && (
                        <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                          {item.product.brand}
                        </p>
                      )}

                      {presentationLabel && (
                        <div className="mt-2">
                          <span className="inline-flex max-w-full rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
                            <span className="truncate">
                              {presentationLabel}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <div className="flex items-center rounded-2xl bg-slate-50 p-1">
                      <button
                        type="button"
                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                        onClick={() =>
                          decreaseQuantity(
                            item.product.id,
                            item.presentationId,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
                      >
                        −
                      </button>

                      <div className="flex h-9 min-w-10 items-center justify-center px-2 text-sm font-black text-slate-950">
                        {item.quantity}
                      </div>

                      <button
                        type="button"
                        aria-label={`Aumentar cantidad de ${item.product.name}`}
                        onClick={() =>
                          increaseQuantity(
                            item.product.id,
                            item.presentationId,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-lg font-black text-white transition hover:bg-green-700"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label={`Eliminar ${item.product.name}`}
                      onClick={() =>
                        removeProduct(
                          item.product.id,
                          item.presentationId,
                        )
                      }
                      className="rounded-xl px-3 py-2 text-sm font-black text-red-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <span className="sm:hidden">
                        Eliminar
                      </span>

                      <span className="hidden sm:inline">
                        🗑️
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          },
        )}
      </div>

      {(showSmartPurchase ||
        showStartShopping) && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">

          {showSmartPurchase && (
            <Link
              to="/mi-lista/optimizar"
              className="flex flex-col justify-between rounded-2xl bg-green-600 p-5 text-white transition hover:bg-green-700"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-green-100">
                  Listik inteligente
                </p>

                <p className="mt-1 text-lg font-black">
                  Optimizar mi compra
                </p>

                <p className="mt-1 text-sm text-green-100">
                  Precio + distancia + número de tiendas.
                </p>
              </div>

              <p className="mt-4 font-black">
                Ver mejor opción →
              </p>
            </Link>
          )}

          {showStartShopping && (
            <div className="rounded-2xl bg-green-950 p-5 text-white">
              <p className="font-black">
                ¿Ya vas al súper?
              </p>

              <p className="mt-1 text-sm text-green-100">
                Abre el modo compra y marca los productos conforme los agregues al carrito.
              </p>

              <Link
                to="/compra"
                className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 text-center font-black text-green-800 transition hover:bg-green-50"
              >
                🛒 Iniciar compra
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
