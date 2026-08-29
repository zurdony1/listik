import { useState } from "react";
import toast from "react-hot-toast";

import {
  createProduct,
  updateProduct,
} from "../../../services/admin/productsService";

import type { AdminProduct } from "../../../types/AdminProduct";

interface Props {
  product?: AdminProduct;
  onClose: () => void;
  onCreated: () => void;
}

export default function ProductForm({
  product,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const productData = {
        name: name.trim(),
        brand: brand.trim() || null,
        category: category.trim() || null,
        barcode: barcode.trim() || null,
        image_url: product?.image_url ?? null,
      };

      if (product) {
        await updateProduct(product.id, productData);
      } else {
        await createProduct(productData);
      }

      await onCreated();

      toast.success(
        product
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );

      onClose();
    } catch (err) {
      console.error("Error al guardar producto:", err);

      setError("No se pudo guardar el producto.");
      toast.error("No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-3xl font-black text-slate-900">
          {product ? "Editar producto" : "Nuevo producto"}
        </h2>

        <p className="mt-2 text-slate-500">
          {product
            ? "Actualiza la información del producto."
            : "Agrega un producto al catálogo de Listik."}
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Nombre
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ejemplo: Leche Lala 1L"
              className="w-full rounded-xl border border-slate-200 p-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Marca
            </label>

            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Ejemplo: Lala"
              className="w-full rounded-xl border border-slate-200 p-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Categoría
            </label>

            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Ejemplo: Lácteos"
              className="w-full rounded-xl border border-slate-200 p-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Código de barras
            </label>

            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-200 p-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : product
                ? "Guardar cambios"
                : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}