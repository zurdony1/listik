import {
  ChevronDown,
  ChevronUp,
  PackageSearch,
} from "lucide-react";

interface Props {
  totalProducts: number;
  showingAll: boolean;

  onToggle: () => void;
}

export default function ExploreProducts({
  totalProducts,
  showingAll,
  onToggle,
}: Props) {
  return (
    <section className="mt-12">
      <div
        className="
          rounded-3xl
          border border-slate-200
          bg-white
          p-6
          shadow-sm
          md:flex
          md:items-center
          md:justify-between
        "
      >
        <div className="flex items-start gap-4">
          <div
            className="
              flex h-12 w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-green-50
              text-green-600
            "
          >
            <PackageSearch size={24} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Catálogo Listik
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Explora todos los productos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tenemos{" "}
              {totalProducts.toLocaleString(
                "es-MX"
              )}{" "}
              productos disponibles para
              comparar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="
            mt-5
            flex w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-green-600
            px-6 py-3
            font-black
            text-white
            transition
            hover:bg-green-700
            md:mt-0
            md:w-auto
          "
        >
          {showingAll ? (
            <>
              Ocultar productos
              <ChevronUp size={19} />
            </>
          ) : (
            <>
              Ver todos los productos
              <ChevronDown size={19} />
            </>
          )}
        </button>
      </div>
    </section>
  );
}