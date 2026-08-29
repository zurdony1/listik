import type { AdminProduct } from "../../../types/AdminProduct";

interface Props {
  products: AdminProduct[];
  loading: boolean;
  onEdit: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
}

export default function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="font-semibold text-slate-500">
          Cargando productos...
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="text-xl font-black text-slate-900">
          No hay productos
        </h2>

        <p className="mt-2 text-slate-500">
          Crea el primer producto desde el panel.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-500">
              <th className="px-6 py-4 font-bold">
                Producto
              </th>

              <th className="px-6 py-4 font-bold">
                Marca
              </th>

              <th className="px-6 py-4 font-bold">
                Categoría
              </th>

              <th className="px-6 py-4 font-bold">
                Código
              </th>

              <th className="px-6 py-4 text-right font-bold">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr
                key={product.id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-50">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-green-600">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="font-black text-slate-900">
                      {product.name}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4 text-slate-600">
                  {product.brand || "Sin marca"}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    {product.category || "Sin categoría"}
                  </span>
                </td>

                <td className="px-6 py-4 font-mono text-sm text-slate-500">
                  {product.barcode || "—"}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))} 
          </tbody>
        </table>
      </div>
    </div>
  );
}