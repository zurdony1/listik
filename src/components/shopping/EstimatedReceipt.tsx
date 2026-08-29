import Card from "../ui/Card";

import type {
  ShoppingListItem,
} from "../../hooks/useShoppingList";

import type {
  StoreTotal,
} from "../../utils/shoppingCalculator";

interface Props {
  items: ShoppingListItem[];

  bestStore:
    | StoreTotal
    | null
    | undefined;
}

export default function EstimatedReceipt({
  items,
  bestStore,
}: Props) {
  /*
   * ==========================================
   * LISTA VACÍA
   * ==========================================
   */

  if (
    items.length ===
    0
  ) {
    return null;
  }

  /*
   * ==========================================
   * NO HAY TIENDA COMPLETA
   * ==========================================
   *
   * Importante:
   *
   * No mostramos un subtotal incompleto
   * como si fuera el ticket ganador.
   */

  if (!bestStore) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">
            Ticket estimado
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            🛒 Aún no hay una compra completa
          </h2>

          <p className="mt-3 text-slate-500">
            Todavía no tenemos una tienda o
            sucursal con precio disponible para
            todos los productos de tu lista.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-black text-amber-800">
              ⚠️ No podemos calcular un ticket
              completo todavía.
            </p>

            <p className="mt-2 text-sm text-amber-700">
              Revisa el ranking de supermercados
              para ver qué tiendas tienen mayor
              cobertura y qué productos faltan.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  /*
   * ==========================================
   * NORMALIZAR SUCURSAL
   * ==========================================
   */

  function normalizeBranch(
    value:
      | string
      | null,
  ) {
    return (
      value
        ?.trim()
        .toLowerCase() ??
      ""
    );
  }

  /*
   * ==========================================
   * ARTÍCULOS DEL TICKET
   * ==========================================
   *
   * Buscamos exactamente:
   *
   * tienda
   * +
   * sucursal
   * +
   * presentación elegida
   */

  const receiptItems =
    items
      .map(
        (
          item,
        ) => {
          const storePrice =
            item.prices.find(
              (
                price,
              ) =>
                price.storeId ===
                  bestStore.storeId &&
                normalizeBranch(
                  price.branch,
                ) ===
                  normalizeBranch(
                    bestStore.branch,
                  ),
            );

          if (!storePrice) {
            return null;
          }

          return {
            key:
              `${item.product.id}::${
                item.presentationId ??
                "no-presentation"
              }`,

            productId:
              item.product.id,

            presentationId:
              item.presentationId,

            name:
              item.product.name,

            brand:
              item.product.brand,

            presentationName:
              item.presentation
                ?.presentationName ??
              null,

            quantity:
              item.quantity,

            unitPrice:
              storePrice.price,

            source:
              storePrice.source,

            observedAt:
              storePrice.observedAt,

            subtotal:
              storePrice.price *
              item.quantity,
          };
        },
      )
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > =>
          item !== null,
      );

  /*
   * ==========================================
   * TOTAL
   * ==========================================
   */

  const calculatedTotal =
    receiptItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.subtotal,
      0,
    );

  /*
   * Cantidad total de unidades.
   *
   * Ejemplo:
   *
   * leche x2
   * arroz x1
   *
   * = 3 unidades
   */

  const totalUnits =
    receiptItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  /*
   * ==========================================
   * FORMATEAR DINERO
   * ==========================================
   */

  function formatMoney(
    value: number,
  ) {
    return value.toLocaleString(
      "es-MX",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      },
    );
  }

  /*
   * ==========================================
   * FORMATEAR FECHA
   * ==========================================
   */

  function formatObservedDate(
    value:
      | string
      | null,
  ) {
    if (!value) {
      return null;
    }

    const datePart =
      value.slice(
        0,
        10,
      );

    const [
      year,
      month,
      day,
    ] =
      datePart.split(
        "-",
      );

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    return `${day}/${month}/${year}`;
  }

  /*
   * ==========================================
   * FUENTE
   * ==========================================
   */

  function getSourceLabel(
    source:
      | string
      | null,
  ) {
    if (
      source ===
      "ticket"
    ) {
      return "🧾 Ticket";
    }

    if (
      source ===
      "profeco"
    ) {
      return "🏛️ PROFECO";
    }

    if (
      source ===
      "manual"
    ) {
      return "✏️ Manual";
    }

    return null;
  }

  return (
    <Card>
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="border-b border-slate-100 p-6">
        <p className="text-xs font-black uppercase tracking-widest text-green-600">
          Ticket estimado
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          🛒 {bestStore.storeName}
        </h2>

        {bestStore.branch && (
          <p className="mt-1 text-sm font-bold text-slate-600">
            Sucursal:{" "}
            {
              bestStore.branch
            }
          </p>
        )}

        <p className="mt-2 text-sm text-slate-500">
          Esta tienda puede surtir toda tu
          lista con los precios disponibles
          actualmente en Listik.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
            {
              bestStore.availableItems
            }
            /
            {
              bestStore.requestedItems
            }{" "}
            productos
          </span>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
            {
              bestStore.coverage
            }
            % cobertura
          </span>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
            ✓ Lista completa
          </span>
        </div>
      </div>

      {/* ======================================
          DETALLE
      ====================================== */}

      <div className="p-6">
        <div className="space-y-4">
          {receiptItems.map(
            (
              item,
            ) => {
              const sourceLabel =
                getSourceLabel(
                  item.source,
                );

              const observedDate =
                formatObservedDate(
                  item.observedAt,
                );

              return (
                <div
                  key={
                    item.key
                  }
                  className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-4"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {
                        item.name
                      }
                    </p>

                    {item.brand && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {
                          item.brand
                        }
                      </p>
                    )}

                    {item.presentationName && (
                      <p className="mt-1 text-sm font-semibold text-green-700">
                        {
                          item.presentationName
                        }
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-500">
                      {
                        item.quantity
                      }{" "}
                      × $
                      {formatMoney(
                        item.unitPrice,
                      )}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {sourceLabel && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                          {
                            sourceLabel
                          }
                        </span>
                      )}

                      {observedDate && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                          {
                            observedDate
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-black text-slate-900">
                    $
                    {formatMoney(
                      item.subtotal,
                    )}
                  </p>
                </div>
              );
            },
          )}
        </div>

        {/* ==================================
            RESUMEN
        ================================== */}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Productos distintos
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">
              {
                receiptItems.length
              }
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Unidades totales
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">
              {
                totalUnits
              }
            </p>
          </div>
        </div>

        {/* ==================================
            TOTAL
        ================================== */}

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-green-50 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-green-700">
              Total estimado
            </p>

            <p className="mt-1 text-sm text-green-700">
              Lista completa
            </p>
          </div>

          <p className="text-3xl font-black text-green-700">
            $
            {formatMoney(
              calculatedTotal,
            )}
          </p>
        </div>

        {/* ==================================
            AVISO
        ================================== */}

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Los precios son estimaciones basadas
          en las observaciones más recientes
          disponibles en Listik y pueden cambiar
          en tienda.
        </p>
      </div>
    </Card>
  );
}