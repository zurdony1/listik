interface Props {
  products: number;
  stores: number;
  prices: number;
}

export default function StatsCards({
  products,
  stores,
  prices,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-slate-500">
          Productos
        </p>

        <h2 className="mt-3 text-5xl font-black text-green-600">
          {products}
        </h2>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-slate-500">
          Supermercados
        </p>

        <h2 className="mt-3 text-5xl font-black text-green-600">
          {stores}
        </h2>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-slate-500">
          Precios
        </p>

        <h2 className="mt-3 text-5xl font-black text-green-600">
          {prices}
        </h2>
      </div>
    </div>
  );
}