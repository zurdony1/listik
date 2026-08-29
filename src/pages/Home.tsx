import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import { getProducts } from "../services/productsService";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function loadProducts() {
      const data = await getProducts();
      setProducts(data);
    }

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">

        <SearchBar />

        <div className="mt-8 space-y-4">

          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow p-5"
            >
              <h2 className="text-xl font-bold">
                {product.name}
              </h2>

              <p className="text-gray-500">
                {product.brand}
              </p>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
}