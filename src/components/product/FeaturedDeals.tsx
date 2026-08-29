import {
  ArrowRight,
  Flame,
  PiggyBank,
  Store,
} from "lucide-react";

interface DealProduct {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
}

interface Deal {
  product: DealProduct;
  bestPrice: number;
  highestPrice: number;
  saving: number;
  savingPercentage: number;
}

interface Props {
  deals: Deal[];

  onViewProduct?: (
    product: DealProduct
  ) => void;
}

export default function FeaturedDeals({
  deals,
  onViewProduct,
}: Props) {
  if (!deals.length) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-green-600">
            <Flame size={18} />
            Ofertas destacadas
          </div>

          <h2 className="text-2xl font-black text-slate-900">
            Precios que vale la pena comparar
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Encontramos diferencias importantes
            entre tiendas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <article
            key={deal.product.id}
            className="
              group
              overflow-hidden
              rounded-3xl
              border
              border-slate-200
              bg-white
              shadow-sm
              transition
              hover:-translate-y-1
              hover:shadow-lg
            "
          >
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div
                  className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-2xl
                    bg-green-50
                    text-green-600
                  "
                >
                  <PiggyBank size={22} />
                </div>

                <span
                  className="
                    rounded-full
                    bg-emerald-50
                    px-3 py-1
                    text-xs
                    font-black
                    text-emerald-700
                  "
                >
                  AHORRA{" "}
                  {deal.savingPercentage.toFixed(
                    0
                  )}
                  %
                </span>
              </div>

              {deal.product.category && (
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {deal.product.category}
                </p>
              )}

              <h3 className="min-h-[56px] text-xl font-black leading-tight text-slate-900">
                {deal.product.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {deal.product.brand ||
                  "Sin marca"}
              </p>

              <div
                className="
                  mt-5
                  rounded-2xl
                  bg-green-50
                  p-4
                "
              >
                <p className="text-xs font-bold uppercase text-green-700">
                  Mejor precio
                </p>

                <p className="mt-1 text-3xl font-black text-green-700">
                  $
                  {deal.bestPrice.toLocaleString(
                    "es-MX",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-400">
                    Precio más alto
                  </p>

                  <p className="font-bold text-slate-700 line-through">
                    $
                    {deal.highestPrice.toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-slate-400">
                    Puedes ahorrar
                  </p>

                  <p className="font-black text-green-600">
                    $
                    {deal.saving.toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onViewProduct?.(
                    deal.product
                  )
                }
                className="
                  mt-5
                  flex w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-slate-950
                  px-4 py-3
                  text-sm
                  font-black
                  text-white
                  transition
                  hover:bg-green-600
                "
              >
                <Store size={17} />

                Comparar precios

                <ArrowRight size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}