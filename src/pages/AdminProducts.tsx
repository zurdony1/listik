import { useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import ProductTable from "../components/admin/products/ProductTable";
import ProductForm from "../components/admin/products/ProductForm";
import DeleteProductModal from "../components/admin/products/DeleteProductModal";
import { useAdminProducts } from "../hooks/admin/useAdminProducts";
import type { AdminProduct } from "../types/AdminProduct";

export default function AdminProducts() {
  const {
    products,
    loading,
    refresh,
  } = useAdminProducts();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<AdminProduct | undefined>();

  const [deletingProduct, setDeletingProduct] =
    useState<AdminProduct | undefined>();

  const filteredProducts = products.filter((product) => {
    const text = [
      product.name,
      product.brand,
      product.category,
      product.barcode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.trim().toLowerCase());
  });

  function openCreateForm() {
    setEditingProduct(undefined);
    setShowForm(true);
  }

  function openEditForm(product: AdminProduct) {
    setEditingProduct(product);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(undefined);
  }

  function openDeleteModal(product: AdminProduct) {
    setDeletingProduct(product);
  }

  function closeDeleteModal() {
    setDeletingProduct(undefined);
  }

  async function handleProductDeleted() {
    await refresh();
    setDeletingProduct(undefined);
  }

  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-green-600">
                Administración
              </p>

              <h1 className="mt-2 text-4xl font-black text-slate-900">
                Productos
              </h1>

              <p className="mt-2 text-slate-500">
                Administra el catálogo disponible en Listik.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white shadow transition hover:bg-green-700"
            >
              + Nuevo producto
            </button>
          </div>

          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, marca, categoría o código..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          <ProductTable
            products={filteredProducts}
            loading={loading}
            onEdit={openEditForm}
            onDelete={openDeleteModal}
          />
        </div>
      </section>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={closeForm}
          onCreated={refresh}
        />
      )}

      {deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          onClose={closeDeleteModal}
          onDeleted={handleProductDeleted}
        />
      )}
    </main>
  );
}