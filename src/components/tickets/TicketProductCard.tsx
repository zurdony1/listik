import {
  CheckCircle2,
  CircleAlert,
  PackageSearch,
  RotateCcw,
  Search,
} from "lucide-react";

import MatchBadge from "./MatchBadge";
import BrainScoreCard from "../brain/BrainScoreCard";

import type {
  TicketItem,
  TicketItemStatus,
} from "../../types/TicketAnalysis";

interface Props {
  item: TicketItem;

  onStatusChange: (
    itemId: string,
    status: TicketItemStatus,
  ) => void;

  /*
   * NUEVO:
   *
   * Le avisamos a AdminTickets
   * qué producto queremos buscar.
   */
  onSearchProduct: (
    item: TicketItem,
  ) => void;
}

export default function TicketProductCard({
  item,
  onStatusChange,
  onSearchProduct,
}: Props) {
  const subtotal =
    item.subtotal ??
    item.totalPrice ??
    item.quantity *
      item.unitPrice;

  const suggestedProductName =
    item.suggestedProductName ??
    item.suggestedProduct?.productName ??
    item.suggestedProduct?.name ??
    null;

  const suggestedProductId =
    item.suggestedProductId ??
    item.suggestedProduct?.id ??
    null;

  const hasSuggestedProduct =
    Boolean(
      suggestedProductId,
    ) ||
    Boolean(
      suggestedProductName,
    );

  const isConfirmed =
    item.status ===
    "confirmed";

  const isNewProduct =
    item.status ===
    "new-product";

  const isPending =
    item.status ===
    "pending";

  /*
   * ==========================================
   * ESTILO DE TARJETA
   * ==========================================
   */

  function getCardClasses() {
    if (isConfirmed) {
      return "border-green-300 bg-green-50";
    }

    if (isNewProduct) {
      return "border-blue-300 bg-blue-50";
    }

    if (
      isPending &&
      !hasSuggestedProduct
    ) {
      return "border-amber-300 bg-amber-50";
    }

    return "border-slate-200 bg-white";
  }

  /*
   * ==========================================
   * ICONO
   * ==========================================
   */

  function getStatusIcon() {
    if (isConfirmed) {
      return (
        <CheckCircle2
          size={24}
          className="text-green-600"
        />
      );
    }

    if (isNewProduct) {
      return (
        <PackageSearch
          size={24}
          className="text-blue-600"
        />
      );
    }

    if (
      hasSuggestedProduct
    ) {
      return (
        <CircleAlert
          size={24}
          className="text-amber-600"
        />
      );
    }

    return (
      <PackageSearch
        size={24}
        className="text-amber-600"
      />
    );
  }

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition-all duration-300 ${getCardClasses()}`}
    >
      {/* HEADER */}

      <div className="flex items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getStatusIcon()}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Texto del ticket
            </p>

            <h3 className="mt-1 text-lg font-black text-slate-900">
              {item.rawName}
            </h3>

            {item.rawCode && (
              <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                Código:{" "}
                {item.rawCode}
              </p>
            )}

            <div className="mt-3">
              <MatchBadge
                confidence={
                  item.confidence ??
                  0
                }
              />
            </div>
          </div>
        </div>

        {/* SUBTOTAL */}

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Subtotal
          </p>

          <p className="mt-1 text-2xl font-black text-slate-900">
            $
            {subtotal.toLocaleString(
              "es-MX",
              {
                minimumFractionDigits:
                  2,

                maximumFractionDigits:
                  2,
              },
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {item.quantity} × $
            {(item.unitPrice ??
              0).toLocaleString(
              "es-MX",
              {
                minimumFractionDigits:
                  2,

                maximumFractionDigits:
                  2,
              },
            )}
          </p>
        </div>
      </div>

      {/* LISTIK BRAIN */}

      {item.brainScore !==
        undefined && (
        <BrainScoreCard
          score={
            item.brainScore
          }
          previousMemories={
            item.previousMemories ??
            0
          }
          source={
            item.matchSource
          }
          confidence={
            item.confidence ??
            0
          }
        />
      )}

      {/* RESULTADO */}

      <div className="mt-5 rounded-2xl bg-white/80 p-4">
        {/* CONFIRMADO */}

        {isConfirmed ? (
          <>
            <p className="flex items-center gap-2 font-black text-green-700">
              <CheckCircle2
                size={18}
              />

              Producto confirmado
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {suggestedProductName ??
                item.rawName}
            </p>

            {item.suggestedProduct
              ?.presentationName && (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {
                  item
                    .suggestedProduct
                    .presentationName
                }
              </p>
            )}
          </>
        ) : isNewProduct ? (
          <>
            <p className="flex items-center gap-2 font-black text-blue-700">
              <PackageSearch
                size={18}
              />

              Producto nuevo confirmado
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {item.rawName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Este artículo fue
              identificado manualmente
              como un producto nuevo.
            </p>
          </>
        ) : hasSuggestedProduct ? (
          <>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-700">
              <CircleAlert
                size={16}
              />

              Posible coincidencia
            </p>

            <p className="mt-2 font-black text-slate-900">
              {
                suggestedProductName
              }
            </p>

            {item.suggestedProduct
              ?.presentationName && (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {
                  item
                    .suggestedProduct
                    .presentationName
                }
              </p>
            )}

            <p className="mt-2 text-sm text-slate-500">
              Revisa que el producto
              y la presentación sean
              correctos.
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-black text-amber-700">
              <PackageSearch
                size={18}
              />

              Producto no identificado
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {item.rawName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Listik todavía no
              encontró una coincidencia
              confiable en el catálogo.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                Busca el producto
                correcto para enseñarle
                esta coincidencia al
                Brain.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ACCIONES */}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {/* CONFIRMADO / NUEVO */}

        {isConfirmed ||
        isNewProduct ? (
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                item.id,
                "pending",
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw
              size={16}
            />

            Volver a revisar
          </button>
        ) : hasSuggestedProduct ? (
          /*
           * Brain ya encontró
           * una posible coincidencia.
           */
          <>
            <button
              type="button"
              onClick={() =>
                onSearchProduct(
                  item,
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Search
                size={16}
              />

              Elegir otro producto
            </button>

            <button
              type="button"
              onClick={() =>
                onStatusChange(
                  item.id,
                  "confirmed",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
            >
              <CheckCircle2
                size={17}
              />

              Confirmar producto
            </button>
          </>
        ) : (
          /*
           * No hay ninguna
           * coincidencia.
           */
          <button
  type="button"
  onClick={() => {
    console.log(
      "🖱️ CLICK EN BUSCAR:",
      item.rawName,
      item.id,
    );

    onSearchProduct(item);
  }}
  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
>
  <Search size={17} />

  Buscar producto existente
</button>
        )}
      </div>

      {/* PENDIENTE */}

      {isPending && (
        <p className="mt-4 text-right text-xs font-bold text-amber-700">
          Pendiente de revisión
        </p>
      )}
    </article>
  );
}