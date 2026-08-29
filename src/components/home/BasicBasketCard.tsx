import {
  ArrowRight,
  ShoppingBasket,
  Users,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

interface Props {
  totalProducts?: number;
}

export default function BasicBasketCard({
  totalProducts = 24,
}: Props) {
  return (
    <section className="mt-8">
      <Link
        to="/canasta-basica"
        className="group block overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
      >
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
              <ShoppingBasket
                size={28}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Canasta básica
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                ¿Cuánto cuesta surtir lo esencial?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Compara los 24 productos de primera necesidad y descubre la combinación más económica disponible en tu zona.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
                  {totalProducts} productos
                </span>

                <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
                  <Users
                    size={14}
                  />
                  Hogar de 4 personas
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition group-hover:bg-green-600">
            Ver canasta
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </Link>
    </section>
  );
}
