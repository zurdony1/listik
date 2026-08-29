import type { Product } from "../../services/productAdminService";

interface Props {
  products: Product[];
  onEdit?: (product: Product) => void;
}

export default function ProductList({
  products,
  onEdit,
}: Props) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-xl font-black text-slate-900">
          No hay productos
        </p>

        <p className="mt-2 text-slate-500">
          Agrega el primer producto del catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex items-center justify-between border-b border-slate-100 p-5 transition hover:bg-slate-50 last:border-none"
        >
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {product.name}
            </h2>

            <p className="text-sm text-slate-500">
              {product.brand ?? "Sin marca"}
              {" • "}
              {product.category ?? "Sin categoría"}
            </p>
          </div>

          <button
            onClick={() => onEdit?.(product)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold transition hover:bg-green-50 hover:border-green-300"
          >
            Editar
          </button>
        </div>
      ))}
    </div>
  );
}