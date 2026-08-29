interface Props {
  price: number;
  saving?: number;
}

export default function PriceTag({
  price,
  saving = 0,
}: Props) {
  return (
    <div className="rounded-2xl bg-green-50 p-4">

      <p className="text-sm font-semibold text-green-700">
        🏆 Mejor precio
      </p>

      <p className="mt-1 text-3xl font-black text-green-700">
        $
        {price.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>

      {saving > 0 && (
        <p className="mt-2 text-sm font-bold text-green-600">
          💰 Ahorras $
          {saving.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      )}
    </div>
  );
}