import { useState } from "react";
import toast from "react-hot-toast";

import { deleteProduct } from "../../../services/admin/productsService";
import type { AdminProduct } from "../../../types/AdminProduct";

interface Props {
  product: AdminProduct;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteProductModal({
  product,
  onClose,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    try {
      setDeleting(true);

      await deleteProduct(product.id);
      await onDeleted();

      toast.success("Producto eliminado correctamente.");
      onClose();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      toast.error("No se pudo eliminar el producto.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          🗑️
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-3xl font-black text-slate-900">
            Eliminar producto
          </h2>

          <p className="mt-4 text-slate-500">
            ¿Seguro que deseas eliminar{" "}
            <strong className="text-slate-900">
              {product.name}
            </strong>
            ?
          </p>

          <p className="mt-2 text-sm font-semibold text-red-600">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}