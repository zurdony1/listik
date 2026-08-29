import TicketProductCard from "./TicketProductCard";

import type {
  TicketItem,
  TicketItemStatus,
} from "../../types/TicketAnalysis";

interface Props {
  items: TicketItem[];

  onStatusChange: (
    itemId: string,
    status: TicketItemStatus,
  ) => void;

  onSearchProduct: (
    item: TicketItem,
  ) => void;
}

export default function TicketProducts({
  items,
  onStatusChange,
  onSearchProduct,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="text-4xl">
          🧾
        </div>

        <h2 className="mt-4 text-xl font-black text-slate-900">
          No se detectaron productos
        </h2>

        <p className="mt-2 text-slate-500">
          Revisa que la imagen sea clara, completa y tenga buena iluminación.
        </p>
      </div>
    );
  }

  const reviewedItems = items.filter(
    (item) => item.status !== "pending",
  ).length;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-green-600">
            Productos detectados
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Revisa las coincidencias
          </h2>

          <p className="mt-2 text-slate-500">
            Confirma los productos sugeridos o marca los artículos nuevos.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">
            Revisados
          </p>

          <p className="text-xl font-black text-slate-900">
            {reviewedItems} / {items.length}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
         <TicketProductCard
  key={item.id}
  item={item}
  onStatusChange={onStatusChange}
  onSearchProduct={onSearchProduct}
/>
        ))}
      </div>
    </section>
  );
}