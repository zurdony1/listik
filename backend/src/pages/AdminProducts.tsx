import { useEffect, useState } from "react";

import ProductStats from "../../../src/components/products/ProductStats";
import ProductList from "../components/products/ProductList";
import ProductDrawer from "../components/products/ProductDrawer";

import {
  getProducts,
  type Product,
} from "../services/productAdminService";

import {
  getCatalogStats,
  type CatalogStats,
} from "../services/catalogDashboardService";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [stats, setStats] =
    useState<CatalogStats>({
      products: 0,
      presentations: 0,
      codes: 0,
      stores: 0,
    });

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      setLoading(true);

      const [productsData, statsData] =
        await Promise.all([
          getProducts(),
          getCatalogStats(),
        ]);

      setProducts(productsData);
      setStats(statsData);
    } catch (error) {
      console.error(
        "Error cargando catálogo:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleEditProduct(
    product: Product,
  ) {
    setSelectedProduct(product);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);

    /*
     * Dejamos el producto seleccionado
     * durante el cierre.
     * Si prefieres limpiarlo, también
     * podríamos usar un pequeño timeout.
     */
  }

  const filteredProducts =
    products.filter((product) => {
      const text = [
        product.name,
        product.brand,
        product.category,
        product.normalized_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(
        search.trim().toLowerCase(),
      );
    });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-bold text-slate-500">
              Cargando catálogo...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-green-600">
                Administración
              </p>

              <h1 className="mt-2 text-4xl font-black text-slate-900">
                Catálogo Maestro
              </h1>

              <p className="mt-2 text-slate-500">
                Administra productos,
                presentaciones, códigos y
                supermercados de Listik.
              </p>
            </div>

            <button
              type="button"
              className="rounded-2xl bg-green-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-green-700"
            >
              + Nuevo producto
            </button>
          </div>

          <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <ProductStats
              title="Productos"
              value={stats.products}
              color="text-blue-600"
            />

            <ProductStats
              title="Presentaciones"
              value={stats.presentations}
              color="text-green-600"
            />

            <ProductStats
              title="Códigos"
              value={stats.codes}
              color="text-purple-600"
            />

            <ProductStats
              title="Tiendas"
              value={stats.stores}
              color="text-orange-600"
            />
          </div>

          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por producto, marca o categoría..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {search.trim() && (
            <p className="mb-4 text-sm font-semibold text-slate-500">
              {filteredProducts.length}{" "}
              resultado
              {filteredProducts.length === 1
                ? ""
                : "s"}
            </p>
          )}

          <ProductList
            products={filteredProducts}
            onEdit={
              handleEditProduct
            }
          />
        </div>
      </main>

      <ProductDrawer
        product={selectedProduct}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </>
  );
}