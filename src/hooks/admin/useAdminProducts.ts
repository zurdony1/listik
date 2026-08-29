import { useEffect, useState } from "react";
import { getAdminProducts } from "../../services/admin/productsService";

interface AdminProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  image_url: string | null;
}

export function useAdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminProducts();

      setProducts(data);
    } catch (err) {
      console.error("Error al cargar productos del admin:", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    error,
    refresh: loadProducts,
  };
}